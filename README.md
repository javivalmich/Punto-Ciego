# Punto Ciego

Juego tipo *Among Us* en vida real: se juega por la casa con el móvil. Unos jugadores son
tripulantes y hacen tareas por las habitaciones; otros son impostores y sabotean y eliminan
sin que los vean. Cuando alguien encuentra un cuerpo, o pulsa la emergencia, se abre una
reunión y se vota a quién expulsar.

Es una web estática: `index.html` (HTML, CSS y JS) más una carpeta `assets/` con el personaje.
No tiene paso de compilación ni dependencias que instalar.

## El personaje 3D

El personaje es un modelo 3D real que se dibuja con un renderizador WebGL propio y sin
dependencias (`assets/personaje3d.js`, un único contexto WebGL para toda la app):

- `assets/personaje.bin`: la malla (26 k triángulos, ~300 KB). Solo se descarga al llegar al menú.
- `assets/img/*.webp` y `assets/img/m_*.png`: imágenes del look de serie y sus máscaras. Son el
  respaldo si el navegador no tiene WebGL (se recolorean en 2D) y el marcador mientras carga.
- Los colores de capucha, sudadera, pantalón, mochila, estampado, guantes y ojos se aplican en el shader; las zonas
  se calculan con la posición en reposo de cada vértice, así que seguirán valiendo cuando la malla
  se deforme con un esqueleto. La unión capucha/cuello es una línea curva calculada sobre la malla y horneada
  en el canal `w` de la posición en reposo. Pantalón y mochila valen 0 = «como la sudadera» (así los looks
  guardados antes de existir esos campos se ven igual).
- Menú, editor (se gira arrastrando), revelado, reunión y muerte son vistas vivas con animación.
  Los avatares de listas y votaciones son imágenes (`data:` URL) generadas con el mismo modelo.
  El bucle de dibujo solo corre si hay un 3D visible y la pestaña está activa, y respeta
  `prefers-reduced-motion`.

El modelo original y los archivos pesados de origen están en `fuentes/`, que **no** se sube
al repositorio (`.gitignore`).

## Dependencias de terceros

