// Los 12 niveles, uno por animal del zodiaco chino, y las reglas de cada dificultad.
// Cada nivel es un poco más rápido y trae obstáculos nuevos (world/obstacles.js). En todos se puede
// volar; los del Dragón y el Gallo no tienen suelo (ground: false): puro cielo, con nubes abajo.
// Los colores son provisionales; el arte irá después.

import { CONFIG } from '../config.js';
import { groundLane, skyLane } from './obstacles.js';

// speed: × la velocidad de los niveles; density: × cuántos obstáculos salen por segundo; score:
// multiplica todos los puntos; pearlsPerLife: cada tantas perlas, un corazón más (0 = nunca);
// restartFromHome: al perder se vuelve al primer nivel
export const DIFFICULTIES = {
  easy: { speed: 1, density: 1, lives: 3, restartFromHome: false, score: 1, pearlsPerLife: 0 },
  hard: { speed: 1.08, density: 1.2, lives: 1, restartFromHome: true, score: 1.5, pearlsPerLife: 2 },
};

// ground: false = sin suelo. Colores provisionales: cielo (arriba y abajo), suelo (o nubes) y
// obstáculos
export const ZODIAC = [
  { id: 'rat', sky: ['#141a33', '#2c3866'], ground: '#232842', obstacle: '#8d96c4' },
  { id: 'ox', sky: ['#1f1712', '#5a3f2a'], ground: '#3a2a1e', obstacle: '#c9a27a' },
  { id: 'tiger', sky: ['#24140a', '#8a4a16'], ground: '#3d220f', obstacle: '#f0a040' },
  { id: 'rabbit', sky: ['#1b1d2e', '#6c6fa0'], ground: '#2d2f48', obstacle: '#e8e6f5' },
  { id: 'dragon', noGround: true, sky: ['#0d2224', '#1f6b62'], ground: '#cfe9e4', obstacle: '#5fd3b4' },
  { id: 'snake', sky: ['#13200f', '#3f6b2a'], ground: '#1f3317', obstacle: '#a8d36a' },
  { id: 'horse', sky: ['#2a1414', '#8a3a2a'], ground: '#421f1a', obstacle: '#e07a5f' },
  { id: 'goat', sky: ['#1d2125', '#7d8a8f'], ground: '#33393d', obstacle: '#d8e0e2' },
  { id: 'monkey', sky: ['#22180c', '#9a7a2a'], ground: '#3a2c12', obstacle: '#f2d06b' },
  { id: 'rooster', noGround: true, sky: ['#2a0f12', '#b23a3a'], ground: '#f6d5c8', obstacle: '#ff8a5c' },
  { id: 'dog', sky: ['#171a12', '#5f6a3a'], ground: '#2a2f1c', obstacle: '#c8b07a' },
  { id: 'pig', sky: ['#24121c', '#a45a7c'], ground: '#3d1d2e', obstacle: '#f2a0c2' },
];

/** Los 12 niveles de una dificultad ('easy' | 'hard'). */
export function levelsFor(difficulty = 'easy') {
  const rules = DIFFICULTIES[difficulty];
  return ZODIAC.map((sign, index) => {
    const ground = !sign.noGround;
    return {
      index,
      id: sign.id,
      nameKey: `zodiac.${sign.id}`,
      ground,
      colors: sign,
      length: CONFIG.levelLength,
      speed: (CONFIG.speed.start + CONFIG.speed.perLevel * index) * rules.speed,
      density: rules.density,
      lanes: { ground: ground ? groundLane(index) : null, sky: skyLane(index, { ground }) },
    };
  });
}
