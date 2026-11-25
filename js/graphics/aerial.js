// El color del fondo, con dos reglas de pintura para todo el escenario (montañas, objetos y gente al hornearlos,
// tools/sprites/mundos.mjs; suelo y cielo, graphics/floors.js):
//
//   valores             el fondo va más oscuro que lo que se juega (tone): los animales, los obstáculos y lo que
//                       se recoge son lo más claro de la pantalla. Al oscurecer no se pierde color: lo que más se
//                       oscurece vira hacia el tono de las sombras de ese mundo (dusk), como en la pintura (un
//                       amarillo oscuro sería olivo y se ve sucio; virado al carmín, se ve de atardecer).
//   perspectiva aérea   entre más lejos, menos contraste y más se parece todo al aire del horizonte, que tiene
//                       color (nunca gris).

const rgb = (hex) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
export const lum = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];

/** Hasta dónde llega la claridad (0 a 1) de cada parte del fondo. */
export const VALUES = { back: 0.36, sky: 0.46, glow: 0.62, lane: 0.36, edge: 0.52, light: 0.8, astro: 3 };

/**
 * Qué tan parientes son dos colores (0 a 1). Uno contrario al de las sombras no vira hacia él: se harían gris entre
 * los dos; conserva el suyo.
 */
function kinship(a, b) {
  const [u, v] = [a, b].map((c) => c.map((x) => x - lum(c)));
  const size = (w) => Math.hypot(...w);
  if (size(u) < 14) return 1;
  const same = (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / (size(u) * size(v));
  return Math.max(0, Math.min(1, (same + 0.35) / 1.35));
}

/** Un color con su claridad comprimida hasta top; lo que se oscurece vira hacia dusk y se satura un poco. */
export function tone(c, top = VALUES.back, dusk = null) {
  const l = lum(c) / 255;
  if (l < 0.004) return c;
  const k = (top * (1 - Math.exp(-l / top))) / l;
  let out = [c[0] * k, c[1] * k, c[2] * k];
  const g = lum(c) * k;
  if (dusk) out = mix(out, dusk.map((v) => (v * g) / lum(dusk)), Math.min(0.36, (1 - k) * 0.55) * kinship(c, dusk));
  return out.map((v) => Math.max(0, Math.min(255, g + (v - g) * 1.22)));
}

/** Cuánto aire hay entre quien mira y algo a una distancia s (0: el horizonte; 1: el camino). */
const airAt = (s) => 0.82 * Math.max(0, 1 - s) ** 0.85;

/** Cómo se ve a lo lejos en un mundo (gradient, world/scenery.js): base, el aire en el horizonte; k(s), cuánto hay. */
export function viewOf({ gradient, sky }) {
  const [, mid, low] = sky.map(rgb);
  return { base: rgb(gradient.air), dusk: rgb(gradient.dusk), top: mix(mid, low, 0.6), k: (s) => airAt(s) * (gradient.haze ?? 0.4) };
}

/** Un color visto a través de k de aire. */
export const aerial = (c, air, k) => mix(c, air, k);
