/**
 * SchedaTecnica.tsx — v3
 * Layout identico alle altre pagine (Header + Dashboard btn).
 * Ricerca DB Articoli prominente, auto-fill completo.
 * PDF: rimossa colonna terzista, solo lavorazioni.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Header } from '@/components/Header'
import { Button } from '@/components/ui/button'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import jsPDF from 'jspdf'
import * as pdfjsLib from 'pdfjs-dist'
import { Home, Search, FileText, Save, Download, Plus, X, ChevronRight } from 'lucide-react'

// @ts-ignore
pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface ArticoloSearch {
  id: string; nr: number | null; cliente: string | null
  linea: string | null; codice: string; tipologia: string | null
}

interface DbArticolo extends ArticoloSearch {
  certificazione: string | null; cartone: string | null; grammatura: string | null
  codice_riciclo: string | null; dimensioni: string | null
  pan_nr: string | null; pan_nr_2: string | null; pan_nr_3: string | null
  pan_nr_4: string | null; pan_nr_5: string | null; pan_nr_6: string | null
  polimero: string | null; linear: string | null; finitura: string | null
  cromalin_nr: string | null
  lavorazione: string | null; pellicola_nr: string | null; cliche_nr: string | null
  lavorazione_2: string | null
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
  lav1: string; pell1: string; cli1: string
  fu_nr: string; fu_resa: string; pulitore: string; pinza: string; tassello: string
  lav2: string
  finest: string; bob: string
  incoll: string; tipo_incoll: string; mac: string
  scat: string; qty: string; peso: string; bancale: string; alt_ban: string
}

const EMPTY: FormData = {
  cliente:'', lavoro:'', codice:'', id_art:'', cert:'-',
  tipo_scatola:'LINEARE', dim:'', tipo_cart:'', gramm:'', riciclo:'PAP 21',
  nr_col:'4', finitura:'VERNICE LUCIDA',
  p1:'', p2:'', p3:'', p4:'', p5:'', p6:'',
  linear:'80', polimero:'', cromalin:'',
  lav1:'', pell1:'', cli1:'',
  fu_nr:'', fu_resa:'4', pulitore:'NO', pinza:'NO', tassello:'',
  lav2:'',
  finest:'NO', bob:'',
  incoll:'NO', tipo_incoll:'', mac:'',
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
  { id: 0, label: '🖼️ Immagine' },
  { id: 1, label: '📄 Intestazione' },
  { id: 2, label: '📦 Packaging' },
  { id: 3, label: '🖨️ Stampa' },
  { id: 4, label: '✂️ Fustella' },
  { id: 5, label: '🏭 Lav. pre' },
  { id: 6, label: '🔧 Lav. post' },
  { id: 7, label: '🔗 Fin./Incoll.' },
  { id: 8, label: '📫 Confezione' },
]

// ─── MAPPING ──────────────────────────────────────────────────────────────────

function articoloToForm(a: DbArticolo, fustResa?: string, pinza?: string): FormData {
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
    lav1: a.lavorazione || '', pell1: a.pellicola_nr || '', cli1: a.cliche_nr || '',
    fu_nr: a.fustella_nr || '', fu_resa: fustResa || '4',
    pulitore, pinza: pinza || 'NO', tassello: a.tassello || '',
    lav2: a.lavorazione_2 || '',
    finest: a.ha_finestratura ? 'SI' : 'NO', bob: a.h_finestratura || '',
    incoll: a.ha_incollatura ? 'SI' : 'NO',
    tipo_incoll: a.tipologia_incollatura || '',
    mac: a.macchina_incollatura || '',
    scat: a.scatolone || 'TERMO', qty: a.quantita || '',
    peso: a.peso || '', bancale: a.bancale || 'EPAL',
    alt_ban: a.altezza_bancale || '',
  }
}

function formToUpdate(d: FormData, imgUrl: string | null) {
  return {
    linea: d.lavoro || null, tipologia: d.tipo_scatola || null,
    dimensioni: d.dim || null,
    certificazione: d.cert !== '-' ? d.cert : null,
    cartone: d.tipo_cart || null, grammatura: d.gramm || null,
    codice_riciclo: d.riciclo || null, finitura: d.finitura || null,
    pan_nr: d.p1||null, pan_nr_2: d.p2||null, pan_nr_3: d.p3||null,
    pan_nr_4: d.p4||null, pan_nr_5: d.p5||null, pan_nr_6: d.p6||null,
    linear: d.linear||null, polimero: d.polimero||null, cromalin_nr: d.cromalin||null,
    lavorazione: d.lav1||null, pellicola_nr: d.pell1||null, cliche_nr: d.cli1||null,
    fustella_nr: d.fu_nr||null,
    pulitore_codice: d.pulitore === 'SI' ? (d.fu_nr || 'SI') : null,
    tassello: d.tassello||null, lavorazione_2: d.lav2||null,
    ha_finestratura: d.finest === 'SI', h_finestratura: d.bob||null,
    ha_incollatura: d.incoll === 'SI',
    tipologia_incollatura: d.tipo_incoll||null,
    macchina_incollatura: d.mac||null,
    scatolone: d.scat||null, quantita: d.qty||null,
    peso: d.peso||null, bancale: d.bancale||null,
    altezza_bancale: d.alt_ban||null,
    immagine_scheda_url: imgUrl,
    updated_at: new Date().toISOString(),
  } as any
}

// ─── PDF ─────────────────────────────────────────────────────────────────────────────────────

function buildPDF(d: FormData, imgUrl: string | null) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const ML=10, MT=8, UW=190, HR=6.2
  const GRAY:[number,number,number]=[238,238,238]
  const BLU:[number,number,number]=[219,234,254]
  const BLU_D:[number,number,number]=[29,78,216]
  const BORDER:[number,number,number]=[190,190,190]
  const WH:[number,number,number]=[255,255,255]
  const TEXT:[number,number,number]=[20,20,20]
  const MUTED:[number,number,number]=[100,100,100]

  const sb = () => { doc.setDrawColor(...BORDER); doc.setLineWidth(0.2) }
  const cell = (x:number,y:number,w:number,h:number,t:string|null,bold:boolean,
    bg:[number,number,number]|null,tc:[number,number,number]) => {
    sb()
    if (bg) { doc.setFillColor(...bg); doc.rect(x,y,w,h,'F') }
    doc.rect(x,y,w,h,'S')
    if (t) {
      doc.setFont('helvetica', bold ? 'bold' : 'normal')
      doc.setFontSize(8); doc.setTextColor(...tc)
      doc.text(t, x+2, y+h*0.65)
    }
  }
  const lbl = (x:number,y:number,w:number,h:number,t:string) => cell(x,y,w,h,t,false,GRAY,MUTED)
  const val = (x:number,y:number,w:number,h:number,t:string) => cell(x,y,w,h,t||'—',false,WH,TEXT)
  const secH = (x:number,y:number,w:number,t:string) => {
    cell(x,y,w,HR,t,true,BLU,BLU_D); return y+HR
  }
  const lv = (x:number,y:number,w:number,label:string,value:string,lr=0.42) => {
    lbl(x,y,w*lr,HR,label); val(x+w*lr,y,w*(1-lr),HR,value); return y+HR
  }

  let y = MT
  // Intestazione
  doc.setFillColor(...BLU_D); doc.rect(ML,y,UW,10,'F')
  doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.setTextColor(255,255,255)
  doc.text('SCHEDA TECNICA PRODOTTO', ML+3, y+7)
  doc.setFontSize(8)
  doc.text('ARTI GRAFICHE LOMBARDI S.r.l. — PASSIRANO (BS)', ML+UW-2, y+7, {align:'right'})
  y += 10

  const cW = UW/3
  lbl(ML,y,20,HR,'Cliente:');       val(ML+20,y,cW-20,HR,d.cliente)
  lbl(ML+cW,y,18,HR,'Lavoro:');     val(ML+cW+18,y,cW-18,HR,d.lavoro)
  lbl(ML+cW*2,y,18,HR,'Codice:');   val(ML+cW*2+18,y,cW-18,HR,d.codice)
  y += HR
  lbl(ML,y,50,HR,'Certificazione'); val(ML+50,y,40,HR,d.cert)
  if (d.id_art) { lbl(ML+90,y,28,HR,'ID Articolo'); val(ML+118,y,UW-118,HR,d.id_art) }
  y += HR+2

  // Immagine + Info packaging
  const imgTop=y, imgW=82, infoX=ML+imgW+2, infoW=UW-imgW-2
  sb(); doc.rect(ML,imgTop,imgW,96,'S')
  if (imgUrl) {
    try { doc.addImage(imgUrl,'JPEG',ML+1,imgTop+1,imgW-2,94) } catch {}
  } else {
    doc.setFontSize(8); doc.setTextColor(180,180,180)
    doc.text('[IMMAGINE PRODOTTO]',ML+imgW/2,imgTop+48,{align:'center'})
  }

  let iy = imgTop
  iy = secH(infoX,iy,infoW,'PACKAGING')
  iy = lv(infoX,iy,infoW,'Tipologia di scatola',d.tipo_scatola)
  iy = lv(infoX,iy,infoW,'Dimensioni (mm)',d.dim)
  iy = secH(infoX,iy,infoW,'CARTONE')
  iy = lv(infoX,iy,infoW,'Tipologia cartone',d.tipo_cart)
  const hW2=infoW/2
  lbl(infoX,iy,22,HR,'Grammatura'); val(infoX+22,iy,hW2-22,HR,d.gramm)
  lbl(infoX+hW2,iy,25,HR,'Riciclo'); val(infoX+hW2+25,iy,hW2-25,HR,d.riciclo); iy+=HR
  iy = secH(infoX,iy,infoW,'STAMPA')
  lbl(infoX,iy,22,HR,'Nr. Colori'); val(infoX+22,iy,12,HR,d.nr_col)
  lbl(infoX+34,iy,16,HR,'Finitura'); val(infoX+50,iy,infoW-50,HR,d.finitura); iy+=HR
  const pans=[d.p1,d.p2,d.p3,d.p4,d.p5,d.p6].filter(Boolean)
  if (pans.length) { iy = lv(infoX,iy,infoW,'Pantoni',pans.join('  '),0.30) }
  lbl(infoX,iy,26,HR,'Linearizzaz.'); val(infoX+26,iy,15,HR,d.linear)
  lbl(infoX+41,iy,26,HR,'Nr. Polimero'); val(infoX+67,iy,infoW-67,HR,d.polimero); iy+=HR
  if (d.cromalin) { iy = lv(infoX,iy,infoW,'Cromalin Nr.',d.cromalin,0.38) }

  y = imgTop+98

  // ── RIGA A 2 COLONNE: Lavorazioni + Fustella ──────────────────────────────────
  const pW=(UW-2)/2, rx=ML+pW+2
  let ly=y, ry=y

  // Sinistra: LAVORAZIONI (senza terzista)
  ly = secH(ML,ly,pW,'LAVORAZIONE PRE-FUSTELLATURA')
  if (d.lav1) { ly = lv(ML,ly,pW,'Tipo lavorazione',d.lav1,0.40) }
  else { lbl(ML,ly,pW,HR,'Tipo lavorazione'); val(ML+pW*0.40,ly,pW*0.60,HR,'—'); ly+=HR }
  if (d.pell1) { ly = lv(ML,ly,pW,'Pellicola Nr.',d.pell1,0.38) }
  if (d.cli1)  { ly = lv(ML,ly,pW,'Cliché Nr.',d.cli1,0.38) }
  ly += 2
  ly = secH(ML,ly,pW,'LAVORAZIONE POST-FUSTELLATURA')
  if (d.lav2) { ly = lv(ML,ly,pW,'Tipo lavorazione',d.lav2,0.40) }
  else { lbl(ML,ly,pW,HR,'Tipo lavorazione'); val(ML+pW*0.40,ly,pW*0.60,HR,'—'); ly+=HR }

  // Destra: FUSTELLA
  ry = secH(rx,ry,pW,'FUSTELLA')
  ry = lv(rx,ry,pW,'Numero Fustella',d.fu_nr,0.42)
  ry = lv(rx,ry,pW,'Resa Fustella',d.fu_resa,0.42)
  ry = lv(rx,ry,pW,'Pulitore',d.pulitore,0.42)
  ry = lv(rx,ry,pW,'Pinza taglia',d.pinza,0.42)
  if (d.tassello) { ry = lv(rx,ry,pW,'Tassello Nr.',d.tassello,0.42) }
  ry += 2
  ry = secH(rx,ry,pW,'FINESTRATURA')
  ry = lv(rx,ry,pW,'Finestratura',d.finest,0.42)
  if (d.finest === 'SI') { ry = lv(rx,ry,pW,'Altezza bobina',d.bob,0.42) }

  y = Math.max(ly,ry)+2

  // Incollatura
  y = secH(ML,y,UW,'INCOLLATURA')
  lbl(ML,y,22,HR,'Incollatura'); val(ML+22,y,15,HR,d.incoll)
  lbl(ML+37,y,34,HR,'Tipologia incollatura'); val(ML+71,y,UW/2-71+ML,HR,d.tipo_incoll)
  lbl(ML+UW/2,y,22,HR,'Macchina'); val(ML+UW/2+22,y,UW/2-22,HR,d.mac); y+=HR

  // Confezione
  y += 1
  y = secH(ML,y,UW,'CONFEZIONE')
  const q=UW/4
  lbl(ML,y,22,HR,'Scatolone');  val(ML+22,y,q-22,HR,d.scat)
  lbl(ML+q,y,22,HR,'Qta (pz)'); val(ML+q+22,y,q-22,HR,d.qty)
  lbl(ML+q*2,y,16,HR,'Peso (kg)'); val(ML+q*2+16,y,q-16,HR,d.peso)
  lbl(ML+q*3,y,18,HR,'Bancale'); val(ML+q*3+18,y,q-18,HR,d.bancale); y+=HR
  lbl(ML,y,38,HR,'Alt. max bancale'); val(ML+38,y,50,HR,d.alt_ban); y+=HR+2

  // Footer
  sb(); doc.setLineWidth(0.2); doc.line(ML,y,ML+UW,y)
  doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(160,160,160)
  doc.text(
    `Generata il ${new Date().toLocaleDateString('it-IT')} — Arti Grafiche Lombardi S.r.l.`,
    ML, y+4
  )

  const fname = `SCHEDA_${(d.codice||'NUOVO').replace(/\s/g,'_')}_${(d.cliente||'').replace(/\s/g,'_')}.pdf`
  doc.save(fname)
}

// ─── COMPONENT ─────────────────────────────────────────────────────────────────────────────

export default function SchedaTecnica() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState<ArticoloSearch[]>([])
  const [selected, setSelected] = useState<DbArticolo | null>(null)
  const [form, setForm]         = useState<FormData>(EMPTY)
  const [imgUrl, setImgUrl]     = useState<string | null>(null)
  const [sec, setSec]           = useState(1)
  const [saving, setSaving]     = useState(false)
  const [generating, setGenerating] = useState(false)
  const searchRef               = useRef<HTMLDivElement>(null)

  const set = (k: keyof FormData, v: string) => setForm(f => ({...f, [k]: v}))

  // Chiude dropdown cliccando fuori
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setResults([])
      }
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  // Ricerca su db_articoli
  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return }
    const { data } = await supabase
      .from('db_articoli')
      .select('id, nr, cliente, linea, codice, tipologia')
      .or(`id.ilike.%${q}%,codice.ilike.%${q}%,cliente.ilike.%${q}%,linea.ilike.%${q}%`)
      .order('cliente').limit(15)
    setResults((data as ArticoloSearch[]) || [])
  }, [])

  useEffect(() => {
    const t = setTimeout(() => search(query), 250)
    return () => clearTimeout(t)
  }, [query, search])

  // Carica tutti i dati articolo e compila la scheda
  const loadArticolo = async (id: string) => {
    const { data: a, error } = await supabase
      .from('db_articoli').select('*').eq('id', id).single()
    if (error || !a) { toast.error('Errore caricamento articolo'); return }

    let fustResa = '4', pinza = 'NO'
    if (a.fustella_nr) {
      const { data: fu } = await supabase
        .from('fustelle')
        .select('resa, pinza_tagliata')
        .eq('codice', a.fustella_nr)
        .single()
      if (fu) {
        fustResa = fu.resa || '4'
        pinza = fu.pinza_tagliata ? 'SI' : 'NO'
      }
    }

    setSelected(a as DbArticolo)
    setForm(articoloToForm(a as DbArticolo, fustResa, pinza))
    if (a.immagine_scheda_url) setImgUrl(a.immagine_scheda_url)
    setResults([])
    setQuery('')
    setSec(1)
    toast.success(`✓ Articolo "${a.codice}" caricato — scheda compilata da DB Articoli`)
  }

  // Apertura diretta da /schede-tecniche (?id=...)
  useEffect(() => {
    const idParam = searchParams.get('id')
    if (idParam) loadArticolo(idParam)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const handlePDF = async (file: File) => {
    try {
      toast.info('Estrazione immagine dal PDF…')
      const buffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
      const page = await pdf.getPage(1)
      const vp = page.getViewport({ scale: 2.0 })
      const canvas = document.createElement('canvas')
      canvas.width = vp.width; canvas.height = vp.height
      await page.render({ canvasContext: canvas.getContext('2d')!, viewport: vp }).promise
      setImgUrl(canvas.toDataURL('image/jpeg', 0.92))
      toast.success('Immagine estratta ✓')
    } catch { toast.error('Errore estrazione immagine') }
  }

  const save = async () => {
    if (!selected) { toast.error('Seleziona prima un articolo'); return }
    setSaving(true)
    try {
      let storedUrl = imgUrl
      if (imgUrl?.startsWith('data:')) {
        const blob = await (await fetch(imgUrl)).blob()
        const path = `${selected.id}/immagine.jpg`
        const { error: upErr } = await supabase.storage
          .from('schede-tecniche')
          .upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
        if (!upErr) {
          storedUrl = supabase.storage.from('schede-tecniche').getPublicUrl(path).data.publicUrl
          setImgUrl(storedUrl)
        }
      }
      const { error } = await supabase
        .from('db_articoli')
        .update(formToUpdate(form, storedUrl))
        .eq('id', selected.id)
      if (error) throw error
      toast.success('Scheda salvata ✓')
    } catch (e: any) { toast.error('Errore: ' + e.message) }
    setSaving(false)
  }

  const genPDF = async () => {
    setGenerating(true)
    await new Promise(r => setTimeout(r, 50))
    buildPDF(form, imgUrl)
    setGenerating(false)
    toast.success('PDF scaricato ✓')
  }

  const reset = () => {
    setSelected(null); setForm(EMPTY); setImgUrl(null)
    setSec(1); setQuery(''); setResults([])
  }

  // ─── UI HELPERS ───────────────────────────────────────────────────────────────────────────

  const inp = (k: keyof FormData, type = 'text', placeholder = '') => (
    <input
      type={type}
      value={form[k]}
      onChange={e => set(k, e.target.value)}
      placeholder={placeholder}
      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm
                 bg-white text-gray-900
                 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    />
  )

  const sel = (k: keyof FormData, opts: string[]) => (
    <select
      value={form[k]}
      onChange={e => set(k, e.target.value)}
      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm
                 bg-white text-gray-900
                 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    >
      {opts.map(o => <option key={o} value={o}>{o || '—'}</option>)}
    </select>
  )

  const Field = ({ label, children, col = 1 }: { label: string; children: React.ReactNode; col?: number }) => (
    <div className={col > 1 ? `col-span-${col}` : ''}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  )

  const Card = ({ title, color = 'bg-blue-600', children }: {
    title: string; color?: string; children: React.ReactNode
  }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className={`px-4 py-2.5 rounded-t-lg ${color} text-white`}>
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="p-4 grid grid-cols-2 gap-3">
        {children}
      </div>
    </div>
  )

  // ─── SEZIONI ───────────────────────────────────────────────────────────────────────────────

  const sectionContent = [

    // 0 — Immagine
    <div key={0} className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-4 py-2.5 bg-purple-600 text-white rounded-t-lg">
        <h3 className="text-sm font-semibold">🖼️ Immagine prodotto</h3>
      </div>
      <div className="p-4 space-y-3">
        <p className="text-xs text-gray-500">
          Carica il PDF del prodotto — la prima pagina viene estratta e inserita nella scheda stampata.
        </p>
        <label className={`flex flex-col items-center gap-3 p-8 rounded-lg border-2 border-dashed cursor-pointer transition
          ${imgUrl ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50'}`}>
          {imgUrl
            ? <img src={imgUrl} alt="anteprima" className="max-h-52 rounded object-contain shadow-sm" />
            : <>
                <FileText className="h-10 w-10 text-gray-300" />
                <span className="text-sm text-gray-500 font-medium">Clicca per caricare il PDF del prodotto</span>
                <span className="text-xs text-gray-400">La prima pagina viene usata come immagine nel PDF</span>
              </>
          }
          <input type="file" accept=".pdf" className="hidden"
            onChange={e => e.target.files?.[0] && handlePDF(e.target.files[0])} />
        </label>
        {imgUrl && (
          <button onClick={() => setImgUrl(null)}
            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium">
            <X className="h-3.5 w-3.5" /> Rimuovi immagine
          </button>
        )}
      </div>
    </div>,

    // 1 — Intestazione
    <Card key={1} title="📄 Identificazione articolo" color="bg-blue-600">
      <Field label="Cliente">{inp('cliente')}</Field>
      <Field label="Codice articolo">{inp('codice')}</Field>
      <Field label="Lavoro / Linea" col={2}>{inp('lavoro')}</Field>
      <Field label="ID Articolo (DB)">{inp('id_art')}</Field>
      <Field label="Certificazione">{sel('cert', OPTS.cert)}</Field>
    </Card>,

    // 2 — Packaging
    <div key={2} className="space-y-3">
      <Card title="📦 Scatola" color="bg-orange-500">
        <Field label="Tipologia di scatola" col={2}>{sel('tipo_scatola', OPTS.tipoScatola)}</Field>
        <Field label="Dimensioni (mm)" col={2}>{inp('dim', 'text', 'es. 200x150x50')}</Field>
      </Card>
      <Card title="📋 Cartone" color="bg-amber-600">
        <Field label="Tipologia di cartone" col={2}>{inp('tipo_cart')}</Field>
        <Field label="Grammatura (gr)">{inp('gramm', 'number')}</Field>
        <Field label="Codice Riciclo">{inp('riciclo')}</Field>
      </Card>
    </div>,

    // 3 — Stampa
    <Card key={3} title="🖨️ Informazioni di stampa" color="bg-indigo-600">
      <Field label="Nr. Colori">{inp('nr_col', 'number')}</Field>
      <Field label="Finitura">{sel('finitura', OPTS.finitura)}</Field>
      <div className="col-span-2">
        <label className="block text-xs font-medium text-gray-600 mb-2">Pantoni</label>
        <div className="grid grid-cols-3 gap-2">
          {(['p1','p2','p3','p4','p5','p6'] as (keyof FormData)[]).map((p, i) => (
            <div key={p}>
              <label className="block text-xs text-gray-400 mb-1">#{i+1}</label>
              {inp(p)}
            </div>
          ))}
        </div>
      </div>
      <Field label="Linearizzazione (%)">{inp('linear', 'number')}</Field>
      <Field label="Nr. Polimero">{inp('polimero')}</Field>
      <Field label="Cromalin Nr.">{inp('cromalin')}</Field>
    </Card>,

    // 4 — Fustella
    <Card key={4} title="✂️ Fustella" color="bg-red-600">
      <Field label="Numero Fustella">{inp('fu_nr')}</Field>
      <Field label="Resa Fustella">{inp('fu_resa', 'number')}</Field>
      <Field label="Pulitore">{sel('pulitore', OPTS.siNo)}</Field>
      <Field label="Pinza taglia">{sel('pinza', OPTS.siNo)}</Field>
      <Field label="Tassello Nr.">{inp('tassello')}</Field>
    </Card>,

    // 5 — Lavorazione pre
    <Card key={5} title="🏭 Lavorazione (prima della fustellatura)" color="bg-amber-500">
      <Field label="Tipo lavorazione" col={2}>{sel('lav1', OPTS.lav)}</Field>
      <Field label="Pellicola Nr.">{inp('pell1')}</Field>
      <Field label="Cliché Nr.">{inp('cli1')}</Field>
    </Card>,

    // 6 — Lavorazione post
    <Card key={6} title="🔧 Lavorazione (dopo la fustellatura)" color="bg-cyan-600">
      <Field label="Tipo lavorazione" col={2}>{sel('lav2', OPTS.lav)}</Field>
    </Card>,

    // 7 — Finestratura & Incollatura
    <div key={7} className="space-y-3">
      <Card title="🔲 Finestratura" color="bg-teal-600">
        <Field label="Finestratura">{sel('finest', OPTS.siNo)}</Field>
        <Field label="Altezza bobina">{inp('bob')}</Field>
      </Card>
      <Card title="🔗 Incollatura" color="bg-teal-700">
        <Field label="Incollatura">{sel('incoll', OPTS.siNo)}</Field>
        <Field label="Tipologia incollatura">{inp('tipo_incoll')}</Field>
        <Field label="Macchina" col={2}>{sel('mac', OPTS.mac)}</Field>
      </Card>
    </div>,

    // 8 — Confezione
    <Card key={8} title="📫 Confezione" color="bg-green-600">
      <Field label="Tipo scatolone">{sel('scat', OPTS.scatolone)}</Field>
      <Field label="Bancale">{sel('bancale', OPTS.bancale)}</Field>
      <Field label="Quantità (pz)">{inp('qty', 'number')}</Field>
      <Field label="Peso (kg)">{inp('peso', 'number')}</Field>
      <Field label="Altezza max bancale" col={2}>{inp('alt_ban')}</Field>
    </Card>,
  ]

  // ─── LOADING / RENDER ────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[hsl(210,40%,96%)] flex items-center justify-center">
        <div className="text-lg text-[hsl(var(--muted-foreground))]">Caricamento...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[hsl(210,40%,96%)]">
      <Header title="SCHEDA TECNICA" />

      <div className="max-w-[98%] mx-auto px-2 py-6 pt-20">

        {/* ── INTESTAZIONE PAGINA ── */}
        <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-[hsl(var(--foreground))] mb-1">
              📋 Scheda Tecnica
            </h1>
            <p className="text-[hsl(var(--muted-foreground))] text-sm">
              Cerca un articolo — la scheda si compila automaticamente da DB Articoli
            </p>
          </div>
          <Button onClick={() => navigate('/summary')} variant="outline" size="sm">
            <Home className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
        </div>

        {/* ── RICERCA DB ARTICOLI ── */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Search className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-semibold text-gray-700">Cerca articolo in DB Articoli</span>
            {selected && (
              <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                ✓ {selected.codice} — {selected.cliente}
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1" ref={searchRef}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Cerca per ID, codice articolo o cliente…"
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200
                                rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
                  {results.map(r => (
                    <button
                      key={r.id}
                      onClick={() => loadArticolo(r.id)}
                      className="w-full text-left px-4 py-2.5 hover:bg-blue-50
                                 border-b border-gray-100 last:border-0 transition group"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-semibold text-gray-900">{r.codice}</span>
                          <span className="ml-2 text-xs text-gray-500">{r.cliente}</span>
                          {r.linea && <span className="ml-1 text-xs text-gray-400">· {r.linea}</span>}
                        </div>
                        <ChevronRight className="h-4 w-4 text-blue-400 opacity-0 group-hover:opacity-100" />
                      </div>
                      {r.tipologia && (
                        <div className="text-xs text-blue-600 mt-0.5">{r.tipologia}</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selected && (
              <button
                onClick={reset}
                className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-300
                           rounded-md hover:bg-gray-50 text-gray-600"
              >
                <Plus className="h-3.5 w-3.5" /> Nuova
              </button>
            )}

            <button
              onClick={save}
              disabled={saving || !selected}
              className="flex items-center gap-1.5 px-4 py-2 text-sm bg-white border border-gray-300
                         rounded-md hover:bg-gray-50 font-medium disabled:opacity-40 text-gray-700"
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? 'Salvo…' : 'Salva'}
            </button>

            <button
              onClick={genPDF}
              disabled={generating}
              className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700
                         text-white rounded-md font-medium disabled:opacity-40"
            >
              <Download className="h-3.5 w-3.5" />
              {generating ? 'Generando…' : 'Scarica PDF'}
            </button>
          </div>

          {/* Info articolo selezionato */}
          {selected && (
            <div className="mt-3 p-3 bg-blue-50 rounded-md border border-blue-100 text-xs text-blue-700">
              <span className="font-semibold">Dati caricati automaticamente da DB Articoli:</span>
              {' '}{selected.cliente} · {selected.codice} · {selected.tipologia} · ID: {selected.id}
            </div>
          )}
        </div>

        {/* ── LAYOUT PRINCIPALE: sidebar + form ── */}
        <div className="flex gap-4">

          {/* Sidebar navigazione sezioni */}
          <nav className="flex-shrink-0 w-36 space-y-1">
            {SECTIONS.map(s => (
              <button
                key={s.id}
                onClick={() => setSec(s.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition
                  ${sec === s.id
                    ? 'bg-white shadow-sm border border-gray-200 text-blue-700 font-semibold'
                    : 'text-gray-600 hover:bg-white hover:shadow-sm'
                  }`}
              >
                {s.label}
              </button>
            ))}
          </nav>

          {/* Contenuto sezione */}
          <div className="flex-1 min-w-0">
            {sectionContent[sec]}
          </div>
        </div>
      </div>
    </div>
  )
}
