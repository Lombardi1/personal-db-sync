import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Chat, Message } from '@/types';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import { NavigateFunction } from 'react-router-dom';

// Helper function to fetch all users
const fetchAllUsers = async (setAllUsers: React.Dispatch<React.SetStateAction<{ id: string; username: string }[]>>) => {
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
};

// Helper function to request notification permission
const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.warn('Browser does not support desktop notifications.');
    return;
  }
  
  if (Notification.permission === 'default') {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        console.log('Desktop notification permission granted.');
      } else {
        console.warn('Desktop notification permission denied.');
        toast.info('Le notifiche desktop sono state bloccate. Puoi abilitarle dalle impostazioni del browser.');
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  } else if (Notification.permission === 'denied') {
    console.warn('Desktop notification permission already denied.');
  }
};

// Helper function to fetch chats for a user (optimized unread count)
const fetchUserChats = async (
  userId: string,
  allUsers: { id: string; username: string }[],
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>,
  setTotalUnreadCount: React.Dispatch<React.SetStateAction<number>>,
  setLoadingChats: React.Dispatch<React.SetStateAction<boolean>>
) => {
  if (!userId) return;
  
  setLoadingChats(true);
  
  try {
    const { data: chatsData, error: chatsError } = await supabase
      .from('chats')
      .select(`id, created_at, participant_ids, last_message_content, last_message_at, name`)
      .contains('participant_ids', [userId])
      .order('last_message_at', { ascending: false, nullsFirst: false });
    
    if (chatsError) {
      throw new Error(`Error fetching chats: ${chatsError.message}`);
    }
    
    const chatIds = (chatsData || []).map(chat => chat.id);
    const { data: userChatStatusData, error: statusError } = await supabase
      .from('user_chat_status')
      .select('chat_id, last_read_at')
      .eq('user_id', userId)
      .in('chat_id', chatIds);
    
    if (statusError) {
      console.error('Error fetching user chat status:', statusError);
    }
    
    const userChatStatusMap = new Map(
      (userChatStatusData || []).map(status => [status.chat_id, status.last_read_at])
    );
    
    let currentTotalUnread = 0;
    
    const chatsWithUsernames: Chat[] = (chatsData || []).map((chat) => { // Removed async here
      const participantUsernames = chat.participant_ids.map((pId: string) => {
        const foundUser = allUsers.find(u => u.id === pId);
        return foundUser?.username || 'Sconosciuto';
      });
      
      const lastReadAt = userChatStatusMap.get(chat.id);
      
      let hasUnread = false;
      if (chat.last_message_at) {
        const lastMessageDate = new Date(chat.last_message_at);
        const lastReadDate = lastReadAt ? new Date(lastReadAt) : new Date(0); // If never read, treat as very old
        if (lastMessageDate > lastReadDate) {
          hasUnread = true;
        }
      } else if (!lastReadAt) { // If no messages yet, but also never read, consider it potentially unread if a message comes later
          // This case is tricky. For now, if no last_message_at, it's not unread.
      }
      
      if (hasUnread) {
        currentTotalUnread++; // Count chats with unread messages
      }
      
      return {
        ...chat,
        participant_usernames: participantUsernames,
        unread_count: hasUnread ? 1 : 0 // Set to 1 if unread, 0 otherwise
      };
    });
    
    setChats(chatsWithUsernames);
    setTotalUnreadCount(currentTotalUnread);
  } catch (error: any) {
    console.error('Error in fetchUserChats:', error);
    toast.error('Errore nel caricamento delle chat.');
  } finally {
    setLoadingChats(false);
  }
};

// Helper function to fetch messages for a chat
const fetchChatMessages = async (
  chatId: string,
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  setLoadingMessages: React.Dispatch<React.SetStateAction<boolean>>
) => {
  setLoadingMessages(true);
  
  try {
    const { data, error } = await supabase
      .from('messages')
      .select(`*, app_users(username)`)
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });
    
    if (error) {
      throw new Error(`Error fetching messages: ${error.message}`);
    }
    
    const messagesWithUsernames: Message[] = (data || []).map(msg => ({
      ...msg,
      sender_username: (msg as any).app_users?.username || 'Sconosciuto'
    }));
    
    setMessages(messagesWithUsernames);
  } catch (error: any) {
    console.error('Error in fetchChatMessages:', error);
    toast.error('Errore nel caricamento dei messaggi.');
  } finally {
    setLoadingMessages(false);
  }
};

