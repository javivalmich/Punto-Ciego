# eliminar-cuenta

Su lógica de Apple vive en `../_shared/apple.ts` (prueba: `node supabase/functions/_shared/apple.test.mjs`). Edge Function compartida por Punto Ciego y Punto Falso (borra la cuenta de quien la llama; revoca antes el token de Apple si hace falta).

## Dependencias fijadas

- `index.ts` importa `npm:@supabase/supabase-js@2.116.0` (versión exacta, sin rangos). `apple.ts` no importa nada externo.
- Las dependencias *transitivas* de `supabase-js` solo quedan fijadas con un lock. Se genera con Deno y se sube al repo:

```bash
cd supabase/functions/eliminar-cuenta
deno cache --lock=deno.lock index.ts          # crea deno.lock
deno cache --lock=deno.lock --frozen index.ts  # comprueba que no cambia nada
git add deno.lock
```

Al subir `supabase-js`, cambiar la versión en `index.ts` y regenerar el lock (`rm deno.lock` antes).

## Desplegar

```bash
npx supabase login
npx supabase functions deploy eliminar-cuenta --project-ref qsmcdfyyxvqmesnbwsod
```
