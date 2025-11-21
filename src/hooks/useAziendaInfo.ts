import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { AziendaInfo } from '@/types';
import { toast } from 'sonner';

export function useAziendaInfo() {
  const [aziendaInfo, setAziendaInfo] = useState<AziendaInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAziendaInfo = useCallback(async () => {
    setLoading(true);
    try {
      // Assumiamo che ci sia sempre una sola riga per le informazioni dell'azienda
      const { data, error } = await supabase
        .from('azienda_info')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = No rows found
        throw error;
      }

      setAziendaInfo(data || null);
    } catch (error: any) {
      console.error('Errore nel caricamento delle informazioni azienda:', error);
      toast.error(`Errore nel caricamento info azienda: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAziendaInfo();

    const channel = supabase
      .channel('azienda_info_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'azienda_info' }, () => {
        loadAziendaInfo();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadAziendaInfo]);

  const updateAziendaInfo = async (data: Partial<AziendaInfo>) => {
    try {
      let result;
      if (aziendaInfo?.id) {
        // Se esiste già una riga, aggiornala
        const { data: updatedData, error } = await supabase
          .from('azienda_info')
          .update(data)
          .eq('id', aziendaInfo.id)
          .select()
          .single();
        result = { data: updatedData, error };
      } else {
        // Altrimenti, inserisci una nuova riga
        const { data: insertedData, error } = await supabase
          .from('azienda_info')
          .insert(data)
          .select()
          .single();
        result = { data: insertedData, error };
      }

      if (result.error) {
        throw result.error;
      }

      setAziendaInfo(result.data);
      toast.success('✅ Informazioni azienda salvate con successo!');
      return { success: true };
    } catch (error: any) {
      console.error('Errore nel salvataggio delle informazioni azienda:', error);
      toast.error(`Errore nel salvataggio info azienda: ${error.message}`);
      return { success: false, error };
    }
  };

  return {
    aziendaInfo,
    loading,
    updateAziendaInfo,
    loadAziendaInfo,
  };
}