La única dependencia de terceros de todo el proyecto es el generador de códigos QR con el que
se puede entrar en una partida escaneando en vez de escribir el código: `assets/qr.js`,
vendorizado (el archivo copiado tal cual en el repo, no instalado como paquete) a partir de
[`qrcode-generator`](https://github.com/kazuhikoarase/qrcode-generator) de Kazuhiko Arase
(licencia MIT). No hace ninguna llamada a internet ni a ningún servicio externo: el QR se calcula
entero en el propio móvil, igual que el resto de la app.

## Cómo se juega

1. Cada jugador abre la web en su móvil, pulsa **Jugar** y entra con su cuenta (o crea una).
2. Un jugador crea la partida y comparte el código; los demás se unen con él.
3. El anfitrión configura habitaciones, número de impostores y tareas, y empieza la partida.
4. Se reparten los roles en secreto. Tripulantes: completad las tareas. Impostores: eliminad
   y sabotead sin que os pillen.
5. Al encontrar un cuerpo o usar la emergencia hay reunión y votación. Ganan los tripulantes si
   completan las tareas o echan a todos los impostores; ganan los impostores si igualan en número.

Las partidas y el walkie viajan por MQTT cifrado a través de brokers públicos; no hay servidor propio.

## Modo pruebas (jugar solo con bots)

Abre la web con `?pruebas=1` (por ejemplo `https://javivalmich.github.io/Punto-Ciego/?pruebas=1`). Sin ese parámetro
no existe nada de esto: ni panel, ni botón, ni código activo.

- **Sala de espera** (solo el anfitrión): panel *Pruebas* para añadir o quitar bots, elegir tu papel en la próxima
  partida (aleatorio, tripulante, impostor) y la velocidad de los bots (lenta, normal, rápida).
- **Durante la partida**: botón discreto *⚡ Atajos* para convocar una reunión ya, saltar el debate, terminar la votación,
  hacer que un bot impostor mate a alguien (incluido tú), lanzar cualquier sabotaje o completar las tareas de los bots.
- Los bots viven en el navegador del anfitrión: generan acciones con ids `bot-1`, `bot-2`… y se aplican con el mismo
  reducer que las de los jugadores reales. Si el anfitrión se desconecta, se paran.
- Las partidas con bots **no** cuentan para las estadísticas de Supabase, y el walkie solo funciona entre personas.
- El enlace de *Compartir* no lleva `pruebas=1`, y las acciones que llegan por la red con id de bot se descartan.

## Instalable y fichas de tienda

- Es instalable (PWA): `manifest.json`, iconos en `assets/icons/` y etiquetas de iOS (pantalla completa, barra de estado oscura). La beta tiene su propio `manifest.json` y `sw.js` (copias en `beta/`).
- `sw.js` tiene la caché versionada (`VERSION`): **sube `VERSION` al pasar cambios a la principal**. Red primero con revalidación, precarga de lo básico y recarga automática si estás en la portada.
- `privacidad.html` y `soporte.html` (en la raíz y en `beta/`) se enlazan desde la portada, el acceso y el perfil. Al pasar la beta a la principal no hace falta tocarlos.
- `tienda.md` y `tienda/capturas/` son el material de las fichas; las capturas se regeneran con `tienda/capturar.js`.

## Cómo se publica (GitHub Pages)

1. Sube el repositorio a GitHub (rama `main`).
2. En **Settings > Pages**, elige *Deploy from a branch*, rama `main`, carpeta `/ (root)`.
3. La web queda en `https://USUARIO.github.io/punto-ciego/`.

El archivo `.nojekyll` hace que GitHub Pages sirva `index.html` tal cual.

## Cómo se configura Supabase (cuentas de jugador)

Las cuentas, los looks y las estadísticas usan [Supabase](https://supabase.com). Si no se
configura, el juego funciona igualmente y guarda el perfil solo en cada móvil.

1. Crea un proyecto en Supabase (región Europa).
2. Aplica la migración `supabase/migrations/*_perfiles.sql`. Con la CLI:
   ```bash
   supabase link --project-ref TU_REF
   supabase db push
   ```
   O pégala entera en **SQL Editor > New query > Run**.
   Crea la tabla `profiles`, sus políticas RLS y la función `sumar_partida`.
3. En **Authentication > Sign In / Providers > Email**, desactiva **Confirm email**
   (el correo gratuito de Supabase solo envía a miembros del equipo y con un límite muy bajo).
4. En **Authentication > URL Configuration**, pon como *Site URL* la URL de GitHub Pages
   y añádela también a *Redirect URLs*.
5. En **Project Settings > API Keys** copia la *Project URL* y la clave **publishable**
   (`sb_publishable_...`) y pégalas en el bloque `const SUPA={url:'...',key:'...'}` de `index.html`.

> La clave publicable puede estar en el repositorio porque la tabla está protegida con RLS.
> **Nunca** subas una clave `sb_secret_...` ni `service_role`.

### Probar cuentas en local sin tocar Supabase

`mocksb.js` es un servidor local (Node, sin dependencias) que imita lo justo de la API de
Supabase (cuentas, perfiles, borrado de cuenta) para probar esos flujos sin conexión ni riesgo
sobre el proyecto real:

```bash
node mocksb.js          # escucha en http://localhost:9999
```

Y abre la beta apuntando a él:

```
http://localhost:8080/beta/?supa=http://localhost:9999&supakey=local&pruebas=1
```

Los datos de prueba se guardan en `.mocksb-data.json` (no se sube a git); bórralo para
empezar de cero.

## Cómo actualizar el juego: beta → principal

Hay dos copias de la web:

- **Principal** (raíz: `index.html` y `assets/`): `https://javivalmich.github.io/Punto-Ciego/`. La usan los jugadores.
- **Beta** (`beta/`): `https://javivalmich.github.io/Punto-Ciego/beta/`. Zona de pruebas permanente, con una etiqueta roja
  «BETA» y «(beta)» en el título. Comparte cuentas y base de datos con la principal.

Flujo de trabajo: los cambios se hacen siempre en `beta/`, se prueban en el iPhone y, cuando están bien, se pasan a la raíz:

```bash
git tag antes-beta-AAAA-MM-DD && git push origin antes-beta-AAAA-MM-DD   # punto de vuelta atrás
cp beta/index.html index.html && cp -r beta/assets/. assets/ && cp beta/NOTAS_ESQUELETO.md NOTAS_ESQUELETO.md
# en index.html: quita <div id="betaTag"...> y el «(beta)» del <title>
git add -A index.html assets NOTAS_ESQUELETO.md && git commit -m "Describe el cambio" && git push
```

Si cambias `assets/personaje.bin`, `personaje3d.js`, `qr.js` o las imágenes, sube su `?v=` en `index.html` (y el `bin:` de
`personaje3d.js`) para que los móviles no se queden con la versión vieja en caché.

### Versión de la partida (`APP_V`)

`APP_V` (en `index.html`, junto a `nuevaPartida`) es el número de versión de la partida compartida. Un móvil cuya
versión no coincide con la de la partida se bloquea con el aviso «Hay una versión nueva, recarga la página».

- **Súbelo** cuando el cambio afecte a la partida compartida: acciones nuevas o cambiadas, campos nuevos o cambiados en
  el estado de la partida, o reglas del juego. Dos versiones distintas no podrían jugar bien juntas.
- **No hace falta** en cambios solo visuales o de textos (estilos, maquetación, mensajes, el personaje...).
- **En la duda, súbelo:** el coste es que todos tengan que recargar; el riesgo de no subirlo es una partida
  corrupta o móviles que se quedan colgados sin aviso.
- Se sube **a la vez en `beta/` y en la raíz** al pasar a la principal, y al pasarlo hay que avisar a los jugadores de que recarguen.
- Los móviles anteriores al control de versión (antes de `APP_V=2`) no pueden mostrar el bloqueo: solo reciben un aviso breve.

Para volver a una versión anterior: `git revert <commit>` (o restaurar los archivos de la etiqueta con
`git checkout <etiqueta> -- index.html assets`) y push.

Para probar en local, sirve la carpeta con cualquier servidor estático, por ejemplo
`python -m http.server 8000`, y abre `http://localhost:8000` (principal) o `http://localhost:8000/beta/`.

## Avisos

- Los proyectos gratuitos de Supabase se **pausan** si no se usan durante varios días
  (se reactivan desde el panel).
- "He olvidado la contraseña" **no enviará correos** mientras no se configure un SMTP propio en Supabase.
