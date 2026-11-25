// Los obstáculos de cada mundo: salen de sus propios objetos (piezas.mjs, piezas2.mjs), traídos al frente, a
// todo color. Los del mismo tipo (world/obstacles.js) miden y se esquivan igual en todos los mundos: cambia con
// qué están hechos. Los hornea obstaculos.mjs, con el mismo acabado y los mismos valores que los animales.
//
// Cada tipo tiene una o varias pieles, y cada piel, sus cuadros. Miden un poco más que su caja de choque, siempre
// a favor de quien juega.

import { flame } from './piezas.mjs';
import { brick, C, frames, make, rodent, spoked, TAU } from './obstaculosPiezas.mjs';

const { DARK, RED, DEEP, GOLD, IRON } = C;

// --- Caballo: la Gran Muralla, las caravanas y los estandartes -------------------------------------

const B = ['#eaa066', '#a85f3c'];
const TIMBER = '#e0a060';
const PLANK = '#a0643a';

function estandarte(t) {
  const m = make();
  for (const [x, z, r] of [[-2.2, 1, 2], [2, 0.6, 1.8], [0, -1, 2.2]]) m.ball([x, 0.9, z], [r, 1.5, r], { color: '#d89060', group: 'rock', blend: 0.8 });
  m.drum([0, 7.4], 0.95, 0.95, 7, { color: TIMBER, group: 'pole' });
  m.limb([0, 14.4], [0, 17], 1.2, 0.2, { color: IRON, group: 'tip', over: 1, blend: 0 });
  m.ball([0, 13.4], [1.7, 1.2, 1.7], { color: '#2f1518', group: 'mane', over: 2 });
  for (let i = 0; i < 8; i++) {
    const a = t * TAU - i * 0.75;
    const h = 3.5 - i * 0.2;
    m.box([1.2 + i * 1.1, 9.4 + Math.sin(a) * 0.7, Math.cos(a) * 1.1], [0.75, h, 1.1], { color: (l) => (Math.abs(l[1]) > h - 0.9 ? GOLD : i === 3 ? DEEP : RED), group: `f${i}`, over: 1 });
  }
  return m;
}

/** Una almenara chica, con su fuego de señales. */
function almenara(t) {
  const m = make();
  m.box([0, 0.9], [4.8, 0.9, 4], { color: '#c8784a', group: 'base' });
  m.box([0, 5], [4, 4, 3.4], { color: brick(...B), group: 'body' });
  m.box([0, 4, 3.4], [1.1, 2.2, 0.7], { color: DARK, group: 'door', over: 2 });
  m.box([0, 9.6], [4.8, 0.8, 4.2], { color: '#ffc488', group: 'top', over: 1 });
  for (const x of [-3.8, 0, 3.8]) m.box([x, 11, 3.2], [1, 0.9, 0.9], { color: B[0], group: `m${x}`, over: 1 });
  flame(m, [Math.sin(t * TAU) * 0.5, 10.4, 0], 1.9 + 0.2 * Math.cos(t * TAU * 2));
  return m;
}

/** Un cajón de carga con flechas clavadas. */
function cajon() {
  const m = make();
  m.box([0, 4.6], [6.8, 4.6, 4.6], {
    color: (l) => {
      if (Math.abs(l[0]) > 5.6 || Math.abs(l[1]) > 3.6) return PLANK;
      if (l[2] > 3 && Math.abs(Math.abs(l[0] * 0.72) - Math.abs(l[1])) < 0.6) return PLANK; // la cruceta
      return Math.abs(((l[1] + 20) % 2.4) - 1.2) > 1 ? '#c08248' : TIMBER;
    },
  group: 'box',
  });
  m.box([0, 9.4], [7.1, 0.6, 4.9], { color: '#f0b878', group: 'lid', over: 1 });
  for (const [x, z, dx, k] of [[-3, 1, -3, 1], [0.6, -1, -2.2, 1.15], [3.6, 1.6, -2.6, 0.9]]) {
    const tip = [x + dx * k, 9.4 + 4.2 * k, z];
    m.limb([x, 9, z], tip, 0.65, 0.65, { color: '#f0d8a0', group: `a${x}`, over: 2 });
    m.limb([x + dx * k * 0.62, 9.4 + 4.2 * k * 0.62, z], tip, 1.1, 0.9, { color: RED, group: `pl${x}`, over: 3 });
  }
  return m;
}

/** Los bultos de una caravana, de tela tejida. */
function bultos() {
  const m = make();
  const woven = (a, b, c) => (l) => [a, b, a, c][((Math.floor((l[1] + 20) / 1.2) % 4) + 4) % 4];
  m.ball([-4, 4.2, 0], [4.8, 4.4, 4], { color: woven('#d84a40', '#f8cc68', '#4a7ab8'), group: 'a' });
  m.ball([4, 3.9, 0.6], [4.6, 4, 3.8], { color: woven('#4a7ab8', '#f0924a', '#f8d884'), group: 'b' });
  m.ball([-0.2, 8.8, -0.4], [4.2, 3.4, 3.4], { color: woven('#e08a44', '#fcd878', '#c03a38'), group: 'c' });
  for (const [x, y, w] of [[-4, 4.4, 4.9], [4, 4, 4.7]]) m.drum([x, y, 0.3], w, w, 0.5, { color: '#3a2016', group: `rope${x}`, over: 1, flatten: 0.84 });
  m.ball([-0.2, 12, 0], [1.4, 1.1, 1.4], { color: '#c9713a', group: 'knot', over: 2 });
  return m;
}

