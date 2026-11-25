// Las tres cualidades de un trago, como en la carta: una línea con sus rayas y un punto en cuánto.

import { t } from '../i18n/i18n.js';

/** La lista de cualidades de un trago (taste de world/cocktails.js). */
export function tasteNode(taste) {
  const list = document.createElement('ul');
  list.className = 'taste';
  for (const [id, amount] of taste) {
    const row = document.createElement('li');
    row.className = 'taste__row';
    const label = document.createElement('span');
    label.className = 'taste__label';
    label.textContent = t(`taste.${id}`);
    const bar = document.createElement('span');
    bar.className = 'taste__bar';
    bar.style.setProperty('--amount', String(amount));
    bar.setAttribute('role', 'img');
    bar.setAttribute('aria-label', `${Math.round(amount * 100)} %`);
    row.append(label, bar);
    list.append(row);
  }
  return list;
}
