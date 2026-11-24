// Modelos 3D chiquitos para el sprite stacking de los animales: piezas redondas (bolas y extremidades)
// que se rebanan en capas, de atrás hacia adelante. El juego dibuja las capas una sobre otra, cada una
// un poco más corrida (graphics/animalPainter.js), y así la figura tiene volumen y puede girar.
//
// Coordenadas, en pixeles del juego: x hacia adelante (los animales miran a la derecha), y hacia arriba
// (0 = el suelo) y z hacia quien mira. Las piezas de un mismo grupo se funden entre sí, como la piel.

export const add = (a, b) => a.map((v, i) => v + b[i]);
export const sub = (a, b) => a.map((v, i) => v - b[i]);
export const mul = (a, k) => a.map((v) => v * k);
export const lerp = (a, b, k) => (Array.isArray(a) ? a.map((v, i) => v + (b[i] - v) * k) : a + (b - a) * k);
export const rot = ([x, y, z = 0], a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a), z];
export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
export const TAU = Math.PI * 2;

export const rgb = (hex) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));

const ramps = new Map();
/** Cinco tonos de un color, de sombra a brillo: las sombras se van al violeta y las luces, a lo cálido. */
export function ramp(hex) {
  if (!ramps.has(hex)) {
    const c = rgb(hex);
    const dark = mix(c, [0, 0, 0], 0.35);
    ramps.set(hex, [
      mix(dark, rgb('#24143f'), 0.5),
      mix(mix(c, [0, 0, 0], 0.14), rgb('#3a2258'), 0.26),
      c,
      mix(c, rgb('#fff0c4'), 0.2),
      mix(c, rgb('#fffdf2'), 0.42),
    ]);
  }
  return ramps.get(hex);
}

// La luz: de arriba, un poco de la izquierda y de frente
const LIGHT = (() => {
  const v = [-0.32, 0.78, 0.54];
  const n = Math.hypot(...v);
  return v.map((c) => c / n);
})();

export class Model {
  constructor() {
    this.prims = [];
    this.dots = [];
    this.bands = [];
  }

  /**
   * Una franja pintada sobre la piel (un pañuelo, un collar): lo que esté a menos de width del plano que
   * pasa por center y mira hacia axis. Como va en la superficie de las piezas (groups), ninguna capa la
   * tapa. flare: cuánto se ensancha hacia down (el pico del pañuelo); reach: hasta dónde llega.
   */
  band({ center, axis, width = 1, flare = 0, down = [0, -1, 0], reach = 8, color, groups = ['body'] }) {
    const n = Math.hypot(...axis) || 1;
    this.bands.push({ center, axis: mul(axis, 1 / n), width, flare, down, reach, color, groups });
    return this;
  }

  /** El punto donde, saliendo de from hacia dir, se acaba la piel de esos grupos. */
  surface(from, dir, groups = ['body']) {
    const prims = this.prims.filter((p) => groups.includes(p.group));
    let p = from;
    for (let i = 0; i < 80; i++) {
      const next = add(p, mul(dir, 0.25));
      if (!prims.some((prim) => {
        distance(prim, ...next);
        return D.dist < 0;
      })) return p;
      p = next;
    }
    return p;
  }

  /**
   * Una bola (elipsoide). r: radios [x, y, z]; turn: giro en el plano (radianes); color: un color o una
   * función (punto local, punto) → color; group: las del mismo grupo se funden; over: gana a lo que tape
   * (mayor, encima); flat: sin sombras (de un solo tono).
   */
  ball(center, r, { turn = 0, color, group = 0, over = 0, flat = null, blend = 1.2 } = {}) {
    const radii = Array.isArray(r) ? r : [r, r, r];
    this.prims.push({ type: 'ball', c: [center[0], center[1], center[2] ?? 0], r: radii, cos: Math.cos(-turn), sin: Math.sin(-turn), color, group, over, flat, blend, reach: Math.max(...radii) + blend });
    return this;
  }

  /** Una extremidad: de a (radio ra) a b (radio rb). */
  limb(a, b, ra, rb, { color, group = 0, over = 0, flat = null, blend = 0.8 } = {}) {
    const p = [a[0], a[1], a[2] ?? 0];
    const q = [b[0], b[1], b[2] ?? 0];
    this.prims.push({ type: 'limb', a: p, b: q, ra, rb, color, group, over, flat, blend });
    return this;
  }

