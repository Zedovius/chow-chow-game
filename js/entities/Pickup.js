// Lo que se recoge con la cabeza: la perla del dragón (una por nivel: puntos y, en difícil, medio
// corazón) y los cócteles (recargan las bolas de fuego). Van con el mundo y se mecen un poco, como
// los huesitos de Chispas. Dónde y cuándo salen: world/Spawner.js.

import { CONFIG } from '../config.js';

// Los cócteles de la barra, mitad China y mitad México. Solo cambian el dibujo (graphics/assets.js);
// todos recargan igual. Se pueden cambiar o agregar libremente.
export const COCKTAILS = ['margarita-lichi', 'mezcal-jengibre', 'horchata-te-verde', 'michelada-ciruela'];

export class Pickup {
  /** type: 'pearl' | 'cocktail'; x, y: centro; variety: cuál cóctel (uno de COCKTAILS). */
  constructor(type, x, y, variety = null) {
    this.type = type;
    this.variety = variety;
    this.x = x;
    this.prevX = x;
    this.baseY = y;
    this.y = y;
    this.t = Math.random() * Math.PI * 2;
    this.r = type === 'pearl' ? CONFIG.pearl.radius : CONFIG.cocktails.radius;
  }

  update(dt, speed) {
    this.prevX = this.x;
    this.x -= speed * dt;
    this.t += dt;
    this.y = this.baseY + Math.sin(this.t * 2.4) * CONFIG.pickups.bob;
  }

  get offscreen() {
    return this.x + this.r < 0;
  }

  hitboxes() {
    return [{ x: this.x - this.r, y: this.y - this.r, w: this.r * 2, h: this.r * 2 }];
  }
}
