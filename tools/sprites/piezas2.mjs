// Los objetos de los mundos del Caballo, la Cabra, el Mono, el Gallo, el Perro y el Cerdo (los demás, en
// piezas.mjs, donde también están los techos, las linternas y lo que comparten).

import { lerp, TAU } from './modelo3d.mjs';
import { hash } from './ruido.mjs';
import { C, coin, flame, foliage, islet, lantern, lit, make, pine, pole, post, roof, stripe } from './piezas.mjs';

const { RED, DEEP, GOLD, BRONZE, WOOD, DARK, STONE, PAPER } = C;

// --- Caballo: la Ruta de la Seda, la Gran Muralla, las almenaras y el caballo de bronce --------

const wall = (m, x, y, w, h, color = '#9a5a3a', dark = '#6e3a26') => {
  m.box([x, y + h / 2, 0], [w, h / 2, 4.6], { color: (l) => (Math.sin(l[1] * 2.6) > 0.8 || Math.sin(l[0] * 1.5 + Math.floor(l[1] / 2.4) * 1.6) > 0.94 ? dark : color), group: `w${x}` });
  for (let i = -Math.floor(w / 3); i <= Math.floor(w / 3); i++) for (const z of [-3.8, 3.8]) m.box([x + i * 3, y + h + 1.2, z], [0.95, 1.3, 0.8], { color, group: `m${x}${i}${z}` });
};

