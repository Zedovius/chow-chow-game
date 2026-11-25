// Pone los obstáculos y lo que se recoge en un nivel.
//
// Obstáculos: dos filas, cada una con su propio ritmo (world/obstacles.js):
//   suelo  uno a la vez, como en Chispas (solo en los niveles con suelo)
//   cielo  oleadas de uno o más, cada uno en una franja de altura distinta y siempre con una libre;
//          las franjas altas reciben más y van más rápido (más arriba, más riesgo). A veces, en
//          lugar de una oleada, una formación (escalera, pared, zigzag, tormenta).
// La separación se piensa en segundos de reacción (por eso se multiplica por la velocidad), se
// aprieta con la densidad de la dificultad, con el tramo del nivel (PACING: calma, suelo, cielo,
// mezcla y la racha final) y a lo largo del nivel (progress, que pone Game), y nunca baja de
// minGapFloorSeconds.
//
// Lo que se recoge, como los huesitos de Chispas: los cócteles y la comida salen en momentos al azar, a una altura al azar (más seguido arriba), y la estrella del vuelo una vez, a ras del suelo; nunca obligan a
// chocar: solo aparecen si no acaba de salir un obstáculo cerca de su altura (clearBefore) y
// después espera la fila de su altura (clearAfter); la otra sigue igual. Si toca y no hay espacio,
// esa fila deja de poner obstáculos hasta que lo haya. Nunca salen dos juntos (apart).
//
// Antes del final del nivel deja de poner cosas.

import { CONFIG } from '../config.js';
import { Obstacle } from '../entities/Obstacle.js';
import { Pickup, COCKTAILS, FOODS } from '../entities/Pickup.js';
import { FORMATIONS, sectionAt } from './obstacles.js';

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

/** count franjas distintas al azar, de preferencia las altas (más arriba, más riesgo). */
function pickBands(bands, count) {
  const left = Array.from({ length: bands }, (_, band) => ({ band, weight: 1 + CONFIG.obstacles.altitudeWeight * band }));
  const chosen = [];
  while (chosen.length < count && left.length) {
    const option = pick(left);
    chosen.push(option.band);
    left.splice(left.indexOf(option), 1);
  }
  return chosen;
}

export class Spawner {
  /**
   * carry: lo que le faltaba al nivel anterior para el siguiente cóctel y la siguiente comida (ver
   * carry()); así la cuenta sigue de un nivel al otro y lo que sale cada más de un nivel sí sale.
   */
  constructor(level, carry = null, { star = false, ingredient = null } = {}) {
    this.level = level;
    this.progress = 0; // 0 al empezar el nivel, 1 al terminarlo
    const { firstDistance } = CONFIG.obstacles;
    this.lanes = [];
    if (level.lanes.ground) this.lanes.push({ name: 'ground', ...level.lanes.ground, next: firstDistance });
    // El cielo empieza un poco después, para que no salgan las dos filas juntas (el nivel 12 no
    // tiene filas: ahí los obstáculos son los disparos del jefe)
    if (level.lanes.sky) this.lanes.push({ name: 'sky', ...level.lanes.sky, next: firstDistance * (level.ground ? 1.5 : 1) });

    // Cuándo sale lo que se recoge: los cócteles y la comida, cada tantos segundos (lo que falta)
    // (null: en este nivel no sale; por ejemplo, los cócteles contra el rival en fácil)
    this.nextCocktail = level.pickups.cocktail ? (carry?.cocktail ?? between(...level.pickups.cocktail)) : Infinity;
    this.nextFood = level.pickups.food ? (carry?.food ?? between(...level.pickups.food)) : Infinity;
    // La estrella del vuelo (si quien juega aún no tiene el poder): una vez, al principio del nivel
    this.starAt = star ? level.length * between(...CONFIG.star.window) : null;
    // Un ingrediente del trío, si en este nivel toca uno (world/trio.js): en un momento al azar
    this.ingredients = ingredient ? [{ variety: ingredient, at: level.length * between(...CONFIG.trio.window) }] : [];
    this.sincePickup = CONFIG.pickups.apart; // segundos desde lo último que salió
  }

  /** Lo que falta para el siguiente cóctel y la siguiente comida, para el nivel que sigue. */
  carry() {
    return { cocktail: this.nextCocktail, food: this.nextFood };
  }

