// ============================================================================
//  Bildaufbereitung Sammelwand (275 Werke) – Fotos NICHT im Repo.
//  Quelle: HOREK_SRCDIR (Fotoordner) + <SRCDIR>/_Auswahl/Kirche_v3/werke_sammelwand.json
//    HOREK_SRCDIR="/pfad" node tools/process_sammelwand.js [--only 3,5,6]
//  Pro Werk: `drehen` Grad im Uhrzeigersinn anwenden (Höhe/Breite gelten schon
//  für das gedrehte Foto), dann Wandtextur (512 px bis 45 cm, sonst 1024) und
//  Lupe-Hires (lange Seite höchstens 2000 px, nichts hochrechnen).
//  Schreibt public/works/<nr>.webp + hires/<nr>.jpg und src/werke_sammelwand.json
//  (nur Anzeige-/Hängefelder, OHNE datei/drehen).
// ============================================================================
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SRCDIR = (process.env.HOREK_SRCDIR || '').replace(/\/?$/, '/');
if (!SRCDIR || SRCDIR === '/') { console.error('Bitte HOREK_SRCDIR setzen.'); process.exit(1); }
const LIST = path.join(SRCDIR, '_Auswahl', 'Kirche_v3', 'werke_sammelwand.json');
if (!fs.existsSync(LIST)) { console.error('Fehlt: ' + LIST); process.exit(1); }

const onlyArg = process.argv.indexOf('--only');
const only = onlyArg >= 0 ? new Set(process.argv[onlyArg + 1].split(',').map(Number)) : null;

const works = JSON.parse(fs.readFileSync(LIST, 'utf8'));
const OUT = path.join(ROOT, '..', 'public', 'works');
const HI = path.join(OUT, 'hires');
fs.mkdirSync(HI, { recursive: true });

let texKB = 0, hiKB = 0, n = 0; const meta = [];
for (const w of works) {
  const display = { nr: w.nr, titel: w.titel, hoehe_cm: w.hoehe_cm, breite_cm: w.breite_cm,
    masse_ca: !!w.masse_ca, jahr: (w.jahr ?? null), preis_eur: (w.preis_eur ?? null), zone: 8, zone_name: 'Sammelwand' };
  meta.push(display);
  if (only && !only.has(w.nr)) continue;
  const src = path.join(SRCDIR, w.datei);
  if (!fs.existsSync(src)) { console.error('  FEHLT Foto:', w.nr, w.datei); continue; }
  // EXIF-Orientierung einbacken, dann manuelle Drehung (Grad im Uhrzeigersinn)
  let buf = await sharp(src).rotate().toBuffer();
  if (w.drehen) buf = await sharp(buf).rotate(w.drehen).toBuffer();
  const long = Math.max(+w.hoehe_cm, +w.breite_cm) <= 45 ? 512 : 1024;
  const tex = path.join(OUT, w.nr + '.webp');
  const hires = path.join(HI, w.nr + '.jpg');
  await sharp(buf).resize(long, long, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toFile(tex);
  await sharp(buf).resize(2000, 2000, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toFile(hires);
  texKB += fs.statSync(tex).size / 1024; hiKB += fs.statSync(hires).size / 1024; n++;
  if (n % 25 === 0) console.log('  ...', n, 'verarbeitet');
}

// Tracked JSON immer vollständig (alle 275 Anzeigefelder), auch bei --only
fs.writeFileSync(path.join(ROOT, '..', 'src', 'werke_sammelwand.json'), JSON.stringify(meta, null, 0) + '\n');
console.log(`fertig: ${n} Bilder verarbeitet, ${meta.length} Werke in src/werke_sammelwand.json`);
if (n) { console.log(`Wandtexturen (neu): ${(texKB / 1024).toFixed(1)} MB (Schnitt ${(texKB / n).toFixed(0)} KB)`);
  console.log(`Hires (neu): ${(hiKB / 1024).toFixed(1)} MB (Schnitt ${(hiKB / n).toFixed(0)} KB)`); }