const horse = {
  beacon() {
    const m = make();
    wall(m, 0, 0, 8, 20);
    m.box([0, 8, 4.8], [2, 3.4, 0.6], { color: DARK, group: 'd', over: 1 });
    m.box([0, 26], [4.4, 3, 3], { color: '#7a4630', group: 'u' });
    roof(m, [0, 29], 7, 5, 4, '#5a2f28', { dark: '#36191a' });
    flame(m, [-6, 23.6, 0], 2.2);
    for (let i = 0; i < 5; i++) m.ball([-6.4 + i * 0.9 + Math.sin(i) * 1.2, 30 + i * 4, 0], [1.6 + i * 0.5, 1.5 + i * 0.4, 1.6], { color: '#6e4a4a', group: 'sm', over: -1, blend: 1 });
    return m;
  },
  wall() {
    const m = make();
    for (let i = 0; i < 7; i++) wall(m, -27 + i * 9, Math.sin(i * 0.9) * 2, 4.6, 10 + Math.sin(i * 0.9) * 2.4);
    return m;
  },
  banner() {
    const m = make();
    pole(m, 0, 0, 38, 0.8);
    m.ball([0, 39], [1, 2, 1], { color: GOLD, group: 't' });
    for (let i = 0; i < 12; i++) m.box([1 + i * 1.2, 31 + Math.sin(i * 0.7) * 1.4, Math.cos(i * 0.7) * 1.4], [0.8, 5 - i * 0.26, 1.3], { color: i % 4 === 3 ? GOLD : RED, group: `f${i}` });
    m.ball([0, 34.4], [2.4, 1.4, 2.4], { color: '#2a1010', group: 'h', over: 1 }); // la crin de la lanza
    return m;
  },
  bronze() { // el caballo volador de Gansu
    const m = make();
    const c = (l) => (Math.sin(l[0] * 1.3 + l[1] * 1.7) > 0.65 ? '#6fae8a' : '#4a7a64');
    m.box([0, 1.6], [8.4, 1.6, 4.4], { color: DARK, group: 'b' });
    m.box([0, 4], [6.4, 0.9, 3.4], { color: BRONZE, group: 'b2' });
    m.ball([-1, 14.4], [6.4, 3.6, 3], { turn: 0.1, color: c, group: 'h', blend: 1.6 });
    m.limb([4, 15.6], [8, 22], 2.6, 1.7, { color: c, group: 'h', blend: 1.2 });
    m.limb([7.6, 22.4], [12, 20.6], 1.9, 1.2, { color: c, group: 'h', blend: 1 });
    m.chain([[3.4, 13.4, 1.4], [8.6, 12, 1.4], [10.6, 8.4, 1.4]], 1.4, 0.8, { color: c, group: 'a' });
    m.chain([[3, 13, -1.4], [4, 8, -1.4], [7, 5.4, -1.4]], 1.4, 0.8, { color: c, group: 'b1' });
    m.chain([[-5, 13.4, 1.4], [-5.6, 8.4, 1.4], [-2, 5.4, 1.4]], 1.8, 0.8, { color: c, group: 'c' });
    m.chain([[-6, 13.6, -1.4], [-11, 11, -1.4], [-13.4, 13, -1.4]], 1.7, 0.8, { color: c, group: 'd' });
    m.chain([[-7, 16], [-12, 19.4], [-14.4, 18]], 1.4, 0.7, { color: c, group: 't' });
    for (const z of [-0.8, 0.8]) m.limb([7.6, 23.4, z], [7.4, 25.6, z], 0.7, 0.3, { color: c, group: `e${z}` });
    return m;
  },
  lances() {
    const m = make();
    for (const x of [-7, 7]) m.box([x, 5], [0.8, 5, 4], { color: WOOD, group: `r${x}` });
    m.box([0, 8.6], [8, 0.7, 0.8], { color: WOOD, group: 'r' });
    for (let i = 0; i < 5; i++) {
      const x = -6 + i * 3;
      const top = 27 + (i % 2) * 3;
      m.limb([x - 1, 0, 0], [x + 1, top, 0], 0.7, 0.7, { color: '#7a5434', group: `p${i}` });
      m.limb([x + 1, top, 0], [x + 1.4, top + 4.6, 0], 1.1, 0.4, { color: '#c9ccd6', group: `b${i}`, over: 1 });
      m.ball([x + 0.9, top - 1, 0], [1.2, 1.1, 1.2], { color: RED, group: `t${i}`, over: 1 });
    }
    return m;
  },
  agaves() { // un campito de agave azul, con su quiote
    const m = make();
    for (const [x, z, k] of [[-10, -3, 0.9], [9, -2, 1], [0, 4, 1.15]]) {
      for (let ring = 0; ring < 3; ring++) {
        const n = 8 - ring * 2;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * TAU + ring * 0.5;
          const up = [4.6, 8.4, 11][ring] * k;
          const out = [8.4, 6, 2.6][ring] * k;
          const tip = [x + Math.cos(a) * out, up, z + Math.sin(a) * out * 0.8];
          m.chain([[x, 0.8, z], [x + Math.cos(a) * out * 0.5, up * 0.62, z + Math.sin(a) * out * 0.4], tip], 1.7 * k, 0.35, { color: (l) => (l[0] > 0.86 ? '#7a3a34' : (i + ring) % 2 ? '#4f9296' : '#6fb3ac'), group: `l${x}${ring}${i}`, blend: 0.2 });
        }
      }
    }
    m.limb([-10, 4, -3], [-10.6, 27, -3], 0.9, 0.7, { color: '#8a9a4a', group: 'quiote' });
    for (let i = 0; i < 5; i++) for (const s of [-1, 1]) m.ball([-10.4 + s * (3.6 - i * 0.5), 18.4 + i * 2.2, -3], [1.4, 1.1, 1.3], { color: i % 2 ? '#e8c45a' : '#f2dc8a', group: `f${i}${s}`, over: 1 });
    return m;
  },
  stupa() { // una torre de la Ruta de la Seda
    const m = make();
    m.box([0, 2], [9, 2, 7], { color: '#a8623e', group: 'b' });
    m.ball([0, 9], [7.4, 6.6, 6.4], { color: (l) => (Math.abs(l[1] + 1) < 0.8 ? GOLD : '#e0b48a'), group: 'd' });
    m.box([0, 16.4], [3, 1.6, 3], { color: '#a8623e', group: 'c' });
    m.drum([0, 22], 2.8, 0.6, 4.6, { color: (l) => (Math.sin(l[1] * 3) > 0 ? GOLD : '#b3702c'), group: 's' });
    return m;
  },
};

// --- Cabra: los tres soles, la vasija de los cuatro carneros, las espigas y las yurtas ----------

