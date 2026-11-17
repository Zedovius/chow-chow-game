// Controles (Xbox, PlayStation, genéricos por USB o Bluetooth) con la Gamepad API.
// La API no avisa cuando se presiona un botón: mientras haya un control conectado se lee su
// estado en cada cuadro y, al cambiar, se traduce a las mismas acciones que el teclado
// (Input.press / release). El resto del juego no sabe de dónde viene la acción.
//
// En los menús (pantalla de inicio o un <dialog> abierto) el control navega como el teclado:
// el D-pad manda flechas al elemento enfocado (las atiende ui/arrowKeys.js) y A lo elige.
// Por privacidad, el navegador solo "ve" el control después de presionar un botón en la página.
//
// La cruceta y el botón FIRE de las pantallas táctiles (ui/TouchPad.js) llegan aquí como un control
// más (virtual): así mueven los menús, la fecha, la rueda y el nombre del récord igual que la palanca.
//
// Un joystick puede mandar sus direcciones giradas (en los de arcade pasa si la palanca o su cable
// quedaron montados de lado en la caja). Para eso está el ajuste de la palanca (ui/stickSetup.js):
// se abre manteniendo Start 3 segundos en la pantalla de inicio y aquí se recuerda, por el nombre
// del control, cómo girar lo que manda.

import { CONFIG } from '../config.js';

// Mapeo "standard" de la Gamepad API
const BUTTON = { A: 0, B: 1, X: 2, Y: 3, VIEW: 8, START: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
const DEAD_ZONE = 0.5; // el stick cuenta solo pasada la mitad, para que uno desviado no mande nada
// Muchos controles de arcade (y otros sin el mapeo estándar) dan la palanca como un «hat»: un solo
// eje (en Chrome y Edge, el 9) con un valor para cada una de sus 8 posiciones, de -1 (arriba) a 1
// (arriba a la izquierda) en pasos de 2/7; suelta, vale más de 1
const HAT_AXIS = 9;
const HAT = [['up'], ['up', 'right'], ['right'], ['down', 'right'], ['down'], ['down', 'left'], ['left'], ['up', 'left']];
export const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };
// El joystick del arcade de Chow Chow House («USB Gamepad», 0810:0001) quedó montado girado 90°: arriba
// llega como izquierda, derecha como arriba, abajo como derecha e izquierda como abajo. En el juego
// se endereza (la dirección que manda → la de verdad); en los menús se deja como llega, porque así
// ya se mueven bien. Un ajuste hecho con Start 3 s (ui/stickSetup.js) tiene prioridad.
const CABINET = /0810\D{1,12}0001/;
const CABINET_TURN = { left: 'up', up: 'right', right: 'down', down: 'left' };
const SETUP_HOLD = 3000; // ms con Start presionado en la pantalla de inicio para abrir el ajuste
const STORE = 'chowchow.palanca';

function connectedPads() {
  return [...(navigator.getGamepads?.() ?? [])].filter((pad) => pad?.connected);
}

/** Las direcciones que manda un control, tal cual (cruceta, stick o hat), sin girar. */
function padDirections(pad) {
  const dirs = new Set();
  const on = (i) => Boolean(pad.buttons[i]?.pressed);
  const [x = 0, y = 0] = pad.axes;
  if (on(BUTTON.UP) || y < -DEAD_ZONE) dirs.add('up');
  if (on(BUTTON.DOWN) || y > DEAD_ZONE) dirs.add('down');
  if (on(BUTTON.LEFT) || x < -DEAD_ZONE) dirs.add('left');
  if (on(BUTTON.RIGHT) || x > DEAD_ZONE) dirs.add('right');
  const hat = pad.mapping === 'standard' ? undefined : pad.axes[HAT_AXIS];
  if (hat >= -1.05 && hat <= 1.05) for (const name of HAT[Math.round((hat + 1) * 3.5) % 8]) dirs.add(name);
  return dirs;
}

/**
 * Qué está presionado en todos los controles conectados, con nombres de botón. turns: para cada
 * control ajustado (por su nombre), qué dirección de verdad es cada una de las que manda.
 * playing: se está jugando (no hay un menú), y se endereza el joystick del arcade (CABINET).
 */
