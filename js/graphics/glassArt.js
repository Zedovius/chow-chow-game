// Las hojas de los 12 tragos dando una vuelta (las hace tools/sprites/tragos.mjs, npm run tragos), para la
// pantalla del trago (ui/drinkScreen.js) y, en chico, junto al nombre (ui/drink.js).

/** Un cuadro mide w × h; son frames, en renglones de columns. */
export const SHEET = { w: 96, h: 124, frames: 64, columns: 8 };

/** La hoja de un signo. */
export const glassSheet = (sign) => `assets/images/tragos/${sign}.png`;
