import { useState } from 'react';
import { useChat } from '@/hooks/useChat';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatWindow } from './ChatWindow';
import { MessageCircle, X } from 'lucide-react';

export function ChatSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeChat, setActiveChat] = useState<{id: string, username: string} | null>(null);
  const { destinatari, messaggi } = useChat();
  
  const toggleSidebar = () => setIsOpen(!isOpen);
  
  const startChat = (destinatario: {id: string, username: string}) => {
    setActiveChat(destinatario);
  };
  
  const closeChat = () => {
    setActiveChat(null);
  };
  
  // Conta i messaggi non letti per ogni destinatario
  const unreadCount = (destinatarioId: string) => {
    return messaggi.filter(
      m => m.mittente_id === destinatarioId && !m.letto
    ).length;
  };
  
  return (
    <>
      {/* Bottone per aprire la chat */}
      <Button
        variant="outline"
        size="icon"
        onClick={toggleSidebar}
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full shadow-lg bg-blue-500 hover:bg-blue-600"
      >
        <MessageCircle className="h-6 w-6 text-white" />
        {messaggi.filter(m => !m.letto).length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {messaggi.filter(m => !m.letto).length}
          </span>
        )}
      </Button>
      
      {/* Sidebar chat */}
      {isOpen && (
        <div className="fixed inset-0 z-50">
          <div 
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={toggleSidebar}
          />
          <div className="absolute right-0 top-0 h-full w-80 bg-white shadow-xl flex flex-col">
            {/* Header sidebar */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Chat</h2>
              <Button variant="ghost" size="icon" onClick={toggleSidebar}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            {activeChat ? (
              /* Finestra chat attiva */
              <ChatWindow
                destinatarioId={activeChat.id}
                destinatarioNome={activeChat.username}
                onChiudi={closeChat}
              />
            ) : (
              /* Lista contatti */
              <div className="flex-1 flex flex-col">
                <div className="p-4 border-b">
                  <h3 className="font-medium">Contatti</h3>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-2">
                    {destinatari.map(destinatario => (
                      <div
                        key={destinatario.id}
                        className="flex items-center justify-between p-3 hover:bg-gray-100 rounded cursor-pointer"
                        onClick={() => startChat(destinatario)}
                      >
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                            <span className="font-semibold text-blue-800">
                              {destinatario.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="font-medium">{destinatario.username}</span>
                        </div>
                        {unreadCount(destinatario.id) > 0 && (
                          <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                            {unreadCount(destinatario.id)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}