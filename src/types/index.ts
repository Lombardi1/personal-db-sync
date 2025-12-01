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
  tipo_fornitore?: 'Cartone' | 'Inchiostro' | 'Colla' | 'Fustelle' | 'Altro'; // Nuovo campo per il tipo di fornitore
  considera_iva?: boolean; // NUOVO CAMPO ANCHE PER FORNITORE
  banca?: string; // NUOVO CAMPO: Banca associata al fornitore
  default_cliente?: string; // NUOVO CAMPO: Cliente di default per fornitori Fustelle
  default_lavoro?: string; // NUOVO CAMPO: Lavoro di default per fornitori Fustelle
}

// Nuova interfaccia per gli articoli, ora nidificata nell'OrdineAcquisto
export interface ArticoloOrdineAcquisto {
  id?: string; // L'ID è ancora utile per la gestione nel frontend (es. React keys)
  codice_ctn?: string; // Usato per i cartoni
  descrizione?: string; // Usato per non-cartoni
  tipologia_cartone?: string; // Usato per i cartoni
  formato?: string; // Usato per i cartoni
  grammatura?: string; // Usato per i cartoni
  quantita: number; // Questa sarà la quantità in KG per i cartoni, o in unità per gli altri
  numero_fogli?: number; // Nuovo campo per i fogli, usato per i cartoni
  prezzo_unitario: number;
  importo_riga?: number;
  peso_cartone_kg?: number; // Questo campo non sarà più usato direttamente per l'input, ma quantita conterrà il peso in kg
  cliente?: string;
  lavoro?: string;
  data_consegna_prevista?: string; // Spostato qui
  stato: 'in_attesa' | 'confermato' | 'ricevuto' | 'annullato' | 'inviato'; // Nuovo campo stato per l'articolo
  fsc?: boolean; // Nuovo campo per cartoni
  alimentare?: boolean; // Nuovo campo per cartoni
  rif_commessa_fsc?: string; // NUOVO CAMPO: Riferimento commessa FSC per cartoni

  // NUOVI CAMPI PER FUSTELLE
  fustella_codice?: string; // Codice FST-XXX generato
  codice_fornitore_fustella?: string; // Codice fornitore per la fustella
  fustellatrice?: string;
  resa_fustella?: string; // Resa specifica per fustella
  hasPulitore?: boolean; // Indica se la fustella ha un pulitore
  pulitore_codice_fustella?: string | null; // Codice PU-XXX generato per il pulitore
  pinza_tagliata?: boolean;
  tasselli_intercambiabili?: boolean;
  nr_tasselli?: number | null;
  incollatura?: boolean;
  incollatrice?: string;
  tipo_incollatura?: string;
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

-- NUOVE INTERFACCE PER FUSTELLE
export interface Fustella {
  codice: string;
  data_creazione?: string;
  ultima_modifica?: string;
  disponibile: boolean; // Indica se la fustella è fisicamente presente e utilizzabile
  fornitore?: string;
  codice_fornitore?: string; // Nuovo campo
  cliente?: string;
  lavoro?: string;
  fustellatrice?: string; // Nuovo campo
  resa?: string; // Assumiamo stringa per ora
  pulitore_codice?: string | null; // CAMBIATO: da 'pulitore: boolean' a 'pulitore_codice: string | null'
  pinza_tagliata?: boolean; // Nuovo campo
  tasselli_intercambiabili?: boolean; // Nuovo campo
  nr_tasselli?: number | null; // Nuovo campo
  incollatura?: boolean; // Nuovo campo
  incollatrice?: string; // Nuovo campo
  tipo_incollatura?: string; // Nuovo campo
  ordine_acquisto_numero?: string; // NUOVO CAMPO: Numero dell'ordine d'acquisto
}

// NUOVE INTERFACCE PER POLIMERI
export interface Polimero {
  codice: string; // Corrisponde a ID
  nr_fustella?: string; // Corrisponde a NR. Fustella (rinominato da immagine)
  codice_fornitore?: string; // Corrisponde a Codice Fornitore
  cliente?: string; // Corrisponde a Cliente
  lavoro?: string; // Corrisponde a Lavoro
  resa?: string; // Corrisponde a Resa
  note?: string; // Corrisponde a Note
  data_creazione?: string;
  ultima_modifica?: string;
  disponibile: boolean;
}