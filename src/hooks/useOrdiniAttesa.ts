import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { OrdineAttesa } from '@/types/fornitore';
import { toast } from 'sonner';

export function useOrdiniAttesa() {
  const [ordiniAttesa, setOrdiniAttesa] = useState<OrdineAttesa[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOrdiniAttesa = async () => {
    try {
      const { data, error } = await supabase
        .from('ordini_attesa')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrdiniAttesa(data || []);
    } catch (error) {
      console.error('Errore caricamento ordini in attesa:', error);
      toast.error('Errore nel caricamento degli ordini in attesa');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrdiniAttesa();

    const channel = supabase
      .channel('ordini_attesa_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ordini_attesa' }, () => {
        loadOrdiniAttesa();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const aggiungiOrdineAttesa = async (ordine: OrdineAttesa) => {
    const { error } = await supabase.from('ordini_attesa').insert([ordine]);
    if (error) {
      console.error('Errore inserimento ordine in attesa:', error);
      toast.error('Errore durante il salvataggio dell\'ordine');
    }
    return { error };
  };

  const eliminaOrdineAttesa = async (codice: string) => {
    const { error } = await supabase.from('ordini_attesa').delete().eq('codice', codice);
    if (error) {
      console.error('Errore eliminazione ordine in attesa:', error);
      toast.error('Errore durante l\'eliminazione');
    }
    return { error };
  };

  const spostaInOrdiniArrivo = async (codice: string, dataConsegna: string, confermato: boolean = false) => {
    try {
      // Prendi l'ordine in attesa
      const { data: ordineAttesa, error: fetchError } = await supabase
        .from('ordini_attesa')
        .select('*')
        .eq('codice', codice)
        .single();

      if (fetchError) throw fetchError;

      // Inserisci in ordini
      const { error: insertError } = await supabase.from('ordini').insert([{
        ...ordineAttesa,
        data_consegna: dataConsegna,
        confermato,
        magazzino: '-'
      }]);

      if (insertError) throw insertError;

      // Elimina da ordini_attesa
      const { error: deleteError } = await supabase
        .from('ordini_attesa')
        .delete()
        .eq('codice', codice);

      if (deleteError) throw deleteError;

      toast.success(`✅ Ordine ${codice} spostato in Ordini in Arrivo`);
      return { error: null };
    } catch (error) {
      console.error('Errore spostamento ordine:', error);
      toast.error('Errore durante lo spostamento dell\'ordine');
      return { error };
    }
  };

  return {
    ordiniAttesa,
    loading,
    aggiungiOrdineAttesa,
    eliminaOrdineAttesa,
    spostaInOrdiniArrivo
  };
}
