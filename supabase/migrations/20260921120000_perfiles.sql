-- Punto Ciego: tabla de perfiles de jugador
-- Pégalo entero en Supabase > SQL Editor > New query y pulsa Run.

create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text not null check (char_length(username) between 1 and 16),
  look          jsonb not null default '{}'::jsonb,
  partidas      integer not null default 0,
  victorias     integer not null default 0,
  como_impostor integer not null default 0,
  updated_at    timestamptz not null default now()
);

-- Nombres de jugador únicos, sin distinguir mayúsculas
create unique index if not exists profiles_username_unico on public.profiles (lower(username));

-- Seguridad: cada uno solo puede crear y cambiar su propio perfil
alter table public.profiles enable row level security;

drop policy if exists "ver perfiles" on public.profiles;
create policy "ver perfiles" on public.profiles
  for select to authenticated using (true);

drop policy if exists "crear el mio" on public.profiles;
create policy "crear el mio" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);

drop policy if exists "editar el mio" on public.profiles;
create policy "editar el mio" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Suma una partida al jugador que la llama
create or replace function public.sumar_partida(gano boolean, impostor boolean)
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.profiles
     set partidas      = partidas + 1,
         victorias     = victorias + case when gano then 1 else 0 end,
         como_impostor = como_impostor + case when impostor then 1 else 0 end,
         updated_at    = now()
   where id = (select auth.uid());
$$;

revoke execute on function public.sumar_partida(boolean, boolean) from anon;
grant execute on function public.sumar_partida(boolean, boolean) to authenticated;
