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
//
//  Die Bildmitte haengt immer auf 1,50 m. Die Groesse ergibt sich aus h/b,
//  nichts wird skaliert.
// ============================================================================

export const WORKS = [
  {
    slug: 'von-ausdauer',
    title: 'Von Ausdauer, Spendablen Pinguinen Und Arschkarten',
    h: 505, b: 820,
    wall: 'stirn', along: 0,
  },
  {
    slug: 'geh-bitte-nach-hause',
    title: 'Geh Bitte Nach Hause',
    h: 525, b: 655,
    wall: 'rechts', along: 0,
  },
  {
    slug: 'blasse-passagiere',
    title: 'Blasse Passagiere',
    h: 300, b: 210,
    wall: 'links', along: -1.7,
  },
  {
    slug: 'ich-war-ein-kleiner-dicke-junge',
    title: 'Ich War Ein Kleiner Dicke Junge',
    h: 420, b: 300,
    wall: 'links', along: 0,
  },
  {
    slug: 'dope',
    title: 'DOPE',
    h: 420, b: 300,
    wall: 'links', along: 1.7,
  },
  {
    slug: 'reserved-for-the-bishop',
    title: 'Reserved For The Bishop',
    h: 295, b: 420,
    wall: 'eingang', along: 1.4,
  },
];
