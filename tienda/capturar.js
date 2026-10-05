/* Genera las capturas de las fichas de Google Play y App Store en tienda/capturas/<destino>/.
   Usa el servidor de pruebas local (mocksb.js) y el modo ?pruebas=1 con bots, y limpia en pantalla todo lo que delata las pruebas.
   Uso (desde la raíz del repo, con la web en http://localhost:8385 y `node mocksb.js` en marcha):
     NODE_PATH=<ruta a node_modules con @playwright/test> node tienda/capturar.js [urlBase] */
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const BASE = process.argv[2] || 'http://localhost:8385/';
const DESTINOS = [
  { dir: 'google-1080x1920', width: 360, height: 640 },
  { dir: 'apple-6.9-1320x2868', width: 440, height: 956 },
  { dir: 'apple-6.5-1284x2778', width: 428, height: 926 },
  { dir: 'apple-5.5-1242x2208', width: 414, height: 736 },
];
const NOMBRES = ['Ana', 'Luis', 'Marta'];

(async () => {
  const br = await chromium.launch();
  for (const d of DESTINOS) {
    const out = path.join(__dirname, 'capturas', d.dir);
    fs.mkdirSync(out, { recursive: true });
    const ctx = await br.newContext({ viewport: { width: d.width, height: d.height }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    const p = await ctx.newPage();
    const limpia = () => p.evaluate((nombres) => {
      const st = document.getElementById('estiloTienda') || Object.assign(document.head.appendChild(document.createElement('style')), { id: 'estiloTienda' });
      st.textContent = '#prFab,.bloque.prueba,[data-a=galeria],[data-a=botMas],[data-a=botQuita],.bot-tag{display:none!important}';
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let n; while ((n = w.nextNode())) {
        if (/Bot (Ana|Luis|Marta)/.test(n.nodeValue)) n.nodeValue = n.nodeValue.replace(/Bot (Ana|Luis|Marta)/g, '$1');
        if (/Ana\d{4}/.test(n.nodeValue)) n.nodeValue = n.nodeValue.replace(/Ana\d{4}/g, 'Javi');
      }
    }, NOMBRES);
    const shot = async (n) => { await limpia(); await p.waitForTimeout(250); await limpia(); await p.screenshot({ path: path.join(out, n + '.png') }); await p.evaluate(() => { const s = document.getElementById('estiloTienda'); if (s) s.textContent = ''; }); };
    const q = '?supa=http://localhost:9999&supakey=local&pruebas=1';
    await p.goto(BASE + q); await p.waitForTimeout(1500);
    await shot('01-portada');
    await p.click('[data-a=jugar]'); await p.waitForTimeout(600);
    await p.click('[data-a=modoAcceso][data-m=crear]');
    await p.fill('#em', 'tienda' + Date.now() + '@ejemplo.com'); await p.fill('#pw', 'clave1234');
    await p.click('[data-a=crearCuenta]'); await p.waitForSelector('#nom', { timeout: 10000 });
    await p.fill('#nom', 'Ana' + String(Date.now()).slice(-4));
    await p.waitForTimeout(1500);
    await shot('02-crea-tu-personaje');
    await p.click('[data-a=guardarPerfil]'); await p.waitForSelector('[data-a=crear]', { timeout: 10000 }); await p.waitForTimeout(1500);
    await shot('03-menu');
    await p.click('[data-a=crear]'); await p.waitForSelector('[data-a=botMas]', { timeout: 15000 });
    for (let i = 0; i < 3; i++) { await p.click('[data-a=botMas]'); await p.waitForTimeout(350); }
    await p.click('[data-a=prRol]:has-text("Ciego")');
    await p.evaluate(() => scrollTo(0, 0)); await shot('04-sala-de-espera');
    await p.click('[data-a=empezar]'); await p.waitForSelector('[data-a=verPapel]', { timeout: 15000 }); await p.waitForTimeout(1500);
    await shot('05-partida');
    await p.click('[data-a=revelar]'); await p.waitForTimeout(900); await shot('06-tu-papel');
    await p.evaluate(() => { const b = document.querySelector('[data-a=entendido]'); if (b) b.click(); }); await p.waitForTimeout(800);
    await p.locator('[data-a=irSala]').filter({ hasText: /\d/ }).first().click(); await p.waitForTimeout(800); await shot('07-sala-y-tareas');
    const tarea = p.locator('[data-a=tarea]').first();
    if (await tarea.count()) { await tarea.click(); await p.waitForTimeout(900); await shot('08-tarea'); }
    // reunión de emergencia (atajo del modo pruebas) y votación
    await p.evaluate(() => { const s = document.getElementById('estiloTienda'); if (s) s.textContent = ''; });
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    await p.evaluate(() => { const f = document.getElementById('prFab'); if (f) f.click(); }); await p.waitForTimeout(500);
    const reu = p.locator('[data-a=atajoReunion]');
    if (await reu.count()) {
      await reu.click(); await p.waitForTimeout(1500);
      await p.evaluate(() => { const o = document.getElementById('over'); });
      await shot('09-reunion');
      await p.evaluate(() => { const f = document.getElementById('prFab'); if (f) f.click(); }); await p.waitForTimeout(500);
      const deb = p.locator('[data-a=atajoDebate]'); if (await deb.count()) { await deb.click({ force: true }); await p.waitForTimeout(1500); await shot('10-votacion'); }
    }
    await ctx.close();
  }
  await br.close();
})().catch(e => { console.error(e); process.exit(1); });
