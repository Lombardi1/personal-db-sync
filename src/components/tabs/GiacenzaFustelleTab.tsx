import React, { useState, useEffect } from 'react';
import { Fustella, StoricoMovimentoFustella } from '@/types';
import { Filters } from '@/components/Filters';
import { Button } from '@/components/ui/button';
import * as notifications from '@/utils/notifications';
import { esportaTabellaXLS, esportaTabellaPDF } from '@/utils/export';
import { TabellaFustelle } from '@/components/tables/TabellaFustelle'; // Importa la nuova tabella
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
import { ModalModificaFustella } from '@/components/modals/ModalModificaFustella'; // Importa il modale di modifica

interface GiacenzaFustelleTabProps {
  fustelle: Fustella[];
  storicoFustelle: StoricoMovimentoFustella[];
  loading: boolean;
  modificaFustella: (codice: string, dati: Partial<Fustella>) => Promise<{ error: any }>;
  eliminaFustella: (codice: string) => Promise<{ error: any }>;
  cambiaDisponibilitaFustella: (codice: string, disponibile: boolean) => Promise<{ error: any }>;
}

export function GiacenzaFustelleTab({
  fustelle,
  storicoFustelle,
  loading,
  modificaFustella,
  eliminaFustella,
  cambiaDisponibilitaFustella,
}: GiacenzaFustelleTabProps) {
  const [filtri, setFiltri] = useState({
    codice: '',
    fornitore: '',
    codice_fornitore: '',
    cliente: '',
    lavoro: '',
    fustellatrice: '',
    resa: '',
    tipo_incollatura: '',
    pulitore_codice: '', // NUOVO FILTRO
  });
  const [fustelleFiltered, setFustelleFiltered] = useState<Fustella[]>([]);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [fustellaToDelete, setFustellaToDelete] = useState<Fustella | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [fustellaToEdit, setFustellaToEdit] = useState<Fustella | null>(null);


  useEffect(() => {
    handleFilter(filtri);
  }, [fustelle]);

  const handleFilter = (newFiltri: typeof filtri) => {
    setFiltri(newFiltri);
    let filtered = fustelle;

    Object.entries(newFiltri).forEach(([key, value]) => {
      if (value) {
        filtered = filtered.filter(f => {
          const field = f[key as keyof Fustella];
          return String(field || '').toLowerCase().includes(value.toLowerCase());
        });
      }
    });

    setFustelleFiltered(filtered);
  };

  const resetFiltri = () => {
    const emptyFiltri = {
      codice: '',
      fornitore: '',
      codice_fornitore: '',
      cliente: '',
      lavoro: '',
      fustellatrice: '',
      resa: '',
      tipo_incollatura: '',
      pulitore_codice: '', // RESETTA ANCHE IL NUOVO FILTRO
    };
    setFiltri(emptyFiltri);
    setFustelleFiltered(fustelle);
  };

  const handleDeleteClick = (codice: string) => {
    const fustella = fustelle.find(f => f.codice === codice);
    if (fustella) {
      setFustellaToDelete(fustella);
      setIsDeleteAlertOpen(true);
    }
  };

  const handleConfirmDelete = async () => {
    if (fustellaToDelete) {
      await eliminaFustella(fustellaToDelete.codice);
      setFustellaToDelete(null);
      setIsDeleteAlertOpen(false);
    }
  };

  const handleEditClick = (fustella: Fustella) => {
    setFustellaToEdit(fustella);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (codice: string, dati: Partial<Fustella>) => {
    await modificaFustella(codice, dati);
    setIsEditModalOpen(false);
    setFustellaToEdit(null);
  };

  if (loading) {
    return <div className="text-center py-8 text-[hsl(var(--muted-foreground))]">Caricamento fustelle...</div>;
  }

  return (
    <div>
      <Filters
        filtri={filtri}
        onFilter={handleFilter}
        onReset={resetFiltri}
        matchCount={fustelleFiltered.length}
        sezione="fustelle-giacenza"
      />

      <h2 className="text-xl sm:text-2xl font-bold text-[hsl(var(--fustelle-color))] mb-4 sm:mb-5 flex items-center gap-2">
        <i className="fas fa-shapes"></i> Giacenza Fustelle
      </h2>

      <div className="mb-3 flex flex-wrap gap-2">
        <Button
          onClick={() => notifications.showInfo('Funzionalità di esportazione XLS in costruzione.')}
          className="bg-[hsl(var(--fustelle-color))] text-white hover:bg-[hsl(var(--fustelle-color-dark))] text-sm py-2 px-3"
        >
          <i className="fas fa-file-excel mr-1 sm:mr-2"></i> <span className="hidden sm:inline">Esporta</span> XLS
        </Button>
        <Button
          onClick={() => notifications.showInfo('Funzionalità di esportazione PDF in costruzione.')}
          className="bg-[hsl(var(--fustelle-color))] text-white hover:bg-[hsl(var(--fustelle-color-dark))] text-sm py-2 px-3"
        >
          <i className="fas fa-file-pdf mr-1 sm:mr-2"></i> <span className="hidden sm:inline">Esporta</span> PDF
        </Button>
      </div>

      {fustelleFiltered.length === 0 ? (
        <p className="text-sm sm:text-base text-[hsl(var(--muted-foreground))]">Nessuna fustella in giacenza.</p>
      ) : (
        <TabellaFustelle
          fustelle={fustelleFiltered}
          onEdit={handleEditClick}
          onDelete={handleDeleteClick}
          onChangeDisponibilita={cambiaDisponibilitaFustella}
        />
      )}

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Eliminazione Fustella</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare la fustella <strong>{fustellaToDelete?.codice}</strong>?
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

      {isEditModalOpen && fustellaToEdit && (
        <ModalModificaFustella
          fustella={fustellaToEdit}
          onClose={() => setIsEditModalOpen(false)}
          onModifica={handleEditSubmit}
        />
      )}
    </div>
  );
}