export interface Chat {
  id: string;
  created_at: string;
  participant_ids: string[]; // Array of UUIDs of participants
  participant_usernames?: string[]; // Populated by frontend for display
  last_message_content?: string | null;
  last_message_at?: string | null;
  unread_count?: number; // NUOVO: Conteggio messaggi non letti per l'utente corrente
  name?: string; // NEW: Optional name for the chat
}

export interface Message {
  id: string;
  created_at: string;
  chat_id: string;
  sender_id: string;
  sender_username?: string; // Populated by frontend for display
  content: string;
}

export interface AnagraficaBase {
  id?: string;
  codice_anagrafica?: string;
  nome: string;
  indirizzo?: string | null;
  citta?: string | null;
  cap?: string | null;
  provincia?: string | null;
  partita_iva?: string | null;
  codice_fiscale?: string | null;
  telefono?: string | null;
  email?: string | null;
  pec?: string | null;
  sdi?: string | null;
  note?: string | null;
  condizione_pagamento?: string | null;
  created_at?: string;
}

export interface Cliente extends AnagraficaBase {
  considera_iva: boolean;
}

export interface Fornitore extends AnagraficaBase {
  tipo_fornitore: 'Cartone' | 'Inchiostro' | 'Colla' | 'Fustelle' | 'Altro' | '';
  considera_iva: boolean;
  banca?: string | null; // NUOVO: Aggiunto campo banca
}

export interface Cartone {
  codice: string;
  fornitore: string;
  ordine: string;
  ddt?: string | null;
  tipologia: string;
  formato: string;
  grammatura: string;
  fogli: number;
  cliente: string;
  lavoro: string;
  magazzino: string | null;
  prezzo: number;
  data_consegna?: string | null;
  data_arrivo?: string | null;
  confermato?: boolean;
  note?: string | null;
  data_esaurimento?: string | null;
  fsc?: boolean; // NUOVO: Aggiunto campo FSC
  alimentare?: boolean; // NUOVO: Aggiunto campo Alimentare
  rif_commessa_fsc?: string | null; // NUOVO: Riferimento commessa FSC
}

export interface StoricoMovimento {
  id?: string;
  codice: string;
  tipo: 'carico' | 'scarico' | 'modifica';
  quantita: number;
  data: string;
  note: string;
  user_id?: string | null;
  username?: string; // Popolato dal frontend
  numero_ordine_acquisto?: string | null; // NUOVO: Aggiunto per collegare allo storico
  cliente?: string | null; // NUOVO: Aggiunto per storico
  lavoro?: string | null; // NUOVO: Aggiunto per storico
}

export interface OrdineAcquisto {
  id?: string;
  fornitore_id: string;
  fornitore_nome?: string; // Popolato dal frontend
  fornitore_tipo?: Fornitore['tipo_fornitore']; // Popolato dal frontend
  data_ordine: string;
  numero_ordine: string;
  stato: 'in_attesa' | 'inviato' | 'confermato' | 'ricevuto' | 'annullato';
  articoli: ArticoloOrdineAcquisto[];
  importo_totale?: number | null;
  note?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ArticoloOrdineAcquisto {
  id?: string;
  // Campi per Cartone
  codice_ctn?: string | null;
  tipologia_cartone?: string | null;
  formato?: string | null;
  grammatura?: string | null;
  numero_fogli?: number | null;
  peso_cartone_kg?: number | null; // Calcolato, non salvato direttamente
  fsc?: boolean;
  alimentare?: boolean;
  rif_commessa_fsc?: string | null;

  // Campi per Fustelle
  fustella_codice?: string | null;
  codice_fornitore_fustella?: string | null;
  fustellatrice?: string | null;
  resa_fustella?: string | null;
  hasPulitore?: boolean;
  pulitore_codice_fustella?: string | null;
  prezzo_pulitore?: number | null;
  pinza_tagliata?: boolean;
  tasselli_intercambiabili?: boolean;
  nr_tasselli?: number | null;
  incollatura?: boolean;
  incollatrice?: string | null;
  tipo_incollatura?: string | null;

  // Campi comuni a tutti gli articoli
  descrizione?: string | null; // Usato per Inchiostro, Colla, Altro, o come fallback
  quantita?: number | null; // Quantità in kg per cartone, in pezzi per altri
  prezzo_unitario?: number | null;
  cliente?: string | null;
  lavoro?: string | null;
  data_consegna_prevista?: string | null;
  stato: 'in_attesa' | 'inviato' | 'confermato' | 'ricevuto' | 'annullato';
}

export interface AziendaInfo {
  id?: string;
  nome_azienda: string;
  indirizzo?: string | null;
  citta?: string | null;
  cap?: string | null;
  provincia?: string | null;
  telefono?: string | null;
  fax?: string | null;
  email?: string | null;
  p_iva?: string | null;
  codice_fiscale?: string | null;
  rea?: string | null;
  m_bs?: string | null;
  banche?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Fustella {
  codice: string;
  fornitore: string;
  codice_fornitore?: string | null;
  cliente: string;
  lavoro: string;
  fustellatrice: string;
  resa: string;
  pulitore_codice?: string | null;
  pinza_tagliata: boolean;
  tasselli_intercambiabili: boolean;
  nr_tasselli?: number | null;
  incollatura: boolean;
  incollatrice?: string | null;
  tipo_incollatura?: string | null;
  disponibile: boolean;
  data_creazione: string;
  ultima_modifica: string;
  ordine_acquisto_numero?: string | null; // Collega alla tabella ordini_acquisto
}

export interface StoricoMovimentoFustella {
  id?: string;
  codice_fustella: string;
  tipo: 'carico' | 'scarico' | 'modifica';
  data: string;
  note: string;
  user_id?: string | null;
  username?: string;
}

export interface Polimero {
  codice: string;
  nr_fustella?: string | null; // Riferimento alla fustella
  codice_fornitore?: string | null; // Codice fornitore della fustella
  cliente?: string | null;
  lavoro?: string | null;
  resa?: string | null;
  note?: string | null;
  disponibile: boolean;
  data_creazione: string;
  ultima_modifica: string;
}

export interface StoricoMovimentoPolimero {
  id?: string;
  codice_polimero: string;
  tipo: 'carico' | 'scarico' | 'modifica';
  data: string;
  note: string;
  user_id?: string | null;
  username?: string;
}

// TIPI PER CONSUMO COLORE
export interface Colore {
  codice: string;
  nome: string;
  tipo: 'CMYK' | 'Pantone' | 'Custom';
  marca?: string | null;
  colore_hex?: string | null;
  quantita_disponibile: number;
  unita_misura: 'g' | 'kg' | 'l' | 'ml';
  soglia_minima?: number | null;
  fornitore?: string | null;
  note?: string | null;
  disponibile: boolean;
  data_creazione: string;
  ultima_modifica: string;
}

export interface StoricoMovimentoColore {
  id?: string;
  codice_colore: string;
  tipo: 'carico' | 'scarico';
  quantita: number;
  data: string;
  note?: string | null;
  user_id?: string | null;
  username?: string;
  macchina?: string | null;
  lavoro?: string | null;
}

// NUOVI TIPI PER PRODUZIONE
export interface MacchinaProduzione {
  id: string;
  nome: string;
  tipo: string; // Es. 'Fustellatrice', 'Incollatrice', 'Stampa'
  descrizione?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface LavoroProduzione {
  id: string;
  macchina_id: string;
  macchina_nome?: string; // Popolato dal frontend
  nome_lavoro: string;
  stato: 'in_attesa' | 'in_produzione' | 'completato' | 'annullato';
  data_inizio_prevista?: string | null;
  data_fine_prevista?: string | null;
  data_inizio_effettiva?: string | null;
  data_fine_effettiva?: string | null;
  note?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface StoricoLavoroProduzione {
  id?: string;
  lavoro_id: string;
  macchina_id: string;
  macchina_nome?: string;
  nome_lavoro?: string;
  tipo: 'creazione' | 'aggiornamento_stato' | 'modifica_dettagli' | 'eliminazione';
  vecchio_stato?: string | null;
  nuovo_stato?: string | null;
  dettagli_modifica?: string | null; // JSONB per dettagli specifici
  data: string;
  user_id?: string | null;
  username?: string;
}