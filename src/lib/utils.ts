import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { AnagraficaBase, Fornitore } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalizza i dati di un'anagrafica, convertendo i valori null in stringhe vuote per i campi stringa.
 * Questo è utile per i form React Hook Form che preferiscono stringhe vuote a null per i campi di input.
 */
export function normalizeAnagraficaData(data: AnagraficaBase | Fornitore | null | undefined): AnagraficaBase | Fornitore {
  if (!data) {
    return {
      nome: '', indirizzo: '', citta: '', cap: '', provincia: '',
      partita_iva: '', codice_fiscale: '', telefono: '', email: '',
      pec: '', sdi: '', note: ''
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
    ...(data.id && { id: data.id }),
    ...(data.created_at && { created_at: data.created_at }),
  };
  
  // Se è un fornitore, aggiunge tipo_fornitore
  if ('tipo_fornitore' in data) {
    return {
      ...baseData,
      tipo_fornitore: data.tipo_fornitore || ''
    } as Fornitore;
  }
  
  return baseData;
}