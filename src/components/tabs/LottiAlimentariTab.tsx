import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ColoreInArrivo } from '@/types';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type RigaLotto = {
  key: string;
  lotto: string;
  codice: string;
  colore: string;
  quantita: string;
  fornitore: string;
  ddt: string;
  dataDdt: string | null;
  oa: string;
  posizione: string;
  origine: string;
};

type StoricoRow = {
  id: string;
  foglio: string;
  batch: string;
  articolo: string | null;
  ddt: string | null;
  data_ddt: string | null;
  confezioni: string | null;
  kg_lt: string | null;
  nota: string | null;
};

const PAGE = 1000;

export function LottiAlimentariTab() {
  const [righe, setRighe] = useState<RigaLotto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [fOrigine, setFOrigine] = useState('');
  const [fColore, setFColore] = useState('');
  const [fLotto, setFLotto] = useState('');
  const [fDdt, setFDdt] = useState('');
  const [fDal, setFDal] = useState('');
  const [fAl, setFAl] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);

      // Lotti correnti (ordini colore in arrivo) – paginati per superare il limite di 1000 righe
      const correnti: ColoreInArrivo[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
          .from('colori_in_arrivo')
          .select('*')
          .not('lotto_alimentare', 'is', null)
          .neq('lotto_alimentare', '')
          .order('data_ddt', { ascending: false, nullsFirst: false })
          .order('ultima_modifica', { ascending: false })
          .range(from, from + PAGE - 1);
        if (error || !data) break;
        correnti.push(...(data as ColoreInArrivo[]));
        if (data.length < PAGE) break;
      }

      // Storico importato da Excel (una tantum)
      const storico: StoricoRow[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
          .from('lotti_alimentari_storico')
          .select('*')
          .order('data_ddt', { ascending: false, nullsFirst: false })
          .order('foglio', { ascending: false })
          .order('riga', { ascending: false })
          .range(from, from + PAGE - 1);
        if (error || !data) break;
        storico.push(...(data as StoricoRow[]));
        if (data.length < PAGE) break;
      }

      const daCorrenti: RigaLotto[] = correnti.map(l => ({
        key: `c-${l.id}`,
        lotto: l.lotto_alimentare || '',
        codice: l.codice || '',
        colore: l.nome || '',
        quantita: `${l.quantita ?? ''} ${l.unita_misura ?? ''}`.trim(),
        fornitore: l.fornitore || '',
        ddt: l.numero_ddt || '',
        dataDdt: l.data_ddt || null,
        oa: l.ordine_acquisto_numero || '',
        posizione: l.posizione || '',
        origine: 'Ordini',
      }));

      const daStorico: RigaLotto[] = storico.map(s => ({
        key: `s-${s.id}`,
        lotto: s.batch,
        codice: '',
        colore: s.articolo || '',
        quantita: [s.confezioni && `${s.confezioni} conf.`, s.kg_lt && `${s.kg_lt} kg/lt`]
          .filter(Boolean)
          .join(' × '),
        fornitore: '',
        ddt: s.ddt || '',
        dataDdt: s.data_ddt || null,
        oa: '',
        posizione: '',
        origine: `Excel ${s.foglio}`,
      }));

      setRighe([...daCorrenti, ...daStorico]);
      setLoading(false);
    })();
  }, []);

  const formatData = (d?: string | null) => (d ? new Date(d).toLocaleDateString('it-IT') : '—');

  const norm = (v: string) => v.trim().toLowerCase();
  const q = norm(search);
  const qColore = norm(fColore);
  const qLotto = norm(fLotto);
  const qDdt = norm(fDdt);

  const origini = Array.from(new Set(righe.map(r => r.origine)));
  const filtriAttivi = !!(q || fOrigine || qColore || qLotto || qDdt || fDal || fAl);

  const azzeraFiltri = () => {
    setSearch(''); setFOrigine(''); setFColore(''); setFLotto(''); setFDdt(''); setFDal(''); setFAl('');
  };

  const filtrati = righe.filter(l => {
    if (fOrigine && l.origine !== fOrigine) return false;
    if (qColore && !l.colore.toLowerCase().includes(qColore)) return false;
    if (qLotto && !l.lotto.toLowerCase().includes(qLotto)) return false;
    if (qDdt && !l.ddt.toLowerCase().includes(qDdt)) return false;
    if (fDal || fAl) {
      if (!l.dataDdt) return false;
      const d = l.dataDdt.slice(0, 10);
      if (fDal && d < fDal) return false;
      if (fAl && d > fAl) return false;
    }
    if (q) {
      return [l.lotto, l.codice, l.colore, l.fornitore, l.ddt, l.oa, l.origine]
        .some(v => (v || '').toLowerCase().includes(q));
    }
    return true;
  });

  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold text-[hsl(var(--colori-color))] mb-5 flex items-center gap-2">
        <i className="fas fa-barcode"></i> Lotti Alimentari
        <span className="text-sm font-normal text-muted-foreground">
          ({filtriAttivi ? `${filtrati.length} di ${righe.length}` : righe.length})
        </span>
      </h2>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Cerca ovunque..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <label className="text-xs text-gray-600 flex flex-col gap-1">
          Origine
          <select
            value={fOrigine}
            onChange={e => setFOrigine(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Tutte</option>
            {origini.map(o => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-gray-600 flex flex-col gap-1">
          Colore
          <Input value={fColore} onChange={e => setFColore(e.target.value)} placeholder="es. PMS 347" className="w-40" />
        </label>
        <label className="text-xs text-gray-600 flex flex-col gap-1">
          Lotto
          <Input value={fLotto} onChange={e => setFLotto(e.target.value)} placeholder="es. CN1031" className="w-36" />
        </label>
        <label className="text-xs text-gray-600 flex flex-col gap-1">
          DDT
          <Input value={fDdt} onChange={e => setFDdt(e.target.value)} placeholder="es. SA/0/2" className="w-32" />
        </label>
        <label className="text-xs text-gray-600 flex flex-col gap-1">
          Data DDT dal
          <Input type="date" value={fDal} onChange={e => setFDal(e.target.value)} className="w-40" />
        </label>
        <label className="text-xs text-gray-600 flex flex-col gap-1">
          al
          <Input type="date" value={fAl} onChange={e => setFAl(e.target.value)} className="w-40" />
        </label>
        {filtriAttivi && (
          <button
            type="button"
            onClick={azzeraFiltri}
            className="h-10 px-3 inline-flex items-center gap-1 rounded-md border border-input text-sm text-gray-700 hover:bg-gray-50"
          >
            <X className="h-4 w-4" /> Azzera filtri
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">Caricamento...</div>
      ) : filtrati.length === 0 ? (
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Nessun lotto alimentare trovato.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs font-semibold uppercase text-gray-600">Lotto Alimentare</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-gray-600">Codice</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-gray-600">Colore</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-gray-600">Quantità</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-gray-600">Fornitore</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-gray-600">DDT</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-gray-600">Data DDT</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-gray-600">OA</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-gray-600">Posizione</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-gray-600">Origine</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrati.map(l => (
                <TableRow key={l.key}>
                  <TableCell className="text-sm font-mono font-semibold">{l.lotto}</TableCell>
                  <TableCell className="text-sm font-mono">{l.codice || '—'}</TableCell>
                  <TableCell className="text-sm font-medium">{l.colore || '—'}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap">{l.quantita || '—'}</TableCell>
                  <TableCell className="text-sm text-gray-600">{l.fornitore || '—'}</TableCell>
                  <TableCell className="text-sm font-mono text-gray-600">{l.ddt || '—'}</TableCell>
                  <TableCell className="text-sm text-gray-600 whitespace-nowrap">{formatData(l.dataDdt)}</TableCell>
                  <TableCell className="text-sm text-gray-600">{l.oa || '—'}</TableCell>
                  <TableCell className="text-sm text-gray-600">{l.posizione || '—'}</TableCell>
                  <TableCell className="text-xs text-gray-500 whitespace-nowrap">{l.origine}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
