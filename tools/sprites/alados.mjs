// El gallo (dos patas y alas), el dragón y la serpiente (cuerpo largo). El cuerpo largo lo arma el juego
// sobre el camino de la cabeza, con estas piezas: la cabeza en varias inclinaciones, las vértebras, las
// patas articuladas del dragón, sus alas y la punta de la cola.

import { Model, add, clamp, joint, lerp, rot, TAU } from './modelo3d.mjs';
import { foot, tailPoints } from './rigs.mjs';
import { DARK, GOLD, RED } from './especies.mjs';

// --- Alas (del gallo y del dragón) ---------------------------------------------------

/**
 * Un ala abierta: hombro, codo, muñeca y un abanico de plumas. lift: de -1 (abajo) a 1 (arriba); spread: de
 * 0 (plegada) a 1 (abierta); side: 1, la de este lado; -1, la del otro.
 */
export function wing(m, shoulder, { lift, spread, side, size = 1, colors, over, membrane = null }) {
  const z = (k) => shoulder[2] + side * k;
  const up = lift * 1.15;
  // El brazo: el codo hacia atrás y arriba, la muñeca hacia adelante
  const elbow = [shoulder[0] - 2.6 * size, shoulder[1] + (1.2 + 2.2 * up) * size * (0.5 + 0.5 * spread), z(1.2)];
  const wrist = [elbow[0] + (1.6 - 1.2 * Math.abs(lift)) * size, elbow[1] + (0.8 + 2.8 * up) * size * spread, z(2.2 + 0.8 * (1 - Math.abs(lift)))];
  const n = 7;
  const group = `wing${side}`;
  for (let i = 0; i < n; i++) {
    const k = i / (n - 1);
    const root = k < 0.5 ? lerp(wrist, elbow, k * 2) : lerp(elbow, shoulder, (k - 0.5) * 1.5);
    // Abiertas, en abanico: las de la punta miran hacia afuera y las de adentro, hacia atrás
    const angle = Math.PI + lerp(-up * 1.05 - 0.15, 0.12 - up * 0.25, k) * (0.35 + 0.65 * spread) + (1 - spread) * 0.1;
    const length = (membrane ? lerp(8.5, 4, k) : lerp(8, 4.6, k)) * size * (0.55 + 0.45 * spread);
    const tip = add(root, [Math.cos(angle) * length, Math.sin(angle) * length, side * (1 - k) * 1.4 * (1 - Math.abs(lift))]);
    m.limb(root, tip, 1.05 * size, 0.7 * size, { color: colors[i % 2 ? 1 : 0], group: `${group}-${i}`, over: over + 0.02 * (n - i), blend: 0 });
    if (!membrane) m.ball(tip, 0.75 * size, { color: colors[2], group: `${group}-tip${i}`, over: over + 0.01, blend: 0 });
  }
  m.chain([shoulder, elbow, wrist], 1.5 * size, 1.1 * size, { color: colors[0], group, over: over + 0.3 });
}

// Un aleteo, cuadro por cuadro: el golpe hacia abajo, abierta; la subida, recogida; y el planeo
export const FLAP = [
  { lift: 1, spread: 1 }, { lift: 0.35, spread: 1 }, { lift: -0.45, spread: 1 }, { lift: -0.95, spread: 0.95 },
  { lift: -0.7, spread: 0.6 }, { lift: -0.05, spread: 0.45 }, { lift: 0.55, spread: 0.6 }, { lift: 0.75, spread: 0.85 },
];
export const GLIDE = [{ lift: 0.3, spread: 1 }, { lift: 0.4, spread: 1 }, { lift: 0.36, spread: 0.98 }, { lift: 0.25, spread: 1 }];

// --- Gallo -------------------------------------------------------------------------

const ROOSTER = { body: '#d8412f', hackle: '#ffb02e', dark: '#8f1f22', tail: ['#1f7a6a', '#2456a8', '#153f3a'], leg: '#ffc94a', beak: '#ffd45e', comb: '#ff3b3b' };

