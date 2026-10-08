// Edge Function `apple-canjear-codigo`: tras entrar con Apple en la app nativa, la app manda aquí el `authorizationCode`.
// Se canjea al momento (caduca a los 5 min y vale una sola vez) por un refresh token de Apple, que se guarda en
// `apple_tokens` (solo accesible con service role) para poder revocarlo al borrar la cuenta (ver `eliminar-cuenta`).
//
// Secrets (supabase secrets set ...): APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY (contenido del .p8),
// APPLE_CLIENT_ID_APP (Bundle ID por defecto: es.puntostudio.puntociego; se usa si el cliente no dice cuál es).
// El cliente puede enviar `clientId` (su Bundle ID: Punto Ciego o Punto Falso); solo se acepta si está en la lista permitida de _shared/apple.ts. SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase.
import { createClient } from 'npm:@supabase/supabase-js@2.116.0';
import { canjear, clientIdApp, type AppleCfg } from '../_shared/apple.ts';

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

  // Quién llama: el id sale del token de sesión, nunca del cuerpo
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!jwt) return json(401, { ok: false, error: 'sesión no válida' });
  let user;
  try {
    const { data: u, error: eu } = await admin.auth.getUser(jwt);
    if (eu || !u?.user) return json(401, { ok: false, error: 'sesión no válida' });
    user = u.user;
  } catch (_) {
    return json(401, { ok: false, error: 'sesión no válida' });
  }
  if (!(user.identities ?? []).some((i) => i.provider === 'apple')) return json(400, { ok: false, error: 'la cuenta no usa Apple' });

  let code = '';
  let pedido: unknown;
  try {
    const body = await req.json();
    code = typeof body?.authorizationCode === 'string' ? body.authorizationCode.trim() : '';
    pedido = body?.clientId;
  } catch (_) { /* cuerpo vacío o no JSON */ }
  if (!code || code.length > 2000) return json(400, { ok: false, error: 'falta authorizationCode' });

  const teamId = Deno.env.get('APPLE_TEAM_ID');
  const keyId = Deno.env.get('APPLE_KEY_ID');
  const privateKey = Deno.env.get('APPLE_PRIVATE_KEY');
  // login nativo: client_id = Bundle ID de la app que llama (validado contra la lista permitida)
  const clientId = clientIdApp(pedido, Deno.env.get('APPLE_CLIENT_ID_APP'));
  if (pedido && !clientId) return json(400, { ok: false, error: 'clientId no permitido' });
  if (!teamId || !keyId || !privateKey || !clientId) {
    console.log('apple-canjear-codigo: sin credenciales de Apple configuradas');
    return json(503, { ok: false, error: 'Apple no configurado' });
  }

  const cfg: AppleCfg = { teamId, keyId, privateKey };
  const r = await canjear(cfg, clientId, code);
  if (!r.ok || !r.refreshToken) {
    console.log(`apple-canjear-codigo: ${r.detalle}`);
    return json(502, { ok: false, error: 'Apple rechazó el código' });
  }

  const { error } = await admin.from('apple_tokens').upsert(
    { user_id: user.id, refresh_token: r.refreshToken, origen: 'app', client_id: clientId, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' },
  );
  if (error) {
    console.log(`apple-canjear-codigo: no se pudo guardar: ${error.message}`);
    return json(500, { ok: false, error: 'no se pudo guardar' });
  }
  return json(200, { ok: true });
});
