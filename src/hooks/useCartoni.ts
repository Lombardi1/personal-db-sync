import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Cartone, StoricoMovimento, ArticoloOrdineAcquisto } from '@/types';
import * as notifications from '@/utils/notifications';
import { useOrdiniAcquisto } from '@/hooks/useOrdiniAcquisto';
import { useAuth } from '@/hooks/useAuth';

export function useCartoni() {
  const [giacenza, setGiacenza] = useState<Cartone[]>([]);
  const [ordini, setOrdini] = useState<Cartone[]>([]);
  const [esauriti, setEsauriti] = useState<Cartone[]>([]);
  const [storico, setStorico] = useState<StoricoMovimento[]>([]);
  const [loading, setLoading] = useState(true);

  const { updateArticleStatusInOrder } = useOrdiniAcquisto();
  const { user } = useAuth();

  const loadData = async () => {
    setLoading(true);
    try {
      const [giacenzaRes, ordiniRes, esauritiRes, storicoRes] = await Promise.all([
        supabase.from('giacenza').select('*'),
        supabase.from('ordini').select('*'),
        supabase.from('esauriti').select('*'),
        supabase.from('storico').select(`*, app_users(username)`).order('data', { ascending: false })
      ]);

      if (giacenzaRes.data) setGiacenza(giacenzaRes.data);
      if (ordiniRes.data) {
        setOrdini(ordiniRes.data);
      }
      if (esauritiRes.data) setEsauriti(esauritiRes.data);
      if (storicoRes.data) {
        const storicoWithUsernames: StoricoMovimento[] = storicoRes.data.map(mov => ({
          ...mov,
          username: mov.app_users?.username || 'Sconosciuto'
        }));
        setStorico(storicoWithUsernames);
      }
    } catch (error) {
      console.error('Errore caricamento dati:', error);
      notifications.showError('Errore nel caricamento dei dati del magazzino.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const giacenzaChannel = supabase
      .channel('giacenza-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'giacenza' }, () => {
        loadData();
      })
      .subscribe();

    const ordiniChannel = supabase
      .channel('ordini-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ordini' }, () => {
        loadData();
      })
      .subscribe();

    const esauritiChannel = supabase
      .channel('esauriti-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'esauriti' }, () => {
        loadData();
      })
      .subscribe();

    const storicoChannel = supabase
      .channel('storico-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'storico' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(giacenzaChannel);
      supabase.removeChannel(ordiniChannel);
      supabase.removeChannel(esauritiChannel);
      supabase.removeChannel(storicoChannel);
    };
  }, []);

  const aggiungiOrdine = async (cartone: Cartone) => {
    const { error } = await supabase.from('ordini').insert([cartone]);
    if (!error) {
      const movimento: StoricoMovimento = {
        codice: cartone.codice,
        tipo: 'carico',
        quantita: cartone.fogli,
        data: new Date().toISOString(),
        note: `Nuovo ordine in arrivo registrato`,
        user_id: user?.id,
        numero_ordine_acquisto: cartone.ordine
      };
      await supabase.from('storico').insert([movimento]);
      await loadData();
    }
    return { error };
  };

  const spostaInGiacenza = async (codice: string, ddt: string, dataArrivo: string, fogliEffettivi?: number, magazzino?: string) => {
    const ordine = ordini.find(o => o.codice === codice);
    if (!ordine) {
      notifications.showError('Ordine non trovato');
      return { error: new Error('Ordine non trovato') };
    }

    const fogliFinali = fogliEffettivi !== undefined ? fogliEffettivi : ordine.fogli;
    const magazzinoFinale = magazzino; 
    
    const cartoneGiacenza = { 
      ...ordine, 
      ddt, 
      data_arrivo: dataArrivo, 
      fogli: fogliFinali, 
      magazzino: magazzinoFinale,
      fsc: ordine.fsc,
      alimentare: ordine.alimentare,
      rif_commessa_fsc: ordine.rif_commessa_fsc,
    };
    delete cartoneGiacenza.confermato;
    
    const { error: deleteError } = await supabase.from('ordini').delete().eq('codice', codice);
    if (deleteError) {
      notifications.showError(`Errore eliminazione ordine: ${deleteError.message}`);
      return { error: deleteError };
    }

    const { error: insertError } = await supabase.from('giacenza').insert([cartoneGiacenza]);
    if (insertError) {
      notifications.showError(`Errore inserimento in giacenza: ${insertError.message}`);
      return { error: insertError };
    }

    const movimento: StoricoMovimento = {
      codice,
      tipo: 'carico',
      quantita: fogliFinali,
      data: new Date().toISOString(),
      note: `${fogliEffettivi !== undefined && fogliEffettivi !== ordine.fogli 
        ? `Caricato da ordine ${ordine.ordine} - Ordinati: ${ordine.fogli}, Arrivati: ${fogliEffettivi}`
        : `Caricato da ordine ${ordine.ordine}`
      }`,
      user_id: user?.id,
      numero_ordine_acquisto: ordine.ordine
    };
    const { error: storicoError } = await supabase.from('storico').insert([movimento]);
    if (storicoError) {
      notifications.showError(`Errore registrazione storico: ${storicoError.message}`);
    }

    if (ordine.ordine && codice) { 
      await updateArticleStatusInOrder(ordine.ordine, codice, 'ricevuto'); 
    }

    await loadData();
    return { error: null };
  };

  const scaricoFogli = async (codice: string, quantita: number, note: string) => {
    const cartone = giacenza.find(c => c.codice === codice);
    if (!cartone) {
      notifications.showError('Cartone non trovato');
      return { error: new Error('Cartone non trovato') };
    }

    const nuoviFogli = cartone.fogli - quantita;

    const movimento: StoricoMovimento = {
      codice,
      tipo: 'scarico',
      quantita,
      data: new Date().toISOString(),
      note,
      user_id: user?.id,
      numero_ordine_acquisto: cartone.ordine
    };
    const { error: storicoError } = await supabase.from('storico').insert([movimento]);
    if (storicoError) {
      notifications.showError(`Errore registrazione storico: ${storicoError.message}`);
    }

    if (nuoviFogli <= 0) {
      const { error: deleteGiacenzaError } = await supabase.from('giacenza').delete().eq('codice', codice);
      if (deleteGiacenzaError) {
        notifications.showError(`Errore eliminazione da giacenza: ${deleteGiacenzaError.message}`);
        return { error: deleteGiacenzaError };
      }

      const { data_consegna, ...restOfCartone } = cartone; 
      const cartoneEsaurito = { ...restOfCartone, fogli: 0 }; 
      const { error: insertEsauritiError } = await supabase.from('esauriti').insert([cartoneEsaurito]);
      if (insertEsauritiError) {
        notifications.showError(`Errore inserimento in esauriti: ${insertEsauritiError.message}`);
        return { error: insertEsauritiError };
      }
    } else {
      const { error: updateGiacenzaError } = await supabase.from('giacenza').update({ fogli: nuoviFogli }).eq('codice', codice);
      if (updateGiacenzaError) {
        notifications.showError(`Errore aggiornamento giacenza: ${updateGiacenzaError.message}`);
        return { error: updateGiacenzaError };
      }
    }

    await loadData();
    return { error: null };
  };

  const riportaInGiacenza = async (codice: string) => {
    const cartoneEsaurito = esauriti.find(c => c.codice === codice);
    if (!cartoneEsaurito) {
      notifications.showError('Cartone non trovato negli esauriti.');
      return { error: new Error('Cartone non trovato negli esauriti.') };
    }

    const cartonePerGiacenza: Omit<Cartone, 'id' | 'created_at' | 'confermato'> = {
      codice: cartoneEsaurito.codice,
      fornitore: cartoneEsaurito.fornitore,
      ordine: cartoneEsaurito.ordine,
      tipologia: cartoneEsaurito.tipologia,
      formato: cartoneEsaurito.formato,
      grammatura: cartoneEsaurito.grammatura,
      fogli: cartoneEsaurito.fogli > 0 ? cartoneEsaurito.fogli : 1,
      cliente: cartoneEsaurito.cliente,
      lavoro: cartoneEsaurito.lavoro,
      magazzino: cartoneEsaurito.magazzino,
      prezzo: cartoneEsaurito.prezzo,
      note: cartoneEsaurito.note,
      ddt: null,
      data_arrivo: null,
      data_consegna: new Date().toISOString().split('T')[0],
      fsc: cartoneEsaurito.fsc,
      alimentare: cartoneEsaurito.alimentare,
      rif_commessa_fsc: cartoneEsaurito.rif_commessa_fsc,
    };

    try {
      const { error: deleteError } = await supabase.from('esauriti').delete().eq('codice', codice);
      if (deleteError) {
        notifications.showError(`Errore eliminazione da esauriti: ${deleteError.message}`);
        return { error: deleteError };
      }

      const { error: insertError } = await supabase.from('giacenza').insert([cartonePerGiacenza]);
      if (insertError) {
        notifications.showError(`Errore inserimento in giacenza: ${insertError.message}`);
        return { error: insertError };
      }

      const movimento: StoricoMovimento = {
        codice,
        tipo: 'carico',
        quantita: cartonePerGiacenza.fogli,
        data: new Date().toISOString(),
        note: `Riportato in giacenza da esauriti`,
        user_id: user?.id,
        numero_ordine_acquisto: cartoneEsaurito.ordine
      };
      const { error: storicoError } = await supabase.from('storico').insert([movimento]);
      if (storicoError) {
        notifications.showError(`Errore registrazione storico: ${storicoError.message}`);
      }

      if (cartoneEsaurito.ordine && codice) {
        await updateArticleStatusInOrder(cartoneEsaurito.ordine, codice, 'confermato');
      }

      notifications.showSuccess(`✅ Cartone '${codice}' riportato in giacenza con successo!`);
      await loadData();
      return { error: null };
    } catch (e: any) {
      notifications.showError(`Errore generico: ${e.message}`);
      return { error: e };
    }
  };

  const riportaInOrdini = async (codice: string) => {
    const cartone = giacenza.find(c => c.codice === codice);
    if (!cartone) {
      notifications.showError('Cartone non trovato');
      return { error: new Error('Cartone non trovato') };
    }

    // Destruttura per rimuovere ddt e data_arrivo prima dell'inserimento in 'ordini'
    const { ddt, data_arrivo, ...ordineToInsert } = cartone;
    
    ordineToInsert.confermato = true; 
    if (!ordineToInsert.data_consegna) {
      ordineToInsert.data_consegna = new Date().toISOString().split('T')[0];
    }

    const { error: deleteError } = await supabase.from('giacenza').delete().eq('codice', codice);
    if (deleteError) {
      notifications.showError(`Errore eliminazione da giacenza: ${deleteError.message}`);
      return { error: deleteError };
    }

    const { error: insertError } = await supabase.from('ordini').insert([ordineToInsert]);
    if (insertError) {
      notifications.showError(`Errore inserimento in ordini: ${insertError.message}`);
      return { error: insertError };
    }

    const movimento: StoricoMovimento = {
      codice,
      tipo: 'carico',
      quantita: ordineToInsert.fogli,
      data: new Date().toISOString(),
      note: `Riportato in ordini in arrivo da giacenza`,
      user_id: user?.id,
      numero_ordine_acquisto: ordineToInsert.ordine
    };
    const { error: storicoError } = await supabase.from('storico').insert([movimento]);
    if (storicoError) {
      notifications.showError(`Errore registrazione storico: ${storicoError.message}`);
    }

    if (ordineToInsert.ordine && codice) {
      await updateArticleStatusInOrder(ordineToInsert.ordine, codice, 'confermato');
    }

    await loadData();
    return { error: null };
  };

  const confermaOrdine = async (codice: string, confermato: boolean) => {
    const ordineInArrivo = ordini.find(o => o.codice === codice);
    if (!ordineInArrivo) {
      notifications.showError('Ordine in arrivo non trovato.');
      return { error: new Error('Ordine in arrivo non trovato.') };
    }

    const { error: updateOrdiniError } = await supabase.from('ordini').update({ confermato }).eq('codice', codice);
    if (updateOrdiniError) {
      notifications.showError(`Errore aggiornamento stato conferma in ordini: ${updateOrdiniError.message}`);
      return { error: updateOrdiniError };
    }

    if (ordineInArrivo.ordine && codice) {
      let newArticleStatus: ArticoloOrdineAcquisto['stato'];

      if (confermato) {
        newArticleStatus = 'confermato';
      } else {
        const { data: purchaseOrder, error: fetchOAError } = await supabase
          .from('ordini_acquisto')
          .select('stato, articoli')
          .eq('numero_ordine', ordineInArrivo.ordine)
          .single();

        if (fetchOAError || !purchaseOrder || !purchaseOrder.articoli) {
          newArticleStatus = 'inviato';
        } else {
          const articles = purchaseOrder.articoli as ArticoloOrdineAcquisto[];
          const currentArticleInOA = articles.find(art => art.codice_ctn === codice);
          
          if (currentArticleInOA && currentArticleInOA.stato === 'confermato') {
            if (purchaseOrder.stato === 'inviato') {
                newArticleStatus = 'inviato';
            } else if (purchaseOrder.stato === 'in_attesa') {
                newArticleStatus = 'in_attesa';
            } else {
                newArticleStatus = 'inviato';
            }
          } else {
            newArticleStatus = currentArticleInOA?.stato || 'in_attesa';
          }
        }
      }

      await updateArticleStatusInOrder(ordineInArrivo.ordine, codice, newArticleStatus);
    }

    const movimento: StoricoMovimento = {
      codice: codice,
      tipo: 'carico',
      quantita: ordineInArrivo.fogli,
      data: new Date().toISOString(),
      note: `Ordine in arrivo ${confermato ? 'confermato' : 'non confermato'}`,
      user_id: user?.id,
      numero_ordine_acquisto: ordineInArrivo.ordine
    };
    await supabase.from('storico').insert([movimento]);

    await loadData();
    return { error: null };
  };

  const eliminaOrdine = async (codice: string) => {
    const ordineInArrivo = ordini.find(o => o.codice === codice);
    if (ordineInArrivo) {
      if (ordineInArrivo.ordine && codice) {
        await updateArticleStatusInOrder(ordineInArrivo.ordine, codice, 'annullato');
      }
      const movimento: StoricoMovimento = {
        codice: codice,
        tipo: 'scarico',
        quantita: ordineInArrivo.fogli,
        data: new Date().toISOString(),
        note: `Ordine in arrivo eliminato`,
        user_id: user?.id,
        numero_ordine_acquisto: ordineInArrivo.ordine
      };
      await supabase.from('storico').insert([movimento]);
    }

    await supabase.from('ordini').delete().eq('codice', codice);
    await loadData();
  };

  const modificaOrdine = async (codice: string, dati: Partial<Cartone>) => {
    const ordineInArrivo = ordini.find(o => o.codice === codice);
    if (!ordineInArrivo) {
      notifications.showError('Ordine in arrivo non trovato per la modifica.');
      return;
    }

    const { error } = await supabase.from('ordini').update(dati).eq('codice', codice);
    if (!error) {
      const movimento: StoricoMovimento = {
        codice: codice,
        tipo: 'modifica',
        quantita: dati.fogli || 0,
        data: new Date().toISOString(),
        note: `Modifica dettagli ordine in arrivo`,
        user_id: user?.id,
        numero_ordine_acquisto: ordineInArrivo.ordine
      };
      await supabase.from('storico').insert([movimento]);
      await loadData();
    } else {
      notifications.showError(`Errore modifica ordine: ${error.message}`);
    }
  };

  return {
    giacenza,
    ordini,
    esauriti,
    storico,
    loading,
    aggiungiOrdine,
    spostaInGiacenza,
    scaricoFogli,
    riportaInGiacenza,
    riportaInOrdini,
    confermaOrdine,
    eliminaOrdine,
    modificaOrdine
  };
}