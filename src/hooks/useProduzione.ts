import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { MacchinaProduzione, LavoroProduzione, StoricoLavoroProduzione } from '@/types';
import * as notifications from '@/utils/notifications';
import { useAuth } from '@/hooks/useAuth';

export function useProduzione() {
  const [macchine, setMacchine] = useState<MacchinaProduzione[]>([]);
  const [lavori, setLavori] = useState<LavoroProduzione[]>([]);
  const [storicoLavori, setStoricoLavori] = useState<StoricoLavoroProduzione[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const loadData = async () => {
    setLoading(true);
    console.log('[useProduzione] Attempting to load data...');
    try {
      const [macchineRes, lavoriRes, storicoRes] = await Promise.all([
        supabase.from('macchine_produzione').select('*').order('nome', { ascending: true }),
        supabase.from('lavori_produzione').select(`*, macchine_produzione(nome)`).order('data_inizio_prevista', { ascending: false }),
        supabase.from('storico_lavori_produzione').select(`*, app_users(username), macchine_produzione(nome), lavori_produzione(nome_lavoro)`).order('data', { ascending: false })
      ]);

      if (macchineRes.data) {
        setMacchine(macchineRes.data);
        console.log('[useProduzione] Macchine data loaded:', macchineRes.data.length, 'items');
      } else if (macchineRes.error) {
        console.error('[useProduzione] Error loading macchine:', macchineRes.error);
      }

      if (lavoriRes.data) {
        const lavoriWithMachineNames: LavoroProduzione[] = lavoriRes.data.map(lavoro => ({
          ...lavoro,
          macchina_nome: (lavoro as any).macchine_produzione?.nome || 'Sconosciuta'
        }));
        setLavori(lavoriWithMachineNames);
        console.log('[useProduzione] Lavori data loaded:', lavoriWithMachineNames.length, 'items');
      } else if (lavoriRes.error) {
        console.error('[useProduzione] Error loading lavori:', lavoriRes.error);
      }

      if (storicoRes.data) {
        const storicoWithUsernames: StoricoLavoroProduzione[] = storicoRes.data.map(mov => ({
          ...mov,
          username: (mov as any).app_users?.username || 'Sconosciuto',
          macchina_nome: (mov as any).macchine_produzione?.nome || 'Sconosciuta',
          nome_lavoro: (mov as any).lavori_produzione?.nome_lavoro || 'Sconosciuto'
        }));
        setStoricoLavori(storicoWithUsernames);
        console.log('[useProduzione] Storico Lavori data loaded:', storicoWithUsernames.length, 'items');
      } else if (storicoRes.error) {
        console.error('[useProduzione] Error loading storico lavori:', storicoRes.error);
      }
    } catch (error) {
      console.error('Errore caricamento dati produzione:', error);
      notifications.showError('Errore nel caricamento dei dati di produzione.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const macchineChannel = supabase
      .channel('macchine_produzione-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'macchine_produzione' }, () => {
        loadData();
      })
      .subscribe();

    const lavoriChannel = supabase
      .channel('lavori_produzione-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lavori_produzione' }, () => {
        loadData();
      })
      .subscribe();

    const storicoChannel = supabase
      .channel('storico_lavori_produzione-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'storico_lavori_produzione' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(macchineChannel);
      supabase.removeChannel(lavoriChannel);
      supabase.removeChannel(storicoChannel);
    };
  }, []);

  const addMacchina = useCallback(async (macchina: Omit<MacchinaProduzione, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase.from('macchine_produzione').insert([macchina]).select().single();
    if (!error) {
      notifications.showSuccess(`✅ Macchina '${macchina.nome}' aggiunta con successo!`);
      await loadData();
    } else {
      notifications.showError(`Errore aggiunta macchina: ${error.message}`);
    }
    return { data, error };
  }, [loadData]);

  const updateMacchina = useCallback(async (id: string, dati: Partial<Omit<MacchinaProduzione, 'id' | 'created_at' | 'updated_at'>>) => {
    const { data, error } = await supabase.from('macchine_produzione').update(dati).eq('id', id).select().single();
    if (!error) {
      notifications.showSuccess(`✅ Macchina modificata con successo!`);
      await loadData();
    } else {
      notifications.showError(`Errore modifica macchina: ${error.message}`);
    }
    return { data, error };
  }, [loadData]);

  const deleteMacchina = useCallback(async (id: string) => {
    const { error } = await supabase.from('macchine_produzione').delete().eq('id', id);
    if (!error) {
      notifications.showSuccess(`🗑️ Macchina eliminata con successo!`);
      await loadData();
    } else {
      notifications.showError(`Errore eliminazione macchina: ${error.message}`);
    }
    return { error };
  }, [loadData]);

  const addLavoro = useCallback(async (lavoro: Omit<LavoroProduzione, 'id' | 'created_at' | 'updated_at' | 'macchina_nome'>) => {
    const { data, error } = await supabase.from('lavori_produzione').insert([lavoro]).select().single();
    if (!error) {
      notifications.showSuccess(`✅ Lavoro '${lavoro.nome_lavoro}' aggiunto con successo!`);
      const storicoEntry: Omit<StoricoLavoroProduzione, 'id' | 'data' | 'username' | 'macchina_nome' | 'nome_lavoro'> = {
        lavoro_id: data.id,
        macchina_id: data.macchina_id,
        tipo: 'creazione',
        nuovo_stato: data.stato,
        dettagli_modifica: JSON.stringify(lavoro),
        user_id: user?.id,
      };
      await supabase.from('storico_lavori_produzione').insert([storicoEntry]);
      await loadData();
    } else {
      notifications.showError(`Errore aggiunta lavoro: ${error.message}`);
    }
    return { data, error };
  }, [loadData, user?.id]);

  const updateLavoro = useCallback(async (id: string, dati: Partial<Omit<LavoroProduzione, 'id' | 'created_at' | 'updated_at' | 'macchina_nome'>>) => {
    const oldLavoro = lavori.find(l => l.id === id);
    const { data, error } = await supabase.from('lavori_produzione').update(dati).eq('id', id).select().single();
    if (!error) {
      notifications.showSuccess(`✅ Lavoro modificato con successo!`);
      
      const storicoEntry: Omit<StoricoLavoroProduzione, 'id' | 'data' | 'username' | 'macchina_nome' | 'nome_lavoro'> = {
        lavoro_id: data.id,
        macchina_id: data.macchina_id,
        tipo: 'modifica_dettagli',
        vecchio_stato: oldLavoro?.stato,
        nuovo_stato: data.stato,
        dettagli_modifica: JSON.stringify(dati),
        user_id: user?.id,
      };
      if (oldLavoro?.stato !== data.stato) {
        storicoEntry.tipo = 'aggiornamento_stato';
      }
      await supabase.from('storico_lavori_produzione').insert([storicoEntry]);
      await loadData();
    } else {
      notifications.showError(`Errore modifica lavoro: ${error.message}`);
    }
    return { data, error };
  }, [loadData, lavori, user?.id]);

  const deleteLavoro = useCallback(async (id: string) => {
    const lavoroToDelete = lavori.find(l => l.id === id);
    const { error } = await supabase.from('lavori_produzione').delete().eq('id', id);
    if (!error) {
      notifications.showSuccess(`🗑️ Lavoro eliminato con successo!`);
      if (lavoroToDelete) {
        const storicoEntry: Omit<StoricoLavoroProduzione, 'id' | 'data' | 'username' | 'macchina_nome' | 'nome_lavoro'> = {
          lavoro_id: lavoroToDelete.id,
          macchina_id: lavoroToDelete.macchina_id,
          tipo: 'eliminazione',
          vecchio_stato: lavoroToDelete.stato,
          dettagli_modifica: `Lavoro '${lavoroToDelete.nome_lavoro}' eliminato.`,
          user_id: user?.id,
        };
        await supabase.from('storico_lavori_produzione').insert([storicoEntry]);
      }
      await loadData();
    } else {
      notifications.showError(`Errore eliminazione lavoro: ${error.message}`);
    }
    return { error };
  }, [loadData, lavori, user?.id]);

  return {
    macchine,
    lavori,
    storicoLavori,
    loading,
    addMacchina,
    updateMacchina,
    deleteMacchina,
    addLavoro,
    updateLavoro,
    deleteLavoro,
    loadData,
  };
}