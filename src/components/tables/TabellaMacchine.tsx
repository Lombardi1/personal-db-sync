import React from 'react';
import { MacchinaProduzione, LavoroProduzione } from '@/types';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Play, Pause, CheckCircle, XCircle, Info } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface TabellaMacchineProps {
  macchine: MacchinaProduzione[];
  lavori: LavoroProduzione[];
  onEditLavoro: (lavoro: LavoroProduzione) => void;
  onDeleteLavoro: (lavoro: LavoroProduzione) => void;
  onUpdateLavoroStatus: (lavoro: LavoroProduzione, newStatus: LavoroProduzione['stato']) => void;
}

export function TabellaMacchine({
  macchine,
  lavori,
  onEditLavoro,
  onDeleteLavoro,
  onUpdateLavoroStatus,
}: TabellaMacchineProps) {

  const getStatusBadgeClass = (status: LavoroProduzione['stato']) => {
    switch (status) {
      case 'in_attesa': return 'bg-yellow-100 text-yellow-800';
      case 'in_produzione': return 'bg-blue-100 text-blue-800';
      case 'completato': return 'bg-green-100 text-green-800';
      case 'annullato': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <ScrollArea className="w-full rounded-md border">
      <div className="w-full min-w-max">
        <table id="tab-macchine-lavori" className="w-full border-collapse text-xs table-auto">
          <thead>
            <tr className="bg-[hsl(210,40%,98%)] border-b-2 border-[hsl(var(--border))]">
              <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold min-w-[80px]">Macchina</th>
              <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold min-w-[120px]">Lavoro</th>
              <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold min-w-[80px]">Stato</th>
              <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold min-w-[80px]">Inizio Previsto</th>
              <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold min-w-[80px]">Fine Prevista</th>
              <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold min-w-[80px]">Inizio Effettivo</th>
              <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold min-w-[80px]">Fine Effettivo</th>
              <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold min-w-[150px]">Note</th>
              <th className="px-2 py-2 text-right text-[10px] sm:text-xs font-semibold min-w-[150px]">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {macchine.map((macchina) => {
              const lavoriPerMacchina = lavori.filter(l => l.macchina_id === macchina.id);
              if (lavoriPerMacchina.length === 0) {
                return (
                  <tr key={macchina.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(210,40%,98%)] transition-colors">
                    <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap font-bold">{macchina.nome}</td>
                    <td colSpan={8} className="px-2 py-1.5 text-[10px] sm:text-xs text-muted-foreground italic">
                      Nessun lavoro assegnato a questa macchina.
                    </td>
                  </tr>
                );
              }
              return lavoriPerMacchina.map((lavoro, index) => (
                <tr key={lavoro.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(210,40%,98%)] transition-colors">
                  {index === 0 && (
                    <td rowSpan={lavoriPerMacchina.length} className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap font-bold border-r border-[hsl(var(--border))]">
                      {macchina.nome}
                    </td>
                  )}
                  <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap">{lavoro.nome_lavoro}</td>
                  <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap">
                    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", getStatusBadgeClass(lavoro.stato))}>
                      {lavoro.stato.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap">{lavoro.data_inizio_prevista ? format(new Date(lavoro.data_inizio_prevista), 'dd MMM yyyy', { locale: it }) : '-'}</td>
                  <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap">{lavoro.data_fine_prevista ? format(new Date(lavoro.data_fine_prevista), 'dd MMM yyyy', { locale: it }) : '-'}</td>
                  <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap">{lavoro.data_inizio_effettiva ? format(new Date(lavoro.data_inizio_effettiva), 'dd MMM yyyy', { locale: it }) : '-'}</td>
                  <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap">{lavoro.data_fine_effettiva ? format(new Date(lavoro.data_fine_effettiva), 'dd MMM yyyy', { locale: it }) : '-'}</td>
                  <td className="px-2 py-1.5 text-[10px] sm:text-xs max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap">{lavoro.note || '-'}</td>
                  <td className="px-2 py-1.5 text-right">
                    <div className="flex justify-end gap-1">
                      {lavoro.stato === 'in_attesa' && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => onUpdateLavoroStatus(lavoro, 'in_produzione')}
                          className="h-7 w-7 sm:h-8 sm:w-8 bg-blue-100 text-blue-700 hover:bg-blue-200"
                          title="Inizia Lavoro"
                        >
                          <Play className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      )}
                      {lavoro.stato === 'in_produzione' && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => onUpdateLavoroStatus(lavoro, 'completato')}
                          className="h-7 w-7 sm:h-8 sm:w-8 bg-green-100 text-green-700 hover:bg-green-200"
                          title="Completa Lavoro"
                        >
                          <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      )}
                      {(lavoro.stato === 'in_attesa' || lavoro.stato === 'in_produzione') && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => onUpdateLavoroStatus(lavoro, 'annullato')}
                          className="h-7 w-7 sm:h-8 sm:w-8 bg-red-100 text-red-700 hover:bg-red-200"
                          title="Annulla Lavoro"
                        >
                          <XCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => onEditLavoro(lavoro)}
                        className="h-7 w-7 sm:h-8 sm:w-8"
                        title="Modifica Lavoro"
                      >
                        <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => onDeleteLavoro(lavoro)}
                        className="h-7 w-7 sm:h-8 sm:w-8"
                        title="Elimina Lavoro"
                      >
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ));
            })}
          </tbody>
        </table>
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}