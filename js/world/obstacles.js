// Los tipos de obstáculo y qué sale en cada nivel. Los tamaños son los de la caja de choque (y de la
// figura provisional); el arte de cada animal puede dibujar cada tipo a su manera (ver
// graphics/assets.js), pero conviene que respete estos tamaños.
//
//   ground    va en el suelo: hay que saltarlo
//   burnable  una bola de fuego lo quema (los muros y las nubes de tormenta no)
//
// Hay dos filas de obstáculos, cada una con su propio ritmo (world/Spawner.js):
//   suelo  lo que se salta o se esquiva agachándose (solo en los niveles con suelo)
//   cielo  oleadas a distintas alturas, para quien vuela

import { CONFIG } from '../config.js';

export const KINDS = {
  // En el suelo
  post: { w: 12, h: 24, ground: true, burnable: true }, // un poste, una lámpara
  crate: { w: 24, h: 20, ground: true, burnable: true }, // una caja, un barril
  group: { w: 40, h: 22, ground: true, burnable: true }, // varios juntos
  wall: { w: 16, h: 40, ground: true, burnable: false }, // un muro de piedra
  // En el aire
  flyer: { w: 22, h: 14, ground: false, burnable: true }, // una criatura que vuela
  lantern: { w: 16, h: 28, ground: false, burnable: true }, // una linterna de papel
  cloud: { w: 56, h: 24, ground: false, burnable: false }, // una nube de tormenta
};

/**
 * La fila del suelo de un nivel: { kind, weight, height? }. height (solo flyer): 'low' | 'mid' |
 * 'high'. Empieza sencillo y en cada animal entra algo nuevo.
 */
export function groundLane(index) {
  const table = [
    { kind: 'post', weight: 5 },
    { kind: 'crate', weight: 3 },
  ];
  if (index >= 1) table.push({ kind: 'flyer', height: 'low', weight: 2 });
  if (index >= 2) table.push({ kind: 'group', weight: 2 }, { kind: 'flyer', height: 'mid', weight: 2 });
  if (index >= 3) table.push({ kind: 'flyer', height: 'high', weight: 1.5 });
  if (index >= 5) table.push({ kind: 'wall', weight: 1.5 });
  return { table, density: 1 };
}

/**
 * La fila del cielo: qué sale, cuántos obstáculos trae cada oleada (perWave: [mín, máx]) y qué tan
 * seguido (density: × el ritmo del suelo). Va entre from y to (alturas sobre el suelo), repartido en
 * franjas: cada obstáculo de una oleada va en una franja distinta y siempre queda una libre. Sin
 * suelo hay más franjas y más obstáculos por oleada.
 */
export function skyLane(index, { ground = true } = {}) {
  const { skyFloor, skyMargin } = CONFIG.obstacles;
  const top = CONFIG.groundY - CONFIG.ceilingY - skyMargin;
  const table = [{ kind: 'flyer', weight: 5 }, { kind: 'lantern', weight: 3 }];
  if (index >= 3 || !ground) table.push({ kind: 'cloud', weight: 2 });
  const busy = index >= 6 ? 1 : 0;
  return ground
    ? { table, from: skyFloor, to: top, bands: 4, perWave: [1, 1 + busy + (index >= 9 ? 1 : 0)], density: 0.9 }
    : { table, from: skyMargin + 10, to: top, bands: 5, perWave: [2, 3], density: 1.05 };
}
