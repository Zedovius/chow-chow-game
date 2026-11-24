// Dibuja al animal de quien juega, con profundidad (sprite stacking): cada cuadro viene rebanado en capas
// (tools/sprites/animales.mjs; medidas en graphics/animalArt.js) que se apilan de atrás hacia adelante,
// cada una un poco más corrida según cuánto gira (yaw) y qué tan de arriba se ve (pitch).
//
//   · Los de cuatro patas y el gallo: un cuadro por momento. La carrera avanza con lo recorrido (stride),
//     así los pies no patinan aunque cambie la velocidad.
//   · El dragón y la serpiente: el cuerpo se arma con vértebras sobre el camino de la cabeza
//     (Player.parts). El dragón lleva cuatro patas articuladas (trotan apoyadas donde pasa cada parte del
//     cuerpo; en el aire, reman) y alas.
//   · Volando: en una nube con su estela de volutas (al aletear se aplasta y suelta vapor); el dragón y el
//     gallo, con sus alas (y una ráfaga con cada aleteo).
//
// Todo se junta en un lienzo chico, se le pone el contorno y se dibuja de una vez.

import { CONFIG } from '../config.js';
import { ANIMAL_ART } from './animalArt.js';

const P = CONFIG.pixel;
const OUTLINE = '#1b1226';
const CLOUD_OUTLINE = '#6b7fc0';
const VIEW = { yaw: 0.45, pitch: 0.28 }; // un poco girado y visto un poco de arriba
const STEP = 2; // cada cuántos pixeles va una vértebra
const FLAP_SECONDS = 0.42; // lo que dura un aleteo con alas
const PRESS_SECONDS = 0.3; // y el de la nube

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const lerp = (a, b, k) => a + (b - a) * k;
const frac = (v) => ((v % 1) + 1) % 1;
const snap = (v) => Math.round(v / P) * P;

function canvas(w, h) {
  const el = document.createElement('canvas');
  el.width = w;
  el.height = h;
  return el;
}

export class AnimalPainter {
  constructor() {
    this.sheets = new Map(); // id → { image, ready }
    this.t = 0; // segundos (se detiene en pausa)
    this.last = 0;
    this.scroll = null;
    this.particles = []; // la estela, el vapor, las ráfagas y el polvo, en el mundo
    this.emit = 0;
    this.yaw = VIEW.yaw;
    this.headX = null;
    this.onGround = true;
    this.flapped = Infinity;
    this.long = { ground: 1, duck: 0 };
  }

  /** La hoja de un animal: se baja la primera vez que se pide. */
  sheet(id) {
    if (!this.sheets.has(id)) {
      const entry = { image: null, ready: false };
      this.sheets.set(id, entry);
      const art = ANIMAL_ART[id];
      if (art && typeof Image !== 'undefined') {
        const image = new Image();
        image.decoding = 'async';
        image.addEventListener('load', () => {
          entry.image = image;
          entry.ready = true;
        });
        image.addEventListener('error', () => console.warn(`[Chow Chow] No se pudo cargar la imagen ${art.src}.`));
        image.src = art.src;
      }
    }
    return this.sheets.get(id);
  }

  /** Dibuja al animal. Devuelve false si su hoja todavía no carga (Scene lo dibuja con figuras). */
  draw(ctx, { player, headX, headY, scroll, state, dust, blink = false }) {
    const id = player.sign ?? 'dragon';
    const art = ANIMAL_ART[id];
    const sheet = this.sheet(id);
    const vapor = this.sheet('cloud');
    if (!art || !sheet.ready) return false;
    this.tick({ player, headX, headY, scroll, state, dust, cloud: player.riding });

    const x = Math.round(headX / P);
    const y = Math.round(headY / P);
    this.drawParticles(ctx, vapor);
    const riding = player.riding && vapor.ready;
    if (riding) this.drawCloud(ctx, vapor.image, x - 3, y, player.flapTime);
    if (blink) return true; // recién golpeado: parpadea (la nube no)
    if (art.long && !(riding && id === 'snake')) this.drawLong(ctx, art, sheet.image, { player, headX, headY, scroll, id });
    else {
      const piece = art.pieces[id === 'snake' ? 'coil' : 'body'];
      const frame = id === 'snake' ? this.coilFrame(player) : this.frame(art, player, scroll);
      this.begin(x - piece.ax - 8, y - piece.ay - 6, piece.w + 16, piece.h + 12);
      this.put(sheet.image, piece, frame, x, y);
      this.end(ctx, OUTLINE);
    }
    // Las bolas de vapor de enfrente, encima de las patas: va metido en la nube, no pegado a ella
    if (riding) this.drawCloud(ctx, vapor.image, x - 3, y, player.flapTime, 3);
    return true;
  }

