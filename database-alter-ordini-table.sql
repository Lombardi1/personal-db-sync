-- Aggiungi la colonna 'ddt' alla tabella 'ordini' se non esiste
DO $$ BEGIN
    ALTER TABLE public.ordini ADD COLUMN ddt text NULL;
EXCEPTION
    WHEN duplicate_column THEN RAISE NOTICE 'column ddt already exists in public.ordini.';
END $$;

-- Aggiungi la colonna 'data_arrivo' alla tabella 'ordini' se non esiste
DO $$ BEGIN
    ALTER TABLE public.ordini ADD COLUMN data_arrivo date NULL;
EXCEPTION
    WHEN duplicate_column THEN RAISE NOTICE 'column data_arrivo already exists in public.ordini.';
END $$;

-- Aggiungi la colonna 'magazzino' alla tabella 'ordini' se non esiste
DO $$ BEGIN
    ALTER TABLE public.ordini ADD COLUMN magazzino text NULL;
EXCEPTION
    WHEN duplicate_column THEN RAISE NOTICE 'column magazzino already exists in public.ordini.';
END $$;