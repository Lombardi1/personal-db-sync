import { Cartone } from '@/types';
import { formatFormato, formatPrezzo, formatFogli } from '@/utils/formatters';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface TabellaEsauritiProps {
  cartoni: Cartone[];
  onStorico: (codice: string) => void;
  onRiportaGiacenza: (codice: string) => void;
}

export function TabellaEsauriti({ cartoni, onStorico, onRiportaGiacenza }: TabellaEsauritiProps) {
  return (
    <ScrollArea className="w-full rounded-md">
      <div className="w-full min-w-max">
        <table id="tab-esauriti" className="w-full border-collapse">
        <thead>
          <tr className="bg-[hsl(210,40%,98%)] border-b-2 border-[hsl(var(--border))]">
            <th className="px-3 py-3 text-left text-sm font-semibold">Codice</th>
            <th className="px-3 py-3 text-left text-sm font-semibold">Fornitore</th>
            <th className="px-3 py-3 text-left text-sm font-semibold">DDT</th>
            <th className="px-3 py-3 text-left text-sm font-semibold">Ordine</th>
            <th className="px-3 py-3 text-left text-sm font-semibold">Tipologia</th>
            <th className="px-3 py-3 text-left text-sm font-semibold">Formato</th>
            <th className="px-3 py-3 text-left text-sm font-semibold">Grammatura</th>
            <th className="px-3 py-3 text-left text-sm font-semibold">Fogli Tot.</th>
            <th className="px-3 py-3 text-left text-sm font-semibold">Cliente</th>
            <th className="px-3 py-3 text-left text-sm font-semibold">Lavoro</th>
            <th className="px-3 py-3 text-left text-sm font-semibold">Magazzino</th>
            <th className="px-3 py-3 text-left text-sm font-semibold">Prezzo €/kg</th>
            <th className="px-3 py-3 text-left text-sm font-semibold">Azioni</th>
          </tr>
        </thead>
        <tbody id="esauriti-body">
          {cartoni.map((cartone) => (
            <tr key={cartone.codice} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(210,40%,98%)] transition-colors">
              <td className="px-3 py-2 text-sm">
                <span className="codice">{cartone.codice}</span>
              </td>
              <td className="px-3 py-2 text-sm">{cartone.fornitore}</td>
              <td className="px-3 py-2 text-sm">{cartone.ddt || '-'}</td>
              <td className="px-3 py-2 text-sm">{cartone.ordine}</td>
              <td className="px-3 py-2 text-sm">{cartone.tipologia}</td>
              <td className="px-3 py-2 text-sm">{formatFormato(cartone.formato)}</td>
              <td className="px-3 py-2 text-sm">{cartone.grammatura}</td>
              <td className="px-3 py-2 text-sm font-semibold">{formatFogli(cartone.fogli)}</td>
              <td className="px-3 py-2 text-sm">{cartone.cliente}</td>
              <td className="px-3 py-2 text-sm">{cartone.lavoro}</td>
              <td className="px-3 py-2 text-sm">{cartone.magazzino}</td>
              <td className="px-3 py-2 text-sm">{formatPrezzo(cartone.prezzo)}</td>
              <td className="px-3 py-2 text-sm">
                <div className="flex gap-1">
                  <button
                    onClick={() => onStorico(cartone.codice)}
                    className="px-3 py-1 text-xs rounded-md bg-[hsl(199,89%,94%)] text-[hsl(var(--primary-dark))] hover:bg-[hsl(199,89%,88%)] transition-colors font-semibold flex items-center gap-1"
                  >
                    <i className="fas fa-chart-line"></i> Storico
                  </button>
                  <button
                    onClick={() => onRiportaGiacenza(cartone.codice)}
                    className="w-8 h-8 flex items-center justify-center rounded-md bg-[hsl(217,91%,88%)] text-[hsl(var(--primary-dark))] hover:bg-[hsl(217,91%,78%)] transition-colors"
                    title="Riporta in giacenza"
                  >
                    <i className="fas fa-undo text-sm"></i>
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