// Helper function to mark a chat as read
const markChatAsRead = async (
  chatId: string,
  userId: string,
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>,
  setTotalUnreadCount: React.Dispatch<React.SetStateAction<number>>,
  fetchChats: () => Promise<void>
) => {
  if (!userId) return;
  
  // Optimistic UI update
  setChats(prevChats => {
    const updatedChats = prevChats.map(chat => {
      if (chat.id === chatId && chat.unread_count && chat.unread_count > 0) {
        setTotalUnreadCount(prevTotal => prevTotal - chat.unread_count!);
        return {
          ...chat,
          unread_count: 0
        };
      }
      return chat;
    });
    return updatedChats;
  });
  
  try {
    const { error } = await supabase
      .from('user_chat_status')
      .upsert(
        {
          user_id: userId,
          chat_id: chatId,
          last_read_at: new Date().toISOString()
        },
        { onConflict: 'user_id,chat_id' }
      );
    
    if (error) {
      throw new Error(`Error marking chat as read: ${error.message}`);
    }
  } catch (error: any) {
    console.error('Error in markChatAsRead:', error);
    toast.error('Errore nell\'aggiornamento dello stato di lettura.');
    // Fallback to full fetch if optimistic update fails
    await fetchChats();
  }
};

// Helper function to send a message
const sendMessage = async (
  content: string,
  chatId: string | null,
  userId: string,
  markChatAsRead: (chatId: string) => Promise<void>
) => {
  if (!userId || !chatId || !content.trim()) {
    toast.error('Impossibile inviare un messaggio vuoto o senza chat attiva.');
    return;
  }
  
  try {
    console.log('[useChat] sendMessage: Attempting to send message:', {
      chat_id: chatId,
      sender_id: userId,
      content: content.trim()
    });
    
    const { error: insertMessageError } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        sender_id: userId,
        content: content.trim()
      });
    
    if (insertMessageError) {
      throw new Error(`Error sending message: ${insertMessageError.message}`);
    }
    
    // Update last_message_content and last_message_at in the chat
    const { error: updateChatError } = await supabase
      .from('chats')
      .update({
        last_message_content: content.trim(),
        last_message_at: new Date().toISOString()
      })
      .eq('id', chatId);
    
    if (updateChatError) {
      throw new Error(`Error updating chat last message: ${updateChatError.message}`);
    }
    
    // Messages will be re-fetched by the real-time subscription
    // Also mark as read since the user just sent a message
    await markChatAsRead(chatId);
  } catch (error: any) {
    console.error('Error in sendMessage:', error);
    toast.error('Errore nell\'invio del messaggio.');
  }
};

// Helper function to delete a chat
const deleteChat = async (
  chatId: string,
  userId: string,
  activeChatId: string | null,
  setActiveChatId: React.Dispatch<React.SetStateAction<string | null>>,
  fetchChats: () => Promise<void>
) => {
  if (!userId) {
    toast.error('Devi essere loggato per eliminare una chat.');
    return;
  }
  
  try {
    const { error } = await supabase
      .from('chats')
      .delete()
      .eq('id', chatId);
    
    if (error) {
      throw new Error(`Error deleting chat: ${error.message}`);
    }
    
    if (activeChatId === chatId) {
      setActiveChatId(null);
    }
    
    toast.success('Chat eliminata con successo!');
    await fetchChats();
  } catch (error: any) {
    console.error('Error in deleteChat:', error);
    toast.error('Errore nell\'eliminazione della chat.');
  }
};

