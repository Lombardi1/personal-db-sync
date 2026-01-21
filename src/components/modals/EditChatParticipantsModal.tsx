import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MultiSelectUsers } from '@/components/MultiSelectUsers';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface EditChatParticipantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  currentParticipants: string[];
  currentName?: string;
  onParticipantsUpdated: () => void;
  allUsers: { id: string; username: string }[]; // NUOVO: allUsers passato come prop
}

export function EditChatParticipantsModal({ 
  isOpen, 
  onClose, 
  chatId, 
  currentParticipants,
  currentName,
  onParticipantsUpdated,
  allUsers // NUOVO: Ricevuto come prop
}: EditChatParticipantsModalProps) {
  // Rimosso: const { allUsers } = useChat(() => {}); // Questa chiamata è stata rimossa
  const { user } = useAuth();
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(currentParticipants);
  const [chatName, setChatName] = useState<string>(currentName || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter out the current user from the selectedParticipants to count others
  const otherSelectedParticipants = selectedParticipants.filter(id => id !== user?.id);
  const isGroupChat = otherSelectedParticipants.length > 1; // If more than one other participant is selected

  useEffect(() => {
    if (isOpen) {
      setSelectedParticipants(currentParticipants);
      setChatName(currentName || '');
    }
  }, [isOpen, currentParticipants, currentName]);

  const handleSave = async () => {
    if (!user?.id) return;
    
    setIsSubmitting(true);
    
    try {
      // Get current chat to check participants and name
      const { data: currentChat, error: fetchError } = await supabase
        .from('chats')
        .select('participant_ids, name')
        .eq('id', chatId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Check if there are actual changes
      const currentSet = new Set(currentChat.participant_ids);
      const newSet = new Set(selectedParticipants);
      
      const hasParticipantChanges = 
        currentSet.size !== newSet.size || 
        ![...currentSet].every(id => newSet.has(id));
      
      const hasNameChange = currentChat.name !== chatName; // Compare with original currentName
      
      if (!hasParticipantChanges && !hasNameChange) {
        toast.info('Nessuna modifica effettuata');
        onClose();
        return;
      }
      
      // Determine the name to save: if it's a group chat, use chatName, otherwise null
      const nameToSave = isGroupChat ? chatName.trim() : null;

      const { error: updateError } = await supabase
        .from('chats')
        .update({ 
          participant_ids: selectedParticipants,
          name: nameToSave
        })
        .eq('id', chatId);
      
      if (updateError) throw updateError;
      
      toast.success('Chat aggiornata con successo!');
      onParticipantsUpdated();
      onClose();
    } catch (error: any) {
      console.error('Error updating chat:', error);
      toast.error('Errore durante l\'aggiornamento della chat: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Modifica Chat</DialogTitle>
          <DialogDescription>
            Modifica il nome e i partecipanti di questa chat.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {isGroupChat && ( // Conditionally render name input
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="chat-name" className="text-right">
                Nome
              </Label>
              <div className="col-span-3">
                <Input
                  id="chat-name"
                  value={chatName}
                  onChange={(e) => setChatName(e.target.value)}
                  placeholder="Nome della chat (opzionale)"
                  className="col-span-3"
                />
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="participants" className="text-right">
              Partecipanti
            </Label>
            <div className="col-span-3">
              <MultiSelectUsers 
                options={allUsers.filter(u => u.id !== user?.id)} // Exclude current user from selection
                selected={selectedParticipants.filter(id => id !== user?.id)} // Current user is always included
                onSelectionChange={(selected) => {
                  // Always include current user
                  const newSelection = [...new Set([user?.id || '', ...selected])];
                  setSelectedParticipants(newSelection);
                }}
                currentUser={user}
                placeholder="Seleziona partecipanti..."
                checkboxClassName="border-[hsl(var(--chat-color))] data-[state=checked]:bg-[hsl(var(--chat-color))] data-[state=checked]:text-white" // Passa la classe per il colore verde
              />
            </div>
          </div>
          
          <div className="text-xs text-muted-foreground col-span-4">
            <p>Il tuo account è sempre incluso nella chat.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Annulla
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSubmitting}
            className="bg-[hsl(var(--chat-color))] hover:bg-[hsl(var(--chat-color-dark))] text-white"
          >
            {isSubmitting ? 'Salvataggio...' : 'Salva'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}