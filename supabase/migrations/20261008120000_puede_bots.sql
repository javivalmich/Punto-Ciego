-- Punto Ciego: indicador puede_bots del perfil (cuenta de pruebas para la revisión de Apple)
-- Pégalo entero en Supabase > SQL Editor > New query y pulsa Run. Se puede ejecutar más de una vez.
--
-- Con puede_bots = true, el anfitrión de esa cuenta ve «Añadir bots» en la sala de espera y puede jugar solo.
-- El indicador SOLO se cambia desde el servidor (SQL Editor o clave de servicio): un trigger devuelve false al crear
-- un perfil y conserva el valor anterior al actualizarlo cuando quien llama es la app (roles authenticated/anon).

alter table public.profiles add column if not exists puede_bots boolean not null default false;

create or replace function public.profiles_proteger_puede_bots()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- current_user es el rol de la petición: 'authenticated'/'anon' desde la app; 'postgres' o 'service_role' desde el servidor.
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.puede_bots := false;
    else
      new.puede_bots := old.puede_bots;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_proteger_puede_bots on public.profiles;
create trigger profiles_proteger_puede_bots
  before insert or update on public.profiles
  for each row execute function public.profiles_proteger_puede_bots();

-- La función solo la ejecuta el trigger: nadie la llama a mano.
revoke execute on function public.profiles_proteger_puede_bots() from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- CÓMO ACTIVARLO EN UNA CUENTA (ejecútalo en SQL Editor; no se puede desde la app):
--
--   update public.profiles set puede_bots = true
--   where id = (select id from auth.users where email = 'revisor@ejemplo.com');
--
-- o por nombre de jugador:
--
--   update public.profiles set puede_bots = true where lower(username) = lower('Revisor');
--
-- Para quitarlo: lo mismo con puede_bots = false. Para ver quién lo tiene:
--
--   select username, puede_bots from public.profiles where puede_bots;
--
-- El perfil debe existir (la cuenta tiene que haber entrado una vez y creado su personaje).
-- ---------------------------------------------------------------------------------------------
