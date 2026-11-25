// El suelo de cada mundo, con perspectiva: una hoja con una fila por cada distancia (ver ROWS), ya a su
// escala. worldPainter.js dibuja cada renglón de la pantalla con su fila, corrida a su velocidad: lo de
// cerca pasa más rápido, y las líneas se juntan en el horizonte. Se arma al cargar el mundo (no pesa).

import { aerial, tone, VALUES, viewOf } from './aerial.js';
import { fbm, hash, tiled } from './noise.js';

export const ROWS = 128;
export const EDGE = 1.04; // dónde se acaba el suelo: la orilla donde se corre
const NEAREST = 2.3; // lo más cerca (s) y lo más lejos
const FARTHEST = 0.07;
const PERIOD = 240; // cada cuántos pixeles se repite el dibujo (a escala 1)
const VIEW = 400;

const rgb = (hex) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
const frac = (v) => v - Math.floor(v);

/** La escala (s) de una fila, y la fila de una escala. */
export const scaleOf = (row) => FARTHEST * (NEAREST / FARTHEST) ** (row / (ROWS - 1));
export const rowOf = (s) => clamp(Math.round((Math.log(s / FARTHEST) / Math.log(NEAREST / FARTHEST)) * (ROWS - 1)), 0, ROWS - 1);
/** Cada cuántos pixeles se repite una fila. */
export const periodOf = (row) => Math.max(8, Math.round(PERIOD * scaleOf(row)));

/**
 * El dibujo de cada suelo: (u, q, c) → color. u: a lo largo del camino (se repite cada PERIOD); q: qué tan
 * lejos (40: el camino); c: sus colores.
 */
