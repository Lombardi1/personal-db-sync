import { createClient } from '@supabase/supabase-js';

// Chiave pubblicabile (sicura da esporre nel browser): i dati sono protetti da RLS e dal login Supabase Auth.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qhabwagcsvvluyvfztmp.supabase.co';
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_8rHmIvEUP5jexo5N797vNQ_jPLaZKF0';

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});

// Nome tecnico usato per il login: hex(username UTF-8) + dominio fittizio.
// (distingue maiuscole/minuscole, es. "Giovanni" e "giovanni")
export const usernameToEmail = (username: string) =>
  Array.from(new TextEncoder().encode(username.trim()))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('') + '@login.gestionale.local';
