// ============================================================================
//  Raum-Layout (Meter). Enfilade, versetzte Durchgänge. Fenster in allen drei
//  Räumen. Der Saal ist eine Maisonette: 7 m hoch, Empore auf halber Höhe,
//  per Treppe (Klick) begehbar.
//    Raum 1   z 6,0 … 12,25   x -2,5 … 2,5    Decke 3,4
//    Raum 2   z 0,0 … 6,0     x -3,5 … 3,5    Decke 3,7
//    Saal     z -8,0 … 0,0    x -4,5 … 4,5    Decke 7,0 (+ Empore y 3,4)
// ============================================================================

export const T = 0.25;
export const WALL_H = 7.2;      // Rohbauhöhe (Decken je Raum kappen darunter)
export const DOOR_W = 1.6;
export const DOOR_H = 2.4;

export const ROOMS = {
  1: { id: 1, name: 'Raum 1', xL: -2.5, xR: 2.5, zN: 12.25, zF: 6.0,  H: 3.4 },
  2: { id: 2, name: 'Raum 2', xL: -3.5, xR: 3.5, zN: 6.0,   zF: 0.0,  H: 3.7 },
  3: { id: 3, name: 'Saal',   xL: -4.5, xR: 4.5, zN: 0.0,   zF: -8.0, H: 7.0 },
};

// Solide Wände (Segmente). axis 'x' = Wand längs x bei festem z.
export const WALLS = [
  { axis: 'z', at: -2.5, from: 6.0,  to: 12.25 },                          // R1 links
  { axis: 'z', at:  2.5, from: 6.0,  to: 12.25 },                          // R1 rechts
  { axis: 'x', at: 6.0,  from: -3.5, to: 3.5, door: { center: 0.0, width: DOOR_W }, tag: 'd1' },
  { axis: 'z', at:  3.5, from: 0.0,  to: 6.0 },                            // R2 rechts
  { axis: 'x', at: 0.0,  from: -4.5, to: 4.5, door: { center: 1.6, width: DOOR_W }, tag: 'd2' },
  { axis: 'z', at:  4.5, from: -8.0, to: 0.0 },                            // Saal rechts (Werke + Treppe)
  { axis: 'x', at: -8.0, from: -4.5, to: 4.5, tag: 'stirn' },             // Saal Stirnwand (Garten Eden, doppelt hoch)
  // Fensterwände werden separat gebaut (WINDOWWALLS).
];

export const DOORWAYS = [
  { z: 6.0, xCenter: 0.0, width: DOOR_W, between: [1, 2] },
  { z: 0.0, xCenter: 1.6, width: DOOR_W, between: [2, 3] },
];

// Fensterwände (mit Öffnungen + Sprossen + Tageslicht). axis/at wie bei WALLS.
export const WINDOWWALLS = [
  // Raum 1: Eingangswand (Tageslicht von hinten) + Platz für Eingangstext
  { axis: 'x', at: 12.25, from: -2.5, to: 2.5, face: -1, sill: 1.1, head: 2.9, centers: [-1.5, 1.5], width: 1.2, cols: 2, rows: 2 },
  // Raum 2: linke Wand
  { axis: 'z', at: -3.5, from: 0.0, to: 6.0, face: 1, sill: 1.0, head: 2.9, centers: [1.6, 4.4], width: 1.3, cols: 2, rows: 2 },
  // Saal: linke Wand, untere Reihe
  { axis: 'z', at: -4.5, from: -8.0, to: 0.0, face: 1, sill: 1.0, head: 3.1, centers: [-2.0, -4.2, -6.4], width: 1.3, cols: 2, rows: 3 },
  // Saal: linke Wand, Oberlichter (für die Empore)
  { axis: 'z', at: -4.5, from: -8.0, to: 0.0, face: 1, sill: 4.3, head: 6.3, centers: [-2.0, -4.2, -6.4], width: 1.3, cols: 2, rows: 2, noLight: true },
];

// Empore (Balkon) im Saal: an der Eingangsseite, halbe Höhe, Void davor.
export const EMPORE = {
  y: 3.4,            // Oberkante Emporenboden
  thickness: 0.3,
  xL: -4.5, xR: 4.5,
  zBack: 0.0,        // an der Eingangswand (rueck)
  zFront: -2.4,      // offene Kante (Geländer) zum Void
  eye: 5.0,          // Augenhöhe auf der Empore
};

// Treppe (Industrie-Loft, steil) an der rechten Saalwand hoch zur Empore.
export const STAIRS = {
  xL: 2.6, xR: 4.3,
  zBottom: -5.4, zTop: -2.4,
  yTop: EMPORE.y,
  steps: 17,
};
