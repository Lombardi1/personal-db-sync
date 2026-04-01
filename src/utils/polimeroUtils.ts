import { supabase } from '@/lib/supabase';

/**
 * Trova il prossimo codice Polimero disponibile: sempre MAX+1.
 * Formato: PO0001, PO0002, ...
 */
export async function findNextAvailablePolimeroCode(): Promise<string> {
  const { data, error } = await supabase
    .from('polimeri')
    .select('codice')
    .order('codice', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return 'PO0001';

  const match = data.codice.match(/^PO(\d+)$/);
  if (!match) return 'PO0001';

  const nextNum = parseInt(match[1], 10) + 1;
  return `PO${String(nextNum).padStart(4, '0')}`;
}
