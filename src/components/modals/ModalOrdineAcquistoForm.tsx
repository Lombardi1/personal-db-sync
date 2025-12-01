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
import { generateNextFustellaCode, resetFustellaCodeGenerator, fetchMaxFustellaCodeFromDB } from '@/utils/fustellaUtils';
import { generateNextPulitoreCode, resetPulitoreCodeGenerator, fetchMaxPulitoreCodeFromDB } from '@/utils/pulitoreUtils';

interface ModalOrdineAcquistoFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: OrdineAcquisto) => Promise<void>;
  initialData?: OrdineAcquisto | null;
  fornitori: Fornitore[];
  clienti: Cliente[];
}

const baseArticoloSchema = z.object({
  id: z.string().optional(),
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
    z.number().min(0, 'Il prezzo unitario non può essere negativo').optional().nullable() // Made optional for initial state
  ),
  data_consegna_prevista: z.string().min(1, 'La data di consegna prevista è obbligatoria per l\'articolo'),
  stato: z.enum(['in_attesa', 'confermato', 'ricevuto', 'annullato', 'inviato'], { required_error: 'Lo stato è obbligatorio' }),
  cliente: z.string().max(255, 'Cliente troppo lungo').optional().or(z.literal('')),
  lavoro: z.string().max(255, 'Lavoro troppo lungo').optional().or(z.literal('')),
});

const cartoneArticoloSchema = baseArticoloSchema.extend({
  item_type: z.literal('cartone'),
  codice_ctn: z.string().min(1, 'Il codice CTN è obbligatorio').max(255, 'Codice CTN troppo lungo'),
  tipologia_cartone: z.string().min(1, 'La tipologia cartone è obbligatoria').max(255, 'Tipologia troppo lunga'),
  formato: z.string().min(1, 'Il formato è obbligatorio').max(50, 'Formato troppo lungo'),
  grammatura: z.string().min(1, 'La grammatura è obbligatoria').max(50, 'Grammatura troppo lunga'),
  numero_fogli: z.preprocess(
    (val) => {
      if (val === '' || val === null || val === undefined) return null;
      const num = Number(val);
      return isNaN(num) ? null : num;
    },
    z.number().min(1, 'Il numero di fogli deve essere almeno 1').optional().nullable()
  ),
  fsc: z.boolean().optional(),
  alimentare: z.boolean().optional(),
  rif_commessa_fsc: z.string().max(50, 'Rif. Commessa FSC troppo lungo').optional().or(z.literal('')),
  // Ensure other fields are not present
  descrizione: z.undefined().or(z.literal('')),
  fustella_codice: z.undefined().or(z.literal('')),
  codice_fornitore_fustella: z.undefined().or(z.literal('')),
  fustellatrice: z.undefined().or(z.literal('')),
  resa_fustella: z.undefined().or(z.literal('')),
  pulitore_codice_fustella: z.undefined().or(z.literal('')),
  pinza_tagliata: z.undefined(),
  tasselli_intercambiabili: z.undefined(),
  nr_tasselli: z.undefined(),
  incollatura: z.undefined(),
  incollatrice: z.undefined().or(z.literal('')),
  tipo_incollatura: z.undefined().or(z.literal('')),
  codice_pulitore: z.undefined().or(z.literal('')),
  fustella_parent_index: z.undefined(),
});

