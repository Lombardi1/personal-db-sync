import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import { OrdineAttesa } from '@/types/fornitore';

export function esportaOrdineFornitore(
  ordini: OrdineAttesa[],
  fornitoreData: any,
  clienteData: any
) {
  try {
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

    // Header - Dati azienda cliente (chi emette l'ordine)
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(clienteData.ragione_sociale || 'ARTI GRAFICHE', 14, 20);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const headerY = 26;
    doc.text(clienteData.indirizzo || '', 14, headerY);
    doc.text(`${clienteData.cap || ''} ${clienteData.citta || ''}`, 14, headerY + 4);
    doc.text(`TEL. ${clienteData.telefono || ''}`, 14, headerY + 8);
    if (clienteData.fax) doc.text(`FAX ${clienteData.fax}`, 14, headerY + 12);
    if (clienteData.email) doc.text(`E-Mail: ${clienteData.email}`, 14, headerY + 16);

    // Dati fiscali azienda
    doc.setFontSize(7);
    doc.text(`C.F. / P.IVA ${clienteData.piva || ''}`, 14, headerY + 22);
    if (clienteData.rea) doc.text(`R.E.A. ${clienteData.rea}`, 14, headerY + 26);

    // Banche
    if (clienteData.banca_1 || clienteData.banca_2) {
      doc.setFont('helvetica', 'bold');
      doc.text('Banche:', 14, headerY + 32);
      doc.setFont('helvetica', 'normal');
      let bankY = headerY + 36;
      if (clienteData.banca_1) {
        doc.text(clienteData.banca_1, 14, bankY);
        bankY += 4;
      }
      if (clienteData.banca_2) {
        doc.text(clienteData.banca_2, 14, bankY);
      }
    }

    // Destinatario - Fornitore
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Spett.', 120, 20);
    doc.setFontSize(12);
    doc.text(fornitoreData.ragione_sociale, 120, 26);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(fornitoreData.indirizzo, 120, 32);
    doc.text(`${fornitoreData.cap} ${fornitoreData.citta} (${fornitoreData.provincia})`, 120, 37);
    if (fornitoreData.telefono) doc.text(`TEL. ${fornitoreData.telefono}`, 120, 42);

    // Tipo documento e numero ordine
    const oggi = new Date();
    const dataStr = oggi.toLocaleDateString('it-IT');
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('ORDINE DI ACQUISTO', 14, 75);

    // Tabella info ordine
    const numeroOrdine = ordini[0]?.ordine || '';
    const condizioniPagamento = fornitoreData.condizioni_pagamento || '';
    
    autoTable(doc, {
      startY: 80,
      head: [['Numero', 'Data', 'Cod. fornitore', 'P.IVA', 'Condizione di pagamento']],
      body: [[
        numeroOrdine,
        dataStr,
        fornitoreData.codice,
        fornitoreData.piva,
        condizioniPagamento
      ]],
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [220, 220, 220], textColor: 0, fontStyle: 'bold' }
    });

    // Tabella articoli ordinati
    const articoli = ordini.map(ord => [
      ord.tipologia,
      ord.formato,
      ord.grammatura,
      ord.fogli.toString(),
      `€ ${ord.prezzo.toFixed(2)}`,
      `€ ${(ord.fogli * ord.prezzo).toFixed(2)}`,
      ord.data_consegna || '',
      ord.note || ''
    ]);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Descrizione', 'Formato', 'Grammatura', 'Quantità', 'Prezzo Unitario', 'Totale', 'Data Consegna', 'Note']],
      body: articoli,
      theme: 'striped',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 250] }
    });

    // Totale ordine
    const totaleOrdine = ordini.reduce((sum, ord) => sum + (ord.fogli * ord.prezzo), 0);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.text(`Totale ordine: € ${totaleOrdine.toFixed(2)}`, 14, finalY);

    // Note finali
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Condizioni di vendita:', 14, finalY + 10);

    // Salva PDF
    const nomeFile = `Ordine_${fornitoreData.ragione_sociale}_${numeroOrdine}_${dataStr.replace(/\//g, '-')}.pdf`;
    doc.save(nomeFile);
    toast.success('✅ PDF ordine esportato con successo!');
  } catch (error) {
    console.error('Errore esportazione PDF ordine:', error);
    toast.error('Errore durante l\'esportazione del PDF');
  }
}
