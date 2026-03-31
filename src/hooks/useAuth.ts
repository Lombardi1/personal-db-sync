import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export interface AppUser {
  id: string;
  username: string;
  role: 'stampa' | 'amministratore';
  ruolo: 'mastro' | 'operatore';
  macchineIds: string[];
  macchineNomi: string[];
}

export function useAuth() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('app_user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const { data: authData, error: authError } = await supabase.rpc('get_user_auth_data', { p_username: username });

      if (authError) throw new Error('Errore di comunicazione con il server. Riprova più tardi.');
      if (!authData || authData.length === 0) throw new Error('Username o password non corretti');

      const userRecord = authData[0];
      const isValid = await bcrypt.compare(password, userRecord.password_hash);
      if (!isValid) throw new Error('Username o password non corretti');

      const loggedUser: AppUser = {
        id: userRecord.user_id,
        username: userRecord.username,
        role: userRecord.user_role as 'stampa' | 'amministratore',
        ruolo: (userRecord.ruolo || 'operatore') as 'mastro' | 'operatore',
        macchineIds: userRecord.macchine_ids || [],
        macchineNomi: userRecord.macchine_nomi || [],
      };

      setUser(loggedUser);
      localStorage.setItem('app_user', JSON.stringify(loggedUser));
      return { success: true, user: loggedUser };
    } catch (error: any) {
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
    isMastro: user?.ruolo === 'mastro',
    isOperatore: user?.ruolo === 'operatore',
    isStampa: user?.role === 'stampa',
    isAmministratore: user?.role === 'amministratore',
  };
}
