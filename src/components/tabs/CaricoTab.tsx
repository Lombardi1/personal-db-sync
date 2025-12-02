import { useState, useEffect } from 'react';
import { Cartone } from '@/types';
import { formatFormato, formatGrammatura } from '@/utils/formatters';
import { Button } from '@/components/ui/button';
import * as notifications from '@/utils/notifications'; // Aggiornato a percorso relativo
import { generateNextCartoneCode, resetCartoneCodeGenerator, fetchMaxCartoneCodeFromDB } from '@/utils/cartoneUtils';
import { parseUserNumber, formatUserNumber } from '@/lib/utils'; // Importa le nuove utilità

interface CaricoTabProps {
  aggiungiOrdine: (cartone: Cartone) => Promise<{ error: any }>;
}

export function CaricoTab({ aggiungiOrdine }: CaricoTabProps) {
  const [formData, setFormData] = useState({
    codice: 'CTN-001',
    fornitore: '',
    ordine: '',
    tipologia: '',
    formato: '',
    grammatura: '',
    fogli: '',
    cliente: '',
    lavoro: '',
    prezzo: '',
    data_consegna: '',
    note: '',
    confermato: false
  });

  useEffect(() => {
    const initializeAndGenerateCode = async () => {
      const maxCode = await fetchMaxCartoneCodeFromDB();
      resetCartoneCodeGenerator(maxCode);
      setFormData(prev => ({ ...prev, codice: generateNextCartoneCode() }));
    };
    initializeAndGenerateCode();
  }, []);

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

    if (!formData.fornitore || !formData.ordine || !formData.tipologia || 
        !formData.formato || !formData.grammatura || !formData.fogli || 
        !formData.cliente || !formData.lavoro || 
        !formData.prezzo || !formData.data_consegna) {
      notifications.showError('⚠️ Compila tutti i campi obbligatori (*)');
      return;
    }

    const nuovoOrdine: Cartone = {
      codice: formData.codice,
      fornitore: formData.fornitore.trim(),
      ordine: formData.ordine.trim(),
      tipologia: formData.tipologia.trim(),
      formato: formatFormato(formData.formato),
      grammatura: formatGrammatura(formData.grammatura),
      fogli: parseUserNumber(formData.fogli) || 0, // Parsa il numero
      cliente: formData.cliente.trim(),
      lavoro: formData.lavoro.trim(),
      magazzino: '-',
      prezzo: parseUserNumber(formData.prezzo) || 0, // Parsa il numero
      data_consegna: formData.data_consegna,
      confermato: formData.confermato,
      note: formData.note.trim() || '-'
    };

    const { error } = await aggiungiOrdine(nuovoOrdine);
    
    if (!error) {
      notifications.showSuccess(`✅ Ordine in arrivo registrato: ${formData.codice}`);
      
      setFormData({
        codice: generateNextCartoneCode(),
        fornitore: '',
        ordine: '',
        tipologia: '',
        formato: '',
        grammatura: '',
        fogli: '',
        cliente: '',
        lavoro: '',
        prezzo: '',
        data_consegna: '',
        note: '',
        confermato: false
      });
    } else {
      notifications.showError('Errore durante il salvataggio dell\'ordine');
    }
  };

  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold text-[hsl(var(--carico-color))] mb-4 sm:mb-5 flex items-center gap-2">
        <i className="fas fa-truck-loading"></i> Registra Nuovo Ordine in Arrivo
      </h2>

      <form onSubmit={handleSubmit} className="bg-[hsl(210,40%,98%)] rounded-lg p-4 sm:p-6 border border-[hsl(var(--border))]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <div>
            <label className="block font-medium mb-1 sm:mb-2 text-xs sm:text-sm">
              <i className="fas fa-barcode mr-1"></i> Codice (auto)
            </label>
            <input
              type="text"
              value={formData.codice}
              disabled
              className="w-full px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md bg-gray-100 text-xs sm:text-sm font-mono font-bold"
            />
          </div>

          <div>
            <label className="block font-medium mb-1 sm:mb-2 text-xs sm:text-sm">
              <i className="fas fa-truck mr-1"></i> Fornitore *
            </label>
            <input
              type="text"
              value={formData.fornitore}
              onChange={(e) => handleChange('fornitore', e.target.value)}
              className="w-full px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10"
              placeholder="es. Imballex Srl"
              required
            />
          </div>

          <div>
            <label className="block font-medium mb-1 sm:mb-2 text-xs sm:text-sm">
              <i className="fas fa-file-alt mr-1"></i> Numero Ordine *
            </label>
            <input
              type="text"
              value={formData.ordine}
              onChange={(e) => handleChange('ordine', e.target.value)}
              className="w-full px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10"
              placeholder="es. ORD-1234"
              required
            />
          </div>

          <div>
            <label className="block font-medium mb-1 sm:mb-2 text-xs sm:text-sm">
              <i className="fas fa-box mr-1"></i> Tipologia Cartone *
            </label>
            <input
              type="text"
              value={formData.tipologia}
              onChange={(e) => handleChange('tipologia', e.target.value)}
              className="w-full px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10"
              placeholder="es. Ondulato Triplo"
              required
            />
          </div>

          <div>
            <label className="block font-medium mb-1 sm:mb-2 text-xs sm:text-sm">
              <i className="fas fa-expand-arrows-alt mr-1"></i> Formato *
            </label>
            <input
              type="text"
              value={formData.formato}
              onChange={(e) => handleChange('formato', e.target.value)}
              className="w-full px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10"
              placeholder="es. 120x80 o 120 x 80"
              required
            />
          </div>

          <div>
            <label className="block font-medium mb-1 sm:mb-2 text-xs sm:text-sm">
              <i className="fas fa-weight-hanging mr-1"></i> Grammatura *
            </label>
            <input
              type="text"
              value={formData.grammatura}
              onChange={(e) => handleChange('grammatura', e.target.value)}
              className="w-full px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10"
              placeholder="es. 300"
              required
            />
          </div>

          <div>
            <label className="block font-medium mb-1 sm:mb-2 text-xs sm:text-sm">
              <i className="fas fa-layer-group mr-1"></i> Fogli *
            </label>
            <input
              type="text" // Changed to text
              value={formData.fogli}
              onChange={(e) => handleChange('fogli', e.target.value)}
              onBlur={(e) => handleBlur('fogli', e.target.value)} // Added onBlur
              className="w-full px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10"
              placeholder="es. 1500"
              required
            />
          </div>

          <div>
            <label className="block font-medium mb-1 sm:mb-2 text-xs sm:text-sm">
              <i className="fas fa-user mr-1"></i> Cliente *
            </label>
            <input
              type="text"
              value={formData.cliente}
              onChange={(e) => handleChange('cliente', e.target.value)}
              className="w-full px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10"
              placeholder="es. Cliente Alpha"
              required
            />
          </div>

          <div>
            <label className="block font-medium mb-1 sm:mb-2 text-xs sm:text-sm">
              <i className="fas fa-briefcase mr-1"></i> Lavoro *
            </label>
            <input
              type="text"
              value={formData.lavoro}
              onChange={(e) => handleChange('lavoro', e.target.value)}
              className="w-full px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10"
              placeholder="es. LAV-2025-089"
              required
            />
          </div>

          <div>
            <label className="block font-medium mb-1 sm:mb-2 text-xs sm:text-sm">
              <i className="fas fa-euro-sign mr-1"></i> Prezzo €/kg *
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
              <i className="fas fa-calendar mr-1"></i> Data Consegna *
            </label>
            <input
              type="date"
              value={formData.data_consegna}
              onChange={(e) => handleChange('data_consegna', e.target.value)}
              className="w-full px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10"
              required
            />
          </div>

          <div className="md:col-span-2 lg:col-span-3">
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

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.confermato}
                onChange={(e) => handleChange('confermato', e.target.checked)}
                className="toggle-checkbox"
                id="ordine-confermato"
              />
              <label htmlFor="ordine-confermato" className="toggle-label">
                <span className="toggle-ball"></span>
              </label>
              <span className="text-xs sm:text-sm font-medium">Ordine Confermato</span>
            </label>
          </div>
        </div>

        <div className="mt-4 sm:mt-6 flex flex-wrap gap-2 sm:gap-3">
          <Button
            type="submit"
            className="bg-[hsl(var(--carico-color))] text-white hover:bg-[hsl(262,66%,42%)] px-4 sm:px-6 py-2 sm:py-2.5 text-sm sm:text-base"
          >
            <i className="fas fa-save mr-1 sm:mr-2"></i>
            Salva Ordine
          </Button>
          <Button
            type="button"
            onClick={() => {
              setFormData({
                ...formData,
                fornitore: '',
                ordine: '',
                tipologia: '',
                formato: '',
                grammatura: '',
                fogli: '',
                cliente: '',
                lavoro: '',
                prezzo: '',
                data_consegna: '',
                note: '',
                confermato: false
              });
            }}
            className="bg-[hsl(210,40%,96%)] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(214,32%,91%)] px-4 sm:px-6 py-2 sm:py-2.5 text-sm sm:text-base"
          >
            <i className="fas fa-eraser mr-1 sm:mr-2"></i>
            Pulisci Form
          </Button>
        </div>
      </form>
    </div>
  );
}