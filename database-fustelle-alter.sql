-- Rimuovi la colonna 'pulitore' (boolean)
ALTER TABLE public.fustelle
DROP COLUMN pulitore;

-- Aggiungi la nuova colonna 'pulitore_codice' (TEXT)
ALTER TABLE public.fustelle
ADD COLUMN pulitore_codice TEXT;