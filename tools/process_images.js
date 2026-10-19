import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.dirname(fileURLToPath(import.meta.url));
// Quellordner NICHT im Repo: aus Umgebungsvariable HOREK_SRCDIR (oder lokaler,
// gitignorierter Datei). Die Zuordnung nr -> Dateiname steht in der lokalen,
// gitignorierten Datei tools/werke_quellen.local.json (enthält keine Repo-Daten).
const SRCDIR = (process.env.HOREK_SRCDIR || '').replace(/\/?$/, '/');
if (!SRCDIR || SRCDIR === '/') {
  console.error('Bitte HOREK_SRCDIR setzen, z. B.:  HOREK_SRCDIR="/pfad/zum/quellordner" npm run images');
  process.exit(1);
}
const QUELLEN = path.join(ROOT, 'werke_quellen.local.json');
if (!fs.existsSync(QUELLEN)) {
  console.error('Fehlt: tools/werke_quellen.local.json (lokale nr->Datei-Zuordnung, nicht im Repo).');
  process.exit(1);
}
const dateiByNr = new Map(JSON.parse(fs.readFileSync(QUELLEN, 'utf8')).map(q => [q.nr, q.datei]));
const works = JSON.parse(fs.readFileSync(path.join(ROOT, '..', 'src', 'werke_kirche.json'), 'utf8'));
const OUT = path.join(ROOT, '..', 'public', 'works');
const HI = path.join(OUT, 'hires');
let texKB = 0, hiKB = 0, n = 0;
for (const w of works) {
  const src = SRCDIR + dateiByNr.get(w.nr);
  const long = Math.max(w.hoehe_cm, w.breite_cm) >= 60 ? 1024 : 512;
  const tex = path.join(OUT, w.nr + '.webp');
  const hires = path.join(HI, w.nr + '.jpg');
  await sharp(src).resize(long, long, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toFile(tex);
  await sharp(src).resize(3000, 3000, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toFile(hires);
  texKB += fs.statSync(tex).size / 1024; hiKB += fs.statSync(hires).size / 1024; n++;
}
console.log(`fertig: ${n} Werke`);
console.log(`Raum-Texturen gesamt: ${(texKB/1024).toFixed(1)} MB  (Schnitt ${(texKB/n).toFixed(0)} KB)`);
console.log(`Hires gesamt: ${(hiKB/1024).toFixed(1)} MB  (Schnitt ${(hiKB/n).toFixed(0)} KB)`);
