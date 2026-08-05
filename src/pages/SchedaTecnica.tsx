/**
 * SchedaTecnica.tsx
 * 
 * Componente per la creazione e gestione delle schede tecniche prodotto.
 * Da aggiungere nel gestionale Lombardi (cartone.aglombardi.it).
 *
 * INTEGRAZIONE:
 *   1. Copia questo file in src/pages/SchedaTecnica.tsx
 *   2. Adatta il path dell'import di supabase (riga ~10)
 *   3. Aggiungi la route nel router principale:
 *        { path: '/scheda-tecnica', element: <SchedaTecnica /> }
 *   4. npm install jspdf pdfjs-dist
 *
 * DATABASE: usa la tabella db_articoli esistente (migrazione già applicata).
 * STORAGE:  bucket 'schede-tecniche' (già creato).
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import jsPDF from 'jspdf'
import * as pdfjsLib from 'pdfjs-dist'

// Worker PDF.js via CDN per evitare complicazioni webpack/vite
// @ts-ignore
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface ArticoloSearch {
  id: string
  nr: number | null
  cliente: string | null
  linea: string | null
  codice: string
  tipologia: string | null
}

interface DbArticolo extends ArticoloSearch {
  certificazione: string | null
  cartone: string | null
  grammatura: string | null
  codice_riciclo: string | null
  dimensioni: string | null
  c: string | null; m: string | null; y: string | null; k: string | null
  pan_nr: string | null; pan_nr_2: string | null; pan_nr_3: string | null
  pan_nr_4: string | null; pan_nr_5: string | null; pan_nr_6: string | null
  polimero: string | null
  linear: string | null
  finitura: string | null
  cromalin_nr: string | null
  terzista: string | null; lavorazione: string | null
  terzista_2: string | null; lavorazione_2: string | null
  pellicola_nr: string | null; cliche_nr: string | null
  fustella_nr: string | null; pulitore_codice: string | null; tassello: string | null
  ha_finestratura: boolean | null
  h_finestratura: string | null
  ha_incollatura: boolean | null
  tipologia_incollatura: string | null; macchina_incollatura: string | null
  scatolone: string | null; quantita: string | null; peso: string | null
  bancale: string | null; altezza_bancale: string | null
  immagine_scheda_url: string | null
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
  tipoScatola: ['LINEARE','Fondo automatico','Fondo a scatto','Quattro angoli','Americane','Coniche','Buste disco','Buste Soffietto','Speciali','Appendini','Blister','Grilglie','Astucci Macchina automatica'],
  finitura: ['VERNICE LUCIDA','Vernice Opaca','Primer','Primer + UV','Primer + UV opaco','Vernice retri','Drip Off','Drip Off HG','Drip Off + UV','UV Lucido','Uv Opaco','UV lucido + Uv opaco'],
  siNo: ['NO', 'SI'],
  bancale: ['EPAL','EUR','Perdere'],
  scatolone: ['TERMO','T1','3','4','6','7A','Aldi','Diemme','Val','FS0380','5B','Verh75','G','PL'],
  cert: ['-','FSC','ISO2200',''],
  lav: ['','Serigrafia','Serigrafia Alto spessore','Argento a caldo','Oro a caldo','Rilievo','Oro a caldo + Rilievo','oro kurz','Plastica Opaca','Plastica Lucida','Plastica Soft','Lamina Oro','Lamina Argento','Glitter','TBM E','TM24E','TBM36E','KBSW22E','Incollatura','Politenatura retro'],
  mac: ['','114 Pro','x80'],
}

const NAVS = [
  { id: 0, label: 'Immagine' },
  { id: 1, label: 'Intestazione' },
  { id: 2, label: 'Packaging' },
  { id: 3, label: 'Stampa' },
  { id: 4, label: 'Terzista pre' },
  { id: 5, label: 'Fustella' },
  { id: 6, label: 'Terzista post' },
  { id: 7, label: 'Fin. / Incoll.' },
  { id: 8, label: 'Confezione' },
]

// ─── MAPPING: db_articoli → FormData ─────────────────────────────────────────

function articoloToForm(a: DbArticolo, fustResa?: string): FormData {
  // Calcola pulitore e pinza
  const pulitore = a.pulitore_codice ? 'SI' : 'NO'
  // Per pinza_tagliata serve il record fustella (passato via fustResa flag)
  // La resa viene dalla tabella fustelle

  let cert = '-'
  if (a.certificazione) cert = a.certificazione
  else if (a.fsc) cert = 'FSC'
  // @ts-ignore (iso_22000 exists but not in type above for brevity)
  else if ((a as any).iso_22000) cert = 'ISO2200'

  return {
    cliente: a.cliente || '',
    lavoro:  a.linea   || '',
    codice:  a.codice  || '',
    id_art:  a.id      || '',
    cert,
    tipo_scatola: a.tipologia || 'LINEARE',
    dim:     a.dimensioni || '',
    tipo_cart: a.cartone   || '',
    gramm:   a.grammatura  || '',
    riciclo: a.codice_riciclo || 'PAP 21',
    nr_col:  '4',
    finitura: a.finitura || 'VERNICE LUCIDA',
    p1: a.pan_nr   || '', p2: a.pan_nr_2 || '', p3: a.pan_nr_3 || '',
    p4: a.pan_nr_4 || '', p5: a.pan_nr_5 || '', p6: a.pan_nr_6 || '',
    linear:   a.linear   || '80',
    polimero: a.polimero || '',
    cromalin: a.cromalin_nr || '',
    t1_terz: a.terzista    || '', t1_lav: a.lavorazione  || '',
    t1_pell: a.pellicola_nr || '', t1_cli: a.cliche_nr   || '',
    fu_nr:   a.fustella_nr || '',
    fu_resa: fustResa || '4',
    pulitore,
    pinza: 'NO', // si aggiorna dopo fetch fustella
    tassello: a.tassello || '',
    t2_terz: a.terzista_2   || '', t2_lav: a.lavorazione_2 || '',
    t2_pell: '', t2_cli: '',
    finest: a.ha_finestratura ? 'SI' : 'NO',
    bob:    a.h_finestratura || '',
    incoll: a.ha_incollatura ? 'SI' : 'NO',
    tipo_incoll:  a.tipologia_incollatura || '',
    mac:          a.macchina_incollatura  || '',
    terz_incoll:  '',
    scat:    a.scatolone || 'TERMO',
    qty:     a.quantita  || '',
    peso:    a.peso      || '',
    bancale: a.bancale   || 'EPAL',
    alt_ban: a.altezza_bancale || '',
  }
}

// ─── MAPPING: FormData → db_articoli UPDATE payload ──────────────────────────

function formToUpdate(d: FormData, imgUrl: string | null): Partial<DbArticolo> {
  return {
    linea:               d.lavoro   || null,
    tipologia:           d.tipo_scatola || null,
    dimensioni:          d.dim      || null,
    certificazione:      d.cert !== '-' ? d.cert : null,
    cartone:             d.tipo_cart || null,
    grammatura:          d.gramm    || null,
    codice_riciclo:      d.riciclo  || null,
    finitura:            d.finitura || null,
    pan_nr:   d.p1 || null, pan_nr_2: d.p2 || null, pan_nr_3: d.p3 || null,
    pan_nr_4: d.p4 || null, pan_nr_5: d.p5 || null, pan_nr_6: d.p6 || null,
    linear:              d.linear   || null,
    polimero:            d.polimero || null,
    cromalin_nr:         d.cromalin || null,
    terzista:            d.t1_terz  || null,
    lavorazione:         d.t1_lav   || null,
    pellicola_nr:        d.t1_pell  || null,
    cliche_nr:           d.t1_cli   || null,
    fustella_nr:         d.fu_nr    || null,
    pulitore_codice:     d.pulitore === 'SI' ? (d.fu_nr || 'SI') : null,
    tassello:            d.tassello || null,
    terzista_2:          d.t2_terz  || null,
    lavorazione_2:       d.t2_lav   || null,
    ha_finestratura:     d.finest === 'SI',
    h_finestratura:      d.bob      || null,
    ha_incollatura:      d.incoll === 'SI',
    tipologia_incollatura: d.tipo_incoll || null,
    macchina_incollatura:  d.mac        || null,
    scatolone:           d.scat     || null,
    quantita:            d.qty      || null,
    peso:                d.peso     || null,
    bancale:             d.bancale  || null,
    altezza_bancale:     d.alt_ban  || null,
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
  // title
  doc.setFillColor(...BLU_D); doc.rect(ML,y,UW,10,'F')
  doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.setTextColor(255,255,255)
  doc.text('SCHEDA TECNICA PRODOTTO', ML+3, y+7)
  doc.setFontSize(8); doc.text('ARTI GRAFICHE LOMBARDI S.r.l. — PASSIRANO (BS)', ML+UW-2, y+7, {align:'right'})
  y += 10

  // header row
  const cW = UW/3
  lbl(ML,y,20,HR,'Cliente:');         val(ML+20,y,cW-20,HR,d.cliente)
  lbl(ML+cW,y,18,HR,'Lavoro:');       val(ML+cW+18,y,cW-18,HR,d.lavoro)
  lbl(ML+cW*2,y,18,HR,'Codice:');     val(ML+cW*2+18,y,cW-18,HR,d.codice)
  y += HR
  lbl(ML,y,50,HR,'Certificazione richiesta'); val(ML+50,y,40,HR,d.cert)
  if (d.id_art) { lbl(ML+90,y,28,HR,'ID Articolo'); val(ML+118,y,UW-118,HR,d.id_art) }
  y += HR+2

  // image + info
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
  // production columns
  const pW=(UW-2)/2, rx=ML+pW+2
  let ly=y, ry=y
  ly = secH(ML,ly,pW,'TERZISTA (PRE-FUSTELLATURA)')
  ly = lv(ML,ly,pW,'Terzista',d.t1_terz,0.38)
  ly = lv(ML,ly,pW,'Lavorazioni',d.t1_lav,0.38)
  ly = lv(ML,ly,pW,'Pellicola Nr.',d.t1_pell,0.38)
  ly = lv(ML,ly,pW,'Clichè Nr.',d.t1_cli,0.38)
  ly += 1
  ly = secH(ML,ly,pW,'TERZISTA (POST-FUSTELLATURA)')
  ly = lv(ML,ly,pW,'Terzista',d.t2_terz,0.38)
  ly = lv(ML,ly,pW,'Lavorazioni',d.t2_lav,0.38)
  ly = lv(ML,ly,pW,'Pellicola Nr.',d.t2_pell,0.38)
  ly = lv(ML,ly,pW,'Clichè Nr.',d.t2_cli,0.38)
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
  const [query, setQuery]           = useState('')
  const [results, setResults]       = useState<ArticoloSearch[]>([])
  const [selected, setSelected]     = useState<DbArticolo | null>(null)
  const [form, setForm]             = useState<FormData>(EMPTY)
  const [imgUrl, setImgUrl]         = useState<string | null>(null)
  const [sec, setSec]               = useState(1)
  const [saving, setSaving]         = useState(false)
  const [generating, setGenerating] = useState(false)
  const [toast, setToast]           = useState<{msg:string; type:'ok'|'err'} | null>(null)
  const searchRef                   = useRef<HTMLDivElement>(null)

  const showToast = (msg:string, type:'ok'|'err'='ok') => {
    setToast({msg, type})
    setTimeout(()=>setToast(null), 2800)
  }

  const set = (k: keyof FormData, v: string) =>
    setForm(f => ({...f, [k]: v}))

  // ── Ricerca articoli ─────────────────────────────────────────────────────
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

  // ── Carica articolo completo ─────────────────────────────────────────────
  const loadArticolo = async (id: string) => {
    const { data: a, error } = await supabase
      .from('db_articoli')
      .select('*')
      .eq('id', id)
      .single()
    if (error || !a) { showToast('Errore caricamento articolo', 'err'); return }

    let fustResa = '4'
    if (a.fustella_nr) {
      const { data: fu } = await supabase
        .from('fustelle')
        .select('resa, pinza_tagliata')
        .eq('codice', a.fustella_nr)
        .single()
      if (fu) {
        fustResa = fu.resa || '4'
      }
    }

    setSelected(a as DbArticolo)
    setForm(articoloToForm(a as DbArticolo, fustResa))
    if (a.immagine_scheda_url) setImgUrl(a.immagine_scheda_url)
    setResults([])
    setQuery('')
    setSec(1)
    showToast(`Articolo "${a.codice}" caricato`)
  }

  // ── Upload immagine da PDF ───────────────────────────────────────────────
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
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
      setImgUrl(dataUrl)
      showToast('Immagine estratta ✓')
    } catch (e) {
      showToast('Errore estrazione PDF', 'err')
    }
  }

  // ── Salva nel gestionale ─────────────────────────────────────────────────
  const save = async () => {
    if (!selected) { showToast('Seleziona prima un articolo', 'err'); return }
    setSaving(true)
    try {
      let storedImgUrl = imgUrl

      // Upload immagine su Storage se è una data URL (non già un URL Supabase)
      if (imgUrl?.startsWith('data:')) {
        const blob = await (await fetch(imgUrl)).blob()
        const path = `${selected.id}/immagine.jpg`
        const { error: upErr } = await supabase.storage
          .from('schede-tecniche')
          .upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
        if (!upErr) {
          const { data: urlData } = supabase.storage
            .from('schede-tecniche')
            .getPublicUrl(path)
          storedImgUrl = urlData.publicUrl
          setImgUrl(storedImgUrl)
        }
      }

      const payload = formToUpdate(form, storedImgUrl)
      const { error } = await supabase
        .from('db_articoli')
        .update(payload)
        .eq('id', selected.id)

      if (error) throw error
      showToast('Scheda salvata nel gestionale ✓')
    } catch (e: any) {
      showToast('Errore salvataggio: ' + e.message, 'err')
    }
    setSaving(false)
  }

  // ── Genera PDF ───────────────────────────────────────────────────────────
  const genPDF = async () => {
    setGenerating(true)
    await new Promise(r => setTimeout(r, 50)) // allow re-render
    buildPDF(form, imgUrl)
    setGenerating(false)
    showToast('PDF scaricato ✓')
  }

  // ── Field helpers ────────────────────────────────────────────────────────
  const inp = (k: keyof FormData, type='text') => (
    <input
      type={type}
      value={form[k]}
      onChange={e => set(k, e.target.value)}
      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-2.5 py-1.5 text-sm
                 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
    />
  )
  const sel = (k: keyof FormData, opts: string[]) => (
    <select
      value={form[k]}
      onChange={e => set(k, e.target.value)}
      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-2.5 py-1.5 text-sm
                 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
    >
      {opts.map(o => <option key={o} value={o}>{o || '—'}</option>)}
    </select>
  )
  const F = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  )
  const SH = ({ title }: { title: string }) => (
    <div className="col-span-full border-l-4 border-blue-500 pl-3 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-r-md mb-1">
      <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider">{title}</span>
    </div>
  )

  // ── Section content ──────────────────────────────────────────────────────
  const sections: React.ReactNode[] = [
    // 0: Immagine
    <div className="flex flex-col gap-4">
      <SH title="Immagine prodotto" />
      <p className="text-sm text-gray-500">Carica il PDF del prodotto. La prima pagina verrà estratta come immagine nella scheda tecnica.</p>
      <label className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-3 cursor-pointer transition-colors
        ${imgUrl ? 'border-green-400 bg-green-50 dark:bg-green-900/10' : 'border-gray-300 hover:border-blue-400 dark:border-gray-600'}`}>
        {imgUrl
          ? <img src={imgUrl} alt="anteprima prodotto" className="max-h-48 rounded-lg object-contain" />
          : <><div className="text-4xl text-gray-300">📄</div>
              <span className="text-sm text-gray-500">Clicca per caricare il PDF del prodotto</span></>
        }
        <input type="file" accept=".pdf" className="hidden"
          onChange={e => e.target.files?.[0] && handlePDF(e.target.files[0])} />
      </label>
      {imgUrl && (
        <button onClick={() => setImgUrl(null)}
          className="text-sm text-red-500 hover:text-red-700 self-start">
          Rimuovi immagine
        </button>
      )}
    </div>,

    // 1: Intestazione
    <div className="grid grid-cols-2 gap-4">
      <SH title="Identificazione" />
      <F label="Cliente">{inp('cliente')}</F>
      <F label="Codice">{inp('codice')}</F>
      <F label="Lavoro (Linea)">{inp('lavoro')}</F>
      <F label="ID Articolo">{inp('id_art')}</F>
      <F label="Certificazione">{sel('cert', OPTS.cert)}</F>
    </div>,

    // 2: Packaging
    <div className="grid grid-cols-2 gap-4">
      <SH title="Informazioni Packaging" />
      <F label="Tipologia di scatole">{sel('tipo_scatola', OPTS.tipoScatola)}</F>
      <F label="Dimensioni (mm)">{inp('dim')}</F>
      <SH title="Cartone" />
      <F label="Tipologia di cartone">{inp('tipo_cart')}</F>
      <F label="Grammatura (gr)">{inp('gramm', 'number')}</F>
      <F label="Codice Riciclo">{inp('riciclo')}</F>
    </div>,

    // 3: Stampa
    <div className="grid grid-cols-2 gap-4">
      <SH title="Informazioni Stampa" />
      <F label="Nr. Colori">{inp('nr_col', 'number')}</F>
      <F label="Finitura">{sel('finitura', OPTS.finitura)}</F>
      <div className="col-span-full">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-2">Pantoni</label>
        <div className="grid grid-cols-3 gap-2">
          {(['p1','p2','p3','p4','p5','p6'] as (keyof FormData)[]).map((p,i) => (
            <F key={p} label={`Pantone ${i+1}`}>{inp(p)}</F>
          ))}
        </div>
      </div>
      <F label="Linearizzazione (%)">{inp('linear', 'number')}</F>
      <F label="Nr. Polimero">{inp('polimero')}</F>
      <F label="Cromalin Nr.">{inp('cromalin')}</F>
    </div>,

    // 4: Terzista pre
    <div className="grid grid-cols-2 gap-4">
      <SH title="Terzista (prima della fustellatura)" />
      <F label="Terzista">{inp('t1_terz')}</F>
      <F label="Lavorazioni">{sel('t1_lav', OPTS.lav)}</F>
      <F label="Pellicola Nr.">{inp('t1_pell')}</F>
      <F label="Clichè Nr.">{inp('t1_cli')}</F>
    </div>,

    // 5: Fustella
    <div className="grid grid-cols-2 gap-4">
      <SH title="Fustella" />
      <F label="Numero Fustella">{inp('fu_nr')}</F>
      <F label="Resa Fustella">{inp('fu_resa', 'number')}</F>
      <F label="Pulitore">{sel('pulitore', OPTS.siNo)}</F>
      <F label="Pinza taglia">{sel('pinza', OPTS.siNo)}</F>
      <F label="Tassello Nr.">{inp('tassello')}</F>
    </div>,

    // 6: Terzista post
    <div className="grid grid-cols-2 gap-4">
      <SH title="Terzista (dopo la fustellatura)" />
      <F label="Terzista">{inp('t2_terz')}</F>
      <F label="Lavorazioni">{sel('t2_lav', OPTS.lav)}</F>
      <F label="Pellicola Nr.">{inp('t2_pell')}</F>
      <F label="Clichè Nr.">{inp('t2_cli')}</F>
    </div>,

    // 7: Finestratura + Incollatura
    <div className="grid grid-cols-2 gap-4">
      <SH title="Finestratura" />
      <F label="Finestratura">{sel('finest', OPTS.siNo)}</F>
      <F label="Altezza bobina">{inp('bob')}</F>
      <SH title="Incollatura" />
      <F label="Incollatura">{sel('incoll', OPTS.siNo)}</F>
      <F label="Tipologia di incollatura">{inp('tipo_incoll')}</F>
      <F label="Macchina">{sel('mac', OPTS.mac)}</F>
      <F label="Eventuale terzista">{inp('terz_incoll')}</F>
    </div>,

    // 8: Confezione
    <div className="grid grid-cols-2 gap-4">
      <SH title="Confezione" />
      <F label="Scatolone usato">{sel('scat', OPTS.scatolone)}</F>
      <F label="Bancale">{sel('bancale', OPTS.bancale)}</F>
      <F label="Quantità (pz)">{inp('qty', 'number')}</F>
      <F label="Peso (kg)">{inp('peso', 'number')}</F>
      <F label="Altezza massima bancale">{inp('alt_ban')}</F>
    </div>,
  ]

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-sm">📋</div>
          <div>
            <h1 className="text-sm font-semibold text-gray-900 dark:text-white">Scheda Tecnica</h1>
            <p className="text-xs text-gray-500">{selected ? `${selected.cliente} — ${selected.codice}` : 'Cerca o crea una scheda'}</p>
          </div>
        </div>

        {/* Ricerca articolo */}
        <div className="relative flex-1 max-w-sm" ref={searchRef}>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Cerca articolo per ID, codice o cliente…"
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {results.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
              {results.map(r => (
                <button
                  key={r.id}
                  onClick={() => loadArticolo(r.id)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-0"
                >
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{r.codice}</div>
                  <div className="text-xs text-gray-500">{r.cliente} · {r.linea}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => { setSelected(null); setForm(EMPTY); setImgUrl(null); setSec(1); setQuery('') }}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            Nuova
          </button>
          <button
            onClick={save}
            disabled={saving || !selected}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-40 dark:text-gray-300"
          >
            {saving ? 'Salvo…' : '💾 Salva'}
          </button>
          <button
            onClick={genPDF}
            disabled={generating}
            className="px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-40"
          >
            {generating ? 'Generando…' : '⬇ Scarica PDF'}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Sidebar */}
        <nav className="w-36 flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col gap-1 p-2 overflow-y-auto">
          {NAVS.map(n => (
            <button
              key={n.id}
              onClick={() => setSec(n.id)}
              className={`text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors
                ${sec === n.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            >
              {n.label}
            </button>
          ))}
        </nav>

        {/* Form */}
        <main className="flex-1 overflow-y-auto p-4">
          {/* Anteprima chips */}
          {(form.cliente || form.codice) && (
            <div className="flex flex-wrap gap-2 mb-4">
              {[form.cliente, form.codice, form.tipo_scatola, form.finitura, form.fu_nr].filter(Boolean).map(v => (
                <span key={v} className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                  {v}
                </span>
              ))}
            </div>
          )}
          {sections[sec]}
        </main>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-5 right-5 px-4 py-2.5 rounded-lg text-sm font-medium shadow-lg z-50 transition-all
          ${toast.type === 'ok' ? 'bg-gray-900 text-white' : 'bg-red-600 text-white'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
