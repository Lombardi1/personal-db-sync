import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Polimero } from '@/types'; // Rimosso: StoricoMovimentoPolimero
import * as notifications from '@/utils/notifications';
import { useAuth } from '@/hooks/useAuth';
import { findNextAvailablePolimeroCode } from '@/utils/polimeroUtils'; // Updated import

export function usePolimeri() {
  const [polimeri, setPolimeri] = useState<Polimero[]>([]);
  // Rimosso: const [storicoPolimeri, setStoricoPolimeri] = useState<StoricoMovimentoPolimero[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const loadData = async () => {
    setLoading(true);
    console.log('[usePolimeri] Attempting to load data...');
    try {
      const [polimeriRes] = await Promise.all([ // Rimosso storicoRes
        supabase.from('polimeri').select('*').order('codice', { ascending: true }),
      ]);

      if (polimeriRes.data) {
        setPolimeri(polimeriRes.data);
        console.log('[usePolimeri] Polimeri data loaded:', polimeriRes.data.length, 'items');
      } else if (polimeriRes.error) {
        console.error('[usePolimeri] Error loading polimeri:', polimeriRes.error);
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

    return () => {
      supabase.removeChannel(polimeriChannel);
    };
  }, []);

  const aggiungiPolimero = async (polimero: Omit<Polimero, 'data_creazione' | 'ultima_modifica'>) => {
    const polimeroToInsert = {
      ...polimero,
      data_creazione: new Date().toISOString(),
      ultima_modifica: new Date().toISOString(),
    };
    console.log('[aggiungiPolimero] Attempting to insert:', polimeroToInsert);
    const { error } = await supabase.from('polimeri').upsert([polimeroToInsert], { onConflict: 'codice' });
    if (!error) {
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
      notifications.showError("Polimero non trovato per l'eliminazione.");
      return { error: new Error('Polimero non trovato.') };
    }

    const { error } = await supabase.from('polimeri').delete().eq('codice', codice);
    if (!error) {
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
      await loadData();
      notifications.showSuccess(`✅ Stato polimero '${codice}' aggiornato a ${disponibile ? 'Disponibile' : 'Non Disponibile'}!`);
    } else {
      notifications.showError(`Errore aggiornamento disponibilità polimero: ${error.message}`);
    }
    return { error };
  };

  return {
    polimeri,
    loading,
    aggiungiPolimero,
    modificaPolimero,
    eliminaPolimero,
    cambiaDisponibilitaPolimero,
  };
}