function rooster({ p = 0, legs, wings = null, bob = [0, 0], dy = 0, lean = 0, lag = 0, hurt = false, squat = 0 }) {
  const m = new Model();
  const C = ROOSTER;
  const root = [-2.5, 10.6 + dy - squat];
  const B = ([x, y, z = 0]) => add(rot([x, y, z], lean), [root[0], root[1], 0]);
  // Cuerpo: pecho alto y redondo, la rabadilla abajo
  m.ball(B([0, 0]), [5, 4, 3.5], { turn: lean + 0.28, color: (l) => (l[1] < -1.6 ? C.dark : C.body), group: 'body', over: 1, blend: 2 });
  m.ball(B([2.6, 1]), [3.4, 3.6, 3.2], { turn: lean, color: C.body, group: 'body', over: 1, blend: 2 });
  m.ball(B([-3.4, 0.6]), [2.6, 2.4, 2.3], { turn: lean, color: C.hackle, group: 'body', over: 1, blend: 1.6 }); // la silla dorada
  // Cuello y cabeza: la cabeza se queda quieta en el aire mientras el cuerpo avanza, y luego se adelanta
  const neck = B([3.4, 2.6]);
  const head = add(B([5.6, 7.4]), [bob[0], bob[1], 0]);
  m.limb(neck, head, 3, 1.9, { color: (l, q) => (Math.sin(q[0] * 2.6 + q[1] * 1.1) > 0.55 ? '#e07a1a' : C.hackle), group: 'neck', over: 1.5 });
  m.ball(head, [2.3, 2.2, 2], { color: C.hackle, group: 'neck', over: 1.5, blend: 1 });
  m.ball(add(head, [0.9, -0.2, 0]), [1.6, 1.5, 1.9], { color: C.comb, group: 'face', over: 2, blend: 0 });
  m.limb(add(head, [1.8, 0, 0]), add(head, [4.4, -0.7, 0]), 1.05, 0.4, { color: C.beak, group: 'beak', over: 3 });
  for (const [x, y, r] of [[-1.3, 2, 1], [0, 2.7, 1.2], [1.2, 2.3, 1]]) m.ball(add(head, [x - lag * 0.3, y, 0]), [r, r * 1.05, 0.9], { color: C.comb, group: 'comb', over: 2, blend: 0.6 });
  m.limb(add(head, [1.8, -1.4, 0]), add(head, [1.5 - lag * 0.4, -3.4, 0]), 0.8, 0.9, { color: C.comb, group: 'wattle', over: 3 });
  const e = add(head, [0.9, 0.6, 2]);
  m.dot(e, hurt ? DARK : '#1b1226');
  if (!hurt) m.dot(add(e, [0, 1, 0]), '#fff3b0');
  // La cola: plumas en hoz, verdes y azules, que se mecen
  for (let i = 0; i < 6; i++) {
    const k = i / 5;
    const base = B([-4.2, 1.6 + k * 0.6, (i % 2 ? 0.9 : -0.9)]);
    m.chain(tailPoints(base, { n: 5, length: 9.5 - k * 2.5, angle: 2.5 - k * 0.62, curl: 1.9 - k * 0.5, sway: 0.16, phase: p + k * 0.15, delay: 0.1 }), 1.15, 0.75, { color: C.tail[i % 3], group: `tail${i}`, over: i % 2 ? 0.6 : 0.4 });
  }
  // Patas: muslo emplumado, rodilla hacia adelante y corvejón hacia atrás, y tres dedos
  for (const [name, side] of [['n', 1], ['f', -1]]) {
    const f = legs[name];
    const hip = B([0.2, -2, side * 1.7]);
    const paw = f.free ? add(hip, [f.x, f.y, 0]) : [root[0] + 0.6 + f.x, f.y + 0.55, side * 1.8];
    const tilt = lerp(-0.18 + 0.3 * f.push, 0.95, f.fold);
    const hock = [paw[0] - Math.sin(tilt) * 0.4 + Math.sin(tilt) * -2.4, paw[1] + Math.cos(tilt) * 3.2, paw[2]];
    const knee = joint(hip, hock, 2.6, 3, 1);
    knee[2] = hip[2];
    const over = side > 0 ? 2 : 0.2;
    m.limb(hip, knee, 2, 1.4, { color: C.dark, group: `thigh${name}`, over: side > 0 ? 1.6 : 0.2 });
    m.limb(knee, hock, 1.2, 0.85, { color: C.dark, group: `thigh${name}`, over });
    m.limb(hock, paw, 0.75, 0.7, { color: C.leg, group: `shank${name}`, over });
    const curl = f.fold * 0.9;
    for (const [dx, dz] of [[2, 0], [1.5, 0.9], [-1, 0]]) m.limb(paw, add(paw, [dx * Math.cos(curl), -0.15 - Math.abs(dx) * Math.sin(curl) * 0.8, dz * side]), 0.6, 0.5, { color: C.leg, group: `toe${name}${dx}`, over: over + 0.2 });
  }
  // Alas: plegadas al costado, o abiertas
  if (wings) {
    for (const side of [-1, 1]) wing(m, B([1.4, 2.2, side * 2.6]), { ...wings, side, colors: ['#b5302a', '#8f1f22', '#ffb02e'], over: side > 0 ? 4 : 0.3 });
  } else {
    m.ball(B([-0.6, 0.4, 2.7]), [4, 2.5, 1.3], { turn: lean + 0.35, color: (l) => (l[0] < -1.6 ? (l[1] > 0 ? '#1f7a6a' : '#153f3a') : l[1] < -0.8 ? '#8f1f22' : '#c23a2a'), group: 'wing', over: 2.6, blend: 0 });
  }
  return m;
}

