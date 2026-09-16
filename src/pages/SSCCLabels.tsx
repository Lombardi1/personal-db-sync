import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { useNavigate } from 'react-router-dom';
import { Home, Settings, Printer, Plus, History, Package, Layers } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

// ── GS1 Check Digit ──────────────────────────────────────────────────────────
function calcolaCheckDigit(digits: string): number {
  let sum = 0;
  for (let i = 0; i < digits.length; i++)
    sum += parseInt(digits[digits.length - 1 - i]) * (i % 2 === 0 ? 3 : 1);
  return (10 - (sum % 10)) % 10;
}
function generaSSCC(estensione: string, prefisso: string, progressivo: number): string {
  const serialLen = 17 - estensione.length - prefisso.length;
  if (serialLen < 1) return 'CONFIG_INVALIDA';
  const base = estensione + prefisso + String(progressivo).padStart(serialLen, '0');
  if (base.length !== 17) return 'LUNGHEZZA_INVALIDA';
  return base + calcolaCheckDigit(base);
}
function formattaSSCC(sscc: string) { return sscc.length === 18 ? `(00) ${sscc}` : sscc; }

// ── Barcode ───────────────────────────────────────────────────────────────────
function Barcode({ value, height = 60 }: { value: string; height?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!ref.current || !value) return;
    const render = () => (window as any).JsBarcode(ref.current, value, {
      format: 'CODE128', displayValue: false, width: 2, height, margin: 4,
      background: '#ffffff', lineColor: '#000000',
    });
    if ((window as any).JsBarcode) { render(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jsbarcode/3.11.6/JsBarcode.all.min.js';
    s.onload = render;
    document.head.appendChild(s);
  }, [value, height]);
  return <canvas ref={ref} style={{ maxWidth: '100%' }} />;
}

// ── Etichetta Scatolone (150×100mm, stesso layout screenshot) ─────────────────
interface ScatoloneData {
  cliente: string; fornitore: string; codice: string;
  descrizione: string; ordineNr: string; data: string;
  lotto: string; quantita: number;
  numeroScatolone: number; totaleScatoloni: number;
  ssccPallet: string;
}

