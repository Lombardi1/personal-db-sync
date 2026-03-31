import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { MacchinaProduzione, LavoroProduzione, StoricoLavoroProduzione, LottoStampaInfo } from '@/types';
import * as notifications from '@/utils/notifications';
import { useAuth } from '@/hooks/useAuth';

export function useProduzione() {
  const [macchine, setMacchine] = useState<MacchinaProduzione[]>([]);
  const [lavori, setLavori] = useState<LavoroProduzione[]>([]);
  const [storicoLavori, setStoricoLavori] = useState<StoricoLavoroProduzione[]>([]);
  const [lottiStampa, setLottiStampa] = useState<LottoStampaInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const loadData = async () => {
    setLoading(true);
    try {
      const [macchineRes, lavoriRes, storicoRes, lottiRes] = await Promise.all([
        supabase.from('macchine_produzione').select('*').order('nome', { ascending: true }),
        supabase.from('lavori_produzione').select(`*, macchine_produzione(nome)`).order('created_at', { ascending: false }),
        supabase.from('storico_lavori_produzione').select(`*, app_users(username), macchine_produzione(nome), lavori_produzione(nome_lavoro)`).order('data', { ascending: false }),
        supabase.from('lavori_stampa').select('id, lotto, cliente, lavoro, identificativo, ordine_nr, data_ordine, formato, quantita, cartone, stampato, parzialmente, conf, mag, cons, note').order('lotto', { ascending: false })
      ]);

      // Macchine
      if (macchineRes.data) setMacchine(macchineRes.data);

      // Lotti stampa - mappa per lookup veloce
      const lottiMap = new Map<number, LottoStampaInfo>();
      if (lottiRes.data) {
        const lotti = lottiRes.data as LottoStampaInfo[];
        setLottiStampa(lotti);
        // In caso di lotti duplicati teniamo il primo (più recente per ordine decrescente)
        lotti.forEach(l => { if (!lottiMap.has(l.lotto)) lottiMap.set(l.lotto, l); });
      }

      // Lavori produzione - join con lotti
      if (lavoriRes.data) {
        const lavoriJoined: LavoroProduzione[] = lavoriRes.data.map(lavoro => ({
          ...lavoro,
          macchina_nome: (lavoro as any).macchine_produzione?.nome || 'Sconosciuta',
          lotto_info: lavoro.lotto_stampa ? (lottiMap.get(lavoro.lotto_stampa) || null) : null,
        }));
        setLavori(lavoriJoined);
      }

      // Storico
      if (storicoRes.data) {
        const storicoMapped: StoricoLavoroProduzione[] = storicoRes.data.map(mov => ({
          ...mov,
          username: (mov as any).app_users?.username || 'Sconosciuto',
          macchina_nome: (mov as any).macchine_produzione?.nome || 'Sconosciuta',
          nome_lavoro: (mov as any).lavori_produzione?.nome_lavoro || 'Sconosciuto',
        }));
        setStoricoLavori(storicoMapped);
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
    const macchineChannel = supabase.channel('macchine_produzione-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'macchine_produzione' }, loadData)
      .subscribe();
    const lavoriChannel = supabase.channel('lavori_produzione-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lavori_produzione' }, loadData)
      .subscribe();
    const storicoChannel = supabase.channel('storico_lavori_produzione-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'storico_lavori_produzione' }, loadData)
      .subscribe();
    return () => {
      supabase.removeChannel(macchineChannel);
      supabase.removeChannel(lavoriChannel);
      supabase.removeChannel(storicoChannel);
    };
  }, []);

  const addMacchina = useCallback(async (macchina: Omit<MacchinaProduzione, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase.from('macchine_produzione').insert([macchina]).select().single();
    if (!error) { notifications.showSuccess(`✅ Macchina '${macchina.nome}' aggiunta!`); await loadData(); }
    else notifications.showError(`Errore aggiunta macchina: ${error.message}`);
    return { data, error };
  }, [loadData]);

  const updateMacchina = useCallback(async (id: string, dati: Partial<Omit<MacchinaProduzione, 'id' | 'created_at' | 'updated_at'>>) => {
    const { data, error } = await supabase.from('macchine_produzione').update(dati).eq('id', id).select().single();
    if (!error) { notifications.showSuccess('✅ Macchina modificata!'); await loadData(); }
    else notifications.showError(`Errore modifica macchina: ${error.message}`);
    return { data, error };
  }, [loadData]);

  const deleteMacchina = useCallback(async (id: string) => {
    const { error } = await supabase.from('macchine_produzione').delete().eq('id', id);
    if (!error) { notifications.showSuccess('🗑️ Macchina eliminata!'); await loadData(); }
    else notifications.showError(`Errore eliminazione macchina: ${error.message}`);
    return { error };
  }, [loadData]);

  const addLavoro = useCallback(async (lavoro: Omit<LavoroProduzione, 'id' | 'created_at' | 'updated_at' | 'macchina_nome' | 'lotto_info'>) => {
    const { data, error } = await supabase.from('lavori_produzione').insert([lavoro]).select().single();
    if (!error) {
      notifications.showSuccess(`✅ Lavoro '${lavoro.nome_lavoro}' aggiunto!`);
      await supabase.from('storico_lavori_produzione').insert([{
        lavoro_id: data.id, macchina_id: data.macchina_id, tipo: 'creazione',
        nuovo_stato: data.stato, dettagli_modifica: JSON.stringify(lavoro), user_id: user?.id,
      }]);
      await loadData();
    } else notifications.showError(`Errore aggiunta lavoro: ${error.message}`);
    return { data, error };
  }, [loadData, user?.id]);

  const updateLavoro = useCallback(async (id: string, dati: Partial<Omit<LavoroProduzione, 'id' | 'created_at' | 'updated_at' | 'macchina_nome' | 'lotto_info'>>) => {
    const oldLavoro = lavori.find(l => l.id === id);
    const { data, error } = await supabase.from('lavori_produzione').update(dati).eq('id', id).select().single();
    if (!error) {
      notifications.showSuccess('✅ Lavoro modificato!');
      const tipo = oldLavoro?.stato !== data.stato ? 'aggiornamento_stato' : 'modifica_dettagli';
      await supabase.from('storico_lavori_produzione').insert([{
        lavoro_id: data.id, macchina_id: data.macchina_id, tipo,
        vecchio_stato: oldLavoro?.stato, nuovo_stato: data.stato,
        dettagli_modifica: JSON.stringify(dati), user_id: user?.id,
      }]);
      await loadData();
    } else notifications.showError(`Errore modifica lavoro: ${error.message}`);
    return { data, error };
  }, [loadData, lavori, user?.id]);

  const deleteLavoro = useCallback(async (id: string) => {
    const lavoroToDelete = lavori.find(l => l.id === id);
    const { error } = await supabase.from('lavori_produzione').delete().eq('id', id);
    if (!error) {
      notifications.showSuccess('🗑️ Lavoro eliminato!');
      if (lavoroToDelete) {
        await supabase.from('storico_lavori_produzione').insert([{
          lavoro_id: lavoroToDelete.id, macchina_id: lavoroToDelete.macchina_id,
          tipo: 'eliminazione', vecchio_stato: lavoroToDelete.stato,
          dettagli_modifica: `Lavoro '${lavoroToDelete.nome_lavoro}' eliminato.`, user_id: user?.id,
        }]);
      }
      await loadData();
    } else notifications.showError(`Errore eliminazione lavoro: ${error.message}`);
    return { error };
  }, [loadData, lavori, user?.id]);

  return {
    macchine, lavori, storicoLavori, lottiStampa, loading,
    addMacchina, updateMacchina, deleteMacchina,
    addLavoro, updateLavoro, deleteLavoro, loadData,
  };
}