const KINDS = {
  // Losas de piedra
  stone(u, q, c) {
    const row = Math.floor(q / 12);
    const x = u + (row % 2) * 12;
    const cell = Math.floor((((x % PERIOD) + PERIOD) % PERIOD) / 24);
    const [fx, fy] = [frac(x / 24), frac(q / 12)];
    const tone = hash(cell, row, 5);
    let col = mix(c.base, tone > 0.5 ? c.light : c.dark, Math.abs(tone - 0.5) * 0.8);
    if (fx < 0.05 || fy < 0.08) col = c.dark;
    else if (fx < 0.1 || fy < 0.16) col = mix(col, c.light, 0.4);
    if (tone > 0.93) col = mix(col, c.accent, 0.3); // charcos
    return col;
  },
  // Arrozales: parcelas con agua que refleja el cielo
  paddy(u, q, c) {
    const bend = tiled(u / 30, q / 40, 8, 4) * 10;
    const [cx, cy] = [frac(u / 60), frac((q + bend) / 22)];
    const cell = hash(Math.floor((((u % PERIOD) + PERIOD) % PERIOD) / 60), Math.floor((q + bend) / 22), 8);
    if (cx < 0.07 || cy < 0.16) return mix(c.base, cx < 0.035 || cy < 0.08 ? c.light : c.dark, 0.45);
    const water = mix(c.accent, c.dark, 0.25 + cell * 0.35);
    const glint = tiled(u / 12, q / 2.2, 20, 2);
    if (cell > 0.38 && tiled(u / 3, q / 3, 80, 9) > 0.66) return mix(c.light, c.base, 0.4); // brotes
    return glint > 0.74 ? mix(water, [255, 240, 210], 0.35) : water;
  },
  // Tierra con hojas caídas
  leaves(u, q, c) {
    const n = tiled(u / 14, q / 9, 17, 3) * 0.6 + tiled(u / 5, q / 4, 48, 6) * 0.4;
    const col = mix(c.dark, n > 0.5 ? c.light : c.base, n);
    const leaf = hash(Math.floor((((u % PERIOD) + PERIOD) % PERIOD) / 3), Math.floor(q / 2), 12);
    return leaf > 0.955 ? mix(c.accent, c.light, (leaf - 0.955) * 14) : col;
  },
  // Arena peinada en anillos
  rings(u, q, c) {
    const [x, y] = [frac(u / 120) * 120 - 60, frac(q / 70) * 70 - 35];
    const d = Math.hypot(x, y * 1.3);
    const wave = d < 30 ? Math.sin(d * 0.85) : Math.sin(q * 0.75 + tiled(u / 40, q / 30, 6, 2) * 2);
    if (d < 4.5) return mix(c.dark, c.accent, 0.25);
    return wave > 0.35 ? mix(c.base, c.light, 0.6) : wave < -0.5 ? mix(c.base, c.dark, 0.5) : c.base;
  },
  // Un mar de nubes
  clouds(u, q, c) {
    const n = tiled(u / 26, q / 15, 10, 3) * 0.6 + tiled(u / 11, q / 7, 22, 5) * 0.3 + tiled(u / 5, q / 3, 48, 8) * 0.1;
    const up = tiled(u / 26, (q - 4) / 15, 10, 3) * 0.6 + tiled(u / 11, (q - 4) / 7, 22, 5) * 0.4;
    const slope = n - up;
    if (n > 0.62) return mix(c.base, slope < -0.02 ? mix(c.light, c.accent, 0.6) : c.light, 0.7);
    if (n > 0.47) return mix(c.base, c.light, 0.35);
    return n > 0.34 ? c.base : mix(c.base, c.dark, 0.42);
  },
  // Un lago, con ondas y hojas de loto
  lake(u, q, c) {
    const ripple = Math.sin(q * 1.25 + tiled(u / 24, q / 14, 10, 3) * 7);
    let col = mix(c.base, c.dark, 0.3 + 0.3 * tiled(u / 40, q / 30, 6, 7));
    if (ripple > 0.78) col = mix(col, c.light, 0.55);
    const [cx, cy] = [Math.floor((((u % PERIOD) + PERIOD) % PERIOD) / 20), Math.floor(q / 12)];
    if (hash(cx, cy, 21) > 0.66) {
      const [px, py] = [frac(u / 20) * 20 - 10, frac(q / 12) * 12 - 6];
      const d = Math.hypot(px, py * 1.5);
      if (d < 6.5) col = d > 5 ? mix(c.light, c.base, 0.3) : mix(c.light, c.dark, 0.35);
      if (d < 1.8 && hash(cx, cy, 33) > 0.6) col = c.accent;
    }
    return col;
  },
  // Dunas con su oleaje de arena
  sand(u, q, c) {
    const wave = Math.sin(q * 0.8 + (u / PERIOD) * Math.PI * 8 + tiled(u / 24, q / 20, 10, 3) * 6);
    const big = tiled(u / 60, q / 34, 4, 9);
    let col = mix(c.base, big > 0.5 ? c.light : c.dark, Math.abs(big - 0.5) * 0.9);
    if (wave > 0.55) col = mix(col, c.accent, 0.35);
    else if (wave < -0.65) col = mix(col, c.dark, 0.45);
    return col;
  },
  // Pradera con flores
  grass(u, q, c) {
    const n = tiled(u / 18, q / 11, 13, 3) * 0.65 + tiled(u / 4, q / 5, 60, 6) * 0.35;
    const col = n > 0.6 ? mix(c.base, c.light, (n - 0.6) * 2.4) : mix(c.base, c.dark, (0.6 - n) * 1.3);
    const dot = hash(Math.floor((((u % PERIOD) + PERIOD) % PERIOD) / 3), Math.floor(q / 2.2), 12);
    return dot > 0.972 ? (dot > 0.986 ? [255, 250, 235] : c.accent) : col;
  },
  // Piedras sueltas con musgo entre ellas
  moss(u, q, c) {
    let [near, second, id] = [99, 99, 0];
    const [gx, gy] = [Math.floor(u / 15), Math.floor(q / 11)];
    for (let j = -1; j <= 1; j++) {
      for (let i = -1; i <= 1; i++) {
        const wx = (((gx + i) % 16) + 16) % 16;
        const px = (gx + i + 0.2 + 0.6 * hash(wx, gy + j, 3)) * 15;
        const py = (gy + j + 0.2 + 0.6 * hash(wx, gy + j, 4)) * 11;
        const d = Math.hypot(u - px, (q - py) * 1.3);
        if (d < near) [second, near, id] = [near, d, hash(wx, gy + j, 5)];
        else if (d < second) second = d;
      }
    }
    if (second - near < 2.2) return mix(c.accent, c.dark, 0.35 + 0.4 * tiled(u / 4, q / 4, 60, 2));
    return mix(c.base, id > 0.5 ? c.light : c.dark, Math.abs(id - 0.5) * 0.9 + (near < 2 ? 0.1 : 0));
  },
  // Una calle mojada, de atrás hacia adelante: banqueta, asfalto con su línea amarilla, banqueta
  street(u, q, c) {
    const n = tiled(u / 6, q / 4, 40, 5);
    const tiles = (w, h) => (frac(u / w) < 0.07 || frac(q / h) < 0.1 ? mix(c.light, c.dark, 0.5) : mix(c.light, c.base, 0.35 + n * 0.3));
    if (q < 47) return frac(u / 30) < 0.04 ? c.dark : mix(c.base, c.dark, 0.25 + n * 0.5); // la calle de enfrente
    if (q < 60) return tiles(13, 6.5);
    if (q < 62) return mix(c.light, [255, 255, 255], 0.2); // el filo de la banqueta
    if (q < 88) {
      let col = mix(c.base, c.dark, 0.2 + n * 0.55);
      if ((q > 73 && q < 74.4) || (q > 75.4 && q < 76.8)) col = mix(c.accent, c.base, 0.35);
      // Los reflejos del neón en el agua
      const cell = Math.floor((((u % PERIOD) + PERIOD) % PERIOD) / 20);
      const wet = tiled(u / 10, q / 30, 24, 9);
      if (wet > 0.56) col = mix(col, [[255, 120, 170], [110, 220, 230], [255, 200, 120]][Math.floor(hash(cell, 1, 6) * 3)], (wet - 0.56) * 0.9);
      return col;
    }
    if (q < 91) return mix(c.light, [255, 255, 255], 0.1);
    if (q < 120) return tiles(20, 12);
    return mix(c.base, c.dark, 0.4);
  },
  // Plaza de fiesta: losetas en rombo con filos dorados
  plaza(u, q, c) {
    const [a, b] = [frac((u + q * 1.5) / 24), frac((u - q * 1.5) / 24)];
    if (a < 0.06 || b < 0.06) return mix(c.base, mix(c.accent, c.dark, 0.45), clamp(60 / q - 0.35) * 0.5);
    const id = hash(Math.floor((u + q * 1.5) / 24) % 10, Math.floor((u - q * 1.5) / 24) % 10, 3);
    return mix(c.base, id > 0.5 ? c.light : c.dark, Math.abs(id - 0.5) * 0.8);
  },
};

