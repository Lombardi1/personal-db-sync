import ExcelJS from 'exceljs';
import { Articolo, LavoroStampa } from '@/types/produzione';
import { Cartone } from '@/types';
import { supabase } from '@/lib/supabase';

// ============================================================
// UTILITIES PER TEMPLATE EXCEL
// ============================================================

/**
 * Carica un template Excel dalla cartella public/templates/
 */
async function loadTemplate(templateName: string): Promise<ExcelJS.Workbook> {
  const response = await fetch(`/templates/${templateName}`);
  if (!response.ok) {
    throw new Error(`Impossibile caricare il template: ${templateName}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);
  return workbook;
}

/**
 * Scarica un workbook Excel come file sul dispositivo
 */
async function downloadWorkbook(workbook: ExcelJS.Workbook, fileName: string): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================
// GENERA SCHEDA PRODUZIONE
//
// Il template (template_scheda.xlsx) è la scheda reale usata in
// produzione. Molte celle contengono formule VLOOKUP verso file Excel
// esterni (Lista, Clienti, Giacenza_Articoli, DB_Giacenza,
// Giacenza_Fustelle) che non sono disponibili in questo ambiente.
// Per questo motivo, invece di affidarci a quelle formule, scriviamo
// direttamente i valori finali nelle stesse celle, prendendoli dal
// nostro database (db_articoli, giacenza, fustelle).
//
// Sezioni volutamente NON compilate (restano da riempire a mano in
// produzione): checklist igieniche/firme, quantità fogli stampati
// giorno per giorno, pesi/colli di trasporto, dati di prestampa
// (lastre/pinza/squadra) che dipendono dall'operatore.
// ============================================================
export const generaSchedaProduzione = async (
  lotto: LavoroStampa,
  articoli: Articolo[],
  cartone: Cartone | null
): Promise<string> => {
  const wb = await loadTemplate('template_scheda.xlsx');
  const ws = wb.getWorksheet('Scheda');

  if (!ws) {
    throw new Error('Foglio "Scheda" non trovato nel template');
  }

  const primo = articoli[0] as (Articolo & Record<string, any>) | undefined;

  // ── Intestazione lotto ──
  ws.getCell('AQ3').value = lotto.lotto;
  ws.getCell('AQ4').value = lotto.cliente || '';
  ws.getCell('BA3').value = lotto.data ? new Date(lotto.data) : new Date();
  ws.getCell('BE4').value = lotto.lavoro || '';
  ws.getCell('BI3').value = lotto.ordine_nr || '';
  if (lotto.data_ordine) ws.getCell('BR3').value = new Date(lotto.data_ordine);
  ws.getCell('BR4').value = primo?.certificazione ? 'SI' : 'NO';
  ws.getCell('AB9').value = lotto.cliente || '';

  // ── Cartone selezionato dal Magazzino Cartoni ──
  if (cartone) {
    ws.getCell('AQ9').value = cartone.codice || '';
    ws.getCell('AP10').value = cartone.fornitore || '';
    ws.getCell('AX10').value = cartone.ordine || '';
    ws.getCell('BE10').value = cartone.ddt || '';
    ws.getCell('BO10').value = cartone.tipologia || '';
    ws.getCell('AP11').value = cartone.formato || '';
    ws.getCell('AY11').value = cartone.grammatura || '';
  }

  // ── Colori / Pantoni / Polimero / Finitura (dal primo articolo selezionato) ──
  if (primo) {
    ws.getCell('AP46').value = primo.c || '';
    ws.getCell('AQ46').value = primo.m || '';
    ws.getCell('AR46').value = primo.y || '';
    ws.getCell('AS46').value = primo.k || '';
    ws.getCell('AW46').value = primo.pan_nr || '';
    ws.getCell('AZ46').value = primo.pan_nr_2 || '';
    ws.getCell('BC46').value = primo.pan_nr_3 || '';
    ws.getCell('BF46').value = primo.pan_nr_4 || '';
    ws.getCell('BI46').value = primo.pan_nr_5 || '';
    ws.getCell('BL46').value = primo.pan_nr_6 || '';
    ws.getCell('AP47').value = primo.polimero || '';
    ws.getCell('AW47').value = primo.finitura || '';
    ws.getCell('AW50').value = primo.linear || '';

    // Finestratura
    ws.getCell('M112').value = primo.h_finestratura || 0;

    // Fustella (dettagli dalla tabella fustelle collegata all'articolo)
    if (primo.fustella_nr) {
      const { data: fu } = await supabase
        .from('fustelle')
        .select('fustellatrice, pulitore_codice, pinza_tagliata')
        .eq('codice', primo.fustella_nr)
        .maybeSingle();

      ws.getCell('F105').value = primo.fustella_nr;
      ws.getCell('M105').value = fu?.fustellatrice || '';
      ws.getCell('T105').value = fu?.pulitore_codice || '';
      ws.getCell('Z105').value = fu?.pinza_tagliata ? 'SI' : 'NO';
    }
    ws.getCell('AI105').value = primo.tassello || '';
  }

  // ── Elenco articoli selezionati (riferimento) ──
  const startRow = 6;
  articoli.forEach((articolo, index) => {
    if (index < 34) {
      ws.getCell(`BV${startRow + index}`).value = articolo.id;
    }
  });

  // Genera nome file e scarica
  const dataOggi = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const fileName = `Scheda_Lotto_${lotto.lotto}_${dataOggi}.xlsx`;
  await downloadWorkbook(wb, fileName);

  return fileName;
};

// ============================================================
// GENERA ETICHETTE
// Per ogni articolo, apre il template template_etichette.xlsx
// e compila le celle dei 5 fogli:
//   1) Etichetta - Etichetta principale prodotto
//   2) Cartello - Etichetta bancale/scatolone
//   3) Codice - Solo codice prodotto
//   4) Pasta Lensi - Formato specifico cliente
//   5) Etichetta campioni - Per campioni
// Posizioni celle replica fedelmente lo script Python originale.
// ============================================================
export const generaEtichette = async (
  lotto: LavoroStampa,
  articoli: Articolo[],
  cassetto: string
): Promise<string[]> => {
  const fileGenerati: string[] = [];
  const fornitore = 'Arti Grafiche Lombardi';
  const dataLotto = lotto.data ? new Date(lotto.data) : null;
  const dataOrdine = lotto.data_ordine ? new Date(lotto.data_ordine) : null;

  for (const articolo of articoli) {
    const wb = await loadTemplate('template_etichette.xlsx');

    // ---- FOGLIO 1: ETICHETTA (principale) ----
    // Template: B1-B8 = etichette, H1-H8 = valori
    // B11 = "CASSETTO", G11 = valore cassetto
    // A13 = "Lotto:", E13 = lotto, A14 = "Articolo:", E14 = id
    const wsEtichetta = wb.getWorksheet('Etichetta');
    if (wsEtichetta) {
      wsEtichetta.getCell('H1').value = lotto.cliente || '';
      wsEtichetta.getCell('H2').value = fornitore;
      wsEtichetta.getCell('H3').value = articolo.codice || '';
      wsEtichetta.getCell('H4').value = articolo.descrizione || '';
      wsEtichetta.getCell('H5').value = lotto.ordine_nr || '';
      wsEtichetta.getCell('H6').value = dataLotto;
      wsEtichetta.getCell('H7').value = lotto.lotto;
      wsEtichetta.getCell('H8').value = lotto.quantita;
      wsEtichetta.getCell('G11').value = cassetto;
      wsEtichetta.getCell('E13').value = lotto.lotto;
      wsEtichetta.getCell('E14').value = articolo.id;
    }

    // ---- FOGLIO 2: CARTELLO (bancale/scatolone) ----
    // A1=cliente, A3=label, A4=fornitore, A5=label, A6=codice
    // A7=label, C7=label, E7=label, A8=ordine, C8=data_ordine, E8=lotto
    // A9=label, A10=descrizione, A11-E11=labels, A12=quantita
    const wsCartello = wb.getWorksheet('Cartello');
    if (wsCartello) {
      wsCartello.getCell('A1').value = lotto.cliente || '';
      wsCartello.getCell('A4').value = fornitore;
      wsCartello.getCell('A6').value = articolo.codice || '';
      wsCartello.getCell('A8').value = lotto.ordine_nr || '';
      wsCartello.getCell('C8').value = dataOrdine;
      wsCartello.getCell('E8').value = lotto.lotto;
      wsCartello.getCell('A10').value = articolo.descrizione || '';
      wsCartello.getCell('A12').value = lotto.quantita;
    }

    // ---- FOGLIO 3: CODICE ----
    // A13 = codice articolo
    const wsCodice = wb.getWorksheet('Codice');
    if (wsCodice) {
      wsCodice.getCell('A13').value = articolo.codice || '';
    }

    // ---- FOGLIO 4: PASTA LENSI ----
    // A1-A9 = etichette, B1-B8 = valori, C7/C8 = labels, D8 = data
    const wsPastaLensi = wb.getWorksheet('Pasta Lensi');
    if (wsPastaLensi) {
      wsPastaLensi.getCell('B1').value = lotto.cliente || '';
      wsPastaLensi.getCell('B2').value = fornitore;
      wsPastaLensi.getCell('B3').value = articolo.descrizione || '';
      wsPastaLensi.getCell('B4').value = articolo.codice || '';
      wsPastaLensi.getCell('B5').value = lotto.lotto;
      wsPastaLensi.getCell('B6').value = lotto.quantita;
      wsPastaLensi.getCell('B8').value = lotto.ordine_nr || '';
      wsPastaLensi.getCell('D8').value = dataLotto;
    }

    // ---- FOGLIO 5: ETICHETTA CAMPIONI ----
    // B1-B5 = etichette, H1-H5 = valori, M4 = "Data:", P4 = data
    // A6 = "CASSETTO", N6 = cassetto
    const wsCampioni = wb.getWorksheet('Etichetta campioni');
    if (wsCampioni) {
      wsCampioni.getCell('H1').value = lotto.cliente || '';
      wsCampioni.getCell('H2').value = articolo.codice || '';
      wsCampioni.getCell('H3').value = articolo.descrizione || '';
      wsCampioni.getCell('H4').value = lotto.ordine_nr || '';
      wsCampioni.getCell('P4').value = dataLotto;
      wsCampioni.getCell('H5').value = lotto.lotto;
      wsCampioni.getCell('N6').value = cassetto;
    }

    // Salva il file
    const codiceFile = (articolo.codice || articolo.id).replace(/\//g, '_');
    const fileName = `Etichette_${codiceFile}_Lotto_${lotto.lotto}.xlsx`;
    await downloadWorkbook(wb, fileName);
    fileGenerati.push(fileName);
  }

  return fileGenerati;
};

// ============================================================
// GENERA TUTTO (Scheda + Etichette)
// ============================================================
export const generaTutto = async (
  lotto: LavoroStampa,
  articoli: Articolo[],
  cartone: Cartone | null,
  cassetto: string
): Promise<{ schedaFile: string; etichettaFiles: string[] }> => {
  const schedaFile = await generaSchedaProduzione(lotto, articoli, cartone);
  const etichettaFiles = await generaEtichette(lotto, articoli, cassetto);
  return { schedaFile, etichettaFiles };
};
