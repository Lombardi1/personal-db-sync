import React, { useState, useEffect } from 'react';
import { Colore } from '@/types';
import { TabellaColori } from '@/components/tables/TabellaColori';
import { ModalModificaColore } from '@/components/modals/ModalModificaColore';
import { ModalCaricoScaricoColore } from '@/components/modals/ModalCaricoScaricoColore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { useAuth } from '@/hooks/useAuth';
import { Search, X } from 'lucide-react';

interface GiacenzaColoriTabProps {
  colori: Colore[];
  loading: boolean;
  modificaColore: (codice: string, dati: Partial<Colore>) => Promise<{ error: any }>;
  eliminaColore: (codice: string) => Promise<{ error: any }>;
  cambiaDisponibilitaColore: (codice: string, disponibile: boolean) => Promise<{ error: any }>;
  caricoColore: (codice: string, quantita: number, numero_ddt?: string, data_ddt?: string, lotto?: string, note?: string) => Promise<{ error: any }>;
  scaricoColore: (codice: string, quantita: number, macchina?: string, lavoro?: string, note?: string) => Promise<{ error: any }>;
}

export function GiacenzaColoriTab({
  colori,
  loading,
  modificaColore,
  eliminaColore,
  cambiaDisponibilitaColore,
  caricoColore,
  scaricoColore,
}: GiacenzaColoriTabProps) {
  const { isAmministratore } = useAuth();
  const [searchText, setSearchText] = useState('');
  const [coloriFiltrati, setColoriFiltrati] = useState<Colore[]>([]);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [coloreToDelete, setColoreToDelete] = useState<Colore | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [coloreToEdit, setColoreToEdit] = useState<Colore | null>(null);
  const [movimentoModal, setMovimentoModal] = useState<{
    colore: Colore;
    tipo: 'carico' | 'scarico';
  } | null>(null);

  useEffect(() => {
    if (!searchText.trim()) {
      setColoriFiltrati(colori);
    } else {
      const q = searchText.toLowerCase();
      setColoriFiltrati(
        colori.filter(
          c =>
            c.codice.toLowerCase().includes(q) ||
            c.nome.toLowerCase().includes(q) ||
            c.tipo.toLowerCase().includes(q) ||
            (c.marca || '').toLowerCase().includes(q) ||
            (c.fornitore || '').toLowerCase().includes(q)
        )
      );
    }
  }, [searchText, colori]);

  const handleDeleteClick = (codice: string) => {
    const c = colori.find(x => x.codice === codice);
    if (c) {
      setColoreToDelete(c);
      setIsDeleteAlertOpen(true);
    }
  };

  const handleConfirmDelete = async () => {
    if (coloreToDelete) {
      await eliminaColore(coloreToDelete.codice);
      setColoreToDelete(null);
      setIsDeleteAlertOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-[hsl(var(--muted-foreground))]">
        Caricamento colori...
      </div>
    );
  }

  const sottoSoglia = colori.filter(
    c => c.soglia_minima != null && c.quantita_disponibile <= c.soglia_minima
  );

  return (
    <div>
      {sottoSoglia.length > 0 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm font-semibold text-red-700">
            ⚠️ {sottoSoglia.length} colore/i sotto la soglia minima:{' '}
            {sottoSoglia.map(c => c.nome).join(', ')}
          </p>
        </div>
      )}

      <div className="mb-4 flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Cerca per codice, nome, tipo, marca..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="pl-9"
          />
        </div>
        {searchText && (
          <Button variant="outline" size="sm" onClick={() => setSearchText('')}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <h2 className="text-xl sm:text-2xl font-bold text-[hsl(var(--colori-color))] mb-4 sm:mb-5 flex items-center gap-2">
        <i className="fas fa-palette"></i> Giacenza Colori
        <span className="text-sm font-normal text-gray-500 ml-2">
          ({coloriFiltrati.length} colori)
        </span>
      </h2>

      {coloriFiltrati.length === 0 ? (
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Nessun colore trovato.</p>
      ) : (
        <TabellaColori
          colori={coloriFiltrati}
          onEdit={c => {
            setColoreToEdit(c);
            setIsEditModalOpen(true);
          }}
          onDelete={handleDeleteClick}
          onChangeDisponibilita={cambiaDisponibilitaColore}
          onScarico={c => setMovimentoModal({ colore: c, tipo: 'scarico' })}
          onCarico={c => setMovimentoModal({ colore: c, tipo: 'carico' })}
        />
      )}

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Eliminazione Colore</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare il colore{' '}
              <strong>{coloreToDelete?.nome}</strong> ({coloreToDelete?.codice})?
              Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isEditModalOpen && coloreToEdit && (
        <ModalModificaColore
          colore={coloreToEdit}
          onClose={() => {
            setIsEditModalOpen(false);
            setColoreToEdit(null);
          }}
          onModifica={async (codice, dati) => {
            await modificaColore(codice, dati);
          }}
        />
      )}

      {movimentoModal && (
        <ModalCaricoScaricoColore
          colore={movimentoModal.colore}
          tipo={movimentoModal.tipo}
          onClose={() => setMovimentoModal(null)}
          onConfirma={async (codice, quantita, extra) => {
            if (movimentoModal.tipo === 'carico') {
              return caricoColore(codice, quantita, extra.numero_ddt, extra.data_ddt, extra.lotto, extra.note);
            } else {
              return scaricoColore(codice, quantita, extra.macchina, extra.lavoro, extra.note);
            }
          }}
        />
      )}
    </div>
  );
}
