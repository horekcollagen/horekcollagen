// ============================================================================
//  Kirche – Geometrie (Meter, three-Koordinaten).
//  x = quer (0 = linke Außenwand), z = längs (0 = Apsisscheitel, 36 = Tür),
//  y = Höhe.  Du startest in der Vorhalle (z≈33) mit Blick nach -z zur Apsis.
//  Entspricht den SVG-Plänen (dort x/y Grundriss; hier y→z).
// ============================================================================

export const NAVE = { xL: 4, xR: 16, zApse: 5, zEnd: 31, H: 12 };
export const APSE = { cx: 10, cz: 5, r: 5, H: 7 };              // Halbkreis + Halbkuppel
export const CHAPEL = { zN: 19, zF: 14, H: 5, openZ0: 15, openZ1: 18,
  left: { xL: 0, xR: 4 }, right: { xL: 16, xR: 20 } };
export const VEST = { xL: 7, xR: 13, zN: 36, zF: 31, H: 5, doorW: 2.0 };
export const EMP = { y: 5, rail: 1.1,
  west:  { xL: 4, xR: 16, zF: 26, zN: 31 },
  left:  { xL: 4, xR: 7,  zF: 8,  zN: 26 },
  right: { xL: 13, xR: 16, zF: 8, zN: 26 },
  eye: 6.6 };
// Treppe steigt im hinteren Schiff (unter der Westempore) durch ein Treppenloch
// in der Emporenplatte hinauf: Fuß bei z=zBottom (y0), Kopf bei z=zTop (y5).
export const STAIRS = { xL: 11.0, xR: 13.0, zBottom: 30.9, zTop: 27.0, yTop: 5, steps: 16 };
export const BILDWAND = { z: 6.3, H: 4.5, openX0: 8.8, openX1: 11.2, openH: 3.2,
  left: { xL: 4.6, xR: 8.8 }, right: { xL: 11.2, xR: 15.4 } };
export const PODIUM = { x: 10, z: 2.9, w: 2.0, d: 0.7, h: 0.8 };

// Sammelwand: dichte Petersburger Hängung auf der runden Apsiswand (Trommel r=5,
// Mitte x10/z5, θ∈[π/2,3π/2]). Werke sitzen knapp vor der Wand (rHang), von 40 cm
// über dem Boden bis 20 cm unter den Kuppelansatz (drumH 6.5). Um Garten Eden (auf
// dem Podest, 120 cm breit, Oberkante ~2,6 m) bleibt ein freier Rand ≥1 m.
export const APSE_HANG = { rHang: 4.9, vBottom: 0.4, vTop: 6.3, thetaMargin: 0.07,
  gap: 0.08, drumH: 6.5, gartenEdenClear: 1.0, gartenEdenW: 1.2, gartenEdenTop: 2.6 };

// Fenster: Seitenwände (x=4 links, x=16 rechts) + Kapellen (x=0 / x=20).
// zC = Mitte längs, w = Breite (längs). Je unteres (yLo) + oberes (yHi) Fenster.
export const WIN_ZC = [7.25, 10.75, 20.75, 24.25];  // Mitten der 4 Fensterpaare
export const WIN_W = 1.5;
export const WIN_LO = [1.2, 3.6];
export const WIN_HI = [7.2, 10.8];
export const CHAPEL_WIN_ZC = [15.2, 17.8];           // Kapellenfenster (2 je Kapelle)

// Begehbare Flächen Ebene 0 (Rechtecke, bereits von Wänden eingerückt).
export const GROUND = [
  { xL: 4.4, xR: 15.6, zF: 6.9, zN: 30.6 },    // Schiff
  { xL: 6.5, xR: 13.5, zF: 2.4, zN: 6.9 },     // Apsis (innerhalb der Trommel, nicht in die Ecken)
  { xL: 7.4, xR: 12.6, zF: 31.0, zN: 35.6 },   // Vorhalle
  { xL: 7.2, xR: 12.8, zF: 30.3, zN: 31.2 },   // Durchgang Vorhalle <-> Schiff (schließt die Lücke z30.6–31)
  { xL: 0.4, xR: 4.6,  zF: 14.4, zN: 18.6 },   // linke Kapelle (+ Öffnung)
  { xL: 15.4, xR: 19.6, zF: 14.4, zN: 18.6 },  // rechte Kapelle (+ Öffnung)
  { xL: 8.6, xR: 11.4, zF: 6.0, zN: 7.0 },     // Durchgang Bildwand
];
// Begehbare Flächen Ebene 1 (Emporen, U-Form).
export const UPPER = [
  { xL: 4.4, xR: 10.8, zF: 26.4, zN: 30.6 },   // Westempore links vom Treppenloch
  { xL: 13.2, xR: 15.6, zF: 26.4, zN: 30.6 },  // Westempore rechts vom Treppenloch
  { xL: 10.8, xR: 13.2, zF: 26.4, zN: 27.0 },  // Streifen vor dem Treppenloch
  { xL: 4.4, xR: 6.6,  zF: 8.4, zN: 26.6 },    // linke Seitenempore
  { xL: 13.4, xR: 15.6, zF: 8.4, zN: 26.6 },   // rechte Seitenempore
];

