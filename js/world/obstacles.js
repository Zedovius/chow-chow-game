// Los tipos de obstáculo y qué sale en cada nivel. Los tamaños son los de la caja de choque (y de la
// figura provisional); el arte de cada animal puede dibujar cada tipo a su manera (ver
// graphics/assets.js), pero conviene que respete estos tamaños.
//
//   ground    va en el suelo: hay que saltarlo
//   burnable  una bola de fuego lo quema (los muros y las nubes de tormenta no)
//
// Hay dos filas de obstáculos, cada una con su propio ritmo (world/Spawner.js):
//   suelo  lo que se salta o se esquiva agachándose (solo en los niveles con suelo)
//   cielo  oleadas a distintas alturas, para quien vuela, y a veces formaciones

import { CONFIG } from '../config.js';

export const KINDS = {
  // En el suelo
  post: { w: 12, h: 24, ground: true, burnable: true }, // un poste, una lámpara
  crate: { w: 24, h: 20, ground: true, burnable: true }, // una caja, un barril
  group: { w: 40, h: 22, ground: true, burnable: true }, // varios juntos
  wall: { w: 16, h: 40, ground: true, burnable: false }, // un muro de piedra
  barrel: { w: 16, h: 16, ground: true, burnable: true }, // un barril que rueda (motion 'roll')
  hopper: { w: 14, h: 12, ground: true, burnable: true }, // un bicho que brinca (motion 'hop')
  // En el aire
  flyer: { w: 22, h: 14, ground: false, burnable: true }, // una criatura que vuela
  lantern: { w: 16, h: 28, ground: false, burnable: true }, // una linterna de papel
  cloud: { w: 56, h: 24, ground: false, burnable: false }, // una nube de tormenta (suelta rayos)
  // Los disparos del jefe del nivel 13 (una bola de fuego lo apaga)
  shot: { w: 14, h: 10, ground: false, burnable: true },
};

/**
 * Los tramos de cada nivel, para que tenga subidas y bajadas: hasta qué parte del nivel (until)
 * dura cada uno y cuánto se aprieta cada fila (× su ritmo). Termina con una racha más intensa
 * (rush) antes del cambio de animal; Game la anuncia.
 */
export const PACING = [
  { name: 'calm', until: 0.1, ground: 0.9, sky: 0.85 },
  { name: 'ground', until: 0.36, ground: 1.25, sky: 0.95 },
  { name: 'sky', until: 0.58, ground: 0.95, sky: 1.35 },
  { name: 'mixed', until: 0.7, ground: 1, sky: 1 },
  { name: 'rush', until: 1, ground: 1.3, sky: 1.4 },
];

/** El tramo de un momento del nivel (progress de 0 a 1). */
export const sectionAt = (progress) => PACING.find((s) => progress < s.until) ?? PACING[PACING.length - 1];

/**
 * La fila del suelo de un nivel: { kind, weight, height?, motion? }. height (solo flyer): 'low' |
 * 'mid' | 'high'. motion: 'roll' (rueda más rápido) o 'hop' (brinca en su lugar). Desde el primer
 * nivel hay algo que se mueve, y en cada animal entra algo nuevo.
 */
export function groundLane(index, rules) {
  const table = [
    { kind: 'post', weight: 4 },
    { kind: 'crate', weight: 3 },
    { kind: 'barrel', motion: 'roll', weight: 2 },
  ];
  if (index >= 1) table.push({ kind: 'flyer', height: 'low', weight: 2 }, { kind: 'hopper', motion: 'hop', weight: 2 });
  if (index >= 2) table.push({ kind: 'group', weight: 2 }, { kind: 'flyer', height: 'mid', weight: 2 });
  if (index >= 3) table.push({ kind: 'flyer', height: 'high', weight: 1.5 });
  if (index >= 5) table.push({ kind: 'wall', weight: 1.5 * rules.unburnable });
  return { table, density: 1.15 };
}

/**
 * La fila del cielo: qué sale (con su movimiento, motion: 'bob' | 'wave' | 'dive' | 'rise'),
 * cuántos obstáculos trae cada oleada (perWave: [mín, máx]), qué tan seguido (density: × el ritmo
 * del suelo) y con qué probabilidad sale una formación en lugar de una oleada. Va entre from y to
 * (alturas del centro sobre el suelo), repartido en franjas: cada obstáculo de una oleada va en una
 * franja distinta y siempre queda una libre. Sin suelo hay más franjas.
 */
export function skyLane(index, { ground = true, rules }) {
  const { skyFloor, skyMargin } = CONFIG.obstacles;
  const top = CONFIG.groundY - CONFIG.ceilingY - skyMargin;
  const table = [{ kind: 'flyer', motion: 'bob', weight: 5 }, { kind: 'lantern', motion: index >= 2 ? 'rise' : 'bob', weight: 3 }];
  if (index >= 1 || !ground) table.push({ kind: 'flyer', motion: 'wave', weight: 2 });
  if (index >= 3 || !ground) table.push({ kind: 'cloud', motion: 'bob', weight: 2 * rules.unburnable });
  if (index >= 4) table.push({ kind: 'flyer', motion: 'dive', weight: 2 });
  const busy = (index >= 6 ? 1 : 0) + (index >= 9 ? 1 : 0);
  const bands = ground ? 4 : 5;
  const base = ground ? [1, 1 + busy] : [2, 3];
  const perWave = base.map((n) => Math.min(bands - 1, n + rules.sky.extraPerWave));
  return {
    table,
    from: ground ? skyFloor : skyMargin + 10,
    to: top,
    bands,
    perWave,
    density: (ground ? 0.9 : 1.05) * rules.sky.density,
    formations: index >= 2 ? rules.formations : 0,
  };
}

/**
 * Las formaciones del cielo: figuras que hay que leer, en lugar de una oleada al azar. Cada una da
 * la lista de obstáculos como { band, kind, motion, dx } (dx: cuánto más atrás sale). Siempre
 * dejan por dónde pasar.
 *   stairs  una escalera de criaturas, subiendo o bajando
 *   wall    una pared de linternas con un solo hueco
 *   zigzag  arriba, abajo, arriba, abajo: hay que ir y venir
 *   storm   dos nubes de tormenta, en franjas separadas
 */
export const FORMATIONS = {
  stairs(bands) {
    const up = Math.random() < 0.5;
    const count = Math.min(bands, 4);
    return Array.from({ length: count }, (_, i) => ({ band: up ? i : bands - 1 - i, kind: 'flyer', motion: 'bob', dx: i * 70 }));
  },
  wall(bands) {
    const free = Math.floor(Math.random() * bands);
    return Array.from({ length: bands }, (_, band) => band)
      .filter((band) => band !== free)
      .map((band) => ({ band, kind: 'lantern', motion: 'bob', dx: 0 }));
  },
  zigzag(bands) {
    const low = Math.random() < 0.5 ? 0 : 1;
    const high = bands - 1 - (Math.random() < 0.5 ? 0 : 1);
    const start = Math.random() < 0.5;
    return Array.from({ length: 4 }, (_, i) => ({ band: (i % 2 === 0) === start ? low : high, kind: 'flyer', motion: 'bob', dx: i * 120 }));
  },
  storm(bands) {
    const first = Math.floor(Math.random() * (bands - 2));
    return [
      { band: first, kind: 'cloud', motion: 'bob', dx: 0 },
      { band: first + 2, kind: 'cloud', motion: 'bob', dx: 90 },
    ];
  },
};
