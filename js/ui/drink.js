// El trago del signo de quien juega, para el final del viaje: su icono, «Tu trago», su nombre (con
// «Ejemplo» mientras sea provisional, ver world/cocktails.js) y sus tres ingredientes. Sale al
// escribir el nombre en HI RECORDS (ui/NameEntry.js) o, si no entró a la tabla, en el diálogo final.

import { cocktailOf, SAMPLE } from '../world/cocktails.js';
import { IMAGES } from '../graphics/assets.js';
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
  const parts = { ferment: t(`ingredient.${drink.ferment}`), mexican: t(`ingredient.${drink.mexican}`), chinese: t(`ingredient.${drink.chinese}`) };
  const box = element('div', 'drink');
  box.setAttribute('role', 'img');
  box.setAttribute('aria-label', t(SAMPLE ? 'drink.ariaSample' : 'drink.aria', { name: drink.name, ...parts }));

  // Su icono: el del bar, si ya lo hay (drink.icon); si no, el vaso genérico
  const icon = element('img', 'drink__icon');
  icon.src = drink.icon ?? IMAGES.drink;
  icon.alt = '';
  icon.setAttribute('aria-hidden', 'true');

  const text = element('div', 'drink__text');
  text.setAttribute('aria-hidden', 'true');
  const name = element('p', 'drink__name', drink.name);
  if (SAMPLE) name.append(element('span', 'drink__sample', t('cocktail.sample')));
  text.append(element('p', 'drink__label', t('drink.label')), name, element('p', 'drink__parts', [parts.ferment, parts.mexican, parts.chinese].join(' · ')));
  box.append(icon, text);
  return box;
}
