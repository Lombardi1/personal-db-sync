import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Clock, Loader2, ArrowLeft, Package, RefreshCw, PlayCircle, Scissors, Layers, Flame, Droplets, Box, MessageSquare, Send, AlertTriangle } from 'lucide-react';

interface FaseLotto {
  id: string;
  programma_id: string;
  programma_nome: string;
  lotto_stampa: number;
  macchina_id: string;
  macchina_nome: string;
  ordine_fase: number;
  stato: 'in_attesa' | 'pronto' | 'in_lavorazione' | 'completato';
  note?: string;
  completato_at?: string;
  lotto_info?: { cliente: string; lavoro: string; quantita: number; identificativo?: string; polimero?: string; fustella?: string; cartone?: string; colori?: string; };
}

interface ChatMessage { id: string; content: string; sender_nome: string; created_at: string; is_mine: boolean; }

const STATO_CONFIG = {
  in_attesa:     { label: 'In attesa',     color: 'text-gray-500',  bg: 'bg-gray-50',   dot: 'bg-gray-400',  border: 'border-gray-200' },
  pronto:        { label: 'Pronto',        color: 'text-amber-700', bg: 'bg-amber-50',  dot: 'bg-amber-500', border: 'border-amber-300' },
  in_lavorazione:{ label: 'In lavorazione',color: 'text-blue-700',  bg: 'bg-blue-50',   dot: 'bg-blue-500',  border: 'border-blue-300' },
  completato:    { label: 'Completato',    color: 'text-green-700', bg: 'bg-green-50',  dot: 'bg-green-500', border: 'border-green-200' },
};

// --- Pannello quantità per reparto ---
function PannelloQuantita({ fase, tipoReparto, onSalva }: { fase: FaseLotto; tipoReparto: string; onSalva: (q: number, s: number, note: string) => Promise<void>; }) {
  const [qta, setQta] = useState('');
  const [scarti, setScarti] = useState('');
  const [nota, setNota] = useState('');
  const [saving, setSaving] = useState(false);

  const labels: Record<string, { qta: string; scarti: string }> = {
    Fustellatura: { qta: 'Fogli fustellati', scarti: 'Fogli scartati' },
    Incollatura:  { qta: 'Pezzi incollati',  scarti: 'Pezzi scartati' },
    Impacchettamento: { qta: 'Pezzi confezionati', scarti: 'Pezzi scartati' },
  };
  const lbl = labels[tipoReparto] || { qta: 'Quantità prodotta', scarti: 'Scarti' };

  const handleSalva = async () => {
    if (!qta) return;
    setSaving(true);
    await onSalva(parseInt(qta), parseInt(scarti || '0'), nota);
    setQta(''); setScarti(''); setNota('');
    setSaving(false);
  };

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Registra produzione</p>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <label className="text-xs text-gray-400 mb-0.5 block">{lbl.qta}</label>
          <input type="number" value={qta} onChange={e=>setQta(e.target.value)} placeholder="0"
            className="w-full border rounded-lg px-3 py-2 text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-0.5 block">{lbl.scarti}</label>
          <input type="number" value={scarti} onChange={e=>setScarti(e.target.value)} placeholder="0"
            className="w-full border rounded-lg px-3 py-2 text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-red-400 border-red-200" />
        </div>
      </div>
      <input value={nota} onChange={e=>setNota(e.target.value)} placeholder="Note (opzionale)"
        className="w-full border rounded-lg px-3 py-2 text-xs mb-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
      <button onClick={handleSalva} disabled={!qta || saving}
        className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-2">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
        Salva produzione
      </button>
    </div>
  );
}

