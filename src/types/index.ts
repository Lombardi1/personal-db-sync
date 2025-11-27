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
  fsc?: boolean; // Nuovo campo
  alimentare?: boolean; // Nuovo campo
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
  condizione_pagamento?: string; // NUOVO CAMPO
  created_at?: string;
}

export interface Cliente extends AnagraficaBase {
  considera_iva?: boolean; // NUOVO CAMPO
}
export interface Fornitore extends AnagraficaBase {
  tipo_fornitore?: string; // Nuovo campo per il tipo di fornitore
  considera_iva?: boolean; // NUOVO CAMPO ANCHE PER FORNITORE
  banca?: string; // NUOVO CAMPO: Banca associata al fornitore
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
  fsc?: boolean; // Nuovo campo
  alimentare?: boolean; // Nuovo campo
  rif_commessa_fsc?: string; // NUOVO CAMPO: Riferimento commessa FSC
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
  updated_at?: string;
}

// Nuova interfaccia per le informazioni dell'azienda
export interface AziendaInfo {
  id?: string;
  nome_azienda: string;
  indirizzo?: string;
  citta?: string;
  cap?: string;
  provincia?: string;
  telefono?: string;
  fax?: string;
  email?: string;
  p_iva?: string;
  codice_fiscale?: string;
  rea?: string;
  m_bs?: string;
  banche?: string; // Campo per le banche, come stringa JSON o testo
  created_at?: string;
  updated_at?: string;
}

// NUOVE INTERFACCE PER FUSTELLE
export interface Fustella {
  codice: string;
  descrizione: string;
  formato: string;
  materiale: string;
  ubicazione: string;
  note?: string;
  data_creazione?: string;
  ultima_modifica?: string;
  disponibile: boolean; // Indica se la fustella è fisicamente presente e utilizzabile
  fornitore?: string;
  codice_fornitore?: string; // Nuovo campo
  cliente?: string;
  lavoro?: string;
  fustellatrice?: string; // Nuovo campo
  resa?: string; // Assumiamo stringa per ora
  pulitore?: boolean; // Nuovo campo
  pinza_tagliata?: boolean; // Nuovo campo
  tasselli_intercambiabili?: boolean; // Nuovo campo
  nr_tasselli?: number; // Nuovo campo
  incollatura?: boolean; // Nuovo campo
  incollatrice?: string; // Nuovo campo
  tipo_incollatura?: string; // Nuovo campo
}

export interface StoricoMovimentoFustella {
  id?: string;
  codice_fustella: string;
  tipo: 'carico' | 'scarico' | 'modifica'; // Carico: creazione/ripristino, Scarico: utilizzo/eliminazione, Modifica: aggiornamento dettagli
  data: string;
  note: string;
  user_id?: string;
  username?: string;
}