  /** Varias extremidades seguidas, con el radio que cambia de ra a rb. */
  chain(points, ra, rb, options) {
    for (let i = 1; i < points.length; i++) {
      const k = (n) => ra + ((rb - ra) * n) / (points.length - 1);
      this.limb(points[i - 1], points[i], k(i - 1), k(i), options);
    }
    return this;
  }

  /** Un pixel (los ojos, un brillo) en la capa z. */
  dot([x, y, z = 0], color) {
    this.dots.push({ x, y, z, color });
    return this;
  }

  /** Las capas: un arreglo de imágenes RGBA (w × h), de z = -depth a depth. anchor: dónde cae el punto (0, 0). */
  slices({ w, h, anchor, depth }) {
    const out = [];
    for (let z = -depth; z <= depth; z++) out.push(this.slice(w, h, anchor, z));
    for (const d of this.dots) {
      const layer = out[clamp(Math.round(d.z) + depth, 0, out.length - 1)];
      const x = Math.floor(anchor[0] + d.x);
      const y = Math.floor(anchor[1] - d.y);
      if (x >= 0 && y >= 0 && x < w && y < h) layer.data.set([...rgb(d.color), 255], (y * w + x) * 4);
    }
    return out;
  }

  slice(w, h, anchor, z) {
    const data = new Uint8ClampedArray(w * h * 4);
    // Solo las piezas que llegan a esta capa, con su caja en la imagen
    const near = [];
    for (const p of this.prims) {
      let box;
      if (p.type === 'ball') {
        if (Math.abs(p.c[2] - z) > p.r[2] + SKIN) continue;
        const r = Math.max(p.r[0], p.r[1]) + SKIN;
        box = [p.c[0] - r, p.c[0] + r, p.c[1] - r, p.c[1] + r];
      } else {
        const r = Math.max(p.ra, p.rb) + SKIN;
        if (z < Math.min(p.a[2], p.b[2]) - r || z > Math.max(p.a[2], p.b[2]) + r) continue;
        box = [Math.min(p.a[0], p.b[0]) - r, Math.max(p.a[0], p.b[0]) + r, Math.min(p.a[1], p.b[1]) - r, Math.max(p.a[1], p.b[1]) + r];
      }
      near.push({ prim: p, x0: box[0], x1: box[1], y0: box[2], y1: box[3] });
    }
    const hits = [];
    for (let py = 0; py < h; py++) {
      const y = anchor[1] - py - 0.5;
      const row = near.filter((n) => y >= n.y0 && y <= n.y1);
      if (!row.length) continue;
      for (let px = 0; px < w; px++) {
        const x = px + 0.5 - anchor[0];
        hits.length = 0;
        for (const n of row) if (x >= n.x0 && x <= n.x1) hits.push(n.prim);
        if (!hits.length) continue;
        const color = field(hits, x, y, z, this.bands);
        if (!color) continue;
        const i = (py * w + px) * 4;
        data[i] = color[0];
        data[i + 1] = color[1];
        data[i + 2] = color[2];
        data[i + 3] = 255;
      }
    }
    return { w, h, data };
  }
}

// Hasta dónde influye una pieza fuera de sí misma (para fundirse con sus vecinas)
const SKIN = 1.6;
// Lo que da distance(): la distancia con signo, la normal y el punto local
const D = { dist: 0, nx: 0, ny: 0, nz: 0, l0: 0, l1: 0, l2: 0 };

/** Distancia con signo (aproximada) a una pieza, y su normal (en D). */
function distance(prim, x, y, z) {
  if (prim.type === 'ball') {
    const { c, r, cos, sin } = prim;
    const dx = x - c[0];
    const dy = y - c[1];
    const l0 = dx * cos - dy * sin;
    const l1 = dx * sin + dy * cos;
    const l2 = z - c[2];
    const len = Math.hypot(l0 / r[0], l1 / r[1], l2 / r[2]) || 1e-6;
    const g0 = l0 / (r[0] * r[0]);
    const g1 = l1 / (r[1] * r[1]);
    const g2 = l2 / (r[2] * r[2]);
    const gl = Math.hypot(g0, g1, g2) || 1e-6;
    D.dist = Math.max((len * (len - 1)) / gl, -Math.min(r[0], r[1], r[2])); // de primer orden
    D.nx = (g0 * cos + g1 * sin) / gl;
    D.ny = (-g0 * sin + g1 * cos) / gl;
    D.nz = g2 / gl;
    D.l0 = l0;
    D.l1 = l1;
    D.l2 = l2;
    return;
  }
  const { a, b, ra, rb } = prim;
  const bx = b[0] - a[0];
  const by = b[1] - a[1];
  const bz = b[2] - a[2];
  const px = x - a[0];
  const py = y - a[1];
  const pz = z - a[2];
  const t = clamp((bx * px + by * py + bz * pz) / (bx * bx + by * by + bz * bz || 1e-6), 0, 1);
  const vx = px - bx * t;
  const vy = py - by * t;
  const vz = pz - bz * t;
  const len = Math.hypot(vx, vy, vz) || 1e-6;
  D.dist = len - (ra + (rb - ra) * t);
  D.nx = vx / len;
  D.ny = vy / len;
  D.nz = vz / len;
  D.l0 = t;
  D.l1 = len;
  D.l2 = 0;
}

