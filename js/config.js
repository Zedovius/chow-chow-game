// Ajustes globales del juego. Las medidas van en unidades del mundo: el mundo mide 800 × 300 y
// el canvas lo dibuja a la mitad de resolución (pixel), ampliado sin suavizar.

// Para probar: ?nivel=5 empieza en el nivel 5 (el Dragón, sin suelo). En las pruebas de Node no
// hay location.
const params = new URLSearchParams(globalThis.location?.search ?? '');
const requestedLevel = Number.parseInt(params.get('nivel') ?? '', 10);

// El salto completo: 700² / (2 · 2400) ≈ 102 de alto. Se puede volar hasta SKY_JUMPS saltos de alto.
const JUMP = { gravity: 2400, velocity: 700 };
const JUMP_HEIGHT = JUMP.velocity ** 2 / (2 * JUMP.gravity);
const SKY_JUMPS = 5;
const GROUND_Y = 250;

export const CONFIG = {
  width: 800,
  height: 300,
  groundY: GROUND_Y, // el suelo (en los niveles sin suelo, las nubes del fondo)
  jumpHeight: JUMP_HEIGHT,
  // El techo del cielo: se puede volar hasta SKY_JUMPS alturas de salto. El mundo es más alto que la
  // pantalla: la cámara sube con el dragón (graphics/Camera.js), así que y puede ser negativa.
  ceilingY: GROUND_Y - SKY_JUMPS * JUMP_HEIGHT,
  skyJumps: SKY_JUMPS,
  pixel: 2,
  // La cámara: al volar más alto que un salto, deja los pies del dragón a feetAt de la orilla de
  // arriba de la pantalla (follow: qué tan rápido lo alcanza) y muestra un poco más arriba del techo
  camera: { feetAt: 130, follow: 6, overCeiling: 60 },

  // El dragón: cabeza y cinco partes de cuerpo que siguen el camino de la cabeza (px/s y px/s²).
  dragon: {
    x: 190, // dónde va la cabeza; el cuerpo queda detrás
    // Corriendo: salto variable como en Chispas. Al soltar el botón antes, el salto se corta a
    // jumpCutVelocity; mantener abajo en el aire lo hace caer más rápido.
    gravity: JUMP.gravity,
    jumpVelocity: JUMP.velocity, // salto completo: ≈ 102 de alto, 0,58 s en el aire
    jumpCutVelocity: 320,
    fastFallMultiplier: 3,
    // Volando (en todos los niveles): en el aire, cada salto es un aleteo que lo impulsa un poco.
    // Desde el primer aleteo y hasta tocar el suelo, la gravedad es más suave y la caída tiene un
    // máximo. Sin aletear, el salto es el de siempre.
    flight: { gravity: 900, flap: 300, maxFall: 260, diveMultiplier: 2.5 },
    // Sin suelo (el Dragón y el Gallo): tocar las nubes de abajo quita un corazón y rebota así
    cloudBounce: 460,
    // Al esperar el primer aleteo en un nivel sin suelo, flota a esta altura sobre las nubes
    hoverHeight: 2 * JUMP_HEIGHT,
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
    // Altura del centro de una criatura del suelo:
    //   low  hay que saltarla · mid  hay que agacharse (o saltarla) · high  golpea si saltas
    flyerHeights: { low: 12, mid: 20, high: 54 },
    // El cielo tiene su propia fila de obstáculos, en oleadas (world/obstacles.js). Con suelo, van
    // de skyFloor (más alto que lo que alcanza la cabeza con un salto completo, ~122: solo estorban
    // a quien vuela) al techo; sin suelo, de las nubes al techo. Cada oleada pone sus obstáculos en
    // franjas distintas, y siempre queda al menos una libre.
    skyFloor: 145,
    skyMargin: 18, // lo que se deja libre junto a las nubes y al techo
  },

  // Bolas de fuego: queman lo que sea burnable (world/obstacles.js). Se recargan con cócteles.
  fire: { speed: 560, radius: 6, start: 3, max: 9, cooldown: 0.25 },
  // Lo que se recoge (world/Spawner.js), como los huesitos de Chispas: sale en momentos y alturas al
  // azar (de casi el suelo hasta casi el techo), se mece un poco, y nunca obliga a chocar: solo
  // aparece si no acaba de salir un obstáculo (clearBefore) y después los obstáculos esperan
  // (clearAfter, en segundos).
  pickups: { clearBefore: 220, clearAfter: 1.25, bob: 10, edge: 0.12 },
  // Cócteles: cada tantos segundos (al azar entre los dos números); dan perCocktail bolas de fuego
  cocktails: { everySeconds: [4, 8], perCocktail: 3, radius: 7 },
  // La perla del dragón: una por nivel, en un momento al azar
  pearl: { radius: 8 },

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
