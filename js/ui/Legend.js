// Lo que vale cada cosa que se recoge, como en las máquinas de arcade: sin texto, solo iconos y
// números. Sale al elegir la dificultad y se quita con el primer salto; abajo parpadea el aviso para
// empezar.
//
//   [la estrella]   ▸  ☁          (el poder de volar)
//   [los cócteles]  ▸  ◆ ×3    100
//   [la comida]     ▸  ♥ ×1    200
//
// Los iconos son los mismos dibujos del juego (graphics/assets.js) y los mismos símbolos del HUD (el
// rombo de las bolas de fuego, el corazón), así se reconocen al jugar. Para quien usa lector de
// pantalla, todo se dice en el aria-label.

import { CONFIG } from '../config.js';
import { COCKTAILS, FOODS } from '../entities/Pickup.js';
import { IMAGES } from '../graphics/assets.js';
import { t } from '../i18n/i18n.js';

const PIXELS = CONFIG.width / CONFIG.pixel; // ancho del canvas: las imágenes van a su tamaño de pixel

function element(tag, className, children = []) {
  const el = document.createElement(tag);
  el.className = className;
  el.append(...children);
  return el;
}

/** Una imagen del juego, a su tamaño de pixel relativo al escenario. */
function icon(src) {
  const img = new Image();
  img.className = 'legend__item';
  img.alt = '';
  img.decoding = 'async';
  img.addEventListener('load', () => {
    img.style.width = `${(img.naturalWidth / PIXELS) * 100}cqw`;
  });
  img.src = src;
  return img;
}

export class Legend {
  constructor(root) {
    this.root = root;
  }

  /**
   * score: el multiplicador de puntos de la dificultad; fire, hearts: lo que da cada cosa; prompt:
   * el aviso para empezar, que parpadea debajo.
   */
  show({ score = 1, fire, hearts, prompt = '' }) {
    const points = (base) => String(Math.round(base * score));
    const row = (sources, symbol, amount, value) => element('div', 'legend__row', [
      element('span', 'legend__items', sources.filter(Boolean).map(icon)),
      element('span', 'legend__arrow'),
      element('span', 'legend__gain', [element('span', symbol), `×${amount}`]),
      element('span', 'legend__points', [points(value)]),
    ]);
    const star = element('div', 'legend__row', [
      element('span', 'legend__items', [icon(IMAGES.star)]),
      element('span', 'legend__arrow'),
      element('span', 'legend__gain', [element('span', 'legend__cloud')]),
      element('span', 'legend__points'),
    ]);
    this.root.replaceChildren(
      star,
      row(COCKTAILS.map((name) => IMAGES.cocktails[name]), 'hud__ammo-icon', fire, CONFIG.cocktails.points),
      row(FOODS.map((name) => IMAGES.foods[name]), 'hud__life', hearts, CONFIG.food.points),
      element('p', 'legend__prompt', [prompt]),
    );
    this.root.setAttribute('aria-label', t('legend.label', {
      fire,
      hearts,
      cocktail: points(CONFIG.cocktails.points),
      food: points(CONFIG.food.points),
    }));
    this.root.hidden = false;
  }

  hide() {
    this.root.hidden = true;
  }
}
