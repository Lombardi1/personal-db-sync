import { Cartone } from '@/types';
import { formatFormato, formatPrezzo, formatFogli } from '@/utils/formatters';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface TabellaGiacenzaProps {
  cartoni: Cartone[];
  onScarico: (codice: string) => void;
  onStorico: (codice: string) => void;
  onRiportaOrdini: (codice: string) => void;
}

export function TabellaGiacenza({ cartoni, onScarico, onStorico, onRiportaOrdini }: TabellaGiacenzaProps) {
  return (
    <ScrollArea className="w-full">
      <div className="w-full min-w-max">
        <table id="tab-dashboard" className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-[hsl(210,40%,98%)] border-b-2 border-[hsl(var(--border))]">
            <th className="px-2 py-2 text-left text-xs font-semibold">Codice</th>
            <th className="px-2 py-2 text-left text-xs font-semibold">Fornitore</th>
            <th className="px-2 py-2 text-left text-xs font-semibold">Ordine</th>
            <th className="px-2 py-2 text-left text-xs font-semibold">DDT</th>
            <th className="px-2 py-2 text-left text-xs font-semibold">Tipologia</th>
            <th className="px-2 py-2 text-left text-xs font-semibold">Formato</th>
            <th className="px-2 py-2 text-left text-xs font-semibold">Gramm.</th>
            <th className="px-2 py-2 text-left text-xs font-semibold">Fogli</th>
            <th className="px-2 py-2 text-left text-xs font-semibold">Cliente</th>
            <th className="px-2 py-2 text-left text-xs font-semibold">Lavoro</th>
            <th className="px-2 py-2 text-left text-xs font-semibold">Mag.</th>
            <th className="px-2 py-2 text-left text-xs font-semibold">€/kg</th>
            <th className="px-2 py-2 text-left text-xs font-semibold">Arrivo</th>
            <th className="px-2 py-2 text-left text-xs font-semibold">Azioni</th>
          </tr>
        </thead>
        <tbody id="dashboard-body">
          {cartoni.map((cartone) => (
            <tr key={cartone.codice} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(210,40%,98%)] transition-colors">
              <td className="px-2 py-1.5 text-xs whitespace-nowrap">
                <span className="codice">{cartone.codice}</span>
              </td>
              <td className="px-2 py-1.5 text-xs whitespace-nowrap">{cartone.fornitore}</td>
              <td className="px-2 py-1.5 text-xs whitespace-nowrap">{cartone.ordine}</td>
              <td className="px-2 py-1.5 text-xs whitespace-nowrap">{cartone.ddt || '-'}</td>
              <td className="px-2 py-1.5 text-xs whitespace-nowrap">{cartone.tipologia}</td>
              <td className="px-2 py-1.5 text-xs whitespace-nowrap">{formatFormato(cartone.formato)}</td>
              <td className="px-2 py-1.5 text-xs whitespace-nowrap">{cartone.grammatura}</td>
              <td className="px-2 py-1.5 text-xs font-semibold whitespace-nowrap">{formatFogli(cartone.fogli)}</td>
              <td className="px-2 py-1.5 text-xs whitespace-nowrap">{cartone.cliente}</td>
              <td className="px-2 py-1.5 text-xs whitespace-nowrap">{cartone.lavoro}</td>
              <td className="px-2 py-1.5 text-xs whitespace-nowrap">{cartone.magazzino}</td>
              <td className="px-2 py-1.5 text-xs whitespace-nowrap">{formatPrezzo(cartone.prezzo)}</td>
              <td className="px-2 py-1.5 text-xs whitespace-nowrap">{cartone.data_arrivo || '-'}</td>
              <td className="px-2 py-1.5 text-xs whitespace-nowrap">
                <div className="flex gap-0.5">
                  <button
                    onClick={() => onScarico(cartone.codice)}
                    className="w-7 h-7 flex items-center justify-center rounded bg-[hsl(0,100%,95%)] text-[hsl(var(--danger))] hover:bg-[hsl(0,100%,90%)] transition-colors"
                    title="Scarica fogli"
                  >
                    <i className="fas fa-minus text-xs"></i>
                  </button>
                  <button
                    onClick={() => onStorico(cartone.codice)}
                    className="w-7 h-7 flex items-center justify-center rounded bg-[hsl(199,89%,94%)] text-[hsl(var(--primary-dark))] hover:bg-[hsl(199,89%,88%)] transition-colors"
                    title="Vedi storico"
                  >
                    <i className="fas fa-chart-line text-xs"></i>
                  </button>
                  <button
                    onClick={() => onRiportaOrdini(cartone.codice)}
                    className="w-7 h-7 flex items-center justify-center rounded bg-[hsl(217,91%,88%)] text-[hsl(var(--primary-dark))] hover:bg-[hsl(217,91%,78%)] transition-colors"
                    title="Riporta in ordini"
                  >
                    <i className="fas fa-undo text-xs"></i>
                  </button>
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
