// Los animales de los mundos: vivos y en el suelo (nunca colgados ni tirados). Son los mismos modelos con los
// que se juega (especies.mjs, alados.mjs), en reposo y sin pañuelo. Cada función recibe t (0 a 1) y da un
// Model de pie en (0, 0).

import { roosterFrames, snakeCoil } from './alados.mjs';
import { QUADRUPEDS } from './especies.mjs';
import { TAU } from './modelo3d.mjs';
import { islet, make } from './piezas.mjs';
import { quadrupedPoses } from './poses.mjs';

const ROCK = ['#7a3a44', '#a85a5a'];
const poses = new Map();
const idle = (id) => {
  if (!poses.has(id)) poses.set(id, quadrupedPoses(id, QUADRUPEDS[id].def).idle);
  return poses.get(id);
};

/** Copia las piezas de un modelo en otro, corridas. */
export function put(m, model, [dx, dy = 0, dz = 0], tag) {
  for (const p of model.prims) {
    if (/^(knot|ribbon|coin)/.test(String(p.group))) continue; // sin pañuelo
    const copy = { ...p, group: `${tag}${p.group}` };
    for (const key of ['c', 'a', 'b']) if (Array.isArray(p[key])) copy[key] = [p[key][0] + dx, p[key][1] + dy, (p[key][2] ?? 0) + dz];
    if (typeof p.color === 'function') copy.color = (l, at) => p.color(l, [at[0] - dx, at[1] - dy, at[2] - dz]);
    m.prims.push(copy);
  }
  for (const d of model.dots) m.dots.push({ ...d, x: d.x + dx, y: d.y + dy, z: d.z + dz });
  return m;
}

/** Varios de la misma especie; spots: dónde va cada uno. Respiran, cada quien a su tiempo. */
const herd = (id, spots) => (t) => {
  const m = make();
  const list = idle(id);
  spots.forEach((at, i) => put(m, QUADRUPEDS[id].build(list[Math.floor(t * list.length + i * 2) % list.length]), at, `${id}${i}`));
  return m;
};

export const FAUNA = {
  rabbits: herd('rabbit', [[-9, 0, -2], [8, 0, 2]]),
  oxen: herd('ox', [[0, 0, 0]]),
  tigers: herd('tiger', [[0, 0, 0]]),
  horses: herd('horse', [[-13, 0, -3], [13, 0, 2]]),
  goats: herd('goat', [[-11, 0, -3], [10, 0, 2]]),
  monkeys: herd('monkey', [[-8, 0, -2], [9, 0, 2]]),
  pigs: herd('pig', [[-9, 0, -2], [9, 0, 2]]),
  dogs: herd('dog', [[0, 0, 0]]),
  rats: herd('rat', [[-9, 0, -2], [7, 0, 2]]),
  snakes(t) { // enroscada en una piedra del lago
    const m = make();
    for (const [x, y, r] of [[-4, 1.4, 5], [4, 1.2, 4.6], [0, 2, 5]]) m.ball([x, y, 0], [r, 2.4, r * 0.8], { color: (l) => (l[1] > 1 ? '#8fa08a' : '#5f7066'), group: 'rock', blend: 1.4 });
    return put(m, snakeCoil({ t }), [0, 3.4, 0], 's');
  },
  hens(t) { // gallos en su islote
    const m = make();
    islet(m, 11, ...ROCK);
    const list = roosterFrames().idle;
    put(m, list[Math.floor(t * list.length) % list.length], [0, 0.6, 0], 'a');
    return m;
  },
  carps(t) { // carpas que nadan entre las nubes
    const m = make();
    for (const [x, z, k, shift] of [[-9, -3, 0.9, 0], [8, 3, 1, 0.4]]) {
      const sway = Math.sin((t + shift) * TAU);
      const body = (l) => (l[1] < -0.6 ? '#fff0d8' : Math.sin(l[0] * 1.9) * Math.sin(l[2] * 2 + 1) > 0.25 ? '#fff0d8' : '#e8552c');
      m.ball([x, 2.4, z], [6 * k, 2.5 * k, 2.3 * k], { color: body, group: `f${x}`, blend: 1.4 });
      m.ball([x + 4.6 * k, 2.6, z], [2.6 * k, 2.1 * k, 2 * k], { color: body, group: `f${x}`, blend: 1 });
      m.limb([x - 5 * k, 2.4, z], [x - 9 * k, 3.4, z + sway * 2], 1.4, 0.9, { color: '#ffb04a', group: `q${x}` });
      m.chain([[x - 1, 4.4, z], [x + 0.6, 6.4, z], [x + 2, 4.6, z]], 0.8, 0.5, { color: '#ffb04a', group: `d${x}` });
      m.dot([x + 5.6 * k, 3.4, z + 2.4], '#1b1226');
      for (let i = 0; i < 6; i++) m.ball([x - 7 + i * 2.8, 0.3 + (i % 2) * 0.5, z + (i % 2) * 2 - 0.6], [2, 1.1, 1.8], { color: i % 2 ? '#e8fbf4' : '#a9dccf', group: `w${x}`, over: 2, blend: 0.8 });
    }
    return m;
  },
};
