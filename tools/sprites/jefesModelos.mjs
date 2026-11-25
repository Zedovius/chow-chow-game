// Los jefes, esculpidos al estilo del dibujo de la Rata: de pie y encorvados, cara hostil, dientes afuera, pañuelo
// rasgado, medallón y algo en la mano de atrás; con los colores de su animal. Lo que comparten está en jefesPiezas.mjs, y la
// cara de cada uno, en jefesCaras.mjs.
// La Serpiente y el Dragón no tienen brazos: mueven la boca y todo el cuerpo (jefesLargos.mjs).
//
// En los 12, el medallón está en (-7.5, 0.5), la boca cerca de (-11.5, 11.5), el hombro en (4.5, -2) y los pies en
// y = -25: así chocan y disparan igual.

import { Sculpture } from './escultura.mjs';
import { eyeOf, face } from './jefesCaras.mjs';
import { LONG } from './jefesLargos.mjs';
import { add, arm, collar, farArm, feet, flow, GOLD, INK, maw, medal, rad, RED, scowl, tail, tooth, trunk, turn, WOOD } from './jefesPiezas.mjs';
import { lerp, TAU } from './modelo3d.mjs';
import { hash, noise } from './ruido.mjs';

const { sin, cos, PI, abs, hypot, atan2, min, max } = Math;

// --- Los emblemas del medallón --------------------------------------------------------------

const line = (u, v, x0, y0, x1, y1, w = 0.14) => {
  const [dx, dy] = [x1 - x0, y1 - y0];
  const k = max(0, min(1, ((u - x0) * dx + (v - y0) * dy) / (dx * dx + dy * dy)));
  return hypot(u - x0 - dx * k, v - y0 - dy * k) < w;
};
const EMBLEMS = {
  ox: (u, v) => (abs(hypot(u, v - 0.5) - 0.62) < 0.16 && v < 0.6) || hypot(u, v + 0.34) < 0.32, // los cuernos
  tiger: (u, v) => line(u, v, -0.5, 0.6, 0.5, 0.6) || line(u, v, -0.42, 0, 0.42, 0) || line(u, v, -0.6, -0.6, 0.6, -0.6) || line(u, v, 0, 0.6, 0, -0.6), // 王
  rabbit: (u, v) => hypot(u, v) < 0.78 && hypot(u - 0.38, v - 0.18) > 0.6, // la luna
  horse: (u, v) => (abs(hypot(u, v - 0.1) - 0.55) < 0.17 && v > -0.35) || line(u, v, -0.5, 0, -0.42, -0.62) || line(u, v, 0.5, 0, 0.42, -0.62), // la herradura
  goat: (u, v) => hypot(u, v) < 0.34 || (hypot(u, v) > 0.5 && sin(atan2(v, u) * 8) > 0.2), // el sol
  monkey: (u, v) => (hypot(u, v + 0.1) < 0.58 && !(abs(u) < 0.1 && v > -0.3)) || line(u, v, 0, 0.5, 0.3, 0.8), // el durazno
  rooster: (u, v) => (v > -0.2 && hypot(u, v + 0.2) < 0.46) || (v > -0.1 && hypot(u, v + 0.2) > 0.62 && sin(atan2(v + 0.2, u) * 9) > 0.1) || abs(v + 0.44) < 0.12, // el amanecer
  dog: (u, v) => hypot(u / 1.1, (v + 0.3) / 0.8) < 0.44 || [-0.6, -0.2, 0.2, 0.6].some((x) => hypot(u - x, v - 0.46 + x * x * 0.7) < 0.19), // la huella
  pig: (u, v) => (v > -0.45 && v < 0.25 - (1 - abs(u) / 0.8) * 0.3 && abs(u) < 0.8 - (0.25 - v) * 0.25) || hypot(u, v - 0.2) < 0.3, // el lingote
};

// --- Los jefes con brazos --------------------------------------------------------------------

