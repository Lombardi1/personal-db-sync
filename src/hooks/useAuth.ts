import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface User {
  id: string;
  username: string;
  role: 'produzione' | 'amministratore';
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Controlla se c'è un utente salvato in localStorage
    const savedUser = localStorage.getItem('app_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    try {
      console.log('🔍 Tentativo login per username:', username);
      
      // Recupera l'utente dal database (case-insensitive)
      const { data: users, error: userError } = await supabase
        .from('app_users')
        .select('id, username, password_hash')
        .ilike('username', username)
        .single();

      console.log('📊 Risultato query utente:', { users, userError });

      if (userError || !users) {
        console.log('❌ Utente non trovato');
        throw new Error('Username o password non corretti');
      }

      console.log('✅ Utente trovato:', users.username);
      console.log('🔑 Hash password dal DB:', users.password_hash);
      console.log('🔑 Password inserita:', password);

      // Verifica la password
      const bcrypt = await import('bcryptjs');
      const isValid = await bcrypt.compare(password, users.password_hash);
      
      console.log('🔐 Risultato confronto password:', isValid);
      
      if (!isValid) {
        console.log('❌ Password non corretta');
        throw new Error('Username o password non corretti');
      }

      console.log('✅ Password corretta, recupero ruolo...');

      // Recupera il ruolo dell'utente
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', users.id)
        .single();

      console.log('📊 Risultato query ruolo:', { roleData, roleError });

      if (roleError || !roleData) {
        console.log('❌ Ruolo non trovato');
        throw new Error('Ruolo utente non trovato');
      }

      console.log('✅ Ruolo trovato:', roleData.role);

      const loggedUser: User = {
        id: users.id,
        username: users.username,
        role: roleData.role
      };

      setUser(loggedUser);
      localStorage.setItem('app_user', JSON.stringify(loggedUser));

      console.log('✅ Login completato con successo');
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
    isOperaio: user?.role === 'produzione',
    isAmministratore: user?.role === 'amministratore'
  };
}
