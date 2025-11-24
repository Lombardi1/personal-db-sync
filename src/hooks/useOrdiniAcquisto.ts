import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { OrdineAcquisto, ArticoloOrdineAcquisto, Cartone } from '@/types';
import { toast } from 'sonner';
import { generateNextCartoneCode } from '@/utils/cartoneUtils';

console.log('*** [useOrdiniAcquisto.ts] Modulo caricato e pronto per l\'esportazione. ***'); // Log di debug molto evidente

export function useOrdiniAcquisto() {
  const [ordiniAcquisto, setOrdiniAcquisto] = useState<OrdineAcquisto[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOrdiniAcquisto = useCallback(async () => {
    console.log('[useOrdiniAcquisto] loadOrdiniAcquisto chiamato.');
    setLoading(true);
    try {
      const { data: ordiniData, error: ordiniError } = await supabase
        .from('ordini_acquisto')
        .select(`
          *,
          fornitori ( nome, tipo_fornitore )
        `)
        .order('created_at', { ascending: false }); // Inizialmente ordina per data di creazione, poi riordiniamo in JS

      if (ordiniError) {
        console.error('useOrdiniAcquisto: Errore nel recupero degli ordini principali:', ordiniError);
        toast.error('Errore nel caricamento degli ordini d\'acquisto.');
        setOrdiniAcquisto([]);
        return;
      }

      if (!ordiniData || ordiniData.length === 0) {
        console.log('useOrdiniAcquisto: Nessun ordine d\'acquisto trovato.');
        setOrdiniAcquisto([]);
        return;
      }

      const ordiniWithFornitoreInfo: OrdineAcquisto[] = ordiniData.map(ordine => ({
        ...ordine,
        fornitore_nome: ordine.fornitori?.nome || 'N/A',
        fornitore_tipo: ordine.fornitori?.tipo_fornitore || 'N/A',
        articoli: (ordine.articoli || []) as ArticoloOrdineAcquisto[], // Cast the JSONB array
      }));
      
      console.log('useOrdiniAcquisto: Fornitore type for each order:', ordiniWithFornitoreInfo.map(o => ({ numero_ordine: o.numero_ordine, fornitore_tipo: o.fornitore_tipo }))); // NEW LOG
      console.log('useOrdiniAcquisto: Ordini con info fornitore (prima dell\'ordinamento):', ordiniWithFornitoreInfo.map(o => ({ numero_ordine: o.numero_ordine, stato: o.stato, data_ordine: o.data_ordine, updated_at: o.updated_at })));

      // Applica l'ordinamento desiderato:
      // 1. Per data di ultima modifica (updated_at) decrescente
      // 2. Se updated_at è uguale, per stato ('in_attesa' prima)
      // 3. Se anche lo stato è uguale, per data ordine (data_ordine) decrescente
      const sortedOrdini = [...ordiniWithFornitoreInfo].sort((a, b) => {
        // Primary sort: by updated_at (most recent first)
        const dateAUpdated = new Date(a.updated_at || a.created_at || 0).getTime(); // Fallback to created_at if updated_at is null
        const dateBUpdated = new Date(b.updated_at || b.created_at || 0).getTime(); // Fallback to created_at if updated_at is null

        if (dateAUpdated !== dateBUpdated) {
          return dateBUpdated - dateAUpdated; // Descending order for updated_at
        }

        // Secondary sort: Prioritize 'in_attesa' status
        const statusOrder = {
          'in_attesa': 1,
          'inviato': 2,
          'confermato': 3,
          'ricevuto': 4,
          'annullato': 5,
        };
        const statusA = statusOrder[a.stato] || 99;
        const statusB = statusOrder[b.stato] || 99;

        if (statusA !== statusB) {
          return statusA - statusB;
        }

        // Tertiary sort: by data_ordine (most recent first)
        const dateAOrder = new Date(a.data_ordine).getTime();
        const dateBOrder = new Date(b.data_ordine).getTime();
        return dateBOrder - dateAOrder;
      });

      console.log('useOrdiniAcquisto: Ordini finali ordinati (dopo l\'ordinamento):', sortedOrdini.map(o => ({ numero_ordine: o.numero_ordine, stato: o.stato, data_ordine: o.data_ordine, updated_at: o.updated_at })));
      setOrdiniAcquisto(sortedOrdini);
      console.log('[useOrdiniAcquisto] Stato ordiniAcquisto aggiornato.');
    } catch (error) {
      console.error('useOrdiniAcquisto: Errore generico nel caricamento ordini d\'acquisto:', error);
      toast.error('Errore nel caricamento degli ordini d\'acquisto.');
      setOrdiniAcquisto([]);
    } finally {
      setLoading(false);
    }
  }, []); // Dipendenze vuote per useCallback

  // Helper per sincronizzare lo stato degli articoli con le tabelle di magazzino (ordini e giacenza)
  const syncArticleInventoryStatus = useCallback(async (ordineAcquisto: OrdineAcquisto) => {
    console.log(`[syncArticleInventoryStatus] Sincronizzazione articoli per OA: ${ordineAcquisto.numero_ordine}`);
    console.log(`[syncArticleInventoryStatus] Fornitore Tipo per OA ${ordineAcquisto.numero_ordine}: ${ordineAcquisto.fornitore_tipo}`); // NEW LOG
    const fornitoreNome = ordineAcquisto.fornitore_nome || 'N/A';
    const isCartoneFornitore = ordineAcquisto.fornitore_tipo === 'Cartone';
    console.log(`[syncArticleInventoryStatus] isCartoneFornitore: ${isCartoneFornitore}`); // NEW LOG

    // NEW: Initial cleanup - remove all articles associated with this purchase order from 'ordini'
    // We no longer delete from 'giacenza' here, as 'spostaInGiacenza' handles that.
    await supabase.from('ordini').delete().eq('ordine', ordineAcquisto.numero_ordine);
    console.log(`[syncArticleInventoryStatus] Eseguita pulizia iniziale per OA: ${ordineAcquisto.numero_ordine} da 'ordini'.`);

    if (!isCartoneFornitore) {
      console.log(`[syncArticleInventoryStatus] Non è un fornitore di cartone, nessuna azione aggiuntiva richiesta dopo la pulizia.`);
      return;
    }

    // Defensive check for articles array
    if (!Array.isArray(ordineAcquisto.articoli)) {
      console.error(`[syncArticleInventoryStatus] Errore: ordineAcquisto.articoli non è un array per OA: ${ordineAcquisto.numero_ordine}`, ordineAcquisto.articoli);
      toast.error(`Errore interno: Articoli dell'ordine non validi per ${ordineAcquisto.numero_ordine}.`);
      return;
    }

    console.log(`[syncArticleInventoryStatus] Preparing to process ${ordineAcquisto.articoli.length} articles.`);
    console.log(`[syncArticleInventoryStatus] Articles array content:`, JSON.stringify(ordineAcquisto.articoli, null, 2));

    for (const articolo of ordineAcquisto.articoli) { // Changed from Promise.all(map) to for...of loop
      try {
        console.log(`[syncArticleInventoryStatus] Processing article:`, articolo);
        const codiceCtn = articolo.codice_ctn;
        if (!codiceCtn) {
          console.warn(`[syncArticleInventoryStatus] Articolo senza codice CTN. Saltato:`, articolo);
          continue; // Use continue for for...of loop
        }

        const numFogli = articolo.numero_fogli;
        if (numFogli === undefined || numFogli <= 0) {
          console.warn(`[syncArticleInventoryStatus] Articolo cartone ${codiceCtn} con numero_fogli non valido (${numFogli}). Saltato.`);
          continue; // Use continue for for...of loop
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
          magazzino: '-', // Default, will be updated by spostaInGiacenza
          prezzo: articolo.prezzo_unitario,
          data_consegna: articolo.data_consegna_prevista,
          note: ordineAcquisto.note || '-',
          fsc: articolo.fsc, // Aggiunto
          alimentare: articolo.alimentare, // Aggiunto
          rif_commessa_fsc: articolo.rif_commessa_fsc, // Aggiunto
        };

        console.log(`[syncArticleInventoryStatus] Articolo ${codiceCtn} stato: ${articolo.stato}`);
        if (articolo.stato === 'in_attesa' || articolo.stato === 'inviato' || articolo.stato === 'confermato') {
          const isConfirmedForOrdiniTable = articolo.stato === 'confermato';
          console.log(`[syncArticleInventoryStatus] Preparando inserimento in 'ordini' per ${codiceCtn}. Dati:`, { ...cartoneBase, confermato: isConfirmedForOrdiniTable });
          const { error: insertError } = await supabase.from('ordini').insert([{ ...cartoneBase, confermato: isConfirmedForOrdiniTable }]);
          if (insertError) {
            console.error(`[syncArticleInventoryStatus] Errore inserimento ${codiceCtn} in 'ordini':`, insertError);
            toast.error(`Errore inserimento in ordini: ${insertError.message}`);
          } else {
            console.log(`[syncArticleInventoryStatus] Inserito/Aggiornato ${codiceCtn} in 'ordini' con stato '${articolo.stato}'. Campo 'confermato' impostato a: ${isConfirmedForOrdiniTable}.`);
          }
        } else if (articolo.stato === 'ricevuto') {
          // NEW LOGIC: If article is 'ricevuto', check if it already exists in 'giacenza'
          // If it exists, update its fields (ddt, data_arrivo, magazzino)
          // If it doesn't exist, insert it with default values (which will be updated by spostaInGiacenza)
          const { data: existingGiacenza, error: fetchGiacenzaError } = await supabase
            .from('giacenza')
            .select('ddt, data_arrivo, magazzino')
            .eq('codice', codiceCtn)
            .single();

          if (fetchGiacenzaError && fetchGiacenzaError.code !== 'PGRST116') { // PGRST116 means "no rows found"
            console.error(`[syncArticleInventoryStatus] Errore recupero giacenza per ${codiceCtn}:`, fetchGiacenzaError);
            toast.error(`Errore recupero giacenza: ${fetchGiacenzaError.message}`);
            continue;
          }

          const giacenzaDataToUpdate = {
            ddt: existingGiacenza?.ddt || null,
            data_arrivo: existingGiacenza?.data_arrivo || new Date().toISOString().split('T')[0],
            magazzino: existingGiacenza?.magazzino || '-',
          };

          if (existingGiacenza) {
            console.log(`[syncArticleInventoryStatus] Aggiornando 'giacenza' per ${codiceCtn} (stato 'ricevuto'). Dati:`, { ...cartoneBase, ...giacenzaDataToUpdate });
            const { error: updateError } = await supabase.from('giacenza').update({ ...cartoneBase, ...giacenzaDataToUpdate }).eq('codice', codiceCtn);
            if (updateError) {
              console.error(`[syncArticleInventoryStatus] Errore aggiornamento ${codiceCtn} in 'giacenza':`, updateError);
              toast.error(`Errore aggiornamento in giacenza: ${updateError.message}`);
            } else {
              console.log(`[syncArticleInventoryStatus] Aggiornato ${codiceCtn} in 'giacenza' con stato 'ricevuto'.`);
            }
          } else {
            console.log(`[syncArticleInventoryStatus] Inserendo in 'giacenza' per ${codiceCtn} (stato 'ricevuto'). Dati:`, { ...cartoneBase, ...giacenzaDataToUpdate });
            const { error: insertError } = await supabase.from('giacenza').insert([{ ...cartoneBase, ...giacenzaDataToUpdate }]);
            if (insertError) {
              console.error(`[syncArticleInventoryStatus] Errore inserimento ${codiceCtn} in 'giacenza':`, insertError);
              toast.error(`Errore inserimento in giacenza: ${insertError.message}`);
            } else {
              console.log(`[syncArticleInventoryStatus] Inserito ${codiceCtn} in 'giacenza' con stato 'ricevuto'.`);
            }
          }
        }
      } catch (e: any) {
        console.error(`[syncArticleInventoryStatus] Errore interno durante l'elaborazione dell'articolo ${articolo?.codice_ctn || 'sconosciuto'}:`, e);
        toast.error(`Errore interno durante la sincronizzazione dell'articolo: ${e.message}`);
      }
    } // End for...of loop
    console.log(`[syncArticleInventoryStatus] Sincronizzazione completata per OA: ${ordineAcquisto.numero_ordine}`);
  }, []); // Dipendenze vuote per useCallback

  useEffect(() => {
    loadOrdiniAcquisto();

    const ordiniAcquistoChannel = supabase
      .channel('ordini_acquisto_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ordini_acquisto' }, () => {
        console.log('[useOrdiniAcquisto] Rilevato cambiamento in ordini_acquisto via real-time. Ricarico dati.');
        loadOrdiniAcquisto();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ordiniAcquistoChannel);
    };
  }, [loadOrdiniAcquisto]); // Aggiunto loadOrdiniAcquisto come dipendenza

  const addOrdineAcquisto = useCallback(async (ordine: Omit<OrdineAcquisto, 'id' | 'created_at' | 'fornitore_nome' | 'fornitore_tipo' | 'updated_at'>) => {
    console.log('addOrdineAcquisto: Tentativo di aggiungere ordine:', ordine);
    const orderToInsert = { ...ordine };

    const { data: newOrdine, error: ordineError } = await supabase
      .from('ordini_acquisto')
      .insert([orderToInsert])
      .select(`
        *,
        fornitori ( nome, tipo_fornitore )
      `)
      .single();

    if (ordineError) {
      console.error('addOrdineAcquisto: Errore aggiunta ordine:', ordineError);
      toast.error(`Errore aggiunta ordine: ${ordineError.message}`);
      return { success: false, error: ordineError };
    }
    console.log('addOrdineAcquisto: Ordine aggiunto con successo (newOrdine):', newOrdine);

    const orderWithFornitoreInfo: OrdineAcquisto = {
      ...newOrdine,
      fornitore_nome: newOrdine.fornitori?.nome || 'N/A',
      fornitore_tipo: newOrdine.fornitori?.tipo_fornitore || 'N/A',
      articoli: (newOrdine.articoli || []) as ArticoloOrdineAcquisto[],
    };
    await syncArticleInventoryStatus(orderWithFornitoreInfo);

    toast.success(`✅ Ordine d'acquisto '${newOrdine.numero_ordine}' aggiunto con successo!`);
    await loadOrdiniAcquisto(); // This should refresh the list
    return { success: true, data: newOrdine };
  }, [loadOrdiniAcquisto, syncArticleInventoryStatus]); // Aggiunto loadOrdiniAcquisto e syncArticleInventoryStatus come dipendenze

  const updateOrdineAcquisto = useCallback(async (id: string, ordine: Partial<Omit<OrdineAcquisto, 'id' | 'created_at' | 'fornitore_nome' | 'fornitore_tipo' | 'updated_at'>>) => {
    const orderToUpdate = { ...ordine };

    const { data: updatedOrdine, error: ordineError } = await supabase
      .from('ordini_acquisto')
      .update(orderToUpdate)
      .eq('id', id)
      .select(`
        *,
        fornitori ( nome, tipo_fornitore )
      `)
      .single();

    if (ordineError) {
      toast.error(`Errore modifica ordine: ${ordineError.message}`);
      return { success: false, error: ordineError };
    }

    const orderWithFornitoreInfo: OrdineAcquisto = {
      ...updatedOrdine,
      fornitore_nome: updatedOrdine.fornitori?.nome || 'N/A',
      fornitore_tipo: updatedOrdine.fornitori?.tipo_fornitore || 'N/A',
      articoli: (updatedOrdine.articoli || []) as ArticoloOrdineAcquisto[],
    };
    await syncArticleInventoryStatus(orderWithFornitoreInfo);

    toast.success(`✅ Ordine d'acquisto '${updatedOrdine.numero_ordine || id}' modificato con successo!`);
    await loadOrdiniAcquisto();
    return { success: true, data: updatedOrdine };
  }, [loadOrdiniAcquisto, syncArticleInventoryStatus]); // Aggiunto loadOrdiniAcquisto e syncArticleInventoryStatus come dipendenze

  // Nuova funzione per aggiornare solo lo stato di un ordine d'acquisto
  const updateOrdineAcquistoStatus = useCallback(async (id: string, newStatus: OrdineAcquisto['stato']) => {
    console.log(`[useOrdiniAcquisto - updateOrdineAcquistoStatus] INIZIO. ID: ${id}, Nuovo Stato: ${newStatus}`); // Log all'inizio
    
    // Recupera l'ordine completo per poter sincronizzare gli articoli
    const { data: currentOrdine, error: fetchError } = await supabase
      .from('ordini_acquisto')
      .select(`
        *,
        fornitori ( nome, tipo_fornitore )
      `)
      .eq('id', id)
      .single();

    if (fetchError || !currentOrdine) {
      console.error(`[useOrdiniAcquisto - updateOrdineAcquistoStatus] Errore recupero ordine (ID: ${id}):`, fetchError);
      toast.error(`Errore recupero ordine per aggiornamento stato: ${fetchError?.message}`);
      return { success: false, error: fetchError };
    }
    console.log(`[useOrdiniAcquisto - updateOrdineAcquistoStatus] Ordine corrente recuperato (ID: ${id}):`, currentOrdine.numero_ordine, 'Stato:', currentOrdine.stato);

    let articlesForDbUpdate = currentOrdine.articoli as ArticoloOrdineAcquisto[];
    if (newStatus === 'annullato') {
      articlesForDbUpdate = articlesForDbUpdate.map(art => ({ ...art, stato: 'annullato' }));
      console.log(`[useOrdiniAcquisto - updateOrdineAcquistoStatus] Tutti gli articoli impostati ad 'annullato'.`);
    } else if (newStatus === 'inviato') {
      articlesForDbUpdate = articlesForDbUpdate.map(art => ({ ...art, stato: 'inviato' }));
      console.log(`[useOrdiniAcquisto - updateOrdineAcquistoStatus] Tutti gli articoli impostati ad 'inviato'.`);
    } else if (newStatus === 'in_attesa') {
      articlesForDbUpdate = articlesForDbUpdate.map(art => ({ ...art, stato: 'in_attesa' }));
      console.log(`[useOrdiniAcquisto - updateOrdineAcquistoStatus] Tutti gli articoli impostati ad 'in_attesa'.`);
    }
    // If the main order status is 'confermato' or 'ricevuto', we don't automatically change article statuses here.
    // Individual article status changes will be handled by updateArticleStatusInOrder.

    // Ricalcola l'importo totale basandosi solo sugli articoli NON annullati
    const newImportoTotale = articlesForDbUpdate.reduce((sum, item) => {
      if (item.stato !== 'annullato') {
        const qty = item.quantita || 0;
        const price = item.prezzo_unitario || 0;
        return sum + (qty * price);
      }
      return sum;
    }, 0);
    console.log(`[useOrdiniAcquisto - updateOrdineAcquistoStatus] Nuovo importo totale calcolato: ${newImportoTotale}`);

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
    console.log(`[useOrdiniAcquisto - updateOrdineAcquistoStatus] Eseguito aggiornamento ottimistico.`);
    // OPTIMISTIC UPDATE END

    console.log(`[useOrdiniAcquisto - updateOrdineAcquistoStatus] Articoli da aggiornare nel DB:`, articlesForDbUpdate);

    const { data: updatedOrdine, error } = await supabase
      .from('ordini_acquisto')
      .update({ stato: newStatus, articoli: articlesForDbUpdate as any, importo_totale: newImportoTotale, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(`
        *,
        fornitori ( nome, tipo_fornitore )
      `)
      .single();

    if (error) {
      console.error(`[useOrdiniAcquisto - updateOrdineAcquistoStatus] Errore DB durante aggiornamento stato ordine (ID: ${id}):`, error);
      toast.error(`Errore aggiornamento stato ordine: ${error.message}`);
      setOrdiniAcquisto(previousOrdiniAcquisto); // ROLLBACK
      return { success: false, error };
    }

    console.log(`[useOrdiniAcquisto - updateOrdineAcquistoStatus] Stato ordine ${id} aggiornato a ${newStatus} nel DB. Dati aggiornati:`, { stato: updatedOrdine.stato, updated_at: updatedOrdine.updated_at, importo_totale: updatedOrdine.importo_totale });
    
    const orderWithFornitoreInfo: OrdineAcquisto = {
      ...updatedOrdine,
      fornitore_nome: updatedOrdine.fornitori?.nome || 'N/A',
      fornitore_tipo: updatedOrdine.fornitori?.tipo_fornitore || 'N/A',
      articoli: (updatedOrdine.articoli || []) as ArticoloOrdineAcquisto[],
    };
    await syncArticleInventoryStatus(orderWithFornitoreInfo);
    console.log(`[useOrdiniAcquisto - updateOrdineAcquistoStatus] syncArticleInventoryStatus completato.`);

    await loadOrdiniAcquisto();
    console.log(`[useOrdiniAcquisto - updateOrdineAcquistoStatus] loadOrdiniAcquisto completato dopo l'aggiornamento.`);
    return { success: true, data: updatedOrdine };
  }, [loadOrdiniAcquisto, syncArticleInventoryStatus, ordiniAcquisto]); // Aggiunto ordiniAcquisto come dipendenza

  // Funzione per annullare un ordine (imposta lo stato a 'annullato')
  const cancelOrdineAcquisto = useCallback(async (id: string) => {
    console.log(`[useOrdiniAcquisto - cancelOrdineAcquisto] INIZIO. ID: ${id}`); // Log all'inizio
    // Prima, recupera l'ordine per ottenere il suo numero_ordine e lo stato attuale
    const { data: ordineToUpdate, error: fetchError } = await supabase
      .from('ordini_acquisto')
      .select('numero_ordine, stato')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error(`[useOrdiniAcquisto - cancelOrdineAcquisto] Errore recupero ordine per annullamento (ID: ${id}):`, fetchError);
      toast.error(`Errore recupero ordine per annullamento: ${fetchError.message}`);
      return { success: false, error: fetchError };
    }
    console.log(`[useOrdiniAcquisto - cancelOrdineAcquisto] Ordine recuperato (ID: ${id}):`, ordineToUpdate);

    // Se l'ordine è già annullato, non fare nulla e informa l'utente
    if (ordineToUpdate?.stato === 'annullato') {
      toast.info(`L'ordine '${ordineToUpdate.numero_ordine}' è già annullato.`);
      console.log(`[useOrdiniAcquisto - cancelOrdineAcquisto] Ordine ${ordineToUpdate.numero_ordine} già annullato. Nessuna azione.`);
      return { success: true };
    }

    // Usa la nuova funzione per aggiornare lo stato
    console.log(`[useOrdiniAcquisto - cancelOrdineAcquisto] Chiamando updateOrdineAcquistoStatus per ID: ${id}, nuovo stato: 'annullato'`);
    const { success, error } = await updateOrdineAcquistoStatus(id, 'annullato');

    if (success) {
      toast.success(`✅ Ordine d'acquisto '${ordineToUpdate?.numero_ordine}' annullato con successo!`);
      console.log(`[useOrdiniAcquisto - cancelOrdineAcquisto] Ordine ${ordineToUpdate?.numero_ordine} annullato con successo.`);
    } else {
      toast.error(`Errore annullamento ordine: ${error?.message}`);
      console.error(`[useOrdiniAcquisto - cancelOrdineAcquisto] Errore durante l'annullamento dell'ordine ${ordineToUpdate?.numero_ordine}:`, error);
    }
    return { success, error };
  }, [updateOrdineAcquistoStatus]); // Aggiunto updateOrdineAcquistoStatus come dipendenza

  // Nuova funzione per eliminare definitivamente un ordine
  const deleteOrdineAcquistoPermanently = useCallback(async (id: string, numeroOrdine: string) => {
    console.log('[deleteOrdineAcquistoPermanently] Tentativo di eliminare definitivamente ordine con ID:', id, 'Numero Ordine:', numeroOrdine);
    try {
      // OPTIMISTIC UPDATE START
      const previousOrdiniAcquisto = ordiniAcquisto;
      setOrdiniAcquisto(prev => prev.filter(order => order.id !== id));
      console.log(`[deleteOrdineAcquistoPermanently] Eseguito aggiornamento ottimistico per eliminazione ordine ${numeroOrdine}.`);
      // OPTIMISTIC UPDATE END

      // Rimuovi prima gli articoli correlati dalle tabelle 'ordini' e 'giacenza'
      console.log(`[deleteOrdineAcquistoPermanently] Tentativo di rimuovere articoli correlati dalle tabelle di magazzino per numero_ordine: ${numeroOrdine}`);
      await supabase.from('ordini').delete().eq('ordine', numeroOrdine);
      await supabase.from('giacenza').delete().eq('ordine', numeroOrdine);
      console.log(`[deleteOrdineAcquistoPermanently] Articoli correlati per numero_ordine: ${numeroOrdine} rimossi con successo (o non presenti).`);
      
      // Poi elimina l'ordine d'acquisto principale
      console.log(`[deleteOrdineAcquistoPermanently] Tentativo di eliminare l'ordine d'acquisto principale con ID: ${id}`);
      const { error } = await supabase
        .from('ordini_acquisto')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[deleteOrdineAcquistoPermanently] Errore eliminazione definitiva ordine:', error);
        setOrdiniAcquisto(previousOrdiniAcquisto); // ROLLBACK
        throw error; // Rilancia l'errore per essere catturato dal blocco catch esterno
      }

      toast.success(`🗑️ Ordine d'acquisto '${numeroOrdine}' eliminato definitivamente!`);
      console.log(`[deleteOrdineAcquistoPermanently] Ordine d'acquisto ${numeroOrdine} eliminato definitivamente.`);
      await loadOrdiniAcquisto(); // Keep this for eventual consistency
      return { success: true };
    } catch (error: any) {
      console.error('[deleteOrdineAcquistoPermanently] Errore catturato:', error); // Logga l'errore effettivo
      toast.error(`Errore eliminazione definitiva ordine: ${error.message || 'Errore sconosciuto'}`);
      return { success: false, error };
    }
  }, [loadOrdiniAcquisto, ordiniAcquisto]); // Aggiunto ordiniAcquisto come dipendenza

  return {
    ordiniAcquisto,
    loading,
    addOrdineAcquisto,
    updateOrdineAcquisto,
    updateOrdineAcquistoStatus, // Esposto la nuova funzione
    updateArticleStatusInOrder, // Esposto la nuova funzione per aggiornare lo stato del singolo articolo
    cancelOrdineAcquisto, // Rinominate
    deleteOrdineAcquistoPermanently, // Nuova funzione
    loadOrdiniAcquisto,
  };
}