function readPads(turns, playing) {
  const held = new Set();
  for (const pad of connectedPads()) {
    const on = (i) => Boolean(pad.buttons[i]?.pressed);
    if (on(BUTTON.A)) held.add('a');
    if (on(BUTTON.B)) held.add('b');
    if (on(BUTTON.X)) held.add('x');
    if (on(BUTTON.Y)) held.add('y');
    if (on(BUTTON.START)) held.add('start');
    if (on(BUTTON.VIEW)) held.add('view');
    const turn = turns[pad.id] ?? (playing && CABINET.test(pad.id) ? CABINET_TURN : null);
    for (const dir of padDirections(pad)) held.add(turn?.[dir] ?? dir);
  }
  return held;
}

/** Los ajustes de la palanca guardados en este navegador (si se puede leer). */
function loadTurns() {
  try {
    const turns = JSON.parse(localStorage.getItem(STORE) ?? '{}');
    return turns && typeof turns === 'object' ? turns : {};
  } catch {
    return {};
  }
}

// En el juego: qué acción da cada botón
// A salta (y aletea), B y abajo agachan, X y Y lanzan bolas de fuego
// fire: el botón FIRE de la pantalla táctil (en los menús, como A: elige)
const GAME_ACTIONS = { a: ['jump', 'confirm'], up: ['jump'], down: ['duck'], b: ['duck'], x: ['fire'], y: ['fire'], fire: ['fire'], start: ['pause'] };
// En los menús: qué flecha manda cada dirección
const MENU_KEYS = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };

export class GamepadInput {
  /**
   * @param {import('./Input.js').Input} input
   * @param {{ onButton?: (name: string) => boolean | void, onSetup?: () => void }} options onButton:
   *   cada botón que se presiona ('a', 'b', 'start', 'view', 'up'...), en el juego o en un menú
   *   (main.js lo usa para el sonido); si devuelve true, ya no hace nada más; onSetup: Start se mantuvo 3 segundos en la pantalla de inicio
   */
  constructor(input, { onButton = () => {}, onSetup = () => {} } = {}) {
    this.input = input;
    this.onButton = onButton;
    this.onSetup = onSetup;
    this.held = new Set(); // botones presionados en el cuadro anterior
    this.actions = new Map(); // acción → cuántos botones del control la mantienen
    this.turns = loadTurns(); // ajustes de la palanca: nombre del control → cómo girar sus direcciones
    this.listener = null; // mientras se ajusta la palanca, recibe las direcciones sin girar
    this.raw = new Map(); // las direcciones sin girar de cada control en el cuadro anterior
    this.startSince = null; // desde cuándo se mantiene Start en la pantalla de inicio
    this.repeat = null; // al escribir el nombre: qué dirección se mantiene y cuándo se repite
    this.virtualHeld = new Set(); // lo que se mantiene en la pantalla táctil (ui/TouchPad.js)
    this.running = false;
    this.poll = this.poll.bind(this);

    window.addEventListener('gamepadconnected', () => this.update());
    window.addEventListener('gamepaddisconnected', () => this.update());
    // La vibración al chocar la pide Game (input.rumble); lo que manda el control, el texto de ?debug
    input.rumble = (strength = 0.6, duration = 180) => this.rumble(strength, duration);
    input.describePads = () => this.describe();
    this.update();
  }

  /**
   * Para ?debug: lo que manda cada control (su nombre, si tiene el mapeo estándar, los ejes que no
   * están en reposo y los botones presionados) y lo que el juego entiende de eso. Sirve para
   * revisar un control que no se comporta como se espera (uno de arcade, por ejemplo).
   */
  describe() {
    const pads = connectedPads();
    if (!pads.length) return 'control: ninguno';
    const text = pads.map((pad) => {
      const axes = pad.axes.map((v, i) => (Math.abs(v) > 0.2 ? `${i}:${v.toFixed(2)}` : '')).filter(Boolean).join(' ') || '-';
      const buttons = pad.buttons.map((b, i) => (b.pressed ? i : -1)).filter((i) => i >= 0).join(',') || '-';
      const turned = this.turns[pad.id] ? ' · palanca ajustada' : CABINET.test(pad.id) ? ' · palanca del arcade (girada en el juego)' : '';
      return `${pad.id.slice(0, 24)} · ${pad.mapping || 'no estándar'}${turned} · ejes ${axes} · botones ${buttons}`;
    });
    return `control: ${text.join(' | ')} · entiende ${[...this.held].join(',') || '-'}`;
  }

