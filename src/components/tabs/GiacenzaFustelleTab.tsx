import React, { useState, useEffect } from 'react';
import { Fustella, StoricoMovimentoFustella } from '@/types';
import { Filters } from '@/components/Filters';
import { Button } from '@/components/ui/button';
import * as notifications from '@/utils/notifications';
import { esportaTabellaXLS, esportaTabellaPDF } from '@/utils/export';

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
    descrizione: '',
    formato: '',
    materiale: '',
    ubicazione: '',
  });
  const [fustelleFiltered, setFustelleFiltered] = useState<Fustella[]>([]);

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
          return String(field).toLowerCase().includes(value.toLowerCase());
        });
      }
    });

    setFustelleFiltered(filtered);
  };

  const resetFiltri = () => {
    const emptyFiltri = {
      codice: '',
      descrizione: '',
      formato: '',
      materiale: '',
      ubicazione: '',
    };
    setFiltri(emptyFiltri);
    setFustelleFiltered(fustelle);
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
        sezione="fustelle-giacenza" // Nuova sezione per i filtri
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
        <div className="bg-white border border-[hsl(214,32%,91%)] rounded-lg shadow-sm p-6">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Tabella Giacenza Fustelle (in costruzione)
          </p>
          {/* Qui andrà la TabellaFustelle */}
        </div>
      )}
    </div>
  );
}