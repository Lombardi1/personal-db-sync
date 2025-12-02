import { supabase } from '@/lib/supabase';

/**
 * Trova il prossimo codice Pulitore disponibile, riempiendo eventuali lacune.
 * @returns Il prossimo codice PU disponibile (es. 'PU-001', 'PU-002' se 001 è stato eliminato).
 */
export async function findNextAvailablePulitoreCode(): Promise<string> {
  const { data, error } = await supabase
    .from('fustelle')
    .select('pulitore_codice')
    .not('pulitore_codice', 'is', null) // Considera solo le righe dove pulitore_codice non è null
    .order('pulitore_codice', { ascending: true }); // Ordina in modo crescente per trovare le lacune

  if (error) {
    console.error('Error fetching pulitore codes for gap-filling:', error);
    return 'PU-001'; // Fallback
  }

  const existingNumbers: number[] = [];
  if (data && data.length > 0) {
    data.forEach(fustella => {
      if (fustella.pulitore_codice) { // Assicurati che il codice non sia null
        const num = parseInt(fustella.pulitore_codice.replace('PU-', ''));
        if (!isNaN(num)) {
          existingNumbers.push(num);
        }
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

  const formattedCode = `PU-${String(nextAvailableNum).padStart(3, '0')}`;
  console.log('🧹 Trovato prossimo codice Pulitore disponibile:', formattedCode);
  return formattedCode;
}

// Le funzioni generateNextPulitoreCode e resetPulitoreCodeGenerator non sono più necessarie
// e vengono rimosse in favore di findNextAvailablePulitoreCode.