// Los obstáculos de la Cabra, el Mono, el Perro y el Cerdo, y lo del aire del Dragón y el Gallo (sin suelo). Ver
// obstaculosMundos.mjs.

import { cerca } from './obstaculosMundos1.mjs';
import { bundle, C, fire, frames, make, poses, rockets, rodent, roller, spark, spoked, stonePillar, TAU, wheel } from './obstaculosPiezas.mjs';

const { RED, DEEP, GOLD, CREAM, DARK, WOOD, PLANK, IRON } = C;
const SKY = '#6ab8f8';
const LEAF = '#7cc050';
const WHITE = '#fbfaff';

// --- Cabra: la pradera -----------------------------------------------------------------------------------

/** Un poste con pañuelos de seda, al viento. */
function panuelos(t) {
  const m = make();
  for (const [x, z, r] of [[-2, 0.8, 2], [2.2, 0.4, 1.9], [0, -1, 2.2]]) m.ball([x, 1, z], [r, 1.6, r], { color: '#d0d4dc', group: 'rock', blend: 0.8 });
  m.drum([0, 8], 1.1, 1, 7.6, { color: WOOD, group: 'pole' });
  m.ball([0, 16], [1.3, 1.1, 1.3], { color: GOLD, group: 'tip', over: 1 });
  [[13.4, SKY], [9.8, '#fff4d8'], [6.4, RED]].forEach(([y, c], n) => {
    for (let i = 0; i < 5; i++) m.box([1 + i * 1.1, y - i * 0.4 + Math.sin(t * TAU - i + n) * 0.5, Math.cos(t * TAU - i + n)], [0.75, 1.5 - i * 0.12, 0.9], { color: c, group: `f${n}${i}`, over: 1 });
  });
  return m;
}

/** Leña apilada. */
function lena() {
  const m = make();
  for (const [x, y] of [[-4.4, 2.2], [0, 2.2], [4.4, 2.2], [-2.2, 6], [2.2, 6], [0, 9.8]]) {
    m.limb([x, y, -4], [x, y, 4], 2.2, 2.2, { color: PLANK, group: `l${x}${y}` });
    m.ball([x, y, 4.4], [2, 2, 0.9], { color: (l) => (Math.abs(Math.hypot(l[0], l[1]) - 1.1) < 0.3 ? WOOD : CREAM), group: `c${x}${y}`, over: 1 });
  }
  return m;
}

/** Un fardo cuadrado de lana, con sus cinchos. */
function lana() {
  const m = make();
  m.box([0, 5.4], [6.8, 5.4, 4.6], { round: 1, color: (l) => (Math.abs(Math.abs(l[0]) - 3.4) < 0.8 ? '#b07a4a' : Math.sin(l[0] * 2.2) * Math.sin(l[1] * 2.4 + 1) > 0.4 ? '#e0d0b0' : '#fbf0da'), group: 'bale' });
  for (const [x, y] of [[-5, 10.6], [3, 10.8], [5.6, 10.2]]) m.ball([x, y, 1], [1.6, 1.1, 1.6], { color: '#fffaf0', group: `tuft${x}`, over: 1 });
  return m;
}

/** Un ovoo: piedras apiladas, con sus pañuelos. No se quema. */
function ovoo() {
  const m = make();
  [[5.6, 2], [5, 5.4], [4.4, 8.8], [3.6, 12], [2.8, 15], [1.9, 17.6]].forEach(([r, y], i) => {
    for (const s of [-1, 0.2, 1]) m.ball([s * r * 0.52, y + (s === 0.2 ? 0.8 : 0), s === 0.2 ? r * 0.4 : 0], [r * 0.6, 2, r * 0.6], { color: i % 2 ? '#b8bcd0' : '#d4d8e8', group: `s${i}${s}`, blend: 0 });
  });
  m.limb([0, 17, 0], [0.6, 22, 0], 0.7, 0.6, { color: PLANK, group: 'stick' });
  m.box([2.2, 20.6, 0.4], [2, 1.4, 0.9], { color: SKY, group: 'flag', over: 1 });
  for (const [x, y] of [[-3.4, 9], [2.6, 5.4]]) m.box([x, y, 4], [1.4, 0.9, 0.9], { color: SKY, turn: 0.4, group: `k${x}`, over: 2 });
  return m;
}

