// La racha: cada obstáculo que el dragón deja atrás sin chocar (o quema) la alarga. Cada
// CONFIG.combo.every seguidos, el multiplicador de puntos sube CONFIG.combo.step, hasta
// CONFIG.combo.max. Un golpe la reinicia. Premia jugar bien y arriesgado: separa los puntajes.

import { CONFIG } from '../config.js';

export class Combo {
  constructor() {
    this.reset();
  }

  reset() {
    this.streak = 0;
    this.multiplier = 1;
  }

  /** count obstáculos más en la racha. Devuelve true si el multiplicador subió. */
  add(count = 1) {
    if (count <= 0) return false;
    const { every, step, max } = CONFIG.combo;
    const before = this.multiplier;
    this.streak += count;
    this.multiplier = Math.min(max, 1 + Math.floor(this.streak / every) * step);
    return this.multiplier > before;
  }

  /** Un golpe. Devuelve true si había un multiplicador que se perdió. */
  break() {
    const had = this.multiplier > 1;
    this.reset();
    return had;
  }
}
