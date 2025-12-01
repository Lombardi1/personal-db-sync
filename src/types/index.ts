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
  fsc?: boolean;
  alimentare?: boolean;
  rif_commessa_fsc?: string;
}

export interface StoricoMovimento {
  id?: string;
  codice: string;
  tipo: 'carico' | 'scarico' | 'modifica';
  quantita: number;
  data: string;
  note: string;
  user_id?: string;
  username?: string;
  numero_ordine_acquisto?: string;
}

export interface AnagraficaBase {
  id?: string;
  codice_anagrafica?: string;
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
  condizione_pagamento?: string;
  created_at?: string;
}

export interface Cliente extends AnagraficaBase {
  considera_iva?: boolean;
}
export interface Fornitore extends AnagraficaBase {
  tipo_fornitore?: 'Cartone' | 'Inchiostro' | 'Colla' | 'Fustelle' | 'Altro';
  considera_iva?: boolean;
  banca?: string;
}

export interface ArticoloOrdineAcquisto {
  id?: string;
  item_type: 'cartone' | 'fustella' | 'pulitore' | 'altro';
  
  // Common fields
  quantita?: number; // Made optional for initial state
  prezzo_unitario?: number; // Made optional for initial state
  cliente?: string;
  lavoro?: string;
  data_consegna_prevista?: string;
  stato: 'in_attesa' | 'confermato' | 'ricevuto' | 'annullato' | 'inviato';
  
  // Fields specific to 'cartone'
  codice_ctn?: string;
  tipologia_cartone?: string;
  formato?: string;
  grammatura?: string;
  numero_fogli?: number;
  fsc?: boolean;
  alimentare?: boolean;
  rif_commessa_fsc?: string;

  // Fields specific to 'fustella'
  fustella_codice?: string; // Our FST-XXX code
  codice_fornitore_fustella?: string; // Supplier's code for the die
  fustellatrice?: string;
  resa_fustella?: string;
  pulitore_codice_fustella?: string | null; // NEW: Stores the PU-XXX code of the associated cleaner (if item_type is 'fustella')
  pinza_tagliata?: boolean;
  tasselli_intercambiabili?: boolean;
  nr_tasselli?: number | null;
  incollatura?: boolean;
  incollatrice?: string;
  tipo_incollatura?: string;

  // Fields specific to 'pulitore'
  codice_pulitore?: string; // Our PU-XXX code for the cleaner (if item_type is 'pulitore')
  descrizione?: string; // Description for pulitore (e.g., "Pulitore per FST-XXX")
  fustella_parent_index?: number; // NEW: Index of the parent fustella article in the form's articles array (for UI logic)

  // Fields specific to 'altro'
  // (descrizione is reused for pulitore)
}

export interface OrdineAcquisto {
  id?: string;
  fornitore_id: string;
  fornitore_nome?: string;
  fornitore_tipo?: string;
  data_ordine: string;
  numero_ordine: string;
  stato: 'in_attesa' | 'confermato' | 'ricevuto' | 'annullato' | 'inviato';
  articoli: ArticoloOrdineAcquisto[];
  importo_totale?: number;
  note?: string;
  created_at?: string;
  updated_at?: string;
}

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
  banche?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Fustella {
  codice: string;
  data_creazione?: string;
  ultima_modifica?: string;
  disponibile: boolean;
  fornitore?: string;
  codice_fornitore?: string;
  cliente?: string;
  lavoro?: string;
  fustellatrice?: string;
  resa?: string;
  pulitore_codice?: string | null; // This is the actual code of the cleaner associated with this Fustella
  pinza_tagliata?: boolean;
  tasselli_intercambiabili?: boolean;
  nr_tasselli?: number | null;
  incollatura?: boolean;
  incollatrice?: string;
  tipo_incollatura?: string;
  ordine_acquisto_numero?: string;
}

export interface Polimero {
  codice: string;
  nr_fustella?: string;
  codice_fornitore?: string;
  cliente?: string;
  lavoro?: string;
  resa?: string;
  note?: string;
  data_creazione?: string;
  ultima_modifica?: string;
  disponibile: boolean;
}