  // --- El tiempo, el giro y lo que suelta ------------------------------------------

  tick({ player, headX, headY, scroll, state, dust, cloud }) {
    const now = performance.now() / 1000;
    const running = state === 'playing' || state === 'title' || state === 'dying';
    const dt = running ? clamp(now - this.last, 0, 0.05) : 0;
    this.last = now;
    this.t += dt;
    const moved = this.scroll === null || scroll < this.scroll || scroll - this.scroll > 200 ? 0 : scroll - this.scroll;
    this.scroll = scroll;

    // Gira un poco: hacia donde se mueve contra el jefe, al subir y bajar, y con un vaivén lento
    const push = this.headX === null ? 0 : clamp((headX - this.headX) / 4, -1, 1);
    this.headX = headX;
    const goal = VIEW.yaw - push * 0.3 + (player.onGround ? 0 : clamp(player.vy / 1600, -0.16, 0.16)) + Math.sin(this.t * 1.3) * 0.05;
    this.yaw += (goal - this.yaw) * (1 - Math.exp(-dt * 8));

    // Polvo al caer al suelo y al saltar
    if (player.alive && player.ground && player.onGround !== this.onGround && moved > 0) {
      const n = player.onGround ? 6 : 4;
      for (let i = 0; i < n; i++) this.particles.push({ kind: 'dust', x: headX - 18 + i * 8, y: CONFIG.groundY - 2, vx: (i - n / 2) * 14 - 20, vy: -18 - ((i * 7) % 11) * 2, age: 0, life: 0.34, color: dust });
    }
    this.onGround = player.onGround;

    // La estela de la nube: una voluta cada tanto recorrido; al aletear, un soplo hacia abajo
    const flapped = player.airborne && player.flapTime < this.flapped;
    this.flapped = player.flapTime;
    if (cloud) {
      this.emit += moved;
      while (this.emit > 13) {
        this.emit -= 13;
        this.particles.push({ kind: 'wisp', x: headX - 42, y: headY + 6 + Math.sin(this.t * 11) * 3, vx: 0, vy: -4, age: 0, life: 0.66, size: 0 });
      }
      if (flapped) {
        for (let i = 0; i < 6; i++) {
          const side = (i / 5) * 2 - 1;
          this.particles.push({ kind: 'wisp', x: headX - 6 + side * 24, y: headY + 12 - Math.abs(side) * 4, vx: side * 34 + Math.random() * 12 - 6, vy: 52 - Math.abs(side) * 26 + Math.random() * 14, age: Math.random() * 0.06, life: 0.46 + Math.random() * 0.14, size: 0.6 });
        }
      }
    } else if (flapped && player.winged) {
      for (let i = 0; i < 2; i++) this.particles.push({ kind: 'gust', x: headX - 22 - i * 14, y: headY + 2 + i * 5, vx: -10, vy: 70 - i * 18, age: 0, life: 0.26, size: 7 - i * 2 });
    }
    for (const p of this.particles) {
      p.age += dt;
      p.x += p.vx * dt - moved * (p.kind === 'dust' ? 1 : 0.8);
      p.y += p.vy * dt;
      if (p.kind === 'wisp') p.vy *= 1 - 3 * dt;
    }
    this.particles = this.particles.filter((p) => p.age < p.life && p.x > -40);
  }

  drawParticles(ctx, vapor) {
    for (const p of this.particles) {
      const k = p.age / p.life;
      if (p.kind === 'wisp') {
        if (!vapor.ready) continue;
        const piece = ANIMAL_ART.cloud.pieces.wisp;
        const frame = clamp(Math.floor((k + p.size * 0.15) * piece.frames), 0, piece.frames - 1);
        ctx.globalAlpha = 0.9 * (1 - k * k);
        // Tres capas bastan para que tengan bulto
        for (const layer of [-1, 0, 1]) {
          ctx.drawImage(vapor.image, frame * piece.w, piece.y + (layer + piece.depth) * piece.h, piece.w, piece.h, snap(p.x) - piece.ax * P + layer * P * (layer > 0 ? 1 : 0), snap(p.y) - piece.ay * P, piece.w * P, piece.h * P);
        }
      } else if (p.kind === 'gust') {
        // Una ráfaga: un arco que baja y se abre
        ctx.globalAlpha = 0.55 * (1 - k);
        ctx.fillStyle = '#f4f6ff';
        for (let i = -p.size; i <= p.size; i++) ctx.fillRect(snap(p.x) + i * P, snap(p.y) - Math.round((i * i) / (p.size * 2.2)) * P, P, P);
      } else {
        ctx.globalAlpha = 0.8 * (1 - k);
        ctx.fillStyle = p.color;
        const size = (k < 0.5 ? 2 : 1) * P;
        ctx.fillRect(snap(p.x), snap(p.y), size, size);
      }
    }
    ctx.globalAlpha = 1;
  }

