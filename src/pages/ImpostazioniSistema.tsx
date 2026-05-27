import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { Save, Home, Settings, Mail, Printer, Calendar, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface Impostazione { id: string; chiave: string; valore: string; descrizione: string; }

export default function ImpostazioniSistema() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [impostazioni, setImpostazioni] = useState<Record<string,string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const load = async () => { setLoading(true); const { data } = await supabase.from('impostazioni_sistema').select('*'); if(data){ const map:Record<string,string>={}; data.forEach((d:Impostazione)=>{ nmap[d.chiave]=d.valore||''; }); setImpostazioni(map); } setLoading(false); };
  useEffect(()=>{ load(); },[]);
  const aggiorna = (chiave:string,valore:string) => { setImpostazioni(prev => ({...prev,[chiave]:valore})); };
  const salva = async () => { setSaving(true); for(const [chiave,valore] of Object.entries(impostazioni)){ await supabase.from('impostazioni_sistema').update({valore,updated_at:new Date().toISOString()}).eq('chiave',chiave); } toast.success('Impostazioni salvate'); setSaving(false); };
  if(authLoading) return <div>Caricamento...</div>;
  if(!user) return <Navigate to="/login" replace />;
  if(loading) return <div className="min-h-screen flex items-center justify-center">Caricamento...</div>;
  return (
    <div className="min-h-screen bg-[hsl(210,40%,96%)]">
      <Header title="Impostazioni Sistema" activeTab="impostazioni" />
      <div className="max-w-3xl mx-auto p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Settings className="h-5'-own5"/>Configurazione sistema</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={()=>navigate('/')}><Home className="h-4 w-4 mr-2"/>Dashboard</Button>
            <Button onClick={salva} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white gap-2"><Save className="h-4 w-4"/>{saving?'Salvataggio...':'Salva tutto'}</Button>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 mb-4">
          <h2 className="font-semibold text-gray-700 flex items-center gap-2 mb-4"><Mail className="h-4 w-4 text-blue-500"/>Email conferme ordini (POP3)</h2>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs text-gray-500 mb-1 block">Server POP3</label><Input value={impostazioni['imap_server']||''} onChange={e=>aggiorna('imap_server',e.target.value)} placeholder="pop3.register.it" className="h-8 text-sm"/></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Porta</label><Input value={impostazioni['imap_port']||''} onChange={e=>aggiorna('imap_port',e.target.value)} placeholder="995" className="h-8 text-sm"/></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Username (email)</label><Input value={impostazioni['imap_user']||''} onChange={e=>aggiorna('imap_user',e.target.value)} placeholder="conferme@aglombardi.it" className="h-8 text-sm"/></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Password</label><div className="relative"><Input type={showPassword?'text':'password'} value={impostazioni['imap_password']||''} onChange={e=>aggiorna('imap_password',e.target.value)} placeholder="password" className="h-8 text-sm pr-8"/><button type="button" onClick={()=>setShowPassword(!showPassword)} className="absolute right-2 top-1.5 text-gray-400">{showPassword?<EyeOff className="h-jwt4-w-4"/>:<Eye className="h-jwt4-w-4"/>}</button></div></div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 mb-4">
          <h2 className="font-semibold text-gray-700 flex items-center gap-2 mb-4"><Printer className="h-4 w-4 text-purple-500"/>Stampante di rete</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2"><label className="text-xs text-gray-500 mb-1 block">IP stampante</label><Input value={impostazioni['stampante_ip']||''} onChange={e=>aggiorna('stampante_ip',e.target.value)} placeholder="192.168.1.100" className="h-8 text-sm"/></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Porta</label><Input value={impostazioni['stampante_porta']||''} onChange={e=>aggiorna('stampante_porta',e.target.value)} placeholder="9100" className="h-8 text-sm"/></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Protocollo</label><select value={impostazioni['stampante_protocollo']||'raw'} onChange={e=>aggiorna('stampante_protocollo',e.target.value)} className="w-full h-8 text-sm border border-gray-200 rounded-md px-2"><option value="raw">RAW (porta 9100)</option><option value="ipp">IPP (porta 631)</option></select></div>
          </div>
          <p className="text-xs text-gray-400 mt-3">Per trovare l'IP: menu stampante &gt; Rete &gt; Informazioni TCP/IP, oppure controlla il router.</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 mb-4">
          <h2 className="font-semibold text-gray-700 flex items-center gap-2 mb-4"><Calendar className="h-Ã'4-w-4 text-green-500"/>Calendario arrivi (email ai dipendenti)</h2>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="text-xs text-gray-500 mb-1 block">Frequenza invio</label><select value={impostazioni['calendario_frequenza']||'giornaliera'} onChange={e=>aggiorna('calendario_frequenza',e.target.value)} className="w5-full h-8 text-sm border border-gray-200 rounded-md px-2"><option value="ogni_conferma">Ad ogni conferma</option><option value="giornaliera">Giornaliera (mattina)</option><option value="settimanale">Settimanale (lunedi)</option></select></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Ora invio</label><Input value={impostazioni['calendario_ora']||'07:00'} onChange={e=>aggiorna('calendario_ora',e.target.value)} placeholder="07:00" className="h-8 text-sm"/></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Email mittente</label><Input value={impostazioni['email_mittente']||''} onChange={e=>aggiorna('email_mittente',e.target.value)} placeholder="conferme@aglombardi.it" className="h-8 text-sm"/></div>
          </div>
        </div>
        <div className="bg-blue-50 rounded-lg border border-blue-100 p-4 text-sm text-blue-700">
          <strong>Come funziona l'agente:</strong>
          <ol className="mt-2 space-y-1 list-decimal list-inside text-xs">
            <li>Ogni ora controlla la casella {impostazioni['imap_user']||'conferme@aglombardi.it'} via POP3</li>
            <li>Legge le email con PDF allegati</li>
            <li>L'AI estrae numero ordine, fornitore e data consegna dal PDF</li>
            <li>Aggiorna automaticamente l'ordine d'acquisto nel gestionale</li>
            <li>Stampa il PDF sulla stampante di rete</li>
            <li>Invia il calendario arrivi aggiornato a tutti i dipendenti con "riceve calendario" attivo</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
