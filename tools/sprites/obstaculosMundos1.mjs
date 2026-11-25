// Los obstáculos de la Rata, el Buey, el Tigre, el Conejo y la Serpiente (ver obstaculosMundos.mjs).

import { C, crate, cricket, fire, frames, make, poses, roller, spoked, stonePillar, TAU, toad } from './obstaculosPiezas.mjs';

const { RED, DEEP, GOLD, CREAM, DARK, WOOD, PLANK, IRON, STONE } = C;
const BRONZE = '#d8a04a';
const PAPER = '#fff0cc';
const STRAW = '#f4d070';
const LEAF = '#7cc050';
const JADE = '#7cd8ac';
const WHITE = '#fbfaff';

/** Una barrica acostada que rueda: la tapa, con sus duelas y su aro. */
export const cask = (turn, { wood = WOOD, gap = PLANK, hoop = '#8a94ac', seal = RED } = {}) => roller(turn, (d, a) => (d > 0.86 ? PLANK : d > 0.74 ? hoop : d < 0.24 ? seal : Math.abs(((Math.sin(a) * d * 5 + 20) % 1.7) - 0.85) > 0.6 ? gap : wood), { side: gap, r: 5.4 });

/** Un farol de piedra, con su luz. */
export const stoneLamp = (t, { stone = STONE, light = '#f0f2fa', glow = '#ffd27a' } = {}) => {
  const m = make();
  m.box([0, 0.9], [4, 0.9, 3.4], { color: light, group: 'base' });
  m.drum([0, 4], 1.5, 1.5, 2.6, { color: stone, group: 'post' });
  m.box([0, 6.9], [3.6, 0.7, 3.2], { color: light, group: 'tray', over: 1 });
  m.box([0, 9.4], [2.8, 2, 2.6], { color: (l) => (Math.abs(l[0]) > 1.9 || Math.abs(l[1]) > 1.4 ? stone : Math.hypot(l[0], l[1]) < 0.9 + 0.3 * Math.sin(t * TAU) ? '#fff6d8' : glow), group: 'house' });
  m.drum([0, 12.6], 4.8, 1.2, 1.4, { color: stone, group: 'roof', over: 1 });
  m.ball([0, 14.6], [1.1, 1.2, 1.1], { color: light, group: 'tip', over: 2 });
  return m;
};

// --- Rata: la medianoche, los graneros y la boda ---------------------------------------------------------

/** Un candil de aceite, de bronce. */
function candil(t) {
  const m = make();
  m.drum([0, 0.8], 3.8, 2.6, 0.8, { color: BRONZE, group: 'base' });
  m.drum([0, 4.6], 1.1, 1.1, 3.4, { color: (l) => (Math.abs(l[1] % 2.2) < 0.5 ? '#fff0b0' : BRONZE), group: 'post' });
  m.ball([0, 5], [1.9, 1.1, 1.9], { color: '#f4c868', group: 'knob', over: 1 });
  m.drum([0, 8.4], 1.6, 3.4, 1, { color: BRONZE, group: 'dish', over: 1 });
  fire(m, [0, 8.8], 0.8, t, 1.1);
  return m;
}

/** Costales de grano, amarrados. */
function costales() {
  const m = make();
  for (const [x, z, h, lean] of [[-4, -0.6, 4.4, -0.06], [4, 0.4, 4, 0.08]]) {
    m.box([x, h + 0.2, z], [3.7, h, 3.2], { turn: lean, round: 1.6, color: (l) => (l[2] > 1.6 && Math.abs(l[0]) + Math.abs(l[1]) < 2.2 ? (Math.abs(l[0]) + Math.abs(l[1]) < 1 ? GOLD : RED) : Math.abs(((l[0] + 20) % 1.8) - 0.9) < 0.16 ? '#c8a070' : '#f0d4a0'), group: `s${x}` });
    m.drum([x - lean * 8, h * 2 + 0.6, z], 1.3, 1.1, 0.8, { color: '#c86a4a', group: `tie${x}`, over: 1 });
    for (const d of [-1.4, 0, 1.4]) m.limb([x - lean * 8, h * 2 + 1, z], [x - lean * 8 + d, h * 2 + 2.8, z], 0.9, 0.8, { color: '#f0d4a0', group: `neck${x}`, over: 1 });
  }
  return m;
}

