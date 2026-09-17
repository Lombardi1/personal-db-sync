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

// ── GS1 ───────────────────────────────────────────────────────────────────────
function calcolaCheckDigit(d: string): number {
  let s = 0;
  for (let i = 0; i < d.length; i++) s += parseInt(d[d.length-1-i]) * (i%2===0?3:1);
  return (10-(s%10))%10;
}
function generaSSCC(est: string, pfx: string, n: number): string {
  const sl = 17 - est.length - pfx.length;
  if (sl<1) return 'CONFIG_INVALIDA';
  const base = est + pfx + String(n).padStart(sl,'0');
  return base.length!==17 ? 'LEN_INVALIDA' : base+calcolaCheckDigit(base);
}
const fmtSSCC = (s: string) => s.length===18 ? `(00) ${s}` : s;

// ── Calcolo produzione ────────────────────────────────────────────────────────
interface Calcolo {
  pezziTotali: number;
  scatoloniTotali: number;
  scatoloniCompleti: number;
  pezziRimanenti: number;
  bancaliTotali: number;
  bancali: { n:number; scatoloni:number; pezziTotBancale:number; haIncompl:boolean; pezziIncompl:number }[];
}
function calcola(fogli:number, resa:number, pzScat:number, scatBanc:number): Calcolo | null {
  if (!fogli||!resa||!pzScat||!scatBanc) return null;
  const pezziTotali = fogli * resa;
  const scatoloniCompleti = Math.floor(pezziTotali / pzScat);
  const pezziRimanenti = pezziTotali % pzScat;
  const scatoloniTotali = scatoloniCompleti + (pezziRimanenti>0?1:0);
  const bancaliTotali = Math.ceil(scatoloniTotali / scatBanc);
  const bancali = [];
  for (let b=1; b<=bancaliTotali; b++) {
    const startScat = (b-1)*scatBanc + 1;
    const endScat = Math.min(b*scatBanc, scatoloniTotali);
    const scatoloni = endScat - startScat + 1;
    const isUltimoScat = endScat === scatoloniTotali && pezziRimanenti>0;
    const scatoloniComplBancale = isUltimoScat ? scatoloni-1 : scatoloni;
    const pezziTotBancale = scatoloniComplBancale*pzScat + (isUltimoScat?pezziRimanenti:0);
    bancali.push({ n:b, scatoloni, pezziTotBancale, haIncompl:isUltimoScat, pezziIncompl:pezziRimanenti });
  }
  return { pezziTotali, scatoloniTotali, scatoloniCompleti, pezziRimanenti, bancaliTotali, bancali };
}

// ── Barcode ───────────────────────────────────────────────────────────────────
function Barcode({ value, h=55 }: { value:string; h?:number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!ref.current||!value) return;
    const render = () => (window as any).JsBarcode(ref.current, value, {
      format:'CODE128', displayValue:false, width:2, height:h, margin:3, background:'#fff', lineColor:'#000'
    });
    if ((window as any).JsBarcode) { render(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jsbarcode/3.11.6/JsBarcode.all.min.js';
    s.onload = render; document.head.appendChild(s);
  }, [value, h]);
  return <canvas ref={ref} style={{ maxWidth:'100%' }} />;
}

