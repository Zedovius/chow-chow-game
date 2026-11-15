// Marcador en HTML (encima del canvas): nivel, vidas, bolas de fuego, racha, puntos y récord.

import { t, getLanguage } from '../i18n/i18n.js';
import { sparkle } from './record.js';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

const pad = (n) => String(Math.floor(n)).padStart(5, '0');

// El corazón pixel de 7x6 (el mismo contorno que .hud__life en styles.css)
const HEART = 'M1 0H3V1H4V0H6V1H7V3H6V4H5V5H4V6H3V5H2V4H1V3H0V1H1Z';

/**
 * Un corazón lleno hasta fill: 1 lleno, 0 vacío y en medio, la silueta rellena de izquierda a
 * derecha (el relleno es el mismo corazón dentro de un <svg> más angosto, que lo recorta).
 */
function heart(fill) {
  const li = document.createElement('li');
  li.setAttribute('aria-hidden', 'true'); // el corazón pixel se dibuja con CSS (o SVG)
  if (fill >= 1) li.className = 'hud__life';
  else if (fill <= 0) li.className = 'hud__life hud__life--empty';
  else {
    li.className = 'hud__life hud__life--partial';
    li.innerHTML = `<svg viewBox="0 0 7 6"><svg width="${(7 * fill).toFixed(2)}" height="6"><path d="${HEART}" fill="currentColor"/></svg><path d="${HEART}" fill="none" stroke="currentColor" stroke-width="0.5"/></svg>`;
  }
  return li;
}

/** Cuánto de cada uno de slots corazones está lleno, con lives corazones (puede ser 1,5). */
const fillsFor = (lives, slots) => Array.from({ length: slots }, (_, i) => Math.min(1, Math.max(0, lives - i)));

export class HUD {
  constructor({ level, lives, ammo, combo, flight, boss, score, high }) {
    this.levelEl = level;
    this.bossEl = boss;
    this.comboEl = combo;
    this.flightEl = flight;
    this.lastCombo = 1;
    this.ammoEl = ammo;
    this.ammoCountEl = ammo?.querySelector('.hud__ammo-count') ?? null;
    this.lastAmmo = null;
    this.livesEl = lives;
    this.scoreEl = score;
    this.highEl = high;
    this.lastScore = '';
    this.lastLives = -1;
  }

  setLevel(name) {
    this.levelEl.textContent = name;
  }

  setScore(value) {
    const text = pad(value);
    if (text === this.lastScore) return;
    this.lastScore = text;
    this.scoreEl.textContent = text;
  }

  setHigh(value) {
    this.highEl.textContent = pad(value);
  }

  /**
   * on: el récord se superó en esta partida. El HI se pone dorado y brotan chispitas del
   * marcador. Van en el contenedor del número, que no se reescribe con cada punto.
   */
  setNewRecord(on) {
    this.highEl.parentElement.classList.toggle('is-record', on);
    if (on) sparkle(this.scoreEl.parentElement, { count: 16 });
  }

  /**
   * lives: corazones que hay (en difícil, puede haber medios: 1,5); slots: cuántos se dibujan
   * (los que faltan, vacíos). Lo que cambió respecto a la vez anterior se anima según el motivo:
   *   gained     un corazón se completó: entra con .hud__life--new y chispitas
   *   progressed la silueta del siguiente apareció o se rellenó más: da un brinco
   *   hurt       un golpe: el corazón que se vacía a medias tiembla (.hud__life--drained) y los
   *              que ya no caben se van (.hud__life--leaving) en lugar de desaparecer de golpe
   *   cashed     un corazón se cambió por puntos: destella en dorado y suelta chispitas (listo
   *              para usarse; hoy los corazones se cobran sin animación al terminar el nivel)
   */
  setLives(lives, slots, { gained = false, progressed = false, hurt = false, cashed = false } = {}) {
    const fills = fillsFor(lives, slots);
    const before = this.fills ?? [];
    if (fills.join() === before.join()) return;
    this.fills = fills;
    this.lastLives = lives;
    this.maxLives = slots;
    const current = new Intl.NumberFormat(getLanguage()).format(lives);
    this.livesEl.setAttribute('aria-label', t('hud.lives', { current, max: slots }));
    let fresh = null;
    const hearts = fills.map((fill, i) => {
      const was = before[i] ?? 0;
      const li = heart(fill);
      if (gained && fill === 1 && was < 1) li.classList.add('hud__life--new');
      if (progressed && fill > was && fill < 1) li.classList.add('hud__life--grown');
      if (hurt && fill > 0 && fill < was) li.classList.add('hud__life--drained');
      if (cashed && fill < was) li.classList.add('hud__life--cashed');
      if (li.matches('.hud__life--new, .hud__life--cashed')) fresh = li;
      return li;
    });
    // Difícil: los corazones perdidos ya no tienen lugar; se van con su animación y se quitan
    if (hurt && !reducedMotion.matches) {
      for (let i = fills.length; i < before.length; i++) {
        if (before[i] <= 0) continue;
        const ghost = heart(before[i]);
        ghost.classList.add('hud__life--leaving');
        ghost.addEventListener('animationend', () => ghost.remove());
        hearts.push(ghost);
      }
    }
    this.livesEl.replaceChildren(...hearts);
    if (fresh) sparkle(this.livesEl, { count: 16, spread: 2, from: fresh });
  }

