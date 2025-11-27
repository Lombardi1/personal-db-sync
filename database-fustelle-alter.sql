-- Rimuovi le colonne 'formato', 'materiale', 'ubicazione' e 'note' dalla tabella public.fustelle
ALTER TABLE public.fustelle
DROP COLUMN formato,
DROP COLUMN materiale,
DROP COLUMN ubicazione,
DROP COLUMN note;