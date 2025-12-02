import { useState } from 'react';
import { Cartone } from '@/types';
import * as notifications from '@/utils/notifications';
import { formatFormato, formatFogli } from '@/utils/formatters'; // Importa formatFogli

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
      notifications.showError('⚠️ Inserisci una quantità valida.');
      return;
    }
    
    const fogliEffettivi = Math.floor(qta / ricavo);
    
    if (fogliEffettivi < 1) {
      notifications.showError('⚠️ I fogli effettivi devono essere almeno 1.');
      return;
    }
    
    if (fogliEffettivi > cartone.fogli) {
      const difference = fogliEffettivi - cartone.fogli;
      notifications.showError(`⚠️ La quantità da scaricare (${formatFogli(fogliEffettivi)} fogli) supera la disponibilità (${formatFogli(cartone.fogli)} fogli) di ${formatFogli(difference)} fogli.`);
      return;
    }

    onClose();
    
    const { error } = await onScarico(codice, fogliEffettivi, note || '-');
    if (!error) {
      notifications.showSuccess(`✅ Scaricati ${fogliEffettivi} fogli dal cartone ${codice}`);
    } else {
      notifications.showError('Errore durante lo scarico');
    }
  };

  // Calcola i fogli effettivi per la visualizzazione dinamica
  const currentQuantita = parseInt(quantita);
  const currentRicavo = parseInt(ricavoFoglio);
  const fogliEffettiviDisplay = (!isNaN(currentQuantita) && !isNaN(currentRicavo) && currentRicavo > 0) 
    ? Math.floor(currentQuantita / currentRicavo) 
    : 0;
  const differenceDisplay = fogliEffettiviDisplay > cartone.fogli ? fogliEffettiviDisplay - cartone.fogli : 0;


  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-5" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-lg sm:max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-4 py-3 sm:px-6 sm:py-5 border-b border-[hsl(var(--border))] flex items-center justify-between">
          <h3 className="text-lg sm:text-xl font-bold text-[hsl(var(--primary))]">
            <i className="fas fa-minus-circle mr-1 sm:mr-2"></i>
            Scarica Fogli
          </h3>
          <button onClick={onClose} className="text-xl sm:text-2xl text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6">
          <div className="bg-[hsl(199,100%,97%)] rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 border-l-4 border-[hsl(var(--primary))]">
            <div className="text-base sm:text-lg font-bold text-[hsl(var(--primary))] mb-2 sm:mb-3">
              Cartone: <span className="codice ml-1 sm:ml-2">{codice}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-white px-3 py-2 rounded-lg shadow-sm">
                <div className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] mb-1">Fornitore</div>
                <div className="font-semibold text-sm sm:text-base">{cartone.fornitore}</div>
              </div>
              <div className="bg-white px-3 py-2 rounded-lg shadow-sm">
                <div className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] mb-1">Formato</div>
                <div className="font-semibold text-sm sm:text-base">{formatFormato(cartone.formato)}</div>
              </div>
              <div className="bg-white px-3 py-2 rounded-lg shadow-sm">
                <div className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] mb-1">Grammatura</div>
                <div className="font-semibold text-sm sm:text-base">{cartone.grammatura}</div>
              </div>
              <div className="bg-white px-3 py-2 rounded-lg shadow-sm">
                <div className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] mb-1">Cliente</div>
                <div className="font-semibold text-sm sm:text-base">{cartone.cliente || '-'}</div>
              </div>
              <div className="bg-white px-3 py-2 rounded-lg shadow-sm">
                <div className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] mb-1">Lavoro</div>
                <div className="font-semibold text-sm sm:text-base">{cartone.lavoro || '-'}</div>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 bg-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-bold text-base sm:text-lg shadow-sm">
              <i className="fas fa-layer-group text-[hsl(var(--success))]"></i>
              Fogli disponibili: {cartone.fogli}
            </div>
          </div>

          <div className="space-y-3 sm:space-y-4">
            <div>
              <label className="block font-medium mb-1 sm:mb-2 text-sm">
                <i className="fas fa-sort-numeric-up mr-1"></i> Quantità da scaricare *
              </label>
              <input
                type="number"
                value={quantita}
                onChange={(e) => setQuantita(e.target.value)}
                className="w-full px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10 text-sm"
                placeholder="es. 1000"
                min="1"
                required
              />
            </div>

            <div>
              <label className="block font-medium mb-1 sm:mb-2 text-sm">
                <i className="fas fa-layer-group mr-1"></i> Ricavo Foglio *
              </label>
              <select
                value={ricavoFoglio}
                onChange={(e) => setRicavoFoglio(e.target.value)}
                className="w-full px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10 text-sm"
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
              return (
                <div className="space-y-2">
                  <div className="p-3 bg-[hsl(199,100%,97%)] rounded-lg border-l-4 border-[hsl(var(--primary))]">
                    <div className="flex items-center gap-2">
                      <i className="fas fa-calculator text-[hsl(var(--primary))]"></i>
                      <span className="font-semibold text-sm sm:text-base text-[hsl(var(--primary))]">
                        Fogli effettivi da scaricare: {fogliEffettiviDisplay}
                      </span>
                    </div>
                    <div className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] mt-1">
                      ({quantita} ÷ {ricavoFoglio} = {fogliEffettiviDisplay})
                    </div>
                  </div>
                  {fogliEffettiviDisplay > 0 && fogliEffettiviDisplay <= cartone.fogli && (
                    <div className="p-3 bg-[hsl(142,76%,94%)] rounded-lg border-l-4 border-[hsl(142,76%,36%)]">
                          <div className="flex items-center gap-2">
                            <i className="fas fa-box text-[hsl(142,76%,36%)]"></i>
                            <span className="font-semibold text-sm sm:text-base text-[hsl(142,76%,36%)]">
                              Rimanenza: {cartone.fogli - fogliEffettiviDisplay} fogli
                            </span>
                          </div>
                        </div>
                      )}
                      {fogliEffettiviDisplay > cartone.fogli && (
                        <div className="p-3 bg-[hsl(0,84%,94%)] rounded-lg border-l-4 border-[hsl(0,84%,60%)]">
                          <div className="flex items-center gap-2">
                            <i className="fas fa-exclamation-triangle text-[hsl(0,84%,60%)]"></i>
                            <span className="font-semibold text-sm sm:text-base text-[hsl(0,84%,60%)]">
                              Fogli effettivi superiori alla disponibilità di {formatFogli(differenceDisplay)} fogli!
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

            <div>
              <label className="block font-medium mb-1 sm:mb-2 text-sm">
                <i className="fas fa-sticky-note mr-1"></i> Note
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10 text-sm"
                rows={3}
                placeholder="Note opzionali..."
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-[hsl(var(--primary))] text-white rounded-md font-semibold hover:bg-[hsl(var(--primary-dark))] transition-colors text-sm sm:text-base"
            >
              <i className="fas fa-check mr-1 sm:mr-2"></i>
              Conferma Scarico
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[hsl(210,40%,96%)] text-[hsl(var(--muted-foreground))] rounded-md font-semibold hover:bg-[hsl(214,32%,91%)] transition-colors text-sm sm:text-base"
            >
              Annulla
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}