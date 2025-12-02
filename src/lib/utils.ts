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
 * Parsa una stringa numerica secondo la preferenza dell'utente (punto come decimale, virgola come migliaia).
 * Rimuove i separatori delle migliaia (virgole) e poi usa parseFloat che interpreta il punto come decimale.
 * @param value La stringa o il numero da parsare.
 * @returns Il numero parsato o undefined se non è un numero valido.
 */
export function parseUserNumber(value: string | number | undefined | null): number | undefined {
  if (value === '' || value === null || value === undefined) return undefined;
  const s = String(value).trim();
  // Rimuove le virgole (separatori delle migliaia)
  const cleaned = s.replace(/,/g, '');
  // parseFloat interpreterà il punto come separatore decimale
  const num = parseFloat(cleaned);
  return isNaN(num) ? undefined : num;
}

/**
 * Formatta un numero JavaScript standard in una stringa secondo la preferenza dell'utente
 * (punto come decimale, virgola come migliaia). Questo corrisponde al formato 'en-US'.
 * @param value Il numero da formattare.
 * @param options Opzioni per Intl.NumberFormat (es. { minimumFractionDigits: 2, maximumFractionDigits: 2 }).
 * @returns La stringa formattata o una stringa vuota se il valore non è un numero valido.
 */
export function formatUserNumber(value: number | undefined | null, options?: Intl.NumberFormatOptions): string {
  if (value === undefined || value === null || isNaN(value)) return '';
  // Utilizza 'en-US' per punto come decimale e virgola come migliaia
  return new Intl.NumberFormat('en-US', options).format(value);
}