import { useState } from 'react';
import { Cartone } from '@/types';
import { Filters } from '@/components/Filters';
import { TabellaEsauriti } from '@/components/tables/TabellaEsauriti';
import { ModalStorico } from '@/components/modals/ModalStorico';
import { Button } from '@/components/ui/button';
import { esportaTabellaXLS, esportaTabellaPDF } from '@/utils/export';

interface EsauritiTabProps {
  esauriti: Cartone[];
  riportaInGiacenza: (codice: string) => Promise<{ error: any }>;
  storico: any[];
}

export function EsauritiTab({ esauriti, riportaInGiacenza, storico }: EsauritiTabProps) {
  const [filtri, setFiltri] = useState({
    codice: '',
    fornitore: '',
    tipologia: '',
    formato: '',
    grammatura: '',
    cliente: '',
    lavoro: '',
    magazzino: ''
  });
  const [esauritiFiltered, setEsauritiFiltered] = useState(esauriti);
  const [selectedCodice, setSelectedCodice] = useState<string | null>(null);
  const [showModalStorico, setShowModalStorico] = useState(false);

  const handleFilter = (newFiltri: typeof filtri) => {
    setFiltri(newFiltri);
    let filtered = esauriti;

    Object.entries(newFiltri).forEach(([key, value]) => {
      if (value) {
        filtered = filtered.filter(c => {
          const field = c[key as keyof Cartone];
          return String(field).toLowerCase().includes(value.toLowerCase());
        });
      }
    });

    setEsauritiFiltered(filtered);
  };

  const resetFiltri = () => {
    const emptyFiltri = {
      codice: '',
      fornitore: '',
      tipologia: '',
      formato: '',
      grammatura: '',
      cliente: '',
      lavoro: '',
      magazzino: ''
    };
    setFiltri(emptyFiltri);
    setEsauritiFiltered(esauriti);
  };

  return (
    <div>
      <Filters 
        filtri={filtri} 
        onFilter={handleFilter} 
        onReset={resetFiltri}
        matchCount={esauritiFiltered.length}
        sezione="esauriti"
      />

      <h2 className="text-2xl font-bold text-[hsl(var(--esauriti-color))] mb-5 flex items-center gap-2">
        <i className="fas fa-archive"></i> Cartoni Esauriti
      </h2>

      <div className="mb-3 flex gap-2">
        <Button
          onClick={() => esportaTabellaXLS('tab-esauriti', 'esauriti.xlsx')}
          className="bg-[hsl(142,71%,85%)] text-[hsl(var(--esauriti-color))] hover:bg-[hsl(142,71%,75%)]"
        >
          <i className="fas fa-file-excel mr-2"></i> Esporta XLS
        </Button>
        <Button
          onClick={() => esportaTabellaPDF('tab-esauriti', 'esauriti.pdf')}
          className="bg-[hsl(142,71%,85%)] text-[hsl(var(--esauriti-color))] hover:bg-[hsl(142,71%,75%)]"
        >
          <i className="fas fa-file-pdf mr-2"></i> Esporta PDF
        </Button>
      </div>

      <TabellaEsauriti 
        cartoni={esauritiFiltered}
        onStorico={(codice) => {
          setSelectedCodice(codice);
          setShowModalStorico(true);
        }}
        onRiportaGiacenza={riportaInGiacenza}
      />

      {showModalStorico && selectedCodice && (
        <ModalStorico
          codice={selectedCodice}
          movimenti={storico.filter(s => s.codice === selectedCodice)}
          onClose={() => setShowModalStorico(false)}
        />
      )}
    </div>
  );
}
