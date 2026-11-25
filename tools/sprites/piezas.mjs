// Los objetos de los mundos: con lo que se representa a cada animal en la cultura china. Son modelos 3D
// (modelo3d.mjs) que se rebanan en capas. Cada función da un Model de pie en (0, 0), en pixeles del juego.
// Los de los otros seis animales están en piezas2.mjs.

import { Model, add, lerp, TAU } from './modelo3d.mjs';
import { hash } from './ruido.mjs';

export const C = {
  RED: '#b3202c', DEEP: '#6d1420', GOLD: '#d9a63a', BRONZE: '#8a6a34', JADE: '#3f8f74', WOOD: '#5a3a26',
  DARK: '#2a1a20', STONE: '#7d7a88', PAPER: '#f0dfb8',
};
const { RED, DEEP, GOLD, BRONZE, JADE, WOOD, DARK, STONE, PAPER } = C;

export const make = () => {
  const m = new Model();
  m.farShade = false;
  return m;
};
export const stripe = (a, b, k = 2.2, at = 0.25) => (l) => (Math.sin(l[0] * k) > at ? a : b);

/** Un techo chino: curvo, de tejas, con las esquinas levantadas. */
export function roof(m, [x, y, z = 0], w, d, h, color = '#3c4a5e', { ridge = GOLD, dark = '#26303f', lift = 1.8 } = {}) {
  const n = Math.max(3, Math.round(h / 1.2));
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    m.box([x, y + (i + 0.5) * (h / n), z], [w * (1 - 0.74 * t ** 0.62), h / n / 2 + 0.35, d * (1 - 0.66 * t ** 0.62)], { color: stripe(color, dark), group: 'roof' });
  }
  m.box([x, y + h + 0.4, z], [w * 0.3, 0.8, 0.9], { color: ridge, group: 'ridge', over: 1 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) m.limb([x + sx * w * 0.86, y + 0.4, z + sz * d * 0.86], [x + sx * (w + 2), y + lift, z + sz * (d + 0.6)], 0.9, 0.5, { color, group: 'eave', over: 1 });
}

/** Una linterna de papel, con su luz, sus tapas y su borla. */
export function lantern(m, [x, y, z = 0], r, { color = '#e23a2a', cap = GOLD, tall = 1.1 } = {}) {
  m.ball([x, y, z], [r, r * tall, r], { color: (l) => (Math.abs(l[0]) < r * 0.34 ? '#ffb04a' : Math.sin(l[0] * 4.2) > 0.55 ? DEEP : color), group: `lan${x}${y}` });
  m.drum([x, y + r * tall, z], r * 0.5, r * 0.42, 0.6, { color: cap, group: 'cap', over: 1 });
  m.drum([x, y - r * tall, z], r * 0.42, r * 0.5, 0.6, { color: cap, group: 'cap', over: 1 });
  m.limb([x, y - r * tall - 0.6, z], [x, y - r * tall - 2.6, z], 0.5, 0.35, { color: cap, group: 'tas', over: 1 });
}

export const pole = (m, x, y0, y1, r = 0.8, color = WOOD, z = 0) => m.drum([x, (y0 + y1) / 2, z], r, r, (y1 - y0) / 2, { color, group: `pole${x}${z}` });

export const flame = (m, [x, y, z = 0], k = 1) => {
  m.ball([x, y + 0.9 * k, z], [0.9 * k, 1.6 * k, 0.9 * k], { color: '#ff9a2e', group: `fl${x}`, flat: 3, over: 4, blend: 0.6 });
  m.ball([x, y + 0.6 * k, z + 0.4], [0.5 * k, 0.9 * k, 0.6 * k], { color: '#fff3b0', group: `fm${x}`, flat: 4, over: 5, blend: 0 });
};

/** Una copa de hojas: bolas juntas; spot: motas de otro color (flores). */
export const foliage = (m, [x, y, z = 0], r, color, seed = 1, n = 7, group = 'leaf', spot = null, squash = 0.75) => {
  for (let i = 0; i < n; i++) {
    const a = hash(i, 1, seed) * TAU;
    const k = i === 0 ? 0 : 0.35 + 0.45 * hash(i, 2, seed);
    const p = [x + Math.cos(a) * r * k, y + Math.sin(a) * r * k * 0.6, z + (hash(i, 3, seed) - 0.5) * r * 1.2];
    const rr = r * (0.5 + 0.22 * hash(i, 4, seed));
    m.ball(p, [rr, rr * squash, rr], { color: spot ? (l, at) => (hash(Math.floor(at[0] * 0.9), Math.floor(at[1] * 0.9), seed) > 0.8 ? spot : color) : color, group, blend: 1.2 });
  }
};

export const post = () => {
  const m = make();
  pole(m, 0, 0, 25, 0.9);
  m.box([2.6, 24.4], [4.4, 0.6, 0.7], { color: WOOD });
  m.drum([0, 0.8], 2.2, 1.6, 0.8, { color: STONE, group: 'base' });
  lantern(m, [6, 18.6], 3.4);
  m.limb([6, 24], [6, 22.6], 0.4, 0.4, { color: DARK, group: 'rope' });
  return m;
};

