# HOREK – Virtueller Rundgang (v3)

Begehbarer 3D-Rundgang durch drei Räume + Empore mit den Collagen von HOREK in
Originalgröße. three.js, schlanker Vite-Build, Veröffentlichung über GitHub
Actions auf GitHub Pages. Keine Tracker, keine Fonts von außen, keine externen
Requests zur Laufzeit.

Live: https://galerie.horekcollagen.de

## Aufbau

```
index.html                 Startschirm + UI (lädt src/main.js)
src/works.js               Werkliste (hier tauschen/ergänzen: Preis, Jahr, Lage)
src/layout.js              Raum-/Wandmaße, Fenster, Empore, Treppe
src/scene.js               Räume, Material, Licht, Werke, Schilder, Möbel, Empore
src/controls-core.js       Steuerungs-Mathematik (rein, getestet)
src/controls.js            Eingaben, Kollision, Fokus, Ebenen (Saal/Empore)
src/ui.js                  Infotafel (Verkauf), Lupe, Raumleiste, Laden
src/test/controls.test.js  Steuerungstest (npm test)
tools/qr.js                QR-Codes + Übersicht erzeugen (npm run qr)
public/works/*.webp        Werkfotos (3D-Textur, ≤ 2048 px)
public/works/hires/NR.jpg  optional: hochauflösender Scan für die Lupe
public/CNAME               galerie.horekcollagen.de
qr/                        erzeugte QR-Codes (SVG+PNG) + uebersicht.html (Druck)
startbild/                 Startseiten-Bild (1920×1080, WebP+JPG) für Horizons
```

## Ein Werk austauschen  (Foto + eine Zeile)

1. Foto als **WebP**, lange Kante **max. 2048 px**, randlos, nach
   `public/works/` (Name = `slug`). 
2. In `src/works.js` die Zeile anpassen: `h`/`b` (Maß in mm), `price`, `year`.

## Ein Werk hinzufügen

Zeile in `src/works.js` ergänzen:

```js
{ nr: 999, slug: 'neuer-slug', title: 'Titel', year: 2025, price: 650,
  h: 300, b: 210, room: 2, wall: 'links', along: 0.0 }
//  room 1/2/3 · level 'unten'|'empore' (nur Saal) · wall links|rechts|stirn|rueck
//  along = Lage längs der Wand (m) · cy = Bildmitte (Std 1,50)
//  approx:false = exaktes Maß ohne „ca." · text:'…' = Werktext (leer = aus)
```

Die Architektur ist auf ~20–25 Werke ausgelegt; nur Zeilen ergänzen.

## Lupe (Zoom) und hochauflösende Scans

In der Infotafel öffnet „Werk vergrößern (Lupe)" das Bild groß (Zoom per
Mausrad/Pinch, Verschieben per Ziehen). Die Lupe lädt bei Bedarf
`public/works/hires/<NR>.jpg`, falls vorhanden — **sonst das normale Foto**.
Besseren Scan später einfach als `public/works/hires/<NR>.jpg` ablegen, fertig.
Die hires-Dateien werden **nicht** als 3D-Textur geladen (Gewicht).

## Werk-Links und QR-Codes

- Jedes Werk hat eine eigene Adresse: `…/?werk=<NR>` (z. B. `?werk=302`).
  Aufruf öffnet die Ausstellung direkt vor dem Werk mit offener Infotafel.
- `npm run qr` erzeugt `qr/<NR>.svg` + `qr/<NR>.png` (druckfähig) und
  `qr/uebersicht.html` (druckbare Kärtchen: QR, Titel, Maß, Preis) — lokal,
  ohne Online-Dienst.

## Lokal ansehen / bauen / veröffentlichen

```bash
npm install
npm run dev       # http://localhost:5173
npm test          # Steuerungstest (muss grün sein)
npm run build     # Produktions-Build nach dist/
npm run qr        # QR-Codes + Übersicht
```

Push auf `main` → GitHub Actions baut (nur wenn `npm test` grün ist) und deployt
automatisch nach galerie.horekcollagen.de. Kosten: 0 €.

## Hinweise

- Mittelklasse-Handys: eine Qualitätsstufe schaltet Spiegelung/AO/Schatten ab.
- Gewicht unter 25 MB halten. Keine Preise doppelt pflegen (nur `src/works.js`).