  // --- Qué cuadro toca ----------------------------------------------------------------

  frame(art, player, scroll) {
    const { anims } = art;
    const pick = (name, k) => anims[name][0] + clamp(Math.floor(frac(k) * anims[name][1]), 0, anims[name][1] - 1);
    const { pose, vy, flapTime } = player;
    if (pose === 'dead') return pick(player.onGround ? 'dead' : 'hurt', 0);
    if (pose === 'hurt') return pick('hurt', 0);
    if (player.airborne) {
      const seconds = art.wings ? FLAP_SECONDS : PRESS_SECONDS;
      return flapTime < seconds ? pick('press', flapTime / seconds) : pick('ride', this.t * (art.wings ? 1.6 : 0.9));
    }
    if (pose === 'idle') return pick('idle', this.t * 0.9);
    if (pose === 'duck') return pick('duck', scroll / P / 18);
    if (pose === 'run') return pick('run', scroll / P / art.stride);
    const rise = anims.jump[0];
    if (vy < -430) return rise;
    if (vy < -130) return rise + 1;
    if (vy < 130) return rise + 2;
    return anims.fall[0] + (vy < 420 ? 0 : 1);
  }

  coilFrame(player) {
    if (player.flapTime < PRESS_SECONDS) return 6 + clamp(Math.floor((player.flapTime / PRESS_SECONDS) * 3), 0, 2);
    return Math.floor(frac(this.t * 0.6) * 6);
  }

  // --- Apilar capas --------------------------------------------------------------------

  /** Empieza un dibujo en el lienzo chico: la caja que ocupa, en pixeles del juego. */
  begin(x, y, w, h) {
    if (!this.buffer || this.buffer.width < w || this.buffer.height < h) {
      const size = [Math.max(w, this.buffer?.width ?? 96), Math.max(h, this.buffer?.height ?? 72)];
      this.buffer = canvas(...size);
      this.shadow = canvas(...size);
      this.brush = this.buffer.getContext('2d');
      this.shade = this.shadow.getContext('2d');
    }
    this.box = { x, y, w, h };
    this.brush.clearRect(0, 0, w, h);
    this.layers = new Map(); // z → lo que se dibuja ahí
  }

  /** Agrega una pieza en (x, y), a la profundidad z. from: solo sus capas de ahí al frente; step: una de cada tantas. */
  put(image, piece, frame, x, y, z = 0, from = -Infinity, step = 1) {
    for (let i = -piece.depth; i <= piece.depth; i += step) {
      const at = z + i;
      if (at < from) continue;
      if (!this.layers.has(at)) this.layers.set(at, []);
      this.layers.get(at).push(image, frame * piece.w, piece.y + (i + piece.depth) * piece.h, piece.w, piece.h, x - piece.ax, y - piece.ay);
    }
  }

