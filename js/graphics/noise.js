// Ruido con semilla para los mundos: siempre da lo mismo. Lo usan el juego (suelos y cielos) y las herramientas.

/** Un número de 0 a 1 para un entero (o dos) y una semilla. */
export function hash(x, y = 0, seed = 0) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Ruido suave en dos dimensiones, de 0 a 1. */
export function noise(x, y = 0, seed = 0) {
  const [xi, yi] = [Math.floor(x), Math.floor(y)];
  const s = (k) => k * k * (3 - 2 * k);
  const [u, v] = [s(x - xi), s(y - yi)];
  const top = hash(xi, yi, seed) * (1 - u) + hash(xi + 1, yi, seed) * u;
  const bottom = hash(xi, yi + 1, seed) * (1 - u) + hash(xi + 1, yi + 1, seed) * u;
  return top * (1 - v) + bottom * v;
}

/** Ruido con varias octavas. */
export function fbm(x, y = 0, seed = 0, octaves = 3) {
  let [sum, amp, total] = [0, 1, 0];
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise(x * 2 ** i, y * 2 ** i, seed + i * 17);
    total += amp;
    amp *= 0.5;
  }
  return sum / total;
}

/** Ruido suave que se repite cada period (en x). */
export function tiled(x, y, period, seed = 0) {
  const [xi, yi] = [Math.floor(x), Math.floor(y)];
  const s = (k) => k * k * (3 - 2 * k);
  const [u, v] = [s(x - xi), s(y - yi)];
  const wrap = (n) => ((n % period) + period) % period;
  const [a, b] = [wrap(xi), wrap(xi + 1)];
  const top = hash(a, yi, seed) * (1 - u) + hash(b, yi, seed) * u;
  const bottom = hash(a, yi + 1, seed) * (1 - u) + hash(b, yi + 1, seed) * u;
  return top * (1 - v) + bottom * v;
}
