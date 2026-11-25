// El jefe con su arte (los sprites de tools/sprites/jefes.mjs; medidas en graphics/bossArt.js): el
// cuerpo con sus cuadros, el brazo en el ángulo que toca según lo que hace (o la boca que se abre, en los que no tienen
// brazos), el punto débil (la moneda) y
// el ojo, que brilla del color de sus disparos y sigue a quien juega. Sin arte, Scene.drawBoss lo
// dibuja con figuras (y weak() su punto débil).
//
// Tiene profundidad (sprite stacking de lado): el cuerpo y el brazo vienen rebanados en capas, de atrás
// hacia adelante, y al girar hacia quien juega cada una se corre un poco más que la anterior. Son unos 13
// drawImage chicos por cuadro: se mide en décimas de milisegundo.

import { CONFIG } from '../config.js';
import { ready } from './assets.js';
import { snap } from './grid.js';

const P = CONFIG.pixel;
const whole = (v) => Math.round(v / P) * P; // medidas: pixeles del juego, enteros
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const SOCKET = '#120b1c';
const INK = '#1b1226'; // el contorno
const RED = '#ff2b2b';
const WEAK_FLASH = 0.35; // lo que dura el rojo (Boss.hit)
const TURN = 5; // qué tanto se separan las capas al girar (pixeles)
const COIN_DEPTH = 1.1;
const ARM_DEPTH = 0.95;
const THROW = 0.28; // segundos que dura el brazo lanzando

/** Un círculo de pixeles. */
function disc(ctx, x, y, r) {
  for (let dy = -whole(r); dy <= r; dy += P) {
    const half = whole(Math.sqrt(Math.max(0, r * r - dy * dy)));
    ctx.fillRect(snap(x) - half, snap(y) + dy, half * 2 + P, P);
  }
}

/** Un aro de pixeles. */
function hoop(ctx, x, y, r) {
  const n = Math.ceil((r * Math.PI * 2) / (P * 2.4));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    ctx.fillRect(snap(x + Math.cos(a) * r), snap(y + Math.sin(a) * r), P, P);
  }
}

export class BossPainter {
  constructor() {
    this.angle = null; // el ángulo del brazo (grados; más, más abajo), que llega suave a donde toca
    this.t = 0;
    this.white = new Map(); // imagen → su silueta blanca (al recibir un golpe)...
    this.red = new Map(); // ...o teñida de rojo (en el punto débil)
    this.yaw = 0; // cuánto gira hacia los lados y hacia arriba o abajo (-1 a 1)
    this.pitch = 0;
    this.sparks = [];
    this.lastFlash = 0;
    this.weakT = 0;
  }

  /** Qué hace el brazo: apunta a quien juega, se levanta, se echa atrás... */
  armGoal(boss) {
    const { state, warning, attack, t, timer, aimAngle: aim } = boss;
    const shake = Math.sin(t * 40) * 4; // al avisar, tiembla
    if (warning === 'rain') return -88 + shake; // en alto: llama a la lluvia
    if (warning === 'wall') return CONFIG.boss.arm.wall + shake;
    if (warning === 'charge') return 48 + shake; // agachado, listo para embestir
    if (warning === 'aimed') return aim + shake; // apunta
    if (warning) return 10 + shake; // la ráfaga sale de la boca
    if (state === 'charging') return -12;
    if (state === 'aiming') return aim - 10 * Math.max(0, Math.sin(t * 20));
    if (state === 'rest' && attack && timer < THROW) return { wall: 50, rain: 40, aimed: aim + 22 }[attack] ?? 24; // lanza
    if (state === 'defeated') return -95 + Math.sin(t * 24) * 10;
    return 24 + Math.sin(t * 2.2) * 5;
  }

  /** Los que atacan con la boca (la Serpiente y el Dragón): cuánto la abren (0: cerrada). */
  jaw({ state, warning, timer, attack, t }, jaws) {
    if (warning) return timer < 0.16 ? 1 : jaws - 1; // avisa un ataque: se va abriendo
    if (state === 'charging') return Math.floor(t * 9) % 2 ? jaws - 1 : 1; // embiste a mordidas
    if (state === 'aiming') return jaws - 1;
    if (state === 'rest' && attack && timer < 0.4) return timer < 0.24 ? jaws - 1 : 1; // acaba de disparar
    return 0;
  }

