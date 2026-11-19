import { useState, useEffect } from 'react';
import { supabase, usernameToEmail } from '@/lib/supabase';

export interface AppUser {
  id: string;
  username: string;
  role: 'stampa' | 'amministratore' | 'macchina' | 'visualizzatore';
  macchina_id: string | null; // popolato solo per ruolo 'macchina'
  macchineIds: string[];
  macchineNomi: string[];
}

const CACHE_KEY = 'app_user';

// Il profilo (ruolo, macchine) è tenuto in cache solo per evitare lampeggi all'avvio:
// la sicurezza vera è nella sessione Supabase Auth e nelle regole RLS del database.
const readCache = (): AppUser | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as AppUser) : null;
  } catch {
    return null;
  }
};

const fetchProfile = async (): Promise<AppUser | null> => {
  const { data, error } = await supabase.rpc('get_my_profile');
  if (error || !data || data.length === 0) return null;
  const p = data[0];
  return {
    id: p.user_id,
    username: p.username,
    role: p.user_role as AppUser['role'],
    macchina_id: p.macchina_id || null,
    macchineIds: p.macchine_ids || [],
    macchineNomi: p.macchine_nomi || [],
  };
};

export function useAuth() {
  const [user, setUser] = useState<AppUser | null>(readCache);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let attivo = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!attivo) return;
      if (!data.session) {
        // nessuna sessione valida (anche per chi era entrato con il vecchio login): serve rientrare
        localStorage.removeItem(CACHE_KEY);
        setUser(null);
        setLoading(false);
        return;
      }
      const profilo = await fetchProfile();
      if (!attivo) return;
      if (profilo) {
        setUser(profilo);
        localStorage.setItem(CACHE_KEY, JSON.stringify(profilo));
      } else {
        await supabase.auth.signOut();
        localStorage.removeItem(CACHE_KEY);
        setUser(null);
      }
      setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        localStorage.removeItem(CACHE_KEY);
        setUser(null);
      }
    });
    return () => {
      attivo = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: usernameToEmail(username),
        password,
      });
      if (authError) {
        if (/invalid login credentials/i.test(authError.message)) throw new Error('Username o password non corretti');
        throw new Error('Errore di comunicazione con il server. Riprova più tardi.');
      }
      const loggedUser = await fetchProfile();
      if (!loggedUser) {
        await supabase.auth.signOut();
        throw new Error('Utente senza ruolo assegnato. Contatta l\'amministratore.');
      }
      setUser(loggedUser);
      localStorage.setItem(CACHE_KEY, JSON.stringify(loggedUser));
      return { success: true, user: loggedUser };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    supabase.auth.signOut();
    localStorage.removeItem(CACHE_KEY);
    setUser(null);
  };

  return {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    isMastro: user?.role === 'amministratore',
    isOperatore: user?.role === 'stampa',
    isStampa: user?.role === 'stampa',
    isAmministratore: user?.role === 'amministratore',
    isMacchina: user?.role === 'macchina',
    isVisualizzatore: user?.role === 'visualizzatore',
  };
}
