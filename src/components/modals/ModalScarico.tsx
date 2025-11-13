import { useState } from 'react';
import { Cartone } from '@/types';
import { toast } from 'sonner';

interface ModalScaricoProps {
  codice: string;
  cartone: Cartone;
  onClose: () => void;
  onScarico: (codice: string, quantita: number, note: string) => Promise<{ error: any }>;
}

export function ModalScarico({ codice, cartone, onClose, onScarico }: ModalScaricoProps) {
  const [quantita, setQuantita] = useState('');
  const [note, setNote] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const qta = parseInt(quantita);
    if (!qta || qta < 1) {
      toast.error('⚠️ Inserisci una quantità valida.');
      return;
    }
    
    if (qta > cartone.fogli) {
      toast.error(`⚠️ Solo ${cartone.fogli} fogli disponibili.`);
      return;
    }

    onClose();
    
    const { error } = await onScarico(codice, qta, note || '-');
    if (!error) {
      toast.success(`✅ Scaricati ${qta} fogli dal cartone ${codice}`);
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
            <div className="text-lg font-bold text-[hsl(var(--primary))] mb-2">
              Cartone: <span className="codice ml-2">{codice}</span>
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
                placeholder="es. 100"
                min="1"
                max={cartone.fogli}
                required
              />
            </div>

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
