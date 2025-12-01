import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import { Cartone, OrdineAcquisto, Fornitore, Cliente, ArticoloOrdineAcquisto, StoricoMovimento, AziendaInfo } from '@/types';
import { formatData, formatFormato, formatGrammatura, formatFogli, formatPrezzo, getStatoText } from '@/utils/formatters';
import logoAG from '@/assets/logo-ag.jpg';
import logoFSC from '@/assets/logo-fsc.jpg';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

// Helper function to convert HSL to RGB for jsPDF
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360;
  s /= 100;
  l /= 100;
  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

// Helper function to get RGB color based on section
function getSectionColorRgb(section: string): [number, number, number] {
  switch (section) {
    case 'giacenza': // --dashboard-color: 217 91% 60%;
      return hslToRgb(217, 91, 60);
    case 'ordini': // --ordini-color: 0 72% 51%;
      return hslToRgb(0, 72, 51);
    case 'esauriti':
      return hslToRgb(142, 71, 39);
    case 'carico':
      return hslToRgb(262, 66, 52);
    case 'storico':
      return hslToRgb(37, 93, 44);
    case 'ordini-acquisto':
      return hslToRgb(25, 95, 55);
    default: // Fallback to primary color or a default blue
      return hslToRgb(222, 47, 39); // --primary: 222 47% 39%;
  }
}

// Helper function to get human-readable color name based on section
function getSectionColorName(section: string): string {
  switch (section) {
    case 'giacenza':
      return 'Blu';
    case 'ordini':
      return 'Rosso';
    case 'esauriti':
      return 'Verde';
    case 'carico':
      return 'Viola';
    case 'storico':
      return 'Giallo';
    case 'ordini-acquisto':
      return 'Arancione';
    default:
      return 'BluScuro';
  }
}

// Helper function for parsing format (e.g., "102 x 72 cm" -> 1.02, 0.72)
const parseFormatoForCalculation = (formatoString: string | undefined): { lengthM: number; widthM: number } | null => {
  if (!formatoString) return null;
  let s = String(formatoString).trim();
  s = s.replace(/\s*cm$/i, '').trim();
  s = s.replace(/[×✕*]/g, 'x');
  const m = s.match(/(\d+(?:[\.,]\d+)?)\s*[xX]\s*(\d+(?:[\.,]\d+)?)/) || s.match(/(\d+(?:[\.,]\d+)?)\s+(\d+(?:[\.,]\d+)?)/);
  if (m) {
    const lengthCm = parseFloat(m[1].replace(',', '.'));
    const widthCm = parseFloat(m[2].replace(',', '.'));
    if (!isNaN(lengthCm) && !isNaN(widthCm)) {
      return { lengthM: lengthCm / 100, widthM: widthCm / 100 };
    }
  }
  return null;
};

// Helper function for parsing grammatura (e.g., "300 g/m²" -> 300)
const parseGrammaturaForCalculation = (grammaturaString: string | undefined): number | null => {
  if (!grammaturaString) return null;
  const s = String(grammaturaString).trim().replace(/\s*g\/m²\s*$/i, '');
  const gramm = parseInt(s);
  return isNaN(gramm) ? null : gramm;
};

export function esportaTabellaXLS(tabellaId: string, nomeFile: string) {
  try {
    const tabella = document.getElementById(tabellaId);
    if (!tabella) {
      toast.error('Tabella non trovata');
      return;
    }

    const wb = XLSX.utils.table_to_book(tabella, { sheet: 'Dati' });
    XLSX.writeFile(wb, nomeFile);
    toast.success('✅ File Excel esportato con successo!');
  } catch (error) {
    console.error('Errore esportazione Excel:', error);
    toast.error('Errore durante l\'esportazione Excel');
  }
}

