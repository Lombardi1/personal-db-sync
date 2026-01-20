import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Chat, Message } from '@/types';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import { NavigateFunction } from 'react-router-dom';
import { Howl } from 'howler'; // Import Howl for audio playback

// Define the ringtone sound
const ringtone = new Howl({
  src: ['/ringtone.mp3'], // Path to your ringtone file in the public folder
  loop: true,
  volume: 0.8,
  html5: true, // Use HTML5 Audio to avoid Web Audio API limitations on some devices
});

// Add error listeners for debugging
ringtone.on('loaderror', (id, error) => {
  console.error('Howler.js Load Error:', error);
  toast.error('Errore nel caricamento del file audio: ' + error.message);
});

ringtone.on('playerror', (id, error) => {
  console.error('Howler.js Play Error:', error);
  toast.error('Errore nella riproduzione dell\'audio: ' + error.message + '. Potrebbe essere bloccato dalle politiche di autoplay del browser. Interagisci con la pagina per abilitare l\'audio.');
});

let ringtoneTimeout: NodeJS.Timeout | null = null;

const playRingtone = () => {
  if (!ringtone.playing()) {
    try {
      ringtone.play();
      ringtoneTimeout = setTimeout(() => {
        ringtone.stop();
        toast.info('La chiamata è terminata.');
      }, 30000); // Stop ringing after 30 seconds
    } catch (e: any) {
      console.error('Attempt to play ringtone failed:', e);
      toast.error('Impossibile riprodurre lo squillo. Potrebbe essere bloccato dalle politiche di autoplay del browser. Interagisci con la pagina per abilitare l\'audio.');
    }
  }
};

const stopRingtone = () => {
  ringtone.stop();
  if (ringtoneTimeout) {
    clearTimeout(ringtoneTimeout);
    ringtoneTimeout = null;
  }
};

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

