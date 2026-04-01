import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Factory, ArrowLeft, ChevronRight, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

interface Macchina { id: string; nome: string; tipo: string; }
interface ContatoreFase { macchina_id: string; pronti: number; in_lavorazione: number; }

const TIPO_COLORI: Record<string, string> = {
  'Premontaggio':    'bg-violet-500',
  'Stampa':          'bg-blue-500',
  'Verniciatura UV': 'bg-cyan-500',
  'Oro a Caldo':     'bg-yellow-500',
  'Fustellatura':    'bg-red-500',
  'Incollatura':     'bg-pink-500',
  'Fine':            'bg-green-500',
  'Esterno':         'bg-orange-500',
  'Pianificazione':  'bg-slate-500',
};

export default function SelezioneMacchina() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [macchine, setMacchine] = useState<Macchina[]>([]);
  const [contatori, setContatori] = useState<Record<string, ContatoreFase>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [macRes, fasiRes] = await Promise.all([
        supabase.from('macchine_produzione').select('*').order('nome'),
        supabase.from('fasi_lotto').select('macchina_id, stato')
          .in('stato', ['pronto', 'in_lavorazione']),
      ]);
      if (macRes.data) setMacchine(macRes.data);
      if (fasiRes.data) {
        const cnt: Record<string, ContatoreFase> = {};
        fasiRes.data.forEach((f: any) => {
          if (!cnt[f.macchina_id]) cnt[f.macchina_id] = { macchina_id: f.macchina_id, pronti: 0, in_lavorazione: 0 };
          if (f.stato === 'pronto') cnt[f.macchina_id].pronti++;
          if (f.stato === 'in_lavorazione') cnt[f.macchina_id].in_lavorazione++;
        });
        setContatori(cnt);
      }
      setLoading(false);
    };
    load();
  }, []);

  const ORDINE_TIPI = ['Premontaggio','Stampa','Verniciatura UV','Oro a Caldo','Fustellatura','Incollatura','Fine','Esterno','Pianificazione'];
  const macchineOrdinate = [...macchine].sort((a, b) => {
    const ia = ORDINE_TIPI.indexOf(a.tipo);
    const ib = ORDINE_TIPI.indexOf(b.tipo);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Factory className="h-5 w-5 text-blue-600" /> Seleziona Macchina
          </h1>
          <p className="text-sm text-gray-400">Ciao {user?.username} — scegli la tua postazione</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-gray-400">Caricamento...</div>
          </div>
        ) : macchineOrdinate.length === 0 ? (
          <div className="text-center py-20">
            <AlertCircle className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400">Nessuna macchina configurata</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {macchineOrdinate.map(m => {
              const cnt = contatori[m.id];
              const haLavori = cnt && (cnt.pronti > 0 || cnt.in_lavorazione > 0);
              const colore = TIPO_COLORI[m.tipo] || 'bg-gray-500';
              return (
                <button key={m.id}
                  onClick={() => navigate(`/macchina/${m.id}`)}
                  className="w-full bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all flex items-center gap-4 p-4 text-left active:scale-[0.99]">
                  {/* Icona tipo */}
                  <div className={`w-12 h-12 ${colore} rounded-xl flex items-center justify-center flex-shrink-0 shadow`}>
                    <Factory className="h-6 w-6 text-white" />
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 text-lg leading-tight">{m.nome}</p>
                    <p className="text-sm text-gray-400">{m.tipo}</p>
                    {haLavori && (
                      <div className="flex items-center gap-3 mt-1.5">
                        {cnt.pronti > 0 && (
                          <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                            <Clock className="h-3 w-3" /> {cnt.pronti} {cnt.pronti === 1 ? 'pronto' : 'pronti'}
                          </span>
                        )}
                        {cnt.in_lavorazione > 0 && (
                          <span className="flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
                            <CheckCircle2 className="h-3 w-3" /> {cnt.in_lavorazione} in lavorazione
                          </span>
                        )}
                      </div>
                    )}
                    {!haLavori && (
                      <p className="text-xs text-gray-300 mt-1">Nessun lavoro attivo</p>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-300 flex-shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
