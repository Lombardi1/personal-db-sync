import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AnagraficaBase, Fornitore, Cliente, AziendaInfo } from '@/types'; // Importa Cliente e AziendaInfo
import * as notifications from '@/utils/notifications';
import { normalizeAnagraficaData } from '@/lib/utils';
import {
  fetchMaxClientCodeFromDB,
  generateNextClientCode,
  resetClientCodeGenerator,
  fetchMaxFornitoreCodeFromDB,
  generateNextFornitoreCode,
  resetFornitoreCodeGenerator,
} from '@/utils/anagraficaUtils'; // Importa le nuove utilità
import { useAziendaInfo } from '@/hooks/useAziendaInfo'; // Importa il hook per le info azienda

interface ModalAnagraficaFormProps {
  type: 'cliente' | 'fornitore';
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AnagraficaBase | Fornitore | Cliente) => Promise<void>; // Aggiornato tipo
  initialData?: AnagraficaBase | Fornitore | Cliente | null; // Aggiornato tipo
}

type FormData = AnagraficaBase & { tipo_fornitore?: string; considera_iva?: boolean; banca?: string }; // Aggiornato FormData type

const anagraficaSchema = z.object({
  codice_anagrafica: z.string().max(20, 'Codice troppo lungo').optional().or(z.literal('')),
  nome: z.string().min(1, 'Il nome è obbligatorio').max(255, 'Nome troppo lungo'),
  indirizzo: z.string().max(255, 'Indirizzo troppo lungo').optional().or(z.literal('')),
  citta: z.string().max(100, 'Città troppo lunga').optional().or(z.literal('')),
  cap: z.string().max(10, 'CAP troppo lungo').optional().or(z.literal('')),
  provincia: z.string().max(50, 'Provincia troppo lunga').optional().or(z.literal('')),
  partita_iva: z.string().max(20, 'Partita IVA troppo lunga').optional().or(z.literal('')),
  codice_fiscale: z.string().max(20, 'Codice Fiscale troppo lungo').optional().or(z.literal('')),
  telefono: z.string().max(50, 'Telefono troppo lungo').optional().or(z.literal('')),
  email: z.string().email('Email non valida').max(255, 'Email troppo lunga').optional().or(z.literal('')),
  pec: z.string().email('PEC non valida').max(255, 'PEC troppo lunga').optional().or(z.literal('')),
  sdi: z.string().max(20, 'Codice SDI troppo lungo').optional().or(z.literal('')),
  note: z.string().max(1000, 'Note troppo lunghe').optional().or(z.literal('')),
  condizione_pagamento: z.string().max(255, 'Condizione di pagamento troppo lunga').optional().or(z.literal('')),
  tipo_fornitore: z.string().optional().or(z.literal('')),
  considera_iva: z.boolean().optional(),
  banca: z.string().max(255, 'Banca troppo lunga').optional().or(z.literal('')), // Nuovo campo banca
});

