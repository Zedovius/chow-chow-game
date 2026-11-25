// Los 12 tragos de la casa en 3D por capas, dando una vuelta completa, para la pantalla del trago
// (js/ui/drinkScreen.js). Uso: npm run tragos [signo...]
//
// Es sprite stacking: cada vaso son rebanadas horizontales, apiladas y vistas un poco desde arriba. Aquí cada pixel
// las recorre de arriba abajo (de la más cercana a la más lejana) y junta lo que encuentra: así el vidrio y la
// bebida se transparentan, y la luz se queda quieta mientras el vaso gira. Los cuadros de la vuelta salen en una
// hoja por signo (assets/images/tragos/<signo>.png; SHEET en js/graphics/glassArt.js dice cómo van).
//
// La forma y el color de cada uno salen de las fotos del bar (assets/images/info-logo-tragos, que no se publican).

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { SHEET } from '../../js/graphics/glassArt.js';
import { encode, image } from './png.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(root, 'assets', 'images', 'tragos');
const { w, h, frames: FRAMES, columns } = SHEET;

const N = 88; // lado de una rebanada
const C = (N - 1) / 2;
const PITCH = 0.4; // cuánto se ve desde arriba
const RISE = 0.92; // lo que sube cada capa
const STEP = 0.5; // medias capas, para que las paredes delgadas no queden con huecos
const LIGHT = [-0.56, 0.62, 0.55]; // de arriba, a la izquierda y de frente
const HALF = [-0.33, 0.6, 0.73]; // entre la luz y quien mira: dónde brilla

const rgb = (hex) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
/** Azar por lugar: siempre el mismo. */
const speck = (x, y, z) => {
  const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  return s - Math.floor(s);
};

const INK = Object.fromEntries(Object.entries({
  glass: '#d7f1ff', white: '#fbf7ee', ice: '#eef9ff', pick: '#3a2416',
}).map(([name, hex]) => [name, rgb(hex)]));

// Cada vaso: at(x, y, z) dice qué hay ahí, en capas (y hacia arriba, 0 la mesa; x y z desde el centro). Devuelve
// { c: color, a: cuánto tapa, n: hacia dónde mira, shine: si brilla }, o null

const round = (x, z, slope = 0) => {
  const r = Math.hypot(x, z) || 1;
  const k = 1 / Math.hypot(1, slope);
  return [(x / r) * k, -slope * k, (z / r) * k];
};

// --- Lo que va adentro y en la orilla ------------------------------------------------

/** Una bola. paint(n, p): su color, si no es parejo. */
const ball = (center, radius, hex, { paint, squash = 1, shine = 0.4, a = 1 } = {}) => {
  const base = rgb(hex);
  return (x, y, z) => {
    const p = [x - center[0], (y - center[1]) / squash, z - center[2]];
    const d = Math.hypot(...p);
    if (d > radius) return null;
    const n = p.map((v) => v / (d || 1));
    return { c: paint ? paint(n, p) ?? base : base, a, n, shine };
  };
};

/** Un palito de a a b. */
const stick = (from, to, radius, hex) => {
  const c = rgb(hex);
  const d = to.map((v, i) => v - from[i]);
  const len2 = d.reduce((s, v) => s + v * v, 0);
  return (x, y, z) => {
    const p = [x - from[0], y - from[1], z - from[2]];
    const t = clamp((p[0] * d[0] + p[1] * d[1] + p[2] * d[2]) / len2, 0, 1);
    const q = p.map((v, i) => v - d[i] * t);
    const far = Math.hypot(...q);
    return far > radius ? null : { c, a: 1, n: q.map((v) => v / (far || 1)), shine: 0.2 };
  };
};

/** Un disco acostado (hoja, rodaja que flota). paint(r, ángulo): su color. */
const disc = ([cx, cy, cz], radius, thick, paint) => (x, y, z) => {
  if (Math.abs(y - cy) > thick / 2) return null;
  const r = Math.hypot(x - cx, z - cz);
  return r > radius ? null : { c: paint(r / radius, Math.atan2(z - cz, x - cx)), a: 1, n: [0, 1, 0], shine: 0.1 };
};

