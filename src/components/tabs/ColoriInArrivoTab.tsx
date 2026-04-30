import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ColoreInArrivo } from '@/types';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface ColoriInArrivoTabProps {
  onCaricato?: () => void;
}

const statoBadge = (stato: string) => {
  const map: Record<string, string> = {
    in_attesa: 'bg-yellow-100 text-yellow-800',
    inviato: 'bg-blue-100 text-blue-800',
    confermato: 'bg-green-100 text-green-800',
    ricevuto: 'bg-gray-100 text-gray-600',
    annullato: 'bg-red-100 text-red-700',
  };
  const label: Record<string, string> = {
    in_attesa: 'In attesa',
    inviato: 'Inviato',
    confermato: 'Confermato',
    ricevuto: 'Ricevuto',
    annullato: 'Annullato',
  };
  return (
    `<span class="${map[stato] || 'bg-gray-100 text-gray-600'} text-[10px] px-1.5 py-0.5 rounded font-medium">${label[stato] || stato}</span>`
  );
};

export function ColoriInArrivoTab({ onCaricato }: ColoriInArrivoTabProps) {
  const [colori, setColori] = useState<ColoreInArrivo[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('colori_in_arrivo')
      .select('*')
      .not('stato', 'eq', 'annullato')
      .order('data_creazione', { ascending: false });
    if (!error && data) setColori(data as ColoreInArrivo[]);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const formatData = (d?: string | null) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('it-IT');
  };

  if (loading) return <div className="py-8 text-center text-sm text-muted-foreground">Caricamento...</div>;

  if (colori.length === 0) return (
    <div className="py-12 text-center text-sm text-muted-foreground">
      <i className="fas fa-truck text-3xl mb-3 block opacity-30"></i>
      <p>Nessun colore in arrivo</p>
    </div>
  );

  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold text-[hsl(var(--primary))] mb-4 flex items-center gap-2">
        <i className="fas fa-truck"></i> Colori in Arrivo
      </h2>
      <ScrollArea className="w-full rounded-md">
        <div className="w-full min-w-max">
          <table className="w-full border-collapse text-xs table-auto">
            <thead>
              <tr className="bg-[hsl(210,40%,98%)] border-b-2 border-[hsl(var(--border))]">
                <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold w-[90px]">Codice</th>
                <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold w-[160px]">Nome</th>
                <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold w-[80px]">Tipo</th>
                <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold w-[100px]">Marca</th>
                <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold w-[80px]">Quantità</th>
                <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold w-[80px]">€/u</th>
                <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold w-[120px]">Fornitore</th>
                <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold w-[80px]">OA</th>
                <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold w-[100px]">Consegna</th>
                <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold w-[90px]">Stato</th>
              </tr>
            </thead>
            <tbody>
              {colori.map((c) => (
                <tr key={c.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(210,40%,98%)] transition-colors">
                  <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap font-mono">{c.codice}</td>
                  <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap font-medium">{c.nome}</td>
                  <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap">{c.tipo}</td>
                  <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap">{c.marca || '-'}</td>
                  <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap font-semibold">{c.quantita} {c.unita_misura}</td>
                  <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap">{c.prezzo_unitario != null ? `${Number(c.prezzo_unitario).toFixed(2)} €` : '-'}</td>
                  <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap">{c.fornitore || '-'}</td>
                  <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap">{c.ordine_acquisto_numero || '-'}</td>
                  <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap">{formatData(c.data_consegna_prevista)}</td>
                  <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      c.stato === 'in_attesa' ? 'bg-yellow-100 text-yellow-800' :
                      c.stato === 'inviato' ? 'bg-blue-100 text-blue-800' :
                      c.stato === 'confermato' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {c.stato === 'in_attesa' ? 'In attesa' : c.stato === 'inviato' ? 'Inviato' : c.stato === 'confermato' ? 'Confermato' : c.stato}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
