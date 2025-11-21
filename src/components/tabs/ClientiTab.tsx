import React, { useState } from 'react';
import { Cliente, AnagraficaBase } from '@/types';
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

interface ClientiTabProps {
  clienti: Cliente[];
  addCliente: (cliente: Omit<Cliente, 'id' | 'created_at'>) => Promise<{ success: boolean; error?: any }>;
  updateCliente: (id: string, cliente: Partial<Omit<Cliente, 'id' | 'created_at'>>) => Promise<{ success: boolean; error?: any }>;
  deleteCliente: (id: string) => Promise<{ success: boolean; error?: any }>;
}

export function ClientiTab({ clienti, addCliente, updateCliente, deleteCliente }: ClientiTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [clienteToDelete, setClienteToDelete] = useState<Cliente | null>(null);

  const handleAddClick = () => {
    setEditingCliente(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (cliente: Cliente) => {
    setEditingCliente(cliente);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (cliente: Cliente) => {
    setClienteToDelete(cliente);
    setIsDeleteAlertOpen(true);
  };

  const handleFormSubmit = async (data: AnagraficaBase) => {
    if (editingCliente) {
      await updateCliente(editingCliente.id!, data);
    } else {
      await addCliente(data);
    }
  };

  const handleConfirmDelete = async () => {
    if (clienteToDelete) {
      await deleteCliente(clienteToDelete.id!);
      setClienteToDelete(null);
      setIsDeleteAlertOpen(false);
    }
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl sm:text-2xl font-bold text-[hsl(var(--primary))] flex items-center gap-2">
          <i className="fas fa-users"></i> Gestione Clienti
        </h3>
        <Button onClick={handleAddClick} size="sm" className="gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base">
          <PlusCircle className="h-4 w-4 sm:h-5 sm:w-5" />
          Nuovo Cliente
        </Button>
      </div>
      <p className="text-sm sm:text-base text-[hsl(var(--muted-foreground))] mb-4">
        Gestisci l'anagrafica dei clienti.
      </p>

      {clienti.length === 0 ? (
        <p className="text-center text-sm sm:text-base text-[hsl(var(--muted-foreground))] py-6 sm:py-8">
          Nessun cliente registrato. Clicca "Nuovo Cliente" per aggiungerne uno.
        </p>
      ) : (
        <ScrollArea className="w-full rounded-md border">
          <Table className="min-w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs sm:text-sm">Nome</TableHead>
                <TableHead className="text-xs sm:text-sm">P.IVA / Cod. Fiscale</TableHead>
                <TableHead className="text-xs sm:text-sm">Città</TableHead>
                <TableHead className="text-xs sm:text-sm">Telefono</TableHead>
                <TableHead className="text-xs sm:text-sm">Email</TableHead>
                <TableHead className="text-right text-xs sm:text-sm">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clienti.map((cliente) => (
                <TableRow key={cliente.id}>
                  <TableCell className="font-medium text-xs sm:text-sm">{cliente.nome}</TableCell>
                  <TableCell className="text-xs sm:text-sm">{cliente.partita_iva || cliente.codice_fiscale || '-'}</TableCell>
                  <TableCell className="text-xs sm:text-sm">{cliente.citta || '-'}</TableCell>
                  <TableCell className="text-xs sm:text-sm">{cliente.telefono || '-'}</TableCell>
                  <TableCell className="text-xs sm:text-sm">{cliente.email || '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 sm:gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEditClick(cliente)}
                        className="h-7 w-7 sm:h-8 sm:w-8"
                      >
                        <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleDeleteClick(cliente)}
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
        type="cliente"
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={editingCliente}
      />

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Eliminazione Cliente</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare il cliente <strong>{clienteToDelete?.nome}</strong>?
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