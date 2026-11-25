// Convierte una ilustración con fondo transparente en pixel art de 16 bits. Es la herramienta de
// Chispas (tools/deidades/pixelar.js) para Node, con transparencia en vez de fondo blanco y con
// gradientes de luz antes de reducir.
//
//   1. grade()     aclara, enfoca y pone los gradientes de luz, a tamaño original
//   2. reduce()    la lleva a su tamaño en el juego (o girada: el brazo), promediando cada bloque
//   3. palette()   una paleta limitada (median cut + k-means) en color de 15 bits, para todas las partes
//   4. paint()     cada pixel a la paleta, sin ruido, con luz en la orilla y contorno oscuro
//   5. animate()   cuadros con detalles que se mueven (los mismos efectos que en Chispas)
//
// Una imagen es { w, h, data (RGBA) }; una figura reducida, { w, h, color: Float32Array (RGB), on: Uint8Array }.

import { image } from './png.mjs';

const to15 = (v) => Math.round((Math.round((v / 255) * 31) * 255) / 31);
const lum = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
const dist = (a, b) => 2 * (a[0] - b[0]) ** 2 + 4 * (a[1] - b[1]) ** 2 + 3 * (a[2] - b[2]) ** 2;
const mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
export const rgb = (hex) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));

/** Una parte de la ilustración: lo que keep(x, y) acepta. */
export function cut(src, keep) {
  const out = image(src.w, src.h);
  for (let y = 0; y < src.h; y++) {
    for (let x = 0; x < src.w; x++) {
      const i = (y * src.w + x) * 4;
      if (src.data[i + 3] >= 40 && keep(x, y)) out.data.set(src.data.subarray(i, i + 4), i);
    }
  }
  return out;
}

/**
 * Luz y color, a tamaño original. gamma < 1 aclara; contrast y sharpen dan definición; lights: gradientes
 * [{ from: [x, y], to: [x, y], color, amount, mode: 'screen' | 'multiply' }], que van de amount a 0.
 */
export function grade(src, { gamma = 0.8, saturation = 1.1, sharpen = 0.6, lights = [] }) {
  const { w, h, data } = src;
  const out = image(w, h);
  const at = (x, y, c) => {
    const i = (Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))) * 4;
    return data[i + 3] < 40 ? -1 : data[i + c];
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (!data[i + 3]) continue;
      let c = [0, 1, 2].map((n) => {
        let sum = 0;
        let count = 0;
        for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          const v = at(x + dx, y + dy, n);
          if (v >= 0) { sum += v; count++; }
        }
        const v = data[i + n];
        return Math.max(0, Math.min(255, v + (count ? v - sum / count : 0) * sharpen));
      });
      c = c.map((v) => 255 * (v / 255) ** gamma);
      const l = lum(c);
      c = c.map((v) => l + (v - l) * saturation);
      const vivid = (Math.max(...c) - Math.min(...c)) / Math.max(1, Math.max(...c)); // lo muy colorido conserva su color
      for (const { from, to, color, amount, mode = 'screen' } of lights) {
        const [dx, dy] = [to[0] - from[0], to[1] - from[1]];
        const k = Math.max(0, Math.min(1, ((x - from[0]) * dx + (y - from[1]) * dy) / (dx * dx + dy * dy)));
        const a = amount * (1 - k);
        c = c.map((v, n) => (mode === 'multiply' ? v * (1 - a + (a * color[n]) / 255) : v + (a * color[n] * (255 - v)) / 255 * (0.35 + 0.65 * Math.min(1, l / 70)) * (1 - 0.75 * vivid)));
      }
      c.forEach((v, n) => { out.data[i + n] = v; });
      out.data[i + 3] = data[i + 3];
    }
  }
  return out;
}

/**
 * A tamaño de juego: factor pixeles de la ilustración por cada uno del juego. El punto center de la
 * ilustración queda en el pixel anchor; angle (radianes) la gira alrededor de ese punto.
 */