export function useChat(navigate: NavigateFunction) {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<{ id: string; username: string }[]>([]);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);

  const fetchAllUsersMemoized = useCallback(async () => {
    const users = await fetchAllUsers(setAllUsers);
    return users;
  }, []);

  const fetchChats = useCallback(async () => {
    const currentAllUsers = await fetchAllUsersMemoized(); // Ensure allUsers is fresh
    await fetchUserChats(user?.id || '', currentAllUsers, setChats, setTotalUnreadCount, setLoadingChats);
  }, [user?.id, fetchAllUsersMemoized]);

  const fetchMessages = useCallback(async (chatId: string) => {
    await fetchChatMessages(chatId, setMessages, setLoadingMessages);
  }, []);

  const handleMarkChatAsRead = useCallback(async (chatId: string) => {
    await markChatAsRead(chatId, user?.id || '', setChats, setTotalUnreadCount, fetchChats);
  }, [user?.id, fetchChats]);

  // Moved createOrGetChat logic inside the hook as handleCreateOrGetChat
  const handleCreateOrGetChat = useCallback(async (participantIds: string[]) => {
    if (!user?.id) {
      toast.error('Devi essere loggato per creare una chat.');
      return null;
    }
    
    const allParticipants = Array.from(new Set([...participantIds, user.id])).sort();
    
    try {
      // Check for existing chat with these participants
      const { data: existingChats, error: searchError } = await supabase
        .from('chats')
        .select('id, participant_ids')
        .contains('participant_ids', allParticipants)
        .limit(1);
      
      if (searchError) {
        throw new Error(`Error searching for existing chat: ${searchError.message}`);
      }
      
      if (existingChats && existingChats.length > 0) {
        const foundChat = existingChats.find(chat => 
          chat.participant_ids.length === allParticipants.length && 
          chat.participant_ids.every((id, index) => id === allParticipants[index])
        );
        
        if (foundChat) {
          setActiveChatId(foundChat.id);
          toast.info('Chat esistente aperta.');
          await handleMarkChatAsRead(foundChat.id);
          return foundChat.id;
        }
      }
      
      // If no existing chat, create a new one
      console.log('[useChat] handleCreateOrGetChat: Attempting to create chat with participants:', allParticipants, 'by user ID:', user.id);
      const { data: newChat, error: createError } = await supabase
        .from('chats')
        .insert({ participant_ids: allParticipants })
        .select()
        .single();
      
      if (createError) {
        throw new Error(`Error creating new chat: ${createError.message}`);
      }
      
      setActiveChatId(newChat.id);
      toast.success('Nuova chat creata!');
      await handleMarkChatAsRead(newChat.id);
      await fetchChats();
      return newChat.id;
    } catch (error: any) {
      console.error('Error in handleCreateOrGetChat:', error);
      toast.error('Errore nella creazione della nuova chat.');
      return null;
    }
  }, [user?.id, setActiveChatId, handleMarkChatAsRead, fetchChats]);

  const handleSendMessage = useCallback(async (content: string) => {
    await sendMessage(content, activeChatId, user?.id || '', handleMarkChatAsRead);
  }, [activeChatId, user?.id, handleMarkChatAsRead]);

  const handleDeleteChat = useCallback(async (chatId: string) => {
    await deleteChat(chatId, user?.id || '', activeChatId, setActiveChatId, fetchChats);
  }, [user?.id, activeChatId, setActiveChatId, fetchChats]);


  useEffect(() => {
    if (user?.id) {
      requestNotificationPermission();
    }
  }, [user?.id]);

  // Initial fetch of all users and chats
  useEffect(() => {
    if (user?.id) {
      fetchAllUsersMemoized(); // Fetch all users once on mount
      fetchChats(); // Initial fetch of chats
    }
  }, [user?.id, fetchAllUsersMemoized, fetchChats]);


  // Global chats real-time channel for new chats or participant changes
  useEffect(() => {
    if (!user?.id) {
      console.log('[useChat useEffect] User ID is not available, skipping chat channel setup.');
      return;
    }
    
    console.log(`[useChat useEffect] Setting up chat channel for user: ${user.id}`);
    
    const chatChannel = supabase
      .channel('chats-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chats',
          filter: `participant_ids.ov.{"${user.id}"}`
        },
        async (payload) => {
          console.log('--- Real-time chat change received! ---', payload);
          
          // If a chat is inserted or deleted, or participants change, re-fetch all chats
          if (
            payload.eventType === 'INSERT' ||
            payload.eventType === 'DELETE' ||
            (payload.eventType === 'UPDATE' && 
              ((payload as any).old as Chat).participant_ids !== ((payload as any).new as Chat).participant_ids)
          ) {
            fetchChats();
          } else if (payload.eventType === 'UPDATE') {
            // For updates that are just last_message_content/last_message_at,
            // update the chat list's last message content/time locally.
            const updatedChat = (payload as any).new as Chat;
            setChats(prevChats => prevChats.map(chat => 
              chat.id === updatedChat.id ? {
                ...chat,
                last_message_content: updatedChat.last_message_content,
                last_message_at: updatedChat.last_message_at
              } : chat
            ));
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(chatChannel);
    };
  }, [user?.id, fetchChats, activeChatId]); // Removed allUsers from dependencies as it's now handled by fetchChats

  // Active chat messages real-time channel
  useEffect(() => {
    if (activeChatId) {
      fetchMessages(activeChatId);
      handleMarkChatAsRead(activeChatId); // Mark as read when active chat changes
      
      const messageChannel = supabase
        .channel(`messages-chat-${activeChatId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
            filter: `chat_id=eq.${activeChatId}`
          },
          (payload) => {
            console.log('Message change received!', payload);
            fetchMessages(activeChatId); // Re-fetch messages for the active chat
            handleMarkChatAsRead(activeChatId); // Mark as read on new message
          }
        )
        .subscribe();
      
      return () => {
        supabase.removeChannel(messageChannel);
      };
    } else {
      setMessages([]); // Clear messages if no active chat
    }
  }, [activeChatId, fetchMessages, handleMarkChatAsRead]);

  // Global message channel for notifications
  useEffect(() => {
    if (!user?.id) return;
    
    const globalMessageChannel = supabase
      .channel('global-messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        async (payload) => {
          const newMessage = (payload as any).new as Message;
          console.log('Global message INSERT received:', newMessage);
          
          // Check if the message is for the current user
          const currentChat = chats.find(chat => chat.id === newMessage.chat_id);
          const isCurrentUserParticipant = currentChat?.participant_ids.includes(user.id);
          
          // Only show notification if:
          // 1. The message is from another user
          // 2. The current user is a participant in the chat
          // 3. The chat is not the active chat (to avoid duplicate notifications)
          if (
            newMessage.sender_id !== user.id &&
            isCurrentUserParticipant &&
            newMessage.chat_id !== activeChatId
          ) {
            // Update unread count for the specific chat
            setChats(prevChats => {
              const updatedChats = prevChats.map(chat => {
                if (chat.id === newMessage.chat_id) {
                  const newUnreadCount = 1; // Just mark as 1 (unread)
                  setTotalUnreadCount(prevTotal => prevTotal + 1); // Increment total unread chats
                  return {
                    ...chat,
                    last_message_content: newMessage.content,
                    last_message_at: newMessage.created_at,
                    unread_count: newUnreadCount
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
            
            // --- NEW: Desktop Notification Logic ---
            if ('Notification' in window && Notification.permission === 'granted') {
              const notificationTitle = `Nuovo messaggio da ${senderUsername}`;
              const notificationOptions: NotificationOptions = {
                body: newMessage.content,
                icon: '/favicon.png', // Path to your app's icon
                tag: newMessage.chat_id, // Group notifications by chat
                renotify: true // Show new notification even if one exists for this tag
              };
              
              const notification = new Notification(notificationTitle, notificationOptions);
              notification.onclick = () => {
                window.focus(); // Bring the browser window to front
                navigate(`/chat/${newMessage.chat_id}`); // Navigate to the specific chat
                notification.close(); // Close the notification
              };
            } else {
              // Fallback to in-app toast if desktop notifications are not granted/supported
              toast.info(`${senderUsername}: ${newMessage.content}`, {
                duration: 5000,
                position: 'top-left',
                action: {
                  label: 'Apri Chat',
                  onClick: () => {
                    navigate(`/chat/${newMessage.chat_id}`);
                  }
                }
              });
            }
          } else if (
            newMessage.sender_id !== user.id &&
            isCurrentUserParticipant &&
            newMessage.chat_id === activeChatId
          ) {
            // If it's for the active chat, update messages and mark as read
            fetchMessages(activeChatId);
            handleMarkChatAsRead(activeChatId); // This will also update totalUnreadCount locally
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(globalMessageChannel);
    };
  }, [user?.id, activeChatId, fetchMessages, handleMarkChatAsRead, allUsers, navigate, chats]);

  return {
    chats,
    messages,
    loadingChats,
    loadingMessages,
    activeChatId,
    setActiveChatId,
    createOrGetChat: handleCreateOrGetChat, // Correctly reference the useCallback function
    sendMessage: handleSendMessage,
    deleteChat: handleDeleteChat,
    allUsers,
    fetchChats,
    totalUnreadCount,
    markChatAsRead: handleMarkChatAsRead
  };
}