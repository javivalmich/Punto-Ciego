# Punto Ciego: material para las fichas

## Datos básicos

| Campo | Texto | Límite |
|---|---|---|
| Nombre | **Punto Ciego** | 30 (ambas) |
| Nombre del desarrollador | **Punto Studio** | |
| Subtítulo (App Store) | **Among Us en tu propia casa** (26) | 30 |
| Descripción breve (Google Play) | **Tareas, sabotajes e impostores por las habitaciones de tu casa, con el móvil.** (78) | 80 |
| Texto promocional (App Store, opcional) | Un juego de traición para jugar de verdad por la casa: haz tareas, sabotea y descubre quién miente. Gratis y sin anuncios. | 170 |
| Palabras clave (App Store) | impostor,among us,fiesta,amigos,traidor,tareas,sabotaje,casa,party,social,walkie | 100 |
| Categoría | Juegos › Fiesta / Aventura (Apple: Juegos › Acción o Familia) | |
| Idioma principal | Español (España) | |
| URL de privacidad | https://puntostudio.es/privacidad/ | |
| URL de soporte | https://puntostudio.es/soporte/ | |
| Correo de contacto | soporte@puntostudio.es | |
| Borrado de cuenta (Google exige URL) | https://puntostudio.es/soporte/#borrar-cuenta | |

## Descripción larga (máx. 4000)

Punto Ciego es un juego en el que No puedes confiar en lo que ves: se juega por tu casa, con el móvil en la mano. Unos jugadores son Ciegos y hacen tareas por las habitaciones; otros son Puntos, los impostores, que sabotean y eliminan sin que los vean. Cuando alguien encuentra un cuerpo o pulsa la emergencia, se abre una reunión y se vota a quién expulsar.

CÓMO SE JUEGA
• Cada jugador abre el juego en su móvil y entra con su cuenta.
• Uno crea la partida y comparte el código (o el QR); los demás se unen.
• El anfitrión elige dónde jugáis (piso, chalet, casa con jardín, hotel...), las habitaciones, los impostores y las tareas.
• Los roles se reparten en secreto. Ciegos: completad las tareas moviéndoos por las habitaciones de verdad. Puntos: sabotead y eliminad sin que os pillen.
• Al hallar un cuerpo o usar la emergencia hay reunión, debate y votación.
• Ganan los Ciegos si completan las tareas o expulsan a todos los Puntos. Ganan los Puntos si igualan en número.

LO MEJOR
• Tareas en las habitaciones de tu casa: minijuegos en el móvil y pruebas de vida real.
• Sabotajes: fugas de gas, apagones, puertas cerradas.
• Tu personaje en 3D, que puedes personalizar y que te sigue a cualquier móvil.
• Walkie-talkie integrado para hablar entre móviles: habla en directo o escribe. Tu voz no se graba ni se guarda.
• Funciona con varios móviles, sin servidor propio ni instalaciones: solo necesitáis internet.
• Gratis, sin anuncios y sin compras.

TU PRIVACIDAD
Solo guardamos tu correo, tu nombre y tu personaje, y puedes borrar tu cuenta desde la app cuando quieras.

Reúne a tus amigos, recorred la casa y descubrid quién es el Punto.

## Permisos y para qué se usan

| Permiso | Para qué | Cuándo se pide |
|---|---|---|
| Micrófono (`RECORD_AUDIO` / `NSMicrophoneUsageDescription`) | Hablar por el walkie-talkie; y, opcionalmente, la tarea «soplar» | Walkie: al pulsar hablar por primera vez (con nota explicativa en el panel). Tarea «soplar»: solo si el jugador toca «Soplar (usar el micrófono)»; hay alternativa tocando la pantalla. La voz no se graba ni se guarda |
| Sensores de movimiento (iOS: `NSMotionUsageDescription`) | Algunas tareas (agitar, equilibrio) | Solo al llegar a esa tarea; el sistema pide permiso en iPhone |
| Internet (`INTERNET`) | Cuentas y partidas entre móviles | Siempre |
| Vibración (`VIBRATE`) | Avisos de la partida | Sin diálogo de permiso |
| Mantener pantalla encendida (`WAKE_LOCK`) | Que la pantalla no se apague durante la partida | Sin diálogo de permiso |

No usa: ubicación, cámara, contactos, fotos, notificaciones push, publicidad ni analítica.

