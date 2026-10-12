// ============================================================================
//  First-Person-Steuerung mit zwei Ebenen (Saal + Empore).
//  Ziehen = umsehen, Tasten = gehen/drehen, Klick auf Boden/Treppe/Empore/
//  Durchgang/Werk. Kollision mit Wänden, Durchgänge und Empore begehbar.
// ============================================================================
import * as THREE from 'three';
import { applyLook, step, forward, CFG } from './controls-core.js';
import { ROOMS, DOORWAYS, EMPORE } from './layout.js';

const EYE = 1.6;
const MARGIN = 0.4;
const SHOULDER = 0.35;

export class Controls {
  constructor(camera, dom, gallery, ui) {
    this.cam = camera; this.dom = dom; this.g = gallery; this.ui = ui;
    const e = gallery.entries[1];
    this.state = { yaw: 0, pitch: 0, x: e.x, z: e.z };
    this.level = 0;
    this.keys = new Set();
    this.mode = 'free';
    this.focus = null; this.anim = null; this.walk = null;
    this.ray = new THREE.Raycaster(); this.ndc = new THREE.Vector2();
    this.groundFloors = gallery.floors.filter(f => f.userData.floor);
    this._bind();
    this.apply();
  }

  eyeY() { return this.level === 1 ? EMPORE.eye : EYE; }

  allowed(x, z, level = this.level) {
    if (level === 1) {
      return x > EMPORE.xL + MARGIN && x < EMPORE.xR - MARGIN && z > EMPORE.zFront + MARGIN && z < EMPORE.zBack - MARGIN;
    }
    for (const id in ROOMS) {
      const r = ROOMS[id];
      if (x > r.xL + MARGIN && x < r.xR - MARGIN && z > r.zF + MARGIN && z < r.zN - MARGIN) return true;
    }
    for (const d of DOORWAYS) {
      const hw = d.width / 2 - SHOULDER;
      if (x > d.xCenter - hw && x < d.xCenter + hw && z > d.z - 0.7 && z < d.z + 0.7) return true;
    }
    return false;
  }
  clampTo(level, x, z) {
    if (level === 1) return { x: Math.min(EMPORE.xR - MARGIN, Math.max(EMPORE.xL + MARGIN, x)), z: Math.min(EMPORE.zBack - MARGIN, Math.max(EMPORE.zFront + MARGIN, z)) };
    return { x, z };
  }
  tryMove(nx, nz) {
    const s = this.state;
    if (this.allowed(nx, nz)) { s.x = nx; s.z = nz; return; }
    if (this.allowed(nx, s.z)) { s.x = nx; return; }
    if (this.allowed(s.x, nz)) { s.z = nz; return; }
  }
  roomOf(x, z) {
    if (this.level === 1) return 'empore';
    for (const id in ROOMS) { const r = ROOMS[id]; if (x > r.xL && x < r.xR && z > r.zF && z < r.zN) return +id; }
    return 0;
  }

