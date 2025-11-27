-- Abilita l'estensione uuid-ossp se non già abilitata
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =================================================================================================
-- Tabella: polimeri
-- = =================================================================================================
CREATE TABLE IF NOT EXISTS public.polimeri (
    codice TEXT PRIMARY KEY NOT NULL UNIQUE,
    nr_fustella TEXT,
    codice_fornitore TEXT,
    cliente TEXT,
    lavoro TEXT,
    resa TEXT,
    note TEXT,
    data_creazione TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    ultima_modifica TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    disponibile BOOLEAN DEFAULT TRUE NOT NULL
);

-- Aggiungi un indice per migliorare le prestazioni di ricerca su nr_fustella e codice_fornitore
CREATE INDEX IF NOT EXISTS idx_polimeri_nr_fustella ON public.polimeri (nr_fustella);
CREATE INDEX IF NOT EXISTS idx_polimeri_codice_fornitore ON public.polimeri (codice_fornitore);

-- Imposta le policy RLS per la tabella polimeri
ALTER TABLE public.polimeri ENABLE ROW LEVEL SECURITY;

-- Policy per SELECT: tutti gli utenti autenticati possono leggere
DROP POLICY IF EXISTS "Authenticated users can view polimeri" ON public.polimeri;
CREATE POLICY "Authenticated users can view polimeri"
ON public.polimeri FOR SELECT
TO authenticated
USING (TRUE);

-- Policy per INSERT: solo amministratori e stampa possono inserire
DROP POLICY IF EXISTS "Admins and stampa can insert polimeri" ON public.polimeri;
CREATE POLICY "Admins and stampa can insert polimeri"
ON public.polimeri FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) IN ('amministratore', 'stampa')
);

-- Policy per UPDATE: solo amministratori e stampa possono aggiornare
DROP POLICY IF EXISTS "Admins and stampa can update polimeri" ON public.polimeri;
CREATE POLICY "Admins and stampa can update polimeri"
ON public.polimeri FOR UPDATE
TO authenticated
USING (
    (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) IN ('amministratore', 'stampa')
)
WITH CHECK (
    (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) IN ('amministratore', 'stampa')
);

-- Policy per DELETE: solo amministratori possono eliminare
DROP POLICY IF EXISTS "Admins can delete polimeri" ON public.polimeri;
CREATE POLICY "Admins can delete polimeri"
ON public.polimeri FOR DELETE
TO authenticated
USING (
    (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'amministratore'
);

-- =================================================================================================
-- Tabella: storico_polimeri
-- = =================================================================================================
CREATE TABLE IF NOT EXISTS public.storico_polimeri (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
    codice_polimero TEXT NOT NULL,
    tipo TEXT NOT NULL, -- 'carico', 'scarico', 'modifica'
    data TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    note TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Aggiungi un indice per migliorare le prestazioni di ricerca su codice_polimero
CREATE INDEX IF NOT EXISTS idx_storico_polimeri_codice_polimero ON public.storico_polimeri (codice_polimero);

-- Imposta le policy RLS per la tabella storico_polimeri
ALTER TABLE public.storico_polimeri ENABLE ROW LEVEL SECURITY;

-- Policy per SELECT: tutti gli utenti autenticati possono leggere
DROP POLICY IF EXISTS "Authenticated users can view storico_polimeri" ON public.storico_polimeri;
CREATE POLICY "Authenticated users can view storico_polimeri"
ON public.storico_polimeri FOR SELECT
TO authenticated
USING (TRUE);

-- Policy per INSERT: solo amministratori e stampa possono inserire
DROP POLICY IF EXISTS "Admins and stampa can insert storico_polimeri" ON public.storico_polimeri;
CREATE POLICY "Admins and stampa can insert storico_polimeri"
ON public.storico_polimeri FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) IN ('amministratore', 'stampa')
);

-- Policy per UPDATE: solo amministratori possono aggiornare (raro per storico, ma utile per correzioni)
DROP POLICY IF EXISTS "Admins can update storico_polimeri" ON public.storico_polimeri;
CREATE POLICY "Admins can update storico_polimeri"
ON public.storico_polimeri FOR UPDATE
TO authenticated
USING (
    (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'amministratore'
)
WITH CHECK (
    (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'amministratore'
);

-- Policy per DELETE: solo amministratori possono eliminare
DROP POLICY IF EXISTS "Admins can delete storico_polimeri" ON public.storico_polimeri;
CREATE POLICY "Admins can delete storico_polimeri"
ON public.storico_polimeri FOR DELETE
TO authenticated
USING (
    (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'amministratore'
);

-- =================================================================================================
-- Modifica Tabella: fustelle (aggiungi codice_fornitore se non esiste)
-- =================================================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'fustelle' AND column_name = 'codice_fornitore') THEN
        ALTER TABLE public.fustelle ADD COLUMN codice_fornitore TEXT;
        -- Aggiungi un indice per migliorare le prestazioni di ricerca su codice_fornitore
        CREATE INDEX IF NOT EXISTS idx_fustelle_codice_fornitore ON public.fustelle (codice_fornitore);
        RAISE NOTICE 'Colonna codice_fornitore aggiunta alla tabella fustelle.';
    ELSE
        RAISE NOTICE 'Colonna codice_fornitore già esistente nella tabella fustelle.';
    END IF;
END $$;

-- =================================================================================================
-- Aggiorna la funzione get_user_auth_data per includere il ruolo
-- =================================================================================================
-- Questa funzione è già presente e dovrebbe essere aggiornata per includere il ruolo.
-- Se la tua funzione esistente non include il ruolo, dovrai aggiornarla manualmente
-- o fornirmi il suo contenuto per un aggiornamento automatico.
-- Assumendo che la tua funzione attuale sia simile a questa (o già aggiornata):
CREATE OR REPLACE FUNCTION public.get_user_auth_data(p_username TEXT)
 RETURNS TABLE(user_id UUID, username TEXT, password_hash TEXT, user_role TEXT)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        au.id AS user_id,
        au.username,
        au.password_hash,
        ur.role AS user_role
    FROM
        public.app_users au
    LEFT JOIN
        public.user_roles ur ON au.id = ur.user_id
    WHERE
        au.username = p_username;
END;
$function$;