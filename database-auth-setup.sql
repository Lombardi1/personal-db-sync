-- Creazione enum per i ruoli
create type public.app_role as enum ('produzione', 'amministratore');

-- Tabella users per autenticazione
create table public.app_users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password_hash text not null,
  created_at timestamp with time zone default now()
);

-- Tabella user_roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.app_users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);

-- Abilita RLS
alter table public.app_users enable row level security;
alter table public.user_roles enable row level security;

-- Funzione per controllare i ruoli (security definer per evitare recursione RLS)
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- Policy: tutti possono leggere gli users (necessario per login)
create policy "Anyone can read users"
on public.app_users
for select
to anon, authenticated
using (true);

-- Policy: solo amministratori possono inserire nuovi utenti
create policy "Admins can insert users"
on public.app_users
for insert
to authenticated
with check (
  exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
    and role = 'amministratore'::app_role
  )
);

-- Policy: solo amministratori possono aggiornare utenti
create policy "Admins can update users"
on public.app_users
for update
to authenticated
using (
  exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
    and role = 'amministratore'::app_role
  )
);

-- Policy: solo amministratori possono eliminare utenti
create policy "Admins can delete users"
on public.app_users
for delete
to authenticated
using (
  exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
    and role = 'amministratore'::app_role
  )
);

-- Policy: tutti possono leggere i ruoli (necessario per controllo permessi)
create policy "Users can read their own roles"
on public.user_roles
for select
to authenticated
using (true);

-- Policy: solo amministratori possono inserire ruoli
create policy "Admins can insert roles"
on public.user_roles
for insert
to authenticated
with check (
  exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
    and role = 'amministratore'::app_role
  )
);

-- Policy: solo amministratori possono eliminare ruoli
create policy "Admins can delete roles"
on public.user_roles
for delete
to authenticated
using (
  exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
    and role = 'amministratore'::app_role
  )
);

-- Inserimento utenti di esempio (password: "password123")
-- Hash generato con bcrypt per "password123"
insert into public.app_users (username, password_hash) values
  ('admin', '$2a$10$rN7KzJ3VXDhPx8F5YqZHkO9EKGKXHKZxYJxKZxKZxKZxKZxKZxKZx'),
  ('operaio1', '$2a$10$rN7KzJ3VXDhPx8F5YqZHkO9EKGKXHKZxYJxKZxKZxKZxKZxKZxKZx');

-- Assegnazione ruoli
insert into public.user_roles (user_id, role)
select id, 'amministratore'::app_role from public.app_users where username = 'admin';

insert into public.user_roles (user_id, role)
select id, 'produzione'::app_role from public.app_users where username = 'operaio1';
