CREATE TABLE public.chat_rings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    chat_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    CONSTRAINT chat_rings_pkey PRIMARY KEY (id),
    CONSTRAINT chat_rings_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE,
    CONSTRAINT chat_rings_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.app_users(id) ON DELETE CASCADE
);
ALTER TABLE public.chat_rings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for chat_rings" ON public.chat_rings FOR ALL USING (true);

-- Abilita Realtime per la nuova tabella
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_rings;