/** Una moneda antigua, redonda con su hueco cuadrado. */
export const coin = (m, [x, y, z = 0], r, deep = 1.2, color = GOLD) => {
  m.ball([x, y, z], [r, r, deep], {
    color: (l) => {
      const square = Math.max(Math.abs(l[0]), Math.abs(l[1]));
      if (square < r * 0.26) return DARK;
      if (square < r * 0.36 || Math.hypot(l[0], l[1]) > r * 0.8) return '#f0c860';
      const mark = (Math.abs(l[0]) < r * 0.16 && Math.abs(Math.abs(l[1]) - r * 0.58) < r * 0.14) || (Math.abs(l[1]) < r * 0.16 && Math.abs(Math.abs(l[0]) - r * 0.58) < r * 0.14);
      return mark ? '#6b4a1a' : color;
    },
    group: `coin${x}${y}`,
  });
};

// --- Rata: medianoche, riqueza, la lámpara de aceite y la boda de los ratones ----------

const rat = {
  granary() {
    const m = make();
    m.drum([0, 9], 8, 8.6, 7, { color: (l) => (Math.sin(l[1] * 2.4) > 0.5 ? '#6a4c2c' : '#9a7442'), group: 'wall' });
    m.drum([0, 1.2], 8.8, 8.8, 1.2, { color: STONE, group: 'base' });
    m.drum([0, 20.4], 11.4, 1, 4.6, { color: (l) => (Math.sin(l[0] * 3 + l[1]) > 0.2 ? '#8a6a3a' : '#5e4424'), group: 'hat' });
    m.ball([0, 25.4], [1.2, 1.2, 1.2], { color: GOLD, group: 'tip' });
    m.box([0, 8, 8.4], [2.6, 3.6, 0.8], { color: DARK, group: 'door', over: 2 });
    m.box([0, 13, 8.4], [2.6, 2.6, 0.7], { color: RED, group: 'fu', over: 2, turn: Math.PI / 4 }); // el rombo rojo de la puerta
    m.box([0, 13, 8.9], [0.9, 0.9, 0.6], { color: GOLD, group: 'fu2', over: 3 });
    return m;
  },
  lamp() {
    const m = make();
    m.drum([0, 1], 4.2, 3.4, 1, { color: BRONZE, group: 'b' });
    m.drum([0, 3], 1.6, 1.2, 1.4, { color: BRONZE, group: 'b' });
    pole(m, 0, 4, 17, 0.9, BRONZE);
    m.ball([0, 9.6], [1.8, 1.4, 1.8], { color: GOLD, group: 'k' });
    for (const [x, y] of [[-6, 14], [6, 14], [0, 18.4]]) {
      if (x) m.chain([[0, 11], [x * 0.6, 10.6], [x, y - 1]], 0.7, 0.6, { color: BRONZE, group: `arm${x}` });
      m.drum([x, y], 1.6, 2.8, 0.9, { color: GOLD, group: `cup${x}` });
      flame(m, [x, y + 1.2], 1.25);
    }
    return m;
  },
  coins() {
    const m = make();
    coin(m, [1, 11], 10.4, 2.2);
    coin(m, [-9, 5.4, 3], 5.2, 1.6, '#c9913a');
    coin(m, [10, 4.4, 4], 4.2, 1.5, '#e0b048');
    for (const [x, z] of [[-4, 5], [4, 6], [0, 7]]) m.drum([x, 1, z], 2.4, 2.4, 1, { color: GOLD, group: `p${x}` });
    return m;
  },
  palanquin() {
    const m = make();
    for (const z of [-5, 5]) m.box([0, 6, z], [17, 0.7, 0.7], { color: WOOD, group: `bar${z}` });
    m.box([0, 9.6], [7, 6.4, 4.6], { color: (l) => (Math.abs(l[0]) < 2.8 && l[1] < 3.6 ? DEEP : Math.abs(l[1] - 4.6) < 0.8 ? GOLD : RED), group: 'cab' });
    m.box([0, 8, 4.9], [2.4, 3.8, 0.6], { color: stripe('#e8b84a', DEEP, 4, 0.4), group: 'cur', over: 2 });
    for (const x of [-6.6, 6.6]) for (const z of [-4.4, 4.4]) pole(m, x, 2, 16, 0.7, GOLD, z);
    roof(m, [0, 16], 8.4, 6, 5, '#c22a30', { dark: DEEP, ridge: GOLD });
    m.ball([0, 23.4], [1.4, 1.6, 1.4], { color: GOLD, group: 'tip' });
    for (const x of [-9, 9]) lantern(m, [x, 13, 5], 1.9);
    return m;
  },
  sacks() {
    const m = make();
    for (const [x, y, z, r] of [[-5, 3.6, 0, 4.4], [4.6, 3.4, 1, 4.2], [0, 3.4, 4, 4], [-0.6, 9, 0, 4]]) {
      m.ball([x, y, z], [r, r * 0.9, r * 0.9], { color: (l) => (l[1] > r * 0.55 ? '#8a6a44' : '#c2a070'), group: `s${x}` });
      m.limb([x, y + r * 0.8, z], [x + 0.6, y + r * 1.2, z], 1, 1.3, { color: '#c2a070', group: `s${x}` });
      m.box([x, y - 0.4, z + r * 0.86], [1.3, 1.3, 0.5], { color: RED, turn: Math.PI / 4, group: `r${x}`, over: 2 });
    }
    return m;
  },
  post,
};