const goat = {
  yurt() {
    const m = make();
    m.drum([0, 5], 10, 10, 5, { color: (l) => (Math.abs(l[1] - 2.4) < 0.9 ? RED : Math.sin(l[0] * 1.4) > 0.86 ? '#b8b4a4' : '#ece6d6'), group: 'w', flatten: 0.8 });
    m.drum([0, 13], 11.4, 2.4, 3.4, { color: stripe('#e4decb', '#bdb7a4', 1.3), group: 'r', flatten: 0.8 });
    m.drum([0, 17.4], 2.6, 2, 1, { color: RED, group: 't' });
    m.box([0, 4.4, 8], [2.6, 4.4, 0.8], { color: (l) => (Math.abs(l[0]) > 1.8 ? GOLD : '#2f5a8a'), group: 'd', over: 1 });
    for (const x of [-5.8, 5.8]) lit(m, [x, 5.6, 6.6], 1.4, 1.6, { frame: RED, deep: 1.2 });
    m.light([0, 18.6, 1], 6, '#ffc46a', 0.34); // el fuego de adentro, que asoma por el techo
    return m;
  },
  wheat() {
    const m = make();
    for (let i = 0; i < 13; i++) {
      const x = -9 + i * 1.5;
      const h = 13 + hash(i, 1, 2) * 8;
      const bend = (hash(i, 2, 2) - 0.3) * 6;
      const z = (hash(i, 3, 2) - 0.5) * 8;
      m.chain([[x * 0.5, 0, z], [x * 0.8, h * 0.6, z], [x + bend * 0.6, h, z]], 0.6, 0.5, { color: '#a8a04a', group: `s${i}` });
      m.limb([x + bend * 0.6, h, z], [x + bend, h + 4, z], 1.2, 0.5, { color: i % 2 ? '#e8c45a' : '#c99a34', group: `e${i}` });
    }
    m.drum([0, 5], 5, 5.4, 0.9, { color: RED, group: 'tie', over: 1 });
    return m;
  },
  zun() { // la vasija de los cuatro carneros (四羊方尊)
    const m = make();
    const b = (l) => (Math.sin(l[0] * 2.4) * Math.sin(l[1] * 2.2) > 0.3 ? '#3f6a58' : '#5f8a72');
    m.box([0, 2.4], [5.4, 2.4, 4.6], { color: b, group: 'f' });
    m.box([0, 9], [7.4, 4.4, 6], { color: b, group: 'v', round: 1.6 });
    for (let i = 0; i < 5; i++) m.box([0, 14 + i * 1.6], [4.4 + i * 1.1, 0.9, 3.6 + i * 0.8], { color: b, group: `n${i}` });
    for (const x of [-1, 1]) {
      m.ball([x * 8.4, 11, 3.6], [2.4, 2.4, 2.4], { color: b, group: `r${x}` });
      m.ball([x * 10, 9.8, 4.4], [1.4, 1.3, 1.5], { color: b, group: `r${x}`, blend: 0.6 });
      m.chain([[x * 7.4, 13, 3.6], [x * 9, 14.6, 5.4], [x * 10.4, 12.6, 6.4], [x * 9.6, 10.8, 6.6]], 1, 0.6, { color: '#8fb89a', group: `h${x}`, over: 1 });
    }
    return m;
  },
  flags() {
    const m = make();
    for (const x of [-17, 17]) pole(m, x, 0, 26, 0.8);
    const colors = ['#2f6fb0', '#f0ece0', RED, '#3f8f5a', '#e8c03a'];
    for (let i = 0; i < 10; i++) {
      const k = (i + 0.5) / 10;
      m.box([lerp(-17, 17, k), 22.8 - Math.sin(k * Math.PI) * 6, 0], [1.4, 2, 1.2], { color: colors[i % 5], group: `f${i}`, turn: Math.sin(i * 2.1) * 0.15 });
    }
    m.chain(Array.from({ length: 9 }, (_, i) => [lerp(-17, 17, i / 8), 25.4 - Math.sin((i / 8) * Math.PI) * 6, 0]), 0.35, 0.35, { color: DARK, group: 'rope' });
    return m;
  },
  plum() {
    const m = make();
    const bark = { color: '#3a2a2e', group: 't' };
    m.chain([[0, 0], [-2, 7], [1.6, 12], [-1, 18]], 2, 1, bark);
    m.chain([[1, 12], [8, 15], [11, 20]], 1, 0.5, bark);
    m.chain([[-1, 9], [-8, 13], [-10, 19]], 1, 0.5, bark);
    m.chain([[-1, 17], [4, 22], [5, 26]], 0.9, 0.5, bark);
    const tips = [[11, 20], [8, 15.6], [-10, 19], [-8, 13.6], [5, 26], [4, 22], [-1, 18.6], [10, 18], [-9, 16.4], [1, 24], [13, 21.4], [-12, 20.4]];
    tips.forEach(([x, y], i) => {
      m.ball([x, y, (hash(i, 1) - 0.5) * 6], [1.9, 1.7, 1.8], { color: i % 3 ? '#ffc2d0' : '#ff8fab', group: `b${i}`, over: 1 });
      m.dot([x, y, 4], '#ffe9a8');
    });
    return m;
  },
  fence() {
    const m = make();
    for (let i = 0; i < 5; i++) m.box([-16 + i * 8, 5, 0], [1, 5, 1], { color: '#8a7a64', group: `p${i}` });
    for (const y of [4, 7.6]) m.limb([-18, y, 0], [18, y + 0.6, 0], 0.7, 0.7, { color: '#a08f76', group: `r${y}` });
    return m;
  },
};

