// La clasificación: los mejores puntajes de quienes llegaron al final, una tabla por dificultad.
// Se guarda en este navegador (localStorage), así que cada dispositivo tiene sus propias tablas.
// En empates, el puntaje más antiguo conserva el lugar.

import { CONFIG } from '../config.js';

const { storageKey, size, nameLength } = CONFIG.leaderboard;

/** Solo lo que parece un registro válido, ordenado y sin pasar del tamaño de la tabla. */
function clean(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((entry) => typeof entry?.name === 'string' && Number.isFinite(entry.score) && entry.score > 0)
    .map(({ name, score }) => ({ name: name.slice(0, nameLength), score: Math.floor(score) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, size);
}

export function loadBoards() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    return { easy: clean(saved?.easy), hard: clean(saved?.hard) };
  } catch {
    return { easy: [], hard: [] };
  }
}

/** El lugar (1 = el primero) que le daría a score esta tabla; 0 si no entra. */
export function placeIn(entries, score) {
  if (score <= 0) return 0;
  const place = entries.filter((entry) => entry.score >= score).length + 1;
  return place <= size ? place : 0;
}

/** Guarda un registro en la tabla de su dificultad. */
export function addScore(difficulty, name, score) {
  const boards = loadBoards();
  const entries = boards[difficulty];
  const place = placeIn(entries, score);
  if (!place) return;
  entries.splice(place - 1, 0, { name, score: Math.floor(score) });
  boards[difficulty] = entries.slice(0, size);
  try {
    localStorage.setItem(storageKey, JSON.stringify(boards));
  } catch {
    // Sin almacenamiento, el registro no se guarda; el juego sigue igual
  }
}
