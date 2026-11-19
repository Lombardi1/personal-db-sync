import * as XLSX from 'xlsx';
import JSZip from 'jszip';

// Lettura dei file Excel aziendali (DB_Lavori_Stampa.xlsx, DB_Articoli.xlsm) nel formato atteso dalla
// funzione "sync-excel". Stessa mappatura del programma automatico che gira sul PC/Synology.

export type TabellaExcel = 'lavori' | 'articoli';
type Tipo = 't' | 'i' | 'n' | 'd' | 'dt'; // testo, intero, decimale, data, data-o-testo
type Colonna = [campo: string, intestazione: string, tipo: Tipo];

const ARTICOLI: Colonna[] = [
  ['id', 'ID', 't'], ['nr', 'NR.', 'i'], ['acronimo', 'ACRONIMO', 't'], ['cliente', 'CLIENTE', 't'],
  ['linea', 'LINEA', 't'], ['tipologia', 'TIPOLOGIA', 't'], ['codice', 'CODICE', 't'],
  ['descrizione', 'DESCRIZIONE', 't'], ['certificazione', 'CERTIFICAZIONE', 't'], ['cartone', 'CARTONE', 't'],
  ['grammatura', 'GRAMMATURA', 't'], ['c', 'C', 't'], ['m', 'M', 't'], ['y', 'Y', 't'], ['k', 'K', 't'],
  ['pan_nr', 'PAN.NR.', 't'], ['pan_nr_2', 'PAN.NR.2', 't'], ['pan_nr_3', 'PAN.NR.3', 't'],
  ['pan_nr_4', 'PAN.NR.4', 't'], ['pan_nr_5', 'PAN.NR.5', 't'], ['pan_nr_6', 'PAN.NR.6', 't'],
  ['polimero', 'POLIMERO', 't'], ['linear', 'LINEAR.', 't'], ['finitura', 'FINITURA', 't'], ['uv', 'UV', 't'],
  ['polimero_uv', 'POLIMERO UV', 't'], ['terzista', 'TERZISTA', 't'], ['lavorazione', 'LAVORAZIONE', 't'],
  ['terzista_2', 'TERZISTA 2', 't'], ['lavorazione_2', 'LAVORAZIONE 2', 't'], ['cliche_nr', "CLICHE' NR.", 't'],
  ['pellicola_nr', 'PELLICOLA NR.', 't'], ['fustella_nr', 'FUSTELLA NR.', 't'], ['tassello', 'TASSELLO', 't'],
  ['finestratura', 'FINESTRATURA', 't'], ['h_finestratura', 'H FINESTRATURA', 't'],
  ['incollatura', 'INCOLLATURA', 't'], ['tipologia_incollatura', 'TIPOLOGIA INCOLLATURA', 't'],
  ['scatolone', 'SCATOLONE', 't'], ['quantita', "QUANTITA'", 't'], ['peso', 'PESO', 't'],
  ['archivio', 'ARCHIVIO', 't'], ['nr_archivio', 'NR ARCHIVIO', 't'],
];

const LAVORI: Colonna[] = [
  ['lotto', 'LOTTO', 'i'], ['cg', 'CG', 't'], ['mont', 'MONT', 't'], ['cliente', 'CLIENTE', 't'],
  ['lavoro', 'LAVORO', 't'], ['identificativo', 'IDENTIFICATIVO', 't'], ['ordine_nr', 'ORDINE NR.', 't'],
  ['data_ordine', 'DATA ORDINE', 'dt'], ['formato', 'FORMATO', 't'], ['quantita', "QUANTITA'", 'i'],
  ['fogli', 'FOGLI', 't'], ['fogli_m', 'FOGLI M.', 't'], ['data', 'DATA', 'd'], ['note', 'NOTE', 't'],
  ['cartone', 'CARTONE', 't'], ['taglio', 'TAGLIO', 't'], ['colori', 'COLORI', 't'], ['finitura', 'FINITURA', 't'],
  ['polimero', 'POLIMERO', 't'], ['fustella', 'FUSTELLA', 't'], ['pinza_tg', 'PINZA TG', 't'],
  ['pvc', 'PVC', 't'], ['inc', 'INC.', 't'], ['stampato', 'STAMPATO', 't'], ['parzialmente', 'PARZIALMENTE', 't'],
  ['parz_conf', 'PARZ. CONF', 't'], ['conf', 'CONF.', 't'], ['mag', 'MAG', 't'], ['cons', 'CONS.', 't'],
  ['q_x_mod', 'Q X MOD', 'n'], ['quantita_scatoloni', 'QUANTITA SCATOLONI SCATOLONI', 'n'],
  ['scatoloni_usati', 'SCATOLONI USATI', 'n'], ['tipologia_scatolone', 'TIPOLOGIA SCATOLONE', 't'],
];
const LAVORI_OBBLIGATORI = ['lotto', 'cliente', 'lavoro', 'quantita', 'data'];