  /** Junta las capas (de atrás hacia adelante), les pone contorno y dibuja todo. */
  end(ctx, outline) {
    const { x, y, w, h } = this.box;
    const { brush, shade } = this;
    for (const z of [...this.layers.keys()].sort((a, b) => a - b)) {
      const dx = Math.round(z * this.yaw) - x;
      const dy = Math.round(z * VIEW.pitch) - y;
      const list = this.layers.get(z);
      for (let i = 0; i < list.length; i += 7) brush.drawImage(list[i], list[i + 1], list[i + 2], list[i + 3], list[i + 4], list[i + 5] + dx, list[i + 6] + dy, list[i + 3], list[i + 4]);
    }
    if (outline) {
      // El contorno: la silueta, corrida un pixel a cada lado, detrás
      shade.globalCompositeOperation = 'source-over';
      shade.clearRect(0, 0, w, h);
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) shade.drawImage(this.buffer, 0, 0, w, h, dx, dy, w, h);
      shade.globalCompositeOperation = 'source-in';
      shade.fillStyle = outline;
      shade.fillRect(0, 0, w, h);
      ctx.drawImage(this.shadow, 0, 0, w, h, x * P, y * P, w * P, h * P);
    }
    ctx.drawImage(this.buffer, 0, 0, w, h, x * P, y * P, w * P, h * P);
  }

  /** La nube; front: solo las capas de enfrente (sin contorno), para ponerlas encima del animal. */
  drawCloud(ctx, image, x, y, flapTime, front = null) {
    const piece = ANIMAL_ART.cloud.pieces.cloud;
    const frame = flapTime < PRESS_SECONDS ? 6 + clamp(Math.floor((flapTime / PRESS_SECONDS) * 3), 0, 2) : Math.floor(frac(this.t * 0.8) * 6);
    this.begin(x - piece.ax - 6, y - piece.ay - 4, piece.w + 12, piece.h + 8);
    this.put(image, piece, frame, x, y, 0, front ?? -Infinity);
    this.end(ctx, front === null ? CLOUD_OUTLINE : null);
  }

  // --- Cuerpos largos ------------------------------------------------------------------

  /** El dragón y la serpiente: el cuerpo sobre el camino de la cabeza. */
  drawLong(ctx, art, image, { player, headX, headY, scroll, id }) {
    const snake = id === 'snake';
    const { pieces } = art;
    const parts = player.parts(headY, scroll, { headX });
    const groundY = CONFIG.groundY / P;
    const tall = { run: snake ? [7.4, 5, 3.4, 3, 2.7, 2] : [11.4, 9.8, 9.2, 9, 7.6, 5.4], air: snake ? [5, 4.2, 3.8, 3.4, 3, 2.2] : [6.6, 6, 5.8, 5.4, 4.8, 4], duck: snake ? [3.2, 3, 2.8, 2.6, 2.2, 1.6] : [4.2, 3.8, 3.6, 3.4, 3, 2.4] };
    const crouch = player.ducking || !player.alive ? 1 : 0;
    this.long.duck += (crouch - this.long.duck) * 0.35;
    // Cada parte, en pixeles: el centro a su altura sobre el camino (de pie donde toca el suelo)
    const wave = this.t * (snake ? 0 : 5) + (snake ? (scroll / P) * 0.17 : 0);
    const points = parts.map((part, k) => {
      const feet = (part.y + part.h / 2) / P;
      const grounded = player.ground ? clamp(1 - (groundY - feet) / 10, 0, 1) : 0;
      const height = lerp(lerp(tall.air[k], tall.run[k], grounded), tall.duck[k], this.long.duck * Math.max(grounded, player.alive ? 0 : 1));
      const free = Math.min(1, k / 2);
      const swing = Math.sin(wave - k * (snake ? 1.5 : 1.15));
      const z = snake ? swing * 3.4 * Math.min(1, k / 1.6) : Math.sin(wave * 0.8 - k * 1.1) * lerp(2.2, 1, grounded) * free;
      const rise = snake ? z * -0.5 * grounded : swing * lerp(1.7, 0.45, grounded) * free;
      return { x: part.x / P, y: feet - height - rise, z, feet, grounded };
    });
    const path = resample(points, STEP);
    const last = path[path.length - 1];
    const before = path[Math.max(0, path.length - 4)];

    let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
    for (const p of path) {
      x0 = Math.min(x0, p.x);
      x1 = Math.max(x1, p.x);
      y0 = Math.min(y0, p.y);
      y1 = Math.max(y1, p.y);
    }
    const pad = 24;
    this.begin(Math.floor(x0) - pad, Math.floor(y0) - pad, Math.ceil(x1 - x0) + pad * 2, Math.ceil(y1 - y0) + pad * 2);

    const nearest = (list, v) => list.reduce((best, a, i) => (Math.abs(a - v) < Math.abs(list[best] - v) ? i : best), 0);
    // La punta de la cola, hacia donde va el cuerpo
    if (pieces.tail) {
      const angle = Math.atan2(last.y - before.y, before.x - last.x);
      this.put(image, pieces.tail, nearest(art.angles, angle) * 4 + (Math.floor(this.t * 8) % 4), Math.round(last.x), Math.round(last.y), Math.round(last.z));
    }
    // Las vértebras, de la cola a la cabeza
    for (let i = path.length - 1; i >= 1; i--) {
      const p = path[i];
      const ahead = path[Math.max(0, i - 2)];
      const behind = path[Math.min(path.length - 1, i + 2)];
      const angle = Math.atan2(behind.y - ahead.y, ahead.x - behind.x);
      const r = clamp(Math.round((i / (path.length - 1)) * (art.radii.length - 1) - 0.1), 0, art.radii.length - 1);
      const frame = (r * art.angles.length + nearest(art.angles, angle)) * art.patterns + (i % art.patterns);
      // Con una de cada dos capas basta: las vértebras se enciman
      this.put(image, pieces.spine, frame, Math.round(p.x), Math.round(p.y), Math.round(p.z), -2, 2);
    }
    if (!snake) this.putLimbs(image, art, player, path, scroll);

    // La cabeza, inclinada según el camino
    const turn = nearest(art.turns, clamp(-parts[0].angle * 0.9, -0.7, 0.7));
    const hurt = player.pose === 'hurt' || player.pose === 'dead';
    let frame;
    if (snake) {
      const flick = frac(this.t * 0.8);
      const tongue = flick > 0.78 ? (flick > 0.83 && flick < 0.95 ? 2 : 1) : 0;
      frame = hurt ? art.turns.length * 3 + turn : turn * 3 + tongue;
    } else frame = hurt ? art.turns.length * 6 + turn : turn * 6 + (Math.floor(this.t * 9) % 6);
    const head = path[0];
    this.put(image, pieces.head, frame, Math.round(head.x) + (snake ? 1 : 0), Math.round(head.y) + (snake ? 0 : -1), 1);
    this.end(ctx, OUTLINE);
  }

  /** Las cuatro patas del dragón (articuladas) y sus alas. */
  putLimbs(image, art, player, path, scroll) {
    const { pieces, legs } = art;
    const at = (s) => path[clamp(Math.round(s / STEP), 0, path.length - 1)];
    const stride = scroll / P / art.stride;
    const dead = !player.alive;
    const low = dead || this.long.duck > 0.5; // sin vida, tendido con las patas dobladas
    // El trote va en diagonal: delantera de este lado con trasera del otro
    const limbs = [['legFn', 9, 3, 0], ['legFf', 8, -3, 0.5], ['legHn', 31, 3, 0.5], ['legHf', 30, -3, 0]];
    for (const [name, s, z, offset] of limbs) {
      const p = at(s);
      const standing = p.grounded > 0.75;
      const anim = !standing ? 'air' : low ? 'duck' : 'run';
      const [first, count] = legs[anim];
      const k = standing ? (dead ? 0 : low ? stride * 2 : stride) + offset : this.t * 1.5 + offset + (name[3] === 'H' ? 0.3 : 0);
      const y = standing ? p.feet - (low ? 3.2 : art.legLift) : p.y + 1;
      this.put(image, pieces[name], first + clamp(Math.floor(frac(k) * count), 0, count - 1), Math.round(p.x), Math.round(y), z + Math.round(p.z * 0.4));
    }
    // Alas: plegadas en el suelo; en el aire, un aleteo completo con cada impulso y luego planea
    const root = at(11);
    let frame = art.flap + art.glide; // plegadas
    if (player.airborne && !dead) frame = player.flapTime < FLAP_SECONDS ? clamp(Math.floor((player.flapTime / FLAP_SECONDS) * art.flap), 0, art.flap - 1) : art.flap + (Math.floor(this.t * 6) % art.glide);
    this.put(image, pieces.wingF, frame, Math.round(root.x), Math.round(root.y - 2), -3);
    this.put(image, pieces.wingN, frame, Math.round(root.x), Math.round(root.y - 2), 3);
  }
}

