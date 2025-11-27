import React from 'react';
import { Fustella } from '@/types';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface TabellaFustelleProps {
  fustelle: Fustella[];
  onEdit: (fustella: Fustella) => void;
  onDelete: (codice: string) => void;
  onChangeDisponibilita: (codice: string, disponibile: boolean) => void;
}

export function TabellaFustelle({ fustelle, onEdit, onDelete, onChangeDisponibilita }: TabellaFustelleProps) {
  return (
    <ScrollArea className="w-full rounded-md border">
      <div className="w-full min-w-max">
        <table id="tab-fustelle" className="w-full border-collapse text-xs table-auto">
          <thead>
            <tr className="bg-[hsl(210,40%,98%)] border-b-2 border-[hsl(var(--border))]">
              <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold min-w-[60px]">Codice</th>
              <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold min-w-[80px]">Fornitore</th>
              <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold min-w-[80px]">Cod. Fornitore</th>
              <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold min-w-[80px]">Cliente</th>
              <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold min-w-[80px]">Lavoro</th>
              <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold min-w-[80px]">Fustellatrice</th>
              <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold min-w-[50px]">Resa</th>
              <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold min-w-[80px]">Codice Pulitore</th> {/* CAMBIATO */}
              <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold min-w-[50px]">Pinza Tagliata</th>
              <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold min-w-[50px]">Tasselli</th>
              <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold min-w-[50px]">Nr. Tasselli</th>
              <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold min-w-[50px]">Incollatura</th>
              <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold min-w-[80px]">Incollatrice</th>
              <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold min-w-[80px]">Tipo Incollatura</th>
              <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold min-w-[80px]">Ultima Modifica</th>
              <th className="px-2 py-2 text-right text-[10px] sm:text-xs font-semibold min-w-[100px]">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {fustelle.map((fustella) => (
              <tr key={fustella.codice} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(210,40%,98%)] transition-colors">
                <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap">
                  <span className="codice">{fustella.codice}</span>
                </td>
                <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap">{fustella.fornitore || '-'}</td>
                <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap">{fustella.codice_fornitore || '-'}</td>
                <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap">{fustella.cliente || '-'}</td>
                <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap">{fustella.lavoro || '-'}</td>
                <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap">{fustella.fustellatrice || '-'}</td>
                <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap">{fustella.resa || '-'}</td>
                <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap">{fustella.pulitore_codice || '-'}</td> {/* CAMBIATO */}
                <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap">{fustella.pinza_tagliata ? 'Sì' : 'No'}</td>
                <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap">{fustella.tasselli_intercambiabili ? 'Sì' : 'No'}</td>
                <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap">{fustella.nr_tasselli || '-'}</td>
                <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap">{fustella.incollatura ? 'Sì' : 'No'}</td>
                <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap">{fustella.incollatrice || '-'}</td>
                <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap">{fustella.tipo_incollatura || '-'}</td>
                <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap">
                  {fustella.ultima_modifica ? format(new Date(fustella.ultima_modifica), 'dd MMM yyyy HH:mm', { locale: it }) : '-'}
                </td>
                <td className="px-2 py-1.5 text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => onEdit(fustella)}
                      className="h-7 w-7 sm:h-8 sm:w-8"
                      title="Modifica Fustella"
                    >
                      <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => onChangeDisponibilita(fustella.codice, !fustella.disponibile)}
                      className={`h-7 w-7 sm:h-8 sm:w-8 ${fustella.disponibile ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                      title={fustella.disponibile ? "Imposta come Non Disponibile" : "Imposta come Disponibile"}
                    >
                      {fustella.disponibile ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => onDelete(fustella.codice)}
                      className="h-7 w-7 sm:h-8 sm:w-8"
                      title="Elimina Fustella"
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