// ── Etichetta Scatolone ───────────────────────────────────────────────────────
interface ScatData { cliente:string;fornitore:string;codice:string;descrizione:string;ordineNr:string;data:string;lotto:string;quantita:number;numScat:number;totScat:number;ssccPallet:string; }
function EtScat({ d }: { d:ScatData }) {
  const inc = d.numScat===d.totScat && d.quantita < d.quantita; // sempre false così — lo calcola il parent
  return (
    <div style={{ width:'150mm',height:'100mm',border:'2.5px solid #1a56db',boxSizing:'border-box',display:'grid',gridTemplateColumns:'55% 45%',background:'#fff',fontFamily:'Arial,sans-serif',pageBreakAfter:'always',flexShrink:0 }}>
      <div style={{ borderRight:'1.5px solid #1a56db',display:'flex',flexDirection:'column' }}>
        {[['Cliente:',d.cliente,true,true],['Fornitore:',d.fornitore,false,false],['Cod:',d.codice,false,false],['Descrizione:',d.descrizione,false,true],['Ordine nr:',d.ordineNr,false,false],['Data:',d.data,false,false],['Lotto:',d.lotto,false,false],['Quantità:',d.quantita+' pz',true,false]].map(([lbl,val,bold,large],i)=>(
          <div key={i} style={{ display:'flex',borderBottom:'1px solid #ddd',flex:1,alignItems:'center',minHeight:0 }}>
            <span style={{ fontStyle:'italic',fontSize:'7.5pt',minWidth:'27mm',paddingLeft:'2mm',color:'#444',whiteSpace:'nowrap' }}>{lbl}</span>
            <span style={{ fontSize:large?'10pt':'8.5pt',fontWeight:bold?'bold':'normal',paddingLeft:'1mm',lineHeight:1.2,overflow:'hidden' }}>{val}</span>
          </div>
        ))}
      </div>
      <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'space-between',padding:'2mm' }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:'6.5pt',color:'#666' }}>Scatolone</div>
          <div style={{ fontSize:'20pt',fontWeight:'bold',lineHeight:1,color:'#1a56db' }}>
            {d.numScat}<span style={{ fontSize:'9pt',color:'#999' }}>/{d.totScat}</span>
          </div>
        </div>
        <div style={{ textAlign:'center',width:'100%' }}>
          <div style={{ fontSize:'6.5pt',fontStyle:'italic',marginBottom:'1mm' }}>EAN:</div>
          <Barcode value={d.codice||'CODICE'} h={48} />
          <div style={{ fontSize:'7pt',fontWeight:'bold',letterSpacing:'0.5px',fontFamily:'monospace' }}>{d.codice}</div>
        </div>
        {d.ssccPallet && <div style={{ fontSize:'5pt',color:'#aaa',textAlign:'center',borderTop:'1px solid #eee',paddingTop:'1mm',width:'100%',fontFamily:'monospace' }}>Pallet:{d.ssccPallet}</div>}
      </div>
    </div>
  );
}

// ── Etichetta Pallet ──────────────────────────────────────────────────────────
interface PalData { sscc:string;num:number;cliente:string;descrizione:string;ordineNr:string;data:string;lotto:string;pezziTot:number;numScat:number; }
function EtPallet({ d }: { d:PalData }) {
  return (
    <div style={{ width:'150mm',height:'100mm',border:'2.5px solid #1a56db',boxSizing:'border-box',display:'flex',flexDirection:'column',padding:'3mm',background:'#fff',fontFamily:'Arial,sans-serif',pageBreakAfter:'always',flexShrink:0 }}>
      <div style={{ display:'flex',justifyContent:'space-between',borderBottom:'2px solid #1a56db',paddingBottom:'1.5mm',marginBottom:'1.5mm' }}>
        <span style={{ fontSize:'9pt',fontWeight:'bold' }}>ETICHETTA PALLET GS1</span>
        <span style={{ fontSize:'9pt',fontWeight:'bold',color:'#1a56db' }}>BANCALE #{d.num}</span>
      </div>
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1mm',fontSize:'8pt',flex:1 }}>
        <div><b>Cliente:</b> {d.cliente}</div><div><b>Ordine:</b> {d.ordineNr}</div>
        <div style={{ gridColumn:'1/-1' }}><b>Descr.:</b> {d.descrizione}</div>
        <div><b>Data:</b> {d.data}</div><div><b>Lotto:</b> {d.lotto}</div>
        <div><b>Pezzi:</b> {d.pezziTot.toLocaleString('it-IT')}</div><div><b>Scatoloni:</b> {d.numScat}</div>
      </div>
      <div style={{ borderTop:'1.5px solid #1a56db',paddingTop:'1.5mm',textAlign:'center' }}>
        <Barcode value={d.sscc} h={32} />
        <div style={{ fontSize:'7pt',fontWeight:'bold',letterSpacing:'1px',fontFamily:'monospace' }}>{fmtSSCC(d.sscc)}</div>
      </div>
    </div>
  );
}

