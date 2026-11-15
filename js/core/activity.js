// ¿Hay alguien enfrente de la máquina? Anota la última vez que se tocó algo: una tecla (también las
// que traducen el control remoto, core/Remote.js), un clic o toque, o un botón del control
// (core/Gamepad.js avisa con touch()). Con eso la máquina regresa sola al menú principal cuando
// nadie juega (Game.checkIdle, ui/TitleMenu.js).

let last = globalThis.performance?.now() ?? 0;
const listeners = new Set();

/** Alguien tocó algo (o el juego entró a una pantalla de espera: la cuenta empieza ahí). */
export function touch() {
  last = performance.now();
  for (const listener of listeners) listener();
}

/** Segundos desde que alguien tocó algo. */
export const idleSeconds = () => (performance.now() - last) / 1000;

/** Avisa cada vez que alguien toca algo. Devuelve cómo dejar de escuchar. */
export function onActivity(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

if (typeof window !== 'undefined') {
  for (const type of ['keydown', 'pointerdown']) window.addEventListener(type, touch, true);
}
