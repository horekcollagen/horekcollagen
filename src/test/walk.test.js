// ============================================================================
//  Laufwege-Test: von jeder Station zur Nachbarstation begehbar, ohne Sperre.
//  Reine Rechteck-Begehbarkeit (das Kollisionsmodell ist GROUND/UPPER) per
//  Flood-Fill. Grün = die begehbare Fläche ist zwischen den Punkten verbunden.
//      node src/test/walk.test.js   (teil von npm test)
// ============================================================================
import assert from 'node:assert/strict';
import { GROUND, UPPER, EMPORE_FLOORS, EMPORE_RAILINGS, EMPORE_WALLS, EMPORE_OPENINGS } from '../layout.js';

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

// ---- Geländer an jeder freien Kante -------------------------------------------------------
const TOL = 0.2;
const onFloor = (floors, x, z) => floors.some(f => x > f.xL - 1e-6 && x < f.xR + 1e-6 && z > f.zF - 1e-6 && z < f.zN + 1e-6);
function covered(s) {
  // (a) angrenzende Platte außerhalb der Kante -> interne Fuge, keine freie Kante
  const ox = s.x + s.outDir.dx * 0.25, oz = s.z + s.outDir.dz * 0.25;
  if (onFloor(EMPORE_FLOORS.filter(f => f !== s.floor), ox, oz)) return true;
  // (b) Wand an dieser Kantenlinie
  if (EMPORE_WALLS.some(w => w.axis === s.edge && Math.abs(w.at - s.at) < TOL)) return true;
  // (c) Geländer deckt den Punkt
  const seg = (list) => list.some(r => r.axis === s.edge && Math.abs(r.at - s.at) < TOL &&
    (s.edge === 'z' ? (s.x > r.a - TOL && s.x < r.b + TOL) : (s.z > r.a - TOL && s.z < r.b + TOL)));
  if (seg(EMPORE_RAILINGS)) return true;
  // (d) erlaubte Öffnung (Treppenaustritt)
  if (seg(EMPORE_OPENINGS)) return true;
  return false;
}
function edgeSamples(f) {
  const out = [], step = 0.4;
  for (const [at, od] of [[f.zF, -1], [f.zN, 1]]) for (let x = f.xL + 0.15; x <= f.xR - 0.15; x += step) out.push({ floor: f, edge: 'z', at, x, z: at, outDir: { dx: 0, dz: od } });
  for (const [at, od] of [[f.xL, -1], [f.xR, 1]]) for (let z = f.zF + 0.15; z <= f.zN - 0.15; z += step) out.push({ floor: f, edge: 'x', at, x: at, z, outDir: { dx: od, dz: 0 } });
  return out;
}
check('Jede freie Emporenkante hat Wand oder Geländer', () => {
  const bad = [];
  for (const f of EMPORE_FLOORS) for (const s of edgeSamples(f)) if (!covered(s)) bad.push(`${s.edge}@${s.at} x${s.x.toFixed(1)} z${s.z.toFixed(1)}`);
  assert.equal(bad.length, 0, 'ungesicherte Kantenpunkte: ' + bad.slice(0, 6).join(' | '));
});
check('Von der Empore kommt man über keine Geländerkante hinaus', () => {
  // an jedem Geländer: die Außenseite (Seite ohne Platte) ist nicht begehbar
  for (const r of EMPORE_RAILINGS) {
    const mid = r.axis === 'z' ? { x: (r.a + r.b) / 2, z: r.at } : { x: r.at, z: (r.a + r.b) / 2 };
    for (const d of [0.3, 0.6]) {
      let ox = mid.x, oz = mid.z;
      if (r.axis === 'z') { const floorPlus = onFloor(EMPORE_FLOORS, mid.x, r.at + 0.2); oz = r.at + (floorPlus ? -d : d); }
      else { const floorPlus = onFloor(EMPORE_FLOORS, r.at + 0.2, mid.z); ox = r.at + (floorPlus ? -d : d); }
      assert.ok(!inRects(UPPER, ox, oz), `jenseits des Geländers begehbar: x${ox.toFixed(1)} z${oz.toFixed(1)}`);
    }
  }
});

console.log(`\nAlle ${passed} Laufwege-/Kanten-Tests gruen.`);
