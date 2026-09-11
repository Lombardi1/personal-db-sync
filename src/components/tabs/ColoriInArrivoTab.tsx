import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ColoreInArrivo } from '@/types';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ColoriInArrivoTabProps {
  onArrivoRegistrato?: () => void;
}

interface DialogArrivo {
  colore: ColoreInArrivo;
  numeroDdt: string;
  dataDdt: string;
  loading: boolean;
}

export function ColoriInArrivoTab({ onArrivoRegistrato }: ColoriInArrivoTabProps) {
  const [colori, setColori] = useState<ColoreInArrivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<DialogArrivo | null>(null);

  const loadData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('colori_in_arrivo')
      .select('*')
      .neq('stato', 'ricevuto')
      .neq('stato', 'annullato')
      .order('data_creazione', { ascending: false });
    if (!error && data) setColori(data as ColoreInArrivo[]);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const formatData = (d?: string | null) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('it-IT');
  };

  const apriDialog = (c: ColoreInArrivo) => {
    setDialog({
      colore: c,
      numeroDdt: '',
      dataDdt: new Date().toISOString().split('T')[0],
      loading: false,
    });
  };

  const registraArrivo = async () => {
    if (!dialog) return;
    if (!dialog.numeroDdt.trim()) {
      alert('Inserisci il numero bolla (DDT)');
      return;
    }
    setDialog(d => d ? { ...d, loading: true } : null);

    const { error } = await supabase
      .from('colori_in_arrivo')
      .update({
        stato: 'ricevuto',
        numero_ddt: dialog.numeroDdt.trim(),
        data_ddt: dialog.dataDdt || null,
        ultima_modifica: new Date().toISOString(),
      })
      .eq('id', dialog.colore.id);

    if (error) {
      alert(`Errore: ${error.message}`);
      setDialog(d => d ? { ...d, loading: false } : null);
      return;
    }

    setDialog(null);
    loadData();
    onArrivoRegistrato?.();
  };

  if (loading) return <div className="py-8 text-center text-sm text-muted-foreground">Caricamento...</div>;

  if (colori.length === 0) return (
    <div className="py-12 text-center text-sm text-muted-foreground">
      <p className="text-3xl mb-3 opacity-30">🚚</p>
      <p>Nessun colore in attesa di arrivo</p>
    </div>
  );

  return (
    <div>
      {dialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-bold mb-1">Registra Arrivo</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {dialog.colore.nome} — {dialog.colore.codice}
              <span className="block text-xs">{dialog.colore.quantita} {dialog.colore.unita_misura} da {dialog.colore.fornitore}</span>
            </p>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Numero DDT (Bolla) *</Label>
                <Input
                  value={dialog.numeroDdt}
                  onChange={e => setDialog(d => d ? { ...d, numeroDdt: e.target.value } : null)}
                  placeholder="Es. 12345"
                  className="text-sm mt-1"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && registraArrivo()}
                />
              </div>
              <div>
                <Label className="text-xs">Data DDT</Label>
                <Input
                  type="date"
                  value={dialog.dataDdt}
                  onChange={e => setDialog(d => d ? { ...d, dataDdt: e.target.value } : null)}
                  className="text-sm mt-1"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <Button variant="outline" size="sm" onClick={() => setDialog(null)} disabled={dialog.loading}>Annulla</Button>
              <Button size="sm" onClick={registraArrivo} disabled={dialog.loading}>
                {dialog.loading ? 'Salvataggio...' : '✓ Conferma Arrivo'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <h2 className="text-xl sm:text-2xl font-bold text-[hsl(var(--primary))] mb-4">🚚 Colori in Arrivo</h2>
      <ScrollArea className="w-full rounded-md">
        <div className="w-full min-w-max">
          <table className="w-full border-collapse text-xs table-auto">
            <thead>
              <tr className="bg-[hsl(210,40%,98%)] border-b-2 border-[hsl(var(--border))]">
                <th className="px-2 py-2 text-left text-[10px] font-semibold">Codice</th>
                <th className="px-2 py-2 text-left text-[10px] font-semibold">Nome</th>
                <th className="px-2 py-2 text-left text-[10px] font-semibold">Tipo</th>
                <th className="px-2 py-2 text-left text-[10px] font-semibold">Quantità</th>
                <th className="px-2 py-2 text-left text-[10px] font-semibold">Food</th>
                <th className="px-2 py-2 text-left text-[10px] font-semibold">Fornitore</th>
                <th className="px-2 py-2 text-left text-[10px] font-semibold">OA</th>
                <th className="px-2 py-2 text-left text-[10px] font-semibold">Cons. Prevista</th>
                <th className="px-2 py-2 text-left text-[10px] font-semibold">Stato</th>
                <th className="px-2 py-2 text-left text-[10px] font-semibold">Azione</th>
              </tr>
            </thead>
            <tbody>
              {colori.map((c) => (
                <tr key={c.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(210,40%,98%)]">
                  <td className="px-2 py-1.5 text-[10px] whitespace-nowrap font-mono">{c.codice}</td>
                  <td className="px-2 py-1.5 text-[10px] whitespace-nowrap font-medium">{c.nome}</td>
                  <td className="px-2 py-1.5 text-[10px] whitespace-nowrap">{c.tipo}</td>
                  <td className="px-2 py-1.5 text-[10px] whitespace-nowrap font-semibold">{c.quantita} {c.unita_misura}</td>
                  <td className="px-2 py-1.5 text-[10px] whitespace-nowrap">{c.food ? <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-700">🌿</span> : <span className="text-gray-300">—</span>}</td>
                  <td className="px-2 py-1.5 text-[10px] whitespace-nowrap">{c.fornitore || '-'}</td>
                  <td className="px-2 py-1.5 text-[10px] whitespace-nowrap">{c.ordine_acquisto_numero || '-'}</td>
                  <td className="px-2 py-1.5 text-[10px] whitespace-nowrap">{formatData(c.data_consegna_prevista)}</td>
                  <td className="px-2 py-1.5 text-[10px] whitespace-nowrap">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      c.stato === 'in_attesa' ? 'bg-yellow-100 text-yellow-800' :
                      c.stato === 'inviato' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {c.stato === 'in_attesa' ? 'In attesa' : c.stato === 'inviato' ? 'Inviato' : 'Confermato'}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap">
                    <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 border-blue-300 text-blue-700 hover:bg-blue-50" onClick={() => apriDialog(c)}>
                      ✓ Registra Arrivo
                    </Button>
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
