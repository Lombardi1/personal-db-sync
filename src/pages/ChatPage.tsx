import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useChat } from '@/hooks/useChat';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Home, MessageSquare, PlusCircle, Trash2, Send, Loader2, ArrowLeft, UserPlus, Users } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { MultiSelectUsers } from '@/components/MultiSelectUsers';
import { EditChatParticipantsModal } from '@/components/modals/EditChatParticipantsModal';
import { CreateNamedChatModal } from '@/components/modals/CreateNamedChatModal';

export default function ChatPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { chatId: urlChatId } = useParams<{ chatId?: string }>();
  const { chats, messages, loadingChats, loadingMessages, activeChatId, setActiveChatId, createOrGetChat, sendMessage, deleteChat, allUsers, fetchChats, markChatAsRead, } = useChat(navigate);
  const [newMessageContent, setNewMessageContent] = useState('');
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [isCreateNamedChatModalOpen, setIsCreateNamedChatModalOpen] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [isDeleteChatAlertOpen, setIsDeleteChatAlertOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);
  const [isEditParticipantsModalOpen, setIsEditParticipantsModalOpen] = useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    // Se c'è un chatId nell'URL, impostalo come chat attiva
    if (urlChatId) {
      setActiveChatId(urlChatId);
    } else {
      // Se non c'è un chatId nell'URL, significa che vogliamo vedere l'elenco delle chat
      setActiveChatId(null);
    }
  }, [urlChatId, setActiveChatId]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessageContent.trim() && activeChatId) {
      await sendMessage(newMessageContent);
      setNewMessageContent('');
    }
  };

  const handleCreateNewChat = async () => {
    if (selectedParticipants.length === 0) {
      toast.error('Seleziona almeno un partecipante.');
      return;
    }
    await createOrGetChat(selectedParticipants);
    setIsNewChatModalOpen(false);
    setSelectedParticipants([]);
  };

  const handleDeleteChatClick = (chatId: string) => {
    setChatToDelete(chatId);
    setIsDeleteChatAlertOpen(true);
  };

  const handleConfirmDeleteChat = async () => {
    if (chatToDelete) {
      await deleteChat(chatToDelete);
      setChatToDelete(null);
      setIsDeleteChatAlertOpen(false);
      if (activeChatId === chatToDelete) {
        navigate('/chat', { replace: true });
      }
    }
  };

  const handleGoToDashboard = () => {
    if (user?.role === 'stampa') {
      navigate('/stampa-dashboard');
    } else {
      navigate('/summary');
    }
  };

  const handleEditParticipants = () => {
    setIsEditParticipantsModalOpen(true);
  };

  const handleParticipantsUpdated = () => {
    fetchChats();
    toast.success('Chat aggiornata!');
  };

  const handleCreateNamedChat = (chatId: string) => {
    setActiveChatId(chatId);
    navigate(`/chat/${chatId}`);
    fetchChats();
  };

  if (authLoading || loadingChats) {
    return (
      <div className="min-h-screen bg-[hsl(210,40%,96%)] flex items-center justify-center">
        <div className="text-lg text-[hsl(var(--muted-foreground))]">Caricamento chat...</div>
      </div>
    );
  }

  if (!user) {
    navigate('/login', { replace: true });
    return null;
  }

  const activeChat = chats.find(chat => chat.id === activeChatId);
  
  // Logic for truncated participant list
  const otherParticipants = activeChat?.participant_usernames?.filter(u => u !== user.username) || [];
  const displayParticipants = otherParticipants.slice(0, 2).join(', '); // Modificato da 3 a 2
  const remainingParticipantsCount = otherParticipants.length - 2; // Modificato da 3 a 2

  const chatTitle = activeChat 
    ? (activeChat.name || (otherParticipants.length > 0 ? displayParticipants : 'Chat')) 
    : 'Seleziona una chat';

  return (
    <div className="h-full bg-[hsl(210,40%,96%)] flex flex-col">
      <Header title="Chat" activeTab="chat" showUsersButton={true} />
      <div className="flex-1 flex max-w-[1400px] mx-auto w-full p-3 sm:p-5 md:px-8 gap-4 overflow-hidden min-h-0">
        {/* Sidebar Chat List */}
        {(!isMobile || !activeChatId) && (
          <div className="w-full md:w-1/3 lg:w-1/4 bg-white rounded-lg shadow-md border border-[hsl(var(--border))] flex flex-col h-full min-h-0">
            <div className="p-4 border-b border-[hsl(var(--border))] flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Le mie Chat
              </h2>
              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  onClick={() => setIsCreateNamedChatModalOpen(true)} 
                  className="gap-1"
                >
                  <PlusCircle className="h-4 w-4" />
                  Nuova
                </Button>
                {isMobile && !activeChatId && (
                  <Button onClick={handleGoToDashboard} variant="outline" size="icon" className="text-sm">
                    <Home className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <ScrollArea className="flex-1">
              {chats.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground p-4">Nessuna chat. Inizia una nuova!</p>
              ) : (
                chats.map(chat => (
                  <div 
                    key={chat.id} 
                    onClick={() => navigate(`/chat/${chat.id}`)}
                    className={cn(
                      "flex items-center justify-between p-3 border-b border-[hsl(var(--border))] cursor-pointer hover:bg-gray-50 transition-colors",
                      activeChatId === chat.id && "bg-blue-50 border-l-4 border-blue-600"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      {chat.name ? (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm truncate">
                              {chat.name}
                            </span>
                            <Users className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {chat.participant_usernames?.filter(u => u !== user.username).join(', ') || 'Nessun partecipante'}
                          </p>
                        </>
                      ) : (
                        <span className="font-semibold text-sm truncate">
                          {chat.participant_usernames?.filter(u => u !== user.username).join(', ') || 'Chat'}
                        </span>
                      )}
                      {chat.last_message_content && (
                        <p className="text-xs text-muted-foreground truncate">
                          {chat.last_message_content}
                        </p>
                      )}
                      {chat.last_message_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(chat.last_message_at), 'dd MMM HH:mm', { locale: it })}
                        </p>
                      )}
                    </div>
                    {chat.unread_count && chat.unread_count > 0 && (
                      <span className="bg-red-500 text-white text-xs font-bold rounded-full h-3 w-3 flex items-center justify-center ml-2 flex-shrink-0">
                        {/* Nessun numero, solo il pallino */}
                      </span>
                    )}
                    <Button variant="ghost" size="icon" onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteChatClick(chat.id);
                    }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))
              )}
            </ScrollArea>
          </div>
        )}

        {/* Main Chat Window */}
        {(!isMobile || activeChatId) && (
          <div className="flex-1 bg-white rounded-lg shadow-md border border-[hsl(var(--border))] flex flex-col h-full min-h-0">
            <div className="p-4 border-b border-[hsl(var(--border))] flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold truncate">{chatTitle}</h2>
                {activeChat?.name ? (
                  <p 
                    className="text-sm text-muted-foreground truncate cursor-pointer hover:underline"
                    onClick={handleEditParticipants}
                  >
                    {displayParticipants}
                    {remainingParticipantsCount > 0 && ` +${remainingParticipantsCount} altri`}
                  </p>
                ) : (
                  otherParticipants.length > 0 && (
                    <p 
                      className="text-sm text-muted-foreground truncate cursor-pointer hover:underline"
                      onClick={handleEditParticipants}
                    >
                      {displayParticipants}
                      {remainingParticipantsCount > 0 && ` +${remainingParticipantsCount} altri`}
                    </p>
                  )
                )}
              </div>
              <div className="flex items-center gap-2">
                {activeChatId && (
                  <Button onClick={handleEditParticipants} variant="outline" size="sm" className="text-sm gap-1">
                    <UserPlus className="h-4 w-4" />
                    <span className="hidden sm:inline">Partecipanti</span>
                  </Button>
                )}
                {isMobile && activeChatId && (
                  <Button 
                    onClick={() => {
                      setActiveChatId(null); // Clear the active chat
                      navigate('/chat'); // Go to the base chat URL
                    }} 
                    variant="outline" 
                    size="icon" 
                    className="text-sm"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                <Button onClick={handleGoToDashboard} variant="outline" size="icon" className="text-sm">
                  <Home className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {activeChatId ? (
              <>
                <ScrollArea className="flex-1 p-4 space-y-4">
                  {loadingMessages ? (
                    <div className="flex justify-center items-center h-full">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : messages.length === 0 ? (
                    <p className="text-center text-muted-foreground">Inizia la conversazione!</p>
                  ) : (
                    messages.map(msg => (
                      <div 
                        key={msg.id} 
                        className={cn(
                          "flex",
                          msg.sender_id === user.id ? "justify-end" : "justify-start"
                        )}
                      >
                        <div className={cn(
                          "max-w-[80%] p-3 rounded-lg",
                          msg.sender_id === user.id 
                            ? "bg-blue-600 text-white rounded-br-none" 
                            : "bg-gray-200 text-gray-800 rounded-bl-none"
                        )}>
                          <p className="font-semibold text-xs mb-1">
                            {msg.sender_username || 'Sconosciuto'}
                          </p>
                          <p className="text-sm break-words">{msg.content}</p>
                          <p className="text-xs mt-1 opacity-75">
                            {format(new Date(msg.created_at), 'HH:mm', { locale: it })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </ScrollArea>
                <form onSubmit={handleSendMessage} className="p-4 border-t border-[hsl(var(--border))] flex gap-2">
                  <Input 
                    value={newMessageContent} 
                    onChange={(e) => setNewMessageContent(e.target.value)} 
                    placeholder="Scrivi un messaggio..." 
                    className="flex-1" 
                    disabled={loadingMessages}
                  />
                  <Button type="submit" disabled={loadingMessages || !newMessageContent.trim()}>
                    <Send className="h-5 w-5" />
                  </Button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <p>Seleziona una chat o creane una nuova.</p>
              </div>
            )}
          </div>
        )}

        {/* New Chat Modal (Legacy) */}
        <Dialog open={isNewChatModalOpen} onOpenChange={setIsNewChatModalOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Crea Nuova Chat</DialogTitle>
              <DialogDescription>
                Seleziona gli utenti con cui vuoi iniziare una nuova chat.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <MultiSelectUsers 
                options={allUsers} 
                selected={selectedParticipants} 
                onSelectionChange={setSelectedParticipants}
                currentUser={user}
                placeholder="Seleziona partecipanti..."
                disabled={false}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNewChatModalOpen(false)}>Annulla</Button>
              <Button onClick={handleCreateNewChat}>Crea Chat</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Named Chat Modal */}
        <CreateNamedChatModal
          isOpen={isCreateNamedChatModalOpen}
          onClose={() => setIsCreateNamedChatModalOpen(false)}
          allUsers={allUsers}
          onCreateChat={handleCreateNamedChat}
        />

        {/* Edit Participants Modal */}
        {activeChat && (
          <EditChatParticipantsModal
            isOpen={isEditParticipantsModalOpen}
            onClose={() => setIsEditParticipantsModalOpen(false)}
            chatId={activeChat.id}
            currentParticipants={activeChat.participant_ids}
            currentName={activeChat.name}
            onParticipantsUpdated={handleParticipantsUpdated}
            allUsers={allUsers} 
          />
        )}

        {/* Delete Chat Alert Dialog */}
        <AlertDialog open={isDeleteChatAlertOpen} onOpenChange={setIsDeleteChatAlertOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Conferma Eliminazione Chat</AlertDialogTitle>
              <AlertDialogDescription>
                Sei sicuro di voler eliminare questa chat? Questa azione non può essere annullata.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <DialogFooter>
              <AlertDialogCancel>Annulla</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDeleteChat} className="bg-destructive hover:bg-destructive/90">
                Elimina
              </AlertDialogAction>
            </DialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}