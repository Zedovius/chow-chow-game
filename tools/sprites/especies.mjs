// Cómo es cada animal: sus medidas, sus colores y lo que lo distingue (cuernos, crin, rayas, orejas...).
// Los de cuatro patas usan el esqueleto de rigs.mjs; el gallo, el dragón y la serpiente tienen el suyo.
// Cada uno da build(pose) → Model. Las medidas están en pixeles del juego.

import { drawLegs, headMap, Model, add, lerp, skeleton, tailPoints, TAU } from './rigs.mjs';

const RED = '#d7263d';
const GOLD = '#ffc53a';
const DARK = '#1b1226';

/** Rayas o manchas: color según la posición. */
const stripes = (base, stripe, belly, { scale = 1.5, skew = 0.35, at = 0.45, low = -0.35 } = {}) => (local, p) => {
  if (belly && local[1] < low) return belly;
  return Math.sin((local[0] + local[1] * skew) * scale * 1.9) > at ? stripe : base;
};
const twoTone = (top, bottom, cut = -0.5) => (local) => (local[1] < cut ? bottom : top);

/** Un ojo: oscuro con brillo, en la capa de enfrente de la cabeza. */
function eye(m, H, [x, y, z], { color = DARK, shine = '#ffffff', closed = false, white = null } = {}) {
  const p = H([x, y, z]);
  if (closed) {
    m.dot(p, color);
    m.dot([p[0] + 1, p[1] - 0.4, p[2]], color);
    return;
  }
  if (white) m.dot([p[0] - 1, p[1], p[2]], white);
  m.dot(p, color);
  m.dot([p[0], p[1] + 1, p[2]], shine);
}

/** El listón rojo con su moneda de oro, en el cuello (lo llevan casi todos: son de la misma casa). */
function scarf(m, s, { at = 0.5, r = 2.4, z = 2.4, coin = true, turn = 0, phase = 0, tails = true } = {}) {
  const c = lerp(s.neckBase, s.neckTop, at);
  const a = Math.atan2(s.neckTop[1] - s.neckBase[1], s.neckTop[0] - s.neckBase[0]);
  m.ball(c, [1.5, r, z], { turn: a + turn, color: RED, group: 'scarf', over: 3, blend: 0 });
  if (tails) {
    const knot = add(c, [-1.4, r * 0.75, 0.5]);
    m.chain(tailPoints(knot, { n: 4, length: 5.5, angle: 2.8, sway: 0.55, phase, delay: 0.18 }), 0.95, 0.6, { color: RED, group: 'ribbon', over: 2.8 });
  }
  if (coin) {
    const g = add(c, [Math.cos(a - 1.4) * r * 0.9, Math.sin(a - 1.4) * r * 0.9, 1]);
    m.ball(g, [1.1, 1.1, 0.9], { color: GOLD, group: 'coin', over: 4, blend: 0 });
  }
}

const quadruped = (own, dress) => ({
  def: own,
  build(pose) {
    const def = pose.def ?? own; // agachado, las medidas cambian (poses.mjs)
    const m = new Model();
    const s = skeleton(def, pose);
    const squash = pose.squash ?? 1;
    const trunk = (p, r, color, extra = {}) => m.ball(p, [r[0], r[1] * squash, r[2]], { turn: s.pitch, color, group: 'body', blend: 2, over: 1, ...extra });
    trunk(s.hip, def.hipR, def.coat);
    trunk(s.mid, def.midR, def.coat);
    trunk(s.chest, def.chestR, def.coat);
    if (def.neck.r) m.limb(s.neckBase, s.neckTop, def.neck.r[0], def.neck.r[1], { color: def.neckCoat ?? def.coat, group: 'body', over: 1, blend: 2 });
    drawLegs(m, s.legs, def);
    dress(m, s, pose, headMap(s));
    return m;
  },
});

// --- Rata --------------------------------------------------------------------------