/** Un camino suave (Catmull-Rom) por los puntos, con un punto cada step pixeles. */
function resample(points, step) {
  const dense = [];
  for (let i = 0; i < points.length - 1; i++) {
    const [a, b, c, d] = [points[Math.max(0, i - 1)], points[i], points[i + 1], points[Math.min(points.length - 1, i + 2)]];
    for (let n = 0; n < 10; n++) {
      const t = n / 10;
      const mix = (key) => 0.5 * (2 * b[key] + (c[key] - a[key]) * t + (2 * a[key] - 5 * b[key] + 4 * c[key] - d[key]) * t * t + (3 * b[key] - a[key] - 3 * c[key] + d[key]) * t ** 3);
      dense.push({ x: mix('x'), y: mix('y'), z: mix('z'), feet: lerp(b.feet, c.feet, t), grounded: lerp(b.grounded, c.grounded, t) });
    }
  }
  dense.push({ ...points[points.length - 1] });
  const out = [dense[0]];
  let left = step;
  for (let i = 1; i < dense.length; i++) {
    let a = dense[i - 1];
    const b = dense[i];
    let length = Math.hypot(b.x - a.x, b.y - a.y);
    while (length >= left) {
      const k = left / length;
      a = { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: lerp(a.z, b.z, k), feet: lerp(a.feet, b.feet, k), grounded: lerp(a.grounded, b.grounded, k) };
      out.push(a);
      length -= left;
      left = step;
    }
    left -= length;
  }
  return out;
}
