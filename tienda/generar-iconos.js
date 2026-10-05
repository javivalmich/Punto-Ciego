/* Redibuja el icono de Punto Ciego como vector (reticle + personaje, a partir de las formas del logo) y lo exporta a PNG
   nítido en cualquier tamaño: no se reescala ningún original pequeño.
   Uso: NODE_PATH=<node_modules con @playwright/test> node tienda/generar-iconos.js
   Salida: assets/icons/icono.svg, icono-maskable.svg y los PNG (192, 512, 1024, maskable, apple-touch-icon). */
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const OUT = path.join(__dirname, '..', 'assets', 'icons');

const CREMA = '#F3EEE6', ROJO = '#FF4637', NEGRO = '#0C0C0C';

/* Todo se dibuja en un lienzo de 1024 con el reticle centrado en (512,512) y radio exterior 352. `escala` encoge el dibujo
   dentro del lienzo (más margen para el icono «maskable»). */
function svg(escala) {
  const cx = 512, cy = 512, R = 330, W = 46;
  const rad = (d) => (d * Math.PI) / 180;
  const pt = (r, deg) => [cx + r * Math.sin(rad(deg)), cy - r * Math.cos(rad(deg))];
  const arc = (a0, a1, color) => {
    const [x0, y0] = pt(R, a0), [x1, y1] = pt(R, a1);
    return `<path d="M${x0.toFixed(1)} ${y0.toFixed(1)} A${R} ${R} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}" fill="none" stroke="${color}" stroke-width="${W}" stroke-linecap="butt"/>`;
  };
  const GAP = 13; // grados de hueco a cada lado de cada punto cardinal
  const tick = (deg, color) => {
    const [x0, y0] = pt(R - 46, deg), [x1, y1] = pt(R + 46, deg);
    return `<line x1="${x0.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}" stroke="${color}" stroke-width="30" stroke-linecap="butt"/>`;
  };
  const reticle =
    arc(180 + GAP, 270 - GAP, CREMA) + arc(270 + GAP, 360 - GAP, CREMA) +   // mitad izquierda, crema
    arc(GAP, 90 - GAP, ROJO) + arc(90 + GAP, 180 - GAP, ROJO) +             // mitad derecha, roja
    tick(0, CREMA) + tick(180, CREMA) + tick(270, CREMA) + tick(90, ROJO);

  const personaje = `<g transform="translate(512 520) scale(.82) translate(-512 -520)">
  <ellipse cx="520" cy="826" rx="150" ry="20" fill="#000" opacity=".45"/>
  <!-- piernas y botas -->
  <path d="M450 706 h74 v92 q0 22 -22 22 h-62 q-26 0 -26 -26 q0 -22 22 -26 z" fill="#232328" stroke="#5A5A64" stroke-width="3"/>
  <path d="M540 706 h74 v78 q0 36 -30 36 h-56 q-20 0 -20 -20 z" fill="#18181C" stroke="${ROJO}" stroke-width="3" stroke-opacity=".6"/>
  <ellipse cx="478" cy="812" rx="62" ry="22" fill="#0A0A0C" stroke="#5A5A64" stroke-width="3"/><ellipse cx="582" cy="814" rx="66" ry="22" fill="#0A0A0C" stroke="${ROJO}" stroke-width="3" stroke-opacity=".6"/>
  <!-- mochila -->
  <rect x="330" y="540" width="120" height="190" rx="44" fill="url(#mochila)" stroke="#6A6A74" stroke-width="4"/>
  <rect x="352" y="600" width="76" height="62" rx="22" fill="#26262B"/>
  <!-- chaqueta -->
  <path d="M400 540 q112 -66 238 -8 q44 44 36 150 q-8 52 -50 56 h-176 q-52 -4 -62 -62 q-4 -86 14 -136 z" fill="url(#chaqueta)" stroke="url(#rim)" stroke-width="5"/>
  <path d="M452 668 q74 24 160 0 v44 q-80 22 -160 0 z" fill="#1B1B20" stroke="#3A3A42" stroke-width="3"/>
  <!-- brazo y guante -->
  <path d="M628 570 q64 14 82 74 q4 28 -22 36 q-40 6 -70 -22 z" fill="#131316"/>
  <ellipse cx="682" cy="646" rx="48" ry="40" fill="${CREMA}"/><ellipse cx="672" cy="636" rx="26" ry="20" fill="#fff" opacity=".5"/>
  <!-- móvil -->
  <g transform="rotate(14 742 556)"><rect x="700" y="470" width="84" height="150" rx="16" fill="#0C0C0E" stroke="${ROJO}" stroke-width="5" opacity=".95"/>
  <rect x="710" y="486" width="64" height="118" rx="8" fill="#1B1B21"/></g>
  <!-- capucha -->
  <ellipse cx="518" cy="392" rx="172" ry="166" fill="url(#capucha)"/>
  <!-- cara -->
  <ellipse cx="546" cy="400" rx="116" ry="124" fill="#07070A"/>
  <ellipse cx="506" cy="394" rx="19" ry="31" fill="#fff"/><ellipse cx="582" cy="394" rx="19" ry="31" fill="#fff"/>
  <ellipse cx="500" cy="380" rx="5" ry="9" fill="#fff" opacity=".0"/>
  <!-- brillo de la capucha -->
  <path d="M392 326 q22 -70 112 -88" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="14" stroke-linecap="round"/></g>`;

  const defs = `
  <defs>
    <radialGradient id="fondo" cx="50%" cy="46%" r="62%"><stop offset="0" stop-color="#1E1E22"/><stop offset="1" stop-color="${NEGRO}"/></radialGradient>
    <radialGradient id="capucha" cx="40%" cy="30%" r="80%"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".55" stop-color="${CREMA}"/><stop offset="1" stop-color="#C9C1B6"/></radialGradient>
    <linearGradient id="chaqueta" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3C3C45"/><stop offset="1" stop-color="#16161A"/></linearGradient>
    <linearGradient id="rim" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8A8A94"/><stop offset=".6" stop-color="#4A4A52"/><stop offset="1" stop-color="${ROJO}"/></linearGradient>
    <linearGradient id="mochila" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4A4A53"/><stop offset="1" stop-color="#202026"/></linearGradient>
    <radialGradient id="brillo" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="${ROJO}" stop-opacity=".16"/><stop offset="1" stop-color="${ROJO}" stop-opacity="0"/></radialGradient>
  </defs>`;
  const t = `translate(${512 - 512 * escala} ${512 - 512 * escala}) scale(${escala})`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">${defs}
  <rect width="1024" height="1024" fill="url(#fondo)"/>
  <g transform="${t}"><circle cx="512" cy="512" r="300" fill="url(#brillo)"/>${reticle}${personaje}</g></svg>`;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const ANY = 1.18, MASK = 0.92; // el reticle mide 704/1024 del lienzo: ~83% en «any» y ~64% en «maskable» (zona segura: círculo del 80%)
  fs.writeFileSync(path.join(OUT, 'icono.svg'), svg(ANY));
  fs.writeFileSync(path.join(OUT, 'icono-maskable.svg'), svg(MASK));
  const br = await chromium.launch();
  const page = await br.newPage({ deviceScaleFactor: 1 });
  const render = async (s, size, file) => {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<body style="margin:0;background:#0C0C0C"><div style="width:${size}px;height:${size}px">${s.replace('width="1024" height="1024"', `width="${size}" height="${size}"`)}</div></body>`);
    await page.screenshot({ path: path.join(OUT, file), clip: { x: 0, y: 0, width: size, height: size } });
  };
  const any = svg(ANY), mask = svg(MASK);
  await render(any, 1024, 'icon-1024.png');
  await render(any, 512, 'icon-512.png');
  await render(any, 192, 'icon-192.png');
  await render(any, 180, 'apple-touch-icon.png');
  await render(mask, 512, 'icon-maskable-512.png');
  await render(mask, 192, 'icon-maskable-192.png');
  await render(mask, 1024, 'icon-maskable-1024.png');
  // hoja de comprobación: cómo se recorta en círculo y en cuadrado redondeado (no se versiona)
  const prev = path.join(__dirname, 'vista-previa-recortes.png');
  const b64 = (f) => 'data:image/png;base64,' + fs.readFileSync(path.join(OUT, f)).toString('base64');
  await page.setViewportSize({ width: 1180, height: 640 });
  await page.setContent(`<body style="margin:0;background:#888;font:14px system-ui;color:#fff"><div style="display:flex;gap:20px;padding:20px;flex-wrap:wrap">
    ${[['any · círculo', 'icon-512.png', '50%'], ['any · cuadrado redondeado', 'icon-512.png', '22.4%'], ['maskable · círculo', 'icon-maskable-512.png', '50%'], ['maskable · cuadrado redondeado', 'icon-maskable-512.png', '22.4%']]
      .map(([t, f, r]) => `<div style="text-align:center"><img src="${b64(f)}" width="256" height="256" style="border-radius:${r}">${'<br>' + t}</div>`).join('')}
    ${[['180', 'apple-touch-icon.png', 180], ['96', 'icon-192.png', 96], ['48', 'icon-192.png', 48]].map(([t, f, w]) => `<div style="text-align:center"><img src="${b64(f)}" width="${w}" height="${w}" style="border-radius:22.4%"><br>${t}px</div>`).join('')}
  </div></body>`);
  await page.screenshot({ path: prev });
  await br.close();
  console.log('listo');
})().catch((e) => { console.error(e); process.exit(1); });
