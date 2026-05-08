import React, { useState, useEffect } from 'react';
import { Fornitore, AnagraficaBase, AziendaInfo } from '@/types';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { ModalAnagraficaForm } from '@/components/modals/ModalAnagraficaForm';
import { useAuth } from '@/hooks/useAuth';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Filters } from '@/components/Filters';

interface FornitoriTabProps {
  fornitori: Fornitore[];
  addFornitore: (fornitore: Omit<Fornitore, 'id' | 'created_at'>) => Promise<{ success: boolean; error?: any }>;
  updateFornitore: (id: string, fornitore: Partial<Omit<Fornitore, 'id' | 'created_at'>>) => Promise<{ success: boolean; error?: any }>;
  deleteFornitore: (id: string) => Promise<{ success: boolean; error?: any }>;
  aziendaInfo: AziendaInfo | null;
}

export function FornitoriTab({ fornitori, addFornitore, updateFornitore, deleteFornitore, aziendaInfo }: FornitoriTabProps) {
  const { isVisualizzatore } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFornitore, setEditingFornitore] = useState<Fornitore | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [fornitoreToDelete, setFornitoreToDelete] = useState<Fornitore | null>(null);
  const [filtri, setFiltri] = useState({ codice: '', nome: '', tipo_fornitore: '', citta: '', partita_iva: '', email: '', telefono: '' });
  const [fornitoriFiltered, setFornitoriFiltered] = useState<Fornitore[]>([]);

  useEffect(() => { handleFilter(filtri); }, [fornitori]);

  const handleFilter = (newFiltri: typeof filtri) => {
    setFiltri(newFiltri);
    let filtered = fornitori;
    Object.entries(newFiltri).forEach(([key, value]) => {
      if (value) {
        filtered = filtered.filter(f => {
          const field = f[key as keyof Fornitore];
          if (key === 'partita_iva') {
            return (String(f.partita_iva || '').toLowerCase().includes(value.toLowerCase()) ||
              String(f.codice_fiscale || '').toLowerCase().includes(value.toLowerCase()));
          }
          return String(field || '').toLowerCase().includes(value.toLowerCase());
        });
      }
    });
    setFornitoriFiltered(filtered);
  };

  const resetFiltri = () => {
    const emptyFiltri = { codice: '', nome: '', tipo_fornitore: '', citta: '', partita_iva: '', email: '', telefono: '' };
    setFiltri(emptyFiltri);
    handleFilter(emptyFiltri);
  };

  const handleFormSubmit = async (data: AnagraficaBase) => {
    if (editingFornitore) {
      await updateFornitore(editingFornitore.id!, data as Partial<Omit<Fornitore, 'id' | 'created_at'>>);
    } else {
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
        {!isVisualizzatore && (
          <Button onClick={() => { setEditingFornitore(null); setIsModalOpen(true); }} size="sm"
            className="gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base bg-[hsl(var(--secondary))] text-white hover:bg-[hsl(199,89%,38%)]">
            <PlusCircle className="h-4 w-4 sm:h-5 sm:w-5" />
            Nuovo Fornitore
          </Button>
        )}
      </div>
      <p className="text-sm sm:text-base text-[hsl(var(--muted-foreground))] mb-4">Gestisci l'anagrafica dei fornitori.</p>

      <Filters filtri={filtri} onFilter={handleFilter} onReset={resetFiltri} matchCount={fornitoriFiltered.length} sezione="fornitori" />

      {fornitori.length === 0 ? (
        <p className="text-center text-sm sm:text-base text-[hsl(var(--muted-foreground))] py-6 sm:py-8">
          Nessun fornitore registrato.{!isVisualizzatore && ' Clicca "Nuovo Fornitore" per aggiungerne uno.'}
        </p>
      ) : (
        <div className="w-full rounded-md border overflow-x-auto">
          <Table className="min-w-full table-auto">
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs sm:text-sm min-w-[50px]">Codice</TableHead>
                <TableHead className="text-xs sm:text-sm min-w-[90px]">Nome</TableHead>
                <TableHead className="text-xs sm:text-sm min-w-[70px] whitespace-normal">Tipo Fornitore</TableHead>
                <TableHead className="text-xs sm:text-sm min-w-[80px] whitespace-normal">P.IVA / Cod. Fiscale</TableHead>
                <TableHead className="text-xs sm:text-sm min-w-[60px] whitespace-normal">Città</TableHead>
                <TableHead className="text-xs sm:text-sm min-w-[70px]">Telefono</TableHead>
                <TableHead className="text-xs sm:text-sm min-w-[90px] whitespace-normal">Email</TableHead>
                <TableHead className="text-xs sm:text-sm min-w-[60px] whitespace-normal">Cond. Pagamento</TableHead>
                <TableHead className="text-xs sm:text-sm min-w-[30px]">IVA</TableHead>
                <TableHead className="text-xs sm:text-sm min-w-[90px] whitespace-normal">Banca</TableHead>
                {!isVisualizzatore && <TableHead className="text-right text-xs sm:text-sm min-w-[60px]">Azioni</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {fornitoriFiltered.map((fornitore) => (
                <TableRow key={fornitore.id}>
                  <TableCell className="font-medium text-xs sm:text-sm">{fornitore.codice_anagrafica || '-'}</TableCell>
                  <TableCell className="font-medium text-xs sm:text-sm whitespace-normal">{fornitore.nome}</TableCell>
                  <TableCell className="text-xs sm:text-sm whitespace-normal">{fornitore.tipo_fornitore || '-'}</TableCell>
                  <TableCell className="text-xs sm:text-sm whitespace-normal">{fornitore.partita_iva || fornitore.codice_fiscale || '-'}</TableCell>
                  <TableCell className="text-xs sm:text-sm whitespace-normal">{fornitore.citta || '-'}</TableCell>
                  <TableCell className="text-xs sm:text-sm whitespace-normal">{fornitore.telefono || '-'}</TableCell>
                  <TableCell className="text-xs sm:text-sm whitespace-normal">{fornitore.email || '-'}</TableCell>
                  <TableCell className="text-xs sm:text-sm whitespace-normal">{fornitore.condizione_pagamento || '-'}</TableCell>
                  <TableCell className="text-xs sm:text-sm">{fornitore.considera_iva ? 'Sì' : 'No'}</TableCell>
                  <TableCell className="text-xs sm:text-sm whitespace-normal">{fornitore.banca || '-'}</TableCell>
                  {!isVisualizzatore && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 sm:gap-2">
                        <Button variant="outline" size="icon" onClick={() => { setEditingFornitore(fornitore); setIsModalOpen(true); }} className="h-7 w-7 sm:h-8 sm:w-8">
                          <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                        <Button variant="destructive" size="icon" onClick={() => { setFornitoreToDelete(fornitore); setIsDeleteAlertOpen(true); }} className="h-7 w-7 sm:h-8 sm:w-8">
                          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {!isVisualizzatore && (
        <>
          <ModalAnagraficaForm type="fornitore" isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleFormSubmit} initialData={editingFornitore} />
          <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Conferma Eliminazione Fornitore</AlertDialogTitle>
                <AlertDialogDescription>
                  Sei sicuro di voler eliminare il fornitore <strong>{fornitoreToDelete?.nome}</strong>? Questa azione non può essere annullata.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annulla</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">Elimina</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}
