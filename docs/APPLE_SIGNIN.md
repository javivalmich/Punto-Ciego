# Sign in with Apple

Guía para activar «Continuar con Apple». El botón ya existe en la app y **aparece solo cuando Supabase
reporta Apple como activado** (la app lo consulta en `/auth/v1/settings`; ver `APPLE` y `ACT.apple` en `index.html`). Requiere una cuenta de **Apple Developer Program**
(de pago, 99 USD/año). Esta guía no contiene ningún dato secreto y nunca debe contenerlo.

## 1. Datos que hay que decidir antes

| Dato | Ejemplo | Notas |
|---|---|---|
| **Bundle ID** (App ID) | `com.tunombre.puntociego` | **Será el de la app del App Store y no se puede cambiar después.** Elígelo definitivo, en minúsculas y estilo DNS inverso. |
| **Services ID** (solo web) | `com.tunombre.puntociego.web` | Es el «client id» de la web. Distinto del Bundle ID. |
| **Team ID** | 10 caracteres | Se ve arriba a la derecha en developer.apple.com → Membership details. |
| **Key ID** | 10 caracteres | Lo da Apple al crear la clave. |
| **Clave `.p8`** | `AuthKey_XXXXXXXXXX.p8` | Privada. Apple solo deja descargarla **una vez**. |
| **URL de retorno** | `https://<ref-del-proyecto>.supabase.co/auth/v1/callback` | La de tu proyecto Supabase (Authentication → Providers → Apple muestra la «Callback URL»). |

## 2. Pasos en developer.apple.com → Certificates, Identifiers & Profiles

1. **App ID.** Identifiers → `+` → *App IDs* → *App*. Descripción libre y Bundle ID **explícito** (el de arriba).
   En *Capabilities* marca **Sign in with Apple** (configuración por defecto: «Enable as a primary App ID»).
2. **Services ID.** Identifiers → `+` → *Services IDs*. Identificador = el Services ID de arriba. Tras crearlo,
   ábrelo, marca **Sign in with Apple** → *Configure*:
   - *Primary App ID*: el App ID del paso 1.
   - *Domains and Subdomains*: `<ref-del-proyecto>.supabase.co` (solo el dominio, sin `https://`).
   - *Return URLs*: la URL de retorno de Supabase, completa.
3. **Clave.** Keys → `+` → nombre libre, marca **Sign in with Apple** → *Configure* → elige el App ID del paso 1 →
   *Save* → *Continue* → *Register*. Anota el **Key ID** y pulsa **Download** (una sola vez).
4. Anota el **Team ID** (Membership details).

## 3. Qué me tienes que pasar al terminar (y cómo)

Pásame en el chat, porque no son secretos: **Bundle ID, Services ID, Team ID y Key ID**.

**El archivo `.p8` no lo pegues en el chat.** Guárdalo en tu equipo en una carpeta que git ignora
(`secrets/AuthKey_XXXXXXXXXX.p8` dentro del proyecto; `secrets/` y `*.p8` están en `.gitignore`) y dime solo
la ruta; lo leo desde el disco. Para la renovación automática (apartado 5) se guarda además como *secret*
de GitHub, nunca en el repositorio.

## 4. Configurar Supabase

Authentication → Providers → Apple → activar y rellenar:

- **Client IDs**: el Services ID (web) **y** el Bundle ID (app nativa), separados por coma.
- **Secret Key (for OAuth)**: un JWT firmado con la clave `.p8` (lo genero yo con Team ID, Key ID y Services ID).
- Authentication → URL Configuration: debe estar la URL principal y la de `beta/` (ya listadas en `supabase/config.toml`).

En cuanto se guarda, el botón «Continuar con Apple» aparece solo; se prueba primero en `beta/`.

## 5. Caducidad: la clave de la web caduca cada 6 meses

Apple limita el JWT (secret) del flujo **web** a 6 meses como máximo. Cuando caduca, «Continuar con Apple» en la web
falla hasta renovarlo. Se renueva solo con una **GitHub Action programada** (cada ~5 meses) que:

1. Lee los *secrets* de GitHub: contenido del `.p8`, Team ID, Key ID, Services ID y un *access token* de Supabase.
2. Genera un JWT nuevo (ES256, `aud=https://appleid.apple.com`, `sub`=Services ID, caducidad ≤ 6 meses).
3. Lo guarda en Supabase con la Management API (`PATCH /v1/projects/{ref}/config/auth`, campo `external_apple_secret`).

Esa Action se crea en cuanto haya cuenta de Developer (queda pendiente; no existe todavía).
Conviene además un recordatorio en el calendario a los 5 meses por si la Action falla.

**La app nativa (iOS) no tiene este problema**: usa el flujo nativo (`signInWithIdToken` con el token que da el
sistema), que valida el Bundle ID y **no usa el secret de 6 meses**. Solo la web depende de la renovación.

## 6. Comprobaciones finales

- Entrar con Apple en `beta/` desde Safari de iPhone, con «Ocultar mi correo» activado y desactivado (Apple solo da el
  nombre/correo la **primera** vez).
- Si algún usuario deja de poder entrar con Apple a los ~6 meses: caducó el secret; ejecutar la Action a mano.
- Apple exige ofrecer **borrar la cuenta desde la app** (ya existe) y revocar el token de Apple al borrarla si la app
  llega al App Store.
