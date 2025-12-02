import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { AnagraficaBase, Fornitore, Cliente } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalizza i dati di un'anagrafica, convertendo i valori null in stringhe vuote per i campi stringa.
 * Questo è utile per i form React Hook Form che preferiscono stringhe vuote a null per i campi di input.
 */
export function normalizeAnagraficaData(data: AnagraficaBase | Fornitore | Cliente | null | undefined): AnagraficaBase | Fornitore | Cliente {
  if (!data) {
    return {
      nome: '', indirizzo: '', citta: '', cap: '', provincia: '',
      partita_iva: '', codice_fiscale: '', telefono: '', email: '',
      pec: '', sdi: '', note: '', condizione_pagamento: '',
      considera_iva: false // Default considera_iva per entrambi
    };
  }
  
  const baseData: AnagraficaBase = {
    nome: data.nome || '',
    indirizzo: data.indirizzo || '',
    citta: data.citta || '',
    cap: data.cap || '',
    provincia: data.provincia || '',
    partita_iva: data.partita_iva || '',
    codice_fiscale: data.codice_fiscale || '',
    telefono: data.telefono || '',
    email: data.email || '',
    pec: data.pec || '',
    sdi: data.sdi || '',
    note: data.note || '',
    condizione_pagamento: data.condizione_pagamento || '',
    ...(data.id && { id: data.id }),
    ...(data.created_at && { created_at: data.created_at }),
  };
  
  // Se è un fornitore, aggiunge tipo_fornitore, considera_iva e banca
  if ('tipo_fornitore' in data) {
    return {
      ...baseData,
      tipo_fornitore: (data as Fornitore).tipo_fornitore || '',
      considera_iva: (data as Fornitore).considera_iva || false,
      banca: (data as Fornitore).banca || '' // NUOVO: Aggiunto il campo banca
    } as Fornitore;
  }
  
  // Se è un cliente, aggiunge considera_iva
  if ('considera_iva' in data) {
    return {
      ...baseData,
      considera_iva: (data as Cliente).considera_iva || false
    } as Cliente;
  }
  
  return baseData;
}

/**
 * Parsa una stringa numerica, gestendo sia il punto che la virgola come potenziale separatore decimale.
 * Assume che il primo punto o virgola sia il separatore decimale, e gli altri siano separatori delle migliaia.
 * @param value La stringa o il numero da parsare.
 * @returns Il numero parsato o undefined se non è un numero valido.
 */
export function parseInputNumber(value: string | number | undefined | null): number | undefined {
  if (value === '' || value === null || value === undefined) return undefined;
  let s = String(value).trim();

  // Rimuove tutti i caratteri che non sono cifre, punti o virgole, o il segno meno
  s = s.replace(/[^\d.,-]/g, '');

  // Trova l'ultima occorrenza di un punto o una virgola
  const lastDotIndex = s.lastIndexOf('.');
  const lastCommaIndex = s.lastIndexOf(',');

  // Se non ci sono separatori, è un numero intero semplice
  if (lastDotIndex === -1 && lastCommaIndex === -1) {
    const num = parseInt(s);
    return isNaN(num) ? undefined : num;
  }

  // Se l'ultimo separatore è una virgola, assumiamo che sia il decimale (formato italiano)
  if (lastCommaIndex > lastDotIndex) {
    s = s.replace(/\./g, ''); // Rimuove tutti i punti (separatori migliaia)
    s = s.replace(',', '.');  // Sostituisce la virgola (decimale) con un punto
  } 
  // Se l'ultimo separatore è un punto, assumiamo che sia il decimale (formato anglosassone)
  else if (lastDotIndex > lastCommaIndex) {
    s = s.replace(/,/g, ''); // Rimuove tutte le virgole (separatori migliaia)
    // Il punto è già il decimale, non serve sostituire
  } else {
    // Caso ambiguo (es. solo un punto o solo una virgola, già gestito sopra, o formati strani)
    // Per sicurezza, rimuoviamo le virgole e trattiamo il punto come decimale (default anglosassone)
    s = s.replace(/,/g, '');
  }

  const num = parseFloat(s);
  return isNaN(num) ? undefined : num;
}

/**
 * Formatta un numero JavaScript standard in una stringa in formato italiano (es. "1.234,56").
 * @param value Il numero da formattare.
 * @param options Opzioni per Intl.NumberFormat (es. { minimumFractionDigits: 2, maximumFractionDigits: 2 }).
 * @returns La stringa formattata o una stringa vuota se il valore non è un numero valido.
 */
export function formatOutputNumber(value: number | undefined | null, options?: Intl.NumberFormatOptions): string {
  if (value === undefined || value === null || isNaN(value)) return '';
  return new Intl.NumberFormat('it-IT', options).format(value);
}