// --- Scheda tecnica per fustellatura ---
function SchedaFustellatura({ lotto }: { lotto: FaseLotto['lotto_info'] }) {
  if (!lotto) return null;
  return (
    <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2">
      {lotto.fustella && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-2">
          <div className="flex items-center gap-1 text-orange-600 mb-1">
            <Scissors className="h-3 w-3" /><span className="text-xs font-bold uppercase">Fustella</span>
          </div>
          <p className="text-sm font-black text-orange-800">{lotto.fustella}</p>
        </div>
      )}
      {lotto.cartone && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2">
          <div className="flex items-center gap-1 text-yellow-700 mb-1">
            <Layers className="h-3 w-3" /><span className="text-xs font-bold uppercase">Cartone</span>
          </div>
          <p className="text-sm font-black text-yellow-800">{lotto.cartone}</p>
        </div>
      )}
    </div>
  );
}

// --- Scheda tecnica per incollatura ---
function SchedaIncollatura({ lotto }: { lotto: FaseLotto['lotto_info'] }) {
  if (!lotto) return null;
  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      {lotto.fustella && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-2 mb-2">
          <div className="flex items-center gap-1 text-purple-600 mb-1">
            <Layers className="h-3 w-3" /><span className="text-xs font-bold uppercase">Fustella</span>
          </div>
          <p className="text-sm font-black text-purple-800">{lotto.fustella}</p>
        </div>
      )}
    </div>
  );
}

