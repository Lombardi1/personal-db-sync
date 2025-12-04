import { useState, useEffect } from 'react';
import { Fustella } from '@/types';
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
import { findNextAvailablePulitoreCode } from '@/utils/pulitoreUtils'; // Importa la nuova funzione

interface ModalModificaFustellaProps {
  fustella: Fustella;
  onClose: () => void;
  onModifica: (codice: string, dati: Partial<Fustella>) => Promise<{ error: any }>;
}

export function ModalModificaFustella({ fustella, onClose, onModifica }: ModalModificaFustellaProps) {
  const [formData, setFormData] = useState<Partial<Fustella>>({
    disponibile: fustella.disponibile,
    fornitore: fustella.fornitore || '',
    codice_fornitore: fustella.codice_fornitore || '',
    cliente: fustella.cliente || '',
    lavoro: fustella.lavoro || '',
    fustellatrice: fustella.fustellatrice || '',
    resa: fustella.resa || '',
    hasPulitore: !!fustella.pulitore_codice, // Nuovo stato per controllare la presenza del pulitore
    pulitore_codice: fustella.pulitore_codice || '', // Nuovo campo per il codice del pulitore
    pinza_tagliata: fustella.pinza_tagliata || false,
    tasselli_intercambiabili: fustella.tasselli_intercambiabili || false,
    nr_tasselli: fustella.nr_tasselli || null,
    incollatura: fustella.incollatura || false,
    incollatrice: fustella.incollatrice || '',
    tipo_incollatura: fustella.tipo_incollatura || '',
  });

  const handleChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => {
      const newState = { ...prev, [field]: value };
      if (field === 'hasPulitore') {
        if (value) {
          // Se 'hasPulitore' viene spuntato e il codice non esiste, genera un nuovo codice
          if (!newState.pulitore_codice) {
            findNextAvailablePulitoreCode().then(code => {
              setFormData(current => ({ ...current, pulitore_codice: code }));
            });
          }
        } else {
          // Se 'hasPulitore' viene deselezionato, resetta il codice pulitore
          newState.pulitore_codice = '';
        }
      }
      return newState;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fornitore || !formData.cliente || !formData.lavoro || !formData.resa ||
        !formData.fustellatrice || (formData.incollatura && (!formData.incollatrice || !formData.tipo_incollatura))) {
      notifications.showError('⚠️ Compila tutti i campi obbligatori (*)');
      return;
    }

    const datiAggiornati: Partial<Fustella> = {
      disponibile: formData.disponibile,
      fornitore: formData.fornitore?.trim(),
      codice_fornitore: formData.codice_fornitore?.trim() || null,
      cliente: formData.cliente?.trim(),
      lavoro: formData.lavoro?.trim(),
      fustellatrice: formData.fustellatrice?.trim(),
      resa: formData.resa?.trim(),
      pulitore_codice: formData.hasPulitore ? formData.pulitore_codice : null, // Inserisce il codice solo se 'hasPulitore' è true
      pinza_tagliata: formData.pinza_tagliata,
      tasselli_intercambiabili: formData.tasselli_intercambiabili,
      nr_tasselli: formData.nr_tasselli,
      incollatura: formData.incollatura,
      incollatrice: formData.incollatura ? formData.incollatrice?.trim() : null,
      tipo_incollatura: formData.incollatura ? formData.tipo_incollatura?.trim() : null,
      ultima_modifica: new Date().toISOString(),
    };

    console.log('[ModalModificaFustella] Calling onModifica with:', fustella.codice, datiAggiornati);
    const result = await onModifica(fustella.codice, datiAggiornati);
    console.log('[ModalModificaFustella] Received result from onModifica:', result);
    
    if (result && typeof result === 'object' && 'error' in result) {
      const { error } = result;
      if (!error) {
        notifications.showSuccess(`✅ Fustella '${fustella.codice}' modificata con successo!`);
        onClose();
      } else {
        notifications.showError('Errore durante la modifica della fustella');
      }
    } else {
      console.error('[ModalModificaFustella] Unexpected return value from onModifica:', result);
      notifications.showError('Errore inatteso durante la modifica della fustella. Il risultato dell\'operazione non è valido.');
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Modifica Fustella - <span className="codice">{fustella.codice}</span></DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            Modifica i dettagli della fustella selezionata.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <Label htmlFor="fornitore" className="block font-medium mb-1 sm:mb-2 text-xs sm:text-sm">
                <i className="fas fa-truck mr-1"></i> Fornitore *
              </Label>
              <Input
                id="fornitore"
                type="text"
                value={formData.fornitore}
                onChange={(e) => handleChange('fornitore', e.target.value)}
                className="w-full px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[hsl(var(--fustelle-color))] focus:ring-2 focus:ring-[hsl(var(--fustelle-color))]/10"
                required
              />
            </div>

            <div>
              <Label htmlFor="codice_fornitore" className="block font-medium mb-1 sm:mb-2 text-xs sm:text-sm">
                <i className="fas fa-id-card mr-1"></i> Codice Fornitore
              </Label>
              <Input
                id="codice_fornitore"
                type="text"
                value={formData.codice_fornitore}
                onChange={(e) => handleChange('codice_fornitore', e.target.value)}
                className="w-full px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[hsl(var(--fustelle-color))] focus:ring-2 focus:ring-[hsl(var(--fustelle-color))]/10"
                placeholder="es. FOR-001"
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
                className="w-full px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[hsl(var(--fustelle-color))] focus:ring-2 focus:ring-[hsl(var(--fustelle-color))]/10"
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
                className="w-full px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[hsl(var(--fustelle-color))] focus:ring-2 focus:ring-[hsl(var(--fustelle-color))]/10"
                required
              />
            </div>

            <div>
              <Label htmlFor="fustellatrice" className="block font-medium mb-1 sm:mb-2 text-xs sm:text-sm">
                <i className="fas fa-cogs mr-1"></i> Fustellatrice *
              </Label>
              <Input
                id="fustellatrice"
                type="text"
                value={formData.fustellatrice}
                onChange={(e) => handleChange('fustellatrice', e.target.value)}
                className="w-full px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[hsl(var(--fustelle-color))] focus:ring-2 focus:ring-[hsl(var(--fustelle-color))]/10"
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
                className="w-full px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[hsl(var(--fustelle-color))] focus:ring-2 focus:ring-[hsl(var(--fustelle-color))]/10"
                required
              />
            </div>

            <div className="md:col-span-2 lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasPulitore"
                  checked={formData.hasPulitore}
                  onCheckedChange={(checked) => handleChange('hasPulitore', checked)}
                />
                <Label htmlFor="hasPulitore" className="text-xs sm:text-sm">Ha Pulitore</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="pinza_tagliata"
                  checked={formData.pinza_tagliata}
                  onCheckedChange={(checked) => handleChange('pinza_tagliata', checked)}
                />
                <Label htmlFor="pinza_tagliata" className="text-xs sm:text-sm">Pinza Tagliata</Label>
            </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="tasselli_intercambiabili"
                  checked={formData.tasselli_intercambiabili}
                  onCheckedChange={(checked) => handleChange('tasselli_intercambiabili', checked)}
                />
                <Label htmlFor="tasselli_intercambiabili" className="text-xs sm:text-sm">Tasselli Intercambiabili</Label>
              </div>
            </div>

            {formData.hasPulitore && (
              <div>
                <Label htmlFor="pulitore_codice" className="block font-medium mb-1 sm:mb-2 text-xs sm:text-sm">
                  <i className="fas fa-broom mr-1"></i> Codice Pulitore (auto)
                </Label>
                <Input
                  id="pulitore_codice"
                  type="text"
                  value={formData.pulitore_codice}
                  readOnly // Modificato da disabled
                  className="w-full px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm font-mono font-bold" // Rimosso bg-gray-100
                />
              </div>
            )}

            {formData.tasselli_intercambiabili && (
              <div>
                <Label htmlFor="nr_tasselli" className="block font-medium mb-1 sm:mb-2 text-xs sm:text-sm">
                  <i className="fas fa-hashtag mr-1"></i> Nr. Tasselli
                </Label>
                <Input
                  id="nr_tasselli"
                  type="number"
                  value={formData.nr_tasselli || ''}
                  onChange={(e) => handleChange('nr_tasselli', e.target.value === '' ? null : parseInt(e.target.value))}
                  className="w-full px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[hsl(var(--fustelle-color))] focus:ring-2 focus:ring-[hsl(var(--fustelle-color))]/10"
                  min="0"
                />
              </div>
            )}

            <div className="md:col-span-2 lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="incollatura"
                  checked={formData.incollatura}
                  onCheckedChange={(checked) => handleChange('incollatura', checked)}
                />
                <Label htmlFor="incollatura" className="text-xs sm:text-sm">Incollatura</Label>
              </div>
              {formData.incollatura && (
                <>
                  <div>
                    <Label htmlFor="incollatrice" className="block font-medium mb-1 sm:mb-2 text-xs sm:text-sm">
                      <i className="fas fa-cogs mr-1"></i> Incollatrice *
                    </Label>
                    <Input
                      id="incollatrice"
                      type="text"
                      value={formData.incollatrice}
                      onChange={(e) => handleChange('incollatrice', e.target.value)}
                      className="w-full px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[hsl(var(--fustelle-color))] focus:ring-2 focus:ring-[hsl(var(--fustelle-color))]/10"
                      placeholder="es. Bobst Masterfold"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="tipo_incollatura" className="block font-medium mb-1 sm:mb-2 text-xs sm:text-sm">
                      <i className="fas fa-tape mr-1"></i> Tipo Incollatura *
                    </Label>
                    <Input
                      id="tipo_incollatura"
                      type="text"
                      value={formData.tipo_incollatura}
                      onChange={(e) => handleChange('tipo_incollatura', e.target.value)}
                      className="w-full px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[hsl(var(--fustelle-color))] focus:ring-2 focus:ring-[hsl(var(--fustelle-color))]/10"
                      placeholder="es. Lineare, 4 punti"
                      required
                    />
                  </div>
                </>
              )}
            </div>
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
        </form>
        <div className="mt-4 sm:mt-6 flex flex-wrap gap-2 sm:gap-3">
          <Button
            type="submit"
            onClick={handleSubmit}
            className="bg-[hsl(var(--fustelle-color))] text-white hover:bg-[hsl(var(--fustelle-color-dark))] px-4 sm:px-6 py-2 sm:py-2.5 text-sm sm:text-base"
          >
            <i className="fas fa-save mr-1 sm:mr-2"></i>
            Salva Fustella
          </Button>
          <Button
            type="button"
            onClick={async () => { // Modificato per essere async
              // Genera il prossimo codice FST disponibile
              // await generateAndSetFustellaCode(); // This function is not defined in this component, it's in CaricoFustellaTab

              // Generate a new pulitore code if hasPulitore is true
              let newPulitoreCode = '';
              if (formData.hasPulitore) {
                newPulitoreCode = await findNextAvailablePulitoreCode();
              }

              setFormData(prev => ({
                ...prev,
                // codice: nextFustellaCode, // Già aggiornato da generateAndSetFustellaCode
                fornitore: '',
                codice_fornitore: '',
                cliente: '',
                lavoro: '',
                fustellatrice: '',
                resa: '',
                hasPulitore: false,
                pulitore_codice: newPulitoreCode, // Set the new code if hasPulitore was true
                pinza_tagliata: false,
                tasselli_intercambiabili: false,
                nr_tasselli: null,
                incollatura: false,
                incollatrice: '',
                tipo_incollatura: '',
              }));
            }}
            className="bg-[hsl(210,40%,96%)] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(214,32%,91%)] px-4 sm:px-6 py-2 sm:py-2.5 text-sm sm:text-base"
          >
            <i className="fas fa-eraser mr-1 sm:mr-2"></i>
            Pulisci Form
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}