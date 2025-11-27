import { supabase } from '@/lib/supabase';

let lastGeneratedFustellaCodeInSession = 0; // Stores the highest FST number seen/generated in the current session

/**
 * Fetches the maximum Fustella number from the database (fustelle table).
 * @returns The highest Fustella number found, or 0 if none.
 */
export async function fetchMaxFustellaCodeFromDB(): Promise<number> {
  const { data, error } = await supabase
    .from('fustelle')
    .select('codice')
    .order('codice', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error fetching max fustella code:', error);
    return 0;
  }

  let maxCodeFromDB = 0;
  if (data && data.length > 0 && data[0].codice) {
    const num = parseInt(data[0].codice.replace('FST-', ''));
    maxCodeFromDB = num > maxCodeFromDB ? num : maxCodeFromDB;
  }
  return maxCodeFromDB;
}

/**
 * Generates the next unique Fustella code for the current session.
 * This function is synchronous and relies on `lastGeneratedFustellaCodeInSession` being correctly initialized.
 * @returns The next formatted FST code (e.g., 'FST-001').
 */
export function generateNextFustellaCode(): string {
  lastGeneratedFustellaCodeInSession++; // Increment for the next unique code
  const formattedCode = `FST-${String(lastGeneratedFustellaCodeInSession).padStart(3, '0')}`;
  console.log('✂️ Generato nuovo codice Fustella (in-session):', formattedCode);
  return formattedCode;
}

/**
 * Resets the in-session Fustella code generator.
 * Should be called when starting a new form or when the data is reloaded.
 * @param initialMaxCode Optional: Initialize the counter with a specific max code (e.g., from DB).
 */
export function resetFustellaCodeGenerator(initialMaxCode: number = 0) {
  lastGeneratedFustellaCodeInSession = initialMaxCode;
  console.log('✂️ Reset del generatore di codici Fustella. Iniziato da:', initialMaxCode);
}