const fustellaArticoloSchema = baseArticoloSchema.extend({
  item_type: z.literal('fustella'),
  fustella_codice: z.string().min(1, 'Il codice fustella è obbligatorio').max(255, 'Codice Fustella troppo lungo'),
  codice_fornitore_fustella: z.string().min(1, 'Il codice fornitore fustella è obbligatorio').max(255, 'Codice Fornitore Fustella troppo lungo'),
  fustellatrice: z.string().min(1, 'La fustellatrice è obbligatoria').max(255, 'Fustellatrice troppo lunga'),
  resa_fustella: z.string().min(1, 'La resa fustella è obbligatoria').max(50, 'Resa Fustella troppo lunga'),
  pulitore_codice_fustella: z.string().max(255, 'Codice Pulitore associato troppo lungo').optional().nullable(), // NEW: pulitore_codice_fustella
  pinza_tagliata: z.boolean().optional(),
  tasselli_intercambiabili: z.boolean().optional(),
  nr_tasselli: z.preprocess(
    (val) => (val === '' ? null : Number(val)),
    z.number().min(0, 'Il numero di tasselli non può essere negativo').optional().nullable()
  ),
  incollatura: z.boolean().optional(),
  incollatrice: z.string().max(255, 'Incollatrice troppo lunga').optional().or(z.literal('')),
  tipo_incollatura: z.string().max(255, 'Tipo Incollatura troppo lunga').optional().or(z.literal('')),
  // Ensure other fields are not present
  codice_ctn: z.undefined().or(z.literal('')),
  tipologia_cartone: z.undefined().or(z.literal('')),
  formato: z.undefined().or(z.literal('')),
  grammatura: z.undefined().or(z.literal('')),
  numero_fogli: z.undefined(),
  fsc: z.undefined(),
  alimentare: z.undefined(),
  rif_commessa_fsc: z.undefined().or(z.literal('')),
  descrizione: z.undefined().or(z.literal('')),
  codice_pulitore: z.undefined().or(z.literal('')),
  fustella_parent_index: z.undefined(),
}).superRefine((data, ctx) => {
  if (data.tasselli_intercambiabili && (data.nr_tasselli === undefined || data.nr_tasselli === null || data.nr_tasselli < 0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Il numero di tasselli è obbligatorio se i tasselli sono intercambiabili.', path: [`nr_tasselli`] });
  }
  if (data.incollatura && (!data.incollatrice || !data.tipo_incollatura)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Incollatrice e tipo incollatura sono obbligatori se l\'incollatura è presente.', path: [`incollatrice`] });
  }
});

const pulitoreArticoloSchema = baseArticoloSchema.extend({
  item_type: z.literal('pulitore'),
  codice_pulitore: z.string().min(1, 'Il codice pulitore è obbligatorio').max(255, 'Codice Pulitore troppo lungo'),
  descrizione: z.string().min(1, 'La descrizione è obbligatoria').max(255, 'Descrizione troppo lunga'),
  fustella_parent_index: z.number().min(0, 'Indice fustella padre non valido').optional(),
  // Ensure other fields are not present
  codice_ctn: z.undefined().or(z.literal('')),
  tipologia_cartone: z.undefined().or(z.literal('')),
  formato: z.undefined().or(z.literal('')),
  grammatura: z.undefined().or(z.literal('')),
  numero_fogli: z.undefined(),
  fsc: z.undefined(),
  alimentare: z.undefined(),
  rif_commessa_fsc: z.undefined().or(z.literal('')),
  fustella_codice: z.undefined().or(z.literal('')),
  codice_fornitore_fustella: z.undefined().or(z.literal('')),
  fustellatrice: z.undefined().or(z.literal('')),
  resa_fustella: z.undefined().or(z.literal('')),
  pulitore_codice_fustella: z.undefined().or(z.literal('')),
  pinza_tagliata: z.undefined(),
  tasselli_intercambiabili: z.undefined(),
  nr_tasselli: z.undefined(),
  incollatura: z.undefined(),
  incollatrice: z.undefined().or(z.literal('')),
  tipo_incollatura: z.undefined().or(z.literal('')),
});