// --- Buey: el arado, la noria, los arrozales y el pastor ---------------------------------

const ox = {
  wheel() {
    const m = make();
    for (const z of [-2.4, 2.4]) {
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * TAU;
        const b = ((i + 1) / 24) * TAU;
        m.limb([Math.cos(a) * 12, 14 + Math.sin(a) * 12, z], [Math.cos(b) * 12, 14 + Math.sin(b) * 12, z], 0.9, 0.9, { color: WOOD, group: `rim${z}` });
      }
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU + 0.2;
        m.limb([0, 14, z], [Math.cos(a) * 12, 14 + Math.sin(a) * 12, z], 0.6, 0.6, { color: '#7a5434', group: `sp${z}` });
      }
    }
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      m.box([Math.cos(a) * 12.4, 14 + Math.sin(a) * 12.4, 0], [1.3, 1.3, 3.4], { color: '#8a6440', turn: a, group: `pad${i}`, over: 1 });
    }
    m.drum([0, 14], 1.8, 1.8, 1.8, { color: DARK, group: 'hub', over: 2 });
    for (const x of [-5, 5]) m.limb([x * 1.5, 0, -4.4], [0, 14, -4.4], 1, 0.9, { color: WOOD, group: 'leg' });
    for (let i = 0; i < 5; i++) m.limb([-11 - i * 0.3, 10 - i * 2, 2.6], [-11.4 - i * 0.3, 8.4 - i * 2, 2.6], 0.5, 0.5, { color: '#cfe6f0', group: 'w', over: 2, flat: 3 });
    return m;
  },
  plow() {
    const m = make();
    m.chain([[13, 8], [5, 7], [-4, 4], [-8, 1.2]], 1, 1.1, { color: WOOD, group: 'beam' });
    m.chain([[-6, 2], [-10, 8], [-12, 13]], 1, 0.8, { color: '#7a5434', group: 'handle' });
    m.limb([-12.6, 12.6, -2], [-11.6, 13, 2], 0.8, 0.8, { color: WOOD, group: 'grip' });
    m.chain([[-7, 2.4], [-2, 0.6], [1, 0.2]], 1.6, 0.6, { color: '#a9b0bc', group: 'blade', over: 1 });
    m.limb([13, 8, -3], [13, 8, 3], 1, 1, { color: '#7a5434', group: 'yoke' });
    m.chain([[13, 8, -3], [14.6, 11, -2], [14, 13, 0]], 0.8, 0.6, { color: '#7a5434', group: 'yoke' });
    m.ball([4, 9], [1.2, 1.2, 1.2], { color: RED, group: 'bow', over: 2 });
    return m;
  },
  hay() {
    const m = make();
    m.drum([0, 5.4], 7.6, 5, 5.4, { color: (l) => (Math.sin(l[0] * 2.6 + l[1] * 0.4) > 0.2 ? '#c99a44' : '#93682a'), group: 'h' });
    m.ball([0, 11], [5.4, 4.6, 5], { color: (l) => (Math.sin(l[0] * 2.4) > 0.3 ? '#d8ac54' : '#a87a34'), group: 'h', blend: 1 });
    m.drum([0, 9.4], 5.9, 5.9, 0.7, { color: RED, group: 'tie', over: 1 });
    return m;
  },
  springOx() { // el buey de barro de la primavera
    const m = make();
    const clay = (l) => (Math.sin(l[0] * 1.6 + l[1] * 2.2) > 0.72 ? '#e8c45a' : '#a85a34');
    m.box([0, 1.2], [13, 1.2, 5.4], { color: STONE, group: 'b' });
    m.ball([-1, 10], [8.6, 5.4, 4.6], { color: clay, group: 'o', blend: 1.6 });
    m.ball([5, 12.4], [4.6, 4.8, 4], { color: clay, group: 'o', blend: 1.6 });
    m.ball([11, 12], [3.4, 2.9, 2.8], { color: clay, group: 'o', blend: 1.2 });
    m.ball([13.6, 11], [1.8, 1.7, 2], { color: PAPER, group: 'mz', over: 1 });
    for (const z of [-2.6, 2.6]) {
      for (const x of [-6, 5]) m.limb([x, 8, z], [x, 2.6, z], 2, 1.5, { color: clay, group: `l${x}${z}` });
      m.chain([[10.6, 14.4, z * 0.7], [11, 17.4, z * 1.5], [14, 19, z * 1.3]], 1, 0.5, { color: PAPER, group: `h${z}` });
    }
    m.ball([0, 14.6], [4.4, 1.4, 4.2], { color: (l) => (Math.abs(l[0]) > 3.2 ? GOLD : RED), group: 'cloth', over: 2 });
    m.drum([7.4, 11.4], 4.7, 4.7, 0.8, { color: RED, group: 'col', over: 1 });
    return m;
  },
  hut() {
    const m = make();
    m.box([0, 6], [9, 6, 6], { color: stripe('#8a6440', '#6a4a2e', 3.2, 0.5), group: 'w' });
    m.box([1, 4.4, 6], [2.4, 4.2, 0.8], { color: DARK, group: 'd', over: 1 });
    m.box([-5.4, 7, 6], [1.8, 1.6, 0.8], { color: '#ffb85a', flat: 3, group: 'v', over: 1 });
    roof(m, [0, 12], 12.4, 8.6, 7, '#a8803e', { dark: '#6e4e22', ridge: '#8a6230', lift: 0.8 });
    return m;
  },
  post,
};

