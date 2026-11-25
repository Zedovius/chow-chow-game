// Lo que comparten los jefes, al estilo del dibujo de la Rata: el tronco encorvado, los pies, el collar de cuentas con
// su pañuelo rojo rasgado, el medallón de oro (su punto débil), las pulseras de aros, la ceja dura, los dientes, el brazo
// que se mueve y las colas que ondulan. Los jefes están en jefesModelos.mjs.
//
// En pixeles del juego, desde el centro de su caja de choque: x a la derecha, y arriba, z hacia quien mira. Miran a la
// izquierda.

import { Sculpture } from './escultura.mjs';
import { lerp, TAU } from './modelo3d.mjs';
import { noise } from './ruido.mjs';

const { sin, cos, PI, abs, hypot, min, max, floor } = Math;

export const RED = '#d01c20';
export const GOLD = '#d09a30';
export const IVORY = '#ece0c4';
export const INK = '#14101c';
export const WOOD = '#7a5844';
export const SHOULDER = [4.5, -2];

export const rad = (a) => (a * PI) / 180;
export const add = (a, b) => a.map((v, i) => v + (b[i] ?? 0));
export const turn = ([x, y, z = 0], a, [cx, cy] = [0, 0]) => [cx + (x - cx) * cos(a) - (y - cy) * sin(a), cy + (x - cx) * sin(a) + (y - cy) * cos(a), z];

/** El medallón: oro gastado con su emblema grabado (emblem(u, v): si es parte de él; de -1 a 1 en cada eje). */
export function medal(m, emblem, { color = '#dca63a', dark = '#4a2c0c', light = '#ffdc7a' } = {}) {
  const [cx, cy, z] = [-7.5, 0.5, 11.4];
  m.ball([cx, cy, z], [6.6, 7, 1.5], {
    mat: 'gold', group: 'medal', over: 3, blend: 0,
    color: (l) => {
      const [u, v] = [l[0] / 6.6, l[1] / 7];
      const d = hypot(u, v);
      if (d > 0.66 && d < 0.76) return '#7a5018';
      if (d < 0.66 && emblem(u / 0.64, v / 0.64)) return dark;
      return noise(l[0] * 0.9 + 20, l[1] * 0.9, 3) > 0.66 ? '#b0802c' : color;
    },
  });
  for (let i = 0; i < 26; i++) { // el canto, en relieve
    const a = (i / 26) * TAU;
    m.ball([cx + cos(a) * 6.1, cy + sin(a) * 6.5, z + 0.5], [1.05, 1.05, 1], { color: light, mat: 'gold', group: 'medalRim', over: 4, blend: 0.8 });
  }
}

