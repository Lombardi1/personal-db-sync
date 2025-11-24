import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { OrdineAcquisto, ArticoloOrdineAcquisto, Cartone } from '@/types';
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

    await supabase.from('ordini').delete().eq('ordine', ordineAcquisto.numero_ordine);

    if (!isCartoneFornitore) {
      return;
    }

    if (!Array.isArray(ordineAcquisto.articoli)) {
      toast.error(`Errore interno: Articoli dell'ordine non validi per ${ordineAcquisto.numero_ordine}.`);
      return;
    }

    for (const articolo of ordineAcquisto.articoli) {
      try {
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
      } catch (e: any) {
        toast.error(`Errore interno durante la sincronizzazione dell'articolo: ${e.message}`);
      }
    }
  }, []); // Dependencies are empty, as it only uses supabase and toast (which are stable)

  // 2. Define loadOrdiniAcquisto early, as many functions call it.
  // It does not directly call syncArticleInventoryStatus or updateArticleStatusInOrder,
  // but it's called by functions that *do* call them.
  const loadOrdiniAcquisto = useCallback(async () => {
    setLoading(true);
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
        return;
      }

      if (!ordiniData || ordiniData.length === 0) {
        setOrdiniAcquisto([]);
        return;
      }

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
  }, []); // Empty dependency array is fine for loadOrdiniAcquisto itself.

  // 3. Define updateArticleStatusInOrder, which depends on syncArticleInventoryStatus and loadOrdiniAcquisto
  const updateArticleStatusInOrder = useCallback(async (orderNumeroOrdine: string, articleIdentifier: string, newArticleStatus: ArticoloOrdineAcquisto['stato']) => {
    // 1. Fetch the order
    const { data: ordineAcquistoToUpdate, error: fetchError } = await supabase
      .from('ordini_acquisto')
      .select(`*, fornitori ( nome, tipo_fornitore )`)
      .eq('numero_ordine', orderNumeroOrdine)
      .single();

    if (fetchError || !ordineAcquistoToUpdate) {
      toast.error(`Errore recupero ordine d'acquisto per aggiornamento articolo.`);
      return { success: false, error: fetchError };
    }

    // 2. Find and update the specific article
    let updatedArticles = (ordineAcquistoToUpdate.articoli || []) as ArticoloOrdineAcquisto[];
    let articleFound = false;
    updatedArticles = updatedArticles.map(art => {
      if ((art.codice_ctn && art.codice_ctn === articleIdentifier) || (art.descrizione && art.descrizione === articleIdentifier)) {
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
      .select(`*, fornitori ( nome, tipo_fornitore )`)
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
    const orderWithFornitoreInfo: OrdineAcquisto = {
      ...updatedOrdine,
      fornitore_nome: updatedOrdine.fornitori?.nome || 'N/A',
      fornitore_tipo: updatedOrdine.fornitori?.tipo_fornitore || 'N/A',
      articoli: (updatedOrdine.articoli || []) as ArticoloOrdineAcquisto[],
    };
    await syncArticleInventoryStatus(orderWithFornitoreInfo);

    await loadOrdiniAcquisto();
    return { success: true, data: updatedOrdine };
  }, [loadOrdiniAcquisto, syncArticleInventoryStatus, ordiniAcquisto]); // Dependencies are correct here.

  // 4. Define updateOrdineAcquistoStatus, which depends on syncArticleInventoryStatus and loadOrdiniAcquisto
  const updateOrdineAcquistoStatus = useCallback(async (id: string, newStatus: OrdineAcquisto['stato']) => {
    // Recupera l'ordine completo per poter sincronizzare gli articoli
    const { data: currentOrdine, error: fetchError } = await supabase
      .from('ordini_acquisto')
      .select(`*, fornitori ( nome, tipo_fornitore )`)
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
      .select(`*, fornitori ( nome, tipo_fornitore )`)
      .single();

    if (error) {
      toast.error(`Errore aggiornamento stato ordine: ${error.message}`);
      setOrdiniAcquisto(previousOrdiniAcquisto); // ROLLBACK
      return { success: false, error };
    }
    
    const orderWithFornitoreInfo: OrdineAcquisto = {
      ...updatedOrdine,
      fornitore_nome: updatedOrdine.fornitori?.nome || 'N/A',
      fornitore_tipo: updatedOrdine.fornitori?.tipo_fornitore || 'N/A',
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
      .select(`*, fornitori ( nome, tipo_fornitore )`)
      .single();

    if (ordineError) {
      toast.error(`Errore aggiunta ordine: ${ordineError.message}`);
      return { success: false, error: ordineError };
    }

    const orderWithFornitoreInfo: OrdineAcquisto = {
      ...newOrdine,
      fornitore_nome: newOrdine.fornitori?.nome || 'N/A',
      fornitore_tipo: newOrdine.fornitori?.tipo_fornitore || 'N/A',
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
      .select(`*, fornitori ( nome, tipo_fornitore )`)
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