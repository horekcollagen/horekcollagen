// ============================================================================
//  Canvas-basierte Beschriftung: Werkschilder, Eingangstext, Raumnummern.
// ============================================================================
import * as THREE from 'three';

const FONT = '-apple-system, "Segoe UI", Helvetica, Arial, sans-serif';

function cm(mm) { return (mm / 10).toLocaleString('de-DE'); }

// Allgemeine Textfläche (transparent oder mit Hintergrund).
export function makeTextPlane(text, { size = 0.15, w = 1.0, color = '#1a1714', weight = 600, bg = null } = {}) {
  const px = 1024;
  const aspect = 0.32; // Höhe/Breite der Fläche
  const c = document.createElement('canvas'); c.width = px; c.height = Math.round(px * aspect);
  const g = c.getContext('2d');
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height); }
  g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `${weight} ${Math.round(c.height * 0.5)}px ${FONT}`;
  g.fillText(text, c.width / 2, c.height / 2);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, w * aspect), mat);
  return mesh;
}

// Werkschild (weiße Tafel): Titel, „Collage auf Holz, Unikat", Maße.
export function makeLabelMesh(wk) {
  const W = 1024, H = 640;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#faf8f4'; g.fillRect(0, 0, W, H);
  g.strokeStyle = '#e4e0d8'; g.lineWidth = 6; g.strokeRect(3, 3, W - 6, H - 6);
  const pad = 70;
  g.textAlign = 'left'; g.textBaseline = 'top';
  // Titel (ggf. zweizeilig)
  g.fillStyle = '#1b1814'; g.font = `700 76px ${FONT}`;
  const words = wk.title.split(' '); let line = '', y = pad; const lines = [];
  for (const wd of words) {
    const test = line ? line + ' ' + wd : wd;
    if (g.measureText(test).width > W - pad * 2 && line) { lines.push(line); line = wd; }
    else line = test;
  }
  lines.push(line);
  for (const l of lines.slice(0, 2)) { g.fillText(l, pad, y); y += 84; }
  y += 14;
  g.fillStyle = '#6b655c'; g.font = `400 52px ${FONT}`;
  g.fillText('Collage auf Holz, Unikat', pad, y); y += 74;
  const prefix = wk.approx === false ? '' : 'ca. ';
  g.fillStyle = '#2a2621'; g.font = `500 56px ${FONT}`;
  g.fillText(`${prefix}${cm(wk.h)} × ${cm(wk.b)} cm`, pad, y);

  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const mat = new THREE.MeshBasicMaterial({ map: tex });
  const w = 0.22;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, w * (H / W)), mat);
}