export function reduce(src, { factor, w, h, center, anchor, angle = 0, coverage = 0.5 }) {
  const color = new Float32Array(w * h * 3);
  const on = new Uint8Array(w * h);
  const [cos, sin] = [Math.cos(-angle), Math.sin(-angle)];
  const samples = 6;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sum = [0, 0, 0];
      let alpha = 0;
      for (let j = 0; j < samples; j++) {
        for (let i = 0; i < samples; i++) {
          const px = (x + (i + 0.5) / samples - anchor[0]) * factor;
          const py = (y + (j + 0.5) / samples - anchor[1]) * factor;
          const sx = Math.floor(center[0] + px * cos - py * sin);
          const sy = Math.floor(center[1] + px * sin + py * cos);
          if (sx < 0 || sy < 0 || sx >= src.w || sy >= src.h) continue;
          const at = (sy * src.w + sx) * 4;
          const a = src.data[at + 3] / 255;
          for (let n = 0; n < 3; n++) sum[n] += src.data[at + n] * a;
          alpha += a;
        }
      }
      if (alpha < coverage * samples * samples) continue;
      on[y * w + x] = 1;
      for (let n = 0; n < 3; n++) color[(y * w + x) * 3 + n] = sum[n] / alpha;
    }
  }
  return { w, h, color, on };
}

/** Una paleta de k colores para varias figuras. */
export function palette(figures, k) {
  const samples = [];
  for (const { color, on } of figures) on.forEach((v, i) => v && samples.push([color[i * 3], color[i * 3 + 1], color[i * 3 + 2]]));
  let boxes = [samples.slice()];
  while (boxes.length < k) {
    let pick = null;
    boxes.forEach((box, b) => {
      for (let c = 0; c < 3 && box.length > 1; c++) {
        const values = box.map((s) => s[c]);
        const score = (Math.max(...values) - Math.min(...values)) * box.length ** 0.35;
        if (!pick || score > pick.score) pick = { b, c, score };
      }
    });
    if (!pick) break;
    const box = boxes[pick.b].sort((p, q) => p[pick.c] - q[pick.c]);
    boxes.splice(pick.b, 1, box.slice(0, box.length >> 1), box.slice(box.length >> 1));
  }
  let colors = boxes.map((box) => [0, 1, 2].map((c) => box.reduce((s, v) => s + v[c], 0) / box.length));
  for (let n = 0; n < 8; n++) {
    const sums = colors.map(() => [0, 0, 0, 0]);
    for (const s of samples) {
      const acc = sums[nearest(colors, s)];
      s.forEach((v, c) => { acc[c] += v; });
      acc[3]++;
    }
    colors = colors.map((p, j) => (sums[j][3] ? sums[j].slice(0, 3).map((v) => v / sums[j][3]) : p));
  }
  return [...new Map(colors.map((p) => p.map(to15)).map((p) => [p.join(), p])).values()];
}

function nearest(colors, c) {
  let best = 0;
  for (let j = 1; j < colors.length; j++) if (dist(c, colors[j]) < dist(c, colors[best])) best = j;
  return best;
}

/**
 * La figura con su paleta. rim: { color, amount }: luz en las orillas de arriba y la izquierda; outline:
 * el color del contorno (por fuera, un pixel). Devuelve una imagen RGBA.
 */
export function paint(figure, colors, { rim = null, outline = null } = {}) {
  const { w, h, color, on } = figure;
  const out = image(w, h);
  const index = new Int16Array(w * h).fill(-1);
  on.forEach((v, i) => { if (v) index[i] = nearest(colors, [color[i * 3], color[i * 3 + 1], color[i * 3 + 2]]); });
  const inside = (x, y) => x >= 0 && y >= 0 && x < w && y < h && on[y * w + x] === 1;
  // Pixeles sueltos casi del tono de sus vecinos: ruido
  const clean = index.slice();
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (index[i] < 0) continue;
      const around = [-w - 1, -w, -w + 1, -1, 1, w - 1, w, w + 1].map((d) => index[i + d]);
      if (around.includes(index[i]) || around.includes(-1)) continue;
      const count = (v) => around.filter((n) => n === v).length;
      const common = around.reduce((a, b) => (count(b) > count(a) ? b : a));
      if (dist(colors[index[i]], colors[common]) < 2500) clean[i] = common;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (clean[i] < 0) {
        if (outline && (inside(x - 1, y) || inside(x + 1, y) || inside(x, y - 1) || inside(x, y + 1))) out.data.set([...outline, 255], i * 4);
        continue;
      }
      let c = colors[clean[i]];
      if (rim) {
        const edge = !inside(x, y - 1) ? 1 : !inside(x - 1, y) ? 0.75 : !inside(x - 1, y - 1) ? 0.4 : 0;
        if (edge) c = mix(c, rim.color, rim.amount * edge).map(to15);
      }
      out.data.set([...c.map(Math.round), 255], i * 4);
    }
  }
  return out;
}

