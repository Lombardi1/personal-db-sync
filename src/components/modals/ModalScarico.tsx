import { useState } from 'react';
import { Cartone } from '@/types';
import { toast } from 'sonner';
import { formatFormato } from '@/utils/formatters';

interface ModalScaricoProps {
  codice: string;
  cartone: Cartone;
  onClose: () => void;
  onScarico: (codice: string, quantita: number, note: string) => Promise<{ error: any }>;
}

export function ModalScarico({ codice, cartone, onClose, onScarico }: ModalScaricoProps) {
  const [quantita, setQuantita] = useState('');
  const [ricavoFoglio, setRicavoFoglio] = useState('1');
  const [note, setNote] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const qta = parseInt(quantita);
    const ricavo = parseInt(ricavoFoglio);
    
    if (!qta || qta < 1) {
      toast.error('⚠️ Inserisci una quantità valida.');
      return;
    }
    
    const fogliEffettivi = Math.floor(qta / ricavo);
    
    if (fogliEffettivi < 1) {
      toast.error('⚠️ I fogli effettivi devono essere almeno 1.');
      return;
    }
    
    if (fogliEffettivi > cartone.fogli) {
      toast.error(`⚠️ Solo ${cartone.fogli} fogli disponibili.`);
      return;
    }

    onClose();
    
    const { error } = await onScarico(codice, fogliEffettivi, note || '-');
    if (!error) {
      toast.success(`✅ Scaricati ${fogliEffettivi} fogli dal cartone ${codice}`);
    } else {
      toast.error('Errore durante lo scarico');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-5" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-[hsl(var(--border))] flex items-center justify-between">
          <h3 className="text-xl font-bold text-[hsl(var(--primary))]">
            <i className="fas fa-minus-circle mr-2"></i>
            Scarica Fogli
          </h3>
          <button onClick={onClose} className="text-2xl text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="bg-[hsl(199,100%,97%)] rounded-lg p-4 mb-6 border-l-4 border-[hsl(var(--primary))]">
            <div className="text-lg font-bold text-[hsl(var(--primary))] mb-3">
              Cartone: <span className="codice ml-2">{codice}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-white px-3 py-2 rounded-lg shadow-sm">
                <div className="text-xs text-[hsl(var(--muted-foreground))] mb-1">Fornitore</div>
                <div className="font-semibold">{cartone.fornitore}</div>
              </div>
              <div className="bg-white px-3 py-2 rounded-lg shadow-sm">
                <div className="text-xs text-[hsl(var(--muted-foreground))] mb-1">Formato</div>
                <div className="font-semibold">{formatFormato(cartone.formato)}</div>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-lg font-bold text-lg shadow-sm">
              <i className="fas fa-layer-group text-[hsl(var(--success))]"></i>
              Fogli disponibili: {cartone.fogli}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block font-medium mb-2">
                <i className="fas fa-sort-numeric-up mr-1"></i> Quantità da scaricare *
              </label>
              <input
                type="number"
                value={quantita}
                onChange={(e) => setQuantita(e.target.value)}
                className="w-full px-3 py-2 border border-[hsl(var(--border))] rounded-md focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10"
                placeholder="es. 1000"
                min="1"
                required
              />
            </div>

            <div>
              <label className="block font-medium mb-2">
                <i className="fas fa-layer-group mr-1"></i> Ricavo Foglio *
              </label>
              <select
                value={ricavoFoglio}
                onChange={(e) => setRicavoFoglio(e.target.value)}
                className="w-full px-3 py-2 border border-[hsl(var(--border))] rounded-md focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10"
                required
              >
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
              </select>
            </div>

            {quantita && parseInt(quantita) > 0 && (() => {
              const fogliEffettivi = Math.floor(parseInt(quantita) / parseInt(ricavoFoglio));
              return (
                <div className="space-y-2">
                  <div className="p-3 bg-[hsl(199,100%,97%)] rounded-lg border-l-4 border-[hsl(var(--primary))]">
                    <div className="flex items-center gap-2">
                      <i className="fas fa-calculator text-[hsl(var(--primary))]"></i>
                      <span className="font-semibold text-[hsl(var(--primary))]">
                        Fogli effettivi da scaricare: {fogliEffettivi}
                      </span>
                    </div>
                    <div className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                      ({quantita} ÷ {ricavoFoglio} = {fogliEffettivi})
                    </div>
                  </div>
                  {fogliEffettivi > 0 && fogliEffettivi <= cartone.fogli && (
                    <div className="p-3 bg-[hsl(142,76%,94%)] rounded-lg border-l-4 border-[hsl(142,76%,36%)]">
                      <div className="flex items-center gap-2">
                        <i className="fas fa-box text-[hsl(142,76%,36%)]"></i>
                        <span className="font-semibold text-[hsl(142,76%,36%)]">
                          Rimanenza: {cartone.fogli - fogliEffettivi} fogli
                        </span>
                      </div>
                    </div>
                  )}
                  {fogliEffettivi > cartone.fogli && (
                    <div className="p-3 bg-[hsl(0,84%,94%)] rounded-lg border-l-4 border-[hsl(0,84%,60%)]">
                      <div className="flex items-center gap-2">
                        <i className="fas fa-exclamation-triangle text-[hsl(0,84%,60%)]"></i>
                        <span className="font-semibold text-[hsl(0,84%,60%)]">
                          Fogli effettivi superiori alla disponibilità!
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            <div>
              <label className="block font-medium mb-2">
                <i className="fas fa-sticky-note mr-1"></i> Note
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3 py-2 border border-[hsl(var(--border))] rounded-md focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10"
                rows={3}
                placeholder="Note opzionali..."
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-[hsl(var(--primary))] text-white rounded-md font-semibold hover:bg-[hsl(var(--primary-dark))] transition-colors"
            >
              <i className="fas fa-check mr-2"></i>
              Conferma Scarico
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[hsl(210,40%,96%)] text-[hsl(var(--muted-foreground))] rounded-md font-semibold hover:bg-[hsl(214,32%,91%)] transition-colors"
            >
              Annulla
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
