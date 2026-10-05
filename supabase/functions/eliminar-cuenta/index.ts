// Edge Function `eliminar-cuenta`: borra la cuenta de quien la llama (compartida por Punto Ciego y Punto Falso).
// Si el usuario entró con Apple, antes revoca su token en Apple. Si faltan las credenciales de Apple, o el token no
// estaba guardado, o Apple falla, la cuenta se borra igual y el motivo queda en la tabla `borrados_log`.
//
// Secrets (supabase secrets set ...): APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY (contenido del .p8),
// APPLE_CLIENT_ID_WEB (Services ID), APPLE_CLIENT_ID_APP (Bundle ID; solo cuando exista la app nativa).
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase solos.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { revocar, type AppleCfg } from './apple.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json(405, { ok: false, error: 'método no permitido' });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Quién llama: solo se puede borrar la propia cuenta (el id sale del token, nunca del cuerpo)
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: u, error: eu } = await admin.auth.getUser(jwt);
  if (eu || !u?.user) return json(401, { ok: false, error: 'sesión no válida' });
  const user = u.user;

  const conApple = (user.identities ?? []).some((i) => i.provider === 'apple') || user.app_metadata?.provider === 'apple';
  let revocado = false;
  let detalle = '';

  if (conApple) {
    try {
      const teamId = Deno.env.get('APPLE_TEAM_ID');
      const keyId = Deno.env.get('APPLE_KEY_ID');
      const privateKey = Deno.env.get('APPLE_PRIVATE_KEY');
      const { data: fila } = await admin.from('apple_tokens').select('refresh_token, origen').eq('user_id', user.id).maybeSingle();
      const clientId = fila?.origen === 'app' ? Deno.env.get('APPLE_CLIENT_ID_APP') : Deno.env.get('APPLE_CLIENT_ID_WEB');
      if (!teamId || !keyId || !privateKey || !clientId) detalle = 'sin credenciales de Apple configuradas: no se revoca';
      else if (!fila?.refresh_token) detalle = 'no había token de Apple guardado: no se revoca';
      else {
        const cfg: AppleCfg = { teamId, keyId, privateKey };
        const r = await revocar(cfg, clientId, fila.refresh_token);
        revocado = r.ok;
        detalle = r.detalle;
      }
    } catch (e) {
      detalle = `error inesperado al revocar: ${(e as Error).message}`;
    }
    console.log(`eliminar-cuenta: apple_revocado=${revocado} detalle=${detalle}`);
  }

  // Constancia (sin datos personales: ni id ni correo)
  try {
    await admin.from('borrados_log').insert({ proveedor: conApple ? 'apple' : (user.app_metadata?.provider ?? 'desconocido'), apple_revocado: revocado, detalle: detalle || null });
  } catch (_) { /* el registro nunca debe impedir el borrado */ }

  // Borrado: auth.users en cascada (profiles, apple_tokens)
  const { error: ed } = await admin.auth.admin.deleteUser(user.id);
  if (ed) return json(500, { ok: false, error: 'no se pudo borrar la cuenta' });
  return json(200, { ok: true, apple_revocado: revocado, detalle });
});