export function esportaTabellaPDF(tabellaId: string, nomeFile: string, section: string, sourceData?: Cartone[] | StoricoMovimento[]) {
  try {
    console.log(`[esportaTabellaPDF] Inizio esportazione PDF per tabella: ${tabellaId}, file: ${nomeFile}, sezione: ${section}`);
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
    let y = 10;

    const headerColor = getSectionColorRgb(section);
    const sectionName = section.charAt(0).toUpperCase() + section.slice(1); // Capitalize first letter
    const colorName = getSectionColorName(section);
    const finalFileName = `${sectionName}_${colorName}_${nomeFile}`;

    let reportTitle = "Report Magazzino Cartoni";
    switch (section) {
      case 'giacenza':
        reportTitle = "Giacenza Magazzino Cartoni";
        break;
      case 'ordini':
        reportTitle = "Ordini in Arrivo";
        break;
      case 'esauriti':
        reportTitle = "Cartoni Esauriti";
        break;
      case 'carico':
        reportTitle = "Carico Ordini";
        break;
      case 'storico':
        reportTitle = "Storico Globale";
        break;
      default:
        reportTitle = "Report Magazzino Cartoni";
        break;
    }

    // Header
    doc.addImage(logoAG, 'JPEG', 10, y, 10, 10); // Reduced logo size
    doc.setFontSize(12); // Reduced font size for title
    doc.setFont(undefined, 'bold'); // Set font to bold
    doc.setTextColor(headerColor[0], headerColor[1], headerColor[2]); // Set title color
    doc.text(reportTitle, doc.internal.pageSize.width / 2, y + 5, { align: 'center' }); // Adjusted position
    doc.setFont(undefined, 'normal'); // Reset font to normal
    doc.setTextColor(0, 0, 0); // Reset text color to black for other text
    doc.setFontSize(8); // Reduced font size for date
    doc.text(`Generato il: ${new Date().toLocaleString('it-IT')}`, doc.internal.pageSize.width - 10, y + 5, { align: 'right' }); // Adjusted position
    y += 18; // Reduced vertical space after header

    let head: string[][] = [];
    let body: string[][] = [];

    if (sourceData && sourceData.length > 0) {
      console.log('[esportaTabellaPDF] Esportazione con dati forniti (sourceData array).');
      if (section === 'ordini') {
        const cartoniData = sourceData as Cartone[];
        head = [[
          "Codice", "Fornitore", "Ordine", "DDT", "Tipologia", "Formato", "Grammatura",
          "Fogli", "Cliente", "Lavoro", "Magazzino", "Prezzo €/kg", "Data Consegna", "Confermato"
        ]];
        body = cartoniData.map((item: Cartone) => [
          item.codice,
          item.fornitore,
          item.ordine,
          item.ddt || '-',
          item.tipologia,
          formatFormato(item.formato),
          formatGrammatura(item.grammatura),
          formatFogli(item.fogli),
          item.cliente,
          item.lavoro,
          item.magazzino,
          formatPrezzo(item.prezzo),
          formatData(item.data_consegna || ''),
          item.confermato ? '✅ Sì' : '❌ No', // Added icons
        ]);
      } else if (section === 'giacenza' || section === 'esauriti') {
        const cartoniData = sourceData as Cartone[];
        head = [[
          "Codice", "Fornitore", "Ordine", "DDT", "Tipologia", "Formato", "Grammatura",
          "Fogli", "Cliente", "Lavoro", "Magazzino", "Prezzo €/kg", "Data Arrivo/Consegna"
        ]];
        body = cartoniData.map((item: Cartone) => [
          item.codice,
          item.fornitore,
          item.ordine,
          item.ddt || '-',
          item.tipologia,
          formatFormato(item.formato),
          formatGrammatura(item.grammatura),
          formatFogli(item.fogli),
          item.cliente,
          item.lavoro,
          item.magazzino,
          formatPrezzo(item.prezzo),
          formatData(item.data_arrivo || item.data_consegna || ''),
        ]);
      } else if (section === 'storico') {
        const storicoData = sourceData as StoricoMovimento[];
        head = [[
          "Codice", "Data", "Tipo", "Quantità", "Utente", "Ordine Acquisto", "Note"
        ]];
        body = storicoData.map((mov: StoricoMovimento) => [
          mov.codice,
          format(new Date(mov.data), 'dd MMM yyyy HH:mm', { locale: it }),
          mov.tipo === 'carico' ? '↑ Carico' : '↓ Scarico',
          String(mov.quantita),
          mov.username || 'Sconosciuto',
          mov.note,
        ]);
      }
    } else {
      console.log('[esportaTabellaPDF] Esportazione da DOM (nessun sourceData array fornito).');
      const tableElement = document.getElementById(tabellaId);
      if (!tableElement) {
        toast.error('Tabella non trovata');
        console.error(`[esportaTabellaPDF] Errore: Elemento tabella con ID '${tabellaId}' non trovato.`);
        return;
      }
      console.log(`[esportaTabellaPDF] Trovato elemento tabella con ID: ${tabellaId}`);

      const headers = Array.from(tableElement.querySelectorAll('thead th'))
        .map(th => (th as HTMLElement).innerText.trim())
        .filter(text => text !== 'Azioni');
      head = [headers];
      console.log('[esportaTabellaPDF] Headers estratti (DOM):', headers);

      const rows = Array.from(tableElement.querySelectorAll('tbody tr'));
      console.log(`[esportaTabellaPDF] Trovate ${rows.length} righe nel tbody (DOM).`);
      body = rows.map(row => {
        const cells = Array.from(row.querySelectorAll('td'));
        const rowData = cells.slice(0, cells.length - 1).map(cell => {
          const codiceSpan = cell.querySelector('.codice');
          const badgeSpan = cell.querySelector('.inline-block');
          let cellText = '';
          if (codiceSpan) {
            cellText = codiceSpan.textContent?.trim() || '';
          } else if (badgeSpan) {
            cellText = badgeSpan.textContent?.trim() || '';
          } else {
            cellText = cell.textContent?.trim() || '';
          }
          return cellText;
        });
        return rowData;
      });
      if (body.length === 0) {
        console.warn('[esportaTabellaPDF] Nessun dato estratto dal corpo della tabella (DOM).');
        toast.info('Nessun dato da esportare nel PDF.');
        return;
      }
    }

    autoTable(doc, {
      startY: y,
      head: head,
      body: body,
      theme: 'striped',
      styles: { fontSize: 7, cellPadding: 1, overflow: 'linebreak', lineColor: [180, 180, 180], lineWidth: 0.1 }, // Aggiunto lineColor e lineWidth
      headStyles: { fillColor: headerColor, textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [230, 230, 230] }, // Colore alternato più scuro
      margin: { left: 10, right: 10 },
      didParseCell: (data) => {
        // Apply green background to 'Confermato' column if value is '✅ Sì'
        if (section === 'ordini' && data.section === 'body' && data.column.index === (head[0].length - 1)) {
          if (data.cell.text.includes('✅ Sì')) {
            data.cell.styles.fillColor = [0, 128, 0]; // Strong Green
            data.cell.styles.textColor = [255, 255, 255]; // White text
          } else if (data.cell.text.includes('❌ No')) {
            data.cell.styles.fillColor = [200, 0, 0]; // Strong Red
            data.cell.styles.textColor = [255, 255, 255]; // White text
          }
        }
      },
      didDrawPage: (data) => {
        doc.setFontSize(8);
        doc.text(`Pagina ${data.pageNumber}`, doc.internal.pageSize.width - 10, doc.internal.pageSize.height - 10, { align: 'right' });
      }
    });

    doc.save(finalFileName);
    toast.success('✅ File PDF esportato con successo!');
  } catch (error: any) {
    console.error('Errore esportazione PDF:', error);
    toast.error(`Errore durante l'esportazione PDF: ${error.message || 'Errore sconosciuto'}`);
  }
}

