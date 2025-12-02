import { supabase } from '@/lib/supabase';

/**
 * Finds the next available Polimero code, filling in any gaps.
 * @returns The next available PLM code (e.g., 'PLM-001', 'PLM-002' if 001 is deleted).
 */
export async function findNextAvailablePolimeroCode(): Promise<string> {
  const { data, error } = await supabase
    .from('polimeri')
    .select('codice')
    .order('codice', { ascending: true }); // Order ascending to find gaps

  if (error) {
    console.error('Error fetching polimero codes for gap-filling:', error);
    return 'PLM-001'; // Fallback
  }

  const existingNumbers: number[] = [];
  if (data && data.length > 0) {
    data.forEach(polimero => {
      const num = parseInt(polimero.codice.replace('PLM-', ''));
      if (!isNaN(num)) {
        existingNumbers.push(num);
      }
    });
  }

  existingNumbers.sort((a, b) => a - b);

  let nextAvailableNum = 1;
  for (const num of existingNumbers) {
    if (num === nextAvailableNum) {
      nextAvailableNum++;
    } else if (num > nextAvailableNum) {
      // Found a gap
      break;
    }
  }

  const formattedCode = `PLM-${String(nextAvailableNum).padStart(3, '0')}`;
  console.log('🧪 Trovato prossimo codice Polimero disponibile:', formattedCode);
  return formattedCode;
}