// --- Mono: los duraznos de la inmortalidad, la cueva de la cascada, la calabaza y el bastón -------

const monkey = {
  peach() {
    const m = make();
    m.chain([[0, 0], [2, 8], [-1, 14]], 2.6, 1.4, { color: '#4a3020', group: 't' });
    m.chain([[0, 12], [8, 18]], 1.3, 0.8, { color: '#4a3020', group: 't' });
    foliage(m, [0, 23], 10, '#5a7a2a', 11, 8);
    foliage(m, [10, 19], 6, '#4a6a24', 13, 5, 'l2');
    for (const [x, y, z] of [[-6, 18, 6], [4, 17, 7], [11, 15, 4], [0, 24, 8], [-9, 24, 4], [7, 25, 6]]) {
      m.ball([x, y, z], [2.2, 2.3, 2], { color: (l) => (l[0] < -0.2 ? '#ffd0a8' : '#ff8a8a'), group: `d${x}`, over: 2 });
      m.dot([x, y + 2, z + 1], '#7a3a1a');
    }
    return m;
  },
  gourd() {
    const m = make();
    m.drum([0, 0.8], 5.6, 4.6, 0.8, { color: DARK, group: 'b' });
    m.ball([0, 7.4], [7.2, 6.6, 6.4], { color: (l) => (Math.abs(l[1]) < 1.6 && Math.abs(l[0]) < 3 && l[2] > 4 ? RED : '#d89a3a'), group: 'g', blend: 1.6 });
    m.ball([0, 17], [4.6, 4.4, 4.2], { color: '#e0a848', group: 'g', blend: 1.6 });
    m.drum([0, 12.6], 4.2, 4.2, 0.8, { color: RED, group: 'tie', over: 1 });
    m.chain([[0, 21], [1.4, 24], [-1, 26]], 1, 0.6, { color: '#5a7a2a', group: 's' });
    m.chain([[4, 12.4, 2], [7, 8, 3], [6.4, 3, 3]], 0.8, 0.5, { color: RED, group: 'cord', over: 1 });
    return m;
  },
  cave() { // la cueva detrás de la cortina de agua
    const m = make();
    const rock = (l, p) => (hash(Math.floor(p[0] * 0.4), Math.floor(p[1] * 0.3), 5) > 0.6 ? '#7a5a30' : '#8f6c3a');
    for (const [x, y, rx, ry] of [[-13, 10, 8, 11], [13, 10, 8, 11], [0, 24, 16, 7], [-9, 19, 8, 8], [9, 19, 8, 8]]) m.ball([x, y], [rx, ry, 7], { color: rock, group: 'r', blend: 2 });
    m.box([0, 9], [6.4, 10, 1.4], { color: '#1a1410', group: 'in', over: -1 });
    for (let i = 0; i < 7; i++) m.limb([-5.4 + i * 1.8, 19, 4], [-5.4 + i * 1.8, 1, 4.6], 0.9, 0.9, { color: i % 2 ? '#dff2f6' : '#8fc9d6', group: `w${i}`, over: 1 });
    for (let i = 0; i < 6; i++) m.ball([-7 + i * 2.8, 1, 5], [2, 1.4, 1.6], { color: '#f4fbff', group: 'foam', over: 2 });
    for (const x of [-14, -6, 8, 15]) m.chain([[x, 26, 5], [x + 0.6, 20, 6], [x - 0.4, 15, 6]], 0.8, 0.5, { color: '#4a6a24', group: `v${x}`, over: 2 });
    return m;
  },
  staff() { // el bastón de puntas doradas
    const m = make();
    m.drum([0, 1.4], 4.6, 3.6, 1.4, { color: STONE, group: 'b' });
    m.limb([0, 2], [2, 36], 1.6, 1.6, { color: (l) => (l[0] < 0.2 || l[0] > 0.8 || Math.abs(l[0] - 0.5) < 0.04 ? GOLD : '#3a1a1a'), group: 's' });
    for (const k of [0.08, 0.22, 0.78, 0.94]) m.ball([2 * k, 2 + 34 * k], [2.3, 0.8, 2.3], { color: '#ffe08a', group: `k${k}`, over: 1 });
    m.chain([[1.6, 28, 1], [6, 26, 1], [9, 28, 1]], 1.1, 0.5, { color: RED, group: 'c', over: 1 });
    return m;
  },
  scroll() {
    const m = make();
    for (const x of [-9, 9]) pole(m, x, 0, 26, 0.8);
    m.box([0, 25], [10, 0.8, 1], { color: WOOD, group: 't' });
    m.box([0, 13.6], [6.4, 10, 0.8], {
      color: (l) => {
        if (Math.abs(l[0]) > 5.4 || Math.abs(l[1]) > 8.8) return RED;
        const hill = (c, w, h) => Math.abs(l[0] - c) < w && l[1] < h - ((l[0] - c) / w) ** 2 * 2;
        if (hill(-2.4, 1.6, 4) || hill(1.8, 1.8, 1.6)) return '#6a7a6a';
        return l[1] > 5 && Math.hypot(l[0] - 2.6, l[1] - 6) < 1.4 ? '#d8452c' : PAPER;
      },
      group: 's',
    });
    for (const y of [3, 24]) m.limb([-7.4, y, 0], [7.4, y, 0], 1, 1, { color: WOOD, group: `r${y}`, over: 1 });
    return m;
  },
  pine: () => pine(1, '#5a6a24'),
};

