-- Verificación del endurecimiento de Supabase (Punto Ciego y Punto Falso). Solo lectura: pégalo en SQL Editor.
-- Resultado esperado indicado en cada consulta.

-- V1. Tablas con RLS activado. Esperado: profiles, apple_tokens y borrados_log con rowsecurity = true.
select tablename, rowsecurity from pg_tables where schemaname = 'public' order by 1;

-- V2. Políticas. Esperado: profiles con 3 (ver/crear/editar el mío) y apple_tokens y borrados_log SIN ninguna fila.
select tablename, policyname, cmd, roles, qual, with_check from pg_policies where schemaname = 'public' order by 1, 2;

-- V3. Permisos de tabla de anon/authenticated. Esperado: ninguna fila de apple_tokens ni borrados_log;
--     profiles solo con SELECT/INSERT/UPDATE para authenticated y nada para anon.
select table_name, grantee, privilege_type from information_schema.role_table_grants
where table_schema = 'public' and grantee in ('anon', 'authenticated') order by 1, 2, 3;

-- V4. Funciones ejecutables por anon/public. Esperado: ninguna fila (solo authenticated).
select routine_name, grantee from information_schema.routine_privileges
where routine_schema = 'public' and grantee in ('anon', 'PUBLIC') order by 1;

-- V5. Funciones security definer con search_path fijo. Esperado: eliminar_mi_cuenta y guardar_token_apple
--     con prosecdef = true y proconfig = {search_path=""}.
select p.proname, p.prosecdef, p.proconfig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' order by 1;

-- V6. Cuentas: totales y sin confirmar. Tras activar la confirmación, las nuevas quedarán sin confirmar hasta pulsar el enlace.
select count(*) as total, count(email_confirmed_at) as confirmadas from auth.users;
