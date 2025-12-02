import { supabase } from '@/lib/supabase';

/**
 * Trova il prossimo codice Fustella disponibile, riempiendo eventuali lacune.
 * @returns Il prossimo codice FST disponibile (es. 'FST-001', 'FST-002' se 001 è stato eliminato).
 */
export async function findNextAvailableFustellaCode(): Promise<string> {
  const { data, error } = await supabase
    .from('fustelle')
    .select('codice')
    .order('codice', { ascending: true }); // Ordina in modo crescente per trovare le lacune

  if (error) {
    console.error('Error fetching fustella codes for gap-filling:', error);
    return 'FST-001'; // Fallback
  }

  const existingNumbers: number[] = [];
  if (data && data.length > 0) {
    data.forEach(fustella => {
      const num = parseInt(fustella.codice.replace('FST-', ''));
      if (!isNaN(num)) {
        existingNumbers.push(num);
      }
    });
  }

  existingNumbers.sort((a, b) => a - b);

  let nextAvailableNum = 1;
  for (const num of existingNumbers) {
    if (num === nextAvailableNum) {
      nextAvailableNum++;
    } else if (num > nextAvailableNum) {
      // Trovata una lacuna
      break;
    }
  }

  const formattedCode = `FST-${String(nextAvailableNum).padStart(3, '0')}`;
  console.log('✂️ Trovato prossimo codice Fustella disponibile:', formattedCode);
  return formattedCode;
}

/**
 * Fetches all existing Fustella codes from the database.
 * @returns An array of all existing Fustella codes.
 */
export async function fetchAllFustellaCodes(): Promise<string[]> {
  const { data, error } = await supabase
    .from('fustelle')
    .select('codice');

  if (error) {
    console.error('Error fetching all fustella codes:', error);
    return [];
  }

  return data ? data.map(fustella => fustella.codice) : [];
}

// Le funzioni generateNextFustellaCode e resetFustellaCodeGenerator non sono più necessarie
// e vengono rimosse in favore di findNextAvailableFustellaCode.