// --- Tigre: bambú, la estela del rey (王), el tambor de guerra y el sello de bronce --------

const bamboo = (n = 7, seed = 3, tall = 46) => {
  const m = make();
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * 3 + (hash(i, 1, seed) - 0.5) * 2;
    const z = (hash(i, 2, seed) - 0.5) * 12;
    const h = tall * (0.6 + 0.4 * hash(i, 3, seed));
    const lean = (hash(i, 4, seed) - 0.5) * 7;
    const color = ['#5e8a3a', '#7da84a', '#48702f'][i % 3];
    const points = Array.from({ length: 7 }, (_, k) => [x + lean * (k / 6) ** 2, (h * k) / 6, z]);
    m.chain(points, 1.15, 0.75, { color, group: `c${i}` });
    points.slice(1, -1).forEach((p) => m.ball(p, [1.4, 0.55, 1.4], { color: '#c6d97a', group: `n${i}`, over: 1 }));
    for (let k = 2; k < 7; k++) {
      const dir = hash(i * 9 + k, 5, seed) > 0.5 ? 1 : -1;
      const p = points[k];
      for (const [dx, dy] of [[3.6, 0.6], [3, -1.4]]) m.limb(p, add(p, [dir * dx, dy + hash(k, i, seed) * 1.4, (hash(k, i, 9) - 0.5) * 3]), 0.75, 0.3, { color: k % 2 ? '#6f9a3f' : '#8fb852', group: `l${i}${k}${dy}`, over: 1 });
    }
  }
  return m;
};

export function pine(size = 1, leaf = '#2f5a3e') {
  const m = make();
  m.chain([[0, 0], [1.6, 7], [-1, 14], [2.4, 22]], 2.4, 1.1, { color: '#4a2f24', group: 't' });
  m.chain([[-0.4, 13], [-7, 17]], 1.1, 0.7, { color: '#4a2f24', group: 't' });
  m.chain([[1, 17], [9, 20]], 1, 0.6, { color: '#4a2f24', group: 't' });
  for (const [x, y, r] of [[-9, 18, 7], [10, 21, 7], [2, 26, 8.4], [-2, 21, 5]]) {
    m.ball([x, y], [r, r * 0.34, r * 0.8], { color: (l) => (l[1] < -r * 0.06 ? '#1c3a2e' : leaf), group: `c${x}`, over: 1 });
    m.ball([x + 1, y + r * 0.26], [r * 0.6, r * 0.26, r * 0.5], { color: leaf, group: `c${x}`, over: 1 });
  }
  return size === 1 ? m : m.scale(size);
}

const tiger = {
  bamboo: () => bamboo(8, 3, 50),
  stele() {
    const m = make();
    m.box([0, 1.6], [8.4, 1.6, 4.4], { color: STONE, group: 'b', round: 0.6 });
    const king = (l) => {
      const line = Math.abs(l[0]) < 3.2 && (Math.abs(l[1] - 4.4) < 0.75 || Math.abs(l[1]) < 0.75 || Math.abs(l[1] + 4.4) < 0.75);
      return l[2] > 1.2 && (line || (Math.abs(l[0]) < 0.75 && Math.abs(l[1]) < 4.6)) ? '#e0301f' : '#6d6a78';
    };
    m.box([0, 14], [6, 11, 2.7], { color: king, group: 's', round: 0.8 });
    m.ball([0, 25], [6.4, 3.4, 3], { color: '#5d5a6a', group: 't' });
    m.ball([0, 26, 2], [2, 1.6, 1.4], { color: GOLD, group: 'g', over: 1 });
    return m;
  },
  drum() {
    const m = make();
    for (const x of [-6, 6]) {
      m.limb([x, 0, -4], [x * 0.7, 10, -2], 1.3, 1.2, { color: WOOD, group: `a${x}` });
      m.limb([x, 0, 4], [x * 0.7, 10, 2], 1.3, 1.2, { color: WOOD, group: `b${x}` });
    }
    m.ball([0, 15], [9.4, 9.4, 5], { color: (l) => (l[2] > 2.6 ? (Math.hypot(l[0], l[1]) < 3 ? '#1f1a24' : PAPER) : RED), group: 'd' });
    for (let i = 0; i < 12; i++) m.ball([Math.cos((i / 12) * TAU) * 8.4, 15 + Math.sin((i / 12) * TAU) * 8.4, 2.6], [0.7, 0.7, 0.9], { color: GOLD, group: `n${i}`, over: 1 });
    return m;
  },
  banner() {
    const m = make();
    pole(m, 0, 0, 40, 0.8);
    m.ball([0, 41], [1.2, 1.8, 1.2], { color: GOLD, group: 't' });
    m.box([5.6, 29], [5.4, 8.4, 0.9], { color: (l) => (Math.abs(l[0]) > 4.2 || Math.abs(l[1]) > 7.2 ? GOLD : Math.sin(l[0] * 2 + l[1]) > 0.6 && Math.abs(l[0]) < 3 ? '#2a1010' : '#c9641a'), group: 'f' });
    m.box([5.6, 36.8], [6, 0.7, 0.8], { color: WOOD, group: 'b', over: 1 });
    for (let i = 0; i < 4; i++) m.limb([1.6 + i * 2.7, 20.6, 0], [2 + i * 2.7, 17.6, 0], 0.8, 0.3, { color: '#c9641a', group: `p${i}` });
    return m;
  },
  tally() { // el sello de mando, con forma de tigre (虎符)
    const m = make();
    m.box([0, 1.6], [12, 1.6, 4.6], { color: DARK, group: 'b' });
    const bronze = (l) => (Math.sin(l[0] * 1.8 + l[1]) > 0.55 ? '#c9a24a' : '#5f7a5a');
    m.ball([-1, 8.4], [9, 3.6, 3], { color: bronze, group: 't', blend: 1.4 });
    m.ball([8.4, 11], [3.6, 3.4, 3], { color: bronze, group: 't', blend: 1.2 });
    m.ball([11, 9.8], [1.8, 1.6, 2], { color: bronze, group: 't', blend: 0.8 });
    for (const z of [-2, 2]) {
      m.limb([6, 8, z], [9, 3.6, z], 1.6, 1.2, { color: bronze, group: `f${z}` });
      m.limb([-6, 8, z], [-5, 3.6, z], 2, 1.3, { color: bronze, group: `h${z}` });
      m.ball([7.4, 14, z], [1.1, 1.2, 0.8], { color: bronze, group: `e${z}` });
    }
    m.chain([[-9, 9], [-13, 11], [-13, 15], [-10.6, 16]], 1.1, 0.8, { color: bronze, group: 'q' });
    return m;
  },
  pine: () => pine(),
};