  /** El tramo del nivel en que va (ver PACING en world/obstacles.js). */
  get section() {
    return sectionAt(this.progress);
  }

  /** Un paso: si toca, pone lo siguiente de cada fila y lo que se recoge. */
  update(dt, speed, distance, obstacles, pickups) {
    if (distance > this.level.length - CONFIG.obstacles.clearDistance) {
      // Al final del nivel no sale nada, pero la cuenta sigue (para el siguiente)
      this.nextCocktail -= dt;
      this.nextFood -= dt;
      return;
    }
    this.placePickups(dt, speed, distance, obstacles, pickups);
    for (const lane of this.lanes) {
      lane.next -= speed * dt;
      if (lane.next > 0) continue;
      const placed = lane.name === 'ground' ? [this.groundObstacle(lane)] : this.skyObstacles(lane);
      obstacles.push(...placed);
      // Lo que se acerca más rápido necesita más distancia para dar el mismo tiempo; una formación
      // cuenta desde su último obstáculo
      const bonus = Math.max(...placed.map((o) => o.speedBonus));
      const length = Math.max(...placed.map((o) => o.x)) - (CONFIG.width + 40);
      lane.next = length + this.gap(speed + bonus, lane.density * this.section[lane.name]);
    }
  }

  groundObstacle(lane) {
    const { kind, height, motion } = pick(lane.table);
    const x = CONFIG.width + 40;
    if (kind !== 'flyer') return new Obstacle(kind, x, { motion });
    return new Obstacle(kind, x, { height, center: CONFIG.obstacles.flyerHeights[height] });
  }

  /** Lo siguiente del cielo: una formación (a veces) o una oleada. */
  skyObstacles(lane) {
    if (Math.random() < lane.formations) {
      const names = Object.keys(FORMATIONS).filter((name) => name !== 'storm' || lane.table.some((o) => o.kind === 'cloud'));
      return FORMATIONS[pickOne(names)](lane.bands).map((item) => this.skyObstacle(lane, item));
    }
    // Una oleada: cada obstáculo en una franja distinta, y al menos una franja libre
    const [min, max] = lane.perWave;
    const count = Math.min(lane.bands - 1, min + Math.floor(Math.random() * (max - min + 1)));
    return pickBands(lane.bands, count).map((band) => {
      const { kind, motion } = pick(lane.table);
      // Las de una misma oleada salen un poco escalonadas, para que no parezcan una pared
      return this.skyObstacle(lane, { band, kind, motion, dx: Math.random() * 60 });
    });
  }

  /**
   * Un obstáculo del cielo en su franja: a una altura al azar dentro de ella. Una nube de tormenta
   * va siempre lo bastante alta para que su rayo quepa entero debajo (nunca sale una nube sin rayo);
   * si en esa franja no cabe, en su lugar sale una criatura.
   */
  skyObstacle(lane, { band, kind, motion, dx }) {
    const limits = { low: lane.from, high: lane.to };
    const size = (lane.to - lane.from) / lane.bands;
    const half = Obstacle.size(kind).h / 2;
    let lowest = lane.from + band * size + half;
    const highest = lane.from + (band + 1) * size - half;
    if (kind === 'cloud') {
      lowest = Math.max(lowest, Obstacle.lowestCloud(limits));
      if (lowest > highest) return this.skyObstacle(lane, { band, kind: 'flyer', motion: 'bob', dx });
    }
    const center = between(lowest, highest);
    const obstacle = new Obstacle(kind, CONFIG.width + 40 + dx, { height: 'sky', center, motion, limits, period: this.level.lightning });
    obstacle.band = band;
    obstacle.speedBonus += band * CONFIG.obstacles.altitudeSpeed; // más arriba, más rápido
    return obstacle;
  }

