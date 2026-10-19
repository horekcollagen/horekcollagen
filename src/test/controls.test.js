// ============================================================================
//  Automatischer Steuerungstest (ohne Browser, reine Mathematik).
//  Prüft jede Taste und beide Ziehrichtungen auf die ERWARTETE Wirkung.
//  Grün (exit 0) muss er sein, bevor irgendetwas gezeigt wird.
//      node src/test/controls.test.js      (oder: npm test)
// ============================================================================
import assert from 'node:assert/strict';
import { forward, right, applyLook, step, CFG } from '../controls-core.js';

let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log('  ✓ ' + name);
}
const dt = 0.1;
const S = (o = {}) => ({ yaw: 0, pitch: 0, x: 0, z: 0, ...o });
const keys = (...k) => new Set(k);

console.log('Steuerungstest:');

// --- Blickrichtung / forward ---
check('yaw=0 blickt nach -z (forward ~ (0,-1))', () => {
  const f = forward(0);
  assert.ok(Math.abs(f.x) < 1e-9 && Math.abs(f.z + 1) < 1e-9, `forward(0)=${JSON.stringify(f)}`);
});

// --- Ziehen nach rechts -> nach rechts schauen ---
check('Ziehen nach rechts -> Blick dreht nach rechts (+x)', () => {
  const before = forward(0);
  const after = forward(applyLook(S(), +100, 0).yaw);
  assert.ok(after.x > before.x + 1e-6, `forward.x muss steigen: vorher ${before.x}, nachher ${after.x}`);
});

// --- Ziehen nach links -> nach links schauen ---
check('Ziehen nach links -> Blick dreht nach links (-x)', () => {
  const after = forward(applyLook(S(), -100, 0).yaw);
  assert.ok(after.x < -1e-6, `forward.x muss negativ werden: ${after.x}`);
});

// --- Ziehen nach oben -> nach oben schauen ---
check('Ziehen nach oben (dy<0) -> pitch steigt (nach oben schauen)', () => {
  const p = applyLook(S(), 0, -100).pitch;
  assert.ok(p > 1e-6, `pitch muss steigen: ${p}`);
});
check('Ziehen nach unten (dy>0) -> pitch sinkt', () => {
  const p = applyLook(S(), 0, +100).pitch;
  assert.ok(p < -1e-6, `pitch muss sinken: ${p}`);
});
check('Pitch ist begrenzt (kein Überschlag)', () => {
  const p = applyLook(S(), 0, -100000).pitch;
  assert.ok(Math.abs(p) <= CFG.maxPitch + 1e-9 && p > 0, `pitch geklemmt: ${p}`);
});

// --- Vorwärts / Rückwärts ---
check('W/↑ (fwd) laeuft nach vorn (-z)', () => {
  const r = step(S(), keys('fwd'), dt);
  assert.ok(r.z < -1e-6, `z muss sinken (vorwaerts): ${r.z}`);
});
check('S/↓ (back) laeuft nach hinten (+z) – NICHT nach vorn', () => {
  const r = step(S(), keys('back'), dt);
  assert.ok(r.z > 1e-6, `z muss STEIGEN (rueckwaerts): ${r.z}`);
});

// --- Drehen per Taste ---
check('D/→ (right) dreht nach rechts (+x)', () => {
  const r = step(S(), keys('right'), dt);
  const f = forward(r.yaw);
  assert.ok(f.x > 1e-6, `forward.x muss positiv sein (rechts): ${f.x}`);
});
check('A/← (left) dreht nach links (-x)', () => {
  const r = step(S(), keys('left'), dt);
  const f = forward(r.yaw);
  assert.ok(f.x < -1e-6, `forward.x muss negativ sein (links): ${f.x}`);
});

// --- Nach rechts drehen und vorlaufen bewegt nach +x ---
check('rechts gedreht + vorwaerts -> bewegt sich nach rechts (+x)', () => {
  let s = step(S(), keys('right'), 0.5);  // ordentlich nach rechts drehen
  const x0 = s.x;
  s = step(s, keys('fwd'), dt);
  assert.ok(s.x > x0 + 1e-6, `x muss steigen: ${x0} -> ${s.x}`);
});

// --- Shift beschleunigt ---
check('Shift laeuft schneller als normal', () => {
  const slow = step(S(), keys('fwd'), dt).z;
  const fast = step(S(), keys('fwd', 'shift'), dt).z;
  assert.ok(Math.abs(fast) > Math.abs(slow) + 1e-6, `schnell ${fast} vs langsam ${slow}`);
  assert.ok(Math.abs(Math.abs(fast) / Math.abs(slow) - CFG.runMult) < 1e-6, 'Faktor = runMult');
});

// --- Nichts gedrueckt = keine Bewegung ---
check('ohne Taste keine Bewegung/Drehung', () => {
  const r = step(S({ yaw: 0.3 }), keys(), dt);
  assert.deepEqual([r.x, r.z, r.yaw], [0, 0, 0.3]);
});

console.log(`\nAlle ${passed} Steuerungstests gruen.`);
