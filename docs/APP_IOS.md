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
- Pendiente: la app nativa no guarda aún el token de revocación de Apple (hace falta canjear `authorizationCode` en el servidor).
