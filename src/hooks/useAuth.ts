import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface User {
  id: string;
  username: string;
  role: 'stampa' | 'amministratore'; // Ruolo aggiornato
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Controlla se c'è un utente salvato in localStorage
    const savedUser = localStorage.getItem('app_user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      console.log('useAuth: User loaded from localStorage:', parsedUser.id, parsedUser.username); // Log aggiunto
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    try {
      console.log('🔍 Tentativo login per username:', username);
      
      // Chiama la funzione PostgreSQL per recuperare in modo sicuro l'hash della password, l'ID utente e il ruolo
      const { data: authData, error: authError } = await supabase.rpc('get_user_auth_data', { p_username: username });

      console.log('📊 Risultato funzione SQL get_user_auth_data:', { authData, authError });

      if (authError || !authData || authData.length === 0) {
        console.log('❌ Utente non trovato o errore nella funzione SQL');
        throw new Error('Username o password non corretti');
      }

      const userRecord = authData[0]; // La funzione restituisce una tabella, prendiamo la prima riga
      
      console.log('✅ Utente trovato:', userRecord.username);
      console.log('🔑 Hash password dal DB:', userRecord.password_hash);
      console.log('🔑 Password inserita:', password);

      // Verifica la password
      const bcrypt = await import('bcryptjs');
      const isValid = await bcrypt.compare(password, userRecord.password_hash);
      
      console.log('🔐 Risultato confronto password:', isValid);
      
      if (!isValid) {
        console.log('❌ Password non corretta');
        throw new Error('Username o password non corretti');
      }

      console.log('✅ Password corretta, ruolo recuperato:', userRecord.user_role);

      const loggedUser: User = {
        id: userRecord.user_id, // Usa l'ID restituito dalla funzione SQL
        username: userRecord.username,
        role: userRecord.user_role as 'stampa' | 'amministratore' // Recupera il ruolo direttamente dal risultato RPC
      };

      setUser(loggedUser);
      localStorage.setItem('app_user', JSON.stringify(loggedUser));

      console.log('✅ Login completato con successo. User ID:', loggedUser.id); // Log aggiunto
      return { success: true, user: loggedUser };
    } catch (error: any) {
      console.error('❌ Errore login:', error);
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('app_user');
  };

  return {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    isStampa: user?.role === 'stampa', // Rinomina da isOperaio a isStampa
    isAmministratore: user?.role === 'amministratore'
  };
}