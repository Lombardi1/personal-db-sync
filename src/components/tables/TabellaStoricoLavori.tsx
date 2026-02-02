import React from 'react';
import { StoricoLavoroProduzione } from '@/types';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface TabellaStoricoLavoriProps {
  storicoLavori: StoricoLavoroProduzione[];
}

export function TabellaStoricoLavori({ storicoLavori }: TabellaStoricoLavoriProps) {
  const getStatusBadgeClass = (status: string | null | undefined) => {
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
        <table id="tab-storico-lavori" className="w-full border-collapse text-xs table-auto">
          <thead>
            <tr className="bg-[hsl(210,40%,98%)] border-b-2 border-[hsl(var(--border))]">
              <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold min-w-[80px]">Data</th>
              <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold min-w-[80px]">Utente</th>
              <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold min-w-[80px]">Macchina</th>
              <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold min-w-[120px]">Lavoro</th>
              <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold min-w-[80px]">Tipo Movimento</th>
              <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold min-w-[80px]">Vecchio Stato</th>
              <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold min-w-[80px]">Nuovo Stato</th>
              <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold min-w-[200px]">Dettagli Modifica</th>
            </tr>
          </thead>
          <tbody>
            {storicoLavori.map((mov) => (
              <tr key={mov.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(210,40%,98%)] transition-colors">
                <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap">
                  {format(new Date(mov.data), 'dd MMM yyyy HH:mm', { locale: it })}
                </td>
                <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap">{mov.username || 'Sconosciuto'}</td>
                <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap">{mov.macchina_nome || 'Sconosciuta'}</td>
                <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap">{mov.nome_lavoro || 'Sconosciuto'}</td>
                <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap">{mov.tipo.replace(/_/g, ' ')}</td>
                <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap">
                  {mov.vecchio_stato ? (
                    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", getStatusBadgeClass(mov.vecchio_stato))}>
                      {mov.vecchio_stato.replace(/_/g, ' ')}
                    </span>
                  ) : '-'}
                </td>
                <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap">
                  {mov.nuovo_stato ? (
                    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", getStatusBadgeClass(mov.nuovo_stato))}>
                      {mov.nuovo_stato.replace(/_/g, ' ')}
                    </span>
                  ) : '-'}
                </td>
                <td className="px-2 py-1.5 text-[10px] sm:text-xs max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap">
                  {mov.dettagli_modifica || '-'}
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