/** El collar de cuentas y, debajo, el pañuelo rojo rasgado, con sus puntas al aire. */
export function collar(m, t, { from = [9.4, 16, 2], to = [-2.5, 7.8, 10.6], bulge = 3.4, red = RED, n = 6 } = {}) {
  const at = (k) => [lerp(from[0], to[0], k), lerp(from[1], to[1], k) - sin(k * PI) * 0.8, lerp(from[2], to[2], k) + sin(k * PI) * bulge];
  for (let i = 0; i < 8; i++) m.limb(add(at(i / 8), [0, 0, 0.4]), add(at((i + 1) / 8), [0, 0, 0.4]), 0.7, 0.7, { color: '#3a241c', mat: 'bead', group: 'cord', over: 5, blend: 0 });
  for (let i = 0; i < n; i++) m.ball(add(at(i / (n - 1)), [0, 0, 1]), 1.25, { color: i % 2 ? '#a87a58' : '#8e6248', mat: 'bead', group: `bead${i}`, over: 6, blend: 0 });
  const bright = red === RED ? '#f2524a' : '#a85ad0';
  const dim = red === RED ? '#a0161a' : '#56207a';
  const cloth = (l) => (sin(l[0] * 1.9 + l[1] * 1.1) > 0.6 ? bright : red);
  for (let i = 0; i <= 10; i++) {
    const p = at(i / 10);
    m.ball([p[0] - 0.2, p[1] - 3.2, p[2] + 0.3], [2.8, 3, 1.7], { color: cloth, mat: 'cloth', group: 'cloth', over: 4, blend: 1.2 });
  }
  // Los jirones de abajo, disparejos y en pico
  const flap = sin(t * TAU);
  for (const [k, dx, dy, r] of [[0.04, 3, -8, 1.7], [0.16, 1.2, -11.4, 1.9], [0.3, 2, -7.6, 1.5], [0.42, 0.4, -10.4, 1.8], [0.56, 1.2, -6.8, 1.4], [0.68, -0.2, -9.6, 1.7], [0.84, 0.6, -6.2, 1.3], [0.98, -1, -7.8, 1.4]]) {
    const p = at(k);
    m.limb([p[0] - 0.3, p[1] - 4, p[2] + 0.6], [p[0] + dx + flap * 0.7, p[1] + dy, p[2] - 0.2], r, 0.15, { color: (l) => (l[0] > 0.7 ? dim : red), mat: 'cloth', group: 'cloth', over: 4, blend: 0.6 });
  }
  // Las puntas rotas que vuelan atrás
  const p = at(0);
  for (const [dx, dy, r, ph] of [[10.6, 1.6, 2.4, 0], [9.6, -2.4, 2.1, 0.2], [7.4, -6, 1.8, 0.4], [4, -9, 1.5, 0.55]]) {
    const w = sin((t + ph) * TAU);
    m.chain([[p[0] - 1, p[1] - 2.4, p[2] + 0.6], [p[0] + dx * 0.5, p[1] - 1.4 + dy * 0.4 + w * 0.8, p[2] - 0.6], [p[0] + dx, p[1] - 1.6 + dy + w * 1.9, p[2] - 2]], r, 0.15, { color: (l) => (l[0] > 0.62 ? dim : red), mat: 'cloth', group: 'cloth', over: 3, blend: 0.6 });
  }
}

/** El tronco de pera, encorvado; y cómo respira. */
export function trunk(m, t, { fur, belly = fur, mat = 'fur', wide = 1, hips = 1, hump = 0 }) {
  const b = 1 + sin(t * TAU) * 0.018;
  const pick = (c, l, at) => (typeof c === 'function' ? c(l, at) : c);
  const color = (l, at) => (at[0] < 2 + at[1] * 0.1 && at[2] > 3 && at[1] < 2 ? pick(belly, l, at) : pick(fur, l, at));
  const o = { color, mat, group: 'body', blend: 4 };
  m.ball([5, -9.5, 0], [12.6 * wide * hips, 10.6, 11 * wide * hips], o);
  m.ball([2.4, -1, 0.6], [11.6 * wide * b, 10.6 * b, 10 * wide * b], o);
  m.ball([5.6, 6.4 + hump, 0], [9.4, 8.6 + hump, 8.6], o);
  m.limb([5.4, 7, 0], [0, 14, 0], 7, 6, o);
}

/** Las piernas cortas y los pies: paw, hoof o bird. */
export function feet(m, kind, { fur, skin, claw = IVORY, mat = 'fur' }) {
  for (const [z, dx] of [[-5, -2.4], [5.4, 0]]) {
    const over = z > 0 ? 2 : 1;
    m.limb([5 + dx, -16, z * 0.8], [4 + dx, -21.4, z], 4.2, 2.9, { color: fur, mat, group: `leg${z}`, blend: 2 });
    if (kind === 'hoof') {
      m.limb([4 + dx, -21, z], [-1 + dx, -22.4, z], 2.8, 2.6, { color: fur, mat, group: `leg${z}`, blend: 2 });
      m.limb([-1.4 + dx, -22.6, z], [-4.8 + dx, -23.2, z], 2.6, 2.9, { color: (l, at) => (abs(at[2] - z) < 0.5 ? INK : at[1] < -24.2 ? '#5a4c52' : '#3a3038'), mat: 'horn', group: `hoof${z}`, over: 1, blend: 0.6 });
      continue;
    }
    const bird = kind === 'bird';
    const [toe, heel, end] = bird ? [1.1, 1.5, -10] : [1.8, 2.5, -7.4];
    m.limb([5.6 + dx, -22.4, z], [-3.4 + dx, -22.8, z], heel, heel, { color: skin, mat: bird ? 'skin' : mat, group: `foot${z}`, blend: 1.2 });
    for (const [dz, dy] of [[-2, 0.4], [0, 0], [2, -0.4]]) {
      const tip = [end + dx - (dz ? 0 : 0.8), -23.4 + dy * 0.6, z + dz * 1.5];
      m.limb([-3.4 + dx, -22.8 + dy, z + dz], tip, toe, toe * 0.85, { color: skin, mat: bird ? 'skin' : mat, group: `foot${z}`, blend: 0.6 });
      m.limb(add(tip, [-0.8, 0, 0.4]), add(tip, [-3.8, -1, 0.6]), 1, 0.15, { color: claw, mat: 'horn', group: `claw${z}${dz}`, over, blend: 0 });
    }
    if (kind === 'bird') m.limb([7 + dx, -22, z], [11 + dx, -20.4, z], 1.2, 0.2, { color: claw, mat: 'horn', group: `spur${z}` });
  }
}

