// Qué suena y dónde está cada archivo. Para agregar sonido: pon el archivo en assets/audio/ y
// escribe aquí su ruta (relativa a index.html). Lo que quede en null no suena, y si un archivo
// falta o no se puede leer, tampoco: el juego sigue igual. Sirve cualquier formato que el
// navegador sepa leer (.ogg, .mp3, .m4a, .wav).
//
// Los efectos los crea tools/sonidos.mjs (npm run sonidos). Para cambiar uno por otro archivo, escribe
// su ruta aquí. Una lista son versiones del mismo efecto: se alternan al azar, o se elige cuál (ver
// connectAudio en Audio.js). Lo que no está aquí no suena, a propósito.
//
// tools/publicar.mjs copia assets/audio/ y el service worker lo guarda para jugar sin internet.

/** La ruta de un efecto de assets/audio/sfx/; con count, la lista de sus versiones (-1, -2...). */
function sfx(name, count = 0) {
  if (!count) return `assets/audio/sfx/${name}.wav`;
  return Array.from({ length: count }, (_, i) => `assets/audio/sfx/${name}-${i + 1}.wav`);
}

/**
 * Los animales suenan distinto al saltar y al aletear, en tres tipos: 0 ligeros, 1 medianos y 2 pesados
 * (cuál de las versiones de jump y flap). Cada animal suena siempre igual.
 */
export const VOICES = {
  rat: 0, rabbit: 0, monkey: 0, rooster: 0,
  tiger: 1, snake: 1, goat: 1, dog: 1,
  ox: 2, dragon: 2, horse: 2, pig: 2,
};

export const SOUNDS = {
  // Música: una pista para la pantalla de inicio, una por animal (por su id en world/levels.js) y
  // una para el final. Cambian con un fundido; si un nivel no tiene, sigue la que estaba sonando.
  music: {
    title: null, // p. ej. 'assets/audio/music/title.ogg'
    rat: null,
    ox: null,
    tiger: null,
    rabbit: null,
    dragon: null,
    snake: null,
    horse: null,
    goat: null,
    monkey: null,
    rooster: null,
    dog: null,
    pig: null,
    boss: null, // la pelea contra el rival (nivel 12)
    ending: null,
  },

  // Efectos: cuál suena con cada aviso del juego se decide en connectAudio (Audio.js)
  sfx: {
    menuMove: sfx('menu-move'), // cambiar de botón
    play: sfx('play'), // ▶, o elegir en un menú
    pause: sfx('pause'),
    wheel: sfx('wheel'), // la rueda del zodiaco, girando
    wheelStop: sfx('wheel-stop'),
    jump: sfx('jump', 3), // por tipo de animal (VOICES)
    flap: sfx('flap', 3),
    fire: sfx('fire'),
    fireJade: sfx('fire-jade'), // con el trío completo
    charge: sfx('charge'), // mientras se carga el especial
    fireSpecial: sfx('fire-special'),
    fireSpecialJade: sfx('fire-special-jade'),
    burn: sfx('burn', 2), // destruir un obstáculo
    hit: sfx('hit'), // chocar con uno
    dying: sfx('dying'),
    bossHit: sfx('boss-hit'),
    bossHitSpecial: sfx('boss-hit-special'),
    bossWeak: sfx('boss-weak'), // en el punto débil
    bossWarn: sfx('boss-warn'), // va a atacar
    bossShot: sfx('boss-shot'),
    bossCharge: sfx('boss-charge'),
    bossRain: sfx('boss-rain'),
    bossWall: sfx('boss-wall'),
    star: sfx('star'),
    food: sfx('food'),
    cocktail: sfx('cocktail'),
    ingredient: sfx('ingredient'),
    record: sfx('record'),
    gameOver: sfx('game-over'),
  },

  // Los que suenan mientras dura algo y tienen una parte que se repite: de qué segundo a cuál
  loops: { charge: [0.85, 1.25] },

  // Volumen de 0 a 1
  volume: { master: 1, music: 0.6, sfx: 0.8 },
  fadeSeconds: 1.2, // fundido al cambiar de pista
};
