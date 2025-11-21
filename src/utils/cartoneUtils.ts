import { supabase } from '@/lib/supabase';

let lastGeneratedCodeInSession = 0; // Stores the highest CTN number seen/generated in the current session

/**
 * Fetches the maximum CTN number from the database (giacenza, ordini and esauriti tables).
 * @returns The highest CTN number found, or 0 if none.
 */
export async function fetchMaxCartoneCodeFromDB(): Promise<number> {
  const [giacenzaRes, ordiniRes, esauritiRes] = await Promise.all([
    supabase.from('giacenza').select('codice').order('codice', { ascending: false }).limit(1),
    supabase.from('ordini').select('codice').order('codice', { ascending: false }).limit(1), // Reintegrato ordiniRes
    supabase.from('esauriti').select('codice').order('codice', { ascending: false }).limit(1),
  ]);

  const allCodes: string[] = [];

  if (giacenzaRes.data && giacenzaRes.data.length > 0 && giacenzaRes.data[0].codice) {
    allCodes.push(giacenzaRes.data[0].codice);
  }
  if (ordiniRes.data && ordiniRes.data.length > 0 && ordiniRes.data[0].codice) { // Reintegrato ordiniRes
    allCodes.push(ordiniRes.data[0].codice);
  }
  if (esauritiRes.data && esauritiRes.data.length > 0 && esauritiRes.data[0].codice) {
    allCodes.push(esauritiRes.data[0].codice);
  }

  let maxCodeFromDB = 0;
  if (allCodes.length > 0) {
    maxCodeFromDB = allCodes.reduce((max, codeString) => {
      const num = parseInt(codeString.replace('CTN-', ''));
      return num > max ? num : max;
    }, 0);
  }
  return maxCodeFromDB;
}

/**
 * Generates the next unique Cartone code for the current session.
 * This function is synchronous and relies on `lastGeneratedCodeInSession` being correctly initialized.
 * @returns The next formatted CTN code (e.g., 'CTN-001').
 */
export function generateNextCartoneCode(): string {
  lastGeneratedCodeInSession++; // Increment for the next unique code
  const formattedCode = `CTN-${String(lastGeneratedCodeInSession).padStart(3, '0')}`;
  console.log('📦 Generato nuovo codice CTN (in-session):', formattedCode);
  return formattedCode;
}

/**
 * Resets the in-session CTN code generator.
 * Should be called when starting a new order form.
 * @param initialMaxCode Optional: Initialize the counter with a specific max code (e.g., from DB).
 */
export function resetCartoneCodeGenerator(initialMaxCode: number = 0) {
  lastGeneratedCodeInSession = initialMaxCode;
  console.log('📦 Reset del generatore di codici CTN. Iniziato da:', initialMaxCode);
}