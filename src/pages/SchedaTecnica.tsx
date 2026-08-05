/**
 * SchedaTecnica.tsx — v2 redesign
 * UI completamente ridisegnata: header arancione, ricerca prominente,
 * sezioni a card, tasto torna alla dashboard.
 * Logica identica alla v1: connessione a db_articoli, auto-fill, PDF A4.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import jsPDF from 'jspdf'
import * as pdfjsLib from 'pdfjs-dist'
import { ArrowLeft, FileText, Search, Save, Download, Plus, X, ChevronRight, Package, Printer, Settings, Truck, Box } from 'lucide-react'

// @ts-ignore
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface ArticoloSearch {
  id: string; nr: number | null; cliente: string | null
  linea: string | null; codice: string; tipologia: string | null
}

interface DbArticolo extends ArticoloSearch {
  certificazione: string | null; cartone: string | null; grammatura: string | null
  codice_riciclo: string | null; dimensioni: string | null
  c: string | null; m: string | null; y: string | null; k: string | null
  pan_nr: string | null; pan_nr_2: string | null; pan_nr_3: string | null
  pan_nr_4: string | null; pan_nr_5: string | null; pan_nr_6: string | null
  polimero: string | null; linear: string | null; finitura: string | null
  cromalin_nr: string | null; terzista: string | null; lavorazione: string | null
  terzista_2: string | null; lavorazione_2: string | null
  pellicola_nr: string | null; cliche_nr: string | null
  fustella_nr: string | null; pulitore_codice: string | null; tassello: string | null
  ha_finestratura: boolean | null; h_finestratura: string | null
  ha_incollatura: boolean | null; tipologia_incollatura: string | null
  macchina_incollatura: string | null; scatolone: string | null
  quantita: string | null; peso: string | null; bancale: string | null
  altezza_bancale: string | null; immagine_scheda_url: string | null
}

interface FormData {
  cliente: string; lavoro: string; codice: string; id_art: string; cert: string
  tipo_scatola: string; dim: string
  tipo_cart: string; gramm: string; riciclo: string
  nr_col: string; finitura: string
  p1: string; p2: string; p3: string; p4: string; p5: string; p6: string
  linear: string; polimero: string; cromalin: string
  t1_terz: string; t1_lav: string; t1_pell: string; t1_cli: string
  fu_nr: string; fu_resa: string; pulitore: string; pinza: string; tassello: string
  t2_terz: string; t2_lav: string; t2_pell: string; t2_cli: string
  finest: string; bob: string
  incoll: string; tipo_incoll: string; mac: string; terz_incoll: string
  scat: string; qty: string; peso: string; bancale: string; alt_ban: string
}

const EMPTY: FormData = {
  cliente:'', lavoro:'', codice:'', id_art:'', cert:'-',
  tipo_scatola:'LINEARE', dim:'', tipo_cart:'', gramm:'', riciclo:'PAP 21',
  nr_col:'4', finitura:'VERNICE LUCIDA',
  p1:'', p2:'', p3:'', p4:'', p5:'', p6:'',
  linear:'80', polimero:'', cromalin:'',
  t1_terz:'', t1_lav:'', t1_pell:'', t1_cli:'',
  fu_nr:'', fu_resa:'4', pulitore:'NO', pinza:'NO', tassello:'',
  t2_terz:'', t2_lav:'', t2_pell:'', t2_cli:'',
  finest:'NO', bob:'',
  incoll:'NO', tipo_incoll:'', mac:'', terz_incoll:'',
  scat:'TERMO', qty:'', peso:'', bancale:'EPAL', alt_ban:'',
}

const OPTS = {
  tipoScatola: ['LINEARE','Fondo automatico','Fondo a scatto','Quattro angoli','Americane','Coniche','Piattina','Vassoi'],
  finitura: ['VERNICE LUCIDA','Vernice Opaca','Primer','Primer + UV','Primer + UV opaco','Vernice recto/verso'],
  siNo: ['NO', 'SI'],
  bancale: ['EPAL','EUR','Perdere'],
  scatolone: ['TERMO','T1','3','4','6','7A','Aldi','Diemme','Val','FS0380','5B','Verh75','G','PL'],
  cert: ['-','FSC','ISO2200',''],
  lav: ['','Serigrafia','Serigrafia Alto spessore','Argento a caldo','Oro a caldo','Rilievo','Oro a rilievo'],
  mac: ['','114 Pro','x80'],
}

const SECTIONS = [
  { id: 0, label: 'Immagine',     icon: '🖼️',  color: 'bg-purple-500' },
  { id: 1, label: 'Intestazione', icon: '📄',  color: 'bg-blue-500' },
  { id: 2, label: 'Packaging',    icon: '📦',  color: 'bg-orange-500' },
  { id: 3, label: 'Stampa',       icon: '🖨️',  color: 'bg-indigo-500' },
  { id: 4, label: 'Terzista pre', icon: '🏭',  color: 'bg-amber-500' },
  { id: 5, label: 'Fustella',     icon: '✂️',  color: 'bg-red-500' },
  { id: 6, label: 'Terzista post',icon: '🔧',  color: 'bg-cyan-500' },
  { id: 7, label: 'Fin./Incoll.', icon: '🔗',  color: 'bg-teal-500' },
  { id: 8, label: 'Confezione',   icon: '📫',  color: 'bg-green-500' },
]

// ─── MAPPING ──────────────────────────────────────────────────────────────────

function articoloToForm(a: DbArticolo, fustResa?: string): FormData {
  const pulitore = a.pulitore_codice ? 'SI' : 'NO'
  let cert = '-'
  if (a.certificazione) cert = a.certificazione
  else if ((a as any).fsc) cert = 'FSC'
  else if ((a as any).iso_22000) cert = 'ISO2200'

  return {
    cliente: a.cliente || '', lavoro: a.linea || '', codice: a.codice || '',
    id_art: a.id || '', cert,
    tipo_scatola: a.tipologia || 'LINEARE', dim: a.dimensioni || '',
    tipo_cart: a.cartone || '', gramm: a.grammatura || '',
    riciclo: a.codice_riciclo || 'PAP 21',
    nr_col: '4', finitura: a.finitura || 'VERNICE LUCIDA',
    p1: a.pan_nr || '', p2: a.pan_nr_2 || '', p3: a.pan_nr_3 || '',
    p4: a.pan_nr_4 || '', p5: a.pan_nr_5 || '', p6: a.pan_nr_6 || '',
    linear: a.linear || '80', polimero: a.polimero || '',
    cromalin: a.cromalin_nr || '',
    t1_terz: a.terzista || '', t1_lav: a.lavorazione || '',
    t1_pell: a.pellicola_nr || '', t1_cli: a.cliche_nr || '',
    fu_nr: a.fustella_nr || '', fu_resa: fustResa || '4',
    pulitore, pinza: 'NO', tassello: a.tassello || '',
    t2_terz: a.terzista_2 || '', t2_lav: a.lavorazione_2 || '',
    t2_pell: '', t2_cli: '',
    finest: a.ha_finestratura ? 'SI' : 'NO', bob: a.h_finestratura || '',
    incoll: a.ha_incollatura ? 'SI' : 'NO',
    tipo_incoll: a.tipologia_incollatura || '',
    mac: a.macchina_incollatura || '', terz_incoll: '',
    scat: a.scatolone || 'TERMO', qty: a.quantita || '',
    peso: a.peso || '', bancale: a.bancale || 'EPAL',
    alt_ban: a.altezza_bancale || '',
  }
}

function formToUpdate(d: FormData, imgUrl: string | null): Partial<DbArticolo> {
  return {
    linea: d.lavoro || null, tipologia: d.tipo_scatola || null,
    dimensioni: d.dim || null,
    certificazione: d.cert !== '-' ? d.cert : null,
    cartone: d.tipo_cart || null, grammatura: d.gramm || null,
    codice_riciclo: d.riciclo || null, finitura: d.finitura || null,
    pan_nr: d.p1 || null, pan_nr_2: d.p2 || null, pan_nr_3: d.p3 || null,
    pan_nr_4: d.p4 || null, pan_nr_5: d.p5 || null, pan_nr_6: d.p6 || null,
    linear: d.linear || null, polimero: d.polimero || null,
    cromalin_nr: d.cromalin || null,
    terzista: d.t1_terz || null, lavorazione: d.t1_lav || null,
    pellicola_nr: d.t1_pell || null, cliche_nr: d.t1_cli || null,
    fustella_nr: d.fu_nr || null,
    pulitore_codice: d.pulitore === 'SI' ? (d.fu_nr || 'SI') : null,
    tassello: d.tassello || null,
    terzista_2: d.t2_terz || null, lavorazione_2: d.t2_lav || null,
    ha_finestratura: d.finest === 'SI', h_finestratura: d.bob || null,
    ha_incollatura: d.incoll === 'SI',
    tipologia_incollatura: d.tipo_incoll || null,
    macchina_incollatura: d.mac || null,
    scatolone: d.scat || null, quantita: d.qty || null,
    peso: d.peso || null, bancale: d.bancale || null,
    altezza_bancale: d.alt_ban || null,
    immagine_scheda_url: imgUrl,
    updated_at: new Date().toISOString(),
  } as any
}

// ─── PDF GENERATION ───────────────────────────────────────────────────────────

function buildPDF(d: FormData, imgUrl: string | null) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const ML=10, MT=8, UW=190, HR=6.2
  const GRAY:[number,number,number]=[238,238,238], BLU:[number,number,number]=[219,234,254]
  const BLU_D:[number,number,number]=[29,78,216], BORDER:[number,number,number]=[190,190,190]
  const WH:[number,number,number]=[255,255,255], TEXT:[number,number,number]=[20,20,20]
  const MUTED:[number,number,number]=[100,100,100]

  const sb = () => { doc.setDrawColor(...BORDER); doc.setLineWidth(0.2) }
  const cell = (x:number,y:number,w:number,h:number,t:string|null,bold:boolean,bg:[number,number,number]|null,tc:[number,number,number]) => {
    sb()
    if (bg) { doc.setFillColor(...bg); doc.rect(x,y,w,h,'F') }
    doc.rect(x,y,w,h,'S')
    if (t) { doc.setFont('helvetica',bold?'bold':'normal'); doc.setFontSize(8); doc.setTextColor(...tc); doc.text(t,x+2,y+h*0.65) }
  }
  const lbl = (x:number,y:number,w:number,h:number,t:string) => cell(x,y,w,h,t,false,GRAY,MUTED)
  const val = (x:number,y:number,w:number,h:number,t:string) => cell(x,y,w,h,t||'—',false,WH,TEXT)
  const secH = (x:number,y:number,w:number,t:string) => { cell(x,y,w,HR,t,true,BLU,BLU_D); return y+HR }
  const lv = (x:number,y:number,w:number,label:string,value:string,lr=0.42) => {
    lbl(x,y,w*lr,HR,label); val(x+w*lr,y,w*(1-lr),HR,value); return y+HR
  }

  let y = MT
  doc.setFillColor(...BLU_D); doc.rect(ML,y,UW,10,'F')
  doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.setTextColor(255,255,255)
  doc.text('SCHEDA TECNICA PRODOTTO', ML+3, y+7)
  doc.setFontSize(8); doc.text('ARTI GRAFICHE LOMBARDI S.r.l. — PASSIRANO (BS)', ML+UW-2, y+7, {align:'right'})
  y += 10

  const cW = UW/3
  lbl(ML,y,20,HR,'Cliente:');         val(ML+20,y,cW-20,HR,d.cliente)
  lbl(ML+cW,y,18,HR,'Lavoro:');       val(ML+cW+18,y,cW-18,HR,d.lavoro)
  lbl(ML+cW*2,y,18,HR,'Codice:');     val(ML+cW*2+18,y,cW-18,HR,d.codice)
  y += HR
  lbl(ML,y,50,HR,'Certificazione richiesta'); val(ML+50,y,40,HR,d.cert)
  if (d.id_art) { lbl(ML+90,y,28,HR,'ID Articolo'); val(ML+118,y,UW-118,HR,d.id_art) }
  y += HR+2

  const imgTop=y, imgW=82, infoX=ML+imgW+2, infoW=UW-imgW-2
  sb(); doc.rect(ML,imgTop,imgW,96,'S')
  if (imgUrl) { try { doc.addImage(imgUrl,'JPEG',ML+1,imgTop+1,imgW-2,94) } catch {} }
  else { doc.setFontSize(8); doc.setTextColor(180,180,180); doc.text('[IMMAGINE PRODOTTO]',ML+imgW/2,imgTop+48,{align:'center'}) }

  let iy = imgTop
  iy = secH(infoX,iy,infoW,'INFORMAZIONI PACKAGING')
  iy = lv(infoX,iy,infoW,'Tipologia di scatole',d.tipo_scatola)
  iy = lv(infoX,iy,infoW,'Dimensioni (mm)',d.dim)
  iy = secH(infoX,iy,infoW,'CARTONE')
  iy = lv(infoX,iy,infoW,'Tipologia di cartone',d.tipo_cart)
  const hW2=infoW/2
  lbl(infoX,iy,22,HR,'Grammatura'); val(infoX+22,iy,hW2-22,HR,d.gramm)
  lbl(infoX+hW2,iy,25,HR,'Cod. Riciclo'); val(infoX+hW2+25,iy,hW2-25,HR,d.riciclo); iy+=HR
  iy = secH(infoX,iy,infoW,'INFORMAZIONI STAMPA')
  lbl(infoX,iy,22,HR,'Nr. Colori'); val(infoX+22,iy,12,HR,d.nr_col)
  lbl(infoX+34,iy,16,HR,'Finitura'); val(infoX+50,iy,infoW-50,HR,d.finitura); iy+=HR
  const pans=[d.p1,d.p2,d.p3,d.p4,d.p5,d.p6].filter(Boolean)
  if (pans.length) { iy = lv(infoX,iy,infoW,'Pantoni',pans.join('  '),0.32) }
  lbl(infoX,iy,26,HR,'Linearizzaz.'); val(infoX+26,iy,15,HR,d.linear)
  lbl(infoX+41,iy,26,HR,'Nr. Polimero'); val(infoX+67,iy,infoW-67,HR,d.polimero); iy+=HR
  if (d.cromalin) { iy = lv(infoX,iy,infoW,'Cromalin Nr.',d.cromalin,0.38) }

  y = imgTop+98
  const pW=(UW-2)/2, rx=ML+pW+2
  let ly=y, ry=y
  ly = secH(ML,ly,pW,'TERZISTA (PRE-FUSTELLATURA)')
  ly = lv(ML,ly,pW,'Terzista',d.t1_terz,0.38)
  ly = lv(ML,ly,pW,'Lavorazioni',d.t1_lav,0.38)
  ly = lv(ML,ly,pW,'Pellicola Nr.',d.t1_pell,0.38)
  ly = lv(ML,ly,pW,'Cliché Nr.',d.t1_cli,0.38)
  ly += 1
  ly = secH(ML,ly,pW,'TERZISTA (POST-FUSTELLATURA)')
  ly = lv(ML,ly,pW,'Terzista',d.t2_terz,0.38)
  ly = lv(ML,ly,pW,'Lavorazioni',d.t2_lav,0.38)
  ly = lv(ML,ly,pW,'Pellicola Nr.',d.t2_pell,0.38)
  ly = lv(ML,ly,pW,'Cliché Nr.',d.t2_cli,0.38)
  ry = secH(rx,ry,pW,'FUSTELLA')
  ry = lv(rx,ry,pW,'Numero Fustella',d.fu_nr,0.42)
  ry = lv(rx,ry,pW,'Resa Fustella',d.fu_resa,0.42)
  ry = lv(rx,ry,pW,'Pulitore',d.pulitore,0.42)
  ry = lv(rx,ry,pW,'Pinza taglia',d.pinza,0.42)
  ry = lv(rx,ry,pW,'Tassello Nr.',d.tassello,0.42)
  ry += 1
  ry = secH(rx,ry,pW,'FINESTRATURA')
  ry = lv(rx,ry,pW,'Finestratura',d.finest,0.42)
  ry = lv(rx,ry,pW,'Altezza bobina',d.bob,0.42)
  y = Math.max(ly,ry)+2

  y = secH(ML,y,UW,'INCOLLATURA')
  lbl(ML,y,22,HR,'Incollatura');  val(ML+22,y,15,HR,d.incoll)
  lbl(ML+37,y,34,HR,'Tipologia incollatura'); val(ML+71,y,UW/2-71+ML,HR,d.tipo_incoll)
  lbl(ML+UW/2,y,22,HR,'Macchina'); val(ML+UW/2+22,y,UW/2-22,HR,d.mac); y+=HR
  lbl(ML,y,34,HR,'Eventuale terzista'); val(ML+34,y,UW-34,HR,d.terz_incoll); y+=HR+1

  y = secH(ML,y,UW,'CONFEZIONE')
  const q=UW/4
  lbl(ML,y,22,HR,'Scatolone');    val(ML+22,y,q-22,HR,d.scat)
  lbl(ML+q,y,22,HR,'Quantità (pz)'); val(ML+q+22,y,q-22,HR,d.qty)
  lbl(ML+q*2,y,16,HR,'Peso (kg)'); val(ML+q*2+16,y,q-16,HR,d.peso)
  lbl(ML+q*3,y,18,HR,'Bancale');  val(ML+q*3+18,y,q-18,HR,d.bancale); y+=HR
  lbl(ML,y,38,HR,'Altezza max bancale'); val(ML+38,y,50,HR,d.alt_ban); y+=HR+2

  sb(); doc.setLineWidth(0.2); doc.line(ML,y,ML+UW,y)
  doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(160,160,160)
  doc.text(`Generata il ${new Date().toLocaleDateString('it-IT')} — Arti Grafiche Lombardi S.r.l.`, ML, y+4)

  doc.save(`SCHEDA_TECNICA_${(d.codice||'NUOVO').replace(/\s/g,'_')}_${(d.cliente||'').replace(/\s/g,'_')}.pdf`)
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function SchedaTecnica() {
  const navigate = useNavigate()
  const [query, setQuery]             = useState('')
  const [results, setResults]         = useState<ArticoloSearch[]>([])
  const [selected, setSelected]       = useState<DbArticolo | null>(null)
  const [form, setForm]               = useState<FormData>(EMPTY)
  const [imgUrl, setImgUrl]           = useState<string | null>(null)
  const [sec, setSec]                 = useState(1)
  const [saving, setSaving]           = useState(false)
  const [generating, setGenerating]   = useState(false)
  const [toast, setToast]             = useState<{msg:string; type:'ok'|'err'} | null>(null)
  const searchRef                     = useRef<HTMLDivElement>(null)

  const showToast = (msg:string, type:'ok'|'err'='ok') => {
    setToast({msg, type})
    setTimeout(()=>setToast(null), 2800)
  }

  const set = (k: keyof FormData, v: string) =>
    setForm(f => ({...f, [k]: v}))

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return }
    const { data } = await supabase
      .from('db_articoli')
      .select('id, nr, cliente, linea, codice, tipologia')
      .or(`id.ilike.%${q}%,codice.ilike.%${q}%,cliente.ilike.%${q}%`)
      .order('cliente')
      .limit(15)
    setResults((data as ArticoloSearch[]) || [])
  }, [])

  useEffect(() => {
    const t = setTimeout(() => search(query), 250)
    return () => clearTimeout(t)
  }, [query, search])

  const loadArticolo = async (id: string) => {
    const { data: a, error } = await supabase
      .from('db_articoli').select('*').eq('id', id).single()
    if (error || !a) { showToast('Errore caricamento articolo', 'err'); return }

    let fustResa = '4'
    if (a.fustella_nr) {
      const { data: fu } = await supabase
        .from('fustelle').select('resa, pinza_tagliata').eq('codice', a.fustella_nr).single()
      if (fu) { fustResa = fu.resa || '4' }
    }

    setSelected(a as DbArticolo)
    setForm(articoloToForm(a as DbArticolo, fustResa))
    if (a.immagine_scheda_url) setImgUrl(a.immagine_scheda_url)
    setResults([]); setQuery(''); setSec(1)
    showToast(`✓ "${a.codice}" caricato — scheda compilata automaticamente`)
  }

  const handlePDF = async (file: File) => {
    try {
      showToast('Estrazione immagine dal PDF…')
      const buffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
      const page = await pdf.getPage(1)
      const vp = page.getViewport({ scale: 2.0 })
      const canvas = document.createElement('canvas')
      canvas.width = vp.width; canvas.height = vp.height
      await page.render({ canvasContext: canvas.getContext('2d')!, viewport: vp }).promise
      setImgUrl(canvas.toDataURL('image/jpeg', 0.92))
      showToast('Immagine estratta ✓')
    } catch { showToast('Errore PDF', 'err') }
  }

  const save = async () => {
    if (!selected) { showToast('Seleziona prima un articolo', 'err'); return }
    setSaving(true)
    try {
      let storedImgUrl = imgUrl
      if (imgUrl?.startsWith('data:')) {
        const blob = await (await fetch(imgUrl)).blob()
        const path = `${selected.id}/immagine.jpg`
        const { error: upErr } = await supabase.storage.from('schede-tecniche').upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
        if (!upErr) {
          storedImgUrl = supabase.storage.from('schede-tecniche').getPublicUrl(path).data.publicUrl
          setImgUrl(storedImgUrl)
        }
      }
      const { error } = await supabase.from('db_articoli').update(formToUpdate(form, storedImgUrl)).eq('id', selected.id)
      if (error) throw error
      showToast('Scheda salvata ✓')
    } catch (e: any) { showToast('Errore: ' + e.message, 'err') }
    setSaving(false)
  }

  const genPDF = async () => {
    setGenerating(true); await new Promise(r => setTimeout(r, 50))
    buildPDF(form, imgUrl); setGenerating(false); showToast('PDF scaricato ✓')
  }

  // ─── FORM HELPERS ────────────────────────────────────────────────────────────

  const inp = (k: keyof FormData, type='text') => (
    <input type={type} value={form[k]} onChange={e => set(k, e.target.value)}
      className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm
                 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition"
    />
  )

  const sel = (k: keyof FormData, opts: string[]) => (
    <select value={form[k]} onChange={e => set(k, e.target.value)}
      className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm
                 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition"
    >
      {opts.map(o => <option key={o} value={o}>{o || '—'}</option>)}
    </select>
  )

  const Field = ({ label, children, span=1 }: { label: string; children: React.ReactNode; span?: number }) => (
    <div className={span > 1 ? `col-span-${span}` : ''}>
      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      {children}
    </div>
  )

  const SectionHeader = ({ icon, title, color }: { icon: string; title: string; color: string }) => (
    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl ${color} text-white mb-0`}>
      <span className="text-base">{icon}</span>
      <span className="text-sm font-semibold tracking-wide">{title}</span>
    </div>
  )

  const Card = ({ children }: { children: React.ReactNode }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      {children}
    </div>
  )

  const CardBody = ({ children }: { children: React.ReactNode }) => (
    <div className="p-4 grid grid-cols-2 gap-3">
      {children}
    </div>
  )

  // ─── SECTIONS ────────────────────────────────────────────────────────────────

  const sections: React.ReactNode[] = [

    // 0 — Immagine
    <Card key={0}>
      <SectionHeader icon="🖼️" title="Immagine prodotto" color="bg-purple-500" />
      <div className="p-4 space-y-3">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Carica il PDF del prodotto. La prima pagina verrà estratta come immagine nella scheda.
        </p>
        <label className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-all
          ${imgUrl ? 'border-green-400 bg-green-50 dark:bg-green-900/10' : 'border-gray-200 hover:border-orange-400 dark:border-gray-600'}`}>
          {imgUrl
            ? <img src={imgUrl} alt="anteprima" className="max-h-48 rounded-lg object-contain shadow" />
            : <>
                <span className="text-3xl">📄</span>
                <span className="text-sm text-gray-500 font-medium">Clicca per caricare il PDF del prodotto</span>
                <span className="text-xs text-gray-400">La prima pagina viene estratta come immagine</span>
              </>
          }
          <input type="file" accept=".pdf" className="hidden"
            onChange={e => e.target.files?.[0] && handlePDF(e.target.files[0])} />
        </label>
        {imgUrl && (
          <button onClick={() => setImgUrl(null)}
            className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 font-medium">
            <X className="h-3.5 w-3.5" /> Rimuovi immagine
          </button>
        )}
      </div>
    </Card>,

    // 1 — Intestazione
    <Card key={1}>
      <SectionHeader icon="📄" title="Identificazione articolo" color="bg-blue-500" />
      <CardBody>
        <Field label="Cliente">{inp('cliente')}</Field>
        <Field label="Codice articolo">{inp('codice')}</Field>
        <Field label="Lavoro / Linea" span={2}>{inp('lavoro')}</Field>
        <Field label="ID Articolo DB">{inp('id_art')}</Field>
        <Field label="Certificazione">{sel('cert', OPTS.cert)}</Field>
      </CardBody>
    </Card>,

    // 2 — Packaging
    <Card key={2}>
      <SectionHeader icon="📦" title="Packaging" color="bg-orange-500" />
      <CardBody>
        <Field label="Tipologia di scatole" span={2}>{sel('tipo_scatola', OPTS.tipoScatola)}</Field>
        <Field label="Dimensioni (mm)" span={2}>{inp('dim')}</Field>
        <div className="col-span-2 border-t border-gray-100 dark:border-gray-700 pt-3 mt-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Cartone</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipologia di cartone" span={2}>{inp('tipo_cart')}</Field>
            <Field label="Grammatura (gr)">{inp('gramm', 'number')}</Field>
            <Field label="Codice Riciclo">{inp('riciclo')}</Field>
          </div>
        </div>
      </CardBody>
    </Card>,

    // 3 — Stampa
    <Card key={3}>
      <SectionHeader icon="🖨️" title="Informazioni stampa" color="bg-indigo-500" />
      <CardBody>
        <Field label="Nr. Colori">{inp('nr_col', 'number')}</Field>
        <Field label="Finitura">{sel('finitura', OPTS.finitura)}</Field>
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Pantoni</label>
          <div className="grid grid-cols-3 gap-2">
            {(['p1','p2','p3','p4','p5','p6'] as (keyof FormData)[]).map((p,i) => (
              <div key={p}>
                <label className="block text-xs text-gray-400 mb-1">Pantone {i+1}</label>
                {inp(p)}
              </div>
            ))}
          </div>
        </div>
        <Field label="Linearizzazione (%)">{inp('linear', 'number')}</Field>
        <Field label="Nr. Polimero">{inp('polimero')}</Field>
        <Field label="Cromalin Nr.">{inp('cromalin')}</Field>
      </CardBody>
    </Card>,

    // 4 — Terzista pre
    <Card key={4}>
      <SectionHeader icon="🏭" title="Terzista (prima della fustellatura)" color="bg-amber-500" />
      <CardBody>
        <Field label="Terzista">{inp('t1_terz')}</Field>
        <Field label="Lavorazioni">{sel('t1_lav', OPTS.lav)}</Field>
        <Field label="Pellicola Nr.">{inp('t1_pell')}</Field>
        <Field label="Cliché Nr.">{inp('t1_cli')}</Field>
      </CardBody>
    </Card>,

    // 5 — Fustella
    <Card key={5}>
      <SectionHeader icon="✂️" title="Fustella" color="bg-red-500" />
      <CardBody>
        <Field label="Numero Fustella">{inp('fu_nr')}</Field>
        <Field label="Resa Fustella">{inp('fu_resa', 'number')}</Field>
        <Field label="Pulitore">{sel('pulitore', OPTS.siNo)}</Field>
        <Field label="Pinza taglia">{sel('pinza', OPTS.siNo)}</Field>
        <Field label="Tassello Nr.">{inp('tassello')}</Field>
      </CardBody>
    </Card>,

    // 6 — Terzista post
    <Card key={6}>
      <SectionHeader icon="🔧" title="Terzista (dopo la fustellatura)" color="bg-cyan-500" />
      <CardBody>
        <Field label="Terzista">{inp('t2_terz')}</Field>
        <Field label="Lavorazioni">{sel('t2_lav', OPTS.lav)}</Field>
        <Field label="Pellicola Nr.">{inp('t2_pell')}</Field>
        <Field label="Cliché Nr.">{inp('t2_cli')}</Field>
      </CardBody>
    </Card>,

    // 7 — Finestratura & Incollatura
    <div key={7} className="space-y-4">
      <Card>
        <SectionHeader icon="🔲" title="Finestratura" color="bg-teal-500" />
        <CardBody>
          <Field label="Finestratura">{sel('finest', OPTS.siNo)}</Field>
          <Field label="Altezza bobina">{inp('bob')}</Field>
        </CardBody>
      </Card>
      <Card>
        <SectionHeader icon="🔗" title="Incollatura" color="bg-teal-600" />
        <CardBody>
          <Field label="Incollatura">{sel('incoll', OPTS.siNo)}</Field>
          <Field label="Tipologia">{inp('tipo_incoll')}</Field>
          <Field label="Macchina">{sel('mac', OPTS.mac)}</Field>
          <Field label="Eventuale terzista">{inp('terz_incoll')}</Field>
        </CardBody>
      </Card>
    </div>,

    // 8 — Confezione
    <Card key={8}>
      <SectionHeader icon="📫" title="Confezione" color="bg-green-500" />
      <CardBody>
        <Field label="Scatolone usato">{sel('scat', OPTS.scatolone)}</Field>
        <Field label="Bancale">{sel('bancale', OPTS.bancale)}</Field>
        <Field label="Quantità (pz)">{inp('qty', 'number')}</Field>
        <Field label="Peso (kg)">{inp('peso', 'number')}</Field>
        <Field label="Altezza massima bancale" span={2}>{inp('alt_ban')}</Field>
      </CardBody>
    </Card>,
  ]

  // ─── RENDER ──────────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">

      {/* ── HEADER ── */}
      <div className="flex-shrink-0 bg-gradient-to-r from-orange-500 to-orange-600 shadow-lg">

        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 gap-3">
          {/* Left: back + title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate('/summary')}
              className="flex items-center gap-1.5 text-orange-100 hover:text-white text-sm font-medium
                         bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 transition flex-shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </button>
            <div className="min-w-0">
              <h1 className="text-white font-bold text-base leading-tight flex items-center gap-2">
                <FileText className="h-4 w-4 flex-shrink-0" />
                Scheda Tecnica
              </h1>
              {selected ? (
                <p className="text-orange-100 text-xs truncate">
                  {selected.cliente} — {selected.codice} · {selected.tipologia}
                </p>
              ) : (
                <p className="text-orange-200 text-xs">Cerca un articolo per compilare la scheda</p>
              )}
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => { setSelected(null); setForm(EMPTY); setImgUrl(null); setSec(1); setQuery('') }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white border border-white/30
                         hover:bg-white/10 rounded-lg transition"
            >
              <Plus className="h-3.5 w-3.5" /> Nuova
            </button>
            <button
              onClick={save}
              disabled={saving || !selected}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white text-orange-600
                         hover:bg-orange-50 rounded-lg font-semibold disabled:opacity-40 transition shadow-sm"
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? 'Salvo…' : 'Salva'}
            </button>
            <button
              onClick={genPDF}
              disabled={generating}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-orange-700 hover:bg-orange-800
                         text-white rounded-lg font-semibold disabled:opacity-40 transition shadow-sm"
            >
              <Download className="h-3.5 w-3.5" />
              {generating ? 'Generando…' : 'PDF'}
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="px-4 pb-3">
          <div className="relative" ref={searchRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-orange-300" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Cerca articolo per ID, codice o cliente… La scheda si compila automaticamente"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border-0 text-sm
                           bg-white/90 dark:bg-gray-800/90 text-gray-900 dark:text-gray-100
                           placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/50
                           shadow-inner"
              />
              {query && (
                <button onClick={() => { setQuery(''); setResults([]) }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Dropdown risultati */}
            {results.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800
                              border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50
                              max-h-64 overflow-y-auto">
                {results.map(r => (
                  <button
                    key={r.id}
                    onClick={() => loadArticolo(r.id)}
                    className="w-full text-left px-4 py-2.5 hover:bg-orange-50 dark:hover:bg-gray-700
                               border-b border-gray-100 dark:border-gray-700 last:border-0 transition group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{r.codice}</span>
                        <span className="ml-2 text-xs text-gray-500">{r.cliente} · {r.linea}</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-orange-400 opacity-0 group-hover:opacity-100 transition" />
                    </div>
                    {r.tipologia && <div className="text-xs text-orange-500 mt-0.5">{r.tipologia}</div>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Sidebar navigazione */}
        <nav className="w-40 flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-100
                        dark:border-gray-700 flex flex-col py-2 overflow-y-auto shadow-sm">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setSec(s.id)}
              className={`flex items-center gap-2.5 text-left px-3 py-2 mx-2 my-0.5 rounded-lg
                          text-xs font-medium transition-all
                          ${sec === s.id
                            ? 'bg-orange-500 text-white shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-orange-50 dark:hover:bg-gray-700 hover:text-orange-600'
                          }`}
            >
              <span className="text-sm">{s.icon}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </nav>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4">

          {/* Banner articolo selezionato */}
          {selected && (
            <div className="mb-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800
                            rounded-xl px-4 py-2.5 flex items-center gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                <Package className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-orange-800 dark:text-orange-200">
                  Scheda compilata automaticamente da DB Articoli
                </p>
                <p className="text-xs text-orange-600 dark:text-orange-400 truncate">
                  {selected.cliente} · {selected.codice} · ID: {selected.id}
                </p>
              </div>
              <div className="flex-shrink-0 flex gap-1">
                {[form.cliente, form.codice, form.tipo_scatola, form.finitura].filter(Boolean).map(v => (
                  <span key={v} className="text-xs px-2 py-0.5 bg-orange-100 dark:bg-orange-900/40
                                           text-orange-700 dark:text-orange-300 rounded-full">{v}</span>
                ))}
              </div>
            </div>
          )}

          {/* Section content */}
          {sections[sec]}
        </main>
      </div>

      {/* ── TOAST ── */}
      {toast && (
        <div className={`fixed bottom-5 right-5 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg z-50
                         flex items-center gap-2 animate-in slide-in-from-bottom-2
                         ${toast.type === 'ok'
                           ? 'bg-gray-900 text-white'
                           : 'bg-red-600 text-white'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
