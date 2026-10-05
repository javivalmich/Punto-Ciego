// Revocación de tokens de Sign in with Apple (guideline 5.1.1(v) de Apple: al borrar la cuenta hay que revocar el token).
// Sin dependencias: solo WebCrypto y fetch, así que funciona igual en Deno (Edge Functions) y en Node (pruebas).

export interface AppleCfg {
  teamId: string;
  keyId: string;
  privateKey: string; // contenido del .p8 (PEM, con o sin saltos de línea reales; admite "\n" literales)
}

const enc = new TextEncoder();

function b64url(data: Uint8Array | string): string {
  const bytes = typeof data === 'string' ? enc.encode(data) : data;
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pemToDer(pem: string): Uint8Array {
  const limpio = pem
    .replace(/\\n/g, '\n')
    .replace(/-----BEGIN [A-Z ]+-----/, '')
    .replace(/-----END [A-Z ]+-----/, '')
    .replace(/\s+/g, '');
  const bin = atob(limpio);
  const der = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) der[i] = bin.charCodeAt(i);
  return der;
}

/** JWT ES256 que Apple pide como `client_secret` (válido unos minutos: solo se usa para esta llamada). */
export async function clientSecret(cfg: AppleCfg, clientId: string, ahoraMs = Date.now()): Promise<string> {
  const iat = Math.floor(ahoraMs / 1000);
  const cab = b64url(JSON.stringify({ alg: 'ES256', kid: cfg.keyId, typ: 'JWT' }));
  const cuerpo = b64url(JSON.stringify({ iss: cfg.teamId, iat, exp: iat + 300, aud: 'https://appleid.apple.com', sub: clientId }));
  const clave = await crypto.subtle.importKey('pkcs8', pemToDer(cfg.privateKey), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  // WebCrypto devuelve la firma en formato r||s (P1363), que es justo lo que exige JWT
  const firma = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, clave, enc.encode(`${cab}.${cuerpo}`)));
  return `${cab}.${cuerpo}.${b64url(firma)}`;
}

export interface Resultado {
  ok: boolean;
  detalle: string;
}

/** Revoca un refresh token de Apple. `clientId` debe ser el mismo con el que se emitió (Services ID en web, Bundle ID en app). */
export async function revocar(
  cfg: AppleCfg,
  clientId: string,
  refreshToken: string,
  fetchFn: typeof fetch = fetch,
  ahoraMs = Date.now(),
): Promise<Resultado> {
  try {
    const secret = await clientSecret(cfg, clientId, ahoraMs);
    const res = await fetchFn('https://appleid.apple.com/auth/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, client_secret: secret, token: refreshToken, token_type_hint: 'refresh_token' }),
    });
    if (res.ok) return { ok: true, detalle: 'revocado' };
    const txt = (await res.text()).slice(0, 200);
    return { ok: false, detalle: `Apple respondió ${res.status}: ${txt}` };
  } catch (e) {
    return { ok: false, detalle: `error al llamar a Apple: ${(e as Error).message}` };
  }
}