const rat = quadruped({
  x: -4, height: 5.4, len: 8, hipY: 0.3, midY: 0.1, chestY: -0.3,
  hipR: [4.6, 4, 3.7], midR: [4.6, 3.5, 3.3], chestR: [3.6, 3.1, 2.9],
  coat: twoTone('#a9a5bd', '#d9d3e2', -1.6),
  neck: { at: [1.6, 0.4], to: [1.8, 0.9], r: [2.7, 2.3] }, headAt: [1.6, 0.3], headTurn: -0.12,
  front: { at: [0.6, -0.8], z: 2, l: [2, 1.9, 1.2], r: [1.3, 1, 0.8, 0.7], sole: 0.5, color: '#a9a5bd', shin: '#e6a9b8', hoof: '#e6a9b8', toe: 1.2, foot: 0.6 },
  hind: { at: [-0.8, -0.4], z: 2.4, l: [2.6, 2.4, 1.7], r: [2.3, 1.4, 0.9, 0.8], sole: 0.5, color: '#a9a5bd', shin: '#e6a9b8', hoof: '#e6a9b8', toe: 1.5, foot: 0.2 },
}, (m, s, pose, H) => {
  const fur = '#a9a5bd';
  m.ball(s.head, [3.2, 2.7, 2.5], { turn: s.headTurn, color: fur, group: 'body', over: 1, blend: 1.6 });
  m.limb(H([1.2, -0.4]), H([5, -1.3]), 2, 0.8, { color: (l) => (l[0] > 0.55 ? '#d9d3e2' : fur), group: 'body', over: 1, blend: 1.4 });
  m.ball(H([5.9, -1.3]), [0.8, 0.75, 0.75], { color: '#f08aa6', group: 'nose', over: 4, blend: 0 });
  const flap = pose.lag * 0.25;
  for (const z of [-1.7, 1.7]) {
    m.ball(H([z > 0 ? -1.6 - flap : -0.4 - flap, (z > 0 ? 2.6 : 3) - flap * 0.5, z * 1.2]), [z > 0 ? 2.1 : 1.7, z > 0 ? 2.3 : 1.9, 0.8], { color: z > 0 ? '#b7b3c9' : '#9a95b0', group: `ear${z}`, over: z > 0 ? 3 : 0.5, blend: 0 });
    if (z > 0) m.ball(H([-1.5 - flap, 2.5 - flap * 0.5, z * 1.2 + 0.7]), [1.3, 1.5, 0.8], { color: '#f2a3b8', group: 'inner', over: 4, blend: 0 });
  }
  eye(m, H, [2, 0.6, 2], { closed: pose.hurt });
  m.dot(H([4.2, -2.6, 1]), '#f4f0ff'); // bigotes
  m.dot(H([3.2, -3.2, 2]), '#f4f0ff');
  m.chain(tailPoints(add(s.hip, [-4, 0.2, 0]), { n: 8, length: 13, angle: 2.86, curl: -0.5, sway: 0.55, phase: pose.phase, delay: 0.11, zSway: 1.2 }), 0.95, 0.5, { color: '#e6a9b8', group: 'tail', over: -1 });
  scarf(m, s, { at: 0.35, r: 2.6, z: 2.6, phase: pose.phase });
});

// --- Buey --------------------------------------------------------------------------