// ── Tipi ──────────────────────────────────────────────────────────────────────
interface Cfg { id:string;prefisso_gs1:string;digit_estensione:string;contatore:number; }
interface Rec { id:string;sscc:string;numero_bancale:number;cliente?:string;lotto?:string;descrizione?:string;created_at:string; }

// ── Pagina ────────────────────────────────────────────────────────────────────
const SSCCLabels = () => {
  const navigate = useNavigate();
  const { isAmministratore } = useAuth();
  const [tab, setTab] = useState<'lavoro'|'sscc'>('lavoro');
  const [cfg, setCfg] = useState<Cfg|null>(null);
  const [editCfg, setEditCfg] = useState(false);
  const [tmpCfg, setTmpCfg] = useState({ prefisso_gs1:'', digit_estensione:'3' });
  const [storico, setStorico] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [printQueue, setPrintQueue] = useState<React.ReactNode[]>([]);
  const [numBancali, setNumBancali] = useState(1);

  const [lav, setLav] = useState({
    cliente:'', fornitore:'Arti Grafiche Lombardi', codice:'', descrizione:'',
    ordineNr:'', data:new Date().toLocaleDateString('it-IT'), lotto:'',
    fogli:'', resa:'', pzScat:'', scatBanc:'',
  });

  const [overridePzUltimoScat, setOverridePzUltimoScat] = useState('');
  const [overrideScatUltimoBanc, setOverrideScatUltimoBanc] = useState('');

  const f = parseInt(lav.fogli)||0, r = parseInt(lav.resa)||0;
  const ps = parseInt(lav.pzScat)||0, sb = parseInt(lav.scatBanc)||0;
  const calc = calcola(f, r, ps, sb);

  // Valori effettivi applicando gli override
  const pzUltimoScatEff = overridePzUltimoScat
    ? parseInt(overridePzUltimoScat)
    : (calc?.pezziRimanenti > 0 ? calc.pezziRimanenti : ps);
  const scatUltimoBancEff = overrideScatUltimoBanc
    ? parseInt(overrideScatUltimoBanc)
    : (calc?.bancali[calc.bancali.length-1]?.scatoloni || 0);
  const pezziUltimoBancEff = calc
    ? (scatUltimoBancEff - (calc.pezziRimanenti>0?1:0)) * ps + (calc.pezziRimanenti>0 ? pzUltimoScatEff : 0)
    : 0;

  useEffect(()=>{ loadData(); },[]);
  const loadData = async () => {
    setLoading(true);
    const [a,b] = await Promise.all([
      supabase.from('sscc_config').select('*').limit(1).single(),
      supabase.from('sscc_generati').select('id,sscc,numero_bancale,cliente,lotto,descrizione,created_at').order('created_at',{ascending:false}).limit(50),
    ]);
    if (a.data) setCfg(a.data);
    if (b.data) setStorico(b.data);
    setLoading(false);
  };
  const salvaCfg = async () => {
    if (!cfg) return;
    await supabase.from('sscc_config').update({ prefisso_gs1:tmpCfg.prefisso_gs1, digit_estensione:tmpCfg.digit_estensione, updated_at:new Date().toISOString() }).eq('id',cfg.id);
    toast.success('Configurazione salvata'); setEditCfg(false); loadData();
  };

  // Genera lavoro completo
  const generaLavoro = async () => {
    if (!cfg?.prefisso_gs1) { toast.error('Configura il prefisso GS1'); return; }
    if (!lav.cliente||!lav.codice||!calc) { toast.error('Compila tutti i campi'); return; }
    setGenerando(true);
    const labels: React.ReactNode[] = [];
    const records = [];
    let contatore = cfg.contatore;

    const bancaliEffettivi = calc.bancali.map((b, idx) => {
      if (idx === calc.bancali.length - 1 && overrideScatUltimoBanc) {
        const n = parseInt(overrideScatUltimoBanc);
        const pzRim = overridePzUltimoScat ? parseInt(overridePzUltimoScat) : calc.pezziRimanenti;
        const pezziTot = (n - (calc.pezziRimanenti>0?1:0))*ps + (calc.pezziRimanenti>0?pzRim:0);
        return { ...b, scatoloni: n, pezziTotBancale: pezziTot };
      }
      return b;
    });
    for (const banc of bancaliEffettivi) {
      const sscc = generaSSCC(cfg.digit_estensione, cfg.prefisso_gs1, contatore);
      // Etichetta pallet
      labels.push(<EtPallet key={`p${banc.n}`} d={{ sscc, num:contatore, cliente:lav.cliente, descrizione:lav.descrizione, ordineNr:lav.ordineNr, data:lav.data, lotto:lav.lotto, pezziTot:banc.pezziTotBancale, numScat:banc.scatoloni }} />);
      records.push({ sscc, numero_bancale:contatore, cliente:lav.cliente||null, lotto:lav.lotto||null, quantita:banc.pezziTotBancale, descrizione:lav.descrizione||null });

      // Etichette scatoloni di questo bancale
      const startGlobal = (banc.n-1)*sb;
      for (let i=0; i<banc.scatoloni; i++) {
        const scatGlobal = startGlobal + i + 1;
        const isUltimoScatolone = scatGlobal === calc.scatoloniTotali;
        const isIncompleto = isUltimoScatolone && calc.pezziRimanenti>0;
        const qtyBase = isIncompleto ? calc.pezziRimanenti : ps;
        const qty = isUltimoScatolone && overridePzUltimoScat ? parseInt(overridePzUltimoScat) : qtyBase;
        labels.push(<EtScat key={`s${banc.n}-${i}`} d={{ cliente:lav.cliente, fornitore:lav.fornitore, codice:lav.codice, descrizione:lav.descrizione, ordineNr:lav.ordineNr, data:lav.data, lotto:lav.lotto, quantita:qty, numScat:scatGlobal, totScat:calc.scatoloniTotali, ssccPallet:sscc }} />);
      }
      contatore++;
    }

    await supabase.from('sscc_generati').insert(records);
    await supabase.from('sscc_config').update({ contatore }).eq('id',cfg.id);
    toast.success(`✅ ${calc.bancaliTotali} pallet + ${calc.scatoloniTotali} scatoloni`);
    setPrintQueue(labels); setGenerando(false); loadData();
    setTimeout(()=>window.print(), 400);
  };

  // Genera solo bancali SSCC
  const generaBancali = async (n:number) => {
    if (!cfg?.prefisso_gs1) { toast.error('Configura il prefisso GS1'); return; }
    setGenerando(true);
    const labels:React.ReactNode[] = [], records = [];
    for (let i=0;i<n;i++) {
      const num = cfg.contatore+i;
      const sscc = generaSSCC(cfg.digit_estensione,cfg.prefisso_gs1,num);
      labels.push(<EtPallet key={i} d={{ sscc,num,cliente:'',descrizione:'',ordineNr:'',data:new Date().toLocaleDateString('it-IT'),lotto:'',pezziTot:0,numScat:0 }} />);
      records.push({ sscc, numero_bancale:num });
    }
    await supabase.from('sscc_generati').insert(records);
    await supabase.from('sscc_config').update({ contatore:cfg.contatore+n }).eq('id',cfg.id);
    toast.success(`✅ ${n} bancal${n===1?'e':'i'} generati`);
    setPrintQueue(labels); setGenerando(false); loadData();
    setTimeout(()=>window.print(),400);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Caricamento...</div>;

  return (
    <div className="min-h-screen bg-[hsl(210,40%,96%)] print:bg-white">
      <div className="print:hidden">
        <Header title="Etichette SSCC GS1" activeTab="" showUsersButton={false} />
        <div className="mx-auto p-3 sm:p-5 md:px-8">
          <Button variant="outline" size="sm" className="mb-5" onClick={()=>navigate(isAmministratore?'/summary':'/stampa-dashboard')}>
            <Home className="mr-2 h-4 w-4"/>Dashboard
          </Button>

          {/* Tabs */}
          <div className="flex gap-0 mb-6 border-b border-gray-200">
            {[['lavoro','📦 Lavoro Completo'],['sscc','🏷️ Solo Bancali SSCC']].map(([id,label])=>(
              <button key={id} onClick={()=>setTab(id as any)} className={`px-6 py-2.5 text-sm font-semibold border-b-2 transition-colors ${tab===id?'border-blue-600 text-blue-600':'border-transparent text-gray-500 hover:text-gray-700'}`}>{label}</button>
            ))}
          </div>

          {/* ── Lavoro Completo ── */}
          {tab==='lavoro' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="space-y-4">
                {/* Config GS1 */}
                <div className="bg-white rounded-xl border shadow-sm p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-4 text-sm items-center">
                      <Settings className="h-4 w-4 text-gray-500"/>
                      <span className="text-muted-foreground">Prefisso GS1:</span>
                      <span className="font-mono font-bold">{cfg?.prefisso_gs1||<span className="text-orange-500">Da configurare</span>}</span>
                      <span className="text-muted-foreground">Prossimo bancale:</span>
                      <span className="font-mono font-bold text-blue-600">#{cfg?.contatore}</span>
                    </div>
                    <Button variant="outline" size="sm" onClick={()=>{ setTmpCfg({ prefisso_gs1:cfg?.prefisso_gs1||'', digit_estensione:cfg?.digit_estensione||'3' }); setEditCfg(!editCfg); }}>
                      {editCfg?'Chiudi':'Configura GS1'}
                    </Button>
                  </div>
                  {editCfg && (
                    <div className="flex gap-3 mt-3">
                      <div><Label className="text-xs">Prefisso GS1</Label><Input value={tmpCfg.prefisso_gs1} onChange={e=>setTmpCfg(p=>({...p,prefisso_gs1:e.target.value.replace(/\D/g,'')}))} className="font-mono mt-1 w-36"/></div>
                      <div><Label className="text-xs">Digit est.</Label><Input value={tmpCfg.digit_estensione} onChange={e=>setTmpCfg(p=>({...p,digit_estensione:e.target.value.replace(/\D/g,'').slice(0,1)}))} className="font-mono mt-1 w-16"/></div>
                      <div className="flex items-end"><Button size="sm" onClick={salvaCfg}>Salva</Button></div>
                    </div>
                  )}
                </div>

                {/* Dati lavoro */}
                <div className="bg-white rounded-xl border shadow-sm p-5">
                  <h2 className="font-bold text-base mb-4">Dati Lavoro</h2>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs">Cliente *</Label><Input value={lav.cliente} onChange={e=>setLav(p=>({...p,cliente:e.target.value}))} placeholder="Es. O.erre" className="mt-1"/></div>
                    <div><Label className="text-xs">Fornitore</Label><Input value={lav.fornitore} onChange={e=>setLav(p=>({...p,fornitore:e.target.value}))} className="mt-1"/></div>
                    <div><Label className="text-xs">Codice prodotto *</Label><Input value={lav.codice} onChange={e=>setLav(p=>({...p,codice:e.target.value}))} placeholder="Es. P01108001" className="mt-1 font-mono"/></div>
                    <div><Label className="text-xs">Ordine nr</Label><Input value={lav.ordineNr} onChange={e=>setLav(p=>({...p,ordineNr:e.target.value}))} placeholder="Es. ODA26-1351" className="mt-1 font-mono"/></div>
                    <div className="col-span-2"><Label className="text-xs">Descrizione</Label><Input value={lav.descrizione} onChange={e=>setLav(p=>({...p,descrizione:e.target.value}))} placeholder="Es. SCATOLA IMBALLO UNICO 12/5 GRAFICA BRICOMAN" className="mt-1"/></div>
                    <div><Label className="text-xs">Data</Label><Input value={lav.data} onChange={e=>setLav(p=>({...p,data:e.target.value}))} placeholder="Es. 28/5/26" className="mt-1"/></div>
                    <div><Label className="text-xs">Lotto</Label><Input value={lav.lotto} onChange={e=>setLav(p=>({...p,lotto:e.target.value}))} placeholder="Es. 202612142" className="mt-1 font-mono"/></div>
                  </div>
                </div>

                {/* Calcolo bancale */}
                <div className="bg-white rounded-xl border shadow-sm p-5">
                  <h2 className="font-bold text-base mb-4">📐 Calcolo Produzione</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-semibold">Fogli fustellati</Label>
                      <Input type="number" value={lav.fogli} onChange={e=>setLav(p=>({...p,fogli:e.target.value}))} placeholder="Es. 2.000" className="mt-1 font-mono text-base font-bold"/>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">Resa (pz/foglio)</Label>
                      <Input type="number" value={lav.resa} onChange={e=>setLav(p=>({...p,resa:e.target.value}))} placeholder="Es. 13" className="mt-1 font-mono text-base font-bold"/>
                    </div>
                    {f>0&&r>0 && <div className="col-span-2 bg-gray-50 rounded-lg px-4 py-2 text-sm"><span className="text-muted-foreground">Pezzi totali = </span><span className="font-bold text-lg">{(f*r).toLocaleString('it-IT')}</span></div>}
                    <div>
                      <Label className="text-xs font-semibold">Pezzi per scatolone</Label>
                      <Input type="number" value={lav.pzScat} onChange={e=>setLav(p=>({...p,pzScat:e.target.value}))} placeholder="Es. 435" className="mt-1 font-mono text-base font-bold"/>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">Scatoloni per bancale</Label>
                      <Input type="number" value={lav.scatBanc} onChange={e=>setLav(p=>({...p,scatBanc:e.target.value}))} placeholder="Es. 30" className="mt-1 font-mono text-base font-bold"/>
                    </div>
                  </div>

                  {/* Riepilogo per bancale */}
                  {calc && (
                    <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <p className="text-sm font-bold text-blue-900 mb-2">📋 Riepilogo completo lavoro</p>
                      <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                        <div className="bg-white rounded-lg p-2 border border-blue-200">
                          <div className="text-2xl font-bold text-blue-700">{calc.pezziTotali.toLocaleString('it-IT')}</div>
                          <div className="text-xs text-muted-foreground">pezzi totali</div>
                        </div>
                        <div className="bg-white rounded-lg p-2 border border-blue-200">
                          <div className="text-2xl font-bold text-blue-700">{calc.scatoloniTotali}</div>
                          <div className="text-xs text-muted-foreground">scatoloni</div>
                        </div>
                        <div className="bg-white rounded-lg p-2 border border-blue-200">
                          <div className="text-2xl font-bold text-blue-700">{calc.bancaliTotali}</div>
                          <div className="text-xs text-muted-foreground">bancali</div>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        {calc.bancali.map((b,idx)=> {
                          const isUltimo = idx===calc.bancali.length-1;
                          return (
                            <div key={b.n} className={`text-xs px-3 py-2 rounded-lg border ${isUltimo&&calc.pezziRimanenti>0?'bg-orange-50 border-orange-300':'bg-white border-blue-200'}`}>
                              {/* Riga principale */}
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-blue-800">Bancale #{cfg?.contatore ? cfg.contatore+b.n-1 : b.n}</span>
                                {isUltimo ? (
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      value={overrideScatUltimoBanc}
                                      onChange={e=>setOverrideScatUltimoBanc(e.target.value)}
                                      placeholder={String(b.scatoloni)}
                                      title="Modifica scatoloni ultimo bancale"
                                      className="w-16 border border-blue-400 rounded px-1.5 py-0.5 text-sm font-mono font-bold text-center bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    />
                                    <span className="text-blue-700">scatoloni</span>
                                  </div>
                                ) : (
                                  <span className="text-blue-700">{b.scatoloni} scatoloni</span>
                                )}
                                <span className="font-semibold text-blue-800">{(isUltimo ? pezziUltimoBancEff : b.pezziTotBancale).toLocaleString('it-IT')} pz</span>
                              </div>
                              {/* Ultima riga: ultimo scatolone editabile */}
                              {isUltimo && (
                                <div className="flex items-center gap-2 mt-1.5 pt-1.5 border-t border-orange-200">
                                  <span className="text-orange-700 font-medium">Ultimo scatolone:</span>
                                  <input
                                    type="number"
                                    value={overridePzUltimoScat}
                                    onChange={e=>setOverridePzUltimoScat(e.target.value)}
                                    placeholder={String(calc.pezziRimanenti>0?calc.pezziRimanenti:ps)}
                                    title="Modifica pezzi ultimo scatolone"
                                    className="w-24 border border-orange-400 rounded px-1.5 py-0.5 text-sm font-mono font-bold text-center bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-orange-400"
                                  />
                                  <span className="text-orange-700">pz</span>
                                  {(overridePzUltimoScat||overrideScatUltimoBanc) && <span className="text-amber-600 text-[10px] font-semibold">✏️ modificato</span>}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <Button className="w-full mt-4 h-12 text-base font-semibold" onClick={generaLavoro} disabled={!cfg?.prefisso_gs1||generando||!calc||!lav.cliente||!lav.codice}>
                    <Printer className="mr-2 h-5 w-5"/>
                    {generando?'Generazione...' : calc ? `Genera e Stampa — ${calc.bancaliTotali} pallet + ${calc.scatoloniTotali} scatoloni` : 'Compila i dati per generare'}
                  </Button>
                </div>
              </div>

              {/* Anteprima + storico */}
              <div className="space-y-4">
                <div className="bg-white rounded-xl border shadow-sm p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm">📋 Anteprima scatolone</h3>
                    <span className="text-xs text-muted-foreground">{(overridePzUltimoScat||overrideScatUltimoBanc)?'✏️ con override':'scatolone tipo'}</span>
                  </div>
                  <div style={{ transform:'scale(0.63)', transformOrigin:'top left', width:'160%' }}>
                    <EtScat d={{
                      cliente:lav.cliente||'O.erre',
                      fornitore:lav.fornitore,
                      codice:lav.codice||'P01108001',
                      descrizione:lav.descrizione||'SCATOLA IMBALLO UNICO 12/5 GRAFICA BRICOMAN',
                      ordineNr:lav.ordineNr||'ODA26-1351',
                      data:lav.data,
                      lotto:lav.lotto||'202612142',
                      quantita: (overridePzUltimoScat||overrideScatUltimoBanc) ? pzUltimoScatEff : (ps||435),
                      numScat: (overridePzUltimoScat||overrideScatUltimoBanc) ? (calc?.scatoloniTotali||30) : 1,
                      totScat: calc?.scatoloniTotali||30,
                      ssccPallet:cfg?.prefisso_gs1?generaSSCC(cfg.digit_estensione,cfg.prefisso_gs1,cfg.contatore):''
                    }} />
                  </div>
                </div>
                <div className="bg-white rounded-xl border shadow-sm p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm"><History className="h-4 w-4"/>Storico bancali</h3>
                  <table className="w-full text-xs"><thead><tr className="bg-gray-50 border-b"><th className="px-2 py-1.5 text-left">#</th><th className="px-2 py-1.5 text-left">SSCC</th><th className="px-2 py-1.5 text-left">Cliente</th><th className="px-2 py-1.5 text-left">Data</th></tr></thead>
                    <tbody>{storico.length===0&&<tr><td colSpan={4} className="text-center py-4 text-gray-400">Nessun bancale</td></tr>}{storico.map(s=>(<tr key={s.id} className="border-b hover:bg-gray-50"><td className="px-2 py-1 font-bold text-blue-600">#{s.numero_bancale}</td><td className="px-2 py-1 font-mono text-[10px]">{s.sscc}</td><td className="px-2 py-1">{s.cliente||'—'}</td><td className="px-2 py-1">{new Date(s.created_at).toLocaleDateString('it-IT')}</td></tr>))}</tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── Solo Bancali ── */}
          {tab==='sscc' && (
            <div className="max-w-md space-y-4">
              <div className="bg-white rounded-xl border shadow-sm p-5">
                <h2 className="font-bold mb-4 flex items-center gap-2"><Settings className="h-4 w-4"/>Config GS1</h2>
                {editCfg?(
                  <div className="space-y-3">
                    <div><Label className="text-xs">Prefisso GS1</Label><Input value={tmpCfg.prefisso_gs1} onChange={e=>setTmpCfg(p=>({...p,prefisso_gs1:e.target.value.replace(/\D/g,'')}))} className="font-mono mt-1"/></div>
                    <div><Label className="text-xs">Digit estensione</Label><Input value={tmpCfg.digit_estensione} onChange={e=>setTmpCfg(p=>({...p,digit_estensione:e.target.value.replace(/\D/g,'').slice(0,1)}))} className="font-mono mt-1 w-20"/></div>
                    <div className="flex gap-2"><Button size="sm" onClick={salvaCfg}>Salva</Button><Button size="sm" variant="outline" onClick={()=>setEditCfg(false)}>Annulla</Button></div>
                  </div>
                ):(
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Prefisso:</span><span className="font-mono font-bold">{cfg?.prefisso_gs1||<span className="text-orange-500">Da configurare</span>}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Prossimo bancale:</span><span className="font-mono font-bold text-blue-600">#{cfg?.contatore}</span></div>
                    <Button variant="outline" size="sm" onClick={()=>{ setTmpCfg({ prefisso_gs1:cfg?.prefisso_gs1||'', digit_estensione:cfg?.digit_estensione||'3' }); setEditCfg(true); }}>Modifica</Button>
                  </div>
                )}
              </div>
              <div className="bg-white rounded-xl border shadow-sm p-5 space-y-3">
                <Button className="w-full h-12 text-base font-semibold" onClick={()=>generaBancali(1)} disabled={!cfg?.prefisso_gs1||generando}>
                  <Printer className="mr-2 h-5 w-5"/>{generando?'...':`Genera Bancale #${cfg?.contatore}`}
                </Button>
                <div className="flex items-center gap-3"><div className="flex-1 h-px bg-gray-200"/><span className="text-xs text-muted-foreground">oppure</span><div className="flex-1 h-px bg-gray-200"/></div>
                <div className="flex gap-2 items-end">
                  <div className="flex-1"><Label className="text-xs">Numero bancali</Label><Input type="number" min={2} max={500} value={numBancali} onChange={e=>setNumBancali(Math.max(2,parseInt(e.target.value)||2))} className="mt-1 font-mono text-center text-xl font-bold"/></div>
                  <Button className="h-10 px-4 bg-amber-600 hover:bg-amber-700 text-white" onClick={()=>generaBancali(numBancali)} disabled={!cfg?.prefisso_gs1||generando}>
                    <Printer className="mr-2 h-4 w-4"/>Genera {numBancali}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stampa */}
      <div className="hidden print:flex print:flex-col">{printQueue}</div>
      <Toaster />
    </div>
  );
};
export default SSCCLabels;
