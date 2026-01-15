import { useState, useEffect } from 'react';
import { Cartone } from '@/types';
import { Filters } from '@/components/Filters';
import { TabellaEsauriti } from '@/components/tables/TabellaEsauriti';
import { ModalStorico } from '@/components/modals/ModalStorico';
import { Button } from '@/components/ui/button';
import { esportaTabellaXLS, esportaTabellaPDF } from '@/utils/export';
import * as notifications from '@/utils/notifications'; // Aggiornato a percorso relativo

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

  // Update filtered esauriti whenever esauriti changes
  useEffect(() => {
    handleFilter(filtri);
  }, [esauriti]); // Dipendenza aggiunta: esauriti

  const handleFilter = (newFiltri: typeof filtri) => {
    setFiltri(newFiltri);
    let filtered = esauriti;

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
            return String(field || '').toLowerCase().includes(value.toLowerCase());
          });
        }
      }
    });

    // Ordina per data_esaurimento in ordine decrescente (più recenti sopra)
    filtered.sort((a, b) => {
      const dateA = a.data_esaurimento ? new Date(a.data_esaurimento).getTime() : 0;
      const dateB = b.data_esaurimento ? new Date(b.data_esaurimento).getTime() : 0;
      return dateB - dateA; // Descending order
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
    handleFilter(emptyFiltri); // Applica i filtri vuoti per mostrare tutti gli esauriti
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

      <h2 className="text-xl sm:text-2xl font-bold text-[hsl(var(--esauriti-color))] mb-4 sm:mb-5 flex items-center gap-2">
        <i className="fas fa-archive"></i> Cartoni Esauriti
      </h2>

      <div className="mb-3 flex flex-wrap gap-2">
        <Button
          onClick={() => esportaTabellaXLS('tab-esauriti', 'esauriti.xlsx')}
          className="bg-[hsl(142,71%,85%)] text-[hsl(var(--esauriti-color))] hover:bg-[hsl(142,71%,75%)] text-sm py-2 px-3"
        >
          <i className="fas fa-file-excel mr-1 sm:mr-2"></i> <span className="hidden sm:inline">Esporta</span> XLS
        </Button>
        <Button
          onClick={() => esportaTabellaPDF('tab-esauriti', 'esauriti.pdf', 'esauriti')}
          className="bg-[hsl(142,71%,85%)] text-[hsl(var(--esauriti-color))] hover:bg-[hsl(142,71%,75%)] text-sm py-2 px-3"
        >
          <i className="fas fa-file-pdf mr-1 sm:mr-2"></i> <span className="hidden sm:inline">Esporta</span> PDF
        </Button>
      </div>

      {esauritiFiltered.length === 0 ? (
        <p className="text-sm sm:text-base text-[hsl(var(--muted-foreground))]">Nessun cartone esaurito.</p>
      ) : (
        <TabellaEsauriti 
          cartoni={esauritiFiltered}
          onStorico={(codice) => {
            setSelectedCodice(codice);
            setShowModalStorico(true);
          }}
          onRiportaGiacenza={riportaInGiacenza}
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