// El escenario de los mundos, con perspectiva: todo se mueve según qué tan lejos está (s: 0 el horizonte, 1
// el camino por donde se corre, más de 1 lo que pasa cerca de quien mira), a lo ancho con el scroll y a lo
// alto con la cámara. De atrás hacia adelante: cielo, astro, nubes, el suelo renglón por renglón
// (graphics/floors.js) o los bancos de nubes, tres cordilleras, los objetos, la gente y los autos, cada quien a su
// distancia, y al final la cara de la orilla donde se corre: lo que se juega es lo más cercano y lo más claro
// (los valores y la perspectiva aérea, en graphics/aerial.js).
//
// Las montañas y los objetos van en capas (sprite stacking): cada capa está a su propia distancia, así que al
// cruzar la pantalla se ven de un costado, de frente y del otro.
//
// Trabaja en pixeles del juego. Los datos: world/scenery.js; las hojas: graphics/worldArt.js.

import { CONFIG } from '../config.js';
import { VIEW } from '../core/view.js';
import { ASTRO, BANKS, DEPTHS, HORIZON, SCENERY } from '../world/scenery.js';
import { whenDecoded } from './assets.js';
import { CREST, EDGE, makeFace, makeFloor, makeSky, makeStorm, periodOf, rowOf, scaleOf } from './floors.js';
import { GRID, fine } from './grid.js';
import { hash } from './noise.js';
import { WORLD_ART } from './worldArt.js';

const P = CONFIG.pixel;
const W = CONFIG.width / P;
// El ojo enojado de la nube de tormenta (el otro, al revés)
const GLARE = ['bb.....', 'bbbb...', 'byybbb.', 'byrybbb', '.byyyb.', '..bbb..'];
const BUDGET = { calm: 2.5, urgent: 10 }; // milisegundos por cuadro para armar mundos: los que vienen y el de ahora
const DISTANCE = 170; // a qué distancia está quien mira de los objetos: más chica, más giran sus capas
const frac = (v) => v - Math.floor(v);
const rgb = (hex) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
const mixHex = (a, b, k) => rgb(a).map((v, i) => v + (rgb(b)[i] - v) * k);
const css = (c) => `rgb(${c.map(Math.round).join(', ')})`;
const mod = (v, n) => ((v % n) + n) % n;
const skyHeight = () => Math.ceil(HORIZON.y + VIEW.top / P + 6);

export class WorldPainter {
  constructor() {
    this.worlds = new Map(); // id → { image, ready, floor, sky }
    this.jobs = []; // lo que falta armar: { id, gen }
    this.shown = null; // el último mundo que se dibujó
    this.t = 0;
    this.last = 0;
  }

  /** El mundo id: la primera vez que se pide, baja su hoja y deja su suelo y su cielo por armar (work). */
  world(id) {
    if (!this.worlds.has(id)) {
      const entry = { image: null, ready: false, failed: !WORLD_ART[id], floor: null, face: null, storm: null, sky: null };
      this.worlds.set(id, entry);
      const art = WORLD_ART[id];
      if (art && typeof Image !== 'undefined') {
        const image = new Image();
        image.decoding = 'async';
        whenDecoded(image, () => this.jobs.push({ id, gen: this.build(id, entry, image) }));
        image.addEventListener('error', () => {
          entry.failed = true;
          console.warn(`[Chow Chow] No se pudo cargar la imagen ${art.src}.`);
        });
        image.src = art.src;
      }
    }
    return this.worlds.get(id);
  }

  /** Arma un mundo de a poco (cada yield, un renglón) y lo dibuja una vez aparte: así ya está en la tarjeta de video. */
  *build(id, entry, image) {
    const scenery = SCENERY[id];
    entry.sky = yield* makeSky(scenery, W, skyHeight());
    if (scenery.floor.kind !== 'clouds') {
      entry.floor = yield* makeFloor(scenery);
      entry.face = yield* makeFace(scenery);
    } else entry.storm = yield* makeStorm();
    entry.image = image;
    this.paint(this.buffer(), id, entry, { scroll: 0, cameraY: 0 });
    this.warm = true;
    entry.ready = true;
  }

