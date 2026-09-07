import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Search, FileText, Tag, Home } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Articolo, LavoroStampa } from '@/types/produzione';
import { generaSchedaProduzione as generaSchedaXLSX } from '@/utils/generatoreScheda';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

// Parole troppo generiche per contare come "match" nel punteggio di rilevanza
const STOPWORDS = new Set(['di', 'da', 'per', 'con', 'il', 'la', 'le', 'lo', 'gli', 'e', 'a', 'nr', 'n']);

function paroleRilevanti(testo: string): string[] {
  return testo
    .toLowerCase()
    .split(/[^a-z0-9àèéìòù]+/i)
    .filter(w => w.length > 1 && !STOPWORDS.has(w));
}

export default function GeneraDocumenti() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [lotti, setLotti] = useState<LavoroStampa[]>([]);
  const [articoli, setArticoli] = useState<Articolo[]>([]);
  const [lottoSelezionato, setLottoSelezionato] = useState<LavoroStampa | null>(null);
  const [articoliSelezionati, setArticoliSelezionati] = useState<Set<string>>(new Set());
  const [searchLotto, setSearchLotto] = useState('');
  const [searchArticolo, setSearchArticolo] = useState('');
  const [loading, setLoading] = useState(true);
  const [generatingScheda, setGeneratingScheda] = useState(false);

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

  // Selezionando un nuovo lotto, si riparte da zero con la selezione articoli
  const selezionaLotto = (lotto: LavoroStampa) => {
    setLottoSelezionato(lotto);
    setArticoliSelezionati(new Set());
    setSearchArticolo('');
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

  // Articoli dello stesso cliente del lotto selezionato, ordinati per
  // rilevanza rispetto al testo "lavoro" del lotto (i più simili in cima)
  const articoliDelCliente = useMemo(() => {
    if (!lottoSelezionato) return [];
    const clienteLotto = lottoSelezionato.cliente.trim().toLowerCase();
    const paroleLavoro = paroleRilevanti(lottoSelezionato.lavoro || '');

    const punteggio = (a: Articolo) => {
      const testoArticolo = `${a.descrizione || ''} ${a.linea || ''} ${a.codice || ''}`.toLowerCase();
      return paroleLavoro.reduce((acc, p) => acc + (testoArticolo.includes(p) ? 1 : 0), 0);
    };

    return articoli
      .filter(a => (a.cliente || '').trim().toLowerCase() === clienteLotto)
      .map(a => ({ articolo: a, punteggio: punteggio(a) }))
      .sort((x, y) => y.punteggio - x.punteggio || x.articolo.codice.localeCompare(y.articolo.codice))
      .map(x => x.articolo);
  }, [articoli, lottoSelezionato]);

  // Ulteriore ricerca testuale dentro il sottoinsieme già filtrato per cliente
  const articoliFiltrati = articoliDelCliente.filter(articolo => {
    const search = searchArticolo.toLowerCase();
    if (!search) return true;
    return (
      articolo.id.toLowerCase().includes(search) ||
      articolo.codice.toLowerCase().includes(search) ||
      (articolo.descrizione && articolo.descrizione.toLowerCase().includes(search)) ||
      (articolo.linea && articolo.linea.toLowerCase().includes(search))
    );
  });

  const toggleArticolo = (id: string) => {
    const newSet = new Set(articoliSelezionati);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setArticoliSelezionati(newSet);
  };

  const getArticoliSelezionatiArray = (): Articolo[] => {
    return articoli.filter(a => articoliSelezionati.has(a.id));
  };

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
      const fileName = await generaSchedaXLSX(lottoSelezionato, articoliArray, '', '');
      toast.success(`Scheda produzione scaricata: ${fileName}`);
    } catch (error: any) {
      console.error('Errore generazione scheda:', error);
      toast.error('Errore nella generazione scheda: ' + (error.message || 'errore sconosciuto'));
    } finally {
      setGeneratingScheda(false);
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(210,40%,96%)]">
      <Header />

      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[hsl(222.2,47.4%,11.2%)]">
              Genera Scheda Produzione
            </h1>
            <p className="text-[hsl(215.4,16.3%,46.9%)] mt-1">
              Seleziona il lotto: gli articoli dello stesso cliente compaiono già filtrati
            </p>
          </div>

          <Button variant="outline" onClick={() => navigate('/summary')} className="gap-2">
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
                        onClick={() => selezionaLotto(lotto)}
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
                {lottoSelezionato
                  ? `Articoli di ${lottoSelezionato.cliente} (${articoliDelCliente.length}) — ${articoliSelezionati.size} selezionati`
                  : 'Seleziona prima un lotto per vedere i suoi articoli'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Filtra per ID, codice, descrizione, linea..."
                    value={searchArticolo}
                    onChange={(e) => setSearchArticolo(e.target.value)}
                    className="pl-10"
                    disabled={!lottoSelezionato}
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
                        <TableHead>Linea</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!lottoSelezionato ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            Seleziona un lotto per vedere gli articoli del cliente
                          </TableCell>
                        </TableRow>
                      ) : loading ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8">
                            Caricamento...
                          </TableCell>
                        </TableRow>
                      ) : articoliFiltrati.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8">
                            Nessun articolo trovato per questo cliente
                          </TableCell>
                        </TableRow>
                      ) : (
                        articoliFiltrati.slice(0, 200).map((articolo) => (
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

        {/* SEZIONE 3: GENERAZIONE */}
        <Card>
          <CardHeader>
            <CardTitle>3. Genera Scheda</CardTitle>
            <CardDescription>
              Genera la scheda di produzione Excel per il lotto e gli articoli selezionati
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-6">
              <div className="text-sm space-y-1">
                <div className={lottoSelezionato ? 'text-green-600' : 'text-muted-foreground'}>
                  {lottoSelezionato ? '✓' : '○'} Lotto: {lottoSelezionato ? `${lottoSelezionato.lotto} - ${lottoSelezionato.cliente}` : 'Non selezionato'}
                </div>
                <div className={articoliSelezionati.size > 0 ? 'text-green-600' : 'text-muted-foreground'}>
                  {articoliSelezionati.size > 0 ? '✓' : '○'} Articoli: {articoliSelezionati.size}
                </div>
              </div>

              <Button
                onClick={handleGeneraScheda}
                disabled={!lottoSelezionato || articoliSelezionati.size === 0 || generatingScheda}
                className="gap-2 bg-green-600 hover:bg-green-700"
                size="lg"
              >
                <FileText className="h-5 w-5" />
                {generatingScheda ? 'Generazione in corso...' : 'Genera Scheda Produzione'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
