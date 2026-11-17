// El trío (hongo blanco, agave y chile) se junta a lo largo de todo el viaje: al empezar una partida
// se eligen al azar tres mundos distintos, y en cada uno sale uno de los tres (nunca dos en el mismo
// nivel). Juntar los tres prepara el cóctel del signo (core/Game.js, completeTrio). Si uno se escapa:
// en difícil, en esa partida ya no se completa; en fácil (trioRetry) vuelve a salir más adelante
// (reschedule).

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

/**
 * Un ingrediente que se escapó (en fácil) vuelve a salir: en un mundo libre (sin otro ingrediente)
 * de from en adelante, de preferencia después de los que aún faltan por salir (así primero sale el
 * siguiente, y luego el que se escapó). Cambia plan; devuelve false si ya no hay dónde (se escapó
 * en el último mundo).
 */
export function reschedule(plan, variety, from, worlds) {
  for (const [level, kind] of Object.entries(plan)) if (kind === variety) delete plan[level];
  const pending = Object.keys(plan).map(Number).filter((level) => level >= from);
  const after = pending.length ? Math.max(...pending) + 1 : from;
  const free = (start) => [...Array(worlds).keys()].filter((level) => level >= start && !(level in plan));
  const options = free(after).length ? free(after) : free(from);
  if (!options.length) return false;
  plan[options[Math.floor(Math.random() * options.length)]] = variety;
  return true;
}
