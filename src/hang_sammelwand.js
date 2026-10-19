// ============================================================================
//  Petersburger Hängung der Sammelwand (Zone 8) auf der runden Apsiswand.
//  Reine Geometrie/Packung (kein three.js) -> in Node testbar und offline backbar.
//  Raster-Packer (Bottom-Left-Fill) füllt auch Taschen -> dichte Hängung.
//  - 17 Anker (lange Seite ≥65 cm) im unteren Drittel, gleichmäßig über die
//    Wandbreite verteilt (bodennah), bilden das Gerüst.
//  - Die kleineren füllen dicht dazwischen und darüber, 8–10 cm Abstand.
//  - Um Garten Eden (Mitte unten) bleibt ein freier Rand ≥1 m.
//  Abwicklung: u = Bogenlänge auf rHang (0..U), v = Höhe. (u,v)->Welt über θ.
// ============================================================================
import { APSE, APSE_HANG } from './layout.js';

function toWorld(u, v, rHang, thetaMin) {
  const theta = thetaMin + u / rHang;
  return { x: APSE.cx + rHang * Math.sin(theta), y: v, z: APSE.cz + rHang * Math.cos(theta),
    rotY: theta + Math.PI, normal: [-Math.sin(theta), 0, -Math.cos(theta)] };
}
function mk(w, place) {
  return { nr: w.nr, slug: String(w.nr), title: w.titel, year: (w.jahr ?? null), price: (w.preis_eur ?? null),
    h: w.hoehe_cm * 10, b: w.breite_cm * 10, approx: !!w.masse_ca, text: '', zone: 8, level: 'unten',
    x: place.x, y: place.y, z: place.z, rotY: place.rotY, normal: place.normal, curved: true };
}

export function hangSammelwand(raw) {
  const H = APSE_HANG, rHang = H.rHang;
  const thetaMin = Math.PI / 2 + H.thetaMargin;
  const U = rHang * (Math.PI - 2 * H.thetaMargin);     // Wandbreite (Bogenlänge)
  const V0 = H.vBottom, V1 = H.vTop, gap = H.gap, m = 0.08;
  const gu0 = U / 2 - (H.gartenEdenW / 2 + H.gartenEdenClear);
  const gu1 = U / 2 + (H.gartenEdenW / 2 + H.gartenEdenClear);
  const gv = H.gartenEdenTop + H.gartenEdenClear;

  const res = 0.03, NU = Math.ceil(U / res), NV = Math.ceil((V1 - V0) / res);
  const occ = new Uint8Array(NU * NV);
  const idx = (iu, iv) => iv * NU + iu;
  for (let iu = 0; iu < NU; iu++) { const u = iu * res;
    for (let iv = 0; iv < NV; iv++) { const v = V0 + iv * res;
      if (u < m || u > U - m || (u >= gu0 && u <= gu1 && v <= gv)) occ[idx(iu, iv)] = 1; } }

  const fits = (iu, iv, wc, hc) => { if (iu < 0 || iv < 0 || iu + wc > NU || iv + hc > NV) return false;
    for (let a = iu; a < iu + wc; a++) for (let b = iv; b < iv + hc; b++) if (occ[idx(a, b)]) return false; return true; };
  const fill = (iu, iv, wc, hc) => { for (let a = iu; a < iu + wc; a++) for (let b = iv; b < iv + hc; b++) occ[idx(a, b)] = 1; };
  // niedrigste freie Stelle (Bottom-Left); preferU: Spalten nahe diesem u zuerst
  function findSpot(wm, hm, preferU) {
    const wc = Math.max(1, Math.round((wm + gap) / res)), hc = Math.max(1, Math.round((hm + gap) / res));
    const cols = [];
    for (let iu = 0; iu + wc <= NU; iu++) cols.push(iu);
    if (preferU != null) { const c = preferU / res; cols.sort((a, b) => Math.abs(a + wc / 2 - c) - Math.abs(b + wc / 2 - c)); }
    for (let iv = 0; iv + hc <= NV; iv++) for (const iu of cols) if (fits(iu, iv, wc, hc)) return { iu, iv, wc, hc };
    return null;
  }
  const commit = (w, spot) => { fill(spot.iu, spot.iv, spot.wc, spot.hc);
    const wm = w.breite_cm / 100, hm = w.hoehe_cm / 100;
    const uc = spot.iu * res + (spot.wc * res) / 2, vc = V0 + spot.iv * res + (spot.hc * res) / 2;
    return mk(w, toWorld(uc, vc, rHang, thetaMin)); };

  const items = raw.map(w => ({ w, wm: w.breite_cm / 100, hm: w.hoehe_cm / 100, long: Math.max(w.hoehe_cm, w.breite_cm) / 100 }));
  const anchors = items.filter(it => it.long >= 0.65).sort((a, b) => b.wm - a.wm);
  const rest = items.filter(it => it.long < 0.65).sort((a, b) => b.wm * b.hm - a.wm * a.hm);

  const works = [], overflow = [];
  // Anker: gleichmäßig verteilte Ziel-u (GE-Band aussparen), niedrigste Stelle nahe dem Ziel
  const wA = gu0 - m, wB = (U - m) - gu1, wAll = wA + wB;
  anchors.forEach((a, k) => {
    const t = (k + 0.5) / anchors.length * wAll;
    const preferU = t < wA ? m + t : gu1 + (t - wA);
    const spot = findSpot(a.wm, a.hm, preferU);
    if (spot) works.push(commit(a.w, spot)); else overflow.push(a.w);
  });
  // Rest: dicht von unten, füllt auch Taschen
  for (const it of rest) { const spot = findSpot(it.wm, it.hm, null);
    if (spot) works.push(commit(it.w, spot)); else overflow.push(it.w); }

  let topUsed = V0; for (let iu = 0; iu < NU; iu++) for (let iv = NV - 1; iv >= 0; iv--) if (occ[idx(iu, iv)]) { topUsed = Math.max(topUsed, V0 + (iv + 1) * res); break; }
  return { works, overflow, bildwand: [],
    stats: { U: +U.toFixed(2), V0, V1, placed: works.length, overflow: overflow.length,
      anchors: anchors.length, topUsed: +topUsed.toFixed(2), rHang, thetaMin: +thetaMin.toFixed(3) } };
}
