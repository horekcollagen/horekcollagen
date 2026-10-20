// ============================================================================
//  Großansicht-Test (Browser, headless): Klick auf je ein Werk pro Zone öffnet
//  die Großansicht mit dem richtigen Werk; die Lupe erscheint über der Groß-
//  ansicht (nicht über der Wand); Esc schließt.  Voraussetzung: Preview läuft.
//    node tools/grossansicht-test.mjs
// ============================================================================
import { chromium } from 'playwright';
const URL = process.env.HOREK_URL || 'http://localhost:4173/';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1 });
page.on('pageerror', e => console.error('PAGEERROR', e.message));
await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => !!window.__gallery, null, { timeout: 30000 });
await page.evaluate(() => { const b = document.querySelector('#enter'); if (b && !b.disabled) b.click(); const c = document.querySelector('#cover'); if (c) c.style.display = 'none'; });
await page.waitForTimeout(300);

// je ein Werk pro Zone; in Zone 8 (Sammelwand) das aus der obersten Reihe (höchstes y)
const works = await page.evaluate(() => {
  const g = window.__gallery, byZone = {};
  for (const m of g.controls.g.worksMeshes) { const w = m.userData.work, z = w.zone, y = m.userData.center.y;
    if (!byZone[z] || (z === 8 && y > byZone[z].y)) byZone[z] = { nr: w.nr, title: w.title, zone: z, y }; }
  return Object.values(byZone).sort((a, b) => a.zone - b.zone);
});

let pass = 0, fail = 0; const lines = [];
async function clickWork(nr) { await page.evaluate(n => { const g = window.__gallery; const m = g.controls.g.worksMeshes.find(x => x.userData.work.nr === n); g.controls._focusWork(m); }, nr); }
async function waitZoom(title) { return page.waitForFunction(t => document.body.classList.contains('zoom-open') && (document.querySelector('.ptitle') || {}).textContent === t, title, { timeout: 6000 }).then(() => true).catch(() => false); }

console.log('Großansicht-Test:');
for (const w of works) {
  await clickWork(w.nr);
  const opened = await waitZoom(w.title);
  await page.keyboard.press('Escape');
  const closed = await page.waitForFunction(() => !document.body.classList.contains('zoom-open'), null, { timeout: 4000 }).then(() => true).catch(() => false);
  await page.waitForFunction(() => window.__gallery.controls.mode === 'free', null, { timeout: 4000 }).catch(() => {});
  const good = opened && closed; good ? pass++ : fail++;
  lines.push(`  ${good ? '✓' : '✗'} Zone ${w.zone} #${w.nr} „${w.title}"${w.zone === 8 ? ' (oberste Reihe, y=' + w.y.toFixed(1) + ')' : ''}: öffnet ${opened ? 'ja' : 'NEIN'}, Esc schließt ${closed ? 'ja' : 'NEIN'}`);
}
lines.forEach(l => console.log(l));

// Lupe NUR über der Großansicht: Wand-Lupe (_lensMove) entfernt?
const noWallLens = await page.evaluate(() => typeof window.__gallery.controls._lensMove === 'undefined');
// großes Sammelwand-Werk öffnen, Maus über die Großansicht -> Lupe sichtbar; Maus in die Ecke (nur Backdrop) -> Lupe aus
const topNr = works.find(w => w.zone === 8).nr;
await clickWork(topNr); await waitZoom(works.find(w => w.zone === 8).title); await page.waitForTimeout(1100);
const r = await page.evaluate(() => { const z = document.getElementById('zoomimg').getBoundingClientRect(); return { cx: z.left + z.width / 2, cy: z.top + z.height * 0.4 }; });
for (let i = 0; i < 20; i++) { await page.mouse.move(r.cx + (i % 2), r.cy); await page.waitForTimeout(70); if (await page.evaluate(() => document.getElementById('lens').style.display === 'block')) break; }
const lensOnZoom = await page.evaluate(() => document.getElementById('lens').style.display === 'block');
await page.mouse.move(8, 8); await page.waitForTimeout(120);
const lensOffCorner = await page.evaluate(() => document.getElementById('lens').style.display !== 'block');
const lensGood = noWallLens && lensOnZoom && lensOffCorner; lensGood ? pass++ : fail++;
console.log(`  ${lensGood ? '✓' : '✗'} Lupe nur über der Großansicht (Wand-Lupe entfernt: ${noWallLens}, über Großansicht: ${lensOnZoom}, über dem dunklen Raum aus: ${lensOffCorner})`);

console.log(`\n${fail === 0 ? 'Alle ' + pass + ' Großansicht-Prüfungen gruen.' : fail + ' FEHLER von ' + (pass + fail)}`);
await browser.close();
process.exit(fail === 0 ? 0 : 1);
