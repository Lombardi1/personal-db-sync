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

export function LottiAlimentariTab() {
  const [lotti, setLotti] = useState<ColoreInArrivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('colori_in_arrivo')
        .select('*')
        .not('lotto_alimentare', 'is', null)
        .neq('lotto_alimentare', '')
        .order('data_ddt', { ascending: false, nullsFirst: false })
        .order('ultima_modifica', { ascending: false });
      if (!error && data) setLotti(data as ColoreInArrivo[]);
      setLoading(false);
    })();
  }, []);

  const formatData = (d?: string | null) => (d ? new Date(d).toLocaleDateString('it-IT') : '—');

  const q = search.trim().toLowerCase();
  const filtrati = q
    ? lotti.filter(l =>
        [l.lotto_alimentare, l.codice, l.nome, l.fornitore, l.numero_ddt, l.ordine_acquisto_numero]
          .some(v => (v || '').toLowerCase().includes(q))
      )
    : lotti;

  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold text-[hsl(var(--colori-color))] mb-5 flex items-center gap-2">
        <i className="fas fa-barcode"></i> Lotti Alimentari
        <span className="text-sm font-normal text-muted-foreground">({lotti.length})</span>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrati.map(l => (
                <TableRow key={l.id}>
                  <TableCell className="text-sm font-mono font-semibold">{l.lotto_alimentare}</TableCell>
                  <TableCell className="text-sm font-mono">{l.codice}</TableCell>
                  <TableCell className="text-sm font-medium">{l.nome}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap">{l.quantita} {l.unita_misura}</TableCell>
                  <TableCell className="text-sm text-gray-600">{l.fornitore || '—'}</TableCell>
                  <TableCell className="text-sm font-mono text-gray-600">{l.numero_ddt || '—'}</TableCell>
                  <TableCell className="text-sm text-gray-600 whitespace-nowrap">{formatData(l.data_ddt)}</TableCell>
                  <TableCell className="text-sm text-gray-600">{l.ordine_acquisto_numero || '—'}</TableCell>
                  <TableCell className="text-sm text-gray-600">{l.posizione || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
