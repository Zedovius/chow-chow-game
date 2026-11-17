// Quien juega: el animal de su año (sign: 'rat', 'ox'... ver world/levels.js). Todos se mueven igual
// y tienen la misma caja de choque, para que HI RECORDS sea justo; solo cambia el dibujo. Corre por
// el suelo como Chispas:
//   · salta (la acción 'jump'): mientras se mantiene el botón sube más; al soltarlo antes, el salto
//     se corta (salto variable);
//   · se agacha ('duck') en el suelo, y en el aire 'duck' lo hace caer más rápido;
//   · vuela, si tiene el poder (canFly, la estrella): en el aire, cada 'jump' es un aleteo suave.
//     Puede quedarse volando (hasta el techo del cielo, CONFIG.ceilingY) o bajar y seguir
//     corriendo. Un golpe le quita el poder y cae al suelo. El Dragón y el Gallo vuelan con sus
//     alas; los demás, en una nubecita (solo el dibujo).
//   · en los niveles sin suelo (ground = false) siempre puede volar, tenga o no el poder: tocar las
//     nubes de abajo lo hace rebotar (bumped) y Game le quita un corazón.
//
// Los animales de cuerpo largo (el Dragón y la Serpiente) dibujan un cuerpo que sigue el camino
// exacto de la cabeza: se guarda la altura de los pies según lo recorrido (la estela) y cada parte
// va sobre ese camino, a spacing de la anterior. Solo choca la cabeza (como en todos los animales).
//
// y es la altura de los PIES (el borde de abajo) de la cabeza: en el suelo, y = groundY.
// Al empezar o reintentar un nivel espera (waiting) hasta el primer salto: de pie o, sin suelo,
// flotando.
//
// Para el arte: parts() da de cada parte su centro, tamaño, inclinación (angle, en radianes;
// positivo = mirando hacia abajo) y tipo (para los animales cortos basta la cabeza, parts()[0]).
// pose dice qué hace ('run', 'duck', 'jump', 'fall', 'fly', 'hurt', 'dead', 'idle'); flapTime,
// cuánto hace del último aleteo; runTime, cuánto lleva corriendo (para las patas), y riding si va en
// su nubecita.

import { CONFIG } from '../config.js';

export class Player {
  constructor() {
    this.sign = null; // el animal ('rat', 'ox'...); null: el dragón de la pantalla de inicio
    this.ground = true; // ¿el nivel tiene suelo?
    this.canFly = false; // el poder de volar (la estrella): se conserva de un nivel al otro
    this.forceFlight = false; // en la pelea final (nivel 12) todos vuelan, y un golpe no lo quita
    this.reset();
  }

  /** ¿Puede aletear? Con el poder, siempre en un nivel sin suelo y siempre en la pelea final. */
  get flightAllowed() {
    return this.canFly || !this.ground || this.forceFlight;
  }

  /** Está volando (o flotando, sin suelo): en el aire con el poder de volar. */
  get airborne() {
    return this.alive && !this.onGround && (this.flying || !this.ground || this.forceFlight);
  }

  /** Vuela con alas: el Dragón y el Gallo. Los demás, en su nubecita. */
  get winged() {
    return ['dragon', 'rooster'].includes(this.sign ?? 'dragon');
  }

  /** Va en su nubecita (volando, si no es de los que tienen alas). */
  get riding() {
    return this.airborne && !this.winged;
  }

  /**
   * Tomó la estrella: tiene el poder de volar y despega en ese momento (la nubecita aparece de
   * inmediato; el Dragón y el Gallo abren las alas).
   */
  takeOff() {
    // Si ya vuela (con el poder, sin suelo o en la pelea final), otra estrella no cambia nada
    const already = this.flightAllowed && !this.onGround;
    this.canFly = true;
    if (!this.alive || already) return;
    this.onGround = false;
    this.ducking = false;
    this.jumpHeld = false;
    this.flying = true;
    this.vy = Math.min(this.vy, -CONFIG.player.flight.flap);
    this.flapTime = 0;
  }

  /** Al empezar un nivel; ground: si tiene suelo (si no, empieza flotando). */
  reset(ground = this.ground) {
    this.ground = ground;
    this.x = CONFIG.player.x;
    this.baseY = ground ? CONFIG.groundY : CONFIG.groundY - CONFIG.player.hoverHeight;
    this.y = this.baseY;
    this.prevY = this.y;
    this.vy = 0;
    this.wait = 0;
    this.onGround = ground;
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
    this.bumped = false; // tocó las nubes de un nivel sin suelo
    this.lostFlight = false; // un golpe le quitó el poder de volar
    this.flapTime = Infinity; // segundos desde el último aleteo
    this.runTime = 0; // segundos corriendo en el suelo
  }

