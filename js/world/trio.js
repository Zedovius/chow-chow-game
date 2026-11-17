// El trío (hongo blanco, agave y chile) se junta a lo largo de todo el viaje: al empezar una partida
// se eligen al azar tres mundos distintos, y en cada uno sale uno de los tres (nunca dos en el mismo
// nivel). Juntar los tres prepara el cóctel del signo (core/Game.js, completeTrio). Si uno se escapa,
// en esa partida ya no se completa.

import { INGREDIENTS } from '../entities/Pickup.js';

const shuffle = (list) => {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
};

/**
 * Qué ingrediente sale en qué mundo, para un viaje de worlds mundos (sin contar al rival):
 * { índice del nivel: 'hongo' | 'agave' | 'chile' }, tres niveles distintos al azar.
 */
export function planTrio(worlds) {
  const levels = shuffle([...Array(worlds).keys()]).slice(0, INGREDIENTS.length);
  const kinds = shuffle([...INGREDIENTS]);
  return Object.fromEntries(levels.map((level, i) => [level, kinds[i]]));
}
