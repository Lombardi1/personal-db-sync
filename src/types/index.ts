export interface Cartone {
  codice: string;
  fornitore: string;
  ordine: string;
  ddt?: string;
  tipologia: string;
  formato: string;
  grammatura: string;
  fogli: number;
  cliente: string;
  lavoro: string;
  magazzino: string;
  prezzo: number;
  data_arrivo?: string;
  data_consegna?: string;
  confermato?: boolean;
  note?: string;
}

export interface StoricoMovimento {
  id?: string;
  codice: string;
  tipo: 'carico' | 'scarico' | 'modifica'; // Aggiunto il tipo 'modifica'
  quantita: number;
  data: string;
  note: string;
  user_id?: string; // Nuovo campo per l'ID dell'utente
  username?: string; // Campo opzionale per il nome utente, popolato in fase di fetch
  numero_ordine_acquisto?: string; // Nuovo campo per il numero dell'ordine d'acquisto
}

export interface AnagraficaBase {
  id?: string;
  codice_anagrafica?: string; // Nuovo campo per il codice anagrafico
  nome: string;
  indirizzo?: string;
  citta?: string;
  cap?: string;
  provincia?: string;
  partita_iva?: string;
  codice_fiscale?: string;
  telefono?: string;
  email?: string;
  pec?: string;
  sdi?: string;
  note?: string;
  created_at?: string;
}

export interface Cliente extends AnagraficaBase {}
export interface Fornitore extends AnagraficaBase {
  tipo_fornitore?: string; // Nuovo campo per il tipo di fornitore
}

// Nuova interfaccia per gli articoli, ora nidificata nell'OrdineAcquisto
export interface ArticoloOrdineAcquisto {
  id?: string; // L'ID è ancora utile per la gestione nel frontend (es. React keys)
  codice_ctn?: string;
  descrizione?: string;
  tipologia_cartone?: string;
  formato?: string;
  grammatura?: string;
  quantita: number; // Questa sarà la quantità in KG per i cartoni, o in unità per gli altri
  numero_fogli?: number; // Nuovo campo per i fogli, usato per i cartoni
  prezzo_unitario: number;
  importo_riga?: number;
  peso_cartone_kg?: number; // Questo campo non sarà più usato direttamente per l'input, ma quantita conterrà il peso in kg
  cliente?: string;
  lavoro?: string;
  data_consegna_prevista?: string; // Spostato qui
  stato: 'in_attesa' | 'confermato' | 'ricevuto' | 'annullato' | 'inviato'; // Nuovo campo stato per l'articolo
}

export interface OrdineAcquisto {
  id?: string;
  fornitore_id: string;
  fornitore_nome?: string;
  fornitore_tipo?: string;
  data_ordine: string;
  numero_ordine: string;
  stato: 'in_attesa' | 'confermato' | 'ricevuto' | 'annullato' | 'inviato';
  articoli: ArticoloOrdineAcquisto[]; // Ora un array di ArticoloOrdineAcquisto
  importo_totale?: number;
  note?: string;
  created_at?: string;
  updated_at?: string; // Aggiunto per l'ordinamento per ultima modifica
}