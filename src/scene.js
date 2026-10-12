// ============================================================================
//  Szene: Räume, Materialien, Licht/IBL, Werke, Werkschilder, Möbel, Fenster.
//  Baut die komplette Galerie und gibt Metadaten für Steuerung/Fokus zurück.
// ============================================================================
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
RectAreaLightUniformsLib.init();
import { WORKS } from './works.js';
import { T, WALL_H, DOOR_H, ROOMS, WALLS, WINDOWWALLS, DOORWAYS, EMPORE, STAIRS } from './layout.js';
import { makeLabelMesh, makeTextPlane } from './labels.js';

const PANEL_D = 0.045;      // Tafeltiefe
const OFF = 0.02;           // 2 cm vor der Wand

// ---- kleine Hilfsmaterial-Fabriken -------------------------------------------
function softNoiseCanvas(base, blotch, size = 512) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, size, size);
  for (let i = 0; i < blotch; i++) {
    const x = Math.random() * size, y = Math.random() * size, r = 80 + Math.random() * 180;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    const a = 0.008 + Math.random() * 0.02;
    grad.addColorStop(0, `rgba(0,0,0,${a})`); grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad; g.fillRect(0, 0, size, size);
  }
  return c;
}
// sehr feiner vertikaler Helligkeitsverlauf für Wände (Lichtabfall, kein Rauschen)
function wallGradientCanvas() {
  const w = 8, h = 512, c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, h); // 0 = oben
  grad.addColorStop(0.00, '#eeeae3');  // oben leicht gedämpft
  grad.addColorStop(0.30, '#ffffff');  // Lichtzone
  grad.addColorStop(0.62, '#fbf8f2');
  grad.addColorStop(1.00, '#e7e3db');  // unten (Boden) gedämpft
  g.fillStyle = grad; g.fillRect(0, 0, w, h);
  return c;
}
function canvasTex(canvas, rx, ry, aniso, srgb = true) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  return t;
}
// weicher Schlagschatten-Alpha (dunkler, verlaufender Fleck)
function shadowTex() {
  const s = 128, c = document.createElement('canvas'); c.width = c.height = s;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(s / 2, s / 2, s * 0.12, s / 2, s / 2, s * 0.5);
  grad.addColorStop(0, 'rgba(0,0,0,0.42)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad; g.fillRect(0, 0, s, s);
  const t = new THREE.CanvasTexture(c); return t;
}

export function buildGallery(renderer, quality) {
  const aniso = renderer.capabilities.getMaxAnisotropy();
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d0c0b);

  // ---- Umgebungslicht (IBL) aus RoomEnvironment: weiche, realistische Grundhelligkeit
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;

  // Grundlicht: hell, aber mit Raum für Akzente (Pools, Ecken-AO)
  scene.add(new THREE.HemisphereLight(0xfbf7ef, 0xdad6cd, 0.4));
  const fill = new THREE.AmbientLight(0xffffff, 0.1); scene.add(fill);

  // ---------------- Materialien ----------------
  const wallGrad = new THREE.CanvasTexture(wallGradientCanvas());
  wallGrad.colorSpace = THREE.SRGBColorSpace; wallGrad.wrapS = wallGrad.wrapT = THREE.ClampToEdgeWrapping;
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf6f2eb, map: wallGrad, roughness: 0.95, metalness: 0, envMapIntensity: 0.6 });
  const ceilMat = new THREE.MeshStandardMaterial({ color: 0xecebe6, roughness: 0.96, metalness: 0, envMapIntensity: 0.5 });
  const floorCanvas = softNoiseCanvas('#bdbab4', 10);
  const floorMap = canvasTex(floorCanvas, 4, 4, aniso);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0xbfbcb6, map: floorMap, roughness: quality.floorRough, metalness: 0.0, envMapIntensity: 1.0,
  });
  const edgeMat = new THREE.MeshStandardMaterial({ color: 0x141210, roughness: 0.5, metalness: 0.0 });
  const trackMat = new THREE.MeshStandardMaterial({ color: 0x1c1b19, roughness: 0.5, metalness: 0.6 });
  const fixtureMat = new THREE.MeshStandardMaterial({ color: 0x222120, roughness: 0.45, metalness: 0.7 });
  const benchMat = new THREE.MeshStandardMaterial({ color: 0x8c8880, roughness: 0.85, metalness: 0.0 });
  const sTex = shadowTex();

  const root = new THREE.Group(); scene.add(root);

  // ---------------- Wände ----------------
  function wallBox(axis, at, from, to, y0, y1) {
    const len = to - from;
    let geo, pos;
    if (axis === 'x') { geo = new THREE.BoxGeometry(len, y1 - y0, T); pos = [(from + to) / 2, (y0 + y1) / 2, at]; }
    else { geo = new THREE.BoxGeometry(T, y1 - y0, len); pos = [at, (y0 + y1) / 2, (from + to) / 2]; }
    const m = new THREE.Mesh(geo, wallMat); m.position.set(...pos);
    m.castShadow = false; m.receiveShadow = true; root.add(m); return m;
  }
  for (const w of WALLS) {
    if (!w.door) { wallBox(w.axis, w.at, w.from, w.to, 0, WALL_H); continue; }
    const dL = w.door.center - w.door.width / 2, dR = w.door.center + w.door.width / 2;
    wallBox(w.axis, w.at, w.from, dL, 0, WALL_H);          // Segment 1
    wallBox(w.axis, w.at, dR, w.to, 0, WALL_H);            // Segment 2
    wallBox(w.axis, w.at, dL, dR, DOOR_H, WALL_H);         // Sturz
  }

  // ---------------- Fensterwände (alle Räume) + Tageslicht ----------------
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xcfe0ea, roughness: 0.1, metalness: 0, transparent: true, opacity: 0.16 });
  const skyMat = new THREE.MeshBasicMaterial({ color: 0xf5f3ec });
  for (const ww of WINDOWWALLS) buildWindowWall(root, scene, ww, wallMat, edgeMat, glassMat, skyMat);

  // ---------------- Böden & Decken je Raum ----------------
  const floors = [];
  for (const id in ROOMS) {
    const r = ROOMS[id];
    const w = r.xR - r.xL, d = r.zN - r.zF;
    const cx = (r.xL + r.xR) / 2, cz = (r.zN + r.zF) / 2;
    const fl = new THREE.Mesh(new THREE.BoxGeometry(w + T, 0.1, d + T), floorMat);
    fl.position.set(cx, -0.05, cz); fl.receiveShadow = true; fl.userData = { floor: true, room: +id }; root.add(fl); floors.push(fl);
    const ce = new THREE.Mesh(new THREE.BoxGeometry(w + T, 0.08, d + T), ceilMat);
    ce.position.set(cx, r.H, cz); root.add(ce);
    // Stromschiene + Strahler-Gehäuse quer über den Raum
    addTrack(root, trackMat, fixtureMat, cx, cz, r);
  }

  // ---------------- Empore (Balkon) + Treppe im Saal ----------------
  const emporeMat = new THREE.MeshStandardMaterial({ color: 0xb6b3ad, roughness: 0.6, metalness: 0, envMapIntensity: 0.6 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x23211e, roughness: 0.45, metalness: 0.7 });
  const E = EMPORE;
  const eW = E.xR - E.xL, eD = E.zBack - E.zFront, eCx = (E.xL + E.xR) / 2, eCz = (E.zFront + E.zBack) / 2;
  // Plattform
  const plat = new THREE.Mesh(new THREE.BoxGeometry(eW, E.thickness, eD), emporeMat);
  plat.position.set(eCx, E.y - E.thickness / 2, eCz); plat.receiveShadow = true; plat.castShadow = true; root.add(plat);
  // Emporenboden (Klickziel oben)
  const emporeFloor = new THREE.Mesh(new THREE.BoxGeometry(eW - 0.04, 0.02, eD - 0.04),
    new THREE.MeshStandardMaterial({ color: 0xbbb8b2, roughness: 0.55, metalness: 0 }));
  emporeFloor.position.set(eCx, E.y + 0.01, eCz); emporeFloor.userData = { empore: true }; root.add(emporeFloor); floors.push(emporeFloor);
  // Geländer entlang der offenen Kante (z = zFront)
  const railY = E.y + 0.55;
  const topRail = new THREE.Mesh(new THREE.BoxGeometry(eW, 0.05, 0.05), steelMat);
  topRail.position.set(eCx, railY + 0.5, E.zFront); root.add(topRail);
  const midRail = new THREE.Mesh(new THREE.BoxGeometry(eW, 0.03, 0.03), steelMat);
  midRail.position.set(eCx, railY + 0.22, E.zFront); root.add(midRail);
  for (let x = E.xL + 0.2; x <= E.xR - 0.2; x += 0.9) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.05, 0.04), steelMat);
    post.position.set(x, E.y + 0.52, E.zFront); root.add(post);
  }
  // Treppe (steile Loft-Treppe an der rechten Wand)
  const st = STAIRS, n = st.steps;
  const stepW = st.xR - st.xL, run = (st.zTop - st.zBottom), rise = st.yTop;
  for (let i = 0; i < n; i++) {
    const h = (rise / n) * (i + 1);
    const z = st.zBottom + (run / n) * (i + 0.5);
    const step = new THREE.Mesh(new THREE.BoxGeometry(stepW, 0.06, run / n + 0.02), steelMat);
    step.position.set((st.xL + st.xR) / 2, h - 0.03, z); step.castShadow = true; step.receiveShadow = true; root.add(step);
    // Wange darunter
    const riser = new THREE.Mesh(new THREE.BoxGeometry(stepW, (rise / n), run / n),
      new THREE.MeshStandardMaterial({ color: 0x2b2926, roughness: 0.6, metalness: 0.3 }));
    riser.position.set((st.xL + st.xR) / 2, h - (rise / n) / 2, z); root.add(riser);
  }
  // Handlauf
  const hr = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, Math.hypot(run, rise)), steelMat);
  hr.position.set(st.xL + 0.08, rise / 2 + 0.95, (st.zBottom + st.zTop) / 2);
  hr.rotation.x = Math.atan2(rise, run); root.add(hr);
  // Klickziel Treppe (unsichtbar)
  const stairTarget = new THREE.Mesh(new THREE.BoxGeometry(stepW, rise, Math.hypot(run, rise)),
    new THREE.MeshBasicMaterial({ visible: false }));
  stairTarget.position.set((st.xL + st.xR) / 2, rise / 2, (st.zBottom + st.zTop) / 2);
  stairTarget.rotation.x = Math.atan2(rise, run); stairTarget.userData = { stairs: true }; root.add(stairTarget);

  // ---------------- Polierter Betonboden mit weicher Spiegelung ----------------
  if (quality.reflectiveFloor) {
    const fx0 = -4.6, fx1 = 4.6, fz0 = -8.1, fz1 = 12.35;
    const W = fx1 - fx0, D = fz1 - fz0, cx = (fx0 + fx1) / 2, cz = (fz0 + fz1) / 2;
    const refl = new Reflector(new THREE.PlaneGeometry(W, D), {
      clipBias: 0.003, textureWidth: 1024, textureHeight: 1024, color: 0x5f5e59,
    });
    refl.rotation.x = -Math.PI / 2; refl.position.set(cx, 0.004, cz); root.add(refl);
    // halbtransparenter Beton darüber -> dämpft die Spiegelung zu matt-„poliert"
    const overlay = new THREE.Mesh(
      new THREE.PlaneGeometry(W, D),
      new THREE.MeshStandardMaterial({ color: 0xbfbcb6, map: floorMap, roughness: 0.38, metalness: 0, transparent: true, opacity: 0.76, envMapIntensity: 0.7 })
    );
    overlay.rotation.x = -Math.PI / 2; overlay.position.set(cx, 0.007, cz); overlay.receiveShadow = true; root.add(overlay);
  }

  // ---------------- Werke ----------------
  const worksMeshes = [];
  const loadMgr = new THREE.LoadingManager();
  const texLoader = new THREE.TextureLoader(loadMgr);
  const raycastTargets = [];

  for (const wk of WORKS) {
    const r = ROOMS[wk.room];
    const { pos, normal, rotY } = wallAnchor(r, wk);
    const pw = wk.b / 1000, ph = wk.h / 1000;
    const cy = wk.cy ?? 1.5;

    // Tafel
    const tex = texLoader.load(import.meta.env.BASE_URL + 'works/' + wk.slug + '.webp', tx => {
      tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = aniso; tx.generateMipmaps = true;
      tx.minFilter = THREE.LinearMipmapLinearFilter;
    });
    const face = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.62, metalness: 0.0, envMapIntensity: 0.35 });
    const mats = [edgeMat, edgeMat, edgeMat, edgeMat, face, edgeMat];
    const panel = new THREE.Mesh(new THREE.BoxGeometry(pw, ph, PANEL_D), mats);
    panel.position.copy(pos); panel.position.y = cy; panel.rotation.y = rotY;
    panel.castShadow = true; panel.receiveShadow = false;
    panel.userData = { work: wk, center: panel.position.clone(), normal: normal.clone() };
    root.add(panel); worksMeshes.push(panel); raycastTargets.push(panel);

    // weicher Schlagschatten an der Wand
    const sh = new THREE.Mesh(
      new THREE.PlaneGeometry(pw * 1.25, ph * 1.22),
      new THREE.MeshBasicMaterial({ map: sTex, transparent: true, depthWrite: false, opacity: 0.9 })
    );
    const shPos = pos.clone().addScaledVector(normal, -OFF * 0.4); shPos.y = cy - ph * 0.04;
    sh.position.copy(shPos); sh.rotation.y = rotY; root.add(sh);

    // Werkschild (1,40 m) neben dem Werk
    const sign = makeLabelMesh(wk);
    const sx = pos.clone();
    // nach „rechts" vom Werk entlang der Wand-Tangente
    const tangent = new THREE.Vector3(normal.z, 0, -normal.x); // 90° zu normal in xz
    sx.addScaledVector(tangent, pw / 2 + 0.16); sx.y = 1.40;
    sx.addScaledVector(normal, 0.001);
    sign.position.copy(sx); sign.rotation.y = rotY; root.add(sign);

    // gezielter Strahler auf das Werk
    addWorkSpot(scene, root, fixtureMat, pos, normal, r, Math.max(pw, ph), cy, quality);
  }

  // ---------------- Möbel: Bank im Saal ----------------
  const bench = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.42), benchMat);
  seat.position.y = 0.44; seat.castShadow = true; seat.receiveShadow = true; bench.add(seat);
  for (const dx of [-0.7, 0.7]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.44, 0.42), benchMat);
    leg.position.set(dx, 0.22, 0); leg.castShadow = true; bench.add(leg);
  }
  bench.position.set(-0.5, 0, -4.2); root.add(bench);

  // ---------------- Sonne (Schlagschatten im Saal) ----------------
  const sun = new THREE.DirectionalLight(0xeef2f6, 1.0);
  sun.position.set(-9, 7.5, -4.2); sun.target.position.set(-1, 1.2, -4.5);
  if (quality.shadows) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(quality.shadowMap, quality.shadowMap);
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 24;
    sun.shadow.camera.left = -8; sun.shadow.camera.right = 8;
    sun.shadow.camera.top = 8; sun.shadow.camera.bottom = -2;
    sun.shadow.bias = -0.0004; sun.shadow.radius = 4;
  }
  scene.add(sun); scene.add(sun.target);

  // ---------------- Beschriftung: Eingangstext + Raumnummern ----------------
  const entrance = makeTextPlane('HOREK – Collagen auf Holz. Berlin.', { size: 0.12, w: 2.4, color: '#1a1714', weight: 600 });
  entrance.position.set(0, 2.25, 12.25 - T / 2 - 0.01); entrance.rotation.y = Math.PI; root.add(entrance);
  addRoomNumber(root, '1', 0.0, 6.0 + 0.2, true);
  addRoomNumber(root, '2', 1.6, 0.0 + 0.2, true);
  addRoomNumber(root, '3', 1.6, 0.0 - 0.2, false);

  // ---------------- Durchgangs-Trigger (unsichtbar, zum Klicken) ----------------
  const doorTriggers = [];
  for (const d of DOORWAYS) {
    const trg = new THREE.Mesh(
      new THREE.PlaneGeometry(d.width, DOOR_H),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    trg.position.set(d.xCenter, DOOR_H / 2, d.z); // Wand entlang x -> Plane schaut nach ±z (default +z ok)
    trg.userData = { door: true, between: d.between };
    root.add(trg); doorTriggers.push(trg);
  }

  // Raum-Startpunkte (zum Springen und Durchgehen) · level 0 = unten, 1 = Empore
  const entries = {
    1: { x: 0.0, z: 10.6, yaw: 0, level: 0 },
    2: { x: 0.0, z: 4.6, yaw: 0, level: 0 },
    3: { x: 0.8, z: -3.2, yaw: 0, level: 0 },
    empore: { x: 0.0, z: -1.2, yaw: 0, level: 1 },
  };

  return { scene, envTex, pmrem, worksMeshes, raycastTargets, loadMgr, floorMat, sun, floors, doorTriggers, entries, emporeFloor, stairTarget };
}

