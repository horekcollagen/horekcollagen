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
  { xL: 5.5, xR: 14.5, zF: 1.4, zN: 6.9 },     // Apsis (durch die Öffnung)
  { xL: 7.4, xR: 12.6, zF: 31.0, zN: 35.6 },   // Vorhalle
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
