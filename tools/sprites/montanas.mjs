// Montañas como las de las pinturas chinas antiguas (shan shui): columnas muy verticales, de punta
// redondeada, con sus trazos de tinta a lo largo, pinos en las cimas y la base perdida en la niebla. Con el
// estilo de la Rata jefe: pinceladas, sombras profundas hacia el violeta y un filo de luz en la orilla.
// Cada una sale en capas de profundidad (las de enfrente, más angostas), para el sprite stacking.

import { aerial, tone } from '../../js/graphics/aerial.js';
import { image } from './png.mjs';
import { fbm, hash, noise } from './ruido.mjs';

const mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
const rgb = (hex) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));

/**
 * Un grupo de columnas. w, h: el tamaño; seed; layers: cuántas capas; style:
 *   ink, shade, rock, light, rim, moss   de la sombra más honda al filo de luz, y lo verde de arriba
 *   air, airAmount             el aire (graphics/aerial.js) y cuánto hay de por medio (más, más lejos)
 *   gradient                   de la cima a la base: { top, mid, base }, como en el paisaje azul y verde chino
 *                              (la luz y la sombra salen de ese color, no del de la piedra)
 *   detail                     cuánto se ven sus pinceladas, su filo y su tinta (menos, más lejos)
 *   count, width               cuántas columnas y qué tan anchas (de 0 a 1 del tamaño)
 *   bands                      franjas de color a lo alto (los cerros de colores): [color, color...]
 *   trees, treeSize, fall      cuántos pinos y de qué tamaño, y si lleva cascada
 */
