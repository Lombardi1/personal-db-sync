import React, { useState, useEffect } from 'react';
import { Polimero, StoricoMovimentoPolimero } from '@/types';
import { Filters } from '@/components/Filters';
import { Button } from '@/components/ui/button';
import * as notifications from '@/utils/notifications';
import { esportaTabellaXLS, esportaTabellaPDF } from '@/utils/export';
import { TabellaPolimeri } from '@/components/tables/TabellaPolimeri';
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
import { ModalModificaPolimero } from '@/components/modals/ModalModificaPolimero';

interface GiacenzaPolimeriTabProps {
  polimeri: Polimero[];
  storicoPolimeri: StoricoMovimentoPolimero[];
  loading: boolean;
  modificaPolimero: (codice: string, dati: Partial<Polimero>) => Promise<{ error: any }>;
  eliminaPolimero: (codice: string) => Promise<{ error: any }>;
  cambiaDisponibilitaPolimero: (codice: string, disponibile: boolean) => Promise<{ error: any }>;
}

export function GiacenzaPolimeriTab({
  polimeri,
  storicoPolimeri,
  loading,
  modificaPolimero,
  eliminaPolimero,
  cambiaDisponibilitaPolimero,
}: GiacenzaPolimeriTabProps) {
  const [filtri, setFiltri] = useState({
    codice: '',
    nr_fustella: '',
    codice_fornitore: '',
    cliente: '',
    lavoro: '',
    resa: '',
  });
  const [polimeriFiltered, setPolimeriFiltered] = useState<Polimero[]>([]);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [polimeroToDelete, setPolimeroToDelete] = useState<Polimero | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [polimeroToEdit, setPolimeroToEdit] = useState<Polimero | null>(null);

  useEffect(() => {
    handleFilter(filtri);
  }, [polimeri]);

  const handleFilter = (newFiltri: typeof filtri) => {
    setFiltri(newFiltri);
    let filtered = polimeri;

    Object.entries(newFiltri).forEach(([key, value]) => {
      if (value) {
        filtered = filtered.filter(p => {
          const field = p[key as keyof Polimero];
          return String(field || '').toLowerCase().includes(value.toLowerCase());
        });
      }
    });

    setPolimeriFiltered(filtered);
  };

  const resetFiltri = () => {
    const emptyFiltri = {
      codice: '',
      nr_fustella: '',
      codice_fornitore: '',
      cliente: '',
      lavoro: '',
      resa: '',
    };
    setFiltri(emptyFiltri);
    setPolimeriFiltered(polimeri);
  };

  const handleDeleteClick = (codice: string) => {
    const polimero = polimeri.find(p => p.codice === codice);
    if (polimero) {
      setPolimeroToDelete(polimero);
      setIsDeleteAlertOpen(true);
    }
  };

  const handleConfirmDelete = async () => {
    if (polimeroToDelete) {
      await eliminaPolimero(polimeroToDelete.codice);
      setPolimeroToDelete(null);
      setIsDeleteAlertOpen(false);
    }
  };

  const handleEditClick = (polimero: Polimero) => {
    setPolimeroToEdit(polimero);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (codice: string, dati: Partial<Polimero>) => {
    await modificaPolimero(codice, dati);
    setIsEditModalOpen(false);
    setPolimeroToEdit(null);
  };

  if (loading) {
    return <div className="text-center py-8 text-[hsl(var(--muted-foreground))]">Caricamento polimeri...</div>;
  }

  return (
    <div>
      <Filters
        filtri={filtri}
        onFilter={handleFilter}
        onReset={resetFiltri}
        matchCount={polimeriFiltered.length}
        sezione="polimeri-giacenza"
      />

      <h2 className="text-xl sm:text-2xl font-bold text-[hsl(var(--polimeri-color))] mb-4 sm:mb-5 flex items-center gap-2">
        <i className="fas fa-layer-group"></i> Giacenza Polimeri
      </h2>

      <div className="mb-3 flex flex-wrap gap-2">
        <Button
          onClick={() => notifications.showInfo('Funzionalità di esportazione XLS in costruzione.')}
          className="bg-[hsl(var(--polimeri-color))] text-white hover:bg-[hsl(var(--polimeri-color-dark))] text-sm py-2 px-3"
        >
          <i className="fas fa-file-excel mr-1 sm:mr-2"></i> <span className="hidden sm:inline">Esporta</span> XLS
        </Button>
        <Button
          onClick={() => notifications.showInfo('Funzionalità di esportazione PDF in costruzione.')}
          className="bg-[hsl(var(--polimeri-color))] text-white hover:bg-[hsl(var(--polimeri-color-dark))] text-sm py-2 px-3"
        >
          <i className="fas fa-file-pdf mr-1 sm:mr-2"></i> <span className="hidden sm:inline">Esporta</span> PDF
        </Button>
      </div>

      {polimeriFiltered.length === 0 ? (
        <p className="text-sm sm:text-base text-[hsl(var(--muted-foreground))]">Nessun polimero in giacenza.</p>
      ) : (
        <TabellaPolimeri
          polimeri={polimeriFiltered}
          onEdit={handleEditClick}
          onDelete={handleDeleteClick}
          onChangeDisponibilita={cambiaDisponibilitaPolimero}
        />
      )}

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Eliminazione Polimero</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare il polimero <strong>{polimeroToDelete?.codice}</strong>?
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

      {isEditModalOpen && polimeroToEdit && (
        <ModalModificaPolimero
          polimero={polimeroToEdit}
          onClose={() => setIsEditModalOpen(false)}
          onModifica={handleEditSubmit}
        />
      )}
    </div>
  );
}