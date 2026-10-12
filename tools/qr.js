// ============================================================================
//  QR-Codes pro Werk (SVG + PNG, druckfähig) + druckbare Übersichtsseite.
//  Lokal erzeugt, ohne Online-Dienst.   Aufruf:  node tools/qr.js
//  Erzeugt: qr/<nr>.svg, qr/<nr>.png, qr/uebersicht.html
// ============================================================================
import QRCode from 'qrcode';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WORKS } from '../src/works.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(ROOT, '..', 'qr');
const SITE = 'https://galerie.horekcollagen.de';
fs.mkdirSync(OUT, { recursive: true });

const cm = mm => (mm / 10).toLocaleString('de-DE');
const eur = n => n.toLocaleString('de-DE') + ' €';
const maß = w => (w.approx === false ? '' : 'ca. ') + cm(w.h) + ' × ' + cm(w.b) + ' cm';

const opts = { margin: 1, color: { dark: '#111110', light: '#ffffff' } };

const cards = [];
for (const w of WORKS) {
  const url = `${SITE}/?werk=${w.nr}`;
  await QRCode.toFile(path.join(OUT, `${w.nr}.svg`), url, { ...opts, type: 'svg', width: 600 });
  await QRCode.toFile(path.join(OUT, `${w.nr}.png`), url, { ...opts, type: 'png', width: 1200 });
  const svg = fs.readFileSync(path.join(OUT, `${w.nr}.svg`), 'utf8');
  cards.push(`
    <article class="card">
      <div class="qr">${svg}</div>
      <h2>${w.title}</h2>
      <div class="meta">${w.year} · Collage auf Holz, Unikat</div>
      <div class="meta">${maß(w)}</div>
      <div class="price">${eur(w.price)}</div>
      <div class="url">galerie.horekcollagen.de/?werk=${w.nr}</div>
    </article>`);
}

const html = `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8">
<title>HOREK – Werk-Kärtchen (QR)</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; color: #141210; margin: 0; }
  h1 { font-size: 18px; margin: 0 0 10mm; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8mm; }
  .card { border: 1px solid #e2ded5; border-radius: 3px; padding: 7mm 6mm; text-align: center; break-inside: avoid; }
  .qr svg { width: 46mm; height: 46mm; }
  .card h2 { font-size: 13px; line-height: 1.25; margin: 4mm 0 2mm; }
  .meta { font-size: 11px; color: #6b655c; }
  .price { font-size: 15px; font-weight: 700; margin-top: 3mm; }
  .url { font-size: 9px; color: #9a9284; margin-top: 2mm; }
  @media screen { body { background: #f3efe8; padding: 16px; } .grid { max-width: 1000px; margin: 0 auto; } .card { background: #fff; } }
</style></head>
<body>
  <h1>HOREK – Werk-Kärtchen · scanne, um das Werk im virtuellen Raum zu sehen</h1>
  <div class="grid">${cards.join('')}</div>
</body></html>`;
fs.writeFileSync(path.join(OUT, 'uebersicht.html'), html);
console.log(`QR erzeugt: ${WORKS.length} Werke · qr/<nr>.svg + .png + uebersicht.html`);
