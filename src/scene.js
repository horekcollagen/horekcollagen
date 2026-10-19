// ============================================================================
//  Kirche – Szene: Architektur, Material, Licht, Einrichtung.
//  Werke werden separat gehängt (hang.js, Phase B). Gibt Metadaten für die
//  Steuerung zurück (Böden, Emporen, Treppe, Raycast-Ziele).
// ============================================================================
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { makeTextPlane } from './labels.js';
import {
  NAVE, APSE, CHAPEL, VEST, EMP, STAIRS, BILDWAND, PODIUM,
  WIN_ZC, WIN_W, WIN_LO, WIN_HI, CHAPEL_WIN_ZC, GROUND, UPPER,
} from './layout.js';
RectAreaLightUniformsLib.init();

// ---- kleine Texturhelfer ----
function noiseCanvas(base, varc, blotch, size = 512) {
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, size, size);
  for (let i = 0; i < blotch; i++) { const x = Math.random() * size, y = Math.random() * size, r = 60 + Math.random() * 160;
    const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(0,0,0,${0.01 + Math.random() * 0.02})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, size, size); }
  const im = g.getImageData(0, 0, size, size), d = im.data; for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * varc; d[i] += n; d[i + 1] += n; d[i + 2] += n; } g.putImageData(im, 0, 0); return c;
}
function stoneCanvas(size = 512) {
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d');
  g.fillStyle = '#b9b2a6'; g.fillRect(0, 0, size, size);
  const im = g.getImageData(0, 0, size, size), d = im.data; for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * 18; d[i] += n; d[i + 1] += n; d[i + 2] += n; } g.putImageData(im, 0, 0);
  g.strokeStyle = 'rgba(70,64,56,0.35)'; g.lineWidth = 2; const n = 4, s = size / n;
  for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, size); g.stroke(); g.beginPath(); g.moveTo(0, i * s); g.lineTo(size, i * s); g.stroke(); }
  return c;
}
function brickCanvas(size = 256) {
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d');
  g.fillStyle = '#9a8781'; g.fillRect(0, 0, size, size);   // matter graurötlicher Backstein
  const bh = size / 6, bw = size / 4; g.strokeStyle = '#857069'; g.lineWidth = 2;
  for (let r = 0; r < 6; r++) { const off = (r % 2) * bw / 2; for (let x = -bw; x < size + bw; x += bw) { g.strokeRect(x + off, r * bh, bw, bh); } }
  const im = g.getImageData(0, 0, size, size), d = im.data; for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * 12; d[i] += n; d[i + 1] += n; d[i + 2] += n; } g.putImageData(im, 0, 0);
  return c;
}
function tex(canvas, rx, ry, aniso) { const t = new THREE.CanvasTexture(canvas); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; return t; }
function shadowTex() { const s = 128, c = document.createElement('canvas'); c.width = c.height = s; const g = c.getContext('2d'); const gr = g.createRadialGradient(s / 2, s / 2, s * 0.14, s / 2, s / 2, s * 0.5); gr.addColorStop(0, 'rgba(0,0,0,0.4)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, s, s); return new THREE.CanvasTexture(c); }

const GLASS_COLORS = [0xc85a2c, 0xd99a2b, 0x9e3b2e, 0xc9a13a, 0x8a5a24, 0x3f6e8c, 0x6e8c3f];
// warme, abstrakte Bleiglas-Palette (viele kleine Scheiben)
const GLASS_WARM = ['#d9742e', '#c2431f', '#e0a52f', '#b57f27', '#8f3620', '#d98f3a',
  '#a8511f', '#caa33b', '#e6b24a', '#9c6a2a', '#7c3a2c', '#bf6a2a', '#6f7a3a', '#8a5a86'];
// Bleiglas als Canvas-Textur: viele kleine Scheiben mit dunklen Bleistegen.
function glassCanvas(seed = 1, cols = 5, rows = 9) {
  const cw = 46, lead = 5, W = cols * cw + lead, H = rows * cw + lead;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  let s = seed * 9301 + 49297; const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  g.fillStyle = '#20191a'; g.fillRect(0, 0, W, H);                 // Bleistege (Hintergrund)
  for (let ri = 0; ri < rows; ri++) for (let ci = 0; ci < cols; ci++) {
    const base = GLASS_WARM[Math.floor(rnd() * GLASS_WARM.length)];
    const x = lead + ci * cw, y = lead + ri * cw, w = cw - lead, h = cw - lead;
    const gr = g.createLinearGradient(x, y, x + w, y + h);
    gr.addColorStop(0, base); gr.addColorStop(1, '#00000022');
    g.fillStyle = base; g.fillRect(x, y, w, h);
    g.fillStyle = gr; g.fillRect(x, y, w, h);
    // leichte Textur/Unregelmäßigkeit je Scheibe
    g.fillStyle = 'rgba(255,255,255,' + (0.04 + rnd() * 0.08).toFixed(3) + ')';
    g.fillRect(x, y, w, h * (0.2 + rnd() * 0.3));
  }
  return c;
}

export function buildGallery(renderer, quality, works = []) {
  const aniso = renderer.capabilities.getMaxAnisotropy();
  const BASE = import.meta.env.BASE_URL;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x15141f);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;

  scene.add(new THREE.HemisphereLight(0xf3f0ea, 0xbfae95, 0.42));
  scene.add(new THREE.AmbientLight(0xffffff, 0.1));

  // ---- Materialien ----
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xeee8dc, roughness: 0.96, metalness: 0, envMapIntensity: 0.5 });
  const brickMat = new THREE.MeshStandardMaterial({ map: tex(brickCanvas(), 2, 1, aniso), roughness: 0.95, metalness: 0 });
  const stoneMat = new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(), 10, 16, aniso), roughness: 0.8, metalness: 0, envMapIntensity: 0.5 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x5a4330, roughness: 0.7, metalness: 0 });
  const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x3e2e20, roughness: 0.65, metalness: 0 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x2a2724, roughness: 0.5, metalness: 0.6 });
  const ceilWoodMat = new THREE.MeshStandardMaterial({ color: 0x6a5138, roughness: 0.8, metalness: 0 });

  const root = new THREE.Group(); scene.add(root);
  const box = (w, h, d, mat, x, y, z, rotY = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.rotation.y = rotY; m.receiveShadow = true; root.add(m); return m; };

  // ---------------- Boden (Steinplatten) ----------------
  const floorMat = stoneMat;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(22, 40), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.position.set(10, 0, 18); floor.receiveShadow = true; floor.userData = { floor: true }; root.add(floor);
  const floors = [floor];

  // ---------------- Seitenwände mit Fenstern ----------------
  buildSideWall(root, 4, +1, wallMat, brickMat, darkWoodMat, scene, quality);   // links
  buildSideWall(root, 16, -1, wallMat, brickMat, darkWoodMat, scene, quality);  // rechts

  // ---------------- Apsis (Trommel bis zur Decke + Halbkuppel) ----------------
  // Trommel reicht bis zur Nave-Decke, damit über dem Apsisrand keine Leere sichtbar wird.
  const DRUM_H = NAVE.H;
  const apseWall = new THREE.Mesh(
    new THREE.CylinderGeometry(APSE.r, APSE.r, DRUM_H, 40, 1, true, Math.PI / 2, Math.PI),
    new THREE.MeshStandardMaterial({ color: 0xeee8dc, roughness: 0.96, side: THREE.DoubleSide }));
  apseWall.position.set(APSE.cx, DRUM_H / 2, APSE.cz); apseWall.receiveShadow = true; root.add(apseWall);
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(APSE.r, 40, 20, Math.PI / 2, Math.PI, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xe7e0d2, roughness: 0.96, side: THREE.DoubleSide }));
  dome.position.set(APSE.cx, APSE.H, APSE.cz); root.add(dome);
  // weiches Apsislicht (Garten Eden bleibt das hellste Werk)
  const apseFill = new THREE.PointLight(0xffe9cf, 8, 14, 1.2); apseFill.position.set(APSE.cx, 4.2, 3.0); scene.add(apseFill);

  // ---------------- Nave-Decke: dunkle Fläche mit sichtbaren Holzbalken ----------------
  box(NAVE.xR - NAVE.xL + 0.4, 0.3, NAVE.zEnd - NAVE.zApse + 0.4, new THREE.MeshStandardMaterial({ color: 0x251c13, roughness: 0.92 }), 10, NAVE.H + 0.05, (NAVE.zApse + NAVE.zEnd) / 2);
  for (let z = NAVE.zApse + 1.75; z < NAVE.zEnd; z += 2.5) box(NAVE.xR - NAVE.xL, 0.42, 0.28, ceilWoodMat, 10, NAVE.H - 0.22, z);            // Querbalken
  for (const x of [5.5, 8, 10, 12, 14.5]) box(0.24, 0.32, NAVE.zEnd - NAVE.zApse, darkWoodMat, x, NAVE.H - 0.16, (NAVE.zApse + NAVE.zEnd) / 2); // Längsbalken

  // ---------------- Kapellen ----------------
  buildChapel(root, box, CHAPEL.left, wallMat, brickMat, darkWoodMat, scene, quality, +1);
  buildChapel(root, box, CHAPEL.right, wallMat, brickMat, darkWoodMat, scene, quality, -1);

  // ---------------- Vorhalle + Übergangswände + Tür ----------------
  // Übergang Außenwand -> Vorhalle bei z=31 (links x4->7, rechts x16->13)
  box(VEST.xL - NAVE.xL, NAVE.H, 0.25, wallMat, (NAVE.xL + VEST.xL) / 2, NAVE.H / 2, VEST.zF);
  box(NAVE.xR - VEST.xR, NAVE.H, 0.25, wallMat, (VEST.xR + NAVE.xR) / 2, NAVE.H / 2, VEST.zF);
  // Vorhallenwände
  box(0.25, VEST.H, VEST.zN - VEST.zF, wallMat, VEST.xL, VEST.H / 2, (VEST.zF + VEST.zN) / 2);
  box(0.25, VEST.H, VEST.zN - VEST.zF, wallMat, VEST.xR, VEST.H / 2, (VEST.zF + VEST.zN) / 2);
  box(VEST.xR - VEST.xL + 0.3, VEST.H, 0.2, ceilWoodMat, 10, VEST.H, (VEST.zF + VEST.zN) / 2); // Decke Vorhalle
  // Eingangswand z=36 mit Tür
  const dW = VEST.doorW, dH = 2.6;
  box((10 - dW / 2) - VEST.xL, VEST.H, 0.3, wallMat, (VEST.xL + (10 - dW / 2)) / 2, VEST.H / 2, VEST.zN); // links
  box(VEST.xR - (10 + dW / 2), VEST.H, 0.3, wallMat, ((10 + dW / 2) + VEST.xR) / 2, VEST.H / 2, VEST.zN); // rechts
  box(dW, VEST.H - dH, 0.3, wallMat, 10, dH + (VEST.H - dH) / 2, VEST.zN); // Sturz
  box(dW, dH, 0.1, new THREE.MeshStandardMaterial({ color: 0x120f0d, roughness: 1 }), 10, dH / 2, VEST.zN - 0.08); // dunkle Tür

  // Eingangstext
  const entrance = makeTextPlane('HOREK – Collagen auf Holz. Berlin.', { size: 0.1, w: 2.6, color: '#2a241c', weight: 600 });
  entrance.position.set(10, 3.3, VEST.zN - 0.12); root.add(entrance);

  // ---------------- Bildwand ----------------
  const bwMat = new THREE.MeshStandardMaterial({ color: 0xece6da, roughness: 0.95 });
  box(BILDWAND.left.xR - BILDWAND.left.xL, BILDWAND.H, 0.25, bwMat, (BILDWAND.left.xL + BILDWAND.left.xR) / 2, BILDWAND.H / 2, BILDWAND.z);
  box(BILDWAND.right.xR - BILDWAND.right.xL, BILDWAND.H, 0.25, bwMat, (BILDWAND.right.xL + BILDWAND.right.xR) / 2, BILDWAND.H / 2, BILDWAND.z);
  box(BILDWAND.openX1 - BILDWAND.openX0, BILDWAND.H - BILDWAND.openH, 0.25, bwMat, (BILDWAND.openX0 + BILDWAND.openX1) / 2, BILDWAND.openH + (BILDWAND.H - BILDWAND.openH) / 2, BILDWAND.z);

  // ---------------- Chorwand (Triumphbogen) über und neben der Bildwand ----------------
  // Schließt den Blick nach oben in die Leere; die Apsisöffnung (x5–15, bis y=8) bleibt frei,
  // damit Garten Eden und Kuppel aus dem Schiff und von der Empore sichtbar bleiben.
  const chZ = 6.0, chOpenX0 = APSE.cx - APSE.r, chOpenX1 = APSE.cx + APSE.r, chOpenH = 8;
  box(chOpenX0 - NAVE.xL, NAVE.H, 0.25, wallMat, (NAVE.xL + chOpenX0) / 2, NAVE.H / 2, chZ);                       // Pfeiler links
  box(NAVE.xR - chOpenX1, NAVE.H, 0.25, wallMat, (chOpenX1 + NAVE.xR) / 2, NAVE.H / 2, chZ);                       // Pfeiler rechts
  box(chOpenX1 - chOpenX0, NAVE.H - chOpenH, 0.25, wallMat, APSE.cx, chOpenH + (NAVE.H - chOpenH) / 2, chZ);       // Sturz

  // ---------------- Emporen (U-Form) + Geländer + Stützen + Treppe ----------------
  const upperFloors = [];
  for (const g of [EMP.west, EMP.left, EMP.right]) {
    const w = g.xR - g.xL, d = g.zN - g.zF, cx = (g.xL + g.xR) / 2, cz = (g.zF + g.zN) / 2;
    box(w, 0.3, d, darkWoodMat, cx, EMP.y - 0.15, cz);                    // Platte
    const ef = new THREE.Mesh(new THREE.BoxGeometry(w - 0.05, 0.02, d - 0.05), new THREE.MeshStandardMaterial({ color: 0x463424, roughness: 0.6 }));
    ef.position.set(cx, EMP.y + 0.01, cz); ef.userData = { empore: true }; root.add(ef); upperFloors.push(ef);
  }
  // Geländer an den offenen Kanten (West z=26; links x=7; rechts x=13)
  railing(root, steelMat, 'z', EMP.west.zF, EMP.west.xL, EMP.west.xR, EMP.y);
  railing(root, steelMat, 'x', EMP.left.xR, EMP.left.zF, EMP.left.zN, EMP.y);
  railing(root, steelMat, 'x', EMP.right.xL, EMP.right.zF, EMP.right.zN, EMP.y);
  // Säulen als Arkade entlang der Seitengänge (x7 / x13) + unter der Westempore
  const colMat = new THREE.MeshStandardMaterial({ color: 0xe4ddce, roughness: 0.9, metalness: 0 });
  const column = (x, z) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, EMP.y, 16), colMat); c.position.set(x, EMP.y / 2, z); c.castShadow = true; root.add(c);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.22, 0.25, 16), colMat); cap.position.set(x, EMP.y - 0.12, z); root.add(cap); };
  for (const z of [10, 15, 20, 25]) { column(EMP.left.xR, z); column(EMP.right.xL, z); }
  for (const x of [5.5, 14.5]) column(x, EMP.west.zF);   // Mittelachse frei lassen
  // Treppe (Vorhalle, rechts) hoch zur Westempore
  const st = STAIRS, n = st.steps, stepW = st.xR - st.xL, run = st.zBottom - st.zTop, rise = st.yTop;
  for (let i = 0; i < n; i++) { const h = (rise / n) * (i + 1), z = st.zBottom - (run / n) * (i + 0.5);
    box(stepW, 0.08, run / n + 0.02, darkWoodMat, (st.xL + st.xR) / 2, h - 0.04, z);
    box(stepW, rise / n, run / n, woodMat, (st.xL + st.xR) / 2, h - (rise / n) / 2, z); }
  const stairTarget = new THREE.Mesh(new THREE.BoxGeometry(stepW, rise, Math.hypot(run, rise)), new THREE.MeshBasicMaterial({ visible: false }));
  stairTarget.position.set((st.xL + st.xR) / 2, rise / 2, (st.zTop + st.zBottom) / 2);
  stairTarget.rotation.x = -Math.atan2(rise, run); stairTarget.userData = { stairs: true }; root.add(stairTarget);

  // ---------------- Einrichtung ----------------
  // Bänke (4 Reihen je Seite)
  for (const bx of [8.5, 11.5]) for (let i = 0; i < 4; i++) { const z = 15.6 + i * 1.25;
    box(1.8, 0.08, 0.42, darkWoodMat, bx, 0.45, z); box(1.8, 0.5, 0.06, darkWoodMat, bx, 0.7, z - 0.19);
    box(0.06, 0.45, 0.42, darkWoodMat, bx - 0.85, 0.22, z); box(0.06, 0.45, 0.42, darkWoodMat, bx + 0.85, 0.22, z); }
  // Podest in der Apsis
  box(PODIUM.w, PODIUM.h, PODIUM.d, darkWoodMat, PODIUM.x, PODIUM.h / 2, PODIUM.z);
  // Werkbank linke Kapelle
  box(1.8, 0.08, 0.8, woodMat, 2, 0.9, 16.5); for (const dx of [-0.8, 0.8]) for (const dz of [-0.3, 0.3]) box(0.08, 0.9, 0.08, woodMat, 2 + dx, 0.45, 16.5 + dz);
  box(0.5, 0.3, 0.6, new THREE.MeshStandardMaterial({ color: 0xcfc6b4, roughness: 1 }), 1.5, 1.1, 16.5); // Zeitungsstapel
  box(0.6, 0.02, 0.45, woodMat, 2.5, 0.96, 16.6); // halbfertige Holztafel
  // Beichtstuhl / Videokabine rechte Kapelle
  box(1.4, 2.4, 1.2, darkWoodMat, 18, 1.2, 16.5);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), new THREE.MeshBasicMaterial({ color: 0x0b0b0e }));
  screen.position.set(18 - 0.71, 1.4, 16.5); screen.rotation.y = Math.PI / 2; screen.userData = { video: true }; root.add(screen);
  // Kiosk Vorhalle links
  const kiosk = box(2.0, 1.1, 1.0, woodMat, 8.4, 0.55, 32.6); kiosk.userData = { kiosk: true };

  // ---------------- Sonne (weiche Schatten) ----------------
  const sun = new THREE.DirectionalLight(0xfff0dc, 0.9); sun.position.set(-6, 14, 20); sun.target.position.set(10, 1, 14);
  if (quality.shadows) { sun.castShadow = true; sun.shadow.mapSize.set(quality.shadowMap, quality.shadowMap);
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 60; sun.shadow.camera.left = -16; sun.shadow.camera.right = 16; sun.shadow.camera.top = 30; sun.shadow.camera.bottom = -4; sun.shadow.bias = -0.0005; sun.shadow.radius = 4; }
  scene.add(sun); scene.add(sun.target);

  // ---------------- Werke platzieren (Lazy-Textur, neutrales weißes Licht) ----------------
  const texLoader = new THREE.TextureLoader();
  const edgeMat = new THREE.MeshStandardMaterial({ color: 0x1a1714, roughness: 0.5 });
  const sTex = shadowTex();
  const worksMeshes = []; const lazy = [];
  const vtmp = new THREE.Vector3();
  for (const w of works) {
    const pw = w.b / 1000, ph = w.h / 1000;
    const face = new THREE.MeshStandardMaterial({ color: 0xdcd8cf, roughness: 0.72, metalness: 0 });
    const mats = [edgeMat, edgeMat, edgeMat, edgeMat, face, edgeMat];
    const panel = new THREE.Mesh(new THREE.BoxGeometry(pw, ph, 0.04), mats);
    panel.position.set(w.x, w.y, w.z); panel.rotation.y = w.rotY; panel.castShadow = true;
    const normal = new THREE.Vector3(...w.normal);
    panel.userData = { work: w, center: panel.position.clone(), normal };
    root.add(panel); worksMeshes.push(panel); lazy.push({ panel, face, w, loaded: false });
    // weicher Schlagschatten
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(pw * 1.22, ph * 1.2), new THREE.MeshBasicMaterial({ map: sTex, transparent: true, depthWrite: false, opacity: 0.8 }));
    sh.position.copy(panel.position).addScaledVector(normal, -0.015); sh.position.y -= ph * 0.03; sh.rotation.y = w.rotY; root.add(sh);
    // Werklicht: neutral weiß, Kegel knapp größer als das Werk (nie farbig)
    const lp = panel.position.clone().addScaledVector(normal, 1.0); lp.y = Math.min(w.y + 2.4, w.level === 'empore' ? 9.5 : 11.5);
    const spot = new THREE.SpotLight(0xffffff, w.nr === 302 ? 9 : 3.0, 0, Math.min(0.6, Math.atan((Math.max(pw, ph) * 0.7 + 0.25) / lp.distanceTo(panel.position))), 0.72, 1.0);
    spot.position.copy(lp); const tgt = new THREE.Object3D(); tgt.position.copy(panel.position); scene.add(tgt); spot.target = tgt; scene.add(spot);
  }
  function lazyLoad(camera, all = false) {
    let budget = all ? 999 : 3;
    for (const it of lazy) { if (it.loaded || budget <= 0) continue;
      if (!all) { vtmp.copy(it.panel.position); if (vtmp.distanceTo(camera.position) > 16) continue; }
      it.loaded = true; budget--;
      texLoader.load(BASE + 'works/' + it.w.slug + '.webp', tx => { tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = aniso; tx.generateMipmaps = true; tx.minFilter = THREE.LinearMipmapLinearFilter; it.face.map = tx; it.face.color.set(0xffffff); it.face.needsUpdate = true; });
    }
  }

  return { scene, envTex, pmrem, worksMeshes, raycastTargets: worksMeshes, loadMgr: new THREE.LoadingManager(), floors, upperFloors, stairTarget, doorTriggers: [], lazyLoad };
}