// --- Gallo: el sol, las peonías, el gong del amanecer y los papalotes --------------------------

const ROCK = ['#7a3a44', '#a85a5a'];
const rooster = {
  peony() {
    const m = make();
    islet(m, 10, ...ROCK);
    for (const [x, y, k, c] of [[-4, 8, 1, '#ff6f8f'], [5, 11, 1.2, '#ff9aae'], [0, 5, 0.8, '#e23b5a']]) {
      m.limb([x * 0.5, 0], [x, y], 0.8, 0.7, { color: '#4a6a34', group: `s${x}` });
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * TAU;
        m.ball([x + Math.cos(a) * 2.6 * k, y + Math.sin(a) * 2 * k, (i % 3) - 1], [1.9 * k, 1.8 * k, 1.8 * k], { color: i % 2 ? c : '#ffd0d8', group: `p${x}`, blend: 0.3 });
      }
      m.ball([x, y, 2 * k], [1.6 * k, 1.4 * k, 1.2], { color: GOLD, group: `c${x}`, over: 1 });
    }
    return m;
  },
  sunGate() {
    const m = make();
    islet(m, 13, ...ROCK);
    for (const x of [-9, 9]) pole(m, x, 0, 26, 1.3, RED);
    m.box([0, 25], [14, 1.2, 1.4], { color: RED, group: 'a' });
    m.box([0, 21], [10, 0.9, 1.2], { color: DEEP, group: 'b' });
    m.box([0, 27], [16, 1, 1.8], { color: DARK, group: 'c' });
    m.ball([0, 13], [6.4, 6.4, 1.6], { color: (l) => (Math.hypot(l[0], l[1]) < 3 ? '#fff0b0' : Math.sin(Math.atan2(l[1], l[0]) * 10) > 0.1 ? '#ffb02e' : '#ff7a3c'), group: 'sun', flat: 2 });
    return m;
  },
  gong() {
    const m = make();
    islet(m, 10, ...ROCK);
    for (const x of [-8, 8]) pole(m, x, 0, 22, 1.1, '#5a1a20');
    m.box([0, 22], [10, 1, 1.2], { color: '#5a1a20', group: 't' });
    for (const x of [-1, 1]) m.chain([[x * 10, 22], [x * 12, 23], [x * 12.6, 25]], 1, 0.6, { color: GOLD, group: `h${x}` });
    m.ball([0, 12], [6.6, 6.6, 1.6], { color: (l) => (Math.hypot(l[0], l[1]) < 1.8 ? '#fff0a8' : Math.abs(Math.hypot(l[0], l[1]) - 4) < 0.6 ? '#8a5a1a' : GOLD), group: 'g' });
    for (const x of [-3, 3]) m.limb([x, 21.4], [x, 17.6], 0.4, 0.4, { color: RED, group: `r${x}` });
    return m;
  },
  kite() {
    const m = make();
    const c = (l) => (Math.abs(l[0]) < 0.6 ? GOLD : Math.sin(l[0] * 1.2) > 0.3 ? '#ff8a5c' : '#e23b3b');
    m.ball([0, 26], [4, 6, 1.4], { color: '#ffb02e', group: 'b' });
    for (const x of [-1, 1]) m.ball([x * 8, 28], [7, 3.6, 1.2], { turn: x * 0.25, color: c, group: `w${x}` });
    m.ball([0, 33], [2.4, 2.4, 1.4], { color: '#e23b3b', group: 'h' });
    for (const x of [-2, 0, 2]) m.chain([[x, 20.4], [x * 1.6, 13], [x * 2.6 + 2, 6]], 0.9, 0.5, { color: x ? '#ff8a5c' : GOLD, group: `t${x}` });
    m.dot([0.6, 33.6, 2], '#1b1226');
    return m;
  },
  lanternTree() {
    const m = make();
    islet(m, 9, ...ROCK);
    pole(m, 0, 0, 34, 1.1, '#5a1a20');
    for (const [y, w] of [[32, 8], [22, 11]]) {
      m.box([0, y], [w, 0.8, 1], { color: '#5a1a20', group: `b${y}` });
      for (const x of [-w + 1, w - 1]) lantern(m, [x, y - 4.4], 2.6);
    }
    m.ball([0, 35.4], [1.4, 2, 1.4], { color: GOLD, group: 't' });
    return m;
  },
};

