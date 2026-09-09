import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ColoreInArrivo, POSIZIONI_MAGAZZINO } from '@/types';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface ColoriDaSistemareTabProps { onArchiviato?: () => void; }

export function ColoriDaSistemareTab({ onArchiviato }: ColoriDaSistemareTabProps) {
  const [colori, setColori] = useState<ColoreInArrivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [posizioni, setPosizioni] = useState<Record<string, string>>({});
  const [archiviazioneInCorso, setArchiviazioneInCorso] = useState<Record<string, boolean>>({});

  const loadData = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('colori_in_arrivo').select('*').eq('stato', 'ricevuto').is('posizione', null).order('data_creazione', { ascending: false });
    if (!error && data) setColori(data as ColoreInArrivo[]);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const formatData = (d?: string | null) => d ? new Date(d).toLocaleDateString('it-IT') : '-';

  const archivia = async (colore: ColoreInArrivo) => {
    const posizione = posizioni[colore.id!];
    if (!posizione) { toast.error('Seleziona una posizione prima di archiviare'); return; }
    setArchiviazioneInCorso(p => ({ ...p, [colore.id!]: true }));
    try {
      await supabase.from('colori_in_arrivo').update({ posizione, ultima_modifica: new Date().toISOString() }).eq('id', colore.id);
      const { data: existing } = await supabase.from('colori').select('*').eq('codice', colore.codice).maybeSingle();
      if (existing) {
        await supabase.from('colori').update({ quantita_disponibile: existing.quantita_disponibile + colore.quantita, posizione, food: colore.food ?? existing.food ?? false, fornitore: colore.fornitore || existing.fornitore, ultima_modifica: new Date().toISOString() }).eq('codice', colore.codice);
      } else {
        await supabase.from('colori').insert([{ codice: colore.codice, nome: colore.nome, tipo: colore.tipo || 'Custom', marca: colore.marca || null, quantita_disponibile: colore.quantita, unita_misura: colore.unita_misura || 'kg', fornitore: colore.fornitore || null, disponibile: true, food: colore.food || false, posizione, data_creazione: new Date().toISOString(), ultima_modifica: new Date().toISOString() }]);
      }
      toast.success(`${colore.nome} (${colore.codice}) → ${posizione} ✅`);
      onArchiviato?.();
      loadData();
    } catch (e: any) { toast.error(`Errore: ${e.message}`); }
    finally { setArchiviazioneInCorso(p => ({ ...p, [colore.id!]: false })); }
  };

  if (loading) return <div className="py-8 text-center text-sm text-muted-foreground">Caricamento...</div>;
  if (colori.length === 0) return (
    <div className="py-12 text-center text-sm text-muted-foreground">
      <p className="text-3xl mb-3 opacity-30">📦</p>
      <p>Nessun colore da sistemare</p>
      <p className="text-xs mt-1 opacity-60">I colori arrivati e registrati appariranno qui</p>
    </div>
  );

  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold text-[hsl(var(--primary))] mb-4">📦 Da Sistemare <span className="text-sm font-normal text-muted-foreground">({colori.length})</span></h2>
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
                <th className="px-2 py-2 text-left text-[10px] font-semibold">Bolla</th>
                <th className="px-2 py-2 text-left text-[10px] font-semibold">Data Bolla</th>
                <th className="px-2 py-2 text-left text-[10px] font-semibold w-[160px]">Posizione</th>
                <th className="px-2 py-2 text-left text-[10px] font-semibold">Azione</th>
              </tr>
            </thead>
            <tbody>
              {colori.map((c) => (
                <tr key={c.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(210,40%,98%)]">
                  <td className="px-2 py-2 text-[10px] whitespace-nowrap font-mono">{c.codice}</td>
                  <td className="px-2 py-2 text-[10px] whitespace-nowrap font-medium">{c.nome}</td>
                  <td className="px-2 py-2 text-[10px] whitespace-nowrap">{c.tipo}</td>
                  <td className="px-2 py-2 text-[10px] whitespace-nowrap font-semibold">{c.quantita} {c.unita_misura}</td>
                  <td className="px-2 py-2 text-[10px] whitespace-nowrap">{c.food ? <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-700">🌿</span> : <span className="text-gray-300">—</span>}</td>
                  <td className="px-2 py-2 text-[10px] whitespace-nowrap">{c.fornitore || '-'}</td>
                  <td className="px-2 py-2 text-[10px] whitespace-nowrap font-mono font-semibold">{c.numero_ddt || <span className="text-gray-400 italic">—</span>}</td>
                  <td className="px-2 py-2 text-[10px] whitespace-nowrap">{formatData(c.data_ddt)}</td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    <Select value={posizioni[c.id!] || ''} onValueChange={(v) => setPosizioni(p => ({ ...p, [c.id!]: v }))}>
                      <SelectTrigger className="h-7 text-[11px] w-[150px]"><SelectValue placeholder="Scegli posizione…" /></SelectTrigger>
                      <SelectContent>{POSIZIONI_MAGAZZINO.map(pos => <SelectItem key={pos} value={pos} className="text-xs">{pos}</SelectItem>)}</SelectContent>
                    </Select>
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    <Button size="sm" className="h-7 text-[11px] px-3 bg-green-600 hover:bg-green-700 text-white" onClick={() => archivia(c)} disabled={!posizioni[c.id!] || archiviazioneInCorso[c.id!]}>
                      {archiviazioneInCorso[c.id!] ? '...' : '→ Archivia'}
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
