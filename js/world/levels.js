// Los niveles, uno por animal del zodiaco chino, y las reglas de cada dificultad. Son 12: los mundos
// de 11 animales (todos menos el rival de quien juega) y, al final, la pelea contra el rival en el suyo.
// Cada nivel es un poco más rápido y trae obstáculos nuevos (world/obstacles.js). En todos se puede
// volar; los del Dragón y el Gallo no tienen suelo (noGround): puro cielo, con nubes abajo.
// Los colores son provisionales; el arte irá después.

import { CONFIG } from '../config.js';
import { groundLane, skyLane } from './obstacles.js';

// Las reglas de cada dificultad:
//   boost            px/s de más en todos los niveles (miden otro tanto más: duran lo mismo)
//   ramp             cuánto más rápido va al final de cada nivel que al empezarlo
//   density          × cuántos obstáculos salen por segundo (las dos filas)
//   sky              el cielo: × su ritmo (density) y obstáculos de más en cada oleada (extraPerWave)
//   formations       probabilidad de que lo siguiente del cielo sea una formación (desde el Tigre)
//   unburnable       × el peso de lo que no se quema (muros y nubes de tormenta)
//   lives, maxLives  corazones al empezar y lo más que se puede tener (con comida)
//   keepLives        los corazones se conservan de un nivel al otro (si no, cada nivel empieza lleno)
//   fireMax          lo más que se puede cargar de bolas de fuego
//   cocktailEvery, foodEvery  cada cuántos segundos (al azar entre los dos) sale un cóctel o comida
//   restartFromHome  al perder se vuelve al primer nivel
//   trioRetry        un ingrediente del trío que se escapa vuelve a salir en un nivel posterior
//   score            multiplica todos los puntos
export const DIFFICULTIES = {
  easy: {
    boost: 0,
    ramp: 0.12,
    density: 1,
    sky: { density: 1, extraPerWave: 0 },
    formations: 0.2,
    unburnable: 1,
    lives: 3,
    maxLives: 3,
    keepLives: false,
    fireMax: 9,
    cocktailEvery: [6, 10],
    foodEvery: [12, 18],
    restartFromHome: false,
    trioRetry: true, // un ingrediente del trío que se escapa vuelve a salir más adelante (world/trio.js)
    score: 1,
  },
  hard: {
    boost: 70,
    ramp: 0.17,
    density: 1.1,
    sky: { density: 1.25, extraPerWave: 1 },
    formations: 0.35,
    unburnable: 1.4,
    lives: 2,
    maxLives: 3,
    keepLives: true,
    fireMax: 6,
    cocktailEvery: [7, 11],
    foodEvery: [15, 24],
    restartFromHome: true,
    trioRetry: false,
    score: 1.5,
  },
};

// Los 12 animales, en el orden de la Gran Carrera. Cada uno tiene su mundo (un nivel).
//   noGround  su mundo no tiene suelo: puro cielo, con nubes abajo (ahí siempre se vuela)
//   wings     vuela con sus alas; los demás, cuando tienen el poder de volar, en una nubecita
//   long      su cuerpo es largo y sigue el camino de la cabeza (solo el dibujo: la caja de choque es
//             la misma para todos los animales, para que HI RECORDS sea justo)
// hanzi: su símbolo (el carácter tradicional); simplified: su nombre en chino simplificado; pinyin:
// cómo se lee (los tres salen en la rueda del zodiaco, ui/ZodiacWheel.js). Sus cuatro virtudes están
// en los textos (virtues.<id> en js/i18n/).
// Colores provisionales: cielo (arriba y abajo), suelo (o nubes) y obstáculos de su mundo; el
// cuerpo del animal (body) y el de sus bolas de fuego (fire).
export const ZODIAC = [
  { id: 'rat', hanzi: '鼠', simplified: '鼠', pinyin: 'shǔ', sky: ['#141a33', '#2c3866'], ground: '#232842', obstacle: '#8d96c4', body: '#b9b6c9', fire: '#c7b8ff' },
  { id: 'ox', hanzi: '牛', simplified: '牛', pinyin: 'niú', sky: ['#1f1712', '#5a3f2a'], ground: '#3a2a1e', obstacle: '#c9a27a', body: '#8b5a3c', fire: '#ffb347' },
  { id: 'tiger', hanzi: '虎', simplified: '虎', pinyin: 'hǔ', sky: ['#24140a', '#8a4a16'], ground: '#3d220f', obstacle: '#f0a040', body: '#f08a24', fire: '#ff7a1a' },
  { id: 'rabbit', hanzi: '兔', simplified: '兔', pinyin: 'tù', sky: ['#1b1d2e', '#6c6fa0'], ground: '#2d2f48', obstacle: '#e8e6f5', body: '#f2eef7', fire: '#ff9ad5' },
  { id: 'dragon', hanzi: '龍', simplified: '龙', pinyin: 'lóng', noGround: true, wings: true, long: true, sky: ['#0d2224', '#1f6b62'], ground: '#cfe9e4', obstacle: '#5fd3b4', body: '#e8452c', fire: '#ff4d2e' },
  { id: 'snake', hanzi: '蛇', simplified: '蛇', pinyin: 'shé', long: true, sky: ['#13200f', '#3f6b2a'], ground: '#1f3317', obstacle: '#a8d36a', body: '#7cc04b', fire: '#9dff5c' },
  { id: 'horse', hanzi: '馬', simplified: '马', pinyin: 'mǎ', sky: ['#2a1414', '#8a3a2a'], ground: '#421f1a', obstacle: '#e07a5f', body: '#a0522d', fire: '#ffd23f' },
  { id: 'goat', hanzi: '羊', simplified: '羊', pinyin: 'yáng', sky: ['#1d2125', '#7d8a8f'], ground: '#33393d', obstacle: '#d8e0e2', body: '#e9e2cf', fire: '#fff4c2' },
  { id: 'monkey', hanzi: '猴', simplified: '猴', pinyin: 'hóu', sky: ['#22180c', '#9a7a2a'], ground: '#3a2c12', obstacle: '#f2d06b', body: '#c98a4b', fire: '#ffc14d' },
  { id: 'rooster', hanzi: '雞', simplified: '鸡', pinyin: 'jī', noGround: true, wings: true, sky: ['#2a0f12', '#b23a3a'], ground: '#f6d5c8', obstacle: '#ff8a5c', body: '#e23b3b', fire: '#ff5a5a' },
  { id: 'dog', hanzi: '狗', simplified: '狗', pinyin: 'gǒu', sky: ['#171a12', '#5f6a3a'], ground: '#2a2f1c', obstacle: '#c8b07a', body: '#d9a066', fire: '#5ad1ff' },
  { id: 'pig', hanzi: '豬', simplified: '猪', pinyin: 'zhū', sky: ['#24121c', '#a45a7c'], ground: '#3d1d2e', obstacle: '#f2a0c2', body: '#f4a6b8', fire: '#ff8fab' },
];

