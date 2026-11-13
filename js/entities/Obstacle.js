// Un obstáculo: en el suelo (hay que saltarlo) o algo en el aire a cierta altura (ver
// world/obstacles.js). Las criaturas van un poco más rápido que el suelo; lo del aire se mece.

import { CONFIG } from '../config.js';
import { KINDS } from '../world/obstacles.js';

export class Obstacle {
  /**
   * kind: un tipo de KINDS; x: borde izquierdo. Para lo del aire, height ('low', 'mid', 'high' o
   * 'sky') y center: la altura de su centro sobre el suelo.
   */
  constructor(kind, x, { height = null, center = 0 } = {}) {
    const spec = KINDS[kind];
    this.kind = kind;
    this.height = spec.ground ? 'ground' : height;
    this.w = spec.w;
    this.h = spec.h;
    this.burnable = spec.burnable;
    this.x = x;
    this.prevX = x;
    this.baseY = spec.ground ? CONFIG.groundY - spec.h : CONFIG.groundY - center - spec.h / 2;
    this.y = this.baseY; // borde de arriba
    this.bob = spec.ground ? 0 : 2;
    this.t = Math.random() * Math.PI * 2;
    this.speedBonus = kind === 'flyer' ? CONFIG.obstacles.flyerSpeedBonus : 0; // las criaturas, más rápido
    // Cómo lo va pasando el dragón: qué tan cerca lo saltó, si pasó agachado (core/closeCalls.js)
    this.closeCall = { gap: Infinity, ducked: false, passed: false, spoiled: false };
  }

  /** El tamaño de un tipo: { w, h } (ver world/obstacles.js). */
  static size(kind) {
    return KINDS[kind];
  }

  update(dt, speed) {
    this.prevX = this.x;
    this.x -= (speed + this.speedBonus) * dt;
    this.t += dt;
    this.y = this.baseY + Math.sin(this.t * 6) * this.bob;
  }

  get offscreen() {
    return this.x + this.w < -10;
  }

  hitboxes() {
    return [{ x: this.x + 1, y: this.y + 1, w: this.w - 2, h: this.h - 2 }];
  }

  /** Una copia independiente (para simular el futuro, como hace el bot de las pruebas). */
  clone() {
    return Object.assign(Object.create(Obstacle.prototype), this, { closeCall: { ...this.closeCall } });
  }
}