const goat = {
  post: [frames(4, panuelos)],
  crate: [[lena()], [lana()]],
  group: [[cerca({ wood: '#f0cc98', dark: '#b08a60' })]],
  wall: [[ovoo()]],
  barrel: [frames(8, (t) => spoked((t * TAU) / 6, { rim: ['#e8703c', '#ffa860'], spoke: '#ffe0a0', hub: '#5a90d8' }))],
  hopper: [poses(rodent, { coat: '#d8c0a8', belly: '#fff6e8', dark: '#9a7c64', ear: '#ffc8c0', tail: 'none', ears: 0.25 })],
};

// --- Mono: el monte de los frutos -----------------------------------------------------------------------------

/** Una zarza con espinas. */
function zarza() {
  const m = make();
  const vine = [[-1, 0, 0], [-3, 4, 0.6], [1.4, 7.4, -0.4], [-1.6, 10.6, 0.8], [1.8, 13.6, 0]];
  m.chain(vine, 1.9, 1, { color: (l) => (Math.sin(l[0] * 14) > 0.6 ? '#4a8a34' : LEAF), group: 'vine' });
  m.chain([[1, 0, 1], [3.4, 3, 1.4], [0.6, 6, 1.6], [3.2, 9, 0.8]], 1.6, 0.9, { color: '#a4d860', group: 'vine2' });
  for (const [x, y, dx, dy] of [[-3, 4, -2.4, 0.6], [1.4, 7.4, 2.6, 0.8], [-1.6, 10.6, -2.6, 0.8], [3.4, 3, 2.4, 0.4], [3.2, 9, 2, 1.4], [1.8, 13.6, 0.8, 2.6], [-1, 2, -2.2, 1]]) m.limb([x, y, 0.6], [x + dx, y + dy, 1], 1, 0.15, { color: '#ffd0c0', group: `t${x}${y}`, over: 1, blend: 0 });
  return m;
}

/** Un tocón con su hacha. */
function tocon() {
  const m = make();
  m.drum([0, 3.6], 6, 5, 3.6, { color: (l) => (Math.sin(l[0] * 2.2 + Math.sin(l[1]) * 0.4) > 0.5 ? PLANK : WOOD), group: 'wood' });
  for (const [x, z] of [[-5, 2], [5, 2.4], [0.6, 4.6]]) m.ball([x, 0.9, z], [2, 1.1, 1.6], { color: PLANK, group: `root${x}`, blend: 0.6 });
  m.drum([0, 7.4], 4.9, 4.9, 0.5, { color: (l) => (Math.abs(((Math.hypot(l[0], l[2]) + 10) % 1.8) - 0.9) < 0.35 ? WOOD : CREAM), group: 'top', over: 1 });
  m.limb([0.6, 8, 0], [5, 13.6, 0.6], 0.9, 0.8, { color: PLANK, group: 'handle', over: 2 });
  m.box([0.4, 9.2, 0], [2.6, 1.7, 0.9], { color: IRON, turn: 0.7, group: 'axe', over: 3 });
  return m;
}

/** Un tronco caído, con musgo. */
function tronco() {
  const m = make();
  m.limb([-9, 4.6, 0], [8, 4.8, 0], 4.6, 4.2, { color: (l) => (Math.sin(l[0] * 30) > 0.8 ? PLANK : WOOD), group: 'log' });
  m.ball([-11.2, 4.6, 0.6], [1.6, 4, 4], { color: (l) => (Math.abs(((Math.hypot(l[1], l[2]) + 10) % 1.8) - 0.9) < 0.35 ? WOOD : CREAM), group: 'cut', over: 1 });
  for (const [x, r] of [[-5, 2.6], [0, 3], [5, 2.4]]) m.ball([x, 8.4, 0], [r, 1.1, 3], { color: LEAF, group: `m${x}`, over: 1 });
  m.limb([3, 7, 1], [6.6, 11.8, 1.4], 1.4, 0.7, { color: PLANK, group: 'b1', over: 1 });
  m.limb([-3, 7.4, 1], [-5, 10.6, 1.6], 1.2, 0.6, { color: PLANK, group: 'b2', over: 1 });
  return m;
}

