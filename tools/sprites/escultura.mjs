// Pinta un Model (modelo3d.mjs) como una ilustración: la luna arriba a la izquierda, sombras hondas, filo de luz, pelo a
// pinceladas, oro gastado... Con esto se hacen los jefes (jefesModelos.mjs) al estilo del dibujo de la Rata. Cada pieza
// lleva su material (mat): fur, wool, skin, gold, cloth, horn, bead, scale, feather.
//
// Da una figura reducida, como reduce() de pixelar.mjs, y además, de cada pixel, qué tan al frente está (z) y todo lo que hay
// detrás: sus trozos (chunks), de adelante hacia atrás, para rebanarla en capas de verdad.

import { D, distance, Model, rgb } from './modelo3d.mjs';
import { fbm, noise } from './ruido.mjs';

const SKIN = 2.2; // hasta dónde se funden las piezas de un grupo
const unit = (v) => {
  const n = Math.hypot(...v);
  return v.map((c) => c / n);
};
const KEY = unit([-0.5, 0.72, 0.5]); // la luna
const RIM = unit([-0.62, 0.74, -0.25]); // su filo, desde atrás
const WARM = unit([-0.7, -0.45, 0.55]); // la luz cálida de abajo
const MOON = [170, 178, 255];
const EMBER = [255, 168, 84];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

// Cuánto brilla cada material, cuánto sobresale su pelo (fur) y cuánta textura lleva
const MATERIALS = {
  fur: { spec: 0.06, fur: 0.8, grain: 0.22 },
  wool: { spec: 0.03, fur: 1.5, grain: 0.24, curl: true },
  skin: { spec: 0.16, fur: 0, grain: 0.16 },
  smooth: { spec: 0.2, fur: 0, grain: 0.03 },
  gold: { spec: 0.9, fur: 0, grain: 0.24, shine: 10 },
  cloth: { spec: 0.1, fur: 0.25, grain: 0.18 },
  horn: { spec: 0.35, fur: 0, grain: 0.18 },
  bead: { spec: 0.3, fur: 0, grain: 0.18 },
  scale: { spec: 0.3, fur: 0, grain: 0.1 },
  feather: { spec: 0.12, fur: 0.45, grain: 0.22 },
};

/** Un Model cuyas piezas llevan material. */
export class Sculpture extends Model {
  tag(o) {
    this.prims[this.prims.length - 1].mat = o?.mat ?? 'fur';
    return this;
  }

  /** Lo que agregue draw, k veces más grande desde el punto from, girado yaw hacia quien mira y corrido move (las caras). */
  within({ k = 1, from = [0, 0, 0], move = [0, 0, 0], yaw = 0 }, draw) {
    const first = this.prims.length;
    draw();
    const [cos, sin] = [Math.cos(yaw), Math.sin(yaw)];
    const to = (v) => {
      const [x, y, z] = v.map((c, i) => (c - from[i]) * k);
      return [from[0] + x * cos + z * sin + move[0], from[1] + y + move[1], from[2] - x * sin + z * cos + move[2]];
    };
    const back = (v) => {
      const [x, y, z] = v.map((c, i) => c - move[i] - from[i]);
      return [from[0] + (x * cos - z * sin) / k, from[1] + y / k, from[2] + (x * sin + z * cos) / k];
    };
    for (const p of this.prims.slice(first)) {
      for (const key of ['c', 'a', 'b']) if (p[key]) p[key] = to(p[key]);
      for (const key of ['r', 'half']) if (p[key]) p[key] = p[key].map((v) => v * k);
      for (const key of ['ra', 'rb', 'r0', 'r1', 'h', 'wide', 'deep', 'round']) if (p[key] !== undefined) p[key] *= k;
      if (yaw && p.type === 'ball') p.yaw = [cos, sin];
      if (typeof p.color !== 'function') continue;
      const paint = p.color;
      const local = p.type === 'limb' ? (l) => l : (l) => l.map((v) => v / k);
      p.color = (l, at) => paint(local(l), back(at));
    }
    return this;
  }

  ball(c, r, o = {}) { return super.ball(c, r, o).tag(o); }
  box(c, h, o = {}) { return super.box(c, h, o).tag(o); }
  drum(c, r0, r1, h, o = {}) { return super.drum(c, r0, r1, h, o).tag(o); }
  limb(a, b, ra, rb, o = {}) { return super.limb(a, b, ra, rb, o).tag(o); }
}

/** La caja de una pieza en la pantalla. */
function bounds(p) {
  if (p.type === 'limb') {
    const r = Math.max(p.ra, p.rb) + SKIN;
    return [Math.min(p.a[0], p.b[0]) - r, Math.max(p.a[0], p.b[0]) + r, Math.min(p.a[1], p.b[1]) - r, Math.max(p.a[1], p.b[1]) + r];
  }
  const r = (p.wide ?? Math.max(...p.r)) + SKIN;
  return [p.c[0] - r, p.c[0] + r, p.c[1] - r, p.c[1] + r];
}