  /** Dibuja al jefe. target: { x, y }, la cabeza de quien juega. Devuelve false si el arte no ha cargado. */
  draw(ctx, boss, art, images, target) {
    const body = ready(images?.body);
    if (!body) return false;
    const arm = ready(images.arm);
    const coin = ready(images.coin);
    const { t, state, flash, fire, warning, weakFlash } = boss;
    const dt = clamp(t - this.t, 0, 0.1);
    this.t = t;
    const breathe = state === 'charging' ? 0 : Math.round(Math.sin(t * 2.4) * 0.7) * P;
    const lean = warning === 'charge' ? 4 + Math.round(Math.sin(t * 50)) * P : 0; // se echa atrás antes de embestir
    const shake = weakFlash > 0.15 ? Math.round(Math.sin(t * 90)) * P : 0;
    const left = snap(boss.x - art.center[0] * P) + lean + shake;
    const top = snap(boss.y - art.center[1] * P) + breathe;
    this.turn(dt, boss, target);
    // Dónde queda un punto del cuerpo, según su profundidad (0: atrás; 1: al frente)
    const at = ([x, y], depth) => {
      const [dx, dy] = this.shift(depth);
      return [left + x * P + dx, top + y * P + dy];
    };
    const tint = flash ? '#ffffff' : weakFlash > 0 ? RED : null;

    // El cuerpo, capa por capa, de atrás hacia adelante
    const frame = Math.floor(t * art.fps * (state === 'charging' ? 2 : 1)) % art.frames;
    const row = art.jaws ? this.jaw(boss, art.jaws) * art.layers : 0; // su boca
    this.stacked(ctx, art.ink, Array.from({ length: art.layers }, (_, layer) => [frame, row + layer, ...at([0, 0], layer / (art.layers - 1))]), body, art.w, art.h, tint);
    // La moneda, al frente; al darle, salta
    const jump = weakFlash > 0 ? Math.round(Math.sin((1 - weakFlash / WEAK_FLASH) * Math.PI) * 4) * P : 0;
    if (coin) {
      const [x, y] = at([0, 0], COIN_DEPTH);
      this.sprite(ctx, coin, frame, 0, art.w, art.h, x - jump, y - jump, flash ? '#ffffff' : null);
    }

    // El brazo llega a su ángulo rápido pero sin saltos
    const shoulder = at(art.shoulder, ARM_DEPTH);
    const goal = this.armGoal(boss);
    this.angle = this.angle === null ? goal : this.angle + (goal - this.angle) * (1 - Math.exp(-dt * 16));
    if (arm) {
      const k = Math.round(clamp((this.angle - art.armFrom) / (art.armTo - art.armFrom), 0, 1) * (art.armFrames - 1));
      const half = (art.armSize / 2) * P;
      this.stacked(ctx, art.ink, Array.from({ length: art.armLayers }, (_, layer) => {
        const [x, y] = at(art.shoulder, ARM_DEPTH + 0.2 * layer);
        return [k, layer, x - half, y - half];
      }), arm, art.armSize, art.armSize, tint);
    }
    // Se enciende de donde va a salir el ataque: la boca (ráfaga) o la mano (lo demás); y un fogonazo al salir
    const angle = (this.angle * Math.PI) / 180;
    const { reach } = CONFIG.boss.arm;
    const hand = [snap(shoulder[0] - reach * Math.cos(angle)), snap(shoulder[1] + reach * Math.sin(angle))];
    const source = boss.attack === 'volley' || art.jaws ? at(art.mouth, 0.6) : hand;
    if (warning && warning !== 'charge') this.glow(ctx, source, 3.5 + Math.min(3, boss.timer * 3) + Math.sin(t * 30) * 1.5, fire, 0.5);
    else if (state === 'aiming' || (state === 'rest' && boss.attack && boss.attack !== 'charge' && boss.timer < 0.14)) this.glow(ctx, source, 9, '#fff6e0', 0.6);
    if (warning === 'rain' && boss.plan) this.launchRain(ctx, source, boss);
    if (state !== 'defeated' && !flash) this.eye(ctx, at(art.eyes?.[frame] ?? art.eye, 0.75), target, boss, fire);
    this.weak(ctx, at(art.weak, COIN_DEPTH), boss);
    return true;
  }

