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
import { T, WALL_H, DOOR_H, ROOMS, WALLS, WINDOWS, DOORWAYS } from './layout.js';
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
  scene.add(new THREE.HemisphereLight(0xfbf7ef, 0xdad6cd, 0.55));
  const fill = new THREE.AmbientLight(0xffffff, 0.12); scene.add(fill);

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

  // ---------------- Fensterwand (Saal links, x=-4.5) ----------------
  buildWindowWall(root, wallMat, edgeMat, aniso, scene);

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

  // ---------------- Fenster-Tageslicht (Saal): Flächenwäsche + Sonne (Schatten) ----------------
  const daylight = new THREE.RectAreaLight(0xe2edf6, 3.4, 6.5, 2.3);
  daylight.position.set(-4.35, 2.05, -4.3); daylight.lookAt(0, 1.6, -4.3); scene.add(daylight);

  const sun = new THREE.DirectionalLight(0xeef2f6, 1.1);
  sun.position.set(-9, 5.5, -4.2); sun.target.position.set(-1, 1.2, -4.5);
  if (quality.shadows) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(quality.shadowMap, quality.shadowMap);
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 22;
    sun.shadow.camera.left = -7; sun.shadow.camera.right = 7;
    sun.shadow.camera.top = 6; sun.shadow.camera.bottom = -2;
    sun.shadow.bias = -0.0004; sun.shadow.radius = 4;
  }
  scene.add(sun); scene.add(sun.target);

  // ---------------- Beschriftung: Eingangstext + Raumnummern ----------------
  const entrance = makeTextPlane('HOREK – Scrap Society', { size: 0.17, w: 2.1, color: '#1a1714', weight: 700 });
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

  // Raum-Startpunkte (zum Springen und Durchgehen)
  const entries = {
    1: { x: 0.0, z: 10.6, yaw: 0 },
    2: { x: 0.0, z: 4.6, yaw: 0 },
    3: { x: 0.6, z: -1.6, yaw: 0 },
  };

  return { scene, envTex, pmrem, worksMeshes, raycastTargets, loadMgr, floorMat, sun, floors, doorTriggers, entries };
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
  const out = pos.clone().addScaledVector(normal, 1.15); out.y = r.H - 0.15;
  // Kegel knapp größer als das Werk, weicher Rand
  const dist = out.distanceTo(new THREE.Vector3(pos.x, cy, pos.z));
  const angle = Math.min(0.62, Math.atan((workSize * 0.72 + 0.28) / dist));
  const spot = new THREE.SpotLight(0xffeedb, quality.spotIntensity, 0, angle, 0.88, 1.25);
  spot.position.copy(out);
  const target = new THREE.Object3D(); target.position.copy(pos); target.position.y = cy;
  scene.add(target); spot.target = target; scene.add(spot);
  // Gehäuse an der Schiene
  const fix = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.16, 12), fixtureMat);
  fix.position.copy(out); fix.position.y = r.H - 0.06; fix.lookAt(pos.x, cy, pos.z); fix.rotateX(Math.PI / 2);
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
function buildWindowWall(root, wallMat, edgeMat, aniso, scene) {
  const { x, sill, head, zCenters, width, cols, rows } = WINDOWS;
  const zTop = 0.0, zBot = -8.0;
  // untere Brüstung (voll) und oberer Sturz (voll)
  const full = (y0, y1) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(T, y1 - y0, zTop - zBot), wallMat);
    m.position.set(x, (y0 + y1) / 2, (zTop + zBot) / 2); m.receiveShadow = true; root.add(m);
  };
  full(0, sill); full(head, WALL_H);
  // Pfeiler zwischen/neben den Fenstern (Bereich sill..head)
  const openings = zCenters.map(zc => [zc - width / 2, zc + width / 2]).sort((a, b) => a[0] - b[0]);
  let cursor = zBot;
  const piers = [];
  for (const [a, b] of openings) { piers.push([cursor, a]); cursor = b; }
  piers.push([cursor, zTop]);
  for (const [a, b] of piers) {
    if (b - a < 0.001) continue;
    const m = new THREE.Mesh(new THREE.BoxGeometry(T, head - sill, b - a), wallMat);
    m.position.set(x, (sill + head) / 2, (a + b) / 2); m.receiveShadow = true; root.add(m);
  }
  // Glas + Sprossen + helles Tageslicht dahinter
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xcfe0ea, roughness: 0.1, metalness: 0, transparent: true, opacity: 0.18 });
  const skyMat = new THREE.MeshBasicMaterial({ color: 0xf4f2ea });
  for (const zc of zCenters) {
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(width, head - sill), glassMat);
    glass.rotation.y = Math.PI / 2; glass.position.set(x, (sill + head) / 2, zc); root.add(glass);
    // helle Himmelsfläche knapp hinter dem Fenster
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.98, head - sill - 0.02), skyMat);
    sky.rotation.y = Math.PI / 2; sky.position.set(x - 0.14, (sill + head) / 2, zc); root.add(sky);
    // Sprossen
    const bar = 0.03;
    for (let c = 1; c < cols; c++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.05, head - sill, bar), edgeMat);
      b.position.set(x, (sill + head) / 2, zc - width / 2 + (width * c) / cols); root.add(b);
    }
    for (let ro = 1; ro < rows; ro++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.05, bar, width), edgeMat);
      b.position.set(x, sill + ((head - sill) * ro) / rows, zc); root.add(b);
    }
    // Rahmen
    const frameMat = edgeMat;
    const fr = new THREE.Mesh(new THREE.BoxGeometry(0.06, head - sill + 0.06, 0.06), frameMat);
    const fr2 = fr.clone();
    fr.position.set(x, (sill + head) / 2, zc - width / 2); root.add(fr);
    fr2.position.set(x, (sill + head) / 2, zc + width / 2); root.add(fr2);
  }
}