/** El pelo: cuánto sobresale la piel en un punto (mechones que caen). */
function tuft(mat, x, y, z) {
  const m = MATERIALS[mat];
  if (!m.fur) return 0;
  const n = m.curl ? fbm(x * 0.34 + 7, y * 0.34 + z * 0.3, 3, 2) : fbm(x * 0.5 - y * 0.12 + 40, y * 0.2 + z * 0.25 + 9, 5, 2);
  return (n - 0.45) * m.fur * 1.6;
}

/** La distancia a lo más cercano, y qué pieza es (en HIT). */
const HIT = { prim: null, local: [0, 0, 0] };
function scene(groups, x, y, z, detail = true) {
  let best = Infinity;
  for (const prims of groups) {
    let value = Infinity;
    let near = Infinity;
    let pick = null;
    let [l0, l1, l2] = [0, 0, 0];
    for (const p of prims) {
      distance(p, x, y, z);
      const d = D.dist;
      if (d < near) {
        near = d;
        pick = p;
        l0 = D.l0;
        l1 = D.l1;
        l2 = D.l2;
      }
      const k = p.blend;
      if (value === Infinity || !k) value = Math.min(value, d);
      else {
        const e = Math.max(k - Math.abs(value - d), 0) / k;
        value = Math.min(value, d) - e * e * k * 0.25;
      }
    }
    if (detail && value < 2.5) value -= tuft(pick.mat, x, y, z);
    value -= pick.over * 0.1; // lo que va encima, gana
    if (value < best) {
      best = value;
      HIT.prim = pick;
      HIT.local[0] = l0;
      HIT.local[1] = l1;
      HIT.local[2] = l2;
    }
  }
  return best;
}

/** El color de un punto de la superficie. */
function shade(groups, x, y, z) {
  const { prim } = HIT;
  const local = [...HIT.local];
  const mat = MATERIALS[prim.mat];
  const e = 0.35;
  const d = [scene(groups, x + e, y - e, z - e), scene(groups, x - e, y + e, z - e), scene(groups, x - e, y - e, z + e), scene(groups, x + e, y + e, z + e)];
  const n = unit([d[0] - d[1] - d[2] + d[3], -d[0] + d[1] - d[2] + d[3], -d[0] - d[1] + d[2] + d[3]].map((v) => v + 1e-6));
  let color = rgb(typeof prim.color === 'function' ? prim.color(local, [x, y, z]) : prim.color);
  // Pinceladas
  const stroke = prim.mat === 'fur' || prim.mat === 'feather'
    ? noise(x * 1.5 - y * 0.35 + 30, y * 0.42 + z * 0.3, 8) * 0.65 + noise(x * 3 - y * 0.8, y * 0.9, 4) * 0.35
    : fbm(x * 0.8 + 11, y * 0.8 + z * 0.6, 6, 2);
  color = color.map((c) => c * (1 + (stroke - 0.5) * 2 * mat.grain));
  // Lo que se tapa entre sí se oscurece, y lo que le da sombra a algo
  let ao = 1;
  for (const r of [1.6, 4]) ao *= 0.42 + 0.58 * clamp(scene(groups, x + n[0] * r, y + n[1] * r, z + n[2] * r, false) / r + 0.15);
  let sun = 1;
  for (const r of [2.5, 6, 11]) sun = Math.min(sun, 0.35 + 0.65 * clamp(scene(groups, x + n[0] + KEY[0] * r, y + n[1] + KEY[1] * r, z + n[2] + KEY[2] * r, false) / (r * 0.3) + 0.3));
  const dot = (v) => Math.max(0, n[0] * v[0] + n[1] * v[1] + n[2] * v[2]);
  const light = (0.36 + 0.16 * (n[1] * 0.5 + 0.5)) * ao + 0.84 * dot(KEY) * sun;
  const k = clamp(light);
  const back = clamp((1 - Math.max(0, n[2]) - 0.42) / 0.5);
  const rim = back * back * dot(RIM) * 0.45;
  const warm = dot(WARM) * 0.12 * ao;
  const spec = dot(unit([KEY[0], KEY[1], KEY[2] + 1])) ** (mat.shine ?? 16) * mat.spec * sun;
  return color.map((c, i) => {
    const shadow = c * [0.36, 0.28, 0.44][i] + [6, 3, 14][i]; // las sombras, hondas y hacia el violeta
    return shadow + (c * Math.max(0.25, light) - shadow) * k + MOON[i] * rim + EMBER[i] * warm * (0.35 + c / 255) + (prim.mat === 'gold' ? [255, 226, 140] : [224, 226, 255])[i] * spec * 0.75;
  });
}