  /**
   * Distancia hasta lo siguiente de una fila:
   *   - diseño base: entre minGapSeconds y minGapSeconds + gapVarianceSeconds;
   *   - el promedio se divide entre la densidad (la de la dificultad, la de la fila y la del tramo)
   *     y se multiplica por la subida del nivel (densityRamp: más aire al empezar, menos al final);
   *   - nunca baja de minGapFloorSeconds, para que siempre se pueda reaccionar.
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

  /**
   * La estrella, los cócteles y la comida, cuando toca y hay espacio (ver arriba). Nunca salen dos
   * juntos: entre uno y el siguiente pasan al menos CONFIG.pickups.apart segundos (lo que toque
   * mientras, espera su turno).
   */
  placePickups(dt, speed, distance, obstacles, pickups) {
    this.nextCocktail -= dt;
    this.nextFood -= dt;
    this.sincePickup += dt;
    const star = this.starAt !== null && distance >= this.starAt;
    const ingredient = this.ingredients.length > 0 && distance >= this.ingredients[0].at;
    // Si toca un ingrediente pronto (antes de que pase apart), el cóctel y la comida esperan: así el
    // trío no se va retrasando hasta quedarse fuera del nivel
    const reserved = this.ingredients.length > 0 && distance + CONFIG.pickups.apart * speed >= this.ingredients[0].at;
    const food = this.nextFood <= 0 && !reserved;
    const cocktail = this.nextCocktail <= 0 && !reserved;
    // La estrella y el trío esperan menos (trio.apart) desde lo último que salió: en los mundos rápidos,
    // pickups.apart es casi un tercio del nivel y no cabrían los cuatro
    const apart = star || ingredient ? CONFIG.trio.apart : CONFIG.pickups.apart;
    if ((!star && !ingredient && !cocktail && !food) || this.sincePickup < apart) return;
    const { clearBefore, clearAfter, bob } = CONFIG.pickups;
    const { skyFloor } = CONFIG.obstacles;

    // Qué sale y a qué altura (sobre el suelo)
    const r = Math.max(CONFIG.cocktails.radius, CONFIG.food.radius);
    const low = r + bob + (this.level.ground ? 2 : CONFIG.obstacles.skyMargin);
    const high = CONFIG.groundY - CONFIG.ceilingY - r - bob - CONFIG.obstacles.skyMargin;
    let type = 'cocktail';
    let height = low + (high - low) * Math.random() ** CONFIG.pickupSkew; // más seguido arriba
    if (star) {
      type = 'star';
      height = CONFIG.star.height; // a ras del suelo: se toma corriendo
    } else if (ingredient) {
      // Con suelo, a una altura que se alcanza saltando: el trío nunca pide la estrella
      type = 'ingredient';
      if (this.level.ground) height = between(...CONFIG.cocktails.low);
    } else if (food) {
      type = 'food';
    } else if (this.level.ground && !this.level.boss) {
      // Los cócteles: con suelo, casi todos arriba (para tomarlos hay que volar)
      const { lowShare, low: [lowest, highest] } = CONFIG.cocktails;
      height = Math.random() < lowShare ? between(lowest, highest) : between(skyFloor, high);
    }

    // La fila (o las dos) de su altura: la del suelo llega hasta un poco arriba de un salto; la del
    // cielo, desde un poco abajo de skyFloor
    const lanes = this.lanes.filter((lane) => (lane.name === 'ground' ? height < skyFloor + 20 : height > skyFloor - 40 || !this.level.ground));
    const inLane = (o) => lanes.some((lane) => (lane.name === 'sky') === (o.height === 'sky'));
    if (obstacles.some((o) => inLane(o) && o.x + o.w > CONFIG.width - clearBefore)) {
      // Aún no hay espacio a su altura: esa fila deja de poner obstáculos hasta que lo haya
      for (const lane of lanes) lane.next = Math.max(lane.next, speed * dt * 2);
      return;
    }

    const x = CONFIG.width + 40;
    const y = CONFIG.groundY - height;
    if (type === 'star') {
      pickups.push(new Pickup('star', x, y));
      this.starAt = null;
    } else if (type === 'ingredient') {
      pickups.push(new Pickup('ingredient', x, y, this.ingredients.shift().variety));
    } else if (type === 'food') {
      pickups.push(new Pickup('food', x, y, pickOne(FOODS)));
      this.nextFood = between(...this.level.pickups.food);
    } else {
      pickups.push(new Pickup('cocktail', x, y, pickOne(COCKTAILS)));
      this.nextCocktail = between(...this.level.pickups.cocktail);
    }
    this.sincePickup = 0;
    // Que espere la fila de su altura: así nunca hay que chocar para tomarlo (la otra sigue igual)
    for (const lane of lanes) lane.next = Math.max(lane.next, clearAfter * speed);
  }
}
