// La fecha de nacimiento, en la pantalla de inicio: día, mes y año (el año chino empieza con el Año
// Nuevo lunar, entre el 21 de enero y el 20 de febrero; ver world/birth.js). Siempre se ven los tres
// números. Pensado para la palanca del arcade y el control remoto:
//   ↑ ↓      cambian el número enfocado (mantenerlos lo recorre cada vez más rápido)
//   ← →      pasan al siguiente número (y al botón ▶)
//   Enter, A elige (también un clic en un número o en ▶)
//   Esc, B   regresa
// Con ratón o pantalla táctil, los botones ▲ ▼ de cada número. Con pantalla táctil, ▶ es FIRE,
// abajo del juego, y la cruceta mueve y cambia los números (ui/TouchPad.js); tocar un número
// no elige.

import { FIRST_YEAR, LAST_YEAR, daysIn, signOfBirth } from '../world/birth.js';
import { t, onLanguageChange } from '../i18n/i18n.js';

const THIS_YEAR = Math.min(LAST_YEAR, new Date().getFullYear());
const FIELDS = ['day', 'month', 'year'];
// Con pantalla táctil, ▶ es el botón FIRE de abajo del juego (ui/TouchPad.js)
const touchScreen = globalThis.matchMedia?.('(any-pointer: coarse)') ?? { matches: false };

function button(className, text, label) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = className;
  el.textContent = text;
  if (label) el.setAttribute('aria-label', label);
  return el;
}

export class BirthPicker {
  /** root: donde va el selector; onDone(sign): eligió (sign: el animal); onBack: regresar. */
  constructor(root, { onDone, onBack }) {
    this.root = root;
    this.onDone = onDone;
    this.onBack = onBack;
    this.value = { day: 1, month: 1, year: 1995 };
    this.fields = {};
    root.dataset.nativeKeys = '';
    root.dataset.holdRepeat = '';

    const row = document.createElement('div');
    row.className = 'birth__fields';
    for (const name of FIELDS) {
      const field = document.createElement('div');
      field.className = `birth__field birth__field--${name}`;
      const up = button('birth__step', '▲');
      const value = button('birth__value', '');
      const down = button('birth__step', '▼');
      const label = document.createElement('span');
      label.className = 'birth__label';
      up.tabIndex = -1;
      down.tabIndex = -1;
      // ▲ ▼ no se quedan con el foco: lo tiene su número (así se ve cuál se cambia, y FIRE o A
      // eligen la fecha en vez de «presionar» otra vez la flecha tocada)
      for (const [arrow, step] of [[up, 1], [down, -1]]) {
        arrow.addEventListener('pointerdown', (event) => event.preventDefault());
        arrow.addEventListener('click', () => {
          this.change(name, step);
          value.focus({ preventScroll: true });
        });
      }
      // Enter, A o un clic eligen; con el dedo, tocar un número solo lo marca (para seguir está ▶
      // abajo del juego): así no se pasa a la rueda sin querer al tocar el año
      value.addEventListener('click', (event) => {
        if (event.detail === 0 || !touchScreen.matches) this.confirm();
      });
      field.append(up, value, down, label);
      row.append(field);
      this.fields[name] = { field, value, up, down, label };
    }
    this.ok = button('button button--primary birth__ok', '▶');
    this.ok.addEventListener('click', () => this.confirm());
    root.replaceChildren(row, this.ok);

    root.addEventListener('keydown', (event) => this.onKey(event));
    onLanguageChange(() => this.render());
    this.render();
  }

  onKey(event) {
    const focused = FIELDS.find((name) => this.fields[name].value === document.activeElement);
    const handled = {
      ArrowUp: () => focused && this.change(focused, 1),
      ArrowDown: () => focused && this.change(focused, -1),
      ArrowLeft: () => this.move(-1),
      ArrowRight: () => this.move(1),
      Escape: () => this.onBack(),
    }[event.key];
    if (!handled) return;
    event.preventDefault();
    event.stopPropagation(); // que el juego no lo tome como salto o agachada
    handled();
  }

  /** Lo que se puede enfocar, en orden: los tres números y ▶ (si se ve: con pantalla táctil, ▶ es FIRE, abajo del juego). */
  get stops() {
    return [...FIELDS.map((name) => this.fields[name].value), this.ok].filter((el) => el.getClientRects().length > 0);
  }

  move(step) {
    const stops = this.stops;
    const at = stops.indexOf(document.activeElement);
    stops[(at + step + stops.length) % stops.length].focus();
  }

  /** Cambia un número, dando la vuelta en sus límites. */
  change(name, step) {
    const range = {
      day: [1, daysIn(this.value.year, this.value.month)],
      month: [1, 12],
      year: [FIRST_YEAR, THIS_YEAR],
    }[name];
    const [min, max] = range;
    const size = max - min + 1;
    this.value[name] = ((this.value[name] - min + step + size) % size) + min;
    this.render();
  }

  render() {
    const { year, month } = this.value;
    this.value.day = Math.min(this.value.day, daysIn(year, month));
    const names = { day: 'birth.day', month: 'birth.month', year: 'birth.year' };
    for (const name of FIELDS) {
      const { value, up, down, label } = this.fields[name];
      const text = String(this.value[name]).padStart(name === 'year' ? 4 : 2, '0');
      value.textContent = text;
      label.textContent = t(names[name]);
      value.setAttribute('aria-label', `${t(names[name])}: ${text}`);
      up.setAttribute('aria-label', t('birth.more', { what: t(names[name]) }));
      down.setAttribute('aria-label', t('birth.less', { what: t(names[name]) }));
    }
    this.ok.setAttribute('aria-label', t('birth.ok'));
  }

  focus() {
    this.fields.day.value.focus({ preventScroll: true });
  }

  /** Eligió: el animal que le toca. */
  confirm() {
    const { year, month, day } = this.value;
    this.onDone(signOfBirth(year, month, day));
  }
}