// --- Conejo: la luna, el mortero del elixir, el osmanto y los pasteles de luna ---------------

const rabbit = {
  osmanthus() {
    const m = make();
    m.chain([[0, 0], [-1, 8], [1.6, 15]], 2.6, 1.6, { color: '#4a3a44', group: 't' });
    m.chain([[0.4, 12], [8, 18]], 1.3, 0.8, { color: '#4a3a44', group: 't' });
    m.chain([[0, 11], [-8, 17]], 1.3, 0.8, { color: '#4a3a44', group: 't' });
    foliage(m, [1, 24], 11, '#4f6a6a', 3, 9, 'leaf', '#ffd45e');
    foliage(m, [-9, 19], 6, '#456060', 5, 5, 'leaf2', '#ffd45e');
    foliage(m, [10, 20], 6, '#5a7676', 7, 5, 'leaf3', '#ffd45e');
    return m;
  },
  mortar() {
    const m = make();
    m.drum([0, 1.4], 6, 5, 1.4, { color: '#8f92b0', group: 'b' });
    m.drum([0, 7.4], 4.4, 7, 4.8, { color: (l) => (Math.abs(l[1] - 2.6) < 0.8 ? GOLD : '#c9cbe6'), group: 'c' });
    m.drum([0, 12], 5.6, 5.6, 0.5, { color: '#5a5c86', group: 'in', over: 1 });
    m.limb([1, 11], [7, 24], 1.2, 1.2, { color: '#e8e6f5', group: 'p' });
    m.ball([7.2, 24.6], [2.2, 2.2, 2.2], { color: '#e8e6f5', group: 'p' });
    m.ball([1, 11.4], [1.8, 1.8, 1.8], { color: '#e8e6f5', group: 'p' });
    for (let i = 0; i < 4; i++) m.ball([-3 + i * 2, 13.4 + (i % 2) * 1.6, 1], 0.7, { color: '#ffe9a8', flat: 4, group: `e${i}`, over: 3 });
    return m;
  },
  rabbitLantern() {
    const m = make();
    pole(m, 0, 0, 26, 0.7, '#5a4a6a');
    m.limb([0, 25.4], [8, 25.4], 0.6, 0.6, { color: '#5a4a6a', group: 'a' });
    const paper = (l) => (Math.hypot(l[0], l[1]) < 2 ? '#fff6d8' : '#ffd9e6');
    m.ball([7, 15.4], [5.2, 4, 3.4], { color: paper, group: 'r', flat: 3, blend: 1 });
    m.ball([11.4, 17.6], [3, 2.7, 2.4], { color: paper, group: 'r', flat: 3, blend: 1 });
    for (const z of [-2, 2]) m.limb([10.4, 19, z * 0.6], [8 + z * 0.5, 24.4, z], 1.1, 0.9, { color: '#ff9fc0', group: `e${z}`, flat: 2 });
    m.ball([1.8, 16], [1.4, 1.4, 1.4], { color: '#ffffff', group: 'c', flat: 3 });
    m.limb([7, 11.4], [7, 8.4], 0.5, 0.4, { color: RED, group: 't' });
    m.dot([12.4, 18, 3], '#8a1f3d');
    return m;
  },
  pavilion() {
    const m = make();
    m.box([0, 1.4], [13, 1.4, 9], { color: '#9a9cbc', group: 'b' });
    for (const x of [-9, -3, 3, 9]) for (const z of [-6, 6]) pole(m, x, 2.8, 15, 0.9, '#8a3a56', z);
    m.box([0, 5], [9, 0.7, 6.4], { color: '#c9cbe6', group: 'r' });
    roof(m, [0, 15], 13.4, 9.6, 6, '#5d6aa8', { dark: '#39437a' });
    m.box([0, 22.6], [5.4, 2.4, 3.6], { color: '#8a3a56', group: 'u' });
    roof(m, [0, 25], 8, 5.8, 5.4, '#5d6aa8', { dark: '#39437a' });
    m.ball([0, 32], [1.4, 2, 1.4], { color: GOLD, group: 'k' });
    for (const x of [-10, 10]) lantern(m, [x, 12, 8], 1.7, { color: '#ffd9a0' });
    return m;
  },
  moonGate() {
    const m = make();
    m.box([0, 11], [16, 11, 2.4], { color: (l) => (Math.hypot(l[0], l[1] + 1) < 8.4 ? '#f4efd0' : Math.hypot(l[0], l[1] + 1) < 9.8 ? '#5a5c86' : '#c9cbe6'), group: 'w' });
    roof(m, [0, 22], 18, 4, 3.4, '#5d6aa8', { dark: '#39437a', lift: 1.4 });
    return m;
  },
  cakes() {
    const m = make();
    m.drum([0, 1], 8.4, 9, 1, { color: '#5d6aa8', group: 'p' });
    for (const [x, y, z] of [[-4, 3.6, 2], [4, 3.6, 2], [0, 3.6, -3], [0, 7.4, 0]]) m.drum([x, y, z], 3.9, 3.9, 1.8, { color: (l) => (l[1] > 1 && (Math.hypot(l[0], l[2]) < 1.2 || Math.abs(Math.hypot(l[0], l[2]) - 2.6) < 0.5) ? '#7a4418' : Math.sin(Math.atan2(l[2], l[0]) * 8) > 0.6 ? '#a8642a' : '#d89a4a'), group: `c${x}${y}` });
    return m;
  },
};

