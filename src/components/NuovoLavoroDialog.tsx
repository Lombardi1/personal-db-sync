import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NuovoLavoroDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// Componente Autocomplete riutilizzabile
function AutocompleteField({
  label,
  value,
  onChange,
  suggestions,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            {value || placeholder || `Seleziona ${label.toLowerCase()}...`}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput
              placeholder={`Cerca o scrivi ${label.toLowerCase()}...`}
              value={value}
              onValueChange={onChange}
            />
            <CommandEmpty>
              Nessun suggerimento. Premi Enter per usare "{value}"
            </CommandEmpty>
            <CommandGroup className="max-h-[200px] overflow-auto">
              {suggestions.map((suggestion) => (
                <CommandItem
                  key={suggestion}
                  value={suggestion}
                  onSelect={(currentValue) => {
                    onChange(currentValue);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === suggestion ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {suggestion}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function NuovoLavoroDialog({ open, onOpenChange, onSuccess }: NuovoLavoroDialogProps) {
  const [loading, setLoading] = useState(false);
  const [nextLotto, setNextLotto] = useState<number>(0);

  // Suggerimenti dai dati esistenti
  const [suggerimenti, setSuggerimenti] = useState({
    clienti: [] as string[],
    cartoni: [] as string[],
    colori: [] as string[],
    finiture: [] as string[],
    polimeri: [] as string[],
    fustelle: [] as string[],
  });

  // Campi del form
  const [formData, setFormData] = useState({
    cliente: '',
    lavoro: '',
    identificativo: '',
    ordine_nr: '',
    formato: '',
    quantita: '',
    fogli: '',
    note: '',
    cartone: '',
    taglio: 'NO',
    colori: '',
    finitura: '',
    polimero: '',
    fustella: '',
    pinza_tg: 'NO',
    pvc: 'NO',
    inc: 'NO',
  });

  useEffect(() => {
    if (open) {
      loadSuggerimenti();
      loadNextLotto();
    }
  }, [open]);

  const loadNextLotto = async () => {
    try {
      const { data, error } = await supabase
        .from('lavori_stampa')
        .select('lotto')
        .order('lotto', { ascending: false })
        .limit(1);

      if (error) throw error;

      const maxLotto = data && data.length > 0 ? data[0].lotto : 0;
      setNextLotto(maxLotto + 1);
    } catch (error) {
      console.error('Errore caricamento lotto:', error);
      setNextLotto(1);
    }
  };

  const loadSuggerimenti = async () => {
    try {
      const { data, error } = await supabase
        .from('lavori_stampa')
        .select('cliente, cartone, colori, finitura, polimero, fustella');

      if (error) throw error;

      if (data) {
        // Estrai valori unici per ogni campo
        const clienti = [...new Set(data.map(d => d.cliente).filter(Boolean))].sort();
        const cartoni = [...new Set(data.map(d => d.cartone).filter(Boolean))].sort();
        const colori = [...new Set(data.map(d => d.colori).filter(Boolean))].sort();
        const finiture = [...new Set(data.map(d => d.finitura).filter(Boolean))].sort();
        const polimeri = [...new Set(data.map(d => d.polimero).filter(Boolean))].sort();
        const fustelle = [...new Set(data.map(d => d.fustella).filter(Boolean))].sort();

        setSuggerimenti({
          clienti,
          cartoni,
          colori,
          finiture,
          polimeri,
          fustelle,
        });
      }
    } catch (error) {
      console.error('Errore caricamento suggerimenti:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.cliente || !formData.lavoro || !formData.quantita) {
      toast.error('Compila i campi obbligatori: Cliente, Lavoro, Quantità');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('lavori_stampa')
        .insert({
          lotto: nextLotto,
          cliente: formData.cliente,
          lavoro: formData.lavoro,
          identificativo: formData.identificativo || null,
          ordine_nr: formData.ordine_nr || null,
          formato: formData.formato || null,
          quantita: parseInt(formData.quantita),
          fogli: formData.fogli || null,
          data: new Date().toISOString().split('T')[0],
          note: formData.note || null,
          cartone: formData.cartone || null,
          taglio: formData.taglio || null,
          colori: formData.colori || null,
          finitura: formData.finitura || null,
          polimero: formData.polimero || null,
          fustella: formData.fustella || null,
          pinza_tg: formData.pinza_tg || null,
          pvc: formData.pvc || null,
          inc: formData.inc || null,
        });

      if (error) throw error;

      toast.success(`Lavoro ${nextLotto} creato con successo!`);
      onSuccess();
      onOpenChange(false);

      // Reset form
      setFormData({
        cliente: '',
        lavoro: '',
        identificativo: '',
        ordine_nr: '',
        formato: '',
        quantita: '',
        fogli: '',
        note: '',
        cartone: '',
        taglio: 'NO',
        colori: '',
        finitura: '',
        polimero: '',
        fustella: '',
        pinza_tg: 'NO',
        pvc: 'NO',
        inc: 'NO',
      });
    } catch (error: any) {
      console.error('Errore creazione lavoro:', error);
      toast.error('Errore nella creazione del lavoro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">📋 Nuovo Lavoro Stampa</DialogTitle>
          <DialogDescription>
            Lotto automatico: <span className="font-bold text-purple-600">{nextLotto}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sezione Informazioni Base */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">Informazioni Base</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AutocompleteField
                label="Cliente *"
                value={formData.cliente}
                onChange={(val) => setFormData({ ...formData, cliente: val })}
                suggestions={suggerimenti.clienti}
              />

              <div className="space-y-2">
                <Label>Lavoro *</Label>
                <Input
                  value={formData.lavoro}
                  onChange={(e) => setFormData({ ...formData, lavoro: e.target.value })}
                  placeholder="Descrizione lavoro..."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Identificativo</Label>
                <Input
                  value={formData.identificativo}
                  onChange={(e) => setFormData({ ...formData, identificativo: e.target.value })}
                  placeholder="Opzionale..."
                />
              </div>

              <div className="space-y-2">
                <Label>Ordine Nr</Label>
                <Input
                  value={formData.ordine_nr}
                  onChange={(e) => setFormData({ ...formData, ordine_nr: e.target.value })}
                  placeholder="Numero ordine..."
                />
              </div>

              <div className="space-y-2">
                <Label>Quantità *</Label>
                <Input
                  type="number"
                  value={formData.quantita}
                  onChange={(e) => setFormData({ ...formData, quantita: e.target.value })}
                  placeholder="Pezzi..."
                  required
                  min="1"
                />
              </div>

              <div className="space-y-2">
                <Label>Fogli</Label>
                <Input
                  value={formData.fogli}
                  onChange={(e) => setFormData({ ...formData, fogli: e.target.value })}
                  placeholder="Es: 2.000 fogli"
                />
              </div>

              <div className="space-y-2">
                <Label>Formato</Label>
                <Input
                  value={formData.formato}
                  onChange={(e) => setFormData({ ...formData, formato: e.target.value })}
                  placeholder="Es: 100 x 70 cm"
                />
              </div>
            </div>
          </div>

          {/* Sezione Specifiche Tecniche */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">Specifiche Tecniche</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AutocompleteField
                label="Cartone"
                value={formData.cartone}
                onChange={(val) => setFormData({ ...formData, cartone: val })}
                suggestions={suggerimenti.cartoni}
                placeholder="Es: GC1 400"
              />

              <AutocompleteField
                label="Colori"
                value={formData.colori}
                onChange={(val) => setFormData({ ...formData, colori: val })}
                suggestions={suggerimenti.colori}
                placeholder="Es: 4Q"
              />

              <AutocompleteField
                label="Finitura"
                value={formData.finitura}
                onChange={(val) => setFormData({ ...formData, finitura: val })}
                suggestions={suggerimenti.finiture}
                placeholder="Es: V.ce opaca"
              />

              <AutocompleteField
                label="Polimero"
                value={formData.polimero}
                onChange={(val) => setFormData({ ...formData, polimero: val })}
                suggestions={suggerimenti.polimeri}
                placeholder="Es: Esistente"
              />

              <AutocompleteField
                label="Fustella"
                value={formData.fustella}
                onChange={(val) => setFormData({ ...formData, fustella: val })}
                suggestions={suggerimenti.fustelle}
                placeholder="Es: Esistente"
              />

              <div className="space-y-2">
                <Label>Taglio</Label>
                <select
                  value={formData.taglio}
                  onChange={(e) => setFormData({ ...formData, taglio: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="NO">NO</option>
                  <option value="SI">SI</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Pinza Tagliata</Label>
                <select
                  value={formData.pinza_tg}
                  onChange={(e) => setFormData({ ...formData, pinza_tg: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="NO">NO</option>
                  <option value="SI">SI</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>PVC</Label>
                <select
                  value={formData.pvc}
                  onChange={(e) => setFormData({ ...formData, pvc: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="NO">NO</option>
                  <option value="SI">SI</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>INC</Label>
                <select
                  value={formData.inc}
                  onChange={(e) => setFormData({ ...formData, inc: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="NO">NO</option>
                  <option value="SI">SI</option>
                </select>
              </div>
            </div>
          </div>

          {/* Note */}
          <div className="space-y-2">
            <Label>Note</Label>
            <textarea
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={3}
              placeholder="Note aggiuntive..."
            />
          </div>

          {/* Pulsanti */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Annulla
            </Button>
            <Button
              type="submit"
              className="bg-purple-600 hover:bg-purple-700"
              disabled={loading}
            >
              {loading ? 'Creazione...' : `Crea Lavoro ${nextLotto}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
