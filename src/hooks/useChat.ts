import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Chat, Message } from '@/types';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import { NavigateFunction } from 'react-router-dom'; // Import NavigateFunction type

export function useChat(navigate: NavigateFunction) { // Accept navigate as a parameter
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
        currentTotalUnread += unreadCount; // Correzione qui: somma il numero di messaggi non letti
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

    // Optimistic UI update
    setChats(prevChats => {
        const updatedChats = prevChats.map(chat => {
            if (chat.id === chatId && chat.unread_count && chat.unread_count > 0) {
                setTotalUnreadCount(prevTotal => prevTotal - chat.unread_count!);
                return { ...chat, unread_count: 0 };
            }
            return chat;
        });
        return updatedChats;
    });

    const { error } = await supabase
      .from('user_chat_status')
      .upsert(
        { user_id: user.id, chat_id: chatId, last_read_at: new Date().toISOString() },
        { onConflict: 'user_id,chat_id' }
      );

    if (error) {
      console.error('Error marking chat as read:', error);
      toast.error('Errore nell\'aggiornamento dello stato di lettura.');
      // Fallback to full fetch if optimistic update fails
      fetchChats(); 
    }
  }, [user?.id, fetchChats]);

  useEffect(() => {
    fetchAllUsers();
  }, [fetchAllUsers]);

  // Global messages real-time channel for new messages
  useEffect(() => {
    if (!user?.id) return;

    const globalMessageChannel = supabase
        .channel('global-messages-realtime')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
            const newMessage = payload.new as Message;
            console.log('Global message INSERT received:', newMessage);

            // If the message is from another user
            if (newMessage.sender_id !== user.id) {
                // If it's for the active chat, update messages and mark as read
                if (newMessage.chat_id === activeChatId) {
                    fetchMessages(activeChatId);
                    markChatAsRead(activeChatId); // This will also update totalUnreadCount locally
                } else {
                    // If it's for a non-active chat, update unread count locally and show toast
                    setChats(prevChats => {
                        const updatedChats = prevChats.map(chat => {
                            if (chat.id === newMessage.chat_id) {
                                const newUnreadCount = (chat.unread_count || 0) + 1;
                                setTotalUnreadCount(prevTotal => prevTotal + 1);
                                return {
                                    ...chat,
                                    last_message_content: newMessage.content,
                                    last_message_at: newMessage.created_at,
                                    unread_count: newUnreadCount,
                                };
                            }
                            return chat;
                        });
                        // If the chat is not in the current list (e.g., new chat created by other user)
                        // We might need to re-fetch chats fully. For now, assume it's in the list.
                        return updatedChats;
                    });

                    const sender = allUsers.find(u => u.id === newMessage.sender_id);
                    const senderUsername = sender?.username || 'Sconosciuto';
                    toast.info(`${senderUsername}: ${newMessage.content}`, {
                        duration: 5000,
                        position: 'top-left',
                        action: {
                            label: 'Apri Chat',
                            onClick: () => {
                                navigate(`/chat/${newMessage.chat_id}`);
                            },
                        },
                    });
                }
            }
        })
        .subscribe();

    return () => {
        supabase.removeChannel(globalMessageChannel);
    };
}, [user?.id, activeChatId, fetchMessages, markChatAsRead, allUsers, navigate]);

  useEffect(() => {
    if (!user?.id) {
      console.log('[useChat useEffect] User ID is not available, skipping chat channel setup.');
      return;
    }

    console.log(`[useChat useEffect] Setting up chat channel for user: ${user.id}`);
    fetchChats(); // Initial fetch

    const chatChannel = supabase
      .channel('chats-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats', filter: `participant_ids.ov.{"${user.id}"}` }, async (payload) => {
          console.log('--- Real-time chat change received! ---', payload);
          
          // If a chat is inserted or deleted, or participants change, re-fetch all chats
          if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE' || (payload.eventType === 'UPDATE' && (payload.old as Chat).participant_ids !== (payload.new as Chat).participant_ids)) {
              fetchChats();
          } else if (payload.eventType === 'UPDATE') {
              // For updates that are just last_message_content/last_message_at,
              // update the chat list's last message content/time locally.
              const updatedChat = payload.new as Chat;
              setChats(prevChats => prevChats.map(chat => 
                  chat.id === updatedChat.id 
                      ? { ...chat, last_message_content: updatedChat.last_message_content, last_message_at: updatedChat.last_message_at } 
                      : chat
              ));
          }
          // Removed toast logic from here, globalMessageChannel handles it.
      })
      .subscribe();

    return () => { // This cleanup function is now correctly outside the 'if' block
      supabase.removeChannel(chatChannel);
    };
  }, [user?.id, fetchChats, activeChatId, allUsers, navigate]); // Add navigate to dependencies

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
    const { error: insertMessageError } = await supabase
      .from('messages')
      .insert({ chat_id: activeChatId, sender_id: user.id, content: content.trim() });

    if (insertMessageError) {
      console.error('Error sending message:', insertMessageError);
      console.error('Supabase send message error details:', JSON.stringify(insertMessageError, null, 2));
      toast.error('Errore nell\'invio del messaggio.');
      return;
    }

    // Update last_message_content and last_message_at in the chat
    const { error: updateChatError } = await supabase
      .from('chats')
      .update({ last_message_content: content.trim(), last_message_at: new Date().toISOString() })
      .eq('id', activeChatId);

    if (updateChatError) {
      console.error('Error updating chat last message:', updateChatError);
      toast.error('Errore nell\'aggiornamento della chat.');
      return;
    }

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