// Los mares de nubes de los mundos sin suelo (Dragón y Gallo): bancos de nubes a distintas distancias, hechos de
// bolas y rebanados en capas, con los rizos de las pinturas chinas. mundos.mjs los hornea (ROWS: a qué distancia
// va cada fila) y graphics/worldPainter.js los apila de lejos a cerca, con parallax.

import { lerp, TAU } from './modelo3d.mjs';
import { make } from './piezas.mjs';
import { hash } from './ruido.mjs';

const rgb = (hex) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
const hex = (c) => `#${c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`;
const STEPS = 14;

/**
 * Un banco de nubes, de base plana en y = 0. half: medio ancho; tall: su alto; colors: { top, mid, low }, de la
 * cresta a la panza, en un degradado suave (sin contornos ni manchas duras: que no parezcan piedras).
 */
export function bank(seed, { half = 46, tall = 22, puffs = 10, colors }) {
  const m = make();
  const [top, mid, low] = [colors.top, colors.mid, colors.low].map(rgb);
  const wash = Array.from({ length: STEPS + 1 }, (_, i) => {
    const t = i / STEPS;
    return hex(t < 0.5 ? low.map((v, n) => lerp(v, mid[n], t * 2)) : mid.map((v, n) => lerp(v, top[n], (t - 0.5) * 2)));
  });
  for (let i = 0; i < puffs; i++) {
    const u = (i + 0.5) / puffs;
    const bell = Math.sin(u * Math.PI) ** 0.75;
    const r = tall * (0.26 + 0.34 * bell * (0.5 + 0.7 * hash(i, 1, seed)));
    const x = lerp(-half, half, u) + (hash(i, 2, seed) - 0.5) * 6;
    const y = r * 0.25 + bell * tall * 0.42 * hash(i, 3, seed);
    const z = (hash(i, 4, seed) - 0.5) * 18;
    const curl = hash(i, 5, seed) > 0.55;
    const turn = hash(i, 6, seed) * TAU;
    m.ball([x, y, z], [r * 1.25, r * 0.92, r], {
      color: (l, at) => {
        // Del lado de la luz (arriba y a la izquierda), más clara; y más clara mientras más alto
        let t = 0.36 + (l[1] / r) * 0.34 - (l[0] / r) * 0.13 + (at[1] / tall) * 0.26;
        const d = Math.hypot(l[0] / 1.25, l[1]) / r;
        if (curl && l[2] > 0 && d > 0.2 && d < 0.82) { // el rizo, apenas marcado
          const f = (((Math.atan2(l[1], l[0]) + turn) / TAU + d * 1.4) % 1 + 1) % 1;
          if (f < 0.12) t -= 0.17;
        }
        return wash[Math.round(Math.max(0, Math.min(1, t)) * STEPS)];
      },
      group: 'cloud',
      flat: 2,
      blend: 3,
    });
  }
  return m;
}
