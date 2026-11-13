// Las imágenes del juego. Para agregar arte: pon el archivo en assets/images/ y escribe aquí su
// ruta (relativa a index.html). Lo que quede en null se dibuja con las figuras provisionales de
// graphics/Scene.js, y si una imagen falta o no carga, también: el juego nunca espera ni se rompe.
//
// tools/publicar.mjs copia assets/images/ y el service worker la guarda para jugar sin internet.

const levelArt = () => ({
  sky: null, // el fondo (se repite a lo ancho, con parallax)
  ground: null, // el suelo (se repite)
  // Un dibujo por tipo de obstáculo (world/obstacles.js), del tamaño de su caja de choque
  obstacles: { post: null, crate: null, group: null, wall: null, flyer: null },
});

export const IMAGES = {
  // El dragón: la cabeza y cada una de las cinco partes del cuerpo (de la más cercana a la cola).
  // Se dibujan centradas en su parte y giradas según part.angle (ver Dragon.parts). Para animarlo
  // (patas, alas, agacharse), Scene.drawDragon tiene dragon.pose, runTime y flapTime.
  dragon: {
    head: null, // p. ej. 'assets/images/dragon/head.png'
    body: [null, null, null, null, null],
  },
  fireball: null,
  pearl: null,
  // Un dibujo por cóctel (sus nombres están en entities/Pickup.js)
  cocktails: {
    'margarita-lichi': null,
    'mezcal-jengibre': null,
    'horchata-te-verde': null,
    'michelada-ciruela': null,
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
  image.addEventListener('load', () => {
    slot.image = image;
    slot.ready = true;
  });
  image.addEventListener('error', () => console.warn(`[Chow Chow] No se pudo cargar la imagen ${src}.`));
  image.src = src;
  return slot;
}

/** La imagen de un lugar del mapa si ya cargó, si no null. */
export const ready = (slot) => (slot?.ready ? slot.image : null);
