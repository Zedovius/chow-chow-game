// La rueda del zodiaco: los 12 animales en círculo. Al elegir la fecha, gira unas vueltas y se
// detiene con el animal que le toca arriba, bajo la flecha. Entonces, a su lado, su tarjeta: el
// animal en grande, su símbolo (el carácter tradicional), su nombre en chino simplificado con su
// pinyin, su nombre en el idioma del juego y sus cuatro virtudes; abajo, su rival (el animal de
// enfrente en la rueda, contra quien pelea en el nivel 13) y por qué chocan; y ▶. En la rueda, una
// línea une al animal con su rival, que queda abajo, enfrente.
// Enter, A o ▶ siguen (mientras gira, la detienen de una vez); Esc, B o «< Volver» regresan a la
// fecha (← lleva a «< Volver»).
//
// Cada animal es, por ahora, un disco de su color con su inicial (PROVISIONAL): cuando haya arte, su
// icono (IMAGES.animals[id].icon en graphics/assets.js) ocupa su lugar.

import { ZODIAC, rivalOf } from '../world/levels.js';
import { IMAGES } from '../graphics/assets.js';
import { t, onLanguageChange } from '../i18n/i18n.js';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const TURNS = 3; // vueltas completas antes de detenerse
const SPIN_SECONDS = 2.4;

