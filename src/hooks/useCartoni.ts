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
    console.log('[useCartoni - loadData] Attempting to load data...');
    try {
      const [giacenzaRes, ordiniRes, esauritiRes, storicoRes] = await Promise.all([
        // Seleziona esplicitamente le colonne per la tabella 'giacenza'
        supabase.from('giacenza').select('codice, fornitore, ordine, ddt, tipologia, formato, grammatura, fogli, cliente, lavoro, magazzino, prezzo, data_arrivo, note, fsc, alimentare, rif_commessa_fsc'),
        // Seleziona esplicitamente le colonne per la tabella 'ordini'
        supabase.from('ordini').select('codice, fornitore, ordine, ddt, tipologia, formato, grammatura, fogli, cliente, lavoro, magazzino, prezzo, data_consegna, data_arrivo, confermato, note, fsc, alimentare, rif_commessa_fsc'),
        // Seleziona esplicitamente le colonne per la tabella 'esauriti'
        supabase.from('esauriti').select('codice, fornitore, ordine, ddt, tipologia, formato, grammatura, fogli, cliente, lavoro, magazzino, prezzo, data_arrivo, note, fsc, alimentare, rif_commessa_fsc, data_esaurimento'),
        supabase.from('storico').select(`*, app_users(username), cliente, lavoro`).order('data', { ascending: false })
      ]);

      if (giacenzaRes.data) {
        setGiacenza(giacenzaRes.data);
        console.log('[useCartoni - loadData] Giacenza data loaded:', giacenzaRes.data.length, 'items. Sample:', giacenzaRes.data.slice(0, 2));
      } else if (giacenzaRes.error) {
        console.error('[useCartoni - loadData] Error loading giacenza:', giacenzaRes.error);
      }

      if (ordiniRes.data) {
        setOrdini(ordiniRes.data);
        console.log('[useCartoni - loadData] Ordini data loaded:', ordiniRes.data.length, 'items.');
        const ctn132InOrdini = ordiniRes.data.find(item => item.codice === 'CTN-132');
        if (ctn132InOrdini) {
          console.log('[useCartoni - loadData] Found CTN-132 in ordiniRes.data:', JSON.stringify(ctn132InOrdini, null, 2));
        } else {
          console.log('[useCartoni - loadData] CTN-132 NOT found in ordiniRes.data.');
        }

        ordiniRes.data.forEach(item => {
          console.log(` - Ordine ${item.codice}: DDT='${item.ddt}', DataArrivo='${item.data_arrivo}', Magazzino='${item.magazzino}', Fogli=${item.fogli}`);
        });
      } else if (ordiniRes.error) {
        console.error('[useCartoni - loadData] Error loading ordini:', ordiniRes.error);
      }

      if (esauritiRes.data) {
        setEsauriti(esauritiRes.data);
        console.log('[useCartoni - loadData] Esauriti data loaded:', esauritiRes.data.length, 'items. Sample:', esauritiRes.data.slice(0, 2));
      } else if (esauritiRes.error) {
        console.error('[useCartoni - loadData] Error loading esauriti:', esauritiRes.error);
      }

      if (storicoRes.data) {
        const storicoWithUsernames: StoricoMovimento[] = storicoRes.data.map(mov => ({
          ...mov,
          username: mov.app_users?.username || 'Sconosciuto'
        }));
        setStorico(storicoWithUsernames);
        console.log('[useCartoni - loadData] Storico data loaded:', storicoWithUsernames.length, 'items. Sample:', storicoWithUsernames.slice(0, 2));
      } else if (storicoRes.error) {
        console.error('[useCartoni - loadData] Error loading storico:', storicoRes.error);
      }
    } catch (error) {
      console.error('[useCartoni - loadData] Errore caricamento dati:', error);
      notifications.showError('Errore nel caricamento dei dati del magazzino.');
    } finally {
      setLoading(false);
      console.log('[useCartoni - loadData] Data loading finished.');
    }
  };

  useEffect(() => {
    loadData();

    const giacenzaChannel = supabase
      .channel('giacenza-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'giacenza'
      }, () => {
        console.log('[useCartoni - Realtime] Change detected in giacenza. Reloading data...');
        loadData();
      })
      .subscribe();

    const ordiniChannel = supabase
      .channel('ordini-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'ordini'
      }, () => {
        console.log('[useCartoni - Realtime] Change detected in ordini. Reloading data...');
        loadData();
      })
      .subscribe();

    const esauritiChannel = supabase
      .channel('esauriti-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'esauriti'
      }, () => {
        console.log('[useCartoni - Realtime] Change detected in esauriti. Reloading data...');
        loadData();
      })
      .subscribe();

    const storicoChannel = supabase
      .channel('storico-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'storico'
      }, () => {
        console.log('[useCartoni - Realtime] Change detected in storico. Reloading data...');
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(giacenzaChannel);
      supabase.removeChannel(ordiniChannel);
      supabase.removeChannel(esauritiChannel);
      supabase.removeChannel(storicoChannel);
      console.log('[useCartoni - Realtime] All channels unsubscribed.');
    };
  }, []);

  const aggiungiOrdine = async (cartone: Cartone) => {
    const cartoneForOrdini: Omit<Cartone, 'ddt' | 'data_arrivo' | 'data_esaurimento'> = {
      codice: cartone.codice,
      fornitore: cartone.fornitore,
      ordine: cartone.ordine,
      tipologia: cartone.tipologia,
      formato: cartone.formato,
      grammatura: cartone.grammatura,
      fogli: cartone.fogli,
      cliente: cartone.cliente,
      lavoro: cartone.lavoro,
      magazzino: cartone.magazzino || '-',
      prezzo: cartone.prezzo,
      data_consegna: cartone.data_consegna,
      confermato: cartone.confermato,
      note: cartone.note,
      fsc: cartone.fsc,
      alimentare: cartone.alimentare,
      rif_commessa_fsc: cartone.rif_commessa_fsc || null,
    };

    console.log('[useCartoni - aggiungiOrdine] Inserting into ordini:', JSON.stringify(cartoneForOrdini, null, 2));

    const { error } = await supabase.from('ordini').insert([cartoneForOrdini]);

    if (!error) {
      const movimento: StoricoMovimento = {
        codice: cartone.codice,
        tipo: 'carico',
        quantita: cartone.fogli,
        data: new Date().toISOString(),
        note: `Nuovo ordine in arrivo registrato`,
        user_id: user?.id,
        numero_ordine_acquisto: cartone.ordine,
        cliente: cartone.cliente,
        lavoro: cartone.lavoro,
      };
      await supabase.from('storico').insert([movimento]);
    } else {
      console.error('[useCartoni - aggiungiOrdine] Error inserting into ordini:', error);
    }

    return { error };
  };

  const spostaInGiacenza = async (codice: string, ddt: string | null, dataArrivo: string, fogliEffettivi: number, magazzino: string | null) => {
    console.log(`[useCartoni - spostaInGiacenza] Inizio operazione per codice: ${codice}`);
    console.log(`[useCartoni - spostaInGiacenza] Parametri ricevuti: ddt='${ddt}', dataArrivo='${dataArrivo}', fogliEffettivi=${fogliEffettivi}, magazzino='${magazzino}'`);

    const ordine = ordini.find(o => o.codice === codice);
    if (!ordine) {
      console.error(`[useCartoni - spostaInGiacenza] Errore: Ordine non trovato per codice ${codice} nella lista 'ordini'.`);
      notifications.showError('Ordine non trovato');
      return { error: new Error('Ordine non trovato') };
    }

    console.log(`[useCartoni - spostaInGiacenza] Ordine trovato (originale da 'ordini'):`, JSON.stringify(ordine, null, 2));
    console.log(`[useCartoni - spostaInGiacenza] Stato attuale dell'array 'ordini' prima della cancellazione:`, JSON.stringify(ordini.map(o => o.codice), null, 2));

    const fogliFinali = fogliEffettivi;
    const magazzinoFinale = magazzino;

    const cartoneGiacenza: Omit<Cartone, 'confermato' | 'data_consegna' | 'data_esaurimento'> = {
      codice: ordine.codice,
      fornitore: ordine.fornitore,
      ordine: ordine.ordine,
      tipologia: ordine.tipologia,
      formato: ordine.formato,
      grammatura: ordine.grammatura,
      fogli: fogliFinali,
      cliente: ordine.cliente,
      lavoro: ordine.lavoro,
      prezzo: ordine.prezzo,
      note: ordine.note || '-',
      fsc: ordine.fsc,
      alimentare: ordine.alimentare,
      rif_commessa_fsc: ordine.rif_commessa_fsc || null,
      ddt: ddt,
      data_arrivo: dataArrivo,
      magazzino: magazzinoFinale,
    };

    console.log(`[useCartoni - spostaInGiacenza] Dati finali per inserimento in 'giacenza' (PRIMA DELL'INSERT):`, JSON.stringify(cartoneGiacenza, null, 2));
    console.log(`[useCartoni - spostaInGiacenza] Tentativo di eliminare da 'ordini' il codice: ${codice}`);

    const { error: deleteError, count: deletedCount } = await supabase.from('ordini').delete().eq('codice', codice);
    if (deleteError) {
      console.error(`[useCartoni - spostaInGiacenza] Errore eliminazione ordine da 'ordini':`, deleteError);
      notifications.showError(`Errore eliminazione ordine: ${deleteError.message}`);
      return { error: deleteError };
    }

    console.log(`[useCartoni - spostaInGiacenza] Eliminazione da 'ordini' riuscita per codice: ${codice}. Righe eliminate: ${deletedCount}`);
    console.log(`[useCartoni - spostaInGiacenza] Tentativo di inserire in 'giacenza' il cartone:`, JSON.stringify(cartoneGiacenza, null, 2));

    const { error: insertError } = await supabase.from('giacenza').insert([cartoneGiacenza]);
    if (insertError) {
      console.error(`[useCartoni - spostaInGiacenza] Errore inserimento in 'giacenza':`, insertError);
      notifications.showError(`Errore inserimento in giacenza: ${insertError.message}`);
      return { error: insertError };
    }

    console.log(`[useCartoni - spostaInGiacenza] Inserimento in 'giacenza' riuscito per codice: ${codice}`);

    const movimento: StoricoMovimento = {
      codice,
      tipo: 'carico',
      quantita: fogliFinali,
      data: new Date().toISOString(),
      note: `${fogliEffettivi !== undefined && fogliEffettivi !== ordine.fogli ? `Caricato da ordine ${ordine.ordine} - Ordinati: ${ordine.fogli}, Arrivati: ${fogliEffettivi}` : `Caricato da ordine ${ordine.ordine}`}`,
      user_id: user?.id,
      numero_ordine_acquisto: ordine.ordine,
      cliente: ordine.cliente,
      lavoro: ordine.lavoro,
    };

    console.log(`[useCartoni - spostaInGiacenza] Registrando movimento storico. User ID:`, user?.id, "Movimento:", movimento);

    const { error: storicoError } = await supabase.from('storico').insert([movimento]);
    if (storicoError) {
      console.error(`[useCartoni - spostaInGiacenza] Errore inserimento in 'storico':`, storicoError);
      notifications.showError(`Errore registrazione storico: ${storicoError.message}`);
    } else {
      console.log(`[useCartoni - spostaInGiacenza] Registrazione storico riuscita per codice: ${codice}`);
    }

    if (ordine.ordine && codice) {
      console.log(`[useCartoni - spostaInGiacenza] Tentativo di aggiornare lo stato dell'articolo nell'OA: '${ordine.ordine}', Articolo: '${codice}', Nuovo stato: 'ricevuto'`);
      const { success: updateSuccess, error: updateArticleError } = await updateArticleStatusInOrder(ordine.ordine, codice, 'ricevuto');
      if (updateArticleError) {
        console.error(`[useCartoni - spostaInGiacenza] Errore durante l'aggiornamento dello stato dell'articolo nell'OA:`, updateArticleError);
        notifications.showError(`Errore durante l'aggiornamento dello stato dell'articolo nell'ordine d'acquisto: ${updateArticleError.message}. Il cartone è stato comunque spostato in magazzino.`);
      } else {
        console.log(`[useCartoni - spostaInGiacenza] updateArticleStatusInOrder completato con successo: ${updateSuccess}`);
      }
    } else {
      console.warn(`[useCartoni - spostaInGiacenza] Impossibile chiamare updateArticleStatusInOrder: ordine.ordine o codice mancante. Ordine.ordine: '${ordine.ordine}', Codice: '${codice}'`);
      notifications.showInfo(`Impossibile aggiornare lo stato dell'articolo nell'ordine d'acquisto (dati mancanti). Il cartone è stato comunque spostato in magazzino.`);
    }

    console.log(`[useCartoni - spostaInGiacenza] Operazione completata per codice: ${codice}`);
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
      numero_ordine_acquisto: cartone.ordine,
      cliente: cartone.cliente,
      lavoro: cartone.lavoro,
    };

    const { error: storicoError } = await supabase.from('storico').insert([movimento]);
    if (storicoError) {
      console.error('Errore inserimento storico:', storicoError);
      notifications.showError(`Errore registrazione storico: ${storicoError.message}`);
    }

    if (nuoviFogli <= 0) {
      const { error: deleteGiacenzaError } = await supabase.from('giacenza').delete().eq('codice', codice);
      if (deleteGiacenzaError) {
        notifications.showError(`Errore eliminazione da giacenza: ${deleteGiacenzaError.message}`);
        return { error: deleteGiacenzaError };
      }

      const cartoneEsaurito: Omit<Cartone, 'confermato' | 'data_consegna'> = {
        codice: cartone.codice,
        fornitore: cartone.fornitore,
        ordine: cartone.ordine,
        tipologia: cartone.tipologia,
        formato: cartone.formato,
        grammatura: cartone.grammatura,
        fogli: 0,
        cliente: cartone.cliente,
        lavoro: cartone.lavoro,
        magazzino: cartone.magazzino,
        prezzo: cartone.prezzo,
        note: cartone.note,
        fsc: cartone.fsc,
        alimentare: cartone.alimentare,
        rif_commessa_fsc: cartone.rif_commessa_fsc || null,
        ddt: cartone.ddt,
        data_arrivo: cartone.data_arrivo,
        data_esaurimento: new Date().toISOString(),
      };

      console.log('[useCartoni - scaricoFogli] Inserting into esauriti:', JSON.stringify(cartoneEsaurito, null, 2));

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

    return { error: null };
  };

  const riportaInGiacenza = async (codice: string) => {
    const cartoneEsaurito = esauriti.find(c => c.codice === codice);
    if (!cartoneEsaurito) {
      notifications.showError('Cartone non trovato negli esauriti.');
      return { error: new Error('Cartone non trovato negli esauriti.') };
    }

    // Create an object for insertion into 'giacenza'
    // The 'giacenza' table does not have 'data_esaurimento' or 'confermato'
    const cartonePerGiacenza: Omit<Cartone, 'confermato' | 'data_consegna' | 'data_esaurimento'> = {
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
      data_arrivo: new Date().toISOString().split('T')[0],
      fsc: cartoneEsaurito.fsc,
      alimentare: cartoneEsaurito.alimentare,
      rif_commessa_fsc: cartoneEsaurito.rif_commessa_fsc || null,
    };

    console.log('[useCartoni - riportaInGiacenza] Inserting into giacenza:', JSON.stringify(cartonePerGiacenza, null, 2));

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
        numero_ordine_acquisto: cartoneEsaurito.ordine,
        cliente: cartoneEsaurito.cliente,
        lavoro: cartoneEsaurito.lavoro,
      };

      const { error: storicoError } = await supabase.from('storico').insert([movimento]);
      if (storicoError) {
        notifications.showError(`Errore registrazione storico: ${storicoError.message}`);
      }

      if (cartoneEsaurito.ordine && codice) {
        console.log(`[useCartoni - riportaInGiacenza] Tentativo di aggiornare lo stato dell'articolo nell'OA: '${cartoneEsaurito.ordine}', Articolo: '${codice}', Nuovo stato: 'confermato'`);
        const { success: updateSuccess, error: updateArticleError } = await updateArticleStatusInOrder(cartoneEsaurito.ordine, codice, 'confermato');
        if (updateArticleError) {
          console.error(`[useCartoni - riportaInGiacenza] Errore durante l'aggiornamento dello stato dell'articolo nell'OA:`, updateArticleError);
          notifications.showError(`Errore durante l'aggiornamento dello stato dell'articolo nell'ordine d'acquisto: ${updateArticleError.message}. Il cartone è stato comunque riportato in giacenza.`);
        } else {
          console.log(`[useCartoni - riportaInGiacenza] updateArticleStatusInOrder completato con successo: ${updateSuccess}`);
        }
      } else {
        console.warn(`[useCartoni - riportaInGiacenza] Impossibile chiamare updateArticleStatusInOrder: ordine.ordine o codice mancante. Ordine.ordine: '${cartoneEsaurito.ordine}', Codice: '${codice}'`);
        notifications.showInfo(`Impossibile aggiornare lo stato dell'articolo nell'ordine d'acquisto (dati mancanti). Il cartone è stato comunque riportato in giacenza.`);
      }

      notifications.showSuccess(`✅ Cartone '${codice}' riportato in giacenza con successo!`);
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

    console.log(`[useCartoni - riportaInOrdini] Cartone trovato in giacenza per codice ${codice}:`, JSON.stringify(cartone, null, 2));
    console.log(`[useCartoni - riportaInOrdini] Valori da giacenza: DDT='${cartone.ddt}', DataArrivo='${cartone.data_arrivo}', Magazzino='${cartone.magazzino}', Fogli=${cartone.fogli}`);

    // Create an object for insertion into 'ordini'
    // IMPORTANT: The 'ordini' table does NOT have 'data_esaurimento' column
    const ordinePerOrdini: Omit<Cartone, 'data_esaurimento'> = {
      codice: cartone.codice,
      fornitore: cartone.fornitore,
      ordine: cartone.ordine,
      tipologia: cartone.tipologia,
      formato: cartone.formato,
      grammatura: cartone.grammatura,
      fogli: cartone.fogli,
      cliente: cartone.cliente,
      lavoro: cartone.lavoro,
      prezzo: cartone.prezzo,
      note: cartone.note,
      fsc: cartone.fsc,
      alimentare: cartone.alimentare,
      rif_commessa_fsc: cartone.rif_commessa_fsc || null,
      data_consegna: cartone.data_consegna || new Date().toISOString().split('T')[0],
      confermato: true,
      ddt: cartone.ddt,
      data_arrivo: cartone.data_arrivo,
      magazzino: cartone.magazzino,
    };

    console.log('[useCartoni - riportaInOrdini] Dati per inserimento in ordini (PRIMA DELL\'INSERT):', JSON.stringify(ordinePerOrdini, null, 2));

    console.log(`[useCartoni - riportaInOrdini] Tentativo di eliminare da 'ordini' eventuali record precedenti per codice: ${codice}`);
    const { error: deleteExistingError, count: deletedExistingCount } = await supabase.from('ordini').delete().eq('codice', codice);
    if (deleteExistingError) {
      console.error(`[useCartoni - riportaInOrdini] Errore durante l'eliminazione di record esistenti da 'ordini':`, deleteExistingError);
      notifications.showError(`Errore durante la pulizia dei record precedenti in ordini: ${deleteExistingError.message}`);
      return { error: deleteExistingError };
    }

    console.log(`[useCartoni - riportaInOrdini] Eliminati ${deletedExistingCount} record esistenti da 'ordini' per codice: ${codice}`);

    await supabase.from('giacenza').delete().eq('codice', codice);

    const { error: insertError, data: insertedData } = await supabase.from('ordini').insert([ordinePerOrdini]).select();
    if (insertError) {
      console.error('[useCartoni - riportaInOrdini] Errore inserimento in ordini:', insertError);
      notifications.showError(`Errore inserimento in ordini: ${insertError.message}`);
      return { error: insertError };
    }

    console.log('[useCartoni - riportaInOrdini] Inserimento in ordini riuscito. Dati inseriti:', JSON.stringify(insertedData, null, 2));

    const movimento: StoricoMovimento = {
      codice,
      tipo: 'carico',
      quantita: ordinePerOrdini.fogli,
      data: new Date().toISOString(),
      note: `Riportato in ordini in arrivo da giacenza`,
      user_id: user?.id,
      numero_ordine_acquisto: ordinePerOrdini.ordine,
      cliente: ordinePerOrdini.cliente,
      lavoro: ordinePerOrdini.lavoro,
    };

    const { error: storicoError } = await supabase.from('storico').insert([movimento]);
    if (storicoError) {
      notifications.showError(`Errore registrazione storico: ${storicoError.message}`);
    }

    if (ordinePerOrdini.ordine && codice) {
      console.log(`[useCartoni - riportaInOrdini] Tentativo di aggiornare lo stato dell'articolo nell'OA: '${ordinePerOrdini.ordine}', Articolo: '${codice}', Nuovo stato: 'confermato'`);
      const { success: updateSuccess, error: updateArticleError } = await updateArticleStatusInOrder(ordinePerOrdini.ordine, codice, 'confermato');
      if (updateArticleError) {
        console.error(`[useCartoni - riportaInOrdini] Errore durante l'aggiornamento dello stato dell'articolo nell'OA:`, updateArticleError);
        notifications.showError(`Errore durante l'aggiornamento dello stato dell'articolo nell'ordine d'acquisto: ${updateArticleError.message}. Il cartone è stato comunque riportato in ordini in arrivo.`);
      } else {
        console.log(`[useCartoni - riportaInOrdini] updateArticleStatusInOrder completato con successo: ${updateSuccess}`);
      }
    } else {
      console.warn(`[useCartoni - riportaInOrdini] Impossibile chiamare updateArticleStatusInOrder: ordine.ordine o codice mancante. Ordine.ordine: '${ordinePerOrdini.ordine}', Codice: '${codice}'`);
      notifications.showInfo(`Impossibile aggiornare lo stato dell'articolo nell'ordine d'acquisto (dati mancanti). Il cartone è stato comunque riportato in ordini in arrivo.`);
    }

    return { error: null };
  };

  const confermaOrdine = async (codice: string, confermato: boolean) => {
    console.log(`[useCartoni - confermaOrdine] Inizio per codice: ${codice}, confermato: ${confermato}`);

    const ordineInArrivo = ordini.find(o => o.codice === codice);
    if (!ordineInArrivo) {
      notifications.showError('Ordine in arrivo non trovato.');
      console.error(`[useCartoni - confermaOrdine] Errore: Ordine in arrivo non trovato per codice ${codice}`);
      return { error: new Error('Ordine in arrivo non trovato.') };
    }

    const { error: updateOrdiniError } = await supabase.from('ordini').update({ confermato }).eq('codice', codice);
    if (updateOrdiniError) {
      notifications.showError(`Errore aggiornamento stato conferma in ordini: ${updateOrdiniError.message}`);
      console.error(`[useCartoni - confermaOrdine] Errore aggiornamento 'confermato' in tabella 'ordini':`, updateOrdiniError);
      return { error: updateOrdiniError };
    }

    console.log(`[useCartoni - confermaOrdine] Campo 'confermato' aggiornato in tabella 'ordini' per codice ${codice} a ${confermato}.`);

    if (ordineInArrivo.ordine && codice) {
      let newArticleStatus: ArticoloOrdineAcquisto['stato'];
      if (confermato) {
        newArticleStatus = 'confermato';
        console.log(`[useCartoni - confermaOrdine] Impostato newArticleStatus a 'confermato' per articolo ${codice}.`);
      } else {
        const { data: purchaseOrder, error: fetchOAError } = await supabase
          .from('ordini_acquisto')
          .select('stato, articoli')
          .eq('numero_ordine', ordineInArrivo.ordine)
          .single();

        if (fetchOAError || !purchaseOrder || !purchaseOrder.articoli) {
          console.error(`[useCartoni - confermaOrdine] Errore recupero ordine d'acquisto per stato articolo:`, fetchOAError);
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

        console.log(`[useCartoni - confermaOrdine] Impostato newArticleStatus a '${newArticleStatus}' per articolo ${codice} (unconfirm).`);
      }

      console.log(`[useCartoni - confermaOrdine] Chiamando updateArticleStatusInOrder per ordine: ${ordineInArrivo.ordine}, articolo: ${codice}, nuovo stato: ${newArticleStatus}`);
      await updateArticleStatusInOrder(ordineInArrivo.ordine, codice, newArticleStatus);
    }

    const movimento: StoricoMovimento = {
      codice: codice,
      tipo: 'carico',
      quantita: ordineInArrivo.fogli,
      data: new Date().toISOString(),
      note: `Ordine in arrivo ${confermato ? 'confermato' : 'non confermato'}`,
      user_id: user?.id,
      numero_ordine_acquisto: ordineInArrivo.ordine,
      cliente: ordineInArrivo.cliente,
      lavoro: ordineInArrivo.lavoro,
    };

    await supabase.from('storico').insert([movimento]);
    console.log(`[useCartoni - confermaOrdine] Operazione completata per codice: ${codice}.`);
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
        numero_ordine_acquisto: ordineInArrivo.ordine,
        cliente: ordineInArrivo.cliente,
        lavoro: ordineInArrivo.lavoro,
      };

      await supabase.from('storico').insert([movimento]);
    }

    await supabase.from('ordini').delete().eq('codice', codice);
  };

  const modificaOrdine = async (codice: string, dati: Partial<Cartone>) => {
    const ordineInArrivo = ordini.find(o => o.codice === codice);
    if (!ordineInArrivo) {
      notifications.showError('Ordine in arrivo non trovato per la modifica.');
      return;
    }

    const datiPerAggiornamento: Partial<Cartone> = {
      codice: dati.codice,
      fornitore: dati.fornitore,
      ordine: dati.ordine,
      tipologia: dati.tipologia,
      formato: dati.formato,
      grammatura: dati.grammatura,
      fogli: dati.fogli,
      cliente: dati.cliente,
      lavoro: dati.lavoro,
      magazzino: dati.magazzino,
      prezzo: dati.prezzo,
      data_consegna: dati.data_consegna,
      confermato: dati.confermato,
      note: dati.note,
      fsc: dati.fsc,
      alimentare: dati.alimentare,
      rif_commessa_fsc: dati.rif_commessa_fsc,
      ddt: dati.ddt,
      data_arrivo: dati.data_arrivo,
    };

    console.log('[useCartoni - modificaOrdine] Updating ordini with:', JSON.stringify(datiPerAggiornamento, null, 2));

    const { error } = await supabase.from('ordini').update(datiPerAggiornamento).eq('codice', codice);
    if (!error) {
      const movimento: StoricoMovimento = {
        codice: codice,
        tipo: 'modifica',
        quantita: dati.fogli || 0,
        data: new Date().toISOString(),
        note: `Modifica dettagli ordine in arrivo`,
        user_id: user?.id,
        numero_ordine_acquisto: ordineInArrivo.ordine,
        cliente: dati.cliente,
        lavoro: dati.lavoro,
      };

      await supabase.from('storico').insert([movimento]);
    } else {
      console.error('[useCartoni - modificaOrdine] Error updating ordini:', error);
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