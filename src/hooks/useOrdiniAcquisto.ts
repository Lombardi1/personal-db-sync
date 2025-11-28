import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { OrdineAcquisto, ArticoloOrdineAcquisto, Cartone } from '@/types';
import { toast } from 'sonner';
import { generateNextCartoneCode } from '@/utils/cartoneUtils';
import { convertEmptyStringsToNull } from '@/lib/utils'; // Importa la nuova funzione

export function useOrdiniAcquisto() {
  const [ordiniAcquisto, setOrdiniAcquisto] = useState<OrdineAcquisto[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Define syncArticleInventoryStatus first, as it's a helper for others and has no internal dependencies on other useCallback functions in this file.
  const syncArticleInventoryStatus = useCallback(async (ordineAcquisto: OrdineAcquisto) => {
    console.log(`[syncArticleInventoryStatus] Sincronizzazione articoli per OA: ${ordineAcquisto.numero_ordine}`);
    const fornitoreNome = ordineAcquisto.fornitore_nome || 'N/A';
    const isCartoneFornitore = ordineAcquisto.fornitore_tipo === 'Cartone';
    const isFustelleFornitore = ordineAcquisto.fornitore_tipo === 'Fustelle'; // Nuovo flag

    // Elimina tutti gli articoli di questo ordine dalle tabelle 'ordini' e 'giacenza'
    // Questo è un reset per garantire la coerenza prima di reinserire
    console.log(`[syncArticleInventoryStatus] Eliminazione articoli esistenti per ordine ${ordineAcquisto.numero_ordine} da 'ordini' e 'giacenza'.`);
    await supabase.from('ordini').delete().eq('ordine', ordineAcquisto.numero_ordine);
    await supabase.from('giacenza').delete().eq('ordine', ordineAcquisto.numero_ordine); // Anche da giacenza

    if (!isCartoneFornitore && !isFustelleFornitore) { // Se non è né cartone né fustelle, non sincronizzare l'inventario
      console.log(`[syncArticleInventoryStatus] Fornitore non di tipo 'Cartone' o 'Fustelle'. Nessuna sincronizzazione inventario.`);
      return;
    }

    if (!Array.isArray(ordineAcquisto.articoli)) {
      toast.error(`Errore interno: Articoli dell'ordine non validi per ${ordineAcquisto.numero_ordine}.`);
      console.error(`[syncArticleInventoryStatus] Errore: Articoli dell'ordine non validi per ${ordineAcquisto.numero_ordine}.`, ordineAcquisto.articoli);
      return;
    }

    for (const articolo of ordineAcquisto.articoli) {
      try {
        if (isCartoneFornitore) {
          const codiceCtn = articolo.codice_ctn;
          if (!codiceCtn) {
            console.warn(`[syncArticleInventoryStatus] Articolo senza codice CTN nell'ordine ${ordineAcquisto.numero_ordine}. Saltato.`);
            continue;
          }

          const numFogli = articolo.numero_fogli;
          if (numFogli === undefined || numFogli === null || numFogli <= 0) { // Aggiunto controllo per null
            console.warn(`[syncArticleInventoryStatus] Articolo ${codiceCtn} con numero di fogli non valido nell'ordine ${ordineAcquisto.numero_ordine}. Saltato.`);
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
            prezzo: articolo.prezzo_unitario || 0, // Default a 0 se null
            data_consegna: articolo.data_consegna_prevista,
            note: ordineAcquisto.note || '-',
            confermato: false, // Default per ordini in arrivo
            fsc: articolo.fsc || false,
            alimentare: articolo.alimentare || false,
            rif_commessa_fsc: articolo.rif_commessa_fsc || null,
          };

          if (articolo.stato === 'in_attesa' || articolo.stato === 'inviato' || articolo.stato === 'confermato') {
            const isConfirmedForOrdiniTable = articolo.stato === 'confermato';
            console.log(`[syncArticleInventoryStatus] Inserimento articolo ${codiceCtn} in 'ordini' con stato: ${articolo.stato}.`);
            const { error: insertError } = await supabase.from('ordini').insert([{ ...cartoneBase, confermato: isConfirmedForOrdiniTable }]);
            if (insertError) {
              toast.error(`Errore inserimento in ordini per ${codiceCtn}: ${insertError.message}`);
              console.error(`[syncArticleInventoryStatus] Errore inserimento in 'ordini' per ${codiceCtn}:`, insertError);
            }
          } else if (articolo.stato === 'ricevuto') {
            console.log(`[syncArticleInventoryStatus] Articolo ${codiceCtn} con stato 'ricevuto'. Tentativo di inserimento/aggiornamento in 'giacenza'.`);
            const { data: existingGiacenza, error: fetchGiacenzaError } = await supabase
              .from('giacenza')
              .select('ddt, data_arrivo, magazzino')
              .eq('codice', codiceCtn)
              .single();

            if (fetchGiacenzaError && fetchGiacenzaError.code !== 'PGRST116') {
              toast.error(`Errore recupero giacenza per ${codiceCtn}: ${fetchGiacenzaError.message}`);
              console.error(`[syncArticleInventoryStatus] Errore recupero giacenza per ${codiceCtn}:`, fetchGiacenzaError);
              continue;
            }

            const giacenzaDataToUpdate = {
              ddt: existingGiacenza?.ddt || null,
              data_arrivo: existingGiacenza?.data_arrivo || new Date().toISOString().split('T')[0],
              magazzino: existingGiacenza?.magazzino || '-',
            };

            if (existingGiacenza) {
              console.log(`[syncArticleInventoryStatus] Aggiornamento esistente in 'giacenza' per ${codiceCtn}.`);
              const { error: updateError } = await supabase.from('giacenza').update({ ...cartoneBase, ...giacenzaDataToUpdate }).eq('codice', codiceCtn);
              if (updateError) {
                toast.error(`Errore aggiornamento in giacenza per ${codiceCtn}: ${updateError.message}`);
                console.error(`[syncArticleInventoryStatus] Errore aggiornamento in 'giacenza' per ${codiceCtn}:`, updateError);
              }
            } else {
              console.log(`[syncArticleInventoryStatus] Inserimento nuovo in 'giacenza' per ${codiceCtn}.`);
              const { error: insertError } = await supabase.from('giacenza').insert([{ ...cartoneBase, ...giacenzaDataToUpdate }]);
              if (insertError) {
                toast.error(`Errore inserimento in giacenza per ${codiceCtn}: ${insertError.message}`);
                console.error(`[syncArticleInventoryStatus] Errore inserimento in 'giacenza' per ${codiceCtn}:`, insertError);
              }
            }
          } else if (articolo.stato === 'annullato') {
            console.log(`[syncArticleInventoryStatus] Articolo ${codiceCtn} è annullato. Non inserito in magazzino.`);
          }
        } else if (isFustelleFornitore) {
          console.log(`[syncArticleInventoryStatus] Articolo Fustella '${articolo.fustella_codice}' dell'ordine '${ordineAcquisto.numero_ordine}' con stato '${articolo.stato}'. Nessuna sincronizzazione inventario dedicata implementata per Fustelle in questa fase.`);
        }
      } catch (e: any) {
        toast.error(`Errore interno durante la sincronizzazione dell'articolo: ${e.message}`);
        console.error(`[syncArticleInventoryStatus] Errore durante la sincronizzazione dell'articolo:`, e);
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
      console.error('[useOrdiniAcquisto] Errore generico nel caricamento degli ordini d\'acquisto:', error);
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
      // Check for cartone or fustella code
      if ((art.codice_ctn && art.codice_ctn === articleIdentifier) || (art.fustella_codice && art.fustella_codice === articleIdentifier) || (art.descrizione && art.descrizione === articleIdentifier)) {
        articleFound = true;
        return { ...art, stato: newArticleStatus };
      }
      return art;
    });

    if (!articleFound) {
      toast.error(`Articolo '${articleIdentifier}' non trovato nell'ordine ${orderNumeroOrdine}.`);
      console.error(`[useOrdiniAcquisto - updateArticleStatusInOrder] Articolo '${articleIdentifier}' non trovato nell'ordine ${orderNumeroOrdine}.`);
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
    console.log(`[useOrdiniAcquisto - updateArticleStatusInOrder] Tentativo di aggiornare l'ordine ${orderNumeroOrdine} in Supabase.`);
    const { data: updatedOrdine, error: updateError } = await supabase
      .from('ordini_acquisto')
      .update({ articoli: updatedArticles as any, importo_totale: newImportoTotale, updated_at: new Date().toISOString() })
      .eq('numero_ordine', orderNumeroOrdine)
      .select(`*`) // Simplified select
      .single();

    if (updateError) {
      toast.error(`Errore aggiornamento stato articolo: ${updateError.message}`);
      console.error(`[useOrdiniAcquisto - updateArticleStatusInOrder] Errore Supabase durante l'aggiornamento stato articolo:`, updateError);
      setOrdiniAcquisto(previousOrdiniAcquisto); // ROLLBACK
      return { success: false, error: updateError };
    }
    console.log(`[useOrdiniAcquisto - updateArticleStatusInOrder] Ordine ${orderNumeroOrdine} aggiornato con successo in Supabase.`);

    const allArticlesCancelled = updatedArticles.every(art => art.stato === 'annullato');
    if (allArticlesCancelled && updatedOrdine.stato !== 'annullato') {
        console.log(`[useOrdiniAcquisto - updateArticleStatusInOrder] Tutti gli articoli sono annullati, aggiornamento stato principale ordine a 'annullato'.`);
        const { error: mainStatusUpdateError } = await supabase
            .from('ordini_acquisto')
            .update({ stato: 'annullato', updated_at: new Date().toISOString() })
            .eq('id', updatedOrdine.id);

        if (mainStatusUpdateError) {
            toast.error(`Errore aggiornamento stato principale ordine: ${mainStatusUpdateError.message}`);
            console.error(`[useOrdiniAcquisto - updateArticleStatusInOrder] Errore Supabase durante l'aggiornamento stato principale ordine:`, mainStatusUpdateError);
        } else {
            updatedOrdine.stato = 'annullato';
            console.log(`[useOrdiniAcquisto - updateArticleStatusInOrder] Stato principale ordine aggiornato a 'annullato'.`);
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
    console.log(`[useOrdiniAcquisto - updateArticleStatusInOrder] Operazione completata per OA: '${orderNumeroOrdine}'.`);
    return { success: true, data: updatedOrdine };
  }, [loadOrdiniAcquisto, syncArticleInventoryStatus, ordiniAcquisto]);

  // 4. Define updateOrdineAcquistoStatus, which depends on syncArticleInventoryStatus and loadOrdiniAcquisto
  const updateOrdineAcquistoStatus = useCallback(async (id: string, newStatus: OrdineAcquisto['stato']) => {
    console.log(`[useOrdiniAcquisto - updateOrdineAcquistoStatus] Inizio per ID: '${id}', Nuovo stato: '${newStatus}'`);
    // Recupera l'ordine completo per poter sincronizzare gli articoli
    const { data: currentOrdine, error: fetchError } = await supabase
      .from('ordini_acquisto')
      .select(`*`) // Simplified select
      .eq('id', id)
      .single();

    if (fetchError || !currentOrdine) {
      toast.error(`Errore recupero ordine per aggiornamento stato: ${fetchError?.message}`);
      console.error(`[useOrdiniAcquisto - updateOrdineAcquistoStatus] Errore recupero ordine per aggiornamento stato:`, fetchError);
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

    console.log(`[useOrdiniAcquisto - updateOrdineAcquistoStatus] Tentativo di aggiornare lo stato dell'ordine ${currentOrdine.numero_ordine} in Supabase.`);
    const { data: updatedOrdine, error } = await supabase
      .from('ordini_acquisto')
      .update({ stato: newStatus, articoli: articlesForDbUpdate as any, importo_totale: newImportoTotale, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(`*`) // Simplified select
      .single();

    if (error) {
      toast.error(`Errore aggiornamento stato ordine: ${error.message}`);
      console.error(`[useOrdiniAcquisto - updateOrdineAcquistoStatus] Errore Supabase durante l'aggiornamento stato ordine:`, error);
      setOrdiniAcquisto(previousOrdiniAcquisto); // ROLLBACK
      return { success: false, error };
    }
    console.log(`[useOrdiniAcquisto - updateOrdineAcquistoStatus] Stato ordine ${currentOrdine.numero_ordine} aggiornato con successo in Supabase.`);
    
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
    console.log(`[useOrdiniAcquisto - updateOrdineAcquistoStatus] Operazione completata per ID: '${id}'.`);
    return { success: true, data: updatedOrdine };
  }, [loadOrdiniAcquisto, syncArticleInventoryStatus, ordiniAcquisto]);

  // 5. Define addOrdineAcquisto, which depends on syncArticleInventoryStatus and loadOrdiniAcquisto
  const addOrdineAcquisto = useCallback(async (ordine: Omit<OrdineAcquisto, 'id' | 'created_at' | 'fornitore_nome' | 'fornitore_tipo' | 'updated_at'>) => {
    const orderToInsert = convertEmptyStringsToNull({ ...ordine }); // Applica la conversione
    console.log(`[useOrdiniAcquisto - addOrdineAcquisto] Dati da inserire (dopo conversione):`, JSON.stringify(orderToInsert, null, 2));

    console.log(`[useOrdiniAcquisto - addOrdineAcquisto] Tentativo di inserire il nuovo ordine in Supabase.`);
    const { data: newOrdine, error: ordineError } = await supabase
      .from('ordini_acquisto')
      .insert([orderToInsert])
      .select(`*`) // Simplified select
      .single();

    if (ordineError) {
      toast.error(`Errore aggiunta ordine: ${ordineError.message}`);
      console.error(`[useOrdiniAcquisto - addOrdineAcquisto] Errore Supabase durante l'inserimento:`, ordineError);
      return { success: false, error: ordineError };
    }
    console.log(`[useOrdiniAcquisto - addOrdineAcquisto] Ordine inserito con successo in Supabase:`, newOrdine);

    // Fetch fornitore details separately for syncArticleInventoryStatus
    const { data: fornitoreData, error: fornitoreError } = await supabase
      .from('fornitori')
      .select('nome, tipo_fornitore')
      .eq('id', newOrdine.fornitore_id)
      .single();

    if (fornitoreError || !fornitoreData) {
      console.error(`[useOrdiniAcquisto - addOrdineAcquisto] Errore recupero dettagli fornitore per OA: ${newOrdine.numero_ordine}`, fornitoreError);
      toast.error(`Errore recupero dettagli fornitore per sincronizzazione inventario.`);
      return { success: false, error: fornitoreError };
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
    console.log(`[useOrdiniAcquisto - addOrdineAcquisto] Operazione completata per ordine: '${newOrdine.numero_ordine}'.`);
    return { success: true, data: newOrdine };
  }, [loadOrdiniAcquisto, syncArticleInventoryStatus]);

  // 6. Define updateOrdineAcquisto, which depends on syncArticleInventoryStatus and loadOrdiniAcquisto
  const updateOrdineAcquisto = useCallback(async (id: string, ordine: Partial<Omit<OrdineAcquisto, 'id' | 'created_at' | 'fornitore_nome' | 'fornitore_tipo' | 'updated_at'>>) => {
    const orderToUpdate = convertEmptyStringsToNull({ ...ordine }); // Applica la conversione
    console.log(`[useOrdiniAcquisto - updateOrdineAcquisto] Dati da aggiornare per ID: '${id}' (dopo conversione):`, JSON.stringify(orderToUpdate, null, 2));

    console.log(`[useOrdiniAcquisto - updateOrdineAcquisto] Tentativo di aggiornare l'ordine ${id} in Supabase.`);
    const { data: updatedOrdine, error: ordineError } = await supabase
      .from('ordini_acquisto')
      .update(orderToUpdate)
      .eq('id', id)
      .select(`*`) // Simplified select
      .single();

    if (ordineError) {
      toast.error(`Errore modifica ordine: ${ordineError.message}`);
      console.error(`[useOrdiniAcquisto - updateOrdineAcquisto] Errore Supabase durante l'aggiornamento:`, ordineError);
      return { success: false, error: ordineError };
    }
    console.log(`[useOrdiniAcquisto - updateOrdineAcquisto] Ordine ${id} aggiornato con successo in Supabase:`, updatedOrdine);

    // Fetch fornitore details separately for syncArticleInventoryStatus
    const { data: fornitoreData, error: fornitoreError } = await supabase
      .from('fornitori')
      .select('nome, tipo_fornitore')
      .eq('id', updatedOrdine.fornitore_id)
      .single();

    if (fornitoreError || !fornitoreData) {
      console.error(`[useOrdiniAcquisto - updateOrdineAcquisto] Errore recupero dettagli fornitore per OA: ${updatedOrdine.numero_ordine}`, fornitoreError);
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

    toast.success(`✅ Ordine d'acquisto '${updatedOrdine.numero_ordine || id}' modificato con successo!`);
    await loadOrdiniAcquisto();
    console.log(`[useOrdiniAcquisto - updateOrdineAcquisto] Operazione completata per ordine: '${updatedOrdine.numero_ordine}'.`);
    return { success: true, data: updatedOrdine };
  }, [loadOrdiniAcquisto, syncArticleInventoryStatus]);

  // 7. Define cancelOrdineAcquisto, which depends on updateOrdineAcquistoStatus
  const cancelOrdineAcquisto = useCallback(async (id: string) => {
    console.log(`[useOrdiniAcquisto - cancelOrdineAcquisto] Inizio annullamento per ID: '${id}'.`);
    const { data: ordineToUpdate, error: fetchError } = await supabase
      .from('ordini_acquisto')
      .select('numero_ordine, stato')
      .eq('id', id)
      .single();

    if (fetchError) {
      toast.error(`Errore recupero ordine per annullamento: ${fetchError.message}`);
      console.error(`[useOrdiniAcquisto - cancelOrdineAcquisto] Errore recupero ordine per annullamento:`, fetchError);
      return { success: false, error: fetchError };
    }

    if (ordineToUpdate?.stato === 'annullato') {
      toast.info(`L'ordine '${ordineToUpdate.numero_ordine}' è già annullato.`);
      console.log(`[useOrdiniAcquisto - cancelOrdineAcquisto] Ordine '${ordineToUpdate.numero_ordine}' già annullato.`);
      return { success: true };
    }

    const { success, error } = await updateOrdineAcquistoStatus(id, 'annullato');

    if (success) {
      toast.success(`✅ Ordine d'acquisto '${ordineToUpdate?.numero_ordine}' annullato con successo!`);
      console.log(`[useOrdiniAcquisto - cancelOrdineAcquisto] Ordine '${ordineToUpdate?.numero_ordine}' annullato con successo.`);
    } else {
      toast.error(`Errore annullamento ordine: ${error?.message}`);
      console.error(`[useOrdiniAcquisto - cancelOrdineAcquisto] Errore annullamento ordine:`, error);
    }
    return { success, error };
  }, [updateOrdineAcquistoStatus]);

  // 8. Define deleteOrdineAcquistoPermanently, which depends on loadOrdiniAcquisto
  const deleteOrdineAcquistoPermanently = useCallback(async (id: string, numeroOrdine: string) => {
    try {
      console.log(`[useOrdiniAcquisto - deleteOrdineAcquistoPermanently] Inizio eliminazione definitiva per ID: '${id}', Numero Ordine: '${numeroOrdine}'.`);
      const previousOrdiniAcquisto = ordiniAcquisto;
      setOrdiniAcquisto(prev => prev.filter(order => order.id !== id));

      console.log(`[useOrdiniAcquisto - deleteOrdineAcquistoPermanently] Eliminazione articoli correlati da 'ordini' per ordine: '${numeroOrdine}'.`);
      await supabase.from('ordini').delete().eq('ordine', numeroOrdine);
      console.log(`[useOrdiniAcquisto - deleteOrdineAcquistoPermanently] Eliminazione articoli correlati da 'giacenza' per ordine: '${numeroOrdine}'.`);
      await supabase.from('giacenza').delete().eq('ordine', numeroOrdine);
      
      console.log(`[useOrdiniAcquisto - deleteOrdineAcquistoPermanently] Tentativo di eliminare l'ordine d'acquisto principale da 'ordini_acquisto' per ID: '${id}'.`);
      const { error } = await supabase
        .from('ordini_acquisto')
        .delete()
        .eq('id', id);

      if (error) {
        setOrdiniAcquisto(previousOrdiniAcquisto); // ROLLBACK
        console.error(`[useOrdiniAcquisto - deleteOrdineAcquistoPermanently] Errore Supabase durante l'eliminazione definitiva:`, error);
        throw error;
      }
      console.log(`[useOrdiniAcquisto - deleteOrdineAcquistoPermanently] Ordine d'acquisto principale eliminato con successo da Supabase.`);

      toast.success(`🗑️ Ordine d'acquisto '${numeroOrdine}' eliminato definitivamente!`);
      console.log(`[useOrdiniAcquisto - deleteOrdineAcquistoPermanently] Ordine '${numeroOrdine}' eliminato definitivamente.`);
      await loadOrdiniAcquisto();
      return { success: true };
    } catch (error: any) {
      toast.error(`Errore eliminazione definitiva ordine: ${error.message || 'Errore sconosciuto'}`);
      console.error(`[useOrdiniAcquisto - deleteOrdineAcquistoPermanently] Errore generico durante l'eliminazione definitiva:`, error);
      return { success: false, error };
    }
  }, [loadOrdiniAcquisto, ordiniAcquisto]);

  useEffect(() => {
    loadOrdiniAcquisto();

    const ordiniAcquistoChannel = supabase
      .channel('ordini_acquisto_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ordini_acquisto' }, () => {
        console.log('[useOrdiniAcquisto] Realtime change detected for ordini_acquisto. Reloading data.');
        loadOrdiniAcquisto();
      })
      .subscribe();

    return () => {
      console.log('[useOrdiniAcquisto] Unsubscribing from ordini_acquisto_changes channel.');
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