const CONFIG: Record<TabellaExcel, { foglio: string; rigaIntestazione: number; colonne: Colonna[]; avvisaSaltate: boolean }> = {
  lavori: { foglio: 'Lista', rigaIntestazione: 1, colonne: LAVORI, avvisaSaltate: true },
  articoli: { foglio: 'DB_Articoli', rigaIntestazione: 2, colonne: ARTICOLI, avvisaSaltate: false },
};

const MAX_RIGHE_LETTE = 40000; // limite di sicurezza (il foglio DB_Articoli ha ~100.000 righe vuote formattate)
const MAX_VUOTE_DI_FILA = 200;

function normHeader(v: unknown): string {
  if (v === null || v === undefined) return '';
  let s = String(v).toUpperCase().trim();
  const sost: [string, string][] = [['À', 'A'], ['È', 'E'], ['É', 'E'], ['Ì', 'I'], ['Ò', 'O'], ['Ù', 'U'], ['’', "'"], ['`', "'"], ['´', "'"]];
  for (const [a, b] of sost) s = s.split(a).join(b);
  s = s.split("QUANTITA'").join('QUANTITA');
  return s.split(/\s+/).filter(Boolean).join(' ');
}

function fmtNum(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return String(Number(n.toPrecision(10)));
}

function serialeInData(n: number): string {
  const ms = Date.UTC(1899, 11, 30) + Math.floor(n) * 86400000;
  return new Date(ms).toISOString().slice(0, 10);
}

function testoInData(s: string): string | null {
  const t = s.trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T].*)?$/.exec(t);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4}|\d{2})$/.exec(t);
  if (m) {
    const anno = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${anno}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  return null;
}

class ErroreValore extends Error {}

// La libreria Excel interpreta "_X2D35_" come un carattere codificato, ma Excel codifica solo "_x....": quella
// sequenza in maiuscolo e testo normale (succede in alcuni ID). La proteggo prima della lettura.
const SEQUENZA_MAIUSCOLA = /_X([0-9A-Fa-f]{4})_/g;
async function proteggiSequenze(buf: ArrayBuffer): Promise<ArrayBuffer | Uint8Array> {
  const zip = await JSZip.loadAsync(buf);
  let cambiato = false;
  for (const nome of Object.keys(zip.files)) {
    if (!/^xl\/(worksheets\/[^/]+|sharedStrings)\.xml$/.test(nome)) continue;
    const testo = await zip.file(nome)!.async('string');
    SEQUENZA_MAIUSCOLA.lastIndex = 0;
    if (!SEQUENZA_MAIUSCOLA.test(testo)) continue;
    SEQUENZA_MAIUSCOLA.lastIndex = 0;
    zip.file(nome, testo.replace(SEQUENZA_MAIUSCOLA, '_x005F_X$1_'));
    cambiato = true;
  }
  return cambiato ? zip.generateAsync({ type: 'uint8array', compression: 'STORE' }) : buf;
}

function valoreCella(cella: XLSX.CellObject | undefined, tipo: Tipo): string | number | null {
  if (!cella || cella.v === undefined || cella.v === null) return null;
  if (cella.t === 'e') return null; // errore di Excel (#DIV/0!, #N/A...): come cella vuota
  let v: unknown = cella.v;
  if (typeof v === 'string' && v.trim() === '') return null;
  const eData = cella.t === 'n' && typeof cella.z === 'string' && XLSX.SSF.is_date(cella.z);
  if (cella.t === 'd' && v instanceof Date) v = serialeInData(Math.round(v.getTime() / 86400000) + 25569);

  switch (tipo) {
    case 't':
      if (eData && typeof v === 'number') return serialeInData(v);
      if (typeof v === 'number') return fmtNum(v);
      if (typeof v === 'boolean') return v ? '1' : '0';
      return String(v);
    case 'i': {
      if (typeof v === 'number') return Math.round(v);
      const n = parseFloat(String(v).trim().replace(',', '.'));
      if (Number.isNaN(n)) throw new ErroreValore(`non e un numero intero: ${String(v)}`);
      return Math.round(n);
    }
    case 'n': {
      if (typeof v === 'number') return v;
      const n = parseFloat(String(v).trim().replace(',', '.'));
      return Number.isNaN(n) ? null : n;
    }
    case 'd':
    case 'dt': {
      if (typeof v === 'number') {
        if (eData) return serialeInData(v);
        if (tipo === 'dt') return fmtNum(v);
        throw new ErroreValore(`data non riconosciuta: ${String(v)}`);
      }
      const d = testoInData(String(v));
      if (d) return d;
      if (tipo === 'dt') return String(v).trim();
      throw new ErroreValore(`data non riconosciuta: ${String(v)}`);
    }
  }
}

