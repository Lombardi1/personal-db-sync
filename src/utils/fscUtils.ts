import { supabase } from '@/lib/supabase';
import { OrdineAcquisto, ArticoloOrdineAcquisto } from '@/types';

let lastGeneratedFscCommessaInSession: { [year: string]: number } = {};

/**
 * Fetches the maximum FSC commessa number for a given year from the database.
 * @param yearShort The two-digit year for which to fetch the max commessa number (e.g., '24' for 2024).
 * @returns The highest sequential commessa number found, or 0 if none.
 */
export async function fetchMaxFscCommessaFromDB(yearShort: string): Promise<number> {
  // Fetch all orders_acquisto. We will filter articles client-side.
  const { data, error } = await supabase
    .from('ordini_acquisto')
    .select('articoli'); // Select only the 'articoli' column

  if (error) {
    console.error('Error fetching max FSC commessa number:', error);
    return 0;
  }

  let maxSeqNum = 0;
  if (data && data.length > 0) {
    for (const order of data) { // 'order' here is { articoli: ArticoloOrdineAcquisto[] }
      const articoli = order.articoli as ArticoloOrdineAcquisto[]; // Cast to the correct type
      if (articoli) {
        for (const article of articoli) {
          if (article.fsc && article.rif_commessa_fsc) {
            const parts = article.rif_commessa_fsc.split('/');
            if (parts.length === 2 && parts[1] === yearShort) {
              const seqNum = parseInt(parts[0]);
              if (!isNaN(seqNum) && seqNum > maxSeqNum) {
                maxSeqNum = seqNum;
              }
            }
          }
        }
      }
    }
  }
  return maxSeqNum;
}

/**
 * Generates the next unique FSC commessa number for the current year.
 * This function is synchronous and relies on `lastGeneratedFscCommessaInSession` being correctly initialized.
 * @param orderYear The full year of the order (e.g., 2024).
 * @returns The next formatted FSC commessa number (e.g., '32/24' for 2024, '1/25' for 2025).
 */
export function generateNextFscCommessa(orderYear: number): string {
  const currentYearShort = String(orderYear).slice(-2);
  
  if (!lastGeneratedFscCommessaInSession[currentYearShort]) {
    // Fallback initialization if resetFscCommessaGenerator wasn't called
    // This ensures the first generated number is 1 if no previous max is set.
    lastGeneratedFscCommessaInSession[currentYearShort] = 0; 
  }

  lastGeneratedFscCommessaInSession[currentYearShort]++;
  const formattedCommessa = `${lastGeneratedFscCommessaInSession[currentYearShort]}/${currentYearShort}`;
  console.log(`📦 Generato nuovo riferimento commessa FSC (in-session) per ${orderYear}:`, formattedCommessa);
  return formattedCommessa;
}

/**
 * Resets the in-session FSC commessa generator for a specific year.
 * Should be called when starting a new order form or when the year changes.
 * @param initialMaxNum The highest sequential number found so far for the given year.
 * @param year The full year for which to reset the generator (e.g., 2024).
 */
export function resetFscCommessaGenerator(initialMaxNum: number, year: number) {
  const currentYearShort = String(year).slice(-2);
  lastGeneratedFscCommessaInSession[currentYearShort] = initialMaxNum;
  console.log(`📦 Reset del generatore di commesse FSC per l'anno ${year}. Iniziato da:`, initialMaxNum);
}