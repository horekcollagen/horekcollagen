// ============================================================================
//  Headless-Chromium-Harness (Playwright, SwiftShader-Software-WebGL) für
//  Szene-Prüfungen und Screenshots – unabhängig vom Browserfenster.
//    node tools/headless.mjs eval <datei.js>                 -> evaluiert Datei im Seitenkontext, druckt JSON
//    node tools/headless.mjs shot <x> <y> <z> <yaw> <pitch> <level> <out.png> [w] [h] [panelWerkNr]
//  Voraussetzung: Preview läuft auf http://localhost:4173 (npm run preview).
// ============================================================================
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const URL = process.env.HOREK_URL || 'http://localhost:4173/';
const [cmd, ...rest] = process.argv.slice(2);

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'],
});
const W0 = cmd === 'shot' ? (+rest[7] || 1600) : 1280, H0 = cmd === 'shot' ? (+rest[8] || 900) : 800;
const page = await browser.newPage({ viewport: { width: W0, height: H0 }, deviceScaleFactor: 1 });
page.on('pageerror', e => console.error('PAGEERROR', e.message));
const werkNr = cmd === 'shot' ? rest[9] : null;
await page.goto(werkNr ? URL + '?werk=' + werkNr : URL, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => !!window.__gallery, null, { timeout: 30000 });
await page.evaluate(() => { const b = document.querySelector('#enter'); if (b && !b.disabled) b.click(); const c = document.querySelector('#cover'); if (c) c.style.display = 'none'; });
await page.waitForTimeout(400);

if (cmd === 'eval') {
  const code = readFileSync(rest[0], 'utf8');
  const result = await page.evaluate(code);
  console.log(JSON.stringify(result, null, 2));
} else if (cmd === 'shot') {
  const [x, y, z, yaw, pitch, level] = rest.slice(0, 6).map(Number);
  const out = rest[6];
  await page.evaluate(([x, y, z, yaw, pitch, level, werkNr]) => {
    const g = window.__gallery, { camera, renderer, scene, controls, composer } = g;
    renderer.setPixelRatio(1); renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); if (composer) composer.setSize(innerWidth, innerHeight);
    if (!werkNr) { controls.mode = 'free'; controls.focus = null; controls.anim = null; controls.level = level;
      controls.state.x = x; controls.state.z = z; controls.state.yaw = yaw; controls.state.pitch = pitch; controls.apply();
      camera.position.set(x, y, z); camera.rotation.set(pitch, yaw, 0, 'YXZ'); }
    for (let i = 0; i < 40; i++) { if (controls.g.lazyLoad) controls.g.lazyLoad(camera, true);
      if (!werkNr) { camera.position.set(x, y, z); camera.rotation.set(pitch, yaw, 0, 'YXZ'); }
      (composer ? composer.render() : renderer.render(scene, camera)); }
  }, [x, y, z, yaw, pitch, level, werkNr]);
  await page.waitForTimeout(500);
  if (process.env.HOREK_HIDE_PLANES) await page.evaluate(() => { window.__gallery.scene.traverse(o => { if (o.isMesh && o.geometry.type === 'PlaneGeometry' && !(o.userData && o.userData.work)) o.visible = false; }); });
  await page.evaluate(() => { const g = window.__gallery; (g.composer ? g.composer.render() : g.renderer.render(g.scene, g.camera)); });
  await page.screenshot({ path: out });
  console.log('shot saved: ' + out);
}
await browser.close();