// --- Detalles animados (los efectos de Chispas) ----------------------------------

function inPolygon(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * Cuadros con detalles que se mueven. Cada rig lleva su zona en coordenadas de la ilustración (toSprite
 * las lleva a la figura):
 *   sway     { zone, anchor: 'bottom' | 'top' | 'left' | 'right', amp, wave, phase, speed, loose }  se mece
 *            (loose: no toca lo demás, así que no hay huecos que rellenar)
 *   pulse    { zone, color, amount, speed, above }  late hacia un color (lo más claro que above)
 *   sparkle  { zone, count, color }  destellos en lo más claro
 */
export function animate(base, rigs, frames, toSprite) {
  const { w, h } = base;
  const prepared = rigs.map((rig) => {
    const poly = rig.zone.map(toSprite);
    const list = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (base.data[(y * w + x) * 4 + 3] && inPolygon(x + 0.5, y + 0.5, poly)) list.push([x, y]);
    const light = ([x, y]) => lum([...base.data.subarray((y * w + x) * 4, (y * w + x) * 4 + 3)]);
    return { ...rig, list, lit: rig.type === 'sparkle' ? [...list].sort((a, b) => light(b) - light(a)).slice(0, rig.count ?? 3) : [] };
  });
  return Array.from({ length: frames }, (_, f) => {
    const out = { w, h, data: base.data.slice() };
    const t = (Math.PI * 2 * f) / frames;
    const set = (x, y, c) => out.data.set(c, (y * w + x) * 4);
    const old = (x, y) => base.data.slice((y * w + x) * 4, (y * w + x) * 4 + 4);
    const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && out.data[(y * w + x) * 4 + 3] > 0;
    for (const rig of prepared) {
      const { type, list, speed = 1, phase = 0 } = rig;
      if (type === 'sway') {
        const vertical = rig.anchor === 'top' || rig.anchor === 'bottom';
        const values = list.map(([x, y]) => (vertical ? y : x));
        const [min, max] = [Math.min(...values), Math.max(...values)];
        for (const [x, y] of list) set(x, y, [0, 0, 0, 0]);
        for (const [x, y] of list) {
          const s = vertical ? y : x;
          const k = (rig.anchor === 'bottom' || rig.anchor === 'right' ? max - s : s - min) / Math.max(1, max - min);
          const d = Math.round(rig.amp * k * Math.sin(t * speed + phase + (rig.wave ?? 0.15) * s));
          const [nx, ny] = vertical ? [x + d, y] : [x, y + d];
          if (nx >= 0 && ny >= 0 && nx < w && ny < h) set(nx, ny, old(x, y));
        }
        // Lo que quedó destapado dentro de la figura conserva su color
        for (const [x, y] of rig.loose ? [] : list) {
          if (solid(x, y)) continue;
          const near = (dx, dy) => solid(x + dx, y + dy) || solid(x + 2 * dx, y + 2 * dy);
          if ((near(-1, 0) && near(1, 0)) || (near(0, -1) && near(0, 1))) set(x, y, old(x, y));
        }
      } else if (type === 'pulse') {
        const a = rig.amount * (0.5 + 0.5 * Math.sin(t * speed + phase));
        for (const [x, y] of list) {
          const c = [...old(x, y)].slice(0, 3);
          if (lum(c) >= (rig.above ?? 30)) set(x, y, [...mix(c, rig.color, a).map(to15), 255]);
        }
      } else {
        rig.lit.forEach(([x, y], n) => {
          if ((f + Math.round((n * frames) / rig.lit.length)) % frames < 2) set(x, y, [...(rig.color ?? [255, 248, 224]), 255]);
        });
      }
    }
    return out;
  });
}

/**
 * Capas de profundidad (sprite stacking de lado): la figura se infla como un globo, más cerca mientras
 * más adentro de su silueta (round: a cuántos pixeles de la orilla ya está del todo al frente), y se
 * rebana en n capas. La capa i lleva los pixeles que llegan hasta ahí; la 0, la figura entera. El juego las
 * dibuja una sobre otra, cada una un poco más corrida.
 *   zones  [{ zone, min, max }]: partes que van más atrás o más adelante (en la ilustración)
 */
export function layers(img, n, { round = 12, zones = [], toSprite = (p) => p } = {}) {
  const { w, h, data } = img;
  const dist = new Float32Array(w * h);
  const get = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : dist[y * w + x]);
  for (let i = 0; i < w * h; i++) dist[i] = data[i * 4 + 3] ? 999 : 0;
  const relax = (x, y, steps) => {
    const i = y * w + x;
    if (dist[i]) dist[i] = Math.min(dist[i], ...steps.map(([dx, dy]) => get(x + dx, y + dy) + Math.hypot(dx, dy)));
  };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) relax(x, y, [[-1, 0], [0, -1], [-1, -1], [1, -1]]);
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) relax(x, y, [[1, 0], [0, 1], [1, 1], [-1, 1]]);
  const polys = zones.map(({ zone, min, max }) => ({ poly: zone.map(toSprite), min, max }));
  const depth = dist.map((d, i) => {
    if (d <= 1) return 0; // el contorno se queda atrás
    const m = Math.min(1, (d - 1) / round);
    const z = Math.sqrt(1 - (1 - m) ** 2);
    const part = polys.find(({ poly }) => inPolygon((i % w) + 0.5, Math.floor(i / w) + 0.5, poly));
    return part ? part.min + (part.max - part.min) * z : z;
  });
  return Array.from({ length: n }, (_, layer) => {
    const out = image(w, h);
    for (let i = 0; i < w * h; i++) if (data[i * 4 + 3] && depth[i] >= (layer / (n - 1)) * 0.97) out.data.set(data.subarray(i * 4, i * 4 + 4), i * 4);
    return out;
  });
}

