// La cruceta y el botón FIRE de las pantallas táctiles (solo se ven con una; ver css/styles.css).
// Llegan al juego como un control más (core/Gamepad.js, virtual): ▲ salta y aletea, ▼ agacha, y en
// los menús las cuatro direcciones se mueven y FIRE elige, como la palanca y A del arcade.
//
// La cruceta es una sola zona táctil (más grande que la cruz que se ve) y la dirección sale de dónde
// está el dedo respecto al centro, así se puede deslizar el pulgar de una a otra sin levantarlo:
//   · en el centro (DEAD_ZONE) no manda nada;
//   · solo una dirección a la vez, sin diagonales;
//   · para cambiar de eje (de ▲ a ▶, por ejemplo) el dedo debe pasarse bien del lado nuevo
//     (SWITCH), así el pulgar apoyado en ▲ no se va a ▶ por accidente.
//
// Un <dialog> abierto (pausa, Game Over, el nombre del récord) deja inerte todo lo que está fuera de
// él: mientras está abierto, la cruceta y FIRE se pasan adentro, fijos en el mismo lugar de la pantalla.
//
// Todo el movimiento es con transform y clases (CSS): no se dibuja nada por cuadro.

const DEAD_ZONE = 0.22; // del radio de la zona: en el centro, nada
const SWITCH = 0.18; // cuánto más debe ir el dedo hacia el otro eje para cambiar de eje
const BUZZ = 8; // ms de vibración al presionar (donde se puede: Android)

const buzz = () => navigator.vibrate?.(BUZZ);

/** La dirección del dedo en (x, y) (de -1 a 1 desde el centro), sin diagonales, y sin cambiar de eje a la ligera. */
export function padDirection(x, y, current = null) {
  if (Math.max(Math.abs(x), Math.abs(y)) < DEAD_ZONE) return null;
  const wasVertical = current === 'up' || current === 'down';
  const wasHorizontal = current === 'left' || current === 'right';
  let vertical = Math.abs(y) > Math.abs(x);
  if (wasVertical && Math.abs(x) < Math.abs(y) + SWITCH) vertical = true;
  if (wasHorizontal && Math.abs(y) < Math.abs(x) + SWITCH) vertical = false;
  if (vertical) return y < 0 ? 'up' : 'down';
  return x < 0 ? 'left' : 'right';
}

export class TouchPad {
  /**
   * @param {{ dpad: HTMLElement, fire: HTMLElement, dialog: HTMLDialogElement,
   *           gamepad: import('../core/Gamepad.js').GamepadInput }} parts
   */
  constructor({ dpad, fire, dialog, gamepad }) {
    this.dpad = dpad;
    this.fire = fire;
    this.gamepad = gamepad;
    this.direction = null;
    this.dpadPointer = null;
    this.firePointers = new Set();

    // iPhone: que mantener el dedo no seleccione texto ni abra la lupa (los pointer events siguen llegando)
    for (const el of [dpad, fire]) {
      el.addEventListener('touchstart', (event) => event.preventDefault(), { passive: false });
      el.addEventListener('contextmenu', (event) => event.preventDefault());
    }

    dpad.addEventListener('pointerdown', (event) => {
      if (this.dpadPointer !== null) return; // un solo dedo manda en la cruceta
      event.preventDefault();
      this.dpadPointer = event.pointerId;
      dpad.setPointerCapture?.(event.pointerId);
      this.aim(event);
    });
    dpad.addEventListener('pointermove', (event) => {
      if (event.pointerId === this.dpadPointer) this.aim(event);
    });
    const leaveDpad = (event) => {
      if (event.pointerId !== this.dpadPointer) return;
      this.dpadPointer = null;
      this.setDirection(null);
    };
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) dpad.addEventListener(type, leaveDpad);

    fire.addEventListener('pointerdown', (event) => {
      event.preventDefault(); // sin foco ni clic: FIRE no es un botón del menú, es el botón A
      fire.setPointerCapture?.(event.pointerId);
      if (this.firePointers.has(event.pointerId)) return;
      this.firePointers.add(event.pointerId);
      if (this.firePointers.size === 1) this.press(true);
    });
    const leaveFire = (event) => {
      if (!this.firePointers.delete(event.pointerId)) return;
      if (!this.firePointers.size) this.press(false);
    };
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) fire.addEventListener(type, leaveFire);
    // FIRE no se enfoca con el teclado ni con un clic (las flechas no deben caer en él)
    fire.tabIndex = -1;

    // Con un menú abierto, adentro del <dialog>
    this.homes = [dpad, fire].map((el) => ({ el, parent: el.parentNode, next: el.nextSibling }));
    new MutationObserver(() => (dialog.open ? this.enter(dialog) : this.leave())).observe(dialog, { attributes: true, attributeFilter: ['open'] });
  }

  /** La dirección según dónde está el dedo en la zona de la cruceta. */
  aim(event) {
    const box = this.dpad.getBoundingClientRect();
    const x = (event.clientX - box.left) / (box.width / 2) - 1;
    const y = (event.clientY - box.top) / (box.height / 2) - 1;
    this.setDirection(padDirection(x, y, this.direction));
  }

  setDirection(direction) {
    if (direction === this.direction) return;
    if (this.direction) this.gamepad.virtual(this.direction, false);
    this.direction = direction;
    if (direction) {
      this.dpad.dataset.dir = direction;
      buzz();
      this.gamepad.virtual(direction, true);
    } else delete this.dpad.dataset.dir;
  }

  press(down) {
    this.fire.classList.toggle('is-pressed', down);
    if (down) buzz();
    this.gamepad.virtual('fire', down);
  }

  /** Suelta todo (al cambiar de lugar, por si quedó un dedo). */
  releaseAll() {
    this.dpadPointer = null;
    this.setDirection(null);
    if (this.firePointers.size) {
      this.firePointers.clear();
      this.press(false);
    }
  }

  /** Se pasan adentro del menú, fijos donde estaban (si se ven: solo con pantalla táctil). */
  enter(dialog) {
    // Primero se mide todo (al sacar uno, el otro se recorre) y se copian sus medidas (vienen de afuera)
    const boxes = this.homes.map(({ el }) => {
      const style = getComputedStyle(el);
      return { el, box: el.getBoundingClientRect(), arm: style.getPropertyValue('--arm'), pad: style.getPropertyValue('--pad') };
    }).filter(({ box }) => box.width);
    for (const { el, box, arm, pad } of boxes) {
      el.classList.add('is-floating');
      Object.assign(el.style, { left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, height: `${box.height}px` });
      if (arm) el.style.setProperty('--arm', arm);
      if (pad) el.style.setProperty('--pad', pad);
      dialog.append(el);
    }
    // El menú no debe taparlos: le queda hasta un poco arriba de ellos (lo usa css/styles.css)
    if (boxes.length) dialog.style.setProperty('--pad-top', `${Math.min(...boxes.map(({ box }) => box.top))}px`);
  }

  leave() {
    let moved = false;
    // Al revés: FIRE primero, para que la cruceta vuelva antes de él
    for (const { el, parent, next } of [...this.homes].reverse()) {
      if (el.parentNode === parent) continue;
      moved = true;
      el.classList.remove('is-floating');
      for (const prop of ['left', 'top', 'width', 'height', '--arm', '--pad']) el.style.removeProperty(prop);
      parent.insertBefore(el, next);
    }
    if (moved) this.releaseAll();
  }
}
