-- Punto Ciego y Punto Falso: conservación de 12 meses del registro de borrados
-- La política de privacidad (puntostudio.es/privacidad/) promete que `borrados_log` se conserva 12 meses y se elimina después.
-- Pégalo entero en Supabase > SQL Editor > New query y pulsa Run. Se puede ejecutar más de una vez.

-- 1) Función que borra las filas de más de 12 meses (solo la puede llamar el sistema; nadie desde la app).
create or replace function public.purgar_borrados_log()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.borrados_log where fecha < now() - interval '12 months';
$$;
revoke execute on function public.purgar_borrados_log() from public, anon, authenticated;

-- 2) Aplícala ya una vez.
select public.purgar_borrados_log();

-- 3) Prográmala cada día a las 03:17 con pg_cron (si la extensión no se puede activar, avisa pero no falla:
--    entonces actívala en Database > Extensions > pg_cron y vuelve a ejecutar este bloque).
do $$
begin
  create extension if not exists pg_cron with schema pg_catalog;
  perform cron.schedule('purgar-borrados-log', '17 3 * * *', 'select public.purgar_borrados_log()');
exception when others then
  raise notice 'No se ha podido programar la purga con pg_cron (%). Actívalo en Database > Extensions y vuelve a ejecutar.', sqlerrm;
end $$;
