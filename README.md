# HOREK – Scrap Society · Virtueller Rundgang (v2)

Begehbarer 3D-Rundgang durch drei Räume mit den Collagen von HOREK in
Originalgröße. three.js, ein schlanker Vite-Build, Veröffentlichung über
GitHub Actions auf GitHub Pages. Keine Tracker, keine Fonts von außen, keine
externen Requests zur Laufzeit (die Umgebungsbeleuchtung ist reiner Code).

Live: https://galerie.horekcollagen.de

## Aufbau

```
index.html                 Startschirm + UI-Hülle (lädt src/main.js)
src/works.js               Die Werkliste (hier tauschen/ergänzen)
src/layout.js              Raum- und Wandmaße, Durchgänge, Fenster
src/scene.js               Räume, Material, Licht, Werke, Schilder, Möbel
src/controls-core.js       Steuerungs-Mathematik (rein, getestet)
src/controls.js            Eingaben, Kollision, Fokus, Raumsprung
src/ui.js                  DOM-Logik (Infotafel, Raumleiste, Laden)
src/test/controls.test.js  Automatischer Steuerungstest (npm test)
public/works/*.webp        Die Werkfotos (werden 1:1 ausgeliefert)
public/CNAME               galerie.horekcollagen.de
.github/workflows/deploy.yml  Build + Deploy bei Push auf main
```

## Ein Werk austauschen  (Foto + eine Zeile)

1. Neues Foto als **WebP**, lange Kante **max. 2048 px**, nur das Werk, randlos
   (sonst stimmen die Proportionen an der Wand nicht). Nach `public/works/`
   legen, Name = `slug` aus `src/works.js` (z. B. `public/works/dope.webp`).
2. In `src/works.js` beim selben Eintrag `h`/`b` (Original in Millimetern)
   anpassen, falls sich das Maß ändert.

> Faustregel: Pixel-Verhältnis des Fotos (Breite : Höhe) ≈ `b : h` des Werks
> (Abweichung unter ca. 5 %). Sonst ist das Foto beschnitten/mit Hintergrund.

## Ein Werk hinzufügen

In `src/works.js` eine Zeile ergänzen:

```js
{ slug: 'neuer-slug', title: 'Werktitel', h: 300, b: 210,
  room: 2, wall: 'links', along: 0.0 }
//  room: 1 Kabinett · 2 Mittelraum · 3 Saal
//  wall: 'links' | 'rechts' | 'stirn' (gegenüber Eingang) | 'rueck'
//  along: Position längs der Wand in Metern (0 = Mitte)
//  cy: optional Bildmitte (Standard 1,50) · approx: false = exaktes Maß ohne „ca."
```

## Lokal ansehen / bauen

```bash
npm install
npm run dev       # Entwicklungsserver (http://localhost:5173)
npm test          # Steuerungstest (muss grün sein)
npm run build     # Produktions-Build nach dist/
```

## Veröffentlichen

Push auf `main` → GitHub Actions baut und deployt automatisch nach
galerie.horekcollagen.de. Der Build läuft nur durch, wenn `npm test` grün ist.
Nichts weiter zu tun. Kosten: 0 €.

## Hinweise

- Läuft auf Mittelklasse-Handys: eine Qualitätsstufe schaltet Spiegelung, AO
  und Schatten automatisch ab. Gesamtgewicht unter 25 MB halten.
- Keine Preise, keine Tracker, keine externen Fonts/CDNs.
