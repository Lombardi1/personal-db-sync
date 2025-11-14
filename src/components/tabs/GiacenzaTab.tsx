import { useState, useEffect } from 'react';
import { Cartone } from '@/types';
import { Filters } from '@/components/Filters';
import { TabellaGiacenza } from '@/components/tables/TabellaGiacenza';
import { ModalScarico } from '@/components/modals/ModalScarico';
import { ModalStorico } from '@/components/modals/ModalStorico';
import { Button } from '@/components/ui/button';
import { esportaTabellaXLS, esportaTabellaPDF } from '@/utils/export';

interface GiacenzaTabProps {
  giacenza: Cartone[];
  scaricoFogli: (codice: string, quantita: number, note: string) => Promise<{ error: any }>;
  riportaInOrdini: (codice: string) => Promise<{ error: any }>;
  storico: any[];
}

export function GiacenzaTab({ giacenza, scaricoFogli, riportaInOrdini, storico }: GiacenzaTabProps) {
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
  const [cartoniFiltered, setCartoniFiltered] = useState<Cartone[]>([]);
  const [selectedCodice, setSelectedCodice] = useState<string | null>(null);
  const [showModalScarico, setShowModalScarico] = useState(false);
  const [showModalStorico, setShowModalStorico] = useState(false);

  // Update filtered giacenza whenever giacenza changes
  useEffect(() => {
    handleFilter(filtri);
  }, [giacenza]);

  const handleFilter = (newFiltri: typeof filtri) => {
    setFiltri(newFiltri);
    let filtered = giacenza;

    Object.entries(newFiltri).forEach(([key, value]) => {
      if (value) {
        // Gestione speciale per il campo formato: rimuove tutti i caratteri non numerici
        if (key === 'formato') {
          filtered = filtered.filter(c => {
            const field = c[key as keyof Cartone];
            // Rimuovi tutti i caratteri non numerici (spazi, x, cm, etc.)
            const normalizedField = String(field).replace(/[^\d]/g, '');
            const normalizedValue = value.replace(/[^\d]/g, '');
            return normalizedField.includes(normalizedValue);
          });
        }
        // Gestione normale per gli altri campi
        else {
          filtered = filtered.filter(c => {
            const field = c[key as keyof Cartone];
            return String(field).toLowerCase().includes(value.toLowerCase());
          });
        }
      }
    });

    // Ordina per grammatura in modo crescente
    filtered.sort((a, b) => {
      const grammA = parseInt(String(a.grammatura)) || 0;
      const grammB = parseInt(String(b.grammatura)) || 0;
      return grammA - grammB;
    });

    setCartoniFiltered(filtered);
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
    setCartoniFiltered(giacenza);
  };

  return (
    <div>
      <Filters 
        filtri={filtri} 
        onFilter={handleFilter} 
        onReset={resetFiltri}
        matchCount={cartoniFiltered.length}
        sezione="dashboard"
      />

      <h2 className="text-2xl font-bold text-[hsl(var(--primary))] mb-5 flex items-center gap-2">
        <i className="fas fa-th-large"></i> Cartoni Disponibili
      </h2>

      <div className="mb-3 flex gap-2">
        <Button
          onClick={() => esportaTabellaXLS('tab-dashboard', 'giacenza.xlsx')}
          className="bg-[hsl(217,91%,88%)] text-[hsl(var(--primary-dark))] hover:bg-[hsl(217,91%,78%)]"
        >
          <i className="fas fa-file-excel mr-2"></i> Esporta XLS
        </Button>
        <Button
          onClick={() => esportaTabellaPDF('tab-dashboard', 'giacenza.pdf')}
          className="bg-[hsl(217,91%,88%)] text-[hsl(var(--primary-dark))] hover:bg-[hsl(217,91%,78%)]"
        >
          <i className="fas fa-file-pdf mr-2"></i> Esporta PDF
        </Button>
      </div>

      <TabellaGiacenza 
        cartoni={cartoniFiltered}
        onScarico={(codice) => {
          setSelectedCodice(codice);
          setShowModalScarico(true);
        }}
        onStorico={(codice) => {
          setSelectedCodice(codice);
          setShowModalStorico(true);
        }}
        onRiportaOrdini={riportaInOrdini}
      />

      {showModalScarico && selectedCodice && (
        <ModalScarico
          codice={selectedCodice}
          cartone={giacenza.find(c => c.codice === selectedCodice)!}
          onClose={() => setShowModalScarico(false)}
          onScarico={scaricoFogli}
        />
      )}

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
