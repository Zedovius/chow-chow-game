// El animal de quien juega según su fecha de nacimiento. El año chino no empieza el 1 de enero
// sino con el Año Nuevo lunar, entre el 21 de enero y el 20 de febrero: quien nació antes de esa
// fecha tiene el animal del año anterior. Por eso se pide el mes y el año, y el día solo cuando
// hace falta (si nació en el mes en que cayó el Año Nuevo de ese año).
//
// NEW_YEAR: el día del Año Nuevo chino de cada año, de 1924 a 2043, como MMDD
// (fuente: la tabla de años del zodiaco chino en Wikipedia).

import { signOfYear } from './levels.js';

export const FIRST_YEAR = 1924;
export const LAST_YEAR = 2043;

const NEW_YEAR = [
  // 1924–1933
  205, 124, 213, 202, 123, 210, 130, 217, 206, 126,
  // 1934–1943
  214, 204, 124, 211, 131, 219, 208, 127, 215, 205,
  // 1944–1953
  125, 213, 202, 122, 210, 129, 217, 206, 127, 214,
  // 1954–1963
  203, 124, 212, 131, 218, 208, 128, 215, 205, 125,
  // 1964–1973
  213, 202, 121, 209, 130, 217, 206, 127, 215, 203,
  // 1974–1983
  123, 211, 131, 218, 207, 128, 216, 205, 125, 213,
  // 1984–1993
  202, 220, 209, 129, 217, 206, 127, 215, 204, 123,
  // 1994–2003
  210, 131, 219, 207, 128, 216, 205, 124, 212, 201,
  // 2004–2013
  122, 209, 129, 218, 207, 126, 214, 203, 123, 210,
  // 2014–2023
  131, 219, 208, 128, 216, 205, 125, 212, 201, 122,
  // 2024–2033
  210, 129, 217, 206, 126, 213, 203, 123, 211, 131,
  // 2034–2043
  219, 208, 128, 215, 204, 124, 212, 201, 122, 210,
];

/** El Año Nuevo chino de un año: { month, day }. */
export function newYearOf(year) {
  const mmdd = NEW_YEAR[year - FIRST_YEAR];
  return { month: Math.floor(mmdd / 100), day: mmdd % 100 };
}

/** ¿Hace falta el día para saber el animal? Solo si nació en el mes del Año Nuevo de ese año. */
export const needsDay = (year, month) => newYearOf(year).month === month;

/** Cuántos días tiene un mes (month de 1 a 12). */
export const daysIn = (year, month) => new Date(year, month, 0).getDate();

/**
 * El animal ({ id, ... } de world/levels.js) de quien nació en year/month/day. Si no se sabe el día
 * y hacía falta, se toma el del año (el más probable en febrero; en enero, el día siempre se pide).
 */
export function signOfBirth(year, month, day = null) {
  const newYear = newYearOf(year);
  const before = month < newYear.month || (month === newYear.month && day !== null && day < newYear.day);
  return signOfYear(before ? year - 1 : year);
}
