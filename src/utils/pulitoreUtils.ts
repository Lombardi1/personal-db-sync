import { supabase } from '@/lib/supabase';

/**
 * Finds the next available Pulitore code, filling in any gaps.
 * @returns The next available PU code (e.g., 'PU-001', 'PU-002' if 001 is deleted).
 */
export async function findNextAvailablePulitoreCode(): Promise<string> {
  const { data, error } = await supabase
    .from('fustelle')
    .select('pulitore_codice')
    .not('pulitore_codice', 'is', null) // Only consider rows where pulitore_codice is not null
    .order('pulitore_codice', { ascending: true }); // Order ascending to find gaps

  if (error) {
    console.error('Error fetching pulitore codes for gap-filling:', error);
    return 'PU-001'; // Fallback
  }

  const existingNumbers: number[] = [];
  if (data && data.length > 0) {
    data.forEach(fustella => {
      if (fustella.pulitore_codice) { // Ensure pulitore_codice is not null
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
      // Found a gap
      break;
    }
  }

  const formattedCode = `PU-${String(nextAvailableNum).padStart(3, '0')}`;
  console.log('🧹 Trovato prossimo codice Pulitore disponibile:', formattedCode);
  return formattedCode;
}