// Helper function to fetch chats for a user
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
    // 1. Fetch chats relevant to the current user
    const { data: chatsData, error: chatsError } = await supabase
      .from('chats')
      .select(`id, created_at, participant_ids, last_message_content, last_message_at, name`)
      .contains('participant_ids', [userId])
      .order('last_message_at', { ascending: false, nullsFirst: false });
    
    if (chatsError) {
      throw new Error(`Error fetching chats: ${chatsError.message}`);
    }
    
    // 2. Fetch user_chat_status for the current user for all fetched chats
    const chatIds = (chatsData || []).map(chat => chat.id);
    const { data: userChatStatusData, error: statusError } = await supabase
      .from('user_chat_status')
      .select('chat_id, last_read_at')
      .eq('user_id', userId)
      .in('chat_id', chatIds);
    
    if (statusError) {
      console.error('Error fetching user chat status:', statusError);
      // Don't block, proceed with potentially missing status
    }
    
    const userChatStatusMap = new Map(
      (userChatStatusData || []).map(status => [status.chat_id, status.last_read_at])
    );
    
    let currentTotalUnread = 0;
    
    const chatsWithUsernames: Chat[] = await Promise.all(
      (chatsData || []).map(async (chat) => {
        const participantUsernames = await Promise.all(
          chat.participant_ids.map(async (pId: string) => {
            const foundUser = allUsers.find(u => u.id === pId);
            if (foundUser) return foundUser.username;
            
            const { data: userData, error: userError } = await supabase
              .from('app_users')
              .select('username')
              .eq('id', pId)
              .single();
            
            return userData?.username || 'Sconosciuto';
          })
        );
        
        // Get last_read_at for the current user from the map
        const lastReadAt = userChatStatusMap.get(chat.id);
        
        let unreadCount = 0;
        if (chat.last_message_content !== '__CALL_INITIATED__' && chat.last_message_at) { // Exclude call initiation messages from unread count
          if (lastReadAt) {
            const lastMessageDate = new Date(chat.last_message_at);
            const lastReadDate = new Date(lastReadAt);
            if (lastMessageDate > lastReadDate) {
              const { count, error: countError } = await supabase
                .from('messages')
                .select('id', { count: 'exact' })
                .eq('chat_id', chat.id)
                .gt('created_at', lastReadAt)
                .neq('sender_id', userId)
                .neq('content', '__CALL_INITIATED__'); // Exclude call initiation messages
              
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
              .neq('sender_id', userId)
              .neq('content', '__CALL_INITIATED__'); // Exclude call initiation messages
            
            if (countError) {
              console.error('Error counting unread messages (no last_read_at):', countError);
            } else {
              unreadCount = count || 0;
            }
          }
        }
        
        if (unreadCount > 0) {
          currentTotalUnread += unreadCount;
        }
        
        return {
          ...chat,
          participant_usernames: participantUsernames,
          unread_count: unreadCount
        };
      })
    );
    
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

// Helper function to create or get a chat
const createOrGetChat = async (
  participantIds: string[],
  userId: string,
  setActiveChatId: React.Dispatch<React.SetStateAction<string | null>>,
  markChatAsRead: (chatId: string) => Promise<void>,
  fetchChats: () => Promise<void>,
  navigate: NavigateFunction
) => {
  if (!userId) {
    toast.error('Devi essere loggato per creare una chat.');
    return null;
  }
  
  const allParticipants = Array.from(new Set([...participantIds, userId])).sort();
  
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
        await markChatAsRead(foundChat.id);
        return foundChat.id;
      }
    }
    
    // If no existing chat, create a new one
    console.log('[useChat] createOrGetChat: Attempting to create chat with participants:', allParticipants, 'by user ID:', userId);
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
    await markChatAsRead(newChat.id);
    await fetchChats();
    return newChat.id;
  } catch (error: any) {
    console.error('Error in createOrGetChat:', error);
    toast.error('Errore nella creazione della nuova chat.');
    return null;
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

  const fetchChats = useCallback(async () => {
    await fetchUserChats(user?.id || '', allUsers, setChats, setTotalUnreadCount, setLoadingChats);
  }, [user?.id, allUsers]);

  const fetchMessages = useCallback(async (chatId: string) => {
    await fetchChatMessages(chatId, setMessages, setLoadingMessages);
  }, []);

  const handleMarkChatAsRead = useCallback(async (chatId: string) => {
    await markChatAsRead(chatId, user?.id || '', setChats, setTotalUnreadCount, fetchChats);
  }, [user?.id, fetchChats]);

  useEffect(() => {
    if (user?.id) {
      requestNotificationPermission();
    }
  }, [user?.id]);

  useEffect(() => {
    fetchAllUsers(setAllUsers);
  }, []);

  // Global chats real-time channel for new chats or chat updates
  useEffect(() => {
    if (!user?.id) {
      console.log('[useChat useEffect] User ID is not available, skipping chat channel setup.');
      return;
    }
    
    console.log(`[useChat useEffect] Setting up chat channel for user: ${user.id}`);
    fetchChats(); // Initial fetch
    
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
  }, [user?.id, fetchChats, activeChatId, allUsers, navigate]);

  // Add navigate to dependencies
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

  const handleCreateOrGetChat = useCallback(async (participantIds: string[]) => {
    return await createOrGetChat(
      participantIds,
      user?.id || '',
      setActiveChatId,
      handleMarkChatAsRead,
      fetchChats,
      navigate
    );
  }, [user?.id, handleMarkChatAsRead, fetchChats, navigate]);

  const handleSendMessage = useCallback(async (content: string) => {
    await sendMessage(content, activeChatId, user?.id || '', handleMarkChatAsRead);
  }, [activeChatId, user?.id, handleMarkChatAsRead]);

  const handleDeleteChat = useCallback(async (chatId: string) => {
    await deleteChat(chatId, user?.id || '', activeChatId, setActiveChatId, fetchChats);
  }, [user?.id, activeChatId, fetchChats]);

  // NEW: Function to initiate a "call"
  const initiateCall = useCallback(async (chatId: string) => {
    if (!user?.id) {
      toast.error('Devi essere loggato per avviare una chiamata.');
      return;
    }
    if (!chatId) {
      toast.error('Seleziona una chat per avviare una chiamata.');
      return;
    }

    // Send a special message to indicate a call initiation
    await sendMessage('__CALL_INITIATED__', chatId, user.id, handleMarkChatAsRead);
    toast.info('Chiamata avviata. In attesa di risposta...');
  }, [user?.id, handleMarkChatAsRead, sendMessage]);

  // Global message channel for notifications and call handling
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
          
          // Handle call initiation messages
          if (newMessage.content === '__CALL_INITIATED__' && newMessage.sender_id !== user.id && isCurrentUserParticipant) {
            if (newMessage.chat_id === activeChatId) {
              // If already in the chat, just show a subtle toast
              const sender = allUsers.find(u => u.id === newMessage.sender_id);
              const senderUsername = sender?.username || 'Sconosciuto';
              toast.info(`${senderUsername} ti sta chiamando...`, {
                duration: 5000,
                position: 'top-center',
              });
            } else {
              // Play ringtone and show notification for incoming call
              playRingtone();
              const sender = allUsers.find(u => u.id === newMessage.sender_id);
              const senderUsername = sender?.username || 'Sconosciuto';
              
              const handleAnswer = () => {
                stopRingtone();
                navigate(`/chat/${newMessage.chat_id}`);
                toast.dismiss('incoming-call-toast');
              };

              const handleDismiss = () => {
                  stopRingtone();
                  toast.dismiss('incoming-call-toast');
              };

              // Desktop Notification
              if ('Notification' in window && Notification.permission === 'granted') {
                const notificationTitle = `Chiamata in arrivo da ${senderUsername}`;
                const notificationOptions: NotificationOptions = {
                  body: 'Tocca per rispondere',
                  icon: '/favicon.png',
                  tag: 'incoming-call',
                  renotify: true,
                  silent: true, // Let Howler manage the sound
                };
                
                const notification = new Notification(notificationTitle, notificationOptions);
                notification.onclick = handleAnswer;
                
                // Add a dismiss button to the notification (not directly supported by standard API, but some browsers might offer it)
                // For more control, a custom notification UI would be needed.
              }

              // Sonner Toast Notification
              toast.info(`Chiamata in arrivo da ${senderUsername}`, {
                id: 'incoming-call-toast',
                duration: 30000, // Ring for 30 seconds
                position: 'top-center',
                action: {
                  label: 'Rispondi',
                  onClick: handleAnswer,
                },
                cancel: {
                  label: 'Rifiuta',
                  onClick: handleDismiss,
                },
                onDismiss: handleDismiss, // Ensure ringtone stops if toast is dismissed manually
                onAutoClose: handleDismiss, // Ensure ringtone stops if toast auto-closes
              });
            }
          } 
          // Handle regular messages
          else if (
            newMessage.sender_id !== user.id &&
            isCurrentUserParticipant &&
            newMessage.content !== '__CALL_INITIATED__' // Exclude call initiation messages
          ) {
            // Update unread count for the specific chat
            setChats(prevChats => {
              const updatedChats = prevChats.map(chat => {
                if (chat.id === newMessage.chat_id) {
                  const newUnreadCount = (chat.unread_count || 0) + 1;
                  setTotalUnreadCount(prevTotal => prevTotal + 1);
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
            newMessage.chat_id === activeChatId &&
            newMessage.content !== '__CALL_INITIATED__' // Exclude call initiation messages
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
      stopRingtone(); // Ensure ringtone stops on unmount
    };
  }, [user?.id, activeChatId, fetchMessages, handleMarkChatAsRead, allUsers, navigate, chats]);

  return {
    chats,
    messages,
    loadingChats,
    loadingMessages,
    activeChatId,
    setActiveChatId,
    createOrGetChat: handleCreateOrGetChat,
    sendMessage: handleSendMessage,
    deleteChat: handleDeleteChat,
    allUsers,
    fetchChats,
    totalUnreadCount,
    markChatAsRead: handleMarkChatAsRead,
    initiateCall, // NEW: Expose initiateCall
  };
}