  /**
   * Para el ajuste de la palanca (ui/stickSetup.js): fn(nombre del control, dirección) recibe cada
   * dirección nueva que manda un control, sin girar, y mientras tanto no mueven los menús.
   * Devuelve con qué dejar de escuchar.
   */
  listen(fn) {
    this.raw = new Map(connectedPads().map((pad) => [pad.index, padDirections(pad)]));
    this.listener = fn;
    return () => {
      if (this.listener === fn) this.listener = null;
    };
  }

  /** Recuerda cómo girar las direcciones de un control (turn: la que manda → la de verdad). */
  setTurn(id, turn) {
    if (Object.entries(turn).every(([from, to]) => from === to)) delete this.turns[id];
    else this.turns[id] = turn;
    try {
      localStorage.setItem(STORE, JSON.stringify(this.turns));
    } catch {
      // Sin almacenamiento, el ajuste dura hasta cerrar el juego
    }
  }

  get connected() {
    return connectedPads().length > 0;
  }

  /** Arranca o detiene la lectura según haya controles, y muestra la ayuda del control. */
  update() {
    const connected = this.connected;
    document.documentElement.toggleAttribute('data-gamepad', connected);
    if (connected && !this.running) {
      this.running = true;
      requestAnimationFrame(this.poll);
    }
    if (!connected && !this.virtualHeld.size) this.releaseAll();
  }

  /**
   * Un botón de la pantalla táctil (ui/TouchPad.js): 'up' | 'down' | 'left' | 'right' | 'fire'.
   * Cuenta al momento (sin esperar al siguiente cuadro) y, mientras se mantenga, se sigue leyendo
   * (para recorrer las letras manteniendo arriba o abajo).
   */
  virtual(name, down) {
    if (down) this.virtualHeld.add(name);
    else this.virtualHeld.delete(name);
    this.step();
    if (!this.running && this.virtualHeld.size) {
      this.running = true;
      requestAnimationFrame(this.poll);
    }
  }

  /** Lo que se presionó y se soltó desde la última lectura, de los controles y de la pantalla táctil. */
  step() {
    // Al abrir o cerrar un menú con la palanca movida, su dirección cambia de nombre: la de antes se
    // suelta (onRelease) y la nueva se presiona, así no queda un salto o una agachada pegados
    const now = readPads(this.turns, !this.inMenu || this.writingName);
    for (const name of this.virtualHeld) now.add(name);
    for (const name of now) if (!this.held.has(name)) this.onPress(name);
    for (const name of this.held) if (!now.has(name)) this.onRelease(name);
    this.held = now;
    this.repeatLetter(now);
    return now;
  }

  poll() {
    if (!this.connected && !this.virtualHeld.size) {
      this.running = false;
      this.step(); // suelta lo último que se mantenía
      this.releaseAll();
      return;
    }
    const now = this.step();
    if (this.listener) this.feedRaw();
    this.watchStart(now);
    requestAnimationFrame(this.poll);
  }

  /** Al escribir el nombre (o la fecha), mantener arriba o abajo recorre los caracteres, cada vez más rápido. */
  repeatLetter(held) {
    const dir = ['up', 'down'].find((name) => held.has(name));
    if (!dir || !this.writingName) {
      this.repeat = null;
      return;
    }
    const { delay, every, fast, fastAfter } = CONFIG.leaderboard.keyRepeat;
    const time = performance.now();
    if (this.repeat?.dir !== dir) {
      this.repeat = { dir, since: time, next: time + delay };
    } else if (time >= this.repeat.next) {
      this.repeat.next = time + (time - this.repeat.since > fastAfter ? fast : every);
      this.menuPress(dir);
    }
  }

  /** Mientras se ajusta la palanca: cada dirección nueva (sola, no en diagonal) de cada control. */
  feedRaw() {
    for (const pad of connectedPads()) {
      const dirs = padDirections(pad);
      const before = this.raw.get(pad.index) ?? new Set();
      this.raw.set(pad.index, dirs);
      const [dir] = dirs;
      if (dirs.size === 1 && !before.has(dir)) this.listener?.(pad.id, dir);
    }
  }

