import { supabase } from '@/lib/supabase';

let lastGeneratedPolimeroCodeInSession = 0; // Stores the highest PLM number seen/generated in the current session

/**
 * Fetches the maximum Polimero number from the database (polimeri table).
 * @returns The highest Polimero number found, or 0 if none.
 */
export async function fetchMaxPolimeroCodeFromDB(): Promise<number> {
  const { data, error } = await supabase
    .from('polimeri')
    .select('codice')
    .order('codice', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error fetching max polimero code:', error);
    return 0;
  }

  let maxCodeFromDB = 0;
  if (data && data.length > 0 && data[0].codice) {
    const num = parseInt(data[0].codice.replace('PLM-', ''));
    maxCodeFromDB = num > maxCodeFromDB ? num : maxCodeFromDB;
  }
  return maxCodeFromDB;
}

/**
 * Generates the next unique Polimero code for the current session.
 * This function is synchronous and relies on `lastGeneratedPolimeroCodeInSession` being correctly initialized.
 * @returns The next formatted PLM code (e.g., 'PLM-001').
 */
export function generateNextPolimeroCode(): string {
  lastGeneratedPolimeroCodeInSession++; // Increment for the next unique code
  const formattedCode = `PLM-${String(lastGeneratedPolimeroCodeInSession).padStart(3, '0')}`;
  console.log('🧪 Generato nuovo codice Polimero (in-session):', formattedCode);
  return formattedCode;
}

/**
 * Resets the in-session Polimero code generator.
 * Should be called when starting a new form or when the data is reloaded.
 * @param initialMaxCode Optional: Initialize the counter with a specific max code (e.g., from DB).
 */
export function resetPolimeroCodeGenerator(initialMaxCode: number = 0) {
  lastGeneratedPolimeroCodeInSession = initialMaxCode;
  console.log('🧪 Reset del generatore di codici Polimero. Iniziato da:', initialMaxCode);
}