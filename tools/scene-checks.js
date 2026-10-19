// ============================================================================
//  Szene-Prüfungen im Browser (brauchen die gebaute 3D-Geometrie, daher nicht
//  im Node-`npm test`). In der Galerie betreten, dann in der Konsole:
//      await import('/tools/scene-checks.js').then(m => m.runSceneChecks())
//  oder den Rumpf dieser Datei in die Konsole einfügen und runSceneChecks() rufen.
//  Prüft: (A) Hintergrund-Raster – 0 Pixel in Hintergrundfarbe von allen
//  begehbaren Punkten; (B) jedes Werk hat <=5 cm hinter der Fläche eine Wand
//  (Ausnahme: Garten Eden, Zone 4, steht frei auf dem Podest) und überdeckt
//  kein anderes Werk.  Rechtecke spiegeln layout.js GROUND/UPPER.
// ============================================================================
const GROUND = [[4.4, 15.6, 6.9, 30.6, 0], [6.5, 13.5, 2.4, 6.9, 0], [7.4, 12.6, 31, 35.6, 0],
  [0.4, 4.6, 14.4, 18.6, 0], [15.4, 19.6, 14.4, 18.6, 0], [8.6, 11.4, 6, 7, 0], [7.2, 12.8, 30.3, 31.2, 0]];
const UPPER = [[4.4, 10.8, 26.4, 30.6, 5], [13.2, 15.6, 26.4, 30.6, 5], [10.8, 13.2, 26.4, 27, 5],
  [4.4, 6.6, 8.4, 26.6, 5], [13.4, 15.6, 8.4, 26.6, 5]];

export function runSceneChecks(gallery = window.__gallery) {
  const THREE = gallery.THREE, scene = gallery.scene, gal = gallery.controls.g;
  const ray = new THREE.Raycaster();
  const all = []; scene.traverse(o => { if (o.isMesh && o.visible) all.push(o); });
  const occ = all.filter(o => !(o.userData && o.userData.work));

  // (A) Hintergrund-Raster: 2-m-Raster, je 8 Richtungen + nach oben
  let pts = 0, bg = 0;
  for (const [xL, xR, zF, zN, yb] of [...GROUND, ...UPPER])
    for (let x = xL + 0.2; x <= xR - 0.2; x += 2) for (let z = zF + 0.2; z <= zN - 0.2; z += 2) {
      pts++;
      const dirs = []; for (let a = 0; a < 360; a += 45) { const r = a * Math.PI / 180; dirs.push([Math.sin(r), 0, -Math.cos(r)]); } dirs.push([0, 1, 0]);
      for (const d of dirs) { ray.set(new THREE.Vector3(x, yb + 1.6, z), new THREE.Vector3(...d)); if (!ray.intersectObjects(all, false).length) bg++; }
    }

  // (B) Werke an der Wand (Ecken + Mitte, <=5 cm) + keine Überdeckung
  let noWall = 0; const noWallList = [];
  for (const mesh of gal.worksMeshes) {
    const w = mesh.userData.work, n = mesh.userData.normal, c = mesh.userData.center;
    if (w.zone === 4) continue;                       // Garten Eden: freistehend auf dem Podest
    const pw = w.b / 1000, ph = w.h / 1000, rv = new THREE.Vector3(-n.z, 0, n.x), up = new THREE.Vector3(0, 1, 0);
    let miss = 0;
    for (const sx of [-0.48, 0, 0.48]) for (const sy of [-0.48, 0, 0.48]) {
      const p = c.clone().addScaledVector(rv, sx * pw).addScaledVector(up, sy * ph).addScaledVector(n, -0.02);
      ray.set(p, n.clone().multiplyScalar(-1)); ray.far = 0.05;
      if (!ray.intersectObjects(occ, false)[0]) miss++;
    }
    if (miss > 0) { noWall++; noWallList.push(w.nr); }
  }
  const boxes = gal.worksMeshes.map(m => { m.updateMatrixWorld(); return new THREE.Box3().setFromObject(m); });
  let overlaps = 0; for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) if (boxes[i].intersectsBox(boxes[j])) overlaps++;

  const copl = coplanarOverlaps(gallery);
  const res = { bgPoints: pts, bgHits: bg, worksNoWall: noWall, worksNoWallList: noWallList, worksOverlaps: overlaps, coplanar: copl.pairs };
  const ok = bg === 0 && noWall === 0 && overlaps === 0 && copl.pairs === 0;
  console.log('Szene-Prüfung:');
  console.log('  ' + (bg === 0 ? '✓' : '✗') + ` Hintergrund-Raster: ${bg} Hintergrund-Treffer aus ${pts} Punkten (×9 Richtungen)`);
  console.log('  ' + (noWall === 0 ? '✓' : '✗') + ` Werke an der Wand (<=5 cm): ${noWall} ohne Wand (ausgenommen Garten Eden/Podest)`);
  console.log('  ' + (overlaps === 0 ? '✓' : '✗') + ` keine Überdeckung: ${overlaps} überlappende Werkpaare`);
  console.log('  ' + (copl.pairs === 0 ? '✓' : '✗') + ` keine koplanaren Flächen: ${copl.pairs} sichtbar flackernde Flächenpaare`);
  console.log(ok ? '\nSzene-Prüfung gruen.' : '\nSzene-Prüfung ROT.');
  return res;
}