const ox = quadruped({
  x: -4, height: 11, len: 12, hipY: -0.2, midY: -0.2, chestY: 0.5,
  hipR: [5.2, 5, 4.2], midR: [6, 4.9, 4.5], chestR: [5.8, 6.2, 4.8],
  coat: twoTone('#8b5a3c', '#6f4330', -3),
  neck: { at: [2.6, 0.6], to: [2.8, -0.6], r: [4.4, 3.5] }, headAt: [1.8, -0.6], headTurn: -0.35,
  front: { at: [0.6, -2.6], z: 2.7, l: [3.6, 3.2, 1.8], r: [2.4, 1.6, 1.25, 1.15], sole: 0.7, color: '#7d4f34', shin: '#e9d8bf', hoof: '#2b1a16', hoofR: 1.25, toe: 0.5, foot: 0.2 },
  hind: { at: [-0.4, -1.8], z: 2.7, l: [4, 3.4, 2], r: [3, 1.8, 1.2, 1.1], sole: 0.7, color: '#7d4f34', shin: '#e9d8bf', hoof: '#2b1a16', hoofR: 1.25, toe: 0.5, foot: 0 },
}, (m, s, pose, H) => {
  const coat = '#8b5a3c';
  m.ball(s.head, [3.5, 3.1, 2.9], { turn: s.headTurn, color: coat, group: 'body', over: 1, blend: 1.5 });
  m.ball(H([3.2, -1.2]), [2.6, 2.2, 2.3], { turn: s.headTurn, color: '#e9d8bf', group: 'muzzle', over: 2, blend: 0 });
  m.dot(H([5, -0.6, 2]), '#5a3a34');
  m.dot(H([4.6, -2.6, 2]), '#5a3a34');
  m.ball(H([5.6, -2.4]), [0.7, 1, 0.9], { color: GOLD, group: 'ring', over: 4, blend: 0 });
  for (const z of [-1, 1]) {
    m.chain([H([-0.6, 2.2, z * 1.8]), H([-0.6, 3.8, z * 3.6]), H([0.8, 5.4, z * 4.2]), H([2.4, 6, z * 3.8])], 1.15, 0.45, { color: (l) => '#f4ead2', group: `horn${z}`, over: z > 0 ? 4 : 0 });
    m.limb(H([-1.4, 1.2, z * 2.6]), H([-3.2 - pose.lag * 0.4, 0.6 - pose.lag * 0.6, z * 4]), 0.9, 0.7, { color: '#7d4f34', group: `ear${z}`, over: z > 0 ? 4 : 0 });
  }
  m.ball(H([0.6, 2.4]), [1.6, 1.3, 1.6], { color: RED, group: 'tuft', over: 3, blend: 0 }); // el moño rojo entre los cuernos
  eye(m, H, [1, 0.4, 2.6], { closed: pose.hurt });
  // La joroba y la cola con su mechón
  m.ball(add(s.chest, [-1, 4.2 * (pose.squash ?? 1), 0]), [3.2, 2.2, 2.6], { color: coat, group: 'body', over: 1, blend: 2 });
  const tail = tailPoints(add(s.hip, [-4.6, 2, 0]), { n: 5, length: 8, angle: -1.9, sway: 0.4, phase: pose.phase, delay: 0.14 });
  m.chain(tail, 0.7, 0.6, { color: '#6f4330', group: 'tail', over: -1 });
  m.ball(tail.at(-1), [1.1, 1.5, 1.1], { color: '#2b1a16', group: 'tuft2', over: -1, blend: 0 });
  scarf(m, s, { at: 0.3, r: 4.6, z: 4, tails: false });
});

// --- Tigre -------------------------------------------------------------------------

const tigerCoat = (cream = -2.2) => (local, p) => {
  if (local[1] < cream) return '#fbe6c4';
  return Math.sin(p[0] * 1.5 + p[1] * 0.25 + Math.sin(p[1] * 0.9) * 0.9) > 0.5 ? '#3a1a0f' : '#f08a24';
};
const tiger = quadruped({
  x: -4.5, height: 8.6, len: 12, hipY: 0, midY: 0, chestY: 0,
  hipR: [4.2, 3.9, 3.3], midR: [5.2, 3.4, 3.1], chestR: [4.2, 4.1, 3.5],
  coat: tigerCoat(),
  neck: { at: [2, 1], to: [2, 1.6], r: [3.2, 2.9] }, headAt: [1.7, 0.6], headTurn: -0.1,
  front: { at: [0.4, -1.8], z: 2.3, l: [3, 2.9, 1.6], r: [2, 1.4, 1.15, 1.1], sole: 0.7, color: '#f08a24', shin: '#f5a046', hoof: '#fbe6c4', hoofR: 1.25, toe: 0.9, foot: 0.4 },
  hind: { at: [-0.4, -1], z: 2.3, l: [3.4, 3.2, 2], r: [2.8, 1.6, 1.1, 1], sole: 0.7, color: tigerCoat(-9), mid: '#f08a24', shin: '#f5a046', hoof: '#fbe6c4', hoofR: 1.2, toe: 0.9, foot: 0 },
}, (m, s, pose, H) => {
  m.ball(s.head, [3.8, 3.5, 3.3], { turn: s.headTurn, color: (l) => (Math.sin(l[0] * 2.1 - l[1] * 0.9) > 0.72 && l[1] > -0.6 ? '#3a1a0f' : '#f08a24'), group: 'body', over: 1, blend: 1.2 });
  m.ball(H([-0.6, -1.6]), [2.6, 2.2, 3.6], { turn: s.headTurn, color: '#fbe6c4', group: 'ruff', over: 2, blend: 0 }); // las patillas
  m.ball(H([2.7, -1.2]), [2, 1.7, 2], { turn: s.headTurn, color: '#fbe6c4', group: 'muzzle', over: 2, blend: 0 });
  m.ball(H([4.4, -0.4]), [0.8, 0.7, 0.9], { color: '#e0607c', group: 'nose', over: 4, blend: 0 });
  m.dot(H([3, -2.4, 2]), '#3a1a0f');
  for (const z of [-1, 1]) {
    m.ball(H([-1.2, 3.2, z * 2.1]), [1.4, 1.5, 0.9], { color: z > 0 ? (l) => (l[1] > 0.7 ? '#3a1a0f' : l[1] < -0.2 ? '#fbe6c4' : '#f08a24') : '#c96a1a', group: `ear${z}`, over: z > 0 ? 3 : 0.5, blend: 0 });
  }
  eye(m, H, [1.9, 0.9, 3], { color: '#1b1226', white: '#d8f06a', shine: '#f4ffb0', closed: pose.hurt });
  const tail = tailPoints(add(s.hip, [-3.6, 1, 0]), { n: 8, length: 13, angle: pose.flat ? 3.2 : 2.75, curl: pose.flat ? -0.5 : -1.7, sway: pose.flat ? 0.2 : 0.4, phase: pose.phase, delay: 0.1, zSway: 1 });
  m.chain(tail, 1.15, 0.95, { color: (l, p) => (Math.sin(p[0] * 2.4 + p[1] * 1.2) > 0.35 ? '#3a1a0f' : '#f08a24'), group: 'tail', over: -1 });
  scarf(m, s, { at: 0.25, r: 3.6, z: 3.2, phase: pose.phase });
});

