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

interface ModalModificaFustellaProps {
  fustella: Fustella;
  onClose: () => void;
  onModifica: (codice: string, dati: Partial<Fustella>) => Promise<{ error: any }>;
}

export function ModalModificaFustella({ fustella, onClose, onModifica }: ModalModificaFustellaProps) {
  const [formData, setFormData] = useState<Partial<Fustella>>({
    descrizione: fustella.descrizione,
    formato: fustella.formato,
    materiale: fustella.materiale,
    ubicazione: fustella.ubicazione,
    note: fustella.note || '',
    disponibile: fustella.disponibile,
    fornitore: fustella.fornitore || '',
    codice_fornitore: fustella.codice_fornitore || '',
    cliente: fustella.cliente || '',
    lavoro: fustella.lavoro || '',
    fustellatrice: fustella.fustellatrice || '',
    resa: fustella.resa || '',
    pulitore: fustella.pulitore || false,
    pinza_tagliata: fustella.pinza_tagliata || false,
    tasselli_intercambiabili: fustella.tasselli_intercambiabili || false,
    nr_tasselli: fustella.nr_tasselli || null, // Modificato a null
    incollatura: fustella.incollatura || false,
    incollatrice: fustella.incollatrice || '',
    tipo_incollatura: fustella.tipo_incollatura || '',
  });

  const handleChange = (field: keyof Fustella, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.descrizione || !formData.formato || !formData.materiale || !formData.ubicazione ||
        !formData.fornitore || !formData.cliente || !formData.lavoro || !formData.resa ||
        !formData.fustellatrice || (formData.incollatura && (!formData.incollatrice || !formData.tipo_incollatura))) {
      notifications.showError('⚠️ Compila tutti i campi obbligatori (*)');
      return;
    }

    const datiAggiornati: Partial<Fustella> = {
      descrizione: formData.descrizione?.trim(),
      formato: formData.formato?.trim(),
      materiale: formData.materiale?.trim(),
      ubicazione: formData.ubicazione?.trim(),
      note: formData.note?.trim() || null,
      disponibile: formData.disponibile,
      fornitore: formData.fornitore?.trim(),
      codice_fornitore: formData.codice_fornitore?.trim() || null,
      cliente: formData.cliente?.trim(),
      lavoro: formData.lavoro?.trim(),
      fustellatrice: formData.fustellatrice?.trim(),
      resa: formData.resa?.trim(),
      pulitore: formData.pulitore,
      pinza_tagliata: formData.pinza_tagliata,
      tasselli_intercambiabili: formData.tasselli_intercambiabili,
      nr_tasselli: formData.nr_tasselli,
      incollatura: formData.incollatura,
      incollatrice: formData.incollatura ? formData.incollatrice?.trim() : null,
      tipo_incollatura: formData.incollatura ? formData.tipo_incollatura?.trim() : null,
      ultima_modifica: new Date().toISOString(),
    };

    const { error } = await onModifica(fustella.codice, datiAggiornati);
    if (!error) {
      notifications.showSuccess(`✅ Fustella '${fustella.codice}' modificata con successo!`);
      onClose();
    } else {
      notifications.showError('Errore durante la modifica della fustella');
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
              <Label htmlFor="descrizione" className="block font-medium mb-1 sm:mb-2 text-xs sm:text-sm">
                <i className="fas fa-tag mr-1"></i> Descrizione *
              </Label>
              <Input
                id="descrizione"
                type="text"
                value={formData.descrizione}
                onChange={(e) => handleChange('descrizione', e.target.value)}
                className="w-full px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[hsl(var(--fustelle-color))] focus:ring-2 focus:ring-[hsl(var(--fustelle-color))]/10"
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
                  id="pulitore"
                  checked={formData.pulitore}
                  onCheckedChange={(checked) => handleChange('pulitore', checked)}
                />
                <Label htmlFor="pulitore" className="text-xs sm:text-sm">Pulitore</Label>
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
          </div> {/* This closing div was missing */}

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
                fornitore: '',
                codice_fornitore: '',
                cliente: '',
                lavoro: '',
                fustellatrice: '',
                resa: '',
                pulitore: false,
                pinza_tagliata: false,
                tasselli_intercambiabili: false,
                nr_tasselli: null,
                incollatura: false,
                incollatrice: '',
                tipo_incollatura: '',
              });
            }}
            className="bg-[hsl(210,40%,96%)] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(214,32%,91%)] px-4 sm:px-6 py-2 sm:py-2.5 text-sm sm:text-base"
          >
            <i className="fas fa-eraser mr-1 sm:mr-2"></i>
            Pulisci Form
          </Button>
        </div>
      </form>
    </DialogContent>
    </Dialog>
  );
}