const LOOKS = {
  ox: { fur: '#6a4234', belly: '#8a5c46', skin: '#a87a6a', hand: 'hoof', thick: 1.12 },
  tiger: { fur: '#e08424', belly: '#f0d0a0', skin: '#c07a4a' },
  rabbit: { fur: '#d8d0e4', belly: '#f2ecf6', skin: '#d89ab4', claw: '#6a5478' },
  horse: { fur: '#a04a2a', belly: '#b8663c', skin: '#b87a5a', hand: 'hoof' },
  goat: { fur: '#dcd4c4', belly: '#f0e8d8', skin: '#6a5a6a', hand: 'hoof', mat: 'wool' },
  monkey: { fur: '#b07430', belly: '#dcae70', skin: '#d0705a', claw: '#4a3028' },
  rooster: { fur: '#8a2420', belly: '#c8502a', skin: '#e0a83c', hand: 'wing', tip: '#1c5a5a', mat: 'feather' },
  dog: { fur: '#c8762e', belly: '#e09a4c', skin: '#a8602c' },
  pig: { fur: '#e08ea2', belly: '#f2b4c2', skin: '#eca2b6', thick: 1.1, claw: '#5a3040', mat: 'smooth' },
};

const stripes = (base, pale) => (l, at) => {
  const s = sin(at[1] * 0.95 + at[0] * 0.42 + noise(at[0] * 0.18 + 3, at[1] * 0.18, 5) * 3);
  return s > 0.52 ? INK : pale ?? base;
};
/** Algo que se mece en la mano de atrás: gira alrededor de ella. */
const swing = (t, amount, pivot = [-17.6, -1.6], phase = 0) => (p) => turn(p, sin((t + phase) * TAU) * amount, pivot);

// El brazo de atrás sale por debajo del medallón
const HELD = { move: [-1.2, -3.4, 0] };

