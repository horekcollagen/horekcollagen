// ============================================================================
//  Bootstrap: Renderer, Kamera, Qualitätsstufe, Szene, Steuerung, Loop.
// ============================================================================
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { buildGallery } from './scene.js';
import { Controls } from './controls.js';
import { createUI } from './ui.js';
import { RAW } from './works.js';
import { RAW_SAMMELWAND } from './works_sammelwand.js';
import { hangAll } from './hang.js';
import { hangSammelwand } from './hang_sammelwand.js';

const sammel = hangSammelwand(RAW_SAMMELWAND);
const WORKS = [...hangAll(RAW), ...sammel.works, ...sammel.bildwand];
const TOTAL = RAW.length + RAW_SAMMELWAND.length;   // 351
if (sammel.bildwand.length) console.info('Sammelwand: Apsis', sammel.works.length, '+ Bildwand', sammel.bildwand.length);

// ---- Qualitätsstufe (Mittelklasse-Handy -> runter) ----
function detectQuality() {
  const mobile = matchMedia('(pointer:coarse)').matches || innerWidth < 820;
  const lowMem = navigator.deviceMemory && navigator.deviceMemory <= 4;
  const low = mobile || lowMem;
  // Keine Echtzeit-Schatten, Pixeldichte max 1,5, kein GTAO-Composer – Last liegt sonst
  // komplett am Fragment-Shader. Lichtkegel/Fensterflecken sind vorgetäuscht (Texturen).
  return low
    ? { tier: 'low', pr: 1.25, shadows: false, shadowMap: 1024, floorRough: 0.42, reflectiveFloor: false, ao: false }
    : { tier: 'high', pr: 1.5, shadows: false, shadowMap: 2048, floorRough: 0.3, reflectiveFloor: false, ao: false };
}
const quality = detectQuality();

const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, quality.pr));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;
if (quality.shadows) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; }
app.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.05, 100);
camera.rotation.order = 'YXZ';
let started = false;   // früh deklariert (onEnter kann beim ?werk-Einstieg sofort feuern)

const gallery = buildGallery(renderer, quality, WORKS);
const { scene } = gallery;

// ---- Postprocessing (nur starke Stufe): AO für Ecken-Tiefe + Kantenglättung ----
let composer = null;
if (quality.ao) {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const gtao = new GTAOPass(scene, camera, innerWidth, innerHeight);
  gtao.output = GTAOPass.OUTPUT.Default;
  gtao.updateGtaoMaterial({ radius: 0.5, distanceExponent: 1.0, thickness: 1.0, scale: 1.0, samples: 16, screenSpaceRadius: false });
  composer.addPass(gtao);
  composer.addPass(new OutputPass());
  composer.addPass(new SMAAPass(innerWidth * renderer.getPixelRatio(), innerHeight * renderer.getPixelRatio()));
}

const ui = createUI({
  count: WORKS.length,
  onEnter: () => { started = true; },
  onBack: () => controls.backToRoom(),
  onStation: (k) => controls.goToStation(k),
  onNext: () => controls.nextStation(),
});

const controls = new Controls(camera, renderer.domElement, gallery, ui);

// ---- Laden (Texturen laden nach Nähe/Zone) + Werk-Direktlink (?werk=NR) ----
const werkParam = parseInt(new URLSearchParams(location.search).get('werk') || '', 10);
ui.ready();                                   // Button frei; Texturen streamen nach Nähe
if (werkParam) { ui.enterNow(); started = true; gallery.lazyLoad(camera, true); controls.jumpToWork(werkParam); }

// ---- Loop ----
const clock = new THREE.Clock();
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (started) { controls.update(dt); gallery.lazyLoad(camera); }
  if (composer) composer.render(); else renderer.render(scene, camera);
}
loop();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, quality.pr));
  if (composer) composer.setSize(innerWidth, innerHeight);
});

// Debug-Zugriff
window.__gallery = { renderer, scene, camera, controls, quality, composer, THREE };
