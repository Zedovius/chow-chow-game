// Puntos por arriesgarse, sin ningún aviso en pantalla: separan los puntajes de quienes juegan bien.
// Salen de las mismas cajas de colisión que los choques. Cada uno cuenta una vez por obstáculo, y
// solo cuando el obstáculo ya quedó atrás sin golpear al dragón; lo que se cruza mientras parpadea
// tras un golpe no cuenta.
//
//   jump   pasar por encima con menos de jumpMargin de separación (saltando o volando)
//   duck   ir agachado debajo de algo que habría golpeado al dragón de pie
//   graze  pasar volando por debajo a menos de grazeMargin
//
// También cuenta cuántos obstáculos quedaron atrás limpios después de pasar cerca (a menos de
// CONFIG.combo.near): eso alarga la racha (core/combo.js). Lo que pasa muy por arriba no cuenta.

import { CONFIG } from '../config.js';
import { anyOverlap } from './collision.js';

/** La caja que envuelve a todas las de una lista. */
function bounds(boxes) {
  return {
    left: Math.min(...boxes.map((box) => box.x)),
    right: Math.max(...boxes.map((box) => box.x + box.w)),
    top: Math.min(...boxes.map((box) => box.y)),
    bottom: Math.max(...boxes.map((box) => box.y + box.h)),
  };
}

export class CloseCalls {
  /**
   * Un paso de simulación, después de revisar los choques. Devuelve { points } (sin multiplicar) y
   * cuántos obstáculos acaban de quedar atrás sin golpear al dragón (cleared).
   */
  update(dragon, obstacles) {
    const { jump, duck, graze, jumpMargin, grazeMargin } = CONFIG.closeCalls;
    const boxes = dragon.hitboxes();
    const left = Math.min(...boxes.map((b) => b.x));
    const safe = dragon.canBeHit;
    const standing = dragon.ducking ? dragon.hitboxes({ ducking: false }) : null;
    let points = 0;
    let cleared = 0;

    for (const obstacle of obstacles) {
      const pass = obstacle.closeCall;
      if (pass.spoiled || pass.passed) continue;
      const hit = obstacle.hitboxes();
      const box = bounds(hit);
      // Las partes del dragón que están encima o debajo del obstáculo en este momento
      const over = boxes.filter((b) => b.x < box.right && b.x + b.w > box.left);
      if (over.length) {
        const bottom = Math.max(...over.map((b) => b.y + b.h));
        const top = Math.min(...over.map((b) => b.y));
        const apart = bottom <= box.top ? box.top - bottom : top >= box.bottom ? top - box.bottom : 0;
        pass.near = Math.min(pass.near ?? Infinity, apart);
        if (!safe) pass.spoiled = true;
        else if (bottom <= box.top) pass.gap = Math.min(pass.gap, box.top - bottom);
        else if (standing && anyOverlap(standing, hit)) pass.ducked = true;
        else if (!dragon.onGround && top >= box.bottom && top - box.bottom <= grazeMargin) pass.grazed = true;
        continue;
      }
      if (box.right > left) continue; // todavía no llega
      pass.passed = true;
      if ((pass.near ?? Infinity) <= CONFIG.combo.near) cleared += 1;
      if (pass.gap <= jumpMargin) points += jump;
      if (pass.ducked) points += duck;
      if (pass.grazed) points += graze;
    }
    return { points, cleared };
  }
}
