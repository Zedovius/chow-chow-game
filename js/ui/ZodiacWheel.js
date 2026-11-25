// La rueda del zodiaco: un disco de laca roja con los logos de los 12 animales, en negro (los del bar:
// assets/images/logos/). Al elegir la fecha, gira unas vueltas y se detiene con el
// animal que le toca arriba, bajo la marca, y con su rival (el de enfrente) abajo. Al centro, 福 (la suerte).
// Entonces la rueda se hace a un lado y sale lo que le tocó:
// su logo, en rojo, con su carácter, su nombre (también en chino simplificado, con su pinyin) y una lista corta:
// virtudes, defectos, su trago con sus cualidades (world/cocktails.js) y su rival, contra quien pelea en el nivel
// 12, y por qué chocan (六沖); y ▶.
// Enter, A o ▶ siguen (mientras gira, la detienen de una vez); Esc, B o «< Volver» regresan a la
// fecha (← lleva a «< Volver»).

import { ZODIAC, rivalOf } from '../world/levels.js';
import { cocktailOf } from '../world/cocktails.js';
import { tasteNode } from './taste.js';
import { t, onLanguageChange } from '../i18n/i18n.js';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const TURNS = 3; // vueltas completas antes de detenerse
const SPIN_SECONDS = 2.4;
const logo = (id) => `url("${new URL(`assets/images/logos/${id}.svg`, document.baseURI).href}")`; // completa: si no, la busca junto al CSS

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
      const ink = document.createElement('span');
      ink.className = 'brush';
      ink.style.setProperty('--brush', logo(sign.id));
      token.append(ink);
      this.ring.append(token);
      return { sign, token };
    });
    const make = (tag, className, parent) => {
      const el = document.createElement(tag);
      el.className = className;
      parent?.append(el);
      return el;
    };
    this.dial = make('div', 'wheel__dial');
    this.dial.append(this.ring);
    this.hub = make('span', 'wheel__hub', this.dial);
    this.hub.setAttribute('aria-hidden', 'true');
    this.hub.textContent = '福';
    make('span', 'wheel__pointer', this.dial).setAttribute('aria-hidden', 'true');

    // Lo que le tocó (aparece al detenerse): el animal y, abajo o a un lado, la lista
    this.card = make('div', 'wheel__card');
    this.card.setAttribute('aria-live', 'polite');
    const hero = make('div', 'wheel__hero', this.card);
    this.symbol = make('span', 'brush wheel__symbol', hero);
    const title = make('div', 'wheel__title', hero);
    this.hanzi = make('span', 'wheel__hanzi', title);
    this.hanzi.lang = 'zh-Hant';
    const names = make('div', 'wheel__names', title);
    this.name = make('p', 'wheel__name', names);
    this.chinese = make('p', 'wheel__chinese', names);
    const facts = make('dl', 'wheel__facts', this.card);
    const fact = (className) => {
      const row = make('div', `wheel__fact ${className}`, facts);
      return { row, label: make('dt', '', row), value: make('dd', '', row) };
    };
    this.virtues = fact('wheel__fact--virtues');
    this.flaws = fact('wheel__fact--flaws');
    // Su trago: el nombre, qué lleva y sus tres cualidades
    this.drink = fact('wheel__fact--drink');
    this.drinkName = make('strong', '', this.drink.value);
    this.drinkParts = make('span', 'wheel__detail', this.drink.value);
    // Su rival y por qué
    this.rival = fact('wheel__fact--rival');
    this.rivalInk = make('span', 'brush wheel__rival-ink', this.rival.value);
    this.rivalName = make('strong', '', this.rival.value);
    this.why = make('span', 'wheel__detail', this.rival.value);
    this.ok = make('button', 'button button--primary wheel__ok', this.card);
    this.ok.type = 'button';
    this.okLabel = make('span', 'wheel__ok-label', this.ok); // solo se ve en el celular
    this.ok.append('▶');
    this.ok.addEventListener('click', () => this.confirm());
    root.replaceChildren(this.dial, this.card);
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
        const before = document.activeElement;
        if (event.key === 'ArrowLeft' && this.back) this.back.focus();
        else this.focus();
        if (document.activeElement !== before) this.root.dispatchEvent(new CustomEvent('menu:move', { bubbles: true }));
      }
    });
    onLanguageChange(() => this.render());
    this.render();
  }

  /** Gira y se detiene en sign (un animal de ZODIAC). */
  spin(sign) {
    this.sign = sign;
    this.stopped = false;
    this.root.dispatchEvent(new CustomEvent('wheel:sign', { bubbles: true, detail: sign.id })); // para ir cargando su dibujo
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
    if (!instant) this.notify('spin');
  }

  /** Aviso para el sonido: empezó a girar ('spin'), se detuvo ('stop') o se dejó de ver ('leave'). */
  notify(what) {
    this.root.dispatchEvent(new CustomEvent(`wheel:${what}`, { bubbles: true }));
  }

  stop() {
    if (this.stopped || !this.sign) return;
    this.stopped = true;
    clearTimeout(this.timer);
    const before = this.dial.getBoundingClientRect();
    this.render();
    this.slide(before);
    this.focus();
    if (this.root.getClientRects().length) this.notify('stop'); // si no se salió antes a otro paso
  }

  /** Del centro a su lugar: la rueda se hace a un lado para dejar ver lo que tocó. */
  slide(before) {
    const after = this.dial.getBoundingClientRect();
    if (reducedMotion.matches || !before.width || !after.width || !this.dial.animate) return;
    const [x, y] = [before.left + before.width / 2 - after.left - after.width / 2, before.top + before.height / 2 - after.top - after.height / 2];
    this.dial.animate([{ transform: `translate(${x}px, ${y}px) scale(${before.width / after.width})` }, { transform: 'none' }], { duration: 520, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)' });
  }

  render() {
    const rival = this.sign ? rivalOf(this.sign.id) : null;
    for (const { sign, token } of this.tokens) {
      token.classList.toggle('is-chosen', this.stopped && sign === this.sign);
      token.classList.toggle('is-rival', this.stopped && sign === rival);
    }
    const sign = this.stopped ? this.sign : null;
    this.root.classList.toggle('is-stopped', Boolean(sign));
    this.card.hidden = !sign;
    if (sign) {
      const list = (key) => t(`${key}.${sign.id}`);
      this.symbol.style.setProperty('--brush', logo(sign.id));
      this.hanzi.textContent = sign.hanzi;
      this.name.textContent = t(`zodiac.${sign.id}`);
      const simplified = document.createElement('span');
      simplified.lang = 'zh-Hans';
      simplified.textContent = sign.simplified;
      this.chinese.replaceChildren(simplified, sign.pinyin);
      this.virtues.label.textContent = t('sign.virtues');
      this.virtues.value.textContent = list('virtues');
      this.flaws.label.textContent = t('sign.flaws');
      this.flaws.value.textContent = list('flaws');
      const drink = cocktailOf(sign.id);
      this.drink.row.hidden = !drink;
      if (drink) {
        this.drink.label.textContent = t('drink.label');
        this.drinkName.textContent = drink.name;
        this.drinkParts.textContent = t(`drinks.${sign.id}`);
        this.drinkTaste?.remove();
        this.drinkTaste = tasteNode(drink.taste);
        this.drink.value.append(this.drinkTaste);
      }
      // Su rival: su logo, su nombre, y por qué chocan
      this.rival.label.textContent = t('rival.label');
      this.rivalInk.style.setProperty('--brush', logo(rival.id));
      this.rivalName.textContent = t(`zodiac.${rival.id}`);
      const clash = document.createElement('span');
      clash.lang = 'zh-Hant';
      clash.textContent = '六沖';
      this.why.replaceChildren(clash, t(`rivalry.${sign.id}`));
    }
    this.ok.hidden = !this.stopped;
    this.okLabel.textContent = t('drink.next');
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
