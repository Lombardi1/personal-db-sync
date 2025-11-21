import { supabase } from '@/lib/supabase';
import { OrdineAcquisto, ArticoloOrdineAcquisto, Fornitore, Cliente, Cartone } from '@/types';
import * as notifications from './notifications'; // Aggiornato a percorso relativo
import { generateNextCartoneCode } from './cartoneUtils';

export async function seedPurchaseOrders() {
  notifications.showInfo('Generazione ordini d\'acquisto di test in corso...');

  try {
    const { data: fornitori, error: fornitoriError } = await supabase.from('fornitori').select('id, nome, tipo_fornitore');
    const { data: clienti, error: clientiError } = await supabase.from('clienti').select('id, nome');

    if (fornitoriError || clientiError) {
      throw new Error(fornitoriError?.message || clientiError?.message);
    }

    if (!fornitori || fornitori.length === 0) {
      notifications.showError('Nessun fornitore trovato. Aggiungi prima dei fornitori.');
      return;
    }
    if (!clienti || clienti.length === 0) {
      notifications.showError('Nessun cliente trovato. Aggiungi prima dei clienti.');
      return;
    }

    const fornitoreCartone = fornitori.find(f => f.tipo_fornitore === 'Cartone');
    const fornitoreInchiostro = fornitori.find(f => f.tipo_fornitore === 'Inchiostro');
    const randomCliente = clienti[Math.floor(Math.random() * clienti.length)];

    // Pulisci le tabelle prima di inserire i dati di test
    await supabase.from('ordini').delete().neq('codice', 'NON_ESISTENTE'); // Elimina tutti
    await supabase.from('giacenza').delete().neq('codice', 'NON_ESISTENTE'); // Elimina tutti
    await supabase.from('esauriti').delete().neq('codice', 'NON_ESISTENTE'); // Elimina tutti
    await supabase.from('storico').delete().neq('codice', 'NON_ESISTENTE'); // Pulisci anche lo storico
    await supabase.from('ordini_acquisto').delete().neq('numero_ordine', 'NON_ESISTENTE'); // Elimina tutti

    const ordersToInsert: (Omit<OrdineAcquisto, 'id' | 'created_at' | 'fornitore_nome' | 'fornitore_tipo'> & { articoli: ArticoloOrdineAcquisto[] })[] = [];

    if (fornitoreCartone && randomCliente) {
      ordersToInsert.push({
        fornitore_id: fornitoreCartone.id!,
        data_ordine: '2024-07-01',
        numero_ordine: `PO-2024-001`,
        stato: 'confermato',
        importo_totale: 0,
        note: 'Ordine di cartoni per cliente Alpha',
        articoli: [
          {
            codice_ctn: generateNextCartoneCode(),
            tipologia_cartone: 'Ondulato Triplo',
            formato: '120 x 80 cm',
            grammatura: '350 g/m²',
            quantita: 1000,
            prezzo_unitario: 1.85,
            cliente: randomCliente.nome,
            lavoro: 'LAV-2024-001',
            data_consegna_prevista: '2024-07-15',
            stato: 'confermato',
            numero_fogli: 1000, // Aggiunto numero_fogli
          },
          {
            codice_ctn: generateNextCartoneCode(),
            tipologia_cartone: 'Microonda Bianco',
            formato: '70 x 100 cm',
            grammatura: '200 g/m²',
            quantita: 2500,
            prezzo_unitario: 1.20,
            cliente: randomCliente.nome,
            lavoro: 'LAV-2024-002',
            data_consegna_prevista: '2024-07-18',
            stato: 'confermato',
            numero_fogli: 2500, // Aggiunto numero_fogli
          },
        ],
      });
    }

    if (fornitoreInchiostro) {
      ordersToInsert.push({
        fornitore_id: fornitoreInchiostro.id!,
        data_ordine: '2024-07-05',
        numero_ordine: `PO-2024-002`,
        stato: 'in_attesa',
        importo_totale: 0,
        note: 'Rifornimento inchiostri CMYK',
        articoli: [
          {
            descrizione: 'Inchiostro Cyan 1kg',
            quantita: 5,
            prezzo_unitario: 25.00,
            data_consegna_prevista: '2024-07-20',
            stato: 'in_attesa',
          },
          {
            descrizione: 'Inchiostro Magenta 1kg',
            quantita: 5,
            prezzo_unitario: 25.00,
            data_consegna_prevista: '2024-07-20',
            stato: 'in_attesa',
          },
        ],
      });
    }

    if (fornitoreCartone && randomCliente) {
      ordersToInsert.push({
        fornitore_id: fornitoreCartone.id!,
        data_ordine: '2024-06-20',
        numero_ordine: `PO-2024-003`,
        stato: 'ricevuto',
        importo_totale: 0,
        note: 'Ordine urgente di cartoni speciali',
        articoli: [
          {
            codice_ctn: generateNextCartoneCode(),
            tipologia_cartone: 'Cartone Speciale',
            formato: '80 x 120 cm',
            grammatura: '450 g/m²',
            quantita: 500,
            prezzo_unitario: 2.50,
            cliente: randomCliente.nome,
            lavoro: 'LAV-2024-003',
            data_consegna_prevista: '2024-07-01',
            stato: 'ricevuto',
            numero_fogli: 500, // Aggiunto numero_fogli
          },
        ],
      });
    }

    if (fornitoreCartone && randomCliente) {
      ordersToInsert.push({
        fornitore_id: fornitoreCartone.id!,
        data_ordine: '2024-07-10',
        numero_ordine: `PO-2024-004`,
        stato: 'in_attesa',
        importo_totale: 0,
        note: 'Ordine di cartoni in attesa di conferma',
        articoli: [
          {
            codice_ctn: generateNextCartoneCode(),
            tipologia_cartone: 'Ondulato Semplice',
            formato: '60 x 80 cm',
            grammatura: '180 g/m²',
            quantita: 1200,
            prezzo_unitario: 0.90,
            cliente: randomCliente.nome,
            lavoro: 'LAV-2024-004',
            data_consegna_prevista: '2024-07-25',
            stato: 'in_attesa',
            numero_fogli: 1200, // Aggiunto numero_fogli
          },
        ],
      });
    }

    for (const order of ordersToInsert) {
      const totalAmount = order.articoli.reduce((sum, item) => {
        const qty = item.quantita || 0;
        const price = item.prezzo_unitario || 0;
        return sum + (qty * price);
      }, 0);
      order.importo_totale = totalAmount;

      const { articoli, ...ordineData } = order;

      const { data: newOrdine, error: ordineError } = await supabase
        .from('ordini_acquisto')
        .insert([{ ...ordineData, articoli: articoli as any }])
        .select(`
          *,
          fornitori ( nome, tipo_fornitore )
        `)
        .single();

      if (ordineError) {
        console.error(`Errore inserimento ordine ${ordineData.numero_ordine}:`, ordineError);
        notifications.showError(`Errore inserimento ordine ${ordineData.numero_ordine}: ${ordineError.message}`);
        continue;
      }

      if (newOrdine.fornitori?.tipo_fornitore === 'Cartone' && (newOrdine.stato === 'confermato' || newOrdine.stato === 'ricevuto' || newOrdine.stato === 'in_attesa' || newOrdine.stato === 'inviato')) { // Aggiunto 'inviato'
        for (const articolo of articoli) {
          const codiceCtn = articolo.codice_ctn; 
          if (!codiceCtn) {
            console.warn(`Articolo dell'ordine d'acquisto ${newOrdine.numero_ordine} senza codice CTN. Saltato.`);
            continue; 
          }

          const cartone: Cartone = {
            codice: codiceCtn,
            fornitore: fornitoreCartone!.nome,
            ordine: newOrdine.numero_ordine,
            tipologia: articolo.tipologia_cartone || articolo.descrizione || 'N/A',
            formato: articolo.formato || 'N/A',
            grammatura: articolo.grammatura || 'N/A',
            fogli: articolo.numero_fogli || 0, // Usa numero_fogli
            cliente: articolo.cliente || 'N/A',
            lavoro: articolo.lavoro || 'N/A',
            magazzino: '-',
            prezzo: articolo.prezzo_unitario,
            data_consegna: articolo.data_consegna_prevista,
            confermato: newOrdine.stato === 'confermato' || newOrdine.stato === 'ricevuto',
            note: ordineData.note || '-'
          };
          
          // Inserisci in 'ordini' solo se lo stato dell'articolo non è 'ricevuto'
          if (articolo.stato !== 'ricevuto') {
            const { error: cartoneError } = await supabase.from('ordini').insert([cartone]);
            if (cartoneError) {
              console.error(`Errore aggiunta cartone ${codiceCtn} a ordini in arrivo:`, cartoneError);
              notifications.showError(`Errore aggiunta cartone ${codiceCtn} a ordini in arrivo.`);
            }
          } else {
            // Se lo stato è 'ricevuto', inserisci direttamente in 'giacenza'
            const { error: giacenzaError } = await supabase.from('giacenza').insert([{
              ...cartone,
              ddt: 'SEED-DDT', // Valore di esempio per DDT
              data_arrivo: new Date().toISOString().split('T')[0], // Data di arrivo odierna
              magazzino: 'SEED-MAG', // Valore di esempio per magazzino
            }]);
            if (giacenzaError) {
              console.error(`Errore aggiunta cartone ${codiceCtn} a giacenza:`, giacenzaError);
              notifications.showError(`Errore aggiunta cartone ${codiceCtn} a giacenza.`);
            }
          }
        }
      }
    }

    notifications.showSuccess('✅ Ordini d\'acquisto di test generati con successo!');
  } catch (error: any) {
    console.error('Errore durante la generazione degli ordini di test:', error);
    notifications.showError(`Errore generazione ordini di test: ${error.message}`);
  }
}