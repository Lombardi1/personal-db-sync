import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface Polimero {
  codice: string;
  nr_fustella: string | null;
  codice_fornitore: string | null;
  cliente: string | null;
  lavoro: string | null;
  resa: string | null;
  note: string | null;
}

export function DBPolimeriTab() {
  const [polimeri, setPolimeri] = useState<Polimero[]>([]);
  const [filtro, setFiltro] = useState('');
  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      setErrore(null);

      const { data, error } = await supabase
        .from('polimeri')
        .select('codice, nr_fustella, codice_fornitore, cliente, lavoro, resa, note')
        .order('codice', { ascending: true })
        .limit(2000);

      if (error) {
        setErrore(error.message);
        setLoading(false);
        return;
      }

      setPolimeri(data || []);
      setLoading(false);
    };

    loadAll();
  }, []);

  const filtrati = polimeri.filter(p => {
    if (!filtro) return true;
    const q = filtro.toLowerCase();
    return (
      p.codice?.toLowerCase().includes(q) ||
      p.nr_fustella?.toLowerCase().includes(q) ||
      p.codice_fornitore?.toLowerCase().includes(q) ||
      p.cliente?.toLowerCase().includes(q) ||
      p.lavoro?.toLowerCase().includes(q) ||
      p.note?.toLowerCase().includes(q)
    );
  });

  if (loading) return <div className="text-center py-8 text-gray-500">Caricamento DB Polimeri...</div>;
  if (errore) return <div className="text-center py-8 text-red-500">Errore: {errore}</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-700">
          Archivio Polimeri{' '}
          <span className="text-sm font-normal text-gray-400">
            ({filtro ? `${filtrati.length} / ` : ''}{polimeri.length} polimeri)
          </span>
        </h2>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Cerca codice, fustella, cliente, lavoro..."
            value={filtro}
            onChange={e => setFiltro(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-3 py-2 text-left font-medium text-gray-600">Codice</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">Nr. Fustella</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">Cod. Fornitore</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">Cliente</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">Lavoro</th>
              <th className="px-3 py-2 text-center font-medium text-gray-600">Resa</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">Note</th>
            </tr>
          </thead>
          <tbody>
            {filtrati.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-gray-400">
                  {filtro ? 'Nessun risultato per la ricerca' : 'Nessun polimero trovato'}
                </td>
              </tr>
            ) : (
              filtrati.map(p => (
                <tr key={p.codice} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-2 font-mono font-semibold text-blue-700">{p.codice}</td>
                  <td className="px-3 py-2 font-mono text-gray-600">{p.nr_fustella || '—'}</td>
                  <td className="px-3 py-2 text-gray-600">{p.codice_fornitore || '—'}</td>
                  <td className="px-3 py-2 text-gray-700">{p.cliente || '—'}</td>
                  <td className="px-3 py-2 text-gray-700 max-w-xs truncate" title={p.lavoro || ''}>{p.lavoro || '—'}</td>
                  <td className="px-3 py-2 text-center text-gray-700">{p.resa || '—'}</td>
                  <td className="px-3 py-2 text-gray-500 text-xs max-w-xs truncate" title={p.note || ''}>{p.note || ''}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
