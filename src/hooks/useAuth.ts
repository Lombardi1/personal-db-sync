import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface User {
  id: string;
  username: string;
  role: 'operaio' | 'amministratore';
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
      // Recupera l'utente dal database
      const { data: users, error: userError } = await supabase
        .from('app_users')
        .select('id, username, password_hash')
        .eq('username', username)
        .single();

      if (userError || !users) {
        throw new Error('Username o password non corretti');
      }

      // Verifica la password (in produzione usare bcrypt.compare)
      // Per ora semplificata, in produzione fare hash comparison
      const bcrypt = await import('bcryptjs');
      const isValid = await bcrypt.compare(password, users.password_hash);
      
      if (!isValid) {
        throw new Error('Username o password non corretti');
      }

      // Recupera il ruolo dell'utente
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', users.id)
        .single();

      if (roleError || !roleData) {
        throw new Error('Ruolo utente non trovato');
      }

      const loggedUser: User = {
        id: users.id,
        username: users.username,
        role: roleData.role
      };

      setUser(loggedUser);
      localStorage.setItem('app_user', JSON.stringify(loggedUser));

      return { success: true, user: loggedUser };
    } catch (error: any) {
      console.error('Errore login:', error);
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
    isOperaio: user?.role === 'operaio',
    isAmministratore: user?.role === 'amministratore'
  };
}