/** Un disco parado en la orilla, de canto (rodaja). */
const wheel = ([cx, cy, cz], radius, thick, paint) => (x, y, z) => {
  if (Math.abs(z - cz) > thick / 2) return null;
  const r = Math.hypot(x - cx, y - cy);
  if (r > radius) return null;
  return { c: paint(r / radius, Math.atan2(y - cy, x - cx)), a: 1, n: Math.abs(z - cz) > thick / 2 - 0.8 ? [0.1, 0.1, Math.sign(z - cz)] : [(x - cx) / (r || 1), (y - cy) / (r || 1), 0] };
};

/** Una hoja parada: una lente en su plano. */
const leaf = ([cx, cy, cz], length, wide, turn, hex, vein) => {
  const [c, v] = [rgb(hex), rgb(vein)];
  return (x, y, z) => {
    const u = (x - cx) * Math.cos(turn) + (z - cz) * Math.sin(turn);
    const w2 = -(x - cx) * Math.sin(turn) + (z - cz) * Math.cos(turn);
    if (Math.abs(w2) > 1.7) return null;
    const along = (u * 0.5 + (y - cy) * 0.87) / length;
    const side = (u * 0.87 - (y - cy) * 0.5) / wide;
    if (along < 0 || along > 1 || Math.abs(side) > Math.sin(Math.PI * along ** 0.8)) return null;
    return { c: Math.abs(side) < 0.13 || Math.abs(((along * 6 + Math.abs(side)) % 1) - 0.5) < 0.1 ? v : c, a: 1, n: [-Math.sin(turn), 0.4, Math.cos(turn) * Math.sign(w2 || 1)] };
  };
};

/** Un cubo de hielo: centro, medio lado (o tres), y giros. */
function cube([cx, cy, cz], half, turn, tilt = 0, { a = 0.14, edge = 0.6 } = {}) {
  const h = Array.isArray(half) ? half : [half, half, half];
  const [ct, st, ck, sk] = [Math.cos(turn), Math.sin(turn), Math.cos(tilt), Math.sin(tilt)];
  return (x, y, z) => {
    let [p, q, r] = [x - cx, y - cy, z - cz];
    [p, r] = [p * ct - r * st, p * st + r * ct];
    [p, q] = [p * ck - q * sk, p * sk + q * ck];
    const k = [Math.abs(p) / h[0], Math.abs(q) / h[1], Math.abs(r) / h[2]];
    const top = Math.max(...k);
    if (top > 1) return null;
    const i = k.indexOf(top);
    const n = [0, 0, 0];
    n[i] = Math.sign([p, q, r][i]);
    const [u, v] = [n[0] * ck + n[1] * sk, -n[0] * sk + n[1] * ck];
    const border = k.filter((v2, m) => (1 - v2) * h[m] < 1.3).length > 1;
    return { ice: true, c: border ? [255, 255, 255] : INK.ice, a: border ? edge : a, n: [u * ct + n[2] * st, v, -u * st + n[2] * ct], shine: border ? 0 : 0.7 };
  };
}

// --- El vaso ------------------------------------------------------------------------

/**
 * Un vaso de vidrio. R(y): su radio por fuera; from: dónde empieza a estar hueco (abajo, pie o base maciza);
 * height: hasta dónde llega; stem: si lo de abajo es un tallo; wall: grueso del vidrio; ribs: cuántas rayas
 * verticales; liquid: { from, to, deep, body, top, rim, a, bubbles }; things: lo que va adentro o en la orilla
 * (lo primero de la lista gana); crust: lo que escarcha la orilla.
 */