const bobAt = (p) => {
  const u = (p * 2) % 1;
  const k = u < 0.68 ? lerp(1, -1, u / 0.68) : lerp(-1, 1, ((u - 0.68) / 0.32) ** 2 * (3 - 2 * ((u - 0.68) / 0.32)));
  return [k * 1.3, 0.25 * Math.cos(u * TAU)];
};

export const ROOSTER_STRIDE = 27;

/** Los cuadros del gallo: { anim: [Model, ...] }. */
export function roosterFrames() {
  const each = (n, fn) => Array.from({ length: n }, (_, i) => fn(i / n, i));
  const step = (p, stride = ROOSTER_STRIDE, lift = 3.6, duty = 0.4) => ({ n: foot(p, duty, stride, lift, 1), f: foot(p + 0.5, duty, stride, lift, 1) });
  const still = { n: { x: 0.4, y: 0, fold: 0, push: 0 }, f: { x: -0.8, y: 0, fold: 0, push: 0 } };
  const air = (n, f) => ({ n: { x: n[0], y: n[1], fold: n[2], push: 0, free: true }, f: { x: f[0], y: f[1], fold: f[2], push: 0, free: true } });
  const tuck = air([-1.6, -4.6, 0.8], [-2.4, -4.2, 0.9]);
  return {
    run: each(12, (p) => rooster({ p, legs: step(p), bob: bobAt(p), dy: 0.7 * Math.cos((p * 2 - 0.1) * TAU) - 0.4, lean: -0.1 + 0.04 * Math.sin(p * 2 * TAU), lag: Math.cos(p * 2 * TAU) })),
    idle: each(6, (p) => rooster({ p, legs: still, bob: [0, 0.35 * Math.sin(p * TAU)], dy: -0.2 + 0.2 * Math.sin(p * TAU), lag: Math.sin(p * TAU) })),
    jump: [
      rooster({ p: 0.1, legs: air([-2.4, -6, 0.2], [-1.4, -5, 0.5]), wings: { lift: 0.9, spread: 0.9 }, lean: 0.3, dy: -2.2, lag: 1 }),
      rooster({ p: 0.3, legs: air([-1.6, -5, 0.6], [-2.6, -4.6, 0.8]), wings: { lift: 0.2, spread: 0.95 }, lean: 0.18, dy: -3.4, lag: 0.5 }),
      rooster({ p: 0.5, legs: tuck, wings: { lift: -0.5, spread: 0.9 }, lean: 0.06, dy: -3.6 }),
    ],
    fall: [
      rooster({ p: 0.7, legs: air([0.6, -5, 0.3], [-1, -5, 0.5]), wings: { lift: 0.6, spread: 1 }, lean: 0, dy: -3, lag: -0.6 }),
      rooster({ p: 0.9, legs: air([1.4, -5.8, 0.05], [0, -5.6, 0.2]), wings: { lift: 1, spread: 1 }, lean: 0.12, dy: -2.4, lag: -1 }),
    ],
    duck: each(8, (p) => rooster({ p, legs: step(p, 16, 1, 0.45), bob: [2.2 + 0.4 * Math.sin(p * 2 * TAU), -6.6], dy: -4.8, lean: -0.42, lag: 1 })),
    ride: GLIDE.map((w, i) => rooster({ p: i / 4, legs: tuck, wings: w, lean: 0.04, dy: -3.4 + 0.2 * Math.sin((i / 4) * TAU), lag: 0.4 })), // planeando
    press: FLAP.map((w, i) => rooster({ p: i / 8, legs: tuck, wings: w, lean: 0.1 - 0.05 * Math.cos((i / 8) * TAU), dy: -3.4 + [-0.5, 0, 0.8, 1.2, 0.8, 0.3, 0, -0.3][i], lag: [-1, 0, 1, 1, 0.5, 0, -0.5, -1][i] })),
    hurt: [rooster({ p: 0.2, legs: air([2.2, -5, 0.2], [-2.6, -4.8, 0.3]), wings: { lift: 0.8, spread: 0.8 }, lean: 0.5, dy: -2, lag: -1, hurt: true })],
    dead: [rooster({ p: 0.3, legs: air([-4, -2.4, 0.2], [-5, -1.8, 0.3]), bob: [2.8, -7.4], dy: -6.8, lean: -0.3, hurt: true })],
  };
}