const cajaTe = (colors = {}) => crate({ ...colors, mark: (x, y) => (Math.abs(x) < 2.8 && Math.abs(y) < 2.6 ? (Math.abs(x) > 2.1 || Math.abs(y) > 1.9 || Math.abs(y) < 0.4 || Math.abs(x) < 0.4 ? GOLD : RED) : null) });

/** El palanquín, volcado. */
function palanquin() {
  const m = make();
  for (const z of [-4, 4]) m.limb([-12, 2, z], [12, 4.4, z], 0.9, 0.9, { color: WOOD, group: `bar${z}` });
  m.box([0, 6], [6.4, 5, 3.8], { color: (l) => (Math.abs(l[0]) > 5.4 || Math.abs(l[1]) > 4 ? GOLD : l[2] > 2.6 && Math.abs(l[0]) < 2.6 && Math.abs(l[1]) < 2.8 ? (Math.sin(l[0] * 3.4) > 0 ? '#f8c8a0' : DEEP) : RED), turn: 0.1, group: 'cab' });
  m.box([-0.8, 11.4], [8, 0.8, 4.8], { color: '#ff7a5a', turn: 0.1, group: 'roof', over: 1 });
  m.box([-0.9, 12.6], [5, 0.7, 3], { color: RED, turn: 0.1, group: 'roof2', over: 1 });
  for (const s of [-1, 1]) m.limb([-0.8 + s * 7.6, 11.4 + s * 0.8, 2], [-0.8 + s * 10, 12.6 + s, 2], 0.9, 0.5, { color: GOLD, group: `eave${s}`, over: 2 });
  return m;
}

/** Un granero de piedra, con su tapa. No se quema. */
const granero = () => stonePillar({
  stone: '#c4c4ea', dark: '#7c80b8', light: '#ecebff',
  mark: (x, y) => (Math.abs(x) < 1.6 && y < -1.4 ? DARK : Math.abs(x) + Math.abs(y - 3.4) < 2.4 ? RED : null),
  top: (m) => {
    m.drum([0, 19.4], 6.6, 1.2, 2, { color: (l) => (Math.sin(l[0] * 2.6) > 0.3 ? '#a8a8dc' : '#d8d6ff'), group: 'roof', over: 1 });
    m.ball([0, 22.2], [1.2, 1.2, 1.2], { color: GOLD, group: 'tip', over: 2 });
  },
});

const rat = {
  post: [frames(4, candil), frames(2, (t) => stoneLamp(t, { stone: '#b4b8e4' }))],
  crate: [[costales()], [cajaTe()]],
  group: [[palanquin()]],
  wall: [[granero()]],
  barrel: [frames(8, (t) => cask(t * TAU))],
  hopper: [poses(cricket, { body: '#e8c070', dark: '#b07a3c' })],
};

// --- Buey: los arrozales ------------------------------------------------------------------------------------

/** Un espantapájaros. */
function espantapajaros(t) {
  const m = make();
  const sway = Math.sin(t * TAU) * 0.4;
  m.drum([0, 4], 0.9, 0.9, 4, { color: PLANK, group: 'post' });
  m.limb([-5.6, 8.6 + sway, 0], [5.6, 8.6 - sway, 0], 1.1, 1.1, { color: '#e8a860', group: 'arms' });
  for (const s of [-1, 1]) for (const d of [-0.8, 0, 0.8]) m.limb([s * 5.6, 8.6 - s * sway, 0], [s * 7, 8 + d * 1.4 - s * sway, d], 0.6, 0.4, { color: STRAW, group: `hand${s}${d}`, over: 1 });
  m.box([0, 7.4], [2.6, 2.8, 2], { color: (l) => (Math.abs(((l[1] + 20) % 2) - 1) < 0.5 ? '#f4f0e0' : '#5a8ac8'), group: 'shirt', over: 1 });
  m.ball([sway, 12], [2.2, 2.2, 2.1], { color: (l) => (l[2] > 1 && ((Math.abs(Math.abs(l[0]) - 0.9) < 0.4 && Math.abs(l[1] - 0.3) < 0.4) || (Math.abs(l[1] + 0.9) < 0.3 && Math.abs(l[0]) < 1)) ? DARK : PAPER), group: 'head', over: 2 });
  m.drum([sway, 13.8], 4.6, 0.8, 1.5, { color: (l) => (Math.sin(l[0] * 3) > 0.5 ? '#c89840' : STRAW), group: 'hat', over: 3 });
  return m;
}

