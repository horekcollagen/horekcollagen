// ============================================================================
//  Steuerungstest (ohne Browser, reine Mathematik) – prüft die RICHTUNG so,
//  wie sie sich auf dem Schirm anfühlt, nicht nur ob sich etwas ändert.
//  Operative Definition (aus Run 4):
//    Ziehen nach rechts  -> ein Werk RECHTS der Bildmitte rückt näher zur Mitte
//                           (der Blick dreht nach rechts, das Bild wandert nach links).
//    Ziehen nach oben    -> ein Werk ÜBER der Bildmitte rückt näher zur Mitte
//                           (der Blick dreht nach oben).
//    Pfeiltaste hoch = vorwärts (-z), runter = rückwärts (+z).
//      node src/test/controls.test.js   (oder: npm test)
// ============================================================================
import assert from 'node:assert/strict';
import { forward, right, applyLook, step, CFG } from '../controls-core.js';

let passed = 0;
function check(name, fn) { fn(); passed++; console.log('  ✓ ' + name); }
const dt = 0.1;
const S = (o = {}) => ({ yaw: 0, pitch: 0, x: 0, z: 0, ...o });
const keys = (...k) => new Set(k);

// Bildschirm-x eines Weltpunkts P=(x,z) bei gegebenem yaw (Perspektive: seitlich/tief).
// >0 = rechts der Mitte, <0 = links. Nur gültig, wenn P vor der Kamera liegt.
function screenX(yaw, P) {
  const f = forward(yaw), r = right(yaw);
  const depth = f.x * P.x + f.z * P.z;         // Tiefe (vor der Kamera > 0)
  const lat = r.x * P.x + r.z * P.z;           // seitlicher Versatz
  assert.ok(depth > 1e-6, 'Punkt muss vor der Kamera liegen');
  return lat / depth;
}
// Bildschirm-y eines Weltpunkts P=(y,z) bei gegebenem pitch. >0 = über der Mitte.
function screenY(pitch, P) {
  const fz = -Math.cos(pitch), fy = Math.sin(pitch);   // forward3d = (0, sin p, -cos p)
  const uy = Math.cos(pitch), uz = Math.sin(pitch);    // up3d      = (0, cos p, sin p)
  const depth = fy * P.y + fz * P.z;
  const vert = uy * P.y + uz * P.z;
  assert.ok(depth > 1e-6, 'Punkt muss vor der Kamera liegen');
  return vert / depth;
}

console.log('Steuerungstest:');

check('yaw=0 blickt nach -z (forward ~ (0,-1))', () => {
  const f = forward(0);
  assert.ok(Math.abs(f.x) < 1e-9 && Math.abs(f.z + 1) < 1e-9, `forward(0)=${JSON.stringify(f)}`);
});

// --- RICHTUNG Maus: Ziehen nach rechts -> Werk rechts der Mitte rückt zur Mitte ---
check('Ziehen nach rechts: Werk rechts der Mitte rückt näher zur Mitte (Blick dreht nach rechts)', () => {
  const P = { x: 2, z: -5 };                 // 5 m voraus, 2 m rechts
  const before = screenX(0, P);
  assert.ok(before > 0, `Werk muss rechts der Mitte starten: ${before}`);
  const after = screenX(applyLook(S(), +120, 0).yaw, P);
  assert.ok(after < before - 1e-6, `muss zur Mitte wandern (kleiner werden): ${before} -> ${after}`);
  assert.ok(after > -1e-9 || after < before, 'wandert Richtung Mitte/links');
});

check('Ziehen nach links: Werk links der Mitte rückt näher zur Mitte (Blick dreht nach links)', () => {
  const P = { x: -2, z: -5 };
  const before = screenX(0, P);
  assert.ok(before < 0, `Werk muss links starten: ${before}`);
  const after = screenX(applyLook(S(), -120, 0).yaw, P);
  assert.ok(after > before + 1e-6, `muss zur Mitte wandern (größer werden): ${before} -> ${after}`);
});