// --- Dragón ------------------------------------------------------------------------

export const DRAGON = { skin: '#e8452c', belly: '#ffd79a', crest: '#ffb02e', dark: '#a8261c', mane: '#2fb39a', horn: '#f4ead2', claw: '#fff3d0' };

/** La cabeza del dragón, centrada en (0, 0). turn: inclinación; t: el momento (melena y bigotes); open: la boca. */
export function dragonHead({ turn = 0, t = 0, open = 0, hurt = false }) {
  const m = new Model();
  const C = DRAGON;
  const H = (p) => rot([p[0], p[1], p[2] ?? 0], turn);
  // Melena: mechones que salen de la nuca y las mejillas y ondean hacia atrás
  const locks = [[-2.4, 3, 2.75, 6.5], [-3, 1.4, 2.95, 7.5], [-3, -0.4, 3.2, 7], [-2.2, -2, 3.5, 5.5]];
  locks.forEach(([x, y, angle, length], i) => {
    m.chain(tailPoints(H([x, y, 0]), { n: 4, length, angle: angle + turn, sway: 0.32, phase: t + i * 0.23, delay: 0.16, zSway: 0.6 }), 1.3, 0.55, { color: i % 2 ? C.mane : '#57d6b4', group: `mane${i}`, over: 0.4 });
  });
  // Cráneo, hocico largo y nariz respingada
  m.ball(H([-0.6, 0.6]), [3.6, 3, 2.8], { turn, color: C.skin, group: 'head', over: 1, blend: 1.2 });
  m.limb(H([1.6, 0.5]), H([6.2, 0.2]), 2, 1.55, { color: C.skin, group: 'head', over: 1, blend: 1 });
  m.ball(H([7, 1]), [1.5, 1.3, 1.8], { turn, color: '#ff6a45', group: 'nose', over: 1.5, blend: 0 });
  m.dot(H([7.8, 1, 1]), '#7a1420');
  m.ball(H([-1.6, -1]), [1.8, 1.6, 3], { turn, color: C.dark, group: 'cheek', over: 1.2, blend: 0 }); // la mejilla
  // Boca: el labio claro, los colmillos y la mandíbula
  const jaw = turn - 0.05 - open * 0.5;
  const hinge = H([0.2, -1.5]);
  m.limb(hinge, add(hinge, rot([6, -0.3, 0], jaw)), 1.3, 0.95, { color: C.belly, group: 'jaw', over: 0.9 });
  if (open) m.limb(H([1.4, -1.4]), H([5.4, -1.6]), 0.9, 0.7, { color: '#7a1420', group: 'mouth', over: 0.95, blend: 0 });
  for (const x of [2.6, 4.6, 6.4]) m.dot(H([x, -1.4, 2]), '#ffffff');
  // Barba y bigotes largos
  m.chain(tailPoints(add(hinge, rot([2.4, -1.2, 0], jaw)), { n: 3, length: 3.6, angle: -2.3 + turn, sway: 0.4, phase: t, delay: 0.2 }), 0.9, 0.45, { color: C.mane, group: 'beard', over: 0.8 });
  for (const z of [-1.7, 1.7]) m.chain(tailPoints(H([6.8, 0, z]), { n: 6, length: 9, angle: -2.75 + turn, curl: -0.7, sway: 0.5, phase: t + (z > 0 ? 0 : 0.3), delay: 0.15, zSway: z > 0 ? 1 : -1 }), 0.55, 0.5, { color: C.crest, group: `whisker${z}`, over: z > 0 ? 3 : 0.2 });
  // Cuernos de venado
  for (const z of [-1, 1]) {
    const o = { color: C.horn, group: `horn${z}`, over: z > 0 ? 3 : 0.3 };
    m.chain([H([-1, 3, z * 1.2]), H([-2.6, 5, z * 1.7]), H([-5, 5.8, z * 2])], 0.9, 0.55, o);
    m.limb(H([-2.4, 4.8, z * 1.7]), H([-2, 6.8, z * 1.9]), 0.6, 0.5, o);
  }
  // Ceja de oro y ojo
  m.limb(H([-0.4, 2.3, 2]), H([2.4, 1.9, 1.8]), 0.7, 0.55, { color: C.crest, group: 'brow', over: 3, blend: 0 });
  const e = H([0.7, 1, 2.9]);
  if (hurt) {
    m.dot(e, DARK);
    m.dot(add(e, [1, 0, 0]), DARK);
  } else {
    m.dot(e, '#fff6a8');
    m.dot(add(e, [1, 0, 0]), '#1b1226');
  }
  return m;
}

