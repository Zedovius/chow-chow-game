// Traduce teclado, toques y botones en pantalla a acciones abstractas: jump (saltar y, al volar,
// aletear), duck (agacharse y, en el aire, caer más rápido), left y right (contra el jefe, moverse
// atrás y adelante), fire (bola de fuego), pause, confirm y
// mute (silenciar). El resto del juego solo conoce estas acciones. Los controles (core/Gamepad.js)
// y el control remoto de la tele (core/Remote.js) llegan a las mismas.

const KEYMAP = {
  Space: 'jump',
  ArrowUp: 'jump',
  KeyW: 'jump',
  ArrowDown: 'duck',
  KeyS: 'duck',
  // Adelante y atrás: solo contra el jefe (Player.moveRange)
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  KeyX: 'fire',
  KeyJ: 'fire',
  KeyF: 'fire',
  KeyP: 'pause',
  Escape: 'pause',
  Enter: 'confirm',
  NumpadEnter: 'confirm',
  KeyM: 'mute',
};

export class Input {
  /** surface: el canvas; buttons: botones táctiles con data-action="jump" | "duck" | "fire". */
  constructor({ surface, buttons = [] }) {
    this.down = new Set();
    this.pressed = new Set();

    window.addEventListener('keydown', (event) => this.onKeyDown(event));
    window.addEventListener('keyup', (event) => this.onKeyUp(event));
    window.addEventListener('blur', () => this.down.clear());

    // Ratón: clic sobre el juego = saltar.
    // Táctil (como en Chispas): mitad izquierda = agacharse (mientras se mantenga), mitad derecha =
    // saltar. Cada dedo recuerda su acción, así se puede ir agachado con un pulgar y saltar con el
    // otro. Para el fuego están los botones táctiles.
    this.pointers = new Map();
    surface.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      surface.setPointerCapture?.(event.pointerId);
      let action = 'jump';
      if (event.pointerType !== 'mouse') {
        const rect = surface.getBoundingClientRect();
        action = event.clientX - rect.left < rect.width / 2 ? 'duck' : 'jump';
      }
      this.pointers.set(event.pointerId, action);
      this.press(action);
    });
    const releasePointer = (event) => {
      const action = this.pointers.get(event.pointerId);
      if (!action) return;
      this.pointers.delete(event.pointerId);
      if (![...this.pointers.values()].includes(action)) this.release(action);
    };
    surface.addEventListener('pointerup', releasePointer);
    surface.addEventListener('pointercancel', releasePointer);
    surface.addEventListener('contextmenu', (event) => event.preventDefault());

    // Botones táctiles con data-action
    for (const button of buttons) {
      const action = button.dataset.action;
      button.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        button.setPointerCapture?.(event.pointerId);
        this.press(action);
      });
      const release = () => this.release(action);
      button.addEventListener('pointerup', release);
      button.addEventListener('pointercancel', release);
      button.addEventListener('lostpointercapture', release);
      button.addEventListener('contextmenu', (event) => event.preventDefault());
    }

    // iPhone: mantener el dedo sobre el juego o un botón selecciona el texto, abre la lupa o el menú
    // de copiar, aun con user-select: none en el CSS. Cancelar el toque desde que empieza lo evita
    // (los pointer events de arriba siguen llegando; no se usan los clics de estos elementos).
    for (const el of [surface, ...buttons]) {
      el.addEventListener('touchstart', (event) => event.preventDefault(), { passive: false });
    }
  }

  onKeyDown(event) {
    const action = KEYMAP[event.code];
    if (!action) return;
    // Con un diálogo abierto, el navegador maneja el teclado (Enter, Esc, Tab...).
    if (document.querySelector('dialog[open]')) return;
    // Silenciar funciona también con el menú de inicio enfocado (no en los diálogos: ahí se escribe el nombre)
    if (action === 'mute') {
      if (!event.repeat) this.press(action);
      return;
    }
    // Controles marcados con data-native-keys (p. ej. el selector de idioma) usan el teclado normal.
    if (event.target instanceof Element && event.target.closest('[data-native-keys]')) return;
    event.preventDefault();
    if (event.repeat) return;
    this.press(action);
  }

  onKeyUp(event) {
    const action = KEYMAP[event.code];
    if (action) this.release(action);
  }

  press(action) {
    if (!this.down.has(action)) this.pressed.add(action);
    this.down.add(action);
  }

  release(action) {
    this.down.delete(action);
  }

  /** ¿Está presionada ahora mismo? */
  isDown(action) {
    return this.down.has(action);
  }

  /** ¿Se presionó desde el último paso de simulación? */
  wasPressed(action) {
    return this.pressed.has(action);
  }

  /** Se llama al final de cada paso de simulación. */
  endStep() {
    this.pressed.clear();
  }
}
