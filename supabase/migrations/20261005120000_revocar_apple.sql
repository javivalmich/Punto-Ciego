-- Punto Ciego y Punto Falso: revocar el token de Apple al borrar la cuenta
-- Pégalo entero en Supabase > SQL Editor > New query y pulsa Run. Se puede ejecutar más de una vez.

-- 1) Token de Apple de cada usuario que entró con Apple (lo lee solo la Edge Function con la clave de servicio).
create table if not exists public.apple_tokens (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  refresh_token text not null,
  origen        text not null default 'web' check (origen in ('web', 'app')),
  updated_at    timestamptz not null default now()
);
alter table public.apple_tokens enable row level security;     -- sin políticas: ni anon ni authenticated pueden leerla ni escribirla
revoke all on public.apple_tokens from anon, authenticated;

-- 2) Constancia de los borrados (sin datos personales).
create table if not exists public.borrados_log (
  id             bigint generated always as identity primary key,
  fecha          timestamptz not null default now(),
  proveedor      text,
  apple_revocado boolean not null default false,
  detalle        text
);
alter table public.borrados_log enable row level security;
revoke all on public.borrados_log from anon, authenticated;

-- 3) El móvil guarda aquí el token justo después de entrar con Apple. Solo guarda si el usuario tiene identidad de Apple.
create or replace function public.guardar_token_apple(p_token text, p_origen text default 'web')
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Es necesario haber iniciado sesión.';
  end if;
  if p_token is null or length(p_token) = 0 or length(p_token) > 2000 then
    return;
  end if;
  if not exists (select 1 from auth.identities where user_id = auth.uid() and provider = 'apple') then
    return;
  end if;
  insert into public.apple_tokens (user_id, refresh_token, origen)
  values (auth.uid(), p_token, case when p_origen = 'app' then 'app' else 'web' end)
  on conflict (user_id) do update
    set refresh_token = excluded.refresh_token, origen = excluded.origen, updated_at = now();
end;
$$;
revoke execute on function public.guardar_token_apple(text, text) from public, anon;
grant execute on function public.guardar_token_apple(text, text) to authenticated;

-- 4) Respaldo: la función de siempre sigue borrando la cuenta si la Edge Function no está desplegada o falla,
--    pero ahora deja constancia de que no se pudo revocar el token de Apple.
create or replace function public.eliminar_mi_cuenta()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Es necesario haber iniciado sesión.';
  end if;
  if exists (select 1 from auth.identities where user_id = auth.uid() and provider = 'apple') then
    insert into public.borrados_log (proveedor, apple_revocado, detalle)
    values ('apple', false, 'borrado por eliminar_mi_cuenta (sin Edge Function): token de Apple sin revocar');
  end if;
  -- Borra al usuario que llama (nunca a otro). profiles y apple_tokens referencian auth.users con on delete cascade.
  delete from auth.users where id = auth.uid();
end;
$$;
revoke execute on function public.eliminar_mi_cuenta() from public, anon;
grant execute on function public.eliminar_mi_cuenta() to authenticated;
