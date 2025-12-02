import { useState } from 'react';
import { Cartone } from '@/types';
import * as notifications from '@/utils/notifications'; // Aggiornato a percorso relativo
import { formatFormato, formatGrammatura } from '@/utils/formatters'; // Importa formatFormato e formatGrammatura
import { parseUserNumber, formatUserNumber } from '@/lib/utils'; // Importa le nuove utilità

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
    fogli: formatUserNumber(ordine.fogli, { minimumFractionDigits: 0, maximumFractionDigits: 0 }), // Formatta per display
    cliente: ordine.cliente,
    lavoro: ordine.lavoro,
    magazzino: ordine.magazzino || '', // Assicurati che sia una stringa vuota se null
    prezzo: formatUserNumber(ordine.prezzo, { minimumFractionDigits: 3, maximumFractionDigits: 3 }), // Formatta per display
    data_consegna: ordine.data_consegna,
    note: ordine.note || '',
    ddt: ordine.ddt || '', // NUOVO CAMPO
    data_arrivo: ordine.data_arrivo || '', // NUOVO CAMPO
  });

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleBlur = (field: string, value: any) => {
    if (field === 'prezzo') {
      const numericValue = parseUserNumber(value);
      if (numericValue !== undefined) {
        setFormData(prev => ({ ...prev, [field]: formatUserNumber(numericValue, { minimumFractionDigits: 3, maximumFractionDigits: 3 }) }));
      } else {
        setFormData(prev => ({ ...prev, [field]: '' }));
      }
    } else if (field === 'fogli') {
      const numericValue = parseUserNumber(value);
      if (numericValue !== undefined) {
        setFormData(prev => ({ ...prev, [field]: formatUserNumber(numericValue, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) }));
      } else {
        setFormData(prev => ({ ...prev, [field]: '' }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const datiAggiornati: Partial<Cartone> = {
      fornitore: formData.fornitore.trim(),
      ordine: formData.ordine.trim(),
      tipologia: formData.tipologia.trim(),
      formato: formatFormato(formData.formato),
      grammatura: formatGrammatura(formData.grammatura),
      fogli: parseUserNumber(formData.fogli) || 0, // Parsa il numero
      cliente: formData.cliente.trim(),
      lavoro: formData.lavoro.trim(),
      magazzino: formData.magazzino.trim() || null, // Invia null se vuoto
      prezzo: parseUserNumber(formData.prezzo) || 0, // Parsa il numero
      data_consegna: formData.data_consegna,
      note: formData.note.trim() || '-',
      ddt: formData.ddt.trim() || null, // NUOVO: Invia null se vuoto
      data_arrivo: formData.data_arrivo.trim() || null, // NUOVO: Invia null se vuoto
    };

    await onModifica(ordine.codice, datiAggiornati);
    notifications.showSuccess(`✅ Ordine ${ordine.codice} modificato`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-5" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-lg sm:max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-4 py-3 sm:px-6 sm:py-5 border-b border-[hsl(var(--border))] flex items-center justify-between">
          <h3 className="text-lg sm:text-xl font-bold text-[hsl(var(--primary))]">
            <i className="fas fa-edit mr-1 sm:mr-2"></i>
            Modifica Ordine - <span className="codice ml-1 sm:ml-2">{ordine.codice}</span>
          </h3>
          <button onClick={onClose} className="text-xl sm:text-2xl text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block font-medium mb-1 sm:mb-2 text-xs sm:text-sm">
                <i className="fas fa-truck mr-1"></i> Fornitore
              </label>
              <input
                type="text"
                value={formData.fornitore}
                onChange={(e) => handleChange('fornitore', e.target.value)}
                className="w-full px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10"
                required
              />
            </div>

            <div>
              <label className="block font-medium mb-1 sm:mb-2 text-xs sm:text-sm">
                <i className="fas fa-file-alt mr-1"></i> Numero Ordine
              </label>
              <input
                type="text"
                value={formData.ordine}
                onChange={(e) => handleChange('ordine', e.target.value)}
                className="w-full px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10"
                required
              />
            </div>

            <div>
              <label className="block font-medium mb-1 sm:mb-2 text-xs sm:text-sm">
                <i className="fas fa-box mr-1"></i> Tipologia
              </label>
              <input
                type="text"
                value={formData.tipologia}
                onChange={(e) => handleChange('tipologia', e.target.value)}
                className="w-full px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10"
                required
              />
            </div>

            <div>
              <label className="block font-medium mb-1 sm:mb-2 text-xs sm:text-sm">
                <i className="fas fa-expand-arrows-alt mr-1"></i> Formato
              </label>
              <input
                type="text"
                value={formData.formato}
                onChange={(e) => handleChange('formato', e.target.value)}
                className="w-full px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10"
                required
              />
            </div>

            <div>
              <label className="block font-medium mb-1 sm:mb-2 text-xs sm:text-sm">
                <i className="fas fa-weight-hanging mr-1"></i> Grammatura
              </label>
              <input
                type="text"
                value={formData.grammatura}
                onChange={(e) => handleChange('grammatura', e.target.value)}
                className="w-full px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10"
                required
              />
            </div>

            <div>
              <label className="block font-medium mb-1 sm:mb-2 text-xs sm:text-sm">
                <i className="fas fa-layer-group mr-1"></i> Fogli
              </label>
              <input
                type="text" // Changed to text
                value={formData.fogli}
                onChange={(e) => handleChange('fogli', e.target.value)}
                onBlur={(e) => handleBlur('fogli', e.target.value)} // Added onBlur
                className="w-full px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10"
                required
              />
            </div>

            <div>
              <label className="block font-medium mb-1 sm:mb-2 text-xs sm:text-sm">
                <i className="fas fa-user mr-1"></i> Cliente
              </label>
              <input
                type="text"
                value={formData.cliente}
                onChange={(e) => handleChange('cliente', e.target.value)}
                className="w-full px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10"
                required
              />
            </div>

            <div>
              <label className="block font-medium mb-1 sm:mb-2 text-xs sm:text-sm">
                <i className="fas fa-briefcase mr-1"></i> Lavoro
              </label>
              <input
                type="text"
                value={formData.lavoro}
                onChange={(e) => handleChange('lavoro', e.target.value)}
                className="w-full px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10"
                required
              />
            </div>

            <div>
              <label className="block font-medium mb-1 sm:mb-2 text-xs sm:text-sm">
                <i className="fas fa-map-marker-alt mr-1"></i> Magazzino
              </label>
              <input
                type="text"
                value={formData.magazzino}
                onChange={(e) => handleChange('magazzino', e.target.value)}
                className="w-full px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10"
                required
              />
            </div>

            <div>
              <label className="block font-medium mb-1 sm:mb-2 text-xs sm:text-sm">
                <i className="fas fa-euro-sign mr-1"></i> Prezzo €/kg
              </label>
              <input
                type="text" // Changed to text
                value={formData.prezzo}
                onChange={(e) => handleChange('prezzo', e.target.value)}
                onBlur={(e) => handleBlur('prezzo', e.target.value)} // Added onBlur
                className="w-full px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10"
                placeholder="Es. 0.870" // Updated placeholder
                required
              />
            </div>

            <div>
              <label className="block font-medium mb-1 sm:mb-2 text-xs sm:text-sm">
                <i className="fas fa-calendar mr-1"></i> Data Consegna Prevista
              </label>
              <input
                type="date"
                value={formData.data_consegna}
                onChange={(e) => handleChange('data_consegna', e.target.value)}
                className="w-full px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10"
                required
              />
            </div>

            {/* NUOVI CAMPI: DDT e Data Arrivo */}
            <div>
              <label className="block font-medium mb-1 sm:mb-2 text-xs sm:text-sm">
                <i className="fas fa-file-invoice mr-1"></i> DDT
              </label>
              <input
                type="text"
                value={formData.ddt}
                onChange={(e) => handleChange('ddt', e.target.value)}
                className="w-full px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10"
                placeholder="es. 12345"
              />
            </div>

            <div>
              <label className="block font-medium mb-1 sm:mb-2 text-xs sm:text-sm">
                <i className="fas fa-calendar-alt mr-1"></i> Data Arrivo Effettivo
              </label>
              <input
                type="date"
                value={formData.data_arrivo}
                onChange={(e) => handleChange('data_arrivo', e.target.value)}
                className="w-full px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-medium mb-1 sm:mb-2 text-xs sm:text-sm">
                <i className="fas fa-sticky-note mr-1"></i> Note
              </label>
              <textarea
                value={formData.note}
                onChange={(e) => handleChange('note', e.target.value)}
                className="w-full px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10"
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
              <i className="fas fa-save mr-1 sm:mr-2"></i>
              Salva Modifiche
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