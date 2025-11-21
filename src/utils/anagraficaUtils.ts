import { supabase } from '@/lib/supabase';

let lastGeneratedClientCodeInSession = 0;
let lastGeneratedFornitoreCodeInSession = 0;

/**
 * Fetches the maximum client code number from the database.
 * @returns The highest client code number found, or 0 if none.
 */
export async function fetchMaxClientCodeFromDB(): Promise<number> {
  const { data, error } = await supabase
    .from('clienti')
    .select('codice_anagrafica')
    .order('codice_anagrafica', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error fetching max client code:', error);
    return 0;
  }

  if (data && data.length > 0 && data[0].codice_anagrafica) {
    const num = parseInt(data[0].codice_anagrafica.replace('CLI-', ''));
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

/**
 * Fetches the maximum fornitore code number from the database.
 * @returns The highest fornitore code number found, or 0 if none.
 */
export async function fetchMaxFornitoreCodeFromDB(): Promise<number> {
  const { data, error } = await supabase
    .from('fornitori')
    .select('codice_anagrafica')
    .order('codice_anagrafica', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error fetching max fornitore code:', error);
    return 0;
  }

  if (data && data.length > 0 && data[0].codice_anagrafica) {
    const num = parseInt(data[0].codice_anagrafica.replace('FOR-', ''));
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

/**
 * Generates the next unique client code for the current session.
 * @returns The next formatted client code (e.g., 'CLI-001').
 */
export function generateNextClientCode(): string {
  lastGeneratedClientCodeInSession++;
  const formattedCode = `CLI-${String(lastGeneratedClientCodeInSession).padStart(3, '0')}`;
  console.log('👤 Generato nuovo codice Cliente (in-session):', formattedCode);
  return formattedCode;
}

/**
 * Generates the next unique fornitore code for the current session.
 * @returns The next formatted fornitore code (e.g., 'FOR-001').
 */
export function generateNextFornitoreCode(): string {
  lastGeneratedFornitoreCodeInSession++;
  const formattedCode = `FOR-${String(lastGeneratedFornitoreCodeInSession).padStart(3, '0')}`;
  console.log('🚚 Generato nuovo codice Fornitore (in-session):', formattedCode);
  return formattedCode;
}

/**
 * Resets the in-session client code generator.
 * @param initialMaxCode Optional: Initialize the counter with a specific max code (e.g., from DB).
 */
export function resetClientCodeGenerator(initialMaxCode: number = 0) {
  lastGeneratedClientCodeInSession = initialMaxCode;
  console.log('👤 Reset del generatore di codici Cliente. Iniziato da:', initialMaxCode);
}

/**
 * Resets the in-session fornitore code generator.
 * @param initialMaxCode Optional: Initialize the counter with a specific max code (e.g., from DB).
 */
export function resetFornitoreCodeGenerator(initialMaxCode: number = 0) {
  lastGeneratedFornitoreCodeInSession = initialMaxCode;
  console.log('🚚 Reset del generatore di codici Fornitore. Iniziato da:', initialMaxCode);
}