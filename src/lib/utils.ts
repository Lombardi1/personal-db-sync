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
 * Converte ricorsivamente tutte le stringhe vuote in null all'interno di un oggetto.
 * Utile per preparare i dati prima di inviarli a Supabase, dove le stringhe vuote
 * per i campi nullable potrebbero non essere interpretate come null.
 * @param obj L'oggetto da processare.
 * @returns L'oggetto con le stringhe vuote convertite in null.
 */
export function convertEmptyStringsToNull<T extends object>(obj: T): T {
  const newObj = { ...obj };
  for (const key in newObj) {
    if (Object.prototype.hasOwnProperty.call(newObj, key)) {
      const value = newObj[key];
      if (typeof value === 'string' && value.trim() === '') {
        (newObj as any)[key] = null;
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        (newObj as any)[key] = convertEmptyStringsToNull(value);
      } else if (Array.isArray(value)) {
        (newObj as any)[key] = value.map(item => 
          typeof item === 'object' && item !== null ? convertEmptyStringsToNull(item) : item
        );
      }
    }
  }
  return newObj;
}