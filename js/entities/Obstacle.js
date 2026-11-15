// Un obstáculo: en el suelo (hay que saltarlo) o algo en el aire a cierta altura (ver
// world/obstacles.js). Las criaturas van un poco más rápido que el suelo; lo del aire se mece y,
// según su motion, además se mueve:
//   bob   solo se mece
//   wave  sube y baja
//   dive  al acercarse, baja (o sube, si abajo no hay lugar) de golpe
//   rise  sube despacio
// En el suelo, según su motion:
//   roll  rueda más rápido que el suelo (un barril)
//   hop   brinca en su lugar, siempre al mismo ritmo: arriba deja pasar por debajo
// Nunca sale de su fila (limits): así lo del cielo no estorba un salto normal. Las nubes de
// tormenta, además, sueltan rayos hacia abajo: avisan parpadeando (warning) y luego el rayo
// (striking) también golpea.

import { CONFIG } from '../config.js';
import { KINDS } from '../world/obstacles.js';

export class Obstacle {
  /**
   * kind: un tipo de KINDS; x: borde izquierdo. Para lo del aire: height ('low', 'mid', 'high' o
   * 'sky'), center: la altura de su centro sobre el suelo, motion, y limits: { low, high }, las
   * alturas sobre el suelo entre las que debe quedarse (su fila).
   */
  constructor(kind, x, { height = null, center = 0, motion = 'bob', limits = null } = {}) {
    const spec = KINDS[kind];
    this.kind = kind;
    this.height = spec.ground ? 'ground' : height;
    this.w = spec.w;
    this.h = spec.h;
    this.burnable = spec.burnable;
    this.motion = motion;
    this.x = x;
    this.prevX = x;
    this.baseY = spec.ground ? CONFIG.groundY - spec.h : CONFIG.groundY - center - spec.h / 2;
    this.y = this.baseY; // borde de arriba
    this.offset = 0; // lo que se movió hacia abajo (negativo: hacia arriba) por su motion
    this.bob = spec.ground ? 0 : 2;
    this.t = Math.random() * Math.PI * 2;
    // Las criaturas y lo que rueda van más rápido que el suelo
    this.speedBonus = kind === 'flyer' ? CONFIG.obstacles.flyerSpeedBonus : motion === 'roll' ? CONFIG.obstacles.motion.roll.speed : 0;
    // Cómo lo va pasando el dragón: qué tan cerca lo saltó, si pasó agachado (core/closeCalls.js)
    this.closeCall = { gap: Infinity, near: Infinity, ducked: false, grazed: false, passed: false, spoiled: false };

    // Cuánto se puede mover sin salir de su fila: hacia arriba (up) y hacia abajo (down)
    const bottom = CONFIG.groundY - (this.baseY + this.h); // altura de su borde de abajo
    const room = limits
      ? { up: Math.max(0, limits.high - (bottom + this.h) - this.bob), down: Math.max(0, bottom - limits.low - this.bob) }
      : { up: 0, down: 0 };
    const { wave, dive } = CONFIG.obstacles.motion;
    this.room = room;
    if (this.motion === 'wave') {
      this.amplitude = Math.min(wave.amplitude, room.up, room.down);
    } else if (this.motion === 'dive') {
      // Hacia donde haya más lugar
      this.diveDir = room.down >= room.up ? 1 : -1;
      this.diveDepth = Math.min(dive.depth, this.diveDir > 0 ? room.down : room.up);
      this.diving = false;
    }

    // Rayos: solo las nubes de tormenta, y solo si hay espacio abajo (con suelo, sin bajar a donde
    // llega un salto normal: limits.low - 10)
    this.lightning = null;
    if (kind === 'cloud') {
      const { length, period, warn, strike } = CONFIG.obstacles.lightning;
      const floor = limits ? limits.low - 10 : 0;
      const reach = Math.min(length, bottom - this.bob - floor);
      // Empieza en algún momento de la pausa: así ningún rayo cae sin su aviso
      if (reach >= 18) this.lightning = { length: reach, clock: Math.random() * (period - warn - strike) };
    }
    this.struck = false; // el rayo empezó en este paso
  }

  /** El tamaño de un tipo: { w, h } (ver world/obstacles.js). */
  static size(kind) {
    return KINDS[kind];
  }

  update(dt, speed) {
    this.prevX = this.x;
    this.x -= (speed + this.speedBonus) * dt;
    this.t += dt;
    const { wave, dive, rise, hop } = CONFIG.obstacles.motion;
    if (this.motion === 'wave') this.offset = Math.sin(this.t * wave.speed) * this.amplitude;
    else if (this.motion === 'hop') this.offset = -Math.abs(Math.sin((this.t * Math.PI) / hop.period)) * hop.height;
    else if (this.motion === 'dive') {
      if (!this.diving && this.x < dive.at) this.diving = true;
      if (this.diving) this.offset = this.diveDir * Math.min(this.diveDepth, Math.abs(this.offset) + dive.speed * dt);
    } else if (this.motion === 'rise') {
      this.offset = Math.max(-this.room.up, this.offset - rise.speed * dt);
    }
    this.y = this.baseY + this.offset + Math.sin(this.t * 6) * this.bob;
    if (this.lightning) {
      const wasStriking = this.striking;
      this.lightning.clock = (this.lightning.clock + dt) % CONFIG.obstacles.lightning.period;
      this.struck = this.striking && !wasStriking;
    }
  }

  /** La nube parpadea: viene un rayo. */
  get warning() {
    if (!this.lightning) return false;
    const { period, warn, strike } = CONFIG.obstacles.lightning;
    const clock = this.lightning.clock;
    return clock >= period - strike - warn && clock < period - strike;
  }

  /** El rayo está cayendo (y golpea). */
  get striking() {
    if (!this.lightning) return false;
    const { period, strike } = CONFIG.obstacles.lightning;
    return this.lightning.clock >= period - strike;
  }

  /** La caja del rayo en zigzag, de la nube hacia abajo (lo ancho del zigzag). */
  get bolt() {
    const { width } = CONFIG.obstacles.lightning;
    return { x: this.x + this.w / 2 - width / 2, y: this.y + this.h, w: width, h: this.lightning.length };
  }

  get offscreen() {
    return this.x + this.w < -10;
  }

  hitboxes() {
    const boxes = [{ x: this.x + 1, y: this.y + 1, w: this.w - 2, h: this.h - 2 }];
    if (this.striking) boxes.push(this.bolt);
    return boxes;
  }

  /** Una copia independiente (para simular el futuro, como hace el bot de las pruebas). */
  clone() {
    return Object.assign(Object.create(Obstacle.prototype), this, {
      closeCall: { ...this.closeCall },
      lightning: this.lightning && { ...this.lightning },
    });
  }
}
