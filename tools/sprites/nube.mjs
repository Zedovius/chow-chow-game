// La nubecita en la que vuelan los animales sin alas: bolas de vapor con sus rizos, como las nubes de los
// dibujos chinos, y las volutas de su estela. (0, 0) es donde se apoya el animal.

import { Model, add, lerp, TAU } from './modelo3d.mjs';

const VAPOR = '#e9f0ff';
const SHADE = '#b7c6ee';
const CURL = '#8fa4dc';

/** t: de 0 a 1, cómo se mece; press: de 0 a 1, aplastada por un aleteo. */
export function cloud({ t = 0, press = 0 }) {
  const m = new Model();
  const breathe = (i) => Math.sin((t + i * 0.19) * TAU) * 0.4;
  const flat = 1 - 0.22 * press;
  const wide = 1 + 0.1 * press;
  const coat = (cut) => (l) => (l[1] < cut ? SHADE : VAPOR);
  // Un nido de bolas de vapor: las de atrás asoman por arriba, las de los lados son más altas y el
  // animal queda en medio; abajo, más chicas y azuladas
  const puffs = [
    // atrás
    [-9.6, -0.6, -3.4, 3.6], [-4.6, 0.2, -4, 3.7], [1, -0.2, -4.2, 3.9], [6.4, 0, -3.6, 3.7], [10.6, -1, -2.8, 3],
    // en medio
    [-12, -2.4, 0, 3.6], [-7.4, -3.2, 0.4, 4.2], [-1.6, -3.4, 0, 4.6], [4.4, -3.4, 0.4, 4.5], [9.6, -2.8, 0, 4.1], [13.2, -2.6, 0.2, 2.9],
    // al frente
    [-9.4, -4.4, 3.4, 3], [-4, -4.6, 3.8, 3.6], [2.2, -4.8, 4, 3.8], [7.8, -4.4, 3.4, 3.3], [11.8, -4, 2.6, 2.4],
  ];
  puffs.forEach(([x, y, z, r], i) => {
    const d = breathe(i);
    m.ball([x * wide, (y + d * 0.5) * flat - press * 0.5, z], [(r + d * 0.35) * wide, (r * 0.92 + d * 0.3) * flat, r * 0.9], { color: coat(z > 2 ? -r * 0.3 : -r * 0.16), group: `vapor${z < -2 ? 'b' : z > 2 ? 'f' : 'm'}`, blend: 0.7, over: z > 2 ? 0.1 : 0 });
  });
  // Los rizos: espirales en la cara de enfrente, como en las nubes de los dibujos chinos
  const curl = (cx, cy, r, turn, dir) => {
    const points = [];
    for (let i = 0; i <= 14; i++) {
      const k = i / 14;
      const angle = turn + dir * k * TAU * 1.05;
      points.push([cx * wide + Math.cos(angle) * r * (1 - k * 0.8), (cy + Math.sin(angle) * r * 0.9 * (1 - k * 0.8)) * flat - press * 0.5, 8]);
    }
    m.chain(points, 0.52, 0.5, { color: CURL, group: `curl${cx}`, over: 3, blend: 0, flat: 2 });
  };
  curl(7.4, -4, 2.6, Math.PI * 1.05, -1);
  curl(-4.4, -4.2, 2.8, -0.05, 1);
  // La cola: dos puntas que se afilan hacia atrás
  m.limb([-12 * wide, -3, 0], [-19, -2.2 + Math.sin(t * TAU) * 0.8, 0], 2.8, 0.9, { color: coat(-9), group: 'vaporm', blend: 1 });
  m.limb([-10 * wide, -5.4, 1.4], [-15.6, -6 - Math.sin(t * TAU) * 0.5, 1.4], 1.9, 0.7, { color: SHADE, group: 'vaporm', blend: 0.8 });
  return m;
}

/** Una voluta de la estela, de grande (0) a deshecha (1). */
export function wisp(k) {
  const m = new Model();
  const r = lerp(3.5, 0.8, k);
  m.ball([0, 0, 0], [r * 1.1, r * 0.9, r * 0.8], { color: (l) => (l[1] < -r * 0.25 ? SHADE : VAPOR), group: 'w' });
  if (k < 0.75) m.ball([-r * 0.95, -r * 0.35, 0], [r * 0.7, r * 0.6, r * 0.6], { color: SHADE, group: 'w', blend: 0.6 });
  if (k < 0.5) m.ball([r * 0.6, r * 0.4, 0], [r * 0.6, r * 0.55, r * 0.5], { color: VAPOR, group: 'w', blend: 0.6 });
  return m;
}

export { add };
