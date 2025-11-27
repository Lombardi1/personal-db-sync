import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Polimero, StoricoMovimentoPolimero } from '@/types';
import * as notifications from '@/utils/notifications';
import { useAuth } from '@/hooks/useAuth';
import { resetPolimeroCodeGenerator, fetchMaxPolimeroCodeFromDB } from '@/utils/polimeroUtils';

export function usePolimeri() {
  const [polimeri, setPolimeri] = useState<Polimero[]>([]);
  const [storicoPolimeri, setStoricoPolimeri] = useState<StoricoMovimentoPolimero[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const loadData = async () => {
    setLoading(true);
    console.log('[usePolimeri] Attempting to load data...');
    try {
      const [polimeriRes, storicoRes] = await Promise.all([
        supabase.from('polimeri').select('*'),
        supabase.from('storico_polimeri').select(`*, app_users(username)`).order('data', { ascending: false })
      ]);

      if (polimeriRes.data) {
        setPolimeri(polimeriRes.data);
        console.log('[usePolimeri] Polimeri data loaded:', polimeriRes.data.length, 'items');
      } else if (polimeriRes.error) {
        console.error('[usePolimeri] Error loading polimeri:', polimeriRes.error);
      }

      if (storicoRes.data) {
        const storicoWithUsernames: StoricoMovimentoPolimero[] = storicoRes.data.map(mov => ({
          ...mov,
          username: mov.app_users?.username || 'Sconosciuto'
        }));
        setStoricoPolimeri(storicoWithUsernames);
        console.log('[usePolimeri] Storico Polimeri data loaded:', storicoWithUsernames.length, 'items');
      } else if (storicoRes.error) {
        console.error('[usePolimeri] Error loading storico polimeri:', storicoRes.error);
      }
    } catch (error) {
      console.error('Errore caricamento dati polimeri:', error);
      notifications.showError('Errore nel caricamento dei dati del magazzino polimeri.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const polimeriChannel = supabase
      .channel('polimeri-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'polimeri' }, () => {
        loadData();
      })
      .subscribe();

    const storicoPolimeriChannel = supabase
      .channel('storico_polimeri-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'storico_polimeri' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(polimeriChannel);
      supabase.removeChannel(storicoPolimeriChannel);
    };
  }, []);

  const aggiungiPolimero = async (polimero: Omit<Polimero, 'data_creazione' | 'ultima_modifica'>) => {
    const polimeroToInsert = {
      ...polimero,
      data_creazione: new Date().toISOString(),
      ultima_modifica: new Date().toISOString(),
    };
    console.log('[aggiungiPolimero] Attempting to insert:', polimeroToInsert);
    const { error } = await supabase.from('polimeri').insert([polimeroToInsert]);
    if (!error) {
      const movimento: StoricoMovimentoPolimero = {
        codice_polimero: polimero.codice,
        tipo: 'carico',
        data: new Date().toISOString(),
        note: `Polimero creato e aggiunto al magazzino`,
        user_id: user?.id,
      };
      await supabase.from('storico_polimeri').insert([movimento]);
      await loadData();
      notifications.showSuccess(`✅ Polimero '${polimero.codice}' aggiunto con successo!`);
    } else {
      console.error('[aggiungiPolimero] Supabase error:', error);
      notifications.showError(`Errore aggiunta polimero: ${error.message}`);
    }
    return { error };
  };

  const modificaPolimero = async (codice: string, dati: Partial<Polimero>) => {
    const polimeroEsistente = polimeri.find(p => p.codice === codice);
    if (!polimeroEsistente) {
      notifications.showError('Polimero non trovato per la modifica.');
      return { error: new Error('Polimero non trovato.') };
    }

    const polimeroToUpdate = {
      ...dati,
      ultima_modifica: new Date().toISOString(),
    };
    console.log('[modificaPolimero] Attempting to update:', polimeroToUpdate, 'for codice:', codice);
    const { error } = await supabase.from('polimeri').update(polimeroToUpdate).eq('codice', codice);
    if (!error) {
      const movimento: StoricoMovimentoPolimero = {
        codice_polimero: codice,
        tipo: 'modifica',
        data: new Date().toISOString(),
        note: `Dettagli polimero modificati`,
        user_id: user?.id,
      };
      await supabase.from('storico_polimeri').insert([movimento]);
      await loadData();
      notifications.showSuccess(`✅ Polimero '${codice}' modificato con successo!`);
    } else {
      console.error('[modificaPolimero] Supabase error:', error);
      notifications.showError(`Errore modifica polimero: ${error.message}`);
    }
    return { error };
  };

  const eliminaPolimero = async (codice: string) => {
    const polimeroEsistente = polimeri.find(p => p.codice === codice);
    if (!polimeroEsistente) {
      notifications.showError('Polimero non trovato per l\'eliminazione.');
      return { error: new Error('Polimero non trovato.') };
    }

    const { error } = await supabase.from('polimeri').delete().eq('codice', codice);
    if (!error) {
      const movimento: StoricoMovimentoPolimero = {
        codice_polimero: codice,
        tipo: 'scarico', // Consideriamo l'eliminazione come uno scarico definitivo
        data: new Date().toISOString(),
        note: `Polimero eliminato dal magazzino`,
        user_id: user?.id,
      };
      await supabase.from('storico_polimeri').insert([movimento]);
      await loadData();
      notifications.showSuccess(`🗑️ Polimero '${codice}' eliminato con successo!`);
    } else {
      notifications.showError(`Errore eliminazione polimero: ${error.message}`);
    }
    return { error };
  };

  const cambiaDisponibilitaPolimero = async (codice: string, disponibile: boolean) => {
    const polimeroEsistente = polimeri.find(p => p.codice === codice);
    if (!polimeroEsistente) {
      notifications.showError('Polimero non trovato.');
      return { error: new Error('Polimero non trovato.') };
    }

    const { error } = await supabase.from('polimeri').update({ disponibile, ultima_modifica: new Date().toISOString() }).eq('codice', codice);
    if (!error) {
      const movimento: StoricoMovimentoPolimero = {
        codice_polimero: codice,
        tipo: 'modifica',
        data: new Date().toISOString(),
        note: `Stato disponibilità cambiato a: ${disponibile ? 'Disponibile' : 'Non Disponibile'}`,
        user_id: user?.id,
      };
      await supabase.from('storico_polimeri').insert([movimento]);
      await loadData();
      notifications.showSuccess(`✅ Stato polimero '${codice}' aggiornato a ${disponibile ? 'Disponibile' : 'Non Disponibile'}!`);
    } else {
      notifications.showError(`Errore aggiornamento disponibilità polimero: ${error.message}`);
    }
    return { error };
  };

  return {
    polimeri,
    storicoPolimeri,
    loading,
    aggiungiPolimero,
    modificaPolimero,
    eliminaPolimero,
    cambiaDisponibilitaPolimero,
  };
}