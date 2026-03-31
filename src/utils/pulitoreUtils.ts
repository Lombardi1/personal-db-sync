import { supabase } from '@/lib/supabase';

/**
 * Trova il prossimo codice Pulitore disponibile.
 * Priorità:
 * 1. Prima fustella con "buco" nella sequenza PU (slot vuoto da riutilizzare)
 * 2. MAX codice esistente + 1
 * Formato codice: PU0001, PU0002, ...
 *
 * Un "buco" è un numero intero mancante nella sequenza dei pulitore_codice assegnati.
 * Supporta sia il vecchio formato PUL-001/PU-001 che il nuovo PU0001.
 */
export async function findNextAvailablePulitoreCode(): Promise<string> {
  // Scarica tutti i pulitore_codice con paginazione per superare il limite 1000 di Supabase
  let allCodes: string[] = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('fustelle')
      .select('pulitore_codice')
      .not('pulitore_codice', 'is', null)
      .range(from, from + pageSize - 1);

    if (error) {
      console.error('🧹 Errore fetch pulitore codes:', error);
      break;
    }
    if (!data || data.length === 0) break;

    data.forEach(r => {
      if (r.pulitore_codice) allCodes.push(r.pulitore_codice);
    });

    if (data.length < pageSize) break;
    from += pageSize;
  }

  // Estrai i numeri da tutti i formati: PU0001, PUL-001, PU-001
  const existingNumbers: number[] = [];
  allCodes.forEach(code => {
    const match = code.match(/^(?:PUL?-?)(\d+)$/);
    if (match) existingNumbers.push(parseInt(match[1], 10));
  });

  existingNumbers.sort((a, b) => a - b);

  // Trova il primo buco nella sequenza (gap-fill)
  let nextAvailableNum = 1;
  for (const num of existingNumbers) {
    if (num === nextAvailableNum) {
      nextAvailableNum++;
    } else if (num > nextAvailableNum) {
      break; // trovato un buco
    }
  }

  const formattedCode = `PU${String(nextAvailableNum).padStart(4, '0')}`;
  console.log('🧹 Prossimo codice Pulitore disponibile:', formattedCode);
  return formattedCode;
}
