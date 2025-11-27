-- Tabella per la gestione dei Polimeri
CREATE TABLE public.polimeri (
  codice TEXT PRIMARY KEY NOT NULL,
  nr_fustella TEXT,
  codice_fornitore TEXT,
  cliente TEXT,
  lavoro TEXT,
  resa TEXT,
  note TEXT,
  data_creazione TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  ultima_modifica TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  disponibile BOOLEAN DEFAULT TRUE NOT NULL
);

-- Abilita Row Level Security (RLS) per la tabella polimeri
ALTER TABLE public.polimeri ENABLE ROW LEVEL SECURITY;

-- Policy RLS per la tabella polimeri
-- Tutti gli utenti autenticati possono leggere i polimeri
CREATE POLICY "Authenticated users can view polimeri" ON public.polimeri
  FOR SELECT USING (auth.role() = 'authenticated');

-- Solo gli amministratori possono creare, aggiornare ed eliminare polimeri
CREATE POLICY "Administrators can manage polimeri" ON public.polimeri
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'amministratore'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'amministratore'
    )
  );

-- Tabella per lo storico dei movimenti dei Polimeri
CREATE TABLE public.storico_polimeri (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  codice_polimero TEXT NOT NULL REFERENCES public.polimeri(codice) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('carico', 'scarico', 'modifica')),
  data TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  note TEXT NOT NULL,
  user_id UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Abilita Row Level Security (RLS) per la tabella storico_polimeri
ALTER TABLE public.storico_polimeri ENABLE ROW LEVEL SECURITY;

-- Policy RLS per la tabella storico_polimeri
-- Tutti gli utenti autenticati possono leggere lo storico dei polimeri
CREATE POLICY "Authenticated users can view storico_polimeri" ON public.storico_polimeri
  FOR SELECT USING (auth.role() = 'authenticated');

-- Tutti gli utenti autenticati possono inserire movimenti nello storico dei polimeri
CREATE POLICY "Authenticated users can insert storico_polimeri" ON public.storico_polimeri
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Nessuno può aggiornare o eliminare i movimenti dello storico (sono record immutabili)
CREATE POLICY "No one can update storico_polimeri" ON public.storico_polimeri
  FOR UPDATE USING (FALSE);

CREATE POLICY "No one can delete storico_polimeri" ON public.storico_polimeri
  FOR DELETE USING (FALSE);

-- Funzione e trigger per aggiornare automaticamente 'ultima_modifica'
CREATE OR REPLACE FUNCTION public.update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.ultima_modifica = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_polimeri_modtime
BEFORE UPDATE ON public.polimeri
FOR EACH ROW
EXECUTE FUNCTION public.update_modified_column();

-- Abilita il Realtime per le nuove tabelle
ALTER PUBLICATION supabase_realtime ADD TABLE public.polimeri;
ALTER PUBLICATION supabase_realtime ADD TABLE public.storico_polimeri;