  /**
   * Cuánto gira, para la profundidad: hacia donde está quien juega (adelante o atrás, arriba o abajo) y un
   * vaivén lento; al embestir, de frente. Llega suave.
   */
  turn(dt, boss, target) {
    const { min, max } = CONFIG.boss.move;
    const side = boss.state === 'charging' ? -1 : boss.warning === 'charge' ? 1 : 1 - (2 * (target.x - min)) / (max - min);
    const goal = {
      x: clamp(0.65 * side + 0.45 * Math.sin(boss.t * 1.5), -1, 1),
      y: clamp((target.y - boss.y) / 130 + 0.2 * Math.sin(boss.t * 1.1), -1, 1),
    };
    const k = 1 - Math.exp(-dt * 5);
    this.yaw += (goal.x - this.yaw) * k;
    this.pitch += (goal.y - this.pitch) * k;
  }

  /** Cuánto se corre lo que está a una profundidad (0: atrás; 1: al frente), en pixeles enteros. */
  shift(depth) {
    const d = depth - 0.35; // lo de en medio casi no se mueve
    return [Math.round(d * this.yaw * TURN) * P, Math.round(d * this.pitch * TURN * 0.6) * P];
  }

  /** Varias capas de una hoja, [cuadro, capa, x, y], una sobre otra; con ink, se juntan aparte y llevan su contorno. */
  stacked(ctx, ink, list, image, w, h, tint) {
    if (!ink) {
      for (const [frame, layer, x, y] of list) this.sprite(ctx, image, frame, layer, w, h, x, y, tint);
      return;
    }
    const pad = 8;
    const [W, H] = [w + pad * 2, h + pad * 2];
    if (!this.buffer || this.buffer.width < W || this.buffer.height < H) {
      const size = [Math.max(W, this.buffer?.width ?? 0), Math.max(H, this.buffer?.height ?? 0)];
      [this.buffer, this.shade] = [0, 1].map(() => Object.assign(document.createElement('canvas'), { width: size[0], height: size[1] }));
    }
    const brush = this.buffer.getContext('2d');
    const shade = this.shade.getContext('2d');
    brush.clearRect(0, 0, W, H);
    const [, , x0, y0] = list[0];
    for (const [frame, layer, x, y] of list) brush.drawImage(tint ? this.tinted(image, tint) : image, frame * w, layer * h, w, h, pad + Math.round((x - x0) / P), pad + Math.round((y - y0) / P), w, h);
    // El contorno: la silueta, corrida un pixel a cada lado, detrás
    shade.globalCompositeOperation = 'source-over';
    shade.clearRect(0, 0, W, H);
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) shade.drawImage(this.buffer, 0, 0, W, H, dx, dy, W, H);
    shade.globalCompositeOperation = 'source-in';
    shade.fillStyle = INK;
    shade.fillRect(0, 0, W, H);
    for (const canvas of [this.shade, this.buffer]) ctx.drawImage(canvas, 0, 0, W, H, x0 - pad * P, y0 - pad * P, W * P, H * P);
  }

  /** Un cuadro y una capa de una tira; teñido si le acaban de pegar. */
  sprite(ctx, image, frame, layer, w, h, x, y, tint) {
    ctx.drawImage(tint ? this.tinted(image, tint) : image, frame * w, layer * h, w, h, x, y, w * P, h * P);
  }

  /** La imagen teñida (se hace una vez): blanca entera, o en rojo dejando ver el dibujo. */
  tinted(image, color) {
    const key = color === RED ? this.red : this.white;
    if (!key.has(image)) {
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0);
      ctx.globalCompositeOperation = 'source-atop';
      ctx.globalAlpha = color === RED ? 0.62 : 1;
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      key.set(image, canvas);
    }
    return key.get(image);
  }

  /**
   * El punto débil. Encendido (mientras avisa un ataque): late en rojo y un aro se cierra sobre él, como
   * una mira. Al darle: chispas doradas que saltan.
   */
  weak(ctx, [x, y], { t, timer, weakOpen, weakFlash }) {
    const { r } = CONFIG.boss.weak;
    if (weakFlash > this.lastFlash) {
      this.sparks = Array.from({ length: 16 }, () => {
        const a = Math.PI * (0.6 + 0.9 * Math.random()); // hacia quien juega y hacia arriba
        const v = 70 + 170 * Math.random();
        return { x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, age: Math.random() * 0.12 };
      });
    }
    this.lastFlash = weakFlash;
    if (weakOpen) {
      const beat = Math.floor(t * 12) % 2;
      ctx.fillStyle = RED;
      ctx.globalAlpha = beat ? 0.75 : 0.4;
      disc(ctx, x, y, r - 2);
      ctx.globalAlpha = 1;
      ctx.fillStyle = beat ? '#ffd9c9' : RED;
      disc(ctx, x, y, 4);
      ctx.fillStyle = beat ? '#ffffff' : RED;
      hoop(ctx, x, y, r + 1 + 16 * Math.max(0, 1 - ((timer * 2.2) % 1)));
    }
    this.sparks = this.sparks.filter((spark) => spark.age < 0.55);
    const dt = clamp(t - this.weakT, 0, 0.1);
    this.weakT = t;
    for (const spark of this.sparks) {
      spark.age += dt;
      spark.vy += 420 * dt;
      spark.x += spark.vx * dt;
      spark.y += spark.vy * dt;
      ctx.fillStyle = spark.age < 0.12 ? '#ffffff' : spark.age < 0.35 ? '#ffd23f' : '#c8741a';
      const size = spark.age < 0.3 ? 2 * P : P;
      ctx.fillRect(snap(spark.x), snap(spark.y), size, size);
    }
  }

  /** El ojo: un brillo que late (más al avisar un ataque) y la pupila de luz hacia quien juega. */
  eye(ctx, [x, y], target, { t, warning, state, enraged }, color) {
    const alert = Boolean(warning) || state === 'charging';
    const beat = 0.5 + 0.5 * Math.sin(t * (alert ? 22 : enraged ? 9 : 4));
    this.glow(ctx, [x, y], (alert ? 7 : 5) + beat * 2, color, alert ? 0.34 : 0.22);
    // Al embestir, la luz del ojo deja una estela
    if (state === 'charging') {
      for (let i = 1; i <= 5; i++) {
        ctx.globalAlpha = 0.5 - i * 0.08;
        ctx.fillStyle = color;
        ctx.fillRect(x + i * 3 * P, y, 3 * P, P);
      }
      ctx.globalAlpha = 1;
    }
    // El hueco oscuro y el ceño, para que la luz se lea como un ojo y no como una mancha
    ctx.fillStyle = SOCKET;
    ctx.fillRect(x - 3 * P, y - P, 5 * P, 2 * P);
    ctx.fillRect(x - P, y - 2 * P, 4 * P, P);
    ctx.fillRect(x - 2 * P, y + P, 3 * P, P);
    ctx.fillStyle = color;
    ctx.fillRect(x - P, y - P, 2 * P, 2 * P);
    ctx.fillRect(x - 2 * P, y, 4 * P, P);
    const dx = clamp(Math.round((target.x - x) / 120), -1, 1);
    const slope = (target.y - y) / Math.max(40, Math.abs(target.x - x));
    const dy = slope > 0.08 ? 0 : -1;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + dx * P, y + dy * P, P, P);
    if (alert) ctx.fillRect(x + dx * P, y - (dy + 1) * P, P, P); // al atacar, la pupila es más grande
  }

  /** Antes de la lluvia, la mano lanza las bolas hacia lo alto: llegan justo a donde empiezan a caer. */
  launchRain(ctx, hand, { plan, timer, fire }) {
    const time = 0.4;
    const k = (timer - (CONFIG.boss.telegraph.rain - time)) / time;
    if (k <= 0 || k > 1) return;
    const { w, h } = CONFIG.boss.shot;
    for (const x of plan.drops) {
      const px = snap(hand[0] + (x + w / 2 - hand[0]) * k);
      const py = snap(hand[1] + (plan.top - hand[1]) * (1 - (1 - k) ** 1.6));
      ctx.fillStyle = fire;
      ctx.fillRect(px - w / 2, py - h / 2, w, h);
      ctx.fillStyle = '#fff3b0';
      ctx.fillRect(px - 3, py - 2, 6, 4);
    }
  }

  /** Un brillo de pixeles: cruces cada vez más chicas y más claras. */
  glow(ctx, [x, y], radius, color, strength) {
    ctx.fillStyle = color;
    for (const k of [1, 0.66, 0.36]) {
      const r = whole(radius * k * P / 2);
      ctx.globalAlpha = strength * (1.15 - k) * 0.7;
      ctx.fillRect(x - r, y - r / 2, r * 2 + P, r + P);
      ctx.fillRect(x - r / 2, y - r, r + P, r * 2 + P);
    }
    ctx.globalAlpha = 1;
  }
}
