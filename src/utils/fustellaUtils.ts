import { supabase } from '@/lib/supabase';

/**
 * Considera "vuota" una fustella che ha lo spazio fisico libero:
 * codice_fornitore = null, '', o '-'  E  fornitore = null o ''
 */
function isFustellaVuota(f: { codice_fornitore: string | null; fornitore: string | null }): boolean {
  const cfv = (f.codice_fornitore ?? '').trim();
  const fv  = (f.fornitore ?? '').trim();
  return (cfv === '' || cfv === '-') && fv === '';
}

/**
 * Trova il prossimo codice Fustella disponibile.
 * Priorità:
 * 1. Fustella con numero più basso che è "vuota" (spazio fisico libero)
 * 2. MAX codice esistente + 1
 * Formato codice: FU0001, FU0002, ...
 */
export async function findNextAvailableFustellaCode(): Promise<string> {
  // Scarica tutti i codici + i campi necessari per il filtro "vuota"
  // Usiamo paginazione per superare il limite 1000 di Supabase
  let allData: { codice: string; codice_fornitore: string | null; fornitore: string | null }[] = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('fustelle')
      .select('codice, codice_fornitore, fornitore')
      .order('codice', { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      console.error('Error fetching fustella codes:', error);
      break;
    }
    if (!data || data.length === 0) break;
    allData = allData.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  if (allData.length === 0) return 'FU0001';

  // 1. Prima fustella vuota (numero più basso, già ordinato ascending)
  const prima = allData.find(isFustellaVuota);
  if (prima) {
    console.log('✂️ Riutilizzo fustella vuota:', prima.codice);
    return prima.codice;
  }

  // 2. MAX + 1
  const lastCode = allData[allData.length - 1].codice;
  const match = lastCode.match(/^(?:FU|FST-?)(\d+)$/);
  if (!match) return 'FU0001';

  const nextNum = parseInt(match[1], 10) + 1;
  const formattedCode = `FU${String(nextNum).padStart(4, '0')}`;
  console.log('✂️ Prossimo codice Fustella disponibile:', formattedCode);
  return formattedCode;
}