function vessel({ R, from, height, stem = false, wall = 2, ribs = 0, liquid, things = [], crust = null, extra = 0 }) {
  const [deep, body, top, rim] = [liquid.deep, liquid.body, liquid.top, liquid.rim ?? liquid.top].map(rgb);
  const at = (x, y, z) => {
    const r = Math.hypot(x, z);
    const Rr = y <= height ? R(y) : 0;
    const wet = y < liquid.to && y >= from && r <= Rr - wall;
    for (const thing of things) {
      const hit = thing(x, y, z);
      if (!hit) continue;
      if (!wet) return hit;
      // Bajo la bebida se tiñe
      return { ...hit, c: mix(hit.c, body, hit.ice ? 0.3 : 0.35) };
    }
    if (y > height || r > Rr + (crust ? 1.2 : 0)) return null;
    const slope = R(y + 0.5) - R(y - 0.5);
    if (y < from) {
      if (r > Rr) return null;
      if (stem) return { c: INK.glass, a: y < 3.5 ? (r > Rr - 3 ? 0.28 : 0.09) : 0.3, n: round(x, z, clamp(slope, -3, 3)), shine: 0.9 };
      return { c: INK.glass, a: r > Rr - 2.5 ? 0.26 : 0.1, n: round(x, z, 0.2), shine: 1 };
    }
    if (crust && y > height - crust.depth && r > Rr - wall - 0.6) {
      const s = speck(Math.round(x / 1.5), Math.round(y / 1.5), Math.round(z / 1.5));
      const here = Math.atan2(z, x);
      if (y < height + 0.6 - speck(Math.round(x / 3), 4, Math.round(z / 3)) && (!crust.half || Math.cos(here - 0.4) > -0.1)) return { c: crust.colors[Math.floor(s * crust.colors.length)], a: 1, n: r > Rr - 0.8 ? round(x, z) : [0, 1, 0] };
    }
    if (r > Rr) return null;
    if (r > Rr - wall) {
      const rib = ribs && Math.cos(Math.atan2(z, x) * ribs) > 0.55;
      return { c: rib ? [255, 255, 255] : INK.glass, a: y > height - 1.5 ? 0.34 : rib ? 0.16 : 0.07, n: round(x, z, slope), shine: 1 };
    }
    if (!wet) return null;
    if (y > liquid.to - 1.6) return { c: r > Rr - wall - 3 ? rim : top, a: liquid.foam ? 1 : 0.6, n: [0, 1, 0], shine: liquid.foam ? 0 : 0.3 };
    if (liquid.foam && y > liquid.to - liquid.foam) return { c: rim, a: 0.8, n: round(x, z, slope) };
    if (liquid.bubbles && speck(Math.round(x * 0.8), Math.round(y * 0.8), Math.round(z * 0.8)) > 1 - liquid.bubbles) return { c: [255, 255, 255], a: 0.55, n: round(x, z) };
    const k = clamp((y - from) / (liquid.to - from), 0, 1);
    return { c: mix(deep, body, k), a: liquid.a, n: round(x, z, slope) };
  };
  return { at, height: height + extra + 2 };
}

const foot = (radius, tall, thin) => (y) => thin + (radius - thin) * Math.exp(-Math.max(0, y - 1.2) / tall);
/** Un pie con tallo hasta neck y, arriba, la copa bowl(0…1). */
const goblet = (neck, height, bowl, { radius = 20, thin = 2.4, knot = 0 } = {}) => (y) => (y < neck
  ? foot(radius, 1.8, thin)(y) + knot * Math.exp(-(((y - neck + 4) / 2) ** 2))
  : Math.max(thin, bowl((y - neck) / (height - neck))));

const CITRUS = (peel, pulp, pith) => {
  const [a, b, c] = [peel, pulp, pith].map(rgb);
  return (r, angle) => (r > 0.9 ? a : r > 0.8 || r < 0.12 || Math.abs((((angle / Math.PI) * 4) % 1 + 1) % 1 - 0.5) > 0.41 ? c : b);
};
const VEINED = (green, vein) => {
  const [a, b] = [green, vein].map(rgb);
  return (r, angle) => (Math.abs(Math.sin(angle)) * r < 0.06 || Math.abs((((r * Math.cos(angle) * 3 + Math.abs(Math.sin(angle)) * r * 3) % 1) + 1) % 1 - 0.5) < 0.09 ? b : a);
};

