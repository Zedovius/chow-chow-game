// Lo que se recoge con la cabeza: los cócteles (recargan las bolas de fuego), la comida china (un
// corazón) y la estrella (el poder de volar). Van con el mundo y se mecen un poco, como
// los huesitos de Chispas. Dónde y cuándo salen: world/Spawner.js.

import { CONFIG } from '../config.js';

// Los cócteles de la barra, mitad China y mitad México. Solo cambian el dibujo (graphics/assets.js);
// todos recargan igual. Se pueden cambiar o agregar libremente.
export const COCKTAILS = ['margarita-lichi', 'mezcal-jengibre'];
// La comida china: la clásica caja blanca para llevar y un tazón de arroz. Las dos dan un corazón;
// solo cambia el dibujo
export const FOODS = ['caja-china', 'tazon-de-arroz'];

const RADIUS = { cocktail: () => CONFIG.cocktails.radius, food: () => CONFIG.food.radius, star: () => CONFIG.star.radius };

export class Pickup {
  /** type: 'cocktail' | 'food' | 'star'; x, y: centro; variety: cuál (uno de COCKTAILS o FOODS). */
  constructor(type, x, y, variety = null) {
    this.type = type;
    this.variety = variety;
    this.x = x;
    this.prevX = x;
    this.baseY = y;
    this.y = y;
    this.prevY = y; // el del paso anterior (para dibujar entre dos pasos, Game.render)
    this.t = Math.random() * Math.PI * 2;
    this.r = RADIUS[type]();
  }

  update(dt, speed) {
    this.prevX = this.x;
    this.prevY = this.y;
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