/** Un mojón con su lazo. */
function estaca() {
  const m = make();
  for (const [x, h, z] of [[-2.2, 9, 0], [2.2, 11, -0.6], [0.2, 7, 1.6]]) {
    m.limb([x, 0, z], [x * 1.1, h, z], 1.7, 1.5, { color: (l) => (Math.sin(l[0] * 18) > 0.7 ? PLANK : WOOD), group: `s${x}` });
    m.limb([x * 1.1, h, z], [x * 1.15, h + 2.6, z], 1.5, 0.2, { color: CREAM, group: `t${x}`, over: 1, blend: 0 });
  }
  m.drum([0, 4], 4.2, 4.2, 0.6, { color: '#f4e0a0', group: 'rope', over: 2, flatten: 0.7 });
  return m;
}

/** Una paca de paja. */
function paca() {
  const m = make();
  m.box([0, 5], [6.8, 5, 4.6], { color: (l) => (Math.abs(Math.abs(l[0]) - 3.2) < 0.7 ? RED : Math.sin(l[0] * 3.1 + l[1] * 0.8) * Math.sin(l[1] * 2.7) > 0.3 ? '#d8a43c' : STRAW), group: 'hay', round: 0.9 });
  for (const [x, dx] of [[-5, -2], [-1, 0.6], [4.6, 2]]) m.limb([x, 9.6, 1], [x + dx, 11.8, 1.4], 0.6, 0.4, { color: '#fff0b0', group: `st${x}`, over: 1 });
  return m;
}

/** El arado, tirado en el surco. */
function arado() {
  const m = make();
  m.chain([[-11, 1.2], [-4, 3.4], [4, 5.6], [10, 7]], 1.5, 1.3, { color: WOOD, group: 'beam' });
  m.chain([[-3, 3.4, 0.6], [-6, 8, 1.2], [-7, 12, 1.6]], 1.3, 1, { color: PLANK, group: 'handle', over: 1 });
  m.limb([-7.6, 11.6, -1.4], [-6.6, 12, 3.6], 1, 1, { color: WOOD, group: 'grip', over: 1 });
  m.chain([[-6, 2.2, 1], [-9, 0.8, 1.4], [-12, 0.6, 1]], 1.9, 0.4, { color: IRON, group: 'blade', over: 2 });
  m.limb([9.6, 6.4, -4], [9.6, 6.4, 4], 1.3, 1.3, { color: PLANK, group: 'yoke', over: 1 });
  for (const z of [-3, 3]) m.chain([[9.6, 6, z], [11.6, 3, z], [9.4, 0.8, z]], 0.9, 0.8, { color: WOOD, group: `y${z}`, over: 1 });
  m.ball([1, 5.6], [1.8, 1.4, 1.8], { color: RED, group: 'bow', over: 3 });
  return m;
}

/** Una cerca de troncos, rota. */
function cerca({ wood = WOOD, dark = PLANK } = {}) {
  const m = make();
  for (const [x, h] of [[-10, 10], [-3.4, 11.4], [3.4, 9], [10, 11]]) {
    m.limb([x, 0], [x + 0.3, h], 1.5, 1.3, { color: (l) => (Math.sin(l[0] * 20) > 0.7 ? dark : wood), group: `p${x}`, over: 1 });
    m.ball([x + 0.3, h], [1.5, 0.8, 1.5], { color: CREAM, group: `c${x}`, over: 2 });
  }
  m.limb([-12, 4], [4, 4.4], 1.1, 1.1, { color: wood, group: 'r1' });
  m.limb([-12, 7.8], [12, 7], 1.1, 1.1, { color: wood, group: 'r2' });
  m.limb([3, 4.6], [11.6, 1.2], 1.1, 1, { color: dark, group: 'r3' });
  return m;
}