Texto sugerido para iOS (`NSMicrophoneUsageDescription`): «Punto Ciego usa el micrófono solo mientras mantienes pulsado el botón de hablar del walkie-talkie, o si eliges soplar al móvil en una tarea. La voz se envía en directo al grupo y no se graba ni se guarda.»
Texto sugerido para `NSMotionUsageDescription`: «Algunas tareas del juego usan el sensor de movimiento (por ejemplo, agitar el móvil). Los datos no salen del móvil.»

## Cuestionarios de las tiendas (respuestas previstas)

- **Google Play, Seguridad de los datos**: recopila correo y nombre/ID de usuario (cuenta obligatoria para jugar), y «Audio: voz o sonido» solo en tránsito, no almacenado ni compartido; no se venden ni se comparten con terceros para publicidad; cifrado en tránsito; el usuario puede pedir el borrado (en la app y por URL).
- **Apple, Privacidad de la app**: «Datos de contacto: correo» y «Contenido del usuario / identificadores: nombre y personaje», vinculados al usuario, solo para funcionalidad; sin seguimiento.
- **Moderación (Apple 1.2)**: el chat no está moderado, pero hay **bloquear** (en la lista de jugadores y ⚑ en el walkie; local al móvil) y **reportar** (correo a soporte con nombre, código y fecha), y el aviso de que es un chat entre amigos sin moderar (lista de jugadores, walkie, privacidad y soporte).
- **Clasificación por edades**: violencia de fantasía (eliminaciones entre personajes, sin sangre ni imágenes realistas) e interacción entre usuarios (voz y texto sin moderación): Apple 12+ aprox.; PEGI 12.

## Capturas de pantalla (`tienda/capturas/`)

Generadas con Playwright (`tienda/capturar.js`, ver su cabecera), 10 pantallas por tamaño: portada, crea tu personaje, menú, sala de espera con QR, partida, tu papel, sala, tarea, reunión y votación. Usan el servidor de pruebas local y bots, con los rótulos de «bot» y de pruebas retirados de la imagen; los nombres son ficticios.

| Carpeta | Tamaño | Uso |
|---|---|---|
| `google-1080x1920/` | 1080×1920 | Google Play, teléfono (mín. 2, máx. 8) |
| `apple-6.9-1320x2868/` | 1320×2868 | App Store, iPhone 6,9" (obligatorio) |
| `apple-6.5-1284x2778/` | 1284×2778 | App Store, iPhone 6,5" |
| `apple-5.5-1242x2208/` | 1242×2208 | App Store, iPhone 5,5" |

Las fichas admiten 8 (Google) o 10 (Apple) capturas: elige las mejores. Nota: el emoji 🪵 de «Casa rural» sale como un cuadrado en las capturas por falta de fuente en el navegador de pruebas; en un móvil real se ve bien.

Iconos en `assets/icons/`: `icon-512.png` (Google Play) e `icon-1024.png` (App Store, sin transparencia), más `icon-maskable-*.png` (la imagen reducida al 86 % sobre el color del borde, para que el anillo quede dentro de la zona segura de los recortes redondos). Salen directamente del original `punto-ciego.png` (1254 px, en `assets/marca/originales/` del repo del hub), reducido y nunca ampliado; ya no hay icono redibujado como vector. `tienda/vista-previa-recortes.png` (no se versiona) muestra cómo queda recortado en círculo y en cuadrado redondeado, grande y a 60 px, junto a Punto Falso.

## Pendiente de que rellenes tú

- [ ] Gráfico de funciones de Google Play (1024×500): no está hecho.
- [ ] Capturas de iPad y tablet si la app va a ser compatible (si no, restringe a iPhone/teléfono).
- [ ] Datos legales de las cuentas de desarrollador: el nombre visible del desarrollador en las fichas será **Punto Studio**, pero Apple y Google piden además datos verificables del titular real y, si te declaras «comerciante» (trader) en la UE, publican su dirección y teléfono. Como el juego es gratis y sin anuncios ni cobros, valora declararte como no comerciante; decídelo al abrir cada cuenta.
- [ ] Cuentas de desarrollador: Google Play Console (25 USD, una vez) y Apple Developer Program (99 USD/año).
- [ ] Activar Sign in with Apple en Supabase (`docs/APPLE_SIGNIN.md`): Apple lo exige si ofreces «Entrar con Google». Hoy el botón solo aparece si Supabase lo tiene activo. Después, desplegar la revocación del token al borrar la cuenta (`docs/BORRADO_APPLE.md`).
- [ ] Credenciales de revisión para Apple/Google: una cuenta de prueba (correo + contraseña) y cómo probarlo (hacen falta varios móviles; valora preparar un vídeo corto).
- [ ] Cuestionarios de clasificación por edades y de seguridad de datos.
