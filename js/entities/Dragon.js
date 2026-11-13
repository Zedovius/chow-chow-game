// El dragón: una cabeza y cinco partes de cuerpo. Corre por el suelo como Chispas:
//   · salta (la acción 'jump'): mientras se mantiene el botón sube más; al soltarlo antes, el salto
//     se corta (salto variable);
//   · se agacha ('duck') en el suelo, y en el aire 'duck' lo hace caer más rápido;
//   · en los niveles de vuelo (flight), en el aire cada 'jump' es un aleteo suave: puede quedarse
//     volando, o bajar y seguir corriendo.
//
// El cuerpo sigue el camino exacto de la cabeza, como una serpiente (o un dragón de la danza): se
// guarda la altura de los pies de la cabeza según lo recorrido (la estela) y cada parte va sobre
// ese camino, a spacing de la anterior. Así, si la cabeza pasó sobre un obstáculo, el cuerpo pasa
// por el mismo lugar.
//
// y es la altura de los PIES (el borde de abajo) de la cabeza: en el suelo, y = groundY.
// Al empezar o reintentar un nivel espera de pie (waiting) hasta el primer salto.
//
// Para el arte: parts() da de cada parte su centro, tamaño, inclinación (angle, en radianes;
// positivo = mirando hacia abajo) y tipo. pose dice qué hace ('run', 'duck', 'jump', 'fall',
// 'fly', 'hurt', 'dead', 'idle'); flapTime, cuánto hace del último aleteo, y runTime, cuánto lleva
// corriendo (para las patas).

import { CONFIG } from '../config.js';

export class Dragon {
  constructor() {
    this.flight = false; // ¿este nivel deja volar?
    this.reset();
  }

  reset() {
    this.x = CONFIG.dragon.x;
    this.y = CONFIG.groundY;
    this.prevY = this.y;
    this.vy = 0;
    this.onGround = true;
    this.ducking = false;
    this.jumpHeld = false; // el botón sigue presionado desde que saltó (salto variable)
    this.flying = false; // ya aleteó en este vuelo (gravedad suave hasta tocar el suelo)
    this.fastFall = false;
    this.invulnerable = 0;
    this.alive = true;
    this.waiting = true;
    this.scroll = 0;
    this.slide = 0; // al morir, ya en el suelo: el cuerpo se desliza hasta quedar tendido (ver fall)
    this.trail = [];
    // Lo que pasó en este paso, para los avisos (Game) y el arte
    this.jumped = false;
    this.flapped = false;
    this.landed = false;
    this.flapTime = Infinity; // segundos desde el último aleteo
    this.runTime = 0; // segundos corriendo en el suelo
  }

  /** Un paso; scroll: lo recorrido hasta ahora (para el camino del cuerpo). */
  update(dt, input, scroll) {
    const { jumpVelocity, jumpCutVelocity, flight } = CONFIG.dragon;
    this.jumped = false;
    this.flapped = false;
    this.landed = false;
    this.flapTime += dt;
    const jump = input.wasPressed('jump');
    if (this.waiting) {
      if (!jump) {
        this.remember(scroll);
        return;
      }
      this.waiting = false;
    }

    if (this.onGround) {
      this.ducking = input.isDown('duck');
      if (jump) {
        this.vy = -jumpVelocity;
        this.onGround = false;
        this.ducking = false;
        this.jumpHeld = true;
        this.jumped = true;
      }
    } else {
      // Salto variable: al soltar antes, el salto se corta
      if (this.jumpHeld && !input.isDown('jump')) {
        this.jumpHeld = false;
        this.vy = Math.max(this.vy, -jumpCutVelocity);
      }
      if (this.flight && jump) {
        this.vy = Math.min(this.vy, -flight.flap);
        this.jumpHeld = false;
        this.flying = true;
        this.flapped = true;
        this.flapTime = 0;
      }
      this.fastFall = input.isDown('duck');
    }

    this.physics(dt);
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.runTime = this.onGround ? this.runTime + dt : 0;
    this.remember(scroll);
  }

  /**
   * Gravedad. Corriendo, la del salto; en un nivel de vuelo, en cuanto empieza a bajar (o tras el
   * primer aleteo), la del vuelo: más suave y con caída máxima.
   */
  physics(dt) {
    if (this.onGround) return;
    const { gravity, fastFallMultiplier, flight, head } = CONFIG.dragon;
    const gliding = this.flight && (this.flying || this.vy >= 0);
    const pull = gliding ? flight.gravity * (this.fastFall ? flight.diveMultiplier : 1) : gravity * (this.fastFall ? fastFallMultiplier : 1);
    this.vy += pull * dt;
    if (gliding && !this.fastFall) this.vy = Math.min(this.vy, flight.maxFall);
    this.y += this.vy * dt;
    // El techo: no se sale por arriba
    const top = CONFIG.ceilingY + head.h;
    if (this.y < top) {
      this.y = top;
      this.vy = Math.max(0, this.vy);
    }
    if (this.y >= CONFIG.groundY) {
      this.y = CONFIG.groundY;
      this.vy = 0;
      this.onGround = true;
      this.flying = false;
      this.jumpHeld = false;
      this.fastFall = false;
      this.landed = true;
    }
  }

  /** En la pantalla de inicio: corre solo, con un saltito de vez en cuando. */
  hover(time, scroll) {
    const phase = time % 2.4;
    const hop = phase < 0.5 ? Math.sin((phase / 0.5) * Math.PI) * 40 : 0;
    this.y = CONFIG.groundY - hop;
    this.onGround = hop === 0;
    this.runTime = this.onGround ? this.runTime + 1 / 60 : 0;
    this.remember(scroll);
  }

