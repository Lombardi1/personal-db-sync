import { supabase } from '@/lib/supabase';

let lastGeneratedPulitoreCodeInSession = 0; // Stores the highest PU number seen/generated in the current session

/**
 * Fetches the maximum Pulitore code number from the database (fustelle table).
 * @returns The highest Pulitore number found, or 0 if none.
 */
export async function fetchMaxPulitoreCodeFromDB(): Promise<number> {
  const { data, error } = await supabase
    .from('fustelle')
    .select('pulitore_codice')
    .not('pulitore_codice', 'is', null) // Only consider rows where pulitore_codice is not null
    .order('pulitore_codice', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error fetching max pulitore code:', error);
    return 0;
  }

  let maxCodeFromDB = 0;
  if (data && data.length > 0 && data[0].pulitore_codice) {
    const num = parseInt(data[0].pulitore_codice.replace('PU-', ''));
    maxCodeFromDB = num > maxCodeFromDB ? num : maxCodeFromDB;
  }
  return maxCodeFromDB;
}

/**
 * Generates the next unique Pulitore code for the current session.
 * This function is synchronous and relies on `lastGeneratedPulitoreCodeInSession` being correctly initialized.
 * @returns The next formatted PU code (e.g., 'PU-001').
 */
export function generateNextPulitoreCode(): string {
  lastGeneratedPulitoreCodeInSession++; // Increment for the next unique code
  const formattedCode = `PU-${String(lastGeneratedPulitoreCodeInSession).padStart(3, '0')}`;
  console.log('🧹 Generato nuovo codice Pulitore (in-session):', formattedCode);
  return formattedCode;
}

/**
 * Resets the in-session Pulitore code generator.
 * Should be called when starting a new form or when the data is reloaded.
 * @param initialMaxCode Optional: Initialize the counter with a specific max code (e.g., from DB).
 */
export function resetPulitoreCodeGenerator(initialMaxCode: number = 0) {
  lastGeneratedPulitoreCodeInSession = initialMaxCode;
  console.log('🧹 Reset del generatore di codici Pulitore. Iniziato da:', initialMaxCode);
}