-- Creazione tabella fornitori
create table if not exists public.fornitori (
  id uuid default gen_random_uuid() primary key,
  codice text unique not null,
  ragione_sociale text not null,
  indirizzo text not null,
  cap text not null,
  citta text not null,
  provincia text not null,
  telefono text,
  fax text,
  email text,
  piva text not null,
  codice_fiscale text,
  rea text,
  banca_1 text,
  banca_2 text,
  condizioni_pagamento text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Creazione tabella ordini in attesa
create table if not exists public.ordini_attesa (
  codice text primary key,
  fornitore text not null,
  ordine text not null,
  tipologia text not null,
  formato text not null,
  grammatura text not null,
  fogli integer not null,
  cliente text not null,
  lavoro text not null,
  prezzo real not null,
  data_consegna text,
  note text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Abilita RLS
alter table public.fornitori enable row level security;
alter table public.ordini_attesa enable row level security;

-- Policy per fornitori
create policy "Enable read access for authenticated users" on public.fornitori
  for select using (auth.role() = 'authenticated' or auth.role() = 'anon');

create policy "Enable insert for authenticated users" on public.fornitori
  for insert with check (auth.role() = 'authenticated' or auth.role() = 'anon');

create policy "Enable update for authenticated users" on public.fornitori
  for update using (auth.role() = 'authenticated' or auth.role() = 'anon');

create policy "Enable delete for authenticated users" on public.fornitori
  for delete using (auth.role() = 'authenticated' or auth.role() = 'anon');

-- Policy per ordini_attesa
create policy "Enable read access for authenticated users" on public.ordini_attesa
  for select using (auth.role() = 'authenticated' or auth.role() = 'anon');

create policy "Enable insert for authenticated users" on public.ordini_attesa
  for insert with check (auth.role() = 'authenticated' or auth.role() = 'anon');

create policy "Enable update for authenticated users" on public.ordini_attesa
  for update using (auth.role() = 'authenticated' or auth.role() = 'anon');

create policy "Enable delete for authenticated users" on public.ordini_attesa
  for delete using (auth.role() = 'authenticated' or auth.role() = 'anon');
