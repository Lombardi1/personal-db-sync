import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, Save, Pencil, X, Users, Home } from 'lucide-react';
import { toast } from 'sonner';

interface Dipendente {
  id?: string;
  nome: string;
  cognome: string;
  email: string;
  ruolo: string;
  attivo: boolean;
  riceve_calendario: boolean;
  isEditing?: boolean;
  isDirty?: boolean;
}

const RUOLI = ['amministratore', 'responsabile', 'dipendente', 'magazziniere', 'ufficio'];

export default function Dipendenti() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [dipendenti, setDipendenti] = useState<Dipendente[]>([]);
  const [loading, setLoading] = useState(false);
  const load = async () => { setLoading(true); const { data, error } = await supabase.from('dipendenti').select('*').order('cognome',{ ascending: true }); if(error) toast.error('Errore'); else setDipendenti((data||[]).map(d=>({...d,isEditing:false,isDirty:false}))); setLoading(false); };
  useEffect(()=>{ load(); },[]);
  const aggiungi = () => { setDipendenti(prev => [{ nome:'', cognome:'', email:'', ruolo:'dipendente', attivo:true, riceve_calendario:true, isEditing:true, isDirty:true }, ...prev]); };
  const aggiorna = (idx,field,value) => { setDipendenti(prev => prev.map((d,i) => i===idx ? {...d,[field]:value,isDirty:true} : d)); };
  const salva = async (idx) => { const d=dipendenti[idx]; if(!d.nome.trim()||!d.cognome.trim()||!d.email.trim()){ toast.error('Campi obbligatori'); return; } const payload={nome:d.nome.trim(),cognome:d.cognome.trim(),email:d.email.trim().toLowerCase(),ruolo:d.ruolo,attivo:d.attivo,riceve_calendario:d.riceve_calendario,updated_at:new Date().toISOString()}; if(d.id){ const{error}=await supabase.from('dipendenti').update(payload).eq('id',d.id); if(error){toast.error('Err');return;} } else{ const{data,error}=await supabase.from('dipendenti').insert(payload).select().single(); if(error){toast.error('Err');return;} setDipendenti(prev=>prev.map((it,i)=>i===idx?{...data,isEditing:false,isDirty:false}:it)); toast.success('Aggiunto'); return; } setDipendenti(prev=>prev.map((it,i)=>i===idx?{...it,isEditing:false,isDirty:false}:it)); toast.success('Salvato'); };
  const elimina = async (idx) => { const d=dipendenti[idx]; if(d.id){ const{error}=await supabase.from('dipendenti').delete().eq('id',d.id); if(error){toast.error('Err');return;} } setDipendenti(prev => prev.filter((_,i)=>i!==idx)); toast.success('Rimosso'); };
  const toggleEdit = (idx) => setDipendenti(prev => prev.map((d,i)=>i===idx?{...d,isEditing:!d.isEditing}:d));
  if(authLoading) return <div>Caricamento...</div>;
  if(!user) return <Navigate to="/login" replace />;
  return (
    <div className="min-h-screen bg-[hsl(210,40%,96%)]">
      <Header title="Dipendenti" activeTab="dipendenti" />
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-4">
            <div className="bg-white rounded-lg px-4 py-2 shadow-sm text-center"><div className="text-2xl font-bold text-blue-600">{dipendenti.filter(d=>d.attivo&&d.id).length}</div><div className="text-xs text-gray-500">Attivi</div></div>
            <div className="bg-white rounded-lg px-4 py-2 shadow-sm text-center"><div className="text-2xl font-bold text-green-600">{dipendenti.filter(d=>d.riceve_calendario&&d.id).length}</div><div className="text-xs text-gray-500">Calendario</div></div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={()=>navigate('/')}><Home className="h-4 w-4 mr-2"/>Dashboard</Button>
            <Button onClick={aggiungi} className="bg-blue-600 hover:bg-blue-700 text-white gap-2"><Plus className="h-4 w-4"/>Aggiungi dipendente</Button>
          </div>
        </div>
        {loading && <div className="text-center py-8">Caricamento...</div>}
        <div className="space-y-2">
          {dipendenti.map((d,idx)=>(
            <div key={d.id||`new-${idx}`} className={`bg-white rounded-lg shadow-sm border ${d.isDirty?'border-yellow-300':'border-gray-100'} p-4`}>
              {d.isEditing||!d.id?(
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-gray-500 mb-1 block">Nome *</label><Input value={d.nome} onChange={e=>aggiorna(idx,'nome',e.target.value)} placeholder="Nome" className="h-8 text-sm"/></div>
                  <div><label className="text-xs text-gray-500 mb-1 block">Cognome *</label><Input value={d.cognome} onChange={e=>aggiorna(idx,'cognome',e.target.value)} placeholder="Cognome" className="h-8 text-sm"/></div>
                  <div><label className="text-xs text-gray-500 mb-1 block">Email *</label><Input value={d.email} onChange={e=>aggiorna(idx,'email',e.target.value)} placeholder="email@azienda.it" type="email" className="h-8 text-sm"/></div>
                  <div><label className="text-xs text-gray-500 mb-1 block">Ruolo</label><select value={d.ruolo} onChange={e=>aggiorna(idx,'ruolo',e.target.value)} className="w-full h-8 text-sm border border-gray-200 rounded-md px-2">{RUOLI.map(r=><option key={r} value={r}>{r}</option>)}</select></div>
                  <div className="col-span-2 flex items-center justify-between">
                    <div className="flex gap-4"><label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={d.attivo} onChange={e=>aggiorna(idx,'attivo',e.target.checked)} className="h-4 w-4"/>Attivo</label><label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={d.riceve_calendario} onChange={e=>aggiorna(idx,'riceve_calendario',e.target.checked)} className="h-4 w-4"/>Riceve calendario</label></div>
                    <div className="flex gap-2"><Button size="sm" onClick={()=>salva(idx)} className="bg-green-600 text-white gap-1"><Save className="h-3 w-3"/>Salva</Button>{d.id&&<Button size="sm" variant="outline" onClick={()=>toggleEdit(idx)}><X className="h-3 w-3"/></Button>}<Button size="sm" variant="ghost" className="text-red-500" onClick={()=>elimina(idx)}><Trash2 className="h-3 w-3"/></Button></div>
                  </div>
                </div>
              ):(
                <div className="flex items-center justify-between"><div className="flex items-center gap-4"><div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">{d.nome[0]}{d.cognome[0]}</div><div><div className="font-medium">{d.cognome} {d.nome}</div><div className="text-xs text-gray-500">{d.email}</div></div><span className={`text-xs px-2 py-0.5 rounded-full ${d.attivo?'bg-green-100 text-green-700':'bg-gray-100 text-gray-500'}`}>{d.ruolo}</span>{d.riceve_calendario&&<span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">calendario</span>}</div><div className="flex gap-1"><Button size="sm" variant="ghost" onClick={()=>toggleEdit(idx)} className="h-8 w-8 p-0"><Pencil className="h-3.5 w-3.5"/></Button><Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500" onClick={()=>elimina(idx)}><Trash2 className="h-3.5 w-3.5"/></Button></div></div>
              )}
            </div>
          ))}
          {dipendenti.length===0&&!loading&&<div className="text-center py-12 text-gray-400"><Users className="h-12 w-12 mx-auto mb-3 opacity-30"/><p>Nessun dipendente.</p></div>}
        </div>
      </div>
    </div>
  );
}
