import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ColoreInArrivo } from '@/types';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
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

  const q = search.trim().toLowerCase();
  const filtrati = q
    ? righe.filter(l =>
        [l.lotto, l.codice, l.colore, l.fornitore, l.ddt, l.oa, l.origine]
          .some(v => (v || '').toLowerCase().includes(q))
      )
    : righe;

  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold text-[hsl(var(--colori-color))] mb-5 flex items-center gap-2">
        <i className="fas fa-barcode"></i> Lotti Alimentari
        <span className="text-sm font-normal text-muted-foreground">({righe.length})</span>
      </h2>

      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Cerca per lotto, colore, DDT, fornitore..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">Caricamento...</div>
      ) : filtrati.length === 0 ? (
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Nessun lotto alimentare registrato.</p>
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
