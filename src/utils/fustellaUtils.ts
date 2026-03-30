import { supabase } from '@/lib/supabase';

/**
 * Trova il prossimo codice Fustella disponibile.
 * Priorità:
 * 1. Fustelle già presenti in tabella ma senza codice_fornitore (da riempire prima)
 * 2. Prossimo numero libero dopo il MAX esistente
 */
export async function findNextAvailableFustellaCode(): Promise<string> {
  const { data, error } = await supabase
    .from('fustelle')
    .select('codice, codice_fornitore')
    .order('codice', { ascending: true });

  if (error) {
    console.error('Error fetching fustella codes:', error);
    return 'FST-001';
  }

  if (!data || data.length === 0) {
    return 'FST-001';
  }

  // 1. Cerca la fustella con numero più basso che ha codice_fornitore null o vuoto
  const fustelleVuote = data.filter(f => !f.codice_fornitore || f.codice_fornitore.trim() === '');
  if (fustelleVuote.length > 0) {
    const codice = fustelleVuote[0].codice; // già ordinato ascending
    console.log('✂️ Riutilizzo fustella senza codice_fornitore:', codice);
    return codice;
  }

  // 2. Nessuna fustella vuota: genera il prossimo numero libero
  const existingNumbers: number[] = [];
  data.forEach(fustella => {
    const num = parseInt(fustella.codice.replace('FST-', ''));
    if (!isNaN(num)) {
      existingNumbers.push(num);
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

  const formattedCode = `FST-${String(nextAvailableNum).padStart(3, '0')}`;
  console.log('✂️ Prossimo codice Fustella disponibile:', formattedCode);
  return formattedCode;
}
