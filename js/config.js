// Ajustes globales del juego. Las medidas van en unidades del mundo: el mundo mide 800 × 300 y
// el canvas lo dibuja a la mitad de resolución (pixel), ampliado sin suavizar.

// Para probar: ?nivel=5 empieza en el nivel 5 (el Dragón, que vuela). En las pruebas de Node no hay
// location.
const params = new URLSearchParams(globalThis.location?.search ?? '');
const requestedLevel = Number.parseInt(params.get('nivel') ?? '', 10);

export const CONFIG = {
  width: 800,
  height: 300,
  ceilingY: 0,
  groundY: 250,
  pixel: 2,

  // El dragón: cabeza y cinco partes de cuerpo que siguen el camino de la cabeza (px/s y px/s²).
  dragon: {
    x: 190, // dónde va la cabeza; el cuerpo queda detrás
    // Corriendo (todos los niveles): salto variable como en Chispas. Al soltar el botón antes, el
    // salto se corta a jumpCutVelocity; mantener abajo en el aire lo hace caer más rápido.
    gravity: 2400,
    jumpVelocity: 700, // salto completo: 700² / (2 · 2400) ≈ 102 de alto, 0,58 s en el aire
    jumpCutVelocity: 320,
    fastFallMultiplier: 3,
    // Volando (solo en los niveles con flight, ver world/levels.js): después del salto, cada
    // aleteo en el aire lo impulsa un poco, con menos gravedad. Más suave que el salto.
    flight: { gravity: 900, flap: 300, maxFall: 260, diveMultiplier: 2.5 },
    duckScale: 0.55, // agachado, cada parte mide esto de alto
    spacing: 18, // distancia entre partes del cuerpo, medida sobre el camino de la cabeza
    head: { w: 26, h: 20 },
    body: [
      { w: 20, h: 16 },
      { w: 18, h: 14 },
      { w: 16, h: 12 },
      { w: 14, h: 10 },
      { w: 12, h: 8 },
    ],
    invulnerableSeconds: 1.5,
    hurtBounce: 260, // el saltito al recibir un golpe
    deathSlide: 160, // al morir, qué tan rápido se tiende el cuerpo en el suelo
  },

  // Velocidad de avance: la del primer nivel, cuánto sube en cada nivel, cuánto más rápido va al
  // final de cada nivel que al empezarlo (ramp) y la de la pantalla de inicio
  speed: { start: 240, perLevel: 10, ramp: 0.12, title: 120 },
  levelLength: 5200, // unidades del mundo por nivel (unos 20 s)

  // Los obstáculos (los tipos están en world/obstacles.js). La separación se piensa en segundos de
  // reacción, como en Chispas: entre minGapSeconds y minGapSeconds + gapVarianceSeconds, más junta
  // con la densidad de la dificultad y a lo largo del nivel (densityRamp), sin bajar nunca de
  // minGapFloorSeconds: el salto dura 0,58 s y hace falta margen para aterrizar.
  obstacles: {
    firstDistance: 640,
    minGapSeconds: 0.9,
    gapVarianceSeconds: 0.9,
    minGapFloorSeconds: 0.82,
    densityRamp: { start: 1.15, end: 0.85 },
    clearDistance: 700, // deja de poner obstáculos esta distancia antes del final del nivel
    flyerSpeedBonus: 30, // las criaturas que vuelan van un poco más rápido que el suelo
    // Altura del centro de una criatura sobre el suelo:
    //   low  hay que saltarla · mid  hay que agacharse (o saltarla) · high  golpea si saltas
    flyerHeights: { low: 12, mid: 20, high: 54 },
    skyRange: [80, 215], // niveles de vuelo: las criaturas del cielo van entre estas alturas
  },

  // Bolas de fuego: queman lo que sea burnable (world/obstacles.js). Se recargan con cócteles.
  fire: { speed: 560, radius: 6, start: 3, max: 9, cooldown: 0.25 },
  // Cócteles: salen entre obstáculos cada tantos (al azar entre los dos números) y dan perCocktail
  // bolas de fuego. Sus alturas sobre el suelo: en el suelo, de un salto y, al volar, en el cielo.
  cocktails: { every: [2, 4], perCocktail: 3, radius: 7, heights: [10, 50], skyHeights: [10, 50, 110, 170] },
  // La perla del dragón: una por nivel, a la altura de un salto (o en el cielo, al volar)
  pearl: { radius: 8, height: 56, skyHeight: [130, 190] },

  deathDelay: 1.4, // segundos cayendo antes del Game Over
  deathSlowdown: 2.5, // al caer, el mundo sigue avanzando y frena así (más alto, frena antes)

  // Puntuación (× el score de la dificultad)
  scorePerPx: 0.025,
  milestone: 100,
  pearlBonus: 500, // perla del dragón: una por nivel
  burnBonus: 50, // por cada obstáculo quemado
  heartBonus: { easy: 100, hard: 200 }, // por cada corazón al terminar un nivel
  // Puntos por arriesgarse, sin aviso en pantalla (core/closeCalls.js): saltar algo a menos de
  // jumpMargin de distancia, o pasar agachado bajo algo que habría golpeado de pie
  closeCalls: { jump: 10, duck: 20, jumpMargin: 16 },

  startLevel: Number.isFinite(requestedLevel) ? Math.min(12, Math.max(1, requestedLevel)) - 1 : 0,

  storageKey: 'chowchow.record',
  // HI RECORDS: los mejores puntajes de quienes terminan los 12 niveles, por dificultad. Ver
  // core/scores.js, ui/NameEntry.js y ui/TitleBoards.js
  leaderboard: {
    storageKey: 'chowchow.clasificacion',
    size: 5,
    nameLength: 6,
    idleSeconds: 100,
    alternateSeconds: 22,
    keyRepeat: { delay: 350, every: 110, fast: 50, fastAfter: 1400 },
  },
};
