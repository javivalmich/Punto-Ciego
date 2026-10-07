# Inventario de diseño — /beta/ (antes del rediseño)

Todo vive en `beta/index.html` (CSS en el `<style>` inicial, HTML generado por funciones `v*()` en JS).

## Estilos base (antes)
- Tokens sueltos: `--acero #0C0C0C`, `--casco #161618`, `--chapa #202023`, `--remache #303035`, `--tiza #F3EEE6`, `--niebla #9C978F`, `--baliza/--alarma #FF4637`, `--sonar`, `--ok`.
- Radios dispersos: 3, 6, 8, 10, 12, 14, 16px, 50%, 999px (pills por todas partes).
- Sombras con blur: toast, walkie FAB, walkie talk.
- Fuente única: Outfit (local, `fonts/outfit-latin.woff2`).
- Colores sueltos en línea: `#c7d1da`, `#cfc9bf`, `#ff8f86`, `#241312`, `#221110`, `#1a0808`…

## Componentes clicables (clase → dónde)
| Componente | Clase / selector | Pantallas |
|---|---|---|
| Botón base | `button` | todas |
| Principal claro | `.b-baliza` | perfil, acceso, menú, lobby (Empezar), tareas, final |
| Principal rojo | `.b-alarma` | reportar, matar, reparar, borrar cuenta |
| Jugar | `.b-jugar` | portada |
| Secundario | `.b-sec` | compartir, bloquear, volver |
| Enlace | `.b-link` (`.peligro`) | cancelar, salir, olvido contraseña |
| Mini | `.b-mini`, `.b-peq` | lista de jugadores (Bloquear/Quitar), editar personaje |
| Chip | `.chip`, `.chip.on` | salas, tipo de tareas, pruebas |
| Sitio (tarjeta) | `.sitio`, `.sitio.on` | lobby «Dónde jugáis» |
| Interruptor | `.tog`, `.tog.on` | reglas del lobby |
| Paso ± | `.paso .ctl button` | reglas del lobby |
| Pestañas | `.pestanas button` | acceso (Entrar/Crear) |
| Google / Apple | `.b-google`, `.b-apple` | acceso |
| Muestra de color | `.sw`, `.sw.on` | editor de personaje |
| Gente | `.gente-b` | hojas (víctima, sala, soy) |
| Opción | `.opc` | hoja de atajos/sabotajes |
| Sala del panel | `.ps` | partida |
| Tarea | `.tarea` | partida |
| Voto | `.voto` | reunión |
| Barra inferior | `#bar .barra button` | partida |
| Walkie / Atajos | `#wkFab`, `#prFab`, `#wkPtt`, `.wk-m button` | partida |
| Revelado | `.revela[data-hold]`, `.rol-b[data-hold]` | revelado de papel |
| Minijuegos | `.g-c`, `.g-n`, `.g-hold`, `.g-tubo`, `.g-llenar`… | tareas |
| Cierres | `.sh-cerrar`, `#wkCerrar` | hojas, walkie |
| Resumen | `details.reglas summary` | portada, lobby, partida |
| Legal | `.legal a` | portada, menú, acceso |

## Orden del rediseño
1. Tokens centralizados (esta pasada) + primitivas (botón, input, tarjeta, chip, tog, lista).
2. **Portada** y **sala de espera** (esta pasada).
3. Pendiente: acceso, perfil/editor, menú, partida, reunión, revelado, final, minijuegos.
