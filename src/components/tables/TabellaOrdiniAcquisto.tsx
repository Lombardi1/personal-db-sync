import React, { useState } from 'react';
import { OrdineAcquisto, Fornitore, Cliente, ArticoloOrdineAcquisto } from '@/types';
import { formatData, formatFormato, formatGrammatura, getStatoText, getStatoBadgeClass } from '@/utils/formatters';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Edit, Trash2, FileText, ChevronDown, ChevronUp, CopyPlus, XCircle, Printer } from 'lucide-react';
import * as notifications from '@/utils/notifications'; // Aggiornato a percorso relativo
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { exportOrdineAcquistoPDF } from '@/utils/export'; 
import { supabase } from '@/lib/supabase'; // Import supabase to refetch order

interface TabellaOrdiniAcquistoProps {
  ordini: OrdineAcquisto[];
  onEdit: (ordine: OrdineAcquisto) => void;
  onCancel: (id: string) => void;
  onPermanentDelete: (id: string, numeroOrdine: string) => void;
  onDuplicateAndEdit: (ordine: OrdineAcquisto) => void;
  fornitori: Fornitore[];
  clienti: Cliente[];
  updateOrdineAcquistoStatus: (id: string, newStatus: OrdineAcquisto['stato']) => Promise<{ success: boolean; error?: any }>;
  updateArticleStatusInOrder: (orderNumeroOrdine: string, articleIdentifier: string, newArticleStatus: ArticoloOrdineAcquisto['stato']) => Promise<{ success: boolean; error?: any }>;
}