// --- Perro: los leones guardianes, la puerta roja, el barrio y la luna comida --------------------

const dog = {
  lion() {
    const m = make();
    const s = (l) => (Math.sin(l[0] * 2 + l[1] * 1.6) > 0.7 ? '#6a6e62' : '#8d9184');
    m.box([0, 3.6], [7.4, 3.6, 5.6], { color: (l) => (Math.abs(l[1]) > 2.6 ? '#9a9e90' : '#74786c'), group: 'b' });
    m.box([0, 7.6], [8.2, 0.9, 6.2], { color: '#a4a89a', group: 'b2' });
    m.ball([-2, 13], [5.4, 5.6, 4.6], { color: s, group: 'l', blend: 1.6 });
    m.ball([1.6, 16], [4.4, 5, 4.2], { color: s, group: 'l', blend: 1.6 });
    m.ball([2.6, 21.6], [4.8, 4.4, 4.4], { color: s, group: 'h', blend: 1 });
    m.ball([6, 20.4], [2.6, 2.2, 2.8], { color: s, group: 'h', blend: 1 });
    for (let i = 0; i < 9; i++) m.ball([-0.6 + Math.cos((i / 9) * TAU) * 4.4, 21.6 + Math.sin((i / 9) * TAU) * 4.4, (i % 2) * 3 - 1], [1.6, 1.6, 1.6], { color: '#5f6358', group: `m${i}` });
    for (const z of [-2.6, 2.6]) m.limb([4, 15, z], [5, 9, z], 1.9, 1.5, { color: s, group: `p${z}` });
    m.ball([7.4, 10, 3], [2.4, 2.4, 2.4], { color: (l) => (Math.sin(l[0] * 3) * Math.sin(l[1] * 3) > 0 ? '#c9a24a' : BRONZE), group: 'ball', over: 1 });
    m.ball([2, 16.6, 3.6], [2, 1, 1], { color: RED, group: 'col', over: 1 });
    m.dot([6, 22, 4], '#ffd23f');
    return m;
  },
  redGate() {
    const m = make();
    m.box([0, 11], [17, 11, 4], { color: '#5f6456', group: 'w' });
    for (const x of [-4.6, 4.6]) {
      m.box([x, 9, 4.2], [4.3, 8.6, 0.8], { color: (l) => (Math.abs(((l[0] + 10) % 2.6) - 1.3) < 0.5 && Math.abs(((l[1] + 20) % 2.8) - 1.4) < 0.5 ? GOLD : '#a0222a'), group: `d${x}`, over: 1 });
      m.ball([x * 0.32, 9, 5.2], [1.4, 1.4, 0.8], { color: GOLD, group: `k${x}`, over: 2 });
    }
    m.box([0, 19.4, 4.2], [8, 1.6, 0.8], { color: (l) => (Math.abs(l[0]) > 7 ? GOLD : '#16324a'), group: 's', over: 1 });
    roof(m, [0, 22], 20, 6.6, 6, '#4a5244', { dark: '#2c3228' });
    for (const x of [-11, 11]) lantern(m, [x, 16, 6], 2.6);
    return m;
  },
  house() {
    const m = make();
    m.box([0, 6], [12, 6, 6.4], { color: '#8a8a74', group: 'w' });
    m.box([0, 1], [12.4, 1, 6.8], { color: '#5f6456', group: 'b' });
    m.box([-2, 4.6, 6.4], [2.2, 4.4, 0.7], { color: '#5a2a24', group: 'd', over: 1 });
    for (const x of [5, -8]) m.box([x, 7, 6.4], [2, 2, 0.7], { color: (l) => (Math.abs(l[0]) < 0.4 || Math.abs(l[1]) < 0.4 ? WOOD : '#ffc46a'), flat: 3, group: `v${x}`, over: 1 });
    roof(m, [0, 12], 15.4, 9, 6.4, '#4a5244', { dark: '#2c3228', ridge: '#2c3228' });
    return m;
  },
  well() {
    const m = make();
    m.drum([0, 3], 5.4, 5.4, 3, { color: (l) => (Math.sin(l[0] * 1.8 + Math.floor(l[1] / 2) * 2) > 0.8 ? '#4c5046' : '#7d8172'), group: 'w' });
    for (const x of [-6, 6]) pole(m, x, 0, 16, 0.9);
    roof(m, [0, 16], 9, 5, 3.6, '#4a5244', { dark: '#2c3228', ridge: WOOD });
    m.limb([-6, 13, 0], [6, 13, 0], 0.8, 0.8, { color: WOOD, group: 'r' });
    m.limb([0, 13, 0], [0, 8, 0], 0.4, 0.4, { color: PAPER, group: 'c' });
    m.drum([0, 7], 1.6, 1.9, 1.4, { color: WOOD, group: 'k' });
    return m;
  },
  incense() {
    const m = make();
    for (const [x, z] of [[-4, 3], [4, 3], [0, -4]]) m.limb([x, 0, z], [x * 0.8, 5, z * 0.8], 1, 1.2, { color: BRONZE, group: `l${x}` });
    m.ball([0, 8], [7, 4.4, 6], { color: (l) => (Math.abs(l[1]) < 0.8 ? GOLD : BRONZE), group: 'c' });
    m.drum([0, 12], 6, 6.6, 0.8, { color: GOLD, group: 't' });
    for (const x of [-2, 0, 2]) {
      m.limb([x, 12, 0], [x * 1.2, 19, 0], 0.45, 0.4, { color: RED, group: `s${x}` });
      m.dot([x * 1.2, 19.4, 0], '#ffb04a');
    }
    for (let i = 0; i < 5; i++) m.ball([Math.sin(i * 1.4) * 2.4, 22 + i * 3.4, 0], [1.2 + i * 0.3, 1.2, 1.2], { color: '#8d9184', group: 'sm', over: -1, blend: 1 });
    return m;
  },
  post,
};

