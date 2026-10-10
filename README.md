# HOREK – Scrap Society · Virtueller Raum

Ein fest gehängter, virtueller Ausstellungsraum für die Collagen von HOREK.
Statische Seite, kein Build-Schritt, keine Tracker, keine externen Requests zur
Laufzeit. three.js liegt lokal im Repo (Version gepinnt).

Live: https://galerie.horekcollagen.de

## Aufbau

```
index.html                 Die komplette Anwendung (Raum, Steuerung, Infotafel)
js/three.module.min.js     three.js r160, lokal gepinnt – nicht ändern
works/works.js             Die Werkliste (Titel, Maße, Wand)
works/*.webp               Die Werkfotos
CNAME                      galerie.horekcollagen.de
.nojekyll                  Schaltet die GitHub-Jekyll-Verarbeitung ab
```

## Ein Werk austauschen

1. Neues Foto als **WebP** speichern, lange Kante **max. 2048 px**. Nur das Werk,
   randlos, ohne Hintergrund (sonst stimmen die Proportionen an der Wand nicht).
2. Datei nach `works/` legen, Name = `slug` aus `works/works.js`
   (z. B. `works/dope.webp`).
3. In `works/works.js` beim selben Eintrag `h` (Höhe) und `b` (Breite) des
   **Originals in Millimetern** eintragen, falls sie sich ändern.

Mehr ist nicht nötig. Das Bild wird in Originalgröße an die Wand gehängt, nichts
wird skaliert.

> Faustregel: Das Seitenverhältnis des Fotos (Pixel-Breite : Pixel-Höhe) sollte
> zum Verhältnis `b : h` des Werks passen (Abweichung unter ca. 5 %). Weicht es
> stärker ab, ist das Foto beschnitten oder hat Hintergrund – dann wirkt das Werk
> an der Wand verzerrt.

## Ein Werk hinzufügen

In `works/works.js` einen Eintrag ergänzen:

```js
{
  slug: 'neuer-slug',        // = Dateiname in /works ohne .webp
  title: 'Werktitel',        // genau so steht er in der Infotafel
  h: 300, b: 210,            // Höhe x Breite des Originals in Millimetern
  wall: 'stirn',             // 'stirn' | 'links' | 'rechts' | 'eingang'
  along: 0,                  // Position längs der Wand in Metern (0 = Mitte)
}
```

- `wall` wählt die Wand. `stirn` ist die Wand gegenüber dem Eingang.
- `along` verschiebt das Werk seitlich: auf `stirn`/`eingang` nach rechts,
  auf `links`/`rechts` Richtung Stirnwand. Werte z. B. `-1.7`, `0`, `1.7`.
- Die Bildmitte hängt immer auf 1,50 m, die Spots richten sich automatisch aus.

Wird es auf einer Wand zu eng, die `along`-Werte der Nachbarn anpassen oder das
Werk auf eine andere Wand legen.

## Lokal ansehen

ES-Module brauchen einen kleinen Webserver (Doppelklick auf die Datei reicht
nicht). Im Projektordner:

```bash
python3 -m http.server 8099
```

Dann im Browser `http://localhost:8099/` öffnen.

## Hinweise

- **three.js nicht gegen eine CDN-Version tauschen.** Die lokale Datei hält die
  Seite frei von externen Requests.
- Gesamtgewicht unter 15 MB halten, Fotos als WebP, lange Kante max. 2048 px.
- Keine Preise, keine Tracker, keine Fonts von außen.
