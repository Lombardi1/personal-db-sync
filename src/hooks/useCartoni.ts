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
    console.log('[useCartoni] Attempting to load data...');
    try {
      const [giacenzaRes, ordiniRes, esauritiRes, storicoRes] = await Promise.all([
        supabase.from('giacenza').select('*'),
        supabase.from('ordini').select('*'),
        supabase.from('esauriti').select('*'),
        supabase.from('storico').select(`*, app_users(username)`).order('data', { ascending: false })
      ]);

      if (giacenzaRes.data) {
        setGiacenza(giacenzaRes.data);
        console.log('[useCartoni] Giacenza data loaded:', giacenzaRes.data.length, 'items');
      } else if (giacenzaRes.error) {
        console.error('[useCartoni] Error loading giacenza:', giacenzaRes.error);
      }

      if (ordiniRes.data) {
        setOrdini(ordiniRes.data);
        console.log('[useCartoni] Ordini data loaded:', ordiniRes.data.length, 'items');
      } else if (ordiniRes.error) {
        console.error('[useCartoni] Error loading ordini:', ordiniRes.error);
      }
      
      if (esauritiRes.data) {
        setEsauriti(esauritiRes.data);
        console.log('[useCartoni] Esauriti data loaded:', esauritiRes.data.length, 'items');
      } else if (esauritiRes.error) {
        console.error('[useCartoni] Error loading esauriti:', esauritiRes.error);
      }

      if (storicoRes.data) {
        const storicoWithUsernames: StoricoMovimento[] = storicoRes.data.map(mov => ({
          ...mov,
          username: mov.app_users?.username || 'Sconosciuto'
        }));
        setStorico(storicoWithUsernames);
        console.log('[useCartoni] Storico data loaded:', storicoWithUsernames.length, 'items');
      } else if (storicoRes.error) {
        console.error('[useCartoni] Error loading storico:', storicoRes.error);
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

  const spostaInGiacenza = async (codice: string, ddt: string | null, dataArrivo: string, fogliEffettivi: number, magazzino: string | null) => {
    console.log(`[useCartoni - spostaInGiacenza] Inizio operazione per codice: ${codice}`);
    console.log(`[useCartoni - spostaInGiacenza] Parametri ricevuti: ddt='${ddt}', dataArrivo='${dataArrivo}', fogliEffettivi=${fogliEffettivi}, magazzino='${magazzino}'`);

    const ordine = ordini.find(o => o.codice === codice);
    if (!ordine) {
      console.error(`[useCartoni - spostaInGiacenza] Errore: Ordine non trovato per codice ${codice} nella lista 'ordini'.`);
      notifications.showError('Ordine non trovato');
      return { error: new Error('Ordine non trovato') };
    }
    console.log(`[useCartoni - spostaInGiacenza] Ordine trovato (originale da 'ordini'):`, ordine);

    const fogliFinali = fogliEffettivi;
    const magazzinoFinale = magazzino; 
    
    const cartoneGiacenza: Cartone = {
      ...ordine, 
      ddt,
      data_arrivo: dataArrivo, 
      fogli: fogliFinali, 
      magazzino: magazzinoFinale,
      fsc: ordine.fsc,
      alimentare: ordine.alimentare,
      rif_commessa_fsc: ordine.rif_commessa_fsc || null,
      data_consegna: ordine.data_consegna || null,
    };
    delete cartoneGiacenza.confermato;
    
    console.log(`[useCartoni - spostaInGiacenza] Dati finali per inserimento/aggiornamento in 'giacenza':`, cartoneGiacenza);

    // 1. Controlla se il cartone esiste già in giacenza
    const { data: existingGiacenzaItem, error: fetchGiacenzaError } = await supabase
      .from('giacenza')
      .select('codice')
      .eq('codice', codice)
      .single();

    if (fetchGiacenzaError && fetchGiacenzaError.code !== 'PGRST116') { // PGRST116 = No rows found
      console.error(`[useCartoni - spostaInGiacenza] Errore durante la verifica esistenza in giacenza per codice ${codice}:`, fetchGiacenzaError);
      notifications.showError(`Errore verifica giacenza: ${fetchGiacenzaError.message}`);
      return { error: fetchGiacenzaError };
    }

    let operationError = null;
    if (existingGiacenzaItem) {
      // Se esiste, aggiorna
      console.log(`[useCartoni - spostaInGiacenza] Cartone ${codice} trovato in giacenza. Eseguo UPDATE.`);
      const { error } = await supabase.from('giacenza').update(cartoneGiacenza).eq('codice', codice);
      operationError = error;
    } else {
      // Se non esiste, inserisci
      console.log(`[useCartoni - spostaInGiacenza] Cartone ${codice} NON trovato in giacenza. Eseguo INSERT.`);
      const { error } = await supabase.from('giacenza').insert([cartoneGiacenza]);
      operationError = error;
    }

    if (operationError) {
      console.error(`[useCartoni - spostaInGiacenza] Errore operazione (INSERT/UPDATE) in 'giacenza':`, operationError);
      notifications.showError(`Errore salvataggio in giacenza: ${operationError.message}`);
      return { error: operationError };
    }
    console.log(`[useCartoni - spostaInGiacenza] Operazione (INSERT/UPDATE) in 'giacenza' riuscita per codice: ${codice}`);

    // Elimina da 'ordini' solo dopo aver gestito l'inserimento/aggiornamento in 'giacenza'
    console.log(`[useCartoni - spostaInGiacenza] Tentativo di eliminare da 'ordini' il codice: ${codice}`);
    const { error: deleteError } = await supabase.from('ordini').delete().eq('codice', codice);
    if (deleteError) {
      console.error(`[useCartoni - spostaInGiacenza] Errore eliminazione ordine da 'ordini':`, deleteError);
      notifications.showError(`Errore eliminazione ordine: ${deleteError.message}`);
      // Non ritorniamo qui, l'operazione principale è già riuscita
    } else {
      console.log(`[useCartoni - spostaInGiacenza] Eliminazione da 'ordini' riuscita per codice: ${codice}`);
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

    console.log(`[useCartoni - spostaInGiacenza] Ricarico tutti i dati.`);
    await loadData();
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
      numero_ordine_acquisto: cartone.ordine
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

    const cartonePerGiacenza: Cartone = { // Specificato il tipo Cartone
      codice: cartoneEsaurito.codice,
      fornitore: cartoneEsaurito.fornitore,
      ordine: cartoneEsaurito.ordine,
      tipologia: cartoneEsaurito.tipologia,
      formato: cartoneEsaurito.formato,
      grammatura: cartoneEsaurito.grammatura,
      fogli: cartoneEsaurito.fogli > 0 ? cartoneEsaurito.fogli : 1,
      cliente: cartoneEsaurito.cliente,
      lavoro: cartoneEsaurito.lavoro,
      magazzino: cartoneEsaurito.magazzino, // Mantenuto il magazzino esistente
      prezzo: cartoneEsaurito.prezzo,
      note: cartoneEsaurito.note,
      ddt: null, // DDT è null quando riportato da esauriti
      data_arrivo: new Date().toISOString().split('T')[0], // Data di arrivo odierna
      data_consegna: cartoneEsaurito.data_consegna || null,
      fsc: cartoneEsaurito.fsc,
      alimentare: cartoneEsaurito.alimentare,
      rif_commessa_fsc: cartoneEsaurito.rif_commessa_fsc || null,
    };
    console.log(`[useCartoni - riportaInGiacenza] Dati finali per inserimento in 'giacenza':`, cartonePerGiacenza);

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

    const ordine: Cartone = { ...cartone };
    ordine.ddt = null; // DDT è null quando riportato in ordini
    ordine.data_arrivo = undefined; // data_arrivo non esiste in ordini
    
    ordine.confermato = true; 
    if (!ordine.data_consegna) {
      ordine.data_consegna = new Date().toISOString().split('T')[0];
    }

    await supabase.from('giacenza').delete().eq('codice', codice);
    await supabase.from('ordini').insert([ordine]);

    const movimento: StoricoMovimento = {
      codice,
      tipo: 'carico',
      quantita: ordine.fogli,
      data: new Date().toISOString(),
      note: `Riportato in ordini in arrivo da giacenza`,
      user_id: user?.id,
      numero_ordine_acquisto: ordine.ordine
    };
    const { error: storicoError } = await supabase.from('storico').insert([movimento]);
    if (storicoError) {
      notifications.showError(`Errore registrazione storico: ${storicoError.message}`);
    }

    if (ordine.ordine && codice) {
      console.log(`[useCartoni - riportaInOrdini] Tentativo di aggiornare lo stato dell'articolo nell'OA: '${ordine.ordine}', Articolo: '${codice}', Nuovo stato: 'confermato'`);
      const { success: updateSuccess, error: updateArticleError } = await updateArticleStatusInOrder(ordine.ordine, codice, 'confermato');
      if (updateArticleError) {
        console.error(`[useCartoni - riportaInOrdini] Errore durante l'aggiornamento dello stato dell'articolo nell'OA:`, updateArticleError);
        notifications.showError(`Errore durante l'aggiornamento dello stato dell'articolo nell'ordine d'acquisto: ${updateArticleError.message}. Il cartone è stato comunque riportato in ordini in arrivo.`);
      } else {
        console.log(`[useCartoni - riportaInOrdini] updateArticleStatusInOrder completato con successo: ${updateSuccess}`);
      }
    } else {
      console.warn(`[useCartoni - riportaInOrdini] Impossibile chiamare updateArticleStatusInOrder: ordine.ordine o codice mancante. Ordine.ordine: '${ordine.ordine}', Codice: '${codice}'`);
      notifications.showInfo(`Impossibile aggiornare lo stato dell'articolo nell'ordine d'acquisto (dati mancanti). Il cartone è stato comunque riportato in ordini in arrivo.`);
    }

    await loadData();
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
        // Logic for unconfirming an article
        const { data: purchaseOrder, error: fetchOAError } = await supabase
          .from('ordini_acquisto')
          .select('stato, articoli')
          .eq('numero_ordine', ordineInArrivo.ordine)
          .single();

        if (fetchOAError || !purchaseOrder || !purchaseOrder.articoli) {
          console.error(`[useCartoni - confermaOrdine] Errore recupero ordine d'acquisto per stato articolo:`, fetchOAError);
          newArticleStatus = 'inviato'; // Fallback
        } else {
          const articles = purchaseOrder.articoli as ArticoloOrdineAcquisto[];
          const currentArticleInOA = articles.find(art => art.codice_ctn === codice);
          
          if (currentArticleInOA && currentArticleInOA.stato === 'confermato') {
            // If the article was confirmed and is now being unconfirmed, revert its status
            // based on the main purchase order status.
            if (purchaseOrder.stato === 'inviato') {
                newArticleStatus = 'inviato';
            } else if (purchaseOrder.stato === 'in_attesa') {
                newArticleStatus = 'in_attesa';
            } else {
                newArticleStatus = 'inviato'; // Default if main order status is unexpected
            }
          } else {
            newArticleStatus = currentArticleInOA?.stato || 'in_attesa'; // Keep its current status or default
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
      numero_ordine_acquisto: ordineInArrivo.ordine
    };
    await supabase.from('storico').insert([movimento]);

    await loadData();
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