// --- Cerdo: la abundancia, los lingotes, los cohetes, el árbol del dinero y el banquete ------------

const ingot = (m, [x, y, z = 0], k = 1) => {
  m.ball([x, y, z], [5 * k, 1.8 * k, 2.8 * k], { color: '#e0a82e', group: `i${x}${y}`, blend: 1.2 });
  for (const s of [-1, 1]) m.ball([x + s * 4 * k, y + 1.4 * k, z], [1.6 * k, 1.8 * k, 2.2 * k], { color: '#ffd45e', group: `i${x}${y}`, blend: 1.2 });
  m.ball([x, y + 1.6 * k, z], [2.4 * k, 1.8 * k, 1.9 * k], { color: '#fff0a0', group: `t${x}${y}`, over: 1 });
};

const pig = {
  ingots() {
    const m = make();
    for (const p of [[-9, 2, 0], [0, 2, 3], [9, 2, 0], [-4.6, 6.4, 0], [4.6, 6.4, 1], [0, 11, 0]]) ingot(m, p);
    return m;
  },
  crackers() { // la sarta de cohetes
    const m = make();
    pole(m, 0, 0, 36, 0.9);
    m.box([3, 35], [4, 0.7, 0.8], { color: WOOD, group: 'a' });
    for (let i = 0; i < 12; i++) for (const s of [-1, 1]) m.limb([6 + s * 0.6, 32 - i * 2.2, 0], [6 + s * 2.8, 30.6 - i * 2.2, s], 1, 1, { color: i % 4 === 3 ? GOLD : '#d8202c', group: `c${i}${s}` });
    flame(m, [6, 2.6, 0], 1.2);
    m.box([6, 34], [1.6, 1.2, 1.2], { color: GOLD, group: 'k' });
    return m;
  },
  jars() {
    const m = make();
    for (const [x, z, k] of [[-7, 0, 1], [6, -1, 1.1], [0, 5, 0.85]]) {
      m.ball([x, 6 * k, z], [5.4 * k, 6 * k, 5 * k], { color: '#5a2a3a', group: `j${x}` });
      m.drum([x, 12 * k, z], 3 * k, 3.4 * k, 1.2 * k, { color: '#7a3a4a', group: `n${x}` });
      m.ball([x, 13.6 * k, z], [3.4 * k, 1.6 * k, 3.4 * k], { color: RED, group: `c${x}` });
      m.box([x, 6 * k, z + 4.8 * k], [2.4 * k, 2.4 * k, 0.7], { color: '#d8202c', turn: Math.PI / 4, group: `f${x}`, over: 1 });
      m.box([x, 6 * k, z + 5.2 * k], [0.9 * k, 0.9 * k, 0.7], { color: GOLD, group: `g${x}`, over: 2 });
    }
    return m;
  },
  moneyTree() {
    const m = make();
    m.drum([0, 1.8], 4.4, 5.2, 1.8, { color: RED, group: 'p' });
    m.chain([[0, 3], [-1, 10], [1, 17]], 1.8, 1, { color: BRONZE, group: 't' });
    for (let i = 0; i < 8; i++) {
      const a = -0.4 + (i / 7) * (Math.PI + 0.8);
      const tip = [Math.cos(a) * 11, 17 + Math.sin(a) * 10, (i % 2) * 4 - 2];
      m.chain([[0, 14, 0], [Math.cos(a) * 6, 16 + Math.sin(a) * 6, 0], tip], 0.8, 0.5, { color: BRONZE, group: `b${i}` });
      coin(m, tip, 2.6, 1);
      coin(m, [Math.cos(a) * 6.4, 15 + Math.sin(a) * 6, 2], 2, 1);
    }
    return m;
  },
  arch() {
    const m = make();
    for (const x of [-15, 15]) {
      m.box([x, 13], [2.6, 13, 2.6], { color: (l) => (Math.abs(l[1]) > 11 ? GOLD : '#c22a3a'), group: `p${x}` });
      lantern(m, [x, 20, 5], 3);
    }
    m.box([0, 24], [17, 3, 2.2], { color: (l) => (Math.abs(l[1]) > 2.2 ? GOLD : Math.abs(((l[0] + 40) % 8) - 4) < 2 && Math.abs(l[1]) < 1.4 ? '#ffe08a' : '#a01a2c'), group: 'b' });
    roof(m, [0, 27], 20, 4.6, 5, '#e08a2e', { dark: '#a0541a' });
    for (const x of [-8, 0, 8]) lantern(m, [x, 17, 2], 2.2);
    return m;
  },
  drum() {
    const m = make();
    for (const x of [-5, 5]) m.limb([x * 1.3, 0], [x, 5], 1.2, 1, { color: WOOD, group: `l${x}` });
    m.drum([0, 10], 8, 8, 5, { color: (l) => (Math.abs(Math.abs(l[1]) - 4.2) < 0.6 ? GOLD : '#c22a3a'), group: 'd' });
    m.drum([0, 15.4], 7.4, 7.4, 0.6, { color: PAPER, group: 't' });
    for (const [x, a] of [[-4, 0.5], [5, -0.4]]) m.limb([x, 16, 0], [x + Math.sin(a) * 8, 22, 0], 0.8, 0.8, { color: WOOD, group: `s${x}`, over: 1 });
    return m;
  },
};

export const PIECES_B = { horse, goat, monkey, rooster, dog, pig };
