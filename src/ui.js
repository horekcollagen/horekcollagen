// ============================================================================
//  DOM-UI: Startschirm, Verkaufs-Infotafel, Großansicht + Lupe, Bedienhilfe,
//  Raumleiste, Laden.
//  Großansicht: Klick auf ein Werk -> das Bild löst sich von der Wand und fliegt
//  in eine große 2D-Ansicht (Raum dahinter abgedunkelt), Infotafel daneben.
//  Die runde Lupe folgt dem Zeiger NUR über der Großansicht.
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
    ? 'Wischen zum Umsehen · Boden/Treppe antippen zum Gehen · Durchgang antippen · Bild antippen für Großansicht'
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

  // ---- Großansicht (Backdrop + fliegendes Bild) + Lupe ----
  const LENS_D = 250;
  const back = document.createElement('div'); back.id = 'zoomback'; document.body.appendChild(back);
  const zimg = document.createElement('img'); zimg.id = 'zoomimg'; zimg.alt = ''; zimg.draggable = false;
  zimg.style.touchAction = 'none'; zimg.style.userSelect = 'none'; document.body.appendChild(zimg);
  const lens = document.createElement('div'); lens.id = 'lens';
  lens.style.cssText = 'position:fixed;width:' + LENS_D + 'px;height:' + LENS_D + 'px;border-radius:50%;'
    + 'border:3px solid rgba(255,255,255,.9);box-shadow:0 6px 28px rgba(0,0,0,.55);pointer-events:none;'
    + 'z-index:46;display:none;background-repeat:no-repeat;background-color:#15120f';
  document.body.appendChild(lens);

  const src = { ready: false, url: '', iw: 0, ih: 0, nr: null };
  let zoom = 3, lastL = null, onCloseCb = null, closing = false, curWk = null, zoomFrom = null;

  const setRect = (el, r) => { el.style.left = r.left + 'px'; el.style.top = r.top + 'px'; el.style.width = r.width + 'px'; el.style.height = r.height + 'px'; };
  function targetRect(wk) {
    const vw = innerWidth, vh = innerHeight, m = 16, aspect = wk.b / wk.h, mobile = vw < 760;
    let availW, availH; const ox = m, oy = m;
    if (mobile) { availW = vw - 2 * m; availH = Math.round(vh * 0.54) - 2 * m; }       // Handy: oben
    else { const pw = Math.min(360, vw * 0.86); availW = vw - pw - 3 * m; availH = vh - 2 * m; }  // Rechner: neben der Infotafel
    let w = availW, h = w / aspect; if (h > availH) { h = availH; w = h * aspect; }     // Seitenverhältnis exakt, nichts beschnitten
    return { left: Math.round(ox + (availW - w) / 2), top: Math.round(oy + (availH - h) / 2), width: Math.round(w), height: Math.round(h) };
  }
  function preloadHires(wk) {               // hires laden; bis dahin zeigt die Großansicht die Wandtextur
    src.ready = false; src.url = ''; src.iw = 0; src.ih = 0; src.nr = wk.nr; lastL = null;
    const hires = BASE + 'works/hires/' + wk.nr + '.jpg', webp = BASE + 'works/' + wk.slug + '.webp';
    const im = new Image();
    im.onload = () => { if (src.nr !== wk.nr) return; src.ready = true; src.url = hires; src.iw = im.naturalWidth; src.ih = im.naturalHeight; if (curWk && curWk.nr === wk.nr) zimg.src = hires; };
    im.onerror = () => { const w2 = new Image(); w2.onload = () => { if (src.nr !== wk.nr) return; src.ready = true; src.url = webp; src.iw = w2.naturalWidth; src.ih = w2.naturalHeight; }; w2.src = webp; };
    im.src = hires;
  }
  function showLensDom(clientX, clientY, touch) {
    if (!src.ready || !src.url) return;
    const r = zimg.getBoundingClientRect();
    if (src.iw <= r.width + 1) { hideLens(); return; }   // Foto nicht größer als die Großansicht -> keine Lupe
    const u = (clientX - r.left) / r.width, v = (clientY - r.top) / r.height;
    if (u < 0 || u > 1 || v < 0 || v > 1) { hideLens(); return; }
    const dispW = Math.min(zoom * r.width, src.iw), dispH = dispW * src.ih / src.iw;   // nie über die Pixel des Fotos hinaus
    const px = u * dispW, py = v * dispH;                 // DOM: Ursprung oben links, kein Flip
    lens.style.backgroundImage = 'url("' + src.url + '")';
    lens.style.backgroundSize = dispW.toFixed(1) + 'px ' + dispH.toFixed(1) + 'px';
    lens.style.backgroundPosition = (LENS_D / 2 - px).toFixed(1) + 'px ' + (LENS_D / 2 - py).toFixed(1) + 'px';
    const offY = touch ? (LENS_D / 2 + 40) : 0;           // Handy: etwas oberhalb des Fingers
    lens.style.left = Math.round(clientX - LENS_D / 2) + 'px';
    lens.style.top = Math.round(clientY - LENS_D / 2 - offY) + 'px';
    lens.style.display = 'block'; lastL = { clientX, clientY, touch };
  }
  const hideLens = () => { lens.style.display = 'none'; lastL = null; };

  let lensDown = false;
  zimg.addEventListener('mousemove', e => { if (e.pointerType === 'touch') return; showLensDom(e.clientX, e.clientY, false); });
  zimg.addEventListener('mouseleave', hideLens);
  zimg.addEventListener('pointerdown', e => { if (e.pointerType === 'touch') { lensDown = true; showLensDom(e.clientX, e.clientY, true); } });
  zimg.addEventListener('pointermove', e => { if (e.pointerType === 'touch' && lensDown) showLensDom(e.clientX, e.clientY, true); });
  const endTouch = () => { if (lensDown) { lensDown = false; hideLens(); } };
  zimg.addEventListener('pointerup', endTouch); zimg.addEventListener('pointercancel', endTouch);
  addEventListener('wheel', e => { if (lens.style.display !== 'block' || !lastL) return; e.preventDefault();
    zoom = Math.min(5, Math.max(2, zoom * (e.deltaY < 0 ? 1.12 : 0.89))); showLensDom(lastL.clientX, lastL.clientY, lastL.touch); }, { passive: false });
  addEventListener('keydown', e => { if (e.key === 'Escape' && document.body.classList.contains('zoom-open')) closeZoom(); });
  back.addEventListener('click', () => closeZoom());
  addEventListener('resize', () => { if (curWk && !closing) setRect(zimg, targetRect(curWk)); });

  function fillPanel(w) {
    panel.querySelector('.ptitle').textContent = w.title;
    panel.querySelector('.pyear').textContent = (w.year != null && w.year !== '') ? (w.year + ' · ') : '';
    panel.querySelector('.pdim').textContent = (w.approx === false ? '' : 'ca. ') + cm(w.h) + ' × ' + cm(w.b) + ' cm';
    const pt = panel.querySelector('.ptext');
    if (w.text && w.text.trim()) { pt.textContent = w.text; pt.hidden = false; } else { pt.hidden = true; }
    panel.querySelector('.pprice').textContent = (w.price != null && w.price !== '') ? eur(w.price) : 'Preis auf Anfrage';
    panel.querySelector('#askOrig').href = mailto('Original', w.title);
    panel.querySelector('#askPrint').href = mailto('Druck', w.title);
  }
  function openZoom(wk, fromRect, onClose) {
    curWk = wk; onCloseCb = onClose; zoomFrom = fromRect; closing = false; zoom = 3; hideLens();
    fillPanel(wk); preloadHires(wk);
    zimg.style.transition = 'none'; zimg.style.opacity = '1'; zimg.src = BASE + 'works/' + wk.slug + '.webp';
    setRect(zimg, fromRect); zimg.style.display = 'block';
    document.body.classList.add('zoom-open', 'panel-open');
    panel.classList.add('open'); panel.setAttribute('aria-hidden', 'false');
    const t = targetRect(wk);
    requestAnimationFrame(() => requestAnimationFrame(() => { zimg.style.transition = ''; setRect(zimg, t); }));
  }
  function closeZoom() {
    if (closing || !curWk) return; closing = true; hideLens();
    setRect(zimg, zoomFrom);                       // Bild fliegt zurück an seinen Platz
    document.body.classList.remove('zoom-open');
    panel.classList.remove('open'); panel.setAttribute('aria-hidden', 'true');
    setTimeout(() => { zimg.style.display = 'none'; document.body.classList.remove('panel-open');
      const cb = onCloseCb; curWk = null; onCloseCb = null; if (cb) cb(); }, 410);
  }
  function hardClosePanel() {                        // harter Abschluss (Stationswechsel): ohne Flug
    hideLens(); closing = false; curWk = null; onCloseCb = null;
    zimg.style.display = 'none'; document.body.classList.remove('zoom-open', 'panel-open');
    panel.classList.remove('open'); panel.setAttribute('aria-hidden', 'true');
  }

  let curRoom = 0;
  return {
    setProgress(n, total) { barI.style.width = Math.round(n / total * 100) + '%'; },
    ready() { barI.style.width = '100%'; barLbl.textContent = ''; enter.disabled = false; },
    fail(msg) { enter.disabled = false; barLbl.textContent = msg || 'Trotzdem betreten'; },
    enterNow() { if (!entered) enter.click(); },
    openZoom, closeZoom,
    closePanel() { hardClosePanel(); },
    zoomOpen() { return !!curWk; },
    setRoom(n) {
      if (n === curRoom) return; curRoom = n;
      rooms.querySelectorAll('button[data-station]').forEach(b => b.classList.toggle('on', b.dataset.station === String(n)));
    },
    isEntered() { return entered; },
  };
}