/** Un huacal de frutero, vacío. */
function huacal() {
  const m = make();
  for (const z of [-4, 4]) {
    for (const y of [1.4, 4.8, 8.2]) m.box([0, y, z], [6.8, 1.1, 0.8], { color: y === 4.8 ? '#f0b878' : WOOD, group: `s${y}${z}` });
    for (const x of [-6, 0, 6]) m.box([x, 4.8, z], [0.9, 4.8, 1], { color: PLANK, group: `p${x}${z}`, over: 1 });
  }
  for (const x of [-6.4, 6.4]) for (const y of [1.4, 4.8, 8.2]) m.box([x, y, 0], [0.8, 1.1, 4], { color: WOOD, group: `e${x}${y}` });
  m.box([0, 0.8, 0], [6.4, 0.8, 4], { color: PLANK, group: 'floor' });
  return m;
}

const monkey = {
  post: [[zarza()]],
  crate: [[tocon()], [huacal()]],
  group: [[tronco()]],
  wall: [[stonePillar({ stone: '#d8ccb0', dark: '#9a8c6c', light: '#f6f0dc', moss: LEAF, mark: (x, y) => { const [a, b] = [Math.abs(x), y - 1]; return (a > 0.8 && a < 2.4 && b > 0.6 && b < 2) ? RED : (a < 2.4 && Math.abs(b + 1.6) < 0.5) || (a < 0.6 && Math.abs(b) < 0.5) ? '#5a4a30' : null; } })]],
  barrel: [frames(8, (t) => roller(t * TAU, (d, a) => (d > 0.84 ? PLANK : Math.abs(((d * 4 + Math.sin(a * 3) * 0.16 + 10) % 1.1) - 0.55) < 0.22 ? PLANK : '#f4cc90'), { side: '#7a4a2c', r: 5.6 }))],
  hopper: [poses(rodent, { coat: '#f08a4a', belly: '#fff0d8', dark: '#c85a28', ear: '#ffb888', tail: 'bushy', ears: 0.5 })],
};

// --- Perro: la calle, en los ochenta ---------------------------------------------------------------------------

/** Un cono de tránsito. */
function cono() {
  const m = make();
  m.box([0, 0.9], [5, 0.9, 4], { color: '#ff8a3c', group: 'base', round: 0.4 });
  m.drum([0, 8], 3.8, 0.9, 6.6, { color: (l) => (Math.abs(l[1] + 1) < 1.3 || Math.abs(l[1] - 3.6) < 1 ? WHITE : '#ff6a2c'), group: 'cone', over: 1 });
  return m;
}

/** Un hidrante. */
function hidrante() {
  const m = make();
  m.drum([0, 0.8], 4, 3.6, 0.8, { color: '#ff6a5a', group: 'base' });
  m.drum([0, 5.6], 2.9, 2.9, 4.4, { color: RED, group: 'body' });
  m.ball([0, 10.4], [3, 2.4, 2.9], { color: '#ff6a5a', group: 'dome', over: 1 });
  m.drum([0, 9.4], 3.5, 3.5, 0.6, { color: GOLD, group: 'ring', over: 2 });
  m.ball([0, 13.2], [1.1, 0.9, 1.1], { color: GOLD, group: 'nut', over: 2 });
  for (const s of [-1, 1]) m.ball([s * 3.6, 6.6, 0], [1.6, 1.5, 1.5], { color: GOLD, group: `s${s}`, over: 1 });
  m.ball([0, 6.2, 3], [1.5, 1.5, 1.2], { color: GOLD, group: 'front', over: 2 });
  return m;
}

/** Rejas de refrescos. */
function refrescos() {
  const m = make();
  [[0, RED, '#ff8a7a'], [5.6, '#f4b83c', '#ffe08a']].forEach(([y, c, l0], i) => {
    m.box([i * 0.8, y + 2.6], [6.4 - i * 0.6, 2.6, 4.4], { color: (l) => (Math.abs(l[1]) > 1.7 ? l0 : Math.abs(((l[0] + 30) % 3) - 1.5) < 0.9 && Math.abs(l[1]) < 1.1 ? DARK : c), group: `c${i}` });
  });
  for (const x of [-3.4, 0, 3.4]) {
    m.drum([x + 0.8, 11.8, 0], 1.3, 0.8, 1.2, { color: '#a8e8b8', group: `b${x}`, over: 1 });
    m.ball([x + 0.8, 13.4, 0], [0.8, 0.6, 0.8], { color: IRON, group: `t${x}`, over: 2 });
  }
  return m;
}

