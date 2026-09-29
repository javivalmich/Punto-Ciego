-- Punto Ciego: permite a un jugador borrar su propia cuenta
-- Pégalo entero en Supabase > SQL Editor > New query y pulsa Run.

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
  -- Borra al usuario que llama a la función (nunca a otro): auth.uid() es del token de quien llama.
  -- profiles.id referencia auth.users(id) on delete cascade, así que su fila desaparece sola.
  delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on function public.eliminar_mi_cuenta() from public, anon;
grant execute on function public.eliminar_mi_cuenta() to authenticated;
