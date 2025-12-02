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
        // AGGIUNTO: ddt e data_arrivo
        supabase.from('ordini').select('codice, fornitore, ordine, ddt, tipologia, formato, grammatura, fogli, cliente, lavoro, magazzino, prezzo, data_consegna, data_arrivo, confermato, note, fsc, alimentare, rif_commessa_fsc'),
        // Seleziona esplicitamente le colonne per la tabella 'esauriti'
        supabase.from('esauriti').select('codice, fornitore, ordine, ddt, tipologia, formato, grammatura, fogli, cliente, lavoro, magazzino, prezzo, data_arrivo, note, fsc, alimentare, rif_commessa_fsc'),
        supabase.from('storico').select(`*, app_users(username)`).order('data', { ascending: false })
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
          console.log(`  - Ordine ${item.codice}: DDT='${item.ddt}', DataArrivo='${item.data_arrivo}', Magazzino='${item.magazzino}', Fogli=${item.fogli}`); // Keep this for general check
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'giacenza' }, () => {
        console.log('[useCartoni - Realtime] Change detected in giacenza. Reloading data...');
        loadData();
      })
      .subscribe();

    const ordiniChannel = supabase
      .channel('ordini-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ordini' }, () => {
        console.log('[useCartoni - Realtime] Change detected in ordini. Reloading data...');
        loadData();
      })
      .subscribe();

    const esauritiChannel = supabase
      .channel('esauriti-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'esauriti' }, () => {
        console.log('[useCartoni - Realtime] Change detected in esauriti. Reloading data...');
        loadData();
      })
      .subscribe();

    const storicoChannel = supabase
      .channel('storico-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'storico' }, () => {
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
    const cartoneForOrdini: Omit<Cartone, 'ddt' | 'data_arrivo'> = {
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
        numero_ordine_acquisto: cartone.ordine
      };
      await supabase.from('storico').insert([movimento]);
      // Rimosso: await loadData();
    } else {
      console.error('[useCartoni - aggiungiOrdine] Error inserting into ordini:', error);
    }
    return { error };
  };

  const spostaInGiacenza = async (codice: string, ddt: string | null, dataArrivo: string, fogliEffettivi: number, magazzino: string | null) => {
    console.log(`[useCartoni - spostaInGiacenza] Inizio operazione per codice: ${codice}`);
    console.log(`[useCartoni - spostaInGiacenza] Parametri ricevuti: ddt='${ddt}', dataArrivo='${dataArrivo}', fogliEffettivi=${fogliEffettivi}, magazzino='${magazzino}'`);

    const ordineInArrivo = ordini.find(o => o.codice === codice);
    if (!ordineInArrivo) {
      console.error(`[useCartoni - spostaInGiacenza] Errore: Ordine non trovato per codice ${codice} nella lista 'ordini'.`);
      notifications.showError('Ordine non trovato');
      return { error: new Error('Ordine non trovato') };
    }
    console.log(`[useCartoni - spostaInGiacenza] Ordine trovato (originale da 'ordini'):`, JSON.stringify(ordineInArrivo, null, 2));

    if (!ordineInArrivo.ordine) {
      console.error(`[useCartoni - spostaInGiacenza] Errore: Ordine d'acquisto principale non trovato per l'articolo ${codice}.`);
      notifications.showError('Ordine d\'acquisto principale non trovato.');
      return { error: new Error('Ordine d\'acquisto principale non trovato.') };
    }

    // Aggiorna lo stato e i dettagli dell'articolo nell'ordine d'acquisto principale
    const { success, error: updateArticleError } = await updateArticleStatusInOrder(
      ordineInArrivo.ordine,
      codice,
      'ricevuto',
      {
        ddt: ddt,
        data_arrivo: dataArrivo,
        magazzino: magazzino,
        numero_fogli: fogliEffettivi, // Aggiorna i fogli effettivi
        quantita: (ordineInArrivo.prezzo && fogliEffettivi && ordineInArrivo.formato && ordineInArrivo.grammatura) 
          ? (fogliEffettivi * (parseFloat(ordineInArrivo.formato.split('x')[0].replace(',', '.')) / 100) * (parseFloat(ordineInArrivo.formato.split('x')[1].replace(',', '.')) / 100) * parseFloat(ordineInArrivo.grammatura.replace(' g/m²', '')) / 1000)
          : ordineInArrivo.quantita, // Ricalcola la quantità in kg se possibile, altrimenti mantieni l'originale
      }
    );

    if (updateArticleError) {
      console.error(`[useCartoni - spostaInGiacenza] Errore durante l'aggiornamento dello stato dell'articolo nell'OA:`, updateArticleError);
      notifications.showError(`Errore durante l'aggiornamento dello stato dell'articolo nell'ordine d'acquisto: ${updateArticleError.message}.`);
      return { error: updateArticleError };
    }

    const movimento: StoricoMovimento = {
      codice,
      tipo: 'carico',
      quantita: fogliEffettivi,
      data: new Date().toISOString(),
      note: `${fogliEffettivi !== undefined && fogliEffettivi !== ordineInArrivo.fogli 
        ? `Caricato da ordine ${ordineInArrivo.ordine} - Ordinati: ${ordineInArrivo.fogli}, Arrivati: ${fogliEffettivi}`
        : `Caricato da ordine ${ordineInArrivo.ordine}`
      }`,
      user_id: user?.id,
      numero_ordine_acquisto: ordineInArrivo.ordine
    };
    console.log(`[useCartoni - spostaInGiacenza] Registrando movimento storico. User ID:`, user?.id, "Movimento:", movimento);
    const { error: storicoError } = await supabase.from('storico').insert([movimento]);
    if (storicoError) {
      console.error(`[useCartoni - spostaInGiacenza] Errore inserimento in 'storico':`, storicoError);
      notifications.showError(`Errore registrazione storico: ${storicoError.message}`);
    } else {
      console.log(`[useCartoni - spostaInGiacenza] Registrazione storico riuscita per codice: ${codice}`);
    }

    notifications.showSuccess(`✅ Ordine ${codice} spostato in magazzino`);
    // loadData() verrà chiamato dal real-time di ordini_acquisto tramite syncArticleInventoryStatus
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

    // Aggiorna l'articolo nell'ordine d'acquisto principale
    const { success, error: updateArticleError } = await updateArticleStatusInOrder(
      cartone.ordine,
      codice,
      nuoviFogli <= 0 ? 'annullato' : 'ricevuto', // Se i fogli sono <= 0, l'articolo è esaurito/annullato
      {
        numero_fogli: nuoviFogli > 0 ? nuoviFogli : 0,
        // Ricalcola la quantità in kg se necessario
        quantita: (cartone.prezzo && nuoviFogli && cartone.formato && cartone.grammatura) 
          ? (nuoviFogli * (parseFloat(cartone.formato.split('x')[0].replace(',', '.')) / 100) * (parseFloat(cartone.formato.split('x')[1].replace(',', '.')) / 100) * parseFloat(cartone.grammatura.replace(' g/m²', '')) / 1000)
          : cartone.quantita,
        // Quando si scarica, i dettagli di arrivo rimangono gli stessi finché non è completamente esaurito
        ddt: cartone.ddt,
        data_arrivo: cartone.data_arrivo,
        magazzino: cartone.magazzino,
      }
    );

    if (updateArticleError) {
      console.error(`[useCartoni - scaricoFogli] Errore durante l'aggiornamento dello stato dell'articolo nell'OA:`, updateArticleError);
      notifications.showError(`Errore durante l'aggiornamento dello stato dell'articolo nell'ordine d'acquisto: ${updateArticleError.message}.`);
      return { error: updateArticleError };
    }

    // La logica di spostamento tra giacenza ed esauriti sarà gestita da syncArticleInventoryStatus
    // in base al numero_fogli aggiornato nell'ordine d'acquisto.
    notifications.showSuccess(`✅ Scaricati ${quantita} fogli dal cartone ${codice}`);
    return { error: null };
  };

  const riportaInGiacenza = async (codice: string) => {
    const cartoneEsaurito = esauriti.find(c => c.codice === codice);
    if (!cartoneEsaurito) {
      notifications.showError('Cartone non trovato negli esauriti.');
      return { error: new Error('Cartone non trovato negli esauriti.') };
    }

    if (!cartoneEsaurito.ordine) {
      notifications.showError('Ordine d\'acquisto principale non trovato per l\'articolo esaurito.');
      return { error: new Error('Ordine d\'acquisto principale non trovato.') };
    }

    // Aggiorna lo stato e i dettagli dell'articolo nell'ordine d'acquisto principale
    const { success, error: updateArticleError } = await updateArticleStatusInOrder(
      cartoneEsaurito.ordine,
      codice,
      'ricevuto', // Riportato in giacenza significa che è 'ricevuto'
      {
        numero_fogli: cartoneEsaurito.fogli > 0 ? cartoneEsaurito.fogli : 1, // Riporta con i fogli originali o almeno 1
        // Ricalcola la quantità in kg se necessario
        quantita: (cartoneEsaurito.prezzo && cartoneEsaurito.fogli && cartoneEsaurito.formato && cartoneEsaurito.grammatura) 
          ? ((cartoneEsaurito.fogli > 0 ? cartoneEsaurito.fogli : 1) * (parseFloat(cartoneEsaurito.formato.split('x')[0].replace(',', '.')) / 100) * (parseFloat(cartoneEsaurito.formato.split('x')[1].replace(',', '.')) / 100) * parseFloat(cartoneEsaurito.grammatura.replace(' g/m²', '')) / 1000)
          : cartoneEsaurito.quantita,
        // I dettagli di arrivo dovrebbero essere ripristinati o impostati a null se non disponibili
        ddt: cartoneEsaurito.ddt || null,
        data_arrivo: cartoneEsaurito.data_arrivo || new Date().toISOString().split('T')[0],
        magazzino: cartoneEsaurito.magazzino || '-',
      }
    );

    if (updateArticleError) {
      console.error(`[useCartoni - riportaInGiacenza] Errore durante l'aggiornamento dello stato dell'articolo nell'OA:`, updateArticleError);
      notifications.showError(`Errore durante l'aggiornamento dello stato dell'articolo nell'ordine d'acquisto: ${updateArticleError.message}.`);
      return { error: updateArticleError };
    }

    notifications.showSuccess(`✅ Cartone '${codice}' riportato in giacenza con successo!`);
    // loadData() verrà chiamato dal real-time di ordini_acquisto tramite syncArticleInventoryStatus
    return { error: null };
  };

  const riportaInOrdini = async (codice: string) => {
    const cartoneInGiacenza = giacenza.find(c => c.codice === codice);
    if (!cartoneInGiacenza) {
      notifications.showError('Cartone non trovato in giacenza.');
      return { error: new Error('Cartone non trovato in giacenza.') };
    }
    console.log(`[useCartoni - riportaInOrdini] Cartone trovato in giacenza per codice ${codice}:`, JSON.stringify(cartoneInGiacenza, null, 2));

    if (!cartoneInGiacenza.ordine) {
      notifications.showError('Ordine d\'acquisto principale non trovato per l\'articolo in giacenza.');
      return { error: new Error('Ordine d\'acquisto principale non trovato.') };
    }

    // Aggiorna lo stato e i dettagli dell'articolo nell'ordine d'acquisto principale
    const { success, error: updateArticleError } = await updateArticleStatusInOrder(
      cartoneInGiacenza.ordine,
      codice,
      'confermato', // Riportato in ordini significa che è 'confermato'
      {
        numero_fogli: cartoneInGiacenza.fogli, // Mantiene i fogli attuali
        quantita: cartoneInGiacenza.quantita, // Mantiene la quantità in kg attuale
        // Quando si riporta in ordini, i dettagli di arrivo devono essere azzerati
        ddt: null,
        data_arrivo: null,
        magazzino: null,
      }
    );

    if (updateArticleError) {
      console.error(`[useCartoni - riportaInOrdini] Errore durante l'aggiornamento dello stato dell'articolo nell'OA:`, updateArticleError);
      notifications.showError(`Errore durante l'aggiornamento dello stato dell'articolo nell'ordine d'acquisto: ${updateArticleError.message}.`);
      return { error: updateArticleError };
    }

    notifications.showSuccess(`✅ Cartone '${codice}' riportato in ordini in arrivo con successo!`);
    // loadData() verrà chiamato dal real-time di ordini_acquisto tramite syncArticleInventoryStatus
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

    if (!ordineInArrivo.ordine) {
      notifications.showError('Ordine d\'acquisto principale non trovato per l\'articolo.');
      return { error: new Error('Ordine d\'acquisto principale non trovato.') };
    }

    let newArticleStatus: ArticoloOrdineAcquisto['stato'];
    if (confermato) {
      newArticleStatus = 'confermato';
    } else {
      // Se si "sconferma", lo stato torna a 'inviato' o 'in_attesa' a seconda dello stato dell'OA
      const { data: purchaseOrder, error: fetchOAError } = await supabase
        .from('ordini_acquisto')
        .select('stato')
        .eq('numero_ordine', ordineInArrivo.ordine)
        .single();

      if (fetchOAError || !purchaseOrder) {
        console.error(`[useCartoni - confermaOrdine] Errore recupero ordine d'acquisto per stato articolo:`, fetchOAError);
        newArticleStatus = 'inviato'; // Fallback
      } else {
        newArticleStatus = purchaseOrder.stato === 'in_attesa' ? 'in_attesa' : 'inviato';
      }
    }

    const { success, error: updateArticleError } = await updateArticleStatusInOrder(
      ordineInArrivo.ordine,
      codice,
      newArticleStatus,
      {
        // Non modifichiamo altri campi qui, solo lo stato
      }
    );

    if (updateArticleError) {
      console.error(`[useCartoni - confermaOrdine] Errore durante l'aggiornamento dello stato dell'articolo nell'OA:`, updateArticleError);
      notifications.showError(`Errore durante l'aggiornamento dello stato dell'articolo nell'ordine d'acquisto: ${updateArticleError.message}.`);
      return { error: updateArticleError };
    }

    const movimento: StoricoMovimento = {
      codice: codice,
      tipo: 'modifica', // Modifica perché cambia lo stato di conferma
      quantita: ordineInArrivo.fogli,
      data: new Date().toISOString(),
      note: `Ordine in arrivo ${confermato ? 'confermato' : 'non confermato'}`,
      user_id: user?.id,
      numero_ordine_acquisto: ordineInArrivo.ordine
    };
    await supabase.from('storico').insert([movimento]);

    notifications.showSuccess(`✅ Ordine in arrivo '${codice}' ${confermato ? 'confermato' : 'non confermato'}!`);
    // loadData() verrà chiamato dal real-time di ordini_acquisto tramite syncArticleInventoryStatus
    return { error: null };
  };

  const eliminaOrdine = async (codice: string) => {
    const ordineInArrivo = ordini.find(o => o.codice === codice);
    if (!ordineInArrivo) {
      notifications.showError('Ordine in arrivo non trovato.');
      return;
    }

    if (!ordineInArrivo.ordine) {
      notifications.showError('Ordine d\'acquisto principale non trovato per l\'articolo.');
      return;
    }

    // Imposta lo stato dell'articolo a 'annullato' nell'ordine d'acquisto principale
    const { success, error: updateArticleError } = await updateArticleStatusInOrder(
      ordineInArrivo.ordine,
      codice,
      'annullato',
      {
        // Quando si elimina, i dettagli di arrivo devono essere azzerati
        ddt: null,
        data_arrivo: null,
        magazzino: null,
        numero_fogli: 0, // Fogli a 0 quando annullato
        quantita: 0, // Quantità a 0 quando annullato
      }
    );

    if (updateArticleError) {
      console.error(`[useCartoni - eliminaOrdine] Errore durante l'aggiornamento dello stato dell'articolo nell'OA:`, updateArticleError);
      notifications.showError(`Errore durante l'eliminazione dell'ordine: ${updateArticleError.message}.`);
      return;
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

    notifications.showSuccess(`🗑️ Ordine in arrivo '${codice}' eliminato!`);
    // loadData() verrà chiamato dal real-time di ordini_acquisto tramite syncArticleInventoryStatus
  };

  const modificaOrdine = async (codice: string, dati: Partial<Cartone>) => {
    const ordineInArrivo = ordini.find(o => o.codice === codice);
    if (!ordineInArrivo) {
      notifications.showError('Ordine in arrivo non trovato per la modifica.');
      return;
    }

    if (!ordineInArrivo.ordine) {
      notifications.showError('Ordine d\'acquisto principale non trovato per l\'articolo.');
      return;
    }

    // Prepara i dati da aggiornare nell'articolo dell'ordine d'acquisto
    const updatedArticleData: Partial<ArticoloOrdineAcquisto> = {
      codice_ctn: dati.codice,
      fornitore: dati.fornitore, // Questo campo non è in ArticoloOrdineAcquisto, ma lo passiamo per coerenza
      tipologia_cartone: dati.tipologia,
      formato: dati.formato,
      grammatura: dati.grammatura,
      numero_fogli: dati.fogli,
      cliente: dati.cliente,
      lavoro: dati.lavoro,
      prezzo_unitario: dati.prezzo,
      data_consegna_prevista: dati.data_consegna,
      fsc: dati.fsc,
      alimentare: dati.alimentare,
      rif_commessa_fsc: dati.rif_commessa_fsc,
      ddt: dati.ddt,
      data_arrivo: dati.data_arrivo,
      magazzino: dati.magazzino,
      // Ricalcola la quantità in kg se necessario
      quantita: (dati.prezzo && dati.fogli && dati.formato && dati.grammatura) 
        ? (dati.fogli * (parseFloat(dati.formato.split('x')[0].replace(',', '.')) / 100) * (parseFloat(dati.formato.split('x')[1].replace(',', '.')) / 100) * parseFloat(dati.grammatura.replace(' g/m²', '')) / 1000)
        : dati.quantita,
    };

    // Aggiorna l'articolo nell'ordine d'acquisto principale
    const { success, error: updateArticleError } = await updateArticleStatusInOrder(
      ordineInArrivo.ordine,
      codice,
      ordineInArrivo.confermato ? 'confermato' : 'inviato', // Mantiene lo stato di conferma
      updatedArticleData
    );

    if (updateArticleError) {
      console.error(`[useCartoni - modificaOrdine] Errore durante l'aggiornamento dell'articolo nell'OA:`, updateArticleError);
      notifications.showError(`Errore modifica ordine: ${updateArticleError.message}`);
      return;
    }

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

    notifications.showSuccess(`✅ Ordine ${codice} modificato!`);
    // loadData() verrà chiamato dal real-time di ordini_acquisto tramite syncArticleInventoryStatus
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