/** Aros de oro alrededor de un brazo, entre a y b. */
export function bangles(m, a, b, r, tag) {
  m.limb(a, b, r, r, { color: (l) => (sin(l[0] * 13) > -0.2 ? '#d09a30' : '#6a4416'), mat: 'gold', group: `ring${tag}`, over: 2, blend: 0 });
}

/** El brazo de atrás, que sostiene algo. */
export function farArm(m, { fur, skin, mat = 'fur', hoof = false, claw = IVORY, hold: hand = [-17.6, -1.6, -3] }) {
  m.limb([-3, 3, -4], [-10.4, 0.6, -5], 3.8, 3, { color: fur, mat, group: 'far', blend: 2 });
  m.limb([-10.4, 0.6, -5], [hand[0] + 2.6, hand[1] + 0.6, hand[2]], 2.9, 2.2, { color: fur, mat, group: 'far', blend: 2 });
  if (hoof) {
    m.limb([hand[0] + 1, hand[1], hand[2]], [hand[0] - 1.4, hand[1] - 0.6, hand[2]], 2.5, 2.8, { color: (l, at) => (abs(at[2] - hand[2]) < 0.5 ? INK : '#3a3038'), mat: 'horn', group: 'farHand', over: 1 });
    return;
  }
  m.ball(hand, [2.6, 2.3, 2.3], { color: skin, mat: 'skin', group: 'farHand', over: 1, blend: 0.6 });
  for (const dy of [1.2, 0, -1.2]) {
    const tip = [hand[0] - 2.4, hand[1] + dy - 0.8, hand[2] + 0.8];
    m.limb([hand[0] - 0.6, hand[1] + dy, hand[2] + 1.6], tip, 1, 0.8, { color: skin, mat: 'skin', group: 'farHand', over: 1, blend: 0.5 });
    m.limb(tip, add(tip, [-1, -1.4, 0.4]), 0.6, 0.15, { color: claw, mat: 'horn', group: `fc${dy}`, over: 2, blend: 0 });
  }
}

/** La ceja dura, que cae hacia el hocico, y las arrugas de enojo alrededor del ojo. */
export function scowl(m, from, to, color, r = 1.7) {
  const lift = 1.3; // arriba del ojo
  const mid = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2 + 0.2 + lift, from[2] + 1];
  m.chain([add(from, [0, lift]), mid, add(to, [0, lift])], r * 0.62, r * 0.5, { color, mat: 'fur', group: 'brow', over: 3, blend: 1 });
  for (const [dy, len] of [[-4.4, 3.4], [-5.8, 2.6]]) m.limb([from[0] + 3.4, from[1] + dy + 0.6, from[2] + 1], [from[0] + 3.4 + len, from[1] + dy + 1.8, from[2] + 1.4], 0.55, 0.3, { color, mat: 'skin', group: `wrinkle${dy}`, over: 2, blend: 0 });
}

export const tooth = (m, [x, y, z], dy, r = 0.7, dx = 0) => m.limb([x, y, z], [x + dx, y + dy, z], r, 0.15, { color: '#f6eed8', mat: 'horn', group: `t${x}${y}${z}`, over: 4, blend: 0 });

