import React from 'react';
import { MacchinaProduzione } from '@/types';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface TabellaGestioneMacchineProps {
  macchine: MacchinaProduzione[];
  onEdit: (macchina: MacchinaProduzione) => void;
  onDelete: (macchina: MacchinaProduzione) => void;
}

export function TabellaGestioneMacchine({ macchine, onEdit, onDelete }: TabellaGestioneMacchineProps) {
  return (
    <ScrollArea className="w-full rounded-md border">
      <div className="w-full min-w-max">
        <table id="tab-gestione-macchine" className="w-full border-collapse text-xs table-auto">
          <thead>
            <tr className="bg-[hsl(210,40%,98%)] border-b-2 border-[hsl(var(--border))]">
              <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold min-w-[100px]">Nome</th>
              <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold min-w-[100px]">Tipo</th>
              <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold min-w-[200px]">Descrizione</th>
              <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold min-w-[100px]">Data Creazione</th>
              <th className="px-2 py-2 text-right text-[10px] sm:text-xs font-semibold min-w-[100px]">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {macchine.map((macchina) => (
              <tr key={macchina.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(210,40%,98%)] transition-colors">
                <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap font-bold">{macchina.nome}</td>
                <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap">{macchina.tipo}</td>
                <td className="px-2 py-1.5 text-[10px] sm:text-xs max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap">{macchina.descrizione || '-'}</td>
                <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap">
                  {macchina.created_at ? format(new Date(macchina.created_at), 'dd MMM yyyy', { locale: it }) : '-'}
                </td>
                <td className="px-2 py-1.5 text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => onEdit(macchina)}
                      className="h-7 w-7 sm:h-8 sm:w-8"
                      title="Modifica Macchina"
                    >
                      <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => onDelete(macchina)}
                      className="h-7 w-7 sm:h-8 sm:w-8"
                      title="Elimina Macchina"
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