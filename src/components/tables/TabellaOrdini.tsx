import { Cartone } from '@/types';
import { formatFormato, formatPrezzo } from '@/utils/formatters';

interface TabellaOrdiniProps {
  ordini: Cartone[];
  onConferma: (codice: string, confermato: boolean) => void;
  onSpostaInMagazzino: (codice: string) => void;
  onModifica: (codice: string) => void;
  onElimina: (codice: string) => void;
}

export function TabellaOrdini({ ordini, onConferma, onSpostaInMagazzino, onModifica, onElimina }: TabellaOrdiniProps) {
  return (
    <div className="w-full">
      <table id="tab-ordini" className="w-full border-collapse">
        <thead>
          <tr className="bg-[hsl(210,40%,98%)] border-b-2 border-[hsl(var(--border))]">
            <th className="px-3 py-3 text-left text-sm font-semibold">Codice</th>
            <th className="px-3 py-3 text-left text-sm font-semibold">Fornitore</th>
            <th className="px-3 py-3 text-left text-sm font-semibold">Ordine</th>
            <th className="px-3 py-3 text-left text-sm font-semibold">Tipologia</th>
            <th className="px-3 py-3 text-left text-sm font-semibold">Formato</th>
            <th className="px-3 py-3 text-left text-sm font-semibold">Grammatura</th>
            <th className="px-3 py-3 text-left text-sm font-semibold">Fogli</th>
            <th className="px-3 py-3 text-left text-sm font-semibold">Cliente</th>
            <th className="px-3 py-3 text-left text-sm font-semibold">Lavoro</th>
            <th className="px-3 py-3 text-left text-sm font-semibold">Magazzino</th>
            <th className="px-3 py-3 text-left text-sm font-semibold">Prezzo €/kg</th>
            <th className="px-3 py-3 text-left text-sm font-semibold">Data consegna</th>
            <th className="px-3 py-3 text-left text-sm font-semibold">Azioni</th>
          </tr>
        </thead>
        <tbody id="ordini-body">
          {ordini.map((ordine) => (
            <tr 
              key={ordine.codice} 
              className={`border-b border-[hsl(var(--border))] hover:bg-[hsl(210,40%,98%)] transition-colors ${ordine.confermato ? 'confirmed-row' : ''}`}
            >
              <td className="px-3 py-2 text-sm">
                <span className="codice">{ordine.codice}</span>
              </td>
              <td className="px-3 py-2 text-sm">{ordine.fornitore}</td>
              <td className="px-3 py-2 text-sm">{ordine.ordine}</td>
              <td className="px-3 py-2 text-sm">{ordine.tipologia}</td>
              <td className="px-3 py-2 text-sm">{formatFormato(ordine.formato)}</td>
              <td className="px-3 py-2 text-sm">{ordine.grammatura}</td>
              <td className="px-3 py-2 text-sm font-semibold">{ordine.fogli}</td>
              <td className="px-3 py-2 text-sm">{ordine.cliente}</td>
              <td className="px-3 py-2 text-sm">{ordine.lavoro}</td>
              <td className="px-3 py-2 text-sm">{ordine.magazzino}</td>
              <td className="px-3 py-2 text-sm">{formatPrezzo(ordine.prezzo)}</td>
              <td className="px-3 py-2 text-sm">{ordine.data_consegna}</td>
              <td className="px-3 py-2 text-sm">
                <div className="flex gap-1">
                  <button
                    onClick={() => onConferma(ordine.codice, !ordine.confermato)}
                    className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors ${
                      ordine.confermato 
                        ? 'bg-[hsl(142,71%,85%)] text-[hsl(var(--success))]' 
                        : 'bg-[hsl(210,40%,96%)] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(142,71%,85%)]'
                    }`}
                    title="Conferma ordine"
                  >
                    <i className="fas fa-check text-sm"></i>
                  </button>
                  <button
                    onClick={() => onSpostaInMagazzino(ordine.codice)}
                    className="w-8 h-8 flex items-center justify-center rounded-md bg-[hsl(217,91%,88%)] text-[hsl(var(--primary-dark))] hover:bg-[hsl(217,91%,78%)] transition-colors"
                    title="In magazzino"
                  >
                    <i className="fas fa-arrow-right text-sm"></i>
                  </button>
                  <button
                    onClick={() => onModifica(ordine.codice)}
                    className="w-8 h-8 flex items-center justify-center rounded-md bg-[hsl(199,89%,94%)] text-[hsl(var(--primary-dark))] hover:bg-[hsl(199,89%,88%)] transition-colors"
                    title="Modifica"
                  >
                    <i className="fas fa-edit text-sm"></i>
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Eliminare l'ordine ${ordine.codice}?`)) {
                        onElimina(ordine.codice);
                      }
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-md bg-[hsl(0,100%,95%)] text-[hsl(var(--danger))] hover:bg-[hsl(0,100%,90%)] transition-colors"
                    title="Elimina"
                  >
                    <i className="fas fa-trash text-sm"></i>
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
