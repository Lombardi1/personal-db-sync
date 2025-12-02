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

interface TabellaOrdiniProps {
  ordini: Cartone[];
  onConferma: (codice: string, confermato: boolean) => void;
  onSpostaInMagazzino: (codice: string) => void;
  onModifica: (codice: string) => void;
  onElimina: (codice: string) => void;
}

export function TabellaOrdini({ ordini, onConferma, onSpostaInMagazzino, onModifica, onElimina }: TabellaOrdiniProps) {
  const [codiceEliminazione, setCodiceEliminazione] = useState<string | null>(null);

  const copiaRiga = (ordine: Cartone) => {
    const testo = `${ordine.codice}\t${ordine.fornitore}\t${ordine.ordine}\t${ordine.tipologia}\t${formatFormato(ordine.formato)}\t${ordine.grammatura}\t${formatFogli(ordine.fogli)}\t${ordine.cliente}\t${ordine.lavoro}\t${ordine.magazzino}\t${formatPrezzo(ordine.prezzo)}\t${formatData(ordine.data_consegna || '')}`;
    navigator.clipboard.writeText(testo).then(() => {
      notifications.showSuccess('✅ Riga copiata negli appunti');
    }).catch(() => {
      notifications.showError('❌ Errore durante la copia');
    });
  };

  return (
    <ScrollArea className="w-full rounded-md">
      <div className="w-full min-w-max">
        <table id="tab-ordini" className="w-full border-collapse table-auto">
        <thead>
          <tr className="bg-[hsl(210,40%,98%)] border-b-2 border-[hsl(var(--border))]">
            <th className="px-3 py-3 text-left text-[10px] sm:text-sm font-semibold w-[80px]">Codice</th>
            <th className="px-3 py-3 text-left text-[10px] sm:text-sm font-semibold w-[120px]">Fornitore</th>
            <th className="px-3 py-3 text-left text-[10px] sm:text-sm font-semibold w-[80px]">Ordine</th>
            <th className="px-3 py-3 text-left text-[10px] sm:text-sm font-semibold w-[80px]">DDT</th> {/* NUOVO */}
            <th className="px-3 py-3 text-left text-[10px] sm:text-sm font-semibold w-[100px]">Tipologia</th>
            <th className="px-3 py-3 text-left text-[10px] sm:text-sm font-semibold w-[120px]">Formato</th>
            <th className="px-3 py-3 text-left text-[10px] sm:text-sm font-semibold w-[80px]">Grammatura</th>
            <th className="px-3 py-3 text-left text-[10px] sm:text-sm font-semibold w-[80px]">Fogli</th>
            <th className="px-3 py-3 text-left text-[10px] sm:text-sm font-semibold w-[120px]">Cliente</th>
            <th className="px-3 py-3 text-left text-[10px] sm:text-sm font-semibold w-[120px]">Lavoro</th>
            <th className="px-3 py-3 text-left text-[10px] sm:text-sm font-semibold w-[80px]">Magazzino</th>
            <th className="px-3 py-3 text-left text-[10px] sm:text-sm font-semibold w-[80px]">Prezzo €/kg</th>
            <th className="px-3 py-3 text-left text-[10px] sm:text-sm font-semibold w-[100px]">Data consegna</th>
            <th className="px-3 py-3 text-left text-[10px] sm:text-sm font-semibold w-[100px]">Data Arrivo</th> {/* NUOVO */}
            <th className="px-3 py-3 text-left text-[10px] sm:text-sm font-semibold w-[180px]">Azioni</th>
          </tr>
        </thead>
        <tbody id="ordini-body">
          {ordini.map((ordine) => {
            if (ordine.codice === 'CTN-132') {
              console.log(`[TabellaOrdini] Rendering CTN-132. Ordine object:`, JSON.stringify(ordine, null, 2));
            }
            return (
            <tr 
              key={ordine.codice} 
              className={`border-b border-[hsl(var(--border))] hover:bg-[hsl(210,40%,98%)] transition-colors ${ordine.confermato ? 'confirmed-row' : ''}`}
            >
              <td className="px-3 py-2 text-[10px] sm:text-sm whitespace-nowrap w-[80px]">
                <span className="codice">{ordine.codice}</span>
              </td>
              <td className="px-3 py-2 text-[10px] sm:text-sm whitespace-nowrap w-[120px]">{ordine.fornitore}</td>
              <td className="px-3 py-2 text-[10px] sm:text-sm whitespace-nowrap w-[80px]">{ordine.ordine}</td>
              <td className="px-3 py-2 text-[10px] sm:text-sm whitespace-nowrap w-[80px]">{ordine.ddt || '-'}</td> {/* NUOVO */}
              <td className="px-3 py-2 text-[10px] sm:text-sm whitespace-nowrap w-[100px]">{ordine.tipologia}</td>
              <td className="px-3 py-2 text-[10px] sm:text-sm whitespace-nowrap w-[120px]">{formatFormato(ordine.formato)}</td>
              <td className="px-3 py-2 text-[10px] sm:text-sm whitespace-nowrap w-[80px]">{ordine.grammatura}</td>
              <td className="px-3 py-2 text-[10px] sm:text-sm font-semibold whitespace-nowrap w-[80px]">{formatFogli(ordine.fogli)}</td>
              <td className="px-3 py-2 text-[10px] sm:text-sm whitespace-nowrap w-[120px]">{ordine.cliente}</td>
              <td className="px-3 py-2 text-[10px] sm:text-sm whitespace-nowrap w-[120px]">{ordine.lavoro}</td>
              <td className="px-3 py-2 text-[10px] sm:text-sm whitespace-nowrap w-[80px]">{ordine.magazzino || '-'}</td>
              <td className="px-3 py-2 text-[10px] sm:text-sm whitespace-nowrap w-[80px]">{formatPrezzo(ordine.prezzo)}</td>
              <td className="px-3 py-2 text-[10px] sm:text-sm whitespace-nowrap w-[100px]">{formatData(ordine.data_consegna || '')}</td>
              <td className="px-3 py-2 text-[10px] sm:text-sm whitespace-nowrap w-[100px]">{formatData(ordine.data_arrivo || '')}</td> {/* NUOVO */}
              <td className="px-3 py-2 text-[10px] sm:text-sm whitespace-nowrap w-[180px]">
                <div className="flex gap-0.5">
                  <button
                    onClick={() => onConferma(ordine.codice, !ordine.confermato)}
                    className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-md transition-colors ${
                      ordine.confermato 
                        ? 'bg-[hsl(142,71%,85%)] text-[hsl(var(--success))]' 
                        : 'bg-[hsl(210,40%,96%)] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(142,71%,85%)]'
                    }`}
                    title="Conferma ordine"
                  >
                    <i className="fas fa-check text-xs sm:text-sm"></i>
                  </button>
                  <button
                    onClick={() => onSpostaInMagazzino(ordine.codice)}
                    className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-md bg-[hsl(217,91%,88%)] text-[hsl(var(--primary-dark))] hover:bg-[hsl(217,91%,78%)] transition-colors"
                    title="In magazzino"
                  >
                    <i className="fas fa-arrow-right text-xs sm:text-sm"></i>
                  </button>
                  <button
                    onClick={() => onModifica(ordine.codice)}
                    className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-md bg-[hsl(199,89%,94%)] text-[hsl(var(--primary-dark))] hover:bg-[hsl(199,89%,88%)] transition-colors"
                    title="Modifica"
                  >
                    <i className="fas fa-edit text-xs sm:text-sm"></i>
                  </button>
                  <button
                    onClick={() => setCodiceEliminazione(ordine.codice)}
                    className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-md bg-[hsl(0,100%,95%)] text-[hsl(var(--danger))] hover:bg-[hsl(0,100%,90%)] transition-colors"
                    title="Elimina"
                  >
                    <i className="fas fa-trash text-xs sm:text-sm"></i>
                  </button>
                  <button
                    onClick={() => copiaRiga(ordine)}
                    className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-md bg-[hsl(142,76%,94%)] text-[hsl(142,76%,36%)] hover:bg-[hsl(142,76%,88%)] transition-colors"
                    title="Copia riga"
                  >
                    <Copy size={14} className="h-3 w-3 sm:h-4 sm:w-4" />
                  </button>
                </div>
              </td>
            </tr>
          )})}
        </tbody>
      </table>
      </div>
      <ScrollBar orientation="horizontal" />

      <AlertDialog open={!!codiceEliminazione} onOpenChange={() => setCodiceEliminazione(null)}>
        <AlertDialogContent className="sm:max-w-[425px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg sm:text-xl">Conferma eliminazione</AlertDialogTitle>
            <AlertDialogDescription className="text-sm sm:text-base">
              Sei sicuro di voler eliminare l'ordine <strong>{codiceEliminazione}</strong>?
              Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4">
            <AlertDialogCancel className="w-full sm:w-auto text-sm">Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (codiceEliminazione) {
                  onElimina(codiceEliminazione);
                  setCodiceEliminazione(null);
                }
              }}
              className="bg-[hsl(var(--danger))] hover:bg-[hsl(0,84%,50%)] w-full sm:w-auto text-sm"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ScrollArea>
  );
}