/** Un pedazo de muralla derrumbada. */
function muralla() {
  const m = make();
  m.box([0, 3.6], [12, 3.6, 4.2], { color: brick(...B, 4.4, 2.5), group: 'wall' });
  m.box([-7.6, 8.8], [4.2, 1.9, 3.8], { color: brick(...B, 4.4, 2.5), group: 'left' });
  m.box([7.4, 8.4], [4.4, 1.4, 3.8], { color: brick(...B, 4.4, 2.5), group: 'right' });
  m.box([-0.6, 7.8], [2.6, 0.9, 3.4], { color: B[0], group: 'mid', turn: 0.12 });
  for (const [x, y] of [[-10.4, 11.6], [-6, 11.6], [5.2, 10.6], [10, 10.6]]) m.box([x, y, 0.6], [1.5, 1.4, 3], { color: '#ffc488', group: `m${x}`, over: 1 });
  for (const [x, z, r] of [[-11.4, 3.8, 1.8], [0.6, 4.6, 1.7], [10.6, 4.2, 2], [4, 5, 1.2]]) m.ball([x, r * 0.8, z], [r, r * 0.9, r], { color: '#d89060', group: `r${x}`, over: 1 });
  return m;
}

/** Una carreta varada, con sus tinajas. */
function carreta() {
  const m = make();
  m.box([1, 6.2], [9.6, 1.1, 4.2], { color: (l) => (Math.abs(((l[0] + 30) % 3.2) - 1.6) > 1.3 ? PLANK : TIMBER), turn: -0.08, group: 'bed' });
  for (const z of [-4, 4]) m.box([1, 8, z], [9.4, 0.7, 0.8], { color: PLANK, turn: -0.08, group: `rail${z}` });
  m.limb([-8, 6.6, 0], [-13, 2, 0], 0.9, 0.8, { color: TIMBER, group: 'pole' });
  for (const z of [-4.8, 4.8]) {
    for (let i = 0; i < 14; i++) {
      const [a, b] = [(i / 14) * TAU, ((i + 1) / 14) * TAU];
      m.limb([4 + Math.cos(a) * 4.2, 4.8 + Math.sin(a) * 4.2, z], [4 + Math.cos(b) * 4.2, 4.8 + Math.sin(b) * 4.2, z], 0.95, 0.95, { color: PLANK, group: `rim${z}`, over: z > 0 ? 2 : 0 });
    }
    for (let i = 0; i < 6; i++) m.limb([4, 4.8, z], [4 + Math.cos((i / 6) * TAU) * 3.8, 4.8 + Math.sin((i / 6) * TAU) * 3.8, z], 0.6, 0.6, { color: TIMBER, group: `sp${z}`, over: z > 0 ? 2 : 0 });
    m.ball([4, 4.8, z], [1.3, 1.3, 1.2], { color: IRON, group: `hub${z}`, over: z > 0 ? 3 : 0 });
  }
  for (const [x, c, k] of [[-5, '#e07a48', 1], [0.4, '#f0a058', 1.1], [5.8, '#d06848', 0.9]]) {
    m.ball([x, 9.8, -0.4], [2.6 * k, 2.8 * k, 2.6 * k], { color: (l) => (Math.abs(l[1]) < 0.5 ? GOLD : c), group: `jar${x}` });
    m.drum([x, 12.4 * 1 + (k - 1) * 2, -0.4], 1.3, 1.6, 0.7, { color: '#b85638', group: `neck${x}`, over: 1 });
  }
  return m;
}

/** Una torre de la muralla: la piedra no se quema. */
function torre() {
  const m = make();
  m.box([0, 1.2], [5.4, 1.2, 4.6], { color: '#a8a0b4', group: 'base' });
  m.box([0, 9.6], [4.5, 7.6, 3.8], { color: brick('#cfc8dc', '#8a82a0', 4, 2.8), group: 'body' });
  for (const y of [7, 13]) m.box([0, y, 3.8], [0.9, 1.9, 0.8], { color: DARK, group: `slit${y}`, over: 2 });
  m.box([0, 10, 3.9], [1.2, 1.2, 0.7], { color: RED, turn: Math.PI / 4, group: 'seal', over: 2 });
  m.box([0, 17.8], [5.6, 0.9, 4.8], { color: '#ece6f4', group: 'ledge', over: 1 });
  for (const z of [-3.6, 3.6]) for (const x of [-4.4, 0, 4.4]) m.box([x, 20, z], [1.3, 1.5, 1], { color: '#cfc8dc', group: `m${x}${z}`, over: 1 });
  return m;
}

export const horse = {
  post: [frames(4, estandarte), frames(4, almenara)],
  crate: [[cajon()], [bultos()]],
  group: [[muralla()], [carreta()]],
  wall: [[torre()]],
  barrel: [frames(8, (t) => spoked((t * TAU) / 6))],
  hopper: [[0, 1, 2].map((pose) => rodent(pose))],
};
