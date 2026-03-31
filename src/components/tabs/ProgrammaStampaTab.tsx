import { useState, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { LottoStampaInfo } from '@/types';
import { Button } from '@/components/ui/button';
import * as notifications from '@/utils/notifications';
import {
  Plus, Search, X, GripVertical, Trash2,
  CalendarDays, ChevronDown, ChevronRight,
  CheckCircle2, Package, User, FileText, Archive
} from 'lucide-react';

// ─── tipi ─────────────────────────────────────────────────────────────────────
interface Programma {
  id: string;
  nome: string;
  data_creazione: string;
  note: string | null;
  stato: 'attivo' | 'archiviato';
  righe?: RigaProgramma[];
}

interface RigaProgramma {
  id: string;
  programma_id: string;
  lotto_stampa: number;
  posizione: number;
  note: string | null;
  lotto_info?: LottoStampaInfo | null;
}

interface Props {
  lottiStampa: LottoStampaInfo[];
}

// ─── helper ────────────────────────────────────────────────────────────────────
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
            rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="Note opzionali..." />
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">Annulla</Button>
          <Button onClick={handleSave} disabled={!nome.trim() || saving}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
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
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Cerca lotto, cliente o lavoro da aggiungere..."
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
          />
        </div>
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
          Nessun lotto trovato (o già presente nel programma)
        </div>
      )}
    </div>
  );
}

