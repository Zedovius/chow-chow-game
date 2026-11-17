// Captura del nombre al final del viaje, como en las maquinitas: una casilla por carácter, y en cada una el
// carácter se elige de arriba abajo. Se ve la tabla con el lugar que ganó quien juega, y su nombre
// aparece ahí mientras lo escribe.
//
// Palanca o flechas: abajo avanza por el alfabeto (A, B, C...) y arriba regresa; izquierda y derecha
// cambian de casilla.
// A o Enter avanzan, y después de la última casilla llevan a Guardar. B o Esc regresan. Con teclado
// también se puede escribir directo, y en una pantalla táctil cada casilla tiene sus flechas.
// (Gamepad.js endereza la palanca del arcade y repite la dirección mantenida mientras esto se ve.)

import { CONFIG } from '../config.js';
import { t } from '../i18n/i18n.js';
import { boardNode } from './leaderboard.js';

const { nameLength, size, idleSeconds, keyRepeat } = CONFIG.leaderboard;
// El espacio va primero: una casilla vacía es un espacio, y así ANA no necesita cinco letras
const CHARACTERS = ' ABCDEFGHIJKLMNÑOPQRSTUVWXYZ0123456789';
const BLANK = '_';

function arrowButton(symbol, onHold) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'name-entry__arrow';
  button.tabIndex = -1;
  button.textContent = symbol;
  button.setAttribute('aria-hidden', 'true');
  let timer = 0;
  const stop = () => clearTimeout(timer);
  const repeat = () => {
    onHold();
    timer = setTimeout(repeat, keyRepeat.every);
  };
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault(); // que el foco se quede en su casilla
    onHold();
    timer = setTimeout(repeat, keyRepeat.delay);
  });
  for (const type of ['pointerup', 'pointercancel', 'pointerleave']) button.addEventListener(type, stop);
  return button;
}

/**
 * Pide el nombre en el diálogo del juego.
 * @param {{ dialogs: import('./Dialogs.js').Dialogs, entries: {name: string, score: number}[],
 *           difficulty: string, score: number, place: number, drink?: HTMLElement | null }} options
 *   entries: la tabla de esa dificultad; place: el lugar que ganó (ver placeIn en core/scores.js);
 *   drink: el trago de su signo (ui/drink.js), que se muestra arriba de las casillas
 * @returns {Promise<{ name: string, timedOut: boolean }>} name queda vacío si no escribió nada
 */
export function enterName({ dialogs, entries, difficulty, score, place, drink = null }) {
  const letters = Array(nameLength).fill(0); // qué carácter hay en cada casilla
  let active = 0;
  let idle = 0;

  const root = document.createElement('div');
  root.className = 'name-entry';

  const rank = document.createElement('p');
  rank.className = 'name-entry__place';
  rank.textContent = t('name.place', { place, size });

  const row = document.createElement('div');
  row.className = 'name-entry__slots';

  // La tabla, con quien juega ya en su lugar
  const shown = [...entries];
  shown.splice(place - 1, 0, { name: BLANK.repeat(nameLength), score });
  const table = boardNode(t(`difficulty.${difficulty}`), shown.slice(0, size), { mine: place });
  const tableName = table.querySelector('.board__row--mine .board__name');

  const name = () => letters.map((index) => CHARACTERS[index]).join('').trim();
  const slots = letters.map((_, index) => {
    const letter = document.createElement('button');
    letter.type = 'button';
    letter.className = 'name-entry__letter';
    letter.addEventListener('focus', () => setActive(index));
    // Un toque elige la casilla; A o Enter (click sin puntero, detail 0) avanzan
    letter.addEventListener('click', (event) => {
      if (event.detail === 0) forward();
    });
    const up = arrowButton('▲', () => { setActive(index); change(-1); });
    const down = arrowButton('▼', () => { setActive(index); change(1); });
    const column = document.createElement('div');
    column.className = 'name-entry__slot';
    column.append(up, letter, down);
    row.append(column);
    return { column, letter };
  });

  function paint() {
    slots.forEach(({ column, letter }, index) => {
      const character = CHARACTERS[letters[index]];
      letter.textContent = character === ' ' ? BLANK : character;
      letter.setAttribute('aria-label', t('name.slot', { number: index + 1, total: nameLength, letter: letter.textContent }));
      column.classList.toggle('name-entry__slot--active', index === active);
    });
    tableName.textContent = letters.map((index) => (index ? CHARACTERS[index] : BLANK)).join('');
  }

  function setActive(index) {
    active = index;
    paint();
  }

  function focusSlot(index) {
    setActive(index);
    slots[index].letter.focus({ preventScroll: true });
  }

  const saveButton = () => dialogs.actionsEl.querySelector('button');

  function forward() {
    if (active < nameLength - 1) focusSlot(active + 1);
    else saveButton().focus();
  }

  function back() {
    if (document.activeElement === saveButton()) focusSlot(nameLength - 1);
    else if (active > 0) focusSlot(active - 1);
  }

  function change(step) {
    if (document.activeElement === saveButton()) focusSlot(nameLength - 1);
    letters[active] = (letters[active] + step + CHARACTERS.length) % CHARACTERS.length;
    paint();
    root.dispatchEvent(new CustomEvent('menu:move', { bubbles: true }));
  }

  function write(character) {
    if (document.activeElement === saveButton()) return;
    letters[active] = CHARACTERS.indexOf(character);
    paint();
    forward();
  }

  function erase() {
    if (document.activeElement === saveButton()) {
      focusSlot(nameLength - 1);
    } else if (letters[active]) {
      letters[active] = 0;
      paint();
    } else {
      back();
    }
  }

  const KEYS = {
    ArrowUp: () => change(-1),
    ArrowDown: () => change(1),
    ArrowRight: forward,
    ArrowLeft: back,
    Backspace: erase,
  };

  // Antes que nadie: las teclas son para escribir, no para el menú ni para silenciar (M)
  const onKey = (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const character = event.key.length === 1 ? event.key.toUpperCase() : '';
    const action = KEYS[event.key] ?? (CHARACTERS.includes(character) && character ? () => write(character) : null);
    if (!action) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    action();
  };

  const stayAwake = () => {
    clearTimeout(idle);
    idle = setTimeout(() => dialogs.close('timeout'), idleSeconds * 1000);
  };

  // Su trago (ui/drink.js), entre el lugar y las casillas
  root.append(...[rank, drink, row, table].filter(Boolean));
  paint();

  const finished = dialogs.show({
    title: t('board.title'),
    extra: [root],
    actions: [{ label: t('name.save'), value: 'save', primary: true }],
    onCancel: () => {
      stayAwake();
      back();
    },
  });
  // En Guardar ya no se está escribiendo: la letra deja de parpadear y sus flechas se van
  saveButton().addEventListener('focus', () => root.classList.add('name-entry--done'));
  saveButton().addEventListener('blur', () => root.classList.remove('name-entry--done'));
  focusSlot(0);
  stayAwake();
  const activity = ['keydown', 'pointerdown', 'click'];
  for (const type of activity) dialogs.el.addEventListener(type, stayAwake, true);
  document.addEventListener('keydown', onKey, true);

  return finished.then((value) => {
    clearTimeout(idle);
    for (const type of activity) dialogs.el.removeEventListener(type, stayAwake, true);
    document.removeEventListener('keydown', onKey, true);
    return { name: name(), timedOut: value === 'timeout' };
  });
}
