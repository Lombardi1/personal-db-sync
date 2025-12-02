import { supabase } from '@/lib/supabase';
import { OrdineAcquisto, ArticoloOrdineAcquisto, Fornitore, Cliente, Cartone, Fustella } from '@/types';
import * as notifications from './notifications';
import { generateNextCartoneCode } from './cartoneUtils';
import { generateNextFscCommessa, resetFscCommessaGenerator } from './fscUtils';
import { findNextAvailableFustellaCode } from './fustellaUtils';
import { findNextAvailablePulitoreCode } from './pulitoreUtils'; // Importa la nuova funzione

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
    const fornitoreFustelle = fornitori.find(f => f.tipo_fornitore === 'Fustelle');
    const randomCliente = clienti[Math.floor(Math.random() * clienti.length)];

    // Pulisci le tabelle prima di inserire i dati di test
    await supabase.from('ordini').delete().neq('codice', 'NON_ESISTENTE');
    await supabase.from('giacenza').delete().neq('codice', 'NON_ESISTENTE');
    await supabase.from('esauriti').delete().neq('codice', 'NON_ESISTENTE');
    await supabase.from('storico').delete().neq('codice', 'NON_ESISTENTE');
    await supabase.from('ordini_acquisto').delete().neq('numero_ordine', 'NON_ESISTENTE');
    await supabase.from('fustelle').delete().neq('codice', 'NON_ESISTENTE');
    await supabase.from('polimeri').delete().neq('codice', 'NON_ESISTENTE');

    // Inizializza i generatori di codici per i dati di test
    resetFscCommessaGenerator(31, 2024);
    // Non è più necessario resettare un contatore globale per findNextAvailableFustellaCode
    // Non è più necessario resettare il generatore di codici pulitore qui, findNextAvailablePulitoreCode lo fa al momento della chiamata.
    
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
            numero_fogli: 1000,
            fsc: true,
            alimentare: false,
            rif_commessa_fsc: generateNextFscCommessa(2024),
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
            numero_fogli: 2500,
            fsc: false,
            alimentare: true,
            rif_commessa_fsc: '',
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
            numero_fogli: 500,
            fsc: true,
            alimentare: true,
            rif_commessa_fsc: generateNextFscCommessa(2024),
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
            numero_fogli: 1200,
            fsc: false,
            alimentare: false,
            rif_commessa_fsc: '',
          },
        ],
      });
    }

    // Aggiungi un ordine con un articolo annullato per test
    if (fornitoreCartone && randomCliente) {
      ordersToInsert.push({
        fornitore_id: fornitoreCartone.id!,
        data_ordine: '2024-07-12',
        numero_ordine: `PO-2024-005`,
        stato: 'inviato',
        importo_totale: 0, // Verrà ricalcolato
        note: 'Ordine con articolo annullato',
        articoli: [
          {
            codice_ctn: generateNextCartoneCode(),
            tipologia_cartone: 'Ondulato Doppio',
            formato: '100 x 140 cm',
            grammatura: '400 g/m²',
            quantita: 800,
            prezzo_unitario: 2.10,
            cliente: randomCliente.nome,
            lavoro: 'LAV-2024-005-A',
            data_consegna_prevista: '2024-07-28',
            stato: 'inviato',
            numero_fogli: 800,
            fsc: true,
            alimentare: false,
            rif_commessa_fsc: generateNextFscCommessa(2024),
          },
          {
            codice_ctn: generateNextCartoneCode(),
            tipologia_cartone: 'Ondulato Singolo',
            formato: '50 x 70 cm',
            grammatura: '150 g/m²',
            quantita: 300,
            prezzo_unitario: 0.75,
            cliente: randomCliente.nome,
            lavoro: 'LAV-2024-005-B',
            data_consegna_prevista: '2024-07-28',
            stato: 'annullato', // Questo articolo è annullato
            numero_fogli: 300,
            fsc: false,
            alimentare: false,
            rif_commessa_fsc: '',
          },
        ],
      });
    }

    // NUOVO: Aggiungi un ordine di Fustelle
    if (fornitoreFustelle && randomCliente) {
      ordersToInsert.push({
        fornitore_id: fornitoreFustelle.id!,
        data_ordine: '2024-07-15',
        numero_ordine: `PO-2024-006`,
        stato: 'in_attesa',
        importo_totale: 0,
        note: 'Ordine di nuove fustelle per produzione',
        articoli: [
          {
            fustella_codice: await findNextAvailableFustellaCode(),
            codice_fornitore_fustella: 'F-12345',
            fustellatrice: 'Bobst 102',
            resa_fustella: '1/1',
            quantita: 1,
            prezzo_unitario: 250.00,
            cliente: randomCliente.nome,
            lavoro: 'LAV-2024-F01',
            data_consegna_prevista: '2024-08-01',
            stato: 'in_attesa',
            hasPulitore: true,
            pulitore_codice_fustella: await findNextAvailablePulitoreCode(), // Usa la nuova funzione
            prezzo_pulitore: 50.00,
            pinza_tagliata: true,
            tasselli_intercambiabili: false,
            nr_tasselli: null,
            incollatura: false,
            incollatrice: null,
            tipo_incollatura: null,
          },
          {
            fustella_codice: await findNextAvailableFustellaCode(),
            codice_fornitore_fustella: 'F-67890',
            fustellatrice: 'Bobst 142',
            resa_fustella: '1/2',
            quantita: 1,
            prezzo_unitario: 320.00,
            cliente: randomCliente.nome,
            lavoro: 'LAV-2024-F02',
            data_consegna_prevista: '2024-08-05',
            stato: 'inviato',
            hasPulitore: false,
            pulitore_codice_fustella: null,
            prezzo_pulitore: undefined,
            pinza_tagliata: false,
            tasselli_intercambiabili: true,
            nr_tasselli: 4,
            incollatura: true,
            incollatrice: 'Bobst Masterfold',
            tipo_incollatura: 'Lineare',
          },
        ],
      });
    }


    for (const order of ordersToInsert) {
      // Ricalcola l'importo totale escludendo gli articoli annullati
      const totalAmount = order.articoli.reduce((sum, item) => {
        if (item.stato !== 'annullato') {
          const qty = item.quantita || 0;
          const price = item.prezzo_unitario || 0;
          const pulitorePrice = item.hasPulitore ? (item.prezzo_pulitore || 0) : 0;
          return sum + (qty * price) + pulitorePrice;
        }
        return sum;
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

      const fornitoreTipo = newOrdine.fornitori?.tipo_fornitore;

      if (fornitoreTipo === 'Cartone' && (newOrdine.stato === 'confermato' || newOrdine.stato === 'ricevuto' || newOrdine.stato === 'in_attesa' || newOrdine.stato === 'inviato')) {
        for (const articolo of articoli) {
          const codiceCtn = articolo.codice_ctn; 
          if (!codiceCtn) {
            console.warn(`Articolo dell'ordine d'acquisto ${newOrdine.numero_ordine} senza codice CTN. Saltato.`);
            continue; 
          }

          // Non inserire articoli annullati nelle tabelle di magazzino
          if (articolo.stato === 'annullato') {
            console.log(`Articolo ${codiceCtn} dell'ordine ${newOrdine.numero_ordine} è annullato, non inserito in magazzino.`);
            continue;
          }

          const cartone: Cartone = {
            codice: codiceCtn,
            fornitore: fornitoreCartone!.nome,
            ordine: newOrdine.numero_ordine,
            tipologia: articolo.tipologia_cartone || articolo.descrizione || 'N/A',
            formato: articolo.formato || 'N/A',
            grammatura: articolo.grammatura || 'N/A',
            fogli: articolo.numero_fogli || 0,
            cliente: articolo.cliente || 'N/A',
            lavoro: articolo.lavoro || 'N/A',
            magazzino: '-',
            prezzo: articolo.prezzo_unitario,
            data_consegna: articolo.data_consegna_prevista,
            note: ordineData.note || '-',
            fsc: articolo.fsc,
            alimentare: articolo.alimentare,
            rif_commessa_fsc: articolo.rif_commessa_fsc,
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
              ddt: 'SEED-DDT',
              data_arrivo: new Date().toISOString().split('T')[0],
              magazzino: 'SEED-MAG',
            }]);
            if (giacenzaError) {
              console.error(`Errore aggiunta cartone ${codiceCtn} a giacenza:`, giacenzaError);
              notifications.showError(`Errore aggiunta cartone ${codiceCtn} a giacenza.`);
            }
          }
        } else if (fornitoreTipo === 'Fustelle' && (newOrdine.stato === 'confermato' || newOrdine.stato === 'ricevuto' || newOrdine.stato === 'in_attesa' || newOrdine.stato === 'inviato')) {
          for (const articolo of articoli) {
            const fustellaCodice = articolo.fustella_codice;
            const pulitoreCodice = articolo.pulitore_codice_fustella;

            if (!fustellaCodice && !pulitoreCodice) {
              console.warn(`Articolo dell'ordine d'acquisto ${newOrdine.numero_ordine} senza codice Fustella o Pulitore. Saltato.`);
              continue;
            }

            if (articolo.stato === 'annullato') {
              console.log(`Articolo Fustella/Pulitore ${fustellaCodice || pulitoreCodice} dell'ordine ${newOrdine.numero_ordine} è annullato, non inserito in magazzino.`);
              continue;
            }

            if (fustellaCodice) { // Se è una fustella
              const fustella: Fustella = {
                codice: fustellaCodice,
                fornitore: fornitoreFustelle!.nome,
                codice_fornitore: articolo.codice_fornitore_fustella || null,
                cliente: articolo.cliente || 'N/A',
                lavoro: articolo.lavoro || 'N/A',
                fustellatrice: articolo.fustellatrice || null,
                resa: articolo.resa_fustella || null,
                pulitore_codice: articolo.pulitore_codice_fustella || null,
                pinza_tagliata: articolo.pinza_tagliata || false,
                tasselli_intercambiabili: articolo.tasselli_intercambiabili || false,
                nr_tasselli: articolo.nr_tasselli || null,
                incollatura: articolo.incollatura || false,
                incollatrice: articolo.incollatrice || null,
                tipo_incollatura: articolo.tipo_incollatura || null,
                disponibile: articolo.stato === 'ricevuto',
                data_creazione: new Date().toISOString(),
                ultima_modifica: new Date().toISOString(),
                ordine_acquisto_numero: newOrdine.numero_ordine,
              };

              const { error: fustellaError } = await supabase.from('fustelle').insert([fustella]);
              if (fustellaError) {
                console.error(`Errore aggiunta fustella ${fustellaCodice} a magazzino fustelle:`, fustellaError);
                notifications.showError(`Errore aggiunta fustella ${fustellaCodice} a magazzino fustelle.`);
              }
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