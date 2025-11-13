import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Cartone, StoricoMovimento } from '@/types';

export function useCartoni() {
  const [giacenza, setGiacenza] = useState<Cartone[]>([]);
  const [ordini, setOrdini] = useState<Cartone[]>([]);
  const [esauriti, setEsauriti] = useState<Cartone[]>([]);
  const [storico, setStorico] = useState<StoricoMovimento[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [giacenzaRes, ordiniRes, esauritiRes, storicoRes] = await Promise.all([
        supabase.from('giacenza').select('*'),
        supabase.from('ordini').select('*'),
        supabase.from('esauriti').select('*'),
        supabase.from('storico').select('*').order('data', { ascending: false })
      ]);

      if (giacenzaRes.data) setGiacenza(giacenzaRes.data);
      if (ordiniRes.data) setOrdini(ordiniRes.data);
      if (esauritiRes.data) setEsauriti(esauritiRes.data);
      if (storicoRes.data) setStorico(storicoRes.data);
    } catch (error) {
      console.error('Errore caricamento dati:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Real-time subscriptions
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
    if (!error) await loadData();
    return { error };
  };

  const spostaInGiacenza = async (codice: string, ddt: string, dataArrivo: string, fogliEffettivi?: number) => {
    const ordine = ordini.find(o => o.codice === codice);
    if (!ordine) return { error: new Error('Ordine non trovato') };

    const fogliFinali = fogliEffettivi !== undefined ? fogliEffettivi : ordine.fogli;
    const cartoneGiacenza = { ...ordine, ddt, data_arrivo: dataArrivo, fogli: fogliFinali };
    delete cartoneGiacenza.data_consegna;
    delete cartoneGiacenza.confermato;

    const { error: deleteError } = await supabase.from('ordini').delete().eq('codice', codice);
    if (deleteError) return { error: deleteError };

    const { error: insertError } = await supabase.from('giacenza').insert([cartoneGiacenza]);
    if (insertError) return { error: insertError };

    const movimento: StoricoMovimento = {
      codice,
      tipo: 'carico',
      quantita: fogliFinali,
      data: new Date().toISOString(),
      note: fogliEffettivi !== undefined && fogliEffettivi !== ordine.fogli 
        ? `Caricato da ordine ${ordine.ordine} - Ordinati: ${ordine.fogli}, Arrivati: ${fogliEffettivi}`
        : `Caricato da ordine ${ordine.ordine}`
    };
    await supabase.from('storico').insert([movimento]);

    await loadData();
    return { error: null };
  };

  const scaricoFogli = async (codice: string, quantita: number, note: string) => {
    const cartone = giacenza.find(c => c.codice === codice);
    if (!cartone) return { error: new Error('Cartone non trovato') };

    const nuoviFogli = cartone.fogli - quantita;

    const movimento: StoricoMovimento = {
      codice,
      tipo: 'scarico',
      quantita,
      data: new Date().toISOString(),
      note
    };
    await supabase.from('storico').insert([movimento]);

    if (nuoviFogli <= 0) {
      await supabase.from('giacenza').delete().eq('codice', codice);
      const cartoneEsaurito = { ...cartone, fogli: cartone.fogli };
      await supabase.from('esauriti').insert([cartoneEsaurito]);
    } else {
      await supabase.from('giacenza').update({ fogli: nuoviFogli }).eq('codice', codice);
    }

    await loadData();
    return { error: null };
  };

  const riportaInGiacenza = async (codice: string) => {
    const cartone = esauriti.find(c => c.codice === codice);
    if (!cartone) return { error: new Error('Cartone non trovato') };

    await supabase.from('esauriti').delete().eq('codice', codice);
    await supabase.from('giacenza').insert([cartone]);
    await loadData();
    return { error: null };
  };

  const riportaInOrdini = async (codice: string) => {
    const cartone = giacenza.find(c => c.codice === codice);
    if (!cartone) return { error: new Error('Cartone non trovato') };

    const ordine = { ...cartone };
    delete ordine.ddt;
    delete ordine.data_arrivo;

    await supabase.from('giacenza').delete().eq('codice', codice);
    await supabase.from('ordini').insert([ordine]);
    await loadData();
    return { error: null };
  };

  const confermaOrdine = async (codice: string, confermato: boolean) => {
    await supabase.from('ordini').update({ confermato }).eq('codice', codice);
    await loadData();
  };

  const eliminaOrdine = async (codice: string) => {
    await supabase.from('ordini').delete().eq('codice', codice);
    await loadData();
  };

  const modificaOrdine = async (codice: string, dati: Partial<Cartone>) => {
    await supabase.from('ordini').update(dati).eq('codice', codice);
    await loadData();
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
