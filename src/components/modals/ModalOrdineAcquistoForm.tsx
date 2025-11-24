import React from 'react';
import { useForm, useFieldArray, FormProvider } from 'react-hook-form';
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
import { OrdineAcquisto, Fornitore, ArticoloOrdineAcquisto, Cliente } from '@/types';
import { toast } from 'sonner';
import { PlusCircle, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { OrdineAcquistoArticoloFormRow } from './OrdineAcquistoArticoloFormRow';
import { generateNextCartoneCode, resetCartoneCodeGenerator, fetchMaxCartoneCodeFromDB } from '@/utils/cartoneUtils';
import { fetchMaxOrdineAcquistoNumeroFromDB, generateNextOrdineAcquistoNumero } from '@/utils/ordineAcquistoUtils';
import { fetchMaxFscCommessaFromDB, generateNextFscCommessa, resetFscCommessaGenerator } from '@/utils/fscUtils'; // Importa le nuove utilità FSC

interface ModalOrdineAcquistoFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: OrdineAcquisto) => Promise<void>;
  initialData?: OrdineAcquisto | null;
  fornitori: Fornitore[];
  clienti: Cliente[];
}

const articoloSchema = z.object({
  id: z.string().optional(),
  codice_ctn: z.string().max(255, 'Codice CTN troppo lungo').optional().or(z.literal('')),
  descrizione: z.string().max(255, 'Descrizione troppo lunga').optional().or(z.literal('')),
  tipologia_cartone: z.string().max(255, 'Tipologia troppo lunga').optional().or(z.literal('')),
  formato: z.string().max(50, 'Formato troppo lungo').optional().or(z.literal('')),
  grammatura: z.string().max(50, 'Grammatura troppo lungo').optional().or(z.literal('')),
  numero_fogli: z.preprocess(
    (val) => (val === '' ? null : Number(val)),
    z.number().min(1, 'Il numero di fogli deve essere almeno 1').optional().nullable()
  ),
  quantita: z.preprocess(
    (val) => (val === '' ? null : Number(String(val).replace(',', '.'))),
    z.number().min(0.001, 'La quantità deve essere almeno 0.001').optional().nullable()
  ),
  prezzo_unitario: z.preprocess(
    (val) => (val === '' ? null : Number(String(val).replace(',', '.'))),
    z.number().min(0, 'Il prezzo unitario non può essere negativo')
  ),
  cliente: z.string().max(255, 'Cliente troppo lungo').optional().or(z.literal('')),
  lavoro: z.string().max(255, 'Lavoro troppo lungo').optional().or(z.literal('')),
  data_consegna_prevista: z.string().min(1, 'La data di consegna prevista è obbligatoria per l\'articolo'),
  stato: z.enum(['in_attesa', 'confermato', 'ricevuto', 'annullato', 'inviato'], { required_error: 'Lo stato è obbligatorio' }),
  fsc: z.boolean().optional(), // Nuovo campo
  alimentare: z.boolean().optional(), // Nuovo campo
  rif_commessa_fsc: z.string().max(50, 'Rif. Commessa FSC troppo lungo').optional().or(z.literal('')), // NUOVO CAMPO
});

