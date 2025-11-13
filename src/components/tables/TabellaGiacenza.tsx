import { Cartone } from '@/types';
import { formatFormato, formatPrezzo } from '@/utils/formatters';

interface TabellaGiacenzaProps {
  cartoni: Cartone[];
  onScarico: (codice: string) => void;
  onStorico: (codice: string) => void;
  onRiportaOrdini: (codice: string) => void;
}

export function TabellaGiacenza({ cartoni, onScarico, onStorico, onRiportaOrdini }: TabellaGiacenzaProps) {
  return (
    <div className="w-full">
      <table id="tab-dashboard" className="w-full border-collapse">
        <thead>
          <tr className="bg-[hsl(210,40%,98%)] border-b-2 border-[hsl(var(--border))]">
            <th className="px-3 py-3 text-left text-sm font-semibold">Codice</th>
            <th className="px-3 py-3 text-left text-sm font-semibold">Fornitore</th>
            <th className="px-3 py-3 text-left text-sm font-semibold">Ordine</th>
            <th className="px-3 py-3 text-left text-sm font-semibold">DDT</th>
            <th className="px-3 py-3 text-left text-sm font-semibold">Tipologia Cartone</th>
            <th className="px-3 py-3 text-left text-sm font-semibold">Formato Cartone</th>
            <th className="px-3 py-3 text-left text-sm font-semibold">Grammatura</th>
            <th className="px-3 py-3 text-left text-sm font-semibold">Fogli</th>
            <th className="px-3 py-3 text-left text-sm font-semibold">Cliente</th>
            <th className="px-3 py-3 text-left text-sm font-semibold">Lavoro</th>
            <th className="px-3 py-3 text-left text-sm font-semibold">Magazzino</th>
            <th className="px-3 py-3 text-left text-sm font-semibold">Prezzo €/kg</th>
            <th className="px-3 py-3 text-left text-sm font-semibold">Arrivo effettivo</th>
            <th className="px-3 py-3 text-left text-sm font-semibold">Azioni</th>
          </tr>
        </thead>
        <tbody id="dashboard-body">
          {cartoni.map((cartone) => (
            <tr key={cartone.codice} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(210,40%,98%)] transition-colors">
              <td className="px-3 py-2 text-sm whitespace-nowrap">
                <span className="codice">{cartone.codice}</span>
              </td>
              <td className="px-3 py-2 text-sm whitespace-nowrap">{cartone.fornitore}</td>
              <td className="px-3 py-2 text-sm whitespace-nowrap">{cartone.ordine}</td>
              <td className="px-3 py-2 text-sm whitespace-nowrap">{cartone.ddt || '-'}</td>
              <td className="px-3 py-2 text-sm whitespace-nowrap">{cartone.tipologia}</td>
              <td className="px-3 py-2 text-sm whitespace-nowrap">{formatFormato(cartone.formato)}</td>
              <td className="px-3 py-2 text-sm whitespace-nowrap">{cartone.grammatura}</td>
              <td className="px-3 py-2 text-sm font-semibold whitespace-nowrap">{cartone.fogli}</td>
              <td className="px-3 py-2 text-sm whitespace-nowrap">{cartone.cliente}</td>
              <td className="px-3 py-2 text-sm whitespace-nowrap">{cartone.lavoro}</td>
              <td className="px-3 py-2 text-sm whitespace-nowrap">{cartone.magazzino}</td>
              <td className="px-3 py-2 text-sm whitespace-nowrap">{formatPrezzo(cartone.prezzo)}</td>
              <td className="px-3 py-2 text-sm whitespace-nowrap">{cartone.data_arrivo || '-'}</td>
              <td className="px-3 py-2 text-sm whitespace-nowrap">
                <div className="flex gap-1">
                  <button
                    onClick={() => onScarico(cartone.codice)}
                    className="w-8 h-8 flex items-center justify-center rounded-md bg-[hsl(0,100%,95%)] text-[hsl(var(--danger))] hover:bg-[hsl(0,100%,90%)] transition-colors"
                    title="Scarica fogli"
                  >
                    <i className="fas fa-minus text-sm"></i>
                  </button>
                  <button
                    onClick={() => onStorico(cartone.codice)}
                    className="w-8 h-8 flex items-center justify-center rounded-md bg-[hsl(199,89%,94%)] text-[hsl(var(--primary-dark))] hover:bg-[hsl(199,89%,88%)] transition-colors"
                    title="Vedi storico"
                  >
                    <i className="fas fa-chart-line text-sm"></i>
                  </button>
                  <button
                    onClick={() => onRiportaOrdini(cartone.codice)}
                    className="w-8 h-8 flex items-center justify-center rounded-md bg-[hsl(217,91%,88%)] text-[hsl(var(--primary-dark))] hover:bg-[hsl(217,91%,78%)] transition-colors"
                    title="Riporta in ordini"
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
  );
}