export interface RisultatoLettura {
  righe: Record<string, string | number>[];
  avvisi: string[];
}

export async function leggiExcel(file: File, tabella: TabellaExcel): Promise<RisultatoLettura> {
  const cfg = CONFIG[tabella];
  const buf = await file.arrayBuffer();
  let wb: XLSX.WorkBook;
  try {
    const dati = await proteggiSequenze(buf);
    wb = XLSX.read(dati, { type: 'array', sheets: cfg.foglio, sheetRows: MAX_RIGHE_LETTE, cellNF: true, cellDates: false });
  } catch {
    throw new Error('Non riesco ad aprire il file: e davvero un Excel (.xlsx / .xlsm)?');
  }
  const ws = wb.Sheets[cfg.foglio];
  if (!ws || !ws['!ref']) {
    throw new Error(`Nel file non trovo il foglio "${cfg.foglio}". Hai scelto il file giusto?`);
  }
  const range = XLSX.utils.decode_range(ws['!ref']);
  const r0 = cfg.rigaIntestazione - 1;

  const colPerIntestazione = new Map<string, number>();
  for (let c = range.s.c; c <= range.e.c; c++) {
    const k = normHeader(ws[XLSX.utils.encode_cell({ r: r0, c })]?.v);
    if (k && !colPerIntestazione.has(k)) colPerIntestazione.set(k, c);
  }
  const pos: Record<string, number> = {};
  const mancanti: string[] = [];
  for (const [campo, intest] of cfg.colonne) {
    const c = colPerIntestazione.get(normHeader(intest));
    if (c === undefined) mancanti.push(intest);
    else pos[campo] = c;
  }
  if (mancanti.length) {
    throw new Error(`Nel foglio "${cfg.foglio}" non trovo le colonne: ${mancanti.join(', ')}. Hai scelto il file giusto?`);
  }

  const righe: Record<string, string | number>[] = [];
  const avvisi: string[] = [];
  let vuoteDiFila = 0;
  for (let r = r0 + 1; r <= range.e.r; r++) {
    const riga: Record<string, string | number | null> = {};
    let vuota = true;
    for (const [campo, intest, tipo] of cfg.colonne) {
      const cella = ws[XLSX.utils.encode_cell({ r, c: pos[campo] })] as XLSX.CellObject | undefined;
      try {
        riga[campo] = valoreCella(cella, tipo);
        if (riga[campo] !== null) vuota = false;
      } catch (e) {
        riga[campo] = null;
        vuota = false;
        avvisi.push(`riga ${r + 1}, colonna ${intest}: ${(e as Error).message}`);
      }
    }
    const valida = tabella === 'articoli'
      ? !!riga.id
      : LAVORI_OBBLIGATORI.every((k) => riga[k] !== null && riga[k] !== '');
    if (vuota || !valida) {
      vuoteDiFila++;
      if (!vuota && cfg.avvisaSaltate) avvisi.push(`riga ${r + 1} saltata: manca un dato obbligatorio`);
      if (vuoteDiFila >= MAX_VUOTE_DI_FILA) break;
      continue;
    }
    vuoteDiFila = 0;
    if (tabella === 'articoli' && riga.codice === null) riga.codice = ''; // nel gestionale il codice non puo essere vuoto
    // i campi vuoti non si inviano: la funzione li considera vuoti
    const pulita: Record<string, string | number> = {};
    for (const [k, val] of Object.entries(riga)) if (val !== null) pulita[k] = val;
    righe.push(pulita);
  }

  if (tabella === 'articoli') {
    const visti = new Set<string>();
    for (const r of righe) {
      const id = String(r.id);
      if (visti.has(id)) throw new Error(`ID duplicato nel file (${id}): correggi l'Excel e riprova.`);
      visti.add(id);
    }
  }
  return { righe, avvisi };
}
