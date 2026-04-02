import { supabase } from '@/lib/supabase';

/**
 * Considera "vuoto" un polimero che non ha dati fisici assegnati:
 * codice_fornitore = null, '' o '-'  E  cliente = null o ''
 */
function isPolimeroVuoto(p: { codice_fornitore: string | null; cliente: string | null }): boolean {
  const cf = (p.codice_fornitore ?? '').trim();
  const cl = (p.cliente ?? '').trim();
  return (cf === '' || cf === '-') && cl === '';
}

/**
 * Trova il prossimo codice Polimero disponibile.
 * Priorità:
 * 1. Polimero con numero più basso che è "vuoto" (spazio fisico libero)
 * 2. MAX codice esistente + 1
 * Formato: PO0001, PO0002, ...
 */
export async function findNextAvailablePolimeroCode(): Promise<string> {
  // Scarica tutti i codici con paginazione per superare il limite 1000 di Supabase
  let allData: { codice: string; codice_fornitore: string | null; cliente: string | null }[] = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('polimeri')
      .select('codice, codice_fornitore, cliente')
      .order('codice', { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      console.error('Error fetching polimero codes:', error);
      break;
    }
    if (!data || data.length === 0) break;
    allData = allData.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  if (allData.length === 0) return 'PO0001';

  // 1. Primo polimero vuoto (numero più basso, già ordinato ascending)
  const primo = allData.find(isPolimeroVuoto);
  if (primo) {
    console.log('♻️ Riutilizzo polimero vuoto:', primo.codice);
    return primo.codice;
  }

  // 2. MAX + 1
  const lastCode = allData[allData.length - 1].codice;
  const match = lastCode.match(/^PO(\d+)$/);
  if (!match) return 'PO0001';

  const nextNum = parseInt(match[1], 10) + 1;
  const formattedCode = `PO${String(nextNum).padStart(4, '0')}`;
  console.log('🆕 Prossimo codice Polimero disponibile:', formattedCode);
  return formattedCode;
}
