import React from 'react';
import { useFormContext } from 'react-hook-form';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Trash2, Check, ChevronsUpDown } from 'lucide-react';
import { OrdineAcquisto, ArticoloOrdineAcquisto, Cliente } from '@/types';
import { formatFormato, formatGrammatura } from '@/utils/formatters';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { generateNextFscCommessa } from '@/utils/fscUtils';
import { generateNextPulitoreCode } from '@/utils/pulitoreUtils'; // Importa la funzione di generazione del pulitore
import { generateNextFustellaCode } from '@/utils/fustellaUtils'; // Importa la funzione di generazione della fustella

interface OrdineAcquistoArticoloFormRowProps {
  index: number;
  isSubmitting: boolean;
  isCartoneFornitore: boolean;
  isFustelleFornitore: boolean;
  remove: (index?: number | number[]) => void;
  fieldsLength: number;
  clienti: Cliente[];
  isOrderCancelled: boolean;
  isNewOrder: boolean;
}

// Helper function to convert format (e.g., "102 x 72 cm" -> 1.02, 0.72)
const parseFormatoForCalculation = (formatoString: string | undefined): { lengthM: number; widthM: number } | null => {
  if (!formatoString) return null;
  let s = String(formatoString).trim();
  s = s.replace(/\s*cm$/i, '').trim();
  s = s.replace(/[×✕*]/g, 'x');
  const m = s.match(/(\d+(?:[\.,]\d+)?)\s*[xX]\s*(\d+(?:[\.,]\d+)?)/) || s.match(/(\d+(?:[\.,]\d+)?)\s+(\d+(?:[\.,]\d+)?)/);
  if (m) {
    const lengthCm = parseFloat(m[1].replace(',', '.'));
    const widthCm = parseFloat(m[2].replace(',', '.'));
    if (!isNaN(lengthCm) && !isNaN(widthCm)) {
      return { lengthM: lengthCm / 100, widthM: widthCm / 100 };
    }
  }
  return null;
};

// Helper function to convert grammatura (e.g., "300 g/m²" -> 300)
const parseGrammaturaForCalculation = (grammaturaString: string | undefined): number | null => {
  if (!grammaturaString) return null;
  const s = String(grammaturaString).trim().replace(/\s*g\/m²\s*$/i, '');
  const gramm = parseInt(s);
  return isNaN(gramm) ? null : gramm;
};

