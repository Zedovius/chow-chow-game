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
