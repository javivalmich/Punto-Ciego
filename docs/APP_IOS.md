# App iOS (Capacitor)

Bundle ID `es.puntostudio.puntociego`, nombre «Punto Ciego». La web **no cambia de sitio**: GitHub Pages sigue sirviendo la raíz del
repo. `npm run web` copia lo necesario a `www/` (ignorado por git) y Capacitor lo mete en la app.

```
npm install
npm run cap:sync     # copia la web a www/ y sincroniza ios/
npm run cap:abrir    # lo anterior + abre Xcode
```

Hace falta un Mac con Xcode y CocoaPods (`cd ios/App && pod install`; Capacitor 8; el plugin de Apple 7.1 admite `@capacitor/core >=7`).
En Xcode: elegir el Team en *Signing & Capabilities* (la capability *Sign in with Apple* ya está en `App.entitlements`).

## Sign in with Apple
- **Web**: `signInWithOAuth({provider:'apple'})` (Services ID).
- **App nativa**: plugin `@capacitor-community/apple-sign-in` → `signInWithIdToken` con nonce (a Apple, el hash SHA-256; a Supabase, el original).
- **Plugins desde JS sin bundler**: el puente nativo inyecta `window.Capacitor` sin `registerPlugin`. `scripts/preparar-www.mjs` copia el UMD de `@capacitor/core` a `www/assets/capacitor.js` e `index.html` lo carga solo si `Capacitor.isNativePlatform()` (en la web no existe). Los plugins se piden con `plugin('Browser')` y `plugin('SignInWithApple')`, el `jsName` nativo de cada uno.
- **Enlaces externos**: en la app la página va en `capacitor://localhost`, así que Privacidad, Términos y Soporte se abren con `@capacitor/browser` (`Browser.open`) y su URL pública `https://puntostudio.es/punto-ciego/*.html` (`enlaceLegal()` en `index.html`); el enlace de compartir, el QR y las redirecciones de los correos de Supabase llevan la web pública. El botón de Google no se ofrece en la app (su vuelta OAuth acabaría en Safari, no en la app).
  Ver `entraConAppleNativo` en `index.html`. En Supabase → Providers → Apple, el **Bundle ID** debe estar en *Client IDs* (junto al Services ID).
- **Revocación al borrar la cuenta**: tras entrar, la app manda el `authorizationCode` (caduca a los 5 min) a la Edge Function
  `apple-canjear-codigo`, que lo canjea en `appleid.apple.com/auth/token` con `client_id` = Bundle ID y guarda el refresh token en
  `apple_tokens` (solo service role, `origen='app'`). `eliminar-cuenta` lo revoca con `/auth/revoke` antes de borrar al usuario:
  Bundle ID (`APPLE_CLIENT_ID_APP`) para logins de la app, Services ID (`APPLE_CLIENT_ID_WEB`) para los de la web.
  Las dos apps nativas (Punto Ciego `es.puntostudio.puntociego` y Punto Falso `es.puntostudio.puntofalso`) comparten estas funciones: la app envía su Bundle ID como `clientId`, la función lo valida contra la lista permitida (`BUNDLE_IDS_APP` en `_shared/apple.ts`) y lo guarda en `apple_tokens.client_id`; `eliminar-cuenta` revoca con ese client_id (filas antiguas sin él: el de siempre según `origen`). Migración: `20261008130000_apple_tokens_client_id.sql`.
  Secretos: `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` (contenido del .p8), `APPLE_CLIENT_ID_APP`, `APPLE_CLIENT_ID_WEB`.
  Desplegar: `npx supabase functions deploy apple-canjear-codigo --project-ref qsmcdfyyxvqmesnbwsod` (y de nuevo `eliminar-cuenta`).
