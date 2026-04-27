import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, Save, ChevronLeft, ChevronRight, Home } from 'lucide-react';
import { toast } from 'sonner';

interface OrdineCartone {
  id?: string;
  nr?: number | null;
  mese: string;
  anno: number;
  fornitore?: string;
  cartone?: string;
  grammatura?: string;
  formato?: string;
  nr_fogli_peso?: string;
  prezzo?: string;
  lavoro?: string;
  data_consegna_richiesta?: string;
  ordine_effettuato?: boolean;
  data_consegna_confermata?: string;
  isNew?: boolean;
  isDirty?: boolean;
}

const MESI = ['GENNAIO','FEBBRAIO','MARZO','APRILE','MAGGIO','GIUGNO','LUGLIO','AGOSTO','SETTEMBRE','OTTOBRE','NOVEMBRE','DICEMBRE'];

export default function OrdiniCartone() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const now = new Date();
  const [meseIdx, setMeseIdx] = useState(now.getMonth());
  const [anno, setAnno] = useState(now.getFullYear());
  const [righe, setRighe] = useState<OrdineCartone[]>([]);
  const [loading, setLoading] = useState(false);
  const mese = MESI[meseIdx];

  const loadRighe = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('ordini_cartone').select('*').eq('mese', mese).eq('anno', anno).order('nr', { ascending: true, nullsFirst: false });
    if (error) toast.error('Errore caricamento dati');
    else setRighe((data || []).map(r => ({ ...r, isNew: false, isDirty: false })));
    setLoading(false);
  }, [mese, anno]);

  useEffect(() => { loadRighe(); }, [loadRighe]);

  const mesePrecedente = () => { if (meseIdx === 0) { setMeseIdx(11); setAnno(a => a - 1); } else setMeseIdx(m => m - 1); };
  const meseSuccessivo = () => { if (meseIdx === 11) { setMeseIdx(0); setAnno(a => a + 1); } else setMeseIdx(m => m + 1); };

  const aggiungiRiga = () => {
    const maxNr = righe.reduce((max, r) => Math.max(max, r.nr || 0), 0);
    setRighe(prev => [...prev, { mese, anno, nr: maxNr + 1, isNew: true, isDirty: true, fornitore: '', cartone: '', grammatura: '', formato: '', nr_fogli_peso: '', prezzo: '', lavoro: '', data_consegna_richiesta: '', ordine_effettuato: false, data_consegna_confermata: '' }]);
  };

  const aggiornaRiga = (idx: number, field: keyof OrdineCartone, value: string | boolean | number) => {
    setRighe(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value, isDirty: true } : r));
  };

  const salvaRiga = async (idx: number) => {
    const riga = righe[idx];
    const payload = { nr: riga.nr, mese: riga.mese, anno: riga.anno, fornitore: riga.fornitore || '', cartone: riga.cartone || '', grammatura: riga.grammatura || '', formato: riga.formato || '', nr_fogli_peso: riga.nr_fogli_peso || '', prezzo: riga.prezzo || '', lavoro: riga.lavoro || '', data_consegna_richiesta: riga.data_consegna_richiesta || '', ordine_effettuato: riga.ordine_effettuato || false, data_consegna_confermata: riga.data_consegna_confermata || '', updated_at: new Date().toISOString() };
    if (riga.isNew) {
      const { data, error } = await supabase.from('ordini_cartone').insert(payload).select().single();
      if (error) { toast.error('Errore salvataggio'); return; }
      setRighe(prev => prev.map((r, i) => i === idx ? { ...data, isNew: false, isDirty: false } : r));
    } else {
      const { error } = await supabase.from('ordini_cartone').update(payload).eq('id', riga.id!);
      if (error) { toast.error('Errore aggiornamento'); return; }
      setRighe(prev => prev.map((r, i) => i === idx ? { ...r, isDirty: false } : r));
    }
    toast.success('Salvato');
  };

  const eliminaRiga = async (idx: number) => {
    const riga = righe[idx];
    if (!riga.isNew && riga.id) {
      const { error } = await supabase.from('ordini_cartone').delete().eq('id', riga.id);
      if (error) { toast.error('Errore eliminazione'); return; }
    }
    setRighe(prev => prev.filter((_, i) => i !== idx));
    toast.success('Riga eliminata');
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center">Caricamento...</div>;
  if (!user) return <Navigate to="/login" replace />;
  const colStyle = "border border-gray-300 px-1 py-1 text-xs";

  return (
    <div className="min-h-screen bg-[hsl(210,40%,96%)]">
      <Header title="Ordini Cartone" activeTab="ordini-cartone" />
      <div className="max-w-[1600px] mx-auto p-3 sm:p-5">
        <div className="mb-3">
          <Button variant="outline" size="sm" onClick={() => navigate('/')} className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            Torna alla Dashboard
          </Button>
        </div>
        <div className="flex items-center justify-between mb-4">
          <Button variant="outline" size="sm" onClick={mesePrecedente}><ChevronLeft className="h-4 w-4" /></Button>
          <h2 className="text-xl font-bold text-center">{mese} {anno}</h2>
          <Button variant="outline" size="sm" onClick={meseSuccessivo}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <div className="overflow-x-auto rounded-lg shadow bg-white">
          <table className="w-full text-xs border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="border border-gray-600 px-2 py-2 w-10">NR</th>
                <th className="border border-gray-600 px-2 py-2 min-w-[110px]">FORNITORE</th>
                <th className="border border-gray-600 px-2 py-2 min-w-[110px]">CARTONE</th>
                <th className="border border-gray-600 px-2 py-2 min-w-[80px]">GRAMMATURA</th>
                <th className="border border-gray-600 px-2 py-2 min-w-[90px]">FORMATO</th>
                <th className="border border-gray-600 px-2 py-2 min-w-[100px]">NR. FOGLI O PESO</th>
                <th className="border border-gray-600 px-2 py-2 min-w-[90px]">PREZZO</th>
                <th className="border border-gray-600 px-2 py-2 min-w-[110px]">LAVORO</th>
                <th className="border border-gray-600 px-2 py-2 min-w-[110px]">DATA CONSEGNA RICHIESTA</th>
                <th className="border border-gray-600 px-2 py-2 w-16">ORDINE EFFETTUATO</th>
                <th className="border border-gray-600 px-2 py-2 min-w-[110px]">DATA CONSEGNA CONFERMATA</th>
                <th className="border border-gray-600 px-2 py-2 w-20">AZIONI</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={12} className="text-center py-8 text-gray-500">Caricamento...</td></tr>}
              {!loading && righe.length === 0 && <tr><td colSpan={12} className="text-center py-8 text-gray-400">Nessun ordine. Clicca + per aggiungere.</td></tr>}
              {righe.map((riga, idx) => (
                <tr key={riga.id || `new-${idx}`} className={`${riga.isDirty ? 'bg-yellow-50' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}>
                  <td className={colStyle}><Input type="number" value={riga.nr ?? ''} onChange={e => aggiornaRiga(idx, 'nr', parseInt(e.target.value) || 0)} className="h-6 text-xs p-1 w-12 border-0 bg-transparent" /></td>
                  {(['fornitore','cartone','grammatura','formato','nr_fogli_peso','prezzo','lavoro','data_consegna_richiesta'] as (keyof OrdineCartone)[]).map(field => (
                    <td key={field} className={colStyle}><Input value={(riga[field] as string) ?? ''} onChange={e => aggiornaRiga(idx, field, e.target.value)} className="h-6 text-xs p-1 border-0 bg-transparent w-full" /></td>
                  ))}
                  <td className={`${colStyle} text-center`}><input type="checkbox" checked={riga.ordine_effettuato || false} onChange={e => aggiornaRiga(idx, 'ordine_effettuato', e.target.checked)} className="h-4 w-4 cursor-pointer" /></td>
                  <td className={colStyle}><Input value={riga.data_consegna_confermata ?? ''} onChange={e => aggiornaRiga(idx, 'data_consegna_confermata', e.target.value)} className="h-6 text-xs p-1 border-0 bg-transparent w-full" /></td>
                  <td className={`${colStyle} text-center`}>
                    <div className="flex gap-1 justify-center">
                      {riga.isDirty && <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-green-600" onClick={() => salvaRiga(idx)}><Save className="h-3 w-3" /></Button>}
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-500" onClick={() => eliminaRiga(idx)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4">
          <Button onClick={aggiungiRiga} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
            <Plus className="h-4 w-4" /> Aggiungi riga
          </Button>
        </div>
      </div>
    </div>
  );
}
