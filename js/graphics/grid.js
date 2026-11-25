// La rejilla del dibujo. Los pixeles del juego son grandes (CONFIG.pixel): en una pantalla grande o de mucha
// resolución (retina, 4K), cada uno mide varios pixeles de verdad, y lo que se mueve de uno en uno avanza a brincos.
// Ahí el canvas lleva el doble de pixeles: el arte se ve igual, pero todo se mueve de medio en medio pixel del juego.

import { CONFIG } from '../config.js';

const P = CONFIG.pixel;

// En cuántas partes se divide cada pixel del juego al mover algo (y cuántos pixeles del canvas mide)
export const GRID = { fine: 1 };

/** Cuánto conviene dividirlo, según cuántos pixeles de verdad mide el juego a lo ancho. */
export const fineFor = (width) => (width / (CONFIG.width / P) >= 3 ? 2 : 1);

/** A la rejilla, en pixeles del juego. */
export const fine = (v) => Math.round(v * GRID.fine) / GRID.fine;

/** A la rejilla, en unidades del mundo. */
export const snap = (v) => fine(v / P) * P;
