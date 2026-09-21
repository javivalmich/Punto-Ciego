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
- Los colores de capucha, sudadera, estampado, guantes y ojos se aplican en el shader; las zonas
  se calculan con la posición en reposo de cada vértice, así que seguirán valiendo cuando la malla
  se deforme con un esqueleto.
- Menú, editor (se gira arrastrando), revelado, reunión y muerte son vistas vivas con animación.
  Los avatares de listas y votaciones son imágenes (`data:` URL) generadas con el mismo modelo.
  El bucle de dibujo solo corre si hay un 3D visible y la pestaña está activa, y respeta
  `prefers-reduced-motion`.

El modelo original y los archivos pesados de origen están en `fuentes/`, que **no** se sube
al repositorio (`.gitignore`).

## Cómo se juega

1. Cada jugador abre la web en su móvil, pulsa **Jugar** y entra con su cuenta (o crea una).
2. Un jugador crea la partida y comparte el código; los demás se unen con él.
3. El anfitrión configura habitaciones, número de impostores y tareas, y empieza la partida.
4. Se reparten los roles en secreto. Tripulantes: completad las tareas. Impostores: eliminad
   y sabotead sin que os pillen.
5. Al encontrar un cuerpo o usar la emergencia hay reunión y votación. Ganan los tripulantes si
   completan las tareas o echan a todos los impostores; ganan los impostores si igualan en número.

Las partidas y el walkie viajan por MQTT cifrado a través de brokers públicos; no hay servidor propio.

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

## Cómo actualizar el juego

Edita `index.html` (y `assets/` si cambias el personaje), y luego:

```bash
git add index.html assets
git commit -m "Describe el cambio"
git push
```

GitHub Pages se actualiza solo en uno o dos minutos.

Para probar en local, sirve la carpeta con cualquier servidor estático, por ejemplo
`python -m http.server 8000`, y abre `http://localhost:8000`.

## Avisos

- Los proyectos gratuitos de Supabase se **pausan** si no se usan durante varios días
  (se reactivan desde el panel).
- "He olvidado la contraseña" **no enviará correos** mientras no se configure un SMTP propio en Supabase.
