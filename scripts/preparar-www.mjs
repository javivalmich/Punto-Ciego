/* Prepara `www/`, la carpeta que Capacitor mete en la app iOS.
   La web se sigue sirviendo tal cual desde la raíz del repo (GitHub Pages): aquí solo se COPIA lo que la app necesita,
   sin mover ni tocar nada. `beta/`, `tienda/`, `docs/`, `supabase/`, `tests/` y `fuentes/` se quedan fuera. */
import { cpSync, rmSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const destino = join(raiz, 'www');
const incluir = ['index.html', 'manifest.json', 'privacidad.html', 'soporte.html', 'terminos.html', 'assets', 'fonts'];

rmSync(destino, { recursive: true, force: true });
mkdirSync(destino);
for (const p of incluir) {
  if (!existsSync(join(raiz, p))) throw new Error('Falta ' + p);
  cpSync(join(raiz, p), join(destino, p), { recursive: true });
}
/* El puente nativo de iOS inyecta window.Capacitor pero sin registerPlugin: lo aporta @capacitor/core. Sin bundler, se copia su build UMD
   y index.html lo carga SOLO dentro de la app (la web no lo tiene en assets/). */
const core = join(raiz, 'node_modules', '@capacitor', 'core', 'dist', 'capacitor.js');
if (!existsSync(core)) throw new Error('Falta @capacitor/core: ejecuta npm install');
cpSync(core, join(destino, 'assets', 'capacitor.js'));
console.log('www/ listo: ' + incluir.join(', ') + ' + assets/capacitor.js');
