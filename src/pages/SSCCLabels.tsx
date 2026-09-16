import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { useNavigate } from 'react-router-dom';
import { Home, Settings, Printer, Plus, History } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

function calcolaCheckDigit(digits: string): number {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    const d = parseInt(digits[digits.length - 1 - i]);
    sum += d * (i % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10;
}

function generaSSCC(estensione: string, prefisso: string, progressivo: number): string {
  const serialLength = 17 - estensione.length - prefisso.length;
  if (serialLength < 1) return 'CONFIGURAZIONE_NON_VALIDA';
  const serial = String(progressivo).padStart(serialLength, '0');
  const base = estensione + prefisso + serial;
  if (base.length !== 17) return 'LUNGHEZZA_NON_VALIDA';
  const check = calcolaCheckDigit(base);
  return base + check;
}

function formattaSSCC(sscc: string): string {
  if (sscc.length !== 18) return sscc;
  return `(00) ${sscc}`;
}

function BarcodeGS1128({ sscc }: { sscc: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!canvasRef.current || sscc.length !== 18) return;
    const render = () => (window as any).JsBarcode(canvasRef.current, sscc, {
      format: 'CODE128', displayValue: false, width: 2, height: 80, margin: 10,
      background: '#ffffff', lineColor: '#000000',
    });
    if ((window as any).JsBarcode) { render(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jsbarcode/3.11.6/JsBarcode.all.min.js';
    s.onload = render;
    document.head.appendChild(s);
  }, [sscc]);
  return <canvas ref={canvasRef} className="w-full" />;
}

interface LabelData { sscc:string;gtin:string;lotto:string;quantita:string;dataProduzione:string;pesoLordo:string;descrizione:string;cliente:string; }

function AnteprimaEtichetta({ data }: { data: LabelData }) {
  const { sscc, gtin, lotto, quantita, dataProduzione, pesoLordo, descrizione, cliente } = data;
  return (
    <div id="etichetta-sscc" className="bg-white border-2 border-black mx-auto font-mono" style={{ width:'100mm', padding:'4mm', fontSize:'8pt' }}>
      <div className="text-center font-bold border-b border-black pb-1 mb-2 text-xs">ETICHETTA PALLET GS1</div>
      {descrizione && <div className="mb-1"><span className="font-bold">Prodotto: </span>{descrizione}</div>}
      {cliente && <div className="mb-1"><span className="font-bold">Cliente: </span>{cliente}</div>}
      <div className="grid grid-cols-2 gap-x-2 mb-2 text-[7pt]">
        {gtin && <div><span className="font-bold">(01) GTIN:</span><br/>{gtin}</div>}
        {lotto && <div><span className="font-bold">(10) Lotto:</span><br/>{lotto}</div>}
        {quantita && <div><span className="font-bold">(30) Qtà:</span><br/>{quantita} pz</div>}
        {dataProduzione && <div><span className="font-bold">(11) Prod.:</span><br/>{dataProduzione}</div>}
        {pesoLordo && <div><span className="font-bold">(330) Peso:</span><br/>{pesoLordo} kg</div>}
      </div>
      <div className="border-t border-black my-2" />
      {sscc.length === 18 ? (
        <><BarcodeGS1128 sscc={sscc} /><div className="text-center text-[7pt] mt-1 tracking-wider">{formattaSSCC(sscc)}</div></>
      ) : (
        <div className="text-center text-gray-400 py-4 text-xs">Configura prefisso GS1 per generare il codice</div>
      )}
    </div>
  );
}

interface SSCCConfig { id:string;prefisso_gs1:string;digit_estensione:string;contatore:number; }
interface SSCCRecord { id:string;sscc:string;numero_bancale:number;gtin?:string;lotto?:string;quantita?:number;data_produzione?:string;peso_lordo_kg?:number;descrizione?:string;cliente?:string;created_at:string; }

const SSCCLabels = () => {
  const navigate = useNavigate();
  const { isAmministratore } = useAuth();
  const [config, setConfig] = useState<SSCCConfig | null>(null);
  const [editConfig, setEditConfig] = useState(false);
  const [tempConfig, setTempConfig] = useState({ prefisso_gs1: '', digit_estensione: '3' });
  const [storico, setStorico] = useState<SSCCRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ gtin:'',lotto:'',quantita:'',dataProduzione:new Date().toISOString().split('T')[0],pesoLordo:'',descrizione:'',cliente:'',note:'' });

  const ssccPreview = config ? generaSSCC(config.digit_estensione, config.prefisso_gs1, config.contatore) : '';
  const labelData: LabelData = { sscc:ssccPreview, gtin:form.gtin, lotto:form.lotto, quantita:form.quantita, dataProduzione:form.dataProduzione, pesoLordo:form.pesoLordo, descrizione:form.descrizione, cliente:form.cliente };

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [cfgRes, storRes] = await Promise.all([
      supabase.from('sscc_config').select('*').limit(1).single(),
      supabase.from('sscc_generati').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    if (cfgRes.data) setConfig(cfgRes.data);
    if (storRes.data) setStorico(storRes.data);
    setLoading(false);
  };

  const salvaConfig = async () => {
    if (!config) return;
    const { error } = await supabase.from('sscc_config').update({ prefisso_gs1: tempConfig.prefisso_gs1, digit_estensione: tempConfig.digit_estensione, updated_at: new Date().toISOString() }).eq('id', config.id);
    if (error) { toast.error(`Errore: ${error.message}`); return; }
    toast.success('Configurazione salvata'); setEditConfig(false); loadData();
  };

  const generaEtichetta = async () => {
    if (!config?.prefisso_gs1) { toast.error('Inserisci il prefisso GS1 nelle impostazioni'); return; }
    const sscc = generaSSCC(config.digit_estensione, config.prefisso_gs1, config.contatore);
    if (sscc.includes('_')) { toast.error('Configurazione SSCC non valida'); return; }
    const { error } = await supabase.from('sscc_generati').insert([{
      sscc, numero_bancale: config.contatore,
      gtin: form.gtin||null, lotto: form.lotto||null,
      quantita: form.quantita ? parseInt(form.quantita) : null,
      data_produzione: form.dataProduzione||null,
      peso_lordo_kg: form.pesoLordo ? parseFloat(form.pesoLordo) : null,
      descrizione: form.descrizione||null, cliente: form.cliente||null, note: form.note||null,
    }]);
    if (error) { toast.error(`Errore: ${error.message}`); return; }
    await supabase.from('sscc_config').update({ contatore: config.contatore + 1 }).eq('id', config.id);
    toast.success(`✅ SSCC ${sscc} — Bancale #${config.contatore}`);
    loadData();
    setTimeout(() => window.print(), 400);
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500">Caricamento...</div>;

  return (
    <div className="min-h-screen bg-[hsl(210,40%,96%)] print:bg-white">
      <div className="print:hidden">
        <Header title="Etichette SSCC GS1" activeTab="" showUsersButton={false} />
        <div className="mx-auto p-3 sm:p-5 md:px-8">
          <div className="flex justify-between items-center mb-5">
            <Button variant="outline" size="sm" onClick={() => navigate(isAmministratore ? '/summary' : '/stampa-dashboard')}>
              <Home className="mr-2 h-4 w-4" /> Dashboard
            </Button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="bg-white rounded-xl border shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-base flex items-center gap-2"><Settings className="h-4 w-4" /> Configurazione GS1</h2>
                  {!editConfig && <Button variant="outline" size="sm" onClick={() => { setTempConfig({ prefisso_gs1: config?.prefisso_gs1||'', digit_estensione: config?.digit_estensione||'3' }); setEditConfig(true); }}>Modifica</Button>}
                </div>
                {editConfig ? (
                  <div className="space-y-3">
                    <div><Label className="text-xs">Prefisso GS1 (da GS1 Italia)</Label><Input value={tempConfig.prefisso_gs1} onChange={e=>setTempConfig(p=>({...p,prefisso_gs1:e.target.value.replace(/\D/g,'')}))} placeholder="Es. 8012345" className="font-mono mt-1" /></div>
                    <div><Label className="text-xs">Digit estensione</Label><Input value={tempConfig.digit_estensione} onChange={e=>setTempConfig(p=>({...p,digit_estensione:e.target.value.replace(/\D/g,'').slice(0,1)}))} placeholder="3" className="font-mono mt-1 w-20" /></div>
                    <div className="flex gap-2 pt-1"><Button size="sm" onClick={salvaConfig}>Salva</Button><Button size="sm" variant="outline" onClick={()=>setEditConfig(false)}>Annulla</Button></div>
                  </div>
                ) : (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Prefisso GS1:</span><span className="font-mono font-bold">{config?.prefisso_gs1||<span className="text-orange-500">Da configurare</span>}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Digit estensione:</span><span className="font-mono">{config?.digit_estensione}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Prossimo bancale:</span><span className="font-mono font-bold text-blue-600">#{config?.contatore}</span></div>
                    {config?.prefisso_gs1 && ssccPreview.length===18 && <div className="flex justify-between items-center pt-1 border-t"><span className="text-muted-foreground">Prossimo SSCC:</span><span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{formattaSSCC(ssccPreview)}</span></div>}
                  </div>
                )}
              </div>
              <div className="bg-white rounded-xl border shadow-sm p-5">
                <h2 className="font-bold text-base mb-4 flex items-center gap-2"><Plus className="h-4 w-4" /> Dati Etichetta</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2"><Label className="text-xs">Descrizione prodotto</Label><Input value={form.descrizione} onChange={e=>setForm(p=>({...p,descrizione:e.target.value}))} placeholder="Es. Scatola ondulata 300g" className="mt-1" /></div>
                  <div className="col-span-2"><Label className="text-xs">Cliente destinatario</Label><Input value={form.cliente} onChange={e=>setForm(p=>({...p,cliente:e.target.value}))} placeholder="Es. Acme S.r.l." className="mt-1" /></div>
                  <div><Label className="text-xs">(01) GTIN prodotto</Label><Input value={form.gtin} onChange={e=>setForm(p=>({...p,gtin:e.target.value.replace(/\D/g,'')}))} placeholder="14 cifre" className="mt-1 font-mono" maxLength={14} /></div>
                  <div><Label className="text-xs">(10) Lotto</Label><Input value={form.lotto} onChange={e=>setForm(p=>({...p,lotto:e.target.value}))} placeholder="Es. LOT-2026-001" className="mt-1 font-mono" /></div>
                  <div><Label className="text-xs">(30) Quantità (pz)</Label><Input type="number" value={form.quantita} onChange={e=>setForm(p=>({...p,quantita:e.target.value}))} placeholder="Es. 1000" className="mt-1" /></div>
                  <div><Label className="text-xs">(330) Peso lordo (kg)</Label><Input type="number" step="0.001" value={form.pesoLordo} onChange={e=>setForm(p=>({...p,pesoLordo:e.target.value}))} placeholder="Es. 250.5" className="mt-1" /></div>
                  <div><Label className="text-xs">(11) Data produzione</Label><Input type="date" value={form.dataProduzione} onChange={e=>setForm(p=>({...p,dataProduzione:e.target.value}))} className="mt-1" /></div>
                  <div><Label className="text-xs">Note interne</Label><Input value={form.note} onChange={e=>setForm(p=>({...p,note:e.target.value}))} placeholder="Opzionale" className="mt-1" /></div>
                </div>
                <Button className="w-full mt-4 h-11 text-base font-semibold" onClick={generaEtichetta} disabled={!config?.prefisso_gs1}>
                  <Printer className="mr-2 h-5 w-5" /> Genera SSCC e Stampa — Bancale #{config?.contatore}
                </Button>
              </div>
            </div>
            <div className="space-y-4">
              <div className="bg-white rounded-xl border shadow-sm p-5">
                <h2 className="font-bold text-base mb-4">📋 Anteprima Etichetta</h2>
                <AnteprimaEtichetta data={labelData} />
              </div>
              <div className="bg-white rounded-xl border shadow-sm p-5">
                <h2 className="font-bold text-base mb-4 flex items-center gap-2"><History className="h-4 w-4" /> Storico SSCC ({storico.length})</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead><tr className="bg-gray-50 border-b"><th className="px-2 py-2 text-left font-semibold">#</th><th className="px-2 py-2 text-left font-semibold">SSCC</th><th className="px-2 py-2 text-left font-semibold">Cliente</th><th className="px-2 py-2 text-left font-semibold">Lotto</th><th className="px-2 py-2 text-left font-semibold">Data</th></tr></thead>
                    <tbody>
                      {storico.length===0 && <tr><td colSpan={5} className="text-center py-6 text-gray-400">Nessun SSCC generato</td></tr>}
                      {storico.map(s=>(<tr key={s.id} className="border-b hover:bg-gray-50"><td className="px-2 py-1.5 font-bold text-blue-600">#{s.numero_bancale}</td><td className="px-2 py-1.5 font-mono text-[10px]">{s.sscc}</td><td className="px-2 py-1.5">{s.cliente||'—'}</td><td className="px-2 py-1.5 font-mono">{s.lotto||'—'}</td><td className="px-2 py-1.5">{new Date(s.created_at).toLocaleDateString('it-IT')}</td></tr>))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="hidden print:block"><AnteprimaEtichetta data={labelData} /></div>
      <Toaster />
    </div>
  );
};

export default SSCCLabels;
