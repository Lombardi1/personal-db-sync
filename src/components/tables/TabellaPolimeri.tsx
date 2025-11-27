import React from 'react';
import { Polimero } from '@/types';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface TabellaPolimeriProps {
  polimeri: Polimero[];
  onEdit: (polimero: Polimero) => void;
  onDelete: (codice: string) => void;
  onChangeDisponibilita: (codice: string, disponibile: boolean) => void;
}

export function TabellaPolimeri({ polimeri, onEdit, onDelete, onChangeDisponibilita }: TabellaPolimeriProps) {
  return (
    <ScrollArea className="w-full rounded-md border">
      <div className="w-full min-w-max">
        <table id="tab-polimeri" className="w-full border-collapse text-xs table-auto">
          <thead>
            <tr className="bg-[hsl(210,40%,98%)] border-b-2 border-[hsl(var(--border))]">
              <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold min-w-[60px]">ID</th>
              <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold min-w-[100px]">Nr. Fustella</th> {/* Rinomina in Nr. Polimero se preferisci */}
              <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold min-w-[80px]">Codice Fornitore</th>
              <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold min-w-[80px]">Cliente</th>
              <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold min-w-[80px]">Lavoro</th>
              <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold min-w-[50px]">Resa</th>
              <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold min-w-[150px]">Note</th>
              <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold min-w-[80px]">Ultima Modifica</th>
              <th className="px-2 py-2 text-right text-[10px] sm:text-xs font-semibold min-w-[100px]">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {polimeri.map((polimero) => (
              <tr key={polimero.codice} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(210,40%,98%)] transition-colors">
                <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap">
                  <span className="codice">{polimero.codice}</span>
                </td>
                <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-normal max-w-[100px] overflow-hidden text-ellipsis">{polimero.nr_fustella || '-'}</td>
                <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap">{polimero.codice_fornitore || '-'}</td>
                <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap">{polimero.cliente || '-'}</td>
                <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap">{polimero.lavoro || '-'}</td>
                <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap">{polimero.resa || '-'}</td>
                <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-normal max-w-[150px] overflow-hidden text-ellipsis">{polimero.note || '-'}</td>
                <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap">
                  {polimero.ultima_modifica ? format(new Date(polimero.ultima_modifica), 'dd MMM yyyy HH:mm', { locale: it }) : '-'}
                </td>
                <td className="px-2 py-1.5 text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => onEdit(polimero)}
                      className="h-7 w-7 sm:h-8 sm:w-8"
                      title="Modifica Polimero"
                    >
                      <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => onChangeDisponibilita(polimero.codice, !polimero.disponibile)}
                      className={`h-7 w-7 sm:h-8 sm:w-8 ${polimero.disponibile ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                      title={polimero.disponibile ? "Imposta come Non Disponibile" : "Imposta come Disponibile"}
                    >
                      {polimero.disponibile ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => onDelete(polimero.codice)}
                      className="h-7 w-7 sm:h-8 sm:w-8"
                      title="Elimina Polimero"
                    >
                      <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}