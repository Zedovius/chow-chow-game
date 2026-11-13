// Las tablas de la clasificación en HTML: se usan en la pantalla de inicio, en su diálogo y mientras
// se escribe el nombre al final. Los tres primeros lugares van en oro, plata y bronce (styles.css).

import { CONFIG } from '../config.js';
import { loadBoards } from '../core/scores.js';
import { t } from '../i18n/i18n.js';
import { pad } from './HUD.js';

const { size, nameLength } = CONFIG.leaderboard;

function cell(className, text) {
  const span = document.createElement('span');
  span.className = className;
  span.textContent = text;
  return span;
}

/** Una tabla, siempre con todos sus lugares. mine: el lugar que se está escribiendo (se resalta). */
export function boardNode(title, entries, { mine = 0 } = {}) {
  const box = document.createElement('section');
  box.className = 'board';
  const heading = document.createElement('h3');
  heading.className = 'board__title';
  heading.textContent = title;
  const list = document.createElement('ol');
  list.className = 'board__list';
  for (let i = 0; i < size; i++) {
    const entry = entries[i];
    const row = document.createElement('li');
    row.className = `board__row board__row--${i + 1}`;
    row.classList.toggle('board__row--empty', !entry);
    row.classList.toggle('board__row--mine', i + 1 === mine);
    row.append(
      cell('board__place', `${i + 1}`),
      cell('board__name', entry?.name ?? '-'.repeat(nameLength)),
      cell('board__score', pad(entry?.score ?? 0)),
    );
    list.append(row);
  }
  box.append(heading, list);
  return box;
}

/** Las dos tablas, con lo que haya guardado en este momento. */
export function boardsNode() {
  const boards = loadBoards();
  const box = document.createElement('div');
  box.className = 'boards';
  box.append(boardNode(t('difficulty.easy'), boards.easy), boardNode(t('difficulty.hard'), boards.hard));
  return box;
}