const altroArticoloSchema = baseArticoloSchema.extend({
  item_type: z.literal('altro'),
  descrizione: z.string().min(1, 'La descrizione è obbligatoria').max(255, 'Descrizione troppo lunga'),
  // Ensure other fields are not present
  codice_ctn: z.undefined().or(z.literal('')),
  tipologia_cartone: z.undefined().or(z.literal('')),
  formato: z.undefined().or(z.literal('')),
  grammatura: z.undefined().or(z.literal('')),
  numero_fogli: z.undefined(),
  fsc: z.undefined(),
  alimentare: z.undefined(),
  rif_commessa_fsc: z.undefined().or(z.literal('')),
  fustella_codice: z.undefined().or(z.literal('')),
  codice_fornitore_fustella: z.undefined().or(z.literal('')),
  fustellatrice: z.undefined().or(z.literal('')),
  resa_fustella: z.undefined().or(z.literal('')),
  pulitore_codice_fustella: z.undefined().or(z.literal('')),
  pinza_tagliata: z.undefined(),
  tasselli_intercambiabili: z.undefined(),
  nr_tasselli: z.undefined(),
  incollatura: z.undefined(),
  incollatrice: z.undefined().or(z.literal('')),
  tipo_incollatura: z.undefined().or(z.literal('')),
  codice_pulitore: z.undefined().or(z.literal('')),
  fustella_parent_index: z.undefined(),
});

