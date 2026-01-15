export function formatFormato(val: string | number): string {
  if (!val && val !== 0) return '';
  let s = String(val).trim();
  s = s.replace(/\s*cm$/i, '').trim();
  s = s.replace(/[×✕*]/g, 'x');
  const m = s.match(/(\d+(?:[\.,]\d+)?)\s*[xX]\s*(\d+(?:[\.,]\d+)?)/i) || s.match(/(\d+(?:[\.,]\d+)?)\s+(\d+(?:[\.,]\d+)?)/);
  if (m) {
    const a = m[1].replace(',', '.').trim();
    const b = m[2].replace(',', '.').trim();
    const na = a.replace(/\.0+$/, '');
    const nb = b.replace(/\.0+$/, '');
    return `${na} x ${nb} cm`;
  }
  if (/^\d+(?:[.,]\d+)?$/.test(s)) return s.replace(',', '.') + ' cm';
  return s;
}

export function formatGrammatura(val: string | number): string {
  if (!val) return '';
  const s = String(val).trim().replace(/\s*g\/m²\s*$/i, '');
  return s + ' g/m²';
}

export function formatFogli(val: number): string {
  return val.toLocaleString('it-IT', { maximumFractionDigits: 0 });
}

export function formatPrezzo(val: number): string {
  if (typeof val !== 'number' || isNaN(val)) return '';
  // Use Intl.NumberFormat for better localization and flexible decimal handling
  return new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: 2, // Always show at least two decimal places
    maximumFractionDigits: 3, // Allow up to three decimal places
  }).format(val) + ' €/kg';
}

export function formatData(dataISO: string | null | undefined): string {
  if (!dataISO) return '';
  try {
    const date = new Date(dataISO);
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date string provided to formatData: ${dataISO}`);
      return dataISO; // Return original string if invalid
    }
    return date.toLocaleDateString('it-IT'); // Formats to DD/MM/YYYY
  } catch (e) {
    console.error(`Error formatting date ${dataISO}:`, e);
    return dataISO; // Fallback to original string on error
  }
}

export function parseData(dataIT: string): string {
  if (!dataIT) return '';
  const [dd, mm, yyyy] = dataIT.split('/');
  return `${yyyy}-${mm}-${dd}`;
}

// Nuova funzione per ottenere il testo dello stato dell'ordine d'acquisto
export function getStatoText(stato: 'in_attesa' | 'confermato' | 'ricevuto' | 'annullato' | 'inviato'): string {
  switch (stato) {
    case 'in_attesa': return 'In Attesa';
    case 'inviato': return 'Inviato';
    case 'confermato': return 'Confermato';
    case 'ricevuto': return 'Ricevuto';
    case 'annullato': return 'Annullato';
    default: return stato;
  }
}

// Nuova funzione per ottenere le classi CSS del badge di stato
export function getStatoBadgeClass(stato: 'in_attesa' | 'confermato' | 'ricevuto' | 'annullato' | 'inviato'): string {
  switch (stato) {
    case 'in_attesa':
      return 'bg-[hsl(39,100%,90%)] text-[hsl(var(--stato-in-attesa))]';
    case 'inviato':
      return 'bg-[hsl(210,80%,90%)] text-[hsl(var(--stato-inviato-fg))]';
    case 'confermato':
      return 'bg-[hsl(142,71%,85%)] text-[hsl(var(--stato-confermato))]';
    case 'ricevuto':
      return 'bg-[hsl(142,76%,80%)] text-[hsl(var(--stato-ricevuto))]';
    case 'annullato':
      return 'bg-[hsl(0,72%,90%)] text-[hsl(var(--stato-annullato))]';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}