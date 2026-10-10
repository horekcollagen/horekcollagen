// ============================================================================
//  DOM-UI: Startschirm, Infotafel, Hinweis, Raumleiste, Ladebalken.
// ============================================================================
const cm = mm => (mm / 10).toLocaleString('de-DE');

export function createUI({ onEnter, onBack, onRoom, count }) {
  const $ = s => document.querySelector(s);
  const cover = $('#cover'), enter = $('#enter'), barI = $('#bar > i'), barLbl = $('#barLbl');
  const panel = $('#panel'), ask = $('#askBtn'), hint = $('#hint'), rooms = $('#rooms');
  const isTouch = matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window;
  $('#countTxt').textContent = count;
  hint.textContent = isTouch
    ? 'Wischen zum Umsehen · Boden antippen zum Gehen · Durchgang antippen für den nächsten Raum · Bild antippen für Details'
    : 'Ziehen zum Umsehen · Pfeile/WASD zum Gehen · Boden anklicken · Durchgang anklicken · Bild anklicken für Details';

  let entered = false;
  enter.addEventListener('click', () => {
    if (enter.disabled) return;
    cover.classList.add('hide'); entered = true;
    rooms.classList.add('show');
    hint.classList.add('show'); setTimeout(() => hint.classList.remove('show'), 7000);
    onEnter();
  });
  $('#backBtn').addEventListener('click', onBack);
  rooms.querySelectorAll('button').forEach(b => b.addEventListener('click', () => onRoom(+b.dataset.room)));

  let curRoom = 0;
  return {
    setProgress(n, total) { barI.style.width = Math.round(n / total * 100) + '%'; },
    ready() { barI.style.width = '100%'; barLbl.textContent = ''; enter.disabled = false; },
    fail(msg) { enter.disabled = false; barLbl.textContent = msg || 'Trotzdem betreten'; },
    openPanel(w) {
      panel.querySelector('.ptitle').textContent = w.title;
      panel.querySelector('.pdim').textContent = (w.approx === false ? '' : 'ca. ') + cm(w.h) + ' × ' + cm(w.b) + ' cm';
      ask.href = 'mailto:kontakt@horekcollagen.de?subject=' + encodeURIComponent('Anfrage: ' + w.title);
      panel.classList.add('open'); panel.setAttribute('aria-hidden', 'false');
    },
    closePanel() { panel.classList.remove('open'); panel.setAttribute('aria-hidden', 'true'); },
    setRoom(n) {
      if (n === curRoom) return; curRoom = n;
      rooms.querySelectorAll('button').forEach(b => b.classList.toggle('on', +b.dataset.room === n));
    },
    isEntered() { return entered; },
  };
}
