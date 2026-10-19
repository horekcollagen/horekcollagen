# HOREK – Virtuelle Kirche (v4)

Begehbarer 3D-Rundgang durch eine Kirche mit 76 Collagen von HOREK in
Originalgröße (Schiff, Apsis, Kapellen, Vorhalle, Emporen, Bildwand). three.js,
Vite-Build, Deploy über GitHub Actions auf GitHub Pages. Keine Tracker, keine
Fonts von außen, keine externen Requests zur Laufzeit.

Live: https://galerie.horekcollagen.de

## Aufbau

```
index.html                 Startschirm + UI (lädt src/main.js)
src/werke_kirche.json      Werkliste (Quelle für Hängung + Infotafel)
src/hang.js                Hängung: Werk -> Wand -> Weltposition (Zonen 1–7)
src/layout.js              Kirchen-Geometrie, Stationen, begehbare Flächen
src/scene.js               Architektur, Material, Licht, Werke (Lazy-Textur)
src/controls-core.js       Steuerungs-Mathematik (rein, getestet)
src/controls.js            Eingaben, Kollision, Ebenen (Schiff/Emporen)
src/ui.js                  Infotafel (Verkauf), Lupe, Stationsleiste, Laden
src/test/controls.test.js  Steuerungstest (npm test)
tools/process_images.js    Fotos -> Raum-Texturen + hires (npm run images)
tools/qr.js                QR-Codes + Übersicht (npm run qr)
public/works/<nr>.webp     Raum-Texturen (1024 px ab 60 cm, sonst 512 px)
public/works/hires/<nr>.jpg Lupe (lange Seite ≤ 3000 px) – nie als 3D-Textur
public/CNAME               galerie.horekcollagen.de
qr/                        QR-Codes (SVG+PNG) + uebersicht.html (Druck)
startbild/                 Startseiten-Bild (1920×1080, WebP+JPG) für Horizons
```

## Werke ändern (datengetrieben)

Alles kommt aus `src/werke_kirche.json` (Felder: nr, titel, hoehe_cm, breite_cm,
masse_ca, jahr, preis_eur, zone, reihenfolge, seite, datei, foto_px). **Nur diese
Datei pflegen.** Die Hängung (`src/hang.js`) verteilt nach Zone/Seite/Reihenfolge.

- Werk ersetzen/ergänzen: Zeile in der JSON anpassen, dann
  `npm run images` (erzeugt Raum-Textur + hires aus `datei`) und `npm run qr`.
- **Preis:** ausschließlich `preis_eur` aus der JSON. Kein zweiter Preis irgendwo.

## Lupe / hires

Die Infotafel öffnet das Bild groß (Zoom Mausrad/Pinch, Verschieben), aus
`public/works/hires/<nr>.jpg`. Diese Dateien werden nie als 3D-Textur geladen.

## Werk-Links / QR

`…/?werk=<nr>` springt direkt vor das Werk (auch auf den Emporen) und öffnet die
Infotafel. `npm run qr` erzeugt `qr/<nr>.svg` + `.png` + `qr/uebersicht.html`
(druckbare Kärtchen) – lokal, ohne Online-Dienst.

## Ladezeit

- Raum-Texturen laden nach Nähe (zuerst, was vom Eingang sichtbar ist).
- Ziele: ≤ 5 MB bis zum ersten Bild, veröffentlichte Seite < 300 MB.
- Mittelklasse-Handy: Qualitätsstufe senkt Auflösung/Schatten automatisch.

## Bauen / Veröffentlichen

```bash
npm install
npm run dev       # http://localhost:5173
npm test          # Steuerungstest (muss grün sein)
npm run images    # Fotos verarbeiten (braucht den Foto-Ordner)
npm run qr        # QR-Codes + Übersicht
npm run build     # Produktions-Build nach dist/
```

Push auf `main` → GitHub Actions baut (nur wenn `npm test` grün) und deployt nach
galerie.horekcollagen.de. Kosten: 0 €.
