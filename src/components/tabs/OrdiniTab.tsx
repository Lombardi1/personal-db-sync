import { useState, useEffect } from 'react';
import { Cartone } from '@/types';
import { Filters } from '@/components/Filters';
import { TabellaOrdini } from '@/components/tables/TabellaOrdini';
import { ModalConfermaMagazzino } from '@/components/modals/ModalConfermaMagazzino';
import { ModalModificaOrdine } from '@/components/modals/ModalModificaOrdine';
import { Button } from '@/components/ui/button';
import { esportaTabellaXLS, esportaTabellaPDF } from '@/utils/export';

interface OrdiniTabProps {
  ordini: Cartone[];
  onConferma: (codice: string, confermato: boolean) => void;
  onSpostaInMagazzino: (codice: string) => void;
  onModifica: (codice: string) => void;
  onElimina: (codice: string) => void;
  storico: any[];
}

export function OrdiniTab({ ordini, onConferma, onSpostaInMagazzino, onModifica, onElimina }: OrdiniTabProps) {
  const [filtri, setFiltri] = useState({
    codice: '',
    fornitore: '',
    tipologia: '',
    formato: '',
    grammatura: '',
    cliente: '',
    lavoro: '',
    magazzino: '',
    confermato: ''
  });
  const [ordiniFiltered, setOrdiniFiltered] = useState(ordini);
  const [selectedCodice, setSelectedCodice] = useState<string | null>(null);
  const [showModalMagazzino, setShowModalMagazzino] = useState(false);
  const [showModalModifica, setShowModalModifica] = useState(false);

  // Update filtered ordini whenever ordini changes
  useEffect(() => {
    handleFilter(filtri);
  }, [ordini]);

  const handleFilter = (newFiltri: typeof filtri) => {
    setFiltri(newFiltri);
    let filtered = [...ordini]; // Create a shallow copy to avoid direct state mutation

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
        // Gestione del filtro 'confermato'
        else if (key === 'confermato') {
          filtered = filtered.filter(c => {
            const isConfirmed = c.confermato;
            if (value.toLowerCase() === 'sì' || value.toLowerCase() === 'si') {
              return isConfirmed;
            }
            if (value.toLowerCase() === 'no') {
              return !isConfirmed;
            }
            return true; // Se il valore del filtro non è 'sì' o 'no', non filtrare per conferma
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

    // Ordina prima per grammatura (numerico) e poi per formato (alfabetico)
    filtered.sort((a, b) => {
      // Estrai solo il valore numerico della grammatura
      const grammA = parseInt(String(a.grammatura).replace(' g/m²', '')) || 0;
      const grammB = parseInt(String(b.grammatura).replace(' g/m²', '')) || 0;

      if (grammA !== grammB) {
        return grammA - grammB; // Ordina per grammatura crescente
      }

      // Se la grammatura è uguale, ordina per formato (alfabetico)
      return String(a.formato).localeCompare(String(b.formato));
    });

    setOrdiniFiltered(filtered);
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
      magazzino: '',
      confermato: ''
    };
    setFiltri(emptyFiltri);
    handleFilter(emptyFiltri);
  };

  return (
    <div>
      <Filters 
        filtri={filtri} 
        onFilter={handleFilter} 
        onReset={resetFiltri}
        matchCount={ordiniFiltered.length}
        sezione="ordini"
      />

      <h2 className="text-xl sm:text-2xl font-bold text-[hsl(var(--ordini-color))] mb-4 sm:mb-5 flex items-center gap-2">
        <i className="fas fa-truck"></i> Ordini in arrivo
      </h2>

      <div className="mb-3 flex flex-wrap gap-2">
        <Button
          onClick={() => esportaTabellaXLS('tab-ordini', 'ordini.xlsx')}
          className="bg-[hsl(0,72%,90%)] text-[hsl(var(--ordini-color))] hover:bg-[hsl(0,72%,80%)] text-sm py-2 px-3"
        >
          <i className="fas fa-file-excel mr-1 sm:mr-2"></i> <span className="hidden sm:inline">Esporta</span> XLS
        </Button>
        <Button
          onClick={() => {
            esportaTabellaPDF('tab-ordini', 'ordini.pdf', 'ordini', ordiniFiltered); // Passa ordiniFiltered
          }}
          className="bg-[hsl(0,72%,90%)] text-[hsl(var(--ordini-color))] hover:bg-[hsl(0,72%,80%)] text-sm py-2 px-3"
        >
          <i className="fas fa-file-pdf mr-1 sm:mr-2"></i> <span className="hidden sm:inline">Esporta</span> PDF
        </Button>
      </div>

      <TabellaOrdini 
        ordini={ordiniFiltered}
        onConferma={onConferma}
        onSpostaInMagazzino={(codice) => {
          setSelectedCodice(codice);
          setShowModalMagazzino(true);
        }}
        onModifica={(codice) => {
          setSelectedCodice(codice);
          setShowModalModifica(true);
        }}
        onElimina={onElimina}
      />

      {showModalMagazzino && selectedCodice && (
        <ModalConfermaMagazzino
          codice={selectedCodice}
          ordine={ordini.find(o => o.codice === selectedCodice)!}
          onClose={() => setShowModalMagazzino(false)}
          onConferma={onSpostaInMagazzino}
        />
      )}

      {showModalModifica && selectedCodice && (
        <ModalModificaOrdine
          ordine={ordini.find(o => o.codice === selectedCodice)!}
          onClose={() => setShowModalModifica(false)}
          onModifica={onModifica}
        />
      )}
    </div>
  );
}