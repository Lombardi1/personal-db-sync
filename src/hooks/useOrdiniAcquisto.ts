import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { OrdineAcquisto, ArticoloOrdineAcquisto, Cartone } from '@/types';
import { toast } from 'sonner';
import { generateNextCartoneCode } from '@/utils/cartoneUtils';

console.log('*** [useOrdiniAcquisto.ts] Modulo caricato e pronto per l\'esportazione. ***'); // Log di debug molto evidente

export function useOrdiniAcquisto() {
  const [ordiniAcquisto, setOrdiniAcquisto] = useState<OrdineAcquisto[]>([]);
  const [loading, setLoading] = useState(true);

  // Funzione per sincronizzare lo stato degli articoli tra ordini_acquisto e le tabelle di magazzino
  const syncArticleInventoryStatus = useCallback(async (ordine: OrdineAcquisto) => {
    console.log(`[syncArticleInventoryStatus] Syncing inventory for order: ${ordine.numero_ordine}`);
    
    // Recupera il tipo di fornitore per determinare se è un fornitore di cartone
    const { data: fornitoreData, error: fornitoreError } = await supabase
      .from('fornitori')
      .select('tipo_fornitore')
      .eq('id', ordine.fornitore_id)
      .single();

    if (fornitoreError) {
      console.error(`[syncArticleInventoryStatus] Errore recupero tipo fornitore per ordine ${ordine.numero_ordine}:`, fornitoreError);
      return;
    }
    const isCartoneFornitore = fornitoreData?.tipo_fornitore === 'Cartone';

    if (!isCartoneFornitore) {
      console.log(`[syncArticleInventoryStatus] Not a cartone supplier, skipping inventory sync for order ${ordine.numero_ordine}.`);
      return; // Only sync cartone articles
    }

    for (const article of ordine.articoli) {
      if (!article.codice_ctn) {
        console.warn(`[syncArticleInventoryStatus] Article in order ${ordine.numero_ordine} has no codice_ctn, skipping:`, article);
        continue;
      }

      const commonCartoneData: Omit<Cartone, 'id' | 'created_at' | 'ddt' | 'data_arrivo' | 'magazzino' | 'confermato'> = {
        codice: article.codice_ctn,
        fornitore: ordine.fornitore_nome || 'N/A',
        ordine: ordine.numero_ordine,
        tipologia: article.tipologia_cartone || article.descrizione || 'N/A',
        formato: article.formato || 'N/A',
        grammatura: article.grammatura || 'N/A',
        fogli: article.numero_fogli || 0,
        cliente: article.cliente || 'N/A',
        lavoro: article.lavoro || 'N/A',
        prezzo: article.prezzo_unitario || 0,
        data_consegna: article.data_consegna_prevista,
        note: ordine.note || '-',
      };

      // Check current state in inventory tables
      const { data: existingInOrdini } = await supabase.from('ordini').select('codice').eq('codice', article.codice_ctn).maybeSingle();
      const { data: existingInGiacenza } = await supabase.from('giacenza').select('codice, ddt, data_arrivo, magazzino').eq('codice', article.codice_ctn).maybeSingle();
      const { data: existingInEsauriti } = await supabase.from('esauriti').select('codice').eq('codice', article.codice_ctn).maybeSingle();


      if (article.stato === 'annullato') {
        // If article is cancelled, ensure it's removed from ordini, giacenza, and esauriti
        if (existingInOrdini) {
          await supabase.from('ordini').delete().eq('codice', article.codice_ctn);
          console.log(`[syncArticleInventoryStatus] Removed cancelled article ${article.codice_ctn} from 'ordini'.`);
        }
        if (existingInGiacenza) {
          await supabase.from('giacenza').delete().eq('codice', article.codice_ctn);
          console.log(`[syncArticleInventoryStatus] Removed cancelled article ${article.codice_ctn} from 'giacenza'.`);
        }
        if (existingInEsauriti) {
          await supabase.from('esauriti').delete().eq('codice', article.codice_ctn);
          console.log(`[syncArticleInventoryStatus] Removed cancelled article ${article.codice_ctn} from 'esauriti'.`);
        }
      } else if (article.stato === 'ricevuto') {
        // If article is received, ensure it's in giacenza and not in ordini or esauriti
        if (existingInOrdini) {
          await supabase.from('ordini').delete().eq('codice', article.codice_ctn);
          console.log(`[syncArticleInventoryStatus] Removed received article ${article.codice_ctn} from 'ordini'.`);
        }
        if (existingInEsauriti) {
          await supabase.from('esauriti').delete().eq('codice', article.codice_ctn);
          console.log(`[syncArticleInventoryStatus] Removed received article ${article.codice_ctn} from 'esauriti'.`);
        }
        if (!existingInGiacenza) {
          // Insert into giacenza with default ddt, data_arrivo, magazzino if not present
          await supabase.from('giacenza').insert([{
            ...commonCartoneData,
            ddt: 'AUTO-SYNC', // Placeholder
            data_arrivo: new Date().toISOString().split('T')[0], // Current date
            magazzino: 'AUTO-SYNC', // Placeholder
          }]);
          console.log(`[syncArticleInventoryStatus] Inserted received article ${article.codice_ctn} into 'giacenza'.`);
        } else {
          // Update existing in giacenza to ensure data consistency
          await supabase.from('giacenza').update({
            ...commonCartoneData,
            ddt: existingInGiacenza.ddt || 'AUTO-SYNC', // Keep existing DDT if any
            data_arrivo: existingInGiacenza.data_arrivo || new Date().toISOString().split('T')[0], // Keep existing date if any
            magazzino: existingInGiacenza.magazzino || 'AUTO-SYNC', // Keep existing magazzino if any
          }).eq('codice', article.codice_ctn);
          console.log(`[syncArticleInventoryStatus] Updated received article ${article.codice_ctn} in 'giacenza'.`);
        }
      } else { // 'in_attesa', 'inviato', 'confermato'
        // If article is pending/confirmed/sent, ensure it's in ordini and not in giacenza or esauriti
        if (existingInGiacenza) {
          await supabase.from('giacenza').delete().eq('codice', article.codice_ctn);
          console.log(`[syncArticleInventoryStatus] Removed pending article ${article.codice_ctn} from 'giacenza'.`);
        }
        if (existingInEsauriti) {
          await supabase.from('esauriti').delete().eq('codice', article.codice_ctn);
          console.log(`[syncArticleInventoryStatus] Removed pending article ${article.codice_ctn} from 'esauriti'.`);
        }
        if (!existingInOrdini) {
          await supabase.from('ordini').insert([{
            ...commonCartoneData,
            confermato: article.stato === 'confermato', // Set 'confermato' based on article status
          }]);
          console.log(`[syncArticleInventoryStatus] Inserted pending article ${article.codice_ctn} into 'ordini'.`);
        } else {
          // Update existing in ordini to ensure data consistency
          await supabase.from('ordini').update({
            ...commonCartoneData,
            confermato: article.stato === 'confermato',
          }).eq('codice', article.codice_ctn);
          console.log(`[syncArticleInventoryStatus] Updated pending article ${article.codice_ctn} in 'ordini'.`);
        }
      }
    }
  }, []);

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
      
      let ordersToUpdateInDb: OrdineAcquisto[] = [];
      const processedOrders = ordiniWithFornitoreInfo.map(order => {
        const recalculatedTotal = order.articoli.reduce((sum, item) => {
          if (item.stato !== 'annullato') {
            const qty = item.quantita || 0;
            const price = item.prezzo_unitario || 0;
            return sum + (qty * price);
          }
          return sum;
        }, 0);

        // Check if the recalculated total differs from the stored one
        if (Math.abs((order.importo_totale || 0) - recalculatedTotal) > 0.001) { // Use a small epsilon for float comparison
          console.log(`[loadOrdiniAcquisto] Rilevato importo_totale non corrispondente per ordine ${order.numero_ordine}. Stored: ${order.importo_totale}, Recalculated: ${recalculatedTotal}`);
          const updatedOrder = { ...order, importo_totale: recalculatedTotal };
          ordersToUpdateInDb.push(updatedOrder); // Mark for DB update
          return updatedOrder; // Use the corrected order for state
        }
        return order; // No change needed
      });

      // Perform batch update if there are any discrepancies
      if (ordersToUpdateInDb.length > 0) {
        console.log(`[loadOrdiniAcquisto] Trovati ${ordersToUpdateInDb.length} ordini con importo_totale da correggere. Eseguo aggiornamento batch.`);
        const updates = ordersToUpdateInDb.map(order => ({
          id: order.id,
          importo_totale: order.importo_totale,
          updated_at: new Date().toISOString() // Also update updated_at
        }));
        const { error: updateError } = await supabase
          .from('ordini_acquisto')
          .upsert(updates, { onConflict: 'id' }); // Use upsert for batch update

        if (updateError) {
          console.error('[loadOrdiniAcquisto] Errore durante l\'aggiornamento batch degli importi totali:', updateError);
          toast.error('Errore durante la correzione degli importi totali degli ordini.');
        } else {
          console.log('[loadOrdiniAcquisto] Aggiornamento batch degli importi totali completato con successo.');
        }
      }

      // Apply sorting to the processed orders
      const sortedOrdini = [...processedOrders].sort((a, b) => {
        // Primary sort: by updated_at (most recent first)
        const dateAUpdated = new Date(a.updated_at || a.created_at || 0).getTime();
        const dateBUpdated = new Date(b.updated_at || b.created_at || 0).getTime();

        if (dateAUpdated !== dateBUpdated) {
          return dateBUpdated - dateAUpdated;
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
  }, [syncArticleInventoryStatus]); // Aggiunto syncArticleInventoryStatus come dipendenza

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
    console.log(`[updateOrdineAcquistoStatus] Tentativo di aggiornare stato ordine ${id} a ${newStatus}`);
    
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
      console.error(`[updateOrdineAcquistoStatus] Errore recupero ordine ${id}:`, fetchError);
      toast.error(`Errore recupero ordine per aggiornamento stato: ${fetchError?.message}`);
      return { success: false, error: fetchError };
    }

    let articlesForDbUpdate = currentOrdine.articoli as ArticoloOrdineAcquisto[];
    if (newStatus === 'annullato') {
      articlesForDbUpdate = articlesForDbUpdate.map(art => ({ ...art, stato: 'annullato' }));
    } else if (newStatus === 'inviato') { // NEW: If main order status becomes 'inviato', set all articles to 'inviato'
      articlesForDbUpdate = articlesForDbUpdate.map(art => ({ ...art, stato: 'inviato' }));
    } else if (newStatus === 'in_attesa') { // NEW: If main order status becomes 'in_attesa', set all articles to 'in_attesa'
      articlesForDbUpdate = articlesForDbUpdate.map(art => ({ ...art, stato: 'in_attesa' }));
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

    // OPTIMISTIC UPDATE START
    const previousOrdiniAcquisto = ordiniAcquisto; // Store current state for potential rollback
    setOrdiniAcquisto(prev => prev.map(order => 
      order.id === id 
        ? { 
            ...order, 
            stato: newStatus,
            articoli: articlesForDbUpdate, // Use the prepared articles for optimistic update
            importo_totale: newImportoTotale, // Aggiorna l'importo totale
          } 
        : order
    ));
    // OPTIMISTIC UPDATE END

    console.log(`[updateOrdineAcquistoStatus] Articoli da aggiornare (dopo la logica, prima del DB):`, articlesForDbUpdate);

    const { data: updatedOrdine, error } = await supabase
      .from('ordini_acquisto')
      .update({ stato: newStatus, articoli: articlesForDbUpdate as any, importo_totale: newImportoTotale, updated_at: new Date().toISOString() }) // Cast per JSONB
      .eq('id', id)
      .select(`
        *,
        fornitori ( nome, tipo_fornitore )
      `)
      .single();

    if (error) {
      console.error(`[updateOrdineAcquistoStatus] Errore aggiornamento stato ordine ${id}:`, error);
      toast.error(`Errore aggiornamento stato ordine: ${error.message}`);
      setOrdiniAcquisto(previousOrdiniAcquisto); // ROLLBACK
      return { success: false, error };
    }

    console.log(`[updateOrdineAcquistoStatus] Stato ordine ${id} aggiornato a ${newStatus}. Dati aggiornati dal DB:`, { stato: updatedOrdine.stato, updated_at: updatedOrdine.updated_at, importo_totale: updatedOrdine.importo_totale });
    
    const orderWithFornitoreInfo: OrdineAcquisto = {
      ...updatedOrdine,
      fornitore_nome: updatedOrdine.fornitori?.nome || 'N/A',
      fornitore_tipo: updatedOrdine.fornitori?.tipo_fornitore || 'N/A',
      articoli: (updatedOrdine.articoli || []) as ArticoloOrdineAcquisto[],
    };
    await syncArticleInventoryStatus(orderWithFornitoreInfo);

    await loadOrdiniAcquisto(); // Keep this for eventual consistency
    console.log(`[updateOrdineAcquistoStatus] loadOrdiniAcquisto completato dopo l'aggiornamento.`);
    return { success: true, data: updatedOrdine };
  }, [loadOrdiniAcquisto, syncArticleInventoryStatus, ordiniAcquisto]); // Aggiunto ordiniAcquisto come dipendenza

  // Funzione per aggiornare lo stato di un singolo articolo all'interno di un ordine d'acquisto
  const updateArticleStatusInOrder = useCallback(async (orderNumeroOrdine: string, articleIdentifier: string, newArticleStatus: ArticoloOrdineAcquisto['stato']) => {
    console.log(`[updateArticleStatusInOrder] Aggiornamento stato articolo per OA: ${orderNumeroOrdine}, Identificatore Articolo: ${articleIdentifier}, Nuovo Stato: ${newArticleStatus}`);
    console.log(`[updateArticleStatusInOrder] Tentativo di recuperare ordine d'acquisto con numero_ordine: "${orderNumeroOrdine}"`);

    // 1. Fetch the order
    const { data: ordineAcquistoToUpdate, error: fetchError } = await supabase
      .from('ordini_acquisto')
      .select(`*, fornitori ( nome, tipo_fornitore )`)
      .eq('numero_ordine', orderNumeroOrdine)
      .single();

    if (fetchError || !ordineAcquistoToUpdate) {
      console.error(`[updateArticleStatusInOrder] Errore recupero ordine d'acquisto ${orderNumeroOrdine}:`, fetchError);
      toast.error(`Errore recupero ordine d'acquisto per aggiornamento articolo.`);
      return { success: false, error: fetchError };
    }
    console.log(`[updateArticleStatusInOrder] Ordine d'acquisto recuperato:`, ordineAcquistoToUpdate.numero_ordine);

    // 2. Find and update the specific article
    let updatedArticles = (ordineAcquistoToUpdate.articoli || []) as ArticoloOrdineAcquisto[];
    let articleFound = false;
    updatedArticles = updatedArticles.map(art => {
      // Check if it matches by codice_ctn (for cartone) or descrizione (for other types)
      if ((art.codice_ctn && art.codice_ctn === articleIdentifier) || (art.descrizione && art.descrizione === articleIdentifier)) {
        articleFound = true;
        return { ...art, stato: newArticleStatus };
      }
      return art;
    });

    if (!articleFound) {
      console.warn(`[updateArticleStatusInOrder] Articolo con identificatore '${articleIdentifier}' non trovato nell'ordine ${orderNumeroOrdine}.`);
      toast.error(`Articolo '${articleIdentifier}' non trovato nell'ordine ${orderNumeroOrdine}.`);
      return { success: false, error: new Error('Article not found') };
    }

    // Ricalcola l'importo totale basandosi solo sugli articoli NON annullati
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
      .update({ articoli: updatedArticles as any, importo_totale: newImportoTotale, updated_at: new Date().toISOString() }) // Also update updated_at
      .eq('numero_ordine', orderNumeroOrdine)
      .select(`*, fornitori ( nome, tipo_fornitore )`)
      .single();

    if (updateError) {
      console.error(`[updateArticleStatusInOrder] Errore aggiornamento articoli per ordine ${orderNumeroOrdine}:`, updateError);
      toast.error(`Errore aggiornamento stato articolo: ${updateError.message}`);
      setOrdiniAcquisto(previousOrdiniAcquisto); // ROLLBACK
      return { success: false, error: updateError };
    }

    console.log(`[updateArticleStatusInOrder] Stato articolo '${articleIdentifier}' aggiornato a ${newArticleStatus} per ordine ${orderNumeroOrdine}. Nuovo importo totale: ${newImportoTotale}.`);

    // NEW LOGIC: Check if all articles are now 'annullato' and update main order status
    const allArticlesCancelled = updatedArticles.every(art => art.stato === 'annullato');
    if (allArticlesCancelled && updatedOrdine.stato !== 'annullato') {
        console.log(`[updateArticleStatusInOrder] Tutti gli articoli dell'ordine ${orderNumeroOrdine} sono annullati. Aggiorno lo stato dell'ordine principale a 'annullato'.`);
        const { error: mainStatusUpdateError } = await supabase
            .from('ordini_acquisto')
            .update({ stato: 'annullato', updated_at: new Date().toISOString() })
            .eq('id', updatedOrdine.id);

        if (mainStatusUpdateError) {
            console.error(`[updateArticleStatusInOrder] Errore aggiornamento stato principale ordine ${orderNumeroOrdine} a 'annullato':`, mainStatusUpdateError);
            toast.error(`Errore aggiornamento stato principale ordine: ${mainStatusUpdateError.message}`);
        } else {
            updatedOrdine.stato = 'annullato'; // Update the local updatedOrdine object
        }
    }

    // 4. Sync inventory status for the updated order
    const orderWithFornitoreInfo: OrdineAcquisto = {
      ...updatedOrdine,
      fornitore_nome: updatedOrdine.fornitori?.nome || 'N/A',
      fornitore_tipo: updatedOrdine.fornitori?.tipo_fornitore || 'N/A',
      articoli: (updatedOrdine.articoli || []) as ArticoloOrdineAcquisto[],
    };
    await syncArticleInventoryStatus(orderWithFornitoreInfo);

    await loadOrdiniAcquisto(); // Reload all orders to reflect changes
    return { success: true, data: updatedOrdine };
  }, [loadOrdiniAcquisto, syncArticleInventoryStatus, ordiniAcquisto]);

  // Funzione per annullare un ordine (imposta lo stato a 'annullato')
  const cancelOrdineAcquisto = useCallback(async (id: string) => {
    console.log('[cancelOrdineAcquisto] Tentativo di annullare ordine con ID:', id);
    // Prima, recupera l'ordine per ottenere il suo numero_ordine e lo stato attuale
    const { data: ordineToUpdate, error: fetchError } = await supabase
      .from('ordini_acquisto')
      .select('numero_ordine, stato')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('[cancelOrdineAcquisto] Errore recupero ordine per annullamento:', fetchError);
      toast.error(`Errore recupero ordine per annullamento: ${fetchError.message}`);
      return { success: false, error: fetchError };
    }
    console.log('[cancelOrdineAcquisto] Ordine recuperato:', ordineToUpdate);

    // Se l'ordine è già annullato, non fare nulla e informa l'utente
    if (ordineToUpdate?.stato === 'annullato') {
      toast.info(`L'ordine '${ordineToUpdate.numero_ordine}' è già annullato.`);
      return { success: true };
    }

    // Usa la nuova funzione per aggiornare lo stato
    console.log(`[cancelOrdineAcquisto] Chiamando updateOrdineAcquistoStatus per ID: ${id}, nuovo stato: 'annullato'`);
    const { success, error } = await updateOrdineAcquistoStatus(id, 'annullato');

    if (success) {
      toast.success(`✅ Ordine d'acquisto '${ordineToUpdate?.numero_ordine}' annullato con successo!`);
    } else {
      toast.error(`Errore annullamento ordine: ${error?.message}`);
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