// ============================================================================
//  Sammelwand-Hängung: alle 275 auf der Apsiswand, keine Überdeckung, Anker im
//  unteren Drittel, Garten-Eden-Rand frei.  (node src/test/sammelwand.test.js)
// ============================================================================
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { hangSammelwand } from '../hang_sammelwand.js';
import { APSE, APSE_HANG } from '../layout.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const raw = JSON.parse(fs.readFileSync(path.join(ROOT, '..', 'werke_sammelwand.json'), 'utf8'));
const r = hangSammelwand(raw);
let passed = 0;
const check = (name, fn) => { fn(); passed++; console.log('  ✓ ' + name); };

console.log('Sammelwand-Hängung:');

check('Alle 275 Werke hängen auf der Apsiswand (kein Überlauf)', () => {
  assert.equal(raw.length, 275);
  assert.equal(r.works.length, 275, 'platziert: ' + r.works.length);
  assert.equal(r.overflow.length, 0, 'Überlauf: ' + r.overflow.length);
});

const tm = r.stats.thetaMin, rH = r.stats.rHang;
const rect = w => { const u = rH * (Math.atan2(w.x - APSE.cx, w.z - APSE.cz) - tm); const wm = w.b / 1000, hm = w.h / 1000;
  return { nr: w.nr, u0: u - wm / 2, u1: u + wm / 2, v0: w.y - hm / 2, v1: w.y + hm / 2, uc: u, vc: w.y, long: Math.max(wm, hm) }; };
const rects = r.works.map(rect);

check('Keine Überdeckung (Abwicklung u×v)', () => {
  let ov = 0;
  for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
    const a = rects[i], b = rects[j];
    if (Math.min(a.u1, b.u1) - Math.max(a.u0, b.u0) > 0.004 && Math.min(a.v1, b.v1) - Math.max(a.v0, b.v0) > 0.004) ov++;
  }
  assert.equal(ov, 0, 'überlappende Paare: ' + ov);
});

check('Alle Werke sitzen auf der Trommel (Radius) und im Höhenband', () => {
  for (const w of r.works) {
    const rad = Math.hypot(w.x - APSE.cx, w.z - APSE.cz);
    assert.ok(Math.abs(rad - APSE_HANG.rHang) < 0.001, `Werk ${w.nr} nicht auf der Wand (r=${rad.toFixed(2)})`);
    const hm = w.h / 1000;
    assert.ok(w.y - hm / 2 >= APSE_HANG.vBottom - 0.02 && w.y + hm / 2 <= APSE_HANG.vTop + 0.02, `Werk ${w.nr} außerhalb des Bandes (y=${w.y.toFixed(2)})`);
  }
});

check('17 Anker (lange Seite ≥65 cm) im unteren Drittel', () => {
  const anchors = rects.filter(a => a.long >= 0.65);
  assert.equal(anchors.length, 17, 'Anker: ' + anchors.length);
  const lowerThird = APSE_HANG.vBottom + (APSE_HANG.vTop - APSE_HANG.vBottom) / 3;   // ~2.37 m
  for (const a of anchors) assert.ok(a.vc <= lowerThird + 0.1, `Anker ${a.nr} nicht im unteren Drittel (y=${a.vc.toFixed(2)})`);
});

check('Freier Rand ≥1 m um Garten Eden (Wandmitte unten)', () => {
  const U = r.stats.U, gu0 = U / 2 - (APSE_HANG.gartenEdenW / 2 + APSE_HANG.gartenEdenClear);
  const gu1 = U / 2 + (APSE_HANG.gartenEdenW / 2 + APSE_HANG.gartenEdenClear);
  const gv = APSE_HANG.gartenEdenTop + APSE_HANG.gartenEdenClear;
  for (const a of rects) {
    const inBand = a.u1 > gu0 && a.u0 < gu1, low = a.v0 < gv;
    assert.ok(!(inBand && low), `Werk ${a.nr} in der Garten-Eden-Sperrzone (u=${a.uc.toFixed(1)}, v=${a.vc.toFixed(1)})`);
  }
});

console.log(`\nAlle ${passed} Sammelwand-Tests gruen.`);
