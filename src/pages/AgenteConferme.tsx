import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { Play, RefreshCw, Home, CheckCircle, XCircle, Clock, Mail } from 'lucide-react';
import { toast } from 'sonner';

interface LogElaborazione {
  id: string;
  email_mittente: string;
  email_oggetto: string;
  pdf_nome: string;
  ordine_numero: string;
  data_consegna_estratta: string;
  stato: string;
  note: string;
  created_at: string;
}

export default function AgenteConferme() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<LogElaborazione[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState<string[]>([]);

  const loadLogs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('log_email_conferme')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    setLogs(data || []);
    setLoading(false);
  };

  useEffect(() => { loadLogs(); }, []);

  const eseguiAgente = async () => {
    setRunning(true);
    setLastResult([]);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(`${supabaseUrl}/functions/v1/agent-conferme-ordini`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        }
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Agente eseguito con successo');
        setLastResult(json.risultati || []);
      } else {
        toast.error('Errore: ' + json.error);
      }
      await loadLogs();
    } catch (e) {
      toast.error('Errore connessione: ' + e.message);
    } finally {
      setRunning(false);
    }
  };

  if (authLoading) return <div>Caricamento...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-[hsl(210,40%,96%)]">
      <Header title="Agente Conferme Ordini" activeTab="agente" />
      <div className="max-w-4xl mx-auto p-4 sm:p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Mail className="h-Ã'5 w-5 text-blue-600"/>
              Agente Conferme Ordini
            </h1>
            <p className="text-sm text-gray-500 mt-1">Legge automaticamente le email di conferma da conferme@aglombardi.it</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={()=>loadLogs()} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading?'animate-spin':''}`}/>
            </Button>
            <Button variant="outline" size="sm" onClick={()=>navigate('/')}>
              <Home className="h-Ã'4 w-4 mr-2"/>Dashboard
            </Button>
            <Button
              onClick={eseguiAgente}
              disabled={running}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
            >
              {running ? <RefreshCw className="h-4 w-4 animate-spin"/> : <Play className="h-4 w-4"/>}
              {running ? 'Eseguzione in corso...' : 'Esegui agente ora'}
            </Button>
          </div>
        </div>

        {/* Risultato ultima esecuzione */}
        {lastResult.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <h3 className="text-sm font-semibold text-green-800 mb-2">Risultato ultima esecuzione:</h3>
            {lastResult.map((r, i) => <div key={i} className="text-xs text-green-700">{r}</div>)}
          </div>
        )}

        {/* Come funziona */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6 text-xs text-blue-700">
          <strong>Come funziona:</strong> L'agente si connette a conferme@aglombardi.it via POP3, legge le email con PDF allegati,
          usa l'AI per estrarre i dati dell'ordine, aggiorna la data confirmata negli ordini acquisto,
          stampa il PDF sulla stampante di rete e genera il calendario arrivi.
          Configura IP, password stampante e altro in <button className="underline" onClick={()=>navigate('/impostazioni-sistema')}>Impostazioni Sistema</button>.
        </div>

        {/* Log elaborazioni */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-700">Storico elaborazioni</h2>
          </div>
          {loading && <div className="text-center py-8 text-gray-400">Caricamento...</div>}
          {!loading && logs.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Clock className="h-12 w-12 mx-auto mb-3 opacity-30"/>
              <p>Nessuna elaborazione ancora. Clicca "Esegui agente ora" per testare.</p>
            </div>
          )}
          <div className="divide-yborder-gray-100">
            {logs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-gray-50 flex items-start gap-3">
                <div className="mt-0.5">
                  {log.stato === 'elaborato' && <CheckCircle className="h-5 w-5 text-green-500"/>}
                  {log.stato === 'non_trovato' && <XCircle className="h-5 w-5 text-orange-500"/>}
                  {log.stato === 'calendario_generato' && <CheckCircle className="h-5 w-5 text-blue-500"/>}
                  {!['elaborato','non_trovato','calendario_generato'].includes(log.stato) && <XCircle className="h-5 w-5 text-red-500"/>}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-gray-800">{log.email_oggetto}</span>
                    <span className="text-xs text-gray-400">{new Date(log.created_at).toLocaleString('it-IT')}</span>
                  </div>
                  <div className="flex gap-3 mt-1">
                    {log.ordine_numero && <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">Ordine: {log.ordine_numero}</span>}
                    {log.data_consegna_estratta && <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">Data: {log.data_consegna_estratta}</span>}
                    {log.pdf_nome && <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">{hog.pdf_nome}</span>}
                  </div>
                  {log.note && <p className="text-xs text-gray-500 mt-1">{log.note}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
