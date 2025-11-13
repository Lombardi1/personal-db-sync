import { StoricoMovimento } from '@/types';

interface StoricoTabProps {
  storico: StoricoMovimento[];
}

export function StoricoTab({ storico }: StoricoTabProps) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Storico Globale</h2>
      {storico.length === 0 ? (
        <p className="text-[hsl(var(--muted-foreground))]">Nessun movimento registrato.</p>
      ) : (
        <div className="w-full">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[hsl(210,40%,98%)] border-b-2 border-[hsl(var(--border))]">
                <th className="px-3 py-3 text-left text-sm font-semibold">Codice</th>
                <th className="px-3 py-3 text-left text-sm font-semibold">Data</th>
                <th className="px-3 py-3 text-left text-sm font-semibold">Tipo</th>
                <th className="px-3 py-3 text-left text-sm font-semibold">Quantità</th>
                <th className="px-3 py-3 text-left text-sm font-semibold">Note</th>
              </tr>
            </thead>
            <tbody id="storico-body">
              {storico.map((mov, idx) => (
                <tr key={idx} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(210,40%,98%)] transition-colors">
                  <td className="px-3 py-2 text-sm">
                    <span className="codice">{mov.codice}</span>
                  </td>
                  <td className="px-3 py-2 text-sm">
                    {new Date(mov.data).toLocaleString('it-IT')}
                  </td>
                  <td className="px-3 py-2 text-sm">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                      mov.tipo === 'carico' 
                        ? 'bg-[hsl(142,76%,89%)] text-[hsl(142,64%,24%)]' 
                        : 'bg-[hsl(0,100%,95%)] text-[hsl(0,64%,40%)]'
                    }`}>
                      {mov.tipo === 'carico' ? '↑ Carico' : '↓ Scarico'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-sm font-semibold">{mov.quantita}</td>
                  <td className="px-3 py-2 text-sm">{mov.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