export class ZodiacWheel {
  /**
   * root: donde va la rueda; onDone(sign): siguió con ese animal; onBack: regresar a la fecha;
   * back: el botón «< Volver» (← lo enfoca).
   */
  constructor(root, { onDone, onBack, back = null }) {
    this.root = root;
    this.back = back;
    this.onDone = onDone;
    this.onBack = onBack;
    this.sign = null;
    this.angle = 0;
    this.stopped = false;

    this.ring = document.createElement('div');
    this.ring.className = 'wheel__ring';
    this.tokens = ZODIAC.map((sign, i) => {
      const token = document.createElement('span');
      token.className = 'wheel__token';
      token.style.setProperty('--i', String(i));
      token.style.setProperty('--color', sign.body);
      const icon = IMAGES.animals?.[sign.id]?.icon;
      if (icon) {
        const img = new Image();
        img.src = icon;
        img.alt = '';
        token.append(img);
      }
      this.ring.append(token);
      return { sign, token };
    });
    const pointer = document.createElement('span');
    pointer.className = 'wheel__pointer';
    pointer.setAttribute('aria-hidden', 'true');
    // La línea del choque: de arriba (el animal) a abajo (su rival), por el centro
    const clash = document.createElement('span');
    clash.className = 'wheel__clash';
    clash.setAttribute('aria-hidden', 'true');
    const dial = document.createElement('div');
    dial.className = 'wheel__dial';
    dial.append(clash, this.ring, pointer);

    // La tarjeta del animal (aparece al detenerse)
    const make = (tag, className, parent) => {
      const el = document.createElement(tag);
      el.className = className;
      parent?.append(el);
      return el;
    };
    this.card = make('div', 'wheel__card');
    this.card.setAttribute('aria-live', 'polite');
    const top = make('div', 'wheel__top', this.card);
    this.portrait = make('span', 'wheel__portrait', top);
    this.hanzi = make('span', 'wheel__hanzi', top);
    this.hanzi.lang = 'zh-Hant';
    this.chinese = make('p', 'wheel__chinese', this.card);
    this.name = make('p', 'wheel__name', this.card);
    this.virtues = make('ul', 'wheel__virtues', this.card);
    // Su rival y por qué
    const rival = make('div', 'wheel__rival', this.card);
    this.rivalLabel = make('span', 'wheel__rival-label', rival);
    this.rivalDisc = make('span', 'wheel__rival-disc', rival);
    this.rivalHanzi = make('span', 'wheel__rival-hanzi', rival);
    this.rivalHanzi.lang = 'zh-Hant';
    this.rivalName = make('span', 'wheel__rival-name', rival);
    this.why = make('p', 'wheel__why', this.card);
    this.ok = make('button', 'button button--primary wheel__ok', this.card);
    this.ok.type = 'button';
    this.ok.textContent = '▶';
    this.ok.addEventListener('click', () => this.confirm());
    root.replaceChildren(dial, this.card);
    root.dataset.nativeKeys = '';
    root.tabIndex = -1; // para tener el foco cuando ▶ no se ve (con pantalla táctil, ▶ es FIRE)

    this.ring.addEventListener('transitionend', () => this.stop());
    root.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        this.onBack();
      } else if (event.key.startsWith('Arrow')) {
        // ← va a «< Volver»; las demás, a ▶. No le llegan al juego
        event.preventDefault();
        event.stopPropagation();
        if (event.key === 'ArrowLeft' && this.back) this.back.focus();
        else this.focus();
      }
    });
    onLanguageChange(() => this.render());
    this.render();
  }

  /** Gira y se detiene en sign (un animal de ZODIAC). */
  spin(sign) {
    this.sign = sign;
    this.stopped = false;
    this.render();
    const index = ZODIAC.indexOf(sign);
    // Siempre hacia adelante: desde donde quedó, unas vueltas más hasta que el animal quede arriba
    const target = -index * 30;
    const base = this.angle - (((this.angle - target) % 360) + 360) % 360;
    this.angle = base - TURNS * 360;
    const instant = reducedMotion.matches;
    this.ring.style.transition = instant ? 'none' : `--spin ${SPIN_SECONDS}s cubic-bezier(0.12, 0.7, 0.2, 1)`;
    this.ring.style.setProperty('--spin', `${this.angle}deg`);
    // Por si el navegador no avisa del fin de la animación
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.stop(), instant ? 0 : SPIN_SECONDS * 1000 + 100);
  }

  stop() {
    if (this.stopped || !this.sign) return;
    this.stopped = true;
    clearTimeout(this.timer);
    this.render();
    this.focus();
  }

  render() {
    const rival = this.sign ? rivalOf(this.sign.id) : null;
    for (const { sign, token } of this.tokens) {
      token.textContent = token.querySelector('img') ? '' : t(`zodiac.${sign.id}`).slice(0, 1);
      token.classList.toggle('is-chosen', this.stopped && sign === this.sign);
      token.classList.toggle('is-rival', this.stopped && sign === rival);
    }
    const sign = this.stopped ? this.sign : null;
    this.root.classList.toggle('is-stopped', Boolean(sign));
    this.card.hidden = !sign;
    if (sign) {
      // El animal: su icono si ya hay arte; si no, un disco de su color con su inicial (PROVISIONAL)
      const icon = IMAGES.animals?.[sign.id]?.icon;
      this.portrait.replaceChildren();
      this.portrait.style.setProperty('--color', sign.body);
      if (icon) {
        const img = new Image();
        img.src = icon;
        img.alt = '';
        this.portrait.append(img);
      } else {
        this.portrait.textContent = t(`zodiac.${sign.id}`).slice(0, 1);
      }
      this.hanzi.textContent = sign.hanzi;
      this.chinese.replaceChildren();
      const simplified = document.createElement('span');
      simplified.lang = 'zh-Hans';
      simplified.textContent = sign.simplified;
      const pinyin = document.createElement('span');
      pinyin.className = 'wheel__pinyin';
      pinyin.textContent = sign.pinyin;
      this.chinese.append(simplified, ' · ', pinyin);
      this.name.textContent = t(`zodiac.${sign.id}`);
      this.virtues.replaceChildren(...t(`virtues.${sign.id}`).split(' · ').map((virtue) => {
        const li = document.createElement('li');
        li.textContent = virtue;
        return li;
      }));
      // Su rival: su icono (o su disco), su símbolo y su nombre; y por qué chocan
      this.rivalLabel.textContent = t('rival.label');
      this.rivalDisc.style.setProperty('--color', rival.body);
      const rivalIcon = IMAGES.animals?.[rival.id]?.icon;
      this.rivalDisc.replaceChildren();
      if (rivalIcon) {
        const img = new Image();
        img.src = rivalIcon;
        img.alt = '';
        this.rivalDisc.append(img);
      } else {
        this.rivalDisc.textContent = t(`zodiac.${rival.id}`).slice(0, 1);
      }
      this.rivalHanzi.textContent = rival.hanzi;
      this.rivalName.textContent = t(`zodiac.${rival.id}`);
      const chong = document.createElement('span');
      chong.lang = 'zh-Hans';
      chong.textContent = '六冲';
      const contrast = document.createElement('span');
      contrast.className = 'wheel__contrast';
      contrast.textContent = t(`rivalry.${sign.id}`);
      this.why.replaceChildren(chong, ` · ${t('rival.why')}`, document.createElement('br'), contrast);
    }
    this.ok.hidden = !this.stopped;
    this.root.setAttribute('aria-label', sign ? t('sign.labelRival', { name: t(`zodiac.${sign.id}`), rival: t(`zodiac.${rival.id}`) }) : '');
  }

  /** El foco en ▶ si se ve; si no (girando, o con pantalla táctil), en la rueda misma. */
  focus() {
    if (this.stopped && this.ok.getClientRects().length) this.ok.focus({ preventScroll: true });
    else this.root.focus({ preventScroll: true });
  }

  /** Enter, A o ▶: sigue con el animal; si aún gira, se detiene de una vez y muestra la tarjeta. */
  confirm() {
    if (!this.sign) return;
    if (!this.stopped) {
      this.ring.style.transition = 'none'; // salta al final del giro (--spin ya es el ángulo final)
      this.stop();
      return;
    }
    this.onDone(this.sign);
  }
}