  /** Otro cielo, al cambiar la medida de la vista (mientras, se estira el de antes). */
  *buildSky(id, entry) {
    entry.sky = yield* makeSky(SCENERY[id], W, skyHeight());
  }

  /** Unos milisegundos por cuadro para lo que falta armar. busy: a medio cambio de nivel no, salvo que urja. */
  work(current, busy) {
    const urgent = this.worlds.get(current).ready ? null : this.jobs.find((job) => job.id === current);
    const job = urgent ?? (busy ? null : this.jobs[0]);
    if (!job) return;
    const end = performance.now() + (urgent ? BUDGET.urgent : BUDGET.calm);
    while (performance.now() < end) {
      if (!job.gen.next().done) continue;
      this.jobs.splice(this.jobs.indexOf(job), 1);
      return;
    }
  }

  /** Un lienzo aparte, de la medida del canvas. */
  buffer() {
    const [w, h] = [W * GRID.fine, (VIEW.height / P) * GRID.fine];
    this.back ??= document.createElement('canvas');
    if (this.back.width !== w || this.back.height !== h) {
      this.back.width = w;
      this.back.height = h;
    }
    const brush = this.back.getContext('2d');
    brush.imageSmoothingEnabled = false;
    brush.setTransform(GRID.fine, 0, 0, GRID.fine, 0, 0);
    return brush;
  }

  /**
   * El fondo del nivel (y el del anterior, que se desvanece encima). Si el suyo aún no está, el último que se vio;
   * false si no hay ninguno.
   */
  draw(ctx, view) {
    const now = performance.now() / 1000;
    if (view.state !== 'paused') this.t += Math.min(0.05, Math.max(0, now - this.last));
    this.last = now;
    const fading = Boolean(view.previous) && view.previousAlpha > 0;
    const wanted = this.world(view.level.id);
    this.work(view.level.id, fading);
    if (this.warm) {
      ctx.drawImage(this.back, 0, 0, 1, 1, 0, 0, 1, 1); // obliga a subir a la tarjeta de video lo recién armado
      this.warm = false;
    }
    if (wanted.ready) this.shown = view.level.id;
    if (!this.shown || (wanted.failed && !wanted.ready)) return false;
    this.paint(ctx, this.shown, this.worlds.get(this.shown), view);
    const before = fading && view.previous.id !== this.shown ? this.world(view.previous.id) : null;
    if (before?.ready) {
      this.paint(this.buffer(), view.previous.id, before, view);
      ctx.globalAlpha = view.previousAlpha;
      ctx.drawImage(this.back, 0, 0, W, VIEW.height / P);
      ctx.globalAlpha = 1;
    }
    return true;
  }

  /** Lo que se ve de un mundo. */
  paint(ctx, id, world, { scroll, cameraY }) {
    const scenery = SCENERY[id];
    const floating = scenery.floor.kind === 'clouds';
    const height = VIEW.height / P;
    const eye = { x: scroll / P, cam: -cameraY / P, horizon: HORIZON.y + VIEW.top / P, height };
    this.eye = eye;
    this.ctx = ctx;
    this.art = WORLD_ART[id].pieces;
    this.image = world.image;

    // El cielo (se arma a la medida de la vista) y el astro, que no se mueve: ni al volar ni de un mundo a otro
    const tall = skyHeight();
    if (world.sky.height !== tall && !this.jobs.some((job) => job.id === id)) this.jobs.push({ id, gen: this.buildSky(id, world) });
    ctx.drawImage(world.sky, 0, 0, W, tall);
    this.sprite('astro', ASTRO.x, ASTRO.y + (VIEW.top / P) * 0.6);
    this.each({ ...DEPTHS.sky, salt: 91 }, (cx, i) => this.sprite(`cloud${mod(i, 3)}`, cx, eye.horizon - 62 + hash(i, 4, 91) * 34 + eye.cam * 0.03));

    // Los fuegos artificiales revientan en el cielo, detrás de las montañas
    if (scenery.air.kind === 'fireworks') this.fireworks(scenery.air.colors);

    if (floating) {
      // Debajo de las nubes, la hondura
      ctx.fillStyle = scenery.banks.far.low;
      ctx.fillRect(0, Math.round(eye.horizon), W, height);
    } else this.ground(world.floor);

    // Montañas, objetos, gente, autos y bancos de nubes, de lejos a cerca
    for (const layer of this.layers(id, scenery)) this.plane(layer, scenery, floating);
    if (floating) this.storm(world.storm, scenery);
    else this.face(world.face);
    this.drift(scenery, 0);
  }