/** Una tele de los ochenta, con estática. */
function tele(t) {
  const m = make();
  for (const x of [-4.4, 4.4]) m.limb([x, 0.4, 2], [x * 0.9, 2, 2], 0.9, 0.9, { color: PLANK, group: `leg${x}` });
  m.box([0, 7], [6.8, 5, 4.4], { color: (l) => (Math.abs(l[0]) > 5.8 || Math.abs(l[1]) > 4.1 ? '#f0b878' : WOOD), group: 'box', round: 0.5 });
  m.box([-1.2, 7.2, 4.4], [4.2, 3.6, 0.9], { color: (l) => (Math.abs(l[0]) > 3.6 || Math.abs(l[1]) > 3 ? DARK : Math.sin(l[0] * 9 + t * 40) * Math.sin(l[1] * 8 - t * 60) > 0.1 ? '#e8f6ff' : '#7ab4e0'), flat: 2, group: 'screen', over: 2 });
  for (const y of [9, 6.6]) m.ball([5, y, 4.6], [0.9, 0.9, 0.7], { color: CREAM, group: `k${y}`, over: 2 });
  for (const s of [-1, 1]) m.limb([0, 12, 0], [s * 4, 16, 0], 0.5, 0.45, { color: IRON, group: `ant${s}` });
  return m;
}

/** Una barrera de obra. */
function barrera(t) {
  const m = make();
  for (const x of [-8.6, 8.6]) for (const z of [-2.4, 2.4]) m.limb([x, 0.4, z], [x * 0.94, 9, z * 0.3], 1, 0.9, { color: IRON, group: `leg${x}${z}` });
  for (const [y, h] of [[8, 1.9], [3.8, 1.4]]) m.box([0, y, 1], [11.6, h, 0.9], { color: (l) => (((l[0] + l[1] + 60) % 5) < 2.5 ? '#ff7a2c' : WHITE), group: `bar${y}`, over: 1 });
  for (const [x, d] of [[-9, 0], [9, 0.5]]) {
    m.box([x, 11.2, 1], [1.3, 1, 1], { color: '#e8b03c', group: `s${x}`, over: 2 });
    m.ball([x, 12.6, 1], [1.5, 1.4, 1.3], { color: Math.floor((t + d) * 2) % 2 ? '#fff6c0' : '#ff9a3c', flat: 3, group: `l${x}`, over: 3 });
  }
  return m;
}

/** Botes de basura. */
function botes() {
  const m = make();
  for (const [x, k, c] of [[-7.4, 1, '#b8c4d8'], [0.2, 1.1, '#8ac0a8'], [7.6, 0.94, '#b8c4d8']]) {
    m.drum([x, 4.6 * k], 3 * k, 3.4 * k, 4.6 * k, { color: (l) => (Math.abs(((l[0] + 30) % 1.8) - 0.9) < 0.35 ? '#7c8aa4' : c), group: `c${x}` });
    m.drum([x + (x < 0 ? -0.6 : 0.4), 9.6 * k], 3.7 * k, 3.2 * k, 0.8, { color: WHITE, group: `lid${x}`, over: 1 });
    m.ball([x, 10.8 * k], [1, 0.7, 1], { color: IRON, group: `h${x}`, over: 2 });
  }
  return m;
}

