#!/usr/bin/env node
/* Punto Ciego: imita lo mínimo de la API de Supabase (Auth + REST) para probar
   cuentas, perfiles y el borrado de cuenta en local, sin tocar el Supabase real.

   Uso:
     node mocksb.js [puerto] [--confirmar]   (puerto por defecto 9999)

   Con --confirmar imita la confirmación de correo activada (como el proyecto real):
   el registro no abre sesión y el «correo» se escribe en la consola con el enlace de
   verificación, que redirige a emailRedirectTo con la sesión en el hash.

   Luego abre la beta apuntando a este servidor, por ejemplo:
     http://localhost:8080/beta/?supa=http://localhost:9999&supakey=local&pruebas=1

   Los datos se guardan en .mocksb-data.json, junto a este archivo (no se sube a git).
   Bórralo para empezar de cero. No representa RLS ni seguridad real: solo sirve
   para probar los flujos de la interfaz en local. */
'use strict';
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ARGS = process.argv.slice(2);
const CONFIRMAR = ARGS.includes('--confirmar');
const PORT = +(ARGS.find(a => /^\d+$/.test(a)) || 9999);
const PENDIENTES = {}; // token de confirmación -> id de usuario
const DB_FILE = process.env.MOCKSB_DATOS || path.join(__dirname, '.mocksb-data.json'); // MOCKSB_DATOS: otro archivo (los tests usan uno temporal)

function cargaDB() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
  catch (e) { return { users: [], profiles: [], sessions: {} }; }
}
function guardaDB() { fs.writeFileSync(DB_FILE, JSON.stringify(DB, null, 2)); }
let DB = cargaDB();

function uid() { return crypto.randomUUID(); }
function b64url(o) { return Buffer.from(JSON.stringify(o)).toString('base64url'); }
function fakeJWT(payload) { return `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url(payload)}.mock`; }

function usuarioPublico(u) {
  return {
    id: u.id, email: u.email, phone: '',
    app_metadata: { provider: u.provider || 'email', providers: [u.provider || 'email'] },
    user_metadata: u.user_metadata || {},
    aud: 'authenticated', role: 'authenticated',
    created_at: u.created_at, updated_at: u.created_at,
    email_confirmed_at: u.created_at, confirmed_at: u.created_at
  };
}
function creaSesion(user) {
  const access_token = fakeJWT({ sub: user.id, email: user.email, role: 'authenticated', aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 });
  const refresh_token = crypto.randomBytes(16).toString('hex');
  DB.sessions[access_token] = { user_id: user.id, refresh_token };
  guardaDB();
  return {
    access_token, token_type: 'bearer', expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token, user: usuarioPublico(user)
  };
}
function usuarioDesdeAuth(req) {
  const h = req.headers['authorization'] || '';
  const token = h.replace(/^Bearer\s+/i, '');
  const s = DB.sessions[token];
  if (!s) return null;
  return DB.users.find(u => u.id === s.user_id) || null;
}

