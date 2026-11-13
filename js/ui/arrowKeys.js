// Flechas del teclado para moverse entre las opciones de un menú: ← y ↑ van a la anterior,
// → y ↓ a la siguiente (dando la vuelta). Enter o Espacio eligen la opción enfocada, como siempre.

const STEP = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 };

/** Las opciones visibles y activas del menú, en orden. */
function options(container, selector) {
  return [...container.querySelectorAll(selector)].filter((el) => !el.disabled && el.getClientRects().length > 0);
}

/** Mueve el foco con las flechas entre los elementos `selector` dentro de `container`. */
export function arrowKeys(container, selector = 'button') {
  container.addEventListener('keydown', (event) => {
    const step = STEP[event.key];
    if (!step) return;
    const items = options(container, selector);
    if (!items.length) return;
    event.preventDefault();
    // Que el juego no tome la flecha como salto o agachada
    event.stopPropagation();
    const current = items.indexOf(document.activeElement);
    const next = current < 0 ? 0 : (current + step + items.length) % items.length;
    items[next].focus();
    // Aviso para quien quiera reaccionar al cambio de opción (el sonido del menú, en main.js)
    items[next].dispatchEvent(new CustomEvent('menu:move', { bubbles: true }));
  });
}
