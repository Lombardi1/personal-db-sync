-- ============================================================
-- SETUP TABELLE CONSUMO COLORE
-- Eseguire questo script nel SQL Editor di Supabase
-- ============================================================

-- Tabella principale dei colori (magazzino colori)
CREATE TABLE IF NOT EXISTS public.colori (
  codice TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('CMYK', 'Pantone', 'Custom')),
  marca TEXT,
  quantita_disponibile NUMERIC(10, 3) NOT NULL DEFAULT 0,
  unita_misura TEXT NOT NULL DEFAULT 'kg' CHECK (unita_misura IN ('g', 'kg', 'l', 'ml')),
  soglia_minima NUMERIC(10, 3),
  fornitore TEXT,
  note TEXT,
  disponibile BOOLEAN NOT NULL DEFAULT TRUE,
  data_creazione TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ultima_modifica TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabella storico movimenti colori (carico / scarico)
CREATE TABLE IF NOT EXISTS public.storico_colori (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codice_colore TEXT NOT NULL REFERENCES public.colori(codice) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('carico', 'scarico')),
  quantita NUMERIC(10, 3) NOT NULL,
  data TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note TEXT,
  user_id UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
  -- Campi specifici carico (DDT + lotto)
  numero_ddt TEXT,
  data_ddt DATE,
  lotto TEXT,
  -- Campi specifici scarico
  macchina TEXT,
  lavoro TEXT
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_storico_colori_codice ON public.storico_colori(codice_colore);
CREATE INDEX IF NOT EXISTS idx_storico_colori_data ON public.storico_colori(data DESC);
CREATE INDEX IF NOT EXISTS idx_storico_colori_user ON public.storico_colori(user_id);

-- Abilitare Realtime per le tabelle
ALTER PUBLICATION supabase_realtime ADD TABLE public.colori;
ALTER PUBLICATION supabase_realtime ADD TABLE public.storico_colori;

-- ============================================================
-- COLORI CMYK PRE-CARICATI (opzionale)
-- Decommenta per inserire i 4 colori CMYK di base
-- ============================================================
/*
INSERT INTO public.colori (codice, nome, tipo, quantita_disponibile, unita_misura, disponibile)
VALUES
  ('CYAN',    'CYAN',    'CMYK', 0, 'kg', TRUE),
  ('MAGENTA', 'MAGENTA', 'CMYK', 0, 'kg', TRUE),
  ('YELLOW',  'YELLOW',  'CMYK', 0, 'kg', TRUE),
  ('BLACK',   'BLACK',   'CMYK', 0, 'kg', TRUE)
ON CONFLICT (codice) DO NOTHING;
*/
