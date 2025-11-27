import React, { useState, useEffect } from 'react';
import { StoricoMovimentoPolimero } from '@/types';
import { Button } from '@/components/ui/button';
import * as notifications from '@/utils/notifications';
import { esportaTabellaXLS, esportaTabellaPDF } from '@/utils/export';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface StoricoPolimeriTabProps {
  storico: StoricoMovimentoPolimero[];
}

export function StoricoPolimeriTab({ storico }: StoricoPolimeriTabProps) {
  const [filtri, setFiltri] = useState({
    codice_polimero: '',
    tipo: '',
    username: '',
  });
  const [storicoFiltered, setStoricoFiltered] = useState<StoricoMovimentoPolimero[]>([]);

  useEffect(() => {
    handleFilter(filtri);
  }, [storico]);

  const handleFilter = (newFiltri: typeof filtri) => {
    setFiltri(newFiltri);
    let filtered = storico;

    Object.entries(newFiltri).forEach(([key, value]) => {
      if (value) {
        filtered = filtered.filter(mov => {
          const field = mov[key as keyof StoricoMovimentoPolimero];
          return String(field || '').toLowerCase().includes(value.toLowerCase());
        });
      }
    });

    setStoricoFiltered(filtered);
  };

  const resetFiltri = () => {
    const emptyFiltri = {
      codice_polimero: '',
      tipo: '',
      username: '',
    };
    setFiltri(emptyFiltri);
    setStoricoFiltered(storico);
  };

  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold text-[hsl(var(--polimeri-color))] mb-4 sm:mb-5 flex items-center gap-2">
        <i className="fas fa-history"></i> Storico Movimenti Polimeri
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

      {storicoFiltered.length === 0 ? (
        <p className="text-sm sm:text-base text-[hsl(var(--muted-foreground))]">Nessun movimento registrato per i polimeri.</p>
      ) : (
        <ScrollArea className="w-full rounded-md border">
          <div className="w-full min-w-max">
            <table id="tab-storico-polimeri" className="w-full border-collapse">
              <thead>
                <tr className="bg-[hsl(210,40%,98%)] border-b-2 border-[hsl(var(--border))]">
                  <th className="px-3 py-3 text-left text-[10px] sm:text-sm font-semibold">Codice Polimero</th>
                  <th className="px-3 py-3 text-left text-[10px] sm:text-sm font-semibold">Data</th>
                  <th className="px-3 py-3 text-left text-[10px] sm:text-sm font-semibold">Tipo</th>
                  <th className="px-3 py-3 text-left text-[10px] sm:text-sm font-semibold">Utente</th>
                  <th className="px-3 py-3 text-left text-[10px] sm:text-sm font-semibold">Note</th>
                </tr>
              </thead>
              <tbody>
                {storicoFiltered.map((mov, idx) => (
                  <tr key={mov.id || idx} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(210,40%,98%)] transition-colors">
                    <td className="px-3 py-2 text-[10px] sm:text-sm">
                      <span className="codice">{mov.codice_polimero}</span>
                    </td>
                    <td className="px-3 py-2 text-[10px] sm:text-sm">
                      {format(new Date(mov.data), 'dd MMM yyyy HH:mm', { locale: it })}
                    </td>
                    <td className="px-3 py-2 text-[10px] sm:text-sm">
                      <span className={`inline-block px-2 py-1 rounded-full text-[10px] sm:text-xs font-semibold ${
                        mov.tipo === 'carico'
                          ? 'bg-[hsl(142,76%,89%)] text-[hsl(142,64%,24%)]'
                          : mov.tipo === 'scarico'
                            ? 'bg-[hsl(0,100%,95%)] text-[hsl(0,64%,40%)]'
                            : 'bg-[hsl(39,100%,90%)] text-[hsl(39,100%,50%)]' // Colore per 'modifica'
                      }`}>
                        {mov.tipo === 'carico' ? '↑ Carico' : mov.tipo === 'scarico' ? '↓ Scarico' : '↔ Modifica'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[10px] sm:text-sm">{mov.username || 'Sconosciuto'}</td>
                    <td className="px-3 py-2 text-[10px] sm:text-sm">{mov.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}
    </div>
  );
}