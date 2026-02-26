import ExcelJS from 'exceljs';
import { Articolo, LavoroStampa } from '@/types/produzione';

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
// Apre il template template_scheda.xlsx e compila:
//   - AQ3: Numero Lotto
//   - AQ4: Cliente
//   - BA3: Data
//   - BE4: Lavoro
//   - BV6-BV13: ID Articoli
// Replica fedelmente genera_documenti_integrato.py
// ============================================================
export const generaSchedaProduzione = async (
  lotto: LavoroStampa,
  articoli: Articolo[],
  cassetto: string,
  note: string
): Promise<string> => {
  const wb = await loadTemplate('template_scheda.xlsx');
  const ws = wb.getWorksheet('Scheda');

  if (!ws) {
    throw new Error('Foglio "Scheda" non trovato nel template');
  }

  // Scrivi numero lotto (F2 usa formula =AQ3)
  ws.getCell('AQ3').value = lotto.lotto;

  // Scrivi cliente (F3 usa formula =AQ4)
  ws.getCell('AQ4').value = lotto.cliente || '';

  // Scrivi data (P2 usa formula =BA3)
  ws.getCell('BA3').value = lotto.data ? new Date(lotto.data) : new Date();

  // Scrivi lavoro (T3 usa formula =BE4)
  ws.getCell('BE4').value = lotto.lavoro || '';

  // Scrivi ID articoli in BV6-BV13 (max 8 articoli)
  const startRow = 6;
  articoli.forEach((articolo, index) => {
    if (index < 8) {
      ws.getCell(`BV${startRow + index}`).value = articolo.id;
    }
  });

  // Pulisci righe articoli non usate
  for (let i = articoli.length; i < 8; i++) {
    ws.getCell(`BV${startRow + i}`).value = null;
  }

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
  cassetto: string,
  note: string
): Promise<{ schedaFile: string; etichettaFiles: string[] }> => {
  const schedaFile = await generaSchedaProduzione(lotto, articoli, cassetto, note);
  const etichettaFiles = await generaEtichette(lotto, articoli, cassetto);
  return { schedaFile, etichettaFiles };
};
