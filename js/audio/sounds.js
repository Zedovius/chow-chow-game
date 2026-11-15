// Qué suena y dónde está cada archivo. Para agregar sonido: pon el archivo en assets/audio/ y
// escribe aquí su ruta (relativa a index.html). Lo que quede en null no suena, y si un archivo
// falta o no se puede leer, tampoco: el juego sigue igual. Sirve cualquier formato que el
// navegador sepa leer (.ogg, .mp3, .m4a, .wav).
//
// tools/publicar.mjs copia assets/audio/ y el service worker lo guarda para jugar sin internet.

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
    boss: null, // la pelea contra el rival (nivel 13)
    ending: null,
  },

  // Efectos: uno por aviso del juego (ver core/events.js)
  sfx: {
    jump: null, // p. ej. 'assets/audio/sfx/jump.ogg'
    flap: null,
    land: null,
    bump: null,
    fire: null,
    fireEmpty: null,
    chargeReady: null,
    fireSpecial: null,
    burn: null,
    fizzle: null,
    cocktail: null,
    bossWarn: null,
    bossAttack: null,
    bossHit: null,
    bossDefeated: null,
    flightGained: null,
    flightLost: null,
    food: null,
    comboUp: null,
    comboLost: null,
    thunder: null,
    hit: null,
    levelComplete: null,
    dying: null,
    gameOver: null,
    newRecord: null,
    milestone: null,
    closeCall: null, // vacío a propósito si los roces deben pasar sin aviso
    pause: null,
  },

  // Volumen de 0 a 1
  volume: { master: 1, music: 0.6, sfx: 0.8 },
  fadeSeconds: 1.2, // fundido al cambiar de pista
};
