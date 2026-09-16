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

// ── GS1 Check Digit Mod-10 ──────────────────────────────────────────────────
function calcolaCheckDigit(digits: string): number {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    sum += parseInt(digits[digits.length - 1 - i]) * (i % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10;
}

function generaSSCC(estensione: string, prefisso: string, progressivo: number): string {
  const serialLen = 17 - estensione.length - prefisso.length;
  if (serialLen < 1) return 'CONFIG_INVALIDA';
  const base = estensione + prefisso + String(progressivo).padStart(serialLen, '0');
  if (base.length !== 17) return 'LUNGHEZZA_INVALIDA';
  return base + calcolaCheckDigit(base);
}

function formattaSSCC(sscc: string) {
  return sscc.length === 18 ? `(00) ${sscc}` : sscc;
}

// ── Barcode ─────────────────────────────────────────────────────────────────
function BarcodeGS1128({ sscc }: { sscc: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!canvasRef.current || sscc.length !== 18) return;
    const render = () => (window as any).JsBarcode(canvasRef.current, sscc, {
      format: 'CODE128', displayValue: false, width: 2, height: 70, margin: 8,
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

// ── Singola etichetta ────────────────────────────────────────────────────────
interface LabelData {
  sscc: string; numeroBancale: number;
  gtin: string; lotto: string; quantita: string;
  dataProduzione: string; pesoLordo: string;
  descrizione: string; cliente: string;
}

function Etichetta({ data }: { data: LabelData }) {
  return (
    <div className="bg-white border-2 border-black font-mono mx-auto" style={{ width:'100mm', padding:'3mm', fontSize:'7.5pt', pageBreakAfter:'always' }}>
      <div className="flex justify-between items-center border-b border-black pb-1 mb-1.5">
        <span className="font-bold text-[8pt]">ETICHETTA PALLET GS1</span>
        <span className="font-bold text-[8pt]">BANCALE #{data.numeroBancale}</span>
      </div>
      {data.descrizione && <div className="mb-1"><b>Prodotto:</b> {data.descrizione}</div>}
      {data.cliente && <div className="mb-1"><b>Cliente:</b> {data.cliente}</div>}
      <div className="grid grid-cols-2 gap-x-2 mb-1.5 text-[7pt]">
        {data.gtin && <div><b>(01) GTIN:</b><br/>{data.gtin}</div>}
        {data.lotto && <div><b>(10) Lotto:</b><br/>{data.lotto}</div>}
        {data.quantita && <div><b>(30) Qtà:</b><br/>{data.quantita} pz</div>}
        {data.dataProduzione && <div><b>(11) Prod.:</b><br/>{data.dataProduzione}</div>}
        {data.pesoLordo && <div><b>(330) Peso:</b><br/>{data.pesoLordo} kg</div>}
      </div>
      <div className="border-t border-black my-1.5" />
      {data.sscc.length === 18 ? (
        <>
          <BarcodeGS1128 sscc={data.sscc} />
          <div className="text-center text-[7pt] mt-0.5 tracking-wider font-bold">{formattaSSCC(data.sscc)}</div>
        </>
      ) : (
        <div className="text-center text-gray-400 py-3 text-[7pt]">Configura prefisso GS1</div>
      )}
    </div>
  );
}

// ── Tipi ─────────────────────────────────────────────────────────────────────
interface SSCCConfig { id:string;prefisso_gs1:string;digit_estensione:string;contatore:number; }
interface SSCCRecord { id:string;sscc:string;numero_bancale:number;gtin?:string;lotto?:string;quantita?:number;data_produzione?:string;peso_lordo_kg?:number;descrizione?:string;cliente?:string;created_at:string; }

// ── Pagina ───────────────────────────────────────────────────────────────────
const SSCCLabels = () => {
  const navigate = useNavigate();
  const { isAmministratore } = useAuth();
  const [config, setConfig] = useState<SSCCConfig | null>(null);
  const [editConfig, setEditConfig] = useState(false);
  const [tempConfig, setTempConfig] = useState({ prefisso_gs1: '', digit_estensione: '3' });
  const [storico, setStorico] = useState<SSCCRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [numeroBancali, setNumeroBancali] = useState(1);
  const [printQueue, setPrintQueue] = useState<LabelData[]>([]);

  const [form, setForm] = useState({
    gtin:'', lotto:'', quantita:'',
    dataProduzione: new Date().toISOString().split('T')[0],
    pesoLordo:'', descrizione:'', cliente:'', note:'',
  });

  const ssccPreview = config ? generaSSCC(config.digit_estensione, config.prefisso_gs1, config.contatore) : '';

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
    const { error } = await supabase.from('sscc_config')
      .update({ prefisso_gs1: tempConfig.prefisso_gs1, digit_estensione: tempConfig.digit_estensione, updated_at: new Date().toISOString() })
      .eq('id', config.id);
    if (error) { toast.error('Errore salvataggio config'); return; }
    toast.success('Configurazione salvata');
    setEditConfig(false);
    loadData();
  };

  const generaEBatch = async (quanti: number) => {
    if (!config?.prefisso_gs1) { toast.error('Inserisci il prefisso GS1'); return; }
    if (quanti < 1 || quanti > 500) { toast.error('Inserisci un numero tra 1 e 500'); return; }
    setGenerando(true);

    // Genera tutti gli SSCC in sequenza
    const labels: LabelData[] = [];
    const records = [];
    for (let i = 0; i < quanti; i++) {
      const num = config.contatore + i;
      const sscc = generaSSCC(config.digit_estensione, config.prefisso_gs1, num);
      if (sscc.includes('_')) { toast.error('SSCC non valido'); setGenerando(false); return; }
      labels.push({
        sscc, numeroBancale: num,
        gtin: form.gtin, lotto: form.lotto, quantita: form.quantita,
        dataProduzione: form.dataProduzione, pesoLordo: form.pesoLordo,
        descrizione: form.descrizione, cliente: form.cliente,
      });
      records.push({
        sscc, numero_bancale: num,
        gtin: form.gtin||null, lotto: form.lotto||null,
        quantita: form.quantita ? parseInt(form.quantita) : null,
        data_produzione: form.dataProduzione||null,
        peso_lordo_kg: form.pesoLordo ? parseFloat(form.pesoLordo) : null,
        descrizione: form.descrizione||null, cliente: form.cliente||null, note: form.note||null,
      });
    }

    // Salva tutti in DB
    const { error } = await supabase.from('sscc_generati').insert(records);
    if (error) { toast.error(`Errore DB: ${error.message}`); setGenerando(false); return; }

    // Aggiorna contatore
    await supabase.from('sscc_config').update({ contatore: config.contatore + quanti }).eq('id', config.id);

    toast.success(`✅ ${quanti} etichett${quanti === 1 ? 'a' : 'e'} gener${quanti === 1 ? 'ata' : 'ate'} (bancale ${config.contatore}–${config.contatore + quanti - 1})`);
    setPrintQueue(labels);
    setGenerando(false);
    loadData();
    setTimeout(() => window.print(), 400);
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Caricamento...</div>;

  return (
    <div className="min-h-screen bg-[hsl(210,40%,96%)] print:bg-white">

      {/* ── UI (nascosta in stampa) ── */}
      <div className="print:hidden">
        <Header title="Etichette SSCC GS1" activeTab="" showUsersButton={false} />
        <div className="mx-auto p-3 sm:p-5 md:px-8">
          <Button variant="outline" size="sm" className="mb-5" onClick={() => navigate(isAmministratore ? '/summary' : '/stampa-dashboard')}>
            <Home className="mr-2 h-4 w-4" /> Dashboard
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* ── Colonna sinistra ── */}
            <div className="space-y-4">

              {/* Config */}
              <div className="bg-white rounded-xl border shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-base flex items-center gap-2"><Settings className="h-4 w-4"/>Configurazione GS1</h2>
                  {!editConfig && (
                    <Button variant="outline" size="sm" onClick={() => { setTempConfig({ prefisso_gs1: config?.prefisso_gs1||'', digit_estensione: config?.digit_estensione||'3' }); setEditConfig(true); }}>
                      Modifica
                    </Button>
                  )}
                </div>
                {editConfig ? (
                  <div className="space-y-3">
                    <div><Label className="text-xs">Prefisso GS1</Label><Input value={tempConfig.prefisso_gs1} onChange={e=>setTempConfig(p=>({...p,prefisso_gs1:e.target.value.replace(/\D/g,'')}))} placeholder="Es. 8012345" className="font-mono mt-1"/></div>
                    <div><Label className="text-xs">Digit estensione</Label><Input value={tempConfig.digit_estensione} onChange={e=>setTempConfig(p=>({...p,digit_estensione:e.target.value.replace(/\D/g,'').slice(0,1)}))} placeholder="3" className="font-mono mt-1 w-20"/></div>
                    <div className="flex gap-2"><Button size="sm" onClick={salvaConfig}>Salva</Button><Button size="sm" variant="outline" onClick={()=>setEditConfig(false)}>Annulla</Button></div>
                  </div>
                ) : (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Prefisso GS1:</span><span className="font-mono font-bold">{config?.prefisso_gs1||<span className="text-orange-500">Da configurare</span>}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Digit estensione:</span><span className="font-mono">{config?.digit_estensione}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Prossimo bancale:</span><span className="font-mono font-bold text-blue-600">#{config?.contatore}</span></div>
                    {config?.prefisso_gs1 && ssccPreview.length===18 && (
                      <div className="flex justify-between items-center pt-1 border-t">
                        <span className="text-muted-foreground">Prossimo SSCC:</span>
                        <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{formattaSSCC(ssccPreview)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Dati etichetta */}
              <div className="bg-white rounded-xl border shadow-sm p-5">
                <h2 className="font-bold text-base mb-4 flex items-center gap-2"><Plus className="h-4 w-4"/>Dati Etichetta</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2"><Label className="text-xs">Descrizione prodotto</Label><Input value={form.descrizione} onChange={e=>setForm(p=>({...p,descrizione:e.target.value}))} placeholder="Es. Scatola ondulata 300g" className="mt-1"/></div>
                  <div className="col-span-2"><Label className="text-xs">Cliente destinatario</Label><Input value={form.cliente} onChange={e=>setForm(p=>({...p,cliente:e.target.value}))} placeholder="Es. Acme S.r.l." className="mt-1"/></div>
                  <div><Label className="text-xs">(01) GTIN</Label><Input value={form.gtin} onChange={e=>setForm(p=>({...p,gtin:e.target.value.replace(/\D/g,'')}))} placeholder="14 cifre" className="mt-1 font-mono" maxLength={14}/></div>
                  <div><Label className="text-xs">(10) Lotto</Label><Input value={form.lotto} onChange={e=>setForm(p=>({...p,lotto:e.target.value}))} placeholder="Es. LOT-001" className="mt-1 font-mono"/></div>
                  <div><Label className="text-xs">(30) Quantità (pz)</Label><Input type="number" value={form.quantita} onChange={e=>setForm(p=>({...p,quantita:e.target.value}))} placeholder="Es. 1000" className="mt-1"/></div>
                  <div><Label className="text-xs">(330) Peso lordo (kg)</Label><Input type="number" step="0.001" value={form.pesoLordo} onChange={e=>setForm(p=>({...p,pesoLordo:e.target.value}))} placeholder="Es. 250.5" className="mt-1"/></div>
                  <div><Label className="text-xs">(11) Data produzione</Label><Input type="date" value={form.dataProduzione} onChange={e=>setForm(p=>({...p,dataProduzione:e.target.value}))} className="mt-1"/></div>
                  <div><Label className="text-xs">Note interne</Label><Input value={form.note} onChange={e=>setForm(p=>({...p,note:e.target.value}))} placeholder="Opzionale" className="mt-1"/></div>
                </div>

                {/* ── Pulsanti generazione ── */}
                <div className="mt-5 space-y-3">
                  {/* Singola */}
                  <Button
                    className="w-full h-12 text-base font-semibold"
                    onClick={() => generaEBatch(1)}
                    disabled={!config?.prefisso_gs1 || generando}
                  >
                    <Printer className="mr-2 h-5 w-5"/>
                    {generando ? 'Generazione...' : `Genera e Stampa — Bancale #${config?.contatore}`}
                  </Button>

                  {/* Separatore */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-gray-200"/>
                    <span className="text-xs text-muted-foreground">oppure genera più bancali</span>
                    <div className="flex-1 h-px bg-gray-200"/>
                  </div>

                  {/* Multipla */}
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Label className="text-xs">Numero di bancali da generare</Label>
                      <Input
                        type="number" min={2} max={500}
                        value={numeroBancali}
                        onChange={e => setNumeroBancali(Math.max(2, Math.min(500, parseInt(e.target.value)||2)))}
                        className="mt-1 font-mono text-center text-lg font-bold"
                      />
                    </div>
                    <Button
                      className="h-10 px-5 bg-amber-600 hover:bg-amber-700 text-white font-semibold whitespace-nowrap"
                      onClick={() => generaEBatch(numeroBancali)}
                      disabled={!config?.prefisso_gs1 || generando}
                    >
                      <Printer className="mr-2 h-4 w-4"/>
                      {generando ? '...' : `Genera ${numeroBancali} etichette`}
                    </Button>
                  </div>
                  {config?.contatore && numeroBancali > 1 && (
                    <p className="text-xs text-muted-foreground text-center">
                      Genererà i bancali #{config.contatore} → #{config.contatore + numeroBancali - 1}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* ── Colonna destra: anteprima + storico ── */}
            <div className="space-y-4">
              <div className="bg-white rounded-xl border shadow-sm p-5">
                <h2 className="font-bold text-base mb-4">📋 Anteprima</h2>
                <Etichetta data={{ sscc: ssccPreview, numeroBancale: config?.contatore||1, gtin:form.gtin, lotto:form.lotto, quantita:form.quantita, dataProduzione:form.dataProduzione, pesoLordo:form.pesoLordo, descrizione:form.descrizione, cliente:form.cliente }} />
              </div>
              <div className="bg-white rounded-xl border shadow-sm p-5">
                <h2 className="font-bold text-base mb-4 flex items-center gap-2"><History className="h-4 w-4"/>Storico ({storico.length})</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead><tr className="bg-gray-50 border-b"><th className="px-2 py-2 text-left">#</th><th className="px-2 py-2 text-left">SSCC</th><th className="px-2 py-2 text-left">Cliente</th><th className="px-2 py-2 text-left">Lotto</th><th className="px-2 py-2 text-left">Data</th></tr></thead>
                    <tbody>
                      {storico.length===0 && <tr><td colSpan={5} className="text-center py-6 text-gray-400">Nessun SSCC generato</td></tr>}
                      {storico.map(s=>(
                        <tr key={s.id} className="border-b hover:bg-gray-50">
                          <td className="px-2 py-1.5 font-bold text-blue-600">#{s.numero_bancale}</td>
                          <td className="px-2 py-1.5 font-mono text-[10px]">{s.sscc}</td>
                          <td className="px-2 py-1.5">{s.cliente||'—'}</td>
                          <td className="px-2 py-1.5 font-mono">{s.lotto||'—'}</td>
                          <td className="px-2 py-1.5">{new Date(s.created_at).toLocaleDateString('it-IT')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── Area stampa: tutte le etichette in coda ── */}
      <div className="hidden print:block space-y-0">
        {printQueue.map((label, i) => (
          <Etichetta key={i} data={label} />
        ))}
      </div>

      <Toaster />
    </div>
  );
};

export default SSCCLabels;