// Emporen-Bodenplatten (Geometrie) für den Geländer-/Kanten-Test.
export const EMPORE_FLOORS = [
  { xL: NAVE.xL, xR: STAIRS.xL, zF: STAIRS.zTop, zN: EMP.west.zN },        // West links vom Treppenloch (4–11, 27–31)
  { xL: STAIRS.xR, xR: NAVE.xR, zF: STAIRS.zTop, zN: EMP.west.zN },        // West rechts (13–16, 27–31)
  { xL: NAVE.xL, xR: NAVE.xR, zF: EMP.west.zF, zN: STAIRS.zTop },          // West Streifen (4–16, 26–27)
  { xL: EMP.left.xL, xR: EMP.left.xR, zF: EMP.left.zF, zN: EMP.left.zN },  // linke Seitenempore (4–7, 8–26)
  { xL: EMP.right.xL, xR: EMP.right.xR, zF: EMP.right.zF, zN: EMP.right.zN }, // rechte (13–16, 8–26)
];
// Geländer-Segmente (axis='z': entlang z=at von x=a..b; axis='x': entlang x=at von z=a..b).
export const EMPORE_RAILINGS = [
  { axis: 'z', at: EMP.west.zF, a: EMP.left.xR, b: EMP.right.xL },    // West über dem Schiff (z26, x7–13)
  { axis: 'x', at: EMP.left.xR, a: EMP.left.zF, b: EMP.left.zN },     // linke Kante (x7, z8–26)
  { axis: 'x', at: EMP.right.xL, a: EMP.right.zF, b: EMP.right.zN },  // rechte Kante (x13, z8–26)
  { axis: 'z', at: EMP.left.zF, a: EMP.left.xL, b: EMP.left.xR },     // linke Stirnseite zur Apsis (z8, x4–7)
  { axis: 'z', at: EMP.right.zF, a: EMP.right.xL, b: EMP.right.xR },  // rechte Stirnseite (z8, x13–16)
  { axis: 'x', at: STAIRS.xL, a: STAIRS.zTop, b: EMP.west.zN },       // Treppenloch links (x11, z27–31)
  { axis: 'x', at: STAIRS.xR, a: STAIRS.zTop, b: EMP.west.zN },       // Treppenloch rechts (x13, z27–31)
];
// Wände an Emporenkanten (keine freie Kante): Seitenwände x4/x16, Rückwand z31.
export const EMPORE_WALLS = [{ axis: 'x', at: NAVE.xL }, { axis: 'x', at: NAVE.xR }, { axis: 'z', at: EMP.west.zN }];
// Erlaubte Öffnung (kein Geländer): Treppenaustritt oben (z27, x11–13).
export const EMPORE_OPENINGS = [{ axis: 'z', at: STAIRS.zTop, a: STAIRS.xL, b: STAIRS.xR }];

// Sieben Stationen (Raumleiste + „Weiter"). level 0 = unten, 1 = Empore.
export const STATIONS = [
  { key: 'vorhalle',      label: 'Vorhalle',      x: 10, z: 33.5, yaw: 0, level: 0 },
  { key: 'schiff',        label: 'Schiff',        x: 10, z: 22.0, yaw: 0, level: 0 },
  { key: 'bildwand',      label: 'Bildwand',      x: 10, z: 10.5, yaw: 0, level: 0 },
  { key: 'apsis',         label: 'Apsis',         x: 10, z: 5.4,  yaw: 0, level: 0 },
  { key: 'kapellen',      label: 'Kapellen',      x: 6.5, z: 16.5, yaw: 1.5708, level: 0 },
  { key: 'westempore',    label: 'Westempore',    x: 10, z: 28.6, yaw: 0, level: 1 },
  { key: 'seitenemporen', label: 'Seitenemporen', x: 5.5, z: 14,  yaw: 0, level: 1 },
];
