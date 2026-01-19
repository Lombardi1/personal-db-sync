import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MultiSelectUsers } from '@/components/MultiSelectUsers';
import { useChat } from '@/hooks/useChat';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface EditChatParticipantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  currentParticipants: string[];
  onParticipantsUpdated: () => void;
}

export function EditChatParticipantsModal({ 
  isOpen, 
  onClose, 
  chatId, 
  currentParticipants,
  onParticipantsUpdated
}: EditChatParticipantsModalProps) {
  const { allUsers } = useChat(() => {}); // Pass empty function since we don't use navigate here
  const { user } = useAuth();
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(currentParticipants);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedParticipants(currentParticipants);
    }
  }, [isOpen, currentParticipants]);

  const handleSave = async () => {
    if (!user?.id) return;
    
    setIsSubmitting(true);
    
    try {
      // Get current chat to check participants
      const { data: currentChat, error: fetchError } = await supabase
        .from('chats')
        .select('participant_ids')
        .eq('id', chatId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Check if there are actual changes
      const currentSet = new Set(currentChat.participant_ids);
      const newSet = new Set(selectedParticipants);
      
      const hasChanges = 
        currentSet.size !== newSet.size || 
        ![...currentSet].every(id => newSet.has(id));
      
      if (!hasChanges) {
        toast.info('Nessuna modifica ai partecipanti');
        onClose();
        return;
      }
      
      // Update chat participants
      const { error: updateError } = await supabase
        .from('chats')
        .update({ participant_ids: selectedParticipants })
        .eq('id', chatId);
      
      if (updateError) throw updateError;
      
      toast.success('Partecipanti aggiornati con successo!');
      onParticipantsUpdated();
      onClose();
    } catch (error: any) {
      console.error('Error updating chat participants:', error);
      toast.error('Errore durante l\'aggiornamento dei partecipanti: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Modifica Partecipanti</DialogTitle>
          <DialogDescription>
            Aggiungi o rimuovi utenti da questa chat.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
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
          />
          <div className="text-xs text-muted-foreground">
            <p>Il tuo account è sempre incluso nella chat.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Annulla
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? 'Salvataggio...' : 'Salva'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}