import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MultiSelectUsers } from '@/components/MultiSelectUsers';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface CreateNamedChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  allUsers: { id: string; username: string }[];
  onCreateChat: (chatId: string) => void;
}

export function CreateNamedChatModal({ 
  isOpen, 
  onClose, 
  allUsers,
  onCreateChat
}: CreateNamedChatModalProps) {
  const { user } = useAuth();
  const [chatName, setChatName] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]); // This array already excludes the current user
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Determine if it's a group chat (more than one other participant selected)
  const isGroupChat = selectedParticipants.length > 1;

  const handleCreateChat = async () => {
    if (!user?.id) {
      toast.error('Devi essere loggato per creare una chat.');
      return;
    }
    
    if (selectedParticipants.length === 0) {
      toast.error('Seleziona almeno un partecipante.');
      return;
    }

    if (isGroupChat && !chatName.trim()) { // Only validate chatName if it's a group chat
      toast.error('Inserisci un nome per la chat di gruppo.');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Always include current user
      const allParticipants = [...new Set([user.id, ...selectedParticipants])];
      
      // Create new named chat
      const { data, error } = await supabase
        .from('chats')
        .insert({
          name: isGroupChat ? chatName.trim() : null, // Only set name if it's a group chat
          participant_ids: allParticipants
        })
        .select()
        .single();
      
      if (error) throw error;
      
      toast.success('Chat creata con successo!');
      onCreateChat(data.id);
      onClose();
      
      // Reset form
      setChatName('');
      setSelectedParticipants([]);
    } catch (error: any) {
      console.error('Error creating chat:', error);
      toast.error('Errore durante la creazione della chat: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Crea Nuova Chat</DialogTitle>
          <DialogDescription>
            Crea una nuova chat e aggiungi partecipanti.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {isGroupChat && ( // Conditionally render name input
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-chat-name" className="text-right">
                Nome *
              </Label>
              <div className="col-span-3">
                <Input
                  id="new-chat-name"
                  value={chatName}
                  onChange={(e) => setChatName(e.target.value)}
                  placeholder="Nome della chat"
                  className="col-span-3"
                />
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="new-participants" className="text-right">
              Partecipanti
            </Label>
            <div className="col-span-3">
              <MultiSelectUsers 
                options={allUsers.filter(u => u.id !== user?.id)} // Exclude current user
                selected={selectedParticipants}
                onSelectionChange={setSelectedParticipants}
                currentUser={user}
                placeholder="Seleziona partecipanti..."
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Annulla
          </Button>
          <Button onClick={handleCreateChat} disabled={isSubmitting}>
            {isSubmitting ? 'Creazione...' : 'Crea Chat'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}