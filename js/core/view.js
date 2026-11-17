// La vista del juego. Normalmente muestra 800 × 300 del mundo (proporción 8 : 3), y la cámara sube
// al volar alto (graphics/Camera.js). En un celular en vertical el ancho de la pantalla manda y el
// juego quedaría como una tira muy baja: ahí la vista se hace más alta, como en Chispas, mostrando
// una franja de cielo extra arriba (top unidades), sin cambiar nada del juego (ni lo que se ve hacia
// adelante, ni la dificultad). main.js decide cuándo (CONFIG.tallView); Scene dibuja el mundo debajo
// de esa franja y la cámara la cuenta como cielo que ya se ve.

import { CONFIG } from '../config.js';

// tall: es la vista alta del celular
export const VIEW = { top: 0, height: CONFIG.height, tall: false };

export function setViewTop(top) {
  VIEW.top = top;
  VIEW.height = CONFIG.height + top;
  VIEW.tall = top > 0;
}
