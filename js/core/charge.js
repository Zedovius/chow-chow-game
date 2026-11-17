// El botón de fuego, con o sin carga. Sin carga, cada vez que se presiona sale una bola de fuego.
// Con carga (en todos los niveles, con al menos CONFIG.charge.needs bolas de fuego o con fuego
// infinito), al presionar empieza a cargar; al soltar sale:
//   'normal'   si se soltó antes de CONFIG.charge.seconds (un toque rápido)
//   'special'  si se mantuvo hasta cargarse: grande y pega más (en difícil gasta una bola de fuego)
// Así un toque sigue siendo un disparo, y mantener el botón es el ataque especial.
// instant (así lo usa el juego, core/Game.js): el disparo normal sale al presionar, sin esperar a que
// se suelte, y mantener el botón carga el especial de todos modos (al soltar sale solo si se cargó).

import { CONFIG } from '../config.js';

export class FireButton {
  constructor() {
    this.charging = null; // segundos que lleva cargando, o null si no carga
    this.instant = false; // esta carga ya disparó uno normal al presionar (ver update)
  }

  /** Qué tan cargado va (0 a 1), para el dibujo. */
  get progress() {
    return this.charging === null ? 0 : Math.min(1, this.charging / CONFIG.charge.seconds);
  }

  get ready() {
    return this.progress >= 1;
  }

  /**
   * Un paso. pressed: se presionó en este paso; down: está presionado; canCharge: se puede cargar
   * ahora; instant: el disparo normal sale al presionar (ver arriba). Devuelve qué disparo sale en
   * este paso: 'normal' | 'special' | null. Al cargarse por completo, ready pasa a true (charged:
   * true en ese paso, para avisar).
   */
  update(dt, { pressed, down, canCharge, instant = false }) {
    this.charged = false;
    if (!canCharge) {
      // Si deja de poder cargar a media carga (por ejemplo, el jefe cayó), sale un disparo normal
      if (this.charging !== null) {
        const wasInstant = this.instant;
        this.charging = null;
        if (!wasInstant) return 'normal';
      }
      return pressed ? 'normal' : null;
    }
    if (this.charging === null) {
      if (!pressed) return null;
      this.charging = 0;
      this.instant = instant;
      return instant ? 'normal' : null;
    }
    if (down) {
      const wasReady = this.ready;
      this.charging += dt;
      if (!wasReady && this.ready) this.charged = true;
      return null;
    }
    const shot = this.ready ? 'special' : this.instant ? null : 'normal';
    this.charging = null;
    return shot;
  }

  reset() {
    this.charging = null;
  }
}
