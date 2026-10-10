// ============================================================================
//  Steuerungs-Mathematik (rein, ohne three.js/DOM) – damit testbar.
//  Konvention (three, rechtshändig, y oben, Rotationsreihenfolge YXZ):
//    yaw = 0  -> Blick nach -z,  forward = (0, -1) in der xz-Ebene
//    +yaw dreht nach LINKS, -yaw nach RECHTS
//    forward(yaw) = (-sin yaw, -cos yaw)   (identisch zu three camera -z-Achse)
//    right(yaw)   = ( cos yaw, -sin yaw)
// ============================================================================

export const CFG = {
  lookSens: 0.0026,   // rad pro Pixel (Ziehen)
  turnSpeed: 1.9,     // rad/s (Tasten drehen)
  moveSpeed: 2.7,     // m/s
  runMult: 2.2,       // Shift
  maxPitch: 0.85,     // rad (±~49°)
};

export function forward(yaw) {
  return { x: -Math.sin(yaw), z: -Math.cos(yaw) };
}
export function right(yaw) {
  return { x: Math.cos(yaw), z: -Math.sin(yaw) };
}
export function clampPitch(p, m = CFG.maxPitch) {
  return Math.max(-m, Math.min(m, p));
}

// Ziehen: dx>0 (nach rechts) -> nach rechts schauen (yaw sinkt).
//         dy<0 (nach oben)   -> nach oben schauen (pitch steigt).
export function applyLook(state, dx, dy, sens = CFG.lookSens) {
  return {
    ...state,
    yaw: state.yaw - dx * sens,
    pitch: clampPitch(state.pitch - dy * sens),
  };
}

// Ein Simulationsschritt. keys: Set aus 'fwd','back','left','right','shift'.
// Gibt neuen Zustand {yaw,pitch,x,z} zurück. Nur Bewegungsabsicht, ohne Kollision.
export function step(state, keys, dt) {
  let { yaw, pitch, x, z } = state;
  const turn = CFG.turnSpeed * dt;
  if (keys.has('left')) yaw += turn;    // links drehen
  if (keys.has('right')) yaw -= turn;   // rechts drehen
  const spd = CFG.moveSpeed * (keys.has('shift') ? CFG.runMult : 1) * dt;
  const f = forward(yaw);
  let mv = 0;
  if (keys.has('fwd')) mv += 1;
  if (keys.has('back')) mv -= 1;
  x += f.x * spd * mv;
  z += f.z * spd * mv;
  return { yaw, pitch, x, z };
}
