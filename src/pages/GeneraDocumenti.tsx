import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Search, FileText, Tag, Download, Home, PackageCheck, Printer } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Articolo, LavoroStampa } from '@/types/produzione';
import {
  generaSchedaProduzione as generaSchedaXLSX,
  generaEtichette as generaEtichetteXLSX,
  generaTutto as generaTuttoXLSX,
} from '@/utils/generatoreScheda';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function GeneraDocumenti() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Stati
  const [lotti, setLotti] = useState<LavoroStampa[]>([]);
  const [articoli, setArticoli] = useState<Articolo[]>([]);
  const [lottoSelezionato, setLottoSelezionato] = useState<LavoroStampa | null>(null);
  const [articoliSelezionati, setArticoliSelezionati] = useState<Set<string>>(new Set());
  const [searchLotto, setSearchLotto] = useState('');
  const [searchArticolo, setSearchArticolo] = useState('');
  const [cassetto, setCassetto] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [generatingScheda, setGeneratingScheda] = useState(false);
  const [generatingEtichette, setGeneratingEtichette] = useState(false);
  const [generatingTutto, setGeneratingTutto] = useState(false);

  // Carica dati iniziali
  useEffect(() => {
    fetchLotti();
    fetchArticoli();
  }, []);

  const fetchLotti = async () => {
    try {
      const { data, error } = await supabase
        .from('lavori_stampa')
        .select('*')
        .order('data', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLotti(data || []);
    } catch (error: any) {
      console.error('Errore caricamento lotti:', error);
      toast.error('Errore nel caricamento lotti');
    }
  };

  const fetchArticoli = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('db_articoli')
        .select('*')
        .order('codice', { ascending: true });

      if (error) throw error;
      setArticoli(data || []);
    } catch (error: any) {
      console.error('Errore caricamento articoli:', error);
      toast.error('Errore nel caricamento articoli');
    } finally {
      setLoading(false);
    }
  };

  // Filtra lotti
  const lottiFiltrati = lotti.filter(lotto => {
    const search = searchLotto.toLowerCase();
    return (
      lotto.lotto.toString().includes(search) ||
      lotto.cliente.toLowerCase().includes(search) ||
      (lotto.lavoro && lotto.lavoro.toLowerCase().includes(search))
    );
  });

  // Filtra articoli
  const articoliFiltrati = articoli.filter(articolo => {
    const search = searchArticolo.toLowerCase();
    return (
      articolo.id.toLowerCase().includes(search) ||
      articolo.codice.toLowerCase().includes(search) ||
      (articolo.descrizione && articolo.descrizione.toLowerCase().includes(search)) ||
      (articolo.cliente && articolo.cliente.toLowerCase().includes(search))
    );
  });

  // Toggle selezione articolo
  const toggleArticolo = (id: string) => {
    const newSet = new Set(articoliSelezionati);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setArticoliSelezionati(newSet);
  };

  // Recupera oggetti Articolo selezionati
  const getArticoliSelezionatiArray = (): Articolo[] => {
    return articoli.filter(a => articoliSelezionati.has(a.id));
  };

  // Genera scheda produzione
  const handleGeneraScheda = async () => {
    if (!lottoSelezionato) {
      toast.error('Seleziona un lotto prima di generare la scheda');
      return;
    }
    if (articoliSelezionati.size === 0) {
      toast.error('Seleziona almeno un articolo');
      return;
    }

    setGeneratingScheda(true);
    try {
      const articoliArray = getArticoliSelezionatiArray();
      const fileName = await generaSchedaXLSX(lottoSelezionato, articoliArray, cassetto, note);
      toast.success(`Scheda produzione scaricata: ${fileName}`);
    } catch (error: any) {
      console.error('Errore generazione scheda:', error);
      toast.error('Errore nella generazione scheda: ' + (error.message || 'errore sconosciuto'));
    } finally {
      setGeneratingScheda(false);
    }
  };

  // Genera etichette
  const handleGeneraEtichette = async () => {
    if (!lottoSelezionato) {
      toast.error('Seleziona un lotto prima di generare le etichette');
      return;
    }
    if (articoliSelezionati.size === 0) {
      toast.error('Seleziona almeno un articolo');
      return;
    }
    if (!cassetto.trim()) {
      toast.error('Inserisci il numero cassetto');
      return;
    }

    setGeneratingEtichette(true);
    try {
      const articoliArray = getArticoliSelezionatiArray();
      const fileNames = generaEtichetteXLSX(lottoSelezionato, articoliArray, cassetto);
      toast.success(`${fileNames.length} etichette scaricate!`);
    } catch (error: any) {
      console.error('Errore generazione etichette:', error);
      toast.error('Errore nella generazione etichette: ' + (error.message || 'errore sconosciuto'));
    } finally {
      setGeneratingEtichette(false);
    }
  };

  // Genera tutto (scheda + etichette)
  const handleGeneraTutto = async () => {
    if (!lottoSelezionato) {
      toast.error('Seleziona un lotto');
      return;
    }
    if (articoliSelezionati.size === 0) {
      toast.error('Seleziona almeno un articolo');
      return;
    }
    if (!cassetto.trim()) {
      toast.error('Inserisci il numero cassetto');
      return;
    }

    setGeneratingTutto(true);
    try {
      const articoliArray = getArticoliSelezionatiArray();
      const result = generaTuttoXLSX(lottoSelezionato, articoliArray, cassetto, note);
      toast.success(
        `Completato! Scheda + ${result.etichettaFiles.length} etichette scaricate`
      );
    } catch (error: any) {
      console.error('Errore generazione completa:', error);
      toast.error('Errore nella generazione: ' + (error.message || 'errore sconosciuto'));
    } finally {
      setGeneratingTutto(false);
    }
  };

  const isGenerating = generatingScheda || generatingEtichette || generatingTutto;

  return (
    <div className="min-h-screen bg-[hsl(210,40%,96%)]">
      <Header />

      <div className="container mx-auto p-6 space-y-6">
        {/* Header Pagina */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[hsl(222.2,47.4%,11.2%)]">
              Genera Scheda / Etichette
            </h1>
            <p className="text-[hsl(215.4,16.3%,46.9%)] mt-1">
              Seleziona lotto e articoli per generare i documenti di produzione
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => navigate('/summary')}
            className="gap-2"
          >
            <Home className="h-4 w-4" />
            Torna alla Dashboard
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* SEZIONE 1: SELEZIONE LOTTO */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                1. Seleziona Lotto
              </CardTitle>
              <CardDescription>
                Scegli il lotto di produzione da DB Lavori Stampa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cerca per numero lotto, cliente..."
                    value={searchLotto}
                    onChange={(e) => setSearchLotto(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <ScrollArea className="h-[400px] border rounded-lg">
                  <div className="p-2 space-y-2">
                    {lottiFiltrati.map((lotto) => (
                      <div
                        key={lotto.id}
                        onClick={() => setLottoSelezionato(lotto)}
                        className={`
                          p-3 rounded-lg border cursor-pointer transition-all
                          ${lottoSelezionato?.id === lotto.id
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'hover:bg-accent'}
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold">Lotto {lotto.lotto}</div>
                            <div className="text-sm opacity-80">{lotto.cliente}</div>
                            <div className="text-xs opacity-70">{lotto.lavoro}</div>
                          </div>
                          <Badge variant="outline">
                            {new Date(lotto.data).toLocaleDateString('it-IT')}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {lottoSelezionato && (
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="text-sm font-medium mb-2">Lotto Selezionato:</div>
                    <div className="space-y-1 text-sm">
                      <div><strong>Numero:</strong> {lottoSelezionato.lotto}</div>
                      <div><strong>Cliente:</strong> {lottoSelezionato.cliente}</div>
                      <div><strong>Lavoro:</strong> {lottoSelezionato.lavoro}</div>
                      <div><strong>Quantità:</strong> {lottoSelezionato.quantita?.toLocaleString()}</div>
                      {lottoSelezionato.ordine_nr && (
                        <div><strong>Ordine:</strong> {lottoSelezionato.ordine_nr}</div>
                      )}
                      {lottoSelezionato.cartone && (
                        <div><strong>Cartone:</strong> {lottoSelezionato.cartone}</div>
                      )}
                      {lottoSelezionato.colori && (
                        <div><strong>Colori:</strong> {lottoSelezionato.colori}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* SEZIONE 2: SELEZIONE ARTICOLI */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                2. Seleziona Articoli
              </CardTitle>
              <CardDescription>
                Scegli gli articoli da produrre ({articoliSelezionati.size} selezionati)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cerca per ID, codice, descrizione..."
                    value={searchArticolo}
                    onChange={(e) => setSearchArticolo(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {articoliSelezionati.size > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {getArticoliSelezionatiArray().map(art => (
                      <Badge
                        key={art.id}
                        variant="secondary"
                        className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => toggleArticolo(art.id)}
                      >
                        {art.codice} ×
                      </Badge>
                    ))}
                  </div>
                )}

                <ScrollArea className="h-[400px] border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Codice</TableHead>
                        <TableHead>Descrizione</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Linea</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            Caricamento...
                          </TableCell>
                        </TableRow>
                      ) : articoliFiltrati.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            Nessun articolo trovato
                          </TableCell>
                        </TableRow>
                      ) : (
                        articoliFiltrati.slice(0, 100).map((articolo) => (
                          <TableRow
                            key={articolo.id}
                            className={`cursor-pointer ${articoliSelezionati.has(articolo.id) ? 'bg-accent' : ''}`}
                            onClick={() => toggleArticolo(articolo.id)}
                          >
                            <TableCell>
                              <Checkbox
                                checked={articoliSelezionati.has(articolo.id)}
                                onCheckedChange={() => toggleArticolo(articolo.id)}
                              />
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {articolo.codice}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {articolo.descrizione || '-'}
                            </TableCell>
                            <TableCell>{articolo.cliente || '-'}</TableCell>
                            <TableCell>{articolo.linea || '-'}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SEZIONE 3: DATI AGGIUNTIVI E GENERAZIONE */}
        <Card>
          <CardHeader>
            <CardTitle>3. Dati Aggiuntivi e Generazione</CardTitle>
            <CardDescription>
              Completa i dati e genera i documenti
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Dati Aggiuntivi */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="cassetto">Cassetto Archiviazione *</Label>
                  <Input
                    id="cassetto"
                    value={cassetto}
                    onChange={(e) => setCassetto(e.target.value)}
                    placeholder="es: 15"
                  />
                </div>

                <div>
                  <Label htmlFor="note">Note (opzionale)</Label>
                  <Input
                    id="note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Note aggiuntive..."
                  />
                </div>
              </div>

              {/* Pulsanti Generazione */}
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="text-sm font-medium">Riepilogo:</div>
                  <div className="text-sm space-y-1">
                    <div className={lottoSelezionato ? 'text-green-600' : 'text-muted-foreground'}>
                      {lottoSelezionato ? '✓' : '○'} Lotto: {lottoSelezionato ? `${lottoSelezionato.lotto} - ${lottoSelezionato.cliente}` : 'Non selezionato'}
                    </div>
                    <div className={articoliSelezionati.size > 0 ? 'text-green-600' : 'text-muted-foreground'}>
                      {articoliSelezionati.size > 0 ? '✓' : '○'} Articoli: {articoliSelezionati.size}
                    </div>
                    <div className={cassetto ? 'text-green-600' : 'text-muted-foreground'}>
                      {cassetto ? '✓' : '○'} Cassetto: {cassetto || 'Non inserito'}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button
                    onClick={handleGeneraTutto}
                    disabled={!lottoSelezionato || articoliSelezionati.size === 0 || !cassetto || isGenerating}
                    className="w-full gap-2 bg-green-600 hover:bg-green-700"
                    size="lg"
                  >
                    <PackageCheck className="h-5 w-5" />
                    {generatingTutto ? 'Generazione in corso...' : 'Genera TUTTO (Scheda + Etichette)'}
                  </Button>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleGeneraScheda}
                      disabled={!lottoSelezionato || articoliSelezionati.size === 0 || isGenerating}
                      variant="outline"
                      className="flex-1 gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      {generatingScheda ? 'Generazione...' : 'Solo Scheda'}
                    </Button>

                    <Button
                      onClick={handleGeneraEtichette}
                      disabled={!lottoSelezionato || articoliSelezionati.size === 0 || !cassetto || isGenerating}
                      variant="outline"
                      className="flex-1 gap-2"
                    >
                      <Download className="h-4 w-4" />
                      {generatingEtichette ? 'Generazione...' : `Solo Etichette (${articoliSelezionati.size})`}
                    </Button>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                  <p><strong>Scheda Produzione:</strong> Excel con dati lotto, lista articoli e specifiche tecniche complete</p>
                  <p><strong>Etichette:</strong> Per ogni articolo, un file Excel con 5 fogli (Etichetta, Cartello, Codice, Pasta Lensi, Etichetta campioni)</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