const ox = {
  post: [frames(4, espantapajaros), [estaca()]],
  crate: [[paca()], [crate({ mark: (x, y) => (Math.abs(x) + Math.abs(y) < 2.4 ? '#7cc050' : null) })]],
  group: [[arado()], [cerca()]],
  wall: [[stonePillar({ stone: '#d8c4b4', dark: '#9a8478', light: '#f8ece0', moss: LEAF, mark: (x, y) => (Math.abs(y) < 0.5 && Math.abs(x) < 2.8 || Math.abs(y - 2.4) < 0.5 && Math.abs(x) < 2 || Math.abs(x) < 0.5 && Math.abs(y - 0.4) < 4.2 ? '#8a4a3a' : null) })]],
  barrel: [frames(8, (t) => roller(t * TAU, (d, a) => (d > 0.88 ? '#a8742c' : Math.sin(d * 15 - a) > 0.35 ? '#fff0a8' : Math.sin(d * 15 - a) < -0.55 ? '#a8742c' : '#dca840'), { side: '#a8742c', r: 5.8 }))],
  hopper: [poses(toad)],
};

// --- Tigre: el bambú, los tambores y el rey del monte ----------------------------------------------------

/** Cañas secas de bambú, cortadas en punta. */
function bambu() {
  const m = make();
  for (const [x, h, z] of [[-2.4, 9.6, 0], [2.4, 11.6, -0.6]]) {
    m.limb([x, 0, z], [x * 1.15, h, z], 1.8, 1.6, { color: (l) => (Math.abs(((l[0] * h) % 4) - 2) > 1.6 ? '#b8803c' : '#f0cc70'), group: `c${x}` });
    m.limb([x * 1.15, h - 0.4, z], [x * 1.3, h + 4, z], 1.5, 0.15, { color: '#fff6d8', group: `t${x}`, over: 1, blend: 0 });
  }
  for (const y of [3, 4.6]) m.drum([0, y], 4.2, 4.2, 0.6, { color: RED, group: `rope${y}`, over: 2, flatten: 0.6 });
  return m;
}

/** Un estandarte rayado, como el tigre. */
function rayado(t) {
  const m = make();
  m.drum([-2.6, 8.2], 0.95, 0.95, 8.2, { color: PLANK, group: 'pole' });
  m.ball([-2.6, 16.8], [1.2, 1.2, 1.2], { color: GOLD, group: 'tip', over: 1 });
  for (let i = 0; i < 7; i++) {
    const a = t * TAU - i * 0.6;
    m.box([-1.4 + i * 1.1, 11 + Math.sin(a) * 0.5, Math.cos(a) * 0.9], [0.75, 4, 1], { color: (l) => (Math.abs(l[1]) > 3.2 ? GOLD : i % 3 === 1 && Math.abs(l[1] + (i - 3) * 0.4) < 2 ? DARK : '#ffa038'), group: `f${i}`, over: 1 });
  }
  return m;
}

/** Un tambor de guerra en su base. */
function tambor() {
  const m = make();
  for (const x of [-4.4, 4.4]) m.limb([x * 1.3, 0.4, 0], [x * 0.7, 5, 0], 1.4, 1.2, { color: PLANK, group: `leg${x}` });
  m.ball([0, 7.4], [6.2, 6.2, 3.8], {
    color: (l) => {
      const d = Math.hypot(l[0], l[1]);
      if (l[2] < 1.4) return RED;
      if (d > 5) return Math.sin(Math.atan2(l[1], l[0]) * 12) > 0 ? GOLD : RED;
      return d < 1.9 ? DEEP : Math.abs(d - 3.2) < 0.4 ? '#e8b060' : PAPER;
    },
    group: 'drum',
  });
  return m;
}