const articoloSchema = z.discriminatedUnion('item_type', [
  cartoneArticoloSchema,
  fustellaArticoloSchema,
  pulitoreArticoloSchema,
  altroArticoloSchema,
]);

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
      })
    ),
    defaultValues: React.useMemo(() => {
      const defaultDateForNewArticle = new Date().toISOString().split('T')[0];
      
      const articlesToUse: ArticoloOrdineAcquisto[] = [];
      if (initialData?.articoli && initialData.articoli.length > 0) {
        initialData.articoli.filter(Boolean).forEach((art, originalIndex) => { // Filter out null/undefined articles
          const baseArticle: ArticoloOrdineAcquisto = {
            ...art, 
            data_consegna_prevista: art.data_consegna_prevista || defaultDateForNewArticle, 
            stato: (art.stato || 'in_attesa') as ArticoloOrdineAcquisto['stato'],
            quantita: art.quantita || undefined,
            prezzo_unitario: art.prezzo_unitario || undefined, // Ensure it's undefined if 0 or null for initial state
            cliente: art.cliente || '',
            lavoro: art.lavoro || '',
            item_type: art.item_type || 'altro', // Ensure item_type is always present
            // Cartone fields
            codice_ctn: art.codice_ctn || '', 
            tipologia_cartone: art.tipologia_cartone || '',
            formato: art.formato || '',
            grammatura: art.grammatura || '',
            numero_fogli: art.numero_fogli || undefined,
            fsc: art.fsc || false,
            alimentare: art.alimentare || false,
            rif_commessa_fsc: art.rif_commessa_fsc || '',
            // Fustelle fields
            fustella_codice: art.fustella_codice || '',
            codice_fornitore_fustella: art.codice_fornitore_fustella || '',
            fustellatrice: art.fustellatrice || '',
            resa_fustella: art.resa_fustella || '',
            pulitore_codice_fustella: art.pulitore_codice_fustella || null, // Initialize pulitore_codice_fustella
            pinza_tagliata: art.pinza_tagliata || false,
            tasselli_intercambiabili: art.tasselli_intercambiabili || false,
            nr_tasselli: art.nr_tasselli || null,
            incollatura: art.incollatura || false,
            incollatrice: art.incollatrice || '',
            tipo_incollatura: art.tipo_incollatura || '',
            // Pulitore fields (these are for the actual pulitore article, not the fustella's pulitore_codice_fustella)
            codice_pulitore: art.codice_pulitore || '',
            fustella_parent_index: art.fustella_parent_index || undefined,
            // Altro fields (reused for pulitore description)
            descrizione: art.descrizione || '',
          };
          articlesToUse.push(baseArticle);

          // If it's a fustella with an associated pulitore, add the pulitore as a separate article
          if (baseArticle.item_type === 'fustella' && baseArticle.pulitore_codice_fustella) {
            const pulitoreArticle: ArticoloOrdineAcquisto = {
              item_type: 'pulitore',
              codice_pulitore: baseArticle.pulitore_codice_fustella,
              descrizione: `Pulitore per Fustella ${baseArticle.fustella_codice || ''}`,
              quantita: baseArticle.quantita || 1, // Default quantity for pulitore, or parent's quantity
              prezzo_unitario: 0, // Default price for pulitore
              data_consegna_prevista: baseArticle.data_consegna_prevista,
              stato: baseArticle.stato,
              cliente: baseArticle.cliente,
              lavoro: baseArticle.lavoro,
              fustella_parent_index: articlesToUse.length - 1, // Index of the parent fustella
            };
            articlesToUse.push(pulitoreArticle);
          }
        });
      } else {
        articlesToUse.push({ 
            item_type: 'altro', // Default to 'altro' for new empty article
            quantita: undefined, 
            prezzo_unitario: undefined, 
            data_consegna_prevista: defaultDateForNewArticle, 
            stato: 'in_attesa' as ArticoloOrdineAcquisto['stato'],
            cliente: '', lavoro: '',
            codice_ctn: '', tipologia_cartone: '', formato: '', grammatura: '', numero_fogli: undefined, fsc: false, alimentare: false, rif_commessa_fsc: '',
            fustella_codice: '', codice_fornitore_fustella: '', fustellatrice: '', resa_fustella: '', pulitore_codice_fustella: null, pinza_tagliata: false, tasselli_intercambiabili: false, nr_tasselli: null, incollatura: false, incollatrice: '', tipo_incollatura: '',
            codice_pulitore: '', fustella_parent_index: undefined, descrizione: '',
          });
      }

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

  const { fields, append, remove, update } = useFieldArray({
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
  const isFustelleFornitore = selectedFornitore?.tipo_fornitore === 'Fustelle';

  const [ctnGeneratorInitialized, setCtnGeneratorInitialized] = React.useState(false);
  const [fscCommessaGeneratorInitialized, setFscCommessaGeneratorInitialized] = React.useState(false);
  const [fustellaGeneratorInitialized, setFustellaGeneratorInitialized] = React.useState(false);
  const [pulitoreGeneratorInitialized, setPulitoreGeneratorInitialized] = React.useState(false);

  const isCancelled = watch('stato') === 'annullato';
  const isNewOrder = !initialData?.id;

  const resetArticlesAndGenerators = React.useCallback(async (newFornitoreId: string) => {
    console.log('resetArticlesAndGenerators: Triggered with newFornitoreId:', newFornitoreId);
    remove();
    
    const newSelectedFornitore = fornitori.find((f) => f.id === newFornitoreId);
    const newIsCartoneFornitore = newSelectedFornitore?.tipo_fornitore === 'Cartone';
    const newIsFustelleFornitore = newSelectedFornitore?.tipo_fornitore === 'Fustelle';

    const defaultDateForNewArticle = new Date().toISOString().split('T')[0];

    let newArticle: ArticoloOrdineAcquisto = { 
      item_type: 'altro', // Default type
      quantita: undefined, 
      prezzo_unitario: undefined, 
      data_consegna_prevista: defaultDateForNewArticle,
      stato: 'in_attesa',
      cliente: '', lavoro: '',
      codice_ctn: '', tipologia_cartone: '', formato: '', grammatura: '', numero_fogli: undefined, fsc: false, alimentare: false, rif_commessa_fsc: '',
      fustella_codice: '', codice_fornitore_fustella: '', fustellatrice: '', resa_fustella: '', pulitore_codice_fustella: null, pinza_tagliata: false, tasselli_intercambiabili: false, nr_tasselli: null, incollatura: false, incollatrice: '', tipo_incollatura: '',
      codice_pulitore: '', fustella_parent_index: undefined, descrizione: '',
    };

    setCtnGeneratorInitialized(false);
    setFscCommessaGeneratorInitialized(false);
    setFustellaGeneratorInitialized(false);
    setPulitoreGeneratorInitialized(false);

    const orderDateValue = watch('data_ordine');
    const orderYear = orderDateValue ? new Date(orderDateValue).getFullYear() : new Date().getFullYear();

    if (newIsCartoneFornitore) {
      const maxCode = await fetchMaxCartoneCodeFromDB();
      resetCartoneCodeGenerator(maxCode);
      newArticle = { ...newArticle, item_type: 'cartone', codice_ctn: generateNextCartoneCode(), numero_fogli: 1 };
      const maxFscCommessa = await fetchMaxFscCommessaFromDB(String(orderYear).slice(-2));
      resetFscCommessaGenerator(maxFscCommessa, orderYear);
    } else if (newIsFustelleFornitore) {
      const maxFustellaCode = await fetchMaxFustellaCodeFromDB();
      resetFustellaCodeGenerator(maxFustellaCode);
      newArticle = { ...newArticle, item_type: 'fustella', fustella_codice: generateNextFustellaCode(), quantita: 1 };
      const maxPulitoreCode = await fetchMaxPulitoreCodeFromDB();
      resetPulitoreCodeGenerator(maxPulitoreCode);
    } else {
      newArticle = { ...newArticle, item_type: 'altro', descrizione: '' };
    }
    append(newArticle);

    setCtnGeneratorInitialized(true);
    setFscCommessaGeneratorInitialized(true);
    setFustellaGeneratorInitialized(true);
    setPulitoreGeneratorInitialized(true);
    console.log('resetArticlesAndGenerators: Completed.');
  }, [remove, append, setValue, fornitori, watch]);


  React.useEffect(() => {
    console.log('ModalOrdineAcquistoForm: useEffect triggered. isOpen:', isOpen, 'initialData:', initialData);
    if (isOpen) {
      setCtnGeneratorInitialized(false);
      setFscCommessaGeneratorInitialized(false);
      setFustellaGeneratorInitialized(false);
      setPulitoreGeneratorInitialized(false);
      console.log('ModalOrdineAcquistoForm: Setting all generators initialized states to false.');

      const setupFormAndGenerators = async () => {
        console.log('ModalOrdineAcquistoForm: setupFormAndGenerators started with initialData:', initialData);
        try {
          const defaultDateForNewArticle = new Date().toISOString().split('T')[0];
          
          const articlesToUse: ArticoloOrdineAcquisto[] = [];
          if (initialData?.articoli && initialData.articoli.length > 0) {
            initialData.articoli.filter(Boolean).forEach((art, originalIndex) => { // Filter out null/undefined articles
              const baseArticle: ArticoloOrdineAcquisto = {
                ...art, 
                data_consegna_prevista: art.data_consegna_prevista || defaultDateForNewArticle, 
                stato: (art.stato || 'in_attesa') as ArticoloOrdineAcquisto['stato'],
                quantita: art.quantita || undefined,
                prezzo_unitario: art.prezzo_unitario || undefined,
                cliente: art.cliente || '',
                lavoro: art.lavoro || '',
                item_type: art.item_type || 'altro', // Ensure item_type is always present
                // Cartone fields
                codice_ctn: art.codice_ctn || '', 
                tipologia_cartone: art.tipologia_cartone || '',
                formato: art.formato || '',
                grammatura: art.grammatura || '',
                numero_fogli: art.numero_fogli || undefined,
                fsc: art.fsc || false,
                alimentare: art.alimentare || false,
                rif_commessa_fsc: art.rif_commessa_fsc || '',
                // Fustelle fields
                fustella_codice: art.fustella_codice || '',
                codice_fornitore_fustella: art.codice_fornitore_fustella || '',
                fustellatrice: art.fustellatrice || '',
                resa_fustella: art.resa_fustella || '',
                pulitore_codice_fustella: art.pulitore_codice_fustella || null, // Initialize pulitore_codice_fustella
                pinza_tagliata: art.pinza_tagliata || false,
                tasselli_intercambiabili: art.tasselli_intercambiabili || false,
                nr_tasselli: art.nr_tasselli || null,
                incollatura: art.incollatura || false,
                incollatrice: art.incollatrice || '',
                tipo_incollatura: art.tipo_incollatura || '',
                // Pulitore fields (these are for the actual pulitore article, not the fustella's pulitore_codice_fustella)
                codice_pulitore: art.codice_pulitore || '',
                fustella_parent_index: art.fustella_parent_index || undefined,
                // Altro fields (reused for pulitore description)
                descrizione: art.descrizione || '',
              };
              articlesToUse.push(baseArticle);

              // If it's a fustella with an associated pulitore, add the pulitore as a separate article
              if (baseArticle.item_type === 'fustella' && baseArticle.pulitore_codice_fustella) {
                const pulitoreArticle: ArticoloOrdineAcquisto = {
                  item_type: 'pulitore',
                  codice_pulitore: baseArticle.pulitore_codice_fustella,
                  descrizione: `Pulitore per Fustella ${baseArticle.fustella_codice || ''}`,
                  quantita: baseArticle.quantita || 1, // Default quantity for pulitore, or parent's quantity
                  prezzo_unitario: 0, // Default price for pulitore
                  data_consegna_prevista: baseArticle.data_consegna_prevista,
                  stato: baseArticle.stato,
                  cliente: baseArticle.cliente,
                  lavoro: baseArticle.lavoro,
                  fustella_parent_index: articlesToUse.length - 1, // Index of the parent fustella
                };
                articlesToUse.push(pulitoreArticle);
              }
            });
          } else {
            articlesToUse.push({ 
                item_type: 'altro',
                quantita: undefined, 
                prezzo_unitario: undefined, 
                data_consegna_prevista: defaultDateForNewArticle, 
                stato: 'in_attesa' as ArticoloOrdineAcquisto['stato'],
                cliente: '', lavoro: '',
                codice_ctn: '', tipologia_cartone: '', formato: '', grammatura: '', numero_fogli: undefined, fsc: false, alimentare: false, rif_commessa_fsc: '',
                fustella_codice: '', codice_fornitore_fustella: '', fustellatrice: '', resa_fustella: '', pulitore_codice_fustella: null, pinza_tagliata: false, tasselli_intercambiabili: false, nr_tasselli: null, incollatura: false, incollatrice: '', tipo_incollatura: '',
                codice_pulitore: '', fustella_parent_index: undefined, descrizione: '',
              });
          }

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

          const maxFustellaCode = await fetchMaxFustellaCodeFromDB();
          resetFustellaCodeGenerator(maxFustellaCode);

          const maxPulitoreCode = await fetchMaxPulitoreCodeFromDB();
          resetPulitoreCodeGenerator(maxPulitoreCode);
          
          reset(dataToReset);
          console.log('ModalOrdineAcquistoForm: Form reset with data:', dataToReset);
          console.log('ModalOrdineAcquistoForm: Form values after reset:', methods.getValues());

          if (dataToReset.fornitore_id) setValue('fornitore_id', dataToReset.fornitore_id, { shouldValidate: true });
          if (dataToReset.stato) setValue('stato', dataToReset.stato, { shouldValidate: true });
          setValue('numero_ordine', dataToReset.numero_ordine, { shouldValidate: true });

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
    if (ctnGeneratorInitialized && fscCommessaGeneratorInitialized && fustellaGeneratorInitialized && pulitoreGeneratorInitialized) {
      fields.forEach((field, index) => {
        if (isCartoneFornitore) {
          if (field.item_type === 'cartone') {
            if (field.numero_fogli === undefined) {
              setValue(`articoli.${index}.numero_fogli`, 1, { shouldValidate: true });
            }
            if (field.fsc && !field.rif_commessa_fsc) {
              const orderYear = new Date(watch('data_ordine')).getFullYear();
              setValue(`articoli.${index}.rif_commessa_fsc`, generateNextFscCommessa(orderYear), { shouldValidate: true });
            } else if (!field.fsc && field.rif_commessa_fsc) {
              setValue(`articoli.${index}.rif_commessa_fsc`, '', { shouldValidate: true });
            }
          }
        } else if (isFustelleFornitore) {
          if (field.item_type === 'fustella') {
            if (field.quantita === undefined) {
              setValue(`articoli.${index}.quantita`, 1, { shouldValidate: true });
            }
            if (field.tasselli_intercambiabili && (field.nr_tasselli === undefined || field.nr_tasselli === null)) {
              setValue(`articoli.${index}.nr_tasselli`, 0, { shouldValidate: true });
            } else if (!field.tasselli_intercambiabili && (field.nr_tasselli !== undefined && field.nr_tasselli !== null)) {
              setValue(`articoli.${index}.nr_tasselli`, null, { shouldValidate: true });
            }
          } else if (field.item_type === 'pulitore') {
            if (field.quantita === undefined) {
              setValue(`articoli.${index}.quantita`, 1, { shouldValidate: true });
            }
          }
        } else { // Other types of suppliers
          if (field.item_type === 'altro') {
            if (field.codice_ctn) { setValue(`articoli.${index}.codice_ctn`, ''); }
            if (field.numero_fogli !== undefined) { setValue(`articoli.${index}.numero_fogli`, undefined, { shouldValidate: true }); }
            if (field.quantita === undefined) { setValue(`articoli.${index}.quantita`, 1, { shouldValidate: true }); }
            setValue(`articoli.${index}.fsc`, false, { shouldValidate: true });
            setValue(`articoli.${index}.alimentare`, false, { shouldValidate: true });
            setValue(`articoli.${index}.rif_commessa_fsc`, '', { shouldValidate: true });
            // Reset fustelle fields
            setValue(`articoli.${index}.fustella_codice`, '', { shouldValidate: true });
            setValue(`articoli.${index}.codice_fornitore_fustella`, '', { shouldValidate: true });
            setValue(`articoli.${index}.fustellatrice`, '', { shouldValidate: true });
            setValue(`articoli.${index}.resa_fustella`, '', { shouldValidate: true });
            setValue(`articoli.${index}.pulitore_codice_fustella`, null, { shouldValidate: true }); // Reset pulitore_codice_fustella
            setValue(`articoli.${index}.pinza_tagliata`, false, { shouldValidate: true });
            setValue(`articoli.${index}.tasselli_intercambiabili`, false, { shouldValidate: true });
            setValue(`articoli.${index}.nr_tasselli`, null, { shouldValidate: true });
            setValue(`articoli.${index}.incollatura`, false, { shouldValidate: true });
            setValue(`articoli.${index}.incollatrice`, '', { shouldValidate: true });
            setValue(`articoli.${index}.tipo_incollatura`, '', { shouldValidate: true });
            setValue(`articoli.${index}.cliente`, '', { shouldValidate: true });
            setValue(`articoli.${index}.lavoro`, '', { shouldValidate: true });
            // Reset pulitore fields
            setValue(`articoli.${index}.codice_pulitore`, '', { shouldValidate: true });
            setValue(`articoli.${index}.fustella_parent_index`, undefined, { shouldValidate: true });
          }
        }
      });
    }
  }, [isCartoneFornitore, isFustelleFornitore, fields, setValue, ctnGeneratorInitialized, fscCommessaGeneratorInitialized, fustellaGeneratorInitialized, pulitoreGeneratorInitialized, watch]);

  React.useEffect(() => {
    setValue('importo_totale', parseFloat(totalAmount.toFixed(3)));
  }, [totalAmount, setValue]);

  const handleFormSubmit = async (data: any) => {
    console.log("ModalOrdineAcquistoForm: Attempting to submit form with data:", data);
    console.log("ModalOrdineAcquistoForm: Current form errors at submission attempt:", errors);
    try {
      // Explicitly filter out any null/undefined articles before processing
      const cleanedArticles = data.articoli.filter(Boolean);

      // Now process cleanedArticles
      const finalArticles = cleanedArticles.filter((article: ArticoloOrdineAcquisto) => {
        if (article.item_type === 'pulitore' && article.fustella_parent_index !== undefined) {
          const parentFustella = cleanedArticles[article.fustella_parent_index]; // Use cleanedArticles here
          return parentFustella && parentFustella.item_type === 'fustella' && parentFustella.pulitore_codice_fustella === article.codice_pulitore;
        }
        return true;
      }).map((article: ArticoloOrdineAcquisto) => {
        // Ensure pulitore_codice_fustella is null if it's not a fustella or if it's a fustella but the pulitore was removed
        if (article.item_type !== 'fustella') {
          const { pulitore_codice_fustella, ...rest } = article;
          return rest;
        }
        return article;
      });
      
      await onSubmit({ ...data, articoli: finalArticles } as OrdineAcquisto);
      console.log("ModalOrdineAcquistoForm: onSubmit successful.");
      onClose();
    } catch (error) {
      console.error("ModalOrdineAcquistoForm: Error during form submission:", error);
      toast.error("Errore durante il salvataggio dell'ordine d'acquisto.");
    }
  };

  const handleAddArticle = () => {
    if (!ctnGeneratorInitialized || !fscCommessaGeneratorInitialized || !fustellaGeneratorInitialized || !pulitoreGeneratorInitialized || isCancelled) {
      toast.error("Generatore codici non pronto o ordine annullato. Riprova.");
      return;
    }
    
    const firstArticleDate = watchedArticles[0]?.data_consegna_prevista || new Date().toISOString().split('T')[0];
    const orderYear = new Date(watch('data_ordine')).getFullYear();

    let newArticle: ArticoloOrdineAcquisto = { 
      item_type: 'altro',
      quantita: undefined, 
      prezzo_unitario: undefined, 
      data_consegna_prevista: firstArticleDate,
      stato: 'in_attesa' as ArticoloOrdineAcquisto['stato'],
      cliente: '', lavoro: '',
      codice_ctn: '', tipologia_cartone: '', formato: '', grammatura: '', numero_fogli: undefined, fsc: false, alimentare: false, rif_commessa_fsc: '',
      fustella_codice: '', codice_fornitore_fustella: '', fustellatrice: '', resa_fustella: '', pulitore_codice_fustella: null, pinza_tagliata: false, tasselli_intercambiabili: false, nr_tasselli: null, incollatura: false, incollatrice: '', tipo_incollatura: '',
      codice_pulitore: '', fustella_parent_index: undefined, descrizione: '',
    };
    if (isCartoneFornitore) {
      newArticle = { ...newArticle, item_type: 'cartone', codice_ctn: generateNextCartoneCode(), numero_fogli: 1 };
      if (watchedArticles[0]?.fsc) {
        newArticle.fsc = true;
        newArticle.rif_commessa_fsc = generateNextFscCommessa(orderYear);
      }
    } else if (isFustelleFornitore) {
      newArticle = { ...newArticle, item_type: 'fustella', fustella_codice: generateNextFustellaCode(), quantita: 1 };
    } else {
      newArticle = { ...newArticle, item_type: 'altro', descrizione: '' };
    }
    append(newArticle);
  };

  const title = initialData?.id ? `Modifica Ordine d'Acquisto` : `Nuovo Ordine d'Acquisto`;
  const description = initialData?.id ? `Modifica i dettagli per l'ordine ${initialData.numero_ordine}.` : `Inserisci i dettagli per il nuovo ordine d'acquisto.`
  
  console.log("ModalOrdineAcquistoForm: Current form errors (at render):", errors);
  
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
          <form onSubmit={handleSubmit((data) => {
            // Clean the articles array before passing to the actual submit handler
            const cleanedData = {
              ...data,
              articoli: data.articoli.filter(Boolean), // Ensure no null/undefined articles
            };
            handleFormSubmit(cleanedData);
          })} className="grid gap-4 py-4">
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
                    {errors.numero_ordine && <p className="text-destructive text-xs mt-1">{errors.numero_ordine.message}</p>}
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
                    <PopoverContent className="w-[--radix-popobox-trigger-width] p-0">
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
                        selectedFornitore.tipo_fornitore === 'Cartone' ? "bg-green-500 hover:bg-green-600" : 
                        selectedFornitore.tipo_fornitore === 'Fustelle' ? "bg-purple-500 hover:bg-purple-600" : 
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
                  isFustelleFornitore={isFustelleFornitore}
                  remove={remove}
                  // update={update} // Pass update function
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