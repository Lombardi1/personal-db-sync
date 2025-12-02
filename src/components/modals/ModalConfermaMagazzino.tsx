import { useState } from 'react';
import { Cartone } from '@/types';
import * as notifications from '@/utils/notifications'; // Aggiornato a percorso relativo

interface ModalConfermaMagazzinoProps {
  codice: string;
  ordine: Cartone;
  onClose: () => void;
  onConferma: (codice: string, ddt: string | null, dataArrivo: string, fogliEffettivi: number, magazzino: string | null) => Promise<{ error: any }>;
}

export function ModalConfermaMagazzino({ codice, ordine, onClose, onConferma }: ModalConfermaMagazzinoProps) {
  const [ddt, setDdt] = useState('');
  const [dataArrivo, setDataArrivo] = useState('');
  const [fogliEffettivi, setFogliEffettivi] = useState<string>(String(ordine.fogli));
  const [magazzino, setMagazzino] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!ddt || !dataArrivo || !fogliEffettivi || !magazzino) {
      notifications.showError('⚠️ Compila tutti i campi obbligatori.');
      return;
    }

    const fogliNum = parseInt(fogliEffettivi);
    if (isNaN(fogliNum) || fogliNum <= 0) {
      notifications.showError('⚠️ Inserisci un numero di fogli valido.');
      return;
    }

    console.log(`[ModalConfermaMagazzino] Dati inviati a onConferma: codice=${codice}, ddt='${ddt}', dataArrivo='${dataArrivo}', fogliEffettivi=${fogliNum}, magazzino='${magazzino}'`);

    onClose();
    
    const { error } = await onConferma(
      codice, 
      ddt.trim() || null, // Passa null se la stringa è vuota
      dataArrivo, 
      fogliNum, 
      magazzino.trim() || null // Passa null se la stringa è vuota
    );
    if (!error) {
      const diff = fogliNum - ordine.fogli;
      const message = diff === 0 
        ? `✅ Ordine ${codice} spostato in magazzino`
        : `✅ Ordine ${codice} spostato in magazzino (${diff > 0 ? '+' : ''}${diff} fogli rispetto all'ordine})`;
      notifications.showSuccess(message);
    } else {
      notifications.showError('Errore durante lo spostamento in magazzino');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-5" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-lg sm:max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-4 py-3 sm:px-6 sm:py-5 border-b border-[hsl(var(--border))] flex items-center justify-between">
          <h3 className="text-lg sm:text-xl font-bold text-[hsl(var(--primary))]">
            <i className="fas fa-arrow-right mr-1 sm:mr-2"></i>
            Conferma Arrivo in Magazzino
          </h3>
          <button onClick={onClose} className="text-xl sm:text-2xl text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6">
          <div className="bg-[hsl(199,100%,97%)] rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 border-l-4 border-[hsl(var(--primary))]">
            <div className="text-base sm:text-lg font-bold text-[hsl(var(--primary))] mb-1 sm:mb-2">
              Ordine: <span className="codice ml-1 sm:ml-2">{codice}</span>
            </div>
            <div className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))]">
              <div><strong>Fornitore:</strong> {ordine.fornitore}</div>
              <div><strong>Tipologia:</strong> {ordine.tipologia}</div>
              <div><strong>Fogli Ordinati:</strong> {ordine.fogli}</div>
            </div>
          </div>

          <div className="space-y-3 sm:space-y-4">
            <div>
              <label className="block font-medium mb-1 sm:mb-2 text-sm">
                <i className="fas fa-file-alt mr-1"></i> Numero DDT *
              </label>
              <input
                type="text"
                value={ddt}
                onChange={(e) => setDdt(e.target.value)}
                className="w-full px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10 text-sm"
                placeholder="es. 7890"
                required
              />
            </div>

            <div>
              <label className="block font-medium mb-1 sm:mb-2 text-sm">
                <i className="fas fa-calendar mr-1"></i> Data Arrivo Effettivo *
              </label>
              <input
                type="date"
                value={dataArrivo}
                onChange={(e) => setDataArrivo(e.target.value)}
                className="w-full px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10 text-sm"
                required
              />
            </div>

            <div>
              <label className="block font-medium mb-1 sm:mb-2 text-sm">
                <i className="fas fa-map-marker-alt mr-1"></i> Magazzino *
              </label>
              <input
                type="text"
                value={magazzino}
                onChange={(e) => setMagazzino(e.target.value)}
                className="w-full px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10 text-sm"
                placeholder="es. Mag. B - S5"
                required
              />
            </div>

            <div>
              <label className="block font-medium mb-1 sm:mb-2 text-sm">
                <i className="fas fa-layer-group mr-1"></i> Fogli Effettivi Arrivati *
              </label>
              <input
                type="number"
                value={fogliEffettivi}
                onChange={(e) => setFogliEffettivi(e.target.value)}
                className="w-full px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10 text-sm"
                placeholder={`es. ${ordine.fogli}`}
                min="1"
                required
              />
              {parseInt(fogliEffettivi) !== ordine.fogli && fogliEffettivi && (
                <div className={`text-xs sm:text-sm mt-1 sm:mt-2 font-medium ${
                  parseInt(fogliEffettivi) > ordine.fogli 
                    ? 'text-[hsl(var(--success))]' 
                    : 'text-[hsl(var(--warning))]'
                }`}>
                  <i className={`fas fa-${parseInt(fogliEffettivi) > ordine.fogli ? 'arrow-up' : 'arrow-down'} mr-1`}></i>
                  Differenza: {parseInt(fogliEffettivi) - ordine.fogli > 0 ? '+' : ''}{parseInt(fogliEffettivi) - ordine.fogli} fogli
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-[hsl(var(--primary))] text-white rounded-md font-semibold hover:bg-[hsl(var(--primary-dark))] transition-colors text-sm sm:text-base"
            >
              <i className="fas fa-check mr-1 sm:mr-2"></i>
              Conferma e Sposta in Magazzino
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