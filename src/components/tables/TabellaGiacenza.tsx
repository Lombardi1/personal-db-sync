import { useState } from 'react';
import { Cartone } from '@/types';
import { formatFormato, formatPrezzo, formatFogli, formatData } from '@/utils/formatters';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Copy } from 'lucide-react';
import * as notifications from '@/utils/notifications'; // Aggiornato a percorso relativo
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

interface TabellaGiacenzaProps {
  cartoni: Cartone[];
  onScarico: (codice: string) => void;
  onStorico: (codice: string) => void;
  onRiportaOrdini: (codice: string) => void;
}

export function TabellaGiacenza({ cartoni, onScarico, onStorico, onRiportaOrdini }: TabellaGiacenzaProps) {
  const [codiceRiporto, setCodiceRiporto] = useState<string | null>(null);

  const copiaRiga = (cartone: Cartone) => {
    const testo = `${cartone.codice}\t${cartone.fornitore}\t${cartone.ordine}\t${cartone.ddt || '-'}\t${cartone.tipologia}\t${formatFormato(cartone.formato)}\t${cartone.grammatura}\t${formatFogli(cartone.fogli)}\t${cartone.cliente}\t${cartone.lavoro}\t${cartone.magazzino || '-'}\t${formatPrezzo(cartone.prezzo)}\t${formatData(cartone.data_arrivo || '')}`;
    navigator.clipboard.writeText(testo).then(() => {
      notifications.showSuccess('✅ Riga copiata negli appunti');
    }).catch(() => {
      notifications.showError('❌ Errore durante la copia');
    });
  };

  return (
    <ScrollArea className="w-full rounded-md">
      <div className="w-full min-w-max">
        <table id="tab-dashboard" className="w-full border-collapse text-xs table-auto">
        <thead>
          <tr className="bg-[hsl(210,40%,98%)] border-b-2 border-[hsl(var(--border))]">
            <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold w-[80px]">Codice</th>
            <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold w-[120px]">Fornitore</th>
            <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold w-[80px]">Ordine</th>
            <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold w-[80px]">DDT</th>
            <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold w-[100px]">Tipologia</th>
            <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold w-[120px]">Formato</th>
            <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold w-[80px]">Gramm.</th>
            <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold w-[80px]">Fogli</th>
            <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold w-[120px]">Cliente</th>
            <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold w-[120px]">Lavoro</th>
            <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold w-[80px]">Mag.</th>
            <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold w-[80px]">€/kg</th>
            <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold w-[100px]">Arrivo</th>
            <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold w-[150px]">Azioni</th>
          </tr>
        </thead>
        <tbody id="dashboard-body">
          {cartoni.map((cartone) => (
            <tr key={cartone.codice} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(210,40%,98%)] transition-colors">
              <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap w-[80px]">
                <span className="codice">{cartone.codice}</span>
              </td>
              <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap w-[120px]">{cartone.fornitore}</td>
              <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap w-[80px]">{cartone.ordine}</td>
              <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap w-[80px]">{cartone.ddt || '-'}</td>
              <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap w-[100px]">{cartone.tipologia}</td>
              <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap w-[120px]">{formatFormato(cartone.formato)}</td>
              <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap w-[80px]">{cartone.grammatura}</td>
              <td className="px-2 py-1.5 text-[10px] sm:text-xs font-semibold whitespace-nowrap w-[80px]">{formatFogli(cartone.fogli)}</td>
              <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap w-[120px]">{cartone.cliente}</td>
              <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap w-[120px]">{cartone.lavoro}</td>
              <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap w-[80px]">{cartone.magazzino || '-'}</td>
              <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap w-[80px]">{formatPrezzo(cartone.prezzo)}</td>
              <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap w-[100px]">{formatData(cartone.data_arrivo || '')}</td>
              <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap w-[150px]">
                <div className="flex gap-0.5">
                  <button
                    onClick={() => onScarico(cartone.codice)}
                    className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded bg-[hsl(0,100%,95%)] text-[hsl(var(--danger))] hover:bg-[hsl(0,100%,90%)] transition-colors"
                    title="Scarica fogli"
                  >
                    <i className="fas fa-minus text-[10px] sm:text-xs"></i>
                  </button>
                  <button
                    onClick={() => onStorico(cartone.codice)}
                    className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded bg-[hsl(199,89%,94%)] text-[hsl(var(--primary-dark))] hover:bg-[hsl(199,89%,88%)] transition-colors"
                    title="Vedi storico"
                  >
                    <i className="fas fa-chart-line text-[10px] sm:text-xs"></i>
                  </button>
                  <button
                    onClick={() => setCodiceRiporto(cartone.codice)}
                    className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded bg-[hsl(217,91%,88%)] text-[hsl(var(--primary-dark))] hover:bg-[hsl(217,91%,78%)] transition-colors"
                    title="Riporta in ordini"
                  >
                    <i className="fas fa-undo text-[10px] sm:text-xs"></i>
                  </button>
                  <button
                    onClick={() => copiaRiga(cartone)}
                    className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded bg-[hsl(142,76%,94%)] text-[hsl(142,76%,36%)] hover:bg-[hsl(142,76%,88%)] transition-colors"
                    title="Copia riga"
                  >
                    <Copy size={12} className="h-3 w-3 sm:h-4 sm:w-4" />
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
            <AlertDialogTitle className="text-lg sm:text-xl">Conferma riporto in ordini</AlertDialogTitle>
            <AlertDialogDescription className="text-sm sm:text-base">
              Sei sicuro di voler riportare il cartone <strong>{codiceRiporto}</strong> in ordini in arrivo?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4">
            <AlertDialogCancel className="w-full sm:w-auto text-sm">Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (codiceRiporto) {
                  onRiportaOrdini(codiceRiporto);
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