export function ModalAnagraficaForm({
  type,
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: ModalAnagraficaFormProps) {
  console.log('[ModalAnagraficaForm] Component rendered. initialData:', initialData); // LOG AGGIUNTO
  const { aziendaInfo } = useAziendaInfo(); // Recupera le info azienda
  const bancheDisponibili = React.useMemo(() => {
    console.log('[ModalAnagraficaForm] Computing bancheDisponibili. aziendaInfo.banche:', aziendaInfo?.banche, 'initialData.banca:', initialData?.banca); // LOG AGGIUNTO
    let banks = new Set<string>();
    if (aziendaInfo?.banche) {
      aziendaInfo.banche.split(/[\n,;]+/).map(b => b.trim()).filter(b => b.length > 0).forEach(b => banks.add(b));
    }
    // Add the current supplier's bank if it's not already in the list
    if (initialData?.banca && initialData.banca.trim() !== '' && !banks.has(initialData.banca.trim())) {
      banks.add(initialData.banca.trim());
    }
    const sortedBanks = Array.from(banks).sort();
    console.log('[ModalAnagraficaForm] bancheDisponibili:', sortedBanks); // LOG AGGIUNTO
    return sortedBanks;
  }, [aziendaInfo?.banche, initialData?.banca]);

  const normalizedInitialData = React.useMemo(() => {
    const normalized = normalizeAnagraficaData(initialData);
    console.log('[ModalAnagraficaForm] normalizedInitialData:', normalized); // LOG AGGIUNTO
    return normalized;
  }, [initialData]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    getValues, // Aggiunto getValues qui
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(anagraficaSchema),
    defaultValues: normalizedInitialData as FormData,
  });

  const watchedTipoFornitore = watch('tipo_fornitore' as any);
  const watchedConsideraIva = watch('considera_iva' as any);
  const watchedBanca = watch('banca' as any); // Watch per il campo banca
  console.log('[ModalAnagraficaForm] Render - watchedBanca:', watchedBanca); // LOG AGGIUNTO

  React.useEffect(() => {
    if (isOpen) {
      const initializeForm = async () => {
        let defaultValues = normalizedInitialData as FormData;
        if (!initialData) { // Se è un nuovo elemento, genera il codice
          if (type === 'cliente') {
            const maxCode = await fetchMaxClientCodeFromDB();
            resetClientCodeGenerator(maxCode);
            defaultValues = { ...defaultValues, codice_anagrafica: generateNextClientCode(), considera_iva: false };
          } else if (type === 'fornitore') {
            const maxCode = await fetchMaxFornitoreCodeFromDB();
            resetFornitoreCodeGenerator(maxCode);
            defaultValues = { ...defaultValues, codice_anagrafica: generateNextFornitoreCode(), considera_iva: false, banca: '' }; // Default banca vuota
          }
        }
        reset(defaultValues);
        if (type === 'fornitore' && 'tipo_fornitore' in defaultValues) {
          setValue('tipo_fornitore' as any, defaultValues.tipo_fornitore);
        } else if (type === 'fornitore') {
          setValue('tipo_fornitore' as any, '');
        }
        // Imposta il valore di considera_iva per entrambi i tipi
        if ('considera_iva' in defaultValues) {
          setValue('considera_iva' as any, defaultValues.considera_iva);
        } else {
          setValue('considera_iva' as any, false);
        }
        // Imposta il valore di banca per i fornitori
        if (type === 'fornitore' && 'banca' in defaultValues) {
          setValue('banca' as any, defaultValues.banca || '');
        } else if (type === 'fornitore') {
          setValue('banca' as any, '');
        }
        console.log('[ModalAnagraficaForm] After reset, form values:', getValues()); // Corretto: usa getValues()
        console.log('[ModalAnagraficaForm] After reset, watchedBanca:', watchedBanca); // LOG AGGIUNTO
      };
      initializeForm();
    }
  }, [isOpen, initialData, normalizedInitialData, reset, setValue, type, getValues]); // Aggiunto getValues alle dipendenze

  const handleFormSubmit = async (data: FormData) => {
    try {
      let dataToSubmit: any = { ...data };

      // Rimuovi tipo_fornitore e banca se è un cliente
      if (type === 'cliente') {
        const { tipo_fornitore, banca, ...rest } = dataToSubmit as any;
        dataToSubmit = rest;
      }
      // Imposta a null se la banca è una stringa vuota per i fornitori
      else if (type === 'fornitore' && dataToSubmit.banca === '') {
        dataToSubmit.banca = null; 
      }

      console.log(`[ModalAnagraficaForm] Dati inviati a onSubmit per ${type}:`, dataToSubmit); // LOG DI DEBUG
      console.log(`[ModalAnagraficaForm] Valore di 'considera_iva' prima di onSubmit:`, dataToSubmit.considera_iva); // LOG DI DEBUG
      console.log(`[ModalAnagraficaForm] Valore di 'banca' prima di onSubmit:`, dataToSubmit.banca); // LOG DI DEBUG

      if (!initialData) {
        const { id, created_at, ...dataWithoutIdAndCreatedAt } = dataToSubmit;
        await onSubmit(dataWithoutIdAndCreatedAt);
      } else {
        const { codice_anagrafica, ...updateData } = dataToSubmit;
        await onSubmit(updateData);
      }
      onClose();
    } catch (error) {
      console.error("Errore durante il salvataggio dell'anagrafica:", error);
      notifications.showError("Errore durante il salvataggio dell'anagrafica.");
    }
  };

  const title = initialData ? `Modifica ${type === 'cliente' ? 'Cliente' : 'Fornitore'}` : `Nuovo ${type === 'cliente' ? 'Cliente' : 'Fornitore'}`;
  const description = initialData ? `Modifica i dettagli per ${initialData.nome}.` : `Inserisci i dettagli per il nuovo ${type === 'cliente' ? 'cliente' : 'fornitore'}.`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">{title}</DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            {description}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="codice_anagrafica" className="text-right col-span-1">
              Codice
            </Label>
            <div className="col-span-3">
              <Input id="codice_anagrafica" {...register('codice_anagrafica')} className="col-span-3 font-mono font-bold bg-gray-100" readOnly disabled />
              {errors.codice_anagrafica && <p className="text-destructive text-xs mt-1">{errors.codice_anagrafica.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="nome" className="text-right col-span-1">
              Nome *
            </Label>
            <div className="col-span-3">
              <Input id="nome" {...register('nome')} className="col-span-3" />
              {errors.nome && <p className="text-destructive text-xs mt-1">{errors.nome.message}</p>}
            </div>
          </div>
          {type === 'fornitore' && (
            <>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="tipo_fornitore" className="text-right col-span-1">
                  Tipo Fornitore
                </Label>
                <div className="col-span-3">
                  <Select
                    onValueChange={(value) => setValue('tipo_fornitore', value, { shouldValidate: true })}
                    value={watchedTipoFornitore || ''}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleziona tipo fornitore" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cartone">Cartone</SelectItem>
                      <SelectItem value="Inchiostro">Inchiostro</SelectItem>
                      <SelectItem value="Colla">Colla</SelectItem>
                      <SelectItem value="Altro">Altro</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.tipo_fornitore && <p className="text-destructive text-xs mt-1">{errors.tipo_fornitore.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="banca" className="text-right col-span-1">
                  Banca
                </Label>
                <div className="col-span-3">
                  <Select
                    onValueChange={(value) => setValue('banca', value === '__NONE__' ? '' : value, { shouldValidate: true })}
                    value={watchedBanca || '__NONE__'}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleziona banca" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__NONE__">Nessuna</SelectItem> {/* Modificato: value="__NONE__" */}
                      {bancheDisponibili.map((bancaOption, index) => (
                        <SelectItem key={index} value={bancaOption}>
                          {bancaOption}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.banca && <p className="text-destructive text-xs mt-1">{errors.banca.message}</p>}
                </div>
              </div>
            </>
          )}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="indirizzo" className="text-right col-span-1">
              Indirizzo
            </Label>
            <div className="col-span-3">
              <Input id="indirizzo" {...register('indirizzo')} className="col-span-3" />
              {errors.indirizzo && <p className="text-destructive text-xs mt-1">{errors.indirizzo.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="citta" className="text-right col-span-1">
              Città
            </Label>
            <div className="col-span-3">
              <Input id="citta" {...register('citta')} className="col-span-3" />
              {errors.citta && <p className="text-destructive text-xs mt-1">{errors.citta.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="cap" className="text-right col-span-1">
              CAP
            </Label>
            <div className="col-span-3">
              <Input id="cap" {...register('cap')} className="col-span-3" />
              {errors.cap && <p className="text-destructive text-xs mt-1">{errors.cap.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="provincia" className="text-right col-span-1">
              Provincia
            </Label>
            <div className="col-span-3">
              <Input id="provincia" {...register('provincia')} className="col-span-3" />
              {errors.provincia && <p className="text-destructive text-xs mt-1">{errors.provincia.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="partita_iva" className="text-right col-span-1">
              P.IVA
            </Label>
            <div className="col-span-3">
              <Input id="partita_iva" {...register('partita_iva')} className="col-span-3" />
              {errors.partita_iva && <p className="text-destructive text-xs mt-1">{errors.partita_iva.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="codice_fiscale" className="text-right col-span-1">
              Cod. Fiscale
            </Label>
            <div className="col-span-3">
              <Input id="codice_fiscale" {...register('codice_fiscale')} className="col-span-3" />
              {errors.codice_fiscale && <p className="text-destructive text-xs mt-1">{errors.codice_fiscale.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="telefono" className="text-right col-span-1">
              Telefono
            </Label>
            <div className="col-span-3">
              <Input id="telefono" {...register('telefono')} className="col-span-3" />
              {errors.telefono && <p className="text-destructive text-xs mt-1">{errors.telefono.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right col-span-1">
              Email
            </Label>
            <div className="col-span-3">
              <Input id="email" type="email" {...register('email')} className="col-span-3" />
              {errors.email && <p className="text-destructive text-xs mt-1">{errors.email.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="pec" className="text-right col-span-1">
              PEC
            </Label>
            <div className="col-span-3">
              <Input id="pec" type="email" {...register('pec')} className="col-span-3" />
              {errors.pec && <p className="text-destructive text-xs mt-1">{errors.pec.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="sdi" className="text-right col-span-1">
              Codice SDI
            </Label>
            <div className="col-span-3">
              <Input id="sdi" {...register('sdi')} className="col-span-3" />
              {errors.sdi && <p className className="text-destructive text-xs mt-1">{errors.sdi.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="condizione_pagamento" className="text-right col-span-1">
              Cond. Pagamento
            </Label>
            <div className="col-span-3">
              <Input id="condizione_pagamento" {...register('condizione_pagamento')} className="col-span-3" />
              {errors.condizione_pagamento && <p className="text-destructive text-xs mt-1">{errors.condizione_pagamento.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="note" className="text-right col-span-1">
              Note
            </Label>
            <div className="col-span-3">
              <Textarea id="note" {...register('note')} className="col-span-3" />
              {errors.note && <p className="text-destructive text-xs mt-1">{errors.note.message}</p>}
            </div>
          </div>
          {/* Checkbox Considera IVA, ora visibile per entrambi i tipi */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="considera_iva" className="text-right col-span-1">
              Considera IVA
            </Label>
            <div className="col-span-3 flex items-center">
              <input
                type="checkbox"
                id="considera_iva"
                {...register('considera_iva')}
                checked={watchedConsideraIva}
                onChange={(e) => setValue('considera_iva', e.target.checked, { shouldValidate: true })}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <label htmlFor="considera_iva" className="ml-2 text-sm text-gray-700">
                Applica IVA al totale
              </label>
              {errors.considera_iva && <p className="text-destructive text-xs mt-1">{errors.considera_iva.message}</p>}
            </div>
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting} className="w-full sm:w-auto text-sm">
              Annulla
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting} 
              className={`w-full sm:w-auto text-sm ${
                type === 'fornitore' 
                  ? 'bg-[hsl(var(--secondary))] text-white hover:bg-[hsl(199,89%,38%)]' 
                  : 'bg-[hsl(var(--primary))] text-white hover:bg-[hsl(var(--primary-dark))]'
              }`}
            >
              {isSubmitting ? 'Salvataggio...' : 'Salva Anagrafica'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}