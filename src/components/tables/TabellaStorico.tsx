import { StoricoMovimento } from '@/types';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface TabellaStoricoProps {
  storico: StoricoMovimento[];
  tableId?: string; // Aggiunta la prop opzionale tableId
}

export function TabellaStorico({ storico, tableId = "tab-storico" }: TabellaStoricoProps) { // Valore di default per tableId
  console.log("TabellaStorico: Received storico prop:", storico); // Log di debug
  return (
    <ScrollArea className="w-full rounded-md">
      <div className="w-full min-w-max">
        <table id={tableId} className="w-full border-collapse"> {/* Usa tableId qui */}
        <thead>
          <tr className="bg-[hsl(210,40%,98%)] border-b-2 border-[hsl(var(--border))]">
                <th className="px-3 py-3 text-left text-[10px] sm:text-sm font-semibold">Codice</th>
                <th className="px-3 py-3 text-left text-[10px] sm:text-sm font-semibold">Data</th>
                <th className="px-3 py-3 text-left text-[10px] sm:text-sm font-semibold">Tipo</th>
                <th className="px-3 py-3 text-left text-[10px] sm:text-sm font-semibold">Quantità</th>
                <th className="px-3 py-3 text-left text-[10px] sm:text-sm font-semibold">Utente</th>
                <th className="px-3 py-3 text-left text-[10px] sm:text-sm font-semibold">Cliente</th> {/* NUOVO */}
                <th className="px-3 py-3 text-left text-[10px] sm:text-sm font-semibold">Lavoro</th> {/* NUOVO */}
                <th className="px-3 py-3 text-left text-[10px] sm:text-sm font-semibold">Ordine Acquisto</th>
                <th className="px-3 py-3 text-left text-[10px] sm:text-sm font-semibold">Note</th>
          </tr>
        </thead>
        <tbody id="storico-body">
          {storico.map((mov, idx) => (
            <tr key={mov.id || idx} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(210,40%,98%)] transition-colors">
              <td className="px-3 py-2 text-[10px] sm:text-sm">
                <span className="codice">{mov.codice}</span>
              </td>
              <td className="px-3 py-2 text-[10px] sm:text-sm">
                {format(new Date(mov.data), 'dd MMM yyyy HH:mm', { locale: it })}
              </td>
              <td className="px-3 py-2 text-[10px] sm:text-sm">
                <span className={`inline-block px-2 py-1 rounded-full text-[10px] sm:text-xs font-semibold ${
                  mov.tipo === 'carico' 
                    ? 'bg-[hsl(142,76%,89%)] text-[hsl(142,64%,24%)]' 
                    : 'bg-[hsl(0,100%,95%)] text-[hsl(0,64%,40%)]'
                }`}>
                  {mov.tipo === 'carico' ? '↑ Carico' : '↓ Scarico'}
                </span>
              </td>
              <td className="px-3 py-2 text-[10px] sm:text-sm font-semibold">{mov.quantita}</td>
              <td className="px-3 py-2 text-[10px] sm:text-sm">{mov.username || 'Sconosciuto'}</td>
              <td className="px-3 py-2 text-[10px] sm:text-sm">{mov.cliente || '-'}</td> {/* NUOVO */}
              <td className="px-3 py-2 text-[10px] sm:text-sm">{mov.lavoro || '-'}</td> {/* NUOVO */}
              <td className="px-3 py-2 text-[10px] sm:text-sm">{mov.numero_ordine_acquisto || '-'}</td>
              <td className="px-3 py-2 text-[10px] sm:text-sm">{mov.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}