function EtichettaScatolone({ d }: { d: ScatoloneData }) {
  const isIncompleto = d.numeroScatolone === d.totaleScatoloni && d.quantita !== Math.round(d.quantita);
  return (
    <div
      className="bg-white font-sans"
      style={{ width:'150mm', height:'100mm', border:'2.5px solid #1a56db', boxSizing:'border-box',
               display:'grid', gridTemplateColumns:'55% 45%', pageBreakAfter:'always', flexShrink:0 }}
    >
      {/* Colonna sinistra: dati */}
      <div style={{ borderRight:'1.5px solid #1a56db', display:'flex', flexDirection:'column' }}>
        {[
          { label:'Cliente:', value: d.cliente, bold: true, large: true },
          { label:'Fornitore:', value: d.fornitore },
          { label:'Cod:', value: d.codice },
          { label:'Descrizione:', value: d.descrizione, small: true },
          { label:'Ordine nr:', value: d.ordineNr },
          { label:'Data:', value: d.data },
          { label:'Lotto:', value: d.lotto },
          { label:'Quantità:', value: String(d.quantita) + ' pz', bold: true },
        ].map((row, i) => (
          <div key={i} style={{ display:'flex', borderBottom:'1px solid #ccc', flex:1, alignItems:'center' }}>
            <span style={{ fontStyle:'italic', fontSize:'8pt', minWidth:'28mm', paddingLeft:'2mm', color:'#333' }}>{row.label}</span>
            <span style={{ fontSize: row.large ? '11pt' : row.small ? '7pt' : '9pt', fontWeight: row.bold ? 'bold' : 'normal', paddingLeft:'1mm', lineHeight:1.2 }}>{row.value}</span>
          </div>
        ))}
      </div>
      {/* Colonna destra: scatolone + barcode */}
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'space-between', padding:'2mm' }}>
        {/* Numero scatolone */}
        <div style={{ textAlign:'center', lineHeight:1.1 }}>
          <div style={{ fontSize:'7pt', color:'#555' }}>Scatolone</div>
          <div style={{ fontSize:'18pt', fontWeight:'bold', color: isIncompleto ? '#c0392b' : '#1a56db' }}>
            {d.numeroScatolone}<span style={{ fontSize:'10pt', color:'#666' }}>/{d.totaleScatoloni}</span>
          </div>
          {isIncompleto && <div style={{ fontSize:'6pt', color:'#c0392b', fontWeight:'bold' }}>INCOMPLETO</div>}
        </div>
        {/* EAN + barcode */}
        <div style={{ textAlign:'center', width:'100%' }}>
          <div style={{ fontSize:'7pt', marginBottom:'1mm', fontStyle:'italic' }}>EAN:</div>
          <Barcode value={d.codice || 'NOCODE'} height={45} />
          <div style={{ fontSize:'7pt', fontWeight:'bold', letterSpacing:'0.5px' }}>{d.codice}</div>
        </div>
        {/* SSCC pallet */}
        {d.ssccPallet && (
          <div style={{ fontSize:'5.5pt', color:'#888', textAlign:'center', borderTop:'1px solid #eee', paddingTop:'1mm', width:'100%' }}>
            Pallet: {d.ssccPallet}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Etichetta SSCC Pallet ─────────────────────────────────────────────────────
interface PalletData { sscc:string; numeroBancale:number; cliente:string; descrizione:string; ordineNr:string; data:string; lotto:string; pezziTotali:number; numScatoloni:number; }
function EtichettaPallet({ d }: { d: PalletData }) {
  return (
    <div className="bg-white font-sans" style={{ width:'150mm', height:'100mm', border:'2.5px solid #1a56db', boxSizing:'border-box', display:'flex', flexDirection:'column', padding:'3mm', pageBreakAfter:'always', flexShrink:0 }}>
      <div style={{ display:'flex', justifyContent:'space-between', borderBottom:'2px solid #1a56db', paddingBottom:'1.5mm', marginBottom:'1.5mm' }}>
        <span style={{ fontSize:'9pt', fontWeight:'bold' }}>ETICHETTA PALLET GS1</span>
        <span style={{ fontSize:'9pt', fontWeight:'bold', color:'#1a56db' }}>BANCALE #{d.numeroBancale}</span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1mm', fontSize:'8pt', flex:1 }}>
        <div><b>Cliente:</b> {d.cliente}</div>
        <div><b>Ordine:</b> {d.ordineNr}</div>
        <div style={{ gridColumn:'1/-1' }}><b>Descrizione:</b> {d.descrizione}</div>
        <div><b>Data:</b> {d.data}</div>
        <div><b>Lotto:</b> {d.lotto}</div>
        <div><b>Pezzi totali:</b> {d.pezziTotali.toLocaleString('it-IT')}</div>
        <div><b>Scatoloni:</b> {d.numScatoloni}</div>
      </div>
      <div style={{ borderTop:'1.5px solid #1a56db', paddingTop:'1.5mm', textAlign:'center' }}>
        <Barcode value={d.sscc} height={35} />
        <div style={{ fontSize:'7.5pt', fontWeight:'bold', letterSpacing:'1px', fontFamily:'monospace' }}>{formattaSSCC(d.sscc)}</div>
      </div>
    </div>
  );
}

// ── Tipi ──────────────────────────────────────────────────────────────────────
interface SSCCConfig { id:string; prefisso_gs1:string; digit_estensione:string; contatore:number; }
interface SSCCRecord { id:string; sscc:string; numero_bancale:number; gtin?:string; lotto?:string; quantita?:number; data_produzione?:string; peso_lordo_kg?:number; descrizione?:string; cliente?:string; created_at:string; }

// ── Pagina principale ─────────────────────────────────────────────────────────
const SSCCLabels = () => {
  const navigate = useNavigate();
  const { isAmministratore } = useAuth();
  const [tab, setTab] = useState<'sscc'|'lavoro'>('lavoro');
  const [config, setConfig] = useState<SSCCConfig | null>(null);
  const [editConfig, setEditConfig] = useState(false);
  const [tempConfig, setTempConfig] = useState({ prefisso_gs1:'', digit_estensione:'3' });
  const [storico, setStorico] = useState<SSCCRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [numeroBancali, setNumeroBancali] = useState(1);
  const [printQueue, setPrintQueue] = useState<React.ReactNode[]>([]);

  // Form SSCC semplice
  const [formSSCC, setFormSSCC] = useState({ gtin:'', lotto:'', quantita:'', dataProduzione:new Date().toISOString().split('T')[0], pesoLordo:'', descrizione:'', cliente:'', note:'' });

  // Form Lavoro Completo
  const [lavoro, setLavoro] = useState({
    cliente:'', fornitore:'Arti Grafiche Lombardi', codice:'', descrizione:'',
    ordineNr:'', data:new Date().toLocaleDateString('it-IT'), lotto:'',
    pezziTotali:'', pezziPerScatolone:'',
  });

  // Calcolo scatoloni
  const pezziTot = parseInt(lavoro.pezziTotali) || 0;
  const pezziPerScat = parseInt(lavoro.pezziPerScatolone) || 0;
  const numScatoloniCompleti = pezziPerScat > 0 ? Math.floor(pezziTot / pezziPerScat) : 0;
  const pezziRimanenti = pezziPerScat > 0 ? pezziTot % pezziPerScat : 0;
  const numScatoloniTotali = pezziRimanenti > 0 ? numScatoloniCompleti + 1 : numScatoloniCompleti;

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
    await supabase.from('sscc_config').update({ prefisso_gs1: tempConfig.prefisso_gs1, digit_estensione: tempConfig.digit_estensione, updated_at: new Date().toISOString() }).eq('id', config.id);
    toast.success('Configurazione salvata'); setEditConfig(false); loadData();
  };

  // Genera N bancali SSCC
  const generaBancali = async (quanti: number) => {
    if (!config?.prefisso_gs1) { toast.error('Configura il prefisso GS1'); return; }
    setGenerando(true);
    const labels: React.ReactNode[] = [];
    const records = [];
    for (let i = 0; i < quanti; i++) {
      const num = config.contatore + i;
      const sscc = generaSSCC(config.digit_estensione, config.prefisso_gs1, num);
      labels.push(<EtichettaPallet key={`p${i}`} d={{ sscc, numeroBancale: num, cliente: formSSCC.cliente, descrizione: formSSCC.descrizione, ordineNr: formSSCC.gtin, data: formSSCC.dataProduzione, lotto: formSSCC.lotto, pezziTotali: parseInt(formSSCC.quantita)||0, numScatoloni: 0 }} />);
      records.push({ sscc, numero_bancale: num, gtin: formSSCC.gtin||null, lotto: formSSCC.lotto||null, quantita: formSSCC.quantita ? parseInt(formSSCC.quantita) : null, data_produzione: formSSCC.dataProduzione||null, peso_lordo_kg: formSSCC.pesoLordo ? parseFloat(formSSCC.pesoLordo) : null, descrizione: formSSCC.descrizione||null, cliente: formSSCC.cliente||null, note: formSSCC.note||null });
    }
    await supabase.from('sscc_generati').insert(records);
    await supabase.from('sscc_config').update({ contatore: config.contatore + quanti }).eq('id', config.id);
    toast.success(`✅ ${quanti} etichett${quanti===1?'a':'e'} pallet generat${quanti===1?'a':'e'}`);
    setPrintQueue(labels); setGenerando(false); loadData();
    setTimeout(() => window.print(), 400);
  };

  // Genera lavoro completo: 1 etichetta pallet + N scatoloni
  const generaLavoroCompleto = async () => {
    if (!config?.prefisso_gs1) { toast.error('Configura il prefisso GS1'); return; }
    if (!lavoro.cliente || !lavoro.codice || !lavoro.pezziTotali || !lavoro.pezziPerScatolone) {
      toast.error('Compila almeno: Cliente, Codice, Pezzi totali, Pezzi/scatolone'); return;
    }
    if (numScatoloniTotali < 1) { toast.error('Dati non validi'); return; }
    setGenerando(true);

    // Genera SSCC pallet
    const sscc = generaSSCC(config.digit_estensione, config.prefisso_gs1, config.contatore);

    // Salva nel DB
    await supabase.from('sscc_generati').insert([{
      sscc, numero_bancale: config.contatore,
      lotto: lavoro.lotto||null, quantita: pezziTot,
      descrizione: lavoro.descrizione||null, cliente: lavoro.cliente||null,
    }]);
    await supabase.from('sscc_config').update({ contatore: config.contatore + 1 }).eq('id', config.id);

    // Costruisce la coda di stampa
    const labels: React.ReactNode[] = [];

    // 1. Etichetta pallet
    labels.push(<EtichettaPallet key="pallet" d={{ sscc, numeroBancale: config.contatore, cliente: lavoro.cliente, descrizione: lavoro.descrizione, ordineNr: lavoro.ordineNr, data: lavoro.data, lotto: lavoro.lotto, pezziTotali: pezziTot, numScatoloni: numScatoloniTotali }} />);

    // 2. Etichette scatoloni
    for (let i = 1; i <= numScatoloniTotali; i++) {
      const isUltimo = i === numScatoloniTotali && pezziRimanenti > 0;
      const qty = isUltimo ? pezziRimanenti : pezziPerScat;
      labels.push(<EtichettaScatolone key={`s${i}`} d={{ cliente: lavoro.cliente, fornitore: lavoro.fornitore, codice: lavoro.codice, descrizione: lavoro.descrizione, ordineNr: lavoro.ordineNr, data: lavoro.data, lotto: lavoro.lotto, quantita: qty, numeroScatolone: i, totaleScatoloni: numScatoloniTotali, ssccPallet: sscc }} />);
    }

    toast.success(`✅ Bancale #${config.contatore} — 1 pallet + ${numScatoloniTotali} scatoloni`);
    setPrintQueue(labels); setGenerando(false); loadData();
    setTimeout(() => window.print(), 400);
  };

  const ssccPreview = config ? generaSSCC(config.digit_estensione, config.prefisso_gs1, config.contatore) : '';

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Caricamento...</div>;

  return (
    <div className="min-h-screen bg-[hsl(210,40%,96%)] print:bg-white">
      <div className="print:hidden">
        <Header title="Etichette SSCC GS1" activeTab="" showUsersButton={false} />
        <div className="mx-auto p-3 sm:p-5 md:px-8">
          <Button variant="outline" size="sm" className="mb-5" onClick={() => navigate(isAmministratore ? '/summary' : '/stampa-dashboard')}>
            <Home className="mr-2 h-4 w-4" /> Dashboard
          </Button>

          {/* Tab selector */}
          <div className="flex gap-2 mb-6 border-b border-gray-200">
            <button onClick={()=>setTab('lavoro')} className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${tab==='lavoro'?'border-blue-600 text-blue-600':'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <Package className="inline h-4 w-4 mr-1.5"/>Lavoro Completo
            </button>
            <button onClick={()=>setTab('sscc')} className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${tab==='sscc'?'border-blue-600 text-blue-600':'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <Layers className="inline h-4 w-4 mr-1.5"/>Solo Bancali SSCC
            </button>
          </div>

          {/* ── TAB: Lavoro Completo ── */}
          {tab==='lavoro' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                {/* Config */}
                <div className="bg-white rounded-xl border shadow-sm p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold flex items-center gap-2"><Settings className="h-4 w-4"/>Config GS1</h3>
                    {!editConfig && <Button variant="outline" size="sm" onClick={()=>{ setTempConfig({ prefisso_gs1:config?.prefisso_gs1||'', digit_estensione:config?.digit_estensione||'3' }); setEditConfig(true); }}>Modifica</Button>}
                  </div>
                  {editConfig ? (
                    <div className="space-y-2">
                      <div><Label className="text-xs">Prefisso GS1</Label><Input value={tempConfig.prefisso_gs1} onChange={e=>setTempConfig(p=>({...p,prefisso_gs1:e.target.value.replace(/\D/g,'')}))} className="font-mono mt-1"/></div>
                      <div><Label className="text-xs">Digit estensione</Label><Input value={tempConfig.digit_estensione} onChange={e=>setTempConfig(p=>({...p,digit_estensione:e.target.value.replace(/\D/g,'').slice(0,1)}))} className="font-mono mt-1 w-20"/></div>
                      <div className="flex gap-2"><Button size="sm" onClick={salvaConfig}>Salva</Button><Button size="sm" variant="outline" onClick={()=>setEditConfig(false)}>Annulla</Button></div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div><span className="text-muted-foreground">Prefisso: </span><span className="font-mono font-bold">{config?.prefisso_gs1||<span className="text-orange-500">Da configurare</span>}</span></div>
                      <div><span className="text-muted-foreground">Prossimo bancale: </span><span className="font-mono font-bold text-blue-600">#{config?.contatore}</span></div>
                    </div>
                  )}
                </div>

                {/* Dati lavoro */}
                <div className="bg-white rounded-xl border shadow-sm p-5">
                  <h2 className="font-bold text-base mb-4 flex items-center gap-2"><Package className="h-4 w-4"/>Dati Lavoro</h2>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs">Cliente *</Label><Input value={lavoro.cliente} onChange={e=>setLavoro(p=>({...p,cliente:e.target.value}))} placeholder="Es. O.erre" className="mt-1"/></div>
                    <div><Label className="text-xs">Fornitore</Label><Input value={lavoro.fornitore} onChange={e=>setLavoro(p=>({...p,fornitore:e.target.value}))} className="mt-1"/></div>
                    <div><Label className="text-xs">Codice prodotto *</Label><Input value={lavoro.codice} onChange={e=>setLavoro(p=>({...p,codice:e.target.value}))} placeholder="Es. P01108001" className="mt-1 font-mono"/></div>
                    <div><Label className="text-xs">Ordine nr</Label><Input value={lavoro.ordineNr} onChange={e=>setLavoro(p=>({...p,ordineNr:e.target.value}))} placeholder="Es. ODA26-1351" className="mt-1 font-mono"/></div>
                    <div className="col-span-2"><Label className="text-xs">Descrizione</Label><Input value={lavoro.descrizione} onChange={e=>setLavoro(p=>({...p,descrizione:e.target.value}))} placeholder="Es. SCATOLA IMBALLO UNICO 12/5..." className="mt-1"/></div>
                    <div><Label className="text-xs">Data</Label><Input value={lavoro.data} onChange={e=>setLavoro(p=>({...p,data:e.target.value}))} placeholder="Es. 28/5/26" className="mt-1"/></div>
                    <div><Label className="text-xs">Lotto</Label><Input value={lavoro.lotto} onChange={e=>setLavoro(p=>({...p,lotto:e.target.value}))} placeholder="Es. 202612142" className="mt-1 font-mono"/></div>
                  </div>
                </div>

                {/* Config scatoloni */}
                <div className="bg-white rounded-xl border shadow-sm p-5">
                  <h2 className="font-bold text-base mb-4">📦 Configurazione Bancale</h2>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Pezzi totali nel bancale *</Label>
                      <Input type="number" value={lavoro.pezziTotali} onChange={e=>setLavoro(p=>({...p,pezziTotali:e.target.value}))} placeholder="Es. 13.050" className="mt-1 font-mono text-lg font-bold"/>
                    </div>
                    <div>
                      <Label className="text-xs">Pezzi per scatolone *</Label>
                      <Input type="number" value={lavoro.pezziPerScatolone} onChange={e=>setLavoro(p=>({...p,pezziPerScatolone:e.target.value}))} placeholder="Es. 435" className="mt-1 font-mono text-lg font-bold"/>
                    </div>
                  </div>

                  {/* Riepilogo calcolo */}
                  {pezziTot > 0 && pezziPerScat > 0 && (
                    <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm font-semibold text-blue-800 mb-1">📋 Riepilogo bancale:</p>
                      <div className="text-sm text-blue-700 space-y-0.5">
                        <p>→ <b>{numScatoloniCompleti}</b> scatoloni da <b>{pezziPerScat.toLocaleString('it-IT')}</b> pz</p>
                        {pezziRimanenti > 0 && <p>→ <b>1</b> scatolone incompleto da <b>{pezziRimanenti.toLocaleString('it-IT')}</b> pz</p>}
                        <p className="font-bold text-blue-900 pt-1 border-t border-blue-200 mt-1">
                          Totale: {numScatoloniTotali} scatoloni — {pezziTot.toLocaleString('it-IT')} pz
                        </p>
                      </div>
                    </div>
                  )}

                  <Button className="w-full mt-4 h-12 text-base font-semibold" onClick={generaLavoroCompleto} disabled={!config?.prefisso_gs1||generando||!lavoro.cliente||!lavoro.codice||!lavoro.pezziTotali||!lavoro.pezziPerScatolone}>
                    <Printer className="mr-2 h-5 w-5"/>
                    {generando ? 'Generazione...' : `Genera e Stampa — 1 pallet + ${numScatoloniTotali} scatoloni`}
                  </Button>
                </div>
              </div>

              {/* Anteprima + storico */}
              <div className="space-y-4">
                <div className="bg-white rounded-xl border shadow-sm p-4">
                  <h3 className="font-semibold mb-3">📋 Anteprima scatolone</h3>
                  <div style={{ transform:'scale(0.65)', transformOrigin:'top left', width:'154%' }}>
                    <EtichettaScatolone d={{ cliente:lavoro.cliente||'Cliente', fornitore:lavoro.fornitore, codice:lavoro.codice||'CODICE', descrizione:lavoro.descrizione||'Descrizione prodotto', ordineNr:lavoro.ordineNr||'ODA26-0000', data:lavoro.data, lotto:lavoro.lotto||'LOTTO', quantita:pezziPerScat||435, numeroScatolone:1, totaleScatoloni:numScatoloniTotali||30, ssccPallet:ssccPreview }} />
                  </div>
                </div>
                <div className="bg-white rounded-xl border shadow-sm p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2"><History className="h-4 w-4"/>Storico bancali ({storico.length})</h3>
                  <table className="w-full text-xs">
                    <thead><tr className="bg-gray-50 border-b"><th className="px-2 py-1.5 text-left">#</th><th className="px-2 py-1.5 text-left">SSCC</th><th className="px-2 py-1.5 text-left">Cliente</th><th className="px-2 py-1.5 text-left">Data</th></tr></thead>
                    <tbody>
                      {storico.length===0 && <tr><td colSpan={4} className="text-center py-4 text-gray-400">Nessun bancale</td></tr>}
                      {storico.map(s=>(<tr key={s.id} className="border-b hover:bg-gray-50"><td className="px-2 py-1 font-bold text-blue-600">#{s.numero_bancale}</td><td className="px-2 py-1 font-mono text-[10px]">{s.sscc}</td><td className="px-2 py-1">{s.cliente||'—'}</td><td className="px-2 py-1">{new Date(s.created_at).toLocaleDateString('it-IT')}</td></tr>))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB: Solo Bancali SSCC ── */}
          {tab==='sscc' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-white rounded-xl border shadow-sm p-5">
                  <h2 className="font-bold text-base mb-4 flex items-center gap-2"><Settings className="h-4 w-4"/>Configurazione GS1</h2>
                  {editConfig ? (
                    <div className="space-y-3">
                      <div><Label className="text-xs">Prefisso GS1</Label><Input value={tempConfig.prefisso_gs1} onChange={e=>setTempConfig(p=>({...p,prefisso_gs1:e.target.value.replace(/\D/g,'')}))} className="font-mono mt-1"/></div>
                      <div><Label className="text-xs">Digit estensione</Label><Input value={tempConfig.digit_estensione} onChange={e=>setTempConfig(p=>({...p,digit_estensione:e.target.value.replace(/\D/g,'').slice(0,1)}))} className="font-mono mt-1 w-20"/></div>
                      <div className="flex gap-2"><Button size="sm" onClick={salvaConfig}>Salva</Button><Button size="sm" variant="outline" onClick={()=>setEditConfig(false)}>Annulla</Button></div>
                    </div>
                  ) : (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Prefisso GS1:</span><span className="font-mono font-bold">{config?.prefisso_gs1||<span className="text-orange-500">Da configurare</span>}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Digit estensione:</span><span className="font-mono">{config?.digit_estensione}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Prossimo bancale:</span><span className="font-mono font-bold text-blue-600">#{config?.contatore}</span></div>
                      {config?.prefisso_gs1 && ssccPreview.length===18 && <div className="flex justify-between border-t pt-1"><span className="text-muted-foreground">Prossimo SSCC:</span><span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{formattaSSCC(ssccPreview)}</span></div>}
                      <Button variant="outline" size="sm" className="mt-2" onClick={()=>{ setTempConfig({ prefisso_gs1:config?.prefisso_gs1||'', digit_estensione:config?.digit_estensione||'3' }); setEditConfig(true); }}>Modifica</Button>
                    </div>
                  )}
                </div>
                <div className="bg-white rounded-xl border shadow-sm p-5">
                  <h2 className="font-bold text-base mb-4 flex items-center gap-2"><Plus className="h-4 w-4"/>Dati (opzionali)</h2>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2"><Label className="text-xs">Cliente</Label><Input value={formSSCC.cliente} onChange={e=>setFormSSCC(p=>({...p,cliente:e.target.value}))} className="mt-1"/></div>
                    <div className="col-span-2"><Label className="text-xs">Descrizione</Label><Input value={formSSCC.descrizione} onChange={e=>setFormSSCC(p=>({...p,descrizione:e.target.value}))} className="mt-1"/></div>
                    <div><Label className="text-xs">Lotto</Label><Input value={formSSCC.lotto} onChange={e=>setFormSSCC(p=>({...p,lotto:e.target.value}))} className="mt-1 font-mono"/></div>
                    <div><Label className="text-xs">Data produzione</Label><Input type="date" value={formSSCC.dataProduzione} onChange={e=>setFormSSCC(p=>({...p,dataProduzione:e.target.value}))} className="mt-1"/></div>
                  </div>
                  <div className="mt-5 space-y-3">
                    <Button className="w-full h-12 text-base font-semibold" onClick={()=>generaBancali(1)} disabled={!config?.prefisso_gs1||generando}>
                      <Printer className="mr-2 h-5 w-5"/>{generando?'Generazione...':`Genera e Stampa — Bancale #${config?.contatore}`}
                    </Button>
                    <div className="flex items-center gap-3"><div className="flex-1 h-px bg-gray-200"/><span className="text-xs text-muted-foreground">oppure più bancali</span><div className="flex-1 h-px bg-gray-200"/></div>
                    <div className="flex gap-2 items-end">
                      <div className="flex-1"><Label className="text-xs">Numero bancali</Label><Input type="number" min={2} max={500} value={numeroBancali} onChange={e=>setNumeroBancali(Math.max(2,Math.min(500,parseInt(e.target.value)||2)))} className="mt-1 font-mono text-center text-lg font-bold"/></div>
                      <Button className="h-10 px-5 bg-amber-600 hover:bg-amber-700 text-white font-semibold" onClick={()=>generaBancali(numeroBancali)} disabled={!config?.prefisso_gs1||generando}>
                        <Printer className="mr-2 h-4 w-4"/>{generando?'...': `Genera ${numeroBancali} bancali`}
                      </Button>
                    </div>
                    {config?.contatore && numeroBancali > 1 && <p className="text-xs text-muted-foreground text-center">Bancali #{config.contatore} → #{config.contatore + numeroBancali - 1}</p>}
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border shadow-sm p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2"><History className="h-4 w-4"/>Storico ({storico.length})</h3>
                <table className="w-full text-xs">
                  <thead><tr className="bg-gray-50 border-b"><th className="px-2 py-1.5 text-left">#</th><th className="px-2 py-1.5 text-left">SSCC</th><th className="px-2 py-1.5 text-left">Cliente</th><th className="px-2 py-1.5 text-left">Data</th></tr></thead>
                  <tbody>
                    {storico.map(s=>(<tr key={s.id} className="border-b hover:bg-gray-50"><td className="px-2 py-1 font-bold text-blue-600">#{s.numero_bancale}</td><td className="px-2 py-1 font-mono text-[10px]">{s.sscc}</td><td className="px-2 py-1">{s.cliente||'—'}</td><td className="px-2 py-1">{new Date(s.created_at).toLocaleDateString('it-IT')}</td></tr>))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Area di stampa ── */}
      <div className="hidden print:flex print:flex-col print:gap-0">
        {printQueue}
      </div>

      <Toaster />
    </div>
  );
};

export default SSCCLabels;