// --- RICHTUNG Maus: Ziehen nach oben -> Werk über der Mitte rückt zur Mitte ---
check('Ziehen nach oben (dy<0): Werk über der Mitte rückt näher zur Mitte (Blick dreht nach oben)', () => {
  const P = { y: 2, z: -5 };
  const before = screenY(0, P);
  assert.ok(before > 0, `Werk muss oben starten: ${before}`);
  const after = screenY(applyLook(S(), 0, -120).pitch, P);
  assert.ok(after < before - 1e-6, `muss zur Mitte wandern: ${before} -> ${after}`);
});

check('Ziehen nach unten (dy>0): Werk unter der Mitte rückt näher zur Mitte (Blick dreht nach unten)', () => {
  const P = { y: -2, z: -5 };
  const before = screenY(0, P);
  assert.ok(before < 0, `Werk muss unten starten: ${before}`);
  const after = screenY(applyLook(S(), 0, +120).pitch, P);
  assert.ok(after > before + 1e-6, `muss zur Mitte wandern: ${before} -> ${after}`);
});

check('Pitch ist begrenzt (kein Überschlag)', () => {
  const p = applyLook(S(), 0, -100000).pitch;
  assert.ok(Math.abs(p) <= CFG.maxPitch + 1e-9 && p > 0, `pitch geklemmt: ${p}`);
});

// --- Pfeiltasten: hoch = vorwärts (-z), runter = rückwärts (+z) ---
check('↑/W (fwd) laeuft nach vorn (-z)', () => {
  const r = step(S(), keys('fwd'), dt);
  assert.ok(r.z < -1e-6, `z muss sinken (vorwaerts): ${r.z}`);
});
check('↓/S (back) laeuft nach hinten (+z) – NICHT nach vorn', () => {
  const r = step(S(), keys('back'), dt);
  assert.ok(r.z > 1e-6, `z muss STEIGEN (rueckwaerts): ${r.z}`);
});

// --- Dreh-Tasten: D/→ rechts, A/← links ---
check('→/D (right) dreht nach rechts: Werk rechts rückt zur Mitte', () => {
  const P = { x: 2, z: -5 };
  const before = screenX(0, P);
  const after = screenX(step(S(), keys('right'), dt).yaw, P);
  assert.ok(after < before - 1e-6, `rechts drehen: ${before} -> ${after}`);
});
check('←/A (left) dreht nach links: Werk links rückt zur Mitte', () => {
  const P = { x: -2, z: -5 };
  const before = screenX(0, P);
  const after = screenX(step(S(), keys('left'), dt).yaw, P);
  assert.ok(after > before + 1e-6, `links drehen: ${before} -> ${after}`);
});

check('rechts gedreht + vorwaerts -> bewegt sich nach rechts (+x)', () => {
  let s = step(S(), keys('right'), 0.5);
  const x0 = s.x;
  s = step(s, keys('fwd'), dt);
  assert.ok(s.x > x0 + 1e-6, `x muss steigen: ${x0} -> ${s.x}`);
});

check('Shift laeuft schneller als normal', () => {
  const slow = step(S(), keys('fwd'), dt).z;
  const fast = step(S(), keys('fwd', 'shift'), dt).z;
  assert.ok(Math.abs(fast) > Math.abs(slow) + 1e-6, `schnell ${fast} vs langsam ${slow}`);
  assert.ok(Math.abs(Math.abs(fast) / Math.abs(slow) - CFG.runMult) < 1e-6, 'Faktor = runMult');
});

check('ohne Taste keine Bewegung/Drehung', () => {
  const r = step(S({ yaw: 0.3 }), keys(), dt);
  assert.deepEqual([r.x, r.z, r.yaw], [0, 0, 0.3]);
});

console.log(`\nAlle ${passed} Steuerungstests gruen (Richtung geprüft).`);
