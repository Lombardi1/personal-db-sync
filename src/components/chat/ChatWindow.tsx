import { useState, useRef, useEffect } from 'react';
import { useChat } from '@/hooks/useChat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Send } from 'lucide-react';

interface ChatWindowProps {
  destinatarioId: string;
  destinatarioNome: string;
  onChiudi: () => void;
}

export function ChatWindow({ destinatarioId, destinatarioNome, onChiudi }: ChatWindowProps) {
  const { messaggi, inviaMessaggio, segnaComeLetto } = useChat();
  const [nuovoMessaggio, setNuovoMessaggio] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  // Filtra i messaggi per la conversazione corrente
  const messaggiConversazione = messaggi.filter(
    m => 
      (m.mittente_id === destinatarioId && m.destinatario_id === destinatarioId) ||
      (m.mittente_id === destinatarioId && m.destinatario_id === destinatarioId)
  );
  
  // Segna i messaggi non letti come letti
  useEffect(() => {
    messaggiConversazione
      .filter(m => !m.letto && m.destinatario_id === destinatarioId)
      .forEach(m => segnaComeLetto(m.id));
  }, [messaggiConversazione, destinatarioId, segnaComeLetto]);
  
  // Scrolla in basso quando arrivano nuovi messaggi
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messaggiConversazione]);
  
  const handleInvia = async () => {
    if (nuovoMessaggio.trim()) {
      const success = await inviaMessaggio(destinatarioId, nuovoMessaggio);
      if (success) {
        setNuovoMessaggio('');
      }
    }
  };
  
  return (
    <div className="flex flex-col h-full border rounded-lg bg-white">
      {/* Header della chat */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <h3 className="font-semibold">Chat con {destinatarioNome}</h3>
        <Button variant="ghost" size="sm" onClick={onChiudi}>
          Chiudi
        </Button>
      </div>
      
      {/* Area messaggi */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messaggiConversazione.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              Nessun messaggio nella conversazione
            </div>
          ) : (
            messaggiConversazione
              .slice()
              .reverse()
              .map((messaggio) => (
                <div
                  key={messaggio.id}
                  className={`flex ${
                    messaggio.mittente_id === destinatarioId ? 'justify-start' : 'justify-end'
                  }`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      messaggio.mittente_id === destinatarioId
                        ? 'bg-blue-100 text-gray-800'
                        : 'bg-green-100 text-gray-800'
                    }`}
                  >
                    <div className="text-sm">{messaggio.contenuto}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {format(new Date(messaggio.created_at), 'HH:mm', { locale: it })}
                    </div>
                  </div>
                </div>
              ))
          )}
        </div>
      </ScrollArea>
      
      {/* Input messaggio */}
      <div className="p-4 border-t bg-gray-50">
        <div className="flex gap-2">
          <Input
            value={nuovoMessaggio}
            onChange={(e) => setNuovoMessaggio(e.target.value)}
            placeholder="Scrivi un messaggio..."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleInvia();
              }
            }}
            className="flex-1"
          />
          <Button
            onClick={handleInvia}
            disabled={!nuovoMessaggio.trim()}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}