// Cuántos mundos hay antes de la pelea final: todos menos el del rival
export const WORLDS = 11;

/** El animal de un id ('rat', 'ox'...). */
export const signById = (id) => ZODIAC.find((sign) => sign.id === id) ?? null;

/**
 * El animal de un año. El año chino empieza entre el 21 de enero y el 20 de febrero: a quien nació
 * en enero o febrero le puede tocar el del año anterior (por eso la rueda deja ajustarlo).
 * 1900, 1912... 2020 son de la Rata.
 */
export const signOfYear = (year) => ZODIAC[(((year - 1900) % 12) + 12) % 12];

/** El rival de un animal: el que está enfrente en la rueda (los choques, 六冲). */
export const rivalOf = (id) => ZODIAC[(ZODIAC.findIndex((sign) => sign.id === id) + 6) % 12];

/**
 * El orden de los mundos para quien juega con el animal sign: empieza en el que sigue al suyo y
 * termina en el suyo (el nivel 11 es su mundo). El mundo de su rival no está: se guarda para el
 * final, el nivel 12 (bossLevel), así que son 11 mundos. Los mundos sin suelo nunca quedan entre los
 * primeros tres niveles: si les toca, cambian de lugar con el que está tres más adelante.
 */
export function worldOrder(sign = 'pig') {
  const start = ZODIAC.findIndex((s) => s.id === sign) + 1;
  const rival = rivalOf(sign);
  const order = ZODIAC.map((_, i) => ZODIAC[(start + i) % 12]).filter((world) => world !== rival);
  for (let i = 0; i < 3; i++) {
    if (order[i].noGround) [order[i], order[i + 3]] = [order[i + 3], order[i]];
  }
  return order;
}

/**
 * Los 11 mundos de una dificultad ('easy' | 'hard') para quien juega con el animal sign. Lo que
 * se aprieta (velocidad, obstáculos nuevos) depende del lugar del nivel, no del animal: el primer
 * mundo siempre es el más tranquilo.
 */
export function levelsFor(difficulty = 'easy', sign = 'pig') {
  const rules = DIFFICULTIES[difficulty];
  return worldOrder(sign).map((world, index) => {
    const ground = !world.noGround;
    const pace = CONFIG.speed.start + CONFIG.speed.perLevel * index;
    const speed = pace + rules.boost;
    return {
      index,
      id: world.id,
      nameKey: `zodiac.${world.id}`,
      ground,
      colors: world,
      length: Math.round((CONFIG.levelLength * speed) / pace),
      speed,
      ramp: rules.ramp,
      density: rules.density,
      pickups: { cocktail: rules.cocktailEvery, food: rules.foodEvery },
      lanes: { ground: ground ? groundLane(index, rules) : null, sky: skyLane(index, { ground, rules }) },
    };
  });
}

/**
 * El nivel 12, el último: la pelea contra el rival de quien juega (el de enfrente en la rueda), en el
 * mundo de ese rival. No tiene obstáculos ni fin por distancia: se gana al vencer al jefe
 * (entities/Boss.js). Todos vuelan, tengan o no la estrella. Salen cócteles seguido (para el fuego)
 * y de vez en cuando comida.
 */
export function bossLevel(difficulty = 'easy', sign = 'pig') {
  const rules = DIFFICULTIES[difficulty];
  const rival = rivalOf(sign);
  return {
    index: WORLDS,
    id: rival.id,
    nameKey: `zodiac.${rival.id}`,
    boss: true,
    ground: !rival.noGround, // contra el Dragón o el Gallo, en su cielo: sin suelo, como su mundo
    colors: rival,
    length: Infinity,
    speed: CONFIG.boss.speed + rules.boost,
    ramp: 0,
    density: rules.density,
    pickups: { ...CONFIG.boss.pickups[difficulty] },
    lanes: { ground: null, sky: null },
  };
}

/** Los 12 niveles: los 11 mundos y la pelea contra el rival. */
export const journeyFor = (difficulty = 'easy', sign = 'pig') => [...levelsFor(difficulty, sign), bossLevel(difficulty, sign)];