// --- Dragón: la perla de fuego, la Puerta del Dragón, las carpas y las columnas --------------

const coil = (m, r, y0, y1, turns, color, crest = GOLD) => {
  const n = 46;
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    const a = k * turns * TAU;
    m.ball([Math.cos(a) * r, lerp(y0, y1, k), Math.sin(a) * r], 1.7 - 0.7 * Math.abs(k - 0.5), { color: i % 4 === 0 ? crest : color, group: 'dr', over: 1, blend: 0.4 });
  }
};
/** Un islote que flota: piedra que se afila hacia abajo, con su pasto arriba. */
export const islet = (m, r, rock = '#3f6f6a', top = '#4fae8a') => {
  m.ball([0, -1], [r, 2.6, r * 0.7], { color: (l) => (l[1] > 0.6 ? top : rock), group: 'is', blend: 1.6 });
  m.drum([0, -r * 0.55], 0.6, r * 0.8, r * 0.5, { color: (l) => (Math.sin(l[0] * 1.9) > 0.4 ? '#244a4c' : rock), group: 'is', blend: 1.2, flatten: 0.7 });
};

const dragon = {
  gate() { // la Puerta del Dragón (龙门)
    const m = make();
    for (const x of [-14, 14]) {
      m.drum([x, 1.4], 3.4, 2.8, 1.4, { color: '#cfe9e4', group: `b${x}` });
      pole(m, x, 2, 25, 1.7, RED);
      m.ball([x, 14], [2.1, 1, 2.1], { color: GOLD, group: `k${x}`, over: 1 });
    }
    m.box([0, 21.4], [17, 1.6, 1.6], { color: (l) => (Math.sin(l[0] * 1.2) > 0.2 ? JADE : GOLD), group: 'bar' });
    m.box([0, 17.6], [4.4, 2.2, 1.2], { color: (l) => (Math.max(Math.abs(l[0]) / 4.4, Math.abs(l[1]) / 2.2) > 0.76 ? GOLD : '#16324a'), group: 'sign' });
    roof(m, [0, 25], 19, 4.6, 4.6, '#2f8f7a', { dark: '#17564e' });
    m.box([0, 30.4], [7, 1.6, 1.4], { color: RED, group: 'u' });
    roof(m, [0, 32], 10, 3.6, 3.8, '#2f8f7a', { dark: '#17564e' });
    for (const x of [-1, 1]) m.chain([[x * 2, 36.4], [x * 5, 37.6], [x * 6.4, 40]], 0.9, 0.6, { color: GOLD, group: `t${x}` });
    return m;
  },
  pearl() { // la perla llameante
    const m = make();
    islet(m, 9);
    m.drum([0, 3.4], 3.6, 2.4, 2.4, { color: GOLD, group: 'p' });
    m.ball([0, 12.4], [5.6, 5.6, 5.6], { color: (l) => (l[0] < -1 && l[1] > 1.4 ? '#ffffff' : '#bff2e0'), group: 'o' });
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU;
      m.chain([[Math.cos(a) * 5, 12.4 + Math.sin(a) * 5, 0], [Math.cos(a) * 7.6 + 1, 12.4 + Math.sin(a) * 7.6, 0], [Math.cos(a) * 8.6, 14.6 + Math.sin(a) * 9, 0]], 1.5, 0.4, { color: i % 2 ? '#ff6a3c' : '#ffb04a', group: `f${i}`, over: -1 });
    }
    return m;
  },
  column() {
    const m = make();
    islet(m, 8);
    m.drum([0, 2], 5, 4.2, 1.4, { color: '#cfe9e4', group: 'b' });
    m.drum([0, 20], 3, 2.7, 18, { color: '#8fc9bb', group: 'c' });
    coil(m, 3.9, 5, 33, 3.2, '#d8452c');
    m.drum([0, 38.6], 3, 4.8, 1.2, { color: '#cfe9e4', group: 't' });
    m.ball([0, 42.4], [2.2, 2.6, 2.2], { color: GOLD, group: 'g' });
    return m;
  },
  carp() {
    const m = make();
    const body = (l) => (l[1] < -0.8 ? '#fff0d8' : Math.sin(l[0] * 2.4) * Math.sin(l[1] * 2.8) > 0.35 ? '#ff8a3c' : '#e8452c');
    m.ball([0, 15], [8, 4.2, 3], { turn: 0.7, color: body, group: 'f', blend: 1.4 });
    m.ball([4.6, 19.4], [3.6, 3, 2.6], { turn: 0.7, color: body, group: 'f', blend: 1 });
    for (const a of [2.6, 3.3, 4]) m.limb([-5, 10, 0], [-5 + Math.cos(a) * 6, 10 + Math.sin(a) * 5, 0], 1.4, 0.4, { color: '#ffb04a', group: `q${a}` });
    m.chain([[-1, 18.6], [1, 21.6], [-3, 21]], 1.1, 0.4, { color: '#ffb04a', group: 'd' });
    m.dot([6.4, 20.6, 3], '#1b1226');
    for (let i = 0; i < 8; i++) {
      const x = -9 + i * 2.4;
      m.ball([x, 1 + Math.abs(Math.sin(i * 1.3)) * 3, (i % 2) * 2 - 1], [2, 1.8, 2], { color: i % 2 ? '#dff6ee' : '#8fd6c4', group: 'w', blend: 1 });
    }
    return m;
  },
  shrine() {
    const m = make();
    islet(m, 13);
    m.box([0, 6], [7, 5, 5], { color: RED, group: 'w' });
    m.box([0, 5, 5], [2, 3.8, 0.7], { color: DARK, group: 'd', over: 1 });
    roof(m, [0, 11], 11, 8, 5, '#2f8f7a', { dark: '#17564e' });
    m.box([0, 17.4], [4.4, 2.2, 3.2], { color: RED, group: 'w2' });
    roof(m, [0, 19.6], 7, 5, 4.6, '#2f8f7a', { dark: '#17564e' });
    return m;
  },
};

