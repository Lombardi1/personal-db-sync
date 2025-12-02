import { supabase } from '@/lib/supabase';

/**
 * Fetches all existing Fustella codes from the database.
 * @returns An array of all Fustella codes (e.g., ['FST-001', 'FST-003']).
 */
export async function fetchAllFustellaCodes(): Promise<string[]> {
  const { data, error } = await supabase
    .from('fustelle')
    .select('codice');

  if (error) {
    console.error('Error fetching all fustella codes:', error);
    return [];
  }
  return data?.map(f => f.codice) || [];
}

/**
 * Trova il prossimo codice Fustella disponibile, riempiendo eventuali lacune.
 * @returns Il prossimo codice FST disponibile (es. 'FST-001', 'FST-002' se 001 è stato eliminato).
 */
export async function findNextAvailableFustellaCode(): Promise<string> {
  const existingCodes = await fetchAllFustellaCodes(); // Use the new function
  
  const existingNumbers: number[] = [];
  existingCodes.forEach(codeString => {
    const num = parseInt(codeString.replace('FST-', ''));
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
      // Trovata una lacuna
      break;
    }
  }

  const formattedCode = `FST-${String(nextAvailableNum).padStart(3, '0')}`;
  console.log('✂️ Trovato prossimo codice Fustella disponibile:', formattedCode);
  return formattedCode;
}