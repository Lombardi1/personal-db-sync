export interface Fornitore {
  id?: string;
  codice: string;
  ragione_sociale: string;
  indirizzo: string;
  cap: string;
  citta: string;
  provincia: string;
  telefono?: string;
  fax?: string;
  email?: string;
  piva: string;
  codice_fiscale?: string;
  rea?: string;
  banca_1?: string;
  banca_2?: string;
  condizioni_pagamento?: string;
}

export interface OrdineAttesa {
  codice: string;
  fornitore: string;
  ordine: string;
  tipologia: string;
  formato: string;
  grammatura: string;
  fogli: number;
  cliente: string;
  lavoro: string;
  prezzo: number;
  data_consegna?: string;
  note?: string;
}
