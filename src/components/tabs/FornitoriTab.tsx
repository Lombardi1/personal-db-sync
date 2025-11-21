import React, { useState } from 'react';
import { Fornitore, AnagraficaBase, AziendaInfo } from '@/types'; // Importa AziendaInfo
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { ModalAnagraficaForm } from '@/components/modals/ModalAnagraficaForm';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface FornitoriTabProps {
  fornitori: Fornitore[];
  addFornitore: (fornitore: Omit<Fornitore, 'id' | 'created_at'>) => Promise<{ success: boolean; error?: any }>;
  updateFornitore: (id: string, fornitore: Partial<Omit<Fornitore, 'id' | 'created_at'>>) => Promise<{ success: boolean; error?: any }>;
  deleteFornitore: (id: string) => Promise<{ success: boolean; error?: any }>;
  aziendaInfo: AziendaInfo | null; // Nuova prop
}

export function FornitoriTab({ fornitori, addFornitore, updateFornitore, deleteFornitore, aziendaInfo }: FornitoriTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFornitore, setEditingFornitore] = useState<Fornitore | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [fornitoreToDelete, setFornitoreToDelete] = useState<Fornitore | null>(null);

  const handleAddClick = () => {
    setEditingFornitore(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (fornitore: Fornitore) => {
    setEditingFornitore(fornitore);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (fornitore: Fornitore) => {
    setFornitoreToDelete(fornitore);
    setIsDeleteAlertOpen(true);
  };

  const handleFormSubmit = async (data: AnagraficaBase) => {
    console.log('[FornitoriTab] handleFormSubmit received data:', data); // NEW LOG
    if (editingFornitore) {
      console.log('[FornitoriTab] Calling updateFornitore with ID:', editingFornitore.id, 'and data:', data); // NEW LOG
      await updateFornitore(editingFornitore.id!, data as Partial<Omit<Fornitore, 'id' | 'created_at'>>);
    } else {
      console.log('[FornitoriTab] Calling addFornitore with data:', data); // NEW LOG
      await addFornitore(data as Omit<Fornitore, 'id' | 'created_at'>);
    }
  };

  const handleConfirmDelete = async () => {
    if (fornitoreToDelete) {
      await deleteFornitore(fornitoreToDelete.id!);
      setFornitoreToDelete(null);
      setIsDeleteAlertOpen(false);
    }
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl sm:text-2xl font-bold text-[hsl(var(--secondary))] flex items-center gap-2">
          <i className="fas fa-truck-moving"></i> Gestione Fornitori
        </h3>
        <Button 
          onClick={handleAddClick} 
          size="sm" 
          className="gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base bg-[hsl(var(--secondary))] text-white hover:bg-[hsl(199,89%,38%)]"
        >
          <PlusCircle className="h-4 w-4 sm:h-5 sm:w-5" />
          Nuovo Fornitore
        </Button>
      </div>
      <p className="text-sm sm:text-base text-[hsl(var(--muted-foreground))] mb-4">
        Gestisci l'anagrafica dei fornitori.
      </p>

      {fornitori.length === 0 ? (
        <p className="text-center text-sm sm:text-base text-[hsl(var(--muted-foreground))] py-6 sm:py-8">
          Nessun fornitore registrato. Clicca "Nuovo Fornitore" per aggiungerne uno.
        </p>
      ) : (
        <ScrollArea className="w-full rounded-md border">
          <Table className="min-w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs sm:text-sm">Codice</TableHead>
                <TableHead className="text-xs sm:text-sm">Nome</TableHead>
                <TableHead className="text-xs sm:text-sm">Tipo Fornitore</TableHead>
                <TableHead className="text-xs sm:text-sm">P.IVA / Cod. Fiscale</TableHead>
                <TableHead className="text-xs sm:text-sm">Città</TableHead>
                <TableHead className="text-xs sm:text-sm">Telefono</TableHead>
                <TableHead className="text-xs sm:text-sm">Email</TableHead>
                <TableHead className="text-xs sm:text-sm">Cond. Pagamento</TableHead>
                <TableHead className="text-xs sm:text-sm">IVA</TableHead>
                <TableHead className="text-xs sm:text-sm w-[150px]">Banca</TableHead> {/* Modificato: Aggiunto w-[150px] */}
                <TableHead className="text-right text-xs sm:text-sm">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fornitori.map((fornitore) => (
                <TableRow key={fornitore.id}>
                  <TableCell className="font-medium text-xs sm:text-sm">{fornitore.codice_anagrafica || '-'}</TableCell>
                  <TableCell className="font-medium text-xs sm:text-sm">{fornitore.nome}</TableCell>
                  <TableCell className="text-xs sm:text-sm">{fornitore.tipo_fornitore || '-'}</TableCell>
                  <TableCell className="text-xs sm:text-sm">{fornitore.partita_iva || fornitore.codice_fiscale || '-'}</TableCell>
                  <TableCell className="text-xs sm:text-sm">{fornitore.citta || '-'}</TableCell>
                  <TableCell className="text-xs sm:text-sm">{fornitore.telefono || '-'}</TableCell>
                  <TableCell className="text-xs sm:text-sm">{fornitore.email || '-'}</TableCell>
                  <TableCell className="text-xs sm:text-sm">{fornitore.condizione_pagamento || '-'}</TableCell>
                  <TableCell className="text-xs sm:text-sm">{fornitore.considera_iva ? 'Sì' : 'No'}</TableCell>
                  <TableCell className="text-xs sm:text-sm w-[150px]">{fornitore.banca || '-'}</TableCell> {/* Modificato: Aggiunto w-[150px] */}
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 sm:gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEditClick(fornitore)}
                        className="h-7 w-7 sm:h-8 sm:w-8"
                      >
                        <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleDeleteClick(fornitore)}
                        className="h-7 w-7 sm:h-8 sm:w-8"
                      >
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}

      <ModalAnagraficaForm
        type="fornitore"
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={editingFornitore}
        // aziendaInfo={aziendaInfo} // Non più necessario passarlo qui, ModalAnagraficaForm usa il hook
      />

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Eliminazione Fornitore</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare il fornitore <strong>{fornitoreToDelete?.nome}</strong>?
              Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}