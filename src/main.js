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
import { WORKS } from './works.js';

// ---- Qualitätsstufe (Mittelklasse-Handy -> runter) ----
function detectQuality() {
  const mobile = matchMedia('(pointer:coarse)').matches || innerWidth < 820;
  const lowMem = navigator.deviceMemory && navigator.deviceMemory <= 4;
  const low = mobile || lowMem;
  return low
    ? { tier: 'low', pr: 1.5, shadows: false, shadowMap: 1024, floorRough: 0.42, spotIntensity: 5.5, reflectiveFloor: false, ao: false }
    : { tier: 'high', pr: 2, shadows: true, shadowMap: 2048, floorRough: 0.3, spotIntensity: 6.0, reflectiveFloor: true, ao: true };
}
const quality = detectQuality();

const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, quality.pr));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
if (quality.shadows) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; }
app.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.05, 100);
camera.rotation.order = 'YXZ';

const gallery = buildGallery(renderer, quality);
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
  onRoom: (n) => controls.goToRoom(n),
});

const controls = new Controls(camera, renderer.domElement, gallery, ui);

// ---- Laden + Werk-Direktlink (?werk=NR) ----
const werkParam = parseInt(new URLSearchParams(location.search).get('werk') || '', 10);
function afterLoad() {
  ui.ready();
  if (werkParam) { ui.enterNow(); started = true; controls.jumpToWork(werkParam); }
}
gallery.loadMgr.onProgress = (u, n, t) => ui.setProgress(n, t);
gallery.loadMgr.onLoad = afterLoad;
gallery.loadMgr.onError = () => ui.fail('Ein Bild fehlt – trotzdem betreten');
setTimeout(() => { if (enter_disabled_still()) afterLoad(); }, 9000); // Sicherheitsnetz
function enter_disabled_still() { return document.getElementById('enter').disabled; }

// ---- Loop ----
let started = false;
const clock = new THREE.Clock();
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (started) controls.update(dt);
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