/**
 * Lo mismo con una escultura (escultura.mjs): cada capa lleva solo lo que hay a su profundidad (de far a near), con lo que
 * quedaba tapado. img: la figura ya pintada (sin contorno); colors: su paleta.
 */
export function slices(img, n, { chunks }, colors, near, far) {
  const out = Array.from({ length: n }, () => image(img.w, img.h));
  const step = (near - far) / (n - 1);
  const layerOf = (z) => Math.max(0, Math.min(n - 1, Math.round((z - far) / step)));
  for (const [i, list] of chunks) {
    list.forEach(({ from, to, color }, k) => {
      const c = k === 0 ? img.data.subarray(i * 4, i * 4 + 4) : [...colors[nearest(colors, color)].map(Math.round), 255];
      for (let layer = layerOf(to + step * 0.5); layer <= layerOf(from); layer++) out[layer].data.set(c, i * 4);
      out[layerOf(from)].data.set(c, i * 4);
    });
  }
  return out;
}

/**
 * Dobla una parte larga de la ilustración (una cola) como una ola: points es su línea de en medio, de la raíz a la punta;
 * reach, qué tan lejos de ella llega; amp, cuánto se mueve la punta; phase, en qué momento (0 a 1). keep(x, y): lo que
 * no es de ella.
 */
