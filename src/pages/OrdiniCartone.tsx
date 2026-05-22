import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, Save, ChevronLeft, ChevronRight, Home, ShoppingCart, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { generateNextCartoneCode, resetCartoneCodeGenerator, fetchMaxCartoneCodeFromDB } from '@/utils/cartoneUtils';

interface OrdineCartone {
  id?: string;
  nr?: number | null;
  mese: string;
  anno: number;
  fornitore?: string;
  cartone?: string;
  grammatura?: string;
  formato?: string;
  nr_fogli_peso?: string;
  prezzo?: string;
  lavoro?: string;
  data_consegna_richiesta?: string;
  ordine_effettuato?: boolean;
  cliente?: string;
  data_consegna_confermata?: string;
  ordine_acquisto_id?: string | null;
  ordine_acquisto_numero?: string | null;
  isNew?: boolean;
  isDirty?: boolean;
}

const MESI = ['GENNAIO','FEBBRAIO','MARZO','APRILE','MAGGIO','GIUGNO','LUGLIO','AGOSTO','SETTEMBRE','OTTOBRE','NOVEMBRE','DICEMBRE'];


interface AnagraficaItem { id: string; nome: string; }

function AutocompleteInput({
  value, onChange, fetchFn, placeholder, className
}: {
  value: string;
  onChange: (val: string) => void;
  fetchFn: (q: string) => Promise<AnagraficaItem[]>;
  placeholder?: string;
  className?: string;
}) {
  const [suggestions, setSuggestions] = useState<AnagraficaItem[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    onChange(q);
    if (q.length >= 1) {
      const results = await fetchFn(q);
      setSuggestions(results);
      setOpen(results.length > 0);
    } else {
      setSuggestions([]);
      setOpen(false);
    }
  };

  const select = (nome: string) => {
    onChange(nome);
    setOpen(false);
    setSuggestions([]);
  };

  return (
    <div ref={ref} className="relative w-full">
      <Input
        value={value}
        onChange={handleChange}
        onFocus={async () => {
          if (value.length >= 1) {
            const results = await fetchFn(value);
            setSuggestions(results);
            setOpen(results.length > 0);
          }
        }}
        placeholder={placeholder}
        className={className}
      />
      {open && (
        <ul className="absolute z-50 top-full left-0 w-full bg-white border border-gray-200 rounded shadow-lg max-h-40 overflow-y-auto text-xs">
          {suggestions.map(s => (
            <li
              key={s.id}
              className="px-2 py-1 hover:bg-blue-50 cursor-pointer"
              onMouseDown={() => select(s.nome)}
            >
              {s.nome}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function OrdiniCartone() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const now = new Date();
  const [meseIdx, setMeseIdx] = useState(now.getMonth());
  const [anno, setAnno] = useState(now.getFullYear());
  const [righe, setRighe] = useState<OrdineCartone[]>([]);
  const [loading, setLoading] = useState(false);
  const [convertingIdx, setConvertingIdx] = useState<number | null>(null);
  const mese = MESI[meseIdx];

  const fetchFornitori = async (q: string): Promise<AnagraficaItem[]> => {
    const { data } = await supabase.from('fornitori').select('id, nome').ilike('nome', `%${q}%`).limit(8);
    return data || [];
  };

  const fetchClienti = async (q: string): Promise<AnagraficaItem[]> => {
    const { data } = await supabase.from('clienti').select('id, nome').ilike('nome', `%${q}%`).limit(8);
    return data || [];
  };


  const loadRighe = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ordini_cartone')
      .select('*')
      .eq('mese', mese)
      .eq('anno', anno)
      .order('nr', { ascending: true, nullsFirst: false });
    if (error) toast.error('Errore caricamento dati');
    else setRighe((data || []).map(r => ({ ...r, isNew: false, isDirty: false })));
    setLoading(false);
  }, [mese, anno]);

  useEffect(() => { loadRighe(); }, [loadRighe]);

  const mesePrecedente = () => { if (meseIdx === 0) { setMeseIdx(11); setAnno(a => a - 1); } else setMeseIdx(m => m - 1); };
  const meseSuccessivo = () => { if (meseIdx === 11) { setMeseIdx(0); setAnno(a => a + 1); } else setMeseIdx(m => m + 1); };

  const aggiungiRiga = () => {
    const maxNr = righe.reduce((max, r) => Math.max(max, r.nr || 0), 0);
    setRighe(prev => [...prev, {
      mese, anno, nr: maxNr + 1, isNew: true, isDirty: true,
      fornitore: '', cartone: '', grammatura: '', formato: '',
      nr_fogli_peso: '', prezzo: '', lavoro: '',
      data_consegna_richiesta: '', cliente: '', ordine_effettuato: false,
      data_consegna_confermata: '', ordine_acquisto_id: null, ordine_acquisto_numero: null
    }]);
  };

  const aggiornaRiga = (idx: number, field: keyof OrdineCartone, value: string | boolean | number) => {
    setRighe(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value, isDirty: true } : r));
  };

  const salvaRiga = async (idx: number) => {
    const riga = righe[idx];
    const payload = {
      nr: riga.nr, mese: riga.mese, anno: riga.anno,
      fornitore: riga.fornitore || '', cartone: riga.cartone || '',
      grammatura: riga.grammatura || '', formato: riga.formato || '',
      nr_fogli_peso: riga.nr_fogli_peso || '', prezzo: riga.prezzo || '',
      lavoro: riga.lavoro || '', cliente: riga.cliente || '', data_consegna_richiesta: riga.data_consegna_richiesta || '',
      ordine_effettuato: riga.ordine_effettuato || false,
      data_consegna_confermata: riga.data_consegna_confermata || '',
      ordine_acquisto_id: riga.ordine_acquisto_id || null,
      ordine_acquisto_numero: riga.ordine_acquisto_numero || null,
      updated_at: new Date().toISOString()
    };
    if (riga.isNew) {
      const { data, error } = await supabase.from('ordini_cartone').insert(payload).select().single();
      if (error) { toast.error('Errore salvataggio'); return; }
      setRighe(prev => prev.map((r, i) => i === idx ? { ...data, isNew: false, isDirty: false } : r));
    } else {
      const { error } = await supabase.from('ordini_cartone').update(payload).eq('id', riga.id!);
      if (error) { toast.error('Errore aggiornamento'); return; }
      setRighe(prev => prev.map((r, i) => i === idx ? { ...r, isDirty: false } : r));
    }
    toast.success('Salvato');
  };

  const eliminaRiga = async (idx: number) => {
    const riga = righe[idx];
    if (!riga.isNew && riga.id) {
      const { error } = await supabase.from('ordini_cartone').delete().eq('id', riga.id);
      if (error) { toast.error('Errore eliminazione'); return; }
    }
    setRighe(prev => prev.filter((_, i) => i !== idx));
    toast.success('Riga eliminata');
  };

  const convertiInOrdine = async (idx: number) => {
    const riga = righe[idx];

    // 1. Salva prima se e dirty
    if (riga.isDirty || riga.isNew) {
      toast.error('Salva la riga prima di convertirla in ordine');
      return;
    }

    setConvertingIdx(idx);
    try {
      // 2. Cerca fornitore per nome
      let fornitoreId: string | null = null;
      if (riga.fornitore) {
        const { data: fData } = await supabase
          .from('fornitori')
          .select('id, nome')
          .ilike('nome', `%${riga.fornitore}%`)
          .limit(1)
          .single();
        fornitoreId = fData?.id || null;
      }

      if (!fornitoreId) {
        toast.error(`Fornitore "${riga.fornitore}" non trovato in anagrafica. Aggiungilo prima.`);
        return;
      }

      // 3. Calcola prossimo numero ordine
      const currentYearShort = new Date().getFullYear().toString().slice(-2);
      const { data: ordiniEsistenti } = await supabase
        .from('ordini_acquisto')
        .select('numero_ordine')
        .like('numero_ordine', `%/${currentYearShort}`);

      let maxSeq = 0;
      (ordiniEsistenti || []).forEach(o => {
        const parts = o.numero_ordine?.split('/');
        if (parts?.length === 2) {
          const n = parseInt(parts[0]);
          if (!isNaN(n) && n > maxSeq) maxSeq = n;
        }
      });
      const numeroOrdine = `${maxSeq + 1}/${currentYearShort}`;

      // 4. Genera codice CTN
      const maxCTN = await fetchMaxCartoneCodeFromDB();
      resetCartoneCodeGenerator(maxCTN);
      const codiceCtn = generateNextCartoneCode();

      // 5. Parse numero fogli
      const nrFogliRaw = riga.nr_fogli_peso || '';
      const nrFogliMatch = nrFogliRaw.match(/[\d.,]+/);
      const nrFogli = nrFogliMatch
        ? parseInt(nrFogliMatch[0].replace('.', '').replace(',', ''))
        : 0;

      // 6. Parse prezzo unitario (EUR/kg -> valore numerico)
      const prezzoRaw = riga.prezzo || '';
      const prezzoMatch = prezzoRaw.replace(',', '.').match(/[\d.]+/);
      const prezzoUnitario = prezzoMatch ? parseFloat(prezzoMatch[0]) : 0;

      // 7. Parse data consegna
      const dataConsegnaRaw = riga.data_consegna_richiesta || '';
      let dataConsegna: string | undefined = undefined;
      const dateMatch = dataConsegnaRaw.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
      if (dateMatch) {
        const [, d, m, y] = dateMatch;
        const year = y.length === 2 ? `20${y}` : y;
        dataConsegna = `${year}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
      }

      // 8. Costruisci articolo
      const articolo = {
        codice_ctn: codiceCtn,
        tipologia_cartone: riga.cartone || '',
        formato: riga.formato || '',
        grammatura: riga.grammatura || '',
        numero_fogli: nrFogli,
        prezzo_unitario: prezzoUnitario,
        quantita: nrFogli, // kg da calcolare, usiamo fogli come quantita base
        cliente: riga.cliente || '',
        lavoro: riga.lavoro || '',
        data_consegna_prevista: dataConsegna || null,
        stato: 'in_attesa',
        fsc: false,
        alimentare: false,
        rif_commessa_fsc: '',
        descrizione: `${riga.cartone || ''} ${riga.grammatura || ''} ${riga.formato || ''}`.trim(),
        hasPulitore: false,
        incollatura: false,
        nr_tasselli: 0,
        incollatrice: '',
        fustellatrice: '',
        resa_fustella: '',
        pinza_tagliata: false,
        tasselli_intercambiabili: false,
        tipo_incollatura: '',
        pulitore_codice_fustella: '',
        codice_fornitore_fustella: '',
        prezzo_pulitore: null,
      };

      const importoTotale = nrFogli * prezzoUnitario;

      // 9. Inserisci in ordini_acquisto
      const { data: newOrdine, error: insertError } = await supabase
        .from('ordini_acquisto')
        .insert({
          fornitore_id: fornitoreId,
          numero_ordine: numeroOrdine,
          data_ordine: new Date().toISOString().split('T')[0],
          stato: 'in_attesa',
          articoli: [articolo],
          importo_totale: importoTotale,
          note: `Generato da Ordini Cartone - ${mese} ${anno}`,
        })
        .select()
        .single();

      if (insertError) {
        toast.error(`Errore creazione ordine: ${insertError.message}`);
        return;
      }

      // 10. Aggiorna la riga ordini_cartone con il riferimento
      await supabase
        .from('ordini_cartone')
        .update({
          ordine_acquisto_id: newOrdine.id,
          ordine_acquisto_numero: numeroOrdine,
          updated_at: new Date().toISOString()
        })
        .eq('id', riga.id!);

      setRighe(prev => prev.map((r, i) =>
        i === idx ? { ...r, ordine_acquisto_id: newOrdine.id, ordine_acquisto_numero: numeroOrdine, isDirty: false } : r
      ));

      toast.success(` Ordine d'acquisto ${numeroOrdine} creato! Clicca "Apri" per modificarlo.`);
    } catch (e: any) {
      toast.error(`Errore: ${e.message}`);
    } finally {
      setConvertingIdx(null);
    }
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center">Caricamento...</div>;
  if (!user) return <Navigate to="/login" replace />;

  const colStyle = "border border-gray-300 px-1 py-1 text-xs";

  return (
    <div className="min-h-screen bg-[hsl(210,40%,96%)]">
      <Header title="Ordini Cartone" activeTab="ordini-cartone" />
      <div className="max-w-[1600px] mx-auto p-3 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={mesePrecedente}><ChevronLeft className="h-4 w-4" /></Button>
            <h2 className="text-xl font-bold text-center">{mese} {anno}</h2>
            <Button variant="outline" size="sm" onClick={meseSuccessivo}><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/')}>
            <Home className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
        </div>

        <div className="overflow-x-auto rounded-lg shadow bg-white">
          <table className="w-full text-xs border-collapse min-w-[1400px]">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="border border-gray-600 px-2 py-2 w-10">NR</th>
                <th className="border border-gray-600 px-2 py-2 min-w-[110px]">FORNITORE</th>
                <th className="border border-gray-600 px-2 py-2 min-w-[110px]">CARTONE</th>
                <th className="border border-gray-600 px-2 py-2 min-w-[80px]">GRAMMATURA</th>
                <th className="border border-gray-600 px-2 py-2 min-w-[90px]">FORMATO</th>
                <th className="border border-gray-600 px-2 py-2 min-w-[100px]">NR. FOGLI O PESO</th>
                <th className="border border-gray-600 px-2 py-2 min-w-[90px]">PREZZO</th>
                <th className="border border-gray-600 px-2 py-2 min-w-[110px]">LAVORO</th>
                <th className="border border-gray-600 px-2 py-2 min-w-[110px]">CLIENTE</th>
                <th className="border border-gray-600 px-2 py-2 min-w-[110px]">DATA CONSEGNA RICHIESTA</th>
                <th className="border border-gray-600 px-2 py-2 w-16">ORDINE EFF.</th>
                <th className="border border-gray-600 px-2 py-2 min-w-[110px]">DATA CONSEGNA CONFERMATA</th>
                <th className="border border-gray-600 px-2 py-2 w-28">AZIONI</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={12} className="text-center py-8 text-gray-500">Caricamento...</td></tr>
              )}
              {!loading && righe.length === 0 && (
                <tr><td colSpan={12} className="text-center py-8 text-gray-400">Nessun ordine. Clicca + per aggiungere.</td></tr>
              )}
              {righe.map((riga, idx) => (
                <tr
                  key={riga.id || `new-${idx}`}
                  className={`${
                    riga.ordine_acquisto_id
                      ? 'bg-green-50'
                      : riga.isDirty
                      ? 'bg-yellow-50'
                      : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  } hover:bg-blue-50`}
                >
                  <td className={colStyle}>
                    <Input
                      type="number"
                      value={riga.nr ?? ''}
                      onChange={e => aggiornaRiga(idx, 'nr', parseInt(e.target.value) || 0)}
                      className="h-6 text-xs p-1 w-12 border-0 bg-transparent"
                    />
                  </td>
                  {/* Fornitore con autocomplete */}
                  <td className={colStyle}>
                    <AutocompleteInput
                      value={(riga.fornitore as string) ?? ''}
                      onChange={v => aggiornaRiga(idx, 'fornitore', v)}
                      fetchFn={fetchFornitori}
                      className="h-6 text-xs p-1 border-0 bg-transparent w-full"
                    />
                  </td>
                  {/* Campi testo normali */}
                  {(['cartone','grammatura','formato','nr_fogli_peso','prezzo','lavoro'] as (keyof OrdineCartone)[]).map(field => (
                    <td key={field} className={colStyle}>
                      <Input
                        value={(riga[field] as string) ?? ''}
                        onChange={e => aggiornaRiga(idx, field, e.target.value)}
                        className="h-6 text-xs p-1 border-0 bg-transparent w-full"
                      />
                    </td>
                  ))}
                  {/* Cliente con autocomplete */}
                  <td className={colStyle}>
                    <AutocompleteInput
                      value={(riga.cliente as string) ?? ''}
                      onChange={v => aggiornaRiga(idx, 'cliente', v)}
                      fetchFn={fetchClienti}
                      className="h-6 text-xs p-1 border-0 bg-transparent w-full"
                    />
                  </td>
                  {/* Data consegna */}
                  <td className={colStyle}>
                    <Input
                      value={(riga.data_consegna_richiesta as string) ?? ''}
                      onChange={e => aggiornaRiga(idx, 'data_consegna_richiesta', e.target.value)}
                      className="h-6 text-xs p-1 border-0 bg-transparent w-full"
                    />
                  </td>
                  <td className={`${colStyle} text-center`}>
                    <input
                      type="checkbox"
                      checked={riga.ordine_effettuato || false}
                      onChange={e => aggiornaRiga(idx, 'ordine_effettuato', e.target.checked)}
                      className="h-4 w-4 cursor-pointer"
                    />
                  </td>
                  <td className={colStyle}>
                    <Input
                      value={riga.data_consegna_confermata ?? ''}
                      onChange={e => aggiornaRiga(idx, 'data_consegna_confermata', e.target.value)}
                      className="h-6 text-xs p-1 border-0 bg-transparent w-full"
                    />
                  </td>
                  <td className={`${colStyle} text-center`}>
                    <div className="flex gap-1 justify-center items-center">
                      {riga.isDirty && (
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-green-600" onClick={() => salvaRiga(idx)} title="Salva">
                          <Save className="h-3 w-3" />
                        </Button>
                      )}
                      {/* Bottone converti in ordine d'acquisto */}
                      {!riga.isNew && !riga.isDirty && !riga.ordine_acquisto_id && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
                          onClick={() => convertiInOrdine(idx)}
                          title="Converti in Ordine d'Acquisto"
                          disabled={convertingIdx === idx}
                        >
                          {convertingIdx === idx
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <ShoppingCart className="h-3 w-3" />
                          }
                        </Button>
                      )}
                      {/* Link all'ordine gia creato */}
                      {riga.ordine_acquisto_id && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-1 text-green-700 hover:text-green-900 text-xs font-medium"
                          onClick={() => navigate('/ordini-acquisto')}
                          title={`Apri OA ${riga.ordine_acquisto_numero}`}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          {riga.ordine_acquisto_numero}
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-500" onClick={() => eliminaRiga(idx)} title="Elimina">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4">
          <Button onClick={aggiungiRiga} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
            <Plus className="h-4 w-4" /> Aggiungi riga
          </Button>
        </div>
      </div>
    </div>
  );
}
