import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Cartone, StoricoMovimento, ArticoloOrdineAcquisto } from '@/types';
import * as notifications from '@/utils/notifications'; // Aggiornato a percorso relativo
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
        console.log("useCartoni: Dati grezzi 'ordini' da Supabase:", ordiniRes.data); // NEW LOG
        setOrdini(ordiniRes.data);
        console.log("useCartoni: Ordini in arrivo (dopo fetch):", ordiniRes.data.map(o => ({ codice: o.codice, confermato: o.confermato }))); // Log aggiunto
      }
      if (esauritiRes.data) setEsauriti(esauritiRes.data);
      if (storicoRes.data) {
        console.log("useCartoni: Raw storico data from Supabase:", storicoRes.data); // Log di debug
        const storicoWithUsernames: StoricoMovimento[] = storicoRes.data.map(mov => ({
          ...mov,
          username: mov.app_users?.username || 'Sconosciuto'
        }));
        setStorico(storicoWithUsernames);
        console.log("useCartoni: Processed storico data:", storicoWithUsernames); // Log di debug
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
      console.log("[useCartoni] Registrando movimento storico (aggiungiOrdine). User ID:", user?.id, "Movimento:", movimento); // Log aggiunto
      await supabase.from('storico').insert([movimento]);
      await loadData();
    }
    return { error };
  };

  const spostaInGiacenza = async (codice: string, ddt: string, dataArrivo: string, fogliEffettivi?: number, magazzino?: string) => {
    console.log(`[spostaInGiacenza] Inizio operazione per codice: ${codice}`);
    console.log(`[spostaInGiacenza] Parametri ricevuti dalla modale: ddt='${ddt}', dataArrivo='${dataArrivo}', fogliEffettivi=${fogliEffettivi}, magazzino='${magazzino}'`);

    const ordine = ordini.find(o => o.codice === codice);
    if (!ordine) {
      console.error(`[spostaInGiacenza] Errore: Ordine non trovato per codice ${codice}`);
      notifications.showError('Ordine non trovato');
      return { error: new Error('Ordine non trovato') };
    }
    console.log(`[spostaInGiacenza] Ordine trovato (originale da 'ordini'):`, ordine);

    const fogliFinali = fogliEffettivi !== undefined ? fogliEffettivi : ordine.fogli;
    const magazzinoFinale = magazzino; 
    
    const cartoneGiacenza = { 
      ...ordine, 
      ddt, 
      data_arrivo: dataArrivo, 
      fogli: fogliFinali, 
      magazzino: magazzinoFinale,
      fsc: ordine.fsc, // Aggiunto
      alimentare: ordine.alimentare, // Aggiunto
      rif_commessa_fsc: ordine.rif_commessa_fsc, // Aggiunto
    };
    delete cartoneGiacenza.confermato; // 'confermato' è specifico della tabella 'ordini'
    
    console.log(`[spostaInGiacenza] Dati finali per inserimento in 'giacenza':`, cartoneGiacenza); // NEW LOG HERE

    console.log(`[spostaInGiacenza] Tentativo di eliminare da 'ordini' il codice: ${codice}`);
    const { error: deleteError } = await supabase.from('ordini').delete().eq('codice', codice);
    if (deleteError) {
      console.error(`[spostaInGiacenza] Errore eliminazione ordine da 'ordini':`, deleteError);
      notifications.showError(`Errore eliminazione ordine: ${deleteError.message}`);
      return { error: deleteError };
    }
    console.log(`[spostaInGiacenza] Eliminazione da 'ordini' riuscita per codice: ${codice}`);

    console.log(`[spostaInGiacenza] Tentativo di inserire in 'giacenza' il cartone:`, cartoneGiacenza);
    const { error: insertError } = await supabase.from('giacenza').insert([cartoneGiacenza]);
    if (insertError) {
      console.error(`[spostaInGiacenza] Errore inserimento in 'giacenza':`, insertError);
      notifications.showError(`Errore inserimento in giacenza: ${insertError.message}`);
      return { error: insertError };
    }
    console.log(`[spostaInGiacenza] Inserimento in 'giacenza' riuscito per codice: ${codice}`);

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
    console.log(`[spostaInGiacenza] Registrando movimento storico (spostaInGiacenza). User ID:`, user?.id, "Movimento:", movimento);
    const { error: storicoError } = await supabase.from('storico').insert([movimento]);
    if (storicoError) {
      console.error(`[spostaInGiacenza] Errore inserimento in 'storico':`, storicoError);
      notifications.showError(`Errore registrazione storico: ${storicoError.message}`);
    } else {
      console.log(`[spostaInGiacenza] Registrazione storico riuscita per codice: ${codice}`);
    }

    // Riattivato: Aggiorna lo stato dell'articolo nell'ordine d'acquisto a 'ricevuto'
    if (ordine.ordine && codice) { 
      await updateArticleStatusInOrder(ordine.ordine, codice, 'ricevuto'); 
    }

    console.log(`[spostaInGiacenza] Ricarico tutti i dati.`);
    await loadData();
    console.log(`[spostaInGiacenza] Operazione completata per codice: ${codice}`);
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
    console.log("[useCartoni] Registrando movimento storico (scaricoFogli). User ID:", user?.id, "Movimento:", movimento); // Log aggiunto
    const { error: storicoError } = await supabase.from('storico').insert([movimento]);
    if (storicoError) {
      console.error('Errore inserimento storico:', storicoError);
      notifications.showError(`Errore registrazione storico: ${storicoError.message}`);
    }

    if (nuoviFogli <= 0) {
      const { error: deleteGiacenzaError } = await supabase.from('giacenza').delete().eq('codice', codice);
      if (deleteGiacenzaError) {
      console.error('Errore eliminazione da giacenza:', deleteGiacenzaError);
        notifications.showError(`Errore eliminazione da giacenza: ${deleteGiacenzaError.message}`);
        return { error: deleteGiacenzaError };
      }

      const { data_consegna, ...restOfCartone } = cartone; 
      const cartoneEsaurito = { ...restOfCartone, fogli: 0 }; 
      const { error: insertEsauritiError } = await supabase.from('esauriti').insert([cartoneEsaurito]);
      if (insertEsauritiError) {
        console.error('Errore inserimento in esauriti:', insertEsauritiError);
        notifications.showError(`Errore inserimento in esauriti: ${insertEsauritiError.message}`);
        return { error: insertEsauritiError };
      }
    } else {
      const { error: updateGiacenzaError } = await supabase.from('giacenza').update({ fogli: nuoviFogli }).eq('codice', codice);
      if (updateGiacenzaError) {
        console.error('Errore aggiornamento giacenza:', updateGiacenzaError);
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
      fsc: cartoneEsaurito.fsc, // Aggiunto
      alimentare: cartoneEsaurito.alimentare, // Aggiunto
      rif_commessa_fsc: cartoneEsaurito.rif_commessa_fsc, // Aggiunto
    };

    try {
      const { error: deleteError } = await supabase.from('esauriti').delete().eq('codice', codice);
      if (deleteError) {
        console.error('Errore eliminazione da esauriti:', deleteError);
        notifications.showError(`Errore eliminazione da esauriti: ${deleteError.message}`);
        return { error: deleteError };
      }

      const { error: insertError } = await supabase.from('giacenza').insert([cartonePerGiacenza]);
      if (insertError) {
        console.error('Errore inserimento in giacenza:', insertError);
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
      console.log("[useCartoni] Registrando movimento storico (riportaInGiacenza). User ID:", user?.id, "Movimento:", movimento); // Log aggiunto
      const { error: storicoError } = await supabase.from('storico').insert([movimento]);
      if (storicoError) {
        console.error('Errore inserimento storico per riporto in giacenza:', storicoError);
        notifications.showError(`Errore registrazione storico: ${storicoError.message}`);
      }

      if (cartoneEsaurito.ordine && codice) {
        await updateArticleStatusInOrder(cartoneEsaurito.ordine, codice, 'confermato');
      }

      notifications.showSuccess(`✅ Cartone '${codice}' riportato in giacenza con successo!`);
      await loadData();
      return { error: null };
    } catch (e: any) {
      console.error('Errore generico in riportaInGiacenza:', e);
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

    const ordine = { ...cartone };
    // Rimosse le eliminazioni esplicite di ddt e data_arrivo per conservare le informazioni
    // delete ordine.ddt;
    // delete ordine.data_arrivo;
    
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
    console.log("[useCartoni] Registrando movimento storico (riportaInOrdini). User ID:", user?.id, "Movimento:", movimento); // Log aggiunto
    const { error: storicoError } = await supabase.from('storico').insert([movimento]);
    if (storicoError) {
      console.error('Errore inserimento storico per riporto in ordini:', storicoError);
      notifications.showError(`Errore registrazione storico: ${storicoError.message}`);
    }

    if (ordine.ordine && codice) {
      await updateArticleStatusInOrder(ordine.ordine, codice, 'confermato');
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
    console.log("[useCartoni] Registrando movimento storico (confermaOrdine). User ID:", user?.id, "Movimento:", movimento); // Log aggiunto
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
      console.log("[useCartoni] Registrando movimento storico (eliminaOrdine). User ID:", user?.id, "Movimento:", movimento); // Log aggiunto
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
      console.log("[useCartoni] Registrando movimento storico (modificaOrdine). User ID:", user?.id, "Movimento:", movimento); // Log aggiunto
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