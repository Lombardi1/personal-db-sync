import { useState, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { LottoStampaInfo } from '@/types';
import { Button } from '@/components/ui/button';
import * as notifications from '@/utils/notifications';
import { useAuth } from '@/hooks/useAuth';
import {
  Plus, Search, X, GripVertical, Archive,
  CalendarDays, ChevronRight, CheckCircle2,
  Package, PlayCircle, Loader2, AlertCircle
} from 'lucide-react';

interface Programma {
  id: string;
  nome: string;
  data_creazione: string;
  note: string | null;
  stato: 'attivo' | 'archiviato';
  avviato: boolean;
  avviato_at?: string | null;
}

interface RigaProgramma {
  id: string;
  programma_id: string;
  lotto_stampa: number;
  posizione: number;
  note: string | null;
  lotto_info?: LottoStampaInfo | null;
  lavoro_montaggio_id?: string | null;
  lavoro_stampa_id?: string | null;
}

interface Props {
  lottiStampa: LottoStampaInfo[];
}

function useLottiMap(lottiStampa: LottoStampaInfo[]) {
  return useMemo(() => {
    const m = new Map<number, LottoStampaInfo>();
    lottiStampa.forEach(l => { if (!m.has(l.lotto)) m.set(l.lotto, l); });
    return m;
  }, [lottiStampa]);
}

// ─── form nuovo programma ──────────────────────────────────────────────────────
function FormNuovoProgramma({ onSave, onClose }: { onSave: (nome: string, note: string) => Promise<void>; onClose: () => void }) {
  const [nome, setNome] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!nome.trim()) return;
    setSaving(true);
    await onSave(nome.trim(), note.trim());
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-gray-800">Nuovo Programma di Stampa</h3>
          <button onClick={onClose}><X className="h-5 w-5 text-gray-400" /></button>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-1">Nome *</label>
          <input autoFocus className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Es. Settimana 1 Aprile" value={nome} onChange={e => setNome(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()} />
        </div>
        <div className="mb-5">
          <label className="block text-sm font-semibold text-gray-700 mb-1">Note</label>
          <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
            rows={2} value={note} onChange={e => setNote(e.target.value)} />
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">Annulla</Button>
          <Button onClick={handleSave} disabled={!nome.trim() || saving} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
            {saving ? 'Creazione...' : 'Crea Programma'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── picker lotto ──────────────────────────────────────────────────────────────
function PickerLotto({ lottiStampa, lottiUsati, onAdd }: {
  lottiStampa: LottoStampaInfo[];
  lottiUsati: Set<number>;
  onAdd: (lotto: LottoStampaInfo) => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const lottiUnici = useMemo(() => {
    const seen = new Set<number>();
    return lottiStampa.filter(l => { if (seen.has(l.lotto)) return false; seen.add(l.lotto); return true; });
  }, [lottiStampa]);

  const suggerimenti = useMemo(() => {
    if (!query) return [];
    const q = query.toLowerCase();
    return lottiUnici
      .filter(l => !lottiUsati.has(l.lotto))
      .filter(l => String(l.lotto).includes(q) || l.cliente?.toLowerCase().includes(q) || l.lavoro?.toLowerCase().includes(q))
      .slice(0, 10);
  }, [query, lottiUnici, lottiUsati]);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        <input
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Cerca lotto, cliente o lavoro da aggiungere..."
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
        />
      </div>
      {open && suggerimenti.length > 0 && (
        <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-xl mt-1 max-h-64 overflow-y-auto">
          {suggerimenti.map(l => (
            <button key={l.id} className="w-full text-left px-3 py-2.5 hover:bg-blue-50 border-b border-gray-100 last:border-0 flex items-center justify-between gap-2"
              onClick={() => { onAdd(l); setQuery(''); setOpen(false); }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-blue-700 text-sm">#{l.lotto}</span>
                  <span className="font-medium text-gray-800 text-sm truncate">{l.cliente}</span>
                </div>
                <div className="text-xs text-gray-500 truncate">{l.lavoro}</div>
                {l.quantita && <div className="text-xs text-gray-400">Qtà: {l.quantita.toLocaleString()}</div>}
              </div>
              <Plus className="h-4 w-4 text-blue-500 flex-shrink-0" />
            </button>
          ))}
        </div>
      )}
      {open && query && suggerimenti.length === 0 && (
        <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow mt-1 px-3 py-2 text-sm text-gray-500">
          Nessun lotto trovato (o già presente)
        </div>
      )}
    </div>
  );
}

// ─── riga ordinabile ───────────────────────────────────────────────────────────
function RigaOrdinabile({ riga, index, onRemove, onDragStart, onDragOver, onDrop, isDragging, bloccato }: {
  riga: RigaProgramma; index: number;
  onRemove: (id: string) => void;
  onDragStart: (i: number) => void;
  onDragOver: (e: React.DragEvent, i: number) => void;
  onDrop: (i: number) => void;
  isDragging: boolean; bloccato: boolean;
}) {
  const lotto = riga.lotto_info;
  return (
    <div
      draggable={!bloccato}
      onDragStart={() => !bloccato && onDragStart(index)}
      onDragOver={e => { e.preventDefault(); onDragOver(e, index); }}
      onDrop={() => onDrop(index)}
      className={`flex items-center gap-3 bg-white border rounded-lg px-3 py-2.5 transition-all select-none ${
        isDragging ? 'opacity-40 scale-95' : bloccato ? 'border-gray-100 bg-gray-50' : 'hover:border-blue-300 hover:shadow-sm'
      }`}
    >
      <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
        {index + 1}
      </div>
      <GripVertical className={`h-4 w-4 flex-shrink-0 ${bloccato ? 'text-gray-200' : 'text-gray-300 cursor-grab'}`} />
      <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5 flex-shrink-0">
        #{riga.lotto_stampa}
      </span>
      <div className="flex-1 min-w-0">
        {lotto ? (
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-800 text-sm truncate">{lotto.cliente}</span>
              {lotto.quantita && <span className="text-xs text-gray-400 flex-shrink-0">{lotto.quantita.toLocaleString()} pz</span>}
            </div>
            <div className="text-xs text-gray-500 truncate">{lotto.lavoro}</div>
          </div>
        ) : <span className="text-sm text-gray-400">Lotto {riga.lotto_stampa}</span>}
      </div>
      {/* Badge stato avvio */}
      {riga.lavoro_montaggio_id && (
        <span className="text-xs bg-green-100 text-green-700 border border-green-200 rounded-full px-2 py-0.5 flex-shrink-0 flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" /> Avviato
        </span>
      )}
      {!bloccato && (
        <button onClick={() => onRemove(riga.id)} className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50 flex-shrink-0">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// ─── dettaglio programma ───────────────────────────────────────────────────────
function DettaglioProgramma({ programma, lottiStampa, lottiMap, onBack, onUpdate }: {
  programma: Programma;
  lottiStampa: LottoStampaInfo[];
  lottiMap: Map<number, LottoStampaInfo>;
  onBack: () => void;
  onUpdate: () => void;
}) {
  const { user, isMastro } = useAuth();
  const [righe, setRighe] = useState<RigaProgramma[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avviando, setAvviando] = useState(false);
  const [prog, setProg] = useState<Programma>(programma);
  const dragIndex = useRef<number | null>(null);

  const loadRighe = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('programma_stampa_righe').select('*')
      .eq('programma_id', programma.id).order('posizione', { ascending: true });
    if (data) setRighe(data.map(r => ({ ...r, lotto_info: lottiMap.get(r.lotto_stampa) || null })));
    setLoading(false);
  };

  useState(() => { loadRighe(); });

  const handleAdd = async (lotto: LottoStampaInfo) => {
    if (prog.avviato) return;
    const maxPos = righe.length > 0 ? Math.max(...righe.map(r => r.posizione)) : 0;
    const { data, error } = await supabase
      .from('programma_stampa_righe')
      .insert([{ programma_id: programma.id, lotto_stampa: lotto.lotto, posizione: maxPos + 1 }])
      .select().single();
    if (!error && data) setRighe(prev => [...prev, { ...data, lotto_info: lottiMap.get(data.lotto_stampa) || null }]);
  };

  const handleRemove = async (id: string) => {
    if (prog.avviato) return;
    await supabase.from('programma_stampa_righe').delete().eq('id', id);
    setRighe(prev => prev.filter(r => r.id !== id));
  };

  const handleDrop = (dropIndex: number) => {
    if (dragIndex.current === null || dragIndex.current === dropIndex || prog.avviato) return;
    const newRighe = [...righe];
    const [moved] = newRighe.splice(dragIndex.current, 1);
    newRighe.splice(dropIndex, 0, moved);
    setRighe(newRighe);
    dragIndex.current = null;
  };

  const handleSaveOrdine = async () => {
    setSaving(true);
    await Promise.all(righe.map((r, i) => supabase.from('programma_stampa_righe').update({ posizione: i + 1 }).eq('id', r.id)));
    setSaving(false);
    notifications.showSuccess('✅ Ordine salvato!');
  };

  // ── AVVIA PROGRAMMA ────────────────────────────────────────────────────────
  const handleAvvia = async () => {
    if (!righe.length) { notifications.showError('Aggiungi almeno un lotto prima di avviare.'); return; }
    if (!confirm(`Avviare il programma "${prog.nome}"?\nVerranno creati ${righe.length} lavori in produzione.`)) return;

    setAvviando(true);
    try {
      // Recupera gli ID delle macchine Montaggio e KBA
      const { data: macchine } = await supabase
        .from('macchine_produzione').select('id, nome, tipo')
        .in('tipo', ['Premontaggio', 'Stampa']);

      const macMontaggio = macchine?.find(m => m.tipo === 'Premontaggio');
      const macKBA = macchine?.find(m => m.tipo === 'Stampa');

      if (!macMontaggio || !macKBA) {
        notifications.showError('Macchine Montaggio o KBA non trovate.');
        setAvviando(false);
        return;
      }

      // Per ogni riga crea: 1 lavoro Montaggio (in_produzione) + 1 lavoro KBA (in_attesa)
      for (const riga of righe) {
        const lotto = riga.lotto_info;
        const nomeBase = lotto ? `Lotto ${riga.lotto_stampa} – ${lotto.cliente}` : `Lotto ${riga.lotto_stampa}`;

        const [{ data: lavMontaggio }, { data: lavStampa }] = await Promise.all([
          supabase.from('lavori_produzione').insert([{
            macchina_id: macMontaggio.id,
            nome_lavoro: `[Montaggio Lavoro] ${nomeBase}`,
            stato: 'in_produzione',
            lotto_stampa: riga.lotto_stampa,
            note: `Programma: ${prog.nome}`,
          }]).select().single(),
          supabase.from('lavori_produzione').insert([{
            macchina_id: macKBA.id,
            nome_lavoro: `[Stampa] ${nomeBase}`,
            stato: 'in_attesa',
            lotto_stampa: riga.lotto_stampa,
            note: `Programma: ${prog.nome}`,
          }]).select().single(),
        ]);

        // Aggiorna la riga con i riferimenti ai lavori creati
        if (lavMontaggio && lavStampa) {
          await supabase.from('programma_stampa_righe').update({
            lavoro_montaggio_id: lavMontaggio.id,
            lavoro_stampa_id: lavStampa.id,
          }).eq('id', riga.id);
        }
      }

      // Segna programma come avviato
      await supabase.from('programma_stampa').update({
        avviato: true,
        avviato_at: new Date().toISOString(),
        avviato_by: user?.id,
      }).eq('id', prog.id);

      setProg(p => ({ ...p, avviato: true }));
      await loadRighe();
      notifications.showSuccess(`🚀 Programma avviato! ${righe.length} lavori creati in produzione.`);
      onUpdate();
    } catch (err) {
      notifications.showError('Errore durante l\'avvio del programma.');
    }
    setAvviando(false);
  };

  const handleArchivia = async () => {
    if (!confirm('Archiviare questo programma?')) return;
    await supabase.from('programma_stampa').update({ stato: 'archiviato' }).eq('id', prog.id);
    notifications.showSuccess('Programma archiviato');
    onBack(); onUpdate();
  };

  const lottiUsati = useMemo(() => new Set(righe.map(r => r.lotto_stampa)), [righe]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100">
          <ChevronRight className="h-5 w-5 rotate-180" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-gray-800">{prog.nome}</h3>
            {prog.avviato && (
              <span className="text-xs bg-green-100 text-green-700 border border-green-200 rounded-full px-2 py-0.5 flex items-center gap-1">
                <PlayCircle className="h-3 w-3" /> Avviato
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">{new Date(prog.data_creazione).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {isMastro && !prog.avviato && (
            <Button size="sm" onClick={handleSaveOrdine} disabled={saving} variant="outline" className="gap-1">
              <CheckCircle2 className="h-4 w-4" />{saving ? 'Salvataggio...' : 'Salva Ordine'}
            </Button>
          )}
          {isMastro && !prog.avviato && righe.length > 0 && (
            <Button size="sm" onClick={handleAvvia} disabled={avviando}
              className="bg-green-600 hover:bg-green-700 text-white gap-2">
              {avviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
              {avviando ? 'Avvio in corso...' : `Avvia Programma (${righe.length} lotti)`}
            </Button>
          )}
          {isMastro && (
            <Button variant="outline" size="sm" onClick={handleArchivia} className="gap-1 text-gray-500">
              <Archive className="h-4 w-4" /> Archivia
            </Button>
          )}
        </div>
      </div>

      {/* Banner avviato */}
      {prog.avviato && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center gap-2 text-green-800 text-sm">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          <span>Programma avviato — i lavori sono stati creati in produzione per ogni lotto. L'ordine non è più modificabile.</span>
        </div>
      )}

      {/* Alert nessuna macchina / solo MASTRO può modificare */}
      {!prog.avviato && !isMastro && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center gap-2 text-amber-800 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>Solo il MASTRO può modificare l'ordine e avviare il programma.</span>
        </div>
      )}

      {/* Picker (solo se non avviato e MASTRO) */}
      {!prog.avviato && isMastro && (
        <div className="mb-4">
          <PickerLotto lottiStampa={lottiStampa} lottiUsati={lottiUsati} onAdd={handleAdd} />
        </div>
      )}

      <div className="flex items-center gap-2 mb-3">
        <Package className="h-4 w-4 text-gray-400" />
        <span className="text-sm text-gray-500">{righe.length} lavori in programma</span>
        {!prog.avviato && righe.length > 0 && isMastro && (
          <span className="text-xs text-gray-400 ml-2">— trascina per riordinare</span>
        )}
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-400 text-sm">Caricamento...</div>
      ) : righe.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
          <Package className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Nessun lavoro nel programma</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {righe.map((riga, i) => (
            <RigaOrdinabile key={riga.id} riga={riga} index={i}
              onRemove={handleRemove}
              onDragStart={idx => { dragIndex.current = idx; }}
              onDragOver={(e, idx) => { e.preventDefault(); }}
              onDrop={handleDrop}
              isDragging={dragIndex.current === i}
              bloccato={prog.avviato || !isMastro}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── componente principale ─────────────────────────────────────────────────────
export function ProgrammaStampaTab({ lottiStampa }: Props) {
  const { isMastro } = useAuth();
  const [programmi, setProgrammi] = useState<Programma[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Programma | null>(null);
  const [mostraArchiviati, setMostraArchiviati] = useState(false);
  const lottiMap = useLottiMap(lottiStampa);

  const loadProgrammi = async () => {
    setLoading(true);
    const { data } = await supabase.from('programma_stampa').select('*').order('created_at', { ascending: false });
    if (data) setProgrammi(data as Programma[]);
    setLoading(false);
  };

  useState(() => { loadProgrammi(); });

  const handleCreate = async (nome: string, note: string) => {
    const { data, error } = await supabase.from('programma_stampa')
      .insert([{ nome, note: note || null }]).select().single();
    if (!error && data) {
      notifications.showSuccess(`✅ Programma "${nome}" creato!`);
      await loadProgrammi();
      setSelected(data as Programma);
    }
  };

  const programmiVisibili = programmi.filter(p => mostraArchiviati ? p.stato === 'archiviato' : p.stato === 'attivo');

  if (selected) {
    return (
      <DettaglioProgramma
        programma={selected} lottiStampa={lottiStampa} lottiMap={lottiMap}
        onBack={() => { setSelected(null); loadProgrammi(); }}
        onUpdate={loadProgrammi}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-blue-600" /> Programma di Stampa
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">Pianifica e avvia la produzione</p>
        </div>
        {isMastro && (
          <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
            <Plus className="h-4 w-4" /> Nuovo Programma
          </Button>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        {['attivo', 'archiviato'].map(s => (
          <button key={s} onClick={() => setMostraArchiviati(s === 'archiviato')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
              (s === 'archiviato') === mostraArchiviati
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-500 border-gray-300 hover:border-blue-400'
            }`}>
            {s === 'attivo' ? 'Attivi' : 'Archiviati'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-400">Caricamento...</div>
      ) : programmiVisibili.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
          <CalendarDays className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">{mostraArchiviati ? 'Nessun programma archiviato' : 'Nessun programma attivo'}</p>
          {!mostraArchiviati && isMastro && (
            <button onClick={() => setShowForm(true)} className="mt-3 text-blue-600 text-sm hover:underline">
              Crea il primo programma →
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {programmiVisibili.map(p => (
            <button key={p.id} onClick={() => setSelected(p)}
              className="text-left bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-md transition-all group">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-bold text-gray-800 group-hover:text-blue-700 transition-colors">{p.nome}</h4>
                  {p.avviato && (
                    <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5 mt-1">
                      <PlayCircle className="h-3 w-3" /> Avviato
                    </span>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-blue-400 flex-shrink-0 mt-0.5" />
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <CalendarDays className="h-3 w-3" />
                {new Date(p.data_creazione).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            </button>
          ))}
        </div>
      )}

      {showForm && isMastro && <FormNuovoProgramma onSave={handleCreate} onClose={() => setShowForm(false)} />}
    </div>
  );
}
