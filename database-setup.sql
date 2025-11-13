-- Creazione tabelle per Gestione Magazzino Cartoni

-- Tabella giacenza (cartoni disponibili in magazzino)
CREATE TABLE IF NOT EXISTS public.giacenza (
  codice TEXT PRIMARY KEY,
  fornitore TEXT NOT NULL,
  ordine TEXT NOT NULL,
  ddt TEXT,
  tipologia TEXT NOT NULL,
  formato TEXT NOT NULL,
  grammatura TEXT NOT NULL,
  fogli INTEGER NOT NULL,
  cliente TEXT NOT NULL,
  lavoro TEXT NOT NULL,
  magazzino TEXT NOT NULL,
  prezzo DECIMAL(10, 3) NOT NULL,
  data_arrivo TEXT,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabella ordini (ordini in arrivo)
CREATE TABLE IF NOT EXISTS public.ordini (
  codice TEXT PRIMARY KEY,
  fornitore TEXT NOT NULL,
  ordine TEXT NOT NULL,
  tipologia TEXT NOT NULL,
  formato TEXT NOT NULL,
  grammatura TEXT NOT NULL,
  fogli INTEGER NOT NULL,
  cliente TEXT NOT NULL,
  lavoro TEXT NOT NULL,
  magazzino TEXT NOT NULL,
  prezzo DECIMAL(10, 3) NOT NULL,
  data_consegna TEXT NOT NULL,
  confermato BOOLEAN DEFAULT FALSE,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabella esauriti (cartoni esauriti)
CREATE TABLE IF NOT EXISTS public.esauriti (
  codice TEXT PRIMARY KEY,
  fornitore TEXT NOT NULL,
  ordine TEXT NOT NULL,
  ddt TEXT,
  tipologia TEXT NOT NULL,
  formato TEXT NOT NULL,
  grammatura TEXT NOT NULL,
  fogli INTEGER NOT NULL,
  cliente TEXT NOT NULL,
  lavoro TEXT NOT NULL,
  magazzino TEXT NOT NULL,
  prezzo DECIMAL(10, 3) NOT NULL,
  data_arrivo TEXT,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabella storico (movimenti di carico e scarico)
CREATE TABLE IF NOT EXISTS public.storico (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codice TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('carico', 'scarico')),
  quantita INTEGER NOT NULL,
  data TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Indici per migliorare le performance
CREATE INDEX IF NOT EXISTS idx_giacenza_codice ON public.giacenza(codice);
CREATE INDEX IF NOT EXISTS idx_ordini_codice ON public.ordini(codice);
CREATE INDEX IF NOT EXISTS idx_esauriti_codice ON public.esauriti(codice);
CREATE INDEX IF NOT EXISTS idx_storico_codice ON public.storico(codice);
CREATE INDEX IF NOT EXISTS idx_storico_data ON public.storico(data DESC);

-- Abilita RLS (Row Level Security) - Per ora aperto a tutti
ALTER TABLE public.giacenza ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordini ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.esauriti ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storico ENABLE ROW LEVEL SECURITY;

-- Policy per permettere a tutti di leggere e scrivere (modifica secondo le tue esigenze di sicurezza)
CREATE POLICY "Allow all access to giacenza" ON public.giacenza FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to ordini" ON public.ordini FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to esauriti" ON public.esauriti FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to storico" ON public.storico FOR ALL USING (true) WITH CHECK (true);

-- Dati di esempio (opzionale - rimuovi se non necessario)
INSERT INTO public.giacenza (codice, fornitore, ordine, ddt, tipologia, formato, grammatura, fogli, cliente, lavoro, magazzino, prezzo, data_arrivo) VALUES
('CTN-001', 'Imballex Srl', 'ORD-7890', '7890', 'Ondulato Triplo', '120 x 80 cm', '350 g/m²', 1500, 'Cliente Alpha', 'LAV-2025-089', 'Mag. B - S5', 1.850, '10/11/2025'),
('CTN-003', 'CartonItalia', 'ORD-1122', '1122', 'Teso', '150 x 100 cm', '320 g/m²', 800, 'Cliente Gamma', 'LAV-2025-101', 'Mag. C - Scaff. 2', 1.650, '10/11/2025')
ON CONFLICT (codice) DO NOTHING;

INSERT INTO public.ordini (codice, fornitore, ordine, tipologia, formato, grammatura, fogli, cliente, lavoro, magazzino, prezzo, data_consegna, confermato) VALUES
('CTN-007', 'EcoBox', 'ORD-110', 'Ondulato Triplo', '95 x 75 cm', '360 g/m²', 1400, 'Cliente Lambda', 'LAV-2025-110', 'Mag. B - S3', 1.550, '18/11/2025', false)
ON CONFLICT (codice) DO NOTHING;

INSERT INTO public.esauriti (codice, fornitore, ordine, ddt, tipologia, formato, grammatura, fogli, cliente, lavoro, magazzino, prezzo, data_arrivo) VALUES
('CTN-002', 'PackGroup', 'ORD-7891', '7891', 'Microcannello', '100 x 70 cm', '400 g/m²', 2000, 'Cliente Beta', 'LAV-2025-092', 'Mag. A - P1', 1.750, '10/11/2025')
ON CONFLICT (codice) DO NOTHING;