/** Una paloma que brinca. */
function paloma(pose) {
  const m = make();
  const y = [0, -0.5, 1.8][pose];
  m.ball([0.6, 4.2 + y], [3.9, 2.7, 2.5], { turn: -0.2, color: (l) => (l[1] < -1 ? '#e8ecf8' : '#b4c0e0'), group: 'body' });
  m.ball([-2.4, 6 + y], [1.9, 2.2, 1.8], { color: (l) => (Math.sin(l[1] * 3) > 0 ? '#9a7cd8' : '#6cc8a0'), group: 'neck', over: 1 });
  m.ball([-3.2, 8.2 + y], [1.8, 1.7, 1.7], { color: '#8c9ac8', group: 'head', over: 2 });
  m.limb([-4.6, 8 + y], [-6.4, 7.4 + y], 0.7, 0.3, { color: '#ffb050', group: 'beak', over: 2 });
  m.ball([-3.8, 8.6 + y, 1.6], [0.7, 0.7, 0.6], { color: '#ff6a3c', flat: 3, group: 'eye', over: 3 });
  m.limb([3.6, 3.8 + y], [7, 3 + y], 1.6, 1.3, { color: (l) => (l[0] > 0.7 ? '#5a6490' : '#a0acd0'), group: 'tail' });
  if (pose === 2) for (const s of [-1, 1]) m.limb([0.4, 5 + y, s * 1.4], [2.4, 9.4 + y, s * 3], 1.9, 0.9, { color: s > 0 ? '#dce4f8' : '#8c9ac8', group: `w${s}`, over: s > 0 ? 3 : 0 });
  else m.ball([1.4, 4.8 + y, 1.6], [3, 1.6, 1.2], { turn: -0.2, color: (l) => (Math.abs(l[0] - 1) < 0.5 || Math.abs(l[0] - 2.4) < 0.4 ? '#5a6490' : '#dce4f8'), group: 'wing', over: 2 });
  for (const x of [-0.4, 1.2]) m.limb([x, 2 + y, 0.8], [x - 0.6, pose === 2 ? 0.8 + y : 0.5, 1], 0.7, 0.6, { color: '#ff8a6a', group: `leg${x}`, over: 1 });
  return m;
}

const dog = {
  post: [[cono()], [hidrante()]],
  crate: [[refrescos()], frames(4, tele)],
  group: [frames(4, barrera), [botes()]],
  wall: [[stonePillar({ stone: '#c4c8d4', dark: '#8a90a4', light: '#eceef6', mark: (x, y) => (Math.abs(x) < 2.6 && y > -1 && y < 5 ? (Math.abs(x) > 2 || y < -0.4 || y > 4.4 ? WHITE : y > 2 ? '#ff5a8a' : '#4ad0d8') : Math.abs(x - 0.6) < 1.6 && y < -2.4 && y > -5 ? '#ffd84a' : null), top: (m) => { m.box([0, 18.8], [5.2, 1, 4.2], { color: '#eceef6', group: 'cap', over: 1 }); for (const x of [-3, 0, 3]) m.limb([x, 19.6, 0], [x * 1.1, 22.4, 0], 0.6, 0.5, { color: '#e8905a', group: `v${x}`, over: 1 }); } })]],
  barrel: [frames(8, (t) => roller(t * TAU, (d, a) => (d > 0.84 ? (Math.cos(a * 14) > 0 ? '#3c4058' : '#5a607c') : d > 0.62 ? '#4a4f6c' : d > 0.54 ? WHITE : d > 0.4 ? '#4a4f6c' : Math.abs(Math.sin(a * 2.5)) < 0.35 ? '#5a607c' : '#c4cce0'), { side: '#343850', r: 5.6 }))],
  hopper: [poses(paloma)],
};

// --- Cerdo: la noche de año nuevo -----------------------------------------------------------------------------

/** Una vela roja de fiesta, con su dragón dorado. */
function vela(t) {
  const m = make();
  m.drum([0, 1], 4, 3, 1, { color: GOLD, group: 'base' });
  m.drum([0, 6], 2.5, 2.4, 4.4, { color: (l) => { const a = Math.atan2(l[2], l[0]); return Math.sin(a * 2 + l[1] * 1.5) > 0.72 ? GOLD : RED; }, group: 'wax' });
  m.ball([0, 10.4], [2.6, 0.8, 2.5], { color: '#ff8a7a', group: 'melt', over: 1 });
  fire(m, [0, 10.4], 0.66, t, 1.1);
  return m;
}

/** Una sarta de cohetes en su poste. */
function sarta(t) {
  const m = make();
  m.drum([-3, 8], 1, 1, 8, { color: WOOD, group: 'pole' });
  m.limb([-3, 15.6], [2.6, 15.6], 0.9, 0.8, { color: WOOD, group: 'arm' });
  for (let i = 0; i < 6; i++) for (const s of [-1, 1]) m.limb([2 + s * 0.4, 14.4 - i * 2, s * 0.6], [2 + s * 2.6, 13.2 - i * 2, s], 1, 1, { color: i % 3 === 2 ? GOLD : RED, group: `c${i}${s}`, over: 1 });
  spark(m, [2, 1.8, 1], t);
  return m;
}