  /** Una distancia: lo que hay en ella, a todo lo ancho. */
  plane(layer, scenery, floating) {
    const { s, every, tag, names, v = 0, salt, skip = 0, kind, row } = layer;
    const base = this.base(s);
    if (kind === 'mountain') {
      const variants = row === 2 ? 3 : 4;
      this.each({ s, every, salt }, (x, i) => {
        if (hash(i, 5, 11 + row) < skip) return;
        this.stack(`m${row}${mod(i * 3 + Math.floor(hash(i, 2, 11 + row) * 2), variants)}`, x, base + 3, 0.0006 + row * 0.0004);
      });
      if (!floating) this.mist(base - 6 + row * 2, s * 1.2, (0.5 + row * 0.14) * (scenery.gradient.mist ?? 0.22));
      return;
    }
    if (kind === 'bank') {
      const y = base + layer.drop;
      const { ctx, eye } = this;
      if (y - 40 > eye.height) return;
      ctx.fillStyle = layer.fill;
      ctx.fillRect(0, fine(y) - 1, W, eye.height - fine(y) + 2);
      this.each({ s, every, salt, drift: -this.t * 3 * s }, (x, i) => {
        this.stack(`${tag}-${mod(i * 2 + Math.floor(hash(i, 1, salt) * 2), 3)}`, x, y + 2 + hash(i, 3, salt) * 4 * s + Math.sin(this.t * 0.7 + i * 1.9 + row) * 1.2 * s, 1 / DISTANCE);
      });
      return;
    }
    if (!names.length) return;
    this.each({ s, every, salt, drift: v * this.t }, (x, i) => {
      const pick = names[mod(i, names.length)]; // en orden: nunca dos iguales juntos
      const name = `${tag}-${pick}`;
      const afloat = floating && pick !== 'carps';
      const lift = afloat ? (8 + hash(i, 3, salt) * 22) * s + Math.sin(this.t * 1.1 + i * 2.1) * 2 * s : 0;
      if (!floating) this.shadow(name, x, base, scenery.rock.ink);
      const frames = this.art[name]?.[9] ?? 1;
      const rate = tag.startsWith('people') ? (v ? 5 : 3.4) : 3;
      this.stack(name, x, base - lift, 1 / DISTANCE, { frame: frames > 1 ? mod(Math.floor(this.t * rate + i * 1.7), frames) : 0, flip: v < 0 });
    });
  }

  /** Lo que flota en el aire, por delante (pétalos, nieve...). */
  front(ctx, { level, scroll, cameraY }) {
    const world = this.worlds.get(level.id);
    if (!world?.ready) return;
    this.ctx = ctx;
    this.eye = { x: scroll / P, cam: -cameraY / P, horizon: HORIZON.y + VIEW.top / P, height: VIEW.height / P };
    this.drift(SCENERY[level.id], 1);
  }

