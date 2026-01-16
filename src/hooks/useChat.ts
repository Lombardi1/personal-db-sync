import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Chat, Message } from '@/types';
import { toast } from 'sonner';
import { useAuth } from './useAuth';

export function useChat() {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<{ id: string; username: string }[]>([]);

  const fetchAllUsers = useCallback(async () => {
    const { data, error } = await supabase
      .from('app_users')
      .select('id, username');
    if (error) {
      console.error('Error fetching all users:', error);
      toast.error('Errore nel caricamento degli utenti per la chat.');
      return [];
    }
    setAllUsers(data || []);
    return data || [];
  }, []);

  const fetchChats = useCallback(async () => {
    if (!user?.id) return;
    setLoadingChats(true);
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .contains('participant_ids', [user.id])
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (error) {
      console.error('Error fetching chats:', error);
      toast.error('Errore nel caricamento delle chat.');
      setLoadingChats(false);
      return;
    }

    const chatsWithUsernames: Chat[] = await Promise.all((data || []).map(async (chat) => {
      const participantUsernames = await Promise.all(chat.participant_ids.map(async (pId: string) => {
        const foundUser = allUsers.find(u => u.id === pId);
        if (foundUser) return foundUser.username;
        
        // Fallback if user not in allUsers (e.g., new user or not yet fetched)
        const { data: userData, error: userError } = await supabase
          .from('app_users')
          .select('username')
          .eq('id', pId)
          .single();
        return userData?.username || 'Sconosciuto';
      }));
      return { ...chat, participant_usernames: participantUsernames };
    }));

    setChats(chatsWithUsernames);
    setLoadingChats(false);
  }, [user?.id, allUsers]);

  const fetchMessages = useCallback(async (chatId: string) => {
    setLoadingMessages(true);
    const { data, error } = await supabase
      .from('messages')
      .select(`*, app_users(username)`)
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      toast.error('Errore nel caricamento dei messaggi.');
      setLoadingMessages(false);
      return;
    }

    const messagesWithUsernames: Message[] = (data || []).map(msg => ({
      ...msg,
      sender_username: (msg as any).app_users?.username || 'Sconosciuto'
    }));
    setMessages(messagesWithUsernames);
    setLoadingMessages(false);
  }, []);

  useEffect(() => {
    fetchAllUsers();
  }, [fetchAllUsers]);

  useEffect(() => {
    if (user?.id) {
      fetchChats();

      const chatChannel = supabase
        .channel('chats-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'chats', filter: `participant_ids.cs.{"${user.id}"}` }, (payload) => {
          console.log('Chat change received!', payload);
          fetchChats(); // Re-fetch chats on any change
        })
        .subscribe();

      return () => {
        supabase.removeChannel(chatChannel);
      };
    }
  }, [user?.id, fetchChats]);

  useEffect(() => {
    if (activeChatId) {
      fetchMessages(activeChatId);

      const messageChannel = supabase
        .channel(`messages-chat-${activeChatId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `chat_id=eq.${activeChatId}` }, (payload) => {
          console.log('Message change received!', payload);
          fetchMessages(activeChatId); // Re-fetch messages for the active chat
        })
        .subscribe();

      return () => {
        supabase.removeChannel(messageChannel);
      };
    } else {
      setMessages([]); // Clear messages if no active chat
    }
  }, [activeChatId, fetchMessages]);

  const createOrGetChat = useCallback(async (participantIds: string[]) => {
    if (!user?.id) {
      toast.error('Devi essere loggato per creare una chat.');
      return null;
    }

    const allParticipants = Array.from(new Set([...participantIds, user.id])).sort();

    // Check for existing chat with these participants
    const { data: existingChats, error: searchError } = await supabase
      .from('chats')
      .select('id, participant_ids')
      .contains('participant_ids', allParticipants)
      .limit(1);

    if (searchError) {
      console.error('Error searching for existing chat:', searchError);
      toast.error('Errore nella ricerca di chat esistenti.');
      return null;
    }

    if (existingChats && existingChats.length > 0) {
      const foundChat = existingChats.find(chat => 
        chat.participant_ids.length === allParticipants.length && 
        chat.participant_ids.every((id, index) => id === allParticipants[index])
      );
      if (foundChat) {
        setActiveChatId(foundChat.id);
        toast.info('Chat esistente aperta.');
        return foundChat.id;
      }
    }

    // If no existing chat, create a new one
    const { data: newChat, error: createError } = await supabase
      .from('chats')
      .insert({ participant_ids: allParticipants })
      .select()
      .single();

    if (createError) {
      console.error('Error creating new chat:', createError);
      toast.error('Errore nella creazione della nuova chat.');
      return null;
    }

    setActiveChatId(newChat.id);
    toast.success('Nuova chat creata!');
    fetchChats(); // Refresh chat list
    return newChat.id;
  }, [user?.id, fetchChats]);

  const sendMessage = useCallback(async (content: string) => {
    if (!user?.id || !activeChatId || !content.trim()) {
      toast.error('Impossibile inviare un messaggio vuoto o senza chat attiva.');
      return;
    }

    const { error } = await supabase
      .from('messages')
      .insert({ chat_id: activeChatId, sender_id: user.id, content: content.trim() });

    if (error) {
      console.error('Error sending message:', error);
      toast.error('Errore nell\'invio del messaggio.');
      return;
    }

    // Update last_message_content and last_message_at in the chat
    await supabase
      .from('chats')
      .update({ last_message_content: content.trim(), last_message_at: new Date().toISOString() })
      .eq('id', activeChatId);

    // Messages will be re-fetched by the real-time subscription
  }, [user?.id, activeChatId]);

  const deleteChat = useCallback(async (chatId: string) => {
    if (!user?.id) {
      toast.error('Devi essere loggato per eliminare una chat.');
      return;
    }

    const { error } = await supabase
      .from('chats')
      .delete()
      .eq('id', chatId);

    if (error) {
      console.error('Error deleting chat:', error);
      toast.error('Errore nell\'eliminazione della chat.');
      return;
    }

    if (activeChatId === chatId) {
      setActiveChatId(null);
    }
    toast.success('Chat eliminata con successo!');
    fetchChats(); // Refresh chat list
  }, [user?.id, activeChatId, fetchChats]);

  return {
    chats,
    messages,
    loadingChats,
    loadingMessages,
    activeChatId,
    setActiveChatId,
    createOrGetChat,
    sendMessage,
    deleteChat,
    allUsers,
    fetchChats, // Expose fetchChats to allow manual refresh
  };
}