  _bind() {
    const el = this.dom;
    let dragging = false, lx = 0, ly = 0, moved = 0;
    el.addEventListener('pointerdown', e => { if (this.mode !== 'free') return; dragging = true; moved = 0; lx = e.clientX; ly = e.clientY; el.setPointerCapture(e.pointerId); });
    el.addEventListener('pointermove', e => {
      if (!dragging) return;
      const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
      const r = applyLook(this.state, dx, dy); this.state.yaw = r.yaw; this.state.pitch = r.pitch;
    });
    el.addEventListener('pointerup', e => {
      if (!dragging) return; dragging = false;
      try { el.releasePointerCapture(e.pointerId); } catch (_) {}
      if (moved < 9) { this._setNdc(e); this._click(); }
    });
    const map = { arrowup: 'fwd', w: 'fwd', arrowdown: 'back', s: 'back', arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right', shift: 'shift' };
    addEventListener('keydown', e => { if (this.mode !== 'free') return; const k = e.key.toLowerCase(); if (!(k in map)) return; if (k.startsWith('arrow')) e.preventDefault(); this.keys.add(map[k]); this.walk = null; });
    addEventListener('keyup', e => { const k = e.key.toLowerCase(); if (k in map) this.keys.delete(map[k]); });
  }
  _setNdc(e) {
    const r = this.dom.getBoundingClientRect();
    this.ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    this.ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
  }
  _click() {
    this.ray.setFromCamera(this.ndc, this.cam);
    const w = this.ray.intersectObjects(this.g.worksMeshes, false);
    if (w.length) { this._focusWork(w[0].object); return; }
    const up = this.ray.intersectObjects([this.g.stairTarget, this.g.emporeFloor].filter(Boolean), false);
    const dr = this.ray.intersectObjects(this.g.doorTriggers, false);
    const fl = this.ray.intersectObjects(this.groundFloors, false);
    // nächstliegendes relevantes Ziel wählen
    const cands = [];
    if (up.length) cands.push({ d: up[0].distance, kind: 'up', p: up[0].point });
    if (dr.length) cands.push({ d: dr[0].distance, kind: 'door', o: dr[0].object });
    if (fl.length) cands.push({ d: fl[0].distance, kind: 'ground', p: fl[0].point });
    if (!cands.length) return;
    cands.sort((a, b) => a.d - b.d);
    const c = cands[0];
    if (c.kind === 'up') this._changeLevel(1, c.p);
    else if (c.kind === 'door') {
      const cur = this.roomOf(this.state.x, this.state.z);
      const to = c.o.userData.between.find(n => n !== cur) ?? c.o.userData.between[0];
      const e = this.g.entries[to]; this.walk = { x: e.x, z: e.z };
    } else { // ground
      if (this.level === 1) this._changeLevel(0, c.p);
      else this.walk = { x: c.p.x, z: c.p.z };
    }
  }
  _changeLevel(level, p) {
    const t = this.clampTo(level, p ? p.x : this.g.entries.empore.x, p ? p.z : this.g.entries.empore.z);
    this.level = level; this.focus = null; this.walk = null;
    this.anim = {
      from: this.cam.position.clone(), to: new THREE.Vector3(t.x, level === 1 ? EMPORE.eye : EYE, t.z),
      look: null, keepYaw: true, t: 0, dur: 0.7,
      onDone: () => { this.state.x = t.x; this.state.z = t.z; this.mode = 'free'; this.apply(); },
    };
    this.mode = 'toLevel';
  }

  goToRoom(n) {
    const e = this.g.entries[n]; if (!e) return;
    this.focus = null; this.ui.closePanel();
    this.level = e.level ?? 0;
    this.anim = { from: this.cam.position.clone(), to: new THREE.Vector3(e.x, this.eyeY(), e.z), look: null, toYaw: e.yaw ?? 0, t: 0, dur: 0.6,
      onDone: () => { this.state.x = e.x; this.state.z = e.z; this.state.yaw = e.yaw ?? 0; this.state.pitch = 0; this.mode = 'free'; this.apply(); } };
    this.mode = 'toLevel';
  }

  _focusWork(mesh) {
    const wk = mesh.userData.work, c = mesh.userData.center, n = mesh.userData.normal;
    const pw = wk.b / 1000, ph = wk.h / 1000;
    const dist = Math.min(3.6, Math.max(0.95, Math.max(pw, ph) * 1.5 + 0.5));
    const to = c.clone().addScaledVector(n, dist); to.y = Math.min(Math.max(c.y, 1.3), 5.2);
    this.focus = mesh; this.walk = null;
    this.anim = { from: this.cam.position.clone(), to, look: c.clone(), t: 0, dur: 0.75, onDone: () => { this.mode = 'atWork'; this.ui.openPanel(wk); } };
    this.mode = 'toWork';
    if (history.replaceState) history.replaceState(null, '', '?werk=' + wk.nr);
  }
  backToRoom() {
    if (!this.focus) return;
    const n = this.focus.userData.normal;
    const back = this.cam.position.clone().addScaledVector(n, 1.4); back.y = this.eyeY();
    this.anim = { from: this.cam.position.clone(), to: back, look: this.focus.userData.center.clone(), t: 0, dur: 0.55,
      onDone: () => { const e = new THREE.Euler().setFromQuaternion(this.cam.quaternion, 'YXZ'); this.state.yaw = e.y; this.state.pitch = Math.max(-CFG.maxPitch, Math.min(CFG.maxPitch, e.x)); this.state.x = this.cam.position.x; this.state.z = this.cam.position.z; this.focus = null; this.mode = 'free'; } };
    this.ui.closePanel();
    if (history.replaceState) history.replaceState(null, '', location.pathname);
    this.mode = 'toLevel2';
  }

  // direkt vor ein Werk springen (für ?werk=NR beim Laden)
  jumpToWork(nr) {
    const mesh = this.g.worksMeshes.find(m => m.userData.work.nr === nr);
    if (!mesh) return false;
    this.level = (mesh.userData.work.level === 'empore') ? 1 : 0;
    const c = mesh.userData.center, n = mesh.userData.normal;
    const wk = mesh.userData.work, pw = wk.b / 1000, ph = wk.h / 1000;
    const dist = Math.min(3.6, Math.max(0.95, Math.max(pw, ph) * 1.5 + 0.5));
    const to = c.clone().addScaledVector(n, dist); to.y = Math.min(Math.max(c.y, 1.3), 5.2);
    this.cam.position.copy(to); this.cam.lookAt(c);
    this.focus = mesh; this.mode = 'atWork'; this.ui.openPanel(wk);
    return true;
  }

  apply() {
    this.cam.position.set(this.state.x, this.eyeY(), this.state.z);
    this.cam.rotation.set(this.state.pitch, this.state.yaw, 0, 'YXZ');
  }

  update(dt) {
    if (this.mode === 'free') {
      const prev = { ...this.state };
      const r = step(this.state, this.keys, dt);
      this.state.yaw = r.yaw; this.state.pitch = r.pitch;
      this.state.x = prev.x; this.state.z = prev.z;
      if (r.x !== prev.x || r.z !== prev.z) this.tryMove(r.x, r.z);
      if (this.walk) {
        const dx = this.walk.x - this.state.x, dz = this.walk.z - this.state.z, d = Math.hypot(dx, dz);
        if (d < 0.06) this.walk = null;
        else { const sp = Math.min(CFG.moveSpeed * dt, d); this.tryMove(this.state.x + dx / d * sp, this.state.z + dz / d * sp); }
      }
      this.apply();
      this.ui.setRoom(this.roomOf(this.state.x, this.state.z));
    } else if (this.mode === 'atWork') {
      this.cam.lookAt(this.focus.userData.center);
    } else if (this.anim) {
      const a = this.anim; a.t += dt / a.dur;
      const k = a.t >= 1 ? 1 : 1 - Math.pow(1 - a.t, 3);
      this.cam.position.lerpVectors(a.from, a.to, k);
      if (a.look) this.cam.lookAt(a.look);
      else if (a.toYaw != null) this.cam.rotation.set(0, a.toYaw, 0, 'YXZ');
      // keepYaw: Blickrichtung beibehalten (Ebenenwechsel)
      if (a.t >= 1) { const done = a.onDone; this.anim = null; if (done) done(); }
    }
  }
}
