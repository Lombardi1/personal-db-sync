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
  spostaInGiacenza: (codice: string, ddt: string, dataArrivo: string, fogliEffettivi?: number) => Promise<{ error: any }>;
  confermaOrdine: (codice: string, confermato: boolean) => Promise<{ error: any }>;
  eliminaOrdine: (codice: string) => Promise<void>;
  modificaOrdine: (codice: string, dati: Partial<Cartone>) => Promise<void>;
  storico: any[];
}

export function OrdiniTab({ ordini, spostaInGiacenza, confermaOrdine, eliminaOrdine, modificaOrdine }: OrdiniTabProps) {
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
    let filtered = ordini;

    Object.entries(newFiltri).forEach(([key, value]) => {
      if (value) {
        // Gestione speciale per il campo formato: normalizza gli spazi
        if (key === 'formato') {
          filtered = filtered.filter(c => {
            const field = c[key as keyof Cartone];
            const normalizedField = String(field).replace(/\s+/g, '').toLowerCase();
            const normalizedValue = value.replace(/\s+/g, '').toLowerCase();
            return normalizedField.includes(normalizedValue);
          });
        }
        // Gestione normale per gli altri campi (rimosso filtro confermato come select)
        else {
          filtered = filtered.filter(c => {
            const field = c[key as keyof Cartone];
            return String(field).toLowerCase().includes(value.toLowerCase());
          });
        }
      }
    });

    // Ordina per data di consegna (data più vicina sopra = crescente)
    filtered.sort((a, b) => {
      const dateA = new Date(a.data_consegna || '9999-12-31').getTime();
      const dateB = new Date(b.data_consegna || '9999-12-31').getTime();
      return dateA - dateB;
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

      <h2 className="text-2xl font-bold text-[hsl(var(--ordini-color))] mb-5 flex items-center gap-2">
        <i className="fas fa-truck"></i> Ordini in arrivo
      </h2>

      <div className="mb-3 flex gap-2">
        <Button
          onClick={() => esportaTabellaXLS('tab-ordini', 'ordini.xlsx')}
          className="bg-[hsl(0,72%,90%)] text-[hsl(var(--ordini-color))] hover:bg-[hsl(0,72%,80%)]"
        >
          <i className="fas fa-file-excel mr-2"></i> Esporta XLS
        </Button>
        <Button
          onClick={() => esportaTabellaPDF('tab-ordini', 'ordini.pdf')}
          className="bg-[hsl(0,72%,90%)] text-[hsl(var(--ordini-color))] hover:bg-[hsl(0,72%,80%)]"
        >
          <i className="fas fa-file-pdf mr-2"></i> Esporta PDF
        </Button>
      </div>

      <TabellaOrdini 
        ordini={ordiniFiltered}
        onConferma={confermaOrdine}
        onSpostaInMagazzino={(codice) => {
          setSelectedCodice(codice);
          setShowModalMagazzino(true);
        }}
        onModifica={(codice) => {
          setSelectedCodice(codice);
          setShowModalModifica(true);
        }}
        onElimina={eliminaOrdine}
      />

      {showModalMagazzino && selectedCodice && (
        <ModalConfermaMagazzino
          codice={selectedCodice}
          ordine={ordini.find(o => o.codice === selectedCodice)!}
          onClose={() => setShowModalMagazzino(false)}
          onConferma={spostaInGiacenza}
        />
      )}

      {showModalModifica && selectedCodice && (
        <ModalModificaOrdine
          ordine={ordini.find(o => o.codice === selectedCodice)!}
          onClose={() => setShowModalModifica(false)}
          onModifica={modificaOrdine}
        />
      )}
    </div>
  );
}
