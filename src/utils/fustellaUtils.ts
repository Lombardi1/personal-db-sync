import { supabase } from '@/lib/supabase';

/**
 * Trova il prossimo codice Fustella disponibile.
 * Strategia:
 * 1. Cerca fustelle senza codice_fornitore E senza fornitore (da riutilizzare prima)
 * 2. Prende il MAX codice esistente e aggiunge 1
 * Formato codice: FU0001, FU0002, ...
 */
export async function findNextAvailableFustellaCode(): Promise<string> {
  // 1. Cerca fustelle vuote (senza fornitore e senza codice_fornitore)
  const { data: vuote, error: errVuote } = await supabase
    .from('fustelle')
    .select('codice')
    .or('codice_fornitore.is.null,codice_fornitore.eq.')
    .or('fornitore.is.null,fornitore.eq.')
    .order('codice', { ascending: true })
    .limit(1);

  if (!errVuote && vuote && vuote.length > 0) {
    console.log('✂️ Riutilizzo fustella senza codice_fornitore e senza fornitore:', vuote[0].codice);
    return vuote[0].codice;
  }

  // 2. Prende il codice più alto esistente e incrementa
  const { data: maxData, error: errMax } = await supabase
    .from('fustelle')
    .select('codice')
    .order('codice', { ascending: false })
    .limit(1);

  if (errMax || !maxData || maxData.length === 0) {
    return 'FU0001';
  }

  const lastCode = maxData[0].codice;
  const match = lastCode.match(/^(?:FU|FST-?)(\d+)$/);
  if (!match) {
    return 'FU0001';
  }

  const nextNum = parseInt(match[1], 10) + 1;
  const formattedCode = `FU${String(nextNum).padStart(4, '0')}`;
  console.log('✂️ Prossimo codice Fustella disponibile:', formattedCode);
  return formattedCode;
}
