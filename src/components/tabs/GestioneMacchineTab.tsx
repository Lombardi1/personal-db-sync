import React, { useState } from 'react';
import { MacchinaProduzione } from '@/types';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Trash2, Loader2, Factory } from 'lucide-react';
import { TabellaGestioneMacchine } from '@/components/tables/TabellaGestioneMacchine';
import { ModalAddMacchina } from '@/components/modals/ModalAddMacchina';
import { ModalEditMacchina } from '@/components/modals/ModalEditMacchina';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import * as notifications from '@/utils/notifications';

interface GestioneMacchineTabProps {
  macchine: MacchinaProduzione[];
  loading: boolean;
  addMacchina: (macchina: Omit<MacchinaProduzione, 'id' | 'created_at' | 'updated_at'>) => Promise<{ data?: MacchinaProduzione; error?: any }>;
  updateMacchina: (id: string, dati: Partial<Omit<MacchinaProduzione, 'id' | 'created_at' | 'updated_at'>>) => Promise<{ data?: MacchinaProduzione; error?: any }>;
  deleteMacchina: (id: string) => Promise<{ error?: any }>;
}

export function GestioneMacchineTab({
  macchine,
  loading,
  addMacchina,
  updateMacchina,
  deleteMacchina,
}: GestioneMacchineTabProps) {
  const [isAddMacchinaModalOpen, setIsAddMacchinaModalOpen] = useState(false);
  const [isEditMacchinaModalOpen, setIsEditMacchinaModalOpen] = useState(false);
  const [macchinaToEdit, setMacchinaToEdit] = useState<MacchinaProduzione | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [macchinaToDelete, setMacchinaToDelete] = useState<MacchinaProduzione | null>(null);

  const handleAddMacchinaClick = () => {
    setMacchinaToEdit(null);
    setIsAddMacchinaModalOpen(true);
  };

  const handleEditMacchinaClick = (macchina: MacchinaProduzione) => {
    setMacchinaToEdit(macchina);
    setIsEditMacchinaModalOpen(true);
  };

  const handleDeleteMacchinaClick = (macchina: MacchinaProduzione) => {
    setMacchinaToDelete(macchina);
    setIsDeleteAlertOpen(true);
  };

  const handleConfirmDeleteMacchina = async () => {
    if (macchinaToDelete) {
      await deleteMacchina(macchinaToDelete.id);
      setMacchinaToDelete(null);
      setIsDeleteAlertOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl sm:text-2xl font-bold text-[hsl(var(--produzione-color))] flex items-center gap-2">
          <Factory className="h-6 w-6" /> Gestione Macchine
        </h3>
        <Button
          onClick={handleAddMacchinaClick}
          size="sm"
          className="gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base bg-[hsl(var(--produzione-color))] text-white hover:bg-[hsl(var(--produzione-color-dark))]"
        >
          <PlusCircle className="h-4 w-4 sm:h-5 sm:w-5" />
          Nuova Macchina
        </Button>
      </div>
      <p className="text-sm sm:text-base text-[hsl(var(--muted-foreground))] mb-4">
        Aggiungi, modifica o elimina le macchine di produzione.
      </p>

      {macchine.length === 0 ? (
        <p className="text-center text-sm sm:text-base text-[hsl(var(--muted-foreground))] py-6 sm:py-8">
          Nessuna macchina di produzione registrata. Clicca "Nuova Macchina" per aggiungerne una.
        </p>
      ) : (
        <TabellaGestioneMacchine
          macchine={macchine}
          onEdit={handleEditMacchinaClick}
          onDelete={handleDeleteMacchinaClick}
        />
      )}

      <ModalAddMacchina
        isOpen={isAddMacchinaModalOpen}
        onClose={() => setIsAddMacchinaModalOpen(false)}
        onSubmit={addMacchina}
      />

      {macchinaToEdit && (
        <ModalEditMacchina
          isOpen={isEditMacchinaModalOpen}
          onClose={() => setIsEditMacchinaModalOpen(false)}
          onSubmit={updateMacchina}
          initialData={macchinaToEdit}
        />
      )}

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Eliminazione Macchina</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare la macchina <strong>{macchinaToDelete?.nome}</strong>?
              Questa azione non può essere annullata e rimuoverà anche tutti i lavori associati.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteMacchina} className="bg-destructive hover:bg-destructive/90">
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}