// --- Serpiente: la Serpiente Blanca, la pagoda Leifeng, el puente, el loto y la sombrilla -----

const pagoda = (tiers, w, wall, tile, dark) => {
  const m = make();
  m.box([0, 1.6], [w + 3, 1.6, w * 0.8 + 2], { color: STONE, group: 'b' });
  let y = 3.2;
  for (let i = 0; i < tiers; i++) {
    const k = 1 - i * (0.62 / tiers);
    const hw = w * k;
    m.drum([0, y + 2.8], hw, hw * 0.96, 2.8, { color: (l) => (Math.abs(Math.abs(l[0]) - hw * 0.52) < 0.8 || Math.abs(l[0]) < 1 ? (l[1] < 1.2 ? (i % 2 ? '#ffb85a' : DARK) : wall) : wall), group: `w${i}` });
    roof(m, [0, y + 5.4], hw + 3, hw * 0.9 + 2, 3.2, tile, { dark, ridge: dark });
    y += 8.2;
  }
  m.drum([0, y + 2], 1.6, 0.5, 3.4, { color: GOLD, group: 's' });
  m.ball([0, y + 6], [1.2, 1.2, 1.2], { color: GOLD, group: 's2' });
  return m;
};

const snake = {
  pagoda: () => pagoda(5, 9, '#a8552e', '#3f5a4a', '#24382e'),
  bridge() {
    const m = make();
    for (let i = 0; i <= 22; i++) {
      const k = i / 22;
      const x = lerp(-24, 24, k);
      const top = 3 + Math.sin(k * Math.PI) * 11;
      m.box([x, top, 0], [1.4, 1.5, 4.6], { color: i % 2 ? '#9a9c8e' : '#878a7c', group: `t${i}` });
      if (Math.abs(x) > 8) m.box([x, top / 2, 0], [1.3, top / 2, 4.2], { color: i % 2 ? '#76796c' : '#666a5e', group: `p${i}` });
      if (i % 3 === 1) for (const z of [-4.4, 4.4]) m.box([x, top + 3, z], [0.8, 1.8, 0.8], { color: '#b5b8a8', group: `r${i}${z}` });
    }
    for (let i = 0; i < 22; i++) for (const z of [-4.4, 4.4]) m.limb([lerp(-24, 24, i / 22), 6.4 + Math.sin((i / 22) * Math.PI) * 11, z], [lerp(-24, 24, (i + 1) / 22), 6.4 + Math.sin(((i + 1) / 22) * Math.PI) * 11, z], 0.5, 0.5, { color: '#b5b8a8', group: `rail${z}` });
    return m;
  },
  willow() {
    const m = make();
    m.chain([[0, 0], [-1.6, 10], [1, 20]], 2.6, 1.6, { color: '#4a3a2a', group: 't' });
    foliage(m, [1, 27], 9, '#5f8f3f', 4, 7);
    for (let i = 0; i < 15; i++) {
      const x = -12 + i * 1.8;
      const z = (hash(i, 1, 4) - 0.5) * 10;
      const top = 29 - Math.abs(x) * 0.35;
      const len = 12 + hash(i, 2, 4) * 11;
      m.chain([[x, top, z], [x * 1.08, top - len * 0.5, z], [x * 1.06 - 1, top - len, z]], 0.95, 0.45, { color: ['#6fa348', '#8fbf5a', '#4f7f38'][i % 3], group: `h${i}` });
    }
    return m;
  },
  umbrella() { // la sombrilla de papel aceitado
    const m = make();
    m.limb([0, 0], [3, 20], 0.8, 0.7, { color: WOOD, group: 's' });
    m.drum([3.4, 20.6], 11, 0.8, 3.4, { color: (l) => (Math.sin(Math.atan2(l[2], l[0]) * 9) > 0.7 ? DEEP : Math.hypot(l[0], l[2]) > 8.6 ? GOLD : Math.hypot(l[0], l[2]) > 4.6 && Math.hypot(l[0], l[2]) < 5.8 ? '#f4e6c8' : '#d8452c'), group: 'u' });
    m.ball([3.6, 24.6], [1, 1.4, 1], { color: GOLD, group: 'k' });
    return m;
  },
  lotus() {
    const m = make();
    for (const [x, z, r] of [[-7, 2, 5.6], [5, 4, 5], [0, -4, 4.6], [11, -1, 4]]) m.ball([x, 1.2, z], [r, 0.9, r * 0.8], { color: (l) => (Math.abs(l[0]) < 0.5 || Math.hypot(l[0], l[2]) > r * 0.8 ? '#2f6b4a' : '#4f9a5e'), group: `p${x}` });
    for (const [x, y, z, k] of [[-3, 11, 0, 1], [7, 8, 2, 0.8]]) {
      m.limb([x * 0.7, 0, z], [x, y - 2, z], 0.6, 0.6, { color: '#3f7a4a', group: `s${x}` });
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * TAU;
        m.limb([x, y - 1.6 * k, z], [x + Math.cos(a) * 4 * k, y + 2.2 * k - Math.abs(Math.cos(a)) * 1.2, z + Math.sin(a) * 4 * k], 1.4 * k, 0.5, { color: i % 2 ? '#ffc2d6' : '#ff9abb', group: `f${x}${i}` });
      }
      m.ball([x, y, z], [1.4 * k, 1.4 * k, 1.4 * k], { color: GOLD, group: `c${x}`, over: 1 });
    }
    return m;
  },
  boat() {
    const m = make();
    for (let i = 0; i <= 14; i++) {
      const k = i / 14;
      m.ball([lerp(-16, 16, k), 2 + (2 * k - 1) ** 4 * 4, 0], [1.8, 1.6, 4.4 * (1 - 0.6 * (2 * k - 1) ** 4)], { color: i % 3 ? WOOD : '#7a5434', group: 'h', blend: 0.6 });
    }
    m.ball([-1, 5.4], [7.4, 5, 4.2], { color: stripe('#a8803e', '#6e4e22', 1.8), group: 'c' });
    lantern(m, [8.4, 8, 0], 1.6);
    m.limb([8.4, 3, 0], [8.4, 11.4, 0], 0.5, 0.5, { color: DARK, group: 'p' });
    return m;
  },
};

