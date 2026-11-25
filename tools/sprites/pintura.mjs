// Cómo se pinta lo del fondo, para que sea de su mundo: pinceladas, sombras al tono de su tinta, brillos a su filo
// de luz, su perspectiva aérea y sus valores (js/graphics/aerial.js).

import { aerial, tone, VALUES, viewOf } from '../../js/graphics/aerial.js';
import { fbm } from './ruido.mjs';

const rgb = (hex) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
const mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
const lum = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
export const round = (c) => c.map((v) => Math.max(0, Math.min(255, Math.round(v))));

/** Pinta las capas de una pieza con k de aire. */
export function grade(layers, scenery, k) {
  const [ink, rim] = [scenery.rock.ink, scenery.rock.rim].map(rgb);
  const { base, dusk } = viewOf(scenery);
  for (const { w, h, data } of layers) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (!data[i + 3]) continue;
        let c = [data[i], data[i + 1], data[i + 2]];
        const l = lum(c) / 255;
        // Las luces (faroles, fuego, neón) atraviesan el aire y son lo único claro del fondo
        const glow = Math.max(...c) > 215 && Math.max(...c) - Math.min(...c) > 85;
        const brush = 0.86 + 0.22 * fbm(x * 0.4, y * 0.28, 3, 2);
        c = c.map((v) => v * brush);
        if (l < 0.42) c = mix(c, ink, (0.42 - l) * 1.3);
        if (l > 0.58) c = mix(c, rim, Math.min(0.28, (l - 0.58) * 0.8));
        data.set(round(tone(aerial(c, base, glow ? k * 0.5 : k), glow ? VALUES.light * (1 - k * 0.5) : VALUES.back, glow ? null : dusk)), i);
      }
    }
  }
  return layers;
}

/** El resplandor de una luz sobre una imagen, por escalones (como pixeles): aclara lo que hay y tiñe el aire de junto. */
export function halo({ w, h, data }, cx, cy, r, color, alpha) {
  // Sobre lo oscuro, el aire se tiñe de su color más puro: si no, el resplandor se ve gris
  const pure = round(color.map((v) => lum(color) * 0.92 + (v - lum(color)) * 1.75));
  for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(h - 1, cy + r); y++) {
    for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(w - 1, cx + r); x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / r;
      if (d >= 1) continue;
      const a = (Math.ceil((1 - d) ** 1.7 * 5) / 5) * alpha;
      const i = (y * w + x) * 4;
      const under = data[i + 3] / 255;
      if (under > 0.99) for (let k = 0; k < 3; k++) data[i + k] += (255 - data[i + k]) * (color[k] / 255) * a * 0.8;
      else {
        const out = a + under * (1 - a);
        for (let k = 0; k < 3; k++) data[i + k] = (pure[k] * a + data[i + k] * under * (1 - a)) / out;
        data[i + 3] = Math.round(out * 255);
      }
    }
  }
}

/**
 * Las luces de una pieza (Model.light), ya pintada: cada una en la capa donde está, apenas delante de lo que alumbra.
 * Entre más lejos (k de aire), más tenues y más del color del aire.
 */
export function glows(layers, lights, scenery, k, { anchor, depth, step }) {
  if (!lights.length) return layers;
  let last = 0;
  layers.forEach(({ data }, n) => {
    for (let i = 3; i < data.length; i += 4) if (data[i]) last = n;
  });
  const { base } = viewOf(scenery);
  for (const { x, y, z, r, color, alpha } of lights) {
    const n = Math.max(0, Math.min(last, Math.ceil((z + depth) / step)));
    halo(layers[n], anchor[0] + x, anchor[1] - y, r, mix(rgb(color), base, k * 0.35), alpha * (1 - k * 0.5));
  }
  return layers;
}