  /**
   * La nube de tormenta que no se debe tocar: va justo a la velocidad del juego y sus crestas están donde se choca.
   * Un velo oscuro la separa de las de atrás; chisporrotea y mira feo, como las demás nubes de tormenta.
   */
  storm(canvas, scenery) {
    const { ctx, eye, t } = this;
    const y = fine(this.base(1)) - CREST;
    if (y >= eye.height) return;
    ctx.fillStyle = scenery.banks.near.low;
    for (let i = 0; i < 9; i++) {
      ctx.globalAlpha = 0.11;
      ctx.fillRect(0, y - 20 + i * 2.5, W, 30);
    }
    ctx.globalAlpha = 1;
    const left = -fine(mod(eye.x, canvas.width));
    for (let x = left; x < W; x += canvas.width) {
      ctx.drawImage(canvas, x, y);
      // Los ojos: parpadean de vez en cuando
      for (const [dx, beat] of [[52, 0], [150, 1.7], [214, 3.1]]) {
        if (mod(t + beat, 3.4) < 0.14) continue;
        for (const [eye, shift] of [[0, 0], [1, 9]]) {
          GLARE.forEach((row, r) => [...row].forEach((pixel, c) => {
            if (pixel === '.') return;
            ctx.fillStyle = { b: '#1b1226', y: '#ffe88a', r: '#d8203c' }[pixel];
            ctx.fillRect(x + dx + shift + (eye ? row.length - 1 - c : c), y + 10 + r, 1, 1);
          }));
        }
      }
      // Chispas que corren por las crestas
      for (let j = 0; j < 3; j++) {
        const clock = t * 1.6 + j * 0.37;
        const turn = Math.floor(clock);
        if (frac(clock) > 0.32) continue;
        let sx = x + Math.round(hash(turn, j, 8) * canvas.width);
        let sy = y + 6 + Math.round(hash(turn, j, 9) * 4);
        ctx.fillStyle = frac(clock * 12) > 0.5 ? '#fffbe0' : '#ffd84a';
        for (let k = 0; k < 7; k++) {
          ctx.fillRect(sx, sy, 2, 1);
          sx += 2;
          sy += hash(turn * 7 + k, j, 10) > 0.5 ? 1 : -1;
        }
      }
    }
  }

  /** La cara de la orilla donde se corre: va justo a la velocidad del juego. */
  face(canvas) {
    const { ctx, eye } = this;
    const y = fine(this.base(EDGE));
    if (y >= eye.height) return;
    for (let x = -fine(mod(eye.x, canvas.width)); x < W; x += canvas.width) ctx.drawImage(canvas, x, y);
  }

  /** Lo que hay en un mundo, de lejos a cerca: montañas, objetos, gente, autos y bancos de nubes. */
  layers(id, scenery) {
    this.sorted ??= new Map();
    if (!this.sorted.has(id)) {
      const list = (scenery.mountains ?? DEPTHS.mountains).map((range, row) => ({ ...range, kind: 'mountain', row, salt: 11 + row * 7 }));
      for (const place of ['land', 'back', 'mid', 'near']) list.push({ s: DEPTHS[place].s, every: scenery.every?.[place] ?? DEPTHS[place].every, tag: place, names: scenery.props[place], salt: place.length * 13 + place.charCodeAt(0) });
      scenery.people.forEach((layer, i) => list.push({ ...layer, tag: `people${i}`, salt: 31 + i * 5 }));
      scenery.traffic?.forEach((layer, i) => list.push({ ...layer, tag: `traffic${i}`, salt: 61 + i * 5 }));
      if (scenery.banks) {
        const { far, near } = scenery.banks;
        BANKS.forEach((bank, row) => list.push({ ...bank, kind: 'bank', row, tag: `bank${row}`, salt: 83 + row * 3, fill: css(mixHex(far.low, near.low, Math.min(1, bank.s))) }));
      }
      this.sorted.set(id, list.sort((a, b) => a.s - b.s));
    }
    return this.sorted.get(id);
  }

  // --- Perspectiva -------------------------------------------------------------------

  /** A qué altura de la pantalla está el suelo a una distancia. */
  base(s) {
    return this.eye.horizon + s * (HORIZON.lane + this.eye.cam);
  }

