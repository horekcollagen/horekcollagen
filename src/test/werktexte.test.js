// ============================================================================
//  Werktexte: die Infotafel liest w.text. Prüft, dass die eingetragenen Texte
//  an den richtigen Werken hängen, Werke ohne Text ein leeres Feld (= '') haben,
//  kein Text ins Leere zeigt und die deutschen Anführungszeichen erhalten sind.
//  (node src/test/werktexte.test.js)
// ============================================================================
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { hangAll } from '../hang.js';
import { hangSammelwand } from '../hang_sammelwand.js';
import WERKTEXTE from '../werktexte.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const rd = f => JSON.parse(fs.readFileSync(path.join(ROOT, '..', f), 'utf8'));
const RAW = rd('werke_kirche.json');
const RAW_SAMMELWAND = rd('werke_sammelwand.json');
const sammel = hangSammelwand(RAW_SAMMELWAND);
const WORKS = [...hangAll(RAW), ...sammel.works, ...sammel.bildwand];
const byNr = nr => WORKS.find(w => w.nr === nr);
let passed = 0;
const check = (name, fn) => { fn(); passed++; console.log('  ✓ ' + name); };

console.log('Werktexte:');

check('„Neues aus dem Garten Eden" (#302) zeigt seinen Werktext', () => {
  const w = byNr(302);
  assert.ok(w, 'Werk 302 fehlt');
  assert.ok(w.text && w.text.startsWith('Ausgangspunkt war ein Hippie-Plakat'), 'Werktext 302 fehlt/falsch');
});

check('Alle 11 eingetragenen Texte hängen am richtigen Werk', () => {
  for (const nr of Object.keys(WERKTEXTE)) {
    const w = byNr(Number(nr));
    assert.ok(w, `Werktext zeigt auf unbekanntes Werk #${nr}`);
    assert.equal(w.text, WERKTEXTE[nr], `Werk #${nr}: Text weicht ab`);
  }
  assert.equal(Object.keys(WERKTEXTE).length, 11, 'Es sollen 11 Texte sein');
});

check('Werk ohne Text hat ein leeres Feld (text === "") – kein leeres Feld in der Tafel', () => {
  const w = byNr(1);                       // #1 hat keinen Werktext
  assert.ok(w, 'Werk 1 fehlt');
  assert.equal(w.text, '', 'Werk ohne Text sollte text="" haben');
  // die Infotafel blendet bei leerem Text das Feld aus (ui.js: pt.hidden = true)
  assert.ok(!(w.text && w.text.trim()), 'leerer Text darf nicht als Feld erscheinen');
});

check('„Mach es gut" = #190 „Mach`s Gut" trägt den Clown-Text', () => {
  const w = byNr(190);
  assert.ok(w.text && w.text.includes('kleine Clown'), 'Werktext 190 fehlt');
});

check('„Fluch des Mops" bleibt leer (nicht sicher zugeordnet)', () => {
  const w = byNr(82);                      // „Der Fluch Der Mopsfledermaus" – nur Kandidat
  assert.equal(w.text, '', 'Werk 82 sollte keinen Text haben (rate nicht)');
});

check('Deutsche Anführungszeichen „ " und ’ bleiben erhalten (#269)', () => {
  const w = byNr(269);
  assert.ok(/„Was laberst du denn da wieder für ’n Furz\?“/.test(w.text), 'Anführungszeichen in #269 verändert');
});

console.log(`\nAlle ${passed} Werktext-Tests gruen.`);
