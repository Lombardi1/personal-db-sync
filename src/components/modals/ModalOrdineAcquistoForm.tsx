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
import { generateNextFustellaCode, resetFustellaCodeGenerator, fetchMaxFustellaCodeFromDB } from '@/utils/fustellaUtils'; // Importa utilità Fustella
import { generateNextPulitoreCode, resetPulitoreCodeGenerator, fetchMaxPulitoreCodeFromDB } from '@/utils/pulitoreUtils'; // Importa utilità Pulitore

interface ModalOrdineAcquistoFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: OrdineAcquisto) => Promise<void>;
  initialData?: OrdineAcquisto | null;
  fornitori: Fornitore[];
  clienti: Cliente[];
}

const preprocessNumber = (val: any) => {
  if (typeof val === 'string' && val.trim() === '') return null;
  const cleanedVal = String(val).replace(',', '.');
  const num = Number(cleanedVal);
  return isNaN(num) ? null : num;
};

const articoloSchema = z.object({
  id: z.string().optional(),
  // Campi per Cartone
  codice_ctn: z.string().max(255, 'Codice CTN troppo lungo').nullable(),
  tipologia_cartone: z.string().max(255, 'Tipologia troppo lunga').nullable(),
  formato: z.string().max(50, 'Formato troppo lungo').nullable(),
  grammatura: z.string().max(50, 'Grammatura troppo lungo').nullable(),
  numero_fogli: z.preprocess(
    preprocessNumber,
    z.number().nullable()
  ),
  cliente: z.string().max(255, 'Cliente troppo lungo').nullable(),
  lavoro: z.string().max(255, 'Lavoro troppo lungo').nullable(),
  fsc: z.boolean().nullable(),
  alimentare: z.boolean().nullable(),
  rif_commessa_fsc: z.string().max(50, 'Rif. Commessa FSC troppo lungo').nullable(),

  // Campi per non-Cartone/non-Fustelle
  descrizione: z.string().max(255, 'Descrizione troppo lunga').nullable(),
  
  // Campi per Fustelle
  fustella_codice: z.string().max(255, 'Codice Fustella troppo lungo').nullable(),
  codice_fornitore_fustella: z.string().max(255, 'Codice Fornitore Fustella troppo lungo').nullable(),
  fustellatrice: z.string().max(255, 'Fustellatrice troppo lunga').nullable(),
  resa_fustella: z.string().max(50, 'Resa Fustella troppo lunga').nullable(),
  hasPulitore: z.boolean().nullable(),
  pulitore_codice_fustella: z.string().max(255, 'Codice Pulitore troppo lungo').nullable(),
  pinza_tagliata: z.boolean().nullable(),
  tasselli_intercambiabili: z.boolean().nullable(),
  nr_tasselli: z.preprocess(
    preprocessNumber,
    z.number().nullable()
  ),
  incollatura: z.boolean().nullable(),
  incollatrice: z.string().max(255, 'Incollatrice troppo lunga').nullable(),
  tipo_incollatura: z.string().max(255, 'Tipo Incollatura troppo lungo').nullable(),

  // Campi comuni
  quantita: z.preprocess(
    preprocessNumber,
    z.number().nullable()
  ),
  prezzo_unitario: z.preprocess(
    preprocessNumber,
    z.number().nullable()
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
        importo_totale: z.number().nullable(),
        note: z.string().max(1000, 'Note troppo lunghe').nullable(),
      }).superRefine((data, ctx) => {
        const selectedFornitore = fornitori.find(f => f.id === data.fornitore_id);
        const isCartoneFornitore = selectedFornitore?.tipo_fornitore === 'Cartone';
        const isFustelleFornitore = selectedFornitore?.tipo_fornitore === 'Fustelle';

        data.articoli.forEach((articolo, index) => {
          // Validazioni comuni a tutti gli articoli
          if (articolo.prezzo_unitario === null || articolo.prezzo_unitario < 0) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Il prezzo unitario è obbligatorio e non può essere negativo.', path: [`articoli`, index, `prezzo_unitario`] });
          }
          if (!articolo.data_consegna_prevista) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'La data di consegna prevista è obbligatoria per l\'articolo.', path: [`articoli`, index, `data_consegna_prevista`] });
          }

          if (isCartoneFornitore) {
            if (!articolo.tipologia_cartone) {
              ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'La tipologia cartone è obbligatoria.', path: [`articoli`, index, `tipologia_cartone`] });
            }
            if (!articolo.formato) {
              ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Il formato è obbligatorio.', path: [`articoli`, index, `formato`] });
            }
            if (!articolo.grammatura) {
              ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'La grammatura è obbligatoria.', path: [`articoli`, index, `grammatura`] });
            }
            if (articolo.numero_fogli === null || articolo.numero_fogli < 1) {
              ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Il numero di fogli è obbligatorio e deve essere almeno 1.', path: [`articoli`, index, `numero_fogli`] });
            }
            if (articolo.numero_fogli !== null && articolo.numero_fogli >= 1 && (articolo.quantita === null || articolo.quantita <= 0)) {
              ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'La quantità in kg calcolata deve essere positiva.', path: [`articoli`, index, `quantita`] });
            }
            if (!articolo.cliente) {
              ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Il cliente è obbligatorio.', path: [`articoli`, index, `cliente`] });
            }
            if (!articolo.lavoro) {
              ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Il lavoro è obbligatorio.', path: [`articoli`, index, `lavoro`] });
            }
            // Campi non consentiti per Cartone
            if (articolo.descrizione || articolo.fustella_codice || articolo.codice_fornitore_fustella || articolo.fustellatrice || articolo.resa_fustella || articolo.hasPulitore || articolo.pulitore_codice_fustella || articolo.pinza_tagliata || articolo.tasselli_intercambiabili || articolo.nr_tasselli || articolo.incollatura || articolo.incollatrice || articolo.tipo_incollatura) {
              ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Questi campi non devono essere usati per i fornitori di cartone.', path: [`articoli`, index, `descrizione`] });
            }
          } else if (isFustelleFornitore) {
            if (!articolo.fustella_codice) {
              ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Il codice fustella è obbligatorio.', path: [`articoli`, index, `fustella_codice`] });
            }
            if (!articolo.codice_fornitore_fustella) {
              ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Il codice fornitore fustella è obbligatorio.', path: [`articoli`, index, `codice_fornitore_fustella`] });
            }
            if (!articolo.fustellatrice) {
              ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'La fustellatrice è obbligatoria.', path: [`articoli`, index, `fustellatrice`] });
            }
            if (!articolo.resa_fustella) {
              ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'La resa fustella è obbligatoria.', path: [`articoli`, index, `resa_fustella`] });
            }
            if (articolo.quantita === null || articolo.quantita < 0.001) {
              ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'La quantità è obbligatoria e deve essere almeno 0.001.', path: [`articoli`, index, `quantita`] });
            }
            if (articolo.hasPulitore && articolo.pulitore_codice_fustella === null) {
              ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Il codice pulitore è obbligatorio se il pulitore è presente.', path: [`articoli`, index, `pulitore_codice_fustella`] });
            }
            if (articolo.tasselli_intercambiabili && (articolo.nr_tasselli === null || articolo.nr_tasselli < 0)) {
              ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Il numero di tasselli è obbligatorio se i tasselli sono intercambiabili.', path: [`articoli`, index, `nr_tasselli`] });
            }
            if (articolo.incollatura && (articolo.incollatrice === null || articolo.incollatrice === '' || articolo.tipo_incollatura === null || articolo.tipo_incollatura === '')) {
              ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Incollatrice e tipo incollatura sono obbligatori se l\'incollatura è presente.', path: [`articoli`, index, `incollatrice`] });
            }
            // Campi non consentiti per Fustelle
            if (articolo.codice_ctn || articolo.descrizione || articolo.tipologia_cartone || articolo.formato || articolo.grammatura || articolo.numero_fogli || articolo.cliente || articolo.lavoro || articolo.fsc || articolo.alimentare || articolo.rif_commessa_fsc) {
              ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Questi campi non devono essere usati per i fornitori di fustelle.', path: [`articoli`, index, `codice_ctn`] });
            }
          } else { // Fornitori di altro tipo (Inchiostro, Colla, Altro)
            if (!articolo.descrizione) {
              ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'La descrizione è obbligatoria.', path: [`articoli`, index, `descrizione`] });
            }
            if (articolo.quantita === null || articolo.quantita < 0.001) {
              ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'La quantità è obbligatoria e deve essere almeno 0.001.', path: [`articoli`, index, `quantita`] });
            }
            // Campi non consentiti per altri tipi di fornitori
            if (articolo.codice_ctn || articolo.tipologia_cartone || articolo.formato || articolo.grammatura || articolo.numero_fogli || articolo.cliente || articolo.lavoro || articolo.fsc || articolo.alimentare || articolo.rif_commessa_fsc || articolo.fustella_codice || articolo.codice_fornitore_fustella || articolo.fustellatrice || articolo.resa_fustella || articolo.hasPulitore || articolo.pulitore_codice_fustella || articolo.pinza_tagliata || articolo.tasselli_intercambiabili || articolo.nr_tasselli || articolo.incollatura || articolo.incollatrice || articolo.tipo_incollatura) {
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
            codice_ctn: art.codice_ctn || null, 
            data_consegna_prevista: art.data_consegna_prevista || defaultDateForNewArticle, 
            stato: (art.stato || 'in_attesa') as ArticoloOrdineAcquisto['stato'],
            numero_fogli: art.numero_fogli || null,
            quantita: art.quantita || null,
            fsc: art.fsc || false,
            alimentare: art.alimentare || false,
            rif_commessa_fsc: art.rif_commessa_fsc || null,
            // Fustelle fields
            fustella_codice: art.fustella_codice || null,
            codice_fornitore_fustella: art.codice_fornitore_fustella || null,
            fustellatrice: art.fustellatrice || null,
            resa_fustella: art.resa_fustella || null,
            hasPulitore: art.hasPulitore || false,
            pulitore_codice_fustella: art.pulitore_codice_fustella || null,
            pinza_tagliata: art.pinza_tagliata || false,
            tasselli_intercambiabili: art.tasselli_intercambiabili || false,
            nr_tasselli: art.nr_tasselli || null,
            incollatura: art.incollatura || false,
            incollatrice: art.incollatrice || null,
            tipo_incollatura: art.tipo_incollatura || null,
          }))
        : [{ 
            quantita: null, 
            numero_fogli: null, 
            prezzo_unitario: 0, 
            codice_ctn: null, 
            data_consegna_prevista: defaultDateForNewArticle, 
            stato: 'in_attesa' as ArticoloOrdineAcquisto['stato'],
            fsc: false,
            alimentare: false,
            rif_commessa_fsc: null,
            // Fustelle fields
            fustella_codice: null,
            codice_fornitore_fustella: null,
            fustellatrice: null,
            resa_fustella: null,
            hasPulitore: false,
            pulitore_codice_fustella: null,
            pinza_tagliata: false,
            tasselli_intercambiabili: false,
            nr_tasselli: null,
            incollatura: false,
            incollatrice: null,
            tipo_incollatura: null,
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
        note: null,
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
      quantita: null,
      numero_fogli: null,
      prezzo_unitario: 0, 
      codice_ctn: null, 
      data_consegna_prevista: new Date().toISOString().split('T')[0],
      stato: 'in_attesa',
      fsc: false,
      alimentare: false,
      rif_commessa_fsc: null,
      // Fustelle fields
      fustella_codice: null,
      codice_fornitore_fustella: null,
      fustellatrice: null,
      resa_fustella: null,
      hasPulitore: false,
      pulitore_codice_fustella: null,
      pinza_tagliata: false,
      tasselli_intercambiabili: false,
      nr_tasselli: null,
      incollatura: false,
      incollatrice: null,
      tipo_incollatura: null,
    };
    append(newArticle);

    setCtnGeneratorInitialized(false);
    setFscCommessaGeneratorInitialized(false);
    setFustellaGeneratorInitialized(false); // Reset anche il generatore Fustella
    setPulitoreGeneratorInitialized(false); // Reset anche il generatore Pulitore

    const orderYear = new Date(watch('data_ordine')).getFullYear();

    if (newIsCartoneFornitore) {
      const maxCode = await fetchMaxCartoneCodeFromDB();
      resetCartoneCodeGenerator(maxCode);
      setValue(`articoli.0.codice_ctn`, generateNextCartoneCode(), { shouldValidate: true });
      setValue(`articoli.0.numero_fogli`, 1, { shouldValidate: true });

      const maxFscCommessa = await fetchMaxFscCommessaFromDB(String(orderYear).slice(-2));
      resetFscCommessaGenerator(maxFscCommessa, orderYear);
    } else if (newIsFustelleFornitore) { // Nuova logica per Fustelle
      const maxFustellaCode = await fetchMaxFustellaCodeFromDB();
      resetFustellaCodeGenerator(maxFustellaCode);
      setValue(`articoli.0.fustella_codice`, generateNextFustellaCode(), { shouldValidate: true });
      setValue(`articoli.0.quantita`, 1, { shouldValidate: true }); // Quantità di default per fustelle

      const maxPulitoreCode = await fetchMaxPulitoreCodeFromDB();
      resetPulitoreCodeGenerator(maxPulitoreCode);
      // Il codice pulitore viene generato solo se hasPulitore è true
    } else {
      resetCartoneCodeGenerator(0);
      setValue(`articoli.0.quantita`, 1, { shouldValidate: true });
      resetFscCommessaGenerator(0, orderYear);
      resetFustellaCodeGenerator(0);
      resetPulitoreCodeGenerator(0);
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
                codice_ctn: art.codice_ctn || null, 
                data_consegna_prevista: art.data_consegna_prevista || defaultDateForNewArticle, 
                stato: (art.stato || 'in_attesa') as ArticoloOrdineAcquisto['stato'],
                numero_fogli: art.numero_fogli || null,
                quantita: art.quantita || null,
                fsc: art.fsc || false,
                alimentare: art.alimentare || false,
                rif_commessa_fsc: art.rif_commessa_fsc || null,
                // Fustelle fields
                fustella_codice: art.fustella_codice || null,
                codice_fornitore_fustella: art.codice_fornitore_fustella || null,
                fustellatrice: art.fustellatrice || null,
                resa_fustella: art.resa_fustella || null,
                hasPulitore: art.hasPulitore || false,
                pulitore_codice_fustella: art.pulitore_codice_fustella || null,
                pinza_tagliata: art.pinza_tagliata || false,
                tasselli_intercambiabili: art.tasselli_intercambiabili || false,
                nr_tasselli: art.nr_tasselli || null,
                incollatura: art.incollatura || false,
                incollatrice: art.incollatrice || null,
                tipo_incollatura: art.tipo_incollatura || null,
              }))
            : [{ 
                quantita: null, 
                numero_fogli: null, 
                prezzo_unitario: 0, 
                codice_ctn: null, 
                data_consegna_prevista: defaultDateForNewArticle, 
                stato: 'in_attesa' as ArticoloOrdineAcquisto['stato'],
                fsc: false,
                alimentare: false,
                rif_commessa_fsc: null,
                // Fustelle fields
                fustella_codice: null,
                codice_fornitore_fustella: null,
                fustellatrice: null,
                resa_fustella: null,
                hasPulitore: false,
                pulitore_codice_fustella: null,
                pinza_tagliata: false,
                tasselli_intercambiabili: false,
                nr_tasselli: null,
                incollatura: false,
                incollatrice: null,
                tipo_incollatura: null,
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
              note: null,
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

          const currentSelectedFornitore = fornitori.find((f) => f.id === dataToReset.fornitore_id);
          const currentIsCartoneFornitore = currentSelectedFornitore?.tipo_fornitore === 'Cartone';
          const currentIsFustelleFornitore = currentSelectedFornitore?.tipo_fornitore === 'Fustelle';

          if (dataToReset.articoli.length > 0) {
            dataToReset.articoli.forEach((article, index) => {
              if (currentIsCartoneFornitore) {
                if (article.codice_ctn === null) { // Check for null
                  setValue(`articoli.${index}.codice_ctn`, generateNextCartoneCode(), { shouldValidate: true });
                }
                if (article.numero_fogli === null) { // Check for null
                  setValue(`articoli.${index}.numero_fogli`, 1, { shouldValidate: true });
                }
                if (article.fsc && article.rif_commessa_fsc === null) { // Check for null
                  setValue(`articoli.${index}.rif_commessa_fsc`, generateNextFscCommessa(orderYear), { shouldValidate: true });
                }
              } else if (currentIsFustelleFornitore) {
                if (article.fustella_codice === null) { // Check for null
                  setValue(`articoli.${index}.fustella_codice`, generateNextFustellaCode(), { shouldValidate: true });
                }
                if (article.quantita === null) { // Check for null
                  setValue(`articoli.${index}.quantita`, 1, { shouldValidate: true });
                }
                if (article.hasPulitore && article.pulitore_codice_fustella === null) { // Check for null
                  setValue(`articoli.${index}.pulitore_codice_fustella`, generateNextPulitoreCode(), { shouldValidate: true });
                }
              } else { // Other types of suppliers
                if (article.quantita === null) { // Check for null
                  setValue(`articoli.${index}.quantita`, 1, { shouldValidate: true });
                }
              }
            });
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
    if (ctnGeneratorInitialized && fscCommessaGeneratorInitialized && fustellaGeneratorInitialized && pulitoreGeneratorInitialized) {
      fields.forEach((field, index) => {
        if (isCartoneFornitore) {
          if (field.numero_fogli === null) { // Check for null
            setValue(`articoli.${index}.numero_fogli`, 1, { shouldValidate: true });
          }
          if (field.fsc && field.rif_commessa_fsc === null) { // Check for null
            const orderYear = new Date(watch('data_ordine')).getFullYear();
            setValue(`articoli.${index}.rif_commessa_fsc`, generateNextFscCommessa(orderYear), { shouldValidate: true });
          } else if (!field.fsc && field.rif_commessa_fsc !== null) { // Check for not null
            setValue(`articoli.${index}.rif_commessa_fsc`, null, { shouldValidate: true });
          }
        } else if (isFustelleFornitore) { // Nuova logica per Fustelle
          if (field.quantita === null) { // Check for null
            setValue(`articoli.${index}.quantita`, 1, { shouldValidate: true });
          }
          if (field.hasPulitore && field.pulitore_codice_fustella === null) { // Check for null
            setValue(`articoli.${index}.pulitore_codice_fustella`, generateNextPulitoreCode(), { shouldValidate: true });
          } else if (!field.hasPulitore && field.pulitore_codice_fustella !== null) { // Check for not null
            setValue(`articoli.${index}.pulitore_codice_fustella`, null, { shouldValidate: true });
          }
          if (field.tasselli_intercambiabili && (field.nr_tasselli === null)) { // Check for null
            setValue(`articoli.${index}.nr_tasselli`, 0, { shouldValidate: true });
          } else if (!field.tasselli_intercambiabili && (field.nr_tasselli !== null)) { // Check for not null
            setValue(`articoli.${index}.nr_tasselli`, null, { shouldValidate: true });
          }
        } else { // Other types of suppliers
          if (field.codice_ctn !== null) { setValue(`articoli.${index}.codice_ctn`, null); } // Set to null
          if (field.numero_fogli !== null) { setValue(`articoli.${index}.numero_fogli`, null, { shouldValidate: true }); } // Set to null
          if (field.quantita === null) { setValue(`articoli.${index}.quantita`, 1, { shouldValidate: true }); } // Set to 1
          setValue(`articoli.${index}.fsc`, false, { shouldValidate: true });
          setValue(`articoli.${index}.alimentare`, false, { shouldValidate: true });
          setValue(`articoli.${index}.rif_commessa_fsc`, null, { shouldValidate: true }); // Set to null
          // Reset fustelle fields
          setValue(`articoli.${index}.fustella_codice`, null, { shouldValidate: true }); // Set to null
          setValue(`articoli.${index}.codice_fornitore_fustella`, null, { shouldValidate: true }); // Set to null
          setValue(`articoli.${index}.fustellatrice`, null, { shouldValidate: true }); // Set to null
          setValue(`articoli.${index}.resa_fustella`, null, { shouldValidate: true }); // Set to null
          setValue(`articoli.${index}.hasPulitore`, false, { shouldValidate: true });
          setValue(`articoli.${index}.pulitore_codice_fustella`, null, { shouldValidate: true }); // Set to null
          setValue(`articoli.${index}.pinza_tagliata`, false, { shouldValidate: true });
          setValue(`articoli.${index}.tasselli_intercambiabili`, false, { shouldValidate: true });
          setValue(`articoli.${index}.nr_tasselli`, null, { shouldValidate: true }); // Set to null
          setValue(`articoli.${index}.incollatura`, false, { shouldValidate: true });
          setValue(`articoli.${index}.incollatrice`, null, { shouldValidate: true }); // Set to null
          setValue(`articoli.${index}.tipo_incollatura`, null, { shouldValidate: true }); // Set to null
        }
      });
    }
  }, [isCartoneFornitore, isFustelleFornitore, fields, setValue, ctnGeneratorInitialized, fscCommessaGeneratorInitialized, fustellaGeneratorInitialized, pulitoreGeneratorInitialized, watch]);

  React.useEffect(() => {
    setValue('importo_totale', parseFloat(totalAmount.toFixed(3)));
  }, [totalAmount, setValue]);

  const handleFormSubmit = async (data: any) => {
    console.log("[ModalOrdineAcquistoForm] handleFormSubmit triggered."); // NEW LOG
    console.log("[ModalOrdineAcquistoForm] Raw form data:", JSON.stringify(data, null, 2)); // NEW LOG
    if (Object.keys(errors).length > 0) {
      console.error("[ModalOrdineAcquistoForm] Zod validation errors:", errors); // NEW LOG
      toast.error("Ci sono errori nel modulo. Controlla i campi evidenziati.");
      return;
    }
    try {
      await onSubmit(data as OrdineAcquisto);
      console.log("[ModalOrdineAcquistoForm] onSubmit successful."); // NEW LOG
      onClose();
    } catch (error) {
      console.error("Errore durante il salvataggio dell'ordine d'acquisto:", error);
      toast.error("Errore durante il salvataggio dell'ordine d'acquisto.");
    }
  };

  const handleAddArticle = () => {
    if (!ctnGeneratorInitialized || !fscCommessaGeneratorInitialized || !fustellaGeneratorInitialized || !pulitoreGeneratorInitialized) {
      toast.error("Generatore codici non pronto. Riprova.");
      return;
    }
    
    const firstArticleDate = watchedArticles[0]?.data_consegna_prevista || new Date().toISOString().split('T')[0];
    const orderYear = new Date(watch('data_ordine')).getFullYear();

    let newArticle: ArticoloOrdineAcquisto = { 
      quantita: null, 
      numero_fogli: null,
      prezzo_unitario: 0, 
      codice_ctn: null, 
      data_consegna_prevista: firstArticleDate,
      stato: 'in_attesa' as ArticoloOrdineAcquisto['stato'],
      fsc: false,
      alimentare: false,
      rif_commessa_fsc: null,
      // Fustelle fields
      fustella_codice: null,
      codice_fornitore_fustella: null,
      fustellatrice: null,
      resa_fustella: null,
      hasPulitore: false,
      pulitore_codice_fustella: null,
      pinza_tagliata: false,
      tasselli_intercambiabili: false,
      nr_tasselli: null,
      incollatura: false,
      incollatrice: null,
      tipo_incollatura: null,
    };
    if (isCartoneFornitore) {
      newArticle = { ...newArticle, codice_ctn: generateNextCartoneCode(), numero_fogli: 1 };
      if (watchedArticles[0]?.fsc) {
        newArticle.fsc = true;
        newArticle.rif_commessa_fsc = generateNextFscCommessa(orderYear);
      }
    } else if (isFustelleFornitore) { // Nuova logica per Fustelle
      newArticle = { ...newArticle, fustella_codice: generateNextFustellaCode(), quantita: 1 };
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
  
  console.log(`[ModalOrdineAcquistoForm] Button disabled state: isSubmitting=${isSubmitting}, isCancelled=${isCancelled}, final disabled=${isSubmitting || isCancelled}`);

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
          <form 
            onSubmit={(e) => {
              console.log("[ModalOrdineAcquistoForm] Native form onSubmit triggered."); // NEW LOG
              handleSubmit(handleFormSubmit)(e);
            }} 
            className="grid gap-4 py-4"
          >
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