// --- Conejo ------------------------------------------------------------------------

const rabbit = quadruped({
  x: -3, height: 6.2, len: 7, hipY: 0.6, midY: 0.4, chestY: -0.4,
  hipR: [4.6, 4.6, 3.7], midR: [4.2, 3.9, 3.4], chestR: [3.4, 3.3, 2.9],
  coat: twoTone('#f2eef7', '#ffffff', -2),
  neck: { at: [1, 1.6], to: [1.1, 1.7], r: [2.5, 2.2] }, headAt: [1.2, 0.9], headTurn: -0.08,
  front: { at: [0.6, -1.4], z: 1.7, l: [2.1, 2, 1.1], r: [1.3, 1, 0.9, 0.85], sole: 0.6, color: '#f2eef7', shin: '#ffffff', hoof: '#ffffff', hoofR: 0.9, toe: 0.8, foot: 0.6 },
  hind: { at: [-0.4, -0.6], z: 2.5, l: [3.2, 3, 2.2], r: [3, 1.6, 1, 0.9], sole: 0.6, color: '#f2eef7', shin: '#ffffff', hoof: '#ffffff', hoofR: 1, toe: 1.9, foot: 0.4 },
}, (m, s, pose, H) => {
  const fur = '#f2eef7';
  m.ball(s.head, [3.2, 2.9, 2.7], { turn: s.headTurn, color: fur, group: 'body', over: 1, blend: 1.3 });
  m.ball(H([2.2, -0.8]), [1.8, 1.5, 1.8], { color: '#ffffff', group: 'body', over: 1, blend: 1 });
  m.ball(H([3.9, -0.3]), [0.6, 0.6, 0.7], { color: '#ff8fb0', group: 'nose', over: 4, blend: 0 });
  // Las orejas se quedan atrás al subir y se van adelante al caer
  const lag = pose.ears ?? (0.9 + pose.lag * 0.5);
  for (const z of [-1.1, 1.1]) {
    const base = H([-0.9, 2.2, z]);
    const tip = add(base, [-Math.sin(lag) * 7, Math.cos(lag) * 7, z * 0.4]);
    const bend = add(lerp(base, tip, 0.55), [-0.3, 0.7, 0]);
    m.chain([base, bend, tip], 1.35, 0.85, { color: fur, group: `ear${z}`, over: z > 0 ? 3 : 0 });
    if (z > 0) m.chain([add(lerp(base, bend, 0.4), [0, 0, 1]), add(bend, [0, 0, 1]), add(lerp(bend, tip, 0.7), [0, 0, 1])], 0.65, 0.5, { color: '#ffb0c8', group: 'inner', over: 4 });
  }
  eye(m, H, [1.5, 0.6, 2.3], { color: '#8a1f3d', closed: pose.hurt });
  m.ball(add(s.hip, [-4.4, 1.2, 0]), [1.9, 1.8, 1.8], { color: '#ffffff', group: 'tail', over: 0, blend: 0 });
  scarf(m, s, { at: 0.2, r: 2.9, z: 2.6, phase: pose.phase });
});

