import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Colore, StoricoMovimentoColore } from '@/types';
import * as notifications from '@/utils/notifications';
import { useAuth } from '@/hooks/useAuth';

export function useColori() {
  const [colori, setColori] = useState<Colore[]>([]);
  const [storicoColori, setStoricoColori] = useState<StoricoMovimentoColore[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const loadData = async () => {
    setLoading(true);
    try {
      const [coloriRes, storicoRes] = await Promise.all([
        supabase.from('colori').select('*').order('codice', { ascending: true }),
        supabase
          .from('storico_colori')
          .select(`*, app_users(username)`)
          .order('data', { ascending: false })
          .limit(200),
      ]);

      if (coloriRes.data) {
        setColori(coloriRes.data);
      } else if (coloriRes.error) {
        console.error('[useColori] Error loading colori:', coloriRes.error);
      }

      if (storicoRes.data) {
        const storicoWithUsernames: StoricoMovimentoColore[] = storicoRes.data.map((mov: any) => ({
          ...mov,
          username: mov.app_users?.username || 'Sconosciuto',
        }));
        setStoricoColori(storicoWithUsernames);
      } else if (storicoRes.error) {
        console.error('[useColori] Error loading storico colori:', storicoRes.error);
      }
    } catch (error) {
      console.error('Errore caricamento dati colori:', error);
      notifications.showError('Errore nel caricamento dei dati del consumo colore.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const coloriChannel = supabase
      .channel('colori-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'colori' }, () => {
        loadData();
      })
      .subscribe();

    const storicoChannel = supabase
      .channel('storico-colori-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'storico_colori' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(coloriChannel);
      supabase.removeChannel(storicoChannel);
    };
  }, []);

  const aggiungiColore = async (colore: Omit<Colore, 'data_creazione' | 'ultima_modifica'>) => {
    const coloreToInsert = {
      ...colore,
      data_creazione: new Date().toISOString(),
      ultima_modifica: new Date().toISOString(),
    };
    const { error } = await supabase.from('colori').insert([coloreToInsert]);
    if (!error) {
      // Registra nel storico
      await supabase.from('storico_colori').insert([{
        codice_colore: colore.codice,
        tipo: 'carico',
        quantita: colore.quantita_disponibile,
        data: new Date().toISOString(),
        note: 'Colore aggiunto al magazzino',
        user_id: user?.id,
      }]);
      await loadData();
      notifications.showSuccess(`✅ Colore '${colore.nome}' aggiunto con successo!`);
    } else {
      console.error('[aggiungiColore] Supabase error:', error);
      notifications.showError(`Errore aggiunta colore: ${error.message}`);
    }
    return { error };
  };

  const modificaColore = async (codice: string, dati: Partial<Colore>) => {
    const coloreEsistente = colori.find(c => c.codice === codice);
    if (!coloreEsistente) {
      notifications.showError('Colore non trovato per la modifica.');
      return { error: new Error('Colore non trovato.') };
    }

    const coloreToUpdate = {
      ...dati,
      ultima_modifica: new Date().toISOString(),
    };
    const { error } = await supabase.from('colori').update(coloreToUpdate).eq('codice', codice);
    if (!error) {
      await loadData();
      notifications.showSuccess(`✅ Colore '${codice}' modificato con successo!`);
    } else {
      notifications.showError(`Errore modifica colore: ${error.message}`);
    }
    return { error };
  };

  const eliminaColore = async (codice: string) => {
    const { error } = await supabase.from('colori').delete().eq('codice', codice);
    if (!error) {
      await loadData();
      notifications.showSuccess(`🗑️ Colore '${codice}' eliminato con successo!`);
    } else {
      notifications.showError(`Errore eliminazione colore: ${error.message}`);
    }
    return { error };
  };

  const caricoColore = async (codice: string, quantita: number, note?: string) => {
    const coloreEsistente = colori.find(c => c.codice === codice);
    if (!coloreEsistente) {
      notifications.showError('Colore non trovato.');
      return { error: new Error('Colore non trovato.') };
    }

    const nuovaQuantita = coloreEsistente.quantita_disponibile + quantita;
    const { error: updateError } = await supabase
      .from('colori')
      .update({ quantita_disponibile: nuovaQuantita, ultima_modifica: new Date().toISOString() })
      .eq('codice', codice);

    if (!updateError) {
      await supabase.from('storico_colori').insert([{
        codice_colore: codice,
        tipo: 'carico',
        quantita,
        data: new Date().toISOString(),
        note: note || null,
        user_id: user?.id,
      }]);
      await loadData();
      notifications.showSuccess(`✅ Carico di ${quantita} ${coloreEsistente.unita_misura} per '${coloreEsistente.nome}' registrato!`);
    } else {
      notifications.showError(`Errore carico colore: ${updateError.message}`);
    }
    return { error: updateError };
  };

  const scaricoColore = async (codice: string, quantita: number, macchina?: string, lavoro?: string, note?: string) => {
    const coloreEsistente = colori.find(c => c.codice === codice);
    if (!coloreEsistente) {
      notifications.showError('Colore non trovato.');
      return { error: new Error('Colore non trovato.') };
    }

    if (coloreEsistente.quantita_disponibile < quantita) {
      notifications.showError(`Quantità insufficiente. Disponibile: ${coloreEsistente.quantita_disponibile} ${coloreEsistente.unita_misura}`);
      return { error: new Error('Quantità insufficiente.') };
    }

    const nuovaQuantita = coloreEsistente.quantita_disponibile - quantita;
    const { error: updateError } = await supabase
      .from('colori')
      .update({ quantita_disponibile: nuovaQuantita, ultima_modifica: new Date().toISOString() })
      .eq('codice', codice);

    if (!updateError) {
      await supabase.from('storico_colori').insert([{
        codice_colore: codice,
        tipo: 'scarico',
        quantita,
        data: new Date().toISOString(),
        note: note || null,
        user_id: user?.id,
        macchina: macchina || null,
        lavoro: lavoro || null,
      }]);
      await loadData();

      // Avvisa se sotto soglia minima
      if (coloreEsistente.soglia_minima && nuovaQuantita <= coloreEsistente.soglia_minima) {
        notifications.showWarning(`⚠️ Attenzione: '${coloreEsistente.nome}' è sotto la soglia minima (${coloreEsistente.soglia_minima} ${coloreEsistente.unita_misura})!`);
      } else {
        notifications.showSuccess(`✅ Scarico di ${quantita} ${coloreEsistente.unita_misura} per '${coloreEsistente.nome}' registrato!`);
      }
    } else {
      notifications.showError(`Errore scarico colore: ${updateError.message}`);
    }
    return { error: updateError };
  };

  const cambiaDisponibilitaColore = async (codice: string, disponibile: boolean) => {
    const { error } = await supabase
      .from('colori')
      .update({ disponibile, ultima_modifica: new Date().toISOString() })
      .eq('codice', codice);
    if (!error) {
      await loadData();
      notifications.showSuccess(`✅ Stato colore '${codice}' aggiornato!`);
    } else {
      notifications.showError(`Errore aggiornamento disponibilità: ${error.message}`);
    }
    return { error };
  };

  return {
    colori,
    storicoColori,
    loading,
    aggiungiColore,
    modificaColore,
    eliminaColore,
    caricoColore,
    scaricoColore,
    cambiaDisponibilitaColore,
  };
}