/** Las piezas por grupo, solo las que tocan una zona de la pantalla. */
function gather(list, x0, x1, y0, y1) {
  const map = new Map();
  for (const { p, box } of list) {
    if (box[1] < x0 || box[0] > x1 || box[3] < y0 || box[2] > y1) continue;
    const key = `${p.over}|${p.group}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(p);
  }
  return [...map.values()];
}

/** Todo lo que atraviesa un pixel, de adelante hacia atrás: dónde empieza y acaba cada trozo, y su color (el primero lo lleva la figura). */
function peel(groups, around, x, y, near, far, first) {
  const out = [];
  let at = near;
  for (let guard = 0; guard < 400 && at > far && out.length < 5; guard++) {
    const d = scene(groups, x, y, at);
    if (d > 0.06) {
      at -= Math.max(0.15, d * 0.75);
      continue;
    }
    const from = at;
    const color = out.length ? shade(around, x, y, at).map((c) => clamp(c, 0, 255)) : null;
    while (at > far && scene(groups, x, y, at) <= 0.06) at -= 0.35;
    out.push({ from, to: at, color });
  }
  if (!out.length) out.push({ from: first, to: first - 1, color: null }); // apenas una orilla
  return out;
}

/** Pinta en w × h pixeles del juego, con el punto (0, 0) en anchor; near y far: de qué z a qué z; ss: muestras por lado. */
export function render(model, { w, h, anchor, near = 26, far = -22, ss = 2, sharpen = 0.5 }) {
  const list = model.prims.map((p) => ({ p, box: bounds(p) }));
  const color = new Float32Array(w * h * 3);
  const on = new Uint8Array(w * h);
  const z = new Float32Array(w * h).fill(far);
  const chunks = new Map(); // pixel → [{ from, to, color }], de adelante hacia atrás
  const BLOCK = 6;
  for (let by = 0; by < h; by += BLOCK) {
    for (let bx = 0; bx < w; bx += BLOCK) {
      const zone = [bx - anchor[0], bx + BLOCK - anchor[0], anchor[1] - by - BLOCK, anchor[1] - by];
      const groups = gather(list, ...zone);
      if (!groups.length) continue;
      const around = gather(list, zone[0] - 5, zone[1] + 5, zone[2] - 5, zone[3] + 5); // lo que le puede dar sombra
      for (let py = by; py < Math.min(h, by + BLOCK); py++) {
        for (let px = bx; px < Math.min(w, bx + BLOCK); px++) {
          const sum = [0, 0, 0];
          let hits = 0;
          let depth = 0;
          for (let s = 0; s < ss * ss; s++) {
            const x = px + ((s % ss) + 0.5) / ss - anchor[0];
            const y = anchor[1] - py - (Math.floor(s / ss) + 0.5) / ss;
            let at = near;
            let hit = false;
            for (let i = 0; i < 70 && at > far; i++) {
              const d = scene(groups, x, y, at);
              if (d < 0.06) {
                hit = true;
                break;
              }
              at -= Math.max(0.12, d * 0.75);
            }
            if (!hit) continue;
            shade(around, x, y, at).forEach((c, n) => { sum[n] += c; });
            depth += at;
            hits++;
          }
          if (hits < ss * ss * 0.5) continue;
          const i = py * w + px;
          on[i] = 1;
          z[i] = depth / hits;
          for (let n = 0; n < 3; n++) color[i * 3 + n] = clamp(sum[n] / hits, 0, 255);
        }
      }
      for (let py = by; py < Math.min(h, by + BLOCK); py++) {
        for (let px = bx; px < Math.min(w, bx + BLOCK); px++) {
          const i = py * w + px;
          if (on[i]) chunks.set(i, peel(groups, around, px + 0.5 - anchor[0], anchor[1] - py - 0.5, near, far, z[i]));
        }
      }
    }
  }
  // Un poco de definición, como al reducir la ilustración
  const sharp = color.slice();
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (!on[i]) continue;
      const beside = [-1, 1, -w, w].filter((d) => on[i + d]);
      for (let n = 0; n < 3 && beside.length; n++) {
        const mean = beside.reduce((total, d) => total + color[(i + d) * 3 + n], 0) / beside.length;
        sharp[i * 3 + n] = clamp(color[i * 3 + n] + (color[i * 3 + n] - mean) * sharpen, 0, 255);
      }
    }
  }
  // Donde algo pasa delante de otra cosa, una línea oscura: así se separan (los cuernos de la cabeza, el brazo del pecho...)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!on[i]) continue;
      const step = Math.max(...[[-1, 0], [1, 0], [0, -1], [0, 1]].map(([dx, dy]) => (x + dx < 0 || y + dy < 0 || x + dx >= w || y + dy >= h || !on[i + dx + dy * w] ? 0 : z[i + dx + dy * w] - z[i])));
      if (step > 3.4) for (let n = 0; n < 3; n++) sharp[i * 3 + n] = sharp[i * 3 + n] * 0.46 + [8, 5, 14][n];
    }
  }
  return { w, h, color: sharp, on, z, chunks };
}
