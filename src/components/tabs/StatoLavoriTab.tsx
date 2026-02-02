import React, { useState, useEffect } from 'react';
import { MacchinaProduzione, LavoroProduzione } from '@/types';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Trash2, Play, Pause, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { TabellaMacchine } from '@/components/tables/TabellaMacchine';
import { ModalAddLavoro } from '@/components/modals/ModalAddLavoro';
import { ModalEditLavoro } from '@/components/modals/ModalEditLavoro';
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

interface StatoLavoriTabProps {
  macchine: MacchinaProduzione[];
  lavori: LavoroProduzione[];
  loading: boolean;
  addLavoro: (lavoro: Omit<LavoroProduzione, 'id' | 'created_at' | 'updated_at' | 'macchina_nome'>) => Promise<{ data?: LavoroProduzione; error?: any }>;
  updateLavoro: (id: string, dati: Partial<Omit<LavoroProduzione, 'id' | 'created_at' | 'updated_at' | 'macchina_nome'>>) => Promise<{ data?: LavoroProduzione; error?: any }>;
  deleteLavoro: (id: string) => Promise<{ error?: any }>;
}

export function StatoLavoriTab({
  macchine,
  lavori,
  loading,
  addLavoro,
  updateLavoro,
  deleteLavoro,
}: StatoLavoriTabProps) {
  const [isAddLavoroModalOpen, setIsAddLavoroModalOpen] = useState(false);
  const [isEditLavoroModalOpen, setIsEditLavoroModalOpen] = useState(false);
  const [lavoroToEdit, setLavoroToEdit] = useState<LavoroProduzione | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [lavoroToDelete, setLavoroToDelete] = useState<LavoroProduzione | null>(null);

  const handleAddLavoroClick = () => {
    setLavoroToEdit(null);
    setIsAddLavoroModalOpen(true);
  };

  const handleEditLavoroClick = (lavoro: LavoroProduzione) => {
    setLavoroToEdit(lavoro);
    setIsEditLavoroModalOpen(true);
  };

  const handleDeleteLavoroClick = (lavoro: LavoroProduzione) => {
    setLavoroToDelete(lavoro);
    setIsDeleteAlertOpen(true);
  };

  const handleConfirmDeleteLavoro = async () => {
    if (lavoroToDelete) {
      await deleteLavoro(lavoroToDelete.id);
      setLavoroToDelete(null);
      setIsDeleteAlertOpen(false);
    }
  };

  const handleUpdateLavoroStatus = async (lavoro: LavoroProduzione, newStatus: LavoroProduzione['stato']) => {
    if (lavoro.stato === newStatus) {
      notifications.showInfo(`Il lavoro è già nello stato '${newStatus}'.`);
      return;
    }

    let updateData: Partial<LavoroProduzione> = { stato: newStatus };

    if (newStatus === 'in_produzione' && !lavoro.data_inizio_effettiva) {
      updateData.data_inizio_effettiva = new Date().toISOString().split('T')[0];
    } else if (newStatus === 'completato' && !lavoro.data_fine_effettiva) {
      updateData.data_fine_effettiva = new Date().toISOString().split('T')[0];
    }

    await updateLavoro(lavoro.id, updateData);
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
          <Factory className="h-6 w-6" /> Stato Lavori Attuali
        </h3>
        <Button
          onClick={handleAddLavoroClick}
          size="sm"
          className="gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base bg-[hsl(var(--produzione-color))] text-white hover:bg-[hsl(var(--produzione-color-dark))]"
        >
          <PlusCircle className="h-4 w-4 sm:h-5 sm:w-5" />
          Nuovo Lavoro
        </Button>
      </div>
      <p className="text-sm sm:text-base text-[hsl(var(--muted-foreground))] mb-4">
        Visualizza e gestisci lo stato dei lavori in corso sulle macchine di produzione.
      </p>

      {macchine.length === 0 ? (
        <p className="text-center text-sm sm:text-base text-[hsl(var(--muted-foreground))] py-6 sm:py-8">
          Nessuna macchina di produzione registrata. Aggiungi macchine nella sezione "Gestione Macchine".
        </p>
      ) : (
        <TabellaMacchine
          macchine={macchine}
          lavori={lavori}
          onEditLavoro={handleEditLavoroClick}
          onDeleteLavoro={handleDeleteLavoroClick}
          onUpdateLavoroStatus={handleUpdateLavoroStatus}
        />
      )}

      <ModalAddLavoro
        isOpen={isAddLavoroModalOpen}
        onClose={() => setIsAddLavoroModalOpen(false)}
        onSubmit={addLavoro}
        macchine={macchine}
      />

      {lavoroToEdit && (
        <ModalEditLavoro
          isOpen={isEditLavoroModalOpen}
          onClose={() => setIsEditLavoroModalOpen(false)}
          onSubmit={updateLavoro}
          initialData={lavoroToEdit}
          macchine={macchine}
        />
      )}

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Eliminazione Lavoro</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare il lavoro <strong>{lavoroToDelete?.nome_lavoro}</strong>?
              Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteLavoro} className="bg-destructive hover:bg-destructive/90">
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}