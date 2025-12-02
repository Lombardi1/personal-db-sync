import { supabase } from '@/lib/supabase';

/**
 * Finds the next available Pulitore code, filling in any gaps.
 * @returns The next available PUL code (e.g., 'PUL-001', 'PUL-002' if 001 is deleted).
 */
export async function findNextAvailablePulitoreCode(): Promise<string> {
  console.log('🧹 [findNextAvailablePulitoreCode] Starting code generation...');
  const { data, error } = await supabase
    .from('fustelle')
    .select('pulitore_codice')
    .not('pulitore_codice', 'is', null) // Only consider rows where pulitore_codice is not null
    .order('pulitore_codice', { ascending: true }); // Order ascending to find gaps

  if (error) {
    console.error('🧹 [findNextAvailablePulitoreCode] Error fetching pulitore codes for gap-filling:', error);
    return 'PUL-001'; // Fallback with new prefix
  }

  const existingNumbers: number[] = [];
  if (data && data.length > 0) {
    data.forEach(fustella => {
      if (fustella.pulitore_codice) { // Ensure pulitore_codice is not null
        // Parse both old 'PU-' and new 'PUL-' prefixes
        const num = parseInt(fustella.pulitore_codice.replace(/PUL-|PU-/g, ''));
        if (!isNaN(num)) {
          existingNumbers.push(num);
        }
      }
    });
  }

  console.log('🧹 [findNextAvailablePulitoreCode] Raw existing numbers:', existingNumbers);
  existingNumbers.sort((a, b) => a - b);
  console.log('🧹 [findNextAvailablePulitoreCode] Sorted existing numbers:', existingNumbers);

  let nextAvailableNum = 1;
  for (const num of existingNumbers) {
    if (num === nextAvailableNum) {
      nextAvailableNum++;
    } else if (num > nextAvailableNum) {
      // Found a gap
      console.log(`🧹 [findNextAvailablePulitoreCode] Found gap at ${nextAvailableNum}, existing num is ${num}.`);
      break;
    }
  }

  const formattedCode = `PUL-${String(nextAvailableNum).padStart(3, '0')}`; // Use new prefix
  console.log('🧹 [findNextAvailablePulitoreCode] Next available Pulitore code:', formattedCode);
  return formattedCode;
}

/**
 * Fetches all existing Pulitore codes from the database.
 * @returns An array of all existing Pulitore codes.
 */
export async function fetchAllPulitoreCodes(): Promise<string[]> {
  const { data, error } = await supabase
    .from('fustelle')
    .select('pulitore_codice')
    .not('pulitore_codice', 'is', null); // Only select non-null pulitore codes

  if (error) {
    console.error('Error fetching all pulitore codes:', error);
    return [];
  }

  return data ? data.map(fustella => fustella.pulitore_codice!) : [];
}