// ============================================================================
//  Laufwege-Test: von jeder Station zur Nachbarstation begehbar, ohne Sperre.
//  Reine Rechteck-Begehbarkeit (das Kollisionsmodell ist GROUND/UPPER) per
//  Flood-Fill. Grün = die begehbare Fläche ist zwischen den Punkten verbunden.
//      node src/test/walk.test.js   (teil von npm test)
// ============================================================================
import assert from 'node:assert/strict';
import { GROUND, UPPER } from '../layout.js';

let passed = 0;
function check(name, fn) { fn(); passed++; console.log('  ✓ ' + name); }

const inRects = (rects, x, z) => rects.some(r => x > r.xL && x < r.xR && z > r.zF && z < r.zN);

// Flood-Fill über ein 0,2-m-Raster; true, wenn 'to' von 'from' erreichbar ist.
function connected(rects, from, to, step = 0.2) {
  const key = (x, z) => Math.round(x / step) + ',' + Math.round(z / step);
  const seen = new Set();
  const start = snap(rects, from, step), goal = snap(rects, to, step);
  assert.ok(start, `Startpunkt begehbar: ${JSON.stringify(from)}`);
  assert.ok(goal, `Zielpunkt begehbar: ${JSON.stringify(to)}`);
  const q = [start]; seen.add(key(start.x, start.z));
  const gk = key(goal.x, goal.z);
  while (q.length) {
    const c = q.shift();
    if (key(c.x, c.z) === gk) return true;
    for (const [dx, dz] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
      const nx = c.x + dx, nz = c.z + dz, k = key(nx, nz);
      if (seen.has(k) || !inRects(rects, nx, nz)) continue;
      seen.add(k); q.push({ x: nx, z: nz });
    }
  }
  return false;
}
// nächster begehbarer Rasterpunkt in der Nähe (Stationen liegen teils auf der Kante)
function snap(rects, p, step) {
  for (let r = 0; r <= 1.5; r += step) for (let dx = -r; dx <= r; dx += step) for (let dz = -r; dz <= r; dz += step) {
    const x = p.x + dx, z = p.z + dz; if (inRects(rects, x, z)) return { x, z };
  }
  return null;
}

console.log('Laufwege-Test:');

// Ebene 0: Nachbarstationen
const P = {
  vorhalle: { x: 10, z: 33.2 }, schiff: { x: 10, z: 22 }, bildwand: { x: 10, z: 10.5 },
  apsis: { x: 10, z: 4.5 }, kapelleL: { x: 2, z: 16.5 }, kapelleR: { x: 18, z: 16.5 },
  stairBase: { x: 12, z: 29 },
};
check('Vorhalle -> Schiff', () => assert.ok(connected(GROUND, P.vorhalle, P.schiff)));
check('Schiff -> Bildwand', () => assert.ok(connected(GROUND, P.schiff, P.bildwand)));
check('Bildwand -> Apsis', () => assert.ok(connected(GROUND, P.bildwand, P.apsis)));
check('Schiff -> linke Kapelle', () => assert.ok(connected(GROUND, P.schiff, P.kapelleL)));
check('Schiff -> rechte Kapelle', () => assert.ok(connected(GROUND, P.schiff, P.kapelleR)));
check('Vorhalle -> Treppenfuß (dann Treppe hoch)', () => assert.ok(connected(GROUND, P.vorhalle, P.stairBase)));

// Ebene 1: Emporen
const U = { westempore: { x: 10, z: 28.3 }, seitenL: { x: 5.5, z: 16 }, seitenR: { x: 14.5, z: 16 } };
check('Westempore -> linke Seitenempore', () => assert.ok(connected(UPPER, U.westempore, U.seitenL)));
check('Westempore -> rechte Seitenempore', () => assert.ok(connected(UPPER, U.westempore, U.seitenR)));

console.log(`\nAlle ${passed} Laufwege-Tests gruen.`);
