-- Create the 'macchine_produzione' table
CREATE TABLE public.macchine_produzione (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome text NOT NULL,
    tipo text NOT NULL,
    descrizione text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable Row Level Security (RLS) for the table
ALTER TABLE public.macchine_produzione ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow all authenticated users to read machines
CREATE POLICY "Allow authenticated users to read macchine_produzione"
ON public.macchine_produzione FOR SELECT
TO authenticated
USING (true);

-- Create a policy to allow 'amministratore' role to insert, update, and delete machines
CREATE POLICY "Allow 'amministratore' to manage macchine_produzione"
ON public.macchine_produzione
FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'amministratore'))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'amministratore'));

-- Create a function to set the 'updated_at' column automatically
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to call the 'set_updated_at' function before update
CREATE TRIGGER set_macchine_produzione_updated_at
BEFORE UPDATE ON public.macchine_produzione
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Optional: Add a unique constraint on 'nome' to prevent duplicate machine names
ALTER TABLE public.macchine_produzione ADD CONSTRAINT unique_macchina_nome UNIQUE (nome);

-- Grant necessary permissions to the 'anon' and 'authenticated' roles
GRANT ALL ON TABLE public.macchine_produzione TO anon, authenticated;
GRANT ALL ON FUNCTION public.set_updated_at() TO anon, authenticated;