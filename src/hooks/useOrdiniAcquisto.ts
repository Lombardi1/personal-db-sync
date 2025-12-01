import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { OrdineAcquisto, ArticoloOrdineAcquisto, Cartone, Fustella } from '@/types';
import { toast } from 'sonner';
import { generateNextCartoneCode } from '@/utils/cartoneUtils';

export function useOrdiniAcquisto() {
  const [ordiniAcquisto, setOrdiniAcquisto] = useState<OrdineAcquisto[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Define syncArticleInventoryStatus first, as it's a helper for others and has no internal dependencies on other useCallback functions in this file.
  const syncArticleInventoryStatus = useCallback(async (ordineAcquisto: OrdineAcquisto) => {
    console.log(`[syncArticleInventoryStatus] Sincronizzazione articoli per OA: ${ordineAcquisto.numero_ordine}`);
    const fornitoreNome = ordineAcquisto.fornitore_nome || 'N/A';
    const isCartoneFornitore = ordineAcquisto.fornitore_tipo === 'Cartone';
    const isFustelleFornitore = ordineAcquisto.fornitore_tipo === 'Fustelle';

    // Elimina tutti gli articoli di questo ordine dalle tabelle 'ordini', 'giacenza' e 'fustelle'
    // Questo è un reset per garantire la coerenza prima di reinserire
    await supabase.from('ordini').delete().eq('ordine', ordineAcquisto.numero_ordine);
    await supabase.from('giacenza').delete().eq('ordine', ordineAcquisto.numero_ordine);
    // NUOVO: Elimina le fustelle associate a questo ordine d'acquisto
    await supabase.from('fustelle').delete().eq('ordine_acquisto_numero', ordineAcquisto.numero_ordine);

    if (!isCartoneFornitore && !isFustelleFornitore) {
      return;
    }

    if (!Array.isArray(ordineAcquisto.articoli)) {
      toast.error(`Errore interno: Articoli dell'ordine non validi per ${ordineAcquisto.numero_ordine}.`);
      return;
    }

    for (const articolo of ordineAcquisto.articoli) {
      try {
        if (articolo.stato === 'annullato') {
          // Se l'articolo è annullato, non lo inseriamo in nessuna tabella di inventario.
          // È già stato rimosso all'inizio della funzione se esisteva.
          continue;
        }

        if (articolo.tipo_articolo === 'cartone' && isCartoneFornitore) {
          const codiceCtn = articolo.codice_ctn;
          if (!codiceCtn) {
            continue;
          }

          const numFogli = articolo.numero_fogli;
          if (numFogli === undefined || numFogli <= 0) {
            continue;
          }

          const cartoneBase: Cartone = {
            codice: codiceCtn,
            fornitore: fornitoreNome,
            ordine: ordineAcquisto.numero_ordine,
            tipologia: articolo.tipologia_cartone || articolo.descrizione || 'N/A',
            formato: articolo.formato || 'N/A',
            grammatura: articolo.grammatura || 'N/A',
            fogli: numFogli,
            cliente: articolo.cliente || 'N/A',
            lavoro: articolo.lavoro || 'N/A',
            magazzino: '-',
            prezzo: articolo.prezzo_unitario,
            data_consegna: articolo.data_consegna_prevista,
            note: ordineAcquisto.note || '-',
            fsc: articolo.fsc,
            alimentare: articolo.alimentare,
            rif_commessa_fsc: articolo.rif_commessa_fsc,
          };

          if (articolo.stato === 'in_attesa' || articolo.stato === 'inviato' || articolo.stato === 'confermato') {
            const isConfirmedForOrdiniTable = articolo.stato === 'confermato';
            const { error: insertError } = await supabase.from('ordini').insert([{ ...cartoneBase, confermato: isConfirmedForOrdiniTable }]);
            if (insertError) {
              toast.error(`Errore inserimento in ordini: ${insertError.message}`);
            }
          } else if (articolo.stato === 'ricevuto') {
            const { data: existingGiacenza, error: fetchGiacenzaError } = await supabase
              .from('giacenza')
              .select('ddt, data_arrivo, magazzino')
              .eq('codice', codiceCtn)
              .single();

            if (fetchGiacenzaError && fetchGiacenzaError.code !== 'PGRST116') {
              toast.error(`Errore recupero giacenza: ${fetchGiacenzaError.message}`);
              continue;
            }

            const giacenzaDataToUpdate = {
              ddt: existingGiacenza?.ddt || null,
              data_arrivo: existingGiacenza?.data_arrivo || new Date().toISOString().split('T')[0],
              magazzino: existingGiacenza?.magazzino || '-',
            };

            if (existingGiacenza) {
              const { error: updateError } = await supabase.from('giacenza').update({ ...cartoneBase, ...giacenzaDataToUpdate }).eq('codice', codiceCtn);
              if (updateError) {
                toast.error(`Errore aggiornamento in giacenza: ${updateError.message}`);
              }
            } else {
              const { error: insertError } = await supabase.from('giacenza').insert([{ ...cartoneBase, ...giacenzaDataToUpdate }]);
              if (insertError) {
                toast.error(`Errore inserimento in giacenza: ${insertError.message}`);
              }
            }
          }
        } else if (isFustelleFornitore) {
          if (articolo.tipo_articolo === 'fustella') {
            const fustellaCodice = articolo.fustella_codice;
            if (!fustellaCodice) {
              continue;
            }

            const fustellaBase: Fustella = {
              codice: fustellaCodice,
              fornitore: fornitoreNome,
              codice_fornitore: articolo.codice_fornitore_fustella || null,
              cliente: articolo.cliente || 'N/A',
              lavoro: articolo.lavoro || 'N/A',
              fustellatrice: articolo.fustellatrice || null,
              resa: articolo.resa_fustella || null,
              pulitore_codice: null, // Il pulitore è ora un articolo separato, quindi questo campo è null di default
              pinza_tagliata: articolo.pinza_tagliata || false,
              tasselli_intercambiabili: articolo.tasselli_intercambiabili || false,
              nr_tasselli: articolo.nr_tasselli || null,
              incollatura: articolo.incollatura || false,
              incollatrice: articolo.incollatrice || null,
              tipo_incollatura: articolo.tipo_incollatura || null,
              disponibile: articolo.stato === 'ricevuto', // Disponibile solo se lo stato è 'ricevuto'
              data_creazione: new Date().toISOString(), // Set creation date
              ultima_modifica: new Date().toISOString(), // Set modification date
              ordine_acquisto_numero: ordineAcquisto.numero_ordine, // Link to purchase order
            };

            const { data: existingFustella, error: fetchFustellaError } = await supabase
              .from('fustelle')
              .select('codice, pulitore_codice') // Seleziona anche pulitore_codice per mantenerlo se già esistente
              .eq('codice', fustellaCodice)
              .single();

            if (fetchFustellaError && fetchFustellaError.code !== 'PGRST116') {
              toast.error(`Errore recupero fustella: ${fetchFustellaError.message}`);
              continue;
            }

            if (existingFustella) {
              // Se esiste, aggiorna, mantenendo il pulitore_codice esistente se non sovrascritto
              const fustellaToUpdate = { ...fustellaBase, pulitore_codice: existingFustella.pulitore_codice };
              const { error: updateError } = await supabase.from('fustelle').update(fustellaToUpdate).eq('codice', fustellaCodice);
              if (updateError) {
                toast.error(`Errore aggiornamento fustella: ${updateError.message}`);
              }
            } else {
              // Se non esiste, inserisci
              const { error: insertError } = await supabase.from('fustelle').insert([fustellaBase]);
              if (insertError) {
                toast.error(`Errore inserimento fustella: ${insertError.message}`);
              }
            }
          } else if (articolo.tipo_articolo === 'pulitore') {
            const pulitoreCodice = articolo.pulitore_codice;
            const parentFustellaCodice = articolo.parent_fustella_codice;

            if (!pulitoreCodice || !parentFustellaCodice) {
              console.warn(`[syncArticleInventoryStatus] Articolo pulitore senza codice o fustella padre. Saltato.`);
              continue;
            }

            if (articolo.stato === 'ricevuto') {
              // Quando un pulitore viene ricevuto, aggiorna il campo pulitore_codice nella fustella padre
              const { error: updateFustellaError } = await supabase
                .from('fustelle')
                .update({ pulitore_codice: pulitoreCodice, ultima_modifica: new Date().toISOString() })
                .eq('codice', parentFustellaCodice);

              if (updateFustellaError) {
                toast.error(`Errore aggiornamento pulitore_codice per fustella ${parentFustellaCodice}: ${updateFustellaError.message}`);
              } else {
                console.log(`[syncArticleInventoryStatus] Pulitore '${pulitoreCodice}' ricevuto e associato a fustella '${parentFustellaCodice}'.`);
              }
            } else {
              // Se il pulitore non è ricevuto, assicurati che non sia associato alla fustella
              // (o che venga rimosso se lo stato cambia da ricevuto a non ricevuto)
              const { data: existingFustella, error: fetchFustellaError } = await supabase
                .from('fustelle')
                .select('pulitore_codice')
                .eq('codice', parentFustellaCodice)
                .single();
              
              if (!fetchFustellaError && existingFustella?.pulitore_codice === pulitoreCodice) {
                const { error: clearPulitoreError } = await supabase
                  .from('fustelle')
                  .update({ pulitore_codice: null, ultima_modifica: new Date().toISOString() })
                  .eq('codice', parentFustellaCodice);
                if (clearPulitoreError) {
                  toast.error(`Errore rimozione pulitore_codice per fustella ${parentFustellaCodice}: ${clearPulitoreError.message}`);
                }
              }
            }
          }
        }
      } catch (e: any) {
        toast.error(`Errore interno durante la sincronizzazione dell'articolo: ${e.message}`);
      }
    }
  }, []);

  // 2. Define loadOrdiniAcquisto early, as many functions call it.
  // It does not directly call syncArticleInventoryStatus or updateArticleStatusInOrder,
  // but it's called by functions that *do* call them.
  const loadOrdiniAcquisto = useCallback(async () => {
    setLoading(true);
    console.log('[useOrdiniAcquisto] Attempting to load purchase orders...');
    try {
      const { data: ordiniData, error: ordiniError } = await supabase
        .from('ordini_acquisto')
        .select(`
          *,
          fornitori ( nome, tipo_fornitore )
        `)
        .order('created_at', { ascending: false });

      if (ordiniError) {
        toast.error('Errore nel caricamento degli ordini d\'acquisto.');
        setOrdiniAcquisto([]);
        console.error('[useOrdiniAcquisto] Error loading purchase orders:', ordiniError);
        return;
      }

      if (!ordiniData || ordiniData.length === 0) {
        setOrdiniAcquisto([]);
        console.log('[useOrdiniAcquisto] No purchase orders found.');
        return;
      }
      console.log('[useOrdiniAcquisto] Purchase orders loaded:', ordiniData.length, 'items');

      const ordiniWithFornitoreInfo: OrdineAcquisto[] = ordiniData.map(ordine => ({
        ...ordine,
        fornitore_nome: ordine.fornitori?.nome || 'N/A',
        fornitore_tipo: ordine.fornitori?.tipo_fornitore || 'N/A',
        articoli: (ordine.articoli || []) as ArticoloOrdineAcquisto[],
      }));
      
      const sortedOrdini = [...ordiniWithFornitoreInfo].sort((a, b) => {
        const dateAUpdated = new Date(a.updated_at || a.created_at || 0).getTime();
        const dateBUpdated = new Date(b.updated_at || b.created_at || 0).getTime();

        if (dateAUpdated !== dateBUpdated) {
          return dateBUpdated - dateAUpdated;
        }

        const statusOrder = { 'in_attesa': 1, 'inviato': 2, 'confermato': 3, 'ricevuto': 4, 'annullato': 5 };
        const statusA = statusOrder[a.stato] || 99;
        const statusB = statusOrder[b.stato] || 99;

        if (statusA !== statusB) {
          return statusA - statusB;
        }

        const dateAOrder = new Date(a.data_ordine).getTime();
        const dateBOrder = new Date(b.data_ordine).getTime();
        return dateBOrder - dateAOrder;
      });

      setOrdiniAcquisto(sortedOrdini);
    } catch (error) {
      toast.error('Errore nel caricamento degli ordini d\'acquisto.');
      setOrdiniAcquisto([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 3. Define updateArticleStatusInOrder, which depends on syncArticleInventoryStatus and loadOrdiniAcquisto
  const updateArticleStatusInOrder = useCallback(async (orderNumeroOrdine: string, articleIdentifier: string, newArticleStatus: ArticoloOrdineAcquisto['stato']) => {
    console.log(`[useOrdiniAcquisto - updateArticleStatusInOrder] Inizio per OA: '${orderNumeroOrdine}', Articolo: '${articleIdentifier}', Nuovo stato: '${newArticleStatus}'`);

    // 1. Fetch the order without nested select for simplicity
    const { data: ordineAcquistoToUpdate, error: fetchError } = await supabase
      .from('ordini_acquisto')
      .select(`*`) // Simplified select
      .eq('numero_ordine', orderNumeroOrdine.trim())
      .single();

    if (fetchError || !ordineAcquistoToUpdate) {
      console.error(`[useOrdiniAcquisto - updateArticleStatusInOrder] Errore recupero ordine d'acquisto '${orderNumeroOrdine.trim()}':`, fetchError);
      toast.error(`Errore recupero ordine d'acquisto per aggiornamento articolo: ${fetchError?.message || 'Ordine non trovato o errore sconosciuto.'}`);
      return { success: false, error: fetchError };
    }
    console.log(`[useOrdiniAcquisto - updateArticleStatusInOrder] Ordine d'acquisto trovato:`, ordineAcquistoToUpdate);

    // 2. Find and update the specific article
    let updatedArticles = (ordineAcquistoToUpdate.articoli || []) as ArticoloOrdineAcquisto[];
    let articleFound = false;
    updatedArticles = updatedArticles.map(art => {
      // Check for cartone, fustella or pulitore code
      const isMatch = (art.tipo_articolo === 'cartone' && art.codice_ctn === articleIdentifier) ||
                      (art.tipo_articolo === 'fustella' && art.fustella_codice === articleIdentifier) ||
                      (art.tipo_articolo === 'pulitore' && art.pulitore_codice === articleIdentifier) ||
                      (art.tipo_articolo === 'altro' && art.descrizione === articleIdentifier);

      if (isMatch) {
        articleFound = true;
        return { ...art, stato: newArticleStatus };
      }
      return art;
    });

    if (!articleFound) {
      toast.error(`Articolo '${articleIdentifier}' non trovato nell'ordine ${orderNumeroOrdine}.`);
      return { success: false, error: new Error('Article not found') };
    }

    const newImportoTotale = updatedArticles.reduce((sum, item) => {
      if (item.stato !== 'annullato') {
        const qty = item.quantita || 0;
        const price = item.prezzo_unitario || 0;
        return sum + (qty * price);
      }
      return sum;
    }, 0);

    // OPTIMISTIC UPDATE START
    const previousOrdiniAcquisto = ordiniAcquisto;
    setOrdiniAcquisto(prev => prev.map(order => {
      if (order.numero_ordine === orderNumeroOrdine) {
        return { ...order, articoli: updatedArticles, importo_totale: newImportoTotale };
      }
      return order;
    }));
    // OPTIMISTIC UPDATE END

    // 3. Update the order with the modified articles array and new total amount
    const { data: updatedOrdine, error: updateError } = await supabase
      .from('ordini_acquisto')
      .update({ articoli: updatedArticles as any, importo_totale: newImportoTotale, updated_at: new Date().toISOString() })
      .eq('numero_ordine', orderNumeroOrdine)
      .select(`*`) // Simplified select
      .single();

    if (updateError) {
      toast.error(`Errore aggiornamento stato articolo: ${updateError.message}`);
      setOrdiniAcquisto(previousOrdiniAcquisto); // ROLLBACK
      return { success: false, error: updateError };
    }

    const allArticlesCancelled = updatedArticles.every(art => art.stato === 'annullato');
    if (allArticlesCancelled && updatedOrdine.stato !== 'annullato') {
        const { error: mainStatusUpdateError } = await supabase
            .from('ordini_acquisto')
            .update({ stato: 'annullato', updated_at: new Date().toISOString() })
            .eq('id', updatedOrdine.id);

        if (mainStatusUpdateError) {
            toast.error(`Errore aggiornamento stato principale ordine: ${mainStatusUpdateError.message}`);
        } else {
            updatedOrdine.stato = 'annullato';
        }
    }

    // 4. Sync inventory status for the updated order
    // We need fornitore_nome and fornitore_tipo for syncArticleInventoryStatus.
    // Fetch fornitore details separately or ensure they are available.
    const { data: fornitoreData, error: fornitoreError } = await supabase
      .from('fornitori')
      .select('nome, tipo_fornitore')
      .eq('id', updatedOrdine.fornitore_id)
      .single();

    if (fornitoreError || !fornitoreData) {
      console.error(`[useOrdiniAcquisto - updateArticleStatusInOrder] Errore recupero dettagli fornitore per OA: ${updatedOrdine.numero_ordine}`, fornitoreError);
      toast.error(`Errore recupero dettagli fornitore per sincronizzazione inventario.`);
      return { success: false, error: fornitoreError };
    }

    const orderWithFornitoreInfo: OrdineAcquisto = {
      ...updatedOrdine,
      fornitore_nome: fornitoreData.nome || 'N/A',
      fornitore_tipo: fornitoreData.tipo_fornitore || 'N/A',
      articoli: (updatedOrdine.articoli || []) as ArticoloOrdineAcquisto[],
    };
    await syncArticleInventoryStatus(orderWithFornitoreInfo);

    await loadOrdiniAcquisto();
    return { success: true, data: updatedOrdine };
  }, [loadOrdiniAcquisto, syncArticleInventoryStatus, ordiniAcquisto]);

  // 4. Define updateOrdineAcquistoStatus, which depends on syncArticleInventoryStatus and loadOrdiniAcquisto
  const updateOrdineAcquistoStatus = useCallback(async (id: string, newStatus: OrdineAcquisto['stato']) => {
    // Recupera l'ordine completo per poter sincronizzare gli articoli
    const { data: currentOrdine, error: fetchError } = await supabase
      .from('ordini_acquisto')
      .select(`*`) // Simplified select
      .eq('id', id)
      .single();

    if (fetchError || !currentOrdine) {
      toast.error(`Errore recupero ordine per aggiornamento stato: ${fetchError?.message}`);
      return { success: false, error: fetchError };
    }

    let articlesForDbUpdate = currentOrdine.articoli as ArticoloOrdineAcquisto[];
    if (newStatus === 'annullato') {
      articlesForDbUpdate = articlesForDbUpdate.map(art => ({ ...art, stato: 'annullato' }));
    } else if (newStatus === 'inviato') {
      articlesForDbUpdate = articlesForDbUpdate.map(art => ({ ...art, stato: 'inviato' }));
    } else if (newStatus === 'in_attesa') {
      articlesForDbUpdate = articlesForDbUpdate.map(art => ({ ...art, stato: 'in_attesa' }));
    }

    const newImportoTotale = articlesForDbUpdate.reduce((sum, item) => {
      if (item.stato !== 'annullato') {
        const qty = item.quantita || 0;
        const price = item.prezzo_unitario || 0;
        return sum + (qty * price);
      }
      return sum;
    }, 0);

    // OPTIMISTIC UPDATE START
    const previousOrdiniAcquisto = ordiniAcquisto;
    setOrdiniAcquisto(prev => prev.map(order => 
      order.id === id 
        ? { 
            ...order, 
            stato: newStatus,
            articoli: articlesForDbUpdate,
            importo_totale: newImportoTotale,
          } 
        : order
    ));
    // OPTIMISTIC UPDATE END

    const { data: updatedOrdine, error } = await supabase
      .from('ordini_acquisto')
      .update({ stato: newStatus, articoli: articlesForDbUpdate as any, importo_totale: newImportoTotale, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(`*`) // Simplified select
      .single();

    if (error) {
      toast.error(`Errore aggiornamento stato ordine: ${error.message}`);
      setOrdiniAcquisto(previousOrdiniAcquisto); // ROLLBACK
      return { success: false, error };
    }
    
    // Fetch fornitore details separately for syncArticleInventoryStatus
    const { data: fornitoreData, error: fornitoreError } = await supabase
      .from('fornitori')
      .select('nome, tipo_fornitore')
      .eq('id', updatedOrdine.fornitore_id)
      .single();

    if (fornitoreError || !fornitoreData) {
      console.error(`[useOrdiniAcquisto - updateOrdineAcquistoStatus] Errore recupero dettagli fornitore per OA: ${updatedOrdine.numero_ordine}`, fornitoreError);
      toast.error(`Errore recupero dettagli fornitore per sincronizzazione inventario.`);
      return { success: false, error: fornitoreError };
    }

    const orderWithFornitoreInfo: OrdineAcquisto = {
      ...updatedOrdine,
      fornitore_nome: fornitoreData.nome || 'N/A',
      fornitore_tipo: fornitoreData.tipo_fornitore || 'N/A',
      articoli: (updatedOrdine.articoli || []) as ArticoloOrdineAcquisto[],
    };
    await syncArticleInventoryStatus(orderWithFornitoreInfo);

    await loadOrdiniAcquisto();
    return { success: true, data: updatedOrdine };
  }, [loadOrdiniAcquisto, syncArticleInventoryStatus, ordiniAcquisto]);

  // 5. Define addOrdineAcquisto, which depends on syncArticleInventoryStatus and loadOrdiniAcquisto
  const addOrdineAcquisto = useCallback(async (ordine: Omit<OrdineAcquisto, 'id' | 'created_at' | 'fornitore_nome' | 'fornitore_tipo' | 'updated_at'>) => {
    const orderToInsert = { ...ordine };

    const { data: newOrdine, error: ordineError } = await supabase
      .from('ordini_acquisto')
      .insert([orderToInsert])
      .select(`*`) // Simplified select
      .single();

    if (ordineError) {
      toast.error(`Errore aggiunta ordine: ${ordineError.message}`);
      throw ordineError; // Rilancia l'errore
    }

    // Fetch fornitore details separately for syncArticleInventoryStatus
    const { data: fornitoreData, error: fornitoreError } = await supabase
      .from('fornitori')
      .select('nome, tipo_fornitore')
      .eq('id', newOrdine.fornitore_id)
      .single();

    if (fornitoreError || !fornitoreData) {
      console.error(`[useOrdiniAcquisto - addOrdineAcquisto] Errore recupero dettagli fornitore per OA: ${newOrdine.numero_ordine}`, fornitoreError);
      toast.error(`Errore recupero dettagli fornitore per sincronizzazione inventario.`);
      throw fornitoreError; // Rilancia l'errore
    }

    const orderWithFornitoreInfo: OrdineAcquisto = {
      ...newOrdine,
      fornitore_nome: fornitoreData.nome || 'N/A',
      fornitore_tipo: fornitoreData.tipo_fornitore || 'N/A',
      articoli: (newOrdine.articoli || []) as ArticoloOrdineAcquisto[],
    };
    await syncArticleInventoryStatus(orderWithFornitoreInfo);

    toast.success(`✅ Ordine d'acquisto '${newOrdine.numero_ordine}' aggiunto con successo!`);
    await loadOrdiniAcquisto();
    return { success: true, data: newOrdine };
  }, [loadOrdiniAcquisto, syncArticleInventoryStatus]);

  // 6. Define updateOrdineAcquisto, which depends on syncArticleInventoryStatus and loadOrdiniAcquisto
  const updateOrdineAcquisto = useCallback(async (id: string, ordine: Partial<Omit<OrdineAcquisto, 'id' | 'created_at' | 'fornitore_nome' | 'fornitore_tipo' | 'updated_at'>>) => {
    const orderToUpdate = { ...ordine };

    const { data: updatedOrdine, error: ordineError } = await supabase
      .from('ordini_acquisto')
      .update(orderToUpdate)
      .eq('id', id)
      .select(`*`) // Simplified select
      .single();

    if (ordineError) {
      toast.error(`Errore modifica ordine: ${ordineError.message}`);
      throw ordineError; // Rilancia l'errore
    }

    // Fetch fornitore details separately for syncArticleInventoryStatus
    const { data: fornitoreData, error: fornitoreError } = await supabase
      .from('fornitori')
      .select('nome, tipo_fornitore')
      .eq('id', updatedOrdine.fornitore_id)
      .single();

    if (fornitoreError || !fornitoreData) {
      console.error(`[useOrdiniAcquisto - updateOrdineAcquisto] Errore recupero dettagli fornitore per OA: ${updatedOrdine.numero_ordine}`, fornitoreError);
      toast.error(`Errore recupero dettagli fornitore per sincronizzazione inventario.`);
      throw fornitoreError; // Rilancia l'errore
    }

    const orderWithFornitoreInfo: OrdineAcquisto = {
      ...updatedOrdine,
      fornitore_nome: fornitoreData.nome || 'N/A',
      fornitore_tipo: fornitoreData.tipo_fornitore || 'N/A',
      articoli: (updatedOrdine.articoli || []) as ArticoloOrdineAcquisto[],
    };
    await syncArticleInventoryStatus(orderWithFornitoreInfo);

    toast.success(`✅ Ordine d'acquisto '${updatedOrdine.numero_ordine || id}' modificato con successo!`);
    await loadOrdiniAcquisto();
    return { success: true, data: updatedOrdine };
  }, [loadOrdiniAcquisto, syncArticleInventoryStatus]);

  // 7. Define cancelOrdineAcquisto, which depends on updateOrdineAcquistoStatus
  const cancelOrdineAcquisto = useCallback(async (id: string) => {
    const { data: ordineToUpdate, error: fetchError } = await supabase
      .from('ordini_acquisto')
      .select('numero_ordine, stato')
      .eq('id', id)
      .single();

    if (fetchError) {
      toast.error(`Errore recupero ordine per annullamento: ${fetchError.message}`);
      return { success: false, error: fetchError };
    }

    if (ordineToUpdate?.stato === 'annullato') {
      toast.info(`L'ordine '${ordineToUpdate.numero_ordine}' è già annullato.`);
      return { success: true };
    }

    const { success, error } = await updateOrdineAcquistoStatus(id, 'annullato');

    if (success) {
      toast.success(`✅ Ordine d'acquisto '${ordineToUpdate?.numero_ordine}' annullato con successo!`);
    } else {
      toast.error(`Errore annullamento ordine: ${error?.message}`);
    }
    return { success, error };
  }, [updateOrdineAcquistoStatus]);

  // 8. Define deleteOrdineAcquistoPermanently, which depends on loadOrdiniAcquisto
  const deleteOrdineAcquistoPermanently = useCallback(async (id: string, numeroOrdine: string) => {
    try {
      const previousOrdiniAcquisto = ordiniAcquisto;
      setOrdiniAcquisto(prev => prev.filter(order => order.id !== id));

      await supabase.from('ordini').delete().eq('ordine', numeroOrdine);
      await supabase.from('giacenza').delete().eq('ordine', numeroOrdine);
      // NUOVO: Elimina le fustelle associate a questo ordine d'acquisto
      await supabase.from('fustelle').delete().eq('ordine_acquisto_numero', numeroOrdine);
      
      const { error } = await supabase
        .from('ordini_acquisto')
        .delete()
        .eq('id', id);

      if (error) {
        setOrdiniAcquisto(previousOrdiniAcquisto); // ROLLBACK
        throw error;
      }

      toast.success(`🗑️ Ordine d'acquisto '${numeroOrdine}' eliminato definitivamente!`);
      await loadOrdiniAcquisto();
      return { success: true };
    } catch (error: any) {
      toast.error(`Errore eliminazione definitiva ordine: ${error.message || 'Errore sconosciuto'}`);
      return { success: false, error };
    }
  }, [loadOrdiniAcquisto, ordiniAcquisto]);

  useEffect(() => {
    loadOrdiniAcquisto();

    const ordiniAcquistoChannel = supabase
      .channel('ordini_acquisto_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ordini_acquisto' }, () => {
        loadOrdiniAcquisto();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ordiniAcquistoChannel);
    };
  }, [loadOrdiniAcquisto]);

  return {
    ordiniAcquisto,
    loading,
    addOrdineAcquisto,
    updateOrdineAcquisto,
    updateOrdineAcquistoStatus,
    updateArticleStatusInOrder,
    cancelOrdineAcquisto,
    deleteOrdineAcquistoPermanently,
    loadOrdiniAcquisto,
  };
}