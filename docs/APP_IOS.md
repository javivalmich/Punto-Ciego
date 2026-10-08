# App iOS (Capacitor)

Bundle ID `es.puntostudio.puntociego`, nombre «Punto Ciego». La web **no cambia de sitio**: GitHub Pages sigue sirviendo la raíz del
repo. `npm run web` copia lo necesario a `www/` (ignorado por git) y Capacitor lo mete en la app.

```
npm install
npm run cap:sync     # copia la web a www/ y sincroniza ios/
npm run cap:abrir    # lo anterior + abre Xcode
```

Hace falta un Mac con Xcode y CocoaPods (`cd ios/App && pod install`; Capacitor 7 porque el plugin de Apple lo exige).
En Xcode: elegir el Team en *Signing & Capabilities* (la capability *Sign in with Apple* ya está en `App.entitlements`).

## Sign in with Apple
- **Web**: `signInWithOAuth({provider:'apple'})` (Services ID).
- **App nativa**: plugin `@capacitor-community/apple-sign-in` → `signInWithIdToken` con nonce (a Apple, el hash SHA-256; a Supabase, el original).
  Ver `entraConAppleNativo` en `index.html`. En Supabase → Providers → Apple, el **Bundle ID** debe estar en *Client IDs* (junto al Services ID).
- **Revocación al borrar la cuenta**: tras entrar, la app manda el `authorizationCode` (caduca a los 5 min) a la Edge Function
  `apple-canjear-codigo`, que lo canjea en `appleid.apple.com/auth/token` con `client_id` = Bundle ID y guarda el refresh token en
  `apple_tokens` (solo service role, `origen='app'`). `eliminar-cuenta` lo revoca con `/auth/revoke` antes de borrar al usuario:
  Bundle ID (`APPLE_CLIENT_ID_APP`) para logins de la app, Services ID (`APPLE_CLIENT_ID_WEB`) para los de la web.
  Secretos: `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` (contenido del .p8), `APPLE_CLIENT_ID_APP`, `APPLE_CLIENT_ID_WEB`.
  Desplegar: `npx supabase functions deploy apple-canjear-codigo --project-ref qsmcdfyyxvqmesnbwsod` (y de nuevo `eliminar-cuenta`).
