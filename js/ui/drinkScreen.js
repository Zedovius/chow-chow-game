// La pantalla del trago, al terminar el viaje: fondo negro y el vaso del signo dando vueltas
// (graphics/glassArt.js), con el logo del animal, el nombre del trago, qué lleva y sus cualidades. Sale sola, antes
// del nombre para HI RECORDS: es el premio. Se sigue con el botón (o Enter, A, FIRE, Esc) o sola, al minuto. Al
// principio no hace caso un momento: quien viene disparándole al jefe no se la salta sin querer.

import { CONFIG } from '../config.js';
import { signById } from '../world/levels.js';
import { cocktailOf } from '../world/cocktails.js';
import { tasteNode } from './taste.js';
import { glassSheet, SHEET } from '../graphics/glassArt.js';
import { t } from '../i18n/i18n.js';

const { seconds, guard, turn } = CONFIG.drinkScreen;
const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)') ?? { matches: false };

function element(tag, className, parent, text = '') {
  const el = document.createElement(tag);
  el.className = className;
  if (text) el.textContent = text;
  parent?.append(el);
  return el;
}

/** El vaso girando en un canvas. Devuelve { canvas, stop }. */
function spinningGlass(sign) {
  const { w, h, frames, columns } = SHEET;
  const canvas = document.createElement('canvas');
  canvas.className = 'tribute__glass';
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const sheet = new Image();
  let shown = -1;
  let request = 0;
  let stopped = false;
  const start = performance.now();
  const draw = (now) => {
    if (stopped) return;
    const frame = reducedMotion.matches ? 6 : Math.floor(((now - start) / 1000 / turn) * frames) % frames;
    if (frame !== shown && frame >= 0) {
      shown = frame;
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(sheet, (frame % columns) * w, Math.floor(frame / columns) * h, w, h, 0, 0, w, h);
    }
    if (!reducedMotion.matches) request = requestAnimationFrame(draw);
  };
  sheet.addEventListener('load', () => draw(performance.now()));
  sheet.src = glassSheet(sign);
  return {
    canvas,
    stop: () => {
      stopped = true;
      cancelAnimationFrame(request);
    },
  };
}

/** Muestra el trago de un signo en el diálogo del juego y espera a que sigan. */
export async function showDrink({ dialogs, sign }) {
  const drink = cocktailOf(sign);
  if (!drink) return;
  const root = element('div', 'tribute');
  const stage = element('div', 'tribute__stage', root);
  stage.setAttribute('role', 'img');
  stage.setAttribute('aria-label', t('drink.aria', { name: drink.name, parts: t(`drinks.${sign}`) }));
  const glass = spinningGlass(sign);
  stage.append(glass.canvas);

  const text = element('div', 'tribute__text', root);
  const head = element('div', 'tribute__sign', text);
  head.setAttribute('aria-hidden', 'true');
  const ink = element('span', 'brush tribute__ink', head);
  ink.style.setProperty('--brush', `url("${new URL(`assets/images/logos/${sign}.svg`, document.baseURI).href}")`);
  element('span', 'tribute__hanzi', head, signById(sign).hanzi).lang = 'zh-Hant';
  element('p', 'tribute__label', text, t('drink.label'));
  element('p', 'tribute__name', text, drink.name);
  element('p', 'tribute__parts', text, t(`drinks.${sign}`));
  text.append(tasteNode(drink.taste));

  // Un momento sin hacer caso: se detiene el clic (también el de Enter, A y FIRE) antes de que llegue al botón
  const opened = performance.now();
  const early = () => performance.now() - opened < guard * 1000;
  const hold = (event) => {
    if (!early()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  dialogs.el.addEventListener('click', hold, true);
  const timer = setTimeout(() => dialogs.close('next'), seconds * 1000);
  dialogs.el.classList.add('story--tribute');
  try {
    await dialogs.show({
      title: '',
      extra: [root],
      actions: [{ label: t('drink.next'), value: 'next', primary: true }],
      onCancel: () => { if (!early()) dialogs.close('next'); },
    });
  } finally {
    clearTimeout(timer);
    glass.stop();
    dialogs.el.removeEventListener('click', hold, true);
    dialogs.el.classList.remove('story--tribute');
  }
}
