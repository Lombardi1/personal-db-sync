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
            tipo_articolo: 'cartone', // NUOVO
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
            tipo_articolo: 'cartone', // NUOVO
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
            tipo_articolo: 'altro', // NUOVO
            descrizione: 'Inchiostro Cyan 1kg',
            quantita: 5,
            prezzo_unitario: 25.00,
            data_consegna_prevista: '2024-07-20',
            stato: 'in_attesa',
          },
          {
            tipo_articolo: 'altro', // NUOVO
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
            tipo_articolo: 'cartone', // NUOVO
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
            tipo_articolo: 'cartone', // NUOVO
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
            tipo_articolo: 'cartone', // NUOVO
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
            tipo_articolo: 'cartone', // NUOVO
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

    // NUOVO: Aggiungi un ordine di Fustelle con un pulitore separato
    if (fornitoreFustelle && randomCliente) {
      const fustellaCodice1 = generateNextFustellaCode();
      const pulitoreCodice1 = generateNextPulitoreCode();
      const fustellaCodice2 = generateNextFustellaCode();
      const pulitoreCodice2 = generateNextPulitoreCode();

      ordersToInsert.push({
        fornitore_id: fornitoreFustelle.id!,
        data_ordine: '2024-07-15',
        numero_ordine: `PO-2024-006`,
        stato: 'in_attesa',
        importo_totale: 0,
        note: 'Ordine di nuove fustelle e pulitori per produzione',
        articoli: [
          {
            tipo_articolo: 'fustella', // NUOVO
            fustella_codice: fustellaCodice1,
            codice_fornitore_fustella: 'F-12345',
            fustellatrice: 'Bobst 102',
            resa_fustella: '1/1',
            quantita: 1, // Quantità per fustella
            prezzo_unitario: 250.00,
            cliente: randomCliente.nome,
            lavoro: 'LAV-2024-F01',
            data_consegna_prevista: '2024-08-01',
            stato: 'in_attesa',
            pinza_tagliata: true,
            tasselli_intercambiabili: false,
            nr_tasselli: null,
            incollatura: false,
            incollatrice: null,
            tipo_incollatura: null,
          },
          {
            tipo_articolo: 'pulitore', // NUOVO: Articolo pulitore separato
            pulitore_codice: pulitoreCodice1,
            parent_fustella_codice: fustellaCodice1, // Collega alla fustella precedente
            quantita: 1,
            prezzo_unitario: 50.00,
            data_consegna_prevista: '2024-08-01',
            stato: 'in_attesa',
            descrizione: `Pulitore per Fustella ${fustellaCodice1}`,
          },
          {
            tipo_articolo: 'fustella', // NUOVO
            fustella_codice: fustellaCodice2,
            codice_fornitore_fustella: 'F-67890',
            fustellatrice: 'Bobst 142',
            resa_fustella: '1/2',
            quantita: 1,
            prezzo_unitario: 320.00,
            cliente: randomCliente.nome,
            lavoro: 'LAV-2024-F02',
            data_consegna_prevista: '2024-08-05',
            stato: 'inviato',
            pinza_tagliata: false,
            tasselli_intercambiabili: true,
            nr_tasselli: 4,
            incollatura: true,
            incollatrice: 'Bobst Masterfold',
            tipo_incollatura: 'Lineare',
          },
          {
            tipo_articolo: 'pulitore', // NUOVO: Articolo pulitore separato
            pulitore_codice: pulitoreCodice2,
            parent_fustella_codice: fustellaCodice2, // Collega alla fustella precedente
            quantita: 1,
            prezzo_unitario: 60.00,
            data_consegna_prevista: '2024-08-05',
            stato: 'inviato',
            descrizione: `Pulitore per Fustella ${fustellaCodice2}`,
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
          if (articolo.tipo_articolo !== 'cartone') continue; // Processa solo articoli cartone
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
            prezzo: articolo.prezzo_unitario,
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
            if (articolo.stato === 'annullato') {
              console.log(`Articolo Fustella/Pulitore dell'ordine ${newOrdine.numero_ordine} è annullato, non inserito in magazzino.`);
              continue;
            }

            if (articolo.tipo_articolo === 'fustella') {
              const fustellaCodice = articolo.fustella_codice;
              if (!fustellaCodice) {
                console.warn(`Articolo dell'ordine d'acquisto ${newOrdine.numero_ordine} senza codice Fustella. Saltato.`);
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
                pulitore_codice: null, // Il pulitore è ora un articolo separato, quindi questo campo è null di default
                pinza_tagliata: articolo.pinza_tagliata || false,
                tasselli_intercambiabili: articolo.tasselli_intercambiabili || false,
                nr_tasselli: articolo.nr_tasselli || null,
                incollatura: articolo.incollatura || false,
                incollatrice: articolo.incollatrice || null,
                tipo_incollatura: articolo.tipo_incollatura || null,
                disponibile: articolo.stato === 'ricevuto', // Disponibile solo se lo stato è 'ricevuto'
                data_creazione: new Date().toISOString(), // Set creation date
                ultima_modifica: new Date().toISOString(), // Set modification date
                ordine_acquisto_numero: newOrdine.numero_ordine, // Link to purchase order
              };

              const { data: existingFustella, error: fetchFustellaError } = await supabase
                .from('fustelle')
                .select('codice, pulitore_codice') // Seleziona anche pulitore_codice per mantenerlo se già esistente
                .eq('codice', fustellaCodice)
                .single();

              if (fetchFustellaError && fetchFustellaError.code !== 'PGRST116') {
                toast.error(`Errore recupero fustella: ${fetchFustellaError.message}`);
                continue;
              }

              if (existingFustella) {
                // Se esiste, aggiorna, mantenendo il pulitore_codice esistente se non sovrascritto
                const fustellaToUpdate = { ...fustellaBase, pulitore_codice: existingFustella.pulitore_codice };
                const { error: updateError } = await supabase.from('fustelle').update(fustellaToUpdate).eq('codice', fustellaCodice);
                if (updateError) {
                  toast.error(`Errore aggiornamento fustella: ${updateError.message}`);
                }
              } else {
                // Se non esiste, inserisci
                const { error: insertError } = await supabase.from('fustelle').insert([fustellaBase]);
                if (insertError) {
                  toast.error(`Errore inserimento fustella: ${insertError.message}`);
                }
              }
            } else if (articolo.tipo_articolo === 'pulitore') {
              const pulitoreCodice = articolo.pulitore_codice;
              const parentFustellaCodice = articolo.parent_fustella_codice;

              if (!pulitoreCodice || !parentFustellaCodice) {
                console.warn(`[syncArticleInventoryStatus] Articolo pulitore senza codice o fustella padre. Saltato.`);
                continue;
              }

              if (articolo.stato === 'ricevuto') {
                // Quando un pulitore viene ricevuto, aggiorna il campo pulitore_codice nella fustella padre
                const { error: updateFustellaError } = await supabase
                  .from('fustelle')
                  .update({ pulitore_codice: pulitoreCodice, ultima_modifica: new Date().toISOString() })
                  .eq('codice', parentFustellaCodice);

                if (updateFustellaError) {
                  toast.error(`Errore aggiornamento pulitore_codice per fustella ${parentFustellaCodice}: ${updateFustellaError.message}`);
                } else {
                  console.log(`[syncArticleInventoryStatus] Pulitore '${pulitoreCodice}' ricevuto e associato a fustella '${parentFustellaCodice}'.`);
                }
              } else {
                // Se il pulitore non è ricevuto, assicurati che non sia associato alla fustella
                // (o che venga rimosso se lo stato cambia da ricevuto a non ricevuto)
                const { data: existingFustella, error: fetchFustellaError } = await supabase
                  .from('fustelle')
                  .select('pulitore_codice')
                  .eq('codice', parentFustellaCodice)
                  .single();
                
                if (!fetchFustellaError && existingFustella?.pulitore_codice === pulitoreCodice) {
                  const { error: clearPulitoreError } = await supabase
                    .from('fustelle')
                    .update({ pulitore_codice: null, ultima_modifica: new Date().toISOString() })
                    .eq('codice', parentFustellaCodice);
                  if (clearPulitoreError) {
                    toast.error(`Errore rimozione pulitore_codice per fustella ${parentFustellaCodice}: ${clearPulitoreError.message}`);
                  }
                }
              }
            }
          }
        }
      } catch (e: any) {
        toast.error(`Errore interno durante la sincronizzazione dell'articolo: ${e.message}`);
      }
    }
  }, []);

  // 2. Define loadOrdiniAcquisto early, as many functions call it.
  // It does not directly call syncArticleInventoryStatus or updateArticleStatusInOrder,
  // but it's called by functions that *do* call them.
  const loadOrdiniAcquisto = useCallback(async () => {
    setLoading(true);
    console.log('[useOrdiniAcquisto] Attempting to load purchase orders...');
    try {
      const { data: ordiniData, error: ordiniError } = await supabase
        .from('ordini_acquisto')
        .select(`
          *,
          fornitori ( nome, tipo_fornitore )
        `)
        .order('created_at', { ascending: false });

      if (ordiniError) {
        toast.error('Errore nel caricamento degli ordini d\'acquisto.');
        setOrdiniAcquisto([]);
        console.error('[useOrdiniAcquisto] Error loading purchase orders:', ordiniError);
        return;
      }

      if (!ordiniData || ordiniData.length === 0) {
        setOrdiniAcquisto([]);
        console.log('[useOrdiniAcquisto] No purchase orders found.');
        return;
      }
      console.log('[useOrdiniAcquisto] Purchase orders loaded:', ordiniData.length, 'items');

      const ordiniWithFornitoreInfo: OrdineAcquisto[] = ordiniData.map(ordine => ({
        ...ordine,
        fornitore_nome: ordine.fornitori?.nome || 'N/A',
        fornitore_tipo: ordine.fornitori?.tipo_fornitore || 'N/A',
        articoli: (ordine.articoli || []) as ArticoloOrdineAcquisto[],
      }));
      
      const sortedOrdini = [...ordiniWithFornitoreInfo].sort((a, b) => {
        const dateAUpdated = new Date(a.updated_at || a.created_at || 0).getTime();
        const dateBUpdated = new Date(b.updated_at || b.created_at || 0).getTime();

        if (dateAUpdated !== dateBUpdated) {
          return dateBUpdated - dateAUpdated;
        }

        const statusOrder = { 'in_attesa': 1, 'inviato': 2, 'confermato': 3, 'ricevuto': 4, 'annullato': 5 };
        const statusA = statusOrder[a.stato] || 99;
        const statusB = statusOrder[b.stato] || 99;

        if (statusA !== statusB) {
          return statusA - statusB;
        }

        const dateAOrder = new Date(a.data_ordine).getTime();
        const dateBOrder = new Date(b.data_ordine).getTime();
        return dateBOrder - dateAOrder;
      });

      setOrdiniAcquisto(sortedOrdini);
    } catch (error) {
      toast.error('Errore nel caricamento degli ordini d\'acquisto.');
      setOrdiniAcquisto([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 3. Define updateArticleStatusInOrder, which depends on syncArticleInventoryStatus and loadOrdiniAcquisto
  const updateArticleStatusInOrder = useCallback(async (orderNumeroOrdine: string, articleIdentifier: string, newArticleStatus: ArticoloOrdineAcquisto['stato']) => {
    console.log(`[useOrdiniAcquisto - updateArticleStatusInOrder] Inizio per OA: '${orderNumeroOrdine}', Articolo: '${articleIdentifier}', Nuovo stato: '${newArticleStatus}'`);

    // 1. Fetch the order without nested select for simplicity
    const { data: ordineAcquistoToUpdate, error: fetchError } = await supabase
      .from('ordini_acquisto')
      .select(`*`) // Simplified select
      .eq('numero_ordine', orderNumeroOrdine.trim())
      .single();

    if (fetchError || !ordineAcquistoToUpdate) {
      console.error(`[useOrdiniAcquisto - updateArticleStatusInOrder] Errore recupero ordine d'acquisto '${orderNumeroOrdine.trim()}':`, fetchError);
      toast.error(`Errore recupero ordine d'acquisto per aggiornamento articolo: ${fetchError?.message || 'Ordine non trovato o errore sconosciuto.'}`);
      return { success: false, error: fetchError };
    }
    console.log(`[useOrdiniAcquisto - updateArticleStatusInOrder] Ordine d'acquisto trovato:`, ordineAcquistoToUpdate);

    // 2. Find and update the specific article
    let updatedArticles = (ordineAcquistoToUpdate.articoli || []) as ArticoloOrdineAcquisto[];
    let articleFound = false;
    updatedArticles = updatedArticles.map(art => {
      // Check for cartone, fustella or pulitore code
      const isMatch = (art.tipo_articolo === 'cartone' && art.codice_ctn === articleIdentifier) ||
                      (art.tipo_articolo === 'fustella' && art.fustella_codice === articleIdentifier) ||
                      (art.tipo_articolo === 'pulitore' && art.pulitore_codice === articleIdentifier) ||
                      (art.tipo_articolo === 'altro' && art.descrizione === articleIdentifier);

      if (isMatch) {
        articleFound = true;
        return { ...art, stato: newArticleStatus };
      }
      return art;
    });

    if (!articleFound) {
      toast.error(`Articolo '${articleIdentifier}' non trovato nell'ordine ${orderNumeroOrdine}.`);
      return { success: false, error: new Error('Article not found') };
    }

    const newImportoTotale = updatedArticles.reduce((sum, item) => {
      if (item.stato !== 'annullato') {
        const qty = item.quantita || 0;
        const price = item.prezzo_unitario || 0;
        return sum + (qty * price);
      }
      return sum;
    }, 0);

    // OPTIMISTIC UPDATE START
    const previousOrdiniAcquisto = ordiniAcquisto;
    setOrdiniAcquisto(prev => prev.map(order => {
      if (order.numero_ordine === orderNumeroOrdine) {
        return { ...order, articoli: updatedArticles, importo_totale: newImportoTotale };
      }
      return order;
    }));
    // OPTIMISTIC UPDATE END

    // 3. Update the order with the modified articles array and new total amount
    const { data: updatedOrdine, error: updateError } = await supabase
      .from('ordini_acquisto')
      .update({ articoli: updatedArticles as any, importo_totale: newImportoTotale, updated_at: new Date().toISOString() })
      .eq('numero_ordine', orderNumeroOrdine)
      .select(`*`) // Simplified select
      .single();

    if (updateError) {
      toast.error(`Errore aggiornamento stato articolo: ${updateError.message}`);
      setOrdiniAcquisto(previousOrdiniAcquisto); // ROLLBACK
      return { success: false, error: updateError };
    }

    const allArticlesCancelled = updatedArticles.every(art => art.stato === 'annullato');
    if (allArticlesCancelled && updatedOrdine.stato !== 'annullato') {
        const { error: mainStatusUpdateError } = await supabase
            .from('ordini_acquisto')
            .update({ stato: 'annullato', updated_at: new Date().toISOString() })
            .eq('id', updatedOrdine.id);

        if (mainStatusUpdateError) {
            toast.error(`Errore aggiornamento stato principale ordine: ${mainStatusUpdateError.message}`);
        } else {
            updatedOrdine.stato = 'annullato';
        }
    }

    // 4. Sync inventory status for the updated order
    // We need fornitore_nome and fornitore_tipo for syncArticleInventoryStatus.
    // Fetch fornitore details separately or ensure they are available.
    const { data: fornitoreData, error: fornitoreError } = await supabase
      .from('fornitori')
      .select('nome, tipo_fornitore')
      .eq('id', updatedOrdine.fornitore_id)
      .single();

    if (fornitoreError || !fornitoreData) {
      console.error(`[useOrdiniAcquisto - updateArticleStatusInOrder] Errore recupero dettagli fornitore per OA: ${updatedOrdine.numero_ordine}`, fornitoreError);
      toast.error(`Errore recupero dettagli fornitore per sincronizzazione inventario.`);
      return { success: false, error: fornitoreError };
    }

    const orderWithFornitoreInfo: OrdineAcquisto = {
      ...updatedOrdine,
      fornitore_nome: fornitoreData.nome || 'N/A',
      fornitore_tipo: fornitoreData.tipo_fornitore || 'N/A',
      articoli: (updatedOrdine.articoli || []) as ArticoloOrdineAcquisto[],
    };
    await syncArticleInventoryStatus(orderWithFornitoreInfo);

    await loadOrdiniAcquisto();
    return { success: true, data: updatedOrdine };
  }, [loadOrdiniAcquisto, syncArticleInventoryStatus, ordiniAcquisto]);

  // 4. Define updateOrdineAcquistoStatus, which depends on syncArticleInventoryStatus and loadOrdiniAcquisto
  const updateOrdineAcquistoStatus = useCallback(async (id: string, newStatus: OrdineAcquisto['stato']) => {
    // Recupera l'ordine completo per poter sincronizzare gli articoli
    const { data: currentOrdine, error: fetchError } = await supabase
      .from('ordini_acquisto')
      .select(`*`) // Simplified select
      .eq('id', id)
      .single();

    if (fetchError || !currentOrdine) {
      toast.error(`Errore recupero ordine per aggiornamento stato: ${fetchError?.message}`);
      return { success: false, error: fetchError };
    }

    let articlesForDbUpdate = currentOrdine.articoli as ArticoloOrdineAcquisto[];
    if (newStatus === 'annullato') {
      articlesForDbUpdate = articlesForDbUpdate.map(art => ({ ...art, stato: 'annullato' }));
    } else if (newStatus === 'inviato') {
      articlesForDbUpdate = articlesForDbUpdate.map(art => ({ ...art, stato: 'inviato' }));
    } else if (newStatus === 'in_attesa') {
      articlesForDbUpdate = articlesForDbUpdate.map(art => ({ ...art, stato: 'in_attesa' }));
    }

    const newImportoTotale = articlesForDbUpdate.reduce((sum, item) => {
      if (item.stato !== 'annullato') {
        const qty = item.quantita || 0;
        const price = item.prezzo_unitario || 0;
        return sum + (qty * price);
      }
      return sum;
    }, 0);

    // OPTIMISTIC UPDATE START
    const previousOrdiniAcquisto = ordiniAcquisto;
    setOrdiniAcquisto(prev => prev.map(order => 
      order.id === id 
        ? { 
            ...order, 
            stato: newStatus,
            articoli: articlesForDbUpdate,
            importo_totale: newImportoTotale,
          } 
        : order
    ));
    // OPTIMISTIC UPDATE END

    const { data: updatedOrdine, error } = await supabase
      .from('ordini_acquisto')
      .update({ stato: newStatus, articoli: articlesForDbUpdate as any, importo_totale: newImportoTotale, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(`*`) // Simplified select
      .single();

    if (error) {
      toast.error(`Errore aggiornamento stato ordine: ${error.message}`);
      setOrdiniAcquisto(previousOrdiniAcquisto); // ROLLBACK
      return { success: false, error };
    }
    
    // Fetch fornitore details separately for syncArticleInventoryStatus
    const { data: fornitoreData, error: fornitoreError } = await supabase
      .from('fornitori')
      .select('nome, tipo_fornitore')
      .eq('id', updatedOrdine.fornitore_id)
      .single();

    if (fornitoreError || !fornitoreData) {
      console.error(`[useOrdiniAcquisto - updateOrdineAcquistoStatus] Errore recupero dettagli fornitore per OA: ${updatedOrdine.numero_ordine}`, fornitoreError);
      toast.error(`Errore recupero dettagli fornitore per sincronizzazione inventario.`);
      return { success: false, error: fornitoreError };
    }

    const orderWithFornitoreInfo: OrdineAcquisto = {
      ...updatedOrdine,
      fornitore_nome: fornitoreData.nome || 'N/A',
      fornitore_tipo: fornitoreData.tipo_fornitore || 'N/A',
      articoli: (updatedOrdine.articoli || []) as ArticoloOrdineAcquisto[],
    };
    await syncArticleInventoryStatus(orderWithFornitoreInfo);

    await loadOrdiniAcquisto();
    return { success: true, data: updatedOrdine };
  }, [loadOrdiniAcquisto, syncArticleInventoryStatus, ordiniAcquisto]);

  // 5. Define addOrdineAcquisto, which depends on syncArticleInventoryStatus and loadOrdiniAcquisto
  const addOrdineAcquisto = useCallback(async (ordine: Omit<OrdineAcquisto, 'id' | 'created_at' | 'fornitore_nome' | 'fornitore_tipo' | 'updated_at'>) => {
    const orderToInsert = { ...ordine };

    const { data: newOrdine, error: ordineError } = await supabase
      .from('ordini_acquisto')
      .insert([orderToInsert])
      .select(`*`) // Simplified select
      .single();

    if (ordineError) {
      toast.error(`Errore aggiunta ordine: ${ordineError.message}`);
      throw ordineError; // Rilancia l'errore
    }

    // Fetch fornitore details separately for syncArticleInventoryStatus
    const { data: fornitoreData, error: fornitoreError } = await supabase
      .from('fornitori')
      .select('nome, tipo_fornitore')
      .eq('id', newOrdine.fornitore_id)
      .single();

    if (fornitoreError || !fornitoreData) {
      console.error(`[useOrdiniAcquisto - addOrdineAcquisto] Errore recupero dettagli fornitore per OA: ${newOrdine.numero_ordine}`, fornitoreError);
      toast.error(`Errore recupero dettagli fornitore per sincronizzazione inventario.`);
      throw fornitoreError; // Rilancia l'errore
    }

    const orderWithFornitoreInfo: OrdineAcquisto = {
      ...newOrdine,
      fornitore_nome: fornitoreData.nome || 'N/A',
      fornitore_tipo: fornitoreData.tipo_fornitore || 'N/A',
      articoli: (newOrdine.articoli || []) as ArticoloOrdineAcquisto[],
    };
    await syncArticleInventoryStatus(orderWithFornitoreInfo);

    toast.success(`✅ Ordine d'acquisto '${newOrdine.numero_ordine}' aggiunto con successo!`);
    await loadOrdiniAcquisto();
    return { success: true, data: newOrdine };
  }, [loadOrdiniAcquisto, syncArticleInventoryStatus]);

  // 6. Define updateOrdineAcquisto, which depends on syncArticleInventoryStatus and loadOrdiniAcquisto
  const updateOrdineAcquisto = useCallback(async (id: string, ordine: Partial<Omit<OrdineAcquisto, 'id' | 'created_at' | 'fornitore_nome' | 'fornitore_tipo' | 'updated_at'>>) => {
    const orderToUpdate = { ...ordine };

    const { data: updatedOrdine, error: ordineError } = await supabase
      .from('ordini_acquisto')
      .update(orderToUpdate)
      .eq('id', id)
      .select(`*`) // Simplified select
      .single();

    if (ordineError) {
      toast.error(`Errore modifica ordine: ${ordineError.message}`);
      throw ordineError; // Rilancia l'errore
    }

    // Fetch fornitore details separately for syncArticleInventoryStatus
    const { data: fornitoreData, error: fornitoreError } = await supabase
      .from('fornitori')
      .select('nome, tipo_fornitore')
      .eq('id', updatedOrdine.fornitore_id)
      .single();

    if (fornitoreError || !fornitoreData) {
      console.error(`[useOrdiniAcquisto - updateOrdineAcquisto] Errore recupero dettagli fornitore per OA: ${updatedOrdine.numero_ordine}`, fornitoreError);
      toast.error(`Errore recupero dettagli fornitore per sincronizzazione inventario.`);
      throw fornitoreError; // Rilancia l'errore
    }

    const orderWithFornitoreInfo: OrdineAcquisto = {
      ...updatedOrdine,
      fornitore_nome: fornitoreData.nome || 'N/A',
      fornitore_tipo: fornitoreData.tipo_fornitore || 'N/A',
      articoli: (updatedOrdine.articoli || []) as ArticoloOrdineAcquisto[],
    };
    await syncArticleInventoryStatus(orderWithFornitoreInfo);

    toast.success(`✅ Ordine d'acquisto '${updatedOrdine.numero_ordine || id}' modificato con successo!`);
    await loadOrdiniAcquisto();
    return { success: true, data: updatedOrdine };
  }, [loadOrdiniAcquisto, syncArticleInventoryStatus]);

  // 7. Define cancelOrdineAcquisto, which depends on updateOrdineAcquistoStatus
  const cancelOrdineAcquisto = useCallback(async (id: string) => {
    const { data: ordineToUpdate, error: fetchError } = await supabase
      .from('ordini_acquisto')
      .select('numero_ordine, stato')
      .eq('id', id)
      .single();

    if (fetchError) {
      toast.error(`Errore recupero ordine per annullamento: ${fetchError.message}`);
      return { success: false, error: fetchError };
    }

    if (ordineToUpdate?.stato === 'annullato') {
      toast.info(`L'ordine '${ordineToUpdate.numero_ordine}' è già annullato.`);
      return { success: true };
    }

    const { success, error } = await updateOrdineAcquistoStatus(id, 'annullato');

    if (success) {
      toast.success(`✅ Ordine d'acquisto '${ordineToUpdate?.numero_ordine}' annullato con successo!`);
    } else {
      toast.error(`Errore annullamento ordine: ${error?.message}`);
    }
    return { success, error };
  }, [updateOrdineAcquistoStatus]);

  // 8. Define deleteOrdineAcquistoPermanently, which depends on loadOrdiniAcquisto
  const deleteOrdineAcquistoPermanently = useCallback(async (id: string, numeroOrdine: string) => {
    try {
      const previousOrdiniAcquisto = ordiniAcquisto;
      setOrdiniAcquisto(prev => prev.filter(order => order.id !== id));

      await supabase.from('ordini').delete().eq('ordine', numeroOrdine);
      await supabase.from('giacenza').delete().eq('ordine', numeroOrdine);
      // NUOVO: Elimina le fustelle associate a questo ordine d'acquisto
      await supabase.from('fustelle').delete().eq('ordine_acquisto_numero', numeroOrdine);
      
      const { error } = await supabase
        .from('ordini_acquisto')
        .delete()
        .eq('id', id);

      if (error) {
        setOrdiniAcquisto(previousOrdiniAcquisto); // ROLLBACK
        throw error;
      }

      toast.success(`🗑️ Ordine d'acquisto '${numeroOrdine}' eliminato definitivamente!`);
      await loadOrdiniAcquisto();
      return { success: true };
    } catch (error: any) {
      toast.error(`Errore eliminazione definitiva ordine: ${error.message || 'Errore sconosciuto'}`);
      return { success: false, error };
    }
  }, [loadOrdiniAcquisto, ordiniAcquisto]);

  useEffect(() => {
    loadOrdiniAcquisto();

    const ordiniAcquistoChannel = supabase
      .channel('ordini_acquisto_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ordini_acquisto' }, () => {
        loadOrdiniAcquisto();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ordiniAcquistoChannel);
    };
  }, [loadOrdiniAcquisto]);

  return {
    ordiniAcquisto,
    loading,
    addOrdineAcquisto,
    updateOrdineAcquisto,
    updateOrdineAcquistoStatus,
    updateArticleStatusInOrder,
    cancelOrdineAcquisto,
    deleteOrdineAcquistoPermanently,
    loadOrdiniAcquisto,
  };
}