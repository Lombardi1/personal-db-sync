import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';

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

export function esportaTabellaPDF(tabellaId: string, nomeFile: string) {
  try {
    const tabella = document.getElementById(tabellaId);
    if (!tabella) {
      toast.error('Tabella non trovata');
      return;
    }

    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });

    let titolo = 'Esportazione Tabella';
    let headerColor: [number, number, number] = [30, 64, 175]; // Default blue
    
    if (tabellaId === 'tab-dashboard') {
      titolo = 'Giacenza';
      headerColor = [59, 130, 246]; // Blue
    }
    if (tabellaId === 'tab-ordini') {
      titolo = 'Ordini in arrivo';
      headerColor = [220, 38, 38]; // Red
    }
    if (tabellaId === 'tab-esauriti') {
      titolo = 'Cartoni Esauriti';
      headerColor = [34, 139, 34]; // Green
    }
    if (tabellaId === 'tab-storico') {
      titolo = 'Storico Globale';
      headerColor = [59, 130, 246]; // Blue
    }

    const oggi = new Date();
    const dataStr = oggi.toLocaleDateString('it-IT') + ' ' + oggi.toLocaleTimeString('it-IT').slice(0, 5);

    const ths = Array.from(tabella.querySelectorAll('thead th')) as HTMLElement[];
    const azioniIdx: number[] = [];
    ths.forEach((th, idx) => {
      const txt = th.innerText.trim().toLowerCase();
      if (txt.includes('azione') || txt.includes('azioni')) azioniIdx.push(idx);
    });

    const headers = ths.filter((_, idx) => !azioniIdx.includes(idx)).map(th => th.innerText);

    const dati: string[][] = [];
    const rows = tabella.querySelectorAll('tbody tr');
    rows.forEach(tr => {
      const row: string[] = [];
      const cells = tr.querySelectorAll('td');
      cells.forEach((td, idx) => {
        if (!azioniIdx.includes(idx)) {
          row.push((td as HTMLElement).innerText.replace(/\n/g, ' ').replace(/\s+/g, ' '));
        }
      });
      dati.push(row);
    });

    doc.setFontSize(16);
    doc.text(titolo, 14, 14);
    doc.setFontSize(10);
    doc.text('Stampato il: ' + dataStr, 260, 14, { align: 'right' });

    const headerShortMap: Record<string, string> = {
      'Tipologia Cartone': 'Tipologia',
      'Formato Cartone': 'Formato',
      'Grammatura': 'Gramm.',
      'Fogli': 'Fogli',
      'Prezzo €/kg': 'Prezzo',
      'Arrivo effettivo': 'Arrivo'
    };

    const maxCellChars = 36;
    const shortHeaders = headers.map(h => headerShortMap[h.trim()] || h.trim());
    const compactData = dati.map(row => row.map(cell => {
      let v = String(cell || '').replace(/\s+/g, ' ').trim();
      if (v.length > maxCellChars) v = v.slice(0, maxCellChars - 1) + '…';
      return v;
    }));

    autoTable(doc, {
      head: [shortHeaders],
      body: compactData,
      startY: 20,
      theme: 'striped',
      styles: { fontSize: 6, cellPadding: 0.3, overflow: 'hidden', halign: 'center', valign: 'middle', cellWidth: 'wrap' },
      headStyles: { fillColor: headerColor, textColor: 255, fontStyle: 'bold', fontSize: 6, cellPadding: 0.3 },
      alternateRowStyles: { fillColor: [250, 250, 251] },
      margin: { left: 8, right: 8, top: 20 }
    });

    doc.save(nomeFile);
    toast.success('✅ PDF esportato con successo!');
  } catch (error) {
    console.error('Errore esportazione PDF:', error);
    toast.error('Errore durante l\'esportazione PDF');
  }
}
