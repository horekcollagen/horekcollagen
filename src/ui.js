// ============================================================================
//  DOM-UI: Startschirm, Verkaufs-Infotafel, Lupe, Bedienhilfe, Raumleiste, Laden.
// ============================================================================
const cm = mm => (mm / 10).toLocaleString('de-DE');
const eur = n => n.toLocaleString('de-DE') + ' €';
const mailto = (subjPrefix, title) => 'mailto:kontakt@horekcollagen.de?subject=' + encodeURIComponent(subjPrefix + ': ' + title);
const BASE = import.meta.env.BASE_URL;

export function createUI({ onEnter, onBack, onStation, onNext, count }) {
  const $ = s => document.querySelector(s);
  const cover = $('#cover'), enter = $('#enter'), barI = $('#bar > i'), barLbl = $('#barLbl');
  const panel = $('#panel'), hint = $('#hint'), rooms = $('#rooms');
  const isTouch = matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window;
  $('#countTxt').textContent = count;
  hint.textContent = isTouch
    ? 'Wischen zum Umsehen · Boden/Treppe antippen zum Gehen · Durchgang antippen · Bild antippen für Details'
    : 'Ziehen zum Umsehen · Pfeile/WASD zum Gehen · Boden/Treppe anklicken · Durchgang anklicken · Bild anklicken';

  let entered = false;
  enter.addEventListener('click', () => {
    if (enter.disabled) return;
    cover.classList.add('hide'); entered = true;
    rooms.classList.add('show'); hint.classList.add('show'); setTimeout(() => hint.classList.remove('show'), 7000);
    onEnter();
  });
  $('#backBtn').addEventListener('click', onBack);
  rooms.querySelectorAll('button[data-station]').forEach(b => b.addEventListener('click', () => onStation(b.dataset.station)));
  const weiter = document.querySelector('#weiter'); if (weiter) weiter.addEventListener('click', onNext);

  // ---- Hover-Lupe: runde Lupe folgt dem Zeiger über dem Werk und zeigt die hires-Datei vergrößert ----
  //   Maus: über dem Werk erscheint die Lupe am Zeiger, verlässt die Maus das Werk, verschwindet sie.
  //   Handy: Finger auf das Werk legen und ziehen zeigt die Lupe etwas oberhalb des Fingers, loslassen blendet aus.
  //   Mausrad ändert die Vergrößerung zwischen 2- und 5-fach. Kleine Fotos werden nicht hochgerechnet.
  const LENS_D = 250;
  const lens = document.createElement('div');
  lens.id = 'lens'; lens.setAttribute('aria-hidden', 'true');
  lens.style.cssText = 'position:fixed;width:' + LENS_D + 'px;height:' + LENS_D + 'px;border-radius:50%;'
    + 'border:3px solid rgba(255,255,255,.9);box-shadow:0 6px 28px rgba(0,0,0,.55);pointer-events:none;'
    + 'z-index:45;display:none;background-repeat:no-repeat;background-color:#15120f';
  document.body.appendChild(lens);
  const src = { ready: false, url: '', iw: 0, ih: 0 };
  let zoom = 3, lastL = null;
  function preloadHires(wk) {               // hires laden, sobald die Infotafel aufgeht
    src.ready = false; src.url = ''; src.iw = 0; src.ih = 0; lastL = null;
    const hires = BASE + 'works/hires/' + wk.nr + '.jpg';
    const webp = BASE + 'works/' + wk.slug + '.webp';
    const im = new Image();
    im.onload = () => { src.ready = true; src.url = hires; src.iw = im.naturalWidth; src.ih = im.naturalHeight; };
    im.onerror = () => { const w2 = new Image(); w2.onload = () => { src.ready = true; src.url = webp; src.iw = w2.naturalWidth; src.ih = w2.naturalHeight; }; w2.src = webp; };
    im.src = hires;
  }
  function showLens(clientX, clientY, u, v, screenW, touch) {
    if (!src.ready || !src.url) return;
    // Darstellungsbreite = zoom × Breite des Werks auf dem Schirm, aber nie über die native Pixelzahl (kein Hochrechnen).
    const dispW = Math.min(zoom * screenW, src.iw);
    const dispH = dispW * src.ih / src.iw;
    const px = u * dispW, py = (1 - v) * dispH;   // three.js-UV unten links -> Bild oben links: v' = 1 - v
    lens.style.backgroundImage = 'url("' + src.url + '")';
    lens.style.backgroundSize = dispW.toFixed(1) + 'px ' + dispH.toFixed(1) + 'px';
    lens.style.backgroundPosition = (LENS_D / 2 - px).toFixed(1) + 'px ' + (LENS_D / 2 - py).toFixed(1) + 'px';
    const offY = touch ? (LENS_D / 2 + 40) : 0;   // auf dem Handy etwas oberhalb des Fingers
    lens.style.left = Math.round(clientX - LENS_D / 2) + 'px';
    lens.style.top = Math.round(clientY - LENS_D / 2 - offY) + 'px';
    lens.style.display = 'block';
    lastL = { clientX, clientY, u, v, screenW, touch };
  }
  function hideLens() { lens.style.display = 'none'; lastL = null; }
  addEventListener('wheel', e => {
    if (lens.style.display !== 'block' || !lastL) return;
    e.preventDefault();
    zoom = Math.min(5, Math.max(2, zoom * (e.deltaY < 0 ? 1.12 : 0.89)));
    showLens(lastL.clientX, lastL.clientY, lastL.u, lastL.v, lastL.screenW, lastL.touch);
  }, { passive: false });

  let curRoom = 0;
  return {
    setProgress(n, total) { barI.style.width = Math.round(n / total * 100) + '%'; },
    ready() { barI.style.width = '100%'; barLbl.textContent = ''; enter.disabled = false; },
    fail(msg) { enter.disabled = false; barLbl.textContent = msg || 'Trotzdem betreten'; },
    enterNow() { if (!entered) enter.click(); },
    lens: showLens,
    hideLens,
    openPanel(w) {
      preloadHires(w);
      panel.querySelector('.ptitle').textContent = w.title;
      panel.querySelector('.pyear').textContent = w.year;
      panel.querySelector('.pdim').textContent = (w.approx === false ? '' : 'ca. ') + cm(w.h) + ' × ' + cm(w.b) + ' cm';
      const pt = panel.querySelector('.ptext');
      if (w.text && w.text.trim()) { pt.textContent = w.text; pt.hidden = false; } else { pt.hidden = true; }
      panel.querySelector('.pprice').textContent = eur(w.price);
      panel.querySelector('#askOrig').href = mailto('Original', w.title);
      panel.querySelector('#askPrint').href = mailto('Druck', w.title);
      panel.classList.add('open'); panel.setAttribute('aria-hidden', 'false');
      document.body.classList.add('panel-open');   // Raumleiste + Bedienzeile ausblenden
    },
    closePanel() { hideLens(); panel.classList.remove('open'); panel.setAttribute('aria-hidden', 'true'); document.body.classList.remove('panel-open'); },
    setRoom(n) {
      if (n === curRoom) return; curRoom = n;
      rooms.querySelectorAll('button[data-station]').forEach(b => b.classList.toggle('on', b.dataset.station === String(n)));
    },
    isEntered() { return entered; },
  };
}
