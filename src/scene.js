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
  WIN_ZC, WIN_W, WIN_LO, WIN_HI, CHAPEL_WIN_ZC, GROUND, UPPER, EMPORE_RAILINGS,
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
// weicher runder Lichtfleck (für vorgetäuschte Werk-Kegel und farbige Fensterflecken)
function glowCanvas() {
  const s = 128, c = document.createElement('canvas'); c.width = c.height = s;
  const g = c.getContext('2d'); const gr = g.createRadialGradient(s / 2, s / 2, 2, s / 2, s / 2, s / 2);
  gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, s, s); return c;
}

export function buildGallery(renderer, quality, works = []) {
  const aniso = renderer.capabilities.getMaxAnisotropy();
  const BASE = import.meta.env.BASE_URL;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x15141f);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;

  // Globales Licht trägt den Raum (statt 100+ Einzellichtern): Hemisphäre + Ambient.
  scene.add(new THREE.HemisphereLight(0xf5f1ea, 0xc9bca6, 0.95));
  scene.add(new THREE.AmbientLight(0xffffff, 0.32));

  // geteilte Glow-Textur für vorgetäuschte Lichtkegel/Lichtflecken (keine echten Lichter)
  const glowTex = new THREE.CanvasTexture(glowCanvas()); glowTex.colorSpace = THREE.SRGBColorSpace;
  // Werk-Lichtkegel: additiver Fleck an der Wand hinter dem Werk
  const workGlow = (pos, normal, w, h, rotY, ph) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: glowTex, color: 0xfff1dc, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.6 }));
    // Kegel über dem Werk: Unterkante knapp über der Werk-Unterkante, nichts strahlt darunter.
    m.position.copy(pos).addScaledVector(normal, -0.165); m.position.y += (h / 2 - ph / 2 + 0.08); m.rotation.y = rotY; root.add(m);
  };
  // farbiger Fensterfleck auf dem Boden (additiv, flach)
  const floorPatch = (x, z, size, color) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size * 1.6),
      new THREE.MeshBasicMaterial({ map: glowTex, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.5 }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.02, z); root.add(m);
  };

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
  // farbige Fensterflecken auf dem Boden (additiv, vorberechnet – ersetzt die Boden-Spots)
  for (const face of [+1, -1]) { const x = face > 0 ? 4 : 16;
    for (const zc of WIN_ZC) { const col = GLASS_COLORS[(Math.round(zc) + (face > 0 ? 0 : 3)) % GLASS_COLORS.length];
      floorPatch(x + face * 2.1, zc + 0.6, 2.6, col); } }

  // ---------------- Apsis: Trommel (Sammelwand) + saubere Halbkuppel (Viertelkugel) ----------------
  // Trommel = halbzylindrische Apsiswand (z0..5). Höhe DRUM_H; darauf eine Viertelkugel,
  // die genau auf dem Trommelrand aufsitzt und in z0..5 bleibt (ragt nicht ins Schiff).
  // Kuppelscheitel = DRUM_H + r = 11.5 m < Nave-Decke (12) -> ragt nicht durch die Decke.
  const DRUM_H = 6.5;
  const apseWall = new THREE.Mesh(
    new THREE.CylinderGeometry(APSE.r, APSE.r, DRUM_H, 48, 1, true, Math.PI / 2, Math.PI),
    new THREE.MeshStandardMaterial({ color: 0xeee8dc, roughness: 0.96, side: THREE.DoubleSide }));
  apseWall.position.set(APSE.cx, DRUM_H / 2, APSE.cz); apseWall.receiveShadow = true; root.add(apseWall);
  // Halbkuppel (Viertelkugel): -z-Hälfte (phiStart=π) => Grundkreis = Trommelrand, bleibt in z0..5.
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(APSE.r, 48, 24, Math.PI, Math.PI, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xe7e0d2, roughness: 0.96, side: THREE.DoubleSide }));
  dome.position.set(APSE.cx, DRUM_H, APSE.cz); root.add(dome);
  // Apsis-Flanken (x4–5 / x15–16) schließen die Seiten der Apsisbucht; sie STOSSEN an die
  // Chorwand (Vorderkante z 5,875), überlappen sie also nicht mehr (früher bis z 6,0).
  box(1.0, NAVE.H, 6.075, wallMat, NAVE.xL + 0.5, NAVE.H / 2, 2.8375);
  box(1.0, NAVE.H, 6.075, wallMat, NAVE.xR - 0.5, NAVE.H / 2, 2.8375);
  // weiches Apsislicht (Garten Eden bleibt das hellste Werk)
  const apseFill = new THREE.PointLight(0xffe9cf, 8, 14, 1.2); apseFill.position.set(APSE.cx, 4.2, 3.0); scene.add(apseFill);

  // ---------------- Nave-Decke: helle Kassettenfelder + dunkle Holzbalken ----------------
  // Felder weiß gekalkt + leicht selbstleuchtend (nie schwarz); Balken bleiben dunkles Holz.
  // Deckt auch die Apsisbucht (z0–5) ab, damit über der Kuppel kein Hintergrund durchblitzt.
  const ceilFieldMat = new THREE.MeshStandardMaterial({ color: 0xe7e1d5, roughness: 0.96, emissive: 0xffffff, emissiveIntensity: 0.12 });
  box(NAVE.xR - NAVE.xL + 0.4, 0.3, NAVE.zEnd + 0.4, ceilFieldMat, 10, NAVE.H + 0.05, (NAVE.zEnd + 0.2) / 2);
  // breiter Deckel über der Apsisbucht/Chorzone (über der Kuppel): schließt die schrägen
  // Eckblicke seitlich an der Apsis vorbei; etwas höher, damit die Nave-Decke davor liegt.
  box(20, 0.3, 8, ceilFieldMat, 10, NAVE.H + 0.14, 3);
  for (let z = NAVE.zApse + 1.75; z < NAVE.zEnd; z += 2.5) box(NAVE.xR - NAVE.xL, 0.42, 0.28, ceilWoodMat, 10, NAVE.H - 0.22, z);            // Querbalken
  for (const x of [5.5, 8, 10, 12, 14.5]) box(0.24, 0.32, NAVE.zEnd - NAVE.zApse, darkWoodMat, x, NAVE.H - 0.16, (NAVE.zApse + NAVE.zEnd) / 2); // Längsbalken

  // ---------------- Kapellen ----------------
  buildChapel(root, box, CHAPEL.left, wallMat, brickMat, darkWoodMat, scene, quality, +1);
  buildChapel(root, box, CHAPEL.right, wallMat, brickMat, darkWoodMat, scene, quality, -1);

  // ---------------- Vorhalle + Übergangswände + Tür ----------------
  // Übergang Außenwand -> Vorhalle bei z=31 (links x4->7, rechts x16->13)
  // Innenkanten 2 cm in die Durchgangsöffnung gezogen (x7->7,02 / x13->12,98): die Emporen-
  // kanten (x7/x13) liegen dann INNEN hinter der Wand, nicht in einer Ebene mit ihr (kein Flackern).
  box(VEST.xL - NAVE.xL + 0.02, NAVE.H, 0.25, wallMat, (NAVE.xL + VEST.xL + 0.02) / 2, NAVE.H / 2, VEST.zF);
  box(NAVE.xR - VEST.xR + 0.02, NAVE.H, 0.25, wallMat, (VEST.xR - 0.02 + NAVE.xR) / 2, NAVE.H / 2, VEST.zF);
  // Rückwand der Westempore über dem Vorhallen-Durchgang (schließt die Leere über der
  // Vorhalle; weiß gekalkt; Serie 2020 hängt hier). Unten (y<5) bleibt der Durchgang frei.
  box(VEST.xR - VEST.xL, NAVE.H - VEST.H + 0.2, 0.25, wallMat, 10, VEST.H + (NAVE.H - VEST.H) / 2 - 0.1, VEST.zF);
  // Vorhallenwände
  box(0.25, VEST.H, VEST.zN - VEST.zF, wallMat, VEST.xL, VEST.H / 2, (VEST.zF + VEST.zN) / 2);
  box(0.25, VEST.H, VEST.zN - VEST.zF, wallMat, VEST.xR, VEST.H / 2, (VEST.zF + VEST.zN) / 2);
  // Decke Vorhalle (weiß, waagerecht): vorne 10 cm in die Vorhalle (keine Fuge an der z31-Wand),
  // hinten in die Eingangswand hinein (z36,0, verdeckt) – keine koplanar-gleichen Kanten.
  box(VEST.xR - VEST.xL + 0.3, 0.2, 4.8, ceilFieldMat, 10, VEST.H, 33.5);
  // Eingangswand z=36 mit Tür
  const dW = VEST.doorW, dH = 2.6;
  box((10 - dW / 2) - VEST.xL, VEST.H, 0.3, wallMat, (VEST.xL + (10 - dW / 2)) / 2, VEST.H / 2, VEST.zN); // links
  box(VEST.xR - (10 + dW / 2), VEST.H, 0.3, wallMat, ((10 + dW / 2) + VEST.xR) / 2, VEST.H / 2, VEST.zN); // rechts
  box(dW, VEST.H - dH, 0.3, wallMat, 10, dH + (VEST.H - dH) / 2, VEST.zN); // Sturz
  // geschlossene, zweiflügelige Holztür (kein schwarzes Loch) – wie die Wände beleuchtet
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x7a5a38, roughness: 0.68, metalness: 0 });
  const doorStile = new THREE.MeshStandardMaterial({ color: 0x5a4028, roughness: 0.72, metalness: 0 });
  box(dW + 0.16, dH + 0.12, 0.12, doorStile, 10, (dH + 0.12) / 2, VEST.zN - 0.04);                 // Zarge/Rahmen
  for (const s of [-1, 1]) { const lx = 10 + s * (dW / 4);
    box(dW / 2 - 0.04, dH - 0.06, 0.07, doorMat, lx, dH / 2, VEST.zN - 0.10);                       // Türblatt
    for (const yy of [dH * 0.3, dH * 0.7]) box(dW / 2 - 0.26, dH * 0.24, 0.02, doorStile, lx, yy, VEST.zN - 0.14); // Füllungen
    box(0.05, 0.05, 0.06, doorStile, lx - s * (dW / 4 - 0.12), dH * 0.46, VEST.zN - 0.16);          // Griff
  }
  box(0.07, dH - 0.06, 0.08, doorStile, 10, dH / 2, VEST.zN - 0.11);                                // Mittelstoß

  // Eingangstext
  const entrance = makeTextPlane('HOREK – Collagen auf Holz. Berlin.', { size: 0.1, w: 2.6, color: '#2a241c', weight: 600 });
  entrance.position.set(10, 3.3, VEST.zN - 0.12); root.add(entrance);

  // ---------------- Bildwand ----------------
  const bwMat = new THREE.MeshStandardMaterial({ color: 0xece6da, roughness: 0.95 });
  box(BILDWAND.left.xR - BILDWAND.left.xL, BILDWAND.H, 0.25, bwMat, (BILDWAND.left.xL + BILDWAND.left.xR) / 2, BILDWAND.H / 2, BILDWAND.z);
  box(BILDWAND.right.xR - BILDWAND.right.xL, BILDWAND.H, 0.25, bwMat, (BILDWAND.right.xL + BILDWAND.right.xR) / 2, BILDWAND.H / 2, BILDWAND.z);
  box(BILDWAND.openX1 - BILDWAND.openX0, BILDWAND.H - BILDWAND.openH, 0.25, bwMat, (BILDWAND.openX0 + BILDWAND.openX1) / 2, BILDWAND.openH + (BILDWAND.H - BILDWAND.openH) / 2, BILDWAND.z);

  // ---------------- Chorwand (Ostwand) mit rundem Apsisbogen ----------------
  // Durchgehende Wand x4–16, y0–12 bei z6 mit einer runden Bogenöffnung (x5–15, Kämpfer y6.5,
  // Scheitel y11.5 = Kuppelrand). Darüber bis zur Decke geschlossen -> vom Schiff ein runder
  // Bogen, darin die Kuppel; nichts ragt durch Wand oder Decke.
  {
    const chZ = 6.0, archSpring = DRUM_H, archR = APSE.r, cx = APSE.cx, aOut = archR + 0.35;
    const yB = -0.6;                 // Unterkante UNTER dem Boden: keine Fläche in der Bodenebene (y0) -> kein Flackern
    const yT = NAVE.H + 0.1;         // Oberkante leicht IN die Decke: keine Fläche in der Deckenebene (y12)
    // Chorwand mit Öffnung = AUSSENkante der Archivolte (aOut). So kacheln Wand und Archivolte
    // dieselbe Ebene, ohne sich zu überlappen (kein Versatz, kein Schlitz, kein koplanares Flackern).
    const shape = new THREE.Shape();
    shape.moveTo(NAVE.xL, yB); shape.lineTo(NAVE.xR, yB); shape.lineTo(NAVE.xR, yT); shape.lineTo(NAVE.xL, yT);
    const hole = new THREE.Path();
    hole.moveTo(cx - aOut, yB); hole.lineTo(cx - aOut, archSpring);
    hole.absarc(cx, archSpring, aOut, Math.PI, 0, true);
    hole.lineTo(cx + aOut, yB); hole.lineTo(cx - aOut, yB);
    shape.holes.push(hole);
    const chancel = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.25, bevelEnabled: false }),
      new THREE.MeshStandardMaterial({ color: 0xeee8dc, roughness: 0.96, side: THREE.DoubleSide }));
    chancel.position.set(0, 0, chZ - 0.125); chancel.receiveShadow = true; root.add(chancel);   // z 5,875..6,125
    // Backstein-Archivolte füllt den Ring archR..aOut, BÜNDIG in derselben Wandebene. Sie greift
    // 2 cm radial in die Wand und steht 1 mm vor/hinter ihr -> keine koplanar-gleiche Kante (kein Flackern).
    const aO2 = aOut + 0.02, yBa = yB - 0.04;   // Archivolten-Unterkante 4 cm tiefer (unter dem Boden, nicht gleich der Chorwand)
    const ring = new THREE.Shape();
    ring.moveTo(cx - aO2, yBa); ring.lineTo(cx - aO2, archSpring); ring.absarc(cx, archSpring, aO2, Math.PI, 0, true); ring.lineTo(cx + aO2, yBa);
    const rh = new THREE.Path();
    rh.moveTo(cx - archR, yBa); rh.lineTo(cx - archR, archSpring); rh.absarc(cx, archSpring, archR, Math.PI, 0, true); rh.lineTo(cx + archR, yBa); rh.lineTo(cx - archR, yBa);
    ring.holes.push(rh);
    const arch = new THREE.Mesh(new THREE.ExtrudeGeometry(ring, { depth: 0.256, bevelEnabled: false }),
      new THREE.MeshStandardMaterial({ color: 0x9a7b5a, map: brickMat.map, roughness: 0.95, side: THREE.DoubleSide }));
    arch.position.set(0, 0, chZ - 0.128); root.add(arch);   // z 5,872..6,128: umschließt die Chorwand 3 mm vorn/hinten (keine gemeinsame Kante)
  }

  // ---------------- Emporen (U-Form) + Geländer + Stützen + Treppe ----------------
  const upperFloors = [];
  const emporeTargets = [];   // anklickbar von unten (Platte, Unterseite, Geländer) -> hoch
  const efMat = new THREE.MeshStandardMaterial({ color: 0x463424, roughness: 0.6 });
  const plate = (xL, xR, zF, zN) => {
    const w = xR - xL, d = zN - zF, cx = (xL + xR) / 2, cz = (zF + zN) / 2;
    // Tragplatte mit heller Unterseite (Kassettenfeld wie im Schiff); oben liegt der
    // dunkle Holzboden (ef) darüber, unten hängen dunkle Balken darunter.
    const slab = box(w, 0.3, d, ceilFieldMat, cx, EMP.y - 0.15, cz); slab.userData = { emporeUp: true }; emporeTargets.push(slab);
    const ef = new THREE.Mesh(new THREE.BoxGeometry(w, 0.03, d), efMat);
    ef.position.set(cx, EMP.y + 0.015, cz); ef.userData = { empore: true }; root.add(ef); upperFloors.push(ef); emporeTargets.push(ef);
    for (let z = zF + 1.1; z < zN - 0.3; z += 2.3) box(w, 0.16, 0.16, darkWoodMat, cx, EMP.y - 0.42, z); // Querbalken
    for (const x of (w > 4 ? [cx - w / 4, cx + w / 4] : [cx])) box(0.16, 0.14, d, darkWoodMat, x, EMP.y - 0.41, cz); // Längsbalken
  };
  // Westempore mit Treppenloch (x 11–13, z 27–31); Seitenemporen voll.
  plate(EMP.west.xL, STAIRS.xL, STAIRS.zTop, EMP.west.zN);     // links vom Loch
  plate(STAIRS.xR, EMP.west.xR, STAIRS.zTop, EMP.west.zN);     // rechts vom Loch
  plate(EMP.west.xL, EMP.west.xR, EMP.west.zF, STAIRS.zTop);   // Streifen vor dem Loch
  plate(EMP.left.xL, EMP.left.xR, EMP.left.zF, EMP.left.zN);
  plate(EMP.right.xL, EMP.right.xR, EMP.right.zF, EMP.right.zN);
  // Geländer an JEDER freien Kante – datengetrieben aus EMPORE_RAILINGS (gleiche Quelle wie der Test).
  for (const r of EMPORE_RAILINGS) emporeTargets.push(railing(root, steelMat, r.axis, r.at, r.a, r.b, EMP.y));
  // Säulen entlang der Seitengänge (x7 / x13) – enden UNTER der Emporenplatte (kein Kopf durch den Boden).
  const colMat = new THREE.MeshStandardMaterial({ color: 0xe4ddce, roughness: 0.9, metalness: 0 });
  const colH = EMP.y - 0.3;   // Platte liegt bei y≈4.7..5.0; Säule endet darunter
  const column = (x, z) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, colH, 16), colMat); c.position.set(x, colH / 2, z); root.add(c);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.22, 0.2, 16), colMat); cap.position.set(x, colH - 0.12, z); root.add(cap); };
  for (const z of [10, 15, 20, 25]) { column(EMP.left.xR, z); column(EMP.right.xL, z); }
  for (const x of [5.5, 14.5]) column(x, EMP.west.zF);   // Mittelachse frei lassen
  // Treppe steigt durch das Treppenloch: Fuß (y0) bei zBottom im Schiff, Kopf (y5) bei zTop auf der Empore.
  const st = STAIRS, n = st.steps, cx = (st.xL + st.xR) / 2, stepW = st.xR - st.xL, run = st.zBottom - st.zTop, rise = st.yTop, sd = run / n;
  for (let i = 0; i < n; i++) { const h = (rise / n) * (i + 1), z = st.zBottom - sd * (i + 0.5);
    // Stufenblock reicht UNTER den Boden (keine Fläche in der Bodenebene) und 6 cm in den unteren
    // Nachbarblock (keine koplanar-gleichen Seitenflächen). Oberkante bei y=h-0,06, liegt INNEN
    // in der Trittplatte -> keine gemeinsame Deckfläche von Block und Platte (kein Flackern).
    box(stepW, h + 0.14, sd + 0.06, darkWoodMat, cx, (h - 0.26) / 2, z + 0.03);
    box(stepW + 0.04, 0.1, sd + 0.04, woodMat, cx, h - 0.05, z); }  // Trittplatte (helle Oberfläche bei y=h)
  // Wange/Brüstung seitlich der Treppe (geschlossen) als Stirnseiten
  const stairTarget = new THREE.Mesh(new THREE.BoxGeometry(stepW, rise, run), new THREE.MeshBasicMaterial({ visible: false }));
  stairTarget.position.set(cx, rise / 2, (st.zTop + st.zBottom) / 2); stairTarget.userData = { stairs: true }; root.add(stairTarget);

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
  // (rechte Kapelle: kein hoher Kasten mehr – die Werke sollen frei sichtbar sein)
  // (Vorhalle: kein Kiosk-Kasten mehr)

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
    // Werk zeigt sich in echten Farben, unabhängig von Szenenlicht (emissiveMap beim Laden).
    const face = new THREE.MeshStandardMaterial({ color: 0xdcd8cf, roughness: 0.72, metalness: 0 });
    const mats = [edgeMat, edgeMat, edgeMat, edgeMat, face, edgeMat];
    const panel = new THREE.Mesh(new THREE.BoxGeometry(pw, ph, 0.04), mats);
    panel.position.set(w.x, w.y, w.z); panel.rotation.y = w.rotY;
    const normal = new THREE.Vector3(...w.normal);
    panel.userData = { work: w, center: panel.position.clone(), normal };
    root.add(panel); worksMeshes.push(panel); lazy.push({ panel, face, w, loaded: false });
    // Sammelwand (Zone 8): dichte Petersburger Hängung, gleichmäßig beleuchtet –
    // kein Einzel-Schlagschatten und kein Einzel-Lichtkegel (Tempo + Optik).
    if (w.curved) continue;
    // weicher Schlagschatten (gefälscht, kein Echtzeit-Schatten)
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(pw * 1.22, ph * 1.2), new THREE.MeshBasicMaterial({ map: sTex, transparent: true, depthWrite: false, opacity: 0.8 }));
    sh.position.copy(panel.position).addScaledVector(normal, -0.015); sh.position.y -= ph * 0.03; sh.rotation.y = w.rotY; root.add(sh);
    // vorgetäuschter Lichtkegel an der Wand (additiver Fleck – ersetzt den Werk-Spot)
    workGlow(panel.position, normal, Math.max(pw * 1.7, 0.9), Math.max(ph * 1.5, 1.3), w.rotY, ph);
  }
  function lazyLoad(camera, all = false) {
    let budget = all ? 999 : 3;
    for (const it of lazy) { if (it.loaded || budget <= 0) continue;
      if (!all) { vtmp.copy(it.panel.position); if (vtmp.distanceTo(camera.position) > 16) continue; }
      it.loaded = true; budget--;
      texLoader.load(BASE + 'works/' + it.w.slug + '.webp', tx => { tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = aniso; tx.generateMipmaps = true; tx.minFilter = THREE.LinearMipmapLinearFilter;
        it.face.map = tx; it.face.color.set(0xffffff);
        it.face.emissiveMap = tx; it.face.emissive.set(0xffffff); it.face.emissiveIntensity = it.w.nr === 302 ? 0.95 : 0.72;
        it.face.needsUpdate = true; });
    }
  }

  return { scene, envTex, pmrem, worksMeshes, raycastTargets: worksMeshes, loadMgr: new THREE.LoadingManager(), floors, upperFloors, emporeTargets, stairTarget, doorTriggers: [], lazyLoad };
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
    // Laibungspfosten 8 cm höher als die Fensteröffnung -> ihre Ober-/Unterkanten liegen INNEN
    // in den Wandbändern, nicht in deren Fugen (y1.2/3.6/7.2) -> kein koplanares Flackern.
    for (const dz of [-WIN_W / 2, WIN_W / 2]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.3, hh + 0.08, 0.12), brickMat); m.position.set(x, (ya + yb) / 2, zc + dz); root.add(m); }
  }
  // Die Bleiglas-Scheiben leuchten selbst (emissiv); farbige Bodenflecken setzt buildGallery
  // als additive Flächen (keine echten Lichter mehr).
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
    glass.rotation.y = Math.PI / 2; glass.position.set(xOuter + (face > 0 ? 0.02 : -0.02), (ya + yb) / 2, zc); root.add(glass); }
  // Kapellenfenster leuchten selbst (emissiv) – keine eigenen Lichter mehr.
}

function railing(root, mat, axis, at, a, b, y) {
  // sichtbarer Handlauf (zugleich Klick-Ziel „hoch") + Pfosten. Kein geschlossenes Panel,
  // damit man von der Empore ZWISCHEN den Pfosten auf den Schiffboden klicken kann (runter).
  const top = new THREE.Mesh(axis === 'z' ? new THREE.BoxGeometry(b - a, 0.08, 0.08) : new THREE.BoxGeometry(0.08, 0.08, b - a), mat);
  if (axis === 'z') top.position.set((a + b) / 2, y + EMP.rail, at); else top.position.set(at, y + EMP.rail, (a + b) / 2); top.userData = { emporeUp: true }; root.add(top);
  for (let t = a + 0.2; t <= b - 0.2; t += 0.9) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.04, EMP.rail, 0.04), mat); if (axis === 'z') p.position.set(t, y + EMP.rail / 2, at); else p.position.set(at, y + EMP.rail / 2, t); root.add(p); }
  return top;
}
