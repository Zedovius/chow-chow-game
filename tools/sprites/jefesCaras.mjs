// La cara de cada jefe: cada animal tiene la suya (su forma, su hocico, su boca y su enojo), de tres cuartos. Se dibujan
// de perfil, mirando a la izquierda, alrededor de (0, 16), y se giran y agrandan al ponerlas (HEADS).

import { add, curve, GOLD, INK, RED } from './jefesPiezas.mjs';
import { lerp, TAU } from './modelo3d.mjs';
import { noise } from './ruido.mjs';

const { sin, cos, PI, abs, hypot, atan2 } = Math;

// Cuánto se agranda cada una, a dónde se corre y cuánto gira hacia quien mira; eye: dónde va su ojo
const HEADS = {
  ox: { k: 1.14, move: [-1.4, 4.4, 0], yaw: 0.5, eye: [-6.6, 17.6, 5] },
  tiger: { k: 1.18, move: [-2, 3.6, 0], yaw: 0.46, eye: [-7.4, 18, 4.6] },
  rabbit: { k: 1.16, move: [-2.4, 4, 0], yaw: 0.4, eye: [-6.8, 17.4, 4.8] },
  horse: { k: 1.12, move: [-1.4, 5, 0], yaw: 0.36, eye: [-4.6, 19, 4.4] },
  goat: { k: 1.18, move: [-2, 4, 0], yaw: 0.42, eye: [-5.2, 17.6, 4.2] },
  monkey: { k: 1.16, move: [-2.4, 3.8, 0], yaw: 0.5, eye: [-7.4, 18.2, 3.6] },
  rooster: { k: 1.2, move: [-2, 3.4, 0], yaw: 0.2, eye: [-6.6, 18, 4.6] },
  dog: { k: 1.26, move: [-4.4, 5.8, -2], yaw: 1.16, eye: [-7.4, 18.8, 3.8] },
  pig: { k: 1.16, move: [-2, 4, 0], yaw: 0.52, eye: [-7, 18, 5] },
};
const FROM = [0, 12, 0];

/** Dónde queda el ojo de uno, ya puesta su cara. */
export function eyeOf(sign) {
  const { k, move, yaw, eye } = HEADS[sign];
  const [x, , z] = eye.map((v, i) => (v - FROM[i]) * k);
  return [FROM[0] + x * cos(yaw) + z * sin(yaw) + move[0], FROM[1] + (eye[1] - FROM[1]) * k + move[1]];
}

/** Pone la cara de uno en su Model. */
export const face = (sign, m, t, look) => m.within({ ...HEADS[sign], from: FROM }, () => FACES[sign](m, t, look));

const both = (draw) => [1, -1].forEach(draw);
const line = (m, points, r0, r1, color, o = {}) => m.chain(points, r0, r1, { color, mat: 'skin', group: `line${points[0].join()}`, over: 3, blend: 0.4, ...o });
/** Un diente de a hacia b. */
const tooth = (m, a, b, r = 0.8, color = '#f8f0d8') => m.limb(a, b, r, 0.12, { color, mat: 'horn', group: `tooth${a.join()}`, over: 5, blend: 0 });
/** Un diente cuadrado, plano. */
const slab = (m, [x, y, z], h, r = 0.95, color = '#efe4c4') => m.limb([x, y, z], [x, y - h, z], r, r * 0.92, { color: (l) => (l[0] > 0.85 ? '#c8b88c' : color), mat: 'horn', group: `slab${x}${y}${z}`, over: 4, blend: 0 });
/** La ceja de los dos lados, que cae hacia el hocico. */
const brows = (m, points, r0, r1, color, o = {}) => both((s) => m.chain(points.map(([x, y, z]) => [x, y, z * s]), r0, r1, { color, mat: 'fur', group: `brow${s}`, over: 4, blend: 0.8, ...o }));
/** El ojo del otro lado, que apenas asoma (el de este lado lo dibuja el juego). */
const farEye = (m, [x, y, z], color) => {
  m.ball([x, y, z], [1.2, 1.2, 1.4], { color: INK, mat: 'skin', group: 'eyeF', over: 4, blend: 0 });
  m.ball([x - 0.7, y, z], [0.8, 0.6, 0.8], { color, mat: 'skin', group: 'eyeFg', over: 6, blend: 0 });
};
const ringOf = (m, [x, y, z], r, n, color, tag, axis = 'z', size = 0.6) => {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const p = axis === 'z' ? [x + sin(a) * r, y + cos(a) * r, z] : [x, y + cos(a) * r, z + sin(a) * r];
    m.ball(p, size, { color, mat: 'gold', group: tag, over: 6, blend: 0.4 });
  }
};