/** Las fauces: una boca abierta y oscura de a (adelante) a b (la mejilla), con dientes arriba y abajo; big: cuáles son colmillos. */
export function maw(m, a, b, r, { n = 5, big = [0, 2], inside = '#4a0a12' } = {}) {
  m.limb(a, b, r, r * 0.7, { color: inside, mat: 'skin', group: 'maw', over: 5, blend: 0 });
  const at = (k) => [0, 1, 2].map((c) => lerp(a[c], b[c], k));
  for (let i = 0; i < n; i++) {
    const k = (i + 0.2) / n;
    const p = at(k);
    const fang = big.includes(i);
    const top = p[1] + r * (1 - k * 0.25);
    m.limb([p[0], top, p[2] + r * 0.6], [p[0] - 0.3, top - r * (fang ? 1.9 : 0.85), p[2] + r * 0.8], fang ? 0.85 : 0.55, 0.1, { color: '#f6ecd0', mat: 'horn', group: `up${i}`, over: 7, blend: 0 });
    const low = p[1] - r * (1 - k * 0.25) + 0.1;
    if (i < n - 1) m.limb([p[0] + 1, low, p[2] + r * 0.6], [p[0] + 0.9, low + r * (i === 1 ? 1.3 : 0.7), p[2] + r * 0.8], i === 1 ? 0.7 : 0.45, 0.1, { color: '#d8caa4', mat: 'horn', group: `dn${i}`, over: 7, blend: 0 });
  }
}

// --- El brazo de enfrente, el que se mueve ----------------------------------------------------

/** angle: grados; 0, horizontal hacia la izquierda; más, hacia abajo. El hombro, en (0, 0). */
export function arm({ fur, skin, mat = 'fur', hand = 'claw', claw = IVORY, thick = 1, tip = GOLD }, angle) {
  const m = new Sculpture();
  const a = rad(angle);
  const dir = [-cos(a), -sin(a)];
  const low = [sin(a), -cos(a)]; // hacia donde cuelga el codo
  const at = (k, s = 0, z = 0) => [dir[0] * k + low[0] * s, dir[1] * k + low[1] * s, z];
  const along = (p) => p[0] * low[0] + p[1] * low[1];
  m.limb(at(0), at(8.6, 2.4, 1), 4.3 * thick, 3.5 * thick, { color: fur, mat, group: 'arm', blend: 3 });
  m.limb(at(8.6, 2.4, 1), at(14.6, 0.6, 1.6), 3.4 * thick, 2.5 * thick, { color: fur, mat, group: 'arm', blend: 3 });
  bangles(m, at(11.8, 1.2, 1.4), at(14.8, 0.5, 1.6), 2.9 * thick, 'near');
  if (hand === 'hoof') {
    m.limb(at(15, 0.4, 1.6), at(17.6, 0, 1.8), 2.8, 3, { color: fur, mat, group: 'hand', blend: 1 });
    m.limb(at(18, 0, 1.8), at(20.8, 0, 1.8), 3, 3.6, { color: (l, p) => (abs(along(p)) < 0.5 ? INK : l[0] > 0.7 ? '#6a5a60' : '#3e343c'), mat: 'horn', group: 'hoof', over: 1, blend: 0.5 });
    return m;
  }
  if (hand === 'wing') {
    for (let i = 0; i < 7; i++) {
      const k = i / 6;
      const s = rad(-14 + k * 78);
      const from = at(15 - k * 8, 0.8 + k * 1.6, 1.4 - k);
      const d = [dir[0] * cos(s) + low[0] * sin(s), dir[1] * cos(s) + low[1] * sin(s), 0];
      m.limb(from, add(from, d.map((v) => v * (11.4 - k * 2.4))), 2, 0.9, { color: (l) => (l[0] > 0.74 ? tip : l[0] > 0.6 ? GOLD : fur), mat: 'feather', group: `f${i}`, over: 6 - i, blend: 0 });
    }
    return m;
  }
  m.ball(at(17.4, 0.2, 1.8), [3.1, 3.1, 2.6], { color: skin, mat: 'skin', group: 'hand', blend: 1 });
  for (const [s, reach] of [[-2.6, 21.4], [-0.6, 23], [1.4, 22.4], [3.4, 19.6]]) {
    const end = at(reach - 1.6, s * 1.35 + 0.6, 2.4);
    m.limb(at(19.2 - abs(s) * 0.2, s * 0.8, 2.6), end, 1.15, 0.95, { color: skin, mat: 'skin', group: 'hand', blend: 0.6 });
    m.limb(end, add(end, [dir[0] * 3.8 + low[0] * 1.2, dir[1] * 3.8 + low[1] * 1.2, 0]), 1.05, 0.15, { color: claw, mat: 'horn', group: `c${s}`, over: 2, blend: 0 });
  }
  return m;
}