export function ModalOrdineAcquistoForm({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  fornitori,
  clienti,
}: ModalOrdineAcquistoFormProps) {
  console.log('ModalOrdineAcquistoForm: Rendered with initialData:', initialData);

  const methods = useForm<OrdineAcquisto>({
    resolver: zodResolver(
      z.object({
        fornitore_id: z.string().min(1, 'Il fornitore è obbligatorio'),
        data_ordine: z.string().min(1, 'La data ordine è obbligatoria'),
        numero_ordine: z.string().min(1, 'Il numero ordine è obbligatorio').max(50, 'Numero ordine troppo lungo'),
        stato: z.enum(['in_attesa', 'confermato', 'ricevuto', 'annullato', 'inviato'], { required_error: 'Lo stato è obbligatorio' }),
        articoli: z.array(articoloSchema).min(1, 'Devi aggiungere almeno un articolo'),
        importo_totale: z.number().optional().nullable(),
        note: z.string().max(1000, 'Note troppo lunghe').optional().or(z.literal('')),
      }).superRefine((data, ctx) => {
        const selectedFornitore = fornitori.find(f => f.id === data.fornitore_id);
        const isCartoneFornitore = selectedFornitore?.tipo_fornitore === 'Cartone';

        data.articoli.forEach((articolo, index) => {
          if (isCartoneFornitore) {
            if (!articolo.tipologia_cartone) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'La tipologia cartone è obbligatoria.',
                path: [`articoli`, index, `tipologia_cartone`],
              });
            }
            if (!articolo.formato) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Il formato è obbligatorio.',
                path: [`articoli`, index, `formato`],
              });
            }
            if (!articolo.grammatura) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'La grammatura è obbligatoria.',
                path: [`articoli`, index, `grammatura`],
              });
            }
            if (!articolo.numero_fogli || articolo.numero_fogli < 1) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Il numero di fogli è obbligatorio e deve essere almeno 1.',
                path: [`articoli`, index, `numero_fogli`],
              });
            }
            if (articolo.numero_fogli && articolo.numero_fogli >= 1 && (articolo.quantita === undefined || articolo.quantita <= 0)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'La quantità in kg calcolata deve essere positiva.',
                path: [`articoli`, index, `quantita`],
              });
            }

            if (!articolo.cliente) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Il cliente è obbligatorio.',
                path: [`articoli`, index, `cliente`],
              });
            }
            if (!articolo.lavoro) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Il lavoro è obbligatorio.',
                path: [`articoli`, index, `lavoro`],
              });
            }
            if (articolo.descrizione) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'La descrizione non deve essere usata per i fornitori di cartone.',
                path: [`articoli`, index, `descrizione`],
              });
            }
          } else {
            if (!articolo.descrizione) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'La descrizione è obbligatoria.',
                path: [`articoli`, index, `descrizione`],
              });
            }
            if (!articolo.quantita || articolo.quantita < 0.001) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'La quantità è obbligatoria e deve essere almeno 0.001.',
                path: [`articoli`, index, `quantita`],
              });
            }
            if (articolo.tipologia_cartone || articolo.formato || articolo.grammatura || articolo.cliente || articolo.lavoro || articolo.codice_ctn || articolo.numero_fogli || articolo.fsc || articolo.alimentare || articolo.rif_commessa_fsc) { // Aggiunto rif_commessa_fsc
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Questi campi non devono essere usati per questo tipo di fornitore.',
                path: [`articoli`, index, `tipologia_cartone`],
              });
            }
          }
        });
      })
    ),
    defaultValues: React.useMemo(() => {
      const defaultDateForNewArticle = new Date().toISOString().split('T')[0];
      
      const articlesToUse = initialData?.articoli && initialData.articoli.length > 0 
        ? initialData.articoli.map(art => ({ 
            ...art, 
            codice_ctn: art.codice_ctn || '', 
            data_consegna_prevista: art.data_consegna_prevista || defaultDateForNewArticle, 
            stato: (art.stato || 'in_attesa') as ArticoloOrdineAcquisto['stato'],
            numero_fogli: art.numero_fogli || undefined,
            quantita: art.quantita || undefined,
            fsc: art.fsc || false, // Default a false
            alimentare: art.alimentare || false, // Default a false
            rif_commessa_fsc: art.rif_commessa_fsc || '', // Default a stringa vuota
          }))
        : [{ 
            quantita: undefined,
            numero_fogli: undefined,
            prezzo_unitario: 0, 
            codice_ctn: '', 
            data_consegna_prevista: defaultDateForNewArticle, 
            stato: 'in_attesa' as ArticoloOrdineAcquisto['stato'],
            fsc: false, // Default a false
            alimentare: false, // Default a false
            rif_commessa_fsc: '', // Default a stringa vuota
          }];

      const defaultVal = initialData ? {
        ...initialData,
        articoli: articlesToUse as ArticoloOrdineAcquisto[],
      } : {
        fornitore_id: '',
        data_ordine: new Date().toISOString().split('T')[0],
        numero_ordine: '',
        stato: 'in_attesa' as OrdineAcquisto['stato'],
        articoli: articlesToUse as ArticoloOrdineAcquisto[],
        importo_totale: 0,
        note: '',
      } as OrdineAcquisto;
      console.log('ModalOrdineAcquistoForm: Default values calculated:', defaultVal);
      return defaultVal;
    }, [initialData, fornitori]),
  });

  const { register, handleSubmit, reset, setValue, watch, control, formState: { errors, isSubmitting } } = methods;

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'articoli',
  });

  const watchedArticles = watch('articoli');
  const totalAmount = watchedArticles.reduce((sum, item) => {
    // Escludi gli articoli annullati dal calcolo del totale
    if (item.stato !== 'annullato') {
      const qty = item.quantita || 0;
      const price = item.prezzo_unitario || 0;
      return sum + (qty * price);
    }
    return sum;
  }, 0);

  const [openCombobox, setOpenCombobox] = React.useState(false);
  const watchedFornitoreId = watch('fornitore_id');
  const selectedFornitore = fornitori.find((f) => f.id === watchedFornitoreId);
  const isCartoneFornitore = selectedFornitore?.tipo_fornitore === 'Cartone';

  const [ctnGeneratorInitialized, setCtnGeneratorInitialized] = React.useState(false);
  const [fscCommessaGeneratorInitialized, setFscCommessaGeneratorInitialized] = React.useState(false); // Nuovo stato

  const isCancelled = watch('stato') === 'annullato';
  const isNewOrder = !initialData?.id;

  const resetArticlesAndGenerators = React.useCallback(async (newFornitoreId: string) => {
    console.log('resetArticlesAndGenerators: Triggered with newFornitoreId:', newFornitoreId);
    remove();
    
    const newSelectedFornitore = fornitori.find((f) => f.id === newFornitoreId);
    const newIsCartoneFornitore = newSelectedFornitore?.tipo_fornitore === 'Cartone';

    const newArticle: ArticoloOrdineAcquisto = { 
      quantita: undefined,
      numero_fogli: undefined,
      prezzo_unitario: 0, 
      data_consegna_prevista: new Date().toISOString().split('T')[0],
      stato: 'in_attesa',
      fsc: false, // Default a false
      alimentare: false, // Default a false
      rif_commessa_fsc: '', // Default a stringa vuota
    };
    append(newArticle);

    setCtnGeneratorInitialized(false);
    setFscCommessaGeneratorInitialized(false); // Reset anche il generatore FSC

    if (newIsCartoneFornitore) {
      const maxCode = await fetchMaxCartoneCodeFromDB();
      resetCartoneCodeGenerator(maxCode);
      setValue(`articoli.0.codice_ctn`, generateNextCartoneCode(), { shouldValidate: true });
      setValue(`articoli.0.numero_fogli`, 1, { shouldValidate: true });

      const orderYear = new Date(watch('data_ordine')).getFullYear();
      const maxFscCommessa = await fetchMaxFscCommessaFromDB(String(orderYear).slice(-2));
      resetFscCommessaGenerator(maxFscCommessa, orderYear);
    } else {
      resetCartoneCodeGenerator(0);
      setValue(`articoli.0.quantita`, 1, { shouldValidate: true });
      resetFscCommessaGenerator(0, new Date().getFullYear()); // Reset per anno corrente
    }
    setCtnGeneratorInitialized(true);
    setFscCommessaGeneratorInitialized(true); // Inizializza anche il generatore FSC
    console.log('resetArticlesAndGenerators: Completed.');
  }, [remove, append, setValue, fornitori, watch]);


  React.useEffect(() => {
    console.log('ModalOrdineAcquistoForm: useEffect triggered. isOpen:', isOpen, 'initialData:', initialData);
    if (isOpen) {
      setCtnGeneratorInitialized(false);
      setFscCommessaGeneratorInitialized(false); // Reset anche il generatore FSC
      console.log('ModalOrdineAcquistoForm: Setting ctnGeneratorInitialized and fscCommessaGeneratorInitialized to false.');

      const setupFormAndGenerators = async () => {
        console.log('ModalOrdineAcquistoForm: setupFormAndGenerators started with initialData:', initialData);
        try {
          const defaultDateForNewArticle = new Date().toISOString().split('T')[0];
          
          const articlesToUse = initialData?.articoli && initialData.articoli.length > 0 
            ? initialData.articoli.map(art => ({ 
                ...art, 
                codice_ctn: art.codice_ctn || '', 
                data_consegna_prevista: art.data_consegna_prevista || defaultDateForNewArticle, 
                stato: (art.stato || 'in_attesa') as ArticoloOrdineAcquisto['stato'],
                numero_fogli: art.numero_fogli || undefined,
                quantita: art.quantita || undefined,
                fsc: art.fsc || false, // Default a false
                alimentare: art.alimentare || false, // Default a false
                rif_commessa_fsc: art.rif_commessa_fsc || '', // Default a stringa vuota
              }))
            : [{ 
                quantita: undefined, 
                numero_fogli: undefined, 
                prezzo_unitario: 0, 
                codice_ctn: '', 
                data_consegna_prevista: defaultDateForNewArticle, 
                stato: 'in_attesa' as ArticoloOrdineAcquisto['stato'],
                fsc: false, // Default a false
                alimentare: false, // Default a false
                rif_commessa_fsc: '', // Default a stringa vuota
              }];

          let dataToReset: OrdineAcquisto;

          if (initialData) {
            dataToReset = {
              ...initialData,
              articoli: articlesToUse as ArticoloOrdineAcquisto[],
            };
            console.log('ModalOrdineAcquistoForm: Editing existing or duplicating order. dataToReset:', dataToReset);
          } else {
            const maxOrdineAcquistoNum = await fetchMaxOrdineAcquistoNumeroFromDB();
            const newDefaultNumeroOrdine = generateNextOrdineAcquistoNumero(maxOrdineAcquistoNum);
            console.log(`ModalOrdineAcquistoForm: Generated new order number: ${newDefaultNumeroOrdine} (based on max ${maxOrdineAcquistoNum})`);

            dataToReset = {
              fornitore_id: '',
              data_ordine: new Date().toISOString().split('T')[0],
              numero_ordine: newDefaultNumeroOrdine,
              stato: 'in_attesa' as OrdineAcquisto['stato'],
              articoli: articlesToUse as ArticoloOrdineAcquisto[],
              importo_totale: 0,
              note: '',
            } as OrdineAcquisto;
            console.log('ModalOrdineAcquistoForm: Creating new order from scratch. dataToReset:', dataToReset);
          }
          console.log('ModalOrdineAcquistoForm: Data prepared for reset:', dataToReset);

          // Inizializzazione generatore CTN
          const maxCodeFromDB = await fetchMaxCartoneCodeFromDB();
          console.log('ModalOrdineAcquistoForm: Max CTN code found in DB:', maxCodeFromDB);
          let initialMaxCtn = maxCodeFromDB;
          if (initialData) {
            const maxCodeInCurrentOrder = initialData.articoli?.reduce((max, art) => {
              if (art.codice_ctn) {
                const num = parseInt(art.codice_ctn.replace('CTN-', ''));
                return num > max ? num : max;
              }
              return max;
            }, 0) || 0;
            initialMaxCtn = Math.max(maxCodeFromDB, maxCodeInCurrentOrder);
          }
          resetCartoneCodeGenerator(initialMaxCtn);

          // Inizializzazione generatore FSC Commessa
          const orderYear = new Date(dataToReset.data_ordine).getFullYear();
          const maxFscCommessa = await fetchMaxFscCommessaFromDB(String(orderYear).slice(-2));
          resetFscCommessaGenerator(maxFscCommessa, orderYear);
          
          reset(dataToReset);
          console.log('ModalOrdineAcquistoForm: Form reset with data:', dataToReset);
          console.log('ModalOrdineAcquistoForm: Form values after reset:', methods.getValues());

          if (dataToReset.fornitore_id) setValue('fornitore_id', dataToReset.fornitore_id, { shouldValidate: true });
          if (dataToReset.stato) setValue('stato', dataToReset.stato, { shouldValidate: true });
          setValue('numero_ordine', dataToReset.numero_ordine, { shouldValidate: true });

          const currentSelectedFornitore = fornitori.find((f) => f.id === dataToReset.fornitore_id);
          const currentIsCartoneFornitore = currentSelectedFornitore?.tipo_fornitore === 'Cartone';
          if (currentIsCartoneFornitore && dataToReset.articoli.length > 0) {
            dataToReset.articoli.forEach((article, index) => {
              if (!article.codice_ctn) {
                setValue(`articoli.${index}.codice_ctn`, generateNextCartoneCode(), { shouldValidate: true });
              }
              if (article.numero_fogli === undefined) {
                setValue(`articoli.${index}.numero_fogli`, 1, { shouldValidate: true });
              }
              // Genera rif_commessa_fsc se FSC è true e non è già presente
              if (article.fsc && !article.rif_commessa_fsc) {
                setValue(`articoli.${index}.rif_commessa_fsc`, generateNextFscCommessa(orderYear), { shouldValidate: true });
              }
            });
          } else if (!currentIsCartoneFornitore && dataToReset.articoli.length > 0) {
            dataToReset.articoli.forEach((article, index) => {
              if (article.quantita === undefined) {
                setValue(`articoli.${index}.quantita`, 1, { shouldValidate: true });
              }
            });
          }

          setCtnGeneratorInitialized(true);
          setFscCommessaGeneratorInitialized(true); // Inizializza anche il generatore FSC
          console.log('ModalOrdineAcquistoForm: ctnGeneratorInitialized and fscCommessaGeneratorInitialized set to true.');
        } catch (error) {
          console.error('ModalOrdineAcquistoForm: Error during setupFormAndGenerators:', error);
          toast.error('Errore durante l\'inizializzazione del modulo. Riprova.');
          onClose();
        }
      };
      setupFormAndGenerators();
    }
  }, [isOpen, initialData, reset, setValue, fornitori, resetArticlesAndGenerators, methods]); // Aggiunto 'methods' alle dipendenze

  // Questo useEffect è stato modificato per non generare un nuovo codice CTN se già presente.
  // La generazione del codice per il primo articolo è gestita in `setupFormAndGenerators`
  // e in `resetArticlesAndGenerators`. Per gli articoli aggiunti, è gestita in `handleAddArticle`.
  React.useEffect(() => {
    if (isCartoneFornitore && ctnGeneratorInitialized && fscCommessaGeneratorInitialized) { // Aggiunto fscCommessaGeneratorInitialized
      fields.forEach((field, index) => {
        // Rimosso: if (!field.codice_ctn) { setValue(`articoli.${index}.codice_ctn`, generateNextCartoneCode()); }
        // Questa logica è ora gestita da `setupFormAndGenerators` per il primo elemento
        // e da `handleAddArticle` per gli elementi successivi.
        if (field.numero_fogli === undefined) {
          setValue(`articoli.${index}.numero_fogli`, 1, { shouldValidate: true });
        }
        // Genera rif_commessa_fsc se FSC è true e non è già presente
        if (field.fsc && !field.rif_commessa_fsc) {
          const orderYear = new Date(watch('data_ordine')).getFullYear();
          setValue(`articoli.${index}.rif_commessa_fsc`, generateNextFscCommessa(orderYear), { shouldValidate: true });
        } else if (!field.fsc && field.rif_commessa_fsc) {
          // Se FSC non è flaggato, rimuovi il rif_commessa_fsc
          setValue(`articoli.${index}.rif_commessa_fsc`, '', { shouldValidate: true });
        }
      });
    } else if (!isCartoneFornitore) {
      fields.forEach((field, index) => {
        if (field.codice_ctn) {
          setValue(`articoli.${index}.codice_ctn`, '');
        }
        if (field.numero_fogli !== undefined) {
          setValue(`articoli.${index}.numero_fogli`, undefined, { shouldValidate: true });
        }
        if (field.quantita === undefined) {
          setValue(`articoli.${index}.quantita`, 1, { shouldValidate: true });
        }
        // Reset fsc, alimentare and rif_commessa_fsc if not cartone
        setValue(`articoli.${index}.fsc`, false, { shouldValidate: true });
        setValue(`articoli.${index}.alimentare`, false, { shouldValidate: true });
        setValue(`articoli.${index}.rif_commessa_fsc`, '', { shouldValidate: true });
      });
    }
  }, [isCartoneFornitore, fields, setValue, ctnGeneratorInitialized, fscCommessaGeneratorInitialized, watch]); // Aggiunto fscCommessaGeneratorInitialized e watch

  React.useEffect(() => {
    setValue('importo_totale', parseFloat(totalAmount.toFixed(3)));
  }, [totalAmount, setValue]);

  const handleFormSubmit = async (data: any) => {
    try {
      await onSubmit(data as OrdineAcquisto);
      onClose();
    } catch (error) {
      console.error("Errore durante il salvataggio dell'ordine d'acquisto:", error);
      toast.error("Errore durante il salvataggio dell'ordine d'acquisto.");
    }
  };

  const handleAddArticle = () => {
    if (!ctnGeneratorInitialized || !fscCommessaGeneratorInitialized) { // Aggiunto fscCommessaGeneratorInitialized
      toast.error("Generatore codici non pronto. Riprova.");
      return;
    }
    
    const firstArticleDate = watchedArticles[0]?.data_consegna_prevista || new Date().toISOString().split('T')[0];
    const orderYear = new Date(watch('data_ordine')).getFullYear();

    let newArticle: ArticoloOrdineAcquisto = { 
      quantita: undefined, 
      numero_fogli: undefined,
      prezzo_unitario: 0, 
      data_consegna_prevista: firstArticleDate,
      stato: 'in_attesa' as ArticoloOrdineAcquisto['stato'],
      fsc: false, // Default a false
      alimentare: false, // Default a false
      rif_commessa_fsc: '', // Default a stringa vuota
    };
    if (isCartoneFornitore) {
      newArticle = { ...newArticle, codice_ctn: generateNextCartoneCode(), numero_fogli: 1 };
      // Se il primo articolo ha FSC, il nuovo articolo lo eredita e genera il rif_commessa
      if (watchedArticles[0]?.fsc) {
        newArticle.fsc = true;
        newArticle.rif_commessa_fsc = generateNextFscCommessa(orderYear);
      }
    } else {
      newArticle = { ...newArticle, quantita: 1 };
    }
    append(newArticle);
  };

  const title = initialData?.id ? `Modifica Ordine d'Acquisto` : `Nuovo Ordine d'Acquisto`;
  const description = initialData?.id ? `Modifica i dettagli per l'ordine ${initialData.numero_ordine}.` : `Inserisci i dettagli per il nuovo ordine d'acquisto.`
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        key={initialData?.id || 'new-order'}
        className="sm:max-w-[900px] lg:max-w-[1100px] max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">{title}</DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            {description}
            {isCancelled && (
              <p className="text-destructive font-semibold mt-2">
                Questo ordine è stato annullato e non può essere modificato.
              </p>
            )}
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(handleFormSubmit)} className="grid gap-4 py-4">
            {/* Dettagli Ordine Section */}
            <h4 className="text-lg font-semibold flex items-center gap-2 mb-2">
              <i className="fas fa-info-circle"></i> Dettagli Ordine
            </h4>
            <div className="p-4 bg-gray-50 rounded-lg border grid grid-cols-1 gap-4">
              {/* Row for Data Ordine and Numero Ordine */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="data_ordine" className="col-span-1"> {/* Removed text-right */}
                    Data Ordine *
                  </Label>
                  <div className="col-span-3">
                    <Input id="data_ordine" type="date" {...register('data_ordine')} className="col-span-3" disabled={isSubmitting || isCancelled} />
                    {errors.data_ordine && <p className="text-destructive text-xs mt-1">{errors.data_ordine.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="numero_ordine" className="col-span-1"> {/* Removed text-right */}
                    Numero Ordine *
                  </Label>
                  <div className="col-span-3">
                    <Input 
                      id="numero_ordine" 
                      {...register('numero_ordine')} 
                      className="col-span-3" 
                      disabled={true}
                      placeholder="Generato automaticamente"
                    />
                    {errors.numero_ordine && <p className="text-destructive text-xs mt-1">{errors.numero_ordine.message}</p>}
                  </div>
                </div>
              </div>

              {/* Row for Fornitore */}
              <div className="flex flex-col gap-2 md:col-span-2"> {/* Changed to flex-col for stacking, gap-2 for spacing */}
                <Label htmlFor="fornitore_id" className="text-left"> {/* Ensure label is left-aligned */}
                  Fornitore *
                </Label>
                <div> {/* This div contains the Popover and badges */}
                  <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openCombobox}
                        className={cn(
                          "w-full justify-between",
                          !watchedFornitoreId && "text-muted-foreground"
                        )}
                        disabled={isSubmitting || isCancelled}
                      >
                        {watchedFornitoreId
                          ? fornitori.find((fornitore) => fornitore.id === watchedFornitoreId)?.nome
                          : "Seleziona fornitore..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <Command>
                        <CommandInput placeholder="Cerca fornitore..." />
                        <CommandList>
                          <CommandEmpty>Nessun fornitore trovato.</CommandEmpty>
                          <CommandGroup>
                            {fornitori.map((fornitore) => (
                              <CommandItem
                                key={fornitore.id}
                                value={fornitore.nome}
                                onSelect={(currentValue) => {
                                  const newFornitoreId = fornitori.find(f => f.nome === currentValue)?.id || '';
                                  setValue('fornitore_id', newFornitoreId, { shouldValidate: true });
                                  setOpenCombobox(false);
                                  resetArticlesAndGenerators(newFornitoreId);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    watchedFornitoreId === fornitore.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {fornitore.nome}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {errors.fornitore_id && <p className="text-destructive text-xs mt-1">{errors.fornitore_id.message}</p>}
                  {selectedFornitore && (
                    <Badge 
                      className={cn(
                        "mt-2",
                        selectedFornitore.tipo_fornitore === 'Cartone' ? "bg-green-500 hover:bg-green-600" : "bg-gray-500 hover:bg-gray-600"
                      )}
                    >
                      Tipo: {selectedFornitore.tipo_fornitore || 'Non Specificato'}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            {/* Articoli dell'Ordine Section */}
            <h4 className="text-lg font-semibold flex items-center gap-2 mb-2">
              <i className="fas fa-boxes"></i> Articoli dell'Ordine *
            </h4>
            {errors.articoli && <p className="text-destructive text-xs mt-1">{errors.articoli.message}</p>}
            <div className="grid grid-cols-1 gap-3 p-4 bg-gray-50 rounded-lg border">
              {fields.map((field, index) => (
                <OrdineAcquistoArticoloFormRow
                  key={field.id}
                  index={index}
                  isSubmitting={isSubmitting}
                  isCartoneFornitore={isCartoneFornitore}
                  remove={remove}
                  fieldsLength={fields.length}
                  clienti={clienti}
                  isOrderCancelled={isCancelled}
                  isNewOrder={isNewOrder}
                />
              ))}
            </div>
            <Button
              type="button"
              variant="success"
              onClick={handleAddArticle}
              disabled={isSubmitting || !ctnGeneratorInitialized || !fscCommessaGeneratorInitialized || isCancelled} // Aggiunto fscCommessaGeneratorInitialized
              className="w-full sm:w-auto self-start gap-2"
            >
              <PlusCircle className="h-4 w-4" /> Aggiungi Articolo
            </Button>

            <Separator className="my-6" />

            {/* Riepilogo Ordine Section */}
            <h4 className="text-lg font-semibold flex items-center gap-2 mb-2">
              <i className="fas fa-calculator"></i> Riepilogo Ordine
            </h4>
            <div className="p-3 bg-gray-50 rounded-lg border grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="importo_totale" className="text-xs">
                  Importo Totale Ordine
                </Label>
                <Input
                  id="importo_totale"
                  value={totalAmount.toFixed(2)}
                  readOnly
                  disabled={true}
                  className="text-sm font-bold"
                />
              </div>
              <div>
                <Label htmlFor="note" className="text-xs">
                  Note
                </Label>
                <Textarea id="note" {...register('note')} disabled={isSubmitting || isCancelled} rows={3} className="text-sm" />
                {errors.note && <p className="text-destructive text-xs mt-1">{errors.note.message}</p>}
              </div>
            </div>

            <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting} className="w-full sm:w-auto text-sm">
                Annulla
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || isCancelled} 
                className="w-full sm:w-auto text-sm bg-[hsl(var(--summary-header-color))] hover:bg-[hsl(30,100%,40%)] text-white"
              >
                {isSubmitting ? 'Salvataggio...' : 'Salva Ordine'}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}