// --- Caballo -----------------------------------------------------------------------

const horse = quadruped({
  x: -4, height: 12.4, len: 11.4, hipY: 0.2, midY: -0.3, chestY: 0,
  hipR: [4.4, 4, 3.3], midR: [4.8, 3.5, 3.1], chestR: [4.2, 4.1, 3.2],
  coat: twoTone('#a0522d', '#8a4424', -2.4),
  neck: { at: [1.4, 1.6], to: [3.9, 4.6], r: [2.9, 2.1] }, headAt: [0.9, 0.5], headTurn: -0.5,
  front: { at: [0.4, -2], z: 1.9, l: [4.2, 3.9, 2.2], r: [1.9, 1.2, 0.95, 0.85], sole: 0.8, color: '#a0522d', shin: '#f2e9dc', hoof: '#2b1a16', hoofR: 1.05, toe: 0.6, foot: 0.4 },
  hind: { at: [-0.6, -1.4], z: 1.9, l: [4.6, 4.1, 2.6], r: [2.7, 1.5, 1, 0.85], sole: 0.8, color: '#a0522d', shin: '#8a4424', hoof: '#2b1a16', hoofR: 1.05, toe: 0.6, foot: 0 },
}, (m, s, pose, H) => {
  const coat = '#a0522d';
  const hair = '#2e1510';
  m.ball(H([0, 0]), [2.5, 2.3, 2.2], { turn: s.headTurn, color: coat, group: 'body', over: 1, blend: 1.3 });
  m.limb(H([0.4, -0.2]), H([4.6, -1.1]), 2, 1.5, { color: (l, p) => coat, group: 'body', over: 1, blend: 1.2 });
  m.ball(H([5.1, -1.2]), [1.5, 1.4, 1.5], { turn: s.headTurn, color: '#7a3b22', group: 'muzzle', over: 2, blend: 0 });
  m.limb(H([1.4, 1.5]), H([4.2, 0.2]), 0.55, 0.5, { color: '#f7f0e4', group: 'blaze', over: 2.5, blend: 0 }); // la mancha blanca de la cara
  m.dot(H([5.4, -0.6, 2]), '#2b1a16');
  for (const z of [-1, 1]) m.limb(H([-1.2, 1.6, z]), H([-1.4, 4, z * 1.3]), 0.9, 0.4, { color: coat, group: `ear${z}`, over: z > 0 ? 3 : 0 });
  eye(m, H, [1, 0.5, 2], { closed: pose.hurt });
  // La rienda roja con su cascabel
  m.ball(H([3, -0.9]), [0.5, 1.9, 1.9], { turn: s.headTurn, color: RED, group: 'rein', over: 3, blend: 0 });
  // La crin: mechones a lo largo del cuello que se echan hacia atrás y ondean
  for (let i = 0; i <= 5; i++) {
    const k = i / 5;
    const at = add(lerp(add(s.neckBase, [-1.6, 1.4, 0]), add(s.neckTop, [-1.2, 1.7, 0]), k), [0, 0, 0]);
    m.chain(tailPoints(at, { n: 3, length: 4.2, angle: 2.9 + k * 0.1, sway: 0.5, phase: pose.phase + k * 0.2, delay: 0.16 }), 1.15, 0.5, { color: hair, group: 'mane', over: 2.2 });
  }
  m.limb(H([-0.4, 2]), H([1.6, 1.9]), 0.9, 0.5, { color: hair, group: 'mane', over: 3 });
  m.chain(tailPoints(add(s.hip, [-4, 1.8, 0]), { n: 6, length: 11, angle: 2.8, curl: 0.5, sway: 0.4, phase: pose.phase, delay: 0.13, zSway: 0.6 }), 1.5, 0.8, { color: hair, group: 'tail', over: -1 });
  scarf(m, s, { at: 0.02, r: 3.4, z: 3, tails: false });
});

// --- Cabra -------------------------------------------------------------------------

