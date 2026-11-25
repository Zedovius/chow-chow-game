// Lo que comparten los obstáculos (obstaculos.mjs y los de cada mundo): la paleta, el fuego, las ruedas, los
// bichos. Cada función da un Model: lo del suelo, de pie en (0, 0); lo del aire, centrado. En los bichos, pose: 0
// sentado, 1 encogido, 2 en el aire.

import { Model, TAU } from './modelo3d.mjs';

export { TAU };
// Valores claros: en la pantalla, lo que se juega es lo más claro y el fondo, lo más oscuro
const RED = '#e83a3e';
const DEEP = '#9a1f2c';
const GOLD = '#f4be4c';
const CREAM = '#fdf0cc';
const DARK = '#2c1a28';
const WOOD = '#dc9a58';
const PLANK = '#9a5e34';
const CLAY = '#c2604c';
const IRON = '#e4eaf6';
const STONE = '#b9bed4';
const CARVED = '#565c7c';
const FLAME = '#ff6a1e';
const HOT = '#ffe88a';
const EMBER = '#ff8a2e';


export const C = { RED, DEEP, GOLD, CREAM, DARK, WOOD, PLANK, CLAY, IRON, STONE, CARVED, FLAME, HOT, EMBER };

export const make = () => {
  const m = new Model();
  m.farShade = false;
  return m;
};

export const frames = (n, build) => Array.from({ length: n }, (_, i) => build(i / n));
/** Las tres poses de un bicho. */
export const poses = (build, ...rest) => [0, 1, 2].map((pose) => build(pose, ...rest));

/** Ladrillos. */
export const brick = (a, b, w = 4, h = 2.6) => (l) => {
  const row = Math.floor((l[1] + 40) / h);
  const joint = Math.abs(((l[1] + 40) % h) / h - 0.5) > 0.38 || Math.abs((((l[0] + row * w * 0.5 + 60) % w) / w) - 0.5) > 0.42;
  return joint ? b : a;
};

/** Una llama en punta que se mueve (t: 0 a 1). */
export function fire(m, [x, y, z = 0], k, t, high = 1) {
  const sway = Math.sin(t * TAU) * 0.9 * k;
  const tall = 1 + 0.14 * Math.cos(t * TAU * 2);
  const tongue = (color, group, over, r, top, flat, dz) => {
    m.ball([x, y + r * 0.9, z + dz], [r, r * 0.95, r * 0.8], { color, group, flat, over, blend: 1.4 });
    m.chain([[x, y + r, z + dz], [x + sway * 0.5, y + top * 0.6 * tall * high, z + dz], [x + sway, y + top * tall * high, z + dz]], r * 0.86, 0.15, { color, group, flat, over, blend: 1.2 });
  };
  tongue(FLAME, 'fire', 4, 2.6 * k, 7.4 * k, 2, 0);
  tongue('#ffc23a', 'warm', 5, 1.7 * k, 5 * k, 3, 1.2 * k);
  tongue('#fff6c0', 'hot', 6, 0.9 * k, 2.8 * k, 4, 2 * k);
}

/** La chispa de una mecha (t: 0 a 1). */
export function spark(m, [x, y, z = 0], t) {
  const r = 1 + 0.5 * Math.abs(Math.sin(t * TAU));
  m.ball([x, y, z], [r, r, r], { color: HOT, group: 'spark', flat: 4, over: 6, blend: 0 });
  for (let i = 0; i < 4; i++) {
    const a = t * TAU * 0.5 + (i * TAU) / 4;
    m.dot([x + Math.cos(a) * 2.1, y + Math.sin(a) * 2.1, z + 1], i % 2 ? FLAME : HOT);
  }
}

/** Caja: un cajón de cohetes. */
export function rockets(t) {
  const m = make();
  m.box([0, 3.8], [6, 3.8, 4], {
    color: (l) => {
      if (l[2] > 3.2 && Math.abs(l[0]) + Math.abs(l[1]) < 1.5) return GOLD;
      if (l[2] > 3.2 && Math.abs(l[0]) + Math.abs(l[1]) < 3.1) return RED;
      if (Math.abs(l[0]) > 4.8) return PLANK;
      return Math.abs(l[1]) > 3 || Math.abs(l[1] + 0.1) < 0.3 ? PLANK : WOOD;
    },
    group: 'box',
  });
  const rocket = (x, tilt, top, color) => {
    m.limb([x, 7], [x + tilt, top], 1.6, 1.6, { color: (l) => (l[0] > 0.3 && l[0] < 0.62 ? GOLD : color), group: `r${x}`, over: 1 });
    m.limb([x + tilt, top], [x + tilt * 1.4, top + 2.6], 1.8, 0.2, { color: CREAM, group: `t${x}`, over: 1, blend: 0 });
  };
  rocket(-3.6, -0.9, 9.4, RED);
  rocket(0, 0, 10.2, DEEP);
  rocket(3.6, 0.9, 9.4, RED);
  spark(m, [6, 8.4, 2], t);
  return m;
}