/** Una batería de fuegos artificiales. */
function bateria(t) {
  const m = make();
  m.box([0, 1.4], [12, 1.4, 4], { color: PLANK, group: 'base' });
  [[-8.6, RED], [-4.3, GOLD], [0, '#4aa8e8'], [4.3, GOLD], [8.6, RED]].forEach(([x, c], i) => {
    const h = i === 2 ? 5 : 4;
    m.drum([x, 2 + h], 1.9, 1.9, h, { color: (l) => (Math.abs(l[1]) > h - 0.9 ? WHITE : Math.abs(((l[1] + l[0] * 0.6 + 20) % 3) - 1.5) < 0.6 ? WHITE : c), group: `t${x}` });
    m.drum([x, 2.2 + h * 2], 1.3, 1.3, 0.5, { color: DARK, group: `h${x}`, over: 1 });
  });
  spark(m, [-8.6, 12, 1], t);
  spark(m, [8.6, 12, 1], (t + 0.5) % 1);
  return m;
}

/** El Nian, la bestia del año nuevo, en chiquito. */
function nian(pose) {
  const m = make();
  const y = [0, -0.5, 1.8][pose];
  const [wide, tall] = [[4.6, 4], [5.2, 3.4], [4.2, 4.4]][pose];
  m.ball([0, 4.2 + y], [wide, tall, 3.4], { color: (l) => (l[2] > 1 && Math.abs(l[0]) < 2.8 && l[1] < -0.6 && l[1] > -2.2 ? (Math.floor(l[0] + 10) % 2 && l[1] > -1.4 ? WHITE : DEEP) : '#f06a5a'), group: 'body' });
  for (let i = 0; i < 9; i++) {
    const a = -0.5 + (i / 8) * (Math.PI + 1);
    m.ball([Math.cos(a) * (wide + 0.4), 4.6 + y + Math.sin(a) * (tall + 0.2), -0.6], [1.6, 1.6, 1.6], { color: i % 2 ? '#ffd24a' : '#ff9a3c', group: 'mane', over: -1 });
  }
  for (const x of [-1.9, 1.9]) {
    m.ball([x, 5.6 + y, 2.6], [1.5, 1.5, 1.2], { color: WHITE, group: `e${x}`, over: 1, flat: 4 });
    m.dot([x - 0.5, 5.8 + y, 5], DARK);
    m.dot([x - 0.5, 5 + y, 5], DARK);
    m.limb([x * 1.1, 7.6 + y, 1], [x * 1.7, 10.6 + y, 1], 1, 0.3, { color: CREAM, group: `h${x}`, over: 2 });
  }
  for (const s of [-1, 1]) m.ball([s * 2.6, pose === 2 ? 0.6 + y : 0.9, 1], [1.6, 1, 1.6], { color: '#c83a48', group: `f${s}`, over: 1 });
  return m;
}

const pig = {
  post: [frames(4, vela), frames(4, sarta)],
  crate: [frames(4, rockets), frames(4, bundle)],
  group: [frames(4, bateria)],
  wall: [[stonePillar({ stone: '#e4c4d8', dark: '#a884a4', light: '#fff0f8', mark: (x, y) => { const d = Math.abs(x) + Math.abs(y - 1.4); return d < 1.1 ? GOLD : d < 3 ? RED : Math.abs(y + 4.2) < 0.5 ? GOLD : null; }, top: (m) => { m.drum([0, 19], 6, 3, 1.1, { color: GOLD, group: 'roof', over: 1 }); m.ball([0, 21.4], [1.8, 1.8, 1.8], { color: RED, group: 'tip', over: 2 }); } })]],
  barrel: [frames(8, (t) => wheel(t * TAU))],
  hopper: [poses(nian)],
};

// --- Dragón y Gallo: en el aire ----------------------------------------------------------------------------------

