// Las imágenes del juego. Para agregar arte: pon el archivo en assets/images/ y escribe aquí su
// ruta (relativa a index.html). Lo que quede en null se dibuja con las figuras provisionales de
// graphics/Scene.js, y si una imagen falta o no carga, también: el juego nunca espera ni se rompe.
//
// tools/publicar.mjs copia assets/images/ y el service worker la guarda para jugar sin internet.

import { BOSS_ART } from './bossArt.js';

const levelArt = () => ({
  sky: null, // el fondo, pegado a la pantalla (se repite a lo ancho, con parallax)
  ground: null, // el suelo, o las nubes de abajo en los niveles sin suelo (se repite)
});

export const IMAGES = {
  // El dragón: la cabeza y cada una de las cinco partes del cuerpo (de la más cercana a la cola).
  // Se dibujan centradas en su parte y giradas según part.angle (ver Dragon.parts). Para animarlo
  // (patas, alas, agacharse), Scene.drawPlayer tiene dragon.pose, runTime y flapTime.
  dragon: {
    head: null, // p. ej. 'assets/images/dragon/head.png'
    body: [null, null, null, null, null],
  },
  fireball: null,
  // La estrella del vuelo (la genera tools/sprites/pickups.mjs)
  star: 'assets/images/pickups/estrella.png',
  // Los jefes que ya tienen dibujo (tools/sprites/jefes.mjs): el cuerpo, el brazo y la moneda
  bosses: Object.fromEntries(Object.entries(BOSS_ART).map(([id, { body, arm, coin }]) => [id, { body, arm, coin }])),
  // Un dibujo por cóctel (sus nombres están en entities/Pickup.js)
  // (los cócteles y la comida los genera tools/sprites/pickups.mjs: se dibujan a su tamaño de pixel)
  cocktails: {
    'margarita-lichi': 'assets/images/pickups/margarita-lichi.png',
    'mezcal-jengibre': 'assets/images/pickups/mezcal-jengibre.png',
  },
  // Los ingredientes del trío (también los genera tools/sprites/pickups.mjs)
  ingredients: {
    hongo: 'assets/images/pickups/hongo.png',
    agave: 'assets/images/pickups/agave.png',
    chile: 'assets/images/pickups/chile.png',
  },
  // Un dibujo por comida (sus nombres también están en entities/Pickup.js)
  foods: {
    'caja-china': 'assets/images/pickups/caja-china.png',
    'tazon-de-arroz': 'assets/images/pickups/tazon-de-arroz.png',
  },

  // Un juego de imágenes por animal (por su id en world/levels.js)
  levels: {
    rat: levelArt(),
    ox: levelArt(),
    tiger: levelArt(),
    rabbit: levelArt(),
    dragon: levelArt(),
    snake: levelArt(),
    horse: levelArt(),
    goat: levelArt(),
    monkey: levelArt(),
    rooster: levelArt(),
    dog: levelArt(),
    pig: levelArt(),
  },
};

/**
 * Carga todas las rutas de un manifiesto y devuelve un objeto con la misma forma, donde cada ruta
 * se cambia por { ready, image } y cada null sigue en null. Las imágenes van apareciendo solas:
 * Scene revisa en cada cuadro, con ready(), si ya están.
 */
export function loadImages(manifest = IMAGES) {
  const walk = (node) => {
    if (node === null || node === undefined) return null;
    if (typeof node === 'string') return loadImage(node);
    if (Array.isArray(node)) return node.map(walk);
    return Object.fromEntries(Object.entries(node).map(([key, value]) => [key, walk(value)]));
  };
  return walk(manifest);
}

/** Una imagen que se lee como { ready, image }: ready se vuelve true cuando ya se puede dibujar. */
function loadImage(src) {
  const slot = { ready: false, image: null };
  if (typeof Image === 'undefined') return slot;
  const image = new Image();
  image.decoding = 'async';
  whenDecoded(image, () => {
    slot.image = image;
    slot.ready = true;
  });
  image.addEventListener('error', () => console.warn(`[Chow Chow] No se pudo cargar la imagen ${src}.`));
  image.src = src;
  return slot;
}

/** Avisa cuando la imagen ya bajó y está decodificada: dibujarla por primera vez no traba el juego. */
export function whenDecoded(image, done) {
  image.addEventListener('load', async () => {
    try {
      await image.decode();
    } catch {
      // Se decodifica al dibujarla
    }
    done();
  });
}

/** La imagen de un lugar del mapa si ya cargó, si no null. */
export const ready = (slot) => (slot?.ready ? slot.image : null);