function envia(res, status, body, extra) {
  res.writeHead(status, Object.assign({
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': '*'
  }, extra || {}));
  res.end(body === undefined ? '' : JSON.stringify(body));
}
function leeCuerpo(req) {
  return new Promise(resolve => {
    let b = ''; req.on('data', c => b += c);
    req.on('end', () => { try { resolve(b ? JSON.parse(b) : {}) } catch (e) { resolve({}) } });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const p = url.pathname;
  if (req.method === 'OPTIONS') return envia(res, 204, undefined);
  console.log(req.method, p + url.search);

  try {
    // ---------- AUTH ----------
    if (p === '/auth/v1/settings' && req.method === 'GET') {
      return envia(res, 200, { external: { google: false, apple: false } });
    }
    if (p === '/auth/v1/signup' && req.method === 'POST') {
      const b = await leeCuerpo(req);
      const email = (b.email || '').trim().toLowerCase();
      if (!email || !b.password) return envia(res, 400, { msg: 'Faltan datos.' });
      if (b.password.length < 6) return envia(res, 422, { msg: 'Password should be at least 6 characters.', error_code: 'weak_password' });
      if (DB.users.some(u => u.email === email)) return envia(res, 422, { msg: 'User already registered', error_code: 'user_already_exists' });
      const user = { id: uid(), email, password: b.password, provider: 'email', user_metadata: b.data || {}, created_at: new Date().toISOString() };
      if (CONFIRMAR) {
        user.sin_confirmar = true; DB.users.push(user); guardaDB();
        const tk = crypto.randomBytes(12).toString('hex'); PENDIENTES[tk] = user.id;
        const dest = url.searchParams.get('redirect_to') || '';
        console.log(`CORREO a ${email}: ${`http://localhost:${PORT}/auth/v1/verify?token=${tk}&type=signup&redirect_to=${encodeURIComponent(dest)}`}`);
        return envia(res, 200, Object.assign(usuarioPublico(user), { email_confirmed_at: undefined, confirmed_at: undefined })); // sin sesión
      }
      DB.users.push(user); guardaDB();
      return envia(res, 200, creaSesion(user));
    }
    if (p === '/auth/v1/verify' && req.method === 'GET') {
      const user = DB.users.find(u => u.id === PENDIENTES[url.searchParams.get('token')]);
      if (!user) { res.writeHead(400); return res.end('Enlace no válido'); }
      delete user.sin_confirmar; const ses = creaSesion(user);
      const h = new URLSearchParams({ access_token: ses.access_token, refresh_token: ses.refresh_token, expires_in: '3600', expires_at: String(ses.expires_at), token_type: 'bearer', type: 'signup' });
      res.writeHead(302, { Location: (url.searchParams.get('redirect_to') || '/') + '#' + h });
      return res.end();
    }
    if (p === '/auth/v1/token' && req.method === 'POST') {
      const grant = url.searchParams.get('grant_type');
      const b = await leeCuerpo(req);
      if (grant === 'password') {
        const email = (b.email || '').trim().toLowerCase();
        const user = DB.users.find(u => u.email === email);
        if (!user || user.password !== b.password) return envia(res, 400, { msg: 'Invalid login credentials', error_code: 'invalid_credentials' });
        if (user.sin_confirmar) return envia(res, 400, { msg: 'Email not confirmed', error_code: 'email_not_confirmed' });
        return envia(res, 200, creaSesion(user));
      }
      if (grant === 'refresh_token') {
        const entry = Object.values(DB.sessions).find(s => s.refresh_token === b.refresh_token);
        const user = entry && DB.users.find(u => u.id === entry.user_id);
        if (!user) return envia(res, 400, { msg: 'Invalid Refresh Token', error_code: 'refresh_token_not_found' });
        return envia(res, 200, creaSesion(user));
      }
      return envia(res, 400, { msg: 'grant_type no soportado en el mock: ' + grant });
    }
    if (p === '/auth/v1/logout' && req.method === 'POST') {
      const h = req.headers['authorization'] || ''; const token = h.replace(/^Bearer\s+/i, '');
      delete DB.sessions[token]; guardaDB();
      return envia(res, 204, undefined);
    }
    if (p === '/auth/v1/user' && req.method === 'GET') {
      const user = usuarioDesdeAuth(req);
      if (!user) return envia(res, 401, { msg: 'Not authenticated' });
      return envia(res, 200, usuarioPublico(user));
    }
    if (p === '/auth/v1/recover' && req.method === 'POST') return envia(res, 200, {});

    // ---------- REST: profiles ----------
    if (p === '/rest/v1/profiles') {
      const user = usuarioDesdeAuth(req);
      if (req.method === 'GET') {
        if (!user) return envia(res, 200, []); // como la RLS real: sin sesión, no se ve nada
        let filas = DB.profiles;
        const idf = url.searchParams.get('id');
        if (idf && idf.startsWith('eq.')) filas = filas.filter(r => r.id === idf.slice(3));
        return envia(res, 200, filas);
      }
      if (req.method === 'POST') { // upsert
        if (!user) return envia(res, 401, { message: 'JWT no válido', code: 'PGRST301' });
        const b = await leeCuerpo(req);
        const filas = Array.isArray(b) ? b : [b];
        const salida = [];
        for (const fila of filas) {
          if (fila.id !== user.id) return envia(res, 403, { message: 'new row violates row-level security policy for table "profiles"', code: '42501' });
          if (fila.username && DB.profiles.some(x => x.id !== fila.id && x.username.toLowerCase() === fila.username.toLowerCase()))
            return envia(res, 409, { message: 'duplicate key value violates unique constraint "profiles_username_unico"', code: '23505' });
          delete fila.puede_bots; // imita el trigger real: desde la app el indicador ni se crea ni se cambia (solo a mano en .mocksb-data.json)
          let existente = DB.profiles.find(x => x.id === fila.id);
          if (existente) Object.assign(existente, fila);
          else { existente = { partidas: 0, victorias: 0, como_impostor: 0, puede_bots: false, ...fila }; DB.profiles.push(existente); }
          salida.push(existente);
        }
        guardaDB();
        return envia(res, 201, salida);
      }
    }
    if (p === '/rest/v1/rpc/sumar_partida' && req.method === 'POST') {
      const user = usuarioDesdeAuth(req);
      if (!user) return envia(res, 401, { message: 'JWT no válido', code: 'PGRST301' });
      const b = await leeCuerpo(req);
      const perfil = DB.profiles.find(x => x.id === user.id);
      if (perfil) { perfil.partidas++; if (b.gano) perfil.victorias++; if (b.impostor) perfil.como_impostor++; guardaDB(); }
      return envia(res, 204, undefined);
    }
    if (p === '/rest/v1/rpc/eliminar_mi_cuenta' && req.method === 'POST') {
      const user = usuarioDesdeAuth(req);
      if (!user) return envia(res, 401, { message: 'Es necesario haber iniciado sesión.', code: 'P0001' });
      DB.users = DB.users.filter(u => u.id !== user.id);
      DB.profiles = DB.profiles.filter(x => x.id !== user.id); // imita el "on delete cascade" real
      for (const t of Object.keys(DB.sessions)) if (DB.sessions[t].user_id === user.id) delete DB.sessions[t];
      guardaDB();
      return envia(res, 204, undefined);
    }

    envia(res, 404, { message: 'mock: ruta no implementada ' + req.method + ' ' + p });
  } catch (e) {
    console.error(e);
    envia(res, 500, { message: String(e && e.message || e) });
  }
});
server.listen(PORT, () => console.log(`mocksb escuchando en http://localhost:${PORT} (datos en ${DB_FILE})`));