/** Caja: un atado de cohetones rojos con la mecha encendida. */
export function bundle(t) {
  const m = make();
  for (const [x, z, h, color] of [[-4.2, 0, 4.1, RED], [4.2, 0, 4.1, RED], [0, 1, 4.6, '#ff7a3a']]) {
    m.drum([x, h, z], 2.3, 2.3, h, { color: (l) => (Math.abs(l[1]) > h - 1.2 ? GOLD : Math.abs(l[0]) > 1.9 ? DEEP : color), group: `tube${x}` });
    m.drum([x, h * 2, z], 1.6, 1.6, 0.4, { color: CREAM, group: `cap${x}`, over: 1 });
  }
  m.box([0, 4.4], [6.4, 0.5, 3.6], { color: DARK, group: 'tie', over: 2, flat: 1 });
  m.chain([[0, 9], [0.8, 11], [2.6, 11.6]], 0.6, 0.5, { color: CREAM, group: 'fuse', over: 3 });
  spark(m, [3.6, 11.4, 1], t);
  return m;
}

/** Barril: una rueda de fuego, como las de Nezha y las de los castillos de pirotecnia (turn: cuánto ha girado). */
export function wheel(turn) {
  const m = make();
  const r = 4.4;
  const y = 4.4;
  m.ball([0, y], [r, r, 2], {
    color: (l) => {
      const d = Math.hypot(l[0], l[1]);
      const a = Math.atan2(l[1], l[0]) - turn;
      if (d > r * 0.78) return DEEP;
      if (d < 1) return GOLD;
      const k = ((a / TAU + d * 0.045) % 1) + 1; // un rehilete de cuatro aspas
      return Math.floor((k * 4) % 4) % 2 ? CREAM : RED;
    },
    group: 'wheel',
    over: 2,
  });
  for (let i = 0; i < 7; i++) {
    const a = turn + (i * TAU) / 7;
    const at = (k, dist) => [Math.cos(a + k) * dist, y + Math.sin(a + k) * dist, -0.6];
    if (at(0.5, 6.2)[1] < 0.8) continue; // abajo, aplastadas contra el suelo
    m.limb(at(0, r - 0.6), at(0.55, 6.9), 1.6, 0.2, { color: (l) => (l[0] < 0.5 ? '#ffc23a' : FLAME), group: `lick${i}`, flat: 3, blend: 0 });
  }
  return m;
}

/** Bicho que brinca: un sapo, de frente. pose: 0 sentado, 1 encogido, 2 en el aire. */
export function toad(pose, { skin: G = '#7cc45a', dark: D = '#3f8a4a', belly: L = '#f0f0b0', eye = '#ff4a3a' } = {}) {
  const m = make();
  const y = pose === 1 ? -0.4 : pose === 2 ? 1.2 : 0;
  const [wide, tall] = pose === 1 ? [5.2, 2.6] : pose === 2 ? [4.2, 3.5] : [4.7, 3.1];
  m.ball([0, 3.2 + y], [wide, tall, 3], {
    color: (l) => {
      if (l[2] > 0.4 && Math.abs(l[1] - 0.3 + l[0] * l[0] * 0.03) < 0.5 && Math.abs(l[0]) < wide - 1) return DARK; // la boca
      if (l[2] > 0.4 && l[1] < -0.2 && Math.abs(l[0]) < wide - 1.6) return L;
      return G;
    },
    group: 'body',
  });
  for (const x of [-2.6, 2.6]) {
    m.ball([x, 5.4 + y + (tall - 3.1) * 0.6, 0.8], [1.8, 1.7, 1.6], { color: eye, group: `eye${x}`, over: 1, flat: 3, blend: 0 });
    for (const dy of [-0.5, 0.5]) m.dot([x - 0.5, 5.5 + dy + y + (tall - 3.1) * 0.6, 4], DARK);
  }
  for (const s of [-1, 1]) {
    if (pose === 2) m.limb([s * 3, 1.8 + y, 0.4], [s * 4.8, -0.2 + y, 0.6], 1.5, 1, { color: D, group: `leg${s}`, over: 1 });
    else {
      m.ball([s * 4.6, 1.5, 0], [1.8, 1.5, 2], { color: D, group: `leg${s}`, over: 1 });
      m.limb([s * 4.4, 0.6, 1.2], [s * 5.8, 0.6, 1.2], 0.8, 0.7, { color: D, group: `leg${s}`, over: 1 });
    }
  }
  return m;
}

