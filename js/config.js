// Ajustes globales del juego. Las medidas van en unidades del mundo: el mundo mide 800 × 300 y
// el canvas lo dibuja a la mitad de resolución (pixel), ampliado sin suavizar.

// Para probar: ?nivel=5 empieza en el nivel 5; ?nivel=13, en la pelea contra el rival. Solo en la
// computadora de desarrollo (localhost o el archivo abierto directo): en el juego publicado no hace
// nada, para que nadie se salte niveles y entre a HI RECORDS. En las pruebas de Node no hay location.
const DEV_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '']);
const dev = Boolean(globalThis.location) && DEV_HOSTS.has(globalThis.location.hostname);
const params = new URLSearchParams(dev ? globalThis.location.search : '');
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
  // Celular en vertical (core/view.js): la vista crece hacia arriba hasta height unidades de alto
  // (con cielo extra), igual que en Chispas, sin pasar del alto de la pantalla menos reserve px
  // (la cruceta y FIRE deben caber debajo). Con 840 se ve todo el cielo y la cámara ya no se mueve.
  tallView: { query: '(orientation: portrait) and (max-width: 820px)', height: 840, reserve: 240 },

  // El dragón: cabeza y cinco partes de cuerpo que siguen el camino de la cabeza (px/s y px/s²).
  player: {
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

  // Velocidad de avance: la del primer nivel, cuánto sube en cada nivel y la de la pantalla de
  // inicio. Cuánto más rápido va al final de cada nivel que al empezarlo depende de la dificultad
  // (ramp en world/levels.js)
  speed: { start: 240, perLevel: 10, title: 120 },
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
    // Más arriba, más riesgo: las franjas altas reciben más obstáculos (cada franja pesa 1 +
    // altitudeWeight × su número, de abajo hacia arriba) y lo de cada franja va un poco más rápido
    altitudeWeight: 0.5,
    altitudeSpeed: 8, // px/s más por cada franja
    // Lo que se mueve en el cielo (motion en world/obstacles.js), siempre sin salir de su fila:
    //   wave  sube y baja; dive  baja (o sube) de golpe al acercarse; rise  sube despacio
    motion: {
      wave: { amplitude: 26, speed: 3.2 },
      dive: { at: 560, speed: 170, depth: 70 },
      rise: { speed: 22 },
      // En el suelo: roll  rueda más rápido que el suelo; hop  brinca en su lugar, siempre al mismo
      // ritmo (arriba deja pasar por debajo; abajo hay que saltarlo)
      roll: { speed: 70 },
      hop: { height: 40, period: 1.1 },
    },
    // Las nubes de tormenta sueltan rayos cortos en zigzag, muy seguido y siempre al mismo ritmo,
    // para que se pueda leer el patrón antes de llegar: cada period segundos, warn segundos de aviso
    // (la nube parpadea y se ve tenue el zigzag donde va a caer) y el rayo dura strike. Mientras la
    // nube cruza la pantalla, cae 3 veces o más (2 en los niveles más rápidos). Con suelo, el rayo nunca baja hasta donde llega un
    // salto normal. width: lo ancho del zigzag (y de su caja de choque).
    lightning: { period: 0.65, warn: 0.26, strike: 0.2, length: 28, width: 12 },
  },

  // Bolas de fuego: queman lo que sea burnable (world/obstacles.js). Se recargan con cócteles. El
  // máximo que se puede cargar depende de la dificultad (fireMax en world/levels.js)
  fire: { speed: 560, radius: 6, start: 3, cooldown: 0.25 },
  // El disparo especial (contra el rival, core/charge.js): en fácil siempre (el fuego es infinito);
  // en difícil, con al menos needs bolas de fuego, mantener el botón seconds segundos lo carga; al soltarlo sale uno grande (radius) que
  // gasta solo una, le quita damage de vida al jefe y atraviesa sus disparos.
  charge: { needs: 3, seconds: 0.8, damage: 3, radius: 12 },
  // Lo que se recoge (world/Spawner.js), como los huesitos de Chispas: sale en momentos y alturas al
  // azar (de casi el suelo hasta casi el techo), se mece un poco, y nunca obliga a chocar: solo
  // aparece si no acaba de salir un obstáculo cerca de su altura (clearBefore) y después esperan
  // los obstáculos de la fila de su altura (clearAfter, en segundos); la otra fila sigue igual. Entre
  // una cosa y la siguiente pasan al menos apart segundos: nunca salen juntas.
  pickups: { clearBefore: 220, clearAfter: 0.9, apart: 3.5, bob: 10 },
  // Qué tan seguido sale cada cosa depende de la dificultad (world/levels.js). Más de la mitad
  // salen en la mitad de arriba del cielo (skew: más chico, más arriba): para tomarlas hay que volar.
  pickupSkew: 0.6,
  // Cócteles: dan perCocktail bolas de fuego y points puntos. Casi todos salen arriba, donde hay que
  // volar para tomarlos: solo lowShare de ellos sale a la altura de un salto (si no, sería muy fácil
  // quemar todo desde el suelo). En los niveles sin suelo, a cualquier altura.
  cocktails: { perCocktail: 3, points: 100, radius: 11, lowShare: 0.15, low: [24, 72] },
  // La estrella: el poder de volar. Sale una vez en cada nivel con suelo si aún no se tiene, en un
  // momento al azar al principio del nivel (window: qué parte del nivel), a ras del suelo (height:
  // la altura de su centro): se toma corriendo.
  star: { radius: 9, height: 14, window: [0.06, 0.22] },
  // Comida china (la caja para llevar, el tazón de arroz): un corazón (sin pasar del máximo de la
  // dificultad) y points puntos
  food: { hearts: 1, points: 200, radius: 12 },

  // El nivel 13: la pelea contra el rival (entities/Boss.js). Todos los jefes tienen los mismos
  // ataques; solo cambian el dibujo y el color. Cada ataque se anuncia antes (telegraph, en
  // segundos) y siempre deja por dónde pasar:
  //   volley  tres disparos a tres alturas (spread entre uno y otro), con huecos para pasar
  //   aimed   disparos a la altura donde está quien juega (en difícil, tres seguidos)
  //   charge  marca una franja a su altura y la cruza a toda velocidad
  // Con la mitad de vida (enrage) descansa menos y dispara más rápido.
  boss: {
    size: { w: 56, h: 48 },
    homeX: 640, // donde se queda (su centro)
    follow: 140, // qué tan rápido sigue la altura de quien juega (px/s)
    hp: { easy: 10, hard: 16 },
    rest: { easy: [1.4, 2], hard: [0.85, 1.3] },
    telegraph: { volley: 0.7, aimed: 0.6, charge: 0.9 },
    shot: { w: 14, h: 10, speed: { easy: 210, hard: 290 }, spread: 64 },
    aimed: { easy: 1, hard: 3, every: 0.3 },
    charge: { speed: 720, back: 300 },
    enrage: { at: 0.5, rest: 0.7, speed: 1.15 },
    points: 100, // por cada bola de fuego que le pega
    bonus: 5000, // al vencerlo
    fallSeconds: 1.6, // cayendo vencido, antes del final
    // Lo que sale para recoger en la pelea (cada tantos segundos; null: nunca). En fácil el fuego es
    // infinito y solo sale comida, muy de vez en cuando; en difícil, cócteles seguido y el disparo
    // especial (charge)
    pickups: {
      easy: { cocktail: null, food: [24, 32] },
      hard: { cocktail: [3, 4.5], food: [14, 20] },
    },
    infiniteFire: { easy: true, hard: false },
    chargeShot: { easy: true, hard: true },
    speed: 260, // el mundo sigue corriendo, más despacio
  },

  // Entre un nivel y el siguiente (sin detenerse): en seconds segundos el mundo pasa del color del
  // anterior al del nuevo, y la velocidad, de la que llevaba a la del nuevo (sin frenones)
  transition: { seconds: 1.6 },
  // Sin que nadie toque nada este tiempo en una pantalla de espera (la pausa, Game Over, el final o
  // el nivel esperando el primer salto), el juego regresa solo al menú principal (core/activity.js)
  idleSeconds: 180,
  deathDelay: 1.4, // segundos cayendo antes del Game Over
  deathSlowdown: 2.5, // al caer, el mundo sigue avanzando y frena así (más alto, frena antes)

  // Puntuación (× el score de la dificultad)
  scorePerPx: 0.025,
  milestone: 100,
  burnBonus: 50, // por cada obstáculo quemado
  heartBonus: { easy: 100, hard: 200 }, // por cada corazón al terminar un nivel
  // Puntos por arriesgarse, sin aviso en pantalla (core/closeCalls.js): saltar algo a menos de
  // jumpMargin de distancia, pasar agachado bajo algo que habría golpeado de pie, o pasar volando
  // a menos de grazeMargin de algo (por arriba o por abajo)
  closeCalls: { jump: 10, duck: 20, graze: 15, jumpMargin: 16, grazeMargin: 14 },
  // La racha (core/combo.js): cada every obstáculos esquivados de cerca (a menos de near) o
  // quemados, seguidos, el multiplicador de puntos sube step, hasta max. Un golpe la reinicia.
  combo: { every: 8, step: 0.5, max: 3, near: 60 },

  startLevel: Number.isFinite(requestedLevel) ? Math.min(13, Math.max(1, requestedLevel)) - 1 : 0,

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
