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
  const [totalUnreadCount, setTotalUnreadCount] = useState(0); // Nuovo stato per il conteggio totale

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

    // 1. Fetch chats relevant to the current user
    const { data: chatsData, error: chatsError } = await supabase
      .from('chats')
      .select(`id, created_at, participant_ids, last_message_content, last_message_at`)
      .contains('participant_ids', [user.id])
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (chatsError) {
      console.error('Error fetching chats:', chatsError);
      toast.error('Errore nel caricamento delle chat.');
      setLoadingChats(false);
      return;
    }

    // 2. Fetch user_chat_status for the current user for all fetched chats
    const chatIds = (chatsData || []).map(chat => chat.id);
    const { data: userChatStatusData, error: statusError } = await supabase
      .from('user_chat_status')
      .select('chat_id, last_read_at')
      .eq('user_id', user.id)
      .in('chat_id', chatIds);

    if (statusError) {
      console.error('Error fetching user chat status:', statusError);
      // Don't block, proceed with potentially missing status
    }

    const userChatStatusMap = new Map(
      (userChatStatusData || []).map(status => [status.chat_id, status.last_read_at])
    );

    let currentTotalUnread = 0;
    const chatsWithUsernames: Chat[] = await Promise.all((chatsData || []).map(async (chat) => {
      const participantUsernames = await Promise.all(chat.participant_ids.map(async (pId: string) => {
        const foundUser = allUsers.find(u => u.id === pId);
        if (foundUser) return foundUser.username;
        
        const { data: userData, error: userError } = await supabase
          .from('app_users')
          .select('username')
          .eq('id', pId)
          .single();
        return userData?.username || 'Sconosciuto';
      }));

      // Get last_read_at for the current user from the map
      const lastReadAt = userChatStatusMap.get(chat.id);
      let unreadCount = 0;

      if (chat.last_message_at) {
        if (lastReadAt) {
          const lastMessageDate = new Date(chat.last_message_at);
          const lastReadDate = new Date(lastReadAt);
          if (lastMessageDate > lastReadDate) {
            const { count, error: countError } = await supabase
              .from('messages')
              .select('id', { count: 'exact' })
              .eq('chat_id', chat.id)
              .gt('created_at', lastReadAt)
              .neq('sender_id', user.id);

            if (countError) {
              console.error('Error counting unread messages:', countError);
            } else {
              unreadCount = count || 0;
            }
          }
        } else {
          // If no last_read_at, all messages are unread
          const { count, error: countError } = await supabase
            .from('messages')
            .select('id', { count: 'exact' })
            .eq('chat_id', chat.id)
            .neq('sender_id', user.id);

          if (countError) {
            console.error('Error counting unread messages (no last_read_at):', countError);
          } else {
            unreadCount = count || 0;
          }
        }
      }
      
      if (unreadCount > 0) {
        currentTotalUnread++;
      }

      return { ...chat, participant_usernames: participantUsernames, unread_count: unreadCount };
    }));

    setChats(chatsWithUsernames);
    setTotalUnreadCount(currentTotalUnread);
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

  const markChatAsRead = useCallback(async (chatId: string) => {
    if (!user?.id) return;

    const { error } = await supabase
      .from('user_chat_status')
      .upsert(
        { user_id: user.id, chat_id: chatId, last_read_at: new Date().toISOString() },
        { onConflict: 'user_id,chat_id' }
      );

    if (error) {
      console.error('Error marking chat as read:', error);
      toast.error('Errore nell\'aggiornamento dello stato di lettura.');
    } else {
      fetchChats(); // Refresh chat list to update unread counts
    }
  }, [user?.id, fetchChats]);

  useEffect(() => {
    fetchAllUsers();
  }, [fetchAllUsers]);

  useEffect(() => {
    if (user?.id) {
      fetchChats();

      const chatChannel = supabase
        .channel('chats-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'chats', filter: `participant_ids.cs.{"${user.id}"}` }, async (payload) => {
          console.log('Chat change received!', payload);
          fetchChats(); // Always re-fetch chats to update the list and badge counts

          // Check for new messages in non-active chats for toast notification
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const newChatData = payload.new as Chat;
            // Only show toast if it's not the active chat and there's a new last message
            // Also ensure the last message is not from the current user
            if (newChatData.id !== activeChatId && newChatData.last_message_content && newChatData.last_message_at) {
              // Fetch the actual last message to get the sender_id
              const { data: lastMessage, error: msgError } = await supabase
                .from('messages')
                .select('sender_id, content')
                .eq('chat_id', newChatData.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

              if (msgError) {
                console.error('Error fetching last message for toast:', msgError);
                return;
              }

              // Only show toast if the sender is not the current user
              if (lastMessage && lastMessage.sender_id !== user.id) {
                const sender = allUsers.find(u => u.id === lastMessage.sender_id);
                const senderUsername = sender?.username || 'Sconosciuto';
                toast.info(`${senderUsername}: ${lastMessage.content}`, {
                  duration: 5000, // Show for 5 seconds
                  position: 'top-left', // Position on the left
                  action: {
                    label: 'Apri Chat',
                    onClick: () => {
                      // Direct navigation using window.location.href
                      window.location.href = `/chat/${newChatData.id}`;
                    },
                  },
                });
              }
            }
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(chatChannel);
      };
    }
  }, [user?.id, fetchChats, activeChatId, allUsers]);

  useEffect(() => {
    if (activeChatId) {
      fetchMessages(activeChatId);
      markChatAsRead(activeChatId); // Mark as read when active chat changes

      const messageChannel = supabase
        .channel(`messages-chat-${activeChatId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `chat_id=eq.${activeChatId}` }, (payload) => {
          console.log('Message change received!', payload);
          fetchMessages(activeChatId); // Re-fetch messages for the active chat
          markChatAsRead(activeChatId); // Mark as read on new message
        })
        .subscribe();

      return () => {
        supabase.removeChannel(messageChannel);
      };
    } else {
      setMessages([]); // Clear messages if no active chat
    }
  }, [activeChatId, fetchMessages, markChatAsRead]);

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
        markChatAsRead(foundChat.id); // Mark as read if existing chat is opened
        return foundChat.id;
      }
    }

    // If no existing chat, create a new one
    console.log('[useChat] createOrGetChat: Attempting to create chat with participants:', allParticipants, 'by user ID:', user.id);
    const { data: newChat, error: createError } = await supabase
      .from('chats')
      .insert({ participant_ids: allParticipants })
      .select()
      .single();

    if (createError) {
      console.error('Error creating new chat:', createError);
      console.error('Supabase create chat error details:', JSON.stringify(createError, null, 2));
      toast.error('Errore nella creazione della nuova chat.');
      return null;
    }

    setActiveChatId(newChat.id);
    toast.success('Nuova chat creata!');
    markChatAsRead(newChat.id); // Mark as read immediately after creation
    fetchChats(); // Refresh chat list
    return newChat.id;
  }, [user?.id, fetchChats, markChatAsRead]);

  const sendMessage = useCallback(async (content: string) => {
    if (!user?.id || !activeChatId || !content.trim()) {
      toast.error('Impossibile inviare un messaggio vuoto o senza chat attiva.');
      return;
    }

    console.log('[useChat] sendMessage: Attempting to send message:', { chat_id: activeChatId, sender_id: user.id, content: content.trim() });
    const { error } = await supabase
      .from('messages')
      .insert({ chat_id: activeChatId, sender_id: user.id, content: content.trim() });

    if (error) {
      console.error('Error sending message:', error);
      console.error('Supabase send message error details:', JSON.stringify(error, null, 2));
      toast.error('Errore nell\'invio del messaggio.');
      return;
    }

    // Update last_message_content and last_message_at in the chat
    await supabase
      .from('chats')
      .update({ last_message_content: content.trim(), last_message_at: new Date().toISOString() })
      .eq('id', activeChatId);

    // Messages will be re-fetched by the real-time subscription
    // Also mark as read since the user just sent a message
    markChatAsRead(activeChatId);
  }, [user?.id, activeChatId, markChatAsRead]);

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
    totalUnreadCount, // Esposto il conteggio totale
  };
}