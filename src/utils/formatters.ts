export function formatFormato(val: string | number): string {
  if (!val && val !== 0) return '';
  let s = String(val).trim();
  s = s.replace(/\s*cm$/i, '').trim();
  s = s.replace(/[×✕*]/g, 'x');
  const m = s.match(/(\d+(?:[\.,]\d+)?)\s*[xXx]\s*(\d+(?:[\.,]\d+)?)/i) || s.match(/(\d+(?:[\.,]\d+)?)\s+(\d+(?:[\.,]\d+)?)/);
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
  return val.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €/kg';
}

export function formatData(dataISO: string): string {
  if (!dataISO) return '';
  const [yyyy, mm, dd] = dataISO.split('-');
  return `${dd}/${mm}/${yyyy}`;
}

export function parseData(dataIT: string): string {
  if (!dataIT) return '';
  const [dd, mm, yyyy] = dataIT.split('/');
  return `${yyyy}-${mm}-${dd}`;
}
