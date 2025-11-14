import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Fornitore } from '@/types/fornitore';
import { toast } from 'sonner';

export function useFornitori() {
  const [fornitori, setFornitori] = useState<Fornitore[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFornitori = async () => {
    try {
      const { data, error } = await supabase
        .from('fornitori')
        .select('*')
        .order('ragione_sociale', { ascending: true });

      if (error) throw error;
      setFornitori(data || []);
    } catch (error) {
      console.error('Errore caricamento fornitori:', error);
      toast.error('Errore nel caricamento dei fornitori');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFornitori();

    const channel = supabase
      .channel('fornitori_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fornitori' }, () => {
        loadFornitori();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const aggiungiFornitore = async (fornitore: Fornitore) => {
    const { error } = await supabase.from('fornitori').insert([fornitore]);
    if (error) {
      console.error('Errore inserimento fornitore:', error);
      toast.error('Errore durante il salvataggio del fornitore');
    }
    return { error };
  };

  const modificaFornitore = async (id: string, dati: Partial<Fornitore>) => {
    const { error } = await supabase.from('fornitori').update(dati).eq('id', id);
    if (error) {
      console.error('Errore modifica fornitore:', error);
      toast.error('Errore durante la modifica del fornitore');
    }
    return { error };
  };

  const eliminaFornitore = async (id: string) => {
    const { error } = await supabase.from('fornitori').delete().eq('id', id);
    if (error) {
      console.error('Errore eliminazione fornitore:', error);
      toast.error('Errore durante l\'eliminazione del fornitore');
    }
    return { error };
  };

  return {
    fornitori,
    loading,
    aggiungiFornitore,
    modificaFornitore,
    eliminaFornitore
  };
}
