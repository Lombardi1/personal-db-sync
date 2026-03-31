import { useState, useMemo } from 'react';
import { LavoroProduzione, MacchinaProduzione, StoricoLavoroProduzione, LottoStampaInfo } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Plus, Search, LayoutGrid, List, X, ChevronDown,
  Factory, Clock, CheckCircle2, XCircle, Package,
  CalendarDays, Layers
} from 'lucide-react';

// ─── tipi props ───────────────────────────────────────────────────────────────
interface Props {
  macchine: MacchinaProduzione[];
  lavori: LavoroProduzione[];
  storicoLavori: StoricoLavoroProduzione[];
  lottiStampa: LottoStampaInfo[];
  addLavoro: (l: any) => Promise<any>;
  updateLavoro: (id: string, d: any) => Promise<any>;
  deleteLavoro: (id: string) => Promise<any>;
  loadData: () => Promise<void>;
}

// ─── costanti ─────────────────────────────────────────────────────────────────
type Stato = 'in_attesa' | 'in_produzione' | 'completato' | 'annullato';

const STATI: { key: Stato; label: string; color: string; bg: string; icon: any }[] = [
  { key: 'in_attesa',     label: 'In Attesa',     color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200',  icon: Clock },
  { key: 'in_produzione', label: 'In Produzione', color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200',    icon: Factory },
  { key: 'completato',    label: 'Completato',    color: 'text-green-700',  bg: 'bg-green-50 border-green-200',  icon: CheckCircle2 },
  { key: 'annullato',     label: 'Annullato',     color: 'text-red-700',    bg: 'bg-red-50 border-red-200',      icon: XCircle },
];

const STATO_BADGE: Record<Stato, string> = {
  in_attesa:     'bg-amber-100 text-amber-800 border border-amber-300',
  in_produzione: 'bg-blue-100 text-blue-800 border border-blue-300',
  completato:    'bg-green-100 text-green-800 border border-green-300',
  annullato:     'bg-red-100 text-red-800 border border-red-300',
};

// Fasi reali del processo produttivo con le macchine associate
const FASI_PRODUZIONE: { label: string; tipiMacchina: string[]; colore: string }[] = [
  { label: 'Programma di Stampa', tipiMacchina: ['Pianificazione'],             colore: 'bg-slate-100 text-slate-700 border-slate-300' },
  { label: 'Montaggio Lavoro',    tipiMacchina: ['Premontaggio'],               colore: 'bg-violet-100 text-violet-700 border-violet-300' },
  { label: 'Stampa',              tipiMacchina: ['Stampa'],                     colore: 'bg-blue-100 text-blue-700 border-blue-300' },
  { label: 'Verniciatura UV',     tipiMacchina: ['Verniciatura UV'],            colore: 'bg-cyan-100 text-cyan-700 border-cyan-300' },
  { label: 'Oro a Caldo',         tipiMacchina: ['Oro a Caldo'],               colore: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  { label: 'Terzista',            tipiMacchina: ['Esterno'],                   colore: 'bg-orange-100 text-orange-700 border-orange-300' },
  { label: 'Fustellatura',        tipiMacchina: ['Fustellatura'],              colore: 'bg-red-100 text-red-700 border-red-300' },
  { label: 'Incollatura',         tipiMacchina: ['Incollatura'],               colore: 'bg-pink-100 text-pink-700 border-pink-300' },
  { label: 'Impacchettamento',    tipiMacchina: ['Fine'],                      colore: 'bg-green-100 text-green-700 border-green-300' },
];

// ─── form nuovo lavoro ────────────────────────────────────────────────────────
interface FormState {
  lotto_query: string;
  lotto_selezionato: LottoStampaInfo | null;
  fase: string;
  macchina_id: string;
  stato: Stato;
  data_inizio_prevista: string;
  data_fine_prevista: string;
  note: string;
}

function FormNuovoLavoro({
  macchine, lottiStampa, onSave, onClose
}: {
  macchine: MacchinaProduzione[];
  lottiStampa: LottoStampaInfo[];
  onSave: (d: any) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<FormState>({
    lotto_query: '', lotto_selezionato: null,
    fase: FASI_PRODUZIONE[0].label,
    macchina_id: '',
    stato: 'in_attesa',
    data_inizio_prevista: '', data_fine_prevista: '', note: '',
  });
  const [saving, setSaving] = useState(false);
  const [showSuggerimenti, setShowSuggerimenti] = useState(false);

  // Macchine disponibili per la fase selezionata
  const faseDef = FASI_PRODUZIONE.find(f => f.label === form.fase);
  const macchineFase = useMemo(() => {
    if (!faseDef) return macchine;
    return macchine.filter(m => faseDef.tipiMacchina.includes(m.tipo));
  }, [form.fase, macchine, faseDef]);

  // Se cambia fase, reset macchina_id alla prima disponibile
  const setFase = (fase: string) => {
    const def = FASI_PRODUZIONE.find(f => f.label === fase);
    const disponibili = def ? macchine.filter(m => def.tipiMacchina.includes(m.tipo)) : macchine;
    setForm(f => ({ ...f, fase, macchina_id: disponibili[0]?.id || '' }));
  };

  // Deduplica lotti per numero
  const lottiUnici = useMemo(() => {
    const seen = new Set<number>();
    return lottiStampa.filter(l => { if (seen.has(l.lotto)) return false; seen.add(l.lotto); return true; });
  }, [lottiStampa]);

  const suggerimenti = useMemo(() => {
    if (!form.lotto_query || form.lotto_selezionato) return [];
    const q = form.lotto_query.toLowerCase();
    return lottiUnici.filter(l =>
      String(l.lotto).includes(q) ||
      l.cliente?.toLowerCase().includes(q) ||
      l.lavoro?.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [form.lotto_query, form.lotto_selezionato, lottiUnici]);

  const set = (k: keyof FormState, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.lotto_selezionato || !form.macchina_id || !form.fase) return;
    setSaving(true);
    const nomeLavoro = `[${form.fase}] Lotto ${form.lotto_selezionato.lotto} – ${form.lotto_selezionato.cliente}`;
    await onSave({
      macchina_id: form.macchina_id,
      nome_lavoro: nomeLavoro,
      stato: form.stato,
      lotto_stampa: form.lotto_selezionato.lotto,
      data_inizio_prevista: form.data_inizio_prevista || null,
      data_fine_prevista: form.data_fine_prevista || null,
      note: form.note || null,
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Plus className="h-5 w-5 text-blue-600" /> Nuovo Lavoro in Produzione
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>

        {/* Picker lotto */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-1">Lotto Stampa *</label>
          {form.lotto_selezionato ? (
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
              <div>
                <span className="font-bold text-blue-800 text-sm">Lotto {form.lotto_selezionato.lotto}</span>
                <span className="text-gray-600 text-sm ml-2">– {form.lotto_selezionato.cliente}</span>
                <div className="text-xs text-gray-500 mt-0.5">{form.lotto_selezionato.lavoro}</div>
                {form.lotto_selezionato.quantita && (
                  <div className="text-xs text-gray-400">Qtà: {form.lotto_selezionato.quantita.toLocaleString()} pz</div>
                )}
              </div>
              <button onClick={() => set('lotto_selezionato', null)} className="text-blue-400 hover:text-blue-600 ml-2">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Cerca per numero lotto, cliente o lavoro..."
                value={form.lotto_query}
                onChange={e => { set('lotto_query', e.target.value); setShowSuggerimenti(true); }}
                onFocus={() => setShowSuggerimenti(true)}
                autoFocus
              />
              {showSuggerimenti && suggerimenti.length > 0 && (
                <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-56 overflow-y-auto">
                  {suggerimenti.map(l => (
                    <button key={l.id}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-0"
                      onClick={() => { set('lotto_selezionato', l); set('lotto_query', ''); setShowSuggerimenti(false); }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-blue-700 text-sm">#{l.lotto}</span>
                        <span className="font-medium text-gray-800 text-sm truncate">{l.cliente}</span>
                      </div>
                      <div className="text-xs text-gray-500 truncate">{l.lavoro}</div>
                      {l.quantita && <div className="text-xs text-gray-400">Qtà: {l.quantita.toLocaleString()}</div>}
                    </button>
                  ))}
                </div>
              )}
              {form.lotto_query && suggerimenti.length === 0 && (
                <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow mt-1 px-3 py-2 text-sm text-gray-500">
                  Nessun lotto trovato
                </div>
              )}
            </div>
          )}
        </div>

        {/* Fase */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Fase *</label>
          <div className="flex flex-wrap gap-1.5">
            {FASI_PRODUZIONE.map(f => (
              <button key={f.label} onClick={() => setFase(f.label)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                  form.fase === f.label
                    ? f.colore + ' font-bold shadow-sm'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                }`}
              >{f.label}</button>
            ))}
          </div>
        </div>

        {/* Macchina (filtrata per fase) */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Macchina *
            <span className="ml-1 text-xs font-normal text-gray-400">
              ({macchineFase.length} disponibil{macchineFase.length === 1 ? 'e' : 'i'} per questa fase)
            </span>
          </label>
          {macchineFase.length === 0 ? (
            <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Nessuna macchina configurata per questa fase. Aggiungila in "Gestione Macchine".
            </div>
          ) : macchineFase.length === 1 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700">
              <span className="font-medium">{macchineFase[0].nome}</span>
              <span className="text-gray-400 ml-1">({macchineFase[0].tipo})</span>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {macchineFase.map(m => (
                <button key={m.id} onClick={() => set('macchina_id', m.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                    form.macchina_id === m.id
                      ? 'bg-blue-600 text-white border-blue-600 font-medium'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                  }`}
                >{m.nome}</button>
              ))}
            </div>
          )}
        </div>

        {/* Stato */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-1">Stato iniziale</label>
          <div className="flex gap-2">
            {STATI.slice(0, 2).map(s => (
              <button key={s.key} onClick={() => set('stato', s.key)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  form.stato === s.key ? `${s.bg} ${s.color} font-bold` : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                }`}
              >{s.label}</button>
            ))}
          </div>
        </div>

        {/* Date */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Inizio Previsto</label>
            <input type="date" className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
              value={form.data_inizio_prevista} onChange={e => set('data_inizio_prevista', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Fine Prevista</label>
            <input type="date" className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
              value={form.data_fine_prevista} onChange={e => set('data_fine_prevista', e.target.value)} />
          </div>
        </div>

        {/* Note */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-gray-600 mb-1">Note</label>
          <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
            rows={2} value={form.note} onChange={e => set('note', e.target.value)} placeholder="Note aggiuntive..." />
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">Annulla</Button>
          <Button onClick={handleSave}
            disabled={!form.lotto_selezionato || !form.macchina_id || saving}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          >{saving ? 'Salvataggio...' : 'Aggiungi Lavoro'}</Button>
        </div>
      </div>
    </div>
  );
}

// ─── card kanban ──────────────────────────────────────────────────────────────
function KanbanCard({ lavoro, onChangeStato, onDelete }: {
  lavoro: LavoroProduzione;
  onChangeStato: (id: string, stato: Stato) => void;
  onDelete: (id: string) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const lotto = lavoro.lotto_info;
  const fase = lavoro.nome_lavoro.match(/^\[(.+?)\]/)?.[1];
  const faseDef = FASI_PRODUZIONE.find(f => f.label === fase);

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {lotto && (
            <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">
              #{lotto.lotto}
            </span>
          )}
          {fase && (
            <span className={`text-xs font-medium rounded px-1.5 py-0.5 border ${faseDef?.colore || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
              {fase}
            </span>
          )}
        </div>
        <div className="relative">
          <button onClick={() => setShowMenu(v => !v)} className="text-gray-400 hover:text-gray-600 p-0.5 rounded">
            <ChevronDown className="h-4 w-4" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-6 z-20 bg-white border border-gray-200 rounded-lg shadow-lg w-40 py-1"
              onMouseLeave={() => setShowMenu(false)}>
              {STATI.filter(s => s.key !== lavoro.stato).map(s => (
                <button key={s.key}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 ${s.color}`}
                  onClick={() => { onChangeStato(lavoro.id, s.key); setShowMenu(false); }}
                >→ {s.label}</button>
              ))}
              <div className="border-t border-gray-100 mt-1 pt-1">
                <button className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-red-50"
                  onClick={() => { onDelete(lavoro.id); setShowMenu(false); }}>
                  Elimina
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {lotto && (
        <div className="mb-2">
          <div className="text-sm font-semibold text-gray-800 truncate">{lotto.cliente}</div>
          <div className="text-xs text-gray-500 truncate">{lotto.lavoro}</div>
        </div>
      )}

      <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
        <Factory className="h-3 w-3" />
        <span className="truncate">{lavoro.macchina_nome}</span>
      </div>

      {lotto?.quantita && (
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Package className="h-3 w-3" />
          <span>{lotto.quantita.toLocaleString()} pz</span>
        </div>
      )}

      {lavoro.data_fine_prevista && (
        <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
          <CalendarDays className="h-3 w-3" />
          <span>Entro {new Date(lavoro.data_fine_prevista).toLocaleDateString('it-IT')}</span>
        </div>
      )}

      {lavoro.note && (
        <div className="mt-2 text-xs text-gray-500 bg-gray-50 rounded p-1.5 truncate" title={lavoro.note}>
          {lavoro.note}
        </div>
      )}
    </div>
  );
}

// ─── riga lista ───────────────────────────────────────────────────────────────
function ListaRiga({ lavoro, onChangeStato, onDelete }: {
  lavoro: LavoroProduzione;
  onChangeStato: (id: string, stato: Stato) => void;
  onDelete: (id: string) => void;
}) {
  const lotto = lavoro.lotto_info;
  const fase = lavoro.nome_lavoro.match(/^\[(.+?)\]/)?.[1] || '–';
  const faseDef = FASI_PRODUZIONE.find(f => f.label === fase);

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
      <td className="px-3 py-2.5 text-sm">
        {lotto ? <span className="font-bold text-blue-700">#{lotto.lotto}</span> : <span className="text-gray-400">–</span>}
      </td>
      <td className="px-3 py-2.5 text-sm">
        {lotto
          ? <div><div className="font-medium text-gray-800">{lotto.cliente}</div>
              <div className="text-xs text-gray-400 truncate max-w-[180px]">{lotto.lavoro}</div></div>
          : <span className="text-gray-400">–</span>}
      </td>
      <td className="px-3 py-2.5 text-xs">
        <span className={`rounded-full px-2 py-0.5 border text-xs font-medium ${faseDef?.colore || 'bg-gray-100 text-gray-600 border-gray-200'}`}>{fase}</span>
      </td>
      <td className="px-3 py-2.5 text-sm text-gray-600">{lavoro.macchina_nome}</td>
      <td className="px-3 py-2.5 text-sm">{lotto?.quantita ? lotto.quantita.toLocaleString() : '–'}</td>
      <td className="px-3 py-2.5">
        <select
          className={`text-xs font-medium rounded-full px-2 py-0.5 border cursor-pointer ${STATO_BADGE[lavoro.stato as Stato]}`}
          value={lavoro.stato}
          onChange={e => onChangeStato(lavoro.id, e.target.value as Stato)}
        >
          {STATI.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </td>
      <td className="px-3 py-2.5 text-xs text-gray-400">
        {lavoro.data_fine_prevista ? new Date(lavoro.data_fine_prevista).toLocaleDateString('it-IT') : '–'}
      </td>
      <td className="px-3 py-2.5">
        <button onClick={() => onDelete(lavoro.id)} className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50">
          <X className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  );
}

// ─── componente principale ────────────────────────────────────────────────────
export function StatoLavoriTab({ macchine, lavori, storicoLavori, lottiStampa, addLavoro, updateLavoro, deleteLavoro }: Props) {
  const [vista, setVista] = useState<'kanban' | 'lista'>('kanban');
  const [showForm, setShowForm] = useState(false);
  const [filtroTesto, setFiltroTesto] = useState('');
  const [filtroStato, setFiltroStato] = useState<Stato | 'tutti'>('tutti');
  const [filtroMacchina, setFiltroMacchina] = useState('tutti');

  const lavoriVisibili = useMemo(() => {
    return lavori.filter(l => {
      if (filtroStato !== 'tutti' && l.stato !== filtroStato) return false;
      if (filtroMacchina !== 'tutti' && l.macchina_id !== filtroMacchina) return false;
      if (filtroTesto) {
        const q = filtroTesto.toLowerCase();
        if (
          !String(l.lotto_stampa || '').includes(q) &&
          !l.lotto_info?.cliente?.toLowerCase().includes(q) &&
          !l.lotto_info?.lavoro?.toLowerCase().includes(q) &&
          !l.macchina_nome?.toLowerCase().includes(q) &&
          !l.nome_lavoro?.toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [lavori, filtroStato, filtroMacchina, filtroTesto]);

  const contatori = useMemo(() => {
    const c: Record<string, number> = {};
    STATI.forEach(s => { c[s.key] = lavoriVisibili.filter(l => l.stato === s.key).length; });
    return c;
  }, [lavoriVisibili]);

  const handleChangeStato = async (id: string, stato: Stato) => { await updateLavoro(id, { stato }); };
  const handleDelete = async (id: string) => { if (confirm('Eliminare questo lavoro?')) await deleteLavoro(id); };
  const handleSave = async (dati: any) => { await addLavoro(dati); };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Layers className="h-5 w-5 text-blue-600" /> Stato Lavori Attuali
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">{lavori.length} lavori totali</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
          <Plus className="h-4 w-4" /> Nuovo Lavoro
        </Button>
      </div>

      {/* Filtri */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Cerca lotto, cliente, lavoro..."
            value={filtroTesto} onChange={e => setFiltroTesto(e.target.value)}
          />
        </div>
        <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          value={filtroStato} onChange={e => setFiltroStato(e.target.value as any)}>
          <option value="tutti">Tutti gli stati</option>
          {STATI.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          value={filtroMacchina} onChange={e => setFiltroMacchina(e.target.value)}>
          <option value="tutti">Tutte le macchine</option>
          {macchine.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
        </select>
        <div className="flex border border-gray-300 rounded-lg overflow-hidden">
          <button onClick={() => setVista('kanban')}
            className={`px-3 py-2 text-sm flex items-center gap-1.5 transition-colors ${vista === 'kanban' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
            <LayoutGrid className="h-4 w-4" /> Kanban
          </button>
          <button onClick={() => setVista('lista')}
            className={`px-3 py-2 text-sm flex items-center gap-1.5 transition-colors ${vista === 'lista' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
            <List className="h-4 w-4" /> Lista
          </button>
        </div>
      </div>

      {/* Kanban */}
      {vista === 'kanban' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STATI.map(s => {
            const Icon = s.icon;
            const col = lavoriVisibili.filter(l => l.stato === s.key);
            return (
              <div key={s.key} className={`rounded-xl border-2 ${s.bg} p-3 min-h-[200px]`}>
                <div className={`flex items-center justify-between mb-3`}>
                  <div className={`flex items-center gap-1.5 font-semibold text-sm ${s.color}`}>
                    <Icon className="h-4 w-4" />{s.label}
                  </div>
                  <span className={`text-xs font-bold rounded-full px-2 py-0.5 ${s.bg} ${s.color} border`}>{contatori[s.key]}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {col.length === 0 && <div className="text-center py-6 text-xs text-gray-400">Nessun lavoro</div>}
                  {col.map(l => (
                    <KanbanCard key={l.id} lavoro={l} onChangeStato={handleChangeStato} onDelete={handleDelete} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lista */}
      {vista === 'lista' && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['Lotto','Cliente / Lavoro','Fase','Macchina','Qtà','Stato','Fine Prevista',''].map(h => (
                  <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lavoriVisibili.length === 0 && (
                <tr><td colSpan={8} className="text-center py-10 text-gray-400 text-sm">Nessun lavoro trovato</td></tr>
              )}
              {lavoriVisibili.map(l => (
                <ListaRiga key={l.id} lavoro={l} onChangeStato={handleChangeStato} onDelete={handleDelete} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <FormNuovoLavoro
          macchine={macchine} lottiStampa={lottiStampa}
          onSave={handleSave} onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