export function exportOrdineAcquistoPDF(ordine: OrdineAcquisto, fornitori: Fornitore[], clienti: Cliente[], section: string, aziendaInfo: AziendaInfo | null, preview: boolean = false, targetWindow: Window | null = null) {
  try {
    console.log(`[exportOrdineAcquistoPDF] Inizio esportazione PDF per ordine: ${ordine.numero_ordine}, preview: ${preview}`);
    console.log(`[exportOrdineAcquistoPDF] Ordine ricevuto:`, JSON.stringify(ordine, null, 2));
    console.log(`[exportOrdineAcquistoPDF] Azienda Info ricevuta:`, JSON.stringify(aziendaInfo, null, 2));

    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    let y = 10;
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    
    const finalFileName = `Ordine_${ordine.numero_ordine}.pdf`;
    const fornitore = fornitori.find(f => f.id === ordine.fornitore_id);
    console.log(`[exportOrdineAcquistoPDF] Fornitore trovato:`, JSON.stringify(fornitore, null, 2));

    // Imposta il font predefinito su grassetto all'inizio
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0, 0, 0); // Imposta il colore del testo a nero per tutto il documento

    // ========== HEADER SECTION ==========
    // Logo AG Lombardi (sinistra)
    doc.addImage(logoAG, 'JPEG', 10, y, 24, 25); // Larghezza modificata a 24mm
    
    // Info azienda (sinistra, sotto logo) - Ora dinamiche da aziendaInfo
    doc.setFontSize(12); 
    doc.text(aziendaInfo?.nome_azienda || 'ARTI GRAFICHE', 40, y + 5); 
    doc.setFontSize(9); 
    doc.text('Lombardi SRL', 40, y + 9); // Questo sembra essere un suffisso fisso

    doc.setFontSize(8); // Uniformato a 8
    doc.text(aziendaInfo?.indirizzo || 'VIA S.ANTONIO, 51', 40, y + 14); 
    doc.text(`${aziendaInfo?.cap || ''} ${aziendaInfo?.citta || ''} ${aziendaInfo?.provincia || ''}`.trim() || '25050 PASSIRANO (BRESCIA)', 40, y + 17); 
    doc.text(`TEL. ${aziendaInfo?.telefono || '030657152 - 0306577500'}`, 40, y + 20); 
    
    // Condizione per il TELEFAX
    if (aziendaInfo?.fax) {
      doc.text(`TELEFAX ${aziendaInfo.fax}`, 40, y + 23); 
      doc.text(`E-Mail: ${aziendaInfo?.email || 'info@aglombardi.it'}`, 40, y + 26); 
      doc.text('LITOGRAFIA - CARTOTECNICA', 40, y + 30); // Questo sembra fisso
      doc.setFontSize(7); // Uniformato a 7
      doc.text(`R.E.A. di BS N. ${aziendaInfo?.rea || '169198'} M. BS ${aziendaInfo?.m_bs || '012689'}`, 40, y + 33); 
      doc.text(`C.F. / P.IVA IT ${aziendaInfo?.p_iva || '00320390172'}`, 40, y + 36); 
      doc.text(`Banche: ${aziendaInfo?.banche || 'agenzie di Ospitaletto BS'}`, 40, y + 39); 
    } else {
      // Se il fax non c'è, sposta le righe successive più in alto
      doc.text(`E-Mail: ${aziendaInfo?.email || 'info@aglombardi.it'}`, 40, y + 23); // Spostato da y+26 a y+23
      doc.text('LITOGRAFIA - CARTOTECNICA', 40, y + 27); // Spostato da y+30 a y+27
      doc.setFontSize(7); // Uniformato a 7
      doc.text(`R.E.A. di BS N. ${aziendaInfo?.rea || '169198'} M. BS ${aziendaInfo?.m_bs || '012689'}`, 40, y + 30); // Spostato da y+33 a y+30
      doc.text(`C.F. / P.IVA IT ${aziendaInfo?.p_iva || '00320390172'}`, 40, y + 33); // Spostato da y+36 a y+33
      doc.text(`Banche: ${aziendaInfo?.banche || 'agenzie di Ospitaletto BS'}`, 40, y + 36); // Spostato da y+39 a y+36
    }
    
    // Le banche specifiche potrebbero essere parte del campo 'banche' o rimosse se non necessarie
    // doc.text('Banca Popolare di Sondrio', 50, y + 42); 
    // doc.text('Banca Popolare di Bergamo', 50, y + 45); 

    y += 55; 

    // Box "Spett." (destra, in alto)
    doc.setFontSize(9); // Titolo del box
    doc.rect(130, 10, 70, 30); 
    doc.text('Spett.', 132, 15);
    doc.setFontSize(10); // Increased font size for fornitore name
    doc.text(fornitore?.nome || 'N/A', 132, 20);
    
    // Aggiunto spazio dopo il nome del fornitore
    let currentYForFornitore = 20 + 8; // Inizia 8mm sotto il nome del fornitore per un doppio invio
    doc.setFontSize(8); // Contenuto del box
    if (fornitore?.indirizzo) {
      doc.text(fornitore.indirizzo, 132, currentYForFornitore);
      currentYForFornitore += 4;
    }
    if (fornitore?.citta) {
      const cittaText = `${fornitore.cap || ''} ${fornitore.citta} ${fornitore.provincia || ''}`.trim();
      doc.text(cittaText, 132, currentYForFornitore);
      currentYForFornitore += 4;
    }
    if (fornitore?.telefono) {
      doc.text(`TEL. : ${fornitore.telefono}`, 132, currentYForFornitore);
    }
    
    // Box "Destinazione merce" (destra, sotto Spett.)
    doc.rect(130, 41, 70, 25); 
    doc.setFontSize(9); // Titolo del box
    doc.text('Destinazione merce', 132, 45);
    doc.setFontSize(10); // Increased font size for azienda name
    doc.text(aziendaInfo?.nome_azienda || 'Arti Grafiche Snc', 132, 50); // Dinamico
    
    // Aggiunto spazio dopo il nome dell'azienda
    let currentYForAzienda = 50 + 8; // Inizia 8mm sotto il nome dell'azienda per un doppio invio
    doc.setFontSize(8); // Contenuto del box
    doc.text(aziendaInfo?.indirizzo || 'Via S.Antonio, 51', 132, currentYForAzienda); // Dinamico
    currentYForAzienda += 4;
    doc.text(`${aziendaInfo?.cap || ''} - ${aziendaInfo?.citta || ''} (${aziendaInfo?.provincia || ''})`.trim() || '25050 - Passirano (BS)', 132, currentYForAzienda); // Dinamico

    // ========== TIPO DOCUMENTO ==========
    doc.setFillColor(220, 220, 220);
    doc.rect(10, y, 50, 8, 'F');
    doc.setFontSize(9);
    doc.text('Tipo Documento', 12, y + 5);
    
    doc.setFontSize(12);
    doc.text('ORDINE', 12, y + 13);
    y += 18;

    // ========== TABELLA INFO ORDINE ==========
    const infoHeaders = ['Numero', 'Data', 'Cod. fornitore', 'P.IVA', 'Condizione di pagamento', 'Pag.'];
    const infoData = [
      ordine.numero_ordine,
      formatData(ordine.data_ordine),
      fornitore?.codice_anagrafica || 'N/A', 
      fornitore?.partita_iva || 'N/A',
      fornitore?.condizione_pagamento || 'BONIFICO BANCARIO 90 G.G. F.M.', 
      '1'
    ];

    autoTable(doc, {
      startY: y,
      head: [infoHeaders],
      body: [infoData],
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2, fontStyle: 'bold', textColor: [0, 0, 0] }, // Imposta textColor a nero
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.3, lineColor: [0, 0, 0] }, 
      bodyStyles: { lineWidth: 0.3, lineColor: [0, 0, 0] }, 
      margin: { left: 10, right: 10 },
    });

    y = (doc as any).lastAutoTable.finalY + 2; 

    // Seconda riga: Resa, Mezzo, Banca
    console.log(`[exportOrdineAcquistoPDF] Valore di fornitore?.banca prima di popolare la tabella: '${fornitore?.banca}'`); // LOG DI DEBUG
    autoTable(doc, {
      startY: y,
      head: [['Resa', 'Mezzo', 'Banca']],
      body: [['', '', fornitore?.banca || '']], // Popola il campo Banca qui
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2, minCellHeight: 8, fontStyle: 'bold', textColor: [0, 0, 0], overflow: 'ellipsize' }, // Modificato fontStyle e overflow
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.3, lineColor: [0, 0, 0] }, 
      bodyStyles: { lineWidth: 0.3, lineColor: [0, 0, 0], fontStyle: 'bold' }, // Modificato: Aggiunto fontStyle: 'bold'
      columnStyles: { // Aggiunto per distribuire equamente la larghezza
        0: { cellWidth: (pageWidth - 20) / 3 },
        1: { cellWidth: (pageWidth - 20) / 3 },
        2: { cellWidth: (pageWidth - 20) / 3 },
      },
      margin: { left: 10, right: 10 },
    });

    y = (doc as any).lastAutoTable.finalY + 5; 

    // ========== TABELLA ARTICOLI ==========
    const isCartone = fornitore?.tipo_fornitore === 'Cartone';
    const isFustelle = fornitore?.tipo_fornitore === 'Fustelle'; // Nuovo flag per Fustelle
    const IVA_RATE = 0.22; // 22% IVA

    const articlesHead = [['Articolo', 'Descrizione', 'UM', 'Quantità', 'Prezzo', 'Prezzo\ntotale', 'Iva', 'Data\ncons.']];
    
    // Filtra gli articoli annullati e ricalcola il subtotale
    const nonCancelledArticles = ordine.articoli.filter(article => article.stato !== 'annullato');
    const subtotalNonCancelled = nonCancelledArticles.reduce((sum, item) => {
      const qty = item.quantita || 0;
      const price = item.prezzo_unitario || 0;
      return sum + (qty * price);
    }, 0);

    const articlesBody = nonCancelledArticles.map(article => {
      let articoloColumnText = '';
      let descrizioneColumnText = '';
      let umText = '';
      let quantitaFormatted = '';

      if (isCartone) {
        articoloColumnText = article.codice_ctn || '';
        descrizioneColumnText = `CARTONE ${article.tipologia_cartone || ''} ${formatGrammatura(article.grammatura || '')} F.TO ${formatFormato(article.formato || '')}\nNR. FOGLI ${article.numero_fogli?.toLocaleString('it-IT') || ''}`;
        if (article.fsc) descrizioneColumnText += `\n\nPROD.CERT.FSC MIX CREDIT BV-COC-334465\nRIF. COMMESSA ${article.rif_commessa_fsc || 'N/A'}`;
        if (article.alimentare) descrizioneColumnText += '\n\nMATERIALE IDONEO AL CONTATTO ALIMENTARE';
        umText = 'KG';
        quantitaFormatted = (article.quantita || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      } else if (isFustelle) { // Logica per fornitori di Fustelle
        articoloColumnText = article.fustella_codice || '';
        let fustellaDescription = [];
        if (article.codice_fornitore_fustella) fustellaDescription.push(`Codice Fornitore: ${article.codice_fornitore_fustella}`);
        if (article.resa_fustella) fustellaDescription.push(`Resa: ${article.resa_fustella}`);
        if (article.fustellatrice) fustellaDescription.push(`Fustellatrice: ${article.fustellatrice}`);
        if (article.cliente) fustellaDescription.push(`Cliente: ${article.cliente}`);
        if (article.lavoro) fustellaDescription.push(`Lavoro: ${article.lavoro}`);
        
        if (article.hasPulitore) {
          fustellaDescription.push(`Pulitore: Sì`);
          if (article.pulitore_codice_fustella) {
            fustellaDescription.push(`Codice Pulitore: ${article.pulitore_codice_fustella}`);
          }
        }
        if (article.pinza_tagliata) fustellaDescription.push(`Pinza Tagliata: Sì`);
        if (article.tasselli_intercambiabili) {
          fustellaDescription.push(`Tasselli Intercambiabili: Sì`);
          if (article.nr_tasselli !== null && article.nr_tasselli !== undefined) {
            fustellaDescription.push(`Nr. Tasselli: ${article.nr_tasselli}`);
          }
        }
        if (article.incollatura) {
          fustellaDescription.push(`Incollatura: Sì`);
          if (article.incollatrice) fustellaDescription.push(`Incollatrice: ${article.incollatrice}`);
          if (article.tipo_incollatura) fustellaDescription.push(`Tipo Incollatura: ${article.tipo_incollatura}`);
        }
        descrizioneColumnText = fustellaDescription.join('\n');
        umText = 'PZ';
        quantitaFormatted = (article.quantita || 0).toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
      } else {
        articoloColumnText = article.descrizione || '';
        descrizioneColumnText = ''; 
        umText = 'PZ'; // Default per altri tipi
        quantitaFormatted = (article.quantita || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
      
      const prezzoUnitarioFormatted = (article.prezzo_unitario || 0).toLocaleString('it-IT', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
      const prezzoTotaleRiga = ((article.quantita || 0) * (article.prezzo_unitario || 0)).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      return [
        articoloColumnText, 
        descrizioneColumnText, 
        umText,
        quantitaFormatted,
        prezzoUnitarioFormatted,
        prezzoTotaleRiga,
        fornitore?.considera_iva ? '22%' : '-', 
        formatData(article.data_consegna_prevista || '')
      ];
    });

    // Aggiungi una nota se ci sono articoli annullati
    const cancelledArticlesCount = ordine.articoli.filter(article => article.stato === 'annullato').length;
    if (cancelledArticlesCount > 0) {
      articlesBody.push(['', `(${cancelledArticlesCount} articolo/i annullato/i non incluso/i nel PDF)`, '', '', '', '', '', '']);
    }

    if (ordine.note) {
      articlesBody.push(['', ordine.note, '', '', '', '', '', '']);
    }

    autoTable(doc, {
      startY: y,
      head: articlesHead,
      body: articlesBody,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 1.5, overflow: 'linebreak', lineColor: [0, 0, 0], lineWidth: 0.3, valign: 'middle', fontStyle: 'bold', textColor: [0, 0, 0] }, // Imposta textColor a nero
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', fontSize: 9 },
      bodyStyles: { lineColor: [0, 0, 0], lineWidth: 0.3 }, 
      columnStyles: {
        0: { cellWidth: 15 }, 
        1: { cellWidth: 80 }, 
        2: { cellWidth: 10 }, 
        3: { cellWidth: 22, halign: 'right' }, 
        4: { cellWidth: 15, halign: 'right' }, 
        5: { cellWidth: 18, halign: 'right' }, 
        6: { cellWidth: 10, halign: 'center' }, 
        7: { cellWidth: 20, halign: 'center' }, 
      },
      margin: { left: 10, right: 10 },
    });

    y = (doc as any).lastAutoTable.finalY;

    // ========== FOOTER ==========
    const footerY = pageHeight - 50;
    
    // Box "Condizioni di vendita"
    doc.rect(10, footerY, 120, 20);
    doc.setFontSize(8);
    doc.text('Condizioni di vendita', 12, footerY + 5);

    // Calcola IVA e Totale con IVA in base a considera_iva del fornitore
    let ivaAmount = 0;
    let totalFinal = subtotalNonCancelled; // Usa il subtotale degli articoli non annullati
    let ivaTextDisplay = '(IVA non inclusa)'; 

    console.log(`[DEBUG-IVA] Subtotal (articoli non annullati): ${subtotalNonCancelled}`);
    console.log(`[DEBUG-IVA] Fornitore: ${fornitore?.nome}, Considera IVA: ${fornitore?.considera_iva}`);

    if (fornitore?.considera_iva) {
      ivaAmount = subtotalNonCancelled * IVA_RATE;
      totalFinal = subtotalNonCancelled + ivaAmount;
      ivaTextDisplay = '(IVA inclusa)';
      console.log(`[DEBUG-IVA] IVA applicata. IVA Amount: ${ivaAmount}, Total Final: ${totalFinal}`);
    } else {
      console.log(`[DEBUG-IVA] IVA NON applicata. Total Final: ${totalFinal}`);
    }

    // Totale ordine
    doc.rect(10, footerY + 21, 120, 10);
    doc.setFontSize(9);
    doc.text(`Totale ordine EUR ${ivaTextDisplay}`, 12, footerY + 27); 
    doc.text(totalFinal.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 120, footerY + 27, { align: 'right' });

    // Logo FSC e testo
    try {
      const fscLogoWidth = 50; 
      const fscLogoHeight = 27; 
      const fscLogoX = pageWidth - 10 - fscLogoWidth; 
      const fscLogoY = footerY + 5; 

      doc.addImage(logoFSC, 'JPEG', fscLogoX, fscLogoY, fscLogoWidth, fscLogoHeight);
      doc.setFontSize(7); 
      doc.text('Solo i prodotti identificati come tali in questo documento sono certificati FSC®', pageWidth - 10, footerY + 42, { maxWidth: 190, align: 'right' }); 
    } catch (error) {
      console.warn('Logo FSC non disponibile:', error);
    }

    if (preview) {
      if (targetWindow) {
        targetWindow.document.title = `Anteprima Ordine ${ordine.numero_ordine}`;
        targetWindow.document.body.innerHTML = '<embed width="100%" height="100%" src="' + doc.output('datauristring') + '" type="application/pdf" />';
        toast.success('✅ Anteprima PDF Ordine d\'Acquisto generata!');
      } else {
        doc.output('dataurlnewwindow');
        toast.success('✅ Anteprima PDF Ordine d\'Acquisto generata!');
      }
    } else {
      doc.save(finalFileName);
      toast.success('✅ File PDF Ordine d\'Acquisto esportato con successo!');
    }
  } catch (error: any) {
    console.error('Errore esportazione PDF Ordine d\'Acquisto:', error);
    toast.error(`Errore durante l'esportazione PDF Ordine d'Acquisto: ${error.message || 'Errore sconosciuto'}`);
    if (targetWindow) {
      targetWindow.close();
    }
  }
}