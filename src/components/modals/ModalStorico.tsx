import { StoricoMovimento } from '@/types';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface ModalStoricoProps {
  codice: string;
  movimenti: StoricoMovimento[];
  onClose: () => void;
}

export function ModalStorico({ codice, movimenti, onClose }: ModalStoricoProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-5" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-lg sm:max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-4 py-3 sm:px-6 sm:py-5 border-b border-[hsl(var(--border))] flex items-center justify-between">
          <h3 className="text-lg sm:text-xl font-bold text-[hsl(var(--primary))]">
            <i className="fas fa-chart-line mr-1 sm:mr-2"></i>
            Storico Movimenti - <span className="codice ml-1 sm:ml-2">{codice}</span>
          </h3>
          <button onClick={onClose} className="text-xl sm:text-2xl text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
            &times;
          </button>
        </div>

        <div className="p-4 sm:p-6">
          {movimenti.length === 0 ? (
            <p className="text-center text-sm sm:text-base text-[hsl(var(--muted-foreground))] py-6 sm:py-8">
              Nessun movimento registrato per questo cartone.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[hsl(210,40%,98%)] border-b-2 border-[hsl(var(--border))]">
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
                <tbody>
                  {movimenti.map((mov, idx) => (
                    <tr key={mov.id || idx} className="border-b border-[hsl(var(--border))]">
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
          )}

          <button
            onClick={onClose}
            className="mt-4 sm:mt-6 px-4 py-2 bg-[hsl(var(--primary))] text-white rounded-md font-semibold hover:bg-[hsl(var(--primary-dark))] transition-colors text-sm sm:text-base"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}