const goat = quadruped({
  x: -4, height: 10.4, len: 9.4, hipY: 0, midY: -0.3, chestY: 0.1,
  hipR: [4, 3.9, 3.3], midR: [4.4, 3.7, 3.4], chestR: [3.9, 4, 3.2],
  coat: (l, p) => (Math.sin(p[0] * 2.2) * Math.sin(p[1] * 2.6 + p[0]) > 0.55 ? '#d8cdb4' : '#efe8d6'),
  neck: { at: [1.2, 1.6], to: [2.2, 3.6], r: [2.6, 2] }, headAt: [1, 0.6], headTurn: -0.45, neckCoat: '#e9e2cf',
  front: { at: [0.4, -1.8], z: 1.9, l: [3.4, 3.1, 1.9], r: [1.8, 1.1, 0.9, 0.8], sole: 0.7, color: '#e9e2cf', shin: '#cfc3a6', hoof: '#3a2c22', hoofR: 1, toe: 0.5, foot: 0.3 },
  hind: { at: [-0.4, -1.2], z: 1.9, l: [3.6, 3.3, 2.2], r: [2.5, 1.4, 0.9, 0.8], sole: 0.7, color: '#e9e2cf', shin: '#cfc3a6', hoof: '#3a2c22', hoofR: 1, toe: 0.5, foot: 0 },
}, (m, s, pose, H) => {
  const coat = '#e9e2cf';
  m.ball(H([0, 0]), [2.5, 2.3, 2.1], { turn: s.headTurn, color: coat, group: 'body', over: 1, blend: 1.2 });
  m.limb(H([0.4, -0.2]), H([3.5, -0.8]), 1.9, 1.35, { color: coat, group: 'body', over: 1, blend: 1.2 });
  m.ball(H([4.2, -0.9]), [1, 1, 1.1], { color: '#f3b7b0', group: 'nose', over: 2, blend: 0 });
  for (const z of [-1, 1]) {
    m.chain([H([-0.2, 1.7, z * 1.1]), H([-1.1, 3.6, z * 1.4]), H([-2.8, 4.7, z * 1.8]), H([-4.6, 4.2, z * 2.1])], 1.2, 0.5, { color: (l, p) => (Math.sin(p[0] * 3.4 + p[1] * 1.6) > 0.2 ? '#8a7350' : '#b59a6c'), group: `horn${z}`, over: z > 0 ? 3 : 0 });
    m.limb(H([-1.2, 0.6, z * 1.9]), H([-3.2, -0.6 - pose.lag * 0.8, z * 3]), 0.9, 0.6, { color: '#d8cdb4', group: `ear${z}`, over: z > 0 ? 3 : 0 });
  }
  m.chain(tailPoints(H([2.6, -2.2]), { n: 3, length: 3.6, angle: -1.9, sway: 0.5, phase: pose.phase, delay: 0.2 }), 1, 0.35, { color: '#ffffff', group: 'beard', over: 2 });
  eye(m, H, [1.3, 0.5, 2], { color: '#1b1226', white: '#ffd23f', closed: pose.hurt });
  m.chain(tailPoints(add(s.hip, [-3.4, 2.2, 0]), { n: 3, length: 3.6, angle: 2.2, sway: 0.4, phase: pose.phase * 2 }), 1.1, 0.7, { color: '#ffffff', group: 'tail', over: -1 });
  scarf(m, s, { at: 0.4, r: 2.6, z: 2.5, tails: false });
});

// --- Mono --------------------------------------------------------------------------