// ---- Wand-Anker für ein Werk (Position, Normale, Rotation) -------------------
function wallAnchor(r, wk) {
  const xc = (r.xL + r.xR) / 2, zc = (r.zN + r.zF) / 2;
  const t = T / 2 + OFF;
  switch (wk.wall) {
    case 'links':  return { pos: new THREE.Vector3(r.xL + t, 1.5, zc + wk.along), normal: new THREE.Vector3(1, 0, 0),  rotY: Math.PI / 2 };
    case 'rechts': return { pos: new THREE.Vector3(r.xR - t, 1.5, zc + wk.along), normal: new THREE.Vector3(-1, 0, 0), rotY: -Math.PI / 2 };
    case 'stirn':  return { pos: new THREE.Vector3(xc + wk.along, 1.5, r.zF + t), normal: new THREE.Vector3(0, 0, 1),  rotY: 0 };
    case 'rueck':  return { pos: new THREE.Vector3(xc + wk.along, 1.5, r.zN - t), normal: new THREE.Vector3(0, 0, -1), rotY: Math.PI };
  }
}

// ---- Strahler auf ein Werk ---------------------------------------------------
function addWorkSpot(scene, root, fixtureMat, pos, normal, r, workSize, cy, quality) {
  const out = pos.clone().addScaledVector(normal, 1.15);
  out.y = Math.min(r.H - 0.15, cy + 2.8);   // bei hoher Decke nicht von ganz oben
  const dist = out.distanceTo(new THREE.Vector3(pos.x, cy, pos.z));
  const angle = Math.min(0.62, Math.atan((workSize * 0.72 + 0.28) / dist));
  const spot = new THREE.SpotLight(0xffeedb, quality.spotIntensity, 0, angle, 0.86, 1.0);
  spot.position.copy(out);
  const target = new THREE.Object3D(); target.position.copy(pos); target.position.y = cy;
  scene.add(target); spot.target = target; scene.add(spot);
  // Gehäuse am Strahler
  const fix = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.16, 12), fixtureMat);
  fix.position.copy(out); fix.position.y += 0.08; fix.lookAt(pos.x, cy, pos.z); fix.rotateX(Math.PI / 2);
  root.add(fix);
}

