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
    const { data, error } = await supabase
      .from('colori_in_arrivo')
      .select('*')
      .eq('stato', 'ricevuto')
      .is('posizione', null)
      .order('data_creazione', { ascending: false });
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
      // 1. Aggiorna posizione su colori_in_arrivo
      const { error: err1 } = await supabase
        .from('colori_in_arrivo')
        .update({ posizione, ultima_modifica: new Date().toISOString() })
        .eq('id', colore.id);
      if (err1) throw new Error(`Aggiornamento colori_in_arrivo: ${err1.message}`);

      // 2. Cerca se il colore esiste già in magazzino
      const { data: existing, error: err2 } = await supabase
        .from('colori')
        .select('*')
        .eq('codice', colore.codice)
        .maybeSingle();
      if (err2) throw new Error(`Ricerca colore: ${err2.message}`);

      // Quantità come numero (il DB la restituisce come stringa)
      const qtaArrivo = parseFloat(String(colore.quantita)) || 0;

      if (existing) {
        // Colore già presente: aggiunge la quantità
        const qtaEsistente = parseFloat(String(existing.quantita_disponibile)) || 0;
        const { error: err3 } = await supabase
          .from('colori')
          .update({
            quantita_disponibile: qtaEsistente + qtaArrivo,
            posizione,
            food: colore.food ?? existing.food ?? false,
            fornitore: colore.fornitore || existing.fornitore,
            ultima_modifica: new Date().toISOString(),
          })
          .eq('codice', colore.codice);
        if (err3) throw new Error(`Aggiornamento magazzino: ${err3.message}`);
      } else {
        // Colore nuovo: inserisce
        const { error: err4 } = await supabase
          .from('colori')
          .insert([{
            codice: colore.codice,
            nome: colore.nome,
            tipo: (['CMYK','Pantone','Custom'].includes(colore.tipo) ? colore.tipo : 'Custom'),
            marca: colore.marca || null,
            quantita_disponibile: qtaArrivo,
            unita_misura: (['g','kg','l','ml'].includes(colore.unita_misura) ? colore.unita_misura : 'kg'),
            fornitore: colore.fornitore || null,
            disponibile: true,
            food: colore.food || false,
            posizione,
          }]);
        if (err4) throw new Error(`Inserimento magazzino: ${err4.message}`);
      }

      toast.success(`${colore.nome} (${colore.codice}) → ${posizione} ✅`);
      onArchiviato?.();
      loadData();
    } catch (e: any) {
      toast.error(`Errore archiviazione: ${e.message}`);
    } finally {
      setArchiviazioneInCorso(p => ({ ...p, [colore.id!]: false }));
    }
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
      <h2 className="text-xl sm:text-2xl font-bold text-[hsl(var(--primary))] mb-4">
        📦 Da Sistemare <span className="text-sm font-normal text-muted-foreground">({colori.length})</span>
      </h2>
      <ScrollArea className="w-full rounded-md">
        <div className="w-full min-w-max">
          <table className="w-full border-collapse text-xs table-auto">
            <thead>
              <tr className="bg-[hsl(210,40%,98%)] border-b-2 border-[hsl(var(--border))]">
                <th className="px-2 py-2 text-left text-xs font-semibold">Codice</th>
                <th className="px-2 py-2 text-left text-xs font-semibold">Nome</th>
                <th className="px-2 py-2 text-left text-xs font-semibold">Tipo</th>
                <th className="px-2 py-2 text-left text-xs font-semibold">Quantità</th>
                <th className="px-2 py-2 text-left text-xs font-semibold">Food</th>
                <th className="px-2 py-2 text-left text-xs font-semibold">Fornitore</th>
                <th className="px-2 py-2 text-left text-xs font-semibold">Bolla</th>
                <th className="px-2 py-2 text-left text-xs font-semibold">Data Bolla</th>
                <th className="px-2 py-2 text-left text-xs font-semibold w-[160px]">Posizione</th>
                <th className="px-2 py-2 text-left text-xs font-semibold">Azione</th>
              </tr>
            </thead>
            <tbody>
              {colori.map((c) => (
                <tr key={c.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(210,40%,98%)]">
                  <td className="px-2 py-2 text-xs whitespace-nowrap font-mono">{c.codice}</td>
                  <td className="px-2 py-2 text-xs whitespace-nowrap font-medium">{c.nome}</td>
                  <td className="px-2 py-2 text-xs whitespace-nowrap">{c.tipo}</td>
                  <td className="px-2 py-2 text-xs whitespace-nowrap font-semibold">{c.quantita} {c.unita_misura}</td>
                  <td className="px-2 py-2 text-xs whitespace-nowrap">{c.food ? <span className="px-1.5 py-0.5 rounded font-semibold bg-green-100 text-green-700">🌿</span> : <span className="text-gray-300">—</span>}</td>
                  <td className="px-2 py-2 text-xs whitespace-nowrap">{c.fornitore || '-'}</td>
                  <td className="px-2 py-2 text-xs whitespace-nowrap font-mono font-semibold">{c.numero_ddt || <span className="text-gray-400 italic">—</span>}</td>
                  <td className="px-2 py-2 text-xs whitespace-nowrap">{formatData(c.data_ddt)}</td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    <Select value={posizioni[c.id!] || ''} onValueChange={(v) => setPosizioni(p => ({ ...p, [c.id!]: v }))}>
                      <SelectTrigger className="h-7 text-xs w-[150px]"><SelectValue placeholder="Scegli posizione…" /></SelectTrigger>
                      <SelectContent>{POSIZIONI_MAGAZZINO.map(pos => <SelectItem key={pos} value={pos} className="text-xs">{pos}</SelectItem>)}</SelectContent>
                    </Select>
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    <Button size="sm" className="h-7 text-xs px-3 bg-green-600 hover:bg-green-700 text-white" onClick={() => archivia(c)} disabled={!posizioni[c.id!] || archiviazioneInCorso[c.id!]}>
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
