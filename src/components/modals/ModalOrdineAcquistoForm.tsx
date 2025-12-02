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
import { fetchMaxFscCommessaFromDB, generateNextFscCommessa, resetFscCommessaGenerator } from '@/utils/fscUtils';
import { findNextAvailableFustellaCode } from '@/utils/fustellaUtils'; // Importa la nuova funzione
import { generateNextPulitoreCode, resetPulitoreCodeGenerator, fetchMaxPulitoreCodeFromDB } from '@/utils/pulitoreUtils'; // Importa utilità Pulitore

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
  // Campi per Cartone
  codice_ctn: z.string().max(255, 'Codice CTN troppo lungo').optional().or(z.literal('')),
  tipologia_cartone: z.string().max(255, 'Tipologia troppo lunga').optional().or(z.literal('')),
  formato: z.string().max(50, 'Formato troppo lungo').optional().or(z.literal('')),
  grammatura: z.string().max(50, 'Grammatura troppo lungo').optional().or(z.literal('')),
  numero_fogli: z.preprocess(
    (val) => {
      if (val === '' || val === null || val === undefined) return null;
      const num = Number(val);
      return isNaN(num) ? null : num;
    },
    z.number().min(1, 'Il numero di fogli deve essere almeno 1').optional().nullable()
  ),
  cliente: z.string().max(255, 'Cliente troppo lungo').optional().or(z.literal('')),
  lavoro: z.string().max(255, 'Lavoro troppo lungo').optional().or(z.literal('')),
  fsc: z.boolean().optional(),
  alimentare: z.boolean().optional(),
  rif_commessa_fsc: z.string().max(50, 'Rif. Commessa FSC troppo lungo').optional().or(z.literal('')),

  // Campi per non-Cartone/non-Fustelle
  descrizione: z.string().max(255, 'Descrizione troppo lunga').optional().or(z.literal('')),
  
  // Campi per Fustelle
  fustella_codice: z.string().max(255, 'Codice Fustella troppo lungo').optional().or(z.literal('')),
  codice_fornitore_fustella: z.string().max(255, 'Codice Fornitore Fustella troppo lungo').optional().or(z.literal('')),
  fustellatrice: z.string().max(255, 'Fustellatrice troppo lunga').optional().or(z.literal('')),
  resa_fustella: z.string().max(50, 'Resa Fustella troppo lunga').optional().or(z.literal('')),
  hasPulitore: z.boolean().optional(),
  pulitore_codice_fustella: z.string().max(255, 'Codice Pulitore troppo lungo').optional().or(z.literal('')),
  prezzo_pulitore: z.preprocess( // Nuovo campo
    (val) => (val === '' ? null : Number(String(val).replace(',', '.'))),
    z.number().min(0, 'Il prezzo pulitore non può essere negativo').optional().nullable()
  ),
  pinza_tagliata: z.boolean().optional(),
  tasselli_intercambiabili: z.boolean().optional(),
  nr_tasselli: z.preprocess(
    (val) => (val === '' ? null : Number(val)),
    z.number().min(0, 'Il numero di tasselli non può essere negativo').optional().nullable()
  ),
  incollatura: z.boolean().optional(),
  incollatrice: z.string().max(255, 'Incollatrice troppo lunga').optional().or(z.literal('')),
  tipo_incollatura: z.string().max(255, 'Tipo Incollatura troppo lungo').optional().or(z.literal('')),

  // Campi comuni
  quantita: z.preprocess(
    (val) => {
      if (val === '' || val === null || val === undefined) return null;
      const num = Number(String(val).replace(',', '.'));
      return isNaN(num) ? null : num;
    },
    z.number().min(0.001, 'La quantità deve essere almeno 0.001').optional().nullable()
  ),
  prezzo_unitario: z.preprocess(
    (val) => (val === '' ? null : Number(String(val).replace(',', '.'))),
    z.number().min(0, 'Il prezzo unitario non può essere negativo')
  ),
  data_consegna_prevista: z.string().min(1, 'La data di consegna prevista è obbligatoria per l\'articolo'),
  stato: z.enum(['in_attesa', 'confermato', 'ricevuto', 'annullato', 'inviato'], { required_error: 'Lo stato è obbligatorio' }),
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
        console.log(`[superRefine] Validating order: ${data.numero_ordine}`);
        const selectedFornitore = fornitori.find(f => f.id === data.fornitore_id);
        const isCartoneFornitore = selectedFornitore?.tipo_fornitore === 'Cartone';
        const isFustelleFornitore = selectedFornitore?.tipo_fornitore === 'Fustelle';

        data.articoli.forEach((articolo, index) => {
          console.log(`[superRefine] Article ${index}:`, articolo);
          if (isCartoneFornitore) {
            if (!articolo.tipologia_cartone) {
              console.log(`[superRefine] Adding issue: tipologia_cartone missing for article ${index}`);
              ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'La tipologia cartone è obbligatoria.', path: [`articoli`, index, `tipologia_cartone`] });
            }
            if (!articolo.formato) {
              console.log(`[superRefine] Adding issue: formato missing for article ${index}`);
              ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Il formato è obbligatorio.', path: [`articoli`, index, `formato`] });
            }
            if (!articolo.grammatura) {
              console.log(`[superRefine] Adding issue: grammatura missing for article ${index}`);
              ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'La grammatura è obbligatoria.', path: [`articoli`, index, `grammatura`] });
            }
            if (!articolo.numero_fogli || articolo.numero_fogli < 1) {
              console.log(`[superRefine] Adding issue: numero_fogli missing or invalid for article ${index}`);
              ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Il numero di fogli è obbligatorio e deve essere almeno 1.', path: [`articoli`, index, `numero_fogli`] });
            }
            if (articolo.numero_fogli && articolo.numero_fogli >= 1 && (articolo.quantita === undefined || articolo.quantita <= 0)) {
              console.log(`[superRefine] Adding issue: quantita (kg) invalid for article ${index}`);
              ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'La quantità in kg calcolata deve essere positiva.', path: [`articoli`, index, `quantita`] });
            }
            if (!articolo.cliente) {
              console.log(`[superRefine] Adding issue: cliente missing for article ${index}`);
              ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Il cliente è obbligatorio.', path: [`articoli`, index, `cliente`] });
            }
            if (!articolo.lavoro) {
              console.log(`[superRefine] Adding issue: lavoro missing for article ${index}`);
              ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Il lavoro è obbligatorio.', path: [`articoli`, index, `lavoro`] });
            }
            // Campi non consentiti per Cartone
            if (articolo.descrizione || articolo.fustella_codice || articolo.codice_fornitore_fustella || articolo.fustellatrice || articolo.resa_fustella || articolo.hasPulitore || articolo.pulitore_codice_fustella || articolo.prezzo_pulitore || articolo.pinza_tagliata || articolo.tasselli_intercambiabili || articolo.nr_tasselli || articolo.incollatura || articolo.incollatrice || articolo.tipo_incollatura) {
              console.log(`[superRefine] Adding issue: non-cartone fields present for article ${index}`);
              ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Questi campi non devono essere usati per i fornitori di cartone.', path: [`articoli`, index, `descrizione`] });
            }
          } else if (isFustelleFornitore) {
            // Case 1: It's a Fustella article (has fustella_codice)
            if (articolo.fustella_codice) { 
              if (!articolo.codice_fornitore_fustella) {
                console.log(`[superRefine] Adding issue: codice_fornitore_fustella missing for article ${index}`);
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Il codice fornitore fustella è obbligatorio.', path: [`articoli`, index, `codice_fornitore_fustella`] });
              }
              if (!articolo.fustellatrice) {
                console.log(`[superRefine] Adding issue: fustellatrice missing for article ${index}`);
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'La fustellatrice è obbligatoria.', path: [`articoli`, index, `fustellatrice`] });
              }
              if (!articolo.resa_fustella) {
                console.log(`[superRefine] Adding issue: resa_fustella missing for article ${index}`);
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'La resa fustella è obbligatoria.', path: [`articoli`, index, `resa_fustella`] });
              }
              if (!articolo.quantita || articolo.quantita < 0.001) {
                console.log(`[superRefine] Adding issue: quantita missing or invalid for article ${index}`);
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'La quantità è obbligatoria e deve essere almeno 0.001.', path: [`articoli`, index, `quantita`] });
              }
              if (!articolo.cliente) {
                console.log(`[superRefine] Adding issue: cliente missing for article ${index}`);
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Il cliente è obbligatorio.', path: [`articoli`, index, `cliente`] });
              }
              if (!articolo.lavoro) {
                console.log(`[superRefine] Adding issue: lavoro missing for article ${index}`);
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Il lavoro è obbligatorio.', path: [`articoli`, index, `lavoro`] });
              }
              if (articolo.hasPulitore && (!articolo.pulitore_codice_fustella || articolo.prezzo_pulitore === undefined || articolo.prezzo_pulitore === null)) {
                console.log(`[superRefine] Adding issue: pulitore_codice_fustella or prezzo_pulitore missing when hasPulitore is true for article ${index}`);
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Il codice e il prezzo del pulitore sono obbligatori se il pulitore è presente.', path: [`articoli`, index, `pulitore_codice_fustella`] });
              }
              if (articolo.tasselli_intercambiabili && (articolo.nr_tasselli === undefined || articolo.nr_tasselli === null || articolo.nr_tasselli < 0)) {
                console.log(`[superRefine] Adding issue: nr_tasselli missing or invalid when tasselli_intercambiabili is true for article ${index}`);
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Il numero di tasselli è obbligatorio se i tasselli sono intercambiabili.', path: [`articoli`, index, `nr_tasselli`] });
              }
              if (articolo.incollatura && (!articolo.incollatrice || !articolo.tipo_incollatura)) {
                console.log(`[superRefine] Adding issue: incollatrice or tipo_incollatura missing when incollatura is true for article ${index}`);
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Incollatrice e tipo incollatura sono obbligatori se l\'incollatura è presente.', path: [`articoli`, index, `incollatrice`] });
              }
            } 
            // Case 2: It's a standalone Pulitore article (has pulitore_codice_fustella but NO fustella_codice)
            else if (articolo.pulitore_codice_fustella && !articolo.fustella_codice) { // <-- FIX IS HERE
              if (!articolo.descrizione) {
                console.log(`[superRefine] Adding issue: descrizione missing for pulitore article ${index}`);
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'La descrizione è obbligatoria per il pulitore.', path: [`articoli`, index, `descrizione`] });
              }
              if (!articolo.quantita || articolo.quantita < 0.001) {
                console.log(`[superRefine] Adding issue: quantita missing or invalid for pulitore article ${index}`);
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'La quantità è obbligatoria e deve essere almeno 0.001 per il pulitore.', path: [`articoli`, index, `quantita`] });
              }
              if (articolo.prezzo_unitario === undefined || articolo.prezzo_unitario === null || articolo.prezzo_unitario < 0) {
                console.log(`[superRefine] Adding issue: prezzo_unitario missing or invalid for pulitore article ${index}`);
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Il prezzo unitario è obbligatorio per il pulitore.', path: [`articoli`, index, `prezzo_unitario`] });
              }
            }
            // Case 3: Neither fustella_codice nor pulitore_codice_fustella are present (generic for Fustelle supplier)
            else if (!articolo.fustella_codice && !articolo.pulitore_codice_fustella) {
                if (!articolo.descrizione) {
                    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'La descrizione è obbligatoria per articoli generici.', path: [`articoli`, index, `descrizione`] });
                }
                if (!articolo.quantita || articolo.quantita < 0.001) {
                    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'La quantità è obbligatoria e deve essere almeno 0.001.', path: [`articoli`, index, `quantita`] });
                }
            }
            // Campi non consentiti per Fustelle (aggiornato)
            if (articolo.codice_ctn || articolo.tipologia_cartone || articolo.formato || articolo.grammatura || articolo.numero_fogli || articolo.fsc || articolo.alimentare || articolo.rif_commessa_fsc) {
              ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Questi campi non devono essere usati per i fornitori di fustelle.', path: [`articoli`, index, `tipologia_cartone`] });
            }
          } else { // Fornitori di altro tipo (Inchiostro, Colla, Altro)
            if (!articolo.descrizione) {
              console.log(`[superRefine] Adding issue: descrizione missing for article ${index}`);
              ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'La descrizione è obbligatoria.', path: [`articoli`, index, `descrizione`] });
            }
            if (!articolo.quantita || articolo.quantita < 0.001) {
              console.log(`[superRefine] Adding issue: quantita missing or invalid for article ${index}`);
              ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'La quantità è obbligatoria e deve essere almeno 0.001.', path: [`articoli`, index, `quantita`] });
            }
            // Campi non consentiti per altri tipi di fornitori
            if (articolo.codice_ctn || articolo.tipologia_cartone || articolo.formato || articolo.grammatura || articolo.numero_fogli || articolo.cliente || articolo.lavoro || articolo.fsc || articolo.alimentare || articolo.rif_commessa_fsc || articolo.fustella_codice || articolo.codice_fornitore_fustella || articolo.fustellatrice || articolo.resa_fustella || articolo.hasPulitore || articolo.pulitore_codice_fustella || articolo.prezzo_pulitore || articolo.pinza_tagliata || articolo.tasselli_intercambiabili || articolo.nr_tasselli || articolo.incollatura || articolo.incollatrice || articolo.tipo_incollatura) {
              ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Questi campi non devono essere usati per questo tipo di fornitore.', path: [`articoli`, index, `tipologia_cartone`] });
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
            fsc: art.fsc || false,
            alimentare: art.alimentare || false,
            rif_commessa_fsc: art.rif_commessa_fsc || '',
            // Fustelle fields
            fustella_codice: art.fustella_codice || '',
            codice_fornitore_fustella: art.codice_fornitore_fustella || '',
            fustellatrice: art.fustellatrice || '',
            resa_fustella: art.resa_fustella || '',
            hasPulitore: art.hasPulitore || false,
            pulitore_codice_fustella: art.pulitore_codice_fustella || '',
            prezzo_pulitore: art.prezzo_pulitore || undefined, // Inizializza prezzo_pulitore
            pinza_tagliata: art.pinza_tagliata || false,
            tasselli_intercambiabili: art.tasselli_intercambiabili || false,
            nr_tasselli: art.nr_tasselli || null,
            incollatura: art.incollatura || false,
            incollatrice: art.incollatrice || '',
            tipo_incollatura: art.tipo_incollatura || '',
            cliente: art.cliente || '', // Inizializza cliente
            lavoro: art.lavoro || '', // Inizializza lavoro
          }))
        : [{ 
            quantita: undefined, 
            numero_fogli: undefined, 
            prezzo_unitario: 0, 
            codice_ctn: '', 
            data_consegna_prevista: defaultDateForNewArticle, 
            stato: 'in_attesa' as ArticoloOrdineAcquisto['stato'],
            fsc: false,
            alimentare: false,
            rif_commessa_fsc: '',
            // Fustelle fields
            fustella_codice: '',
            codice_fornitore_fustella: '',
            fustellatrice: '',
            resa_fustella: '',
            hasPulitore: false,
            pulitore_codice_fustella: '',
            prezzo_pulitore: undefined, // Inizializza prezzo_pulitore
            pinza_tagliata: false,
            tasselli_intercambiabili: false,
            nr_tasselli: null,
            incollatura: false,
            incollatrice: '',
            tipo_incollatura: '',
            cliente: '', // Inizializza cliente
            lavoro: '', // Inizializza lavoro
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
      const pulitorePrice = item.hasPulitore ? (item.prezzo_pulitore || 0) : 0; // Aggiungi prezzo pulitore
      return sum + (qty * price) + pulitorePrice;
    }
    return sum;
  }, 0);

  const [openCombobox, setOpenCombobox] = React.useState(false);
  const watchedFornitoreId = watch('fornitore_id');
  const selectedFornitore = fornitori.find((f) => f.id === watchedFornitoreId);
  const isCartoneFornitore = selectedFornitore?.tipo_fornitore === 'Cartone';
  const isFustelleFornitore = selectedFornitore?.tipo_fornitore === 'Fustelle'; // Nuovo flag per Fustelle

  const [ctnGeneratorInitialized, setCtnGeneratorInitialized] = React.useState(false);
  const [fscCommessaGeneratorInitialized, setFscCommessaGeneratorInitialized] = React.useState(false);
  const [fustellaGeneratorInitialized, setFustellaGeneratorInitialized] = React.useState(false); // Nuovo stato
  const [pulitoreGeneratorInitialized, setPulitoreGeneratorInitialized] = React.useState(false); // Nuovo stato

  const isCancelled = watch('stato') === 'annullato';
  const isNewOrder = !initialData?.id;

  const resetArticlesAndGenerators = React.useCallback(async (newFornitoreId: string) => {
    console.log('resetArticlesAndGenerators: Triggered with newFornitoreId:', newFornitoreId);
    remove();
    
    const newSelectedFornitore = fornitori.find((f) => f.id === newFornitoreId);
    const newIsCartoneFornitore = newSelectedFornitore?.tipo_fornitore === 'Cartone';
    const newIsFustelleFornitore = newSelectedFornitore?.tipo_fornitore === 'Fustelle'; // Nuovo flag

    const newArticle: ArticoloOrdineAcquisto = { 
      quantita: undefined,
      numero_fogli: undefined,
      prezzo_unitario: 0, 
      data_consegna_prevista: new Date().toISOString().split('T')[0],
      stato: 'in_attesa',
      fsc: false,
      alimentare: false,
      rif_commessa_fsc: '',
      // Fustelle fields
      fustella_codice: '',
      codice_fornitore_fustella: '',
      fustellatrice: '',
      resa_fustella: '',
      hasPulitore: false,
      pulitore_codice_fustella: '',
      prezzo_pulitore: undefined, // Reset prezzo pulitore
      pinza_tagliata: false,
      tasselli_intercambiabili: false,
      nr_tasselli: null,
      incollatura: false,
      incollatrice: '',
      tipo_incollatura: '',
      cliente: '', // Inizializza cliente
      lavoro: '', // Inizializza lavoro
    };
    append(newArticle);

    setCtnGeneratorInitialized(false);
    setFscCommessaGeneratorInitialized(false);
    setFustellaGeneratorInitialized(false); // Reset anche il generatore Fustella
    setPulitoreGeneratorInitialized(false); // Reset anche il generatore Pulitore

    const orderDateValue = watch('data_ordine');
    const orderYear = orderDateValue ? new Date(orderDateValue).getFullYear() : new Date().getFullYear();

    if (newIsCartoneFornitore) {
      const maxCode = await fetchMaxCartoneCodeFromDB();
      resetCartoneCodeGenerator(maxCode);
      setValue(`articoli.0.codice_ctn`, generateNextCartoneCode(), { shouldValidate: true });
      setValue(`articoli.0.numero_fogli`, 1, { shouldValidate: true });

      const maxFscCommessa = await fetchMaxFscCommessaFromDB(String(orderYear).slice(-2));
      resetFscCommessaGenerator(maxFscCommessa, orderYear);
    } else if (newIsFustelleFornitore) { // Nuova logica per Fustelle
      const nextFustellaCode = await findNextAvailableFustellaCode(); // Usa la nuova funzione
      setValue(`articoli.0.fustella_codice`, nextFustellaCode, { shouldValidate: true });
      setValue(`articoli.0.quantita`, 1, { shouldValidate: true }); // Quantità di default per fustelle

      const maxPulitoreCode = await fetchMaxPulitoreCodeFromDB();
      resetPulitoreCodeGenerator(maxPulitoreCode);
      // Il codice pulitore viene generato solo se hasPulitore è true
    } else {
      resetCartoneCodeGenerator(0);
      setValue(`articoli.0.quantita`, 1, { shouldValidate: true });
      resetFscCommessaGenerator(0, orderYear);
      // Non è necessario resettare i generatori Fustella/Pulitore qui,
      // perché findNextAvailableFustellaCode e generateNextPulitoreCode sono stateless.
    }
    setCtnGeneratorInitialized(true);
    setFscCommessaGeneratorInitialized(true);
    setFustellaGeneratorInitialized(true); // Inizializza anche il generatore Fustella
    setPulitoreGeneratorInitialized(true); // Inizializza anche il generatore Pulitore
    console.log('resetArticlesAndGenerators: Completed.');
  }, [remove, append, setValue, fornitori, watch]);


  React.useEffect(() => {
    console.log('ModalOrdineAcquistoForm: useEffect triggered. isOpen:', isOpen, 'initialData:', initialData);
    if (isOpen) {
      setCtnGeneratorInitialized(false);
      setFscCommessaGeneratorInitialized(false);
      setFustellaGeneratorInitialized(false); // Reset anche il generatore Fustella
      setPulitoreGeneratorInitialized(false); // Reset anche il generatore Pulitore
      console.log('ModalOrdineAcquistoForm: Setting all generators initialized states to false.');

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
                fsc: art.fsc || false,
                alimentare: art.alimentare || false,
                rif_commessa_fsc: art.rif_commessa_fsc || '',
                // Fustelle fields
                fustella_codice: art.fustella_codice || '',
                codice_fornitore_fustella: art.codice_fornitore_fustella || '',
                fustellatrice: art.fustellatrice || '',
                resa_fustella: art.resa_fustella || '',
                hasPulitore: art.hasPulitore || false,
                pulitore_codice_fustella: art.pulitore_codice_fustella || '',
                prezzo_pulitore: art.prezzo_pulitore || undefined, // Inizializza prezzo_pulitore
                pinza_tagliata: art.pinza_tagliata || false,
                tasselli_intercambiabili: art.tasselli_intercambiabili || false,
                nr_tasselli: art.nr_tasselli || null,
                incollatura: art.incollatura || false,
                incollatrice: art.incollatrice || '',
                tipo_incollatura: art.tipo_incollatura || '',
                cliente: art.cliente || '', // Inizializza cliente
                lavoro: art.lavoro || '', // Inizializza lavoro
              }))
            : [{ 
                quantita: undefined, 
                numero_fogli: undefined, 
                prezzo_unitario: 0, 
                codice_ctn: '', 
                data_consegna_prevista: defaultDateForNewArticle, 
                stato: 'in_attesa' as ArticoloOrdineAcquisto['stato'],
                fsc: false,
                alimentare: false,
                rif_commessa_fsc: '',
                // Fustelle fields
                fustella_codice: '',
                codice_fornitore_fustella: '',
                fustellatrice: '',
                resa_fustella: '',
                hasPulitore: false,
                pulitore_codice_fustella: '',
                prezzo_pulitore: undefined, // Inizializza prezzo_pulitore
                pinza_tagliata: false,
                tasselli_intercambiabili: false,
                nr_tasselli: null,
                incollatura: false,
                incollatrice: '',
                tipo_incollatura: '',
                cliente: '', // Inizializza cliente
                lavoro: '', // Inizializza lavoro
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

          // Inizializzazione generatori
          const maxCodeFromDB = await fetchMaxCartoneCodeFromDB();
          resetCartoneCodeGenerator(maxCodeFromDB);

          const orderYear = new Date(dataToReset.data_ordine).getFullYear();
          const maxFscCommessa = await fetchMaxFscCommessaFromDB(String(orderYear).slice(-2));
          resetFscCommessaGenerator(maxFscCommessa, orderYear);

          // Usa la nuova funzione per le fustelle
          // Non è necessario resettare un contatore globale per findNextAvailableFustellaCode
          const maxPulitoreCode = await fetchMaxPulitoreCodeFromDB();
          resetPulitoreCodeGenerator(maxPulitoreCode);
          
          reset(dataToReset);
          console.log('ModalOrdineAcquistoForm: Form reset with data:', dataToReset);
          console.log('ModalOrdineAcquistoForm: Form values after reset:', methods.getValues());

          if (dataToReset.fornitore_id) setValue('fornitore_id', dataToReset.fornitore_id, { shouldValidate: true });
          if (dataToReset.stato) setValue('stato', dataToReset.stato, { shouldValidate: true });
          setValue('numero_ordine', dataToReset.numero_ordine, { shouldValidate: true });

          const currentSelectedFornitore = fornitori.find((f) => f.id === dataToReset.fornitore_id);
          const currentIsCartoneFornitore = currentSelectedFornitore?.tipo_fornitore === 'Cartone';
          const currentIsFustelleFornitore = currentSelectedFornitore?.tipo_fornitore === 'Fustelle';

          if (dataToReset.articoli.length > 0) {
            for (const [index, article] of dataToReset.articoli.entries()) {
              if (currentIsCartoneFornitore) {
                if (!article.codice_ctn) {
                  setValue(`articoli.${index}.codice_ctn`, generateNextCartoneCode(), { shouldValidate: true });
                }
                if (article.numero_fogli === undefined) {
                  setValue(`articoli.${index}.numero_fogli`, 1, { shouldValidate: true });
                }
                if (article.fsc && !article.rif_commessa_fsc) {
                  setValue(`articoli.${index}.rif_commessa_fsc`, generateNextFscCommessa(orderYear), { shouldValidate: true });
                }
              } else if (currentIsFustelleFornitore) {
                if (!article.fustella_codice && !article.pulitore_codice_fustella) {
                  const nextFustellaCode = await findNextAvailableFustellaCode(); // Usa la nuova funzione
                  setValue(`articoli.${index}.fustella_codice`, nextFustellaCode, { shouldValidate: true });
                  setValue(`articoli.${index}.quantita`, 1, { shouldValidate: true });
                } else if (article.fustella_codice && !article.pulitore_codice_fustella) {
                  if (article.quantita === undefined) {
                    setValue(`articoli.${index}.quantita`, 1, { shouldValidate: true });
                  }
                  if (article.hasPulitore && !article.pulitore_codice_fustella) {
                    setValue(`articoli.${index}.pulitore_codice_fustella`, generateNextPulitoreCode(), { shouldValidate: true });
                  }
                } else if (article.pulitore_codice_fustella && !article.fustella_codice) {
                  if (article.quantita === undefined) {
                    setValue(`articoli.${index}.quantita`, 1, { shouldValidate: true });
                  }
                  if (!article.descrizione) {
                    setValue(`articoli.${index}.descrizione`, `Pulitore per fustella`, { shouldValidate: true });
                  }
                }
              } else {
                if (article.quantita === undefined) {
                  setValue(`articoli.${index}.quantita`, 1, { shouldValidate: true });
                }
              }
            }
          }

          setCtnGeneratorInitialized(true);
          setFscCommessaGeneratorInitialized(true);
          setFustellaGeneratorInitialized(true);
          setPulitoreGeneratorInitialized(true);
          console.log('ModalOrdineAcquistoForm: All generators initialized states set to true.');
        } catch (error) {
          console.error('ModalOrdineAcquistoForm: Error during setupFormAndGenerators:', error);
          toast.error('Errore durante l\'inizializzazione del modulo. Riprova.');
          onClose();
        }
      };
      setupFormAndGenerators();
    }
  }, [isOpen, initialData, reset, setValue, fornitori, resetArticlesAndGenerators, methods]);

  React.useEffect(() => {
    setValue('importo_totale', parseFloat(totalAmount.toFixed(3)));
  }, [totalAmount, setValue]);

  const handleFormSubmit = async (data: any) => {
    console.log("ModalOrdineAcquistoForm: Attempting to submit form with data:", data);
    console.log("ModalOrdineAcquistoForm: Current form errors at submission attempt:", errors); // Log errors here
    try {
      await onSubmit(data as OrdineAcquisto);
      console.log("ModalOrdineAcquistoForm: onSubmit successful.");
      onClose();
    } catch (error) {
      console.error("ModalOrdineAcquistoForm: Error during form submission:", error);
      toast.error("Errore durante il salvataggio dell'ordine d'acquisto.");
    }
  };

  const handleAddArticle = async () => { // Aggiunto async qui
    if (!ctnGeneratorInitialized || !fscCommessaGeneratorInitialized || !fustellaGeneratorInitialized || !pulitoreGeneratorInitialized) {
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
      fsc: false,
      alimentare: false,
      rif_commessa_fsc: '',
      // Fustelle fields
      fustella_codice: '',
      codice_fornitore_fustella: '',
      fustellatrice: '',
      resa_fustella: '',
      hasPulitore: false,
      pulitore_codice_fustella: '',
      prezzo_pulitore: undefined, // Inizializza prezzo_pulitore
      pinza_tagliata: false,
      tasselli_intercambiabili: false,
      nr_tasselli: null,
      incollatura: false,
      incollatrice: '',
      tipo_incollatura: '',
      cliente: '', // Inizializza cliente
      lavoro: '', // Inizializza lavoro
    };
    if (isCartoneFornitore) {
      newArticle = { ...newArticle, codice_ctn: generateNextCartoneCode(), numero_fogli: 1 };
      if (watchedArticles[0]?.fsc) {
        newArticle.fsc = true;
        newArticle.rif_commessa_fsc = generateNextFscCommessa(orderYear);
      }
    } else if (isFustelleFornitore) { // Nuova logica per Fustelle
      // Default to fustella type when adding new article for Fustelle supplier
      const nextFustellaCode = await findNextAvailableFustellaCode(); // Usa la nuova funzione
      newArticle = { ...newArticle, fustella_codice: nextFustellaCode, quantita: 1 };
      if (watchedArticles[0]?.hasPulitore) {
        newArticle.hasPulitore = true;
        newArticle.pulitore_codice_fustella = generateNextPulitoreCode();
      }
    } else {
      newArticle = { ...newArticle, quantita: 1 };
    }
    append(newArticle);
  };

  const title = initialData?.id ? `Modifica Ordine d'Acquisto` : `Nuovo Ordine d'Acquisto`;
  const description = initialData?.id ? `Modifica i dettagli per l'ordine ${initialData.numero_ordine}.` : `Inserisci i dettagli per il nuovo ordine d'acquisto.`
  
  console.log("ModalOrdineAcquistoForm: Current form errors (at render):", errors); // Log errors at render
  
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
                  <Label htmlFor="data_ordine" className="col-span-1">
                    Data Ordine *
                  </Label>
                  <div className="col-span-3">
                    <Input id="data_ordine" type="date" {...register('data_ordine')} className="col-span-3" disabled={isSubmitting || isCancelled} />
                    {errors.data_ordine && <p className="text-destructive text-xs mt-1">{errors.data_ordine.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="numero_ordine" className="col-span-1">
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
                    {errors.numero_ordine && <p className="text-destructive text-xs mt-1">{errors.articoli?.[index]?.numero_ordine?.message}</p>}
                  </div>
                </div>
              </div>

              {/* Row for Fornitore */}
              <div className="flex flex-col gap-2 md:col-span-2">
                <Label htmlFor="fornitore_id" className="text-left">
                  Fornitore *
                </Label>
                <div>
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
                                onSelect={async (currentValue) => { // Aggiunto async qui
                                  const newFornitoreId = fornitori.find(f => f.nome === currentValue)?.id || '';
                                  setValue('fornitore_id', newFornitoreId, { shouldValidate: true });
                                  setOpenCombobox(false);
                                  await resetArticlesAndGenerators(newFornitoreId); // Aggiunto await
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
                        selectedFornitore.tipo_fornitore === 'Cartone' ? "bg-green-500 hover:bg-green-600" : 
                        selectedFornitore.tipo_fornitore === 'Fustelle' ? "bg-purple-500 hover:bg-purple-600" : // Colore per Fustelle
                        "bg-gray-500 hover:bg-gray-600"
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
                  isFustelleFornitore={isFustelleFornitore} // Passa il nuovo flag
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
              disabled={isSubmitting || !ctnGeneratorInitialized || !fscCommessaGeneratorInitialized || !fustellaGeneratorInitialized || !pulitoreGeneratorInitialized || isCancelled}
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
            {/* NEW LOG FOR ERRORS */}
            {console.log("ModalOrdineAcquistoForm: Current form errors before footer:", errors)}
            {Object.keys(errors).length > 0 && (
              <div className="text-destructive text-sm mt-4 p-2 border border-destructive rounded-md">
                <p className="font-bold mb-1">Errori di validazione:</p>
                <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(errors, null, 2)}</pre>
              </div>
            )}
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