import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface Messaggio {
  id: string;
  mittente_id: string;
  destinatario_id: string;
  contenuto: string;
  letto: boolean;
  created_at: string;
  mittente?: {
    username: string;
  };
}

export function useChat() {
  const { user } = useAuth();
  const [messaggi, setMessaggi] = useState<Messaggio[]>([]);
  const [loading, setLoading] = useState(true);
  const [destinatari, setDestinatari] = useState<Array<{id: string, username: string}>>([]);
  
  // Carica la lista degli utenti (destinatari possibili)
  const caricaDestinatari = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('id, username')
        .neq('id', user.id) // Escludi l'utente corrente
        .order('username');
      
      if (error) throw error;
      
      setDestinatari(data || []);
    } catch (error: any) {
      toast.error('Errore nel caricamento degli utenti');
      console.error('Errore caricamento destinatari:', error);
    }
  }, [user]);

  // Carica i messaggi
  const caricaMessaggi = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('messaggi')
        .select(`
          *,
          mittente:app_users(username)
        `)
        .or(`mittente_id.eq.${user.id},destinatario_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(50); // Limita i messaggi per performance
      
      if (error) throw error;
      
      setMessaggi(data || []);
    } catch (error: any) {
      toast.error('Errore nel caricamento dei messaggi');
      console.error('Errore caricamento messaggi:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Invia un messaggio
  const inviaMessaggio = async (destinatarioId: string, contenuto: string) => {
    if (!user || !contenuto.trim()) return false;
    
    try {
      const { error } = await supabase
        .from('messaggi')
        .insert({
          mittente_id: user.id,
          destinatario_id: destinatarioId,
          contenuto: contenuto.trim()
        });
      
      if (error) throw error;
      
      toast.success('Messaggio inviato');
      return true;
    } catch (error: any) {
      toast.error('Errore nell\'invio del messaggio');
      console.error('Errore invio messaggio:', error);
      return false;
    }
  };

  // Segna un messaggio come letto
  const segnaComeLetto = async (messaggioId: string) => {
    try {
      const { error } = await supabase
        .from('messaggi')
        .update({ letto: true })
        .eq('id', messaggioId);
      
      if (error) throw error;
      
      // Aggiorna lo stato locale
      setMessaggi(prev => 
        prev.map(m => 
          m.id === messaggioId ? { ...m, letto: true } : m
        )
      );
    } catch (error: any) {
      toast.error('Errore nell\'aggiornamento del messaggio');
      console.error('Errore aggiornamento messaggio:', error);
    }
  };

  // Effettua il setup iniziale
  useEffect(() => {
    if (!user) return;
    
    caricaDestinatari();
    caricaMessaggi();
    
    // Setup realtime subscription
    const channel = supabase
      .channel('messaggi_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messaggi',
          filter: `destinatario_id=eq.${user.id}`
        },
        (payload) => {
          const nuovoMessaggio = {
            ...payload.new,
            mittente: { username: 'Utente' } // Placeholder
          } as Messaggio;
          
          setMessaggi(prev => [nuovoMessaggio, ...prev]);
          toast.info('Nuovo messaggio ricevuto');
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, caricaDestinatari, caricaMessaggi]);

  return {
    messaggi,
    destinatari,
    loading,
    inviaMessaggio,
    segnaComeLetto,
    ricaricaMessaggi: caricaMessaggi
  };
}