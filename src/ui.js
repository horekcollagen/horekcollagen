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

  // ---- Lupe (Zoom/Pan, hires nur bei Bedarf) ----
  const lupe = $('#lupe'), lupeImg = $('#lupeImg'), lupeStage = $('#lupeStage');
  let scale = 1, tx = 0, ty = 0;
  const applyT = () => { lupeImg.style.transform = `translate(${tx}px,${ty}px) scale(${scale})`; };
  function openLupe(wk) {
    scale = 1; tx = 0; ty = 0; applyT();
    const webp = BASE + 'works/' + wk.slug + '.webp';
    const hires = BASE + 'works/hires/' + wk.nr + '.jpg';
    lupeImg.src = webp;                       // sofort das vorhandene Foto
    const probe = new Image();                // hires separat laden, wenn vorhanden
    probe.onload = () => { lupeImg.src = hires; };
    probe.onerror = () => {};
    probe.src = hires;
    lupe.classList.add('open'); lupe.setAttribute('aria-hidden', 'false');
  }
  const closeLupe = () => { lupe.classList.remove('open'); lupe.setAttribute('aria-hidden', 'true'); };
  $('#lupeClose').addEventListener('click', closeLupe);
  lupe.addEventListener('wheel', e => { e.preventDefault(); scale = Math.min(6, Math.max(1, scale * (e.deltaY < 0 ? 1.12 : 0.89))); if (scale === 1) { tx = 0; ty = 0; } applyT(); }, { passive: false });
  // Ziehen + Pinch
  const pts = new Map(); let last = null, pinch0 = 0, scale0 = 1;
  lupe.addEventListener('pointerdown', e => { pts.set(e.pointerId, e); lupe.classList.add('drag'); lupe.setPointerCapture(e.pointerId); if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); scale0 = scale; } else last = { x: e.clientX, y: e.clientY }; });
  lupe.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, e);
    if (pts.size === 2) { const [a, b] = [...pts.values()]; const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); scale = Math.min(6, Math.max(1, scale0 * d / (pinch0 || d))); applyT(); }
    else if (last && scale > 1) { tx += e.clientX - last.x; ty += e.clientY - last.y; last = { x: e.clientX, y: e.clientY }; applyT(); }
  });
  const endPt = e => { pts.delete(e.pointerId); if (pts.size < 2) last = null; if (!pts.size) lupe.classList.remove('drag'); };
  lupe.addEventListener('pointerup', endPt); lupe.addEventListener('pointercancel', endPt);
  addEventListener('keydown', e => { if (e.key === 'Escape') closeLupe(); });
  let curWork = null;
  $('#lupeBtn').addEventListener('click', () => { if (curWork) openLupe(curWork); });

  let curRoom = 0;
  return {
    setProgress(n, total) { barI.style.width = Math.round(n / total * 100) + '%'; },
    ready() { barI.style.width = '100%'; barLbl.textContent = ''; enter.disabled = false; },
    fail(msg) { enter.disabled = false; barLbl.textContent = msg || 'Trotzdem betreten'; },
    enterNow() { if (!entered) enter.click(); },
    openPanel(w) {
      curWork = w;
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
    closePanel() { panel.classList.remove('open'); panel.setAttribute('aria-hidden', 'true'); document.body.classList.remove('panel-open'); },
    setRoom(n) {
      if (n === curRoom) return; curRoom = n;
      rooms.querySelectorAll('button[data-station]').forEach(b => b.classList.toggle('on', b.dataset.station === String(n)));
    },
    isEntered() { return entered; },
  };
}