/** El camino por donde se corre. */
const LANES = {
  lake: (u, q, lane, dark, light) => (frac(u / 8) < 0.1 ? dark : frac(u / 8) < 0.22 ? mix(lane, light, 0.35) : mix(lane, dark, tiled(u / 2, q / 5, 120, 4) * 0.35)), // tablones
  paddy: (u, q, lane, dark, light) => mix(lane, tiled(u / 7, q / 4, 34, 2) > 0.55 ? light : dark, 0.24),
  street: (u, q, lane, dark, light) => (frac(u / 20) < 0.05 || frac(q / 6) < 0.08 ? mix(lane, dark, 0.4) : mix(lane, tiled(u / 5, q / 3, 48, 4) > 0.5 ? light : dark, 0.16)), // una banqueta de losas
  plaza: (u, q, lane, dark) => { // una alfombra roja con sus grecas doradas
    const edge = q > 43.6 || q < 35.8;
    if (edge) return Math.abs(frac(u / 6) - 0.5) < 0.25 ? mix(lane, [214, 164, 62], 0.45) : mix(lane, dark, 0.3);
    return mix(lane, dark, tiled(u / 3, q / 3, 80, 4) * 0.3);
  },
};
const PATH = (u, q, lane, dark, light) => {
  const n = tiled(u / 9, q / 4, 27, 3) * 0.6 + tiled(u / 3, q / 2, 80, 5) * 0.4;
  const pebble = hash(Math.floor((((u % PERIOD) + PERIOD) % PERIOD) / 2), Math.floor(q), 14);
  if (pebble > 0.965) return mix(lane, light, 0.6);
  return n > 0.55 ? mix(lane, light, (n - 0.55) * 1.2) : mix(lane, dark, (0.55 - n) * 0.8);
};

