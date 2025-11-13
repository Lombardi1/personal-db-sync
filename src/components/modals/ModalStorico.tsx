import { StoricoMovimento } from '@/types';

interface ModalStoricoProps {
  codice: string;
  movimenti: StoricoMovimento[];
  onClose: () => void;
}

export function ModalStorico({ codice, movimenti, onClose }: ModalStoricoProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-5" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-[hsl(var(--border))] flex items-center justify-between">
          <h3 className="text-xl font-bold text-[hsl(var(--primary))]">
            <i className="fas fa-chart-line mr-2"></i>
            Storico Movimenti - <span className="codice ml-2">{codice}</span>
          </h3>
          <button onClick={onClose} className="text-2xl text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
            &times;
          </button>
        </div>

        <div className="p-6">
          {movimenti.length === 0 ? (
            <p className="text-center text-[hsl(var(--muted-foreground))] py-8">
              Nessun movimento registrato per questo cartone.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[hsl(210,40%,98%)] border-b-2 border-[hsl(var(--border))]">
                    <th className="px-3 py-3 text-left text-sm font-semibold">Data</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold">Tipo</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold">Quantità</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {movimenti.map((mov, idx) => (
                    <tr key={idx} className="border-b border-[hsl(var(--border))]">
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

          <button
            onClick={onClose}
            className="mt-6 px-4 py-2 bg-[hsl(var(--primary))] text-white rounded-md font-semibold hover:bg-[hsl(var(--primary-dark))] transition-colors"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}