// ---- Seitenwand (x const) mit je 4 Fensterpaaren (unten+oben) + Tageslicht ----
function buildSideWall(root, x, face, wallMat, brickMat, darkWoodMat, scene, quality) {
  const z0 = NAVE.zApse, z1 = NAVE.zEnd, H = NAVE.H, T = 0.25;
  const seg = (za, zb, y0, y1, mat = wallMat) => { if (zb - za < 0.01 || y1 - y0 < 0.01) return; const m = new THREE.Mesh(new THREE.BoxGeometry(T, y1 - y0, zb - za), mat); m.position.set(x, (y0 + y1) / 2, (za + zb) / 2); m.receiveShadow = true; root.add(m); };
  // Kapellen-Durchgang (beide Seiten gleiche z): offener Zugang ins Seitenschiff.
  const DOOR = [CHAPEL.openZ0, CHAPEL.openZ1];   // z 15..18, bis y = WIN_LO[1] (3.6)
  const winOpen = WIN_ZC.map(zc => [zc - WIN_W / 2, zc + WIN_W / 2]);
  const lowOpen = [...winOpen, DOOR].sort((a, b) => a[0] - b[0]);
  const segOpen = (ya, yb, ops, mat) => { let cur = z0; for (const [a, b] of ops) { seg(cur, a, ya, yb, mat); cur = b; } seg(cur, z1, ya, yb, mat); };
  // untere Bänder: Tür (und ggf. Fenster) ausgespart; darüber durchgehender Sturz
  segOpen(0, 0.6, [DOOR], brickMat);                 // Sockel
  segOpen(0.6, WIN_LO[0], [DOOR]);                   // y 0.6..1.2
  segOpen(WIN_LO[0], WIN_LO[1], lowOpen);            // y 1.2..3.6 (Fenster + Tür)
  seg(z0, z1, WIN_LO[1], WIN_HI[0]);                 // Sturz über der Tür, durchgehend
  segOpen(WIN_HI[0], WIN_HI[1], winOpen); seg(z0, z1, WIN_HI[1], H);
  // Bleiglas: eine Textur-Scheibe je Fenster (viele kleine warme Felder, Bleistege) + Laibung + Tageslicht
  for (const zc of WIN_ZC) for (const [ya, yb] of [WIN_LO, WIN_HI]) {
    const hh = yb - ya;
    const gtex = new THREE.CanvasTexture(glassCanvas(Math.round(zc * 7) + (face > 0 ? 1 : 17), 5, 9));
    gtex.colorSpace = THREE.SRGBColorSpace;
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(WIN_W, hh),
      new THREE.MeshStandardMaterial({ map: gtex, emissive: 0xffffff, emissiveMap: gtex, emissiveIntensity: 0.9, roughness: 0.4, metalness: 0, side: THREE.DoubleSide }));
    glass.rotation.y = face > 0 ? Math.PI / 2 : -Math.PI / 2; glass.position.set(x + face * 0.02, (ya + yb) / 2, zc); root.add(glass);
    for (const dz of [-WIN_W / 2, WIN_W / 2]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.3, hh, 0.12), brickMat); m.position.set(x, (ya + yb) / 2, zc + dz); root.add(m); }
    const ral = new THREE.RectAreaLight(0xf3e0c4, 1.6, WIN_W + 0.3, hh); ral.position.set(x + face * 0.1, (ya + yb) / 2, zc); ral.lookAt(x + face * 3, (ya + yb) / 2, zc); scene.add(ral);
  }
  // kräftige farbige Lichtflecken auf Boden/Bänke/Säulen (Mitte), nie auf die Werke (Wände)
  for (const zc of WIN_ZC) { const col = GLASS_COLORS[(Math.round(zc) + (face > 0 ? 0 : 3)) % GLASS_COLORS.length];
    const sp = new THREE.SpotLight(col, 4.5, 0, 0.32, 0.6, 1.0); sp.position.set(x + face * 0.3, WIN_HI[1] - 0.5, zc);
    sp.target.position.set(10 - face * 1.5, 0, zc + 1.5); scene.add(sp.target); scene.add(sp); }
}