  /**
   * Sin vida: cae hasta el suelo, y el cuerpo lo sigue (scroll: el mundo sigue avanzando, frenando).
   * Como el mundo se detiene, el cuerpo se quedaría parado sobre el camino de la caída: ya en el
   * suelo, se desliza por ese camino hasta quedar tendido detrás de la cabeza.
   */
  fall(dt, scroll) {
    this.ducking = false;
    this.flapTime += dt;
    if (this.onGround) this.slide += CONFIG.dragon.deathSlide * dt;
    else {
      this.vy += CONFIG.dragon.gravity * dt;
      this.y += this.vy * dt;
      if (this.y >= CONFIG.groundY) {
        this.y = CONFIG.groundY;
        this.vy = 0;
        this.onGround = true;
      }
    }
    this.remember(scroll);
  }

  hurt() {
    this.invulnerable = CONFIG.dragon.invulnerableSeconds;
    this.ducking = false;
    this.jumpHeld = false;
    // Un saltito al recibir el golpe (si iba subiendo más rápido, sigue igual)
    this.vy = Math.min(this.vy, -CONFIG.dragon.hurtBounce);
    this.onGround = false;
  }

  /** Se quedó sin corazones: un último saltito y cae. */
  die() {
    this.alive = false;
    this.ducking = false;
    this.flying = false;
    this.vy = Math.min(this.vy, -CONFIG.dragon.hurtBounce);
    this.onGround = false;
  }

  get canBeHit() {
    return this.alive && this.invulnerable <= 0;
  }

  /** Qué está haciendo, para el arte. */
  get pose() {
    if (!this.alive) return 'dead';
    if (this.waiting) return 'idle';
    if (this.invulnerable > CONFIG.dragon.invulnerableSeconds - 0.3) return 'hurt';
    if (this.onGround) return this.ducking ? 'duck' : 'run';
    if (this.flying) return 'fly';
    return this.vy < 0 ? 'jump' : 'fall';
  }

  /**
   * Guarda la altura de los pies de la cabeza en este punto del recorrido; se olvida lo que ya no
   * se usa. Si el mundo no avanzó (esperando el primer salto), se actualiza el último punto en
   * lugar de agregar otro: así la estela no crece sin fin.
   */
  remember(scroll) {
    this.scroll = scroll;
    scroll += this.slide;
    const trail = this.trail;
    const last = trail[trail.length - 1];
    if (last && last.at >= scroll) last.y = this.y;
    else trail.push({ at: scroll, y: this.y });
    const reach = CONFIG.dragon.spacing * (CONFIG.dragon.body.length + 2);
    while (trail.length > 2 && trail[1].at < scroll - reach) trail.shift();
  }

  /**
   * Cabeza y cuerpo, de la cabeza a la cola: { index, kind, x, y, w, h, angle } (x, y: el centro).
   *
   * Cada parte va spacing atrás de la anterior medido SOBRE EL CAMINO de la cabeza (no solo en
   * horizontal): así las partes nunca se separan, aunque el dragón suba o baje empinado, y los
   * pies de cada una están en un punto por donde pasaron los de la cabeza. Si la estela no alcanza
   * (al empezar), el resto del cuerpo sigue en línea recta hacia atrás. angle apunta de cada parte
   * hacia la de adelante (sobre el camino: en el suelo, 0).
   *
   * headY (los pies) y scroll permiten dibujar entre dos pasos (interpolados, ver Game.render).
   * ducking: con o sin agacharse (para saber qué habría golpeado de pie).
   */
  parts(headY = this.y, scroll = this.scroll, { ducking = this.ducking } = {}) {
    const { head, body, spacing, duckScale } = CONFIG.dragon;
    const scale = ducking ? duckScale : 1;
    const trail = this.trail;
    scroll += this.slide; // el camino se mide con lo que se deslizó al morir
    // Se recorre la estela de la cabeza hacia atrás, en coordenadas del mundo (at, y)
    let i = trail.length - 1;
    while (i >= 0 && trail[i].at >= scroll) i--;
    let from = { at: scroll, y: headY };
    let walked = 0; // lo recorrido sobre el camino hasta `from`
    const points = [from];
    for (let k = 1; k <= body.length; k++) {
      const target = spacing * k;
      for (;;) {
        // Sin más estela: en línea recta hacia atrás a la misma altura
        const to = i >= 0 ? trail[i] : { at: from.at - (target - walked), y: from.y };
        const length = Math.hypot(from.at - to.at, from.y - to.y);
        if (walked + length >= target - 1e-9) {
          const t = length > 0 ? (target - walked) / length : 0;
          points.push({ at: from.at + (to.at - from.at) * t, y: from.y + (to.y - from.y) * t });
          break;
        }
        walked += length;
        from = to;
        i--;
      }
    }
    const sizes = [head, ...body];
    return points.map((point, k) => {
      const h = sizes[k].h * scale;
      const ahead = points[Math.max(0, k - 1)];
      const behind = k === 0 ? points[1] : point;
      return {
        index: k,
        kind: k === 0 ? 'head' : 'body',
        x: this.x - (scroll - point.at),
        y: point.y - h / 2,
        w: sizes[k].w,
        h,
        angle: Math.atan2(ahead.y - behind.y, ahead.at - behind.at) || 0,
      };
    });
  }

  /** Cajas de colisión, un poco más chicas que cada parte para que los roces se sientan justos. */
  hitboxes(options) {
    return this.parts(this.y, this.scroll, options).map(({ x, y, w, h }) => ({ x: x - w / 2 + 2, y: y - h / 2 + 2, w: w - 4, h: h - 4 }));
  }

  /** Una copia independiente (para simular el futuro, como hace el bot de las pruebas). */
  clone() {
    const copy = Object.assign(Object.create(Dragon.prototype), this);
    copy.trail = this.trail.map((point) => ({ ...point }));
    return copy;
  }
}