// ─── riga drag & drop ─────────────────────────────────────────────────────────
function RigaOrdinabile({ riga, index, onRemove, onDragStart, onDragOver, onDrop, isDragging }: {
  riga: RigaProgramma;
  index: number;
  onRemove: (id: string) => void;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (index: number) => void;
  isDragging: boolean;
}) {
  const lotto = riga.lotto_info;

  return (
    <div
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={e => { e.preventDefault(); onDragOver(e, index); }}
      onDrop={() => onDrop(index)}
      className={`flex items-center gap-3 bg-white border rounded-lg px-3 py-2.5 transition-all select-none ${
        isDragging ? 'opacity-40 scale-95' : 'hover:border-blue-300 hover:shadow-sm'
      }`}
    >
      {/* Numero posizione */}
      <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
        {index + 1}
      </div>

      {/* Handle drag */}
      <GripVertical className="h-4 w-4 text-gray-300 cursor-grab active:cursor-grabbing flex-shrink-0" />

      {/* Lotto badge */}
      <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5 flex-shrink-0">
        #{riga.lotto_stampa}
      </span>

      {/* Info lotto */}
      <div className="flex-1 min-w-0">
        {lotto ? (
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-800 text-sm truncate">{lotto.cliente}</span>
              {lotto.quantita && (
                <span className="text-xs text-gray-400 flex-shrink-0">{lotto.quantita.toLocaleString()} pz</span>
              )}
            </div>
            <div className="text-xs text-gray-500 truncate">{lotto.lavoro}</div>
            {lotto.formato && <div className="text-xs text-gray-400">{lotto.formato}</div>}
          </div>
        ) : (
          <span className="text-sm text-gray-400">Lotto {riga.lotto_stampa}</span>
        )}
      </div>

      {/* Stato lotto stampa */}
      {lotto && (
        <div className="flex gap-1 flex-shrink-0">
          {lotto.stampato && <span className="text-xs bg-green-100 text-green-700 rounded px-1.5 py-0.5 border border-green-200">Stampato</span>}
          {lotto.conf && <span className="text-xs bg-blue-100 text-blue-700 rounded px-1.5 py-0.5 border border-blue-200">Conf</span>}
        </div>
      )}

      {/* Rimuovi */}
      <button onClick={() => onRemove(riga.id)}
        className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50 flex-shrink-0">
        <X className="h-4 w-4" />
      </button>
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
  const [righe, setRighe] = useState<RigaProgramma[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const dragIndex = useRef<number | null>(null);
  const overIndex = useRef<number | null>(null);

  const loadRighe = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('programma_stampa_righe')
      .select('*')
      .eq('programma_id', programma.id)
      .order('posizione', { ascending: true });
    if (data) {
      setRighe(data.map(r => ({ ...r, lotto_info: lottiMap.get(r.lotto_stampa) || null })));
    }
    setLoading(false);
  };

  useState(() => { loadRighe(); });

  // Aggiunge un lotto al programma
  const handleAdd = async (lotto: LottoStampaInfo) => {
    const maxPos = righe.length > 0 ? Math.max(...righe.map(r => r.posizione)) : 0;
    const { data, error } = await supabase
      .from('programma_stampa_righe')
      .insert([{ programma_id: programma.id, lotto_stampa: lotto.lotto, posizione: maxPos + 1 }])
      .select().single();
    if (!error && data) {
      setRighe(prev => [...prev, { ...data, lotto_info: lottiMap.get(data.lotto_stampa) || null }]);
    }
  };

  // Rimuove una riga
  const handleRemove = async (id: string) => {
    await supabase.from('programma_stampa_righe').delete().eq('id', id);
    setRighe(prev => prev.filter(r => r.id !== id));
  };

  // Drag & drop
  const handleDragStart = (index: number) => { dragIndex.current = index; };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    overIndex.current = index;
  };

  const handleDrop = (dropIndex: number) => {
    if (dragIndex.current === null || dragIndex.current === dropIndex) return;
    const newRighe = [...righe];
    const [moved] = newRighe.splice(dragIndex.current, 1);
    newRighe.splice(dropIndex, 0, moved);
    setRighe(newRighe);
    dragIndex.current = null;
    overIndex.current = null;
  };

  // Salva l'ordine sul DB
  const handleSaveOrdine = async () => {
    setSaving(true);
    const updates = righe.map((r, i) =>
      supabase.from('programma_stampa_righe').update({ posizione: i + 1 }).eq('id', r.id)
    );
    await Promise.all(updates);
    setSaving(false);
    notifications.showSuccess('✅ Ordine salvato!');
    onUpdate();
  };

  // Archivia programma
  const handleArchivia = async () => {
    if (!confirm('Archiviare questo programma?')) return;
    await supabase.from('programma_stampa').update({ stato: 'archiviato' }).eq('id', programma.id);
    notifications.showSuccess('Programma archiviato');
    onBack();
    onUpdate();
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
          <h3 className="text-xl font-bold text-gray-800">{programma.nome}</h3>
          <p className="text-sm text-gray-500">{new Date(programma.data_creazione).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleArchivia} className="gap-1 text-gray-500">
            <Archive className="h-4 w-4" /> Archivia
          </Button>
          <Button size="sm" onClick={handleSaveOrdine} disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-1">
            <CheckCircle2 className="h-4 w-4" />
            {saving ? 'Salvataggio...' : 'Salva Ordine'}
          </Button>
        </div>
      </div>

      {/* Picker aggiungi lotto */}
      <div className="mb-4">
        <PickerLotto lottiStampa={lottiStampa} lottiUsati={lottiUsati} onAdd={handleAdd} />
      </div>

      {/* Contatore */}
      <div className="flex items-center gap-2 mb-3">
        <Package className="h-4 w-4 text-gray-400" />
        <span className="text-sm text-gray-500">{righe.length} lavori in programma</span>
        {righe.length > 0 && (
          <span className="text-xs text-gray-400 ml-2">— trascina per riordinare</span>
        )}
      </div>

      {/* Lista riordinabile */}
      {loading ? (
        <div className="text-center py-10 text-gray-400 text-sm">Caricamento...</div>
      ) : righe.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
          <Package className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Nessun lavoro nel programma</p>
          <p className="text-gray-300 text-xs mt-1">Cerca un lotto qui sopra per aggiungerlo</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {righe.map((riga, i) => (
            <RigaOrdinabile
              key={riga.id}
              riga={riga}
              index={i}
              onRemove={handleRemove}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              isDragging={dragIndex.current === i}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── componente principale ─────────────────────────────────────────────────────
export function ProgrammaStampaTab({ lottiStampa }: Props) {
  const [programmi, setProgrammi] = useState<Programma[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Programma | null>(null);
  const [mostraArchiviati, setMostraArchiviati] = useState(false);
  const lottiMap = useLottiMap(lottiStampa);

  const loadProgrammi = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('programma_stampa')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setProgrammi(data as Programma[]);
    setLoading(false);
  };

  useState(() => { loadProgrammi(); });

  const handleCreate = async (nome: string, note: string) => {
    const { data, error } = await supabase
      .from('programma_stampa')
      .insert([{ nome, note: note || null }])
      .select().single();
    if (!error && data) {
      notifications.showSuccess(`✅ Programma "${nome}" creato!`);
      await loadProgrammi();
      setSelected(data as Programma);
    }
  };

  const programmiVisibili = programmi.filter(p =>
    mostraArchiviati ? p.stato === 'archiviato' : p.stato === 'attivo'
  );

  // Vista dettaglio
  if (selected) {
    return (
      <DettaglioProgramma
        programma={selected}
        lottiStampa={lottiStampa}
        lottiMap={lottiMap}
        onBack={() => { setSelected(null); loadProgrammi(); }}
        onUpdate={loadProgrammi}
      />
    );
  }

  // Vista lista programmi
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-blue-600" /> Programma di Stampa
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">Pianifica e ordina i lavori da produrre</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
          <Plus className="h-4 w-4" /> Nuovo Programma
        </Button>
      </div>

      {/* Toggle attivi / archiviati */}
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
        <div className="text-center py-10 text-gray-400 text-sm">Caricamento...</div>
      ) : programmiVisibili.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
          <CalendarDays className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">
            {mostraArchiviati ? 'Nessun programma archiviato' : 'Nessun programma attivo'}
          </p>
          {!mostraArchiviati && (
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
                <h4 className="font-bold text-gray-800 group-hover:text-blue-700 transition-colors">{p.nome}</h4>
                <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-blue-400 transition-colors flex-shrink-0 mt-0.5" />
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-400 mb-2">
                <CalendarDays className="h-3 w-3" />
                {new Date(p.data_creazione).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
              {p.note && <p className="text-xs text-gray-500 line-clamp-2">{p.note}</p>}
              {p.stato === 'archiviato' && (
                <span className="mt-2 inline-block text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">Archiviato</span>
              )}
            </button>
          ))}
        </div>
      )}

      {showForm && <FormNuovoProgramma onSave={handleCreate} onClose={() => setShowForm(false)} />}
    </div>
  );
}