  /** Vuelve a escribir los textos traducibles (al cambiar de idioma). */
  refresh() {
    if (this.lastAmmo) this.setAmmo(this.lastAmmo.count, this.lastAmmo.max, { infinite: this.lastAmmo.infinite });
    this.setCombo(this.lastCombo);
    if (this.lastLives < 0) return;
    this.fills = null;
    this.setLives(this.lastLives, this.maxLives);
  }

  /** Parpadeo al llegar a cada centena. */
  milestone() {
    restart(this.scoreEl, 'is-milestone');
  }

  /**
   * Las bolas de fuego: count de max. gained (un cóctel) y spent (un disparo) animan el contador
   * con .is-gained y .is-spent; el CSS decide cómo se ven.
   */
  setAmmo(count, max, { gained = false, spent = false, infinite = false } = {}) {
    if (!this.ammoEl) return;
    this.lastAmmo = { count, max, infinite };
    this.ammoCountEl.textContent = infinite ? '∞' : String(count);
    this.ammoEl.dataset.count = infinite ? 'infinite' : String(count);
    this.ammoEl.classList.toggle('is-full', infinite || count >= max);
    this.ammoEl.classList.toggle('is-empty', !infinite && count <= 0);
    this.ammoEl.setAttribute('aria-label', infinite ? t('hud.fireInfinite') : t('hud.fire', { count, max }));
    if (gained) restart(this.ammoEl, 'is-gained');
    if (spent) restart(this.ammoEl, 'is-spent');
  }

  /**
   * El multiplicador de la racha (core/combo.js). Con ×1 se oculta. up: subió (.is-up); lost: se
   * perdió por un golpe (.is-lost, se ve un momento antes de ocultarse).
   */
  setCombo(multiplier, { up = false, lost = false } = {}) {
    if (!this.comboEl) return;
    this.lastCombo = multiplier;
    const text = new Intl.NumberFormat(getLanguage(), { maximumFractionDigits: 1 }).format(multiplier);
    this.comboEl.dataset.multiplier = String(multiplier);
    if (multiplier > 1) this.comboEl.querySelector('.hud__combo-value').textContent = `×${text}`;
    this.comboEl.setAttribute('aria-label', t('hud.combo', { value: text }));
    this.comboEl.hidden = multiplier <= 1 && !lost;
    if (up) restart(this.comboEl, 'is-up');
    if (lost) {
      restart(this.comboEl, 'is-lost');
      this.comboEl.addEventListener('animationend', () => {
        if (this.lastCombo <= 1) this.comboEl.hidden = true;
      }, { once: true });
    }
  }

  /**
   * El poder de volar (la estrella): on, si se tiene. gained: se acaba de tomar (.is-gained); lost:
   * un golpe lo quitó (.is-lost, se ve un momento antes de ocultarse).
   */
  setFlight(on, { gained = false, lost = false } = {}) {
    if (!this.flightEl) return;
    this.flightOn = on;
    this.flightEl.setAttribute('aria-label', t('hud.flight'));
    this.flightEl.hidden = !on && !lost;
    if (gained) restart(this.flightEl, 'is-gained');
    if (lost) {
      restart(this.flightEl, 'is-lost');
      this.flightEl.addEventListener('animationend', () => {
        if (!this.flightOn) this.flightEl.hidden = true;
      }, { once: true });
    }
  }

  /** La barra de vida del jefe del nivel 13, del color del rival. */
  showBoss(hp, max, color) {
    if (!this.bossEl) return;
    this.bossEl.style.setProperty('--boss-color', color);
    this.bossEl.hidden = false;
    this.setBoss(hp, max);
  }

  /** La vida que le queda al jefe; hit: le acaban de pegar (.is-hit). */
  setBoss(hp, max, { hit = false } = {}) {
    if (!this.bossEl) return;
    this.bossEl.style.setProperty('--boss-life', String(Math.max(0, hp) / max));
    this.bossEl.setAttribute('aria-valuenow', String(Math.max(0, hp)));
    this.bossEl.setAttribute('aria-valuemax', String(max));
    this.bossEl.setAttribute('aria-label', t('hud.boss', { hp: Math.max(0, hp), max }));
    if (hit) restart(this.bossEl, 'is-hit');
  }

  hideBoss() {
    if (this.bossEl) this.bossEl.hidden = true;
  }

  /**
   * El disparo especial: can, si ahora se puede cargar (el rombo brilla, .can-charge); progress, qué
   * tan cargado va (0 a 1: --charge; 1 = listo, .is-charged).
   */
  setCharge(can, progress) {
    if (!this.ammoEl) return;
    this.ammoEl.classList.toggle('can-charge', can);
    this.ammoEl.classList.toggle('is-charged', can && progress >= 1);
    this.ammoEl.style.setProperty('--charge', String(can ? progress : 0));
  }

  /** Se intentó disparar sin bolas de fuego. */
  ammoEmpty() {
    if (this.ammoEl) restart(this.ammoEl, 'is-denied');
  }
}

/** Vuelve a poner una clase para reiniciar su animación CSS. */
function restart(el, className) {
  el.classList.remove('is-gained', 'is-spent', 'is-denied', 'is-up', 'is-lost', 'is-hit', className);
  void el.offsetWidth;
  el.classList.add(className);
}

export { pad };
