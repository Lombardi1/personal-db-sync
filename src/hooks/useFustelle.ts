import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Fustella } from '@/types'; // Rimosso: StoricoMovimentoFustella
import * as notifications from '@/utils/notifications';
import { useAuth } from '@/hooks/useAuth';
import { resetFustellaCodeGenerator, fetchMaxFustellaCodeFromDB } from '@/utils/fustellaUtils';
import { resetPulitoreCodeGenerator, fetchMaxPulitoreCodeFromDB } from '@/utils/pulitoreUtils'; // Importa le utilità per il pulitore

export function useFustelle() {
  const [fustelle, setFustelle] = useState<Fustella[]>([]);
  // Rimosso: const [storicoFustelle, setStoricoFustelle] = useState<StoricoMovimentoFustella[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const loadData = async () => {
    setLoading(true);
    console.log('[useFustelle] Attempting to load data...');
    try {
      const [fustelleRes] = await Promise.all([ // Rimosso storicoRes
        supabase.from('fustelle').select('*'),
        // Rimosso: supabase.from('storico_fustelle').select(`*, app_users(username)`).order('data', { ascending: false })
      ]);

      if (fustelleRes.data) {
        setFustelle(fustelleRes.data);
        console.log('[useFustelle] Fustelle data loaded:', fustelleRes.data.length, 'items');
      } else if (fustelleRes.error) {
        console.error('[useFustelle] Error loading fustelle:', fustelleRes.error);
      }

      // Rimosso: if (storicoRes.data) {
      //   const storicoWithUsernames: StoricoMovimentoFustella[] = storicoRes.data.map(mov => ({
      //     ...mov,
      //     username: mov.app_users?.username || 'Sconosciuto'
      //   }));
      //   setStoricoFustelle(storicoWithUsernames);
      //   console.log('[useFustelle] Storico Fustelle data loaded:', storicoWithUsernames.length, 'items');
      // } else if (storicoRes.error) {
      //   console.error('[useFustelle] Error loading storico fustelle:', storicoRes.error);
      // }
    } catch (error) {
      console.error('Errore caricamento dati fustelle:', error);
      notifications.showError('Errore nel caricamento dei dati del magazzino fustelle.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const fustelleChannel = supabase
      .channel('fustelle-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fustelle' }, () => {
        loadData();
      })
      .subscribe();

    // Rimosso: const storicoFustelleChannel = supabase
    //   .channel('storico_fustelle-changes')
    //   .on('postgres_changes', { event: '*', schema: 'public', table: 'storico_fustelle' }, () => {
    //     loadData();
    //   })
    //   .subscribe();

    return () => {
      supabase.removeChannel(fustelleChannel);
      // Rimosso: supabase.removeChannel(storicoFustelleChannel);
    };
  }, []);

  const aggiungiFustella = async (fustella: Omit<Fustella, 'data_creazione' | 'ultima_modifica'>) => {
    const fustellaToInsert = {
      ...fustella,
      data_creazione: new Date().toISOString(),
      ultima_modifica: new Date().toISOString(),
      ordine_acquisto_numero: null, // NUOVO: Imposta a null per le fustelle aggiunte manualmente
    };
    console.log('[aggiungiFustella] Attempting to insert:', fustellaToInsert); // Add logging
    const { error } = await supabase.from('fustelle').insert([fustellaToInsert]);
    if (!error) {
      // Rimosso: const movimento: StoricoMovimentoFustella = {
      //   codice_fustella: fustella.codice,
      //   tipo: 'carico',
      //   data: new Date().toISOString(),
      //   note: `Fustella creata e aggiunta al magazzino`,
      //   user_id: user?.id,
      // };
      // Rimosso: await supabase.from('storico_fustelle').insert([movimento]);
      await loadData();
      notifications.showSuccess(`✅ Fustella '${fustella.codice}' aggiunta con successo!`);
    } else {
      console.error('[aggiungiFustella] Supabase error:', error); // Log the full error
      notifications.showError(`Errore aggiunta fustella: ${error.message}`);
    }
    return { error };
  };

  const modificaFustella = async (codice: string, dati: Partial<Fustella>) => {
    const fustellaEsistente = fustelle.find(f => f.codice === codice);
    if (!fustellaEsistente) {
      notifications.showError('Fustella non trovata per la modifica.');
      return { error: new Error('Fustella non trovata.') };
    }

    const fustellaToUpdate = {
      ...dati,
      ultima_modifica: new Date().toISOString(),
    };
    console.log('[modificaFustella] Attempting to update:', fustellaToUpdate, 'for codice:', codice); // Add logging
    const { error } = await supabase.from('fustelle').update(fustellaToUpdate).eq('codice', codice);
    if (!error) {
      // Rimosso: const movimento: StoricoMovimentoFustella = {
      //   codice_fustella: codice,
      //   tipo: 'modifica',
      //   data: new Date().toISOString(),
      //   note: `Dettagli fustella modificati`,
      //   user_id: user?.id,
      // };
      // Rimosso: await supabase.from('storico_fustelle').insert([movimento]);
      await loadData();
      notifications.showSuccess(`✅ Fustella '${codice}' modificata con successo!`);
    } else {
      console.error('[modificaFustella] Supabase error:', error); // Log the full error
      notifications.showError(`Errore modifica fustella: ${error.message}`);
    }
    return { error };
  };

  const eliminaFustella = async (codice: string) => {
    const fustellaEsistente = fustelle.find(f => f.codice === codice);
    if (!fustellaEsistente) {
      notifications.showError('Fustella non trovata per l\'eliminazione.');
      return { error: new Error('Fustella non trovata.') };
    }

    const { error } = await supabase.from('fustelle').delete().eq('codice', codice);
    if (!error) {
      // Rimosso: const movimento: StoricoMovimentoFustella = {
      //   codice_fustella: codice,
      //   tipo: 'scarico', // Consideriamo l'eliminazione come uno scarico definitivo
      //   data: new Date().toISOString(),
      //   note: `Fustella eliminata dal magazzino`,
      //   user_id: user?.id,
      // };
      // Rimosso: await supabase.from('storico_fustelle').insert([movimento]);
      await loadData();
      notifications.showSuccess(`🗑️ Fustella '${codice}' eliminata con successo!`);
    } else {
      notifications.showError(`Errore eliminazione fustella: ${error.message}`);
    }
    return { error };
  };

  const cambiaDisponibilitaFustella = async (codice: string, disponibile: boolean) => {
    const fustellaEsistente = fustelle.find(f => f.codice === codice);
    if (!fustellaEsistente) {
      notifications.showError('Fustella non trovata.');
      return { error: new Error('Fustella non trovata.') };
    }

    const { error } = await supabase.from('fustelle').update({ disponibile, ultima_modifica: new Date().toISOString() }).eq('codice', codice);
    if (!error) {
      // Rimosso: const movimento: StoricoMovimentoFustella = {
      //   codice_fustella: codice,
      //   tipo: 'modifica',
      //   data: new Date().toISOString(),
      //   note: `Stato disponibilità cambiato a: ${disponibile ? 'Disponibile' : 'Non Disponibile'}`,
      //   user_id: user?.id,
      // };
      // Rimosso: await supabase.from('storico_fustelle').insert([movimento]);
      await loadData();
      notifications.showSuccess(`✅ Stato fustella '${codice}' aggiornato a ${disponibile ? 'Disponibile' : 'Non Disponibile'}!`);
    } else {
      notifications.showError(`Errore aggiornamento disponibilità fustella: ${error.message}`);
    }
    return { error };
  };

  return {
    fustelle,
    // Rimosso: storicoFustelle,
    loading,
    aggiungiFustella,
    modificaFustella,
    eliminaFustella,
    cambiaDisponibilitaFustella,
  };
}