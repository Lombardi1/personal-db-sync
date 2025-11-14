import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Cartone } from '@/types';
import { formatFormato, formatFogli } from '@/utils/formatters';
import { LogOut, Search } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function Produzione() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [codice, setCodice] = useState('');
  const [cartone, setCartone] = useState<Cartone | null>(null);
  const [quantita, setQuantita] = useState('');
  const [ricavoFoglio, setRicavoFoglio] = useState('1');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [scaricando, setScaricando] = useState(false);
  const [codiciDisponibili, setCodiciDisponibili] = useState<string[]>([]);

  const cercaCartone = async () => {
    if (!codice.trim()) {
      toast.error('Inserisci il codice CTN');
      return;
    }

    setLoading(true);
    setCartone(null);
    setQuantita('');
    setNote('');

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
    } catch (error) {
      console.error('Errore ricerca:', error);
      toast.error('Errore durante la ricerca');
    }
    
    setLoading(false);
  };

  const eseguiScarico = async () => {
    if (!cartone || !quantita || !user) {
      toast.error('Dati mancanti');
      return;
    }

    const qty = parseInt(quantita);
    const ricavo = parseInt(ricavoFoglio);
    
    if (isNaN(qty) || qty <= 0) {
      toast.error('Quantità non valida');
      return;
    }

    const fogliEffettivi = Math.floor(qty / ricavo);
    
    if (fogliEffettivi < 1) {
      toast.error('⚠️ I fogli effettivi devono essere almeno 1.');
      return;
    }

    if (fogliEffettivi > cartone.fogli) {
      toast.error(`Quantità disponibile: ${formatFogli(cartone.fogli)} fogli`);
      return;
    }

    setScaricando(true);

    try {
      const nuovaQuantita = cartone.fogli - fogliEffettivi;

      // Registra nel storico
      const notaCompleta = note.trim() 
        ? `${note} (Produzione: ${user.username})`
        : `Scarico da produzione: ${user.username}`;
      
      await supabase.from('storico').insert({
        codice: cartone.codice,
        tipo: 'scarico',
        quantita: fogliEffettivi,
        data: new Date().toISOString(),
        note: notaCompleta
      });

      if (nuovaQuantita === 0) {
        // Sposta in esauriti
        await supabase.from('giacenza').delete().eq('codice', cartone.codice);
        await supabase.from('esauriti').insert({
          ...cartone,
          fogli: 0
        });
        toast.success('Scarico completato - Cartone esaurito');
      } else {
        // Aggiorna giacenza
        await supabase
          .from('giacenza')
          .update({ fogli: nuovaQuantita })
          .eq('codice', cartone.codice);
        toast.success('Scarico completato');
      }

      // Reset form
      setCartone(null);
      setCodice('');
      setQuantita('');
      setRicavoFoglio('1');
      setNote('');
      
      // Ricarica la lista dei codici disponibili
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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[hsl(210,40%,96%)]">
      {/* Header */}
      <div className="bg-[hsl(220,70%,50%)] text-white p-6 shadow-lg">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Scarico Magazzino</h1>
            <p className="text-white/90 mt-1">Produzione: {user?.username}</p>
          </div>
          <Button
            variant="ghost"
            size="lg"
            onClick={handleLogout}
            className="text-white hover:bg-white/20"
          >
            <LogOut className="mr-2 h-5 w-5" />
            Esci
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonna sinistra: Lista codici disponibili */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-4 sticky top-6">
              <h3 className="text-lg font-bold mb-3 text-[hsl(var(--foreground))]">
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
                      className="w-full text-left px-3 py-2 rounded hover:bg-[hsl(var(--accent))] transition-colors text-sm font-mono"
                    >
                      {cod}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* Colonna destra: Ricerca e dettagli */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-8 space-y-8">
              {/* Ricerca Cartone */}
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-[hsl(var(--foreground))]">
                  Cerca Cartone
                </h2>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label htmlFor="codice" className="text-lg">Codice CTN</Label>
                    <Input
                      id="codice"
                      type="text"
                      value={codice}
                      onChange={(e) => setCodice(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && cercaCartone()}
                      placeholder="Inserisci codice..."
                      className="text-2xl h-16 mt-2"
                      disabled={loading || scaricando}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={cercaCartone}
                      disabled={loading || scaricando}
                      size="lg"
                      className="h-16 px-8 text-lg"
                    >
                      <Search className="mr-2 h-6 w-6" />
                      {loading ? 'Ricerca...' : 'Cerca'}
                    </Button>
                  </div>
                </div>
              </div>

          {/* Dettagli Cartone */}
          {cartone && (
            <div className="space-y-6 border-t pt-6">
              <h3 className="text-xl font-bold text-[hsl(var(--foreground))]">
                Dettagli Cartone
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-[hsl(var(--muted))] p-4 rounded-lg">
                <div>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">Codice</p>
                  <p className="text-lg font-bold">{cartone.codice}</p>
                </div>
                <div>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">Fornitore</p>
                  <p className="text-lg font-bold">{cartone.fornitore}</p>
                </div>
                <div>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">Fogli Disponibili</p>
                  <p className="text-2xl font-bold text-[hsl(var(--primary))]">
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
              </div>

              {/* Form Scarico */}
              <div className="space-y-3 border-t pt-4">
                <h3 className="text-lg font-bold text-[hsl(var(--foreground))]">
                  Effettua Scarico
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="quantita" className="text-sm">
                      Quantità Fogli da Scaricare
                    </Label>
                    <Input
                      id="quantita"
                      type="number"
                      value={quantita}
                      onChange={(e) => setQuantita(e.target.value)}
                      placeholder="0"
                      className="text-xl h-12 mt-1"
                      disabled={scaricando}
                      min="1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="ricavo" className="text-sm">
                      Ricavo Foglio
                    </Label>
                    <select
                      id="ricavo"
                      value={ricavoFoglio}
                      onChange={(e) => setRicavoFoglio(e.target.value)}
                      className="w-full px-3 py-2 border border-[hsl(var(--border))] rounded-md focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10 text-xl h-12 mt-1"
                      disabled={scaricando}
                    >
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                      <option value="5">5</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="note" className="text-sm">
                      Note (opzionale)
                    </Label>
                    <Input
                      id="note"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Inserisci eventuali note..."
                      className="mt-1 h-12"
                      disabled={scaricando}
                    />
                  </div>
                </div>

                {quantita && parseInt(quantita) > 0 && (() => {
                  const fogliEffettivi = Math.floor(parseInt(quantita) / parseInt(ricavoFoglio));
                  return (
                    <div className="space-y-2">
                      <div className="p-3 bg-[hsl(199,100%,97%)] rounded-lg border-l-4 border-[hsl(var(--primary))]">
                        <div className="flex items-center gap-2">
                          <i className="fas fa-calculator text-[hsl(var(--primary))]"></i>
                          <span className="font-semibold text-[hsl(var(--primary))]">
                            Fogli effettivi da scaricare: {fogliEffettivi}
                          </span>
                        </div>
                        <div className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                          ({quantita} ÷ {ricavoFoglio} = {fogliEffettivi})
                        </div>
                      </div>
                      {fogliEffettivi > 0 && fogliEffettivi <= cartone.fogli && (
                        <div className="p-3 bg-[hsl(142,76%,94%)] rounded-lg border-l-4 border-[hsl(142,76%,36%)]">
                          <div className="flex items-center gap-2">
                            <i className="fas fa-box text-[hsl(142,76%,36%)]"></i>
                            <span className="font-semibold text-[hsl(142,76%,36%)]">
                              Rimanenza: {cartone.fogli - fogliEffettivi} fogli
                            </span>
                          </div>
                        </div>
                      )}
                      {fogliEffettivi > cartone.fogli && (
                        <div className="p-3 bg-[hsl(0,84%,94%)] rounded-lg border-l-4 border-[hsl(0,84%,60%)]">
                          <div className="flex items-center gap-2">
                            <i className="fas fa-exclamation-triangle text-[hsl(0,84%,60%)]"></i>
                            <span className="font-semibold text-[hsl(0,84%,60%)]">
                              Fogli effettivi superiori alla disponibilità!
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                <Button
                  onClick={eseguiScarico}
                  disabled={!quantita || scaricando}
                  size="lg"
                  className="w-full h-14 text-xl bg-red-600 hover:bg-red-700 text-white"
                  variant="destructive"
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
