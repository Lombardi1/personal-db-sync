import { useState, useEffect } from 'react';
import { Polimero } from '@/types';
import * as notifications from '@/utils/notifications';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

interface ModalModificaPolimeroProps {
  polimero: Polimero;
  onClose: () => void;
  onModifica: (codice: string, dati: Partial<Polimero>) => Promise<{ error: any }>;
}

export function ModalModificaPolimero({ polimero, onClose, onModifica }: ModalModificaPolimeroProps) {
  const [formData, setFormData] = useState<Partial<Polimero>>({
    nr_fustella: polimero.nr_fustella || '',
    codice_fornitore: polimero.codice_fornitore || '',
    cliente: polimero.cliente || '',
    lavoro: polimero.lavoro || '',
    resa: polimero.resa || '',
    note: polimero.note || '',
    disponibile: polimero.disponibile,
  });

  const handleChange = (field: keyof Polimero, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nr_fustella || !formData.codice_fornitore || !formData.cliente || !formData.lavoro || !formData.resa) {
      notifications.showError('⚠️ Compila tutti i campi obbligatori (*)');
      return;
    }

    const datiAggiornati: Partial<Polimero> = {
      nr_fustella: formData.nr_fustella?.trim() || null,
      codice_fornitore: formData.codice_fornitore?.trim() || null,
      cliente: formData.cliente?.trim() || null,
      lavoro: formData.lavoro?.trim() || null,
      resa: formData.resa?.trim() || null,
      note: formData.note?.trim() || null,
      disponibile: formData.disponibile,
      ultima_modifica: new Date().toISOString(),
    };

    const { error } = await onModifica(polimero.codice, datiAggiornati);
    if (!error) {
      notifications.showSuccess(`✅ Polimero '${polimero.codice}' modificato con successo!`);
      onClose();
    } else {
      notifications.showError('Errore durante la modifica del polimero');
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Modifica Polimero - <span className="codice">{polimero.codice}</span></DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            Modifica i dettagli del polimero selezionato.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <Label htmlFor="nr_fustella" className="block font-medium mb-1 sm:mb-2 text-xs sm:text-sm">
                <i className="fas fa-hashtag mr-1"></i> Nr. Fustella *
              </Label>
              <Input
                id="nr_fustella"
                type="text"
                value={formData.nr_fustella}
                onChange={(e) => handleChange('nr_fustella', e.target.value)}
                className="w-full px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[hsl(var(--polimeri-color))] focus:ring-2 focus:ring-[hsl(var(--polimeri-color))]/10"
                required
              />
            </div>

            <div>
              <Label htmlFor="codice_fornitore" className="block font-medium mb-1 sm:mb-2 text-xs sm:text-sm">
                <i className="fas fa-id-card mr-1"></i> Codice Fornitore *
              </Label>
              <Input
                id="codice_fornitore"
                type="text"
                value={formData.codice_fornitore}
                onChange={(e) => handleChange('codice_fornitore', e.target.value)}
                className="w-full px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[hsl(var(--polimeri-color))] focus:ring-2 focus:ring-[hsl(var(--polimeri-color))]/10"
                required
              />
            </div>

            <div>
              <Label htmlFor="cliente" className="block font-medium mb-1 sm:mb-2 text-xs sm:text-sm">
                <i className="fas fa-user mr-1"></i> Cliente *
              </Label>
              <Input
                id="cliente"
                type="text"
                value={formData.cliente}
                onChange={(e) => handleChange('cliente', e.target.value)}
                className="w-full px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[hsl(var(--polimeri-color))] focus:ring-2 focus:ring-[hsl(var(--polimeri-color))]/10"
                required
              />
            </div>

            <div>
              <Label htmlFor="lavoro" className="block font-medium mb-1 sm:mb-2 text-xs sm:text-sm">
                <i className="fas fa-briefcase mr-1"></i> Lavoro *
              </Label>
              <Input
                id="lavoro"
                type="text"
                value={formData.lavoro}
                onChange={(e) => handleChange('lavoro', e.target.value)}
                className="w-full px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[hsl(var(--polimeri-color))] focus:ring-2 focus:ring-[hsl(var(--polimeri-color))]/10"
                required
              />
            </div>

            <div>
              <Label htmlFor="resa" className="block font-medium mb-1 sm:mb-2 text-xs sm:text-sm">
                <i className="fas fa-chart-line mr-1"></i> Resa *
              </Label>
              <Input
                id="resa"
                type="text"
                value={formData.resa}
                onChange={(e) => handleChange('resa', e.target.value)}
                className="w-full px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[hsl(var(--polimeri-color))] focus:ring-2 focus:ring-[hsl(var(--polimeri-color))]/10"
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
                className="w-full px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[hsl(var(--polimeri-color))] focus:ring-2 focus:ring-[hsl(var(--polimeri-color))]/10"
                rows={3}
                placeholder="Note opzionali..."
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.disponibile}
                onChange={(e) => handleChange('disponibile', e.target.checked)}
                className="toggle-checkbox"
                id="polimero-disponibile"
              />
              <label htmlFor="polimero-disponibile" className="toggle-label">
                <span className="toggle-ball"></span>
              </label>
              <span className="text-xs sm:text-sm font-medium">Disponibile</span>
            </label>
          </div>
        </form>
        <div className="mt-4 sm:mt-6 flex flex-wrap gap-2 sm:gap-3">
          <Button
            type="submit"
            onClick={handleSubmit}
            className="bg-[hsl(var(--polimeri-color))] text-white hover:bg-[hsl(var(--polimeri-color-dark))] px-4 sm:px-6 py-2 sm:py-2.5 text-sm sm:text-base"
          >
            <i className="fas fa-save mr-1 sm:mr-2"></i>
            Salva Polimero
          </Button>
          <Button
            type="button"
            onClick={onClose}
            className="bg-[hsl(210,40%,96%)] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(214,32%,91%)] px-4 sm:px-6 py-2 sm:py-2.5 text-sm sm:text-base"
          >
            <i className="fas fa-times mr-1 sm:mr-2"></i>
            Annulla
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}