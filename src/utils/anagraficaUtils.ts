import { supabase } from '@/lib/supabase';
import { toast } from 'sonner'; // Importa toast per le notifiche

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

/**
 * Assigns missing 'codice_anagrafica' to existing clients and suppliers in the database.
 * This function should be called once to migrate existing data.
 */
export async function assignMissingAnagraficaCodes() {
  toast.info('Assegnazione codici anagrafici mancanti in corso...');
  let updatedClients = 0;
  let updatedFornitori = 0;

  try {
    // --- Clients ---
    const { data: clientsWithoutCode, error: clientsError } = await supabase
      .from('clienti')
      .select('id, codice_anagrafica')
      .or('codice_anagrafica.is.null,codice_anagrafica.eq.');

    if (clientsError) throw clientsError;

    if (clientsWithoutCode && clientsWithoutCode.length > 0) {
      const maxClientCode = await fetchMaxClientCodeFromDB();
      resetClientCodeGenerator(maxClientCode);

      for (const client of clientsWithoutCode) {
        const newCode = generateNextClientCode();
        const { error: updateError } = await supabase
          .from('clienti')
          .update({ codice_anagrafica: newCode })
          .eq('id', client.id);

        if (updateError) {
          console.error(`Error updating client ${client.id} with code ${newCode}:`, updateError);
          toast.error(`Errore aggiornamento cliente ${client.id}: ${updateError.message}`);
        } else {
          updatedClients++;
        }
      }
    }

    // --- Fornitori ---
    const { data: fornitoriWithoutCode, error: fornitoriError } = await supabase
      .from('fornitori')
      .select('id, codice_anagrafica')
      .or('codice_anagrafica.is.null,codice_anagrafica.eq.');

    if (fornitoriError) throw fornitoriError;

    if (fornitoriWithoutCode && fornitoriWithoutCode.length > 0) {
      const maxFornitoreCode = await fetchMaxFornitoreCodeFromDB();
      resetFornitoreCodeGenerator(maxFornitoreCode);

      for (const fornitore of fornitoriWithoutCode) {
        const newCode = generateNextFornitoreCode();
        const { error: updateError } = await supabase
          .from('fornitori')
          .update({ codice_anagrafica: newCode })
          .eq('id', fornitore.id);

        if (updateError) {
          console.error(`Error updating fornitore ${fornitore.id} with code ${newCode}:`, updateError);
          toast.error(`Errore aggiornamento fornitore ${fornitore.id}: ${updateError.message}`);
        } else {
          updatedFornitori++;
        }
      }
    }

    if (updatedClients > 0 || updatedFornitori > 0) {
      toast.success(`✅ Assegnati ${updatedClients} codici a clienti e ${updatedFornitori} a fornitori.`);
    } else {
      toast.info('Nessun codice anagrafico mancante da assegnare.');
    }
  } catch (error: any) {
    console.error('Errore durante l\'assegnazione dei codici anagrafici:', error);
    toast.error(`Errore generale: ${error.message}`);
  }
}