  /** Start mantenido 3 segundos en la pantalla de inicio, sin un menú abierto: el ajuste de la palanca. */
  watchStart(held) {
    const onTitle = !this.dialog && !document.getElementById('title-screen')?.hidden;
    if (!held.has('start') || !onTitle) {
      this.startSince = null;
      return;
    }
    this.startSince ??= performance.now();
    if (performance.now() - this.startSince < SETUP_HOLD) return;
    this.startSince = Infinity; // una vez por cada vez que se mantiene
    this.onSetup();
  }

  /** ¿Hay un menú en pantalla? Entonces el control navega en vez de jugar. */
  get dialog() {
    return document.querySelector('dialog[open]');
  }

  /**
   * Aquí arriba y abajo sí importan, así que la palanca del arcade se endereza como en el juego. En
   * los demás menús se deja como llega (ver CABINET_TURN).
   */
  get writingName() {
    // También al elegir el mes y el año de nacimiento (ui/BirthPicker.js): ahí arriba y abajo
    // cambian el número, y mantenerlos lo recorre cada vez más rápido
    return Boolean(this.dialog?.querySelector('.name-entry')) || Boolean(document.activeElement?.closest('[data-hold-repeat]'));
  }

  get inMenu() {
    return Boolean(this.dialog) || !document.getElementById('title-screen')?.hidden;
  }

  onPress(name) {
    if (this.onButton(name) === true) return; // ese gesto ya se usó (quitar la tabla del inicio)
    if (this.inMenu) {
      if (this.listener && OPPOSITE[name]) return; // ajustando la palanca: las direcciones son para eso
      this.menuPress(name);
      return;
    }
    for (const action of GAME_ACTIONS[name] ?? []) this.hold(action);
  }

  onRelease(name) {
    // Se suelta aunque ya se haya abierto un menú, para que nada quede presionado
    for (const action of GAME_ACTIONS[name] ?? []) this.letGo(action);
  }

  menuPress(name) {
    const key = MENU_KEYS[name];
    if (key) {
      // Como una flecha del teclado sobre lo enfocado (ui/arrowKeys.js y TitleMenu la atienden)
      const target = document.activeElement ?? document.body;
      for (const type of ['keydown', 'keyup']) {
        target.dispatchEvent(new KeyboardEvent(type, { key, code: key, bubbles: true, cancelable: true }));
      }
      return;
    }
    const dialog = this.dialog;
    if (name === 'a' || name === 'fire') {
      // Solo un botón que se ve: el foco puede quedarse en uno de un paso ya oculto (Safari)
      const focused = document.activeElement;
      if (focused instanceof HTMLButtonElement && !focused.disabled && focused.getClientRects().length) focused.click();
      // Sin nada enfocado, como Enter: la pantalla de inicio elige lo marcado
      else if (!dialog) this.tap('confirm');
    } else if ((name === 'start' || name === 'b') && dialog) {
      // Como Esc: cierra con la acción por defecto (en la pausa, continuar)
      dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    } else if (name === 'b') {
      // En la pantalla de inicio, como Esc: de la dificultad vuelve al idioma (lo atiende TitleMenu)
      const target = document.activeElement ?? document.body;
      for (const type of ['keydown', 'keyup']) {
        target.dispatchEvent(new KeyboardEvent(type, { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true }));
      }
    }
  }

  hold(action) {
    this.actions.set(action, (this.actions.get(action) ?? 0) + 1);
    this.input.press(action);
  }

  letGo(action) {
    const count = (this.actions.get(action) ?? 0) - 1;
    if (count > 0) {
      this.actions.set(action, count);
      return;
    }
    if (!this.actions.has(action)) return;
    this.actions.delete(action);
    this.input.release(action);
  }

  /** Presiona y suelta una acción (wasPressed la ve en el siguiente paso). */
  tap(action) {
    this.input.press(action);
    this.input.release(action);
  }

  releaseAll() {
    for (const action of this.actions.keys()) this.input.release(action);
    this.actions.clear();
    this.held.clear();
  }

  /** Vibración corta, si el control y el navegador la soportan. */
  rumble(strength, duration) {
    for (const pad of navigator.getGamepads?.() ?? []) {
      pad?.vibrationActuator?.playEffect?.('dual-rumble', {
        duration,
        strongMagnitude: strength,
        weakMagnitude: strength / 2,
      }).catch?.(() => {});
    }
  }
}
