/* Prueba del papel en Punto Ciego: se ve solo mientras se mantiene pulsado, se oculta al soltar y no hay menú, selección ni scroll.
   Uso (con la web en http://localhost:8392/ y `node mocksb.js` en marcha):
     NODE_PATH=<ruta a node_modules con playwright> node tests/papel.js [urlBase]    Sale con código 1 si algo falla. */
const { chromium, devices } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:8392/';
let fallos = 0;
const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALLA ') + m); if (!c) fallos++; };
(async () => {
  const br = await chromium.launch();
  const ctx = await br.newContext({ ...devices['iPhone 13'], hasTouch: true });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE + '?supa=http://localhost:9999&supakey=local&pruebas=1'); await p.waitForTimeout(1500);
  await p.click('[data-a=jugar]'); await p.waitForTimeout(500); await p.click('[data-a=modoAcceso][data-m=crear]');
  await p.fill('#em', 'p' + Date.now() + '@ejemplo.com'); await p.fill('#pw', 'clave1234'); await p.click('[data-a=crearCuenta]');
  await p.waitForSelector('#nom'); await p.fill('#nom', 'Ana' + String(Date.now()).slice(-4)); await p.waitForTimeout(1000);
  await p.click('[data-a=guardarPerfil]'); await p.waitForSelector('[data-a=crear]'); await p.click('[data-a=crear]');
  await p.waitForSelector('[data-a=botMas]'); for (let i = 0; i < 3; i++) { await p.click('[data-a=botMas]'); await p.waitForTimeout(250); }
  await p.click('[data-a=empezar]'); await p.waitForSelector('[data-hold=papel]'); await p.waitForTimeout(1200);
  const caja = () => p.locator('[data-hold=papel]').boundingBox();
  const visible = () => p.evaluate(() => { const e = document.querySelector('.revela h1'); return !!e && e.offsetParent !== null; });
  ok(!(await visible()), 'al empezar el papel está tapado');
  ok(!(await p.locator('[data-a=entendido]').count()), 'sin ver el papel no hay botón Entendido');
  const css = await p.evaluate(() => { const s = getComputedStyle(document.querySelector('[data-hold=papel]')); return [s.userSelect || s.webkitUserSelect, s.webkitTouchCallout, s.touchAction]; });
  ok(css[0] === 'none' && css[2] === 'none', 'user-select y touch-action en none (' + css.join(', ') + ')');
  const y0 = await p.evaluate(() => scrollY);
  const b = await caja(), cx = b.x + b.width / 2, cy = b.y + b.height / 2;
  const cdp = await ctx.newCDPSession(p);
  const toque = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  await toque('touchStart', [{ x: cx, y: cy }]); await p.waitForTimeout(900);
  ok(await visible(), 'manteniendo pulsado se ve el papel');
  await toque('touchMove', [{ x: cx, y: cy - 60 }]); await p.waitForTimeout(150);
  ok(await p.evaluate(() => scrollY) === y0, 'arrastrar el dedo no hace scroll');
  ok((await p.evaluate(() => String(getSelection()))) === '', 'no se selecciona texto');
  ok(await p.locator('[data-a=entendido]').count() === 1, 'tras verlo aparece Entendido');
  await toque('touchEnd', []); await p.waitForTimeout(400);
  ok(!(await visible()), 'al soltar el papel se oculta');
  const prevenido = await p.evaluate(() => { const e = new MouseEvent('contextmenu', { bubbles: true, cancelable: true }); document.querySelector('[data-hold=papel]').dispatchEvent(e); return e.defaultPrevented; });
  ok(prevenido, 'el menú contextual queda bloqueado');
  await p.focus('[data-hold=papel]'); await p.keyboard.down('Space'); await p.waitForTimeout(300);
  ok(await visible(), 'con teclado (Espacio) también se ve'); await p.keyboard.up('Space'); await p.waitForTimeout(300);
  ok(!(await visible()), 'y se oculta al soltar la tecla');
  ok(errs.length === 0, 'sin errores de JS' + (errs.length ? ': ' + errs[0] : ''));
  await br.close(); process.exit(fallos ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
