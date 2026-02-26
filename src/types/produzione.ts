// Types per DB Articoli e Produzione

export interface Articolo {
  id: string;
  nr?: number;
  acronimo?: string;
  cliente?: string;
  linea?: string;
  tipologia?: string;
  codice: string;
  descrizione?: string;
  certificazione?: string;
  cartone?: string;
  grammatura?: string;
  c?: string;
  m?: string;
  y?: string;
  k?: string;
  pan_nr?: string;
  pan_nr_2?: string;
  pan_nr_3?: string;
  pan_nr_4?: string;
  pan_nr_5?: string;
  pan_nr_6?: string;
  polimero?: string;
  linear?: string;
  finitura?: string;
  uv?: string;
  polimero_uv?: string;
  terzista?: string;
  lavorazione?: string;
  terzista_2?: string;
  lavorazione_2?: string;
  cliche_nr?: string;
  pellicola_nr?: string;
  fustella_nr?: string;
  tassello?: string;
  finestratura?: string;
  h_finestratura?: string;
  incollatura?: string;
  tipologia_incollatura?: string;
  scatolone?: string;
  quantita?: string;
  peso?: string;
  archivio?: string;
  nr_archivio?: string;
  created_at?: string;
  updated_at?: string;
}

export interface LavoroStampa {
  id: string;
  lotto: number;
  cliente: string;
  lavoro: string;
  identificativo?: string;
  ordine_nr?: string;
  data_ordine?: string;
  formato?: string;
  quantita: number;
  fogli?: string;
  fogli_m?: string;
  data: string;
  note?: string;
  cartone?: string;
  taglio?: string;
  colori?: string;
  finitura?: string;
  polimero?: string;
  fustella?: string;
  pinza_tg?: string;
  pvc?: string;
  inc?: string;
  cg?: string;
  mont?: string;
  stampato?: string;
  parzialmente?: string;
  parz_conf?: string;
  conf?: string;
  mag?: string;
  cons?: string;
  q_x_mod?: number;
  quantita_scatoloni?: number;
  scatoloni_usati?: number;
  tipologia_scatolone?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SelezioneProduzione {
  lotto: LavoroStampa | null;
  articoli: Articolo[];
  cassetto: string;
  note: string;
}
