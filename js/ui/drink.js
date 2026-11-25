// El trago del signo de quien juega, en chico: su vaso, «Tu trago», su nombre y qué lleva. Sale al escribir el
// nombre en HI RECORDS (ui/NameEntry.js), después de verlo en grande (ui/drinkScreen.js).

import { cocktailOf } from '../world/cocktails.js';
import { glassSheet, SHEET } from '../graphics/glassArt.js';
import { t } from '../i18n/i18n.js';

function element(tag, className, text = '') {
  const el = document.createElement(tag);
  el.className = className;
  if (text) el.textContent = text;
  return el;
}

/** El trago de un signo ('rat', 'ox'...) como elemento, o null si no tiene. */
export function drinkNode(sign) {
  const drink = cocktailOf(sign);
  if (!drink) return null;
  const box = element('div', 'drink');
  box.setAttribute('role', 'img');
  box.setAttribute('aria-label', t('drink.aria', { name: drink.name, parts: t(`drinks.${sign}`) }));

  // Un cuadro de su hoja
  const icon = element('span', 'drink__icon');
  icon.style.backgroundImage = `url("${new URL(glassSheet(sign), document.baseURI).href}")`;
  icon.style.setProperty('--columns', String(SHEET.columns));
  icon.setAttribute('aria-hidden', 'true');

  const text = element('div', 'drink__text');
  text.setAttribute('aria-hidden', 'true');
  text.append(element('p', 'drink__label', t('drink.label')), element('p', 'drink__name', drink.name), element('p', 'drink__parts', t(`drinks.${sign}`)));
  box.append(icon, text);
  return box;
}