// ---- Kapelle (Box, zum Schiff offen, 2 Fenster an der Außenwand) ----
function buildChapel(root, box, side, wallMat, brickMat, darkWoodMat, scene, quality, face) {
  const { xL, xR } = side, zF = CHAPEL.zF, zN = CHAPEL.zN, H = CHAPEL.H;
  const xOuter = face > 0 ? xL : xR;      // Außenwand (x0 links / x20 rechts)
  const xNave = face > 0 ? xR : xL;       // Seite zum Schiff (x4 / x16)
  box(xR - xL, H, 0.25, wallMat, (xL + xR) / 2, H / 2, zF);     // vordere Wand
  box(xR - xL, H, 0.25, wallMat, (xL + xR) / 2, H / 2, zN);     // hintere Wand
  box(0.25, H, zN - zF, wallMat, xOuter, H / 2, (zF + zN) / 2); // Außenwand
  // Wand zum Schiff bildet die durchbrochene Seitenwand (Tür in buildSideWall ausgespart) –
  // keine eigenen Segmente mehr, sonst Z-Fighting mit der Hauptwand bei x4/x16.
  box(xR - xL, 0.2, zN - zF, wallMat, (xL + xR) / 2, H, (zF + zN) / 2);  // Decke
  // zwei Bleiglasfenster in der Außenwand (gleiche warme, kleinteilige Optik wie im Schiff)
  for (const zc of CHAPEL_WIN_ZC) { const yb = 3.6, ya = 1.2;
    const gtex = new THREE.CanvasTexture(glassCanvas(Math.round(zc * 11) + (face > 0 ? 3 : 29), 4, 7));
    gtex.colorSpace = THREE.SRGBColorSpace;
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.2, yb - ya),
      new THREE.MeshStandardMaterial({ map: gtex, emissive: 0xffffff, emissiveMap: gtex, emissiveIntensity: 0.85, roughness: 0.4, metalness: 0, side: THREE.DoubleSide }));
    glass.rotation.y = Math.PI / 2; glass.position.set(xOuter + (face > 0 ? 0.02 : -0.02), (ya + yb) / 2, zc); root.add(glass);
    const ral = new THREE.RectAreaLight(0xf3e0c4, 1.6, 1.4, yb - ya); ral.position.set(xOuter + (face > 0 ? 0.1 : -0.1), (ya + yb) / 2, zc); ral.lookAt(xOuter + face * 3, (ya + yb) / 2, zc); scene.add(ral); }
}

function railing(root, mat, axis, at, a, b, y) {
  const top = new THREE.Mesh(axis === 'z' ? new THREE.BoxGeometry(b - a, 0.05, 0.05) : new THREE.BoxGeometry(0.05, 0.05, b - a), mat);
  if (axis === 'z') top.position.set((a + b) / 2, y + EMP.rail, at); else top.position.set(at, y + EMP.rail, (a + b) / 2); root.add(top);
  for (let t = a + 0.2; t <= b - 0.2; t += 0.9) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.04, EMP.rail, 0.04), mat); if (axis === 'z') p.position.set(t, y + EMP.rail / 2, at); else p.position.set(at, y + EMP.rail / 2, t); root.add(p); }
}