// --- Mini chat con ufficio ---
function MiniChat({ macchinaId, macchinaId: _mid, userId, userName }: { macchinaId: string; userId: string; userName: string; }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [testo, setTesto] = useState('');
  const [chatId, setChatId] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    // Trova o crea chat macchina-ufficio
    const initChat = async () => {
      const { data: users } = await supabase.from('app_users').select('id').eq('username', 'admin');
      const adminId = users?.[0]?.id;
      if (!adminId || !userId) return;
      const participants = [userId, adminId].sort();
      const { data: existing } = await supabase.from('chats')
        .select('id').contains('participant_ids', participants).limit(1);
      if (existing?.[0]) { setChatId(existing[0].id); return; }
      const { data: newChat } = await supabase.from('chats')
        .insert({ participant_ids: participants, name: `Macchina - ${userName}` }).select('id').single();
      if (newChat) setChatId(newChat.id);
    };
    if (userId) initChat();
  }, [userId, userName]);

  useEffect(() => {
    if (!chatId) return;
    const loadMsgs = async () => {
      const { data } = await supabase.from('messages').select('*').eq('chat_id', chatId).order('created_at').limit(50);
      if (data) setMsgs(data.map((m: any) => ({ ...m, sender_nome: m.sender_id === userId ? 'Tu' : 'Ufficio', is_mine: m.sender_id === userId })));
    };
    loadMsgs();
    const ch = supabase.channel(`chat-${chatId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` }, () => { loadMsgs(); if (!open) setUnread(u => u+1); }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [chatId, userId, open]);

  useEffect(() => { if (open) setUnread(0); }, [open]);

  const invia = async () => {
    if (!testo.trim() || !chatId || !userId) return;
    await supabase.from('messages').insert({ chat_id: chatId, sender_id: userId, content: testo.trim() });
    setTesto('');
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {open && (
        <div className="mb-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col" style={{height:'360px'}}>
          <div className="px-4 py-3 border-b flex items-center justify-between bg-blue-600 rounded-t-2xl">
            <span className="text-white font-bold text-sm flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Chat Ufficio</span>
            <button onClick={() => setOpen(false)} className="text-blue-200 hover:text-white text-lg leading-none">×</button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
            {msgs.length === 0 && <p className="text-xs text-gray-400 text-center mt-4">Nessun messaggio</p>}
            {msgs.map(m => (
              <div key={m.id} className={`flex ${m.is_mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${m.is_mine ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                  <p>{m.content}</p>
                  <p className={`text-[10px] mt-0.5 ${m.is_mine ? 'text-blue-200' : 'text-gray-400'}`}>{new Date(m.created_at).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="p-3 border-t flex gap-2">
            <input value={testo} onChange={e=>setTesto(e.target.value)} onKeyDown={e=>e.key==='Enter'&&invia()}
              placeholder="Scrivi un messaggio..." className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button onClick={invia} disabled={!testo.trim()} className="bg-blue-600 text-white rounded-lg px-3 disabled:opacity-40">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      <button onClick={() => setOpen(o=>!o)}
        className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-xl flex items-center justify-center relative">
        <MessageSquare className="h-6 w-6" />
        {unread > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">{unread}</span>}
      </button>
    </div>
  );
}

// --- Icona per tipo reparto ---
function IconaReparto({ tipo }: { tipo: string }) {
  const map: Record<string, JSX.Element> = {
    Fustellatura:   <Scissors className="h-5 w-5 text-orange-500" />,
    Incollatura:    <Droplets className="h-5 w-5 text-purple-500" />,
    Impacchettamento: <Box className="h-5 w-5 text-teal-500" />,
    Premontaggio:   <Layers className="h-5 w-5 text-indigo-500" />,
    'Oro a Caldo':  <Flame className="h-5 w-5 text-amber-500" />,
    'Verniciatura UV': <Droplets className="h-5 w-5 text-cyan-500" />,
  };
  return map[tipo] || <Package className="h-5 w-5 text-blue-500" />;
}

export default function MacchinaView() {
  const { macchinaId } = useParams<{ macchinaId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [macchina, setMacchina] = useState<any>(null);
  const [fasi, setFasi] = useState<FaseLotto[]>([]);
  const [loading, setLoading] = useState(true);
  const [aggiornando, setAggiornando] = useState<string | null>(null);
  const [filtroStato, setFiltroStato] = useState<'attivi' | 'completati'>('attivi');

  const loadData = useCallback(async () => {
    if (!macchinaId) return;
    setLoading(true);
    const [macRes, fasiRes] = await Promise.all([
      supabase.from('macchine_produzione').select('*').eq('id', macchinaId).single(),
      supabase.from('fasi_lotto').select('*').eq('macchina_id', macchinaId)
        .order('programma_nome').order('lotto_stampa'),
    ]);
    if (macRes.data) setMacchina(macRes.data);
    if (fasiRes.data) {
      const lottiNums = [...new Set(fasiRes.data.map((f: any) => f.lotto_stampa))];
      const lottiMap = new Map<number, any>();
      if (lottiNums.length > 0) {
        const { data: lottiData } = await supabase.from('lavori_stampa')
          .select('lotto, cliente, lavoro, quantita, identificativo, polimero, fustella, cartone, colori')
          .in('lotto', lottiNums);
        if (lottiData) lottiData.forEach((l: any) => { if (!lottiMap.has(l.lotto)) lottiMap.set(l.lotto, l); });
      }
      setFasi(fasiRes.data.map((f: any) => ({ ...f, lotto_info: lottiMap.get(f.lotto_stampa) })));
    }
    setLoading(false);
  }, [macchinaId]);

  useEffect(() => {
    loadData();
    const ch = supabase.channel(`fasi-macchina-${macchinaId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fasi_lotto',
        filter: `macchina_id=eq.${macchinaId}` }, loadData)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [macchinaId, loadData]);

  const avanzaStato = async (fase: FaseLotto) => {
    setAggiornando(fase.id);
    const nuovoStato = fase.stato === 'pronto' ? 'in_lavorazione'
      : fase.stato === 'in_lavorazione' ? 'completato' : null;
    if (!nuovoStato) { setAggiornando(null); return; }
    const update: any = { stato: nuovoStato };
    if (nuovoStato === 'completato') {
      update.completato_at = new Date().toISOString();
      update.completato_by = user?.id;
    }
    await supabase.from('fasi_lotto').update(update).eq('id', fase.id);
    if (nuovoStato === 'completato') {
      const { data: fassiLotto } = await supabase.from('fasi_lotto')
        .select('*').eq('programma_id', fase.programma_id).eq('lotto_stampa', fase.lotto_stampa)
        .order('ordine_fase');
      if (fassiLotto) {
        const prossima = fassiLotto.find((f: any) => f.ordine_fase === fase.ordine_fase + 1);
        if (prossima && prossima.stato === 'in_attesa')
          await supabase.from('fasi_lotto').update({ stato: 'pronto' }).eq('id', prossima.id);
      }
    }
    setAggiornando(null);
    await loadData();
  };

  const salvaQuantita = async (fase: FaseLotto, quantita: number, scarti: number, note: string) => {
    await supabase.from('produzione_quantita').insert({
      macchina_id: macchinaId,
      macchina_nome: macchina?.nome || '',
      lotto_stampa: fase.lotto_stampa,
      programma_id: fase.programma_id,
      user_id: user?.id,
      tipo_reparto: macchina?.tipo || '',
      quantita_prodotta: quantita,
      scarti,
      note,
      fase_id: fase.id,
    });
  };

  const tipoReparto = macchina?.tipo || '';
  const conQuantita = ['Fustellatura', 'Incollatura', 'Impacchettamento'].includes(tipoReparto);
  const fasiVisibili = fasi.filter(f => filtroStato === 'attivi' ? f.stato !== 'completato' : f.stato === 'completato');
  const perProgramma = fasiVisibili.reduce((acc, f) => {
    if (!acc[f.programma_nome]) acc[f.programma_nome] = [];
    acc[f.programma_nome].push(f);
    return acc;
  }, {} as Record<string, FaseLotto[]>);
  const contatori = {
    attivi: fasi.filter(f => f.stato !== 'completato').length,
    pronti: fasi.filter(f => f.stato === 'pronto').length,
    completati: fasi.filter(f => f.stato === 'completato').length,
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/gestione-produzione')}
          className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <IconaReparto tipo={tipoReparto} />
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-800">{macchina?.nome || 'Caricamento...'}</h1>
          <p className="text-xs text-gray-400">{tipoReparto} · {user?.username}</p>
        </div>
        <div className="flex items-center gap-2">
          {contatori.pronti > 0 && (
            <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
              {contatori.pronti} pronti
            </span>
          )}
          <button onClick={loadData} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Filtro */}
      <div className="px-4 pt-4 pb-2 flex gap-2">
        {(['attivi', 'completati'] as const).map(f => (
          <button key={f} onClick={() => setFiltroStato(f)}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
              filtroStato === f ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-300 hover:border-blue-400'
            }`}>
            {f === 'attivi' ? `Attivi (${contatori.attivi})` : `Completati (${contatori.completati})`}
          </button>
        ))}
      </div>

      {/* Contenuto */}
      <div className="px-4 pb-24">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : fasiVisibili.length === 0 ? (
          <div className="text-center py-20">
            <CheckCircle2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">
              {filtroStato === 'attivi' ? 'Nessun lavoro attivo' : 'Nessun lavoro completato'}
            </p>
            <p className="text-gray-300 text-sm mt-1">
              {filtroStato === 'attivi' ? 'Tutti i lavori sono completati!' : ''}
            </p>
          </div>
        ) : (
          Object.entries(perProgramma).map(([programma, faseProg]) => (
            <div key={programma} className="mt-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{programma}</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              <div className="flex flex-col gap-3">
                {faseProg.map(fase => {
                  const cfg = STATO_CONFIG[fase.stato];
                  const isActing = aggiornando === fase.id;
                  const lotto = fase.lotto_info;
                  const canAct = fase.stato === 'pronto' || fase.stato === 'in_lavorazione';
                  return (
                    <div key={fase.id}
                      className={`bg-white rounded-xl border-2 shadow-sm transition-all ${cfg.border}`}>
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            {/* Badge lotto + stato */}
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-lg font-black text-blue-700">#{fase.lotto_stampa}</span>
                              <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                                {cfg.label}
                              </span>
                            </div>
                            {/* Info lavoro */}
                            {lotto ? (
                              <>
                                <p className="font-bold text-gray-800 text-base leading-tight">{lotto.cliente}</p>
                                <p className="text-sm text-gray-500 truncate mt-0.5">{lotto.lavoro}</p>
                                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 flex-wrap">
                                  {lotto.quantita && (
                                    <span className="flex items-center gap-1">
                                      <Package className="h-3 w-3" /> {lotto.quantita.toLocaleString()} pz
                                    </span>
                                  )}
                                  {lotto.identificativo && <span className="bg-gray-100 rounded px-1.5 py-0.5">{lotto.identificativo}</span>}
                                </div>
                              </>
                            ) : (
                              <p className="text-gray-400 text-sm">Lotto {fase.lotto_stampa}</p>
                            )}
                            {fase.note && (
                              <p className="mt-2 text-xs text-gray-500 bg-gray-50 rounded px-2 py-1 border border-gray-100 flex items-start gap-1">
                                <AlertTriangle className="h-3 w-3 text-amber-400 mt-0.5 flex-shrink-0" />{fase.note}
                              </p>
                            )}
                          </div>
                          {/* Pulsante azione */}
                          <div className="flex-shrink-0">
                            {isActing ? (
                              <div className="w-14 h-14 flex items-center justify-center">
                                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                              </div>
                            ) : fase.stato === 'pronto' ? (
                              <button onClick={() => avanzaStato(fase)}
                                className="w-14 h-14 bg-amber-500 hover:bg-amber-600 text-white rounded-xl flex flex-col items-center justify-center shadow active:scale-95 transition-transform">
                                <PlayCircle className="h-6 w-6" />
                                <span className="text-[10px] font-bold mt-0.5">AVVIA</span>
                              </button>
                            ) : fase.stato === 'in_lavorazione' ? (
                              <button onClick={() => avanzaStato(fase)}
                                className="w-14 h-14 bg-green-500 hover:bg-green-600 text-white rounded-xl flex flex-col items-center justify-center shadow active:scale-95 transition-transform">
                                <CheckCircle2 className="h-6 w-6" />
                                <span className="text-[10px] font-bold mt-0.5">FATTO</span>
                              </button>
                            ) : fase.stato === 'completato' ? (
                              <div className="w-14 h-14 bg-gray-100 rounded-xl flex flex-col items-center justify-center text-gray-400">
                                <CheckCircle2 className="h-6 w-6" />
                                <span className="text-[10px] font-bold mt-0.5">OK</span>
                              </div>
                            ) : (
                              <div className="w-14 h-14 bg-gray-50 rounded-xl flex items-center justify-center">
                                <Clock className="h-6 w-6 text-gray-300" />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Scheda tecnica per fustellatura */}
                        {tipoReparto === 'Fustellatura' && lotto && (
                          <SchedaFustellatura lotto={lotto} />
                        )}

                        {/* Scheda tecnica per incollatura */}
                        {tipoReparto === 'Incollatura' && lotto && (
                          <SchedaIncollatura lotto={lotto} />
                        )}

                        {/* Pannello quantità (fustellatura, incollatura, impacchettamento) */}
                        {conQuantita && fase.stato === 'in_lavorazione' && (
                          <PannelloQuantita
                            fase={fase}
                            tipoReparto={tipoReparto}
                            onSalva={(q, s, n) => salvaQuantita(fase, q, s, n)}
                          />
                        )}

                        {/* Footer completato */}
                        {fase.stato === 'completato' && fase.completato_at && (
                          <div className="mt-2 pt-2 border-t border-green-200 text-xs text-green-600 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Completato {new Date(fase.completato_at).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Chat flottante con ufficio */}
      {user && macchinaId && (
        <MiniChat macchinaId={macchinaId} userId={user.id} userName={user.username} />
      )}
    </div>
  );
}