const BEASTS = {
  ox(m, t, L) {
    trunk(m, t, { ...L, wide: 1.08, hump: 2.4, hips: 0.94 });
    feet(m, 'hoof', L);
    face('ox', m, t, L);
    const path = tail([[15, -8, -2], [20, -2, -3], [22, 6, -3], [26, 12, -3]], t, 4.6);
    flow(m, path, 1.9, 1, { color: L.fur, group: 'tail' });
    for (const [dx, dy] of [[0, 5], [2.4, 3.6], [-1.8, 3.8]]) m.limb(path.at(-1), add(path.at(-1), [dx, dy, 0]), 1.8, 0.3, { color: '#2c1c22', group: 'tailTuft', over: 1 });
    m.within(HELD, () => {
    farArm(m, { ...L, hoof: true }); // el mazo de hierro
    const P = swing(t, 0.06);
    m.limb(P([-16.6, 4.6, -3]), P([-19.4, -12, -3]), 0.95, 0.95, { color: WOOD, mat: 'horn', group: 'shaft' });
    m.box(P([-19.8, -14.6, -3]), [5.2, 3.4, 3.4], { turn: 0.16, round: 0.8, color: (l) => (abs(abs(l[0]) - 3.6) < 0.7 ? GOLD : '#5a5a6a'), mat: 'gold', group: 'mace', over: 1 });
    });
    collar(m, t);
  },
  tiger(m, t, L) {
    const fur = stripes(L.fur);
    trunk(m, t, { ...L, fur, belly: stripes(L.fur, L.belly), wide: 0.96, hips: 0.9, hump: 0.6 });
    feet(m, 'paw', { ...L, fur });
    face('tiger', m, t, L);
    flow(m, tail([[15, -11, -2], [23, -9, -4], [26, 0, -4], [22, 8, -4], [26, 15, -4]], t, 5), 2.7, 1.9, { color: (k) => (sin(k * 34) > 0.1 ? INK : L.fur), group: 'tail' });
    m.within(HELD, () => {
    farArm(m, { ...L, fur }); // el sable
    const P = swing(t, 0.07, [-17.6, -1.6], 0.2);
    m.limb(P([-16.8, 2.4, -2.4]), P([-18, -4, -2.4]), 1, 1, { color: '#7a1a1c', mat: 'cloth', group: 'grip', over: 2 });
    m.ball(P([-18.2, -5, -2.4]), [3, 0.9, 1.6], { color: GOLD, mat: 'gold', group: 'guard', over: 3 });
    m.chain([P([-18.6, -5.6, -2.6]), P([-20.6, -12, -2.6]), P([-24.6, -18, -2.6])], 1.7, 2.1, { color: '#aab0c8', mat: 'gold', group: 'blade' });
    m.limb(P([-24.4, -18, -2.6]), P([-28, -20.6, -2.6]), 2, 0.2, { color: '#d8dcf0', mat: 'gold', group: 'blade' });
    for (const dx of [0, 1.4]) m.limb(P([-16.6, 3, -2.4]), P([-14.6 + dx, 6 + sin(t * TAU + dx) * 0.6, -2]), 0.8, 0.3, { color: RED, mat: 'cloth', group: 'tassel' });
    });
    collar(m, t);
  },
  rabbit(m, t, L) {
    trunk(m, t, { ...L, wide: 0.92, hips: 1.02 });
    feet(m, 'paw', L);
    face('rabbit', m, t, L);
    for (const [dx, dy] of [[0, 0], [2, 2], [2.4, -1.6], [-1, 2.6]]) m.ball([16 + dx + sin(t * TAU) * 0.8, -9 + dy + cos(t * TAU) * 0.8, -1], 3.2, { color: L.belly, mat: 'wool', group: 'tail', blend: 2 });
    m.within(HELD, () => {
    farArm(m, L); // la mano del mortero, de jade
    const P = swing(t, 0.09);
    m.limb(P([-16.6, 7, -3]), P([-18.4, -8, -3]), 1.2, 1.5, { color: '#4fae8a', mat: 'horn', group: 'pestle' });
    m.limb(P([-18.4, -8, -3]), P([-19.6, -15, -3]), 2.4, 3.8, { color: (l) => (abs(l[0] - 0.3) < 0.1 ? GOLD : '#62c8a0'), mat: 'horn', group: 'pestle', over: 1 });
    m.ball(P([-16.4, 7.6, -3]), 1.7, { color: GOLD, mat: 'gold', group: 'knob', over: 1 });
    });
    collar(m, t);
  },
  horse(m, t, L) {
    trunk(m, t, { ...L, hump: 1.2, hips: 0.9 });
    feet(m, 'hoof', L);
    face('horse', m, t, L);
    flow(m, tail([[15, -6, -2], [21, -2, -3], [25, -8, -3], [27, -18, -3]], t, 5, 0.7), 2.6, 2.2, { color: (k) => (k > 0.8 ? '#8a3a1c' : '#241418'), group: 'tail' });
    flow(m, tail([[15, -6, -3], [22, 0, -4], [28, -5, -4], [30, -14, -4]], t, 4.6, 0.7, 0.2), 2, 0.5, { color: '#3a2020', group: 'tail2' });
    m.within(HELD, () => {
    farArm(m, { ...L, hoof: true }); // la lanza, con su fleco
    const P = swing(t, 0.035);
    m.limb(P([-23.4, 14, -5]), P([-13.6, -19, -5]), 0.9, 0.9, { color: (l) => (abs(l[0] - 0.9) < 0.04 ? GOLD : '#6a3a28'), mat: 'horn', group: 'spear' });
    m.limb(P([-24, 16, -5]), P([-25.2, 20, -5]), 2.1, 1.7, { color: '#c0c6d8', mat: 'gold', group: 'tip' });
    m.limb(P([-25.2, 20, -5]), P([-26.8, 25, -5]), 1.8, 0.15, { color: '#e4e8f6', mat: 'gold', group: 'tip' });
    for (let i = 0; i < 5; i++) m.limb(P([-23.6, 15, -5 + (i - 2) * 0.5]), P([-22.6 + (i - 2) * 1.5, 9.6 + sin(t * TAU + i) * 0.9, -4]), 1, 0.3, { color: i % 2 ? '#ee4a40' : RED, mat: 'cloth', group: 'fringe', over: 1 });
    });
    collar(m, t);
  },
  goat(m, t, L) {
    trunk(m, t, { ...L, mat: 'wool' });
    for (let i = 0; i < 18; i++) {
      const a = i * 2.4;
      const k = 0.3 + hash(i, 1, 3) * 0.7;
      m.ball([4.6 + cos(a) * 10.4 * k, -6 + sin(a) * 11 * k, 9.4 - k * 6], 3.2, { color: i % 3 ? L.fur : L.belly, mat: 'wool', group: 'body', blend: 2 });
    }
    feet(m, 'hoof', { ...L, fur: '#5a4a56' });
    face('goat', m, t, L);
    flow(m, tail([[15, -4, -2], [19, 0, -3], [22, 5, -3]], t, 3.4), 3, 2, { color: L.fur, mat: 'wool', group: 'tail' });
    m.within(HELD, () => {
    farArm(m, { ...L, hoof: true }); // el cayado, con su cencerro
    m.chain([[-13.4, -20, -5], [-17.8, -2, -5], [-21.4, 13, -5], [-23, 18, -5], [-26.4, 19, -5], [-28, 16, -5]], 1.05, 0.9, { color: (l, at) => (sin(at[1] * 1.8) > 0.7 ? '#5a3a24' : '#946a42'), mat: 'horn', group: 'crook' });
    const B = swing(t, 0.2, [-28, 16]);
    m.limb(B([-28, 15.6, -5]), B([-28, 13.4, -5]), 0.4, 0.4, { color: INK, mat: 'horn', group: 'cord' });
    m.limb(B([-28, 13, -5]), B([-28, 10, -5]), 1.2, 2.6, { color: (l) => (l[0] > 0.8 ? '#f4cc66' : GOLD), mat: 'gold', group: 'bell', over: 1 });
    });
    collar(m, t);
  },
  monkey(m, t, L) {
    trunk(m, t, { ...L, wide: 0.88, hips: 0.9 });
    feet(m, 'paw', L);
    face('monkey', m, t, L);
    flow(m, tail([[15, -11, -2], [24, -10, -3], [27, -1, -3], [23, 8, -3], [27, 15, -3], [32, 13, -3], [31, 8, -3]], t, 4.6, 0.9), 2.2, 1.4, { color: (k) => (k > 0.85 ? L.belly : L.fur), group: 'tail' });
    m.within(HELD, () => {
    farArm(m, L); // el bastón de puntas doradas
    const P = swing(t, 0.08);
    m.limb(P([-22.4, 13, -3]), P([-13.4, -20, -3]), 1.3, 1.3, { color: (l) => (l[0] < 0.16 || l[0] > 0.84 ? '#f4cc66' : abs(l[0] - 0.5) < 0.03 ? GOLD : '#8a1a1e'), mat: 'gold', group: 'staff' });
    });
    collar(m, t);
  },
  rooster(m, t, L) {
    trunk(m, t, { ...L, fur: '#7a2420', belly: L.belly });
    for (let row = 0; row < 6; row++) for (let i = 0; i < 6; i++) m.ball([-6 + i * 3.4 + (row % 2) * 1.6, 4 - row * 3.6, 9.4 - abs(i - 1.4) * 0.9 - row * 0.2], [2.2, 2.4, 1], { color: (l) => (l[1] < -0.9 ? '#f0a038' : (row + i) % 3 ? '#b03a26' : '#1c5a5a'), mat: 'feather', group: `sc${row}${i}`, over: 1, blend: 0.4 });
    feet(m, 'bird', { ...L, fur: '#7a2420', claw: '#4a3024' });
    face('rooster', m, t, L);
    [['#1c5a5a', 0, 22], ['#2a7a70', 0.12, 17], ['#3a2450', 0.24, 12], ['#c8402a', 0.36, 7], ['#1c4a5a', 0.48, 2]].forEach(([color, ph, up], i) => { // la cola en arco
      flow(m, tail([[13, -3 - i, -2 - i * 0.4], [20, 4 + up * 0.36, -3 - i * 0.4], [27, 4 + up * 0.8, -3 - i * 0.4], [33 - i * 0.6, -3 + up * 0.7, -3], [34 - i, -11 + up * 0.5, -3]], t, 4, 0.6, ph), 2.4, 1, { color: (k) => (k > 0.9 ? GOLD : color), mat: 'feather', group: `plume${i}` });
    });
    m.within(HELD, () => {
    farArm(m, { ...L, fur: '#8a2420' }); // el abanico
    const sw = sin(t * TAU) * 0.18;
    for (let i = 0; i < 7; i++) {
      const a = rad(205 + i * 18) + sw;
      m.limb([-17.8, -2, -2.4], [-17.8 + cos(a) * 11, -2 + sin(a) * 11, -2.4 + i * 0.16], 0.8, 2.2, { color: (l) => (l[0] > 0.86 ? GOLD : i % 2 ? '#c8242a' : '#f05a3c'), mat: 'cloth', group: `fan${i}`, over: 1, blend: 0 });
    }
    });
    collar(m, t);
  },
  dog(m, t, L) {
    trunk(m, t, { ...L, wide: 1.04 });
    feet(m, 'paw', { ...L, fur: '#a85c22', claw: '#3a2420' });
    face('dog', m, t, L);
    const pts = Array.from({ length: 15 }, (_, i) => { // la cola enroscada sobre el lomo
      const a = -0.9 + i * 0.36;
      const k = i / 14;
      return [15 + cos(a) * (7.4 - i * 0.2) + sin(t * TAU + i * 0.3) * 1.6 * k, sin(a) * (7.4 - i * 0.2) + cos(t * TAU + i * 0.3) * 1.6 * k, -3 + i * 0.2];
    });
    flow(m, pts, 3.4, 2.6, { color: (k) => (k > 0.7 ? '#f4c078' : '#d08436'), mat: 'wool', group: 'tail' });
    m.within(HELD, () => {
    farArm(m, L); // la bola de hierro con su cadena
    const P = swing(t, 0.22, [-17.6, -2]);
    for (let i = 0; i < 6; i++) m.ball(P([-17.8, -4 - i * 1.6, -2.4]), [i % 2 ? 0.7 : 1.1, 1.1, i % 2 ? 1.1 : 0.7], { color: '#8a8898', mat: 'gold', group: `link${i}`, over: 1 });
    const ball = P([-18, -16.6, -2.4]);
    m.ball(ball, 4, { color: '#4c4a5a', mat: 'gold', group: 'iron' });
    for (let i = 0; i < 9; i++) m.limb(ball, add(ball, [cos((i / 9) * TAU) * 6, sin((i / 9) * TAU) * 6, (i % 3) * 1.6 - 1]), 1.2, 0.15, { color: '#a8a6b8', mat: 'gold', group: 'spike' });
    });
    collar(m, t);
  },
  pig(m, t, L) {
    trunk(m, t, { ...L, wide: 1.12, mat: 'smooth' });
    feet(m, 'hoof', { ...L, fur: '#b86a80', mat: 'smooth' });
    face('pig', m, t, L);
    for (let i = 0; i < 12; i++) { // las cerdas del lomo
      const k = i / 11;
      const p = [lerp(0, 17, k), lerp(24, -2, k ** 1.5), -1];
      m.limb(p, add(p, [2.6 + k * 1.6, 4.2 - k * 3 + sin(t * TAU + i) * 0.4, 0]), 1.6, 0.15, { color: i % 2 ? '#4a2430' : '#6a3646', group: 'bristle' });
    }
    const pts = Array.from({ length: 21 }, (_, i) => {
      const a = i * 0.62 + sin(t * TAU) * 0.6;
      return [16 + i * 0.5 + cos(a) * 2.4, -5 + i * 0.28 + sin(a) * 2.6 + sin(t * TAU - i * 0.3), -3 + sin(a) * 1.4];
    });
    flow(m, pts, 1.6, 0.8, { color: '#f0a0b4', mat: 'skin', group: 'tail' });
    m.within(HELD, () => {
    farArm(m, { ...L, skin: '#e08aa0', mat: 'smooth' }); // el rastrillo
    const P = swing(t, 0.035);
    m.limb(P([-15.4, 6, -3]), P([-21.4, -15, -3]), 1, 1, { color: (l) => (abs(l[0] - 0.92) < 0.05 ? GOLD : WOOD), mat: 'horn', group: 'rake' });
    m.limb(P([-26.4, -13.6, -3]), P([-16.8, -16.6, -3]), 1.2, 1.2, { color: '#6a6878', mat: 'gold', group: 'bar' });
    for (let i = 0; i < 6; i++) m.limb(P([-26 + i * 1.8, -13.8 - i * 0.56, -2.6]), P([-27.4 + i * 1.8, -18.8 - i * 0.5, -2]), 0.85, 0.15, { color: '#c0becf', mat: 'gold', group: `tine${i}`, over: 1 });
    });
    collar(m, t);
  },
};

export const ARMED = Object.keys(BEASTS);
export const SIGNS = [...ARMED, ...Object.keys(LONG)];

/** Un jefe en el momento t (0 a 1): su Model (sin el brazo de enfrente) y dónde va su ojo. jaw: cuánto abre la boca (los largos). */
export function boss(sign, t, jaw = 0) {
  const model = new Sculpture();
  if (LONG[sign]) return { model, ...LONG[sign](model, t, jaw) };
  BEASTS[sign](model, t, LOOKS[sign]);
  medal(model, EMBLEMS[sign]);
  return { model, eye: eyeOf(sign) };
}

/** Su brazo de enfrente, en un ángulo. */
export function armOf(sign, angle) {
  const look = LOOKS[sign];
  return arm({ ...look, fur: sign === 'tiger' ? stripes(look.fur) : look.fur }, angle);
}
