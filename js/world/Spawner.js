// Pone los obstáculos de un nivel según su tabla (world/obstacles.js), dejando siempre tiempo para
// reaccionar, como en Chispas: la separación se piensa en segundos (por eso se multiplica por la
// velocidad), se aprieta con la densidad de la dificultad y a lo largo del nivel (progress, que
// pone Game), y nunca baja de minGapFloorSeconds.
//
// Entre un obstáculo y el siguiente, a la mitad, pone a veces un cóctel (recarga las bolas de
// fuego) y una vez por nivel la perla del dragón. En los niveles de vuelo, algunos van en el cielo.
// Antes del final del nivel deja de poner cosas.

import { CONFIG } from '../config.js';
import { Obstacle } from '../entities/Obstacle.js';
import { Pickup, COCKTAILS } from '../entities/Pickup.js';

const pickOne = (list) => list[Math.floor(Math.random() * list.length)];
const between = ([min, max]) => min + Math.random() * (max - min);

export class Spawner {
  constructor(level) {
    this.level = level;
    this.progress = 0; // 0 al empezar el nivel, 1 al terminarlo
    this.next = CONFIG.obstacles.firstDistance;
    this.count = 0;
    // En qué hueco va la perla: ni el primero ni de los últimos, para que siempre alcance a salir
    const { minGapSeconds, gapVarianceSeconds, firstDistance, clearDistance } = CONFIG.obstacles;
    const room = level.length - clearDistance - firstDistance;
    const gaps = Math.max(2, Math.floor(room / ((minGapSeconds + gapVarianceSeconds / 2) * level.speed)));
    this.pearlAt = 1 + Math.floor(Math.random() * Math.max(1, gaps - 3));
    this.nextCocktail = this.cocktailWait();
  }

  cocktailWait() {
    const [min, max] = CONFIG.cocktails.every;
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  /** Un paso: si toca, pone el siguiente obstáculo (y lo que vaya en el hueco que le sigue). */
  update(dt, speed, distance, obstacles, pickups) {
    if (distance > this.level.length - CONFIG.obstacles.clearDistance) return;
    this.next -= speed * dt;
    if (this.next > 0) return;
    const option = this.pick(speed);
    const obstacle = this.create(option, CONFIG.width + 40);
    obstacles.push(obstacle);
    // Lo que se acerca más rápido (las criaturas) necesita más distancia para dar el mismo tiempo
    const gap = this.gap(speed + obstacle.speedBonus);
    this.next = gap;
    this.fillGap(obstacle, gap, pickups);
    this.count += 1;
  }

  pick(speed) {
    const options = this.level.obstacles.filter((o) => speed >= (o.minSpeed ?? 0));
    const total = options.reduce((sum, o) => sum + o.weight, 0);
    let roll = Math.random() * total;
    for (const option of options) {
      roll -= option.weight;
      if (roll <= 0) return option;
    }
    return options[options.length - 1];
  }

  create({ kind, height }, x) {
    if (kind !== 'flyer') return new Obstacle(kind, x);
    const center = height === 'sky' ? between(CONFIG.obstacles.skyRange) : CONFIG.obstacles.flyerHeights[height];
    return new Obstacle(kind, x, { height, center });
  }

  /**
   * Distancia hasta el siguiente obstáculo:
   *   - diseño base: entre minGapSeconds y minGapSeconds + gapVarianceSeconds;
   *   - el promedio se divide entre la densidad (más obstáculos por segundo) y se multiplica por la
   *     subida del nivel (densityRamp: más aire al empezar, menos al terminar);
   *   - nunca baja de minGapFloorSeconds, para que siempre se pueda saltar y aterrizar.
   */
  gap(speed) {
    const { minGapSeconds, gapVarianceSeconds, minGapFloorSeconds, densityRamp } = CONFIG.obstacles;
    const ramp = densityRamp.start + (densityRamp.end - densityRamp.start) * this.progress;
    const base = minGapSeconds + gapVarianceSeconds / 2;
    const average = Math.max(minGapFloorSeconds + 0.05, (base * ramp) / (this.level.density ?? 1));
    const min = Math.max(minGapFloorSeconds, average * 0.62);
    return (min + Math.random() * 2 * (average - min)) * speed;
  }

  /** A la mitad del hueco que sigue a obstacle: la perla del nivel o, a veces, un cóctel. */
  fillGap(obstacle, gap, pickups) {
    const x = obstacle.x + obstacle.w + (gap - obstacle.w) / 2;
    const flight = this.level.flight;
    if (this.count === this.pearlAt) {
      const height = flight ? between(CONFIG.pearl.skyHeight) : CONFIG.pearl.height;
      pickups.push(new Pickup('pearl', x, CONFIG.groundY - height));
      return;
    }
    if (--this.nextCocktail > 0) return;
    this.nextCocktail = this.cocktailWait();
    const height = pickOne(flight ? CONFIG.cocktails.skyHeights : CONFIG.cocktails.heights);
    pickups.push(new Pickup('cocktail', x, CONFIG.groundY - height, pickOne(COCKTAILS)));
  }
}