const FACES = {
  // Cara larga y pesada, de hueso ancho; el hocico cuelga, resopla y aprieta los dientes planos
  ox(m, t, L) {
    m.ball([0, 18.6, 0], [7, 6.8, 7.4], { color: L.fur, group: 'head', blend: 3 });
    m.ball([-4, 20.2, 0], [4.6, 4, 7], { color: L.fur, group: 'head', blend: 3 });
    m.limb([-4, 16.6, 0], [-12.6, 9.6, 0], 6, 4.8, { color: (l, at) => (abs(at[2]) < 1.8 && l[0] > 0.1 ? '#8a5c46' : L.fur), group: 'head', blend: 3 });
    m.ball([-14, 8.8, 0], [4, 4, 6], { color: '#d0aa98', mat: 'skin', group: 'muzzle', blend: 2, over: 1 });
    both((s) => {
      m.ball([-17, 10.6, 3 * s], [1.6, 1.7, 1.7], { color: '#e2c0b0', mat: 'skin', group: 'muzzle', blend: 1.4, over: 1 });
      m.ball([-18.2, 10.4, 3.3 * s], [1, 1.1, 1.1], { color: INK, mat: 'skin', group: `nose${s}`, over: 4 });
    });
    m.limb([-5, 8.6, 0], [-12.6, 4.8, 0], 3.6, 3.2, { color: '#8a6452', group: 'jaw', blend: 2 });
    line(m, [[-16.6, 5.8, 2], [-13.4, 5.8, 4.8], [-7.4, 8.2, 5.6]], 1.1, 0.7, '#3a0c12', { group: 'lips', over: 3 });
    for (const [x, z] of [[-16.8, 1.2], [-16, 3], [-14.2, 4.6], [-12, 5.2], [-10, 5.4]]) slab(m, [x, 6.8 + (x + 16.8) * 0.2, z + 0.5], 1.7, 0.95);
    ringOf(m, [-18.4, 6.6, 0], 2.4, 12, GOLD, 'noseRing', 'x', 0.75);
    both((s) => {
      // Los cuernos salen a los lados y suben hacia adelante
      const pts = curve([[1.6, 22, 5 * s], [2.4, 23.4, 10 * s], [1, 27, 13.4 * s], [-3, 31.4, 13 * s], [-7.6, 33.4, 10.6 * s]], 12);
      m.chain(pts, 3.1, 0.35, { color: (l, at) => (at[1] > 31.2 ? '#f4cc66' : at[1] < 23.6 && abs(at[2]) < 8 ? '#6a5640' : noise(at[1] * 0.9, at[2] * 0.9, 4) > 0.62 ? '#b89c72' : '#e8d8b0'), mat: 'horn', group: `horn${s}`, over: s > 0 ? 2 : 0, blend: 1 });
      m.ball([2.6, 17.6 + sin(t * TAU * 2 + s) * 0.5, 9.6 * s], [1.8, 2, 4.4], { color: (l) => (l[1] < -0.2 ? '#b07e6c' : '#7a4c3e'), group: `ear${s}`, over: s > 0 ? 1 : 0 });
    });
    for (let i = 0; i < 9; i++) m.ball([-2 - (i % 3) * 1.6, 24 - (i % 3) * 1.5, (i - 4) * 1.2], 1.9, { color: '#2c1c22', mat: 'wool', group: 'fringe', blend: 1.2, over: 3 });
    brows(m, [[-9.6, 18.2, 4.6], [-6.6, 19.6, 6], [-2.4, 20.6, 7]], 1.5, 1.1, '#3a221c');
    for (const y of [13.6, 12.2]) line(m, [[-9, y, 5.4], [-5.6, y + 0.9, 6.6]], 0.5, 0.3, '#3a221c');
    farEye(m, [-7.6, 17.6, -4.6], '#ffb347');
  },

  // Cara redonda y ancha, hocico corto; ruge con las fauces abiertas
  tiger(m, t, L) {
    const coat = (l, at) => {
      const [x, y, z] = at;
      if (y > 19.6 && y < 25.6 && abs(z) < 2.6 && x < -1 && ([20.6, 22.6, 24.6].some((h) => abs(y - h) < 0.5) || abs(z) < 0.5)) return INK; // 王
      if (abs(z) > 3.4 && x > -5.4 && sin(y * 1.5 + abs(z) * 0.9) > 0.5) return INK;
      if (x < -5 && y > 19.4 && abs(z) > 2.6) return '#fbf0dc'; // las manchas blancas sobre los ojos
      return y < 12.4 ? L.belly : L.fur;
    };
    m.ball([-1.6, 18.2, 0], [7.8, 7.4, 8.4], { color: coat, group: 'head', blend: 2.4 });
    both((s) => {
      m.ball([-3.6, 13, 5.2 * s], [4.2, 4.6, 3.6], { color: L.belly, group: 'head', blend: 2.2 });
      for (const [dx, dy, dz] of [[3.6, 3.4, 5], [4.6, 0, 5.8], [3.8, -3.4, 5], [1.4, -5.4, 4]]) m.limb([-1, 13.4, 6.4 * s], [-1 + dx, 13.4 + dy, (6.4 + dz) * s], 2.3, 0.2, { color: (l) => (l[0] > 0.72 || (dy === 0 && l[0] > 0.3) ? INK : '#f4dcb0'), mat: 'fur', group: `ruff${s}`, blend: 0.6, over: s > 0 ? 2 : 0 });
      m.ball([-9.8, 15, 2.3 * s], [3.6, 2.4, 3.1], { color: '#f6e6c8', group: 'pads', blend: 1, over: 2 });
      for (const dy of [0.6, -0.8]) m.limb([-11, 15 + dy, 4 * s], [-13, 15.4 + dy * 2.6, 9.4 * s], 0.22, 0.1, { color: '#fffaf0', mat: 'horn', group: `wh${s}${dy}`, over: 3 });
    });
    m.limb([-5, 20, 0], [-11, 17.2, 0], 3, 2.3, { color: L.fur, group: 'bridge', blend: 1.6, over: 1 });
    m.ball([-12.6, 17, 0], [1.8, 1.3, 2.3], { color: '#c84a5a', mat: 'skin', group: 'nose', over: 4 });
    m.ball([-8.8, 9.8, 0.4], [4.4, 4.2, 6.2], { color: '#5a0a16', mat: 'smooth', group: 'gape', over: 4 });
    m.ball([-10.6, 7.8, 1.6], [3, 1.4, 2.6], { color: '#e8607a', mat: 'smooth', group: 'tongue', over: 6 });
    m.chain([[-3.6, 9, 5.6], [-7.6, 6.2, 4.4], [-10.4, 5.6, 2], [-10.8, 5.6, -2], [-7.6, 6.2, -4.4], [-3.6, 9, -5.6]], 1.7, 1.7, { color: '#f0d8ac', group: 'jaw', over: 5, blend: 1 });
    both((s) => {
      tooth(m, [-12, 13.4, 3 * s], [-12.4, 8.2, 3 * s], 1.1);
      tooth(m, [-11.2, 6.4, 2.8 * s], [-11.8, 10.4, 2.8 * s], 0.9);
      tooth(m, [-9.6, 12.6, 5.2 * s], [-9.6, 10.4, 5.4 * s], 0.7);
      m.ball([2.4, 25.6, 6.6 * s], [2, 3.8, 3.6], { color: (l) => (hypot(l[1], l[2]) < 1.7 ? '#fbf0dc' : INK), group: `ear${s}`, over: s > 0 ? 1 : 0 });
    });
    for (const z of [-1, 0, 1]) tooth(m, [-12.8, 13, z], [-12.9, 11.6, z], 0.55);
    ringOf(m, [2, 23.4, 9], 1.5, 9, GOLD, 'earring');
    brows(m, [[-9.4, 18.8, 3.2], [-6.8, 20, 5], [-3, 21, 6.4]], 0.8, 0.6, INK);
    for (const [y, z] of [[18.6, 1.6], [17.6, 2.2]]) both((s) => line(m, [[-10.4, y, z * s], [-7, y + 1.4, (z + 1) * s]], 0.4, 0.25, '#8a3a10'));
    farEye(m, [-8.2, 18, -4.6], '#ff9a2a');
  },

  // Cara de huevo, cachetes inflados, labio partido y dientes larguísimos; ojeras y orejas rotas
  rabbit(m, t, L) {
    m.ball([-1.6, 17.8, 0], [7, 8, 6.8], { color: L.fur, group: 'head', blend: 2.6 });
    both((s) => {
      m.ball([-5.4, 12.6, 3.8 * s], [4, 3.9, 3.6], { color: L.belly, group: 'head', blend: 2 });
      m.ball([-9.6, 13.4, 1.6 * s], [2.6, 2.2, 2.2], { color: '#fff8fc', group: 'pads', blend: 0.6, over: 2 });
      m.ball([-6.4, 15.6, 5.4 * s], [2.6, 1.3, 1.2], { color: '#8a70a8', mat: 'skin', group: `bag${s}`, over: 1 });
      for (const dy of [0.6, -0.6]) m.limb([-10, 13.4 + dy, 2.6 * s], [-14, 13 + dy * 3, 9 * s], 0.25, 0.12, { color: '#fffaff', mat: 'horn', group: `wh${s}${dy}`, over: 3 });
    });
    m.ball([-11.6, 15.4, 0], [1.2, 1, 1.6], { color: '#d8507c', mat: 'skin', group: 'nose', over: 4 });
    line(m, [[-12, 14.6, 0], [-11.8, 12.4, 0]], 0.4, 0.3, '#a03a5e');
    m.ball([-8.2, 10.4, 0.6], [3.2, 2.1, 3.4], { color: '#4a0c22', mat: 'skin', group: 'gape', over: 2 });
    both((s) => m.limb([-10.8, 12.2, 0.95 * s], [-11.4, 5.6, 0.95 * s], 1.05, 0.75, { color: (l) => (l[0] > 0.86 ? '#d0c0a0' : '#fbf6e6'), mat: 'horn', group: `buck${s}`, over: 6, blend: 0 }));
    both((s) => {
      tooth(m, [-8.2, 12, 3.2 * s], [-8.4, 9.6, 3.2 * s], 0.65);
      tooth(m, [-6.6, 12, 4.4 * s], [-6.8, 10.2, 4.4 * s], 0.6);
      tooth(m, [-7.4, 8.6, 3.2 * s], [-7.4, 10.4, 3.2 * s], 0.6);
    });
    m.limb([-4.6, 8.2, 0], [-9, 7.6, 0], 2, 1.6, { color: '#c4bad4', group: 'chin', over: 1 });
    const w = sin(t * TAU);
    m.chain([[1.2, 23, 3], [3.6, 29, 4], [6.4 + w, 34, 4.4], [8.6 + w * 1.6, 37.6, 4]], 2.8, 1.3, { color: (l, at) => (at[2] > 5.8 ? '#e88aa8' : L.fur), group: 'earN', over: 1 });
    m.ball([9 + w * 1.5, 34.6, 4.6], [1.6, 1.3, 2.4], { color: INK, mat: 'skin', group: 'notch', over: 3 });
    m.chain([[-1.4, 23.4, -3], [-1.6, 29.4, -4.4], [-5, 33, -5], [-9.4, 30.4 - w, -5]], 2.6, 1.3, { color: (l, at) => (at[0] < -5 && at[2] > -4 ? '#c8789a' : '#a89ebc'), group: 'earF' });
    brows(m, [[-10, 17.4, 3.4], [-6.8, 19.6, 5.2], [-2.6, 21.6, 6]], 1.4, 0.9, '#5a4a74');
    line(m, [[-5.2, 22, 5.6], [-3, 19, 6.6]], 0.45, 0.35, '#c04a6a');
    line(m, [[-4.6, 15, 6.8], [-2.6, 12, 7]], 0.45, 0.35, '#c04a6a');
    farEye(m, [-8, 17.4, -4.4], '#ff7ab8');
  },

  // Cara larguísima y huesuda; labios alzados que enseñan los dientes cuadrados del frente
  horse(m, t, L) {
    m.limb([4, 8, 0], [0, 17, 0], 6.4, 5.6, { color: L.fur, group: 'neck', blend: 3 });
    m.ball([0, 19.8, 0], [5.8, 5.8, 5.6], { color: L.fur, group: 'head', blend: 2.4 });
    m.ball([-0.6, 14.6, 0], [5, 5.6, 5.8], { color: L.fur, group: 'head', blend: 2.4 }); // la quijada
    m.limb([-2.4, 19, 0], [-13.4, 9.6, 0], 4.7, 3.1, { color: (l, at) => (abs(at[2]) < 1.5 && at[0] < -2 ? '#f6e8cc' : L.fur), group: 'head', blend: 2.4 });
    m.ball([-14.8, 8.8, 0], [3, 3, 3.6], { color: '#c08a6e', mat: 'skin', group: 'muzzle', blend: 1.6 });
    both((s) => {
      m.ball([-16.6, 10.2, 2.2 * s], [1.6, 1.9, 1.6], { color: '#d8a488', mat: 'skin', group: 'muzzle', blend: 1, over: 1 });
      m.ball([-17.6, 10.2, 2.7 * s], [0.9, 1.3, 0.9], { color: '#2a0c12', mat: 'skin', group: `nos${s}`, over: 4 });
    });
    m.limb([-3, 11.6, 0], [-12.6, 3.6, 0], 2.9, 1.9, { color: '#7a3820', group: 'jaw', blend: 1 });
    m.ball([-13.6, 3.4, 0], [2, 1.7, 2.8], { color: '#a8705a', mat: 'skin', group: 'lip', over: 1 });
    m.ball([-13, 6, 0], [2.6, 2, 3], { color: '#5a0c16', mat: 'skin', group: 'gums', over: 1 });
    for (const z of [2.6, 0.9, -0.8, -2.4]) {
      slab(m, [-15.8 + abs(z) * 0.4, 7.4, z], 2, 0.95);
      slab(m, [-15 + abs(z) * 0.4, 4.8, z], 1.2, 0.85, '#dccfa4');
    }
    line(m, [[-12.4, 6, 3.4], [-7.4, 9.6, 4.6]], 0.8, 0.4, '#4a1410');
    both((s) => {
      m.limb([0.6, 24, 3 * s], [1.6, 31 + sin(t * TAU * 2 + s) * 0.5, 4.4 * s], 2, 0.25, { color: (l, at) => (at[0] < 0.6 ? '#d89a86' : L.fur), group: `ear${s}`, over: s > 0 ? 1 : 0 });
      m.ball([-1, 14, 6 * s], 1.7, { color: GOLD, mat: 'gold', group: `disc${s}`, over: 5 });
      line(m, [[-1, 14, 6 * s], [-9.6, 12, 4.6 * s]], 0.75, 0.75, RED, { mat: 'cloth', group: `rein${s}`, over: 4 });
      line(m, [[-1, 14, 6 * s], [0.6, 22, 5.4 * s]], 0.75, 0.75, RED, { mat: 'cloth', group: `reinB${s}`, over: 4 });
    });
    for (let i = 0; i < 16; i++) m.ball([-9.8 + sin((i / 16) * TAU) * 1.4, 12.8 + cos((i / 16) * TAU) * 4.2, sin((i / 16) * TAU) * 4.2], 0.8, { color: GOLD, mat: 'gold', group: 'bridle', over: 5 });
    const wave = (i, k) => sin(TAU * (t - k * 0.3) + i * 0.9) * 1.2;
    for (let i = 0; i < 10; i++) { // la crin, erizada
      const k = i / 9;
      const root = [lerp(1, 10, k), lerp(25.4, 8, k ** 1.3), -0.6];
      m.chain([root, add(root, [3.6 + k * 1.4, 3.4 - k * 2 + wave(i, 0.4), 0.4]), add(root, [8.6 + k * 1.6, 2 - k * 4 + wave(i, 1) * 1.8, 0.6])], 2.5, 0.25, { color: (l) => (i % 3 === 0 && l[0] > 0.4 ? '#9a4420' : i % 2 ? '#241418' : '#3a2020'), group: `mane${i % 3}`, over: i % 2, blend: 0.8 });
    }
    for (const z of [-1.6, 0, 1.6]) m.limb([-1, 25.4, z], [-6.4, 21.4 - abs(z), z * 1.6 + 1], 1.3, 0.25, { color: '#241418', group: 'forelock', over: 3, blend: 0.6 });
    brows(m, [[-7.2, 18.8, 3.6], [-4.6, 20.6, 4.8], [-1.4, 21.6, 5.2]], 1.2, 0.8, '#4a1c12');
    both((s) => line(m, [[-5.4, 16.6, 4.6 * s], [-2, 16.8, 5.4 * s]], 0.45, 0.3, '#5a2414'));
    farEye(m, [-6, 19, -4], '#ffd23f');
  },

  // Cara de triángulo, barbilla en punta con barba, cuernos en espiral y sonrisa chueca
  goat(m, t, L) {
    const dark = '#4a3a4a';
    m.ball([-0.6, 18, 0], [6, 6.2, 5.8], { color: dark, group: 'head', blend: 2.4 });
    m.limb([-3, 17.2, 0], [-12, 9.8, 0], 4.5, 2.6, { color: (l, at) => (abs(at[2]) < 1.1 && l[0] > 0.1 ? '#e6dccb' : dark), group: 'head', blend: 2.4 });
    m.ball([-12.8, 9.2, 0], [2.3, 2.2, 2.7], { color: '#8a7484', mat: 'skin', group: 'muzzle', blend: 1, over: 1 });
    both((s) => line(m, [[-14.8, 10, 0.5 * s], [-14.2, 10.6, 2 * s]], 0.5, 0.3, INK, { over: 5 }));
    m.limb([-4, 11.4, 0], [-10.4, 6.4, 0], 2.6, 1.7, { color: '#3a2c3a', group: 'jaw', blend: 1 });
    line(m, [[-13, 7.4, 1.8], [-9.8, 8.2, 3.4], [-5.8, 11.6, 4.8]], 0.95, 0.6, '#2a0810', { group: 'smirk', over: 4 }); // la sonrisa
    for (const [x, y, z, h] of [[-12.4, 8.2, 2.6, 1.5], [-10.8, 8.6, 3.4, 1.9], [-9.2, 9.2, 4, 1.3], [-7.6, 10.6, 4.6, 1.2]]) tooth(m, [x, y, z], [x - 0.1, y - h, z + 0.2], 0.75);
    m.chain([[-10.4, 6, 0], [-13, 1.4, 1], [-14.6 + sin(t * TAU) * 0.7, -4, 1.4]], 2, 0.2, { color: (l) => (l[0] > 0.5 ? '#f4ecdc' : '#dcd0bc'), mat: 'wool', group: 'beard', over: 1, blend: 1 });
    for (const [x, y, z, r] of [[-3, 23, 0, 3.4], [-1, 24, 2.6, 3.2], [-1, 24, -2.6, 3.2], [2.6, 22, 0, 4], [4.4, 16, 0, 5], [5, 11, 2, 5]]) m.ball([x, y, z], r, { color: L.fur, mat: 'wool', group: 'mop', blend: 1.6, over: 1 });
    both((s) => {
      const pts = Array.from({ length: 20 }, (_, i) => [3.4 + cos(2.2 - i * 0.36) * (6.6 - i * 0.2), 19 + sin(2.2 - i * 0.36) * (6.6 - i * 0.2), s * (5 + i * 0.34)]);
      m.chain(pts, 2.8, 0.4, { color: (l, at) => (sin(atan2(at[1] - 19, at[0] - 3.4) * 15) > 0.35 ? '#7a6248' : '#dcc292'), mat: 'horn', group: `horn${s}`, over: s > 0 ? 3 : 0, blend: 0.3 });
      m.limb([0, 14.6, 5.4 * s], [1.6, 12.4 + sin(t * TAU * 2 + s) * 0.6, 12 * s], 1.9, 0.5, { color: (l) => (l[0] > 0.3 ? '#b088a0' : '#6a5464'), group: `ear${s}`, over: s > 0 ? 4 : 0 });
    });
    brows(m, [[-8.4, 16.8, 3], [-5.6, 19.4, 4.6], [-2, 20.6, 5.2]], 1.2, 0.8, '#1e141e');
    both((s) => line(m, [[-6, 15.4, 4.2 * s], [-3, 15, 5.2 * s]], 0.45, 0.3, '#241a26'));
    farEye(m, [-6.4, 17.6, -4], '#fff4c2');
  },

  // Cara pelona en forma de corazón, arco de hueso sobre los ojos, hocico de bola y una risa de oreja a oreja
  monkey(m, t, L) {
    m.ball([0.6, 18.6, 0], [7.2, 7.4, 7.4], { color: L.fur, group: 'head', blend: 2.4 });
    both((s) => {
      m.ball([-5, 18.4, 2.9 * s], [2.6, 4, 3.4], { color: '#d8604e', mat: 'skin', group: 'mask', blend: 1.2, over: 1 });
      for (const [dy, dz, r] of [[3, 1.6, 2], [0, 3, 2.2], [-3, 2.4, 2], [-5.4, 1, 1.8]]) m.limb([-0.6, 13.6, 6 * s], [2.4, 13.6 + dy, (7 + dz) * s], r, 0.3, { color: '#f4e0b8', group: `side${s}`, blend: 0.8, over: s > 0 ? 2 : 0 }); // las patillas
      m.ball([2.6, 18.6, 8.6 * s], [1.6, 3.8, 3.2], { color: (l) => (hypot(l[1], l[2]) < 1.9 ? '#b04a40' : '#e88a74'), mat: 'skin', group: `ear${s}`, over: s > 0 ? 3 : 0 });
    });
    m.ball([-7.6, 12.4, 0], [4.8, 4.2, 6], { color: '#eca288', mat: 'skin', group: 'snout', blend: 1.6, over: 1 });
    both((s) => m.ball([-11.4, 15.2, 1.1 * s], [0.9, 0.7, 0.7], { color: INK, mat: 'skin', group: `n${s}`, over: 4 }));
    const grin = (k) => [-6 - sin(k * PI) * 6, 11.4 - sin(k * PI) * 1.2 + abs(k - 0.5) * 2.4, lerp(6.4, -6.4, k)];
    line(m, Array.from({ length: 9 }, (_, i) => grin(i / 8)), 1.5, 1.5, '#4a0c14', { group: 'grin', over: 3 });
    line(m, Array.from({ length: 9 }, (_, i) => add(grin(i / 8), [-0.3, -0.9, 0])), 1.3, 1.3, '#4a0c14', { group: 'grin', over: 3 });
    for (let i = 1; i < 10; i++) {
      const p = grin(i / 11);
      const fang = i === 3 || i === 7;
      tooth(m, add(p, [-0.7, 1.2, 0]), add(p, [-0.9, fang ? -2.2 : -0.1, 0]), fang ? 0.95 : 0.6);
      if (i % 2) tooth(m, add(p, [-0.5, -2.4, 0]), add(p, [-0.6, -1, 0]), 0.6, '#e4d8b4');
    }
    m.limb([-3, 8.6, 0], [-8.6, 7.8, 0], 2.8, 2.4, { color: '#e09a80', mat: 'skin', group: 'chin' });
    m.chain([[-6.8, 21, 5.6], [-8.4, 20.4, 2.4], [-8.6, 19.8, 0], [-8.4, 20.4, -2.4], [-6.8, 21, -5.6]], 1.5, 1.5, { color: '#9a342c', mat: 'skin', group: 'ridge', over: 3, blend: 0.8 }); // el arco de los ojos
    for (let i = 0; i < 22; i++) m.ball([0.4 + cos((i / 22) * TAU) * 8, 22.8 - cos((i / 22) * TAU) * 0.6, sin((i / 22) * TAU) * 7.4], 1, { color: GOLD, mat: 'gold', group: 'circlet', over: 5, blend: 0.6 });
    m.ball([-8, 23.4, 0], [1.2, 1.9, 1.5], { color: RED, mat: 'gold', group: 'gem', over: 6 });
    for (let i = 0; i < 7; i++) m.limb([-3 + i * 1.5, 25, (i % 2) * 3 - 1.5], [-4.6 + i * 2.4 + sin(t * TAU + i) * 0.5, 30 + sin(i * 2.2) * 1.4, (i % 2) * 4 - 2], 1.7, 0.2, { color: i % 2 ? '#c8883c' : '#8a5422', group: 'crest', over: 1, blend: 0.6 });
    both((s) => line(m, [[-6.4, 15.6, 4.6 * s], [-3.6, 15.4, 6 * s]], 0.5, 0.35, '#a03a32'));
    farEye(m, [-8, 18.2, -3], '#ffc14d');
  },

  // Pico de gancho, cara roja pelona con su oreja blanca, cresta y barba
  rooster(m, t, L) {
    m.limb([4, 9, 0], [-2, 17, 0], 6.8, 5.4, { color: '#c8502a', mat: 'feather', group: 'neck', blend: 2 });
    for (let i = 0; i < 15; i++) {
      const k = i / 14;
      const a = [lerp(-4, 8, k), lerp(14, 14.6, k) + sin(k * PI) * 3, 3 + sin(k * PI) * 4];
      m.limb(a, add(a, [1.6 + k * 2.4, -7.6 + sin(t * TAU + i) * 0.6, 1.4]), 1.7, 0.3, { color: (l) => (l[0] > 0.6 ? '#ffd05a' : i % 2 ? '#f08a2c' : '#d8582a'), mat: 'feather', group: `hack${i % 3}`, over: 1, blend: 0.6 });
    }
    m.ball([-3.4, 18, 0], [5.8, 6, 5.4], { color: (l, at) => (noise(at[0] * 1.4, at[1] * 1.4, 3) > 0.62 ? '#a81c22' : '#d82e2c'), mat: 'skin', group: 'head', blend: 2 });
    m.chain([[-6.6, 17.2, 0], [-12, 16, 0], [-16, 12.6, 0], [-16.2, 10.4, 0]], 3.4, 0.4, { color: (l, at) => (at[0] > -8.6 ? '#a06a24' : at[1] > 15.4 ? '#ffd870' : '#e8b040'), mat: 'horn', group: 'beak', over: 1, blend: 0.8 });
    m.limb([-6.6, 13, 0], [-12.8, 9.6, 0], 2.1, 0.5, { color: '#c48c2c', mat: 'horn', group: 'jaw', over: 1 });
    m.ball([-8.6, 13.4, 0.6], [3.2, 1.5, 2.3], { color: '#4a0c12', mat: 'skin', group: 'mouth', over: 2 });
    m.limb([-7.4, 12.4, 1], [-12, 11.6 + sin(t * TAU * 2) * 0.4, 1], 0.8, 0.4, { color: '#e0566a', mat: 'skin', group: 'tongue', over: 4 });
    m.ball([-10.4, 16.6, 2.4], [1, 0.5, 0.7], { color: INK, mat: 'skin', group: 'nos', over: 4 });
    m.ball([-1.6, 14.4, 5.2], [1.8, 2.4, 1], { color: '#fbf4e6', mat: 'skin', group: 'lobe', over: 3 });
    const c = sin(t * TAU) * 0.6;
    for (const [x, y, r] of [[-8, 23, 1.8], [-5, 27, 2.4], [-1, 29.4, 2.7], [3, 28, 2.5], [6, 24.6, 2]]) m.limb([x * 0.5, 21.6, 0], [x + c * (y - 22) * 0.14, y + 1.6, 0], r, r * 0.4, { color: (l) => (l[0] > 0.7 ? '#ff5a50' : '#e0262a'), mat: 'skin', group: 'comb', over: 1, blend: 0.8 });
    for (const [x, z] of [[-8.6, 2], [-6.4, 3.4]]) m.limb([x, 11.6, z], [x - 0.4 + c * 0.5, 6, z + 1.6], 1.5, 2.1, { color: '#e0262a', mat: 'skin', group: 'wattle', over: 2 });
    m.chain([[-9.8, 18.6, 3.6], [-6.4, 20.8, 5], [-2.4, 21.6, 5.4]], 1.1, 0.7, { color: '#5a0c12', mat: 'skin', group: 'brow', over: 4, blend: 0.8 });
  },

  // Un chow chow: melena de león en círculo, cara chata y ancha, hocico corto y cuadrado, orejitas redondas, ojos hundidos bajo
  // las arrugas, labios negros y lengua azul
  dog(m, t, L) {
    for (const [ring, n] of [[0, 22], [1, 18]]) {
      for (let i = 0; i < n; i++) { // la melena, en mechones que salen de la cara
        const a = ((i + ring * 0.5) / n) * TAU;
        const low = sin(a) < -0.35 ? 0.72 : 1;
        const out = (ring ? 9.2 : 11.2) * low + sin(i * 2.7) * 0.7;
        const w = sin(TAU * t + i * 1.3) * 0.3;
        const tint = (i + ring) % 3;
        m.limb([ring ? -1.6 : 1, 16.4 + sin(a) * 5.4, cos(a) * 5.8 - 1.6], [ring ? 0 : 2.6, 16.4 + sin(a) * out + w, cos(a) * out * 1.1 - 2.4], 3.6, 1.7, { color: (l) => (l[0] > 0.8 ? '#d8aa66' : ['#c48c46', '#b47c38', '#a46c2c'][tint]), mat: 'wool', group: `mane${ring}`, blend: 1, over: ring });
      }
    }
    m.ball([-2, 17.4, 0], [6, 6.2, 7], { color: '#b86a2a', group: 'head', blend: 2, over: 2 });
    both((s) => {
      m.ball([-3.8, 13.4, 4.4 * s], [3.8, 3.8, 3.8], { color: '#dc9a50', group: 'head', blend: 2, over: 2 });
      m.limb([-3, 22.4, 6 * s], [-2.4, 26.6, 7.8 * s], 2.5, 1.2, { color: (l, at) => (at[0] < -3.2 ? '#5a2a1c' : '#a05a26'), group: `ear${s}`, over: 4, blend: 0.6 });
      m.ball([-8.6, 12.4, 2.3 * s], [3.1, 3, 3.3], { color: '#c48a56', group: 'muzzle', blend: 1, over: 3 });
    });
    m.ball([-6.8, 14, 0], [3.6, 3, 5.2], { color: '#b47844', group: 'muzzle', blend: 1.6, over: 3 });
    m.ball([-10.8, 15.2, 0], [1.9, 1.7, 2.8], { color: (l) => (l[1] > 0.9 ? '#5a5062' : '#17121c'), mat: 'smooth', group: 'nose', over: 6 });
    line(m, [[-11.4, 13.8, 0], [-11.2, 11.6, 0]], 0.45, 0.35, '#17121c', { group: 'split', over: 5 });
    m.ball([-8.6, 9.4, 0], [2.9, 2.4, 4], { color: '#2c0c18', mat: 'smooth', group: 'gape', over: 4 });
    m.ball([-7.8, 7, 0], [3.2, 1.6, 4.4], { color: '#d89a56', group: 'under', over: 4 });
    line(m, [[-5.4, 9.6, 5.6], [-8.4, 10.8, 4.4], [-10.8, 11.6, 1.6], [-11.2, 11.8, 0], [-10.8, 11.6, -1.6], [-8.4, 10.8, -4.4]], 0.75, 0.75, '#17121c', { group: 'lips', over: 5 }); // los labios negros, hacia abajo
    m.chain([[-9.4, 9.2, 0], [-11.2, 8.2, 0.2], [-11.4 + sin(t * TAU * 2) * 0.3, 6, 0.4]], 1.8, 1.6, { color: (l, at) => (abs(at[2] - 0.3) < 0.35 ? '#3a3a86' : '#5a5cc0'), mat: 'smooth', group: 'tongue', over: 6, blend: 0.6 });
    both((s) => {
      tooth(m, [-10, 11.6, 3 * s], [-10.2, 8.4, 3 * s], 0.85);
      tooth(m, [-9.6, 7.6, 3.4 * s], [-10, 9.8, 3.4 * s], 0.7);
    });
    // El ceño: pliegues entre los ojos y sobre ellos
    both((s) => {
      line(m, [[-7, 23.4, 0.9 * s], [-8.2, 20.8, 1.2 * s], [-8.8, 18.4, 1.5 * s]], 0.6, 0.45, '#8a4a1c', { mat: 'fur', group: `crease${s}`, over: 4 });
    });
    brows(m, [[-8.8, 19.6, 1.8], [-7.4, 21.4, 4], [-4.8, 22, 6.4]], 1.2, 0.9, '#6a3414');
    farEye(m, [-7.8, 18.8, -3.6], '#5ad1ff');
  },

  // Trompa enorme de disco, papada, cachetes, orejas caídas y colmillos de jabalí; piel lisa
  pig(m, t, L) {
    const skin = { mat: 'smooth' };
    m.ball([-0.6, 17.8, 0], [7.8, 7.2, 8.2], { color: L.fur, group: 'head', blend: 2.6, ...skin });
    both((s) => m.ball([-2.6, 12, 4.6 * s], [5.2, 5, 4.4], { color: L.belly, group: 'head', blend: 2.4, ...skin }));
    m.ball([-3, 8, 0], [5, 3.4, 5.8], { color: '#e89aac', group: 'head', blend: 2, ...skin }); // la papada
    m.limb([-5.4, 15.2, 0], [-12.4, 13, 0], 5, 4.4, { color: '#e896aa', group: 'snout', blend: 1.6, over: 1, ...skin });
    for (const x of [-8.6, -10.2, -11.8]) line(m, [[x + 0.6, 17.4, -3.6], [x, 18.4, 0], [x + 0.6, 17.4, 3.6]], 0.55, 0.55, '#c86a84', { group: `wr${x}`, over: 3 }); // las arrugas de la trompa
    m.ball([-13.8, 12.8, 0], [1.6, 4.7, 5.2], { color: (l) => (hypot(l[1] / 4.7, l[2] / 5.2) > 0.82 ? '#d8809a' : '#f8bcc8'), group: 'disc', over: 3, ...skin });
    both((s) => m.ball([-15, 13.2, 2 * s], [0.8, 1.9, 1.2], { color: '#6a2438', mat: 'skin', group: `nos${s}`, over: 6 }));
    line(m, [[-12.4, 7.6, 1], [-10, 7.8, 4], [-5.4, 10.2, 6.6]], 1.1, 0.7, '#5a1022', { group: 'mouth', over: 3 });
    for (const [x, y, z] of [[-10.6, 8.6, 3.4], [-8.8, 9.2, 5], [-7, 10.2, 6.2]]) tooth(m, [x, y, z], [x, y - 1.7, z + 0.2], 0.65);
    both((s) => {
      m.chain([[-8.6, 7.4, 4.8 * s], [-12, 8.2, 7 * s], [-14, 11.6, 7.8 * s], [-13.2, 16.2, 7.6 * s]], 1.6, 0.2, { color: (l, at) => (at[1] < 8.6 ? '#c8b080' : '#f8ecc8'), mat: 'horn', group: `tusk${s}`, over: s > 0 ? 5 : 3 });
      const fl = sin(t * TAU * 2 + s) * 0.7;
      m.chain([[1, 23.6, 5.4 * s], [0, 27.6, 7.4 * s], [-4, 27 + fl, 9.4 * s], [-7, 23.4 + fl, 10 * s]], 3.2, 0.8, { color: (l, at) => (at[1] < 25 && at[0] < -3 ? '#d0708a' : L.fur), group: `ear${s}`, over: s > 0 ? 3 : 1, blend: 1.4, ...skin });
    });
    ringOf(m, [-5.6, 22.2, 10.8], 1.5, 9, GOLD, 'earring');
    for (let i = 0; i < 5; i++) m.limb([-2 + i * 1.6, 24.6 - i * 0.2, 0], [-3.4 + i * 2.2, 28.4 - i * 0.4 + sin(t * TAU + i) * 0.4, 0], 1.3, 0.15, { color: '#8a3a52', mat: 'fur', group: 'tuft' });
    brows(m, [[-9.2, 18.4, 3], [-6.6, 20.4, 5.2], [-2.6, 21.4, 6.6]], 1.4, 1, '#a0506a', skin);
    both((s) => line(m, [[-6.4, 15.8, 6 * s], [-3.4, 16, 7.4 * s]], 0.5, 0.35, '#b0607a'));
    line(m, [[-2, 20, 8], [0, 14.6, 8]], 0.45, 0.4, '#b04a62', { group: 'scar', over: 4 });
    farEye(m, [-8, 18, -4.6], '#ff8fab');
  },
};