/** La hoja de un suelo: un canvas con una fila por distancia. */
export function makeFloor(scenery) {
  const { kind, ...hex } = scenery.floor;
  const c = Object.fromEntries(Object.entries(hex).map(([name, value]) => [name, rgb(value)]));
  const [ink, lane] = [rgb(scenery.rock.ink), rgb(scenery.lane)];
  const view = viewOf(scenery);
  const air = view.base;
  const paint = KINDS[kind];
  const track = LANES[kind] ?? PATH;
  const width = VIEW + periodOf(ROWS - 1) + 2;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = ROWS;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(width, ROWS);
  for (let row = 0; row < ROWS; row++) {
    const s = scaleOf(row);
    const q = 40 / s;
    const period = periodOf(row);
    const k = PERIOD / period; // pixeles del dibujo por cada pixel de la fila
    const far = s < 0.84 ? view.k(s) + (0.95 - view.k(0)) * clamp((0.3 - s) / 0.22) ** 1.4 : 0; // en el horizonte, casi puro aire
    const line = new Float32Array(period * 3);
    for (let x = 0; x < period; x++) {
      const u = x * k;
      // Lo lejano se promedia un poco, para que no hierva
      let col = paint(u, q, c);
      if (s < 0.5) {
        const a = paint(u + k * 0.5, q, c);
        const b = paint(u, q + 0.8 / s, c);
        col = [0, 1, 2].map((i) => (col[i] + a[i] + b[i]) / 3);
      }
      // El camino, que llega hasta la orilla (EDGE); atrás, una sombra lo separa del fondo
      const onLane = s > 0.86;
      if (onLane) col = track(u, q, lane, c.dark, c.light);
      else if (s > 0.8) col = mix(col, ink, 0.45);
      const brush = 0.92 + 0.16 * tiled(u / 6, q / 5, 40, 31);
      col = tone(aerial([col[0] * brush, col[1] * brush, col[2] * brush], air, Math.min(0.95, far)), onLane ? (s > EDGE - 0.035 ? VALUES.edge : VALUES.lane) : VALUES.back, view.dusk);
      if (onLane && s > EDGE - 0.035) col = mix(col, tone(rgb(scenery.rock.rim), VALUES.edge), 0.45); // el filo de la orilla
      line.set(col, x * 3);
    }
    for (let x = 0; x < width; x++) {
      const from = (x % period) * 3;
      const to = (row * width + x) * 4;
      img.data[to] = line[from];
      img.data[to + 1] = line[from + 1];
      img.data[to + 2] = line[from + 2];
      img.data[to + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/**
 * El frente: la cara de la orilla donde se corre, que se ve de lado y va justo a la velocidad del juego. Nada va
 * delante de ella: los animales, los obstáculos y lo que se recoge son lo más cercano de la pantalla.
 */
const FACES = {
  // Piedra en hiladas
  blocks(x, y, c) {
    const row = Math.floor(y / 8);
    const u = (x + (row % 2) * 10) % 20;
    if (y % 8 < 1 || u < 1) return c.dark;
    const n = hash(Math.floor(((x + (row % 2) * 10) % 240) / 20), row, 4);
    return mix(mix(c.base, n > 0.5 ? c.light : c.dark, Math.abs(n - 0.5) * 0.7), c.light, y % 8 < 2 || u < 2 ? 0.25 : 0);
  },
  // Tierra por estratos, con su fleco arriba
  soil(x, y, c) {
    const wave = tiled(x / 12, 1, 20, 3) * 5;
    if (y < 2 + wave * 0.5) return mix(c.light, c.accent, 0.2);
    const band = (y + tiled(x / 30, 2, 8, 5) * 6) % 9;
    const n = tiled(x / 5, y / 4, 48, 7);
    const col = mix(c.base, c.dark, band < 1.4 ? 0.75 : 0.25 + n * 0.4);
    return hash(Math.floor(x / 3), Math.floor(y / 3), 9) > 0.94 ? mix(col, c.light, 0.45) : col;
  },
  // Un muelle: la orilla de los tablones, los pilotes y el agua
  pier(x, y, c) {
    if (y < 4) return x % 12 < 1 ? c.dark : mix(c.accent, c.light, 0.15);
    const post = x % 60;
    if (post < 7) return mix(c.accent, c.dark, post < 2 ? 0.1 : post > 5 ? 0.7 : 0.4);
    const ripple = Math.sin(y * 1.1 + tiled(x / 20, y / 12, 12, 3) * 7);
    return mix(c.dark, c.light, ripple > 0.7 ? 0.45 : 0.08);
  },
  // La banqueta y la calle de enfrente
  curb(x, y, c) {
    if (y < 5) return x % 30 < 1 ? c.dark : mix(c.light, c.base, y / 8);
    const n = tiled(x / 6, y / 4, 40, 5);
    return mix(c.base, c.dark, 0.45 + n * 0.4);
  },
  // Una tarima de laca con sus grecas
  lacquer(x, y, c) {
    if (y < 2 || (y > 10 && y < 12)) return c.accent;
    const [u, v] = [x % 12, y - 3];
    const key = v >= 0 && v < 7 && ((v === 0 && u < 9) || (u === 8 && v < 6) || (v === 5 && u > 2 && u < 9) || (u === 3 && v > 2 && v < 6) || (v === 3 && u > 2 && u < 6));
    if (y <= 10) return key ? mix(c.accent, c.light, 0.2) : c.base;
    return mix(c.base, c.dark, 0.4 + 0.3 * tiled(x / 8, y / 8, 30, 3));
  },
};
const FACE_OF = { stone: 'blocks', rings: 'blocks', paddy: 'soil', leaves: 'soil', sand: 'soil', grass: 'soil', moss: 'soil', lake: 'pier', street: 'curb', plaza: 'lacquer' };

/** La cara de la orilla, que se repite a lo ancho. */
export function makeFace(scenery) {
  const { kind, ...hex } = scenery.floor;
  const c = Object.fromEntries(Object.entries(hex).map(([name, value]) => [name, rgb(value)]));
  if (kind === 'lake') c.accent = rgb(scenery.lane);
  const { dusk } = viewOf(scenery);
  const [ink, rim] = [rgb(scenery.rock.ink), tone(rgb(scenery.rock.rim), VALUES.edge, dusk)];
  const [w, h] = [PERIOD, 48];
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let col = FACES[FACE_OF[kind] ?? 'soil'](x, y, c);
      const brush = 0.88 + 0.24 * tiled(x / 5, y / 6, 48, 13);
      col = tone(mix([col[0] * brush, col[1] * brush, col[2] * brush], ink, clamp(0.12 + y / 34, 0, 0.8)), 0.26, dusk);
      if (y < 1) col = rim;
      img.data.set([col[0], col[1], col[2], 255], (y * w + x) * 4);
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/**
 * Sin suelo: la nube de tormenta que no se debe tocar. Va en el plano del juego, así que es clara y lleva contorno
 * oscuro, con los colores de las nubes de tormenta (la misma regla: violeta, golpea); sus crestas están justo donde se
 * choca con ella (y = CREST). Se repite a lo ancho.
 */
export const CREST = 3;
export function makeStorm() {
  const [w, h] = [PERIOD, 64];
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(w, h);
  const ramp = ['#2c2258', '#453a8c', '#6258b8', '#8a82e2', '#b4aef6', '#e2dfff'].map(rgb);
  const wash = (t) => ramp[Math.max(0, Math.min(ramp.length - 1, Math.round(t * (ramp.length - 1))))];
  const set = (x, y, c, a = 255) => img.data.set([c[0], c[1], c[2], a], (y * w + (((x % w) + w) % w)) * 4);
  // Debajo de las crestas, la panza de la nube, cada vez más oscura
  for (let y = CREST + 9; y < h; y++) for (let x = 0; x < w; x++) set(x, y, wash(clamp(0.46 - (y - CREST - 9) / 34 + (tiled(x / 16, y / 9, 15, 3) - 0.5) * 0.3)));
  // Dos filas de bolas: las de atrás, más oscuras
  for (const [n, depth] of [[12, 0], [12, 1]]) {
    for (let i = 0; i < n; i++) {
      const r = 10.5 + hash(i, 3, 40 + depth) * 4.5;
      const cx = (i + (depth ? 0.5 : 0)) * (w / n) + (hash(i, 1, 40 + depth) - 0.5) * 5;
      const cy = CREST + r * 0.82 + (depth ? 4 : 0) + hash(i, 2, 40 + depth) * 1.5;
      const turn = hash(i, 4, 40 + depth);
      for (let y = Math.floor(cy - r); y < cy + r * 0.7; y++) {
        for (let x = Math.floor(cx - r * 1.2); x <= cx + r * 1.2; x++) {
          const [u, v] = [(x + 0.5 - cx) / (r * 1.15), (y + 0.5 - cy) / (r * 0.82)];
          const d = Math.hypot(u, v);
          if (d > 1 || y < 0) continue;
          let t = 0.62 - v * 0.42 - u * 0.12 - (depth ? 0 : 0.2);
          if (d > 0.9 && v < 0.2) t = depth ? 1 : 0.72; // el filo de luz
          const f = (((Math.atan2(v, u) / (Math.PI * 2) + turn + d * 1.5) % 1) + 1) % 1;
          if (depth && d > 0.2 && d < 0.74 && f < 0.14) t -= 0.3; // el rizo
          if (v > 0.35) t -= (v - 0.35) * 0.7;
          set(x, y, wash(clamp(t)));
        }
      }
    }
  }
  // El contorno
  const solid = (x, y) => y >= 0 && img.data[(y * w + (((x % w) + w) % w)) * 4 + 3] === 255;
  const edge = [];
  for (let y = 0; y < CREST + 14; y++) for (let x = 0; x < w; x++) if (!solid(x, y) && (solid(x, y + 1) || solid(x - 1, y) || solid(x + 1, y))) edge.push([x, y]);
  for (const [x, y] of edge) set(x, y, rgb('#1b1226'));
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/** El cielo, pintado a brochazos, de arriba al horizonte (w × h). */
export function makeSky(scenery, w, h) {
  const [top, mid, low] = scenery.sky.map(rgb);
  const glow = rgb(scenery.glow);
  const view = viewOf(scenery);
  const air = view.base;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const brush = fbm(x * 0.011 + y * 0.004, y * 0.055, 3, 3) - 0.5;
      const t = clamp(y / h + brush * 0.13);
      const step = Math.round(t * 32) / 32;
      let c = step < 0.55 ? mix(top, mid, step / 0.55) : mix(mid, low, (step - 0.55) / 0.45);
      c = mix(c, glow, clamp((step - 0.7) / 0.3) ** 2 * 0.4);
      // El horizonte brilla: las montañas se recortan contra él
      c = tone(mix(c, air, clamp((step - 0.45) / 0.55) ** 1.5 * 0.5), VALUES.sky + (VALUES.glow - VALUES.sky) * clamp((step - 0.35) / 0.5), view.dusk);
      // Vetas de nube, delgadas
      const streak = fbm(x * 0.02, y * 0.16, 11, 3);
      if (streak > 0.6 && y > h * 0.25) c = mix(c, tone(air, VALUES.sky, view.dusk), (streak - 0.6) * 0.7 * (y / h));
      const i = (y * w + x) * 4;
      img.data[i] = c[0];
      img.data[i + 1] = c[1];
      img.data[i + 2] = c[2];
      img.data[i + 3] = 255;
    }
  }
  for (let n = 0; n < scenery.stars; n++) {
    const [x, y] = [Math.floor(hash(n, 1, 5) * w), Math.floor(hash(n, 2, 5) ** 1.4 * h * 0.7)];
    const i = (y * w + x) * 4;
    const b = 0.45 + 0.55 * hash(n, 3, 5);
    for (let k = 0; k < 3; k++) img.data[i + k] += (255 - img.data[i + k]) * b;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}
