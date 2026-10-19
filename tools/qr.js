// ============================================================================
//  QR-Codes pro Werk (SVG + PNG) + druckbare Übersicht. Lokal, ohne Online.
//  Quelle: src/werke_kirche.json.   Aufruf: node tools/qr.js  (npm run qr)
// ============================================================================
import QRCode from 'qrcode';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(ROOT, '..', 'qr');
const SITE = 'https://galerie.horekcollagen.de';
const works = JSON.parse(fs.readFileSync(path.join(ROOT, '..', 'src', 'werke_kirche.json'), 'utf8'))
  .sort((a, b) => a.nr - b.nr);
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });

const eur = n => n.toLocaleString('de-DE') + ' €';
const nz = n => (Number.isInteger(n) ? n : n.toLocaleString('de-DE'));
const mass = w => (w.masse_ca ? 'ca. ' : '') + nz(w.hoehe_cm) + ' × ' + nz(w.breite_cm) + ' cm';
const opts = { margin: 1, color: { dark: '#111110', light: '#ffffff' } };

const cards = [];
for (const w of works) {
  const url = `${SITE}/?werk=${w.nr}`;
  await QRCode.toFile(path.join(OUT, `${w.nr}.svg`), url, { ...opts, type: 'svg', width: 600 });
  await QRCode.toFile(path.join(OUT, `${w.nr}.png`), url, { ...opts, type: 'png', width: 1000 });
  const svg = fs.readFileSync(path.join(OUT, `${w.nr}.svg`), 'utf8');
  cards.push(`<article class="card"><div class="qr">${svg}</div>
    <h2>${w.titel}</h2><div class="meta">${w.jahr} · Collage auf Holz, Unikat</div>
    <div class="meta">${mass(w)}</div><div class="price">${eur(w.preis_eur)}</div>
    <div class="url">galerie.horekcollagen.de/?werk=${w.nr}</div></article>`);
}

const html = `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8">
<title>HOREK – Werk-Kärtchen (QR)</title><style>
@page{size:A4;margin:10mm} *{box-sizing:border-box}
body{font-family:-apple-system,"Segoe UI",Helvetica,Arial,sans-serif;color:#141210;margin:0}
h1{font-size:16px;margin:0 0 7mm}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6mm}
.card{border:1px solid #e2ded5;border-radius:3px;padding:6mm 5mm;text-align:center;break-inside:avoid}
.qr svg{width:40mm;height:40mm}
.card h2{font-size:12px;line-height:1.25;margin:3mm 0 1.5mm}
.meta{font-size:10px;color:#6b655c}.price{font-size:13px;font-weight:700;margin-top:2mm}
.url{font-size:8px;color:#9a9284;margin-top:1.5mm}
@media screen{body{background:#f3efe8;padding:16px}.grid{max-width:1000px;margin:0 auto}.card{background:#fff}}
</style></head><body>
<h1>HOREK – Werk-Kärtchen · scanne, um das Werk in der virtuellen Kirche zu sehen (${works.length} Werke)</h1>
<div class="grid">${cards.join('')}</div></body></html>`;
fs.writeFileSync(path.join(OUT, 'uebersicht.html'), html);
console.log(`QR erzeugt: ${works.length} Werke · qr/<nr>.svg + .png + uebersicht.html`);
