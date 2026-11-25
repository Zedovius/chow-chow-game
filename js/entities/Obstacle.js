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

const SKY_BOB = 2; // cuánto se mece lo del aire (arriba y abajo)
// El rayo nunca baja hasta donde llega un salto normal: se queda esto arriba del borde de su fila
const BOLT_CLEARANCE = 10;

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
    this.prevY = this.y; // el del paso anterior (para dibujar entre dos pasos, Game.render)
    this.offset = 0; // lo que se movió hacia abajo (negativo: hacia arriba) por su motion
    this.fall = 0; // px/s hacia abajo (la lluvia de fuego del jefe, entities/Boss.js)
    // Un disparo del jefe sale de su boca o su mano (launchFrom: qué tan arriba o abajo de su altura) y
    // se abre hasta su altura en launchTime segundos
    this.launchFrom = 0;
    this.launchTime = 0;
    this.launchAge = 0;
    this.bob = spec.ground ? 0 : SKY_BOB;
    this.t = Math.random() * Math.PI * 2;
    this.skin = (this.t * 37) % 1; // cuál de sus dibujos le toca (0 a 1; graphics/obstaclePainter.js)
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
      const floor = limits ? limits.low - BOLT_CLEARANCE : 0;
      const reach = Math.min(length, bottom - this.bob - floor);
      // Empieza en algún momento de la pausa: así ningún rayo cae sin su aviso
      if (reach >= 18) this.lightning = { length: reach, clock: Math.random() * (period - warn - strike) };
    }
    this.struck = false; // el rayo empezó en este paso
  }

  /**
   * Lo más bajo que puede ir el centro de una nube de tormenta en una fila (limits) para que su rayo
   * quepa entero debajo: una nube sin rayo no debe salir (world/Spawner.js la sube hasta aquí).
   */
  static lowestCloud(limits) {
    const floor = limits ? limits.low - BOLT_CLEARANCE : 0;
    return floor + CONFIG.obstacles.lightning.length + SKY_BOB + KINDS.cloud.h / 2;
  }

  /** El tamaño de un tipo: { w, h } (ver world/obstacles.js). */
  static size(kind) {
    return KINDS[kind];
  }

  update(dt, speed) {
    this.prevX = this.x;
    this.prevY = this.y;
    this.x -= (speed + this.speedBonus) * dt;
    if (this.fall) this.baseY += this.fall * dt;
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
    if (this.launchTime) {
      this.launchAge = Math.min(this.launchTime, this.launchAge + dt);
      this.offset = this.launchFrom * (1 - this.launchAge / this.launchTime) ** 1.6;
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
    return this.x + this.w < -10 || this.y > CONFIG.groundY + 20; // (lo que cae, al llegar abajo)
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
