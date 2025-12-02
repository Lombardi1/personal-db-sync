import { supabase } from '@/lib/supabase';

/**
 * Fetches all existing Pulitore codes from the database.
 * @returns An array of all Pulitore codes (e.g., ['PUL-001', 'PUL-003']).
 */
export async function fetchAllPulitoreCodes(): Promise<string[]> {
  const { data, error } = await supabase
    .from('fustelle')
    .select('pulitore_codice')
    .not('pulitore_codice', 'is', null);

  if (error) {
    console.error('Error fetching all pulitore codes:', error);
    return [];
  }
  return data?.map(f => f.pulitore_codice!) || [];
}

/**
 * Finds the next available Pulitore code, filling in any gaps.
 * @returns The next available PUL code (e.g., 'PUL-001', 'PUL-002' if 001 is deleted).
 */
export async function findNextAvailablePulitoreCode(): Promise<string> {
  console.log('🧹 [findNextAvailablePulitoreCode] Starting code generation...');
  const existingCodes = await fetchAllPulitoreCodes(); // Use the new function

  const existingNumbers: number[] = [];
  existingCodes.forEach(codeString => {
    // Parse both old 'PU-' and new 'PUL-' prefixes
    const num = parseInt(codeString.replace(/PUL-|PU-/g, ''));
    if (!isNaN(num)) {
      existingNumbers.push(num);
    }
  });

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