import { supabase } from '@/lib/supabase';

/**
 * Trova il prossimo codice Fustella disponibile.
 * Priorità:
 * 1. Fustelle già presenti in tabella ma senza codice_fornitore (da riempire prima)
 *    → restituisce il codice con numero più basso tra quelle
 * 2. Prossimo numero libero dopo il MAX esistente (gap-filling + incremento)
 * Formato codice: FU0001, FU0002, ...
 */
export async function findNextAvailableFustellaCode(): Promise<string> {
  const { data, error } = await supabase
    .from('fustelle')
    .select('codice, codice_fornitore')
    .order('codice', { ascending: true });

  if (error) {
    console.error('Error fetching fustella codes:', error);
    return 'FU0001';
  }

  if (!data || data.length === 0) {
    return 'FU0001';
  }

  // 1. Cerca la fustella con numero più basso che ha codice_fornitore null o vuoto
  const fustelleVuote = data.filter(f => !f.codice_fornitore || f.codice_fornitore.trim() === '');
  if (fustelleVuote.length > 0) {
    const codice = fustelleVuote[0].codice; // già ordinato ascending
    console.log('✂️ Riutilizzo fustella senza codice_fornitore:', codice);
    return codice;
  }

  // 2. Nessuna fustella vuota: genera il prossimo numero libero (gap-fill poi MAX+1)
  const existingNumbers: number[] = [];
  data.forEach(fustella => {
    // Supporta sia formato FU0001 che FST-001
    const match = fustella.codice.match(/^(?:FU|FST-?)(d+)$/);
    if (match) {
      existingNumbers.push(parseInt(match[1], 10));
    }
  });

  existingNumbers.sort((a, b) => a - b);

  let nextAvailableNum = 1;
  for (const num of existingNumbers) {
    if (num === nextAvailableNum) {
      nextAvailableNum++;
    } else if (num > nextAvailableNum) {
      break; // trovato un buco
    }
  }

  const formattedCode = `FU${String(nextAvailableNum).padStart(4, '0')}`;
  console.log('✂️ Prossimo codice Fustella disponibile:', formattedCode);
  return formattedCode;
}