const monkey = quadruped({
  x: -3, height: 8.8, len: 8, hipY: -0.8, midY: 0, chestY: 1,
  hipR: [3.4, 3.2, 2.9], midR: [3.8, 3.1, 2.8], chestR: [3.4, 3.5, 3.1],
  coat: twoTone('#b9793f', '#e8c08a', -2),
  neck: { at: [1, 1.4], to: [1.4, 1.7], r: [2.2, 2] }, headAt: [1, 1.2], headTurn: -0.1,
  front: { at: [0.6, -0.8], z: 2.5, l: [4.2, 4, 0.8], r: [1.7, 1.2, 1.05, 1], sole: 0.7, color: '#b9793f', shin: '#b9793f', hoof: '#f0c9a0', hoofR: 1.15, toe: 0.6, foot: 0.6 },
  hind: { at: [-0.2, -0.6], z: 2, l: [3.4, 3.2, 1.2], r: [2.1, 1.4, 1.05, 0.95], sole: 0.6, color: '#b9793f', shin: '#b9793f', hoof: '#f0c9a0', hoofR: 1, toe: 1.6, foot: 0.4 },
}, (m, s, pose, H) => {
  const fur = '#b9793f';
  const skin = '#f5d3ac';
  m.ball(s.head, [3.5, 3.4, 3.1], { turn: s.headTurn, color: fur, group: 'body', over: 1, blend: 1.1 });
  m.ball(H([1.5, -0.4]), [2.3, 2.4, 2.6], { turn: s.headTurn, color: skin, group: 'face', over: 2, blend: 0.8 });
  m.ball(H([2.7, -1.5]), [1.6, 1.3, 1.8], { turn: s.headTurn, color: skin, group: 'face', over: 2, blend: 0.8 });
  m.dot(H([3.8, -0.9, 1]), '#8a4a3a');
  m.dot(H([3.2, -2.2, 2]), '#8a4a3a');
  for (const z of [-1, 1]) m.ball(H([-0.8, 0, z * 3]), [1.1, 1.5, 0.9], { color: skin, group: `ear${z}`, over: z > 0 ? 3 : 0, blend: 0 });
  // La diadema de oro
  m.chain([H([-3.1, 0.5, 0.8]), H([-1.8, 0.8, 2.7]), H([0.6, 1.1, 3.1]), H([2.3, 1.3, 2.3]), H([3.2, 1.4, 0.6])], 0.5, 0.5, { color: GOLD, group: 'band', over: 3, blend: 0 });
  m.ball(H([3.2, 1.7, 0.6]), [0.6, 0.7, 0.8], { color: GOLD, group: 'band2', over: 3.2, blend: 0 });
  eye(m, H, [2.5, 0.5, 2.4], { closed: pose.hurt });
  m.chain(tailPoints(add(s.hip, [-3, 0.6, 0]), { n: 9, length: pose.flat ? 11 : 14, angle: pose.flat ? 3.1 : 2.7, curl: pose.flat ? -0.8 : -3.6, sway: 0.25, phase: pose.phase, delay: 0.1, zSway: 0.8 }), 0.95, 0.75, { color: fur, group: 'tail', over: -1 });
  scarf(m, s, { at: 0.1, r: 2.7, z: 2.8, phase: pose.phase });
});

// --- Perro (chow chow) ---------------------------------------------------------------

const dog = quadruped({
  x: -3.5, height: 8.6, len: 8.6, hipY: 0, midY: 0, chestY: 0.2,
  hipR: [4.2, 4.1, 3.6], midR: [4.4, 4, 3.5], chestR: [4.3, 4.4, 3.8],
  coat: twoTone('#d9a066', '#f0cf9c', -2.6),
  neck: { at: [1, 1.4], to: [1.5, 2], r: [3.8, 3.4] }, headAt: [1.5, 0.9], headTurn: -0.06,
  front: { at: [0.4, -1.8], z: 2.2, l: [2.8, 2.6, 1.3], r: [1.9, 1.5, 1.3, 1.2], sole: 0.7, color: '#d9a066', shin: '#e8b87f', hoof: '#f0cf9c', hoofR: 1.3, toe: 0.7, foot: 0.4 },
  hind: { at: [-0.2, -1.4], z: 2.2, l: [3, 2.9, 1.6], r: [2.4, 1.6, 1.3, 1.2], sole: 0.7, color: '#d9a066', shin: '#e8b87f', hoof: '#f0cf9c', hoofR: 1.25, toe: 0.7, foot: 0 },
}, (m, s, pose, H) => {
  const fur = '#d9a066';
  // La melena: una bola de pelo alrededor del cuello, con mechones claros
  const c = lerp(s.neckBase, s.neckTop, 0.7);
  m.ball(c, [4.4, 5, 4.3], { turn: 0.2, color: (l) => (Math.sin(l[0] * 2.4 + l[1] * 1.7) * Math.cos(l[1] * 2.2) > 0.45 ? '#f0cf9c' : '#c98a4f'), group: 'mane', over: 1.5, blend: 0 });
  m.ball(H([0.4, 0]), [3.4, 3.2, 3.1], { turn: s.headTurn, color: fur, group: 'head', over: 2, blend: 1 });
  m.ball(H([3.1, -1.1]), [2, 1.7, 2], { turn: s.headTurn, color: '#c08450', group: 'head', over: 2, blend: 1 });
  m.ball(H([4.9, -0.4]), [0.9, 0.8, 1], { color: '#2b1a16', group: 'nose', over: 4, blend: 0 });
  // La lengua azul de los chow chow
  if (pose.tongue !== false) m.limb(H([3.6, -2.5, 1]), H([3 - pose.lag * 0.3, -4.2, 1.4]), 0.8, 0.7, { color: '#4a4f9c', group: 'tongue', over: 3 });
  for (const z of [-1, 1]) m.ball(H([-0.6, 3.2, z * 2]), [1.3, 1.5, 0.9], { color: '#c98a4f', group: `ear${z}`, over: z > 0 ? 3 : 0.5, blend: 0 });
  eye(m, H, [2.2, 0.6, 2.7], { closed: pose.hurt });
  m.dot(H([2.4, 1.8, 2.9]), '#b5763c'); // el ceño
  // La cola, enroscada sobre el lomo
  m.chain(tailPoints(add(s.hip, [-2.6, pose.flat ? 1.4 : 3, 0]), { n: 7, length: pose.flat ? 7 : 9.5, angle: pose.flat ? 2.9 : 2.2, curl: pose.flat ? -1.4 : -3.5, sway: 0.16, phase: pose.phase, delay: 0.1 }), 1.9, 1.5, { color: '#f0cf9c', group: 'tail', over: 0.5 });
  m.ball(add(c, [2.6, -3.2, 2.4]), [1.2, 1.2, 0.9], { color: GOLD, group: 'coin', over: 4, blend: 0 });
  m.ball(add(c, [1.6, -2, 2.6]), [1.3, 0.8, 1], { color: RED, group: 'collar', over: 3.5, blend: 0 });
});