// --- Cuerpos y colas que ondulan -----------------------------------------------------------------

/** Puntos de una curva suave que pasa por points. */
export function curve(points, n) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const s = (i / n) * (points.length - 1);
    const k = min(points.length - 2, floor(s));
    const u = s - k;
    const [p0, p1, p2, p3] = [points[max(0, k - 1)], points[k], points[k + 1], points[min(points.length - 1, k + 2)]];
    out.push([0, 1, 2].map((c) => 0.5 * (2 * p1[c] + (p2[c] - p0[c]) * u + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * u * u + (3 * p1[c] - p0[c] - 3 * p2[c] + p3[c]) * u ** 3)));
  }
  return out;
}

/** Una ola que recorre los puntos, del primero al último; amp(k): cuánto se mueve ahí (k: 0 a 1). */
export const ripple = (path, t, amp, waves = 1, phase = 0) => path.map((p, i) => {
  const n = path.length - 1;
  const [a, b] = [path[max(0, i - 1)], path[min(n, i + 1)]];
  const len = hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const k = i / n;
  const d = amp(k) * sin(TAU * (k * waves - t + phase));
  return [p[0] - ((b[1] - a[1]) / len) * d, p[1] + ((b[0] - a[0]) / len) * d, p[2] + cos(TAU * (k * waves - t + phase)) * amp(k) * 0.4];
});

/** Una cola por sus puntos, que se mece como una ola; amp: cuánto, en la punta. */
export const tail = (points, t, amp, waves = 0.8, phase = 0) => ripple(curve(points, 14), t, (k) => k ** 1.2 * amp, waves, phase);

/** Una tira de grueso r0 a r1 por un camino; color: uno, o una función (k de 0 a 1, punto). */
export const flow = (m, path, r0, r1, o) => path.slice(1).forEach((p, i) => {
  const n = path.length - 1;
  m.limb(path[i], p, lerp(r0, r1, i / n), lerp(r0, r1, (i + 1) / n), { ...o, color: typeof o.color === 'function' ? (l, at) => o.color((i + l[0]) / n, at) : o.color });
});

/** Un cuerpo de escamas por un camino: el lomo, la panza de placas y la cresta. radius(k): su grueso (k: 0 a 1). */
export function scaled(m, path, radius, { back, belly, spot, side = 1, crest = null, group = 'body', tick = 0 }) {
  const n = path.length - 1;
  for (let i = 0; i < n; i++) {
    const [a, b] = [path[i], path[i + 1]];
    const len = hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) || 1;
    const normal = [(-(b[1] - a[1]) / len) * side, ((b[0] - a[0]) / len) * side]; // hacia el lomo
    const k = i / n;
    m.limb(a, b, radius(k), radius((i + 1) / n), {
      mat: 'scale', group, blend: 1.2,
      color: (l, at) => {
        const v = [at[0] - lerp(a[0], b[0], l[0]), at[1] - lerp(a[1], b[1], l[0])];
        const up = (v[0] * normal[0] + v[1] * normal[1]) / radius(k);
        const s = (i + l[0]) * 1.1 + tick;
        if (up < -0.28) return sin(s * 3.4) > 0.55 ? '#8a5e22' : belly;
        const cell = sin(s * 5.2 + floor(up * 5) * 1.6) * cos(up * 13);
        return cell > 0.62 ? spot : cell < -0.55 ? back[1] : back[0];
      },
    });
    if (!crest || i % 2 || k < 0.02) continue;
    const r = radius(k);
    const mid = [0, 1, 2].map((c) => (a[c] + b[c]) / 2);
    const up = r + 4.2 * (1 - k * 0.5);
    m.limb([mid[0] + normal[0] * r * 0.7, mid[1] + normal[1] * r * 0.7, mid[2]], [mid[0] + normal[0] * up + (b[0] - a[0]) * 0.9, mid[1] + normal[1] * up + (b[1] - a[1]) * 0.9, mid[2]], 1.9 * (1 - k * 0.4), 0.2, { color: (l) => (l[0] > 0.6 ? crest[1] : crest[0]), mat: 'feather', group: `crest${i}`, blend: 0 });
  }
}
