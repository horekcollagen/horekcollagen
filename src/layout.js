// ============================================================================
//  Raum-Layout (Maße in Metern). Enfilade mit versetztem Durchgang -> Rundgang
//  ohne Sackgassen-Gefühl. Wände 0,25 m stark (sichtbare Laibung an Durchgängen).
//    Raum 1 Kabinett (klein)  z 6,0 … 12,25   x -2,5 … 2,5    Decke 3,4
//    Raum 2 Mittelraum        z 0,0 … 6,0     x -3,5 … 3,5    Decke 3,7
//    Raum 3 Saal (groß)       z -8,0 … 0,0    x -4,5 … 4,5    Decke 4,1
//  Du startest in Raum 1 bei großem z und läufst nach -z.
// ============================================================================

export const T = 0.25;          // Wandstärke
export const WALL_H = 4.4;      // Rohbauhöhe der Wände (Decken kappen darunter)
export const DOOR_W = 1.6;
export const DOOR_H = 2.4;

export const ROOMS = {
  1: { id: 1, name: 'Kabinett',   xL: -2.5, xR: 2.5, zN: 12.25, zF: 6.0,  H: 3.4 },
  2: { id: 2, name: 'Mittelraum', xL: -3.5, xR: 3.5, zN: 6.0,   zF: 0.0,  H: 3.7 },
  3: { id: 3, name: 'Saal',       xL: -4.5, xR: 4.5, zN: 0.0,   zF: -8.0, H: 4.1 },
};

// Wände als Segmente. axis 'x' = Wand verläuft entlang x bei festem z; 'z' umgekehrt.
// door: {center, width} schneidet eine Türöffnung (Höhe DOOR_H) ein.
export const WALLS = [
  // Raum 1
  { axis: 'x', at: 12.25, from: -2.5, to: 2.5, tag: 'eingang' },            // Rückwand / Eingang
  { axis: 'z', at: -2.5,  from: 6.0,  to: 12.25 },                          // R1 links
  { axis: 'z', at:  2.5,  from: 6.0,  to: 12.25 },                          // R1 rechts
  // Durchgang D1 (R1 | R2) bei z = 6.0, Tür mittig
  { axis: 'x', at: 6.0,   from: -3.5, to: 3.5, door: { center: 0.0,  width: DOOR_W }, tag: 'd1' },
  // Raum 2
  { axis: 'z', at: -3.5,  from: 0.0,  to: 6.0 },                            // R2 links
  { axis: 'z', at:  3.5,  from: 0.0,  to: 6.0 },                            // R2 rechts
  // Durchgang D2 (R2 | R3) bei z = 0.0, Tür versetzt (+x) -> Rundgang knickt
  { axis: 'x', at: 0.0,   from: -4.5, to: 4.5, door: { center: 1.6,  width: DOOR_W }, tag: 'd2' },
  // Raum 3 Saal
  { axis: 'x', at: -8.0,  from: -4.5, to: 4.5, tag: 'stirn' },             // Stirnwand
  { axis: 'z', at:  4.5,  from: -8.0, to: 0.0 },                            // R3 rechts
  // R3 links (x=-4.5) ist die Fensterwand -> separat gebaut (siehe FENSTER)
];

// Türöffnungen als begehbare Lücken (für Kollision). center entlang x bei festem z.
export const DOORWAYS = [
  { z: 6.0, xCenter: 0.0, width: DOOR_W, between: [1, 2] },
  { z: 0.0, xCenter: 1.6, width: DOOR_W, between: [2, 3] },
];

// Sprossenfenster in der linken Saalwand (x = -4.5). 3 Öffnungen, Brüstung 1,0 m.
export const WINDOWS = {
  x: -4.5,
  sill: 1.0, head: 3.3,          // Brüstung/Sturz
  zCenters: [-2.2, -4.4, -6.6],  // drei Fenster
  width: 1.3,                    // je Fenster (entlang z)
  cols: 2, rows: 3,              // Sprossenteilung
};
