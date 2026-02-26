import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Plus, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AggiuntaRapidaLavoroProps {
  onSuccess: () => void;
}

export function AggiuntaRapidaLavoro({ onSuccess }: AggiuntaRapidaLavoroProps) {
  const [mostraForm, setMostraForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Stati per il form
  const [tipoLotto, setTipoLotto] = useState<'automatico' | 'esistente'>('automatico');
  const [lotto, setLotto] = useState('');
  const [lottiEsistenti, setLottiEsistenti] = useState<number[]>([]);

  // Campi principali
  const [cg, setCg] = useState('');
  const [mont, setMont] = useState('');
  const [cliente, setCliente] = useState('');
  const [lavoro, setLavoro] = useState('');
  const [identificativo, setIdentificativo] = useState('');
  const [ordineNr, setOrdineNr] = useState('');
  const [dataOrdine, setDataOrdine] = useState('');
  const [formato, setFormato] = useState('');
  const [quantita, setQuantita] = useState('');
  const [fogli, setFogli] = useState('');
  const [fogliM, setFogliM] = useState('');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');

  // Materiali
  const [cartone, setCartone] = useState('');
  const [taglio, setTaglio] = useState('');
  const [colori, setColori] = useState('');
  const [finitura, setFinitura] = useState('');
  const [polimero, setPolimero] = useState('');
  const [fustella, setFustella] = useState('');
  const [pinzaTg, setPinzaTg] = useState('');
  const [pvc, setPvc] = useState('');
  const [inc, setInc] = useState('');

  // Scatoloni
  const [qXMod, setQXMod] = useState('');
  const [quantitaScatoloni, setQuantitaScatoloni] = useState('');
  const [scatoloniUsati, setScatoloniUsati] = useState('');
  const [tipologiaScatolone, setTipologiaScatolone] = useState('');

  // Suggerimenti per autocomplete
  const [suggerimenti, setSuggerimenti] = useState<{
    clienti: string[];
    lavori: string[];
    cartoni: string[];
    colori: string[];
    finiture: string[];
    polimeri: string[];
    fustelle: string[];
    formati: string[];
  }>({
    clienti: [],
    lavori: [],
    cartoni: [],
    colori: [],
    finiture: [],
    polimeri: [],
    fustelle: [],
    formati: [],
  });

  useEffect(() => {
    if (mostraForm) {
      fetchLottiEsistenti();
      fetchSuggerimenti();
      if (tipoLotto === 'automatico') {
        calcolaLottoAutomatico();
      }
    }
  }, [mostraForm, tipoLotto]);

  const fetchLottiEsistenti = async () => {
    const { data, error } = await supabase
      .from('lavori_stampa')
      .select('lotto')
      .order('lotto', { ascending: false })
      .limit(50);

    if (!error && data) {
      const lotti = [...new Set(data.map(l => l.lotto))].sort((a, b) => b - a);
      setLottiEsistenti(lotti);
    }
  };

  const fetchSuggerimenti = async () => {
    const { data, error } = await supabase
      .from('lavori_stampa')
      .select('cliente, lavoro, cartone, colori, finitura, polimero, fustella, formato');

    if (!error && data) {
      setSuggerimenti({
        clienti: [...new Set(data.map(l => l.cliente).filter(Boolean))].sort(),
        lavori: [...new Set(data.map(l => l.lavoro).filter(Boolean))].sort(),
        cartoni: [...new Set(data.map(l => l.cartone).filter(Boolean))].sort(),
        colori: [...new Set(data.map(l => l.colori).filter(Boolean))].sort(),
        finiture: [...new Set(data.map(l => l.finitura).filter(Boolean))].sort(),
        polimeri: [...new Set(data.map(l => l.polimero).filter(Boolean))].sort(),
        fustelle: [...new Set(data.map(l => l.fustella).filter(Boolean))].sort(),
        formati: [...new Set(data.map(l => l.formato).filter(Boolean))].sort(),
      });
    }
  };

  const calcolaLottoAutomatico = async () => {
    const { data, error } = await supabase
      .from('lavori_stampa')
      .select('lotto')
      .order('lotto', { ascending: false })
      .limit(1);

    if (!error && data && data.length > 0) {
      setLotto(String(data[0].lotto + 1));
    } else {
      setLotto('1');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cliente || !lavoro || !lotto) {
      toast.error('Compila almeno Cliente, Lavoro e Lotto');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from('lavori_stampa').insert({
        lotto: parseInt(lotto),
        cg: cg || null,
        mont: mont || null,
        cliente,
        lavoro,
        identificativo: identificativo || null,
        ordine_nr: ordineNr || null,
        data_ordine: dataOrdine || null,
        formato: formato || null,
        quantita: quantita ? parseInt(quantita) : 0,
        fogli: fogli || null,
        fogli_m: fogliM || null,
        data,
        note: note || null,
        cartone: cartone || null,
        taglio: taglio || null,
        colori: colori || null,
        finitura: finitura || null,
        polimero: polimero || null,
        fustella: fustella || null,
        pinza_tg: pinzaTg || null,
        pvc: pvc || null,
        inc: inc || null,
        q_x_mod: qXMod ? parseInt(qXMod) : null,
        quantita_scatoloni: quantitaScatoloni ? parseInt(quantitaScatoloni) : null,
        scatoloni_usati: scatoloniUsati ? parseInt(scatoloniUsati) : null,
        tipologia_scatolone: tipologiaScatolone || null,
      });

      if (error) throw error;

      toast.success('Lavoro aggiunto con successo!');
      resetForm();
      setMostraForm(false);
      onSuccess();
    } catch (error: any) {
      console.error('Errore:', error);
      toast.error('Errore nell\'aggiunta del lavoro');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCg('');
    setMont('');
    setCliente('');
    setLavoro('');
    setIdentificativo('');
    setOrdineNr('');
    setDataOrdine('');
    setFormato('');
    setQuantita('');
    setFogli('');
    setFogliM('');
    setNote('');
    setCartone('');
    setTaglio('');
    setColori('');
    setFinitura('');
    setPolimero('');
    setFustella('');
    setPinzaTg('');
    setPvc('');
    setInc('');
    setQXMod('');
    setQuantitaScatoloni('');
    setScatoloniUsati('');
    setTipologiaScatolone('');
    setData(new Date().toISOString().split('T')[0]);
  };

  if (!mostraForm) {
    return (
      <Button
        onClick={() => setMostraForm(true)}
        className="bg-purple-600 hover:bg-purple-700"
        size="sm"
      >
        <Plus className="h-4 w-4 mr-2" />
        Aggiungi Rapido
      </Button>
    );
  }

  return (
    <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-purple-900">➕ Nuovo Lavoro - Compilazione Rapida</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setMostraForm(false);
            resetForm();
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2">
        {/* Riga 1: Lotto e Info Base */}
        <div className="grid grid-cols-12 gap-2">
          <div className="col-span-2">
            <label className="text-xs font-medium text-gray-700">Tipo Lotto</label>
            <Select value={tipoLotto} onValueChange={(val: 'automatico' | 'esistente') => setTipoLotto(val)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="automatico">🔢 Auto</SelectItem>
                <SelectItem value="esistente">📋 Esistente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-1">
            <label className="text-xs font-medium text-gray-700">Lotto*</label>
            {tipoLotto === 'automatico' ? (
              <Input value={lotto} readOnly className="h-8 text-xs bg-gray-100 font-bold" />
            ) : (
              <>
                <Input
                  value={lotto}
                  onChange={(e) => setLotto(e.target.value)}
                  list="lotti-list"
                  placeholder="#"
                  className="h-8 text-xs"
                  required
                />
                <datalist id="lotti-list">
                  {lottiEsistenti.map((l) => (
                    <option key={l} value={l} />
                  ))}
                </datalist>
              </>
            )}
          </div>

          <div className="col-span-1">
            <label className="text-xs font-medium text-gray-700">CG</label>
            <Input value={cg} onChange={(e) => setCg(e.target.value)} className="h-8 text-xs" />
          </div>

          <div className="col-span-1">
            <label className="text-xs font-medium text-gray-700">MONT</label>
            <Input value={mont} onChange={(e) => setMont(e.target.value)} className="h-8 text-xs" />
          </div>

          <div className="col-span-3">
            <label className="text-xs font-medium text-gray-700">Cliente*</label>
            <Input
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              list="clienti-list"
              placeholder="Nome cliente"
              className="h-8 text-xs"
              required
            />
            <datalist id="clienti-list">
              {suggerimenti.clienti.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>

          <div className="col-span-4">
            <label className="text-xs font-medium text-gray-700">Lavoro*</label>
            <Input
              value={lavoro}
              onChange={(e) => setLavoro(e.target.value)}
              list="lavori-list"
              placeholder="Descrizione lavoro"
              className="h-8 text-xs"
              required
            />
            <datalist id="lavori-list">
              {suggerimenti.lavori.map((l) => <option key={l} value={l} />)}
            </datalist>
          </div>
        </div>

        {/* Riga 2: Ordine e Quantità */}
        <div className="grid grid-cols-12 gap-2">
          <div className="col-span-2">
            <label className="text-xs font-medium text-gray-700">Identificativo</label>
            <Input value={identificativo} onChange={(e) => setIdentificativo(e.target.value)} className="h-8 text-xs" />
          </div>

          <div className="col-span-2">
            <label className="text-xs font-medium text-gray-700">Ordine Nr</label>
            <Input value={ordineNr} onChange={(e) => setOrdineNr(e.target.value)} className="h-8 text-xs" />
          </div>

          <div className="col-span-2">
            <label className="text-xs font-medium text-gray-700">Formato</label>
            <Input
              value={formato}
              onChange={(e) => setFormato(e.target.value)}
              list="formati-list"
              className="h-8 text-xs"
            />
            <datalist id="formati-list">
              {suggerimenti.formati.map((f) => <option key={f} value={f} />)}
            </datalist>
          </div>

          <div className="col-span-2">
            <label className="text-xs font-medium text-gray-700">Quantità</label>
            <Input type="number" value={quantita} onChange={(e) => setQuantita(e.target.value)} className="h-8 text-xs" />
          </div>

          <div className="col-span-1">
            <label className="text-xs font-medium text-gray-700">Fogli</label>
            <Input value={fogli} onChange={(e) => setFogli(e.target.value)} className="h-8 text-xs" />
          </div>

          <div className="col-span-1">
            <label className="text-xs font-medium text-gray-700">Fogli M</label>
            <Input value={fogliM} onChange={(e) => setFogliM(e.target.value)} className="h-8 text-xs" />
          </div>

          <div className="col-span-2">
            <label className="text-xs font-medium text-gray-700">Data</label>
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} className="h-8 text-xs" />
          </div>
        </div>

        {/* Riga 3: Materiali */}
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-700">Cartone</label>
                <Input
                  value={cartone}
                  onChange={(e) => setCartone(e.target.value)}
                  list="cartoni-list"
                  className="h-8 text-xs"
                />
                <datalist id="cartoni-list">
                  {suggerimenti.cartoni.map((c) => <option key={c} value={c} />)}
                </datalist>
              </div>

              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-700">Taglio</label>
                <Input value={taglio} onChange={(e) => setTaglio(e.target.value)} className="h-8 text-xs" />
              </div>

              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-700">Colori</label>
                <Input
                  value={colori}
                  onChange={(e) => setColori(e.target.value)}
                  list="colori-list"
                  className="h-8 text-xs"
                />
                <datalist id="colori-list">
                  {suggerimenti.colori.map((c) => <option key={c} value={c} />)}
                </datalist>
              </div>

              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-700">Finitura</label>
                <Input
                  value={finitura}
                  onChange={(e) => setFinitura(e.target.value)}
                  list="finiture-list"
                  className="h-8 text-xs"
                />
                <datalist id="finiture-list">
                  {suggerimenti.finiture.map((f) => <option key={f} value={f} />)}
                </datalist>
              </div>

              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-700">Polimero</label>
                <Input
                  value={polimero}
                  onChange={(e) => setPolimero(e.target.value)}
                  list="polimeri-list"
                  className="h-8 text-xs"
                />
                <datalist id="polimeri-list">
                  {suggerimenti.polimeri.map((p) => <option key={p} value={p} />)}
                </datalist>
              </div>

              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-700">Fustella</label>
                <Input
                  value={fustella}
                  onChange={(e) => setFustella(e.target.value)}
                  list="fustelle-list"
                  className="h-8 text-xs"
                />
                <datalist id="fustelle-list">
                  {suggerimenti.fustelle.map((f) => <option key={f} value={f} />)}
                </datalist>
              </div>
            </div>

            {/* Riga 4: Altri dettagli */}
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-700">Pinza TG</label>
                <Input value={pinzaTg} onChange={(e) => setPinzaTg(e.target.value)} className="h-8 text-xs" />
              </div>

              <div className="col-span-1">
                <label className="text-xs font-medium text-gray-700">PVC</label>
                <Input value={pvc} onChange={(e) => setPvc(e.target.value)} className="h-8 text-xs" />
              </div>

              <div className="col-span-1">
                <label className="text-xs font-medium text-gray-700">INC</label>
                <Input value={inc} onChange={(e) => setInc(e.target.value)} className="h-8 text-xs" />
              </div>

              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-700">Q x Mod</label>
                <Input type="number" value={qXMod} onChange={(e) => setQXMod(e.target.value)} className="h-8 text-xs" />
              </div>

              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-700">Qtà Scatoloni</label>
                <Input type="number" value={quantitaScatoloni} onChange={(e) => setQuantitaScatoloni(e.target.value)} className="h-8 text-xs" />
              </div>

              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-700">Scatoloni Usati</label>
                <Input type="number" value={scatoloniUsati} onChange={(e) => setScatoloniUsati(e.target.value)} className="h-8 text-xs" />
              </div>

              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-700">Tipo Scatolone</label>
                <Input value={tipologiaScatolone} onChange={(e) => setTipologiaScatolone(e.target.value)} className="h-8 text-xs" />
              </div>
            </div>

        {/* Note */}
        <div>
          <label className="text-xs font-medium text-gray-700">Note</label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="text-xs min-h-[60px]"
            placeholder="Note aggiuntive..."
          />
        </div>

        {/* Pulsanti */}
        <div className="flex gap-2 pt-2">
          <Button
            type="submit"
            disabled={loading}
            className="flex-1 h-9 bg-green-600 hover:bg-green-700"
          >
            {loading ? 'Salvataggio...' : '✓ Salva Lavoro'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={resetForm}
            className="h-9"
          >
            Pulisci
          </Button>
        </div>
      </form>

      <p className="text-xs text-gray-500 mt-2">
        * Campi obbligatori: Lotto, Cliente, Lavoro • Suggerimenti disponibili digitando
      </p>
    </div>
  );
}