export function mountain({ w, h, seed, layers, style }) {
  const pillars = [];
  const count = style.count ?? 3;
  for (let i = 0; i < count; i++) {
    const tall = i === 0 ? 1 : 0.38 + 0.5 * hash(i, 1, seed);
    const half = (style.width ?? 0.12) * w * (i === 0 ? 0.8 : 0.5 + 0.4 * hash(i, 2, seed));
    const side = i === 0 ? 0 : (i % 2 ? 1 : -1) * (0.17 + 0.13 * Math.floor((i + 1) / 2) + 0.05 * hash(i, 3, seed));
    const reach = half * 3 + 5; // que no se corte en la orilla
    pillars.push({ x: Math.max(reach, Math.min(w - reach, w * (0.5 + side * 0.95) + (hash(i, 4, seed) - 0.5) * 3)), top: h * (1 - tall) + 7, half, seed: seed * 31 + i * 7, depth: i === 0 ? 0.5 : hash(i, 5, seed), main: i === 0 });
  }
  // Ninguna columna va sola: lleva pegadas otras, casi de su altura o en escalera, así la cima es una cresta
  // quebrada de rocas redondas. Las de la cresta, del mismo ancho; las de abajo, más angostas
  for (const p of [...pillars]) {
    const first = hash(1, 41, p.seed) > 0.5 ? 1 : -1;
    const add = (side, n, drop, wide, away) => pillars.push({
      x: p.x + side * p.half * (away + 0.25 * hash(n, 42, p.seed)),
      top: p.top + p.half * (drop + 0.5 * hash(n, 43, p.seed)),
      half: p.half * (wide + 0.2 * hash(n, 44, p.seed)),
      seed: p.seed + 3 + n, depth: p.depth + (n % 2 ? 0.02 : -0.02), main: false, small: n !== 1,
    });
    add(first, 1, 0.25, 0.82, 1.05); // la otra mitad de la cresta
    add(first, 2, 1.7, 0.7, 1.95);
    add(-first, 3, 1.1, 0.72, 0.95);
    if (hash(2, 41, p.seed) > 0.5) add(-first, 4, 3, 0.6, 1.7);
  }
  pillars.sort((a, b) => a.depth - b.depth);
  const [ink, shade, rock, light, rim, moss] = [style.ink, style.shade, style.rock, style.light, style.rim, style.moss].map(rgb);
  const detail = style.detail ?? 1;
  const bands = style.bands?.map(rgb);
  // El ancho a cada altura, de cada lado (side: -1 o 1): la cima es redonda pero dispareja (un hombro cae antes
  // que el otro), y la roca baja por repisas, más ancha hacia abajo
  const halfAt = (p, y, side) => {
    const t = y - p.top;
    if (t < 0) return 0;
    const own = side > 0 ? 2 : 1;
    const dome = p.half * (0.75 + 1.15 * hash(own, 31, p.seed));
    const power = 2 + 0.9 * hash(own, 34, p.seed);
    const round = (1 - (1 - Math.min(1, t / dome)) ** power) ** (1 / power);
    let wide = 0.84;
    for (let j = 0; j < 4; j++) { // las repisas
      const at = h * (0.1 + 0.2 * j + 0.14 * hash(own * 5 + j, 35, p.seed));
      wide += (0.04 + 0.1 * hash(own * 5 + j, 36, p.seed)) * Math.min(1, Math.max(0, (t - at) / 2.5));
    }
    const rough = 1 + 0.16 * (noise(t * 0.11, own * 3, p.seed) - 0.5) + 0.12 * (noise(t * 0.5, own * 7, p.seed) - 0.5);
    return p.half * round * wide * rough * (1 + 0.16 * (t / h) ** 2);
  };
  const lean = (p, y) => p.x + 3.4 * (noise(y * 0.026, 9, p.seed) - 0.5) * 2;

  const out = Array.from({ length: layers }, () => image(w, h));
  const put = (img, x, y, col, alpha = 255) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = (y * w + x) * 4;
    if (alpha < 255 && img.data[i + 3] >= alpha) return;
    img.data.set([...col.map((v) => Math.round(Math.max(0, Math.min(255, v)))), alpha], i);
  };
  const far = (col, y, fade = 0) => tone(aerial(col, mix(style.air.top, style.air.base, Math.max(0, Math.min(1, y / h)) ** 1.1), Math.min(0.97, style.airAmount + (1 - style.airAmount) * fade * 0.5)), undefined, style.air.dusk);
  const slope = style.gradient && [style.gradient.top, style.gradient.mid, style.gradient.base].map(rgb);
  // El color de la pintura a cada altura (t: 0 en la cima, 1 en la base)
  const wash = (t) => (t < 0.5 ? mix(slope[0], slope[1], t * 2) : mix(slope[1], slope[2], Math.min(1, (t - 0.5) * 2)));
  for (const p of pillars) {
    for (let y = Math.max(0, Math.floor(p.top)); y < h; y++) {
      const [left, right] = [halfAt(p, y + 0.5, -1), halfAt(p, y + 0.5, 1)];
      const cx = lean(p, y);
      const fade = Math.max(0, (y - h * 0.5) / (h * 0.5));
      for (let x = Math.floor(cx - left); x <= Math.ceil(cx + right); x++) {
        const n = (x + 0.5 - cx) / (x + 0.5 < cx ? left : right); // de -1 (izquierda, la luz) a 1 (derecha, la sombra)
        if (Math.abs(n) >= 1) continue;
        // Pinceladas: manchas alargadas que bajan por la piedra, y grietas de tinta
        const flow = x + (y - p.top) * 0.08 * Math.sin(y * 0.045 + p.seed);
        const brush = fbm(flow * 0.34, y * 0.075, p.seed, 3);
        const strokes = fbm(flow * 0.9, y * 0.09, p.seed + 5, 2);
        const crack = noise(flow * 0.6, y * 0.07, p.seed + 3);
        const top = Math.max(0, 1 - (y - p.top) / (p.half * 1.5));
        let tone = 0.5 - n * 0.42 + top * 0.2 + ((brush - 0.5) * 0.75 + (strokes - 0.5) * 0.35) * detail - fade * 0.1;
        if (crack > 0.74) tone -= 0.3 * detail;
        let base = rock;
        if (bands) base = bands[Math.floor(((y * 0.13 + noise(x * 0.1, y * 0.05, seed) * 2.4) % bands.length + bands.length) % bands.length)];
        let col;
        let [dark, mids, high] = [shade, base, light];
        if (slope) {
          const t = Math.max(0, Math.min(1, (y - p.top) / (h - p.top) + (brush - 0.5) * 0.16 + (strokes - 0.5) * 0.06));
          mids = wash(t);
          if (bands) mids = mix(mids, base, 0.34 * detail * (1 - t)); // los cerros de colores
          // Los estratos de la roca, un poco inclinados y quebrados
          const layer = ((y + x * 0.22 + noise(x * 0.14, y * 0.1, seed) * 5) % 9 + 9) % 9;
          if (layer < 1.3) mids = mix(mids, ink, 0.2 * (0.25 + 0.75 * detail));
          else if (layer < 2.4) mids = mix(mids, rim, 0.14 * (0.25 + 0.75 * detail));
          base = mids;
          dark = mix(mids, ink, 0.42 * (0.35 + 0.65 * detail));
          high = mix(mids, rim, 0.42 * (0.35 + 0.65 * detail));
          if (tone < 0.2) col = mix(mids, ink, 0.62 * (0.3 + 0.7 * detail));
          else if (tone < 0.36) col = dark;
          else if (tone < 0.52) col = mix(dark, mids, 0.55);
          else if (tone < 0.72) col = mids;
          else if (tone < 0.9) col = mix(mids, high, 0.55);
          else col = high;
        } else if (tone < 0.2) col = mix(ink, base, 0.06);
        else if (tone < 0.36) col = mix(shade, base, 0.14);
        else if (tone < 0.52) col = mix(shade, base, 0.55);
        else if (tone < 0.72) col = base;
        else if (tone < 0.9) col = mix(base, light, 0.5);
        else col = light;
        // Musgo en la cima y en las cornisas, oscuro donde no le da la luz
        const ledge = fbm(x * 0.17, y * 0.13, p.seed + 8, 2);
        if (slope) {
          if (y - p.top < p.half * (0.25 + 0.5 * brush) && strokes > 0.42) col = mix(col, high, 0.5);
        } else if ((y - p.top < p.half * (0.35 + 0.75 * brush) && strokes > 0.34) || (ledge > 0.66 && strokes > 0.42)) col = mix(col, tone > 0.6 ? mix(moss, light, 0.25) : tone > 0.36 ? moss : mix(moss, ink, 0.55), 0.85);
        // El filo de luz en la orilla izquierda y la cima, y la tinta en la derecha
        const edgeLeft = x - (cx - left);
        const edgeRight = cx + right - x;
        const broken = noise(x * 0.5, y * 0.16, p.seed + 12);
        if (edgeRight < 1.6) col = mix(col, slope ? mix(mids, ink, 0.55) : mix(ink, shade, 0.3), detail);
        else if (edgeLeft < 1.1 && broken > 0.24) col = mix(col, slope ? mix(high, rim, 0.6) : mix(light, rim, 0.75), detail);
        else if (edgeLeft < 2.1 && broken > 0.55) col = mix(col, mix(base, light, 0.6), detail);
        else if (y - p.top < 1.2) col = mix(col, slope ? mix(high, rim, 0.6) : rim, detail);
        col = far(col, y, fade);
        // La base se pierde en la niebla, por escalones
        let alpha = fade < 0.3 ? 255 : Math.max(0, Math.round((1 - (fade - 0.3 + (brush - 0.5) * 0.28) / 0.7) * 5) * 51);
        // Lo lejano no tiene orillas duras
        const cover = Math.min(edgeLeft, edgeRight, (y + 0.5 - p.top) * 1.2);
        const soft = 1 + (1 - detail) * 1.6;
        if (detail < 0.9 && cover < soft) alpha = Math.round(alpha * Math.max(0.2, Math.round((cover / soft) * 4) / 4));
        if (alpha <= 0) continue;
        for (let layer = 0; layer < layers; layer++) if (layer === 0 || Math.abs(n) <= Math.sqrt(1 - (layer / layers) ** 2)) put(out[layer], x, y, col, Math.min(255, alpha));
      }
    }
    // Una cascada por una grieta
    if (style.fall && p.main) {
      const y0 = Math.round(p.top + p.half * 1.8);
      for (let y = y0; y < h * 0.86; y++) {
        const x = Math.round(lean(p, y) - p.half * 0.05 + Math.sin(y * 0.14) * 0.8);
        const wide = 1 + Math.floor((y - y0) / 24);
        for (let k = -1; k <= wide; k++) {
          const foam = k === -1 || k === wide ? mix(light, rock, 0.4) : noise((x + k) * 1.3, y * 0.5, seed) > 0.42 ? [255, 255, 255] : light;
          for (const img of out) put(img, x + k, y, far(foam, y), 255);
        }
      }
    }
    // Pinos en la cima: un tronco torcido y copas de varias nubes, oscuras con su filo de luz
    const trees = p.small ? Math.min(1, style.trees ?? 2) : (style.trees ?? 2);
    for (let i = 0; i < trees; i++) {
      const at = trees === 1 ? (hash(i, 6, p.seed) - 0.5) * 0.7 : (i / (trees - 1) - 0.5) * 1.3 + (hash(i, 6, p.seed) - 0.5) * 0.3;
      const x0 = lean(p, p.top) + at * p.half;
      const y0 = Math.round(p.top + p.half * 1.5 * (1 - Math.sqrt(Math.max(0, 1 - Math.min(0.96, at * at)))) + 1);
      if (y0 > h * 0.6) continue; // abajo se pierde en la bruma
      const size = (0.75 + 0.5 * hash(i, 7, p.seed)) * (style.treeSize ?? 1);
      const dir = at > 0.05 ? 1 : at < -0.05 ? -1 : hash(i, 8, p.seed) > 0.5 ? 1 : -1;
      const trunk = Math.round(4.6 * size);
      const front = out.slice(0, Math.max(1, layers - 1));
      const bark = far(mix(ink, shade, 0.25), y0);
      for (let k = 0; k <= trunk; k++) for (const img of front) put(img, Math.round(x0 + dir * (k * 0.35 + Math.sin(k * 0.9) * 0.5)), y0 - k, bark);
      for (const [kx, ky, rx, ry] of [[0.6, trunk, 2.9, 1.3], [3, trunk * 0.72, 2.2, 1], [-1.6, trunk * 0.82, 1.9, 0.95], [1.8, trunk * 1.3, 1.7, 0.9]]) {
        const px = x0 + dir * (kx + trunk * 0.3);
        const py = y0 - ky;
        for (let yy = Math.floor(py - ry * size - 1); yy <= Math.ceil(py + ry * size); yy++) {
          for (let xx = Math.floor(px - rx * size - 1); xx <= Math.ceil(px + rx * size + 1); xx++) {
            const [u, v] = [(xx + 0.5 - px) / (rx * size), (yy + 0.5 - py) / (ry * size)];
            if (u * u + v * v > 1 + (noise(xx * 0.9, yy * 0.9, p.seed + i) - 0.5) * 0.7) continue;
            const col = v < -0.25 && u < 0.5 ? mix(moss, rim, 0.4) : v < 0.35 ? moss : mix(moss, ink, 0.65);
            for (const img of front) put(img, xx, yy, far(col, yy));
          }
        }
      }
    }
  }
  return out;
}