/** Qué tan ancha queda cada hoja: todos se paran en el mismo lugar. */
const BASE = 22;

const MODELS = {
  // Mushroom Manhattan: ámbar, en copa baja y abierta, con un shiitake en la orilla
  rat: () => vessel({
    R: goblet(34, 66, (k) => 4 + 31 * Math.sqrt(clamp(1 - (1 - k) ** 2, 0, 1)) * (0.86 + 0.14 * k), { radius: 20 }), from: 35, height: 66, stem: true, extra: 14,
    liquid: { to: 61, deep: '#6b2c06', body: '#b9590f', top: '#d9781c', rim: '#f0a343', a: 0.2 },
    things: [
      ball([30, 72, 0], 11, '#7a4a28', { squash: 0.62, shine: 0.2, paint: (n, p) => (p[1] < 0 ? rgb('#e9d6b4') : speck(Math.round(p[0] / 2), 1, Math.round(p[2] / 2)) > 0.72 ? rgb('#c79a66') : null) }),
      stick([30, 70, 0], [26, 60, 0], 2.6, '#e9d6b4'),
    ],
  }),
  // Lichie Martini: oro pálido, en copa redonda, con un lichi ensartado
  ox: () => vessel({
    R: goblet(36, 84, (k) => 3 + 27 * Math.sin(Math.PI * clamp(0.5 * k ** 0.62 + 0.03, 0, 1)) * (1 - 0.16 * Math.max(0, k - 0.6) / 0.4), { radius: 20 }), from: 37, height: 84, stem: true, extra: 8,
    liquid: { to: 70, deep: '#b98d3a', body: '#e4c67c', top: '#f3dfa6', rim: '#fff3cf', a: 0.13 },
    things: [
      ball([8, 72, 4], 7.5, '#f8e6e3', { shine: 0.6, paint: (n) => (n[1] < -0.35 ? rgb('#d97f96') : null) }),
      stick([-18, 66, -6], [30, 82, 10], 0.9, '#c9a24a'),
    ],
  }),
  // Candy Wine: rosado, en copa de vino grande, llena a la mitad
  tiger: () => vessel({
    R: goblet(34, 96, (k) => (k < 0.28 ? 3 + 30 * Math.sin((Math.PI / 2) * (k / 0.28)) ** 0.9 : 33 - 9 * ((k - 0.28) / 0.72) ** 1.2), { radius: 22, thin: 2.2 }), from: 35, height: 96, stem: true,
    liquid: { to: 60, deep: '#a82745', body: '#dd5a70', top: '#f08a9a', rim: '#ffc2cb', a: 0.2, bubbles: 0.008 },
  }),
  // Rosé Spritz: ámbar naranja, en vaso acanalado, con hielo claro y una hoja de jade flotando
  rabbit: () => vessel({
    R: (y) => 28 + y * 0.08, from: 6, height: 62, ribs: 26,
    liquid: { to: 53, deep: '#a8430a', body: '#e07a1d', top: '#f09a3c', rim: '#ffc677', a: 0.16, bubbles: 0.008 },
    things: [disc([5, 53.5, 4], 15, 3, (r) => (r > 0.86 ? rgb('#8f9a2a') : speck(Math.round(r * 9), 2, Math.round(r * 31)) > 0.8 ? rgb('#a3ac36') : rgb('#bfc443'))), cube([-5, 34, -3], 17, 0.4, 0.06)],
  }),
  // Espresso Martinez: fresa y café, en copa de martini, con espuma y tres granos
  dragon: () => vessel({
    R: goblet(36, 76, (k) => 2.6 + 34 * k, { radius: 21 }), from: 37, height: 76, stem: true, extra: 4,
    liquid: { to: 72, deep: '#2c0a0b', body: '#6a1517', top: '#d9a58f', rim: '#f0cdb9', a: 0.34, foam: 7 },
    things: [[0, 6], [2.1, 6], [4.2, 6]].map(([angle, r]) => ball([Math.cos(angle) * r, 72.6, Math.sin(angle) * r], 4, '#2a120a', { squash: 0.5, shine: 0.3, paint: (n, p) => (Math.abs(p[0] * Math.sin(angle) - p[2] * Math.cos(angle)) < 0.6 ? rgb('#5a2c18') : null) })),
  }),
  // Purple Collins: morado, en vaso alto, con espuma de yogurt y enoki
  snake: () => vessel({
    R: () => 21, from: 6, height: 88, extra: 16,
    liquid: { to: 76, deep: '#3f7a3a', body: '#7b3fa0', top: '#e9dcf2', rim: '#f6eefb', a: 0.15, foam: 8, bubbles: 0.006 },
    things: [
      ...[[0, 0, 98], [4, 3, 94], [-3, 4, 100], [5, -3, 101], [-4, -3, 95], [1, 6, 91]].flatMap(([dx, dz, top]) => [ball([12 + dx, top, dz], 2.9, '#fff6e2', { squash: 0.8, shine: 0.2 }), stick([11 + dx * 0.5, 72, dz * 0.5], [12 + dx, top - 1, dz], 1.2, '#f0e2c4')]),
      cube([-4, 24, 2], 10, 0.5, 0.2), cube([5, 48, -3], 10, 1.1, -0.2), cube([-3, 66, 4], 9, 0.1, 0.35),
    ],
  }),
  // Strawberry & Whisky: rojizo, en vaso bajo de fondo redondo, con un hielo grande y una flor ensartada
  horse: () => vessel({
    R: (y) => (y < 14 ? 21 + 10 * Math.sqrt(clamp(y / 14, 0, 1)) : 31), from: 8, height: 58, extra: 14,
    liquid: { to: 45, deep: '#a81d08', body: '#e0421a', top: '#f2683a', rim: '#ff9a6e', a: 0.16 },
    things: [
      ball([25, 62, 6], 8.5, '#e9e6c0', { shine: 0, paint: (n, p) => (speck(Math.round(p[0] / 1.7), Math.round(p[1] / 1.7), Math.round(p[2] / 1.7)) > 0.6 ? rgb('#cfc992') : null) }),
      stick([-20, 48, -8], [27, 63, 7], 1.2, '#2a1712'), cube([-2, 36, 0], 16, 0.6, 0.05),
    ],
  }),
  // Pox Piña Colada: dorado claro, en copa ancha de tallo hueco
  goat: () => vessel({
    R: goblet(40, 64, (k) => 4 + 34 * clamp(k * 1.25, 0, 1) ** 0.5 * (1 - 0.04 * k), { radius: 24, thin: 3.6 }), from: 24, height: 64, stem: true, wall: 1.8, extra: 26,
    liquid: { to: 58, deep: '#8f7a14', body: '#c9b23a', top: '#e6d46a', rim: '#fbf0a8', a: 0.15, bubbles: 0.004 },
    things: [leaf([24, 54, 3], 34, 5, 0.25, '#4f8a3a', '#a9d07a'), leaf([26, 54, -2], 28, 5, -0.5, '#3f7430', '#8ab85c'), leaf([23, 54, 0], 24, 5, 1.1, '#5c9a44', '#b4dc84')],
  }),
  // Spicy Margarita: claro y lechoso, en vaso redondo, con media orilla de chile y sal, y yuzu
  monkey: () => vessel({
    R: (y) => (y < 22 ? 17 + 15 * Math.sin((Math.PI / 2) * clamp(y / 22, 0, 1)) : 32 + (y - 22) * 0.03), from: 6, height: 58, extra: 12,
    crust: { depth: 6, half: true, colors: [rgb('#c8321e'), rgb('#e0552e'), rgb('#fbf2e6'), rgb('#8f1f14')] },
    liquid: { to: 46, deep: '#b99a86', body: '#e6cdb8', top: '#f6e6d2', rim: '#fff6ea', a: 0.17 },
    things: [wheel([-28, 60, 0], 12, 4, CITRUS('#f0c62e', '#f8e27a', '#fff6cf')), cube([4, 38, 5], 11, 0.4, 0.3), cube([-8, 28, -6], 10, 1.1, -0.3)],
  }),
  // Pizza Highball: casi transparente, en vaso alto, con una columna de hielo, jitomate y albahaca
  rooster: () => vessel({
    R: (y) => 20 + y * 0.025, from: 6, height: 86, extra: 14,
    liquid: { to: 74, deep: '#d08a6a', body: '#f0cdb4', top: '#f8e2d0', rim: '#fff1e4', a: 0.05, bubbles: 0.006 },
    things: [
      ball([13, 90, 3], 7, '#d62c1e', { shine: 0.8 }), leaf([8, 88, 4], 17, 7, 0.6, '#3f8f3a', '#86c96a'), stick([-10, 70, -2], [18, 97, 4], 0.9, '#c9a24a'),
      cube([0, 44, 0], [10, 33, 10], 0.5, 0.02, { a: 0.16, edge: 0.7 }),
    ],
  }),
  // Kaffir & Olives: martini claro, con dos aceitunas y una hoja de lima
  dog: () => vessel({
    R: goblet(38, 80, (k) => 2.6 + 35 * k, { radius: 21, thin: 2.1 }), from: 39, height: 80, stem: true, extra: 18,
    liquid: { to: 74, deep: '#8f9c5c', body: '#cdd6a0', top: '#e4eac2', rim: '#f7fadf', a: 0.1 },
    things: [
      ...[[-6, 73], [7, 78]].map(([x, y]) => ball([x, y, 2], 6.4, '#7f9436', { shine: 0.7, paint: (n) => (n[0] > 0.86 ? rgb('#c8452c') : null) })),
      stick([-26, 65, 2], [34, 88, 2], 0.9, '#d8d2c4'), leaf([-24, 70, -5], 28, 9, 0.3, '#3d7a34', '#8cc46e'),
    ],
  }),
  // Mangostán Fizz: rojo oscuro, en vaso bajo, con un hielo enorme y una hoja con nori encima
  pig: () => vessel({
    R: (y) => 29 + y * 0.07, from: 7, height: 58, extra: 6,
    liquid: { to: 49, deep: '#3f0905', body: '#8f1d0c', top: '#b8391a', rim: '#e8803a', a: 0.24, bubbles: 0.006 },
    things: [stick([-9, 54, 3], [8, 58, -5], 2.6, '#241512'), stick([-3, 54, 5], [-6, 58, -3], 1.8, '#3a2018'), disc([0, 52, 0], 14, 2.6, VEINED('#3f6a22', '#8fb04a')), cube([0, 33, 0], [19, 18, 19], 0.55, 0.03)],
  }),
};

