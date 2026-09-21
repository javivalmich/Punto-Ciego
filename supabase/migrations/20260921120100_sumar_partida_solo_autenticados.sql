-- Postgres concede EXECUTE a PUBLIC por defecto, y anon lo hereda: revocarlo solo de anon no basta.
revoke execute on function public.sumar_partida(boolean, boolean) from public, anon;
grant execute on function public.sumar_partida(boolean, boolean) to authenticated;