/** Escudos apilados, con cara de tigre. */
function escudos() {
  const m = make();
  m.box([3.6, 5.6, -1.6], [4.6, 5.6, 0.9], { color: (l) => (Math.abs(l[0]) > 3.8 || Math.abs(l[1]) > 4.8 ? GOLD : RED), turn: -0.2, group: 'b' });
  m.box([-1.6, 5.8, 1.2], [5, 5.8, 1], {
    color: (l) => {
      const [x, y] = [Math.abs(l[0]), l[1]];
      if (x > 4.1 || Math.abs(y) > 5) return GOLD;
      if (x > 1 && x < 2.6 && y > 0.4 && y < 1.8) return '#fff6d0';
      if (x < 1 && Math.abs(y + 0.6) < 0.8) return DARK;
      if (y < -2 && y > -3.4 && x < 2.6) return Math.floor(x + 0.5) % 2 ? CREAM : DEEP;
      return y > 2.4 && Math.sin(x * 2.6) > 0.2 ? DARK : '#ffa038';
    },
    turn: 0.1, group: 'a', over: 1,
  });
  return m;
}

/** Una empalizada de bambú seco. */
function empalizada() {
  const m = make();
  for (let i = 0; i < 6; i++) {
    const x = -10 + i * 4;
    const h = 7 + (i % 2) * 1.6;
    m.limb([x, 0], [x * 1.04, h], 1.5, 1.4, { color: (l) => (Math.abs(((l[0] * h) % 3.4) - 1.7) > 1.36 ? '#b8803c' : '#f0cc70'), group: `c${i}` });
    m.limb([x * 1.04, h - 0.4], [x * 1.08, h + 3.6], 1.3, 0.15, { color: '#fff6d8', group: `t${i}`, over: 1, blend: 0 });
  }
  for (const y of [2.6, 5.6]) m.limb([-11.6, y, 1.4], [11.6, y + 0.4, 1.4], 0.9, 0.9, { color: PLANK, group: `r${y}`, over: 2 });
  for (const x of [-10, -2, 6]) m.ball([x, 4.2, 1.8], [1.2, 2.4, 1], { color: RED, group: `k${x}`, over: 3 });
  return m;
}

const KING = (x, y) => (Math.abs(x) < 2.8 && (Math.abs(y - 5) < 0.7 || Math.abs(y - 1.4) < 0.7 || Math.abs(y + 2.2) < 0.7)) || (Math.abs(x) < 0.7 && y > -2.4 && y < 5);
const tiger = {
  post: [[bambu()], frames(4, rayado)],
  crate: [[tambor()], [escudos()]],
  group: [[empalizada()]],
  wall: [[stonePillar({ stone: '#d4ccc4', dark: '#948a84', light: '#f6f0e8', moss: LEAF, mark: (x, y) => (KING(x, y) ? RED : null), top: (m) => { m.ball([0, 19], [5.6, 2.8, 4.2], { color: '#ece4dc', group: 'cap', over: 1 }); m.ball([0, 21.4], [1.6, 1.3, 1.4], { color: GOLD, group: 'tip', over: 2 }); } })]],
  barrel: [frames(8, (t) => roller(t * TAU, (d, a) => (d > 0.8 ? (Math.cos(a * 8) > 0.3 ? GOLD : RED) : d > 0.72 ? DARK : Math.sin(a * 2 + d * 5) > 0 ? PAPER : '#ffb050'), { side: DEEP, r: 5.4 }))],
  hopper: [poses(cricket)],
};

// --- Conejo: la luna, el jade y la porcelana ----------------------------------------------------------------

/** El mortero del elixir. */
function mortero() {
  const m = make();
  m.drum([0, 1.2], 5, 4.2, 1.2, { color: '#d8dcff', group: 'base' });
  m.drum([0, 6], 3.8, 5.8, 4, { color: (l) => (Math.abs(l[1] - 2.4) < 0.8 ? GOLD : '#f0f2ff'), group: 'cup' });
  m.drum([0, 10], 4.8, 4.8, 0.5, { color: '#8a90d8', group: 'in', over: 1 });
  m.limb([0.6, 9], [4.4, 14], 1.4, 1.4, { color: JADE, group: 'pestle', over: 2 });
  m.ball([4.8, 14.4], [2, 1.9, 1.9], { color: JADE, group: 'knob', over: 2 });
  return m;
}