// ---- (C) Koplanar-Prüfung: sichtbar flackernde Flächen verschiedener Bauteile ----
//  Findet Paare von Flächen (verschiedener Meshes), die in DERSELBEN Ebene liegen (±1 mm),
//  sich überlappen, von derselben Seite sichtbar sind (gleiche Normalenrichtung ODER DoubleSide)
//  und sich im Aussehen unterscheiden (Farbe/Textur) -> genau das flackert (Z-Fighting).
//  Flächen, die innen in anderem Volumen verdeckt liegen, zählen nicht (sie sind nie sichtbar).
//  Ziel: 0.
export function coplanarOverlaps(gallery = window.__gallery) {
  const THREE = gallery.THREE, scene = gallery.scene, DOUBLE = THREE.DoubleSide;
  const meshes = [], boxAABB = [];
  scene.traverse(o => {
    if (!o.isMesh || !o.geometry) return; const m = o.material; if (m && m.transparent) return;
    if (o.userData && (o.userData.work || o.userData.stairs)) return;
    if (!/Box|Extrude/.test(o.geometry.type)) return;
    meshes.push(o);
    if (o.geometry.type === 'BoxGeometry') { o.geometry.computeBoundingBox(); boxAABB.push({ o, bb: o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld) }); }
  });
  const inSolid = (x, y, z, exA, exB) => { const e = 0.004;
    for (const { o, bb } of boxAABB) { if (o === exA || o === exB) continue;
      if (x > bb.min.x + e && x < bb.max.x - e && y > bb.min.y + e && y < bb.max.y - e && z > bb.min.z + e && z < bb.max.z - e) return true; }
    return false; };
  const key = (n, d) => `${n.x.toFixed(2)},${n.y.toFixed(2)},${n.z.toFixed(2)}|${d.toFixed(2)}`;
  const bins = new Map();
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), n = new THREE.Vector3(), cn = new THREE.Vector3();
  for (let mi = 0; mi < meshes.length; mi++) {
    const mesh = meshes[mi]; mesh.updateMatrixWorld();
    const geo = mesh.geometry, pos = geo.attributes.position, idx = geo.index, mw = mesh.matrixWorld;
    const dbl = mesh.material && mesh.material.side === DOUBLE;
    const col = (mesh.material && mesh.material.color && mesh.material.color.getHex()) || 0, hasMap = !!(mesh.material && mesh.material.map);
    const cnt = idx ? idx.count : pos.count;
    for (let i = 0; i < cnt; i += 3) {
      const a = idx ? idx.getX(i) : i, b = idx ? idx.getX(i + 1) : i + 1, c = idx ? idx.getX(i + 2) : i + 2;
      A.fromBufferAttribute(pos, a).applyMatrix4(mw); B.fromBufferAttribute(pos, b).applyMatrix4(mw); C.fromBufferAttribute(pos, c).applyMatrix4(mw);
      n.copy(B).sub(A).cross(C.clone().sub(A)); if (n.lengthSq() < 1e-10) continue; n.normalize();
      const nx = n.x, ny = n.y, nz = n.z; cn.copy(n);
      if (cn.x < -1e-4 || (Math.abs(cn.x) < 1e-4 && cn.y < -1e-4) || (Math.abs(cn.x) < 1e-4 && Math.abs(cn.y) < 1e-4 && cn.z < 0)) cn.negate();
      const dExact = cn.dot(A), k = key(cn, dExact);
      let ux = -cn.y, uy = cn.x, uz = 0, ul = Math.hypot(ux, uy, uz); if (ul < 1e-5) { ux = 1; uy = 0; uz = 0; ul = 1; } ux /= ul; uy /= ul; uz /= ul;
      const vx = cn.y * uz - cn.z * uy, vy = cn.z * ux - cn.x * uz, vz = cn.x * uy - cn.y * ux;
      const pr = p => [p.x * ux + p.y * uy + p.z * uz, p.x * vx + p.y * vy + p.z * vz];
      const pa = pr(A), pb = pr(B), pc = pr(C);
      const box = [Math.min(pa[0], pb[0], pc[0]), Math.min(pa[1], pb[1], pc[1]), Math.max(pa[0], pb[0], pc[0]), Math.max(pa[1], pb[1], pc[1])];
      if (!bins.has(k)) bins.set(k, []);
      bins.get(k).push({ mi, box, nx, ny, nz, dbl, col, hasMap, cnx: cn.x, cny: cn.y, cnz: cn.z, dExact });
    }
  }
  const TOL = 0.02, DPLANE = 0.001, seen = new Set(); let pairs = 0; const list = [];
  for (const [, arr] of bins) {
    if (arr.length < 2) continue;
    for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) {
      const a = arr[i], b = arr[j]; if (a.mi === b.mi) continue;
      if (Math.abs(a.dExact - b.dExact) > DPLANE) continue;
      const dot = a.nx * b.nx + a.ny * b.ny + a.nz * b.nz;
      if (!(dot > 0.9 || (dot < -0.9 && (a.dbl || b.dbl)))) continue;
      if (a.col === b.col && a.hasMap === b.hasMap) continue;
      const ox = Math.min(a.box[2], b.box[2]) - Math.max(a.box[0], b.box[0]);
      const oy = Math.min(a.box[3], b.box[3]) - Math.max(a.box[1], b.box[1]);
      if (ox <= TOL || oy <= TOL) continue;
      const uc = (Math.max(a.box[0], b.box[0]) + Math.min(a.box[2], b.box[2])) / 2;
      const vc = (Math.max(a.box[1], b.box[1]) + Math.min(a.box[3], b.box[3])) / 2;
      let bux = -a.cny, buy = a.cnx, buz = 0, bl = Math.hypot(bux, buy, buz); if (bl < 1e-5) { bux = 1; buy = 0; buz = 0; bl = 1; } bux /= bl; buy /= bl; buz /= bl;
      const bvx = a.cny * buz - a.cnz * buy, bvy = a.cnz * bux - a.cnx * buz, bvz = a.cnx * buy - a.cny * bux;
      const Q = [a.cnx * a.dExact + uc * bux + vc * bvx, a.cny * a.dExact + uc * buy + vc * bvy, a.cnz * a.dExact + uc * buz + vc * bvz];
      const s = 0.03, MA = meshes[a.mi], MB = meshes[b.mi];
      const front = inSolid(Q[0] + a.nx * s, Q[1] + a.ny * s, Q[2] + a.nz * s, MA, MB);
      const back = inSolid(Q[0] - a.nx * s, Q[1] - a.ny * s, Q[2] - a.nz * s, MA, MB);
      if (dot > 0) { if (front) continue; } else if (front && back) continue;
      const pk = a.mi < b.mi ? a.mi + '-' + b.mi : b.mi + '-' + a.mi;
      if (seen.has(pk)) continue; seen.add(pk); pairs++;
      if (list.length < 12) list.push({ at: Q.map(v => +v.toFixed(2)) });
    }
  }
  return { pairs, list };
}