  /** Lo que hay a una distancia: cada tanto (every), en un lugar al azar que siempre es el mismo. */
  each({ s, every, salt, drift = 0 }, draw) {
    const offset = this.eye.x * s - drift;
    const margin = 150;
    const last = Math.floor((offset + W + margin) / every);
    for (let i = Math.floor((offset - margin) / every); i <= last; i++) draw(i * every + (hash(i, 1, salt) - 0.5) * every * 0.55 - offset, i);
  }

  /** Una pieza plana, por su centro. */
  sprite(name, x, y) {
    const piece = this.art[name];
    if (!piece) return;
    const [sx, sy, w, h, ax, ay] = piece;
    this.ctx.drawImage(this.image, sx, sy, w, h, fine(x) - ax, fine(y) - ay, w, h);
  }

  /** Una pieza en capas, de pie en (x, y): cada capa, corrida según qué tan cerca está. */
  stack(name, x, y, turn, { frame = 0, flip = false } = {}) {
    const piece = this.art[name];
    if (!piece) return;
    const [left, sy, w, h, ax, ay, n, z0, step] = piece;
    if (x + w < -20 || x - w > W + 20 || y - ay > this.eye.height) return;
    const sx = left + frame * w;
    const side = (x - HORIZON.center) * turn * (flip ? -1 : 1);
    const tilt = (y - this.eye.horizon) * turn * 0.5;
    if (flip) { // camina hacia el otro lado
      this.ctx.save();
      this.ctx.translate(fine(x), 0);
      this.ctx.scale(-1, 1);
      x = 0;
    }
    for (let layer = 0; layer < n; layer++) {
      const z = z0 + layer * step * (z0 || step > 1 ? 1 : 8); // las montañas son más gruesas
      this.ctx.drawImage(this.image, sx, sy + layer * h, w, h, fine(x + side * z) - ax, fine(y + tilt * z) - ay, w, h);
    }
    if (flip) this.ctx.restore();
  }

  /** La sombra de un objeto en el suelo, hacia la derecha (la luz viene de la izquierda). */
  shadow(name, x, y, ink) {
    const piece = this.art[name];
    if (!piece || y > this.eye.height + 4) return;
    const half = Math.round(piece[2] * 0.36);
    const { ctx } = this;
    ctx.globalAlpha = 0.34;
    ctx.fillStyle = ink;
    ctx.fillRect(fine(x) - half, fine(y) - 1, half * 2 + 4, 2);
    ctx.fillRect(fine(x) - half + 4, fine(y) + 1, half * 2 + 4, 1);
    ctx.globalAlpha = 1;
  }

  /** El suelo: cada renglón de la pantalla, con la fila de su distancia y a su velocidad. */
  ground(floor) {
    const { ctx, eye } = this;
    const depth = HORIZON.lane + eye.cam;
    const first = Math.max(0, Math.round(eye.horizon) + 2);
    const last = Math.min(eye.height, Math.ceil(fine(this.base(EDGE))));
    for (let y = first; y < last; y++) {
      const row = rowOf((y + 0.5 - eye.horizon) / depth);
      const period = periodOf(row);
      const at = fine(mod(eye.x * scaleOf(row) - HORIZON.center, period));
      const from = Math.floor(at);
      ctx.drawImage(floor, from, row, W + 1, 1, from - at, y, W + 1, 1);
    }
  }

  /** Una franja de niebla que corre despacio. */
  mist(y, s, alpha) {
    const [sx, sy, w, h] = this.art.mist;
    const { ctx } = this;
    ctx.globalAlpha = alpha;
    for (let x = -fine(mod(this.eye.x * s + this.t * 5, w)); x < W; x += w) ctx.drawImage(this.image, sx, sy, w, h, x, fine(y) - 13, w, h);
    ctx.globalAlpha = 1;
  }

  // --- Lo que flota en el aire ----------------------------------------------------------