export function bend(src, { points, reach, amp, waves = 0.7, keep = () => false }, phase) {
  const path = [];
  for (let i = 0; i < points.length - 1; i++) {
    const [p0, p1, p2, p3] = [points[Math.max(0, i - 1)], points[i], points[i + 1], points[Math.min(points.length - 1, i + 2)]];
    for (let k = 0; k < 12; k++) {
      const u = k / 12;
      path.push([0, 1].map((c) => 0.5 * (2 * p1[c] + (p2[c] - p0[c]) * u + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * u * u + (3 * p1[c] - p0[c] - 3 * p2[c] + p3[c]) * u ** 3)));
    }
  }
  path.push(points[points.length - 1]);
  const last = path.length - 1;
  const normal = (list, i) => {
    const [a, b] = [list[Math.max(0, i - 1)], list[Math.min(last, i + 1)]];
    const n = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [-(b[1] - a[1]) / n, (b[0] - a[0]) / n];
  };
  const moved = path.map((p, i) => {
    const k = i / last;
    const d = k ** 1.25 * amp * Math.sin(Math.PI * 2 * (phase - k * waves));
    const n = normal(path, i);
    return [p[0] + n[0] * d, p[1] + n[1] * d];
  });
  const nearest = (list, x, y) => {
    let best = 0;
    for (let i = 1; i <= last; i++) if (Math.hypot(list[i][0] - x, list[i][1] - y) < Math.hypot(list[best][0] - x, list[best][1] - y)) best = i;
    return best;
  };
  const out = { w: src.w, h: src.h, data: src.data.slice() };
  const pad = reach + amp + 2;
  const [x0, x1] = [Math.min(...path.map((p) => p[0])) - pad, Math.max(...path.map((p) => p[0])) + pad].map(Math.round);
  const [y0, y1] = [Math.min(...path.map((p) => p[1])) - pad, Math.max(...path.map((p) => p[1])) + pad].map(Math.round);
  for (const draw of [false, true]) {
    for (let y = Math.max(0, y0); y <= Math.min(src.h - 1, y1); y++) {
      for (let x = Math.max(0, x0); x <= Math.min(src.w - 1, x1); x++) {
        if (keep(x, y)) continue;
        const i = nearest(draw ? moved : path, x + 0.5, y + 0.5);
        const base = (draw ? moved : path)[i];
        const n = normal(draw ? moved : path, i);
        const d = (x + 0.5 - base[0]) * n[0] + (y + 0.5 - base[1]) * n[1];
        if (Math.hypot(x + 0.5 - base[0], y + 0.5 - base[1]) > reach) continue;
        if (!draw) { // se quita de donde estaba
          out.data[(y * src.w + x) * 4 + 3] = 0;
          continue;
        }
        const m = normal(path, i);
        const along = (x + 0.5 - base[0]) * n[1] - (y + 0.5 - base[1]) * n[0]; // lo que pasa de la punta
        const [sx, sy] = [Math.floor(path[i][0] + m[0] * d + m[1] * along), Math.floor(path[i][1] + m[1] * d - m[0] * along)];
        if (sx < 0 || sy < 0 || sx >= src.w || sy >= src.h || keep(sx, sy)) continue;
        const from = (sy * src.w + sx) * 4;
        if (src.data[from + 3] >= 40) out.data.set(src.data.subarray(from, from + 4), (y * src.w + x) * 4);
      }
    }
  }
  return out;
}

/** Recorta los pixeles donde keep(x, y). */
export function clip(img, keep) {
  const out = image(img.w, img.h);
  for (let y = 0; y < img.h; y++) {
    for (let x = 0; x < img.w; x++) {
      const i = (y * img.w + x) * 4;
      if (keep(x, y)) out.data.set(img.data.subarray(i, i + 4), i);
    }
  }
  return out;
}

/** Varias imágenes del mismo ancho, una debajo de otra. */
export function stack(images) {
  const out = image(images[0].w, images.reduce((sum, img) => sum + img.h, 0));
  let at = 0;
  for (const img of images) {
    out.data.set(img.data, at);
    at += img.data.length;
  }
  return out;
}

/** Varias imágenes del mismo tamaño, una junto a otra. */
export function strip(images) {
  const { w, h } = images[0];
  const out = image(w * images.length, h);
  images.forEach((img, n) => {
    for (let y = 0; y < h; y++) out.data.set(img.data.subarray(y * w * 4, (y + 1) * w * 4), (y * out.w + n * w) * 4);
  });
  return out;
}
