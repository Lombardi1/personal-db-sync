import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Cartone, StoricoMovimento } from '@/types';
import { formatFormato, formatFogli, formatGrammatura } from '@/utils/formatters'; // Importa formatGrammatura
import { Search, Home, PlusCircle, MinusCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Header } from '@/components/Header';
import { useCartoni } from '@/hooks/useCartoni'; // Importa useCartoni

interface DischargeEntry {
  id: string;
  quantita: string;
  ricavoFoglio: string;
  note: string;
}

export default function Produzione() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [codice, setCodice] = useState('CTN-');
  const [cartone, setCartone] = useState<Cartone | null>(null);
  const [similarCartons, setSimilarCartons] = useState<Cartone[]>([]); // NUOVO STATO
  const [dischargeEntries, setDischargeEntries] = useState<DischargeEntry[]>([
    { id: Date.now().toString(), quantita: '', ricavoFoglio: '1', note: '' }
  ]);
  const [loading, setLoading] = useState(false);
  const [loadingSimilar, setLoadingSimilar] = useState(false); // NUOVO STATO
  const [scaricando, setScaricando] = useState(false);
  const [codiciDisponibili, setCodiciDisponibili] = useState<string[]>([]);

  const { scaricoFogli: scaricoFogliFromHook } = useCartoni(); // Ottieni scaricoFogli dal hook

  const handleCodiceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputValue = e.target.value;

    if (!inputValue.startsWith('CTN-')) {
      inputValue = 'CTN-' + inputValue.replace(/[^0-9]/g, '');
    }

    if (inputValue.length < 4) {
      setCodice('CTN-');
    } else {
      const numericPart = inputValue.substring(4).replace(/[^0-9]/g, '');
      setCodice('CTN-' + numericPart);
    }
  };

  const cercaCartone = async () => {
    if (!codice.trim() || codice === 'CTN-') {
      toast.error('Inserisci il codice CTN completo');
      return;
    }

    setLoading(true);
    setCartone(null);
    setSimilarCartons([]); // Reset similar cartons
    setDischargeEntries([{ id: Date.now().toString(), quantita: '', ricavoFoglio: '1', note: '' }]); // Reset entries
    
    try {
      const { data, error } = await supabase
        .from('giacenza')
        .select('*')
        .eq('codice', codice.trim())
        .single();

      if (error || !data) {
        toast.error('Cartone non trovato in giacenza');
        setLoading(false);
        return;
      }

      setCartone(data as Cartone);
      toast.success('Cartone trovato');

      // NUOVO: Cerca cartoni simili
      setLoadingSimilar(true);
      try {
        // Normalizza i valori di formato e grammatura per la query
        const formattedFormatoForQuery = formatFormato(data.formato);
        const formattedGrammaturaForQuery = formatGrammatura(data.grammatura);

        console.log(`[Produzione] Cartone trovato: Codice=${data.codice}, Formato DB='${data.formato}', Grammatura DB='${data.grammatura}'`);
        console.log(`[Produzione] Query per simili: Formato='${formattedFormatoForQuery}', Grammatura='${formattedGrammaturaForQuery}'`);

        const { data: similarData, error: similarError } = await supabase
          .from('giacenza')
          .select('codice, formato, grammatura, fogli') // Seleziona solo i campi necessari
          .eq('formato', formattedFormatoForQuery) // Usa il valore formattato per la query
          .eq('grammatura', formattedGrammaturaForQuery) // Usa il valore formattato per la query
          .neq('codice', data.codice); // Escludi il cartone corrente

        if (similarError) {
          console.error('Errore ricerca cartoni simili:', similarError);
          // Non mostrare un toast di errore all'utente per i cartoni simili, è un'informazione aggiuntiva
        } else if (similarData) {
          setSimilarCartons(similarData as Cartone[]);
          console.log(`[Produzione] Trovati ${similarData.length} cartoni simili.`);
        }
      } catch (similarFetchError) {
        console.error('Errore inatteso durante la ricerca di cartoni simili:', similarFetchError);
      } finally {
        setLoadingSimilar(false);
      }

    } catch (error) {
      console.error('Errore ricerca:', error);
      toast.error('Errore durante la ricerca');
    }
    
    setLoading(false);
  };

  const handleEntryChange = (index: number, field: keyof DischargeEntry, value: string) => {
    const newEntries = [...dischargeEntries];
    newEntries[index] = { ...newEntries[index], [field]: value };
    setDischargeEntries(newEntries);
  };

  const addDischargeEntry = () => {
    setDischargeEntries([...dischargeEntries, { id: Date.now().toString(), quantita: '', ricavoFoglio: '1', note: '' }]);
  };

  const removeDischargeEntry = (id: string) => {
    const newEntries = dischargeEntries.filter(entry => entry.id !== id);
    setDischargeEntries(newEntries.length > 0 ? newEntries : [{ id: Date.now().toString(), quantita: '', ricavoFoglio: '1', note: '' }]);
  };

  const eseguiScarico = async () => {
    if (!cartone || !user) {
      toast.error('Dati mancanti');
      return;
    }

    let totalFogliEffettivi = 0;
    const notePerScarico: string[] = [];

    for (const entry of dischargeEntries) {
      const qty = parseInt(entry.quantita);
      const ricavo = parseInt(entry.ricavoFoglio);

      if (isNaN(qty) || qty <= 0) {
        toast.error('Quantità non valida in una delle righe di scarico.');
        return;
      }
      if (isNaN(ricavo) || ricavo <= 0) {
        toast.error('Ricavo foglio non valido in una delle righe di scarico.');
        return;
      }

      const fogliEffettiviForEntry = Math.floor(qty / ricavo);
      if (fogliEffettiviForEntry < 1) {
        toast.error('⚠️ I fogli effettivi devono essere almeno 1 per ogni riga.');
        return;
      }
      totalFogliEffettivi += fogliEffettiviForEntry;

      const entryNote = entry.note.trim();
      notePerScarico.push(entryNote || `Scarico da produzione`);
    }

    if (totalFogliEffettivi > cartone.fogli) {
      const difference = totalFogliEffettivi - cartone.fogli;
      toast.error(`Quantità totale da scaricare (${formatFogli(totalFogliEffettivi)} fogli) supera la disponibilità (${formatFogli(cartone.fogli)} fogli) di ${formatFogli(difference)} fogli.`);
      return;
    }

    setScaricando(true);

    try {
      // Chiama la funzione scaricoFogli dal hook useCartoni
      const { error } = await scaricoFogliFromHook(cartone.codice, totalFogliEffettivi, notePerScarico.join('; '));

      if (error) {
        toast.error('Errore durante lo scarico');
        console.error('Errore scarico:', error);
      } else {
        toast.success(`Scarico di ${totalFogliEffettivi} fogli completato.`);
      }

      setCartone(null);
      setSimilarCartons([]); // Reset similar cartons after discharge
      setCodice('CTN-');
      setDischargeEntries([{ id: Date.now().toString(), quantita: '', ricavoFoglio: '1', note: '' }]); // Reset entries
      
      // Ricarica i codici disponibili dopo lo scarico
      const { data } = await supabase
        .from('giacenza')
        .select('codice')
        .order('codice');
      
      if (data) {
        setCodiciDisponibili(data.map(c => c.codice));
      }
    } catch (error) {
      console.error('Errore scarico:', error);
      toast.error('Errore durante lo scarico');
    }

    setScaricando(false);
  };

  useEffect(() => {
    const caricaCodici = async () => {
      const { data, error } = await supabase
        .from('giacenza')
        .select('codice, fornitore, tipologia')
        .order('codice');
      
      if (!error && data) {
        setCodiciDisponibili(data.map(c => c.codice));
      }
    };
    caricaCodici();
  }, []);

  const totalFogliEffettiviDisplay = dischargeEntries.reduce((sum, entry) => {
    const qty = parseInt(entry.quantita);
    const ricavo = parseInt(entry.ricavoFoglio);
    if (!isNaN(qty) && !isNaN(ricavo) && ricavo > 0) {
      return sum + Math.floor(qty / ricavo);
    }
    return sum;
  }, 0);

  const difference = cartone ? totalFogliEffettiviDisplay - cartone.fogli : 0;

  return (
    <div className="min-h-screen bg-[hsl(210,40%,96%)]">
      <Header 
        title="Scarico Magazzino" 
        activeTab="scarico-magazzino" 
        showUsersButton={false}
      />

      <div className="max-w-[1400px] mx-auto p-3 sm:p-5 md:px-8">
        <div className="flex justify-end mb-4">
          <Button onClick={() => navigate('/stampa-dashboard')} variant="outline" size="sm" className="text-sm">
            <Home className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
            Torna alla Dashboard
          </Button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-4 sticky top-6 border border-[hsl(var(--border))]">
              <h3 className="text-base sm:text-lg font-bold mb-3 text-[hsl(var(--foreground))]">
                Codici Disponibili ({codiciDisponibili.length})
              </h3>
              <ScrollArea className="h-[calc(100vh-250px)]">
                <div className="space-y-1">
                  {codiciDisponibili.map((cod) => (
                    <button
                      key={cod}
                      onClick={() => {
                        setCodice(cod);
                        setTimeout(() => {
                          const input = document.getElementById('codice') as HTMLInputElement;
                          if (input) {
                            input.focus();
                          }
                        }, 0);
                      }}
                      className="w-full text-left px-3 py-2 rounded hover:bg-[hsl(var(--accent))] transition-colors text-xs sm:text-sm font-mono"
                    >
                      {cod}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6 sm:p-8 space-y-6 sm:space-y-8 border border-[hsl(var(--border))]">
              <div className="space-y-3 sm:space-y-4">
                <h2 className="text-xl sm:text-2xl font-bold text-[hsl(var(--foreground))]">
                  Cerca Cartone
                </h2>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <div className="flex-1">
                    <Label htmlFor="codice" className="text-base sm:text-lg">Codice CTN</Label>
                    <Input
                      id="codice"
                      type="text"
                      value={codice}
                      onChange={handleCodiceChange}
                      onKeyDown={(e) => e.key === 'Enter' && cercaCartone()}
                      className="text-xl sm:text-2xl h-12 sm:h-16 mt-1 sm:mt-2"
                      disabled={loading || scaricando}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={cercaCartone}
                      disabled={loading || scaricando}
                      size="lg"
                      className="h-12 sm:h-16 px-6 sm:px-8 text-base sm:text-lg bg-[hsl(var(--danger))] hover:bg-[hsl(0,72%,40%)] text-white"
                    >
                      <Search className="mr-1 h-5 w-5 sm:mr-2 sm:h-6 sm:w-6" />
                      {loading ? 'Ricerca...' : 'Cerca'}
                    </Button>
                  </div>
                </div>
              </div>

          {cartone && (
            <div className="space-y-4 sm:space-y-6 border-t pt-4 sm:pt-6 border-[hsl(var(--border))]">
              <h3 className="text-lg sm:text-xl font-bold text-[hsl(var(--foreground))]">
                Dettagli Cartone
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-[hsl(var(--muted))] p-3 sm:p-4 rounded-lg border border-[hsl(var(--border))]">
                <div>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">Codice</p>
                  <p className="text-base sm:text-lg font-bold">{cartone.codice}</p>
                </div>
                <div>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">Fornitore</p>
                  <p className="text-base sm:text-lg font-bold">{cartone.fornitore}</p>
                </div>
                <div>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">Fogli Disponibili</p>
                  <p className="text-xl sm:text-2xl font-bold text-[hsl(var(--primary))]">
                    {formatFogli(cartone.fogli)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">Tipo</p>
                  <p className="text-sm">{cartone.tipologia}</p>
                </div>
                <div>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">Formato</p>
                  <p className="text-sm">{formatFormato(cartone.formato)}</p>
                </div>
                <div>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">Grammatura</p>
                  <p className="text-sm">{cartone.grammatura}</p>
                </div>
                <div>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">Cliente</p>
                  <p className="text-sm">{cartone.cliente || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">Lavoro</p>
                  <p className="text-sm">{cartone.lavoro || '-'}</p>
                </div>
              </div>

              {/* NUOVO: Sezione Cartoni Simili */}
              {loadingSimilar ? (
                <div className="text-center text-sm text-[hsl(var(--muted-foreground))]">Caricamento cartoni simili...</div>
              ) : similarCartons.length > 0 && (
                <div className="space-y-3 border-t pt-4 border-[hsl(var(--border))]">
                  <h3 className="text-base sm:text-lg font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
                    <i className="fas fa-clone text-[hsl(var(--primary))]"></i>
                    Cartoni Simili (stesso formato e grammatura)
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {similarCartons.map((simCartone) => (
                      <button
                        key={simCartone.codice}
                        onClick={() => {
                          setCodice(simCartone.codice);
                          // Rimosso: setCartone(null);
                          // Rimosso: setSimilarCartons([]);
                          setTimeout(() => cercaCartone(), 0); // Trigger search for the selected similar carton
                        }}
                        className="flex flex-col items-center justify-center p-2 bg-[hsl(var(--muted))] rounded-md border border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))] transition-colors text-xs sm:text-sm"
                        title={`Fogli: ${formatFogli(simCartone.fogli)}`}
                      >
                        <span className="font-bold text-[hsl(var(--primary))]">{simCartone.codice}</span>
                        <span className="text-[hsl(var(--muted-foreground))]">{formatFogli(simCartone.fogli)} fogli</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Form Scarico Multiplo */}
              <div className="space-y-3 border-t pt-4 border-[hsl(var(--border))]">
                <h3 className="text-base sm:text-lg font-bold text-[hsl(var(--foreground))]">
                  Effettua Scarico
                </h3>
                
                {dischargeEntries.map((entry, index) => (
                  <div key={entry.id} className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 border rounded-md bg-muted/50">
                    <div>
                      <Label htmlFor={`quantita-${entry.id}`} className="text-sm">
                        Quantità Fogli da Scaricare
                      </Label>
                      <Input
                        id={`quantita-${entry.id}`}
                        type="number"
                        value={entry.quantita}
                        onChange={(e) => handleEntryChange(index, 'quantita', e.target.value)}
                        placeholder="0"
                        className="text-lg sm:text-xl h-10 sm:h-12 mt-1"
                        disabled={scaricando}
                        min="1"
                      />
                    </div>

                    <div>
                      <Label htmlFor={`ricavo-${entry.id}`} className="text-sm">
                        Ricavo Foglio
                      </Label>
                      <Select
                        value={entry.ricavoFoglio}
                        onValueChange={(value) => handleEntryChange(index, 'ricavoFoglio', value)}
                        disabled={scaricando}
                      >
                        <SelectTrigger id={`ricavo-${entry.id}`} className="w-full h-10 sm:h-12 text-base sm:text-xl mt-1">
                          <SelectValue placeholder="Seleziona ricavo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1" className="text-sm">1</SelectItem>
                          <SelectItem value="2" className="text-sm">2</SelectItem>
                          <SelectItem value="3" className="text-sm">3</SelectItem>
                          <SelectItem value="4" className="text-sm">4</SelectItem>
                          <SelectItem value="5" className="text-sm">5</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <Label htmlFor={`note-${entry.id}`} className="text-sm">
                          Note (opzionale)
                        </Label>
                        <Input
                          id={`note-${entry.id}`}
                          value={entry.note}
                          onChange={(e) => handleEntryChange(index, 'note', e.target.value)}
                          placeholder="Inserisci note..."
                          className="mt-1 h-10 sm:h-12 text-sm"
                          disabled={scaricando}
                        />
                      </div>
                      {dischargeEntries.length > 1 && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          onClick={() => removeDischargeEntry(entry.id)}
                          disabled={scaricando}
                          className="h-10 w-10"
                        >
                          <MinusCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={addDischargeEntry}
                  disabled={scaricando}
                  className="w-full sm:w-auto text-sm mt-2"
                >
                  <PlusCircle className="mr-2 h-4 w-4" /> Aggiungi Riga Scarico
                </Button>

                {totalFogliEffettiviDisplay > 0 && (
                  <div className="space-y-2 mt-4">
                    <div className="p-3 bg-[hsl(199,100%,97%)] rounded-lg border-l-4 border-[hsl(var(--primary))]">
                      <div className="flex items-center gap-2">
                        <i className="fas fa-calculator text-[hsl(var(--primary))]"></i>
                        <span className="font-semibold text-sm sm:text-base text-[hsl(var(--primary))]">
                          Fogli effettivi totali da scaricare: {totalFogliEffettiviDisplay}
                        </span>
                      </div>
                    </div>
                    {cartone && totalFogliEffettiviDisplay <= cartone.fogli && (
                      <div className="p-3 bg-[hsl(142,76%,94%)] rounded-lg border-l-4 border-[hsl(142,76%,36%)]">
                        <div className="flex items-center gap-2">
                          <i className="fas fa-box text-[hsl(142,76%,36%)]"></i>
                          <span className="font-semibold text-sm sm:text-base text-[hsl(142,76%,36%)]">
                            Rimanenza: {cartone.fogli - totalFogliEffettiviDisplay} fogli
                          </span>
                        </div>
                      </div>
                    )}
                    {cartone && totalFogliEffettiviDisplay > cartone.fogli && (
                      <div className="p-3 bg-[hsl(0,84%,94%)] rounded-lg border-l-4 border-[hsl(0,84%,60%)]">
                        <div className="flex items-center gap-2">
                          <i className="fas fa-exclamation-triangle text-[hsl(0,84%,60%)]"></i>
                          <span className="font-semibold text-sm sm:text-base text-[hsl(0,84%,60%)]">
                            Fogli effettivi superiori alla disponibilità di {formatFogli(difference)} fogli!
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <Button
                  onClick={eseguiScarico}
                  disabled={totalFogliEffettiviDisplay === 0 || scaricando || (cartone && totalFogliEffettiviDisplay > cartone.fogli)}
                  size="lg"
                  className="w-full h-12 sm:h-14 text-lg sm:text-xl bg-[hsl(var(--danger))] hover:bg-[hsl(0,72%,40%)] text-white mt-4"
                >
                  {scaricando ? 'Scarico in corso...' : '🗑️ Conferma Scarico'}
                </Button>
              </div>
            </div>
          )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}