// --- Lo que pasa cerca de quien mira (siluetas bajas) -------------------------------------

export const tuft = (color, tip, n = 16, seed = 1, tall = 8) => {
  const m = make();
  for (let i = 0; i < n; i++) {
    const x = -9 + (18 * (i + hash(i, 4, seed) * 0.8)) / n;
    const h = tall * (0.35 + 0.65 * hash(i, 1, seed)) * (1 - 0.4 * Math.abs(x / 9));
    const lean = x * 0.25 + (hash(i, 3, seed) - 0.5) * 4;
    const z = (hash(i, 5, seed) > 0.5 ? 2 : 0);
    m.chain([[x, -1, z], [x + lean * 0.3, h * 0.55, z], [x + lean, h, z]], 0.85, 0.4, { color: (l) => (i % 3 === 0 ? tip : color), group: `g${i}` });
  }
  return m;
};
export const boulder = (color, moss, seed = 1) => {
  const m = make();
  for (let i = 0; i < 4; i++) m.ball([(hash(i, 1, seed) - 0.5) * 14, 2 + hash(i, 2, seed) * 2, 0], [3 + hash(i, 3, seed) * 3, 2.6 + hash(i, 4, seed) * 2, 3], { color: (l) => (l[1] > 1.4 ? moss : color), group: 'r', blend: 1.4 });
  return m;
};

export const PIECES_A = { rat, ox, tiger, rabbit, dragon, snake };
