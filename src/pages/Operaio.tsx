import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Cartone } from '@/types';
import { formatFormato, formatFogli } from '@/utils/formatters';
import { LogOut, Search } from 'lucide-react';

export default function Operaio() {
  const { user, logout } = useAuth();
  const [codice, setCodice] = useState('');
  const [cartone, setCartone] = useState<Cartone | null>(null);
  const [quantita, setQuantita] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [scaricando, setScaricando] = useState(false);

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
    if (isNaN(qty) || qty <= 0) {
      toast.error('Quantità non valida');
      return;
    }

    if (qty > cartone.fogli) {
      toast.error(`Quantità disponibile: ${formatFogli(cartone.fogli)} fogli`);
      return;
    }

    setScaricando(true);

    try {
      const nuovaQuantita = cartone.fogli - qty;

      // Registra nel storico
      const notaCompleta = note.trim() 
        ? `${note} (Operaio: ${user.username})`
        : `Scarico da operaio: ${user.username}`;
      
      await supabase.from('storico').insert({
        codice: cartone.codice,
        tipo: 'scarico',
        quantita: qty,
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
      setNote('');
    } catch (error) {
      console.error('Errore scarico:', error);
      toast.error('Errore durante lo scarico');
    }

    setScaricando(false);
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-[hsl(210,40%,96%)]">
      {/* Header */}
      <div className="bg-[hsl(220,70%,50%)] text-white p-6 shadow-lg">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Scarico Magazzino</h1>
            <p className="text-white/90 mt-1">Operatore: {user?.username}</p>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            <LogOut className="mr-2 h-5 w-5" />
            Esci
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Ricerca */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold mb-6 text-[hsl(var(--foreground))]">
            Cerca Cartone
          </h2>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="codice" className="text-lg">Codice CTN</Label>
              <div className="flex gap-4 mt-2">
                <Input
                  id="codice"
                  type="text"
                  value={codice}
                  onChange={(e) => setCodice(e.target.value.toUpperCase())}
                  placeholder="Inserisci codice"
                  className="text-2xl h-16 flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && cercaCartone()}
                  disabled={loading}
                />
                <Button
                  onClick={cercaCartone}
                  disabled={loading}
                  size="lg"
                  className="h-16 px-8 text-lg"
                >
                  <Search className="mr-2 h-6 w-6" />
                  Cerca
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Risultato ricerca */}
        {cartone && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-6 text-green-600">
              Cartone Trovato
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 text-lg">
              <div>
                <p className="text-[hsl(var(--muted-foreground))]">Codice</p>
                <p className="font-bold text-2xl">{cartone.codice}</p>
              </div>
              <div>
                <p className="text-[hsl(var(--muted-foreground))]">Tipologia</p>
                <p className="font-semibold text-xl">{cartone.tipologia}</p>
              </div>
              <div>
                <p className="text-[hsl(var(--muted-foreground))]">Formato</p>
                <p className="font-semibold text-xl">{formatFormato(cartone.formato)}</p>
              </div>
              <div>
                <p className="text-[hsl(var(--muted-foreground))]">Grammatura</p>
                <p className="font-semibold text-xl">{cartone.grammatura}</p>
              </div>
              <div>
                <p className="text-[hsl(var(--muted-foreground))]">Cliente</p>
                <p className="font-semibold text-xl">{cartone.cliente}</p>
              </div>
              <div>
                <p className="text-[hsl(var(--muted-foreground))]">Fogli Disponibili</p>
                <p className="font-bold text-3xl text-green-600">
                  {formatFogli(cartone.fogli)}
                </p>
              </div>
            </div>

            {/* Scarico */}
            <div className="border-t pt-8 space-y-6">
              <div>
                <Label htmlFor="quantita" className="text-xl font-bold mb-4 block">
                  Quantità da Scaricare
                </Label>
                <Input
                  id="quantita"
                  type="number"
                  value={quantita}
                  onChange={(e) => setQuantita(e.target.value)}
                  placeholder="Inserisci quantità"
                  className="text-3xl h-20"
                  min="1"
                  max={cartone.fogli}
                  disabled={scaricando}
                />
              </div>

              <div>
                <Label htmlFor="note" className="text-xl font-bold mb-4 block">
                  Note (opzionale)
                </Label>
                <Textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Inserisci eventuali note..."
                  className="text-lg min-h-[100px] resize-none"
                  disabled={scaricando}
                />
              </div>

              <Button
                onClick={eseguiScarico}
                disabled={scaricando || !quantita}
                size="lg"
                className="w-full h-20 text-2xl bg-red-600 hover:bg-red-700"
              >
                {scaricando ? 'Scarico...' : 'SCARICA'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
