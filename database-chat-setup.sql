-- Crea la tabella 'chats' per memorizzare le conversazioni
CREATE TABLE public.chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  name text, -- Nome opzionale per la chat (es. 'Team Marketing')
  participant_ids uuid[] NOT NULL, -- Array di UUID degli utenti partecipanti
  last_message_content text, -- Contenuto dell'ultimo messaggio per anteprima
  last_message_at timestamp with time zone -- Timestamp dell'ultimo messaggio
);

-- Abilita Row Level Security (RLS) per la tabella 'chats'
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

-- Policy per permettere agli utenti di vedere solo le chat a cui partecipano
CREATE POLICY "Users can view their own chats" ON public.chats
  FOR SELECT USING (auth.uid() = ANY (participant_ids));

-- Policy per permettere agli utenti di creare nuove chat
CREATE POLICY "Users can create chats" ON public.chats
  FOR INSERT WITH CHECK (auth.uid() = ANY (participant_ids));

-- Policy per permettere agli utenti di aggiornare le chat a cui partecipano (es. last_message_content, name, participant_ids)
CREATE POLICY "Users can update their own chats" ON public.chats
  FOR UPDATE USING (auth.uid() = ANY (participant_ids))
  WITH CHECK (auth.uid() = ANY (participant_ids));

-- Policy per permettere agli utenti di eliminare le chat a cui partecipano (opzionale, potresti voler limitare questa azione)
CREATE POLICY "Users can delete their own chats" ON public.chats
  FOR DELETE USING (auth.uid() = ANY (participant_ids));

-- Crea la tabella 'messages' per memorizzare i singoli messaggi
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  chat_id uuid REFERENCES public.chats(id) ON DELETE CASCADE NOT NULL, -- Chiave esterna alla tabella chats
  sender_id uuid REFERENCES public.app_users(id) ON DELETE CASCADE NOT NULL, -- Chiave esterna alla tabella app_users
  content text NOT NULL
);

-- Abilita Row Level Security (RLS) per la tabella 'messages'
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Policy per permettere agli utenti di vedere i messaggi delle chat a cui partecipano
CREATE POLICY "Users can view messages in their chats" ON public.messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.chats WHERE id = chat_id AND auth.uid() = ANY (participant_ids))
  );

-- Policy per permettere agli utenti di inviare messaggi nelle chat a cui partecipano
CREATE POLICY "Users can send messages to their chats" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (SELECT 1 FROM public.chats WHERE id = chat_id AND auth.uid() = ANY (participant_ids))
  );

-- Policy per permettere agli utenti di aggiornare i propri messaggi (opzionale)
CREATE POLICY "Users can update their own messages" ON public.messages
  FOR UPDATE USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);

-- Policy per permettere agli utenti di eliminare i propri messaggi (opzionale)
CREATE POLICY "Users can delete their own messages" ON public.messages
  FOR DELETE USING (auth.uid() = sender_id);

-- Crea la tabella 'user_chat_status' per tenere traccia dell'ultimo messaggio letto da ogni utente in ogni chat
CREATE TABLE public.user_chat_status (
  user_id uuid REFERENCES public.app_users(id) ON DELETE CASCADE NOT NULL,
  chat_id uuid REFERENCES public.chats(id) ON DELETE CASCADE NOT NULL,
  last_read_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (user_id, chat_id)
);

-- Abilita Row Level Security (RLS) per la tabella 'user_chat_status'
ALTER TABLE public.user_chat_status ENABLE ROW LEVEL SECURITY;

-- Policy per permettere agli utenti di vedere il proprio stato di lettura
CREATE POLICY "Users can view their own chat status" ON public.user_chat_status
  FOR SELECT USING (auth.uid() = user_id);

-- Policy per permettere agli utenti di aggiornare il proprio stato di lettura
CREATE POLICY "Users can update their own chat status" ON public.user_chat_status
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy per permettere agli utenti di inserire il proprio stato di lettura (quando entrano in una nuova chat)
CREATE POLICY "Users can insert their own chat status" ON public.user_chat_status
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Abilita Realtime per le tabelle chat, messages e user_chat_status
ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_chat_status;

-- Funzione RPC per recuperare i dati di autenticazione dell'utente (già esistente, ma assicurati che sia aggiornata per includere il ruolo)
-- Se non hai già questa funzione, creala. Se ce l'hai, assicurati che restituisca 'user_role'.
-- CREATE OR REPLACE FUNCTION public.get_user_auth_data(p_username text)
--  RETURNS TABLE(user_id uuid, username text, password_hash text, user_role text)
--  LANGUAGE plpgsql
-- AS $function$
-- BEGIN
--  RETURN QUERY
--  SELECT
--    au.id AS user_id,
--    au.username,
--    au.password_hash,
--    ur.role AS user_role
--  FROM
--    app_users au
--  LEFT JOIN
--    user_roles ur ON au.id = ur.user_id
--  WHERE
--    au.username = p_username;
-- END;
-- $function$;