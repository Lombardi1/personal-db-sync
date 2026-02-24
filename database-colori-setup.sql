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
  colore_hex TEXT,
  quantita_disponibile NUMERIC(10, 3) NOT NULL DEFAULT 0,
  unita_misura TEXT NOT NULL DEFAULT 'g' CHECK (unita_misura IN ('g', 'kg', 'l', 'ml')),
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

-- Row Level Security (opzionale, in base alla configurazione attuale del progetto)
-- Se il progetto usa RLS, decommentare le righe seguenti e adattarle:
-- ALTER TABLE public.colori ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.storico_colori ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all for authenticated" ON public.colori FOR ALL TO authenticated USING (true);
-- CREATE POLICY "Allow all for authenticated" ON public.storico_colori FOR ALL TO authenticated USING (true);

-- ============================================================
-- DATI DI ESEMPIO (opzionale - rimuovere se non necessari)
-- ============================================================
/*
INSERT INTO public.colori (codice, nome, tipo, marca, colore_hex, quantita_disponibile, unita_misura, soglia_minima, fornitore, disponibile)
VALUES
  ('COL-C', 'Ciano Process', 'CMYK', 'Sun Chemical', '#00AEEF', 5000, 'g', 500, 'Sun Chemical Italia', TRUE),
  ('COL-M', 'Magenta Process', 'CMYK', 'Sun Chemical', '#EC008C', 5000, 'g', 500, 'Sun Chemical Italia', TRUE),
  ('COL-Y', 'Giallo Process', 'CMYK', 'Sun Chemical', '#FFF200', 5000, 'g', 500, 'Sun Chemical Italia', TRUE),
  ('COL-K', 'Nero Process', 'CMYK', 'Sun Chemical', '#231F20', 10000, 'g', 1000, 'Sun Chemical Italia', TRUE);
*/
