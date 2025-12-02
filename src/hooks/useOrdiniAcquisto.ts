import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { OrdineAcquisto, ArticoloOrdineAcquisto, Cartone, Fustella } from '@/types';
import { toast } from 'sonner';
import { generateNextCartoneCode } from '@/utils/cartoneUtils';
import { useCartoni } from './useCartoni'; // Importa useCartoni per refetchCartoniData

export function useOrdiniAcquisto() {
  const [ordiniAcquisto, setOrdiniAcquisto] = useState<OrdineAcquisto[]>([]);
  const [loading, setLoading] = useState(true);
  const { refetchCartoniData } = useCartoni(); // Ottieni la funzione per ricaricare i dati dei cartoni

  // 1. Define syncArticleInventoryStatus first, as it's a helper for others and has no internal dependencies on other useCallback functions in this file.
  const syncArticleInventoryStatus = useCallback(async (ordineAcquisto: OrdineAcquisto) => {
    console.log(`[syncArticleInventoryStatus] Sincronizzazione articoli per OA: ${ordineAcquisto.numero_ordine}`);
    const fornitoreNome = ordineAcquisto.fornitore_nome || 'N/A';
    const isCartoneFornitore = ordineAcquisto.fornitore_tipo === 'Cartone';
    const isFustelleFornitore = ordineAcquisto.fornitore_tipo === 'Fustelle';

    console.log(`[syncArticleInventoryStatus] Fornitore Type: ${ordineAcquisto.fornitore_tipo}, isCartoneFornitore: ${isCartoneFornitore}, isFustelleFornitore: ${isFustelleFornitore}`);

    if (!Array.isArray(ordineAcquisto.articoli)) {
      console.error(`[syncArticleInventoryStatus] Errore: ordineAcquisto.articoli non è un array per OA: ${ordineAcquisto.numero_ordine}. Tipo: ${typeof ordineAcquisto.articoli}, Valore:`, ordineAcquisto.articoli);
      toast.error(`Errore interno: Articoli dell'ordine non validi per ${ordineAcquisto.numero_ordine}.`);
      return;
    }

    const validArticles = ordineAcquisto.articoli.filter(art => art !== null && art !== undefined);
    console.log(`[syncArticleInventoryStatus] Articoli validi dopo il filtro (${validArticles.length} di ${ordineAcquisto.articoli.length}):`, JSON.stringify(validArticles, null, 2));

    if (!isCartoneFornitore && !isFustelleFornitore) {
      console.log(`[syncArticleInventoryStatus] Fornitore non è Cartone o Fustelle. Nessuna sincronizzazione inventario necessaria.`);
      return;
    }

    // Step 1: Fetch existing giacenza/ordini/fustelle entries for this order BEFORE any deletion
    const { data: existingGiacenzaEntries } = await supabase.from('giacenza').select('*').eq('ordine', ordineAcquisto.numero_ordine);
    const { data: existingOrdiniEntries } = await supabase.from('ordini').select('*').eq('ordine', ordineAcquisto.numero_ordine);
    const { data: existingFustelleEntries } = await supabase.from('fustelle').select('*').eq('ordine_acquisto_numero', ordineAcquisto.numero_ordine);

    // Step 2: Delete all articles of this order from 'ordini', 'giacenza', and 'fustelle'
    await supabase.from('ordini').delete().eq('ordine', ordineAcquisto.numero_ordine);
    await supabase.from('giacenza').delete().eq('ordine', ordineAcquisto.numero_ordine);
    await supabase.from('esauriti').delete().eq('ordine', ordineAcquisto.numero_ordine); // Aggiunto per pulire anche esauriti
    await supabase.from('fustelle').delete().eq('ordine_acquisto_numero', ordineAcquisto.numero_ordine);

    // Step 3: Re-insert/update based on the current state of ordineAcquisto.articoli
    for (const articolo of validArticles) { // Itera solo sugli articoli validi
      console.log(`[syncArticleInventoryStatus] Inizio elaborazione articolo nel loop:`, JSON.stringify(articolo, null, 2));
      try {
        if (articolo.stato === 'annullato') {
          console.log(`[syncArticleInventoryStatus] Articolo ${articolo.codice_ctn || articolo.fustella_codice || articolo.pulitore_codice_fustella || articolo.descrizione} è annullato. Saltato.`);
          continue;
        }

        if (isCartoneFornitore) {
          const codiceCtn = articolo.codice_ctn;
          if (!codiceCtn) {
            console.warn(`[syncArticleInventoryStatus] Articolo Cartone senza codice CTN. Saltato.`);
            continue;
          }

          const numFogli = articolo.numero_fogli;
          if (numFogli === undefined || numFogli <= 0) {
            console.warn(`[syncArticleInventoryStatus] Articolo Cartone '${codiceCtn}' con numero_fogli non valido. Saltato.`);
            continue;
          }

          // Costruisci l'oggetto Cartone con i campi specifici per la tabella 'ordini' o 'giacenza'
          const cartoneBase: Omit<Cartone, 'confermato' | 'data_consegna'> = {
            codice: codiceCtn,
            fornitore: fornitoreNome,
            ordine: ordineAcquisto.numero_ordine,
            tipologia: articolo.tipologia_cartone || articolo.descrizione || 'N/A',
            formato: articolo.formato || 'N/A',
            grammatura: articolo.grammatura || 'N/A',
            fogli: numFogli,
            cliente: articolo.cliente || 'N/A',
            lavoro: articolo.lavoro || 'N/A',
            prezzo: articolo.prezzo_unitario,
            note: ordineAcquisto.note || '-',
            fsc: articolo.fsc,
            alimentare: articolo.alimentare,
            rif_commessa_fsc: articolo.rif_commessa_fsc || null,
            // Campi di arrivo, ora presi da ArticoloOrdineAcquisto
            ddt: articolo.ddt || null,
            data_arrivo: articolo.data_arrivo || null,
            magazzino: articolo.magazzino || null,
          };

          if (articolo.stato === 'in_attesa' || articolo.stato === 'inviato' || articolo.stato === 'confermato') {
            console.log(`[syncArticleInventoryStatus] Inserting into 'ordini':`, JSON.stringify(cartoneBase, null, 2));
            const { error: insertError } = await supabase.from('ordini').insert([{ ...cartoneBase, data_consegna: articolo.data_consegna_prevista, confermato: articolo.stato === 'confermato' }]);
            if (insertError) {
              console.error(`[syncArticleInventoryStatus] Errore inserimento in ordini per cartone '${codiceCtn}':`, insertError);
              toast.error(`Errore inserimento in ordini: ${insertError.message}`);
            } else {
              console.log(`[syncArticleInventoryStatus] Inserimento in 'ordini' riuscito per cartone '${codiceCtn}'.`);
            }
          } else if (articolo.stato === 'ricevuto') {
            if (numFogli > 0) {
              console.log(`[syncArticleInventoryStatus] Inserting into 'giacenza':`, JSON.stringify(cartoneBase, null, 2));
              const { error: insertError } = await supabase.from('giacenza').insert([cartoneBase]);
              if (insertError) {
                console.error(`[syncArticleInventoryStatus] Errore inserimento in giacenza per cartone '${codiceCtn}':`, insertError);
                toast.error(`Errore inserimento in giacenza: ${insertError.message}`);
              } else {
                console.log(`[syncArticleInventoryStatus] Inserimento in 'giacenza' riuscito per cartone '${codiceCtn}'.`);
              }
            } else {
              // Se lo stato è 'ricevuto' ma i fogli sono 0, va in esauriti
              console.log(`[syncArticleInventoryStatus] Inserting into 'esauriti' (fogli 0):`, JSON.stringify(cartoneBase, null, 2));
              const { error: insertError } = await supabase.from('esauriti').insert([{ ...cartoneBase, fogli: 0 }]);
              if (insertError) {
                console.error(`[syncArticleInventoryStatus] Errore inserimento in esauriti per cartone '${codiceCtn}':`, insertError);
                toast.error(`Errore inserimento in esauriti: ${insertError.message}`);
              } else {
                console.log(`[syncArticleInventoryStatus] Inserimento in 'esauriti' riuscito per cartone '${codiceCtn}'.`);
              }
            }
          }
        } else if (isFustelleFornitore) {
          console.log(`[syncArticleInventoryStatus] Articolo per fornitore Fustelle. fustella_codice: '${articolo.fustella_codice}', pulitore_codice_fustella: '${articolo.pulitore_codice_fustella}', codice_fornitore_fustella: '${articolo.codice_fornitore_fustella}'`);

          if (articolo.fustella_codice) { // Se è una fustella
            const fustellaCodice = articolo.fustella_codice;
            const fustellaBase: Fustella = {
              codice: fustellaCodice,
              fornitore: fornitoreNome,
              codice_fornitore: articolo.codice_fornitore_fustella || null,
              cliente: articolo.cliente || 'N/A',
              lavoro: articolo.lavoro || 'N/A',
              fustellatrice: articolo.fustellatrice || null,
              resa: articolo.resa_fustella || null,
              pulitore_codice: articolo.pulitore_codice_fustella || null,
              pinza_tagliata: articolo.pinza_tagliata || false,
              tasselli_intercambiabili: articolo.tasselli_intercambiabili || false,
              nr_tasselli: articolo.nr_tasselli || null,
              incollatura: articolo.incollatura || false,
              incollatrice: articolo.incollatrice || null,
              tipo_incollatura: articolo.tipo_incollatura || null,
              disponibile: articolo.stato === 'ricevuto',
              data_creazione: new Date().toISOString(),
              ultima_modifica: new Date().toISOString(),
              ordine_acquisto_numero: ordineAcquisto.numero_ordine,
            };

            const { error: insertError } = await supabase.from('fustelle').insert([fustellaBase]);
            if (insertError) {
              console.error(`[syncArticleInventoryStatus] Errore inserimento fustella '${fustellaCodice}':`, insertError);
              toast.error(`Errore inserimento fustella: ${insertError.message}`);
            }
          } else if (articolo.pulitore_codice_fustella && articolo.codice_fornitore_fustella) {
            console.log(`[syncArticleInventoryStatus] Identificato come Pulitore Autonomo. Pulitore Codice: '${articolo.pulitore_codice_fustella}', Target Fustella Codice Fornitore: '${articolo.codice_fornitore_fustella}'`);
            const pulitoreCodice = articolo.pulitore_codice_fustella;
            const targetFustellaCodiceFornitore = articolo.codice_fornitore_fustella;

            const { data: existingFustellaForPulitore } = await supabase
              .from('fustelle')
              .select('codice, pulitore_codice')
              .eq('codice_fornitore', targetFustellaCodiceFornitore)
              .single();

            if (existingFustellaForPulitore) {
              console.log(`[syncArticleInventoryStatus] Trovata fustella esistente per pulitore: ${existingFustellaForPulitore.codice}. Aggiornamento pulitore_codice.`);
              if (existingFustellaForPulitore.pulitore_codice !== pulitoreCodice) {
                const { error: updateError } = await supabase
                  .from('fustelle')
                  .update({ pulitore_codice: pulitoreCodice, ultima_modifica: new Date().toISOString() })
                  .eq('codice', existingFustellaForPulitore.codice);

                if (updateError) {
                  console.error(`[syncArticleInventoryStatus] Supabase ERROR updating pulitore_codice for fustella ${existingFustellaForPulitore.codice}:`, updateError);
                  toast.error(`Errore aggiornamento codice pulitore per fustella ${existingFustellaForPulitore.codice}: ${updateError.message}`);
                } else {
                  console.log(`[syncArticleInventoryStatus] SUCCESS: Codice pulitore '${pulitoreCodice}' aggiornato per fustella '${existingFustellaForPulitore.codice}'.`);
                  toast.success(`Codice pulitore '${pulitoreCodice}' aggiornato per fustella '${existingFustellaForPulitore.codice}'`);
                }
              }
            } else {
              console.warn(`[syncArticleInventoryStatus] Nessuna fustella trovata con codice fornitore '${targetFustellaCodiceFornitore}' per associare il pulitore '${pulitoreCodice}'.`);
              toast.error(`Nessuna fustella trovata con codice fornitore '${targetFustellaCodiceFornitore}' per associare il pulitore '${pulitoreCodice}'.`);
            }
          } else {
            console.log(`[syncArticleInventoryStatus] Articolo Fustelle generico o incompleto. Descrizione: '${articolo.descrizione}'. Nessuna azione di inventario specifica.`);
          }
        }
      } catch (e: any) {
        console.error(`[syncArticleInventoryStatus] Errore durante la sincronizzazione dell'articolo (catch interno per articolo: ${JSON.stringify(articolo)}):`, e);
        toast.error(`Errore interno durante la sincronizzazione dell'articolo: ${e.message}`);
      }
    }
    // Chiamiamo refetchCartoniData qui per assicurarci che i dati del magazzino siano aggiornati
    await refetchCartoniData();
  }, [refetchCartoniData]); // Aggiungi refetchCartoniData alle dipendenze

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

  const updateArticleInPurchaseOrder = useCallback(async (
    orderNumeroOrdine: string,
    articleIdentifier: string,
    newArticleStatus: ArticoloOrdineAcquisto['stato'],
    partialArticleData: Partial<ArticoloOrdineAcquisto> = {}
  ) => {
    console.log(`[useOrdiniAcquisto - updateArticleInPurchaseOrder] Inizio per OA: '${orderNumeroOrdine}', Articolo: '${articleIdentifier}', Nuovo stato: '${newArticleStatus}', Dati parziali:`, partialArticleData);

    const { data: ordineAcquistoToUpdate, error: fetchError } = await supabase
      .from('ordini_acquisto')
      .select(`*`)
      .eq('numero_ordine', orderNumeroOrdine.trim())
      .single();

    if (fetchError || !ordineAcquistoToUpdate) {
      console.error(`[useOrdiniAcquisto - updateArticleInPurchaseOrder] Errore recupero ordine d'acquisto '${orderNumeroOrdine.trim()}':`, fetchError);
      toast.error(`Errore recupero ordine d'acquisto per aggiornamento articolo: ${fetchError?.message || 'Ordine non trovato o errore sconosciuto.'}`);
      return { success: false, error: fetchError };
    }
    console.log(`[useOrdiniAcquisto - updateArticleInPurchaseOrder] Ordine d'acquisto trovato:`, ordineAcquistoToUpdate);

    let updatedArticles = (ordineAcquistoToUpdate.articoli || []) as ArticoloOrdineAcquisto[];
    let articleFound = false;
    updatedArticles = updatedArticles.map(art => {
      const isMatch = (art.codice_ctn && art.codice_ctn === articleIdentifier) ||
                      (art.fustella_codice && art.fustella_codice === articleIdentifier) ||
                      (art.pulitore_codice_fustella && art.pulitore_codice_fustella === articleIdentifier) ||
                      (art.descrizione && art.descrizione === articleIdentifier);

      if (isMatch) {
        articleFound = true;
        return { ...art, ...partialArticleData, stato: newArticleStatus };
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
        const pulitorePrice = item.hasPulitore ? (item.prezzo_pulitore || 0) : 0;
        return sum + (qty * price) + pulitorePrice;
      }
      return sum;
    }, 0);

    const previousOrdiniAcquisto = ordiniAcquisto;
    setOrdiniAcquisto(prev => prev.map(order => {
      if (order.numero_ordine === orderNumeroOrdine) {
        return { ...order, articoli: updatedArticles, importo_totale: newImportoTotale };
      }
      return order;
    }));

    const { data: updatedOrdine, error: updateError } = await supabase
      .from('ordini_acquisto')
      .update({ articoli: updatedArticles as any, importo_totale: newImportoTotale, updated_at: new Date().toISOString() })
      .eq('numero_ordine', orderNumeroOrdine)
      .select(`*`)
      .single();

    if (updateError) {
      toast.error(`Errore aggiornamento stato articolo: ${updateError.message}`);
      setOrdiniAcquisto(previousOrdiniAcquisto);
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

    const { data: fornitoreData, error: fornitoreError } = await supabase
      .from('fornitori')
      .select('nome, tipo_fornitore')
      .eq('id', updatedOrdine.fornitore_id)
      .single();

    if (fornitoreError || !fornitoreData) {
      console.error(`[useOrdiniAcquisto - updateArticleInPurchaseOrder] Errore recupero dettagli fornitore per OA: ${updatedOrdine.numero_ordine}`, fornitoreError);
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

  const updateOrdineAcquistoStatus = useCallback(async (id: string, newStatus: OrdineAcquisto['stato']) => {
    const { data: currentOrdine, error: fetchError } = await supabase
      .from('ordini_acquisto')
      .select(`*`)
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
        const pulitorePrice = item.hasPulitore ? (item.prezzo_pulitore || 0) : 0;
        return sum + (qty * price) + pulitorePrice;
      }
      return sum;
    }, 0);

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

    const { data: updatedOrdine, error } = await supabase
      .from('ordini_acquisto')
      .update({ stato: newStatus, articoli: articlesForDbUpdate as any, importo_totale: newImportoTotale, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(`*`)
      .single();

    if (error) {
      toast.error(`Errore aggiornamento stato ordine: ${error.message}`);
      setOrdiniAcquisto(previousOrdiniAcquisto);
      return { success: false, error };
    }
    
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

  const addOrdineAcquisto = useCallback(async (ordine: Omit<OrdineAcquisto, 'id' | 'created_at' | 'fornitore_nome' | 'fornitore_tipo' | 'updated_at'>) => {
    const orderToInsert = { ...ordine };

    const { data: newOrdine, error: ordineError } = await supabase
      .from('ordini_acquisto')
      .insert([orderToInsert])
      .select(`*`)
      .single();

    if (ordineError) {
      toast.error(`Errore aggiunta ordine: ${ordineError.message}`);
      throw ordineError;
    }

    const { data: fornitoreData, error: fornitoreError } = await supabase
      .from('fornitori')
      .select('nome, tipo_fornitore')
      .eq('id', newOrdine.fornitore_id)
      .single();

    if (fornitoreError || !fornitoreData) {
      console.error(`[useOrdiniAcquisto - addOrdineAcquisto] Errore recupero dettagli fornitore per OA: ${newOrdine.numero_ordine}`, fornitoreError);
      toast.error(`Errore recupero dettagli fornitore per sincronizzazione inventario.`);
      throw fornitoreError;
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

  const updateOrdineAcquisto = useCallback(async (id: string, ordine: Partial<Omit<OrdineAcquisto, 'id' | 'created_at' | 'fornitore_nome' | 'fornitore_tipo' | 'updated_at'>>) => {
    const orderToUpdate = { ...ordine };

    const { data: updatedOrdine, error: ordineError } = await supabase
      .from('ordini_acquisto')
      .update(orderToUpdate)
      .eq('id', id)
      .select(`*`)
      .single();

    if (ordineError) {
      toast.error(`Errore modifica ordine: ${ordineError.message}`);
      throw ordineError;
    }

    const { data: fornitoreData, error: fornitoreError } = await supabase
      .from('fornitori')
      .select('nome, tipo_fornitore')
      .eq('id', updatedOrdine.fornitore_id)
      .single();

    if (fornitoreError || !fornitoreData) {
      console.error(`[useOrdiniAcquisto - updateOrdineAcquisto] Errore recupero dettagli fornitore per OA: ${updatedOrdine.numero_ordine}`, fornitoreError);
      toast.error(`Errore recupero dettagli fornitore per sincronizzazione inventario.`);
      throw fornitoreError;
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

  const deleteOrdineAcquistoPermanently = useCallback(async (id: string, numeroOrdine: string) => {
    try {
      const previousOrdiniAcquisto = ordiniAcquisto;
      setOrdiniAcquisto(prev => prev.filter(order => order.id !== id));

      const { data: orderToDelete, error: fetchOrderError } = await supabase
        .from('ordini_acquisto')
        .select('articoli, fornitore_id')
        .eq('id', id)
        .single();

      if (fetchOrderError || !orderToDelete) {
        console.error(`Error fetching order ${numeroOrdine} for permanent deletion:`, fetchOrderError);
        toast.error(`Errore nel recupero dell'ordine per eliminazione: ${fetchOrderError?.message || 'Ordine non trovato'}`);
        setOrdiniAcquisto(previousOrdiniAcquisto);
        return { success: false, error: fetchOrderError };
      }

      const { data: fornitoreData, error: fornitoreError } = await supabase
        .from('fornitori')
        .select('tipo_fornitore')
        .eq('id', orderToDelete.fornitore_id)
        .single();

      const isFustelleFornitore = fornitoreData?.tipo_fornitore === 'Fustelle';

      if (isFustelleFornitore && orderToDelete.articoli) {
        for (const article of orderToDelete.articoli as ArticoloOrdineAcquisto[]) {
          if (article.pulitore_codice_fustella && !article.fustella_codice && article.codice_fornitore_fustella) {
            console.log(`[deleteOrdineAcquistoPermanently] Clearing pulitore_codice for fustella with codice_fornitore: ${article.codice_fornitore_fustella}`);
            const { error: updateFustellaError } = await supabase
              .from('fustelle')
              .update({ pulitore_codice: null, ultima_modifica: new Date().toISOString() })
              .eq('codice_fornitore', article.codice_fornitore_fustella);

            if (updateFustellaError) {
              console.error(`Error clearing pulitore_codice for fustella (codice_fornitore: ${article.codice_fornitore_fustella}):`, updateFustellaError);
            }
          }
        }
      }

      await supabase.from('ordini').delete().eq('ordine', numeroOrdine);
      await supabase.from('giacenza').delete().eq('ordine', numeroOrdine);
      await supabase.from('esauriti').delete().eq('ordine', numeroOrdine); // Aggiunto per pulire anche esauriti
      await supabase.from('fustelle').delete().eq('ordine_acquisto_numero', numeroOrdine);

      const { error } = await supabase
        .from('ordini_acquisto')
        .delete()
        .eq('id', id);

      if (error) {
        setOrdiniAcquisto(previousOrdiniAcquisto);
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
    updateArticleInPurchaseOrder, 
    cancelOrdineAcquisto,
    deleteOrdineAcquistoPermanently,
    loadOrdiniAcquisto,
  };
}