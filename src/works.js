// ============================================================================
//  WERK-DATEN (Kirche) – datengetrieben aus werke_kirche.json.
//  Phase A (Rohbau): noch nichts gehängt. Phase B füllt WORKS über hang.js.
// ============================================================================
import data from './werke_kirche.json';

export const RAW = data;
export const COUNT = data.length;   // 76

// Wird in Phase B (hang.js) mit {nr,slug,title,year,price,h,b,approx,text,
// zone,level,wall,pos...} befüllt. Rohbau: leer.
export let WORKS = [];
export function setWorks(w) { WORKS = w; }
