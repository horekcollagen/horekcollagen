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

  // (B) Werke an der Wand (<=5 cm) + keine Überdeckung.
  //   Flache Werke (Zonen 1–7): Strahl 5 cm hinter die Fläche sucht die Wand, AABB-Überdeckung.
  //   Sammelwand (Zone 8, gekrümmte Wand): die schräg stehenden Paneele haben dicke AABBs ->
  //   stattdessen radialer Abstand zur Apsisachse (auf der Trommel) + Überdeckung in der
  //   Abwicklung (u = Bogenlänge, v = Höhe). Konstanten spiegeln layout.js APSE/APSE_HANG.
  const APSE_CX = 10, APSE_CZ = 5, RHANG = 4.9, THETAMIN = Math.PI / 2 + 0.07;
  const uOf = c => RHANG * (Math.atan2(c.x - APSE_CX, c.z - APSE_CZ) - THETAMIN);
  let noWall = 0; const noWallList = []; const flat = [], curved = [];
  for (const mesh of gal.worksMeshes) {
    const w = mesh.userData.work, n = mesh.userData.normal, c = mesh.userData.center;
    if (w.zone === 4) continue;                       // Garten Eden: freistehend auf dem Podest
    if (w.zone === 8 || w.curved) {
      const rad = Math.hypot(c.x - APSE_CX, c.z - APSE_CZ);
      if (rad < RHANG - 0.06 || rad > 5.02) { noWall++; noWallList.push(w.nr); }   // nicht auf der Trommel
      curved.push({ w, c }); continue;
    }
    const pw = w.b / 1000, ph = w.h / 1000, rv = new THREE.Vector3(-n.z, 0, n.x), up = new THREE.Vector3(0, 1, 0);
    let miss = 0;
    for (const sx of [-0.48, 0, 0.48]) for (const sy of [-0.48, 0, 0.48]) {
      const p = c.clone().addScaledVector(rv, sx * pw).addScaledVector(up, sy * ph).addScaledVector(n, -0.02);
      ray.set(p, n.clone().multiplyScalar(-1)); ray.far = 0.05;
      if (!ray.intersectObjects(occ, false)[0]) miss++;
    }
    if (miss > 0) { noWall++; noWallList.push(w.nr); }
    flat.push(mesh);
  }
  const boxes = flat.map(m => { m.updateMatrixWorld(); return new THREE.Box3().setFromObject(m); });
  let overlaps = 0;
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) if (boxes[i].intersectsBox(boxes[j])) overlaps++;
  const crect = curved.map(({ w, c }) => { const u = uOf(c), wm = w.b / 1000, hm = w.h / 1000; return { u0: u - wm / 2, u1: u + wm / 2, v0: c.y - hm / 2, v1: c.y + hm / 2 }; });
  for (let i = 0; i < crect.length; i++) for (let j = i + 1; j < crect.length; j++) { const a = crect[i], b = crect[j];
    if (Math.min(a.u1, b.u1) - Math.max(a.u0, b.u0) > 0.004 && Math.min(a.v1, b.v1) - Math.max(a.v0, b.v0) > 0.004) overlaps++; }

  const res = { bgPoints: pts, bgHits: bg, worksNoWall: noWall, worksNoWallList: noWallList, worksOverlaps: overlaps };
  const ok = bg === 0 && noWall === 0 && overlaps === 0;
  console.log('Szene-Prüfung:');
  console.log('  ' + (bg === 0 ? '✓' : '✗') + ` Hintergrund-Raster: ${bg} Hintergrund-Treffer aus ${pts} Punkten (×9 Richtungen)`);
  console.log('  ' + (noWall === 0 ? '✓' : '✗') + ` Werke an der Wand (<=5 cm): ${noWall} ohne Wand (ausgenommen Garten Eden/Podest)`);
  console.log('  ' + (overlaps === 0 ? '✓' : '✗') + ` keine Überdeckung: ${overlaps} überlappende Werkpaare`);
  console.log(ok ? '\nSzene-Prüfung gruen.' : '\nSzene-Prüfung ROT.');
  return res;
}
