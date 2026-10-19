// ============================================================================
//  Hängung: berechnet aus werke_kirche.json für jedes Werk Wand + Weltposition.
//  Liefert Objekte { nr,title,year,price,h,b,approx,zone,level, x,y,z,rotY,
//  normal:[..], slug }.  slug = Werknummer (Textur public/works/<nr>.webp).
//  Koordinaten: x quer, z längs (Apsis 0 … Tür 36), y Höhe.
// ============================================================================
import { NAVE, APSE, CHAPEL, VEST, EMP, BILDWAND, PODIUM, WIN_ZC } from './layout.js';

const OFF = 0.2;   // > halbe Wandstärke (0,125), sonst steckt das Werk in der Wand
const N = { pX: [1, 0, 0], nX: [-1, 0, 0], pZ: [0, 0, 1], nZ: [0, 0, -1] };
const rot = { pX: Math.PI / 2, nX: -Math.PI / 2, pZ: 0, nZ: Math.PI };

function mk(w, x, y, z, dir) {
  return { nr: w.nr, slug: String(w.nr), title: w.titel, year: w.jahr, price: w.preis_eur,
    h: w.hoehe_cm * 10, b: w.breite_cm * 10, approx: !!w.masse_ca, text: '', zone: w.zone,
    level: (w.zone === 6 || w.zone === 7) ? 'empore' : 'unten',
    x, y, z, rotY: rot[dir], normal: N[dir] };
}

// Shelf-Packer für die dichte Bildwand (ein Block in Rechteck [x0,x1], Mitte yMid).
function packBlock(list, x0, x1, yMid, dir, z, gap = 0.09) {
  const W = x1 - x0; const rows = []; let row = [], rw = 0, rh = 0;
  for (const w of list) { const bw = w.breite_cm / 100, bh = w.hoehe_cm / 100;
    if (row.length && rw + gap + bw > W) { rows.push({ items: row, w: rw, h: rh }); row = []; rw = 0; rh = 0; }
    row.push({ w, bw, bh }); rw += (row.length > 1 ? gap : 0) + bw; rh = Math.max(rh, bh); }
  if (row.length) rows.push({ items: row, w: rw, h: rh });
  const totalH = rows.reduce((s, r) => s + r.h, 0) + gap * (rows.length - 1);
  let y = yMid + totalH / 2;                 // oben beginnen
  const out = [];
  for (const r of rows) { y -= r.h / 2; let x = x0 + (W - r.w) / 2;   // Reihe zentrieren
    for (const it of r.items) { x += it.bw / 2; out.push(mk(it.w, x, y, z, dir)); x += it.bw / 2 + gap; }
    y -= r.h / 2 + gap; }
  return out;
}

export function hangAll(RAW) {
  const byZone = z => RAW.filter(w => w.zone === z).sort((a, b) => a.reihenfolge - b.reihenfolge);
  const out = [];
  const xL = NAVE.xL + OFF, xR = NAVE.xR - OFF;

  // ---------- Zone 1: Vorhalle / unter Westempore ----------
  const z1 = byZone(1);
  out.push(mk(z1[0], 5.5, 1.6, VEST.zF + OFF, 'pZ'));   // 309 – beim Betreten links
  out.push(mk(z1[1], 14.5, 1.6, VEST.zF + OFF, 'pZ'));  // 278 – beim Betreten rechts
  const z1rest = z1.slice(2); const zs1 = [27, 28.5, 30];
  z1rest.forEach((w, i) => { const left = i % 2 === 0; const zz = zs1[Math.floor(i / 2)];
    out.push(mk(w, left ? xL : xR, 1.5, zz, left ? 'pX' : 'nX')); });

  // ---------- Zone 2: Schiff, 6 je Seite zwischen den Fenstern ----------
  const z2 = byZone(2); const zs2 = [9, 13.5, 15.5, 17.5, 19.5, 22.5];
  let li = 0, ri = 0;
  z2.forEach((w, i) => { const left = i % 2 === 0;
    if (left) { out.push(mk(w, xL, 1.5, zs2[li++], 'pX')); } else { out.push(mk(w, xR, 1.5, zs2[ri++], 'nX')); } });

  // ---------- Zone 3: Bildwand, dichte Hängung (links 16, rechts 15) ----------
  const z3 = byZone(3);
  const left3 = z3.slice(0, 16), right3 = z3.slice(16);
  out.push(...packBlock(left3, BILDWAND.left.xL + 0.15, BILDWAND.left.xR - 0.15, 2.0, 'pZ', BILDWAND.z + OFF));
  out.push(...packBlock(right3, BILDWAND.right.xL + 0.15, BILDWAND.right.xR - 0.15, 2.0, 'pZ', BILDWAND.z + OFF));
  // 153 auf Augenhöhe nah an der Öffnung (linker Block, innen)
  const w153 = out.find(o => o.nr === 153); if (w153) { w153.y = 1.6; w153.x = BILDWAND.left.xR - 0.4 - (w153.b / 1000) / 2; }

  // ---------- Zone 4: Apsis, Garten Eden auf dem Podest ----------
  const g = byZone(4)[0];
  out.push(mk(g, PODIUM.x, PODIUM.h + (g.hoehe_cm / 100) / 2, PODIUM.z - PODIUM.d / 2 - 0.05, 'pZ'));

  // ---------- Zone 5: Kapellen ----------
  const z5 = byZone(5);
  const chapelSlots = (side) => { const c = side === 'l' ? CHAPEL.left : CHAPEL.right; const xc = (c.xL + c.xR) / 2;
    return side === 'l'
      ? [[c.xL + OFF, 16.5, 'pX'], [xc, CHAPEL.zF + OFF, 'pZ'], [xc, CHAPEL.zN - OFF, 'nZ']]
      : [[c.xR - OFF, 16.5, 'nX'], [xc, CHAPEL.zF + OFF, 'pZ'], [xc, CHAPEL.zN - OFF, 'nZ']]; };
  for (const side of ['l', 'r']) { const items = z5.filter(w => (w.seite || '')[0] === side); const slots = chapelSlots(side);
    items.forEach((w, i) => { const [a, b, dir] = slots[i % slots.length]; const x = dir === 'pX' || dir === 'nX' ? a : a; const z = dir === 'pZ' || dir === 'nZ' ? b : 16.5;
      out.push(mk(w, dir.endsWith('X') ? a : a, 1.5, dir.endsWith('Z') ? b : 16.5, dir)); }); }

  // ---------- Zone 6: Westempore, Reihe an der Rückwand (z31), Blick vom Schiff ----------
  const z6 = byZone(6); const xs6 = [5, 7, 9, 11, 13, 15];
  z6.forEach((w, i) => out.push(mk(w, xs6[i] ?? (5 + i * 2), EMP.y + 1.6, EMP.west.zN - OFF, 'nZ')));

  // ---------- Zone 7: Seitenemporen, Außenwände zwischen oberen Fenstern ----------
  const z7 = byZone(7); const zs7 = [9, 12.5, 15, 17.5, 19.5, 22.5];
  for (const side of ['l', 'r']) { const items = z7.filter(w => (w.seite || '')[0] === side);
    items.forEach((w, i) => out.push(mk(w, side === 'l' ? xL : xR, EMP.y + 1.6, zs7[i] ?? (9 + i * 2.5), side === 'l' ? 'pX' : 'nX'))); }

  return out;
}
