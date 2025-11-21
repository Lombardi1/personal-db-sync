import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Cliente, Fornitore } from '@/types';
import { toast } from 'sonner';

// Dati mock per i clienti
const MOCK_CLIENTI: Cliente[] = [
  {
    id: 'mock-c1',
    nome: 'Cliente Alpha Srl',
    indirizzo: 'Via Garibaldi 1',
    citta: 'Roma',
    cap: '00100',
    provincia: 'RM',
    partita_iva: '01234567890',
    codice_fiscale: 'ABCDEF01G23H456I',
    telefono: '0611223344',
    email: 'info@clientealpha.it',
    pec: 'pec@clientealpha.it',
    sdi: 'XXXXXXX',
    note: 'Cliente storico per cartoni personalizzati.',
    created_at: new Date().toISOString(),
  },
  {
    id: 'mock-c2',
    nome: 'Beta Industries Spa',
    indirizzo: 'Corso Italia 20',
    citta: 'Firenze',
    cap: '50100',
    provincia: 'FI',
    codice_fiscale: 'BTINDS98A01F205Z',
    telefono: '0559988776',
    email: 'acquisti@betaind.it',
    pec: '',
    sdi: '1234567',
    note: 'Nuovo cliente, potenziale grande volume.',
    created_at: new Date().toISOString(),
  },
];

// Dati mock per i fornitori
const MOCK_FORNITORI: Fornitore[] = [
  {
    id: 'mock-f1',
    nome: 'Imballex Srl',
    tipo_fornitore: 'Cartone',
    indirizzo: 'Via Roma 10',
    citta: 'Milano',
    cap: '20100',
    provincia: 'MI',
    partita_iva: '12345678901',
    codice_fiscale: 'IMBLX12A34B567C',
    telefono: '021234567',
    email: 'info@imballex.it',
    pec: 'pec@imballex.it',
    sdi: 'ABCDEFG',
    note: 'Fornitore principale di cartoni ondulati.',
    created_at: new Date().toISOString(),
  },
  {
    id: 'mock-f2',
    nome: 'Inchiostri Brillanti Spa',
    tipo_fornitore: 'Inchiostro',
    indirizzo: 'Piazza Garibaldi 5',
    citta: 'Torino',
    cap: '10121',
    provincia: 'TO',
    partita_iva: '09876543210',
    codice_fiscale: '',
    telefono: '011987654',
    email: 'vendite@inchiostribrillanti.it',
    pec: '',
    sdi: '',
    note: 'Specializzati in inchiostri ecologici.',
    created_at: new Date().toISOString(),
  },
  {
    id: 'mock-f3',
    nome: 'Colla Forte Snc',
    tipo_fornitore: 'Colla',
    indirizzo: 'Viale Europa 22',
    citta: 'Bologna',
    cap: '40128',
    provincia: 'BO',
    partita_iva: '11223344556',
    codice_fiscale: 'CLLFRT12A34B567D',
    telefono: '051234567',
    email: 'ordini@collaforte.it',
    pec: 'ordini@pec.collaforte.it',
    sdi: '7654321',
    note: 'Fornitore di colle industriali.',
    created_at: new Date().toISOString(),
  },
];

