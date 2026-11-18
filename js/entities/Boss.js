// El jefe del nivel 12: el rival de quien juega (el animal de enfrente en la rueda). Todos los
// jefes hacen lo mismo; solo cambian el dibujo y el color (sign).
//
//   enter      entra desde la derecha
//   rest       descansa en su lugar y sigue, despacio, la altura de quien juega
//   telegraph  se queda quieto y avisa el ataque que viene (warning): así se esquiva con pericia
//   aiming     dispara a la altura de quien juega (uno en fácil, varios en difícil)
//   charging   cruza la pantalla por la franja que avisó, y regresa (returning)
// Sus ataques: volley (tres disparos), aimed (a la altura de quien juega), charge (embiste), rain
// (lluvia de fuego en diagonal desde lo alto) y wall (una línea vertical de pocos disparos muy
// separados). La lluvia y el muro se deciden al avisar (plan), para que el aviso muestre justo por
// dónde vendrán.
//   defeated   vencido: cae
//
// Los disparos son obstáculos ('shot', entities/Obstacle.js) que Game agrega al mundo (spawn).
// Decide con su propio azar (seed): así su copia (clone) hace exactamente lo mismo, y el bot de
// las pruebas puede ver venir sus ataques.

import { CONFIG } from '../config.js';
import { Obstacle } from './Obstacle.js';

const ATTACKS = ['volley', 'aimed', 'charge', 'rain', 'wall'];

export class Boss {
  /** sign: el animal ('horse'...); difficulty: 'easy' | 'hard'; seed: su azar. */
  constructor(sign, difficulty, seed = 1) {
    const { size, hp } = CONFIG.boss;
    this.sign = sign;
    this.difficulty = difficulty;
    this.w = size.w;
    this.h = size.h;
    this.maxHp = hp[difficulty];
    this.hp = this.maxHp;
    this.x = CONFIG.width + size.w; // el centro
    this.y = CONFIG.groundY - 110;
    this.prevX = this.x;
    this.prevY = this.y;
    this.vy = 0;
    this.state = 'enter';
    this.timer = 0;
    this.attack = null; // el ataque que viene o que está haciendo
    this.shots = 0; // disparos que le faltan (aiming)
    this.last = null; // el último ataque (no repite el mismo dos veces seguidas)
    this.plan = null; // la lluvia ({ drops: [x], top }) o el muro ({ x, ys }) que viene
    this.flash = 0; // le acaban de pegar (parpadea)
    this.t = 0;
    this.seed = seed >>> 0;
  }

