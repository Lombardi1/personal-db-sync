import React, { useState, useEffect } from 'react';
import { Fustella } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import * as notifications from '@/utils/notifications';
import { generateNextFustellaCode, resetFustellaCodeGenerator, fetchMaxFustellaCodeFromDB } from '@/utils/fustellaUtils';

interface CaricoFustellaTabProps {
  aggiungiFustella: (fustella: Omit<Fustella, 'data_creazione' | 'ultima_modifica'>) => Promise<{ error: any }>;
}

export function CaricoFustellaTab({ aggiungiFustella }: CaricoFustellaTabProps) {
  const [formData, setFormData] = useState({
    codice: 'FST-001',
    descrizione: '',
    formato: '',
    materiale: '',
    ubicazione: '',
    note: '',
    disponibile: true,
  });

  useEffect(() => {
    const initializeAndGenerateCode = async () => {
      const maxCode = await fetchMaxFustellaCodeFromDB();
      resetFustellaCodeGenerator(maxCode);
      setFormData(prev => ({ ...prev, codice: generateNextFustellaCode() }));
    };
    initializeAndGenerateCode();
  }, []);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.descrizione || !formData.formato || !formData.materiale || !formData.ubicazione) {
      notifications.showError('⚠️ Compila tutti i campi obbligatori (*)');
      return;
    }

    const nuovaFustella: Omit<Fustella, 'data_creazione' | 'ultima_modifica'> = {
      codice: formData.codice,
      descrizione: formData.descrizione.trim(),
      formato: formData.formato.trim(),
      materiale: formData.materiale.trim(),
      ubicazione: formData.ubicazione.trim(),
      note: formData.note.trim() || '-',
      disponibile: formData.disponibile,
    };

    const { error } = await aggiungiFustella(nuovaFustella);

    if (!error) {
      notifications.showSuccess(`✅ Fustella '${formData.codice}' registrata con successo!`);

      setFormData({
        codice: generateNextFustellaCode(), // Genera un nuovo codice per il prossimo inserimento
        descrizione: '',
        formato: '',
        materiale: '',
        ubicazione: '',
        note: '',
        disponibile: true,
      });
    } else {
      notifications.showError('Errore durante il salvataggio della fustella');
    }
  };

  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold text-[hsl(var(--fustelle-color))] mb-4 sm:mb-5 flex items-center gap-2">
        <i className="fas fa-plus-square"></i> Carica Nuova Fustella
      </h2>

      <form onSubmit={handleSubmit} className="bg-[hsl(210,40%,98%)] rounded-lg p-4 sm:p-6 border border-[hsl(var(--border))]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <div>
            <Label htmlFor="codice" className="block font-medium mb-1 sm:mb-2 text-xs sm:text-sm">
              <i className="fas fa-barcode mr-1"></i> Codice (auto)
            </Label>
            <Input
              id="codice"
              type="text"
              value={formData.codice}
              disabled
              className="w-full px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md bg-gray-100 text-xs sm:text-sm font-mono font-bold"
            />
          </div>

          <div>
            <Label htmlFor="descrizione" className="block font-medium mb-1 sm:mb-2 text-xs sm:text-sm">
              <i className="fas fa-tag mr-1"></i> Descrizione *
            </Label>
            <Input
              id="descrizione"
              type="text"
              value={formData.descrizione}
              onChange={(e) => handleChange('descrizione', e.target.value)}
              className="w-full px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[hsl(var(--fustelle-color))] focus:ring-2 focus:ring-[hsl(var(--fustelle-color))]/10"
              placeholder="es. Fustella scatola pizza"
              required
            />
          </div>

          <div>
            <Label htmlFor="formato" className="block font-medium mb-1 sm:mb-2 text-xs sm:text-sm">
              <i className="fas fa-expand-arrows-alt mr-1"></i> Formato *
            </Label>
            <Input
              id="formato"
              type="text"
              value={formData.formato}
              onChange={(e) => handleChange('formato', e.target.value)}
              className="w-full px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[hsl(var(--fustelle-color))] focus:ring-2 focus:ring-[hsl(var(--fustelle-color))]/10"
              placeholder="es. 30x40 cm"
              required
            />
          </div>

          <div>
            <Label htmlFor="materiale" className="block font-medium mb-1 sm:mb-2 text-xs sm:text-sm">
              <i className="fas fa-layer-group mr-1"></i> Materiale *
            </Label>
            <Input
              id="materiale"
              type="text"
              value={formData.materiale}
              onChange={(e) => handleChange('materiale', e.target.value)}
              className="w-full px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[hsl(var(--fustelle-color))] focus:ring-2 focus:ring-[hsl(var(--fustelle-color))]/10"
              placeholder="es. Acciaio"
              required
            />
          </div>

          <div>
            <Label htmlFor="ubicazione" className="block font-medium mb-1 sm:mb-2 text-xs sm:text-sm">
              <i className="fas fa-map-marker-alt mr-1"></i> Ubicazione *
            </Label>
            <Input
              id="ubicazione"
              type="text"
              value={formData.ubicazione}
              onChange={(e) => handleChange('ubicazione', e.target.value)}
              className="w-full px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[hsl(var(--fustelle-color))] focus:ring-2 focus:ring-[hsl(var(--fustelle-color))]/10"
              placeholder="es. Reparto A, Scaffale 3"
              required
            />
          </div>

          <div className="md:col-span-2 lg:col-span-3">
            <Label htmlFor="note" className="block font-medium mb-1 sm:mb-2 text-xs sm:text-sm">
              <i className="fas fa-sticky-note mr-1"></i> Note
            </Label>
            <Textarea
              id="note"
              value={formData.note}
              onChange={(e) => handleChange('note', e.target.value)}
              className="w-full px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[hsl(var(--fustelle-color))] focus:ring-2 focus:ring-[hsl(var(--fustelle-color))]/10"
              rows={3}
              placeholder="Note opzionali..."
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.disponibile}
                onChange={(e) => handleChange('disponibile', e.target.checked)}
                className="toggle-checkbox"
                id="fustella-disponibile"
              />
              <label htmlFor="fustella-disponibile" className="toggle-label">
                <span className="toggle-ball"></span>
              </label>
              <span className="text-xs sm:text-sm font-medium">Disponibile</span>
            </label>
          </div>
        </div>

        <div className="mt-4 sm:mt-6 flex flex-wrap gap-2 sm:gap-3">
          <Button
            type="submit"
            className="bg-[hsl(var(--fustelle-color))] text-white hover:bg-[hsl(var(--fustelle-color-dark))] px-4 sm:px-6 py-2 sm:py-2.5 text-sm sm:text-base"
          >
            <i className="fas fa-save mr-1 sm:mr-2"></i>
            Salva Fustella
          </Button>
          <Button
            type="button"
            onClick={() => {
              setFormData({
                codice: generateNextFustellaCode(),
                descrizione: '',
                formato: '',
                materiale: '',
                ubicazione: '',
                note: '',
                disponibile: true,
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