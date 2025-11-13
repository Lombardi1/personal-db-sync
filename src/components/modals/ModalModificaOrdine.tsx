import { useState } from 'react';
import { Cartone } from '@/types';
import { formatFormato, formatGrammatura } from '@/utils/formatters';
import { toast } from 'sonner';

interface ModalModificaOrdineProps {
  ordine: Cartone;
  onClose: () => void;
  onModifica: (codice: string, dati: Partial<Cartone>) => Promise<void>;
}

export function ModalModificaOrdine({ ordine, onClose, onModifica }: ModalModificaOrdineProps) {
  const [formData, setFormData] = useState({
    fornitore: ordine.fornitore,
    ordine: ordine.ordine,
    tipologia: ordine.tipologia,
    formato: ordine.formato,
    grammatura: ordine.grammatura.replace(' g/m²', ''),
    fogli: ordine.fogli.toString(),
    cliente: ordine.cliente,
    lavoro: ordine.lavoro,
    magazzino: ordine.magazzino,
    prezzo: ordine.prezzo.toString(),
    data_consegna: ordine.data_consegna,
    note: ordine.note || ''
  });

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const datiAggiornati: Partial<Cartone> = {
      fornitore: formData.fornitore.trim(),
      ordine: formData.ordine.trim(),
      tipologia: formData.tipologia.trim(),
      formato: formatFormato(formData.formato),
      grammatura: formatGrammatura(formData.grammatura),
      fogli: parseInt(formData.fogli),
      cliente: formData.cliente.trim(),
      lavoro: formData.lavoro.trim(),
      magazzino: formData.magazzino.trim(),
      prezzo: parseFloat(formData.prezzo),
      data_consegna: formData.data_consegna,
      note: formData.note.trim() || '-'
    };

    await onModifica(ordine.codice, datiAggiornati);
    toast.success(`✅ Ordine ${ordine.codice} modificato`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-5" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-[hsl(var(--border))] flex items-center justify-between">
          <h3 className="text-xl font-bold text-[hsl(var(--primary))]">
            <i className="fas fa-edit mr-2"></i>
            Modifica Ordine - <span className="codice ml-2">{ordine.codice}</span>
          </h3>
          <button onClick={onClose} className="text-2xl text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium mb-2 text-sm">
                <i className="fas fa-truck mr-1"></i> Fornitore
              </label>
              <input
                type="text"
                value={formData.fornitore}
                onChange={(e) => handleChange('fornitore', e.target.value)}
                className="w-full px-3 py-2 border border-[hsl(var(--border))] rounded-md text-sm focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10"
                required
              />
            </div>

            <div>
              <label className="block font-medium mb-2 text-sm">
                <i className="fas fa-file-alt mr-1"></i> Numero Ordine
              </label>
              <input
                type="text"
                value={formData.ordine}
                onChange={(e) => handleChange('ordine', e.target.value)}
                className="w-full px-3 py-2 border border-[hsl(var(--border))] rounded-md text-sm focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10"
                required
              />
            </div>

            <div>
              <label className="block font-medium mb-2 text-sm">
                <i className="fas fa-box mr-1"></i> Tipologia
              </label>
              <input
                type="text"
                value={formData.tipologia}
                onChange={(e) => handleChange('tipologia', e.target.value)}
                className="w-full px-3 py-2 border border-[hsl(var(--border))] rounded-md text-sm focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10"
                required
              />
            </div>

            <div>
              <label className="block font-medium mb-2 text-sm">
                <i className="fas fa-expand-arrows-alt mr-1"></i> Formato
              </label>
              <input
                type="text"
                value={formData.formato}
                onChange={(e) => handleChange('formato', e.target.value)}
                className="w-full px-3 py-2 border border-[hsl(var(--border))] rounded-md text-sm focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10"
                required
              />
            </div>

            <div>
              <label className="block font-medium mb-2 text-sm">
                <i className="fas fa-weight-hanging mr-1"></i> Grammatura
              </label>
              <input
                type="text"
                value={formData.grammatura}
                onChange={(e) => handleChange('grammatura', e.target.value)}
                className="w-full px-3 py-2 border border-[hsl(var(--border))] rounded-md text-sm focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10"
                required
              />
            </div>

            <div>
              <label className="block font-medium mb-2 text-sm">
                <i className="fas fa-layer-group mr-1"></i> Fogli
              </label>
              <input
                type="number"
                value={formData.fogli}
                onChange={(e) => handleChange('fogli', e.target.value)}
                className="w-full px-3 py-2 border border-[hsl(var(--border))] rounded-md text-sm focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10"
                required
              />
            </div>

            <div>
              <label className="block font-medium mb-2 text-sm">
                <i className="fas fa-user mr-1"></i> Cliente
              </label>
              <input
                type="text"
                value={formData.cliente}
                onChange={(e) => handleChange('cliente', e.target.value)}
                className="w-full px-3 py-2 border border-[hsl(var(--border))] rounded-md text-sm focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10"
                required
              />
            </div>

            <div>
              <label className="block font-medium mb-2 text-sm">
                <i className="fas fa-briefcase mr-1"></i> Lavoro
              </label>
              <input
                type="text"
                value={formData.lavoro}
                onChange={(e) => handleChange('lavoro', e.target.value)}
                className="w-full px-3 py-2 border border-[hsl(var(--border))] rounded-md text-sm focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10"
                required
              />
            </div>

            <div>
              <label className="block font-medium mb-2 text-sm">
                <i className="fas fa-map-marker-alt mr-1"></i> Magazzino
              </label>
              <input
                type="text"
                value={formData.magazzino}
                onChange={(e) => handleChange('magazzino', e.target.value)}
                className="w-full px-3 py-2 border border-[hsl(var(--border))] rounded-md text-sm focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10"
                required
              />
            </div>

            <div>
              <label className="block font-medium mb-2 text-sm">
                <i className="fas fa-euro-sign mr-1"></i> Prezzo €/kg
              </label>
              <input
                type="number"
                step="0.001"
                value={formData.prezzo}
                onChange={(e) => handleChange('prezzo', e.target.value)}
                className="w-full px-3 py-2 border border-[hsl(var(--border))] rounded-md text-sm focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10"
                required
              />
            </div>

            <div>
              <label className="block font-medium mb-2 text-sm">
                <i className="fas fa-calendar mr-1"></i> Data Consegna
              </label>
              <input
                type="date"
                value={formData.data_consegna}
                onChange={(e) => handleChange('data_consegna', e.target.value)}
                className="w-full px-3 py-2 border border-[hsl(var(--border))] rounded-md text-sm focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-medium mb-2 text-sm">
                <i className="fas fa-sticky-note mr-1"></i> Note
              </label>
              <textarea
                value={formData.note}
                onChange={(e) => handleChange('note', e.target.value)}
                className="w-full px-3 py-2 border border-[hsl(var(--border))] rounded-md text-sm focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10"
                rows={3}
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-[hsl(var(--primary))] text-white rounded-md font-semibold hover:bg-[hsl(var(--primary-dark))] transition-colors"
            >
              <i className="fas fa-save mr-2"></i>
              Salva Modifiche
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
