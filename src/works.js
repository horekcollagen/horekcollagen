// ============================================================================
//  WERK-DATEN  ·  HOREK  (drei Räume + Empore)
// ----------------------------------------------------------------------------
//  Ein Werk tauschen/ergänzen = Foto in /public/works + eine Zeile hier.
//  Für Run 4 (20–25 Werke) einfach weitere Zeilen ergänzen; die Architektur
//  bleibt. Preise = ÖFFENTLICHER Verkaufspreis. (Kein interner Preis, nirgends.)
//
//  Felder:
//    nr     : Werknummer (für Links ?werk=NR, QR, hires/NR.jpg)
//    slug   : Dateiname ohne Endung in /public/works (…​.webp)
//    title  : Titel, exakt wie angezeigt
//    year   : Jahr
//    price  : Originalpreis in Euro (Zahl) · h,b: Original H×B in mm
//    approx : optional; false = exaktes Maß ohne „ca." (Standard: mit „ca.")
//    text   : Werktext (leer = wird nicht angezeigt)
//    room   : 1 | 2 | 3 (Saal)   ·   level: 'unten' | 'empore' (nur Saal)
//    wall   : 'links' | 'rechts' | 'stirn' (ggü. Eingang) | 'rueck' (Eingangsseite)
//    along  : Lage längs der Wand in Metern (0 = Mitte) · cy: Bildmitte (Std 1,50)
// ============================================================================

export const WORKS = [
  // ---------- Raum 1 · dicht/dunkel + ein farbiger Kontrapunkt ----------
  { nr: 133, slug: 'dope',                            title: 'DOPE',                            year: 2024, price: 650,  h: 420,  b: 300,  room: 1, wall: 'links',  along: 0.0 },
  { nr: 131, slug: 'ich-war-ein-kleiner-dicke-junge', title: 'Ich War Ein Kleiner Dicke Junge', year: 2024, price: 650,  h: 420,  b: 300,  room: 1, wall: 'rechts', along: 0.0 },
  { nr: 17,  slug: 'reserved-for-the-bishop',         title: 'Reserved For The Bishop',         year: 2023, price: 650,  h: 295,  b: 420,  room: 1, wall: 'stirn',  along: -1.55, cy: 1.5 },
  { nr: 42,  slug: 'blasse-passagiere',               title: 'Blasse Passagiere',               year: 2023, price: 400,  h: 300,  b: 210,  room: 1, wall: 'stirn',  along: 1.55,  cy: 1.5 },

  // ---------- Raum 2 · farbig + monochrom, mit Luft ----------
  { nr: 280, slug: 'von-ausdauer',        title: 'Von Ausdauer, Spendablen Pinguinen Und Arschkarten', year: 2022, price: 1800, h: 505,  b: 820,  room: 2, wall: 'rechts', along: 0.0 },
  { nr: 247, slug: 'forever',             title: 'Forever',                                            year: 2023, price: 750,  h: 445,  b: 405,  room: 2, wall: 'stirn',  along: -1.9 },
  { nr: 170, slug: 'much-better-thank-you', title: 'Much Better. Thank You',                           year: 2024, price: 650,  h: 420,  b: 300,  room: 2, wall: 'rueck',  along: -1.7 },

  // ---------- Saal unten · Blickfang doppelt hoch ----------
  { nr: 302, slug: 'neues-aus-dem-garten-eden', title: 'Neues Aus Dem Garten Eden', year: 2025, price: 8500, approx: false, h: 1800, b: 1200, room: 3, level: 'unten', wall: 'stirn',  along: 0.0, cy: 2.6 },
  { nr: 282, slug: 'geh-bitte-nach-hause',      title: 'Geh Bitte Nach Hause',      year: 2020, price: 1400, h: 525,  b: 655,  room: 3, level: 'unten', wall: 'rechts', along: -2.8 },

  // ---------- Empore · monochrome Nachbarn ----------
  { nr: 304, slug: 'verleih-nix',  title: 'Verleih Nix',  year: 2021, price: 3800, approx: false, h: 920, b: 910, room: 3, level: 'empore', wall: 'rueck',  along: -1.4, cy: 4.9 },
  { nr: 307, slug: 'betonkinder',  title: 'Betonkinder',  year: 2022, price: 2800, approx: false, h: 895, b: 540, room: 3, level: 'empore', wall: 'rechts', along: 2.5, cy: 4.9 },
];