  /** Su azar (mulberry32): un número de 0 a 1. */
  random() {
    this.seed = (this.seed + 0x6d2b79f5) >>> 0;
    let t = this.seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  get enraged() {
    return this.hp <= this.maxHp * CONFIG.boss.enrage.at;
  }

  get defeated() {
    return this.state === 'defeated';
  }

  /** Ya terminó de caer: el nivel se gana. */
  get done() {
    return this.defeated && this.timer >= CONFIG.boss.fallSeconds;
  }

  /** El ataque que está avisando (para el dibujo): 'volley' | 'aimed' | 'charge' | 'rain' | 'wall' | null. */
  get warning() {
    return this.state === 'telegraph' ? this.attack : null;
  }

  /** Lo más arriba y lo más abajo que puede estar su centro. */
  get range() {
    return [CONFIG.ceilingY + this.h / 2 + 10, CONFIG.groundY - this.h / 2 - 4];
  }

  /**
   * Un paso. playerY: la altura del centro de la cabeza de quien juega; playerX: dónde está (contra el
   * jefe se mueve de lado); spawn(obstacle): agrega un disparo al mundo.
   */
  update(dt, { playerY, playerX = CONFIG.player.x, worldSpeed = CONFIG.boss.speed, spawn }) {
    const { homeX, follow, telegraph, charge, enrage } = CONFIG.boss;
    this.prevX = this.x;
    this.prevY = this.y;
    this.t += dt;
    this.timer += dt;
    this.flash = Math.max(0, this.flash - dt);
    const [top, bottom] = this.range;
    const toward = (target, speed) => {
      const goal = Math.min(bottom, Math.max(top, target));
      const step = speed * dt;
      this.y += Math.max(-step, Math.min(step, goal - this.y));
    };

    switch (this.state) {
      case 'enter':
        this.x = Math.max(homeX, this.x - 160 * dt);
        toward(playerY, follow);
        if (this.x === homeX) this.rest();
        break;
      case 'rest':
        toward(playerY, follow);
        if (this.timer >= this.restFor) this.prepare(playerX, playerY, worldSpeed);
        break;
      case 'telegraph':
        if (this.timer >= telegraph[this.attack]) this.strike(playerY, spawn);
        break;
      case 'aiming':
        if (this.timer >= CONFIG.boss.aimed.every) {
          this.fire(playerY, spawn);
          this.timer = 0;
          if (--this.shots <= 0) this.rest();
        }
        break;
      case 'charging':
        this.x -= charge.speed * (this.enraged ? enrage.speed : 1) * dt;
        if (this.x < -this.w) {
          this.x = CONFIG.width + this.w;
          this.state = 'returning';
        }
        break;
      case 'returning':
        this.x = Math.max(homeX, this.x - charge.back * dt);
        toward(playerY, follow);
        if (this.x === homeX) this.rest();
        break;
      case 'defeated':
        this.vy += 900 * dt;
        this.y = Math.min(CONFIG.groundY + this.h, this.y + this.vy * dt);
        break;
      default:
        break;
    }
  }

  rest() {
    const [min, max] = CONFIG.boss.rest[this.difficulty];
    this.state = 'rest';
    this.timer = 0;
    this.restFor = (min + this.random() * (max - min)) * (this.enraged ? CONFIG.boss.enrage.rest : 1);
  }

  /** Elige el siguiente ataque (nunca el mismo dos veces seguidas) y empieza a avisarlo. */
  prepare(playerX = CONFIG.player.x, playerY = this.y, worldSpeed = CONFIG.boss.speed) {
    const options = ATTACKS.filter((a) => a !== this.last);
    this.attack = options[Math.floor(this.random() * options.length)];
    this.last = this.attack;
    this.state = 'telegraph';
    this.timer = 0;
    this.plan = null;
    const { rain, wall, shot } = CONFIG.boss;
    if (this.attack === 'rain') {
      // Apuntada: la bola aimed cruza la columna de quien juega a su altura; las demás, cada spacing
      // más arriba o más abajo. Cae fall hacia abajo mientras el mundo la lleva a la izquierda: para
      // cruzar esa columna a la altura y, sale de lo alto (top) (y - top) · worldSpeed / fall más allá
      const count = rain.drops[this.difficulty];
      const top = CONFIG.ceilingY + 4;
      // Cuál va a su altura: al azar entre las que dejan caber más bolas (si está abajo, las demás
      // van arriba; si está arriba, abajo)
      const fits = (k) => [...Array(count).keys()].filter((i) => {
        const y = playerY + (i - k) * rain.spacing;
        return y >= top + 30 && y <= CONFIG.groundY - shot.h;
      }).length;
      const best = Math.max(...[...Array(count).keys()].map(fits));
      const choices = [...Array(count).keys()].filter((k) => fits(k) === best);
      const aimed = choices[Math.floor(this.random() * choices.length)];
      const drops = [];
      for (let i = 0; i < count; i++) {
        const y = playerY + (i - aimed) * rain.spacing;
        // Las que cruzarían fuera de donde se puede volar, no salen (quedarían apretadas en la orilla)
        if (y < top + 30 || y > CONFIG.groundY - shot.h) continue;
        drops.push(playerX - shot.w / 2 + ((y - top) * worldSpeed) / rain.fall);
      }
      this.plan = { drops, top };
    } else if (this.attack === 'wall') {
      // Pocos disparos, repartidos de arriba abajo con la misma separación, corridos al azar
      const top = CONFIG.ceilingY + shot.h;
      const bottom = CONFIG.groundY - shot.h / 2 - 2;
      const step = (bottom - top) / wall.shots;
      const offset = this.random() * step;
      const ys = [...Array(wall.shots).keys()].map((i) => top + offset + i * step);
      this.plan = { x: this.x - this.w / 2 - shot.w, ys };
    }
  }

  strike(playerY, spawn) {
    const { shot, aimed } = CONFIG.boss;
    this.timer = 0;
    if (this.attack === 'volley') {
      for (const dy of [-shot.spread, 0, shot.spread]) this.fire(this.y + dy, spawn);
      this.rest();
    } else if (this.attack === 'aimed') {
      this.shots = aimed[this.difficulty];
      this.fire(playerY, spawn);
      if (--this.shots > 0) this.state = 'aiming';
      else this.rest();
    } else if (this.attack === 'rain') {
      this.rain(spawn);
      this.rest();
    } else if (this.attack === 'wall') {
      this.wall(spawn);
      this.rest();
    } else {
      this.state = 'charging';
    }
  }

  /** Un disparo hacia la izquierda, a la altura y (el centro), desde su boca. */
  fire(y, spawn) {
    const { shot, enrage } = CONFIG.boss;
    const [top, bottom] = [CONFIG.ceilingY + shot.h, CONFIG.groundY - shot.h / 2 - 2];
    const center = CONFIG.groundY - Math.min(bottom, Math.max(top, y));
    const o = new Obstacle('shot', this.x - this.w / 2 - shot.w, { height: 'boss', center });
    o.bob = 0;
    o.speedBonus = shot.speed[this.difficulty] * (this.enraged ? enrage.speed : 1);
    spawn(o);
  }

  /** La lluvia de fuego: una bola en lo alto por cada lugar avisado, que cae en diagonal. */
  rain(spawn) {
    const { shot, rain, enrage } = CONFIG.boss;
    for (const x of this.plan.drops) {
      const o = new Obstacle('shot', x, { height: 'boss', center: CONFIG.groundY - this.plan.top });
      o.bob = 0;
      o.fall = rain.fall * (this.enraged ? enrage.speed : 1);
      spawn(o);
    }
    this.plan = null;
  }

  /** El muro de fuego: los disparos avisados, en una línea vertical. */
  wall(spawn) {
    const { shot, wall, enrage } = CONFIG.boss;
    const { x, ys } = this.plan;
    for (const y of ys) {
      const o = new Obstacle('shot', x, { height: 'boss', center: CONFIG.groundY - y });
      o.bob = 0;
      o.speedBonus = shot.speed[this.difficulty] * wall.speed * (this.enraged ? enrage.speed : 1);
      spawn(o);
    }
    this.plan = null;
  }

  /**
   * Le pegó una bola de fuego (damage: cuánta vida le quita). Devuelve true si le hizo daño. También
   * mientras entra: las bolas de fuego solo lo alcanzan cuando ya se ve, y así ninguna se pierde.
   */
  hit(damage = 1) {
    if (this.defeated) return false;
    this.hp = Math.max(0, this.hp - damage);
    this.flash = 0.15;
    if (this.hp <= 0) {
      this.state = 'defeated';
      this.timer = 0;
      this.vy = -160;
    }
    return true;
  }

  hitboxes() {
    if (this.defeated) return [];
    return [{ x: this.x - this.w / 2 + 4, y: this.y - this.h / 2 + 4, w: this.w - 8, h: this.h - 8 }];
  }

  /** Una copia independiente: hace exactamente lo mismo (comparte la semilla, no el azar del juego). */
  clone() {
    return Object.assign(Object.create(Boss.prototype), this);
  }
}
