import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Clock, Loader2, ArrowLeft, Package, RefreshCw, PlayCircle, ChevronRight, User } from 'lucide-react';

interface FaseLotto {
  id: string;
  programma_id: string;
  programma_nome: string;
  lotto_stampa: number;
  macchina_id: string;
  macchina_nome: string;
  ordine_fase: number;
  stato: 'in_attesa' | 'pronto' | 'in_lavorazione' | 'completato';
  note: string | null;
  completato_at: string | null;
  completato_by: string | null;
  // join
  lotto_info?: { cliente: string; lavoro: string; quantita: number | null; identificativo: string | null; } | null;
}

interface Macchina { id: string; nome: string; tipo: string; }

const STATO_CONFIG = {
  in_attesa:     { label: 'In attesa',     color: 'text-gray-500',  bg: 'bg-gray-50 border-gray-200',   dot: 'bg-gray-400' },
  pronto:        { label: 'Pronto',        color: 'text-amber-700', bg: 'bg-amber-50 border-amber-300', dot: 'bg-amber-500' },
  in_lavorazione:{ label: 'In lavorazione',color: 'text-blue-700',  bg: 'bg-blue-50 border-blue-300',   dot: 'bg-blue-500' },
  completato:    { label: 'Completato',    color: 'text-green-700', bg: 'bg-green-50 border-green-300', dot: 'bg-green-500' },
};

export default function MacchinaView() {
  const { macchinaId } = useParams<{ macchinaId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [macchina, setMacchina] = useState<Macchina | null>(null);
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
      // Arricchisci con dati lotto
      const lottiNums = [...new Set(fasiRes.data.map((f: any) => f.lotto_stampa))];
      let lottiMap = new Map<number, any>();
      if (lottiNums.length > 0) {
        const { data: lottiData } = await supabase.from('lavori_stampa')
          .select('lotto, cliente, lavoro, quantita, identificativo')
          .in('lotto', lottiNums);
        if (lottiData) lottiData.forEach((l: any) => { if (!lottiMap.has(l.lotto)) lottiMap.set(l.lotto, l); });
      }
      setFasi(fasiRes.data.map((f: any) => ({ ...f, lotto_info: lottiMap.get(f.lotto_stampa) || null })));
    }
    setLoading(false);
  }, [macchinaId]);

  useEffect(() => {
    loadData();
    // Realtime
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

    // Se completato → sblocca la fase successiva dello stesso lotto nello stesso programma
    if (nuovoStato === 'completato') {
      const { data: fassiLotto } = await supabase.from('fasi_lotto')
        .select('*')
        .eq('programma_id', fase.programma_id)
        .eq('lotto_stampa', fase.lotto_stampa)
        .order('ordine_fase');
      if (fassiLotto) {
        const prossima = fassiLotto.find((f: any) => f.ordine_fase === fase.ordine_fase + 1);
        if (prossima && prossima.stato === 'in_attesa') {
          await supabase.from('fasi_lotto').update({ stato: 'pronto' }).eq('id', prossima.id);
        }
      }
    }
    setAggiornando(null);
    await loadData();
  };

  const fasiVisibili = fasi.filter(f =>
    filtroStato === 'attivi'
      ? f.stato !== 'completato'
      : f.stato === 'completato'
  );

  // Raggruppa per programma
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
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
        <button onClick={() => navigate('/gestione-produzione')}
          className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-800">{macchina?.nome || 'Caricamento...'}</h1>
          <p className="text-xs text-gray-400">{macchina?.tipo} · {user?.username}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">
            {contatori.pronti} pronti
          </span>
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
              filtroStato === f
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-500 border-gray-300 hover:border-blue-400'
            }`}>
            {f === 'attivi' ? `Attivi (${contatori.attivi})` : `Completati (${contatori.completati})`}
          </button>
        ))}
      </div>

      {/* Contenuto */}
      <div className="px-4 pb-8">
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
                  const lotto = fase.lotto_info;
                  const isActing = aggiornando === fase.id;
                  const canAct = fase.stato === 'pronto' || fase.stato === 'in_lavorazione';

                  return (
                    <div key={fase.id}
                      className={`bg-white rounded-xl border-2 shadow-sm transition-all ${cfg.bg} ${canAct ? 'cursor-pointer hover:shadow-md active:scale-[0.99]' : ''}`}
                      onClick={() => canAct && !isActing && avanzaStato(fase)}>
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            {/* Lotto + badge stato */}
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-lg font-black text-blue-700">#{fase.lotto_stampa}</span>
                              <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                                {cfg.label}
                              </span>
                            </div>
                            {lotto ? (
                              <>
                                <p className="font-bold text-gray-800 text-base leading-tight">{lotto.cliente}</p>
                                <p className="text-sm text-gray-500 truncate mt-0.5">{lotto.lavoro}</p>
                                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                                  {lotto.quantita && (
                                    <span className="flex items-center gap-1">
                                      <Package className="h-3 w-3" /> {lotto.quantita.toLocaleString()} pz
                                    </span>
                                  )}
                                  {lotto.identificativo && <span>{lotto.identificativo}</span>}
                                </div>
                              </>
                            ) : (
                              <p className="text-gray-400 text-sm">Lotto {fase.lotto_stampa}</p>
                            )}
                            {fase.note && (
                              <p className="mt-2 text-xs text-gray-500 bg-white/60 rounded px-2 py-1 border border-gray-100">{fase.note}</p>
                            )}
                          </div>
                          {/* Azione */}
                          <div className="flex-shrink-0">
                            {isActing ? (
                              <div className="w-14 h-14 flex items-center justify-center">
                                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                              </div>
                            ) : fase.stato === 'pronto' ? (
                              <div className="w-14 h-14 bg-amber-500 hover:bg-amber-600 rounded-xl flex flex-col items-center justify-center text-white shadow-md transition-colors">
                                <PlayCircle className="h-6 w-6" />
                                <span className="text-[10px] font-bold mt-0.5">AVVIA</span>
                              </div>
                            ) : fase.stato === 'in_lavorazione' ? (
                              <div className="w-14 h-14 bg-green-500 hover:bg-green-600 rounded-xl flex flex-col items-center justify-center text-white shadow-md transition-colors">
                                <CheckCircle2 className="h-6 w-6" />
                                <span className="text-[10px] font-bold mt-0.5">FATTO</span>
                              </div>
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
    </div>
  );
}
