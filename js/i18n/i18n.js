// Internacionalización: el jugador elige entre español e inglés.
//
// - Los textos viven en un diccionario plano por idioma (es.js, en.js), con claves con puntos.
// - En el HTML:
//     data-i18n="clave"                        → textContent
//     data-i18n-html="clave"                   → innerHTML (solo textos de nuestros diccionarios)
//     data-i18n-attr="aria-label:clave; title:clave"  → atributos
// - En JS: t('clave', { variable }) y onLanguageChange(fn) para refrescar lo dinámico.
// - Idioma inicial: ?lang=en en la URL → el que eligió el jugador → el del navegador → español.

import { es } from './es.js';
import { en } from './en.js';

const DICTIONARIES = { es, en };
const FALLBACK = 'es';
const STORAGE_KEY = 'chowchow.lang';
const listeners = new Set();
const warned = new Set();

export const LANGUAGES = Object.keys(DICTIONARIES);

function readStored() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function store(code) {
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // Sin almacenamiento: la elección dura solo esta visita.
  }
}

function detect() {
  const fromUrl = new URLSearchParams(location.search).get('lang');
  const candidates = [fromUrl, readStored(), ...(navigator.languages ?? [navigator.language])];
  for (const candidate of candidates) {
    const code = candidate?.slice(0, 2).toLowerCase();
    if (code && DICTIONARIES[code]) return code;
  }
  return FALLBACK;
}

let current = detect();

export function getLanguage() {
  return current;
}

/** Texto traducido. Si falta en el idioma actual, usa el español y avisa una vez. */
export function t(key, params) {
  let text = DICTIONARIES[current][key] ?? DICTIONARIES[FALLBACK][key];
  if (text === undefined) {
    if (!warned.has(key)) {
      warned.add(key);
      console.warn(`[Chow Chow] Falta la traducción "${key}"`);
    }
    return key;
  }
  if (params) {
    text = text.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
  }
  return text;
}

export function setLanguage(code) {
  if (!DICTIONARIES[code] || code === current) return;
  current = code;
  store(code);
  applyLanguage();
  for (const fn of listeners) fn(code);
}

export function onLanguageChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function translateDom(root = document) {
  for (const el of root.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const el of root.querySelectorAll('[data-i18n-html]')) el.innerHTML = t(el.dataset.i18nHtml);
  for (const el of root.querySelectorAll('[data-i18n-attr]')) {
    for (const pair of el.dataset.i18nAttr.split(';')) {
      const [attr, key] = pair.split(':').map((part) => part.trim());
      if (attr && key) el.setAttribute(attr, t(key));
    }
  }
}

/** Aplica el idioma actual a todo el documento: lang, título, descripción y textos. */
export function applyLanguage() {
  document.documentElement.lang = current;
  document.title = t('meta.title');
  document.querySelector('meta[name="description"]')?.setAttribute('content', t('meta.description'));
  translateDom();
}