// ---- Stromschiene quer über den Raum ----------------------------------------
function addTrack(root, trackMat, fixtureMat, cx, cz, r) {
  const rail = new THREE.Mesh(new THREE.BoxGeometry(r.xR - r.xL - 0.4, 0.06, 0.06), trackMat);
  rail.position.set(cx, r.H - 0.05, cz); root.add(rail);
}

// ---- Raumnummer über Durchgang ----------------------------------------------
function addRoomNumber(root, num, x, z, faceNeg) {
  const p = makeTextPlane(num, { size: 0.16, w: 0.3, color: '#7a756c', weight: 600, bg: null });
  p.position.set(x, DOOR_H + 0.16, z); p.rotation.y = faceNeg ? 0 : Math.PI; root.add(p);
}

// ---- Sprossenfensterwand (Saal links) ---------------------------------------
// Generische Sprossenfensterwand (beide Achsen). ww siehe layout.WINDOWWALLS.
function buildWindowWall(root, scene, ww, wallMat, edgeMat, glassMat, skyMat) {
  const { axis, at, from, to, face, sill, head, centers, width, cols, rows } = ww;
  // solider Wandkasten über u-Bereich [u0,u1], y [y0,y1]
  const box = (u0, u1, y0, y1, mat, thick = T, d = 0) => {
    const ul = u1 - u0; if (ul <= 0.001) return;
    const geo = axis === 'z' ? new THREE.BoxGeometry(thick, y1 - y0, ul) : new THREE.BoxGeometry(ul, y1 - y0, thick);
    const m = new THREE.Mesh(geo, mat);
    const uc = (u0 + u1) / 2, yc = (y0 + y1) / 2;
    if (axis === 'z') m.position.set(at + face * d, yc, uc); else m.position.set(uc, yc, at + face * d);
    m.receiveShadow = true; root.add(m); return m;
  };
  // flaches Element (Glas/Himmel/Sprosse) an u-Position c, y-Mitte yc, Abstand d
  const place = (mesh, c, yc, d = 0) => {
    if (axis === 'z') { mesh.rotation.y = face > 0 ? Math.PI / 2 : -Math.PI / 2; mesh.position.set(at + face * d, yc, c); }
    else { mesh.rotation.y = face > 0 ? 0 : Math.PI; mesh.position.set(c, yc, at + face * d); }
    root.add(mesh);
  };
  const bar = (uc, ul, yc, yl) => {
    const geo = axis === 'z' ? new THREE.BoxGeometry(0.06, yl, ul) : new THREE.BoxGeometry(ul, yl, 0.06);
    const m = new THREE.Mesh(geo, edgeMat);
    if (axis === 'z') m.position.set(at, yc, uc); else m.position.set(uc, yc, at);
    root.add(m);
  };

  box(from, to, 0, sill, wallMat);          // Brüstung
  box(from, to, head, WALL_H, wallMat);     // Sturz
  const openings = centers.map(c => [c - width / 2, c + width / 2]).sort((a, b) => a[0] - b[0]);
  let cur = from;
  for (const [a, b] of openings) { box(cur, a, sill, head, wallMat); cur = b; }
  box(cur, to, sill, head, wallMat);

  const H = head - sill, yC = (sill + head) / 2;
  for (const c of centers) {
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(width, H), glassMat); place(glass, c, yC, 0);
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.98, H - 0.02), skyMat); place(sky, c, yC, -0.14);
    for (let k = 1; k < cols; k++) bar(c - width / 2 + (width * k) / cols, 0.03, yC, H);     // vertikal
    for (let k = 1; k < rows; k++) bar(c, width, sill + (H * k) / rows, 0.03);                // horizontal
    bar(c - width / 2, 0.06, yC, H + 0.06); bar(c + width / 2, 0.06, yC, H + 0.06);           // Rahmen seitlich
  }
  // Tageslicht
  if (!ww.noLight) {
    const uc = centers.reduce((a, b) => a + b, 0) / centers.length;
    const w = (Math.max(...centers) - Math.min(...centers)) + width + 0.6;
    const ral = new THREE.RectAreaLight(0xe6eff7, 1.7, w, H + 0.4);
    if (axis === 'z') { ral.position.set(at + face * 0.12, yC, uc); ral.lookAt(at + face * 3, yC, uc); }
    else { ral.position.set(uc, yC, at + face * 0.12); ral.lookAt(uc, yC, at + face * 3); }
    scene.add(ral);
  }
}