/** Un jarrón de porcelana azul y blanca. */
function jarron() {
  const m = make();
  const blue = (l) => (Math.abs(l[1]) > 3 || Math.sin(l[0] * 1.7) * Math.sin(l[1] * 1.9 + 1) > 0.42 ? '#3a5ad0' : '#fbfbff');
  m.drum([0, 0.8], 3.6, 3, 0.8, { color: '#3a5ad0', group: 'foot' });
  m.ball([0, 6], [5.6, 4.8, 5], { color: blue, group: 'body' });
  m.drum([0, 11.4], 2.6, 2.2, 1.4, { color: '#fbfbff', group: 'neck', over: 1 });
  m.drum([0, 13], 2.2, 3.4, 0.7, { color: '#3a5ad0', group: 'lip', over: 2 });
  for (const s of [-1, 1]) m.chain([[s * 2.4, 12.4], [s * 5.4, 12.6], [s * 4.6, 9.6]], 0.8, 0.7, { color: GOLD, group: `h${s}`, over: 1 });
  return m;
}

/** Un biombo con la luna pintada. */
function biombo() {
  const m = make();
  [-8, 0, 8].forEach((x, i) => {
    m.box([x, 6.6, i === 1 ? 1.4 : -0.6], [4.4, 6, 0.9], {
      color: (l) => {
        if (Math.abs(l[0]) > 3.5 || Math.abs(l[1]) > 5) return i === 1 ? '#e88a4a' : '#c8643c';
        if (i === 1 && Math.hypot(l[0], l[1] - 1.4) < 2.2) return '#ffe890';
        if (l[1] < -2.2 + Math.sin(l[0] * 1.4 + i * 2) * 0.9) return '#6a78d8';
        return i === 1 ? '#f6f0ff' : '#e4e0ff';
      },
      group: `p${i}`, over: i === 1 ? 1 : 0,
    });
    for (const s of [-1, 1]) m.limb([x + s * 3.8, 1, 0], [x + s * 3.8, 0.2, 0], 0.9, 0.9, { color: PLANK, group: `f${x}${s}` });
  });
  return m;
}

const rabbit = {
  post: [frames(2, (t) => stoneLamp(t, { stone: '#c8c8f4', light: '#f4f4ff', glow: '#ffe890' }))],
  crate: [[mortero()], [jarron()]],
  group: [[biombo()]],
  wall: [[stonePillar({ stone: '#dcdcf8', dark: '#9496d0', light: '#ffffff', mark: (x, y) => { const d = Math.hypot(x, y - 2); return d < 2 ? '#ffe890' : d < 3 ? '#7478d0' : Math.abs(y + 4.4) < 0.5 ? '#7478d0' : null; }, top: (m) => { m.drum([0, 19], 6, 2.4, 1.2, { color: '#7c86e0', group: 'roof', over: 1 }); for (const s of [-1, 1]) m.limb([s * 5.4, 18.4], [s * 7, 20.6], 0.9, 0.5, { color: '#9ca4f0', group: `e${s}`, over: 2 }); m.ball([0, 21.4], [1.2, 1.4, 1.2], { color: GOLD, group: 'tip', over: 2 }); } })]],
  barrel: [frames(8, (t) => spoked((t * TAU) / 6, { rim: ['#6a78e8', '#aab4ff'], spoke: '#eceaff', hub: '#ffe890' }))],
  hopper: [poses(toad, { skin: '#8ce0c0', dark: '#4aa08c', belly: '#f0fff0' })],
};

// --- Serpiente: el lago de la Serpiente Blanca ------------------------------------------------------------------

/** Una sombrilla de papel, clavada y medio abierta. */
function sombrilla() {
  const m = make();
  m.limb([0, 0], [0, 15], 0.9, 0.8, { color: PLANK, group: 'stick' });
  m.drum([0, 10.4], 5.6, 0.9, 4, { color: (l) => { const a = Math.atan2(l[2], l[0]); return Math.abs(l[1] + 3.2) < 0.7 ? GOLD : Math.sin(a * 8) > 0.6 ? DEEP : Math.abs(l[1] + 0.6) < 0.8 ? PAPER : RED; }, group: 'paper', over: 1 });
  m.ball([0, 15], [1.1, 1.4, 1.1], { color: GOLD, group: 'tip', over: 2 });
  return m;
}