/** Las rebanadas de un vaso, ya calculadas: por cada punto, su color, cuánto tapa y hacia dónde mira. */
function build(name) {
  const { at, height } = MODELS[name]();
  const layers = Math.ceil(height / STEP);
  const size = layers * N * N;
  const color = new Uint8Array(size * 4); // r g b y cuánto tapa
  const normal = new Int8Array(size * 4); // x y z y cuánto brilla
  for (let l = 0; l < layers; l++) {
    for (let z = 0; z < N; z++) {
      for (let x = 0; x < N; x++) {
        const hit = at(x - C, l * STEP, z - C);
        if (!hit) continue;
        const i = (l * N * N + z * N + x) * 4;
        color.set([...hit.c.map(Math.round), Math.round(hit.a * 255)], i);
        normal.set([...hit.n, hit.shine ?? 0].map((v) => Math.round(clamp(v, -1, 1) * 127)), i);
      }
    }
  }
  return { layers, color, normal };
}

/** Un cuadro de la vuelta: pixeles RGBA de SHEET. */
function render({ layers, color, normal }, angle, base) {
  const out = new Uint8ClampedArray(w * h * 4);
  const [cos, sin] = [Math.cos(angle), Math.sin(angle)];
  const ground = h - base; // en qué renglón está el centro de la mesa
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const vx = px - (w - 1) / 2;
      let [r, g, b, through] = [0, 0, 0, 1];
      for (let l = layers - 1; l >= 0 && through > 0.04; l--) {
        const vz = (py - ground + l * STEP * RISE) / PITCH;
        if (vz * vz + vx * vx > C * C) continue;
        const x = Math.round(vx * cos + vz * sin + C);
        const z = Math.round(-vx * sin + vz * cos + C);
        if (x < 0 || z < 0 || x >= N || z >= N) continue;
        const i = (l * N * N + z * N + x) * 4;
        let a = color[i + 3] / 255;
        if (!a) continue;
        // La luz no gira: lo que gira es hacia dónde mira cada punto
        const nx = normal[i] / 127;
        const ny = normal[i + 1] / 127;
        const nz = normal[i + 2] / 127;
        const wx = nx * cos - nz * sin;
        const wz = nx * sin + nz * cos;
        const light = Math.round(clamp(wx * LIGHT[0] + ny * LIGHT[1] + wz * LIGHT[2], -0.5, 1) * 4) / 4;
        const k = 0.72 + 0.34 * light;
        const shine = normal[i + 3] / 127;
        const gleam = shine && wx * HALF[0] + ny * HALF[1] + wz * HALF[2] > 0.955 - 0.05 * shine ? 0.42 * shine : 0;
        // De lado, el vidrio se ve más
        if (shine === 1) a = clamp(a + 0.42 * (1 - Math.abs(wz * 0.92 + ny * 0.4)) ** 3, 0, 0.75);
        a = Math.max(a, gleam);
        const take = through * a;
        r += take * (color[i] * k * (1 - gleam) + 255 * gleam);
        g += take * (color[i + 1] * k * (1 - gleam) + 255 * gleam);
        b += take * (color[i + 2] * k * (1 - gleam) + 255 * gleam);
        through -= take;
      }
      const cover = 1 - through;
      if (cover < 0.06) continue;
      // Pocos tonos, como el resto del pixel art
      const bright = Math.max(r, g, b) || 1;
      const snap = Math.max(1, Math.round(bright / 17)) * 17 / bright;
      const i = (py * w + px) * 4;
      const few = (v) => Math.round((v * snap) / cover / 12) * 12;
      out[i] = few(r);
      out[i + 1] = few(g);
      out[i + 2] = few(b);
      out[i + 3] = Math.round(cover * 12) * 21.25;
    }
  }
  return out;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const wanted = process.argv.slice(2);
  for (const name of Object.keys(MODELS).filter((id) => !wanted.length || wanted.includes(id))) {
    const slices = build(name);
    const sheet = image(w * columns, h * Math.ceil(FRAMES / columns));
    for (let n = 0; n < FRAMES; n++) {
      const frame = render(slices, (n / FRAMES) * Math.PI * 2, BASE);
      const [ox, oy] = [(n % columns) * w, Math.floor(n / columns) * h];
      for (let y = 0; y < h; y++) sheet.data.set(frame.subarray(y * w * 4, (y + 1) * w * 4), ((oy + y) * w * columns + ox) * 4);
    }
    const png = encode(sheet);
    await writeFile(path.join(OUT, `${name}.png`), png);
    console.log(`${name}: ${FRAMES} cuadros, ${Math.round(png.length / 1024)} KB`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
