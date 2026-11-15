// Una bola de fuego: sale de la boca del animal y avanza recto. Quema lo que sea burnable y se
// apaga contra lo demás (ver Game.updateFireballs). La especial (special, el disparo cargado) es más
// grande, le quita más vida al jefe (power) y atraviesa sus disparos.

import { CONFIG } from '../config.js';

export class Fireball {
  constructor(x, y, { special = false } = {}) {
    this.x = x;
    this.prevX = x;
    this.y = y;
    this.special = special;
    this.power = special ? CONFIG.charge.damage : 1;
    this.r = special ? CONFIG.charge.radius : CONFIG.fire.radius;
    this.age = 0; // segundos desde que salió (para animarla)
  }

  update(dt) {
    this.prevX = this.x;
    this.x += CONFIG.fire.speed * dt;
    this.age += dt;
  }

  get offscreen() {
    return this.x - this.r > CONFIG.width;
  }

  hitboxes() {
    return [{ x: this.x - this.r, y: this.y - this.r, w: this.r * 2, h: this.r * 2 }];
  }
}