export function OrdineAcquistoArticoloFormRow({
  index,
  isSubmitting,
  isCartoneFornitore,
  isFustelleFornitore,
  remove,
  fieldsLength,
  clienti,
  isOrderCancelled,
  isNewOrder,
}: OrdineAcquistoArticoloFormRowProps) {
  const { register, setValue, watch, formState: { errors } } = useFormContext<OrdineAcquisto>();

  const watchedArticles = watch('articoli');
  const currentArticle = watchedArticles[index];
  const orderDate = watch('data_ordine');
  const orderYear = new Date(orderDate).getFullYear();
  
  console.log(`OrdineAcquistoArticoloFormRow[${index}]: currentArticle data:`, currentArticle);

  // Determine initial article type for Fustelle suppliers
  const [articleType, setArticleType] = React.useState<'fustella' | 'pulitore' | 'generico'>(() => {
    if (isFustelleFornitore) {
      if (currentArticle?.fustella_codice) return 'fustella';
      if (currentArticle?.descrizione && !currentArticle?.fustella_codice) return 'pulitore';
      return 'generico'; // Default for new articles in Fustelle supplier
    }
    return 'generico'; // For other suppliers, it's always generic
  });

  // Campi Cartone
  const currentFormato = currentArticle?.formato;
  const currentGrammatura = currentArticle?.grammatura;
  const currentNumeroFogli = currentArticle?.numero_fogli;
  const currentFsc = currentArticle?.fsc;
  const currentAlimentare = currentArticle?.alimentare;
  const currentRifCommessaFsc = currentArticle?.rif_commessa_fsc;

  // Campi Fustelle
  const currentFustellaCodice = currentArticle?.fustella_codice;
  const currentCodiceFornitoreFustella = currentArticle?.codice_fornitore_fustella;
  const currentFustellatrice = currentArticle?.fustellatrice;
  const currentResaFustella = currentArticle?.resa_fustella;
  const currentHasPulitore = currentArticle?.hasPulitore;
  const currentPulitoreCodiceFustella = currentArticle?.pulitore_codice_fustella;
  const currentPrezzoPulitore = currentArticle?.prezzo_pulitore; // Nuovo campo
  const currentPinzaTagliata = currentArticle?.pinza_tagliata;
  const currentTasselliIntercambiabili = currentArticle?.tasselli_intercambiabili;
  const currentNrTasselli = currentArticle?.nr_tasselli;
  const currentIncollatura = currentArticle?.incollatura;
  const currentIncollatrice = currentArticle?.incollatrice;
  const currentTipoIncollatura = currentArticle?.tipo_incollatura;

  // Campi Comuni (anche per Fustelle)
  const currentQuantita = currentArticle?.quantita;
  const currentStatoArticolo = currentArticle?.stato;
  const currentCliente = currentArticle?.cliente;
  const currentLavoro = currentArticle?.lavoro;
  const currentDescrizione = currentArticle?.descrizione;

  // State for controlled input values to retain formatting
  const [displayPrezzoUnitario, setDisplayPrezzoUnitario] = React.useState<string>(() => 
    currentArticle?.prezzo_unitario !== undefined && currentArticle.prezzo_unitario !== null
      ? currentArticle.prezzo_unitario.toFixed(3).replace('.', ',')
      : ''
  );
  const [displayPrezzoPulitore, setDisplayPrezzoPulitore] = React.useState<string>(() => // Nuovo stato
    currentArticle?.prezzo_pulitore !== undefined && currentArticle.prezzo_pulitore !== null
      ? currentArticle.prezzo_pulitore.toFixed(3).replace('.', ',')
      : ''
  );
  const [displayQuantita, setDisplayQuantita] = React.useState<string>(() => 
    !isCartoneFornitore && currentArticle?.quantita !== undefined && currentArticle.quantita !== null
      ? currentArticle.quantita.toFixed(3).replace('.', ',')
      : ''
  );

  // Calculate Quantita (kg) from Numero Fogli, Formato, and Grammatura for Cartone
  const calculatedQuantitaKg = React.useMemo(() => {
    if (!isCartoneFornitore) return 0;

    const formatDims = parseFormatoForCalculation(currentFormato);
    const gramm = parseGrammaturaForCalculation(currentGrammatura);
    const numeroFogli = currentNumeroFogli || 0;

    console.log(`[Article ${index}] Calc Quantita: Formato=${currentFormato}, Gramm=${currentGrammatura}, Fogli=${numeroFogli}`);
    console.log(`[Article ${index}] Parsed: formatDims=`, formatDims, `gramm=`, gramm);

    if (formatDims && gramm !== null && numeroFogli > 0 && formatDims.lengthM > 0 && formatDims.widthM > 0 && gramm > 0) {
      const areaM2PerSheet = formatDims.lengthM * formatDims.widthM;
      const weightPerSheetKg = (areaM2PerSheet * gramm) / 1000;
      console.log(`[Article ${index}] Calculated weightPerSheetKg: ${weightPerSheetKg}, Total Kg: ${weightPerSheetKg * numeroFogli}`);
      return weightPerSheetKg * numeroFogli;
    }
    console.log(`[Article ${index}] Calculated Quantita: 0 (conditions not met)`);
    return 0;
  }, [isCartoneFornitore, currentFormato, currentGrammatura, currentNumeroFogli]);

  // Update the 'quantita' field (which stores kg for cartone) whenever inputs change
  React.useEffect(() => {
    if (isCartoneFornitore) {
      console.log(`[Article ${index}] Setting quantita (kg) to: ${calculatedQuantitaKg.toFixed(3)}`);
      setValue(`articoli.${index}.quantita`, parseFloat(calculatedQuantitaKg.toFixed(3)), { shouldValidate: true });
    }
  }, [calculatedQuantitaKg, index, setValue, isCartoneFornitore]);

  // Gestione della generazione del rif_commessa_fsc quando FSC viene flaggato
  React.useEffect(() => {
    if (isCartoneFornitore && currentFsc && !currentRifCommessaFsc) {
      console.log(`[Article ${index}] Generating new FSC commessa.`);
      setValue(`articoli.${index}.rif_commessa_fsc`, generateNextFscCommessa(orderYear), { shouldValidate: true });
    } else if (isCartoneFornitore && !currentFsc && currentRifCommessaFsc) {
      console.log(`[Article ${index}] Clearing FSC commessa.`);
      setValue(`articoli.${index}.rif_commessa_fsc`, '', { shouldValidate: true });
    }
  }, [isCartoneFornitore, currentFsc, currentRifCommessaFsc, index, setValue, orderYear]);

  // Gestione della generazione del pulitore_codice_fustella quando hasPulitore viene flaggato (per Fustella)
  React.useEffect(() => {
    if (isFustelleFornitore && articleType === 'fustella' && currentHasPulitore && !currentPulitoreCodiceFustella) {
      console.log(`[Article ${index}] Generating new Pulitore code for Fustella.`);
      setValue(`articoli.${index}.pulitore_codice_fustella`, generateNextPulitoreCode(), { shouldValidate: true });
    } else if (isFustelleFornitore && articleType === 'fustella' && !currentHasPulitore && currentPulitoreCodiceFustella) {
      console.log(`[Article ${index}] Clearing Pulitore code for Fustella.`);
      setValue(`articoli.${index}.pulitore_codice_fustella`, '', { shouldValidate: true });
    }
  }, [isFustelleFornitore, articleType, currentHasPulitore, currentPulitoreCodiceFustella, index, setValue]);

  // Gestione del nr_tasselli quando tasselli_intercambiabili viene flaggato
  React.useEffect(() => {
    if (isFustelleFornitore && articleType === 'fustella' && currentTasselliIntercambiabili && (currentNrTasselli === undefined || currentNrTasselli === null)) {
      console.log(`[Article ${index}] Setting nr_tasselli to 0.`);
      setValue(`articoli.${index}.nr_tasselli`, 0, { shouldValidate: true });
    } else if (isFustelleFornitore && articleType === 'fustella' && !currentTasselliIntercambiabili && (currentNrTasselli !== undefined && currentNrTasselli !== null)) {
      console.log(`[Article ${index}] Clearing nr_tasselli.`);
      setValue(`articoli.${index}.nr_tasselli`, null, { shouldValidate: true });
    }
  }, [isFustelleFornitore, articleType, currentTasselliIntercambiabili, currentNrTasselli, index, setValue]);

  const itemTotal = (currentArticle?.quantita || 0) * (currentArticle?.prezzo_unitario || 0) + (currentArticle?.hasPulitore ? (currentArticle?.prezzo_pulitore || 0) : 0); // Aggiornato calcolo totale

  const [openClientCombobox, setOpenClientCombobox] = React.useState(false);

  // Handle article type change for Fustelle suppliers
  const handleArticleTypeChange = (newType: 'fustella' | 'pulitore' | 'generico') => {
    setArticleType(newType);
    // Clear all fields specific to Fustella/Pulitore/Cartone when type changes
    setValue(`articoli.${index}.codice_ctn`, '', { shouldValidate: true });
    setValue(`articoli.${index}.tipologia_cartone`, '', { shouldValidate: true });
    setValue(`articoli.${index}.formato`, '', { shouldValidate: true });
    setValue(`articoli.${index}.grammatura`, '', { shouldValidate: true });
    setValue(`articoli.${index}.numero_fogli`, undefined, { shouldValidate: true });
    setValue(`articoli.${index}.fsc`, false, { shouldValidate: true });
    setValue(`articoli.${index}.alimentare`, false, { shouldValidate: true });
    setValue(`articoli.${index}.rif_commessa_fsc`, '', { shouldValidate: true });
    setValue(`articoli.${index}.descrizione`, '', { shouldValidate: true });
    setValue(`articoli.${index}.fustella_codice`, '', { shouldValidate: true });
    setValue(`articoli.${index}.codice_fornitore_fustella`, '', { shouldValidate: true });
    setValue(`articoli.${index}.fustellatrice`, '', { shouldValidate: true });
    setValue(`articoli.${index}.resa_fustella`, '', { shouldValidate: true });
    setValue(`articoli.${index}.hasPulitore`, false, { shouldValidate: true });
    setValue(`articoli.${index}.pulitore_codice_fustella`, '', { shouldValidate: true });
    setValue(`articoli.${index}.prezzo_pulitore`, undefined, { shouldValidate: true }); // Reset prezzo pulitore
    setValue(`articoli.${index}.pinza_tagliata`, false, { shouldValidate: true });
    setValue(`articoli.${index}.tasselli_intercambiabili`, false, { shouldValidate: true });
    setValue(`articoli.${index}.nr_tasselli`, null, { shouldValidate: true });
    setValue(`articoli.${index}.incollatura`, false, { shouldValidate: true });
    setValue(`articoli.${index}.incollatrice`, '', { shouldValidate: true });
    setValue(`articoli.${index}.tipo_incollatura`, '', { shouldValidate: true });
    setValue(`articoli.${index}.quantita`, 1, { shouldValidate: true }); // Default quantity
    setValue(`articoli.${index}.prezzo_unitario`, 0, { shouldValidate: true }); // Default prezzo unitario
    setDisplayPrezzoUnitario('0,000');
    setDisplayPrezzoPulitore('');

    if (newType === 'fustella') {
      setValue(`articoli.${index}.fustella_codice`, generateNextFustellaCode(), { shouldValidate: true });
    } else if (newType === 'pulitore') {
      setValue(`articoli.${index}.pulitore_codice_fustella`, generateNextPulitoreCode(), { shouldValidate: true });
      setValue(`articoli.${index}.descrizione`, `Pulitore per fustella`, { shouldValidate: true }); // Descrizione predefinita
      setValue(`articoli.${index}.quantita`, 1, { shouldValidate: true }); // Quantità fissa per pulitore
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2 p-3 border rounded-md bg-muted/50 items-end">
      <div className="flex-1 grid grid-cols-1 gap-2 w-full">
        {isFustelleFornitore && (
          <div className="p-2 bg-gray-50 rounded-lg border">
            <h5 className="text-sm font-semibold mb-2 text-gray-700">Tipo Articolo</h5>
            <Select
              value={articleType}
              onValueChange={handleArticleTypeChange}
              disabled={isSubmitting || isOrderCancelled}
            >
              <SelectTrigger className="w-full text-sm">
                <SelectValue placeholder="Seleziona tipo articolo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="generico">Generico (es. Inchiostro, Colla)</SelectItem>
                <SelectItem value="fustella">Fustella</SelectItem>
                <SelectItem value="pulitore">Pulitore</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {isCartoneFornitore ? (
          <>
            {/* Section: Codice Identificativo Cartone */}
            <div className="p-2 bg-gray-50 rounded-lg border">
              <h5 className="text-sm font-semibold mb-2 text-gray-700">Codice Identificativo</h5>
              <div>
                <Label htmlFor={`articoli.${index}.codice_ctn`} className="text-xs">Codice CTN</Label>
                <Input
                  id={`articoli.${index}.codice_ctn`}
                  {...register(`articoli.${index}.codice_ctn`)}
                  readOnly
                  disabled={true}
                  className="text-sm font-mono font-bold bg-gray-100"
                />
                {errors.articoli?.[index]?.codice_ctn && <p className="text-destructive text-xs mt-1">{errors.articoli[index]?.codice_ctn?.message}</p>}
              </div>
            </div>

            <Separator className="my-1" />

            {/* Section: Dettagli Articolo Cartone */}
            <div className="p-2 bg-gray-50 rounded-lg border">
              <h5 className="text-sm font-semibold mb-2 text-gray-700">Dettagli Articolo</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                <div>
                  <Label htmlFor={`articoli.${index}.tipologia_cartone`} className="text-xs">Tipologia Cartone *</Label>
                  <Input
                    id={`articoli.${index}.tipologia_cartone`}
                    {...register(`articoli.${index}.tipologia_cartone`)}
                    placeholder="Es. Ondulato Triplo"
                    disabled={isSubmitting || isOrderCancelled}
                    className="text-sm"
                    onChange={(e) => setValue(`articoli.${index}.tipologia_cartone`, e.target.value, { shouldValidate: true })}
                  />
                  {errors.articoli?.[index]?.tipologia_cartone && <p className="text-destructive text-xs mt-1">{errors.articoli[index]?.tipologia_cartone?.message}</p>}
                </div>
                <div>
                  <Label htmlFor={`articoli.${index}.formato`} className="text-xs">Formato *</Label>
                  <Input
                    id={`articoli.${index}.formato`}
                    {...register(`articoli.${index}.formato`)}
                    placeholder="Es. 72 x 102"
                    disabled={isSubmitting || isOrderCancelled}
                    className="text-sm"
                    onChange={(e) => {
                      const cleanedValue = e.target.value.replace(/[^0-9xX\s.,]/g, '');
                      setValue(`articoli.${index}.formato`, cleanedValue, { shouldValidate: true });
                    }}
                    onBlur={(e) => {
                      const formattedValue = formatFormato(e.target.value);
                      setValue(`articoli.${index}.formato`, formattedValue, { shouldValidate: true });
                    }}
                  />
                  {errors.articoli?.[index]?.formato && <p className="text-destructive text-xs mt-1">{errors.articoli[index]?.formato?.message}</p>}
                </div>
                <div>
                  <Label htmlFor={`articoli.${index}.grammatura`} className="text-xs">Grammatura *</Label>
                  <Input
                    id={`articoli.${index}.grammatura`}
                    {...register(`articoli.${index}.grammatura`)}
                    placeholder="Es. 300"
                    disabled={isSubmitting || isOrderCancelled}
                    className="text-sm"
                    onChange={(e) => {
                      const cleanedValue = e.target.value.replace(/[^0-9]/g, '');
                      setValue(`articoli.${index}.grammatura`, cleanedValue, { shouldValidate: true });
                    }}
                    onBlur={(e) => {
                      const formattedValue = formatGrammatura(e.target.value);
                      setValue(`articoli.${index}.grammatura`, formattedValue, { shouldValidate: true });
                    }}
                  />
                  {errors.articoli?.[index]?.grammatura && <p className="text-destructive text-xs mt-1">{errors.articoli[index]?.grammatura?.message}</p>}
                </div>

                <div>
                  <Label htmlFor={`articoli.${index}.numero_fogli`} className="text-xs">Fogli *</Label>
                  <Input
                    id={`articoli.${index}.numero_fogli`}
                    type="number"
                    {...register(`articoli.${index}.numero_fogli`, { valueAsNumber: true })}
                    placeholder="0"
                    min="1"
                    disabled={isSubmitting || isOrderCancelled}
                    className="text-sm"
                  />
                  {errors.articoli?.[index]?.numero_fogli && <p className="text-destructive text-xs mt-1">{errors.articoli[index]?.numero_fogli?.message}</p>}
                </div>
                
                <div className="col-span-1">
                  <Label className="text-xs">Quantità (kg)</Label>
                  <Input
                    value={calculatedQuantitaKg.toFixed(0)}
                    readOnly
                    disabled={true}
                    className="text-sm font-bold bg-gray-100"
                  />
                </div>

                <div>
                  <Label htmlFor={`articoli.${index}.prezzo_unitario`} className="text-xs">Prezzo Unitario *</Label>
                  <div className="relative">
                    <Input
                      id={`articoli.${index}.prezzo_unitario`}
                      type="text"
                      value={displayPrezzoUnitario}
                      onChange={(e) => {
                        const rawValue = e.target.value;
                        setDisplayPrezzoUnitario(rawValue);
                        const numericValue = parseFloat(rawValue.replace(',', '.'));
                        if (!isNaN(numericValue)) {
                          setValue(`articoli.${index}.prezzo_unitario`, numericValue, { shouldValidate: true });
                        } else {
                          setValue(`articoli.${index}.prezzo_unitario`, undefined, { shouldValidate: true });
                        }
                      }}
                      onBlur={(e) => {
                        const numericValue = parseFloat(e.target.value.replace(',', '.'));
                        if (!isNaN(numericValue)) {
                          setDisplayPrezzoUnitario(numericValue.toFixed(3).replace('.', ','));
                        } else {
                          setDisplayPrezzoUnitario('');
                        }
                      }}
                      placeholder="Es. 0,870"
                      min="0"
                      disabled={isSubmitting || isOrderCancelled}
                      className="text-sm pr-10"
                    />
                    <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm text-muted-foreground pointer-events-none">
                      €/kg
                    </span>
                  </div>
                  {errors.articoli?.[index]?.prezzo_unitario && <p className="text-destructive text-xs mt-1">{errors.articoli[index]?.prezzo_unitario?.message}</p>}
                </div>
              </div>
            </div>

            <Separator className="my-1" />

            {/* Section: Dettagli Utilizzo Cartone */}
            <div className="p-2 bg-gray-50 rounded-lg border">
              <h5 className="text-sm font-semibold mb-2 text-gray-700">Dettagli Utilizzo</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <Label htmlFor={`articoli.${index}.cliente`} className="text-xs">Cliente *</Label>
                  <Popover open={openClientCombobox} onOpenChange={setOpenClientCombobox}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openClientCombobox}
                        className={cn(
                          "w-full justify-between text-sm",
                          !currentCliente && "text-muted-foreground"
                        )}
                        disabled={isSubmitting || isOrderCancelled}
                      >
                        {currentCliente
                          ? clienti.find((cliente) => cliente.nome === currentCliente)?.nome
                          : "Seleziona cliente..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <Command>
                        <CommandInput placeholder="Cerca cliente..." />
                        <CommandList>
                          <CommandEmpty>Nessun cliente trovato.</CommandEmpty>
                          <CommandGroup>
                            {clienti.map((cliente) => (
                              <CommandItem
                                key={cliente.id}
                                value={cliente.nome}
                                onSelect={() => {
                                  setValue(`articoli.${index}.cliente`, cliente.nome!, { shouldValidate: true });
                                  setOpenClientCombobox(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    currentCliente === cliente.nome ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {cliente.nome}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {errors.articoli?.[index]?.cliente && <p className="text-destructive text-xs mt-1">{errors.articoli[index]?.cliente?.message}</p>}
                </div>
                <div>
                  <Label htmlFor={`articoli.${index}.lavoro`} className="text-xs">Lavoro *</Label>
                  <Input
                    id={`articoli.${index}.lavoro`}
                    {...register(`articoli.${index}.lavoro`)}
                    placeholder="Es. LAV-2025-089"
                    disabled={isSubmitting || isOrderCancelled}
                    className="text-sm"
                  />
                  {errors.articoli?.[index]?.lavoro && <p className="text-destructive text-xs mt-1">{errors.articoli[index]?.lavoro?.message}</p>}
                </div>
              </div>
            </div>

            <Separator className="my-1" />

            {/* Section: Certificazioni Cartone */}
            <div className="p-2 bg-gray-50 rounded-lg border">
              <h5 className="text-sm font-semibold mb-2 text-gray-700">Certificazioni</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`articoli.${index}.fsc`}
                    {...register(`articoli.${index}.fsc`)}
                    checked={currentFsc}
                    disabled={isSubmitting || isOrderCancelled}
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                  <Label htmlFor={`articoli.${index}.fsc`} className="text-xs">FSC</Label>
                  {errors.articoli?.[index]?.fsc && <p className="text-destructive text-xs mt-1">{errors.articoli[index]?.fsc?.message}</p>}
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`articoli.${index}.alimentare`}
                    {...register(`articoli.${index}.alimentare`)}
                    checked={currentAlimentare}
                    disabled={isSubmitting || isOrderCancelled}
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                  <Label htmlFor={`articoli.${index}.alimentare`} className="text-xs">Alimentare</Label>
                  {errors.articoli?.[index]?.alimentare && <p className="text-destructive text-xs mt-1">{errors.articoli[index]?.alimentare?.message}</p>}
                </div>
                {currentFsc && (
                  <div className="md:col-span-2">
                    <Label htmlFor={`articoli.${index}.rif_commessa_fsc`} className="text-xs">Rif. Commessa FSC</Label>
                    <Input
                      id={`articoli.${index}.rif_commessa_fsc`}
                      {...register(`articoli.${index}.rif_commessa_fsc`)}
                      readOnly
                      disabled={true}
                      className="text-sm font-mono font-bold bg-gray-100"
                    />
                    {errors.articoli?.[index]?.rif_commessa_fsc && <p className="text-destructive text-xs mt-1">{errors.articoli[index]?.rif_commessa_fsc?.message}</p>}
                  </div>
                )}
              </div>
            </div>

            <Separator className="my-1" />

            {/* Section: Consegna Cartone */}
            <div className="p-2 bg-gray-50 rounded-lg border">
              <h5 className="text-sm font-semibold mb-2 text-gray-700">Consegna</h5>
              <div>
                <Label htmlFor={`articoli.${index}.data_consegna_prevista`} className="text-xs">Data Consegna Prevista *</Label>
                <Input
                  id={`articoli.${index}.data_consegna_prevista`}
                  type="date"
                  {...register(`articoli.${index}.data_consegna_prevista`)}
                  disabled={isSubmitting || isOrderCancelled}
                  className="text-sm"
                />
                {errors.articoli?.[index]?.data_consegna_prevista && <p className="text-destructive text-xs mt-1">{errors.articoli[index]?.data_consegna_prevista?.message}</p>}
              </div>
            </div>
          </>
        ) : isFustelleFornitore && articleType === 'fustella' ? ( // NUOVA SEZIONE PER FUSTELLE
          <>
            {/* Section: Codice Identificativo Fustella */}
            <div className="p-2 bg-gray-50 rounded-lg border">
              <h5 className="text-sm font-semibold mb-2 text-gray-700">Codice Identificativo</h5>
              <div>
                <Label htmlFor={`articoli.${index}.fustella_codice`} className="text-xs">Codice Fustella *</Label>
                <Input
                  id={`articoli.${index}.fustella_codice`}
                  {...register(`articoli.${index}.fustella_codice`)}
                  readOnly
                  disabled={true}
                  className="text-sm font-mono font-bold bg-gray-100"
                />
                {errors.articoli?.[index]?.fustella_codice && <p className="text-destructive text-xs mt-1">{errors.articoli[index]?.fustella_codice?.message}</p>}
              </div>
            </div>

            <Separator className="my-1" />

            {/* Section: Dettagli Fustella */}
            <div className="p-2 bg-gray-50 rounded-lg border">
              <h5 className="text-sm font-semibold mb-2 text-gray-700">Dettagli Fustella</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                <div>
                  <Label htmlFor={`articoli.${index}.codice_fornitore_fustella`} className="text-xs">Codice Fornitore *</Label>
                  <Input
                    id={`articoli.${index}.codice_fornitore_fustella`}
                    {...register(`articoli.${index}.codice_fornitore_fustella`)}
                    placeholder="Es. FOR-001"
                    disabled={isSubmitting || isOrderCancelled}
                    className="text-sm"
                  />
                  {errors.articoli?.[index]?.codice_fornitore_fustella && <p className="text-destructive text-xs mt-1">{errors.articoli[index]?.codice_fornitore_fustella?.message}</p>}
                </div>
                <div>
                  <Label htmlFor={`articoli.${index}.fustellatrice`} className="text-xs">Fustellatrice *</Label>
                  <Input
                    id={`articoli.${index}.fustellatrice`}
                    {...register(`articoli.${index}.fustellatrice`)}
                    placeholder="Es. Bobst 102"
                    disabled={isSubmitting || isOrderCancelled}
                    className="text-sm"
                  />
                  {errors.articoli?.[index]?.fustellatrice && <p className="text-destructive text-xs mt-1">{errors.articoli[index]?.fustellatrice?.message}</p>}
                </div>
                <div>
                  <Label htmlFor={`articoli.${index}.resa_fustella`} className="text-xs">Resa *</Label>
                  <Input
                    id={`articoli.${index}.resa_fustella`}
                    {...register(`articoli.${index}.resa_fustella`)}
                    placeholder="Es. 1/2"
                    disabled={isSubmitting || isOrderCancelled}
                    className="text-sm"
                  />
                  {errors.articoli?.[index]?.resa_fustella && <p className="text-destructive text-xs mt-1">{errors.articoli[index]?.resa_fustella?.message}</p>}
                </div>
                <div>
                  <Label htmlFor={`articoli.${index}.quantita`} className="text-xs">Quantità *</Label>
                  <Input
                    id={`articoli.${index}.quantita`}
                    type="text"
                    value={displayQuantita}
                    onChange={(e) => {
                      const rawValue = e.target.value;
                      setDisplayQuantita(rawValue);
                      const numericValue = parseFloat(rawValue.replace(',', '.'));
                      if (!isNaN(numericValue)) {
                        setValue(`articoli.${index}.quantita`, numericValue, { shouldValidate: true });
                      } else {
                        setValue(`articoli.${index}.quantita`, undefined, { shouldValidate: true });
                      }
                    }}
                    onBlur={(e) => {
                      const numericValue = parseFloat(e.target.value.replace(',', '.'));
                      if (!isNaN(numericValue)) {
                        setDisplayQuantita(numericValue.toFixed(3).replace('.', ','));
                      } else {
                        setDisplayQuantita('');
                      }
                    }}
                    placeholder="Es. 1"
                    min="0"
                    disabled={isSubmitting || isOrderCancelled}
                    className="text-sm"
                  />
                  {errors.articoli?.[index]?.quantita && <p className="text-destructive text-xs mt-1">{errors.articoli[index]?.quantita?.message}</p>}
                </div>
                <div>
                  <Label htmlFor={`articoli.${index}.prezzo_unitario`} className="text-xs">Prezzo Unitario *</Label>
                  <div className="relative">
                    <Input
                      id={`articoli.${index}.prezzo_unitario`}
                      type="text"
                      value={displayPrezzoUnitario}
                      onChange={(e) => {
                        const rawValue = e.target.value;
                        setDisplayPrezzoUnitario(rawValue);
                        const numericValue = parseFloat(rawValue.replace(',', '.'));
                        if (!isNaN(numericValue)) {
                          setValue(`articoli.${index}.prezzo_unitario`, numericValue, { shouldValidate: true });
                        } else {
                          setValue(`articoli.${index}.prezzo_unitario`, undefined, { shouldValidate: true });
                        }
                      }}
                      onBlur={(e) => {
                        const numericValue = parseFloat(e.target.value.replace(',', '.'));
                        if (!isNaN(numericValue)) {
                          setDisplayPrezzoUnitario(numericValue.toFixed(3).replace('.', ','));
                        } else {
                          setDisplayPrezzoUnitario('');
                        }
                      }}
                      placeholder="Es. 150,00"
                      min="0"
                      disabled={isSubmitting || isOrderCancelled}
                      className="text-sm pr-10"
                    />
                    <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm text-muted-foreground pointer-events-none">
                      €
                    </span>
                  </div>
                  {errors.articoli?.[index]?.prezzo_unitario && <p className="text-destructive text-xs mt-1">{errors.articoli[index]?.prezzo_unitario?.message}</p>}
                </div>
              </div>
            </div>

            <Separator className="my-1" />

            {/* Section: Dettagli Utilizzo Fustella (Cliente e Lavoro) */}
            <div className="p-2 bg-gray-50 rounded-lg border">
              <h5 className="text-sm font-semibold mb-2 text-gray-700">Dettagli Utilizzo</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <Label htmlFor={`articoli.${index}.cliente`} className="text-xs">Cliente *</Label>
                  <Popover open={openClientCombobox} onOpenChange={setOpenClientCombobox}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openClientCombobox}
                        className={cn(
                          "w-full justify-between text-sm",
                          !currentCliente && "text-muted-foreground"
                        )}
                        disabled={isSubmitting || isOrderCancelled}
                      >
                        {currentCliente
                          ? clienti.find((cliente) => cliente.nome === currentCliente)?.nome
                          : "Seleziona cliente..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <Command>
                        <CommandInput placeholder="Cerca cliente..." />
                        <CommandList>
                          <CommandEmpty>Nessun cliente trovato.</CommandEmpty>
                          <CommandGroup>
                            {clienti.map((cliente) => (
                              <CommandItem
                                key={cliente.id}
                                value={cliente.nome}
                                onSelect={() => {
                                  setValue(`articoli.${index}.cliente`, cliente.nome!, { shouldValidate: true });
                                  setOpenClientCombobox(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    currentCliente === cliente.nome ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {cliente.nome}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {errors.articoli?.[index]?.cliente && <p className="text-destructive text-xs mt-1">{errors.articoli[index]?.cliente?.message}</p>}
                </div>
                <div>
                  <Label htmlFor={`articoli.${index}.lavoro`} className="text-xs">Lavoro *</Label>
                  <Input
                    id={`articoli.${index}.lavoro`}
                    {...register(`articoli.${index}.lavoro`)}
                    placeholder="Es. LAV-2025-089"
                    disabled={isSubmitting || isOrderCancelled}
                    className="text-sm"
                  />
                  {errors.articoli?.[index]?.lavoro && <p className="text-destructive text-xs mt-1">{errors.articoli[index]?.lavoro?.message}</p>}
                </div>
              </div>
            </div>

            <Separator className="my-1" />

            {/* Section: Dettagli Pulitore e Tasselli */}
            <div className="p-2 bg-gray-50 rounded-lg border">
              <h5 className="text-sm font-semibold mb-2 text-gray-700">Pulitore e Tasselli</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`articoli.${index}.hasPulitore`}
                    {...register(`articoli.${index}.hasPulitore`)}
                    checked={currentHasPulitore}
                    disabled={isSubmitting || isOrderCancelled}
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                  <Label htmlFor={`articoli.${index}.hasPulitore`} className="text-xs">Ha Pulitore</Label>
                  {errors.articoli?.[index]?.hasPulitore && <p className="text-destructive text-xs mt-1">{errors.articoli[index]?.hasPulitore?.message}</p>}
                </div>
                {currentHasPulitore && (
                  <>
                    <div>
                      <Label htmlFor={`articoli.${index}.pulitore_codice_fustella`} className="text-xs">Codice Pulitore *</Label>
                      <Input
                        id={`articoli.${index}.pulitore_codice_fustella`}
                        {...register(`articoli.${index}.pulitore_codice_fustella`)}
                        readOnly
                        disabled={true}
                        className="text-sm font-mono font-bold bg-gray-100"
                      />
                      {errors.articoli?.[index]?.pulitore_codice_fustella && <p className="text-destructive text-xs mt-1">{errors.articoli[index]?.pulitore_codice_fustella?.message}</p>}
                    </div>
                    <div>
                      <Label htmlFor={`articoli.${index}.prezzo_pulitore`} className="text-xs">Prezzo Pulitore *</Label>
                      <div className="relative">
                        <Input
                          id={`articoli.${index}.prezzo_pulitore`}
                          type="text"
                          value={displayPrezzoPulitore}
                          onChange={(e) => {
                            const rawValue = e.target.value;
                            setDisplayPrezzoPulitore(rawValue);
                            const numericValue = parseFloat(rawValue.replace(',', '.'));
                            if (!isNaN(numericValue)) {
                              setValue(`articoli.${index}.prezzo_pulitore`, numericValue, { shouldValidate: true });
                            } else {
                              setValue(`articoli.${index}.prezzo_pulitore`, undefined, { shouldValidate: true });
                            }
                          }}
                          onBlur={(e) => {
                            const numericValue = parseFloat(e.target.value.replace(',', '.'));
                            if (!isNaN(numericValue)) {
                              setDisplayPrezzoPulitore(numericValue.toFixed(3).replace('.', ','));
                            } else {
                              setDisplayPrezzoPulitore('');
                            }
                          }}
                          placeholder="Es. 50,00"
                          min="0"
                          disabled={isSubmitting || isOrderCancelled}
                          className="text-sm pr-10"
                        />
                        <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm text-muted-foreground pointer-events-none">
                          €
                        </span>
                      </div>
                      {errors.articoli?.[index]?.prezzo_pulitore && <p className="text-destructive text-xs mt-1">{errors.articoli[index]?.prezzo_pulitore?.message}</p>}
                    </div>
                  </>
                )}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`articoli.${index}.pinza_tagliata`}
                    {...register(`articoli.${index}.pinza_tagliata`)}
                    checked={currentPinzaTagliata}
                    disabled={isSubmitting || isOrderCancelled}
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                  <Label htmlFor={`articoli.${index}.pinza_tagliata`} className="text-xs">Pinza Tagliata</Label>
                  {errors.articoli?.[index]?.pinza_tagliata && <p className="text-destructive text-xs mt-1">{errors.articoli[index]?.pinza_tagliata?.message}</p>}
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`articoli.${index}.tasselli_intercambiabili`}
                    {...register(`articoli.${index}.tasselli_intercambiabili`)}
                    checked={currentTasselliIntercambiabili}
                    disabled={isSubmitting || isOrderCancelled}
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                  <Label htmlFor={`articoli.${index}.tasselli_intercambiabili`} className="text-xs">Tasselli Intercambiabili</Label>
                  {errors.articoli?.[index]?.tasselli_intercambiabili && <p className="text-destructive text-xs mt-1">{errors.articoli[index]?.tasselli_intercambiabili?.message}</p>}
                </div>
                {currentTasselliIntercambiabili && (
                  <div>
                    <Label htmlFor={`articoli.${index}.nr_tasselli`} className="text-xs">Nr. Tasselli *</Label>
                    <Input
                      id={`articoli.${index}.nr_tasselli`}
                      type="number"
                      {...register(`articoli.${index}.nr_tasselli`, { valueAsNumber: true })}
                      placeholder="0"
                      min="0"
                      disabled={isSubmitting || isOrderCancelled}
                      className="text-sm"
                    />
                    {errors.articoli?.[index]?.nr_tasselli && <p className="text-destructive text-xs mt-1">{errors.articoli[index]?.nr_tasselli?.message}</p>}
                  </div>
                )}
              </div>
            </div>

            <Separator className="my-1" />

            {/* Section: Dettagli Incollatura */}
            <div className="p-2 bg-gray-50 rounded-lg border">
              <h5 className="text-sm font-semibold mb-2 text-gray-700">Incollatura</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`articoli.${index}.incollatura`}
                    {...register(`articoli.${index}.incollatura`)}
                    checked={currentIncollatura}
                    disabled={isSubmitting || isOrderCancelled}
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                  <Label htmlFor={`articoli.${index}.incollatura`} className="text-xs">Incollatura</Label>
                  {errors.articoli?.[index]?.incollatura && <p className="text-destructive text-xs mt-1">{errors.articoli[index]?.incollatura?.message}</p>}
                </div>
                {currentIncollatura && (
                  <>
                    <div>
                      <Label htmlFor={`articoli.${index}.incollatrice`} className="text-xs">Incollatrice *</Label>
                      <Input
                        id={`articoli.${index}.incollatrice`}
                        {...register(`articoli.${index}.incollatrice`)}
                        placeholder="Es. Bobst Masterfold"
                        disabled={isSubmitting || isOrderCancelled}
                        className="text-sm"
                      />
                      {errors.articoli?.[index]?.incollatrice && <p className="text-destructive text-xs mt-1">{errors.articoli[index]?.incollatrice?.message}</p>}
                    </div>
                    <div>
                      <Label htmlFor={`articoli.${index}.tipo_incollatura`} className="text-xs">Tipo Incollatura *</Label>
                      <Input
                        id={`articoli.${index}.tipo_incollatura`}
                        {...register(`articoli.${index}.tipo_incollatura`)}
                        placeholder="Es. Lineare, 4 punti"
                        disabled={isSubmitting || isOrderCancelled}
                        className="text-sm"
                      />
                      {errors.articoli?.[index]?.tipo_incollatura && <p className="text-destructive text-xs mt-1">{errors.articoli[index]?.tipo_incollatura?.message}</p>}
                    </div>
                  </>
                )}
              </div>
            </div>

            <Separator className="my-1" />

            {/* Section: Consegna Fustella */}
            <div className="p-2 bg-gray-50 rounded-lg border">
              <h5 className="text-sm font-semibold mb-2 text-gray-700">Consegna</h5>
              <div>
                <Label htmlFor={`articoli.${index}.data_consegna_prevista`} className="text-xs">Data Consegna Prevista *</Label>
                <Input
                  id={`articoli.${index}.data_consegna_prevista`}
                  type="date"
                  {...register(`articoli.${index}.data_consegna_prevista`)}
                  disabled={isSubmitting || isOrderCancelled}
                  className="text-sm"
                />
                {errors.articoli?.[index]?.data_consegna_prevista && <p className="text-destructive text-xs mt-1">{errors.articoli[index]?.data_consegna_prevista?.message}</p>}
              </div>
            </div>
          </>
        ) : isFustelleFornitore && articleType === 'pulitore' ? ( // NUOVA SEZIONE PER PULITORE
          <>
            {/* Section: Codice Identificativo Pulitore */}
            <div className="p-2 bg-gray-50 rounded-lg border">
              <h5 className="text-sm font-semibold mb-2 text-gray-700">Codice Identificativo</h5>
              <div>
                <Label htmlFor={`articoli.${index}.pulitore_codice_fustella`} className="text-xs">Codice Pulitore *</Label>
                <Input
                  id={`articoli.${index}.pulitore_codice_fustella`}
                  {...register(`articoli.${index}.pulitore_codice_fustella`)}
                  readOnly
                  disabled={true}
                  className="text-sm font-mono font-bold bg-gray-100"
                />
                {errors.articoli?.[index]?.pulitore_codice_fustella && <p className="text-destructive text-xs mt-1">{errors.articoli[index]?.pulitore_codice_fustella?.message}</p>}
              </div>
            </div>

            <Separator className="my-1" />

            {/* Section: Dettagli Articolo Pulitore */}
            <div className="p-2 bg-gray-50 rounded-lg border">
              <h5 className="text-sm font-semibold mb-2 text-gray-700">Dettagli Articolo</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <Label htmlFor={`articoli.${index}.descrizione`} className="text-xs">Descrizione *</Label>
                  <Input
                    id={`articoli.${index}.descrizione`}
                    {...register(`articoli.${index}.descrizione`)}
                    placeholder="Descrizione articolo"
                    disabled={isSubmitting || isOrderCancelled}
                    className="text-sm"
                  />
                  {errors.articoli?.[index]?.descrizione && <p className="text-destructive text-xs mt-1">{errors.articoli[index]?.descrizione?.message}</p>}
                </div>
                <div>
                  <Label htmlFor={`articoli.${index}.quantita`} className="text-xs">Quantità *</Label>
                  <Input
                    id={`articoli.${index}.quantita`}
                    type="number"
                    {...register(`articoli.${index}.quantita`, { valueAsNumber: true })}
                    placeholder="1"
                    min="1"
                    disabled={isSubmitting || isOrderCancelled}
                    className="text-sm"
                  />
                  {errors.articoli?.[index]?.quantita && <p className="text-destructive text-xs mt-1">{errors.articoli[index]?.quantita?.message}</p>}
                </div>
                <div>
                  <Label htmlFor={`articoli.${index}.prezzo_unitario`} className="text-xs">Prezzo Unitario *</Label>
                  <div className="relative">
                    <Input
                      id={`articoli.${index}.prezzo_unitario`}
                      type="text"
                      value={displayPrezzoUnitario}
                      onChange={(e) => {
                        const rawValue = e.target.value;
                        setDisplayPrezzoUnitario(rawValue);
                        const numericValue = parseFloat(rawValue.replace(',', '.'));
                        if (!isNaN(numericValue)) {
                          setValue(`articoli.${index}.prezzo_unitario`, numericValue, { shouldValidate: true });
                        } else {
                          setValue(`articoli.${index}.prezzo_unitario`, undefined, { shouldValidate: true });
                        }
                      }}
                      onBlur={(e) => {
                        const numericValue = parseFloat(e.target.value.replace(',', '.'));
                        if (!isNaN(numericValue)) {
                          setDisplayPrezzoUnitario(numericValue.toFixed(3).replace('.', ','));
                        } else {
                          setDisplayPrezzoUnitario('');
                        }
                      }}
                      placeholder="Es. 50,00"
                      min="0"
                      disabled={isSubmitting || isOrderCancelled}
                      className="text-sm pr-10"
                    />
                    <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm text-muted-foreground pointer-events-none">
                      €
                    </span>
                  </div>
                  {errors.articoli?.[index]?.prezzo_unitario && <p className="text-destructive text-xs mt-1">{errors.articoli[index]?.prezzo_unitario?.message}</p>}
                </div>
              </div>
            </div>

            <Separator className="my-1" />

            {/* Section: Consegna Pulitore */}
            <div className="p-2 bg-gray-50 rounded-lg border">
              <h5 className="text-sm font-semibold mb-2 text-gray-700">Consegna</h5>
              <div>
                <Label htmlFor={`articoli.${index}.data_consegna_prevista`} className="text-xs">Data Consegna Prevista *</Label>
                <Input
                  id={`articoli.${index}.data_consegna_prevista`}
                  type="date"
                  {...register(`articoli.${index}.data_consegna_prevista`)}
                  disabled={isSubmitting || isOrderCancelled}
                  className="text-sm"
                />
                {errors.articoli?.[index]?.data_consegna_prevista && <p className="text-destructive text-xs mt-1">{errors.articoli[index]?.data_consegna_prevista?.message}</p>}
              </div>
            </div>
          </>
        ) : ( // Fornitori di altro tipo (Inchiostro, Colla, Altro)
          <>
            {/* Section: Dettagli Articolo (Non-Cartone/Non-Fustelle) */}
            <div className="p-2 bg-gray-50 rounded-lg border">
              <h5 className="text-sm font-semibold mb-2 text-gray-700">Dettagli Articolo</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <Label htmlFor={`articoli.${index}.descrizione`} className="text-xs">Descrizione *</Label>
                  <Input
                    id={`articoli.${index}.descrizione`}
                    {...register(`articoli.${index}.descrizione`)}
                    placeholder="Descrizione articolo"
                    disabled={isSubmitting || isOrderCancelled}
                    className="text-sm"
                  />
                  {errors.articoli?.[index]?.descrizione && <p className="text-destructive text-xs mt-1">{errors.articoli[index]?.descrizione?.message}</p>}
                </div>
                <div>
                  <Label htmlFor={`articoli.${index}.quantita`} className="text-xs">Quantità *</Label>
                  <Input
                    id={`articoli.${index}.quantita`}
                    type="text"
                    value={displayQuantita}
                    onChange={(e) => {
                      const rawValue = e.target.value;
                      setDisplayQuantita(rawValue);
                      const numericValue = parseFloat(rawValue.replace(',', '.'));
                      if (!isNaN(numericValue)) {
                        setValue(`articoli.${index}.quantita`, numericValue, { shouldValidate: true });
                      } else {
                        setValue(`articoli.${index}.quantita`, undefined, { shouldValidate: true });
                      }
                    }}
                    onBlur={(e) => {
                      const numericValue = parseFloat(e.target.value.replace(',', '.'));
                      if (!isNaN(numericValue)) {
                        setDisplayQuantita(numericValue.toFixed(3).replace('.', ','));
                      } else {
                        setDisplayQuantita('');
                      }
                    }}
                    placeholder="Es. 0,870"
                    min="0"
                    disabled={isSubmitting || isOrderCancelled}
                    className="text-sm"
                  />
                  {errors.articoli?.[index]?.quantita && <p className="text-destructive text-xs mt-1">{errors.articoli[index]?.quantita?.message}</p>}
                </div>
                <div>
                  <Label htmlFor={`articoli.${index}.prezzo_unitario`} className="text-xs">Prezzo Unitario *</Label>
                  <div className="relative">
                    <Input
                      id={`articoli.${index}.prezzo_unitario`}
                      type="text"
                      value={displayPrezzoUnitario}
                      onChange={(e) => {
                        const rawValue = e.target.value;
                        setDisplayPrezzoUnitario(rawValue);
                        const numericValue = parseFloat(rawValue.replace(',', '.'));
                        if (!isNaN(numericValue)) {
                          setValue(`articoli.${index}.prezzo_unitario`, numericValue, { shouldValidate: true });
                        } else {
                          setValue(`articoli.${index}.prezzo_unitario`, undefined, { shouldValidate: true });
                        }
                      }}
                      onBlur={(e) => {
                        const numericValue = parseFloat(e.target.value.replace(',', '.'));
                        if (!isNaN(numericValue)) {
                          setDisplayPrezzoUnitario(numericValue.toFixed(3).replace('.', ','));
                        } else {
                          setDisplayPrezzoUnitario('');
                        }
                      }}
                      placeholder="Es. 0,870"
                      min="0"
                      disabled={isSubmitting || isOrderCancelled}
                      className="text-sm pr-10"
                    />
                    <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm text-muted-foreground pointer-events-none">
                      €/unità
                    </span>
                  </div>
                  {errors.articoli?.[index]?.prezzo_unitario && <p className="text-destructive text-xs mt-1">{errors.articoli[index]?.prezzo_unitario?.message}</p>}
                </div>
                <div>
                  <Label htmlFor={`articoli.${index}.data_consegna_prevista`} className="text-xs">Data Consegna Prevista *</Label>
                  <Input
                    id={`articoli.${index}.data_consegna_prevista`}
                    type="date"
                    {...register(`articoli.${index}.data_consegna_prevista`)}
                    disabled={isSubmitting || isOrderCancelled}
                    className="text-sm"
                  />
                  {errors.articoli?.[index]?.data_consegna_prevista && <p className="text-destructive text-xs mt-1">{errors.articoli[index]?.data_consegna_prevista?.message}</p>}
                </div>
              </div>
            </div>
          </>
        )}
        {/* Campo Stato per l'articolo - VISIBILE SOLO SE NON È UN NUOVO ORDINE */}
        {!isNewOrder && (
          <div className="p-2 bg-gray-50 rounded-lg border">
            <h5 className="text-sm font-semibold mb-2 text-gray-700">Stato Articolo</h5>
            <div>
              <Label htmlFor={`articoli.${index}.stato`} className="text-xs">Stato Articolo *</Label>
              <Select
                onValueChange={(value: ArticoloOrdineAcquisto['stato']) => setValue(`articoli.${index}.stato`, value, { shouldValidate: true })}
                value={currentStatoArticolo || 'in_attesa'}
                disabled={isSubmitting || isOrderCancelled}
              >
                <SelectTrigger className="w-full text-sm">
                  <SelectValue placeholder="Seleziona stato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_attesa">In Attesa</SelectItem>
                  <SelectItem value="inviato">Inviato</SelectItem>
                  <SelectItem value="confermato">Confermato</SelectItem>
                  <SelectItem value="ricevuto">Ricevuto</SelectItem>
                  <SelectItem value="annullato">Annullato</SelectItem>
                </SelectContent>
              </Select>
              {errors.articoli?.[index]?.stato && <p className="text-destructive text-xs mt-1">{errors.articoli[index]?.stato?.message}</p>}
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
        <span className="text-sm font-semibold whitespace-nowrap">
          Totale: {itemTotal.toFixed(2)} €
        </span>
        <Button
          type="button"
          variant="destructive"
          size="icon"
          onClick={() => remove(index)}
          disabled={isSubmitting || fieldsLength === 1 || isOrderCancelled}
          className="h-7 w-7"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}