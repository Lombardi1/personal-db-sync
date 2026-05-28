import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { RefreshCw, Home, CheckCircle, XCircle, AlertCircle, Mail, ChevronDown, ChevronUp, Filter, Trash2 } from 'lucide-react';

interface LogElaborazione {
  id: string;
  email_mittente: string;
  email_oggetto: string;
  pdf_nome: string;
  ordine_numero: string | null;
  data_consegna_estratta: string | null;
  stato: string;
  note: string;
  created_at: string;
}

export default function LogConferme() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<LogElaborazione[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtroStato, setFiltroStato] = useState<string>('tutti');
  const [espansi, setEspansi] = useState<Set<string>>(new Set());
  const [cerca, setCerca] = useState('');

  const loadLogs = async () => {
    setLoading(true);
    const { data } = await supabase.from('log_email_conferme').select('*').order('created_at', { ascending: false }).limit(200);
    setLogs(data || []);
    setLoading(false);
  };

  useEffect(() => { loadLogs(); }, []);

  const toggleEspanso = (id: string) => {
    setEspansi(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const logsFiltrati = logs.filter(l => {
    const matchStato = filtroStato === 'tutti' || l.stato === filtroStato;
    const matchCerca = !cerca || l.email_oggetto?.toLowerCase().includes(cerca.toLowerCase()) || l.email_mittente?.toLowerCase().includes(cerca.toLowerCase()) || l.note?.toLowerCase().includes(cerca.toLowerCase()) || l.ordine_numero?.toLowerCase().includes(cerca.toLowerCase());
    return matchStato && matchCerca;
  });

  const stats = { totale: logs.length, elaborati: logs.filter(l => l.stato === 'elaborato').length, non_trovati: logs.filter(l => l.stato === 'non_trovato').length, errori: logs.filter(l => !['elaborato','non_trovato'].includes(l.stato)).length };

  const iconaStato = (stato: string) => {
    if (stato === 'elaborato') return <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />;
    if (stato === 'non_trovato') return <AlertCircle className="h-5 w-5 text-orange-400 flex-shrink-0" />;
    return <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />;
  };

  const badgeStato = (stato: string) => stato === 'elaborato' ? 'bg-green-100 text-green-700 border border-green-200' : stato === 'non_trovato' ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-red-100 text-red-700 border border-red-200';
  const labelStato = (stato: string) => stato === 'elaborato' ? 'Elaborato ✓' : stato === 'non_trovato' ? 'Non trovato' : stato === 'errore' ? 'Errore' : stato;

  if (authLoading) return <div>Caricamento...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-[hsl(210,40%,96%)]">
      <Header title="Log Conferme Ordini" activeTab="agente" />
      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Mail className="h-5 w-5 text-blue-600" />Log Conferme Ordini</h1>
            <p className="text-sm text-gray-500 mt-1">Storico elaborazioni email da conferme@aglombardi.it</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => loadLogs()} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading?'animate-spin':''}`}/></Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/')}><Home className="h-4 w-4 mr-1"/>Dashboard</Button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-lg p-3 border border-gray-100 text-center cursor-pointer hover:bg-gray-50" onClick={() => setFiltroStato('tutti')}><div className="text-2xl font-bold text-gray-700">{stats.totale}</div><div className="text-xs text-gray-500 mt-1">Totale</div></div>
          <div className="bg-green-50 rounded-lg p-3 border border-green-100 text-center cursor-pointer hover:bg-green-100" onClick={() => setFiltroStato('elaborato')}><div className="text-2xl font-bold text-green-600">{stats.elaborati}</div><div className="text-xs text-green-600 mt-1 flex items-center justify-center gap-1"><CheckCircle className="h-3 w-3"/>Elaborati</div></div>
          <div className="bg-orange-50 rounded-lg p-3 border border-orange-100 text-center cursor-pointer hover:bg-orange-100" onClick={() => setFiltroStato('non_trovato')}><div className="text-2xl font-bold text-orange-500">{stats.non_trovati}</div><div className="text-xs text-orange-600 mt-1 flex items-center justify-center gap-1"><AlertCircle className="h-3 w-3"/>Non trovati</div></div>
          <div className="bg-red-50 rounded-lg p-3 border border-red-100 text-center cursor-pointer hover:bg-red-100" onClick={() => setFiltroStato('errore')}><div className="text-2xl font-bold text-red-500">{stats.errori}</div><div className="text-xs text-red-600 mt-1 flex items-center justify-center gap-1"><XCircle className="h-3 w-3"/>Errori</div></div>
        </div>

        <div className="bg-white rounded-lg border border-gray-100 p-3 mb-4 flex gap-3 items-center">
          <Filter className="h-4 w-4 text-gray-400 flex-shrink-0"/>
          <input type="text" placeholder="Cerca per oggetto, mittente, ordine..." value={cerca} onChange={e => setCerca(e.target.value)} className="flex-1 text-sm outline-none"/>
          <div className="flex gap-1">
            {['tutti','elaborato','non_trovato','errore'].map(s => (
              <button key={s} onClick={() => setFiltroStato(s)} className={`text-xs px-3 py-1 rounded-full border transition-colors ${filtroStato===s?'bg-blue-600 text-white border-blue-600':'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                {s==='tutti'?'Tutti':s==='elaborato'?'Elaborati':s==='non_trovato'?'Non trovati':'Errori'}
              </button>
            ))}
          </div>
          {(cerca||filtroStato!=='tutti') && <button onClick={() => { setCerca(''); setFiltroStato('tutti'); }} className="text-xs text-gray-400 hover:text-gray-600"><Trash2 className="h-4 w-4"/></button>}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 divide-y divide-gray-50">
          {loading && <div className="text-center py-8 text-gray-400">Caricamento...</div>}
          {!loading && logsFiltrati.length === 0 && <div className="text-center py-12 text-gray-400"><Mail className="h-12 w-12 mx-auto mb-3 opacity-20"/><p className="text-sm">Nessuna elaborazione trovata.</p></div>}
          {logsFiltrati.map((log) => (
            <div key={log.id} className={`hover:bg-gray-50 transition-colors ${log.stato==='elaborato'?'border-l-4 border-green-400':log.stato==='non_trovato'?'border-l-4 border-orange-300':'border-l-4 border-red-400'}`}>
              <div className="p-4 flex items-start gap-3 cursor-pointer" onClick={() => toggleEspanso(log.id)}>
                {iconaStato(log.stato)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm text-gray-800 block truncate">{log.email_oggetto||'(nessun oggetto)'}</span>
                      <span className="text-xs text-gray-400">{log.email_mittente}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeStato(log.stato)}`}>{labelStato(log.stato)}</span>
                      <span className="text-xs text-gray-400 whitespace-nowrap">{new Date(log.created_at).toLocaleString('it-IT',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</span>
                      {espansi.has(log.id)?<ChevronUp className="h-4 w-4 text-gray-400"/>:<ChevronDown className="h-4 w-4 text-gray-400"/>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {log.pdf_nome && <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-500">📄 {log.pdf_nome}</span>}
                    {log.ordine_numero && <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">🔢 {log.ordine_numero}</span>}
                    {log.data_consegna_estratta && <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">📅 {log.data_consegna_estratta}</span>}
                  </div>
                </div>
              </div>
              {espansi.has(log.id) && (
                <div className="px-4 pb-4 ml-8">
                  <div className="bg-gray-50 rounded-lg p-3 text-xs font-mono text-gray-600 whitespace-pre-wrap border border-gray-100">{log.note||'(nessuna nota)'}</div>
                </div>
              )}
            </div>
          ))}
        </div>
        {logsFiltrati.length > 0 && <p className="text-xs text-gray-400 text-center mt-3">{logsFiltrati.length} record mostrati</p>}
      </div>
    </div>
  );
}