/** Una grulla. lift: las alas. */
function grulla(lift) {
  const m = make();
  m.ball([1.4, 0], [4, 2.1, 2], { turn: -0.06, color: (l) => (l[1] < -0.8 ? '#d8e4f4' : WHITE), group: 'body' });
  m.chain([[-1.6, 0.6, 0], [-4, 1.8, 0], [-6.2, 1.6, 0]], 1.3, 0.9, { color: (l) => (l[0] > 0.5 ? '#3a3f58' : WHITE), group: 'neck' });
  m.ball([-7, 1.8, 0], [1.4, 1.3, 1.2], { color: WHITE, group: 'head', over: 1 });
  m.ball([-6.8, 2.8, 0], [1, 0.7, 0.9], { color: RED, group: 'crown', over: 2 });
  m.limb([-8, 1.6, 0], [-10, 1, 0], 0.7, 0.3, { color: '#e8b84a', group: 'beak', over: 1 });
  m.limb([4.6, -0.4, 0], [8, -1.2, 0], 0.7, 0.5, { color: '#5a6080', group: 'legs' });
  m.ball([4.8, 0.2, 0], [1.6, 1.2, 1.6], { color: '#3a3f58', group: 'tail' });
  for (const s of [-1, 1]) {
    for (let i = 0; i <= 12; i++) {
      const k = i / 12;
      const x = -0.4 + k * 1.4;
      const y = 0.9 + lift * 5.6 * k ** 0.85;
      m.limb([x, y, s * (1 + k * 5.2)], [x + 4.6 * (1 - k * 0.5), y - 0.5, s * (1 + k * 5.2)], 0.95, 0.7, { color: (l) => (l[0] > 0.66 && k > 0.35 ? '#3a3f58' : s > 0 ? WHITE : '#b8c8e4'), group: `w${s}`, over: s > 0 ? 2 : -1, blend: 0.5 });
    }
  }
  return m;
}

/** Un farol de jade, de palacio. */
function farolJade(t) {
  const m = make();
  const beat = 0.4 * Math.sin(t * TAU);
  m.box([0, -0.6], [3.6, 3.8, 3.4], { color: (l) => (Math.abs(l[0]) > 2.8 || Math.abs(l[1]) > 3.1 ? '#2f9a78' : Math.hypot(l[0], l[1]) < 1.6 + beat ? '#fffbe0' : Math.hypot(l[0], l[1]) < 2.4 + beat ? '#ffe08a' : '#b8f0d0'), group: 'glass' });
  m.drum([0, 4.2], 5.2, 1.4, 1.2, { color: '#4ac498', group: 'roof', over: 1 });
  for (const s of [-1, 1]) m.limb([s * 4.4, 3.6, 0], [s * 6, 5.2, 0], 0.8, 0.4, { color: GOLD, group: `e${s}`, over: 2 });
  m.ball([0, 6.2], [1.1, 1.2, 1.1], { color: GOLD, group: 'tip', over: 2 });
  m.box([0, -4.8], [4, 0.7, 3.6], { color: '#4ac498', group: 'base', over: 1 });
  for (const x of [-3, 0, 3]) m.limb([x, -5.4, 1], [x, -8, 1], 0.7, 0.6, { color: x ? RED : GOLD, group: `t${x}`, over: 1 });
  return m;
}

/** Un papalote de papel, con su cola. */
function papalote(t) {
  const m = make();
  m.box([0, 2.4], [4.3, 4.3, 0.9], { turn: Math.PI / 4, color: (l) => (Math.abs(l[0]) < 0.5 || Math.abs(l[1]) < 0.5 ? CREAM : l[0] * l[1] > 0 ? (l[0] > 0 ? '#ffd24a' : RED) : l[0] > 0 ? '#ff8a3c' : '#4ab0e8'), group: 'kite' });
  const tail = [0, 1, 2, 3].map((i) => [Math.sin(t * TAU + i * 1.3) * 1.2, -3.4 - i * 1.6, 0]);
  m.chain(tail, 0.6, 0.5, { color: CREAM, group: 'tail', over: 1 });
  tail.slice(1).forEach(([x, y], i) => { for (const s of [-1, 1]) m.limb([x, y, 0.4], [x + s * 2, y + 0.6, 0.4], 0.9, 0.7, { color: [RED, '#ffd24a', '#4ab0e8'][i], group: `b${i}${s}`, over: 2 }); });
  return m;
}

const wings = (build) => [[1, 0.65, -0.85, -0.5].map(build)];
const dragon = { flyer: wings(grulla), lantern: [frames(6, farolJade)] };
const rooster = { lantern: [frames(6, papalote)] };

export { goat, monkey, dog, pig, dragon, rooster };