/**
 * Una vértebra del cuerpo largo: un disco de radio 1 con vientre claro, escamas y (crest) la cresta.
 * angle: la inclinación del cuerpo ahí. kind: el dragón o la serpiente; n: cuál del dibujo (se repite).
 */
export function vertebra({ kind, r, angle, n }) {
  const m = new Model();
  const snake = kind === 'snake';
  const coat = (l) => {
    const [u, v] = [l[0] * Math.cos(angle) + l[1] * Math.sin(angle), -l[0] * Math.sin(angle) + l[1] * Math.cos(angle)];
    if (snake) {
      if (v < -r * 0.42) return '#e6efa8';
      if (n % 4 < 2 && v > r * 0.1) return '#2f6b34'; // los rombos del lomo
      if (n % 4 === 2 && v > r * 0.55) return '#2f6b34';
      return n % 2 ? '#7cc04b' : '#8bd058';
    }
    if (v < -r * 0.4) return n % 2 ? '#ffd79a' : '#f2b873';
    if (n % 3 === 0 && Math.abs(v - r * 0.2) < r * 0.36) return '#c9341f'; // escamas
    return '#e8452c';
  };
  m.ball([0, 0], [r, r, r], { color: (l) => coat([l[0], l[1]]), group: 'v' });
  if (!snake && n % 3 === 1) {
    const up = rot([-0.6, r + 1.5, 0], angle);
    m.limb(rot([0, r * 0.6, 0], angle), up, 1, 0.5, { color: DRAGON.crest, group: 'crest', over: -1 });
  }
  return m;
}

/** Una pata del dragón, colgada de (0, 0): hombro, codo, muñeca y garra. f: como foot() de rigs.mjs. */
export function dragonLeg({ front, f, high, far = false }) {
  const m = new Model();
  const C = DRAGON;
  const skin = far ? '#b5301f' : C.skin;
  const l = front ? [4, 3.8, 1.7] : [4.4, 4, 2];
  const paw = f.free ? [f.x, f.y, 0] : [(front ? 0.6 : 0.2) + f.x, f.y - high + 0.7, 0];
  const lean = front ? lerp(0.1 * f.push, 1.4, f.fold) : lerp(-0.4 + 0.25 * (f.push + 1), 0.9, f.fold);
  const wrist = [paw[0] + Math.sin(lean) * l[2], paw[1] + Math.cos(lean) * l[2], 0];
  const top = [0, 0, 0];
  const knee = joint(top, wrist, l[0], l[1], front ? -1 : 1);
  m.ball(top, [2.2, 2, 1.4], { color: skin, group: 'leg', over: 1, blend: 1 });
  m.limb(top, knee, 1.7, 1.2, { color: skin, group: 'leg', over: 1 });
  m.limb(knee, wrist, 1.1, 0.85, { color: far ? '#c25a2a' : '#ff7a45', group: 'leg2', over: 1.1 }); // la caña, más clara: se lee el doblez
  m.limb(wrist, paw, 0.85, 0.85, { color: far ? '#c25a2a' : '#ff7a45', group: 'leg2', over: 1.1 });
  // El mechón del codo (o el corvejón), como en los dragones de los templos
  m.chain(tailPoints(front ? knee : wrist, { n: 2, length: 2.8, angle: 2.7, sway: 0.3, phase: f.push * 0.2 }), 0.8, 0.4, { color: far ? '#1f7a6a' : C.mane, group: 'tuft', over: 0.5 });
  // Garra: tres dedos con uña
  const curl = f.fold * 0.8;
  for (const [dx, dz] of [[1.9, 0], [1.4, 0.9], [-0.9, 0]]) {
    const tip = add(paw, [dx * Math.cos(curl), -0.25 - Math.abs(dx) * Math.sin(curl) * 0.7, dz]);
    m.limb(paw, tip, 0.75, 0.55, { color: skin, group: `toe${dx}`, over: 1.2 });
    m.dot([tip[0] + 0.3, tip[1], 0], far ? '#c9b98f' : C.claw);
  }
  return m;
}

