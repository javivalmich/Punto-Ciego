# Borrado de cuenta y revocación del token de Apple

Apple exige (guideline 5.1.1(v)) que, al borrar una cuenta creada con «Iniciar sesión con Apple», se **revoque el token** en Apple.
La cuenta es **compartida** por Punto Ciego y Punto Falso (mismo proyecto de Supabase), así que esto sirve a los dos juegos.

## Cómo funciona

1. Al entrar con Apple, Supabase entrega a la web, una sola vez, el token de Apple (`session.provider_refresh_token`).
   La web lo manda a la función SQL `guardar_token_apple`, que lo guarda en `public.apple_tokens`
   (tabla sin políticas RLS: solo la lee la Edge Function con la clave de servicio) y solo si el usuario tiene identidad de Apple.
2. Al pulsar «Eliminar cuenta», la web llama a la Edge Function `eliminar-cuenta`
   (`supabase/functions/eliminar-cuenta/`). Esta:
   - comprueba quién llama (el id sale del token, nunca del cuerpo),
   - si entró con Apple y hay credenciales y token guardado, firma el `client_secret` y llama a `https://appleid.apple.com/auth/revoke`,
   - anota el resultado en `public.borrados_log` (sin datos personales),
   - **borra la cuenta pase lo que pase con la revocación** (sin credenciales, sin token o con error de Apple, borra igual y lo deja en el log),
   - al borrar `auth.users`, caen en cascada `profiles` y `apple_tokens`.
3. Si la Edge Function no está desplegada o falla, la web usa el respaldo `eliminar_mi_cuenta()`, que borra igual y deja en
   `borrados_log` que el token de Apple quedó sin revocar.

Por eso **nada se rompe mientras no haya credenciales de Apple**: hoy el borrado funciona con el respaldo.

## Lo que tienes que aplicar tú (en este orden)

### 1. SQL (Supabase → SQL Editor → New query → Run)

Pega entero `supabase/migrations/20261005120000_revocar_apple.sql`. Se puede ejecutar más de una vez. Crea `apple_tokens`,
`borrados_log`, `guardar_token_apple()` y actualiza `eliminar_mi_cuenta()` (sigue borrando igual).

### 1b. Conservación de `borrados_log` (12 meses)

La política de privacidad promete que `borrados_log` se conserva 12 meses. Ejecuta también, en el SQL Editor,
`supabase/migrations/20261006130000_purgar_borrados_log.sql`: crea `purgar_borrados_log()`, la ejecuta una vez y la programa cada día
con pg_cron (si no se puede activar la extensión, actívala en Database → Extensions → pg_cron y vuelve a ejecutarla).

### 2. Desplegar la Edge Function

Con la CLI de Supabase (`npm i -g supabase` o `npx supabase`), desde la raíz del repo de Punto Ciego:

```bash
npx supabase login
npx supabase link --project-ref qsmcdfyyxvqmesnbwsod
npx supabase functions deploy eliminar-cuenta
```

(O en el panel: Edge Functions → Deploy a new function → pega `index.ts` y `apple.ts`. `verify_jwt` debe estar **activado**.)
Probar sin credenciales: borra una cuenta de prueba en la web; debe borrarse y aparecer una fila en `borrados_log` solo si era de Apple.

### 3. Secrets de Apple (cuando tengas la cuenta de Developer; ver `APPLE_SIGNIN.md`)

En Edge Functions → Secrets (o con la CLI):

```bash
npx supabase secrets set APPLE_TEAM_ID=XXXXXXXXXX APPLE_KEY_ID=YYYYYYYYYY \
  APPLE_CLIENT_ID_WEB=com.tunombre.puntociego.web \
  APPLE_CLIENT_ID_APP=com.tunombre.puntociego
npx supabase secrets set APPLE_PRIVATE_KEY="$(cat secrets/AuthKey_YYYYYYYYYY.p8)"
```

- `APPLE_CLIENT_ID_WEB` es el **Services ID** (el token de la web se emite con él); `APPLE_CLIENT_ID_APP` es el **Bundle ID**
  (solo hará falta si la app nativa entra con «Sign in with Apple» nativo).
- La clave `.p8` es la misma que se usa para activar Apple en Supabase (puede ser la misma clave de «Sign in with Apple»).
  Nunca va al repositorio (`secrets/` y `*.p8` están en `.gitignore`).
- Todos los demás datos que usa la función (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) los inyecta Supabase.

### 4. Comprobación con Apple real

1. Entra con Apple en la web (la beta primero) y comprueba que hay una fila en `apple_tokens` para ese usuario (Table Editor).
   **Si no aparece**, Supabase no entregó `provider_refresh_token` para Apple en tu configuración: avísame y lo cambiamos a canjear
   el `authorization_code` directamente.
2. Borra esa cuenta desde la app. En `borrados_log` debe salir `proveedor = apple`, `apple_revocado = true`, `detalle = revocado`.
3. En el iPhone: Ajustes → [tu nombre] → Contraseña y seguridad → Apps que usan el ID de Apple: la app ya no debe aparecer.

## Límites conocidos

- Si el usuario entró con Apple **antes** de desplegar esto, no hay token guardado: se borra igual y `borrados_log` dice
  «no había token de Apple guardado».
- Con la app nativa (Capacitor) y el inicio de sesión nativo de Apple no hay `provider_refresh_token`; habrá que canjear el
  `authorization_code` de Apple en la función (se hará al empaquetar, con las credenciales ya disponibles).
- Prueba local de la firma del `client_secret` y de la llamada a Apple (sin tocar Apple):
  `node supabase/functions/eliminar-cuenta/apple.test.mjs`.