  /** Nieve, pétalos, luciérnagas...: side 0, detrás de quien juega; 1, delante. */
  drift(scenery, side) {
    const { ctx, eye, t } = this;
    const { kind, colors, n } = scenery.air;
    if (kind === 'fireworks') return; // van en el cielo (paint)
    const fall = { snow: 12, petal: 15, leaf: 18, feather: 9, rain: 150, dust: 3, firefly: 0, spark: -5 }[kind] ?? 0;
    const wind = { snow: 6, petal: 16, leaf: 22, feather: 12, rain: 26, dust: 70, firefly: 4, spark: 5 }[kind] ?? 0;
    for (let i = side; i < n; i += 2) {
      const near = side ? 0.9 + hash(i, 1, 3) * 0.6 : 0.25 + hash(i, 1, 3) * 0.5;
      const sway = kind === 'rain' || kind === 'dust' ? 0 : Math.sin(t * (1 + hash(i, 2, 3)) + i * 1.7) * 7;
      const x = mod(hash(i, 3, 3) * 440 - eye.x * near - t * wind * near + sway, 440) - 20;
      const y = mod(hash(i, 4, 3) * 260 + t * fall * (0.6 + near * 0.5) + eye.cam * near + (kind === 'firefly' ? Math.cos(t * 0.8 + i) * 8 : 0), eye.height + 24) - 12;
      const px = fine(x);
      const py = fine(y);
      const size = side ? 2 : 1;
      ctx.fillStyle = colors[i % colors.length];
      if (kind === 'rain') {
        ctx.globalAlpha = 0.28 + near * 0.2;
        ctx.fillRect(px, py, 1, 3 + size * 2);
      } else if (kind === 'firefly' || kind === 'spark') {
        const glow = Math.max(0, Math.sin(t * 2.4 + i * 2.3));
        ctx.globalAlpha = glow * 0.3;
        ctx.fillRect(px - 1, py - 1, size + 2, size + 2);
        ctx.globalAlpha = glow;
        ctx.fillRect(px, py, size, size);
      } else if (kind === 'dust') {
        ctx.globalAlpha = 0.25 + 0.25 * hash(i, 5, 3);
        ctx.fillRect(px, py, 2 + size * 2, 1);
      } else {
        // Pétalos, hojas, plumas y nieve: giran al caer
        ctx.globalAlpha = side ? 0.85 : 0.6;
        const turn = frac(t * (0.6 + hash(i, 6, 3)) + i * 0.3);
        const wide = kind === 'snow' ? 1 : turn < 0.5 ? 2 : 1;
        ctx.fillRect(px, py, wide * (kind === 'feather' ? size + 1 : size), kind === 'snow' ? size : turn < 0.5 ? 1 : size);
      }
    }
    ctx.globalAlpha = 1;
  }

  /** Fuegos artificiales, lejos: tenues y detrás de las montañas, para que no se confundan con nada. */
  fireworks(colors) {
    const { ctx, eye, t } = this;
    for (let b = 0; b < 4; b++) {
      const life = 2.6;
      const clock = t / life + b * 0.27;
      const turn = Math.floor(clock);
      const k = frac(clock);
      const x = 40 + hash(turn, b, 1) * (W - 80);
      const y = eye.horizon - 34 - hash(turn, b, 2) * 42;
      const color = colors[Math.floor(hash(turn, b, 3) * colors.length)];
      ctx.fillStyle = color;
      if (k < 0.25) {
        ctx.globalAlpha = 0.45;
        ctx.fillRect(Math.round(x), Math.round(eye.horizon - (eye.horizon - y) * (k / 0.25)), 1, 3);
        continue;
      }
      const e = (k - 0.25) / 0.75;
      ctx.globalAlpha = 0.6 * Math.max(0, 1 - e * e);
      const n = 18;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        for (const ring of [1, 0.62]) {
          const r = 24 * ring * (1 - (1 - e) ** 2.4);
          ctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r + e * e * 9), 1, 1);
        }
      }
    }
    ctx.globalAlpha = 1;
  }
}
