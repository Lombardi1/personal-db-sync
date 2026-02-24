import React, { useState } from 'react';
import { StoricoMovimentoColore } from '@/types';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface StoricoColoriTabProps {
  storico: StoricoMovimentoColore[];
}

export function StoricoColoriTab({ storico }: StoricoColoriTabProps) {
  const [search, setSearch] = useState('');

  const storicoFiltrato = search.trim()
    ? storico.filter(
        s =>
          s.codice_colore.toLowerCase().includes(search.toLowerCase()) ||
          (s.username || '').toLowerCase().includes(search.toLowerCase()) ||
          (s.macchina || '').toLowerCase().includes(search.toLowerCase()) ||
          (s.lavoro || '').toLowerCase().includes(search.toLowerCase()) ||
          (s.note || '').toLowerCase().includes(search.toLowerCase())
      )
    : storico;

  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold text-[hsl(var(--colori-color))] mb-5 flex items-center gap-2">
        <i className="fas fa-history"></i> Storico Movimenti Colori
      </h2>

      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Cerca per codice, operatore, macchina..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {storicoFiltrato.length === 0 ? (
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Nessun movimento trovato.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs font-semibold uppercase text-gray-600">Data</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-gray-600">Tipo</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-gray-600">Codice Colore</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-gray-600">Quantità</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-gray-600">Macchina</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-gray-600">Lavoro</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-gray-600">Operatore</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-gray-600">Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {storicoFiltrato.map((mov, idx) => (
                <TableRow key={mov.id || idx}>
                  <TableCell className="text-sm whitespace-nowrap">
                    {new Date(mov.data).toLocaleString('it-IT', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        mov.tipo === 'carico'
                          ? 'bg-green-100 text-green-800 border-green-200'
                          : 'bg-[hsl(var(--colori-color))]/10 text-[hsl(var(--colori-color))] border-[hsl(var(--colori-color))]/30'
                      }
                    >
                      {mov.tipo === 'carico' ? '📦 Carico' : '🖨️ Scarico'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm font-medium">
                    {mov.codice_colore}
                  </TableCell>
                  <TableCell className="text-sm font-semibold">{mov.quantita}</TableCell>
                  <TableCell className="text-sm text-gray-600">{mov.macchina || '—'}</TableCell>
                  <TableCell className="text-sm text-gray-600">{mov.lavoro || '—'}</TableCell>
                  <TableCell className="text-sm text-gray-600">{mov.username || '—'}</TableCell>
                  <TableCell className="text-sm text-gray-500">{mov.note || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