/** Una rueda de carreta suelta (turn: cuánto ha girado). */
export function spoked(turn, { rim = ['#a0643a', '#e0a060'], spoke = '#e0a060', hub = '#a0643a' } = {}) {
  const m = make();
  const [r, y] = [4.9, 4.8];
  for (let i = 0; i < 18; i++) {
    const [a, b] = [turn + (i / 18) * TAU, turn + ((i + 1) / 18) * TAU];
    m.limb([Math.cos(a) * r, y + Math.sin(a) * r, 0], [Math.cos(b) * r, y + Math.sin(b) * r, 0], 1.25, 1.25, { color: i % 6 === 0 ? IRON : rim[i % 2], group: 'rim', blend: 0.4 });
  }
  for (let i = 0; i < 6; i++) {
    const a = turn + (i / 6) * TAU;
    m.limb([0, y, 0], [Math.cos(a) * (r - 0.6), y + Math.sin(a) * (r - 0.6), 0], 0.8, 0.7, { color: spoke, group: 'spoke' });
  }
  m.ball([0, y, 0], [1.8, 1.8, 2], { color: (l) => (Math.hypot(l[0], l[1]) < 0.8 ? GOLD : hub), group: 'hub', over: 2 });
  return m;
}

/**
 * Un roedor que brinca. pose: 0 sentado, 1 encogido, 2 en el aire. tail: long (jerbo), none (pica) o bushy
 * (ardilla); ears: qué tan largas.
 */
export function rodent(pose, { coat = '#f0b870', belly = '#fff2d0', dark = '#a8683c', ear = '#ffd8a8', tail = 'long', ears = 1 } = {}) {
  const m = make();
  const y = [0, -0.7, 2][pose];
  const tall = [1, 0.86, 1.06][pose];
  m.ball([0.9, 4.2 + y], [4, 3.7 * tall, 3], { turn: pose === 2 ? -0.35 : 0.2, color: (l) => (l[1] < -0.9 ? belly : coat), group: 'body', blend: 1.4 });
  m.ball([-2.2, 6.4 + y], [2.9, 2.6, 2.5], { color: (l) => (l[1] < -0.8 ? belly : coat), group: 'body', blend: 1.2 });
  m.ball([-4.8, 5.8 + y], [0.9, 0.8, 0.9], { color: '#e0a08a', group: 'nose', over: 1 });
  for (const z of [-1.3, 1.5]) m.limb([-1.4, 8.2 + y, z], [-0.6 + (pose === 2 ? 1.2 : 0), 8.2 + 2.6 * ears + y - (pose === 2 ? 1.2 : 0), z * 1.3], 1.3, 0.9, { color: z > 0 ? ear : coat, group: `ear${z}`, over: z > 0 ? 2 : 0 });
  for (const dy of [6.4, 7.2]) m.dot([-3.4, dy + y, 4], '#1b1226');
  if (pose === 2) {
    m.chain([[2.4, 3 + y, 1.8], [4.2, 1.2 + y, 2], [6, 0.2 + y, 2]], 1.4, 0.7, { color: coat, group: 'leg', over: 1 });
    if (tail === 'long') {
      m.chain([[3, 4.4 + y, 0], [5.2, 5.4 + y, 0], [6.8, 4.8 + y, 0]], 0.8, 0.6, { color: dark, group: 'tail' });
      m.ball([7.2, 4.6 + y, 0], [1.2, 1, 1], { color: belly, group: 'tuft', over: 1 });
    } else if (tail === 'bushy') m.chain([[3.4, 4 + y, 0], [6, 5.6 + y, 0], [7.2, 7.4 + y, 0]], 1.5, 1.9, { color: dark, group: 'tail' });
  } else {
    m.ball([2, 2, 1.6], [2.3, 1.9, 1.6], { color: coat, group: 'leg', over: 1 });
    m.limb([2.6, 0.7, 2], [-1.2, 0.6, 2.2], 0.9, 0.7, { color: belly, group: 'foot', over: 1 });
    if (tail === 'long') {
      m.chain([[4, 2.4 + y, 0], [6, 1.6, 0], [7.2, 3.6, 0]], 0.8, 0.6, { color: dark, group: 'tail' });
      m.ball([7.4, 4.6, 0], [1.1, 1.4, 1], { color: belly, group: 'tuft', over: 1 });
    } else if (tail === 'bushy') m.chain([[4, 2, 0], [6.6, 4, 0], [6.2, 8, 0], [4.6, 9.6, 0]], 1.4, 2, { color: dark, group: 'tail' });
  }
  m.limb([-1.4, 3.8 + y, 1.6], [-2.8, 2.8 + y, 2], 0.8, 0.6, { color: coat, group: 'arm', over: 1 });
  return m;
}

