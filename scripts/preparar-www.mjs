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
console.log('www/ listo: ' + incluir.join(', '));
