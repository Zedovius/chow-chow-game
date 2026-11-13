// Pone los obstáculos y lo que se recoge en un nivel.
//
// Obstáculos: dos filas, cada una con su propio ritmo (world/obstacles.js):
//   suelo  uno a la vez, como en Chispas (solo en los niveles con suelo)
//   cielo  oleadas de uno o más, cada uno en una franja de altura distinta, y siempre una libre
// La separación se piensa en segundos de reacción (por eso se multiplica por la velocidad), se
// aprieta con la densidad de la dificultad y a lo largo del nivel (progress, que pone Game), y nunca
// baja de minGapFloorSeconds.
//
// Lo que se recoge, como los huesitos de Chispas: la perla (una por nivel) y los cócteles salen en
// momentos al azar, a una altura al azar, pero nunca obligan a chocar: solo aparecen si no acaba
// de salir un obstáculo (clearBefore) y después los obstáculos de las dos filas esperan
// (clearAfter). Si toca y no hay espacio, los obstáculos dejan de salir hasta que lo haya.
//
// Antes del final del nivel deja de poner cosas.

import { CONFIG } from '../config.js';
import { Obstacle } from '../entities/Obstacle.js';
import { Pickup, COCKTAILS } from '../entities/Pickup.js';

const pickOne = (list) => list[Math.floor(Math.random() * list.length)];
const between = (min, max) => min + Math.random() * (max - min);

/** Una opción al azar de una tabla { weight }. */
function pick(table) {
  const total = table.reduce((sum, o) => sum + o.weight, 0);
  let roll = Math.random() * total;
  for (const option of table) {
    roll -= option.weight;
    if (roll <= 0) return option;
  }
  return table[table.length - 1];
}

export class Spawner {
  constructor(level) {
    this.level = level;
    this.progress = 0; // 0 al empezar el nivel, 1 al terminarlo
    const { firstDistance } = CONFIG.obstacles;
    this.lanes = [];
    if (level.lanes.ground) this.lanes.push({ name: 'ground', ...level.lanes.ground, next: firstDistance });
    // El cielo empieza un poco después, para que no salgan las dos filas juntas
    this.lanes.push({ name: 'sky', ...level.lanes.sky, next: firstDistance * (level.ground ? 1.5 : 1) });

    // Cuándo sale lo que se recoge (en distancia del nivel): la perla en cualquier momento lejos
    // de las puntas, y un cóctel cada tantos segundos
    const { edge } = CONFIG.pickups;
    this.pearlAt = level.length * between(edge, 0.7);
    this.nextCocktail = this.cocktailWait(level.speed);
  }

  cocktailWait(speed) {
    const [min, max] = CONFIG.cocktails.everySeconds;
    return between(min, max) * speed;
  }

  /** Un paso: si toca, pone lo siguiente de cada fila y lo que se recoge. */
  update(dt, speed, distance, obstacles, pickups) {
    if (distance > this.level.length - CONFIG.obstacles.clearDistance) return;
    this.placePickups(dt, speed, distance, obstacles, pickups);
    for (const lane of this.lanes) {
      lane.next -= speed * dt;
      if (lane.next > 0) continue;
      const placed = lane.name === 'ground' ? [this.groundObstacle(lane)] : this.skyWave(lane);
      obstacles.push(...placed);
      // Lo que se acerca más rápido (las criaturas) necesita más distancia para dar el mismo tiempo
      const bonus = Math.max(...placed.map((o) => o.speedBonus));
      lane.next = this.gap(speed + bonus, lane.density);
    }
  }

  groundObstacle(lane) {
    const { kind, height } = pick(lane.table);
    const x = CONFIG.width + 40;
    if (kind !== 'flyer') return new Obstacle(kind, x);
    return new Obstacle(kind, x, { height, center: CONFIG.obstacles.flyerHeights[height] });
  }

  /** Una oleada del cielo: cada obstáculo en una franja distinta, y al menos una franja libre. */
  skyWave(lane) {
    const [min, max] = lane.perWave;
    const count = Math.min(lane.bands - 1, min + Math.floor(Math.random() * (max - min + 1)));
    const size = (lane.to - lane.from) / lane.bands;
    const bands = Array.from({ length: lane.bands }, (_, i) => i).sort(() => Math.random() - 0.5).slice(0, count);
    return bands.map((band) => {
      const { kind } = pick(lane.table);
      const half = Obstacle.size(kind).h / 2;
      const center = between(lane.from + band * size + half, lane.from + (band + 1) * size - half);
      // Las de una misma oleada salen un poco escalonadas, para que no parezcan una pared
      return new Obstacle(kind, CONFIG.width + 40 + Math.random() * 60, { height: 'sky', center });
    });
  }

  /**
   * Distancia hasta lo siguiente de una fila:
   *   - diseño base: entre minGapSeconds y minGapSeconds + gapVarianceSeconds;
   *   - el promedio se divide entre la densidad (la de la dificultad y la de la fila) y se
   *     multiplica por la subida del nivel (densityRamp: más aire al empezar, menos al terminar);
   *   - nunca baja de minGapFloorSeconds, para que siempre se pueda saltar y aterrizar.
   */
  gap(speed, laneDensity = 1) {
    const { minGapSeconds, gapVarianceSeconds, minGapFloorSeconds, densityRamp } = CONFIG.obstacles;
    const ramp = densityRamp.start + (densityRamp.end - densityRamp.start) * this.progress;
    const base = minGapSeconds + gapVarianceSeconds / 2;
    const density = (this.level.density ?? 1) * laneDensity;
    const average = Math.max(minGapFloorSeconds + 0.05, (base * ramp) / density);
    const min = Math.max(minGapFloorSeconds, average * 0.62);
    return (min + Math.random() * 2 * (average - min)) * speed;
  }

  /** La perla y los cócteles, cuando toca y hay espacio (ver arriba). */
  placePickups(dt, speed, distance, obstacles, pickups) {
    const pearl = this.pearlAt !== null && distance >= this.pearlAt;
    this.nextCocktail -= speed * dt;
    const cocktail = this.nextCocktail <= 0;
    if (!pearl && !cocktail) return;
    const { clearBefore, clearAfter, bob } = CONFIG.pickups;
    if (obstacles.some((o) => o.x + o.w > CONFIG.width - clearBefore)) {
      // Aún no hay espacio: los obstáculos dejan de salir hasta que lo haya (así siempre sale)
      for (const lane of this.lanes) lane.next = Math.max(lane.next, speed * dt * 2);
      return;
    }
    // A una altura al azar, de casi el suelo (o las nubes) hasta casi el techo
    const r = Math.max(CONFIG.pearl.radius, CONFIG.cocktails.radius);
    const low = r + bob + (this.level.ground ? 2 : CONFIG.obstacles.skyMargin);
    const high = CONFIG.groundY - CONFIG.ceilingY - r - bob - CONFIG.obstacles.skyMargin;
    const y = CONFIG.groundY - between(low, high);
    const x = CONFIG.width + 40;
    if (pearl) {
      pickups.push(new Pickup('pearl', x, y));
      this.pearlAt = null;
    } else {
      pickups.push(new Pickup('cocktail', x, y, pickOne(COCKTAILS)));
      this.nextCocktail = this.cocktailWait(speed);
    }
    // Que los obstáculos de las dos filas esperen: así nunca hay que chocar para tomarlo
    for (const lane of this.lanes) lane.next = Math.max(lane.next, clearAfter * speed);
  }
}