  /** Un paso; scroll: lo recorrido hasta ahora (para el camino del cuerpo). */
  update(dt, input, scroll) {
    const { jumpVelocity, jumpCutVelocity, flight } = CONFIG.player;
    this.jumped = false;
    this.flapped = false;
    this.landed = false;
    this.bumped = false;
    this.lostFlight = false;
    this.flapTime += dt;
    const jump = input.wasPressed('jump');
    if (this.waiting) {
      if (!jump) {
        // Sin suelo, flota meciéndose
        if (!this.onGround) {
          this.wait += dt;
          this.y = this.baseY + Math.sin(this.wait * 3) * 6;
        }
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
      if (jump && this.flightAllowed) {
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
   * Gravedad. Saltando, la del salto; desde el primer aleteo (o sin suelo), la del vuelo: más suave
   * y con caída máxima.
   */
  physics(dt) {
    if (this.onGround) return;
    const { gravity, fastFallMultiplier, flight, head } = CONFIG.player;
    const gliding = this.flying || !this.ground;
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
    if (this.y < CONFIG.groundY) return;
    this.y = CONFIG.groundY;
    this.jumpHeld = false;
    this.fastFall = false;
    if (!this.ground) {
      // Sin suelo: rebota en las nubes
      this.vy = -CONFIG.player.cloudBounce;
      this.flying = true;
      this.bumped = true;
      return;
    }
    this.vy = 0;
    this.onGround = true;
    this.flying = false;
    this.landed = true;
  }

  /** Pasa a un nivel con o sin suelo sin detenerse: si se queda sin suelo, lo lanza a volar. */
  setGround(ground) {
    this.ground = ground;
    if (ground || !this.onGround) return;
    this.onGround = false;
    this.ducking = false;
    this.flying = true;
    this.vy = -CONFIG.player.jumpVelocity;
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
    if (this.onGround) this.slide += CONFIG.player.deathSlide * dt;
    else {
      this.vy += CONFIG.player.gravity * dt;
      this.y += this.vy * dt;
      if (this.y >= CONFIG.groundY) {
        this.y = CONFIG.groundY;
        this.vy = 0;
        this.onGround = true;
      }
    }
    this.remember(scroll);
  }

  /** Un golpe: parpadea invulnerable y, si tenía el poder de volar (y hay suelo), lo pierde y cae. */
  hurt() {
    this.invulnerable = CONFIG.player.invulnerableSeconds;
    this.ducking = false;
    this.jumpHeld = false;
    if (this.canFly && this.ground && !this.forceFlight) {
      this.canFly = false;
      this.flying = false; // sin poder, cae con la gravedad de siempre
      this.lostFlight = true;
    }
    // Un saltito al recibir el golpe (si iba subiendo más rápido, sigue igual)
    this.vy = Math.min(this.vy, -CONFIG.player.hurtBounce);
    this.onGround = false;
  }

  /** Se quedó sin corazones: un último saltito y cae. */
  die() {
    this.alive = false;
    this.ducking = false;
    this.flying = false;
    this.vy = Math.min(this.vy, -CONFIG.player.hurtBounce);
    this.onGround = false;
  }

  get canBeHit() {
    return this.alive && this.invulnerable <= 0;
  }

  /** Qué está haciendo, para el arte. */
  get pose() {
    if (!this.alive) return 'dead';
    if (this.waiting) return 'idle';
    if (this.invulnerable > CONFIG.player.invulnerableSeconds - 0.3) return 'hurt';
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
    const reach = CONFIG.player.spacing * (CONFIG.player.body.length + 2);
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
    const { head, body, spacing, duckScale } = CONFIG.player;
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

  /**
   * La caja de choque: la cabeza, un poco más chica que su dibujo para que los roces se sientan
   * justos. Es la misma para todos los animales (el cuerpo largo del Dragón y la Serpiente es solo
   * dibujo).
   */
  hitboxes({ ducking = this.ducking } = {}) {
    const { w, h } = CONFIG.player.head;
    const height = h * (ducking ? CONFIG.player.duckScale : 1);
    return [{ x: this.x - w / 2 + 2, y: this.y - height + 2, w: w - 4, h: height - 4 }];
  }

  /** Una copia independiente (para simular el futuro, como hace el bot de las pruebas). */
  clone() {
    const copy = Object.assign(Object.create(Player.prototype), this);
    copy.trail = this.trail.map((point) => ({ ...point }));
    return copy;
  }
}
