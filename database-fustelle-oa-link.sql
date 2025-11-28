ALTER TABLE public.fustelle
ADD COLUMN ordine_acquisto_numero text NULL;

COMMENT ON COLUMN public.fustelle.ordine_acquisto_numero IS 'Numero dell''ordine d''acquisto da cui questa fustella è stata originata.';