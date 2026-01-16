import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

export interface MessaggioChat {
  id: string;
  mittente_id: string;
  destinatario_id: string;
  contenuto: string;
  timestamp: string;
  letto: boolean;
  mittente?: { username: string };
}

export interface UtenteChat {
  id: string;
  username: string;
}

export function useChat() {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messaggi, setMessaggi] = useState<MessaggioChat[]>([]);
  const [destinatari, setDestinatari] = useState<UtenteChat[]>([]);
  const [loading, setLoading] = useState(true);

  // Carica i messaggi e i destinatari
  const caricaDati = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      // Carica tutti gli utenti tranne l'utente corrente
      const { data: utenti, error: utentiError } = await supabase
        .from('app_users')
        .select('id, username')
        .neq('id', user.id);
      
      if (utentiError) throw utentiError;
      setDestinatari(utenti || []);
      
      // Carica i messaggi
      const { data: messaggiData, error: messaggiError } = await supabase
        .from('messaggi_chat')
        .select(`*, mittente:app_users!mittente_id(username)`)
        .or(`mittente_id.eq.${user.id},destinatario_id.eq.${user.id}`)
        .order('timestamp', { ascending: true });
      
      if (messaggiError) throw messaggiError;
      setMessaggi(messaggiData || []);
    } catch (error) {
      console.error('Errore nel caricamento dati chat:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Inizializza il socket
  useEffect(() => {
    if (!user?.id) return;

    const newSocket = io(import.meta.env.VITE_SUPABASE_URL?.replace('https://', 'wss://') || '', {
      transports: ['websocket'],
      auth: {
        userId: user.id
      }
    });

    newSocket.on('connect', () => {
      console.log('Socket connesso');
    });

    newSocket.on('nuovo_messaggio', (messaggio: MessaggioChat) => {
      setMessaggi(prev => [...prev, messaggio]);
    });

    newSocket.on('messaggio_letto', ({ messageId }) => {
      setMessaggi(prev => 
        prev.map(msg => 
          msg.id === messageId ? { ...msg, letto: true } : msg
        )
      );
    });

    setSocket(newSocket);
    caricaDati();

    // Sottoscrizione ai cambiamenti in tempo reale
    const messaggiChannel = supabase
      .channel('messaggi_chat_changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messaggi_chat'
      }, (payload) => {
        const nuovoMessaggio = payload.new as MessaggioChat;
        // Se il messaggio è per l'utente corrente, lo aggiungiamo alla lista
        if (nuovoMessaggio.destinatario_id === user.id) {
          setMessaggi(prev => [...prev, nuovoMessaggio]);
        }
      })
      .subscribe();

    return () => {
      newSocket.disconnect();
      supabase.removeChannel(messaggiChannel);
    };
  }, [user?.id, caricaDati]);

  // Invia un messaggio
  const inviaMessaggio = useCallback(async (destinatarioId: string, contenuto: string) => {
    if (!user?.id || !socket) return;

    try {
      const { data, error } = await supabase
        .from('messaggi_chat')
        .insert([{
          mittente_id: user.id,
          destinatario_id: destinatarioId,
          contenuto,
          timestamp: new Date().toISOString(),
          letto: false
        }])
        .select(`*, mittente:app_users!mittente_id(username)`)
        .single();

      if (error) throw error;

      // Emit evento socket per notificare il destinatario
      socket.emit('invia_messaggio', data);
      setMessaggi(prev => [...prev, data]);
    } catch (error) {
      console.error('Errore invio messaggio:', error);
    }
  }, [user?.id, socket]);

  // Segna un messaggio come letto
  const segnaComeLetto = useCallback(async (messaggioId: string) => {
    if (!user?.id || !socket) return;

    try {
      const { error } = await supabase
        .from('messaggi_chat')
        .update({ letto: true })
        .eq('id', messaggioId);

      if (error) throw error;

      // Emit evento socket per notificare il mittente
      socket.emit('segna_messaggio_letto', { messageId: messaggioId });
      setMessaggi(prev => 
        prev.map(msg => 
          msg.id === messaggioId ? { ...msg, letto: true } : msg
        )
      );
    } catch (error) {
      console.error('Errore segnatura messaggio come letto:', error);
    }
  }, [user?.id, socket]);

  // Ottieni i messaggi con un destinatario specifico
  const getMessaggiConUtente = useCallback((utenteId: string) => {
    return messaggi.filter(msg => 
      (msg.mittente_id === utenteId && msg.destinatario_id === user?.id) ||
      (msg.mittente_id === user?.id && msg.destinatario_id === utenteId)
    ).sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [messaggi, user?.id]);

  return {
    messaggi,
    destinatari,
    loading,
    inviaMessaggio,
    segnaComeLetto,
    getMessaggiConUtente
  };
}