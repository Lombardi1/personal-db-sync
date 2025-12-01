import { supabase } from '@/lib/supabase';
import { OrdineAcquisto, ArticoloOrdineAcquisto, Fornitore, Cliente, Cartone, Fustella } from '@/types';
import * as notifications from './notifications'; // Aggiornato a percorso relativo
import { generateNextCartoneCode } from './cartoneUtils';
import { generateNextFscCommessa, resetFscCommessaGenerator } from './fscUtils'; // Importa le utilità FSC
import { generateNextFustellaCode, resetFustellaCodeGenerator } from './fustellaUtils'; // Importa le utilità Fustella
import { generateNextPulitoreCode, resetPulitoreCodeGenerator } from './pulitoreUtils'; // Importa le utilità Pulitore

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
    const fornitoreFustelle = fornitori.find(f => f.tipo_fornitore === 'Fustelle'); // NUOVO: Fornitore Fustelle
    const randomCliente = clienti[Math.floor(Math.random() * clienti.length)];

    // Pulisci le tabelle prima di inserire i dati di test
    await supabase.from('ordini').delete().neq('codice', 'NON_ESISTENTE'); // Elimina tutti
    await supabase.from('giacenza').delete().neq('codice', 'NON_ESISTENTE'); // Elimina tutti
    await supabase.from('esauriti').delete().neq('codice', 'NON_ESISTENTE'); // Elimina tutti
    await supabase.from('storico').delete().neq('codice', 'NON_ESISTENTE'); // Pulisci anche lo storico
    await supabase.from('ordini_acquisto').delete().neq('numero_ordine', 'NON_ESISTENTE'); // Elimina tutti
    await supabase.from('fustelle').delete().neq('codice', 'NON_ESISTENTE'); // NUOVO: Pulisci anche le fustelle
    await supabase.from('polimeri').delete().neq('codice', 'NON_ESISTENTE'); // NUOVO: Pulisci anche i polimeri

    // Inizializza i generatori di codici per i dati di test
    resetFscCommessaGenerator(31, 2024); // Inizia da 31 per generare 32/24
    resetFustellaCodeGenerator(0); // Inizializza generatore Fustella
    resetPulitoreCodeGenerator(0); // Inizializza generatore Pulitore
    
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
            item_type: 'cartone',
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
            fsc: true, // Aggiunto
            alimentare: false, // Aggiunto
            rif_commessa_fsc: generateNextFscCommessa(2024), // Genera rif_commessa_fsc
          },
          {
            item_type: 'cartone',
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
            fsc: false, // Aggiunto
            alimentare: true, // Aggiunto
            rif_commessa_fsc: '', // Non FSC, quindi vuoto
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
            item_type: 'altro',
            descrizione: 'Inchiostro Cyan 1kg',
            quantita: 5,
            prezzo_unitario: 25.00,
            data_consegna_prevista: '2024-07-20',
            stato: 'in_attesa',
          },
          {
            item_type: 'altro',
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
            item_type: 'cartone',
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
            fsc: true, // Aggiunto
            alimentare: true, // Aggiunto
            rif_commessa_fsc: generateNextFscCommessa(2024), // Genera rif_commessa_fsc
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
            item_type: 'cartone',
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
            fsc: false, // Aggiunto
            alimentare: false, // Aggiunto
            rif_commessa_fsc: '', // Non FSC, quindi vuoto
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
            item_type: 'cartone',
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
            fsc: true, // Aggiunto
            alimentare: false, // Aggiunto
            rif_commessa_fsc: generateNextFscCommessa(2024), // Genera rif_commessa_fsc
          },
          {
            item_type: 'cartone',
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
            fsc: false, // Aggiunto
            alimentare: false, // Aggiunto
            rif_commessa_fsc: '', // Non FSC, quindi vuoto
          },
        ],
      });
    }

    // NUOVO: Aggiungi un ordine di Fustelle
    if (fornitoreFustelle && randomCliente) {
      const fustella1Code = generateNextFustellaCode();
      const pulitore1Code = generateNextPulitoreCode();
      const fustella2Code = generateNextFustellaCode();
      
      ordersToInsert.push({
        fornitore_id: fornitoreFustelle.id!,
        data_ordine: '2024-07-15',
        numero_ordine: `PO-2024-006`,
        stato: 'in_attesa',
        importo_totale: 0,
        note: 'Ordine di nuove fustelle per produzione',
        articoli: [
          {
            item_type: 'fustella',
            fustella_codice: fustella1Code,
            codice_fornitore_fustella: 'F-12345',
            fustellatrice: 'Bobst 102',
            resa_fustella: '1/1',
            quantita: 1, // Quantità per fustella
            prezzo_unitario: 250.00,
            cliente: randomCliente.nome,
            lavoro: 'LAV-2024-F01',
            data_consegna_prevista: '2024-08-01',
            stato: 'in_attesa',
            pulitore_codice_fustella: pulitore1Code, // Collega il pulitore alla fustella
            pinza_tagliata: true,
            tasselli_intercambiabili: false,
            nr_tasselli: null,
            incollatura: false,
            incollatrice: null,
            tipo_incollatura: null,
          },
          {
            item_type: 'pulitore', // Articolo pulitore separato
            codice_pulitore: pulitore1Code,
            descrizione: `Pulitore per Fustella ${fustella1Code}`,
            quantita: 1,
            prezzo_unitario: 50.00, // Prezzo per il pulitore
            cliente: randomCliente.nome,
            lavoro: 'LAV-2024-F01',
            data_consegna_prevista: '2024-08-01',
            stato: 'in_attesa',
            fustella_parent_index: 0, // Riferimento all'indice della fustella padre nell'array articoli
          },
          {
            item_type: 'fustella',
            fustella_codice: fustella2Code,
            codice_fornitore_fustella: 'F-67890',
            fustellatrice: 'Bobst 142',
            resa_fustella: '1/2',
            quantita: 1,
            prezzo_unitario: 320.00,
            cliente: randomCliente.nome,
            lavoro: 'LAV-2024-F02',
            data_consegna_prevista: '2024-08-05',
            stato: 'inviato',
            pulitore_codice_fustella: null, // Questa fustella non ha un pulitore associato
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
          return sum + (qty * price);
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

      if (fornitoreTipo === 'Cartone' && (newOrdine.stato === 'confermato' || newOrdine.stato === 'ricevuto' || newOrdine.stato === 'in_attesa' || newOrdine.stato === 'inviato')) { // Aggiunto 'inviato'
        for (const articolo of articoli) {
          if (articolo.item_type !== 'cartone') continue; // Process only cartone articles

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
            fogli: articolo.numero_fogli || 0, // Usa numero_fogli
            cliente: articolo.cliente || 'N/A',
            lavoro: articolo.lavoro || 'N/A',
            magazzino: '-',
            prezzo: articolo.prezzo_unitario || 0,
            data_consegna: articolo.data_consegna_prevista,
            note: ordineData.note || '-',
            fsc: articolo.fsc, // Aggiunto
            alimentare: articolo.alimentare, // Aggiunto
            rif_commessa_fsc: articolo.rif_commessa_fsc, // Aggiunto
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
        } else if (fornitoreTipo === 'Fustelle' && (newOrdine.stato === 'confermato' || newOrdine.stato === 'ricevuto' || newOrdine.stato === 'in_attesa' || newOrdine.stato === 'inviato')) {
          for (const articolo of articoli) {
            if (articolo.item_type !== 'fustella') continue; // Process only fustella articles here

            const fustellaCodice = articolo.fustella_codice;
            if (!fustellaCodice) {
              console.warn(`Articolo dell'ordine d'acquisto ${newOrdine.numero_ordine} senza codice Fustella. Saltato.`);
              continue;
            }

            if (articolo.stato === 'annullato') {
              console.log(`Articolo Fustella ${fustellaCodice} dell'ordine ${newOrdine.numero_ordine} è annullato, non inserito in magazzino.`);
              continue;
            }

            const fustella: Fustella = {
              codice: fustellaCodice,
              fornitore: fornitoreFustelle!.nome,
              codice_fornitore: articolo.codice_fornitore_fustella || null,
              cliente: articolo.cliente || 'N/A',
              lavoro: articolo.lavoro || 'N/A',
              fustellatrice: articolo.fustellatrice || null,
              resa: articolo.resa_fustella || null,
              pulitore_codice: articolo.pulitore_codice_fustella || null, // Usa il codice pulitore dall'articolo
              pinza_tagliata: articolo.pinza_tagliata || false,
              tasselli_intercambiabili: articolo.tasselli_intercambiabili || false,
              nr_tasselli: articolo.nr_tasselli || null,
              incollatura: articolo.incollatura || false,
              incollatrice: articolo.incollatrice || null,
              tipo_incollatura: articolo.tipo_incollatura || null,
              disponibile: articolo.stato === 'ricevuto', // Disponibile solo se lo stato è 'ricevuto'
              data_creazione: new Date().toISOString(),
              ultima_modifica: new Date().toISOString(),
              ordine_acquisto_numero: newOrdine.numero_ordine, // Collega all'ordine d'acquisto
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

    notifications.showSuccess('✅ Ordini d\'acquisto di test generati con successo!');
  } catch (error: any) {
    console.error('Errore durante la generazione degli ordini di test:', error);
    notifications.showError(`Errore generazione ordini di test: ${error.message}`);
  }
}