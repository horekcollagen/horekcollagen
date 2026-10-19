// ============================================================================
//  First-Person-Steuerung (Kirche): Ziehen = umsehen, Tasten = gehen/drehen,
//  Klick auf Boden/Treppe/Empore/Werk. Zwei Ebenen (Schiff + Emporen).
// ============================================================================
import * as THREE from 'three';
import { applyLook, step, CFG } from './controls-core.js';
import { GROUND, UPPER, STATIONS, EMP } from './layout.js';

const EYE = 1.6;
const MARGIN = 0.0;   // GROUND/UPPER sind bereits eingerückt

export class Controls {
  constructor(camera, dom, gallery, ui) {
    this.cam = camera; this.dom = dom; this.g = gallery; this.ui = ui;
    const s0 = STATIONS[0];
    this.state = { yaw: s0.yaw, pitch: 0, x: s0.x, z: s0.z };
    this.level = s0.level; this.stationIdx = 0;
    this.keys = new Set(); this.mode = 'free';
    this.focus = null; this.anim = null; this.walk = null;
    this.ray = new THREE.Raycaster(); this.ndc = new THREE.Vector2();
    this.groundFloors = (gallery.floors || []).filter(f => f.userData.floor);
    this.upperFloors = gallery.upperFloors || [];
    this.emporeTargets = gallery.emporeTargets || this.upperFloors;   // von unten anklickbar -> hoch
    // Landering: heller Ring auf dem Boden, wo der Klick landet (auch auf der anderen Ebene)
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.33, 0.52, 40),
      new THREE.MeshBasicMaterial({ color: 0xfff2d8, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }));
    this.ring.rotation.x = -Math.PI / 2; this.ring.renderOrder = 6; this.ring.visible = false; gallery.scene.add(this.ring);
    this._bind(); this.apply();
  }
  eyeY() { return this.level === 1 ? EMP.eye : EYE; }

  inRects(rects, x, z) { for (const r of rects) if (x > r.xL + MARGIN && x < r.xR - MARGIN && z > r.zF + MARGIN && z < r.zN - MARGIN) return true; return false; }
  allowed(x, z, level = this.level) { return this.inRects(level === 1 ? UPPER : GROUND, x, z); }
  clampToRegion(rects, x, z) {
    let best = null, bd = Infinity;
    for (const r of rects) { const cx = Math.min(r.xR - 0.4, Math.max(r.xL + 0.4, x)), cz = Math.min(r.zN - 0.4, Math.max(r.zF + 0.4, z)); const d = (cx - x) ** 2 + (cz - z) ** 2; if (d < bd) { bd = d; best = { x: cx, z: cz }; } }
    return best || { x, z };
  }
  tryMove(nx, nz) { const s = this.state; if (this.allowed(nx, nz)) { s.x = nx; s.z = nz; } else if (this.allowed(nx, s.z)) s.x = nx; else if (this.allowed(s.x, nz)) s.z = nz; }

  _bind() {
    const el = this.dom; let dragging = false, lx = 0, ly = 0, moved = 0;
    el.addEventListener('pointerdown', e => {
      if (this.mode === 'atWork') { if (e.pointerType === 'touch') { this._lensDown = true; this._lensMove(e); } return; }
      if (this.mode !== 'free') return; dragging = true; moved = 0; lx = e.clientX; ly = e.clientY; this._hideRing(); el.setPointerCapture(e.pointerId);
    });
    el.addEventListener('pointermove', e => {
      if (this.mode === 'atWork') { this._lensMove(e); return; }   // Hover-Lupe über dem Werk
      if (dragging) { const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY; moved += Math.abs(dx) + Math.abs(dy); const r = applyLook(this.state, dx, dy); this.state.yaw = r.yaw; this.state.pitch = r.pitch; return; }
      if (this.mode === 'free' && e.pointerType !== 'touch') this._hover(e);   // Landering beim Überfahren (Maus)
    });
    el.addEventListener('pointerleave', () => { this._hideRing(); this.ui.hideLens(); });
    el.addEventListener('pointerup', e => {
      if (this.mode === 'atWork') { if (e.pointerType === 'touch') { this._lensDown = false; this.ui.hideLens(); } return; }
      if (!dragging) return; dragging = false; try { el.releasePointerCapture(e.pointerId); } catch (_) {} if (moved < 9) { this._setNdc(e); this._click(); } this._hideRing();
    });
    el.addEventListener('pointercancel', () => { if (this.mode === 'atWork') { this._lensDown = false; this.ui.hideLens(); } });
    const map = { arrowup: 'fwd', w: 'fwd', arrowdown: 'back', s: 'back', arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right', shift: 'shift' };
    addEventListener('keydown', e => { if (this.mode !== 'free') return; const k = e.key.toLowerCase(); if (!(k in map)) return; if (k.startsWith('arrow')) e.preventDefault(); this.keys.add(map[k]); this.walk = null; });
    addEventListener('keyup', e => { const k = e.key.toLowerCase(); if (k in map) this.keys.delete(map[k]); });
  }
  _setNdc(e) { const r = this.dom.getBoundingClientRect(); this.ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1; this.ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1; }
  // Einheitliche Auflösung: was passiert beim Klick/Hover an dieser Bildschirmstelle?
  _landingFor(ndc) {
    this.ray.setFromCamera(ndc, this.cam);
    const works = this.ray.intersectObjects(this.g.worksMeshes, false);
    const up = this.ray.intersectObjects([this.g.stairTarget, ...this.emporeTargets].filter(Boolean), false);
    const ground = this.ray.intersectObjects(this.groundFloors, false);
    const cands = [];
    if (works.length) cands.push({ d: works[0].distance, kind: 'work', obj: works[0].object });
    if (up.length && this.level !== 1) cands.push({ d: up[0].distance, kind: 'up', p: up[0].point });  // 'hoch' nur von unten
    if (ground.length) cands.push({ d: ground[0].distance, kind: 'ground', p: ground[0].point });
    if (!cands.length) return null;
    cands.sort((a, b) => a.d - b.d);
    const t = cands[0];
    if (t.kind === 'work') { const w = t.obj.userData.work; const lvl = w.level === 'empore' ? 1 : 0; const s = this._workLanding(t.obj); return { kind: 'work', obj: t.obj, level: lvl, x: s.x, z: s.z }; }
    if (t.kind === 'up') { const s = this.clampToRegion(UPPER, t.p.x, t.p.z); return { kind: 'up', level: 1, x: s.x, z: s.z }; }
    if (this.level === 1) { const s = this.clampToRegion(GROUND, t.p.x, t.p.z); return { kind: 'down', level: 0, x: s.x, z: s.z }; }
    return { kind: 'walk', level: 0, x: t.p.x, z: t.p.z };
  }
  _workLanding(mesh) {
    const c = mesh.userData.center, n = mesh.userData.normal, lvl = mesh.userData.work.level === 'empore' ? 1 : 0;
    return this.clampToRegion(lvl === 1 ? UPPER : GROUND, c.x + n.x * 1.4, c.z + n.z * 1.4);
  }
  // Hover-Lupe: Werk unter dem Zeiger abtasten (UV) und die Lupe an der UI anstoßen.
  _lensMove(e) {
    if (this.mode !== 'atWork' || !this.focus) return;
    const touch = e.pointerType === 'touch';
    if (touch && !this._lensDown) return;            // Handy: nur mit aufgelegtem Finger
    this._setNdc(e);
    this.ray.setFromCamera(this.ndc, this.cam);
    const hit = this.ray.intersectObject(this.focus, false)[0];
    if (!hit || !hit.uv) { this.ui.hideLens(); return; }
    this.ui.lens(e.clientX, e.clientY, hit.uv.x, hit.uv.y, this._workScreenWidth(), touch);
  }
  _workScreenWidth() {   // Breite des Werks auf dem Bildschirm in Pixeln (für den Lupenmaßstab)
    const m = this.focus, c = m.userData.center, n = m.userData.normal, pw = m.userData.work.b / 1000;
    const right = new THREE.Vector3(n.z, 0, -n.x).multiplyScalar(pw / 2);
    const a = c.clone().add(right).project(this.cam), b = c.clone().sub(right).project(this.cam);
    return Math.max(40, Math.abs(a.x - b.x) * this.dom.getBoundingClientRect().width / 2);
  }
  _showRing(x, z, level) { this.ring.position.set(x, (level === 1 ? EMP.y : 0) + 0.03, z); this.ring.visible = true; }
  _hideRing() { if (this.ring) this.ring.visible = false; }
  _hover(e) { this._setNdc(e); const L = this._landingFor(this.ndc); if (L && L.kind !== 'walk') this._showRing(L.x, L.z, L.level); else this._hideRing(); }
  _click() {
    const L = this._landingFor(this.ndc); this._hideRing();
    if (!L) return;
    if (L.kind === 'work') this._focusWork(L.obj);
    else if (L.kind === 'up' || L.kind === 'down') this._changeLevel(L.level, { x: L.x, z: L.z });
    else this.walk = { x: L.x, z: L.z };
  }
  _changeLevel(level, p) {
    const t = this.clampToRegion(level === 1 ? UPPER : GROUND, p.x, p.z);
    this.level = level; this.focus = null; this.walk = null;
    this.anim = { from: this.cam.position.clone(), to: new THREE.Vector3(t.x, level === 1 ? EMP.eye : EYE, t.z), look: null, t: 0, dur: 0.7, onDone: () => { this.state.x = t.x; this.state.z = t.z; this.mode = 'free'; this.apply(); } };
    this.mode = 'move';
  }
  goToStation(key) {
    const i = STATIONS.findIndex(s => s.key === key); if (i < 0) return; this.stationIdx = i; const s = STATIONS[i];
    this.focus = null; this.ui.closePanel(); this.level = s.level;
    this.anim = { from: this.cam.position.clone(), to: new THREE.Vector3(s.x, this.eyeY(), s.z), toYaw: s.yaw, t: 0, dur: 0.6, onDone: () => { this.state.x = s.x; this.state.z = s.z; this.state.yaw = s.yaw; this.state.pitch = 0; this.mode = 'free'; this.apply(); } };
    this.mode = 'move';
  }
  nextStation() { this.goToStation(STATIONS[(this.stationIdx + 1) % STATIONS.length].key); }
  stationOf(x, z, level) { // für Raumleiste-Hervorhebung
    if (level === 1) { if (z < 26.4) return 'seitenemporen'; return 'westempore'; }
    if (z < 6.9) return 'apsis'; if (z < 12) return 'bildwand'; if (z > 31) return 'vorhalle';
    if ((x < 4.6 || x > 15.4) && z > 13 && z < 19) return 'kapellen'; return 'schiff';
  }

  _focusWork(mesh) {
    const wk = mesh.userData.work, c = mesh.userData.center, n = mesh.userData.normal;
    this.level = wk.level === 'empore' ? 1 : 0;   // Klick auf Emporenwerk von unten -> hoch
    const pw = wk.b / 1000, ph = wk.h / 1000;
    const dist = Math.min(3.6, Math.max(0.9, Math.max(pw, ph) * 1.5 + 0.5));
    const to = c.clone().addScaledVector(n, dist); to.y = Math.min(Math.max(c.y, 1.3), EMP.eye + 0.5);
    this.focus = mesh; this.walk = null;
    this.anim = { from: this.cam.position.clone(), to, look: c.clone(), t: 0, dur: 0.75, onDone: () => { this.mode = 'atWork'; this.ui.openPanel(wk); } };
    this.mode = 'move';
    if (history.replaceState) history.replaceState(null, '', '?werk=' + wk.nr);
  }
  backToRoom() {
    if (!this.focus) return; const n = this.focus.userData.normal;
    const back = this.cam.position.clone().addScaledVector(n, 1.4); back.y = this.eyeY();
    this.anim = { from: this.cam.position.clone(), to: back, look: this.focus.userData.center.clone(), t: 0, dur: 0.55, onDone: () => { const e = new THREE.Euler().setFromQuaternion(this.cam.quaternion, 'YXZ'); this.state.yaw = e.y; this.state.pitch = Math.max(-CFG.maxPitch, Math.min(CFG.maxPitch, e.x)); this.state.x = this.cam.position.x; this.state.z = this.cam.position.z; this.focus = null; this.mode = 'free'; } };
    this.ui.closePanel(); if (history.replaceState) history.replaceState(null, '', location.pathname); this.mode = 'move';
  }
  jumpToWork(nr) {
    const mesh = this.g.worksMeshes.find(m => m.userData.work.nr === nr); if (!mesh) return false;
    this.level = mesh.userData.work.level === 'empore' ? 1 : 0;
    const c = mesh.userData.center, n = mesh.userData.normal, wk = mesh.userData.work, pw = wk.b / 1000, ph = wk.h / 1000;
    const dist = Math.min(3.6, Math.max(0.9, Math.max(pw, ph) * 1.5 + 0.5));
    const to = c.clone().addScaledVector(n, dist); to.y = Math.min(Math.max(c.y, 1.3), EMP.eye + 0.5);
    this.cam.position.copy(to); this.cam.lookAt(c); this.focus = mesh; this.mode = 'atWork'; this.ui.openPanel(wk); return true;
  }

  apply() { this.cam.position.set(this.state.x, this.eyeY(), this.state.z); this.cam.rotation.set(this.state.pitch, this.state.yaw, 0, 'YXZ'); }
  update(dt) {
    if (this.mode === 'free') {
      const prev = { ...this.state }; const r = step(this.state, this.keys, dt); this.state.yaw = r.yaw; this.state.pitch = r.pitch;
      this.state.x = prev.x; this.state.z = prev.z; if (r.x !== prev.x || r.z !== prev.z) this.tryMove(r.x, r.z);
      if (this.walk) { const dx = this.walk.x - this.state.x, dz = this.walk.z - this.state.z, d = Math.hypot(dx, dz); if (d < 0.06) this.walk = null; else { const sp = Math.min(CFG.moveSpeed * dt, d); this.tryMove(this.state.x + dx / d * sp, this.state.z + dz / d * sp); } }
      this.apply(); this.ui.setRoom(this.stationOf(this.state.x, this.state.z, this.level));
    } else if (this.mode === 'atWork') { this.cam.lookAt(this.focus.userData.center); }
    else if (this.anim) { const a = this.anim; a.t += dt / a.dur; const k = a.t >= 1 ? 1 : 1 - Math.pow(1 - a.t, 3); this.cam.position.lerpVectors(a.from, a.to, k); if (a.look) this.cam.lookAt(a.look); else if (a.toYaw != null) this.cam.rotation.set(0, a.toYaw, 0, 'YXZ'); if (a.t >= 1) { const done = a.onDone; this.anim = null; if (done) done(); } }
  }
}