interface DisplayRow extends ArticoloOrdineAcquisto {
  orderId: string;
  orderNumeroOrdine: string;
  orderFornitoreNome: string;
  orderDataOrdine: string;
  orderStato: OrdineAcquisto['stato'];
  orderImportoTotale: number;
  orderNote: string;
  isFirstArticleOfOrder: boolean;
  isLastArticleOfOrder: boolean;
  parentOrder: OrdineAcquisto;
  isCartoneFornitore: boolean;
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

export function TabellaOrdiniAcquisto({ ordini, onEdit, onCancel, onPermanentDelete, onDuplicateAndEdit, fornitori, clienti, updateOrdineAcquistoStatus, updateArticleStatusInOrder }: TabellaOrdiniAcquistoProps) {
  console.log("[TabellaOrdiniAcquisto] Componente renderizzato con le ultime modifiche.");
  const [ordineToActOn, setOrdineToActOn] = useState<OrdineAcquisto | null>(null);
  const [isActionAlertOpen, setIsActionAlertOpen] = useState(false);
  const [actionType, setActionType] = useState<'cancel' | 'delete' | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  const toggleOrderExpansion = (orderId: string) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const handleActionClick = (ordine: OrdineAcquisto, type: 'cancel' | 'delete') => {
    console.log(`[TabellaOrdiniAcquisto] handleActionClick chiamato per ordine: ${ordine.numero_ordine}, tipo: ${type}`);
    setOrdineToActOn(ordine);
    setActionType(type);
    setIsActionAlertOpen(true);
  };

  const handleConfirmAction = () => {
    console.log(`[TabellaOrdiniAcquisto] handleConfirmAction chiamato. Ordine: ${ordineToActOn?.numero_ordine}, Tipo azione: ${actionType}`);
    if (ordineToActOn?.id && ordineToActOn?.numero_ordine && actionType) {
      if (actionType === 'cancel') {
        console.log(`[TabellaOrdiniAcquisto] Chiamando onCancel per ID: ${ordineToActOn.id}`);
        onCancel(ordineToActOn.id);
      } else if (actionType === 'delete') {
        console.log(`[TabellaOrdiniAcquisto] Chiamando onPermanentDelete per ID: ${ordineToActOn.id}, Numero Ordine: ${ordineToActOn.numero_ordine}`);
        onPermanentDelete(ordineToActOn.id, ordineToActOn.numero_ordine);
      }
      setIsActionAlertOpen(false);
      setOrdineToActOn(null);
      setActionType(null);
    } else {
      console.warn('[TabellaOrdiniAcquisto] handleConfirmAction: Dati mancanti per eseguire l\'azione.');
    }
  };

  const handlePreviewPdfAndUpdateStatus = async (ordine: OrdineAcquisto) => {
    console.log(`[TabellaOrdiniAcquisto] handlePreviewPdfAndUpdateStatus chiamato per ordine: ${ordine.numero_ordine}, stato attuale: ${ordine.stato}`);
    
    // 1. Open a new blank window immediately to avoid pop-up blockers
    const newWindow = window.open('', '_blank');
    if (!newWindow) {
      notifications.showError('Impossibile aprire l\'anteprima PDF. Controlla le impostazioni del browser per i pop-up.');
      return;
    }
    newWindow.document.write('<html><head><title>Caricamento PDF...</title></head><body><p style="font-family: sans-serif; padding: 20px;">Caricamento anteprima PDF in corso... attendere.</p></body></html>');
    newWindow.document.close(); // Important for some browsers

    notifications.showInfo('Aggiornamento stato ordine in corso. L\'anteprima PDF si caricherà nella nuova finestra.');

    try {
      // 1. Fetch the latest version of the order from Supabase immediately
      const { data: latestOrder, error: fetchLatestError } = await supabase
          .from('ordini_acquisto')
          .select(`*, fornitori ( nome, tipo_fornitore, considera_iva )`) // AGGIUNTO: considera_iva
          .eq('id', ordine.id)
          .single();

      if (fetchLatestError || !latestOrder) {
          notifications.showError("Errore nel recupero dell'ordine più recente.");
          newWindow.close();
          return;
      }
      let orderToProcess: OrdineAcquisto = {
          ...latestOrder,
          fornitore_nome: latestOrder.fornitori?.nome || 'N/A',
          fornitore_tipo: latestOrder.fornitori?.tipo_fornitore || 'N/A',
          articoli: (latestOrder.articoli || []) as ArticoloOrdineAcquisto[],
      };

      // DEBUG LOG: Log the order data before passing to PDF export
      console.log("[TabellaOrdiniAcquisto] Dati ordine (orderToProcess) prima dell'esportazione PDF (Preview):", JSON.stringify(orderToProcess, null, 2));


      // 2. If the main order is cancelled, just generate PDF of the cancelled order and return.
      if (orderToProcess.stato === 'annullato') {
        notifications.showInfo(`L'ordine '${orderToProcess.numero_ordine}' è annullato. Non è possibile modificare lo stato degli articoli.`);
        exportOrdineAcquistoPDF(orderToProcess, fornitori, clienti, 'ordini-acquisto', true, newWindow);
        return;
      }

      // 3. Prepare updates for main order status and articles
      let newMainOrderStatus = orderToProcess.stato;
      let updatedArticles = [...orderToProcess.articoli];
      let needsDbUpdate = false;

      // If main order is 'in_attesa', update it to 'inviato' and update all 'in_attesa' articles to 'inviato'
      if (orderToProcess.stato === 'in_attesa') {
          newMainOrderStatus = 'inviato';
          needsDbUpdate = true;
          updatedArticles = updatedArticles.map(art => ({ 
              ...art, 
              stato: art.stato === 'in_attesa' ? 'inviato' : art.stato 
          }));
          notifications.showInfo(`Stato ordine '${orderToProcess.numero_ordine}' aggiornato a 'Inviato'.`);
      } else {
          // If main order is already 'inviato', 'confermato', or 'ricevuto',
          // just ensure any remaining 'in_attesa' articles are updated to 'inviato'.
          const articlesToUpdate = updatedArticles.filter(art => art.stato === 'in_attesa');
          if (articlesToUpdate.length > 0) {
              needsDbUpdate = true;
              updatedArticles = updatedArticles.map(art => ({ 
                  ...art, 
                  stato: art.stato === 'in_attesa' ? 'inviato' : art.stato 
              }));
              notifications.showInfo(`Stato di alcuni articoli dell'ordine '${orderToProcess.numero_ordine}' aggiornato a 'Inviato'.`);
          }
      }

      // 4. Perform a single Supabase update if changes are needed
      if (needsDbUpdate) {
          const { data: updatedOrderData, error: updateError } = await supabase
              .from('ordini_acquisto')
              .update({ stato: newMainOrderStatus, articoli: updatedArticles as any, updated_at: new Date().toISOString() })
              .eq('id', ordine.id)
              .select(`*, fornitori ( nome, tipo_fornitore, considera_iva )`) // AGGIUNTO: considera_iva
              .single();

          if (updateError || !updatedOrderData) {
              notifications.showError("Errore nell'aggiornamento dello stato dell'ordine o degli articoli.");
              newWindow.close();
              return;
          }
          orderToProcess = {
              ...updatedOrderData,
              fornitore_nome: updatedOrderData.fornitori?.nome || 'N/A',
              fornitore_tipo: updatedOrderData.fornitori?.tipo_fornitore || 'N/A',
              articoli: (updatedOrderData.articoli || []) as ArticoloOrdineAcquisto[],
          };
      }

      // 5. Final check: Ensure all articles are in a "sent" state ('inviato', 'confermato', 'ricevuto')
      const allArticlesSent = orderToProcess.articoli.every(art => 
          art.stato === 'inviato' || art.stato === 'confermato' || art.stato === 'ricevuto'
      );

      if (allArticlesSent) {
          console.log(`[TabellaOrdiniAcquisto] Generando anteprima PDF per ordine: ${orderToProcess.numero_ordine} con stato finale: ${orderToProcess.stato}`);
          exportOrdineAcquistoPDF(orderToProcess, fornitori, clienti, 'ordini-acquisto', true, newWindow);
      } else {
          notifications.showError("Non tutti gli articoli sono stati inviati. Impossibile generare il PDF.");
          newWindow.close();
      }

    } catch (error: any) {
      console.error('Errore durante l\'aggiornamento dello stato o la generazione del PDF:', error);
      notifications.showError(`Errore: ${error.message || 'Errore sconosciuto'}. L\'anteprima potrebbe non essere disponibile.`);
      newWindow.close(); // Close the window if an error occurs
    }
  };

  const handleDirectPrint = async (ordine: OrdineAcquisto) => {
    console.log(`[TabellaOrdiniAcquisto] handleDirectPrint chiamato per ordine: ${ordine.numero_ordine}, stato attuale: ${ordine.stato}`);
    
    notifications.showInfo('Aggiornamento stato ordine in corso. Il PDF verrà scaricato automaticamente.');

    try {
      const { data: fetchedOrderData, error: fetchError } = await supabase
        .from('ordini_acquisto')
        .select('*, fornitori(nome, tipo_fornitore, considera_iva)') // AGGIUNTO: considera_iva
        .eq('id', ordine.id)
        .single();

      if (fetchError || !fetchedOrderData) {
        console.error('[TabellaOrdiniAcquisto] Errore durante il fetch dell\'ordine:', fetchError);
        notifications.showError("Errore nel recupero dell'ordine dal database.");
        return;
      }

      let orderToProcess: OrdineAcquisto = {
        ...fetchedOrderData,
        fornitore_nome: fetchedOrderData.fornitori?.nome || 'N/A',
        fornitore_tipo: fetchedOrderData.fornitori?.tipo_fornitore || 'N/A',
        articoli: (fetchedOrderData.articoli || []) as ArticoloOrdineAcquisto[],
      };

      // DEBUG LOG: Log the order data before passing to PDF export
      console.log("[TabellaOrdiniAcquisto] Dati ordine (orderToProcess) prima dell'esportazione PDF (Download):", JSON.stringify(orderToProcess, null, 2));


      let updatedArticles = [...orderToProcess.articoli];
      let newMainOrderStatus = orderToProcess.stato;
      let needsDbUpdate = false;

      if (orderToProcess.stato === 'in_attesa') {
        newMainOrderStatus = 'inviato';
        needsDbUpdate = true;
        updatedArticles = updatedArticles.map(art => ({ 
          ...art, 
          stato: art.stato === 'in_attesa' ? 'inviato' : art.stato 
        }));
        notifications.showInfo(`Stato ordine '${orderToProcess.numero_ordine}' aggiornato a 'Inviato'.`);
      } else {
        const articlesToUpdate = updatedArticles.filter(art => art.stato === 'in_attesa');
        if (articlesToUpdate.length > 0) {
          needsDbUpdate = true;
          updatedArticles = updatedArticles.map(art => ({ 
            ...art, 
            stato: art.stato === 'in_attesa' ? 'inviato' : art.stato 
          }));
          notifications.showInfo(`Stato di alcuni articoli dell'ordine '${orderToProcess.numero_ordine}' aggiornato a 'Inviato'.`);
        }
      }

      if (needsDbUpdate) {
        const { data: updatedOrderData, error: updateError } = await supabase
          .from('ordini_acquisto')
          .update({ stato: newMainOrderStatus, articoli: updatedArticles as any, updated_at: new Date().toISOString() })
          .eq('id', ordine.id)
          .select('*, fornitori(nome, tipo_fornitore, considera_iva)') // AGGIUNTO: considera_iva
          .single();

        if (updateError || !updatedOrderData) {
          console.error('[TabellaOrdiniAcquisto] Errore nell\'aggiornamento dello stato:', updateError);
          notifications.showError("Errore nell'aggiornamento dello stato dell'ordine o degli articoli.");
          return;
        }
        orderToProcess = {
          ...updatedOrderData,
          fornitore_nome: updatedOrderData.fornitori?.nome || 'N/A',
          fornitore_tipo: updatedOrderData.fornitori?.tipo_fornitore || 'N/A',
          articoli: (updatedOrderData.articoli || []) as ArticoloOrdineAcquisto[],
        };
      }

      const allArticlesSent = orderToProcess.articoli.every(art => 
        art.stato === 'inviato' || art.stato === 'confermato' || art.stato === 'ricevuto'
      );

      if (allArticlesSent) {
        console.log(`[TabellaOrdiniAcquisto] Scaricando PDF per ordine: ${orderToProcess.numero_ordine}`);
        exportOrdineAcquistoPDF(orderToProcess, fornitori, clienti, 'ordini-acquisto', false, null);
      } else {
        notifications.showError("Non tutti gli articoli sono stati inviati. Impossibile generare il PDF.");
      }

    } catch (error: any) {
      console.error('Errore durante l\'aggiornamento dello stato o il download del PDF:', error);
      notifications.showError(`Errore: ${error.message || 'Errore sconosciuto'}. Il download potrebbe non essere disponibile.`);
    }
  };

  const groupedRows = ordini.map(order => {
    const fornitore = fornitori.find(f => f.id === order.fornitore_id);
    const isCartoneFornitore = fornitore?.tipo_fornitore === 'Cartone';
    const isExpanded = expandedOrders.has(order.id!); 

    const articles: DisplayRow[] = (order.articoli && order.articoli.length > 0)
      ? order.articoli
          .map((article, index) => {
            return {
              ...article,
              orderId: order.id!,
              orderNumeroOrdine: order.numero_ordine,
              orderFornitoreNome: order.fornitore_nome!,
              orderDataOrdine: order.data_ordine,
              orderStato: order.stato,
              orderImportoTotale: order.importo_totale || 0,
              orderNote: order.note || '',
              isFirstArticleOfOrder: index === 0,
              isLastArticleOfOrder: index === order.articoli!.length - 1,
              parentOrder: order,
              isCartoneFornitore: isCartoneFornitore,
              codice_ctn: article.codice_ctn || '',
              descrizione: article.descrizione || '',
              tipologia_cartone: article.tipologia_cartone || '',
              formato: article.formato || '',
              grammatura: article.grammatura || '',
              peso_cartone_kg: article.peso_cartone_kg || 0, 
              cliente: article.cliente || '',
              lavoro: article.lavoro || '',
              data_consegna_prevista: article.data_consegna_prevista || '',
              stato: article.stato,
            };
          })
          .sort((a, b) => {
            const statusOrder = {
              'in_attesa': 1,
              'inviato': 2,
              'confermato': 3,
              'ricevuto': 4,
              'annullato': 5,
            };

            const statusA = statusOrder[a.stato] || 99;
            const statusB = statusOrder[b.stato] || 99;

            if (statusA !== statusB) {
              return statusA - statusB;
            }

            if (a.isCartoneFornitore) {
              return (a.codice_ctn || '').localeCompare(b.codice_ctn || '');
            } else {
              return (a.descrizione || '').localeCompare(b.descrizione || '');
            }
          })
      : [{
          quantita: 0, prezzo_unitario: 0, stato: 'in_attesa',
          orderId: order.id!, orderNumeroOrdine: order.numero_ordine, orderFornitoreNome: order.fornitore_nome!,
          orderDataOrdine: order.data_ordine,
          orderStato: order.stato, orderImportoTotale: order.importo_totale || 0, orderNote: order.note || '',
          isFirstArticleOfOrder: true, isLastArticleOfOrder: true, parentOrder: order,
          isCartoneFornitore: isCartoneFornitore,
          codice_ctn: '', descrizione: 'Nessun articolo', tipologia_cartone: '', formato: '', grammatura: '',
          peso_cartone_kg: 0, cliente: '', lavoro: '', data_consegna_prevista: '',
          numero_fogli: 0, // Default for numero_fogli
        }];
    return { order, articles, isExpanded };
  });

  return (
    <ScrollArea className="w-full rounded-md border">
      <div className="w-full min-w-max">
        <table id="tab-ordini-acquisto" className="w-full border-collapse text-xs table-auto">
          <thead>
            <tr className="bg-[hsl(210,40%,98%)] border-b-2 border-[hsl(var(--border))]">
              <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold w-[30px]"></th>
              <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold w-[100px]">Numero Ordine</th>
              <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold w-[80px]">Data Ordine</th>
              <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold w-[120px]">Fornitore</th>
              <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold w-[80px]">Stato Articolo</th>
              <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold w-[200px]">Articolo Dettagli</th>
              <th className="px-2 py-2 text-right text-[10px] sm:text-xs font-semibold w-[60px]">Quantità</th> {/* Changed to Quantità */}
              <th className="px-2 py-2 text-right text-[10px] sm:text-xs font-semibold w-[80px]">P. Unit.</th>
              <th className="px-2 py-2 text-right text-[10px] sm:text-xs font-semibold w-[80px]">Tot. Riga</th>
              <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold w-[100px]">Consegna Prevista</th>
              <th className="px-2 py-2 text-right text-[10px] sm:text-xs font-semibold w-[100px]">Importo Totale</th>
              <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold w-[150px]">Note Ordine</th>
              <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-semibold w-[150px]">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {groupedRows.map(({ order, articles, isExpanded }) => {
              const visibleArticles = isExpanded ? articles : [articles[0]];
              const rowSpanValue = visibleArticles.length;

              return (
                <React.Fragment key={order.id}>
                  {visibleArticles.map((row, idx) => (
                    <tr key={`${row.orderId}-${row.id || idx}`} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(210,40%,98%)] transition-colors">
                      {idx === 0 && (
                        <>
                          <td rowSpan={rowSpanValue} className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap w-[30px] text-center">
                            {articles.length > 1 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => toggleOrderExpansion(order.id!)}
                                className="h-7 w-7 sm:h-8 sm:w-8"
                                title={isExpanded ? "Comprimi articoli" : "Espandi articoli"}
                              >
                                {isExpanded ? <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4" /> : <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" />}
                              </Button>
                            )}
                          </td>
                          <td rowSpan={rowSpanValue} className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap w-[100px]">
                            <span className="codice">{row.orderNumeroOrdine}</span>
                          </td>
                          <td rowSpan={rowSpanValue} className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap w-[80px]">{formatData(row.orderDataOrdine)}</td>
                          <td rowSpan={rowSpanValue} className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap w-[120px] font-bold">{row.orderFornitoreNome}</td>
                        </>
                      )}
                      <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap w-[80px]">
                        <span className={`inline-block px-2 py-1 rounded-full text-[10px] font-semibold ${getStatoBadgeClass(row.stato)}`}>
                          {getStatoText(row.stato)}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-[10px] sm:text-xs w-[200px] max-w-[200px] break-words">
                        {row.isCartoneFornitore ? (
                          <>
                            {row.codice_ctn && <div className="font-bold mb-1"><span className="codice">{row.codice_ctn}</span></div>}
                            {row.tipologia_cartone && <div className="mb-1 font-bold">Tipologia: {row.tipologia_cartone}</div>}
                            {row.formato && <div className="mb-1 font-bold">Formato: {formatFormato(row.formato)}</div>}
                            {row.grammatura && <div className="mb-1 font-bold">Grammatura: {formatGrammatura(row.grammatura)}</div>}
                            {row.numero_fogli !== undefined && <div className="mb-1 font-bold">Fogli: {row.numero_fogli.toLocaleString('it-IT')}</div>} {/* Display numero_fogli */}
                            {row.cliente && <div className="mb-1 font-bold">Cliente: {row.cliente}</div>}
                            {row.lavoro && <div className="mb-1 font-bold">Lavoro: {row.lavoro}</div>}
                          </>
                        ) : (
                          <>
                            <div className="font-bold">{row.descrizione || 'N/A'}</div>
                          </>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-right text-[10px] sm:text-xs whitespace-nowrap w-[60px] font-bold">
                        {row.quantita.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} {row.isCartoneFornitore ? 'Kg' : ''} {/* Show Kg for cartone */}
                      </td>
                      <td className="px-2 py-1.5 text-right text-[10px] sm:text-xs whitespace-nowrap w-[80px]">
                        {row.prezzo_unitario.toFixed(3)} {row.isCartoneFornitore ? '€/kg' : '€'}
                      </td>
                      <td className="px-2 py-1.5 text-right text-[10px] sm:text-xs whitespace-nowrap w-[80px] font-bold">
                        {(row.quantita * row.prezzo_unitario).toFixed(2)} €
                      </td>
                      <td className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap w-[100px]">
                        {row.data_consegna_prevista ? <span className="font-bold">{formatData(row.data_consegna_prevista)}</span> : '-'}
                      </td>
                      {idx === 0 && (
                        <>
                          <td rowSpan={rowSpanValue} className="px-2 py-1.5 text-right text-[10px] sm:text-xs whitespace-nowrap w-[100px] font-bold">
                            {row.orderImportoTotale.toFixed(2)} €
                          </td>
                          <td rowSpan={rowSpanValue} className="px-2 py-1.5 text-[10px] sm:text-xs max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap w-[150px]">{row.orderNote || '-'}</td>
                          <td rowSpan={rowSpanValue} className="px-2 py-1.5 text-[10px] sm:text-xs whitespace-nowrap w-[150px]">
                            <div className="flex gap-1.5">
                              <Button
                                variant="default"
                                size="icon"
                                onClick={() => { onEdit(row.parentOrder); }}
                                className="h-7 w-7 sm:h-8 sm:w-8 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary-dark))]"
                                title="Modifica Ordine"
                                disabled={row.orderStato === 'annullato'}
                              >
                                <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                              <Button
                                variant="default"
                                size="icon"
                                onClick={() => onDuplicateAndEdit(row.parentOrder)}
                                className="h-7 w-7 sm:h-8 sm:w-8 bg-blue-500 hover:bg-blue-600 text-white"
                                title="Duplica e Modifica Ordine"
                              >
                                <CopyPlus className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handlePreviewPdfAndUpdateStatus(row.parentOrder)} 
                                className="h-7 w-7 sm:h-8 sm:w-8 bg-blue-100 text-blue-700 hover:bg-blue-200"
                                title="Visualizza Anteprima PDF" 
                              >
                                <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleDirectPrint(row.parentOrder)} 
                                className="h-7 w-7 sm:h-8 sm:w-8 bg-green-100 text-green-700 hover:bg-green-200"
                                title="Scarica PDF Direttamente" 
                              >
                                <Printer className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                              {row.orderStato === 'annullato' ? (
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  onClick={() => handleActionClick(row.parentOrder, 'delete')}
                                  className="h-7 w-7 sm:h-8 sm:w-8"
                                  title="Elimina Definitivamente Ordine"
                                >
                                  <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                </Button>
                              ) : (
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  onClick={() => handleActionClick(row.parentOrder, 'cancel')}
                                  className="h-7 w-7 sm:h-8 sm:w-8 bg-red-100 text-red-700 hover:bg-red-200"
                                  title="Annulla Ordine"
                                >
                                  <XCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <ScrollBar orientation="horizontal" />

      <AlertDialog open={isActionAlertOpen} onOpenChange={setIsActionAlertOpen}>
        <AlertDialogContent className="sm:max-w-[425px]">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === 'cancel' ? 'Conferma Annullamento Ordine' : 'Conferma Eliminazione Definitiva'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === 'cancel' ? (
                <>Sei sicuro di voler annullare l'ordine d'acquisto <strong>{ordineToActOn?.numero_ordine}</strong>?
                Questa azione imposterà lo stato dell'ordine su "Annullato" e rimuoverà gli articoli correlati dagli ordini in arrivo.</>
              ) : (
                <>Sei sicuro di voler eliminare definitivamente l'ordine d'acquisto <strong>{ordineToActOn?.numero_ordine}</strong>?
                Questa azione non può essere annullata e rimuoverà l'ordine e tutti i suoi articoli dal database.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmAction} 
              className={actionType === 'cancel' ? 'bg-destructive hover:bg-destructive/90' : 'bg-destructive hover:bg-destructive/90'}
            >
              {actionType === 'cancel' ? 'Annulla Ordine' : 'Elimina Definitivamente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ScrollArea>
  );
}