// Los tipos de obstáculo y qué sale en cada nivel. Los tamaños son los de la caja de choque (y de la
// figura provisional); el arte de cada animal puede dibujar cada tipo a su manera (ver
// graphics/assets.js), pero conviene que respete estos tamaños.
//
//   ground    va en el suelo: hay que saltarlo
//   burnable  una bola de fuego lo quema (los muros no: esos siempre hay que saltarlos)

export const KINDS = {
  post: { w: 12, h: 24, ground: true, burnable: true }, // un poste, una lámpara
  crate: { w: 24, h: 20, ground: true, burnable: true }, // una caja, un barril
  group: { w: 40, h: 22, ground: true, burnable: true }, // varios juntos
  wall: { w: 16, h: 40, ground: true, burnable: false }, // un muro de piedra
  flyer: { w: 22, h: 14, ground: false, burnable: true }, // una criatura que vuela
};

/**
 * La tabla de obstáculos de un nivel: { kind, weight, height?, minSpeed? }. height (solo flyer):
 * 'low' | 'mid' | 'high' | 'sky'. Empieza sencillo y en cada animal entra algo nuevo; en los
 * niveles de vuelo además hay criaturas en el cielo.
 */
export function obstaclesFor(index, { flight = false } = {}) {
  const table = [
    { kind: 'post', weight: 5 },
    { kind: 'crate', weight: 3 },
  ];
  if (index >= 1) table.push({ kind: 'flyer', height: 'low', weight: 2 });
  if (index >= 2) table.push({ kind: 'group', weight: 2 }, { kind: 'flyer', height: 'mid', weight: 2 });
  if (index >= 3) table.push({ kind: 'flyer', height: 'high', weight: 1.5 });
  if (index >= 5) table.push({ kind: 'wall', weight: 1.5 });
  if (flight) table.push({ kind: 'flyer', height: 'sky', weight: 5 }, { kind: 'wall', weight: 1 });
  return table;
}