export function useAnagrafiche() {
  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [fornitori, setFornitori] = useState<Fornitore[]>([]);
  const [loading, setLoading] = useState(true);

  const useMockData = import.meta.env.VITE_MOCK_ANAGRAFICHE === 'true';

  const loadAnagrafiche = async () => {
    setLoading(true);
    console.log('useAnagrafiche: useMockData è', useMockData);

    if (useMockData) {
      // Simula il caricamento con dati mock
      await new Promise(resolve => setTimeout(resolve, 500)); // Simula un ritardo di rete
      setClienti(MOCK_CLIENTI); // Carica i clienti mock
      setFornitori(MOCK_FORNITORI);
      console.log('useAnagrafiche: Caricati dati mock per clienti:', MOCK_CLIENTI);
      console.log('useAnagrafiche: Caricati dati mock per fornitori:', MOCK_FORNITORI);
      setLoading(false);
      return;
    }

    try {
      const [clientiRes, fornitoriRes] = await Promise.all([
        supabase.from('clienti').select('*').order('nome', { ascending: true }),
        supabase.from('fornitori').select('*, tipo_fornitore').order('nome', { ascending: true })
      ]);

      console.log('useAnagrafiche: Risposta Supabase per clienti:', clientiRes);
      console.log('useAnagrafiche: Risposta Supabase per fornitori:', fornitoriRes);

      if (clientiRes.data) setClienti(clientiRes.data);
      if (fornitoriRes.data) setFornitori(fornitoriRes.data);
    } catch (error) {
      console.error('Errore caricamento anagrafiche:', error);
      toast.error('Errore nel caricamento delle anagrafiche.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnagrafiche();

    if (!useMockData) {
      const clientiChannel = supabase
        .channel('clienti-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'clienti' }, () => {
          loadAnagrafiche();
        })
        .subscribe();

      const fornitoriChannel = supabase
        .channel('fornitori-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'fornitori' }, () => {
          loadAnagrafiche();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(clientiChannel);
        supabase.removeChannel(fornitoriChannel);
      };
    }
    // Se si usano dati mock, non ci sono canali da rimuovere
    return () => {};
  }, [useMockData]); // Ricarica se cambia la modalità mock

  const addCliente = async (cliente: Omit<Cliente, 'id' | 'created_at'>) => {
    if (useMockData) {
      console.log('Mock: Aggiungi cliente', cliente);
      const newMockCliente = { ...cliente, id: `mock-c-${Date.now()}`, created_at: new Date().toISOString() };
      setClienti(prev => [...prev, newMockCliente]); // Aggiorna lo stato mock
      toast.success(`✅ Mock: Cliente '${cliente.nome}' aggiunto con successo!`);
      return { success: true, data: newMockCliente };
    }
    const { data, error } = await supabase.from('clienti').insert([cliente]).select().single();
    if (error) {
      toast.error(`Errore aggiunta cliente: ${error.message}`);
      return { success: false, error };
    }
    toast.success(`✅ Cliente '${cliente.nome}' aggiunto con successo!`);
    await loadAnagrafiche(); // Ricarica i dati dopo l'aggiunta
    return { success: true, data };
  };

  const updateCliente = async (id: string, cliente: Partial<Omit<Cliente, 'id' | 'created_at'>>) => {
    if (useMockData) {
      console.log('Mock: Modifica cliente', id, cliente);
      setClienti(prev => prev.map(c => c.id === id ? { ...c, ...cliente } : c)); // Aggiorna lo stato mock
      toast.success(`✅ Mock: Cliente '${cliente.nome || id}' modificato con successo!`);
      return { success: true, data: { ...cliente, id } as Cliente };
    }
    const { data, error } = await supabase.from('clienti').update(cliente).eq('id', id).select().single();
    if (error) {
      toast.error(`Errore modifica cliente: ${error.message}`);
      return { success: false, error };
    }
    toast.success(`✅ Cliente '${cliente.nome || id}' modificato con successo!`);
    await loadAnagrafiche(); // Ricarica i dati dopo la modifica
    return { success: true, data };
  };

  const deleteCliente = async (id: string) => {
    if (useMockData) {
      console.log('Mock: Elimina cliente', id);
      setClienti(prev => prev.filter(c => c.id !== id)); // Aggiorna lo stato mock
      toast.success('✅ Mock: Cliente eliminato con successo!');
      return { success: true };
    }
    const { error } = await supabase.from('clienti').delete().eq('id', id);
    if (error) {
      toast.error(`Errore eliminazione cliente: ${error.message}`);
      return { success: false, error };
    }
    toast.success('✅ Cliente eliminato con successo!');
    await loadAnagrafiche(); // Ricarica i dati dopo l'eliminazione
    return { success: true };
  };

  const addFornitore = async (fornitore: Omit<Fornitore, 'id' | 'created_at'>) => {
    if (useMockData) {
      console.log('Mock: Aggiungi fornitore', fornitore);
      const newMockFornitore = { ...fornitore, id: `mock-f-${Date.now()}`, created_at: new Date().toISOString() };
      setFornitori(prev => [...prev, newMockFornitore]); // Aggiorna lo stato mock
      toast.success(`✅ Mock: Fornitore '${fornitore.nome}' aggiunto con successo!`);
      return { success: true, data: newMockFornitore };
    }
    const { data, error } = await supabase.from('fornitori').insert([fornitore]).select().single();
    if (error) {
      toast.error(`Errore aggiunta fornitore: ${error.message}`);
      return { success: false, error };
    }
    toast.success(`✅ Fornitore '${fornitore.nome}' aggiunto con successo!`);
    await loadAnagrafiche(); // Ricarica i dati dopo l'aggiunta
    return { success: true, data };
  };

  const updateFornitore = async (id: string, fornitore: Partial<Omit<Fornitore, 'id' | 'created_at'>>) => {
    if (useMockData) {
      console.log('Mock: Modifica fornitore', id, fornitore);
      setFornitori(prev => prev.map(f => f.id === id ? { ...f, ...fornitore } : f)); // Aggiorna lo stato mock
      toast.success(`✅ Mock: Fornitore '${fornitore.nome || id}' modificato con successo!`);
      return { success: true, data: { ...fornitore, id } as Fornitore };
    }
    const { data, error } = await supabase.from('fornitori').update(fornitore).eq('id', id).select().single();
    if (error) {
      toast.error(`Errore modifica fornitore: ${error.message}`);
      return { success: false, error };
    }
    toast.success(`✅ Fornitore '${fornitore.nome || id}' modificato con successo!`);
    await loadAnagrafiche(); // Ricarica i dati dopo la modifica
    return { success: true, data };
  };

  const deleteFornitore = async (id: string) => {
    if (useMockData) {
      console.log('Mock: Elimina fornitore', id);
      setFornitori(prev => prev.filter(f => f.id !== id)); // Aggiorna lo stato mock
      toast.success('✅ Mock: Fornitore eliminato con successo!');
      return { success: true };
    }
    const { error } = await supabase.from('fornitori').delete().eq('id', id);
    if (error) {
      toast.error(`Errore eliminazione fornitore: ${error.message}`);
      return { success: false, error };
    }
    toast.success('✅ Fornitore eliminato con successo!');
    await loadAnagrafiche(); // Ricarica i dati dopo l'eliminazione
    return { success: true };
  };

  return {
    clienti,
    fornitori,
    loading,
    addCliente,
    updateCliente,
    deleteCliente,
    addFornitore,
    updateFornitore,
    deleteFornitore,
  };
}