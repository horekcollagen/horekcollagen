// ============================================================================
//  WERK-DATEN  ·  HOREK – Scrap Society  (3 Räume)
// ----------------------------------------------------------------------------
//  Ein Werk tauschen = Foto in /public/works + diese eine Zeile. Siehe README.
//
//  Felder:
//    slug   : Dateiname ohne Endung in /public/works (…​.webp)
//    title  : Titel, exakt wie in Infotafel und Werkschild
//    h, b   : Höhe und Breite des ORIGINALS in Millimetern (H × B)
//    approx : optional; false = exaktes Maß ohne „ca." (Standard: mit „ca.")
//    room   : 1 Kabinett · 2 Mittelraum · 3 Saal
//    wall   : 'links' | 'rechts' | 'stirn' (Wand gegenüber Eingang) | 'rueck' (Eingangsseite)
//    along  : Position längs der Wand in Metern (0 = Wandmitte)
//    cy     : optional; Bildmitte in Metern (Standard 1,50)
// ============================================================================

export const WORKS = [
  // ---------- Raum 1 · Kabinett · kleine Formate, Salonhängung (Block, Mittellinie 1,50 m) ----------
  { slug: 'reserved-for-the-bishop',        title: 'Reserved For The Bishop',                h: 295,  b: 420,  room: 1, wall: 'links', along:  2.55, cy: 1.80 },
  { slug: 'ich-war-ein-kleiner-dicke-junge',title: 'Ich War Ein Kleiner Dicke Junge',        h: 420,  b: 300,  room: 1, wall: 'links', along:  1.35, cy: 1.78 },
  { slug: 'much-better-thank-you',          title: 'Much Better. Thank You',                 h: 420,  b: 300,  room: 1, wall: 'links', along:  0.15, cy: 1.80 },
  { slug: 'blasse-passagiere',              title: 'Blasse Passagiere',                      h: 300,  b: 210,  room: 1, wall: 'links', along:  2.62, cy: 1.18 },
  { slug: 'dope',                           title: 'DOPE',                                   h: 420,  b: 300,  room: 1, wall: 'links', along:  1.35, cy: 1.19 },
  { slug: 'forever',                        title: 'Forever',                                h: 445,  b: 405,  room: 1, wall: 'links', along:  0.10, cy: 1.19 },

  // ---------- Raum 2 · Mittelraum · mittlere Formate, mit Luft ----------
  { slug: 'von-ausdauer',       title: 'Von Ausdauer, Spendablen Pinguinen Und Arschkarten', h: 505,  b: 820,  room: 2, wall: 'rechts', along:  0.0 },
  { slug: 'geh-bitte-nach-hause',title: 'Geh Bitte Nach Hause',                              h: 525,  b: 655,  room: 2, wall: 'links',  along:  0.0 },
  { slug: 'betonkinder',        title: 'Betonkinder',                                        h: 895,  b: 540,  approx: false, room: 2, wall: 'stirn', along: -1.4 },

  // ---------- Raum 3 · Saal · großer Blickfang auf der Stirnwand ----------
  { slug: 'neues-aus-dem-garten-eden', title: 'Neues Aus Dem Garten Eden',                   h: 1800, b: 1200, approx: false, room: 3, wall: 'stirn',  along:  0.0 },
  { slug: 'verleih-nix',        title: 'Verleih Nix',                                        h: 920,  b: 910,  approx: false, room: 3, wall: 'rechts', along:  0.0 },
];