/** Un poste de amarre, con su reata. */
function amarre() {
  const m = make();
  m.limb([0, 0], [0.4, 12.6], 2.2, 2, { color: (l) => (Math.sin(l[0] * 22) > 0.75 ? PLANK : WOOD), group: 'post' });
  m.ball([0.4, 13], [2.1, 0.9, 2.1], { color: CREAM, group: 'cut', over: 1 });
  for (const y of [6.4, 8, 9.6]) m.drum([0.2, y], 2.7, 2.7, 0.7, { color: y === 8 ? '#e8d090' : '#fff0c0', group: `rope${y}`, over: 2 });
  m.chain([[2.6, 7.4, 1], [5.4, 4, 1.4], [4.6, 0.8, 1.6]], 0.8, 0.7, { color: '#fff0c0', group: 'end', over: 2 });
  return m;
}

/** Una cubeta de madera, con su asa. */
function cubeta() {
  const m = make();
  m.drum([0, 4.8], 4.6, 6.2, 4.8, { color: (l) => (Math.abs(Math.abs(l[1]) - 2.6) < 0.7 ? '#5ac0a8' : Math.abs(((l[0] + 30) % 2.4) - 1.2) < 0.22 ? PLANK : WOOD), group: 'wood' });
  m.drum([0, 9.6], 5.4, 5.4, 0.5, { color: '#5ab0e0', group: 'water', over: 1 });
  m.chain([[-5.8, 9, 0], [-4.4, 13.4, 0], [0, 15, 0], [4.4, 13.4, 0], [5.8, 9, 0]], 0.75, 0.75, { color: '#fff0c0', group: 'handle', over: 2 });
  return m;
}

/** Una lancha volcada, con su remo. */
function lancha() {
  const m = make();
  for (let i = 0; i <= 18; i++) {
    const k = i / 18;
    const side = (2 * k - 1) ** 2;
    m.ball([-12 + 24 * k, 4.2 - side * 2, 0], [1.7, 4.4 * (1 - side * 0.6), 4.2 * (1 - side * 0.6)], { color: (l) => (l[1] > 3 ? RED : l[1] > 1.6 ? WHITE : Math.abs(l[1] + 1) < 0.3 ? '#2f8078' : '#4ab8a8'), group: 'hull', blend: 1 });
  }
  m.box([0, 8.6, 0], [9, 0.6, 0.8], { color: DEEP, group: 'keel', over: 1 });
  m.limb([-11, 0.8, 4.6], [8, 9.6, 4], 0.9, 0.9, { color: WOOD, group: 'oar', over: 2 });
  m.ball([9.4, 10.4, 3.8], [2.6, 1.3, 0.9], { turn: 0.5, color: '#ffd24a', group: 'oar', over: 2 });
  return m;
}

/** Una pagoda chica de piedra. */
const pagodita = () => stonePillar({
  stone: '#cfdcc8', dark: '#8aa08c', light: '#f2f8ea', moss: LEAF,
  mark: (x, y) => (Math.abs(x) < 1.5 && Math.abs(y + 4) < 2 ? DARK : Math.abs(x) < 1.2 && Math.abs(y - 2) < 1.4 ? '#ffd27a' : Math.abs(y + 0.4) < 0.6 ? '#e8704a' : null),
  top: (m) => {
    for (const [y, r] of [[10, 6], [18.6, 6.4], [21.4, 4]]) m.drum([0, y], r, r * 0.5, 0.9, { color: '#5aa07c', group: `r${y}`, over: 1 });
    m.limb([0, 22], [0, 25], 0.9, 0.2, { color: GOLD, group: 'tip', over: 2 });
  },
});

const snake = {
  post: [[sombrilla()], [amarre()]],
  crate: [[cubeta()], [cajaTe({ wood: '#b8d488', plank: '#6f9058', lid: '#e4f4b8' })]],
  group: [[lancha()]],
  wall: [[pagodita()]],
  barrel: [frames(8, (t) => cask(t * TAU, { wood: '#f0b068', gap: '#a8683c', hoop: '#8ad4b0', seal: '#ff8ab8' }))],
  hopper: [poses(toad, { skin: '#f0d84a', dark: '#b88a2c', belly: '#fffbd8' })],
};

export { rat, ox, tiger, rabbit, snake, cerca };
