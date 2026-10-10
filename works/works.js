// ============================================================================
//  WERK-DATEN  ·  HOREK – Scrap Society
// ----------------------------------------------------------------------------
//  Jedes Objekt = ein gehaengtes Werk. Zum Tauschen oder Ergaenzen siehe
//  README.md im Hauptordner. Nur diese Datei und der Ordner /works aendern.
//
//  Felder:
//    slug    : Dateiname ohne Endung in /works (…​.webp)
//    title   : Titel, exakt wie er in der Infotafel steht
//    h, b    : Hoehe und Breite des ORIGINALS in Millimetern (H x B)
//    wall    : 'stirn' | 'links' | 'rechts' | 'eingang'
//    along   : Position laengs der Wand in Metern (0 = Wandmitte;
//              auf Stirn-/Eingangswand = nach rechts, auf Seitenwaenden
//              = Richtung Stirnwand). Nur Lage, nie die Groesse.
//    approx  : optional. Weglassen = Infotafel zeigt "ca." vor dem Mass.
//              approx:false = exaktes Mass ohne "ca.".
//
//  Die Bildmitte haengt immer auf 1,50 m. Die Groesse ergibt sich aus h/b,
//  nichts wird skaliert.
// ============================================================================

export const WORKS = [
  // --- Stirnwand gegenueber dem Eingang: allein, der Blickfang ---
  {
    slug: 'neues-aus-dem-garten-eden',
    title: 'Neues Aus Dem Garten Eden',
    h: 1800, b: 1200, approx: false,
    wall: 'stirn', along: 0,
  },

  // --- Linke Wand: kleine Formate als Gruppe (Salonhaengung) ---
  { slug: 'blasse-passagiere',               title: 'Blasse Passagiere',                h: 300, b: 210, wall: 'links', along: -2.0 },
  { slug: 'ich-war-ein-kleiner-dicke-junge', title: 'Ich War Ein Kleiner Dicke Junge',  h: 420, b: 300, wall: 'links', along: -0.7 },
  { slug: 'dope',                            title: 'DOPE',                             h: 420, b: 300, wall: 'links', along:  0.6 },
  { slug: 'much-better-thank-you',           title: 'Much Better. Thank You',           h: 420, b: 300, wall: 'links', along:  1.9 },

  // --- Rechte Wand: groessere Formate mit Luft ---
  { slug: 'verleih-nix',          title: 'Verleih Nix',                                        h: 920, b: 910, approx: false, wall: 'rechts', along: -2.4 },
  { slug: 'betonkinder',          title: 'Betonkinder',                                        h: 895, b: 540, approx: false, wall: 'rechts', along:  0.0 },
  { slug: 'geh-bitte-nach-hause', title: 'Geh Bitte Nach Hause',                               h: 525, b: 655, wall: 'rechts', along:  2.4 },

  // --- Eingangswand (neben der Tuer) ---
  { slug: 'forever',       title: 'Forever',                                             h: 445, b: 405, wall: 'eingang', along: -3.0 },
  { slug: 'reserved-for-the-bishop', title: 'Reserved For The Bishop',                   h: 295, b: 420, wall: 'eingang', along:  0.9 },
  { slug: 'von-ausdauer',  title: 'Von Ausdauer, Spendablen Pinguinen Und Arschkarten',  h: 505, b: 820, wall: 'eingang', along:  2.5 },
];