/** El color de un punto, o null si está afuera de todo. */
function field(prims, x, y, z, bands = []) {
  const groups = [];
  for (const prim of prims) {
    distance(prim, x, y, z);
    if (D.dist > SKIN) continue;
    let g = null;
    for (const other of groups) if (other.over === prim.over && other.group === prim.group) g = other;
    if (!g) {
      g = { over: prim.over, group: prim.group, value: Infinity, hits: [] };
      groups.push(g);
    }
    // Unión suave: las piezas del grupo se funden
    const k = prim.blend;
    if (g.value === Infinity || !k) g.value = Math.min(g.value, D.dist);
    else {
      const e = Math.max(k - Math.abs(g.value - D.dist), 0) / k;
      g.value = Math.min(g.value, D.dist) - e * e * k * 0.25;
    }
    g.hits.push({ prim, dist: D.dist, nx: D.nx, ny: D.ny, nz: D.nz, local: [D.l0, D.l1, D.l2] });
  }
  let best = null;
  for (const g of groups) if (g.value < 0 && (!best || g.over > best.over || (g.over === best.over && g.value < best.value))) best = g;
  if (!best) return null;
  let top = best.hits[0];
  for (const hit of best.hits) if (hit.dist < top.dist) top = hit;
  let color = typeof top.prim.color === 'function' ? top.prim.color(top.local, [x, y, z]) : top.prim.color;
  for (const band of bands) {
    if (!band.groups.includes(best.group)) continue;
    const v = [x - band.center[0], y - band.center[1], z - (band.center[2] ?? 0)];
    if (Math.hypot(...v) > band.reach) continue;
    const along = v[0] * band.axis[0] + v[1] * band.axis[1] + v[2] * (band.axis[2] ?? 0);
    const low = Math.max(0, v[0] * band.down[0] + v[1] * band.down[1]);
    if (along > -band.width && along < band.width + low * band.flare) color = band.color;
  }
  const tones = ramp(color);
  if (top.prim.flat !== null) return tones[top.prim.flat];
  let [nx, ny, nz] = [0, 0, 0];
  for (const hit of best.hits) {
    const w = Math.max(0, top.dist + 1.4 - hit.dist) ** 2;
    nx += hit.nx * w;
    ny += hit.ny * w;
    nz += hit.nz * w;
  }
  const light = (nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]) / (Math.hypot(nx, ny, nz) || 1);
  // Lo del otro lado (z negativa), en sombra: así las patas de atrás se distinguen de las de enfrente
  const shade = light - (z < -1.5 ? 0.4 : z < 0 ? 0.14 : 0);
  return tones[shade < -0.2 ? 0 : shade < 0.26 ? 1 : shade < 0.8 ? 2 : shade < 0.955 ? 3 : 4];
}

/**
 * El doblez de dos huesos: de a a c con largos l1 y l2, dónde queda la articulación. side: 1, hacia
 * adelante (la rodilla, en una pata que cuelga); -1, hacia atrás (el codo).
 */
export function joint(a, c, l1, l2, side) {
  const dx = c[0] - a[0];
  const dy = c[1] - a[1];
  const d = clamp(Math.hypot(dx, dy), Math.abs(l1 - l2) + 0.05, l1 + l2 - 0.02);
  const angle = Math.atan2(dy, dx) + side * Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  const k = (c[2] ?? 0) * 0.5 + (a[2] ?? 0) * 0.5;
  return [a[0] + Math.cos(angle) * l1, a[1] + Math.sin(angle) * l1, k];
}
