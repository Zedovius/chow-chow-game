// Puntos por arriesgarse, sin ningún aviso en pantalla: separan los puntajes de quienes juegan bien.
// Salen de las mismas cajas de colisión que los choques. Cada uno cuenta una vez por obstáculo, y
// solo cuando el obstáculo ya quedó atrás sin golpear al dragón; lo que se cruza mientras parpadea
// tras un golpe no cuenta.
//
//   jump  pasar por encima con menos de jumpMargin de separación
//   duck  ir agachado debajo de algo que habría golpeado al dragón de pie

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
  /** Un paso de simulación, después de revisar los choques. Devuelve los puntos, sin multiplicar. */
  update(dragon, obstacles) {
    const { jump, duck, jumpMargin } = CONFIG.closeCalls;
    const boxes = dragon.hitboxes();
    const body = { left: Math.min(...boxes.map((b) => b.x)) };
    const safe = dragon.canBeHit;
    const standing = dragon.ducking ? dragon.hitboxes({ ducking: false }) : null;
    let points = 0;

    for (const obstacle of obstacles) {
      const pass = obstacle.closeCall;
      if (pass.spoiled || pass.passed) continue;
      const hit = obstacle.hitboxes();
      const box = bounds(hit);
      // Las partes del dragón que están encima o debajo del obstáculo en este momento
      const over = boxes.filter((b) => b.x < box.right && b.x + b.w > box.left);
      if (over.length) {
        const bottom = Math.max(...over.map((b) => b.y + b.h));
        if (!safe) pass.spoiled = true;
        else if (bottom <= box.top) pass.gap = Math.min(pass.gap, box.top - bottom);
        else if (standing && anyOverlap(standing, hit)) pass.ducked = true;
        continue;
      }
      if (box.right > body.left) continue; // todavía no llega
      pass.passed = true;
      if (pass.gap <= jumpMargin) points += jump;
      if (pass.ducked) points += duck;
    }
    return points;
  }
}
