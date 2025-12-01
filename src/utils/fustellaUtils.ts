import { supabase } from '@/lib/supabase';

let usedFustellaNumbers: Set<number> = new Set(); // Memorizza i numeri come 1, 2, 3 da FST-001, FST-002, FST-003

/**
 * Recupera tutti i numeri di codice Fustella esistenti dal database.
 * @returns Un array di numeri che rappresentano la parte numerica dei codici FST esistenti.
 */
export async function fetchExistingFustellaNumbersFromDB(): Promise<number[]> {
  const { data, error } = await supabase
    .from('fustelle')
    .select('codice');

  if (error) {
    console.error('Errore nel recupero dei codici fustella esistenti:', error);
    return [];
  }

  const numbers: number[] = [];
  if (data && data.length > 0) {
    for (const row of data) {
      const num = parseInt(row.codice.replace('FST-', ''));
      if (!isNaN(num)) {
        numbers.push(num);
      }
    }
  }
  return numbers;
}

/**
 * Trova il più piccolo intero positivo mancante in un array ordinato di numeri.
 * Se non ci sono buchi, restituisce il massimo + 1.
 * @param sortedNumbers Un array ordinato di numeri esistenti.
 * @returns Il prossimo numero disponibile.
 */
function findSmallestMissingPositive(sortedNumbers: number[]): number {
  let expected = 1;
  for (const num of sortedNumbers) {
    if (num === expected) {
      expected++;
    } else if (num > expected) {
      return expected; // Trovato un buco
    }
  }
  return expected; // Nessun buco, restituisce max + 1
}

/**
 * Genera il prossimo codice Fustella unico, riempiendo i buchi se disponibili.
 * Questa funzione è sincrona e si basa su `usedFustellaNumbers` correttamente inizializzato.
 * @returns Il prossimo codice FST formattato (es. 'FST-001', 'FST-004').
 */
export function generateNextFustellaCode(): string {
  const sortedUsedNumbers = Array.from(usedFustellaNumbers).sort((a, b) => a - b);
  const nextNum = findSmallestMissingPositive(sortedUsedNumbers);
  
  usedFustellaNumbers.add(nextNum); // Segna questo numero come usato per la sessione corrente
  
  const formattedCode = `FST-${String(nextNum).padStart(3, '0')}`;
  console.log('✂️ Generato nuovo codice Fustella (in-session):', formattedCode);
  return formattedCode;
}

/**
 * Resetta il generatore di codici Fustella in-sessione.
 * Dovrebbe essere chiamato all'avvio di un nuovo form o quando i dati vengono ricaricati.
 * @param initialUsedNumbers Un array di numeri che rappresentano tutti i codici FST attualmente usati dal DB.
 */
export function resetFustellaCodeGenerator(initialUsedNumbers: number[] = []) {
  usedFustellaNumbers = new Set(initialUsedNumbers);
  console.log('✂️ Reset del generatore di codici Fustella. Numeri iniziali usati:', Array.from(usedFustellaNumbers).sort((a, b) => a - b));
}