/**
 * Algo redondo y plano que rueda (turn: cuánto ha girado), de frente. face(d, a, l): el color a una distancia d (0
 * el centro, 1 la orilla) y un ángulo a.
 */
export function roller(turn, face, { r = 4.8, thick = 2.6, side = '#9a5e34' } = {}) {
  const m = make();
  m.ball([0, r], [r, r, thick], {
    color: (l) => (l[2] < -0.4 ? side : face(Math.hypot(l[0], l[1]) / r, Math.atan2(l[1], l[0]) - turn, l)),
    group: 'roll',
  });
  return m;
}

/** Un grillo o un chapulín. */
export function cricket(pose, { body = '#a8d860', dark = '#5a9a3c', belly = '#f4f4b8', eye = '#ff4a3a' } = {}) {
  const m = make();
  const y = [0, -0.6, 2][pose];
  m.ball([0.8, 3.6 + y], [4.4, 2, 1.9], { turn: pose === 2 ? 0.25 : 0.06, color: (l) => (l[1] < -0.5 ? belly : body), group: 'body' });
  m.ball([-3.4, 4.2 + y], [2.2, 2.1, 2], { color: (l) => (l[1] < -0.8 ? belly : body), group: 'head', over: 1 });
  for (const z of [-1.5, 1.8]) m.ball([-4.2, 5 + y, z], [1, 1, 0.8], { color: eye, group: `eye${z}`, over: 2, flat: 3, blend: 0 });
  m.ball([1.6, 4.9 + y], [3.8, 1.3, 1.6], { turn: pose === 2 ? 0.5 : 0.08, color: (l) => (Math.sin(l[0] * 2.4) > 0.6 ? body : dark), group: 'wing', over: 2 });
  for (const z of [-1, 1.2]) m.chain([[-4, 6 + y, z], [-5.2, 8 + y, z], [-4.4, 9.6 + y, z * 1.4]], 0.6, 0.45, { color: dark, group: `ant${z}`, over: 2 });
  const knee = pose === 2 ? [4.6, 4.6 + y, 2] : pose === 1 ? [2.6, 6.6, 2] : [3, 7.4, 2];
  const foot = pose === 2 ? [7.4, 1.6 + y, 2] : [4.6, 0.6, 2.2];
  m.limb([1, 3 + y, 1.6], knee, 1.4, 0.9, { color: dark, group: 'femur', over: 3 });
  m.limb(knee, foot, 0.8, 0.6, { color: body, group: 'tibia', over: 3 });
  for (const x of [-2.4, -0.6]) m.limb([x, 2.6 + y, 1.4], [x - 0.8, pose === 2 ? 0.6 + y : 0.6, 2.2], 0.65, 0.55, { color: dark, group: `leg${x}`, over: 1 });
  return m;
}

/** Una caja de tablas, con su cruceta y lo que lleve pintado al frente (mark: (x, y) → color o nada). */
export function crate({ wood = C.WOOD, plank = C.PLANK, lid = '#f0b878', half = [6.4, 4.6, 4.4], mark = null } = {}) {
  const m = make();
  const [w, h, d] = half;
  m.box([0, h], half, {
    color: (l) => {
      if (Math.abs(l[0]) > w - 1.1 || Math.abs(l[1]) > h - 0.9) return plank;
      const own = l[2] > d - 1.4 && mark?.(l[0], l[1]);
      return own || (Math.abs(((l[1] + 20) % 2.4) - 1.2) > 1 ? plank : wood);
    },
    group: 'box',
  });
  m.box([0, h * 2 + 0.3], [w + 0.4, 0.6, d + 0.3], { color: lid, group: 'lid', over: 1 });
  return m;
}

/** Un pilar o una torre de piedra: lo que no se quema. mark: lo que lleva labrado al frente. */
export function stonePillar({ stone = C.STONE, dark = '#848aa8', light = '#eef0fa', mark = null, top = null, moss = null } = {}) {
  const m = make();
  m.box([0, 1.2], [5.4, 1.2, 4.4], { color: light, group: 'base' });
  m.box([0, 10], [4.4, 8, 3.6], {
    color: (l) => (l[2] > 2.2 && mark?.(l[0], l[1])) || (moss && l[1] > 5.4 + Math.sin(l[0] * 2.4) * 1.4 ? moss : Math.sin(l[1] * 1.3 + Math.sin(l[0]) * 0.6) > 0.94 ? dark : stone),
    group: 'body',
    round: 0.4,
  });
  if (top) top(m);
  else {
    m.box([0, 18.4], [5.4, 0.9, 4.4], { color: light, group: 'ledge', over: 1 });
    for (const x of [-4.2, 0, 4.2]) m.box([x, 20.4], [1.2, 1.4, 3.8], { color: stone, group: `m${x}`, over: 1 });
  }
  return m;
}
