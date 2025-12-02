-- Aggiungi la colonna 'ddt' alla tabella 'ordini'
ALTER TABLE public.ordini
ADD COLUMN ddt text NULL;

-- Aggiungi la colonna 'data_arrivo' alla tabella 'ordini'
ALTER TABLE public.ordini
ADD COLUMN data_arrivo date NULL;

-- Puoi anche aggiungere un indice se prevedi molte ricerche su queste colonne
-- CREATE INDEX idx_ordini_ddt ON public.ordini (ddt);
-- CREATE INDEX idx_ordini_data_arrivo ON public.ordini (data_arrivo);