export const LEG_LIFT = 9.2; // qué tan alto va el hombro de las patas al correr (pixeles)
export const DRAGON_STRIDE = 26;

/** Los cuadros de una pata: 12 de trote, 4 nadando en el aire y 1 agachado por cada cuatro pasos. */
export function dragonLegFrames({ front, far }) {
  const each = (n, fn) => Array.from({ length: n }, (_, i) => fn(i / n));
  const leg = (f, high = LEG_LIFT) => dragonLeg({ front, far, f, high });
  return {
    run: each(12, (p) => leg(foot(p, 0.4, DRAGON_STRIDE, 3.6, 1))),
    // En el aire, rema: la pata se recoge y empuja hacia atrás
    air: each(6, (p) => {
      const a = p * TAU;
      return leg({ x: (front ? 1.6 : -3.6) + Math.cos(a) * 2, y: -5.2 - Math.sin(a) * 1.1, fold: 0.35 + 0.3 * Math.sin(a), push: 0, free: true });
    }),
    duck: each(6, (p) => leg(foot(p, 0.5, 12, 0.9, 0.2), 3.2)),
  };
}

/** El ala del dragón (de piel, con dedos), colgada de (0, 0). */
export function dragonWing({ lift, spread, side }) {
  const m = new Model();
  wing(m, [0, 0, 0], { lift, spread, side, size: 1.18, colors: side > 0 ? ['#ff8a3c', '#e8452c', '#ffd79a'] : ['#c25a2a', '#9c2f22', '#c9a36a'], over: 1, membrane: true });
  return m;
}

/** La punta de la cola: un mechón de llamas. */
export function dragonTail({ angle, t }) {
  const m = new Model();
  for (let i = 0; i < 4; i++) {
    const k = i / 3 - 0.5;
    m.chain(tailPoints([0, 0, 0], { n: 4, length: 7 - Math.abs(k) * 4, angle: Math.PI + angle + k * 1.1, sway: 0.5, phase: t + i * 0.2, delay: 0.15 }), 1.5, 0.5, { color: i % 2 ? DRAGON.mane : '#57d6b4', group: `t${i}`, over: i % 2 });
  }
  return m;
}

// --- Serpiente ---------------------------------------------------------------------

/** La cabeza de la serpiente, centrada en (0, 0). tongue: 0 a 1, qué tan afuera. */
export function snakeHead({ turn = 0, tongue = 0, hurt = false }) {
  const m = new Model();
  const H = (p) => rot([p[0], p[1], p[2] ?? 0], turn);
  const skin = (l) => (l[1] < -1 ? '#e6efa8' : '#7cc04b');
  m.ball(H([0, 0]), [3.4, 2.7, 3.1], { turn, color: skin, group: 'head', blend: 1.4 });
  m.limb(H([1.2, -0.1]), H([4.2, -0.4]), 2.1, 1.5, { color: (l, p) => '#7cc04b', group: 'head', blend: 1.2 });
  m.limb(H([1.6, -1.3]), H([4.4, -1.2]), 1, 0.8, { color: '#e6efa8', group: 'jaw', over: -0.5 });
  m.ball(H([-1.4, 1.2]), [2.4, 1.6, 2.2], { turn, color: '#2f6b34', group: 'mark', over: 0.5, blend: 0 }); // el dibujo de la nuca
  m.dot(H([5, 0, 1]), '#2f6b34');
  if (tongue > 0) {
    const base = H([5.2, -0.8]);
    const tip = add(base, rot([1 + tongue * 3, 0, 0], turn - 0.1));
    m.limb(base, tip, 0.5, 0.5, { color: RED, group: 'tongue', over: 2, flat: 2 });
    m.limb(tip, add(tip, rot([1.2, 0.8, 0], turn)), 0.45, 0.4, { color: RED, group: 'tongue', over: 2, flat: 2 });
    m.limb(tip, add(tip, rot([1.2, -0.8, 0], turn)), 0.45, 0.4, { color: RED, group: 'tongue', over: 2, flat: 2 });
  }
  m.ball(H([1.4, 1.5, 1.8]), [1.2, 0.6, 0.9], { turn, color: '#2f6b34', group: 'brow', over: 2, blend: 0 });
  if (hurt) {
    m.dot(H([1.4, 0.6, 2.8]), DARK);
    m.dot(add(H([1.4, 0.6, 2.8]), [1, 0, 0]), DARK);
  } else {
    m.dot(H([1.2, 0.6, 2.8]), '#ffe066');
    m.dot(add(H([1.2, 0.6, 2.8]), [1, 0, 0]), '#1b1226');
  }
  return m;
}

/** La serpiente enroscada en la nube, con la cabeza en alto. */
export function snakeCoil({ t, up = 0, tongue = 0 }) {
  const m = new Model();
  const sway = Math.sin(t * TAU);
  // Dos vueltas, una sobre otra (cada una es un grupo: se ve dónde termina), y el cuello
  const points = [];
  const ring = (group, from, to, r0, y, thick, steps) => {
    for (let i = 0; i <= steps; i++) {
      const a = lerp(from, to, i / steps);
      const p = [-2.4 + Math.cos(a) * r0, y - up * 0.3, Math.sin(a) * r0 * 0.62];
      const mark = Math.floor(a * 2.6) % 2 === 0;
      m.ball(p, [thick, thick, thick], { color: (l) => (l[1] < -thick * 0.4 ? '#e6efa8' : mark && l[1] > thick * 0.25 ? '#2f6b34' : '#7cc04b'), group, blend: 0.2 });
      points.push(p);
    }
  };
  m.chain([[-10.6, 1, -3], [-9.8, 1.2, -1], [-8.8, 1.6, 1.4]], 0.6, 1.6, { color: '#7cc04b', group: 'tail' }); // la punta de la cola
  ring('ring1', 0, TAU, 6.6, 2.2, 2.1, 30);
  ring('ring2', 2.4, 2.4 + TAU * 0.98, 4.2, 5.6, 1.95, 26);
  const base = points.at(-1);
  const neck = [base, [1.6, 8.6 + up * 0.6, 0.6], [3.2 + sway * 0.4, 11.4 + up, 0.4], [5 + sway * 0.6, 13 + up * 1.4, 0]];
  for (let i = 1; i < neck.length; i++) m.limb(neck[i - 1], neck[i], 2 - i * 0.12, 1.9 - i * 0.12, { color: (l, p) => (p[0] > 1 + (p[1] - 8) * 0.7 ? '#e6efa8' : '#7cc04b'), group: 'neck', over: 0.6 });
  const head = snakeHead({ turn: -0.05 + sway * 0.06, tongue });
  const at = add(neck.at(-1), [1.4, 0.4, 0]);
  for (const prim of head.prims) {
    for (const key of ['c', 'a', 'b']) if (prim[key]) prim[key] = add(prim[key], at);
    prim.group = `h-${prim.group}`;
    prim.over += 3;
    m.prims.push(prim);
  }
  for (const dot of head.dots) m.dots.push({ ...dot, x: dot.x + at[0], y: dot.y + at[1] });
  // El listón rojo
  m.ball(add(neck[2], [0.4, 0.4, 0]), [1.2, 2.2, 2.2], { turn: 0.9, color: RED, group: 'scarf', over: 3, blend: 0 });
  return m;
}

export { clamp };