// --- Cerdo -------------------------------------------------------------------------

const pig = quadruped({
  x: -4, height: 7, len: 8.4, hipY: 0.2, midY: 0, chestY: 0.2,
  hipR: [4.8, 4.7, 4.1], midR: [5, 4.9, 4.3], chestR: [4.6, 4.5, 4],
  coat: twoTone('#f4a6b8', '#f9c6d0', -3),
  neck: { at: [1.8, 0.6], to: [1.8, 0.8], r: [3.8, 3.3] }, headAt: [1.5, 0.2], headTurn: -0.12,
  front: { at: [0.4, -2], z: 2.4, l: [1.8, 1.6, 0.9], r: [1.7, 1.3, 1.1, 1], sole: 0.7, color: '#ee97ac', shin: '#ee97ac', hoof: '#6b3a48', hoofR: 1.1, toe: 0.4, foot: 0.2 },
  hind: { at: [-0.2, -1.8], z: 2.4, l: [1.9, 1.7, 1.1], r: [2, 1.4, 1.1, 1], sole: 0.7, color: '#ee97ac', shin: '#ee97ac', hoof: '#6b3a48', hoofR: 1.1, toe: 0.4, foot: 0 },
}, (m, s, pose, H) => {
  const skin = '#f4a6b8';
  m.ball(s.head, [3.5, 3.3, 3], { turn: s.headTurn, color: skin, group: 'body', over: 1, blend: 1.2 });
  m.limb(H([2.2, -0.8]), H([4.6, -1]), 2, 1.7, { color: skin, group: 'body', over: 1, blend: 1 });
  m.ball(H([5, -1]), [1, 1.8, 1.8], { turn: s.headTurn, color: '#e0708c', group: 'snout', over: 3, blend: 0 });
  m.dot(H([5.4, -0.4, 2]), '#8a2f4a');
  m.dot(H([5.2, -1.6, 2]), '#8a2f4a');
  const flap = pose.lag;
  for (const z of [-1, 1]) m.chain([H([-0.6, 2.6, z * 1.8]), H([1, 2.8 + flap * 0.4, z * 2.8]), H([2.4, 1.2 + flap * 1.2, z * 3.2])], 1.4, 0.7, { color: '#e98aa3', group: `ear${z}`, over: z > 0 ? 4 : 0 });
  eye(m, H, [2, 0.5, 2.7], { closed: pose.hurt });
  m.chain(tailPoints(add(s.hip, [-4.4, 1.6, 0]), { n: 8, length: 7, angle: 2.4, curl: 6.4, sway: 0.2, phase: pose.phase * 2, delay: 0.06, zSway: 0.8 }), 0.75, 0.5, { color: '#e98aa3', group: 'tail', over: 0.5 });
  scarf(m, s, { at: 0.3, r: 4, z: 3.8, phase: pose.phase });
});

export const QUADRUPEDS = { rat, ox, tiger, rabbit, horse, goat, monkey, dog, pig };
export { DARK, GOLD, RED, eye, scarf, stripes, twoTone, TAU };
