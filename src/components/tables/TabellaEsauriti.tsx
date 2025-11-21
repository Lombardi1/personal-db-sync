import { useState } from 'react';
import { Cartone } from '@/types';
import { formatFormato, formatPrezzo, formatFogli } from '@/utils/formatters';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface TabellaEsauritiProps {
  cartoni: Cartone[];
  onStorico: (codice: string) => void;
  onRiportaGiacenza: (codice: string) => void;
}

export function TabellaEsauriti({ cartoni, onStorico, onRiportaGiacenza }: TabellaEsauritiProps) {
  const [codiceRiporto, setCodiceRiporto] = useState<string | null>(null);

  return (
    <ScrollArea className="w-full rounded-md">
      <div className="w-full min-w-max">
        <table id="tab-esauriti" className="w-full border-collapse table-auto">
        <thead>
          <tr className="bg-[hsl(210,40%,98%)] border-b-2 border-[hsl(var(--border))]">
            <th className="px-3 py-3 text-left text-[10px] sm:text-sm font-semibold w-[80px]">Codice</th>
            <th className="px-3 py-3 text-left text-[10px] sm:text-sm font-semibold w-[120px]">Fornitore</th>
            <th className="px-3 py-3 text-left text-[10px] sm:text-sm font-semibold w-[80px]">DDT</th>
            <th className="px-3 py-3 text-left text-[10px] sm:text-sm font-semibold w-[80px]">Ordine</th>
            <th className="px-3 py-3 text-left text-[10px] sm:text-sm font-semibold w-[100px]">Tipologia</th>
            <th className="px-3 py-3 text-left text-[10px] sm:text-sm font-semibold w-[120px]">Formato</th>
            <th className="px-3 py-3 text-left text-[10px] sm:text-sm font-semibold w-[80px]">Grammatura</th>
            <th className="px-3 py-3 text-left text-[10px] sm:text-sm font-semibold w-[80px]">Fogli Tot.</th>
            <th className="px-3 py-3 text-left text-[10px] sm:text-sm font-semibold w-[120px]">Cliente</th>
            <th className="px-3 py-3 text-left text-[10px] sm:text-sm font-semibold w-[120px]">Lavoro</th>
            <th className="px-3 py-3 text-left text-[10px] sm:text-sm font-semibold w-[80px]">Magazzino</th>
            <th className="px-3 py-3 text-left text-[10px] sm:text-sm font-semibold w-[80px]">Prezzo €/kg</th>
            <th className="px-3 py-3 text-left text-[10px] sm:text-sm font-semibold w-[150px]">Azioni</th>
          </tr>
        </thead>
        <tbody id="esauriti-body">
          {cartoni.map((cartone) => (
            <tr key={cartone.codice} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(210,40%,98%)] transition-colors">
              <td className="px-3 py-2 text-[10px] sm:text-sm whitespace-nowrap w-[80px]">
                <span className="codice">{cartone.codice}</span>
              </td>
              <td className="px-3 py-2 text-[10px] sm:text-sm whitespace-nowrap w-[120px]">{cartone.fornitore}</td>
              <td className="px-3 py-2 text-[10px] sm:text-sm whitespace-nowrap w-[80px]">{cartone.ddt || '-'}</td>
              <td className="px-3 py-2 text-[10px] sm:text-sm whitespace-nowrap w-[80px]">{cartone.ordine}</td>
              <td className="px-3 py-2 text-[10px] sm:text-sm whitespace-nowrap w-[100px]">{cartone.tipologia}</td>
              <td className="px-3 py-2 text-[10px] sm:text-sm whitespace-nowrap w-[120px]">{formatFormato(cartone.formato)}</td>
              <td className="px-3 py-2 text-[10px] sm:text-sm whitespace-nowrap w-[80px]">{cartone.grammatura}</td>
              <td className="px-3 py-2 text-[10px] sm:text-sm font-semibold whitespace-nowrap w-[80px]">{formatFogli(cartone.fogli)}</td>
              <td className="px-3 py-2 text-[10px] sm:text-sm whitespace-nowrap w-[120px]">{cartone.cliente}</td>
              <td className="px-3 py-2 text-[10px] sm:text-sm whitespace-nowrap w-[120px]">{cartone.lavoro}</td>
              <td className="px-3 py-2 text-[10px] sm:text-sm whitespace-nowrap w-[80px]">{cartone.magazzino}</td>
              <td className="px-3 py-2 text-[10px] sm:text-sm whitespace-nowrap w-[80px]">{formatPrezzo(cartone.prezzo)}</td>
              <td className="px-3 py-2 text-[10px] sm:text-sm whitespace-nowrap w-[150px]">
                <div className="flex gap-1">
                  <button
                    onClick={() => onStorico(cartone.codice)}
                    className="px-2 py-1 text-[10px] sm:text-xs rounded-md bg-[hsl(199,89%,94%)] text-[hsl(var(--primary-dark))] hover:bg-[hsl(199,89%,88%)] transition-colors font-semibold flex items-center gap-1"
                  >
                    <i className="fas fa-chart-line"></i> Storico
                  </button>
                  <button
                    onClick={() => setCodiceRiporto(cartone.codice)}
                    className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-md bg-[hsl(217,91%,88%)] text-[hsl(var(--primary-dark))] hover:bg-[hsl(217,91%,78%)] transition-colors"
                    title="Riporta in giacenza"
                  >
                    <i className="fas fa-undo text-xs sm:text-sm"></i>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <ScrollBar orientation="horizontal" />

      <AlertDialog open={!!codiceRiporto} onOpenChange={() => setCodiceRiporto(null)}>
        <AlertDialogContent className="sm:max-w-[425px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg sm:text-xl">Conferma riporto in giacenza</AlertDialogTitle>
            <AlertDialogDescription className="text-sm sm:text-base">
              Sei sicuro di voler riportare il cartone <strong>{codiceRiporto}</strong> in giacenza?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4">
            <AlertDialogCancel className="w-full sm:w-auto text-sm">Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (codiceRiporto) {
                  onRiportaGiacenza(codiceRiporto);
                  setCodiceRiporto(null);
                }
              }}
              className="w-full sm:w-auto text-sm"
            >
              Conferma
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ScrollArea>
  );
}