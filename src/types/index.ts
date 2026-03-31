export interface Chat {
  id: string;
  created_at: string;
  participant_ids: string[];
  participant_usernames?: string[];
  last_message_content?: string | null;
  last_message_at?: string | null;
  unread_count?: number;
  name?: string;
}

export interface Message {
  id: string;
  created_at: string;
  chat_id: string;
  sender_id: string;
  sender_username?: string;
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
  banca?: string | null;
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
  fsc?: boolean;
  alimentare?: boolean;
  rif_commessa_fsc?: string | null;
}

export interface StoricoMovimento {
  id?: string;
  codice: string;
  tipo: 'carico' | 'scarico' | 'modifica';
  quantita: number;
  data: string;
  note: string;
  user_id?: string | null;
  username?: string;
  numero_ordine_acquisto?: string | null;
  cliente?: string | null;
  lavoro?: string | null;
}

export interface OrdineAcquisto {
  id?: string;
  fornitore_id: string;
  fornitore_nome?: string;
  fornitore_tipo?: Fornitore['tipo_fornitore'];
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
  codice_ctn?: string | null;
  tipologia_cartone?: string | null;
  formato?: string | null;
  grammatura?: string | null;
  numero_fogli?: number | null;
  peso_cartone_kg?: number | null;
  fsc?: boolean;
  alimentare?: boolean;
  rif_commessa_fsc?: string | null;
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
  descrizione?: string | null;
  quantita?: number | null;
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
  ordine_acquisto_numero?: string | null;
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
  nr_fustella?: string | null;
  codice_fornitore?: string | null;
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

export interface Colore {
  codice: string;
  nome: string;
  tipo: 'CMYK' | 'Pantone' | 'Custom';
  marca?: string | null;
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
  numero_ddt?: string | null;
  data_ddt?: string | null;
  lotto?: string | null;
}

export interface MacchinaProduzione {
  id: string;
  nome: string;
  tipo: string;
  descrizione?: string | null;
  created_at?: string;
  updated_at?: string;
}

// Info del lotto stampa collegato
export interface LottoStampaInfo {
  id: string;
  lotto: number;
  cliente: string;
  lavoro: string;
  identificativo?: string | null;
  ordine_nr?: string | null;
  data_ordine?: string | null;
  formato?: string | null;
  quantita?: number | null;
  cartone?: string | null;
  stampato?: string | null;
  parzialmente?: string | null;
  conf?: string | null;
  mag?: string | null;
  cons?: string | null;
  note?: string | null;
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
  lotto_stampa?: number | null; // Riferimento al lotto in lavori_stampa
  lotto_info?: LottoStampaInfo | null; // Popolato dal frontend tramite join
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
  dettagli_modifica?: string | null;
  data: string;
  user_id?: string | null;
  username?: string;
}
