import { supabase } from '@/lib/supabase';

/**
 * Fetches the maximum sequential order number for the current year from the database.
 * @returns The highest sequential order number found, or 0 if none.
 */
export async function fetchMaxOrdineAcquistoNumeroFromDB(): Promise<number> {
  const currentYearShort = new Date().getFullYear().toString().slice(-2);
  const prefix = `%/${currentYearShort}`; // Matches e.g., '1/24', '10/24'

  const { data, error } = await supabase
    .from('ordini_acquisto')
    .select('numero_ordine')
    .like('numero_ordine', prefix)
    .order('numero_ordine', { ascending: false }); // Ordering by string might not be numeric, need to parse

  if (error) {
    console.error('Error fetching max order number:', error);
    return 0;
  }

  let maxSeqNum = 0;
  if (data && data.length > 0) {
    for (const row of data) {
      const parts = row.numero_ordine?.split('/');
      if (parts && parts.length === 2) {
        const seqNum = parseInt(parts[0]);
        if (!isNaN(seqNum) && seqNum > maxSeqNum) {
          maxSeqNum = seqNum;
        }
      }
    }
  }
  return maxSeqNum;
}

/**
 * Generates the next unique order number for the current year.
 * This function is synchronous and relies on `initialMaxNum` being correctly initialized.
 * @param initialMaxNum The highest sequential number found so far for the current year.
 * @returns The next formatted order number (e.g., '001/24').
 */
export function generateNextOrdineAcquistoNumero(initialMaxNum: number): string {
  const currentYearShort = new Date().getFullYear().toString().slice(-2);
  const nextSeqNum = initialMaxNum + 1;
  return `${nextSeqNum}/${currentYearShort}`;
}