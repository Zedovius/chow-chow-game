// La cámara vertical. El mundo es más alto que la pantalla (se puede volar hasta CONFIG.skyJumps
// alturas de salto): mientras el dragón corre, la pantalla muestra el suelo como siempre; al
// volar alto, la cámara sube con él, suave, y se detiene un poco arriba del techo del cielo.
//
// y: lo que se ve arriba de la pantalla normal (sin la franja de la vista alta), en coordenadas del
// mundo (0 = como siempre; negativo = más arriba). Solo afecta el dibujo: la física no sabe de la
// cámara. En la vista alta del celular (core/view.js) arriba se ve VIEW.top de cielo más: la cámara
// sube solo si el dragón pasa de ahí (con la vista más alta, nunca).

import { CONFIG } from '../config.js';
import { VIEW } from '../core/view.js';

/** Dónde quiere estar la cámara para que se vea bien un dragón con los pies en feetY. */
export function cameraTarget(feetY, top = VIEW.top) {
  const { feetAt, overCeiling } = CONFIG.camera;
  const highest = CONFIG.ceilingY - overCeiling + top;
  return Math.min(0, Math.max(highest, feetY - feetAt + top));
}

export class Camera {
  constructor() {
    this.y = 0;
    this.prevY = 0;
  }

  /** Un paso: se acerca a donde debería estar. */
  update(dt, feetY) {
    this.prevY = this.y;
    const target = cameraTarget(feetY);
    this.y += (target - this.y) * (1 - Math.exp(-CONFIG.camera.follow * dt));
    if (Math.abs(target - this.y) < 0.05) this.y = target;
  }

  /** De golpe (al empezar un nivel o volver al inicio). */
  snap(feetY) {
    this.y = cameraTarget(feetY);
    this.prevY = this.y;
  }
}
