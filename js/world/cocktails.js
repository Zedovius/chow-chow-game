// El cóctel de cada signo, como en la carta de Chow Chow House: un fermento, un ingrediente mexicano
// y uno chino. Sale en la tarjeta del animal (ui/ZodiacWheel.js) y al juntar el trío en un nivel
// (core/Game.js, completeTrio).
//
// PROVISIONAL: son ejemplos inventados mientras el bar define los suyos; el juego los marca como
// «Ejemplo» (SAMPLE). Para poner los de verdad: cambia name y los tres ingredientes de cada signo
// (cada ingrediente es una clave de ingredient.<id> en js/i18n/es.js y en.js; si falta, agrégala)
// y pon SAMPLE en false.

export const SAMPLE = true;

export const COCKTAILS_BY_SIGN = {
  rat: { name: 'Rata de Jade', ferment: 'pulque', mexican: 'guava', chinese: 'jasmine' },
  ox: { name: 'Buey de Barro', ferment: 'tepache', mexican: 'cacao', chinese: 'staranise' },
  tiger: { name: 'Tigre de Fuego', ferment: 'tejuino', mexican: 'chile', chinese: 'ginger' },
  rabbit: { name: 'Conejo Lunar', ferment: 'pulque', mexican: 'hibiscus', chinese: 'lychee' },
  dragon: { name: 'Aliento de Dragón', ferment: 'colonche', mexican: 'tamarind', chinese: 'ginger' },
  snake: { name: 'Serpiente de Jade', ferment: 'ricewine', mexican: 'lime', chinese: 'jasmine' },
  horse: { name: 'Caballo de Viento', ferment: 'tepache', mexican: 'tamarind', chinese: 'plum' },
  goat: { name: 'Cabra de Nube', ferment: 'pulque', mexican: 'guava', chinese: 'osmanthus' },
  monkey: { name: 'Mono Travieso', ferment: 'tejuino', mexican: 'tamarind', chinese: 'lychee' },
  rooster: { name: 'Gallo del Alba', ferment: 'colonche', mexican: 'hibiscus', chinese: 'oolong' },
  dog: { name: 'Perro Fiel', ferment: 'ricewine', mexican: 'cacao', chinese: 'staranise' },
  pig: { name: 'Cerdo de la Suerte', ferment: 'tepache', mexican: 'guava', chinese: 'ginger' },
};

/** El cóctel de un signo ('rat', 'ox'...), o null si no tiene. */
export const cocktailOf = (sign) => COCKTAILS_BY_SIGN[sign] ?? null;
