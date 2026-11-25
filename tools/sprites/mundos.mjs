// Hornea los escenarios de los mundos (js/world/scenery.js): montañas, objetos, nubes, niebla y el astro
// de cada uno, en capas de profundidad, a assets/images/mundos/*.png, con sus medidas en
// js/graphics/worldArt.js (lo usa graphics/worldPainter.js). Uso: npm run mundos [animal...]
//
// En cada pieza las capas van una debajo de otra, de atrás hacia adelante.

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tone, VALUES, viewOf } from '../../js/graphics/aerial.js';
import { ASTRO, BANKS, DEPTHS, SCENERY, sizeAt } from '../../js/world/scenery.js';
import { dragonHead, roosterFrames, snakeCoil } from './alados.mjs';
import { CITY, skyline } from './ciudad.mjs';
import { QUADRUPEDS } from './especies.mjs';
import { FAUNA } from './fauna.mjs';
import { FOLK } from './gente.mjs';
import { mountain } from './montanas.mjs';
import { bank } from './nubes.mjs';
import { PIECES_A } from './piezas.mjs';
import { PIECES_B } from './piezas2.mjs';
import { glows, grade, round } from './pintura.mjs';
import { encode, image } from './png.mjs';
import { quadrupedPoses } from './poses.mjs';
import { fbm, hash } from './ruido.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(root, 'assets', 'images', 'mundos');
const PIECES = { ...PIECES_A, ...PIECES_B, dog: CITY };
const STEP = 2; // grosor de cada capa de los objetos
const REFLECTS = new Set(['lake', 'street']); // los suelos que reflejan las luces

const rgb = (hex) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
const mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);

/** Recorta las capas a lo más chico y las pone una debajo de otra (y los cuadros, uno junto al otro). */
function strip(sets, anchor, depth, step) {
  const { w, h } = sets[0][0];
  let [x0, y0, x1, y1] = [w, h, 0, 0];
  let [first, last] = [sets[0].length, -1];
  for (const layers of sets) layers.forEach((img, n) => {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!img.data[(y * w + x) * 4 + 3]) continue;
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x + 1);
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y + 1);
        first = Math.min(first, n);
        last = Math.max(last, n);
      }
    }
  });
  const size = { w: x1 - x0, h: y1 - y0 };
  if (x0 === 0 || y0 === 0 || x1 === w || y1 === h) throw new Error(`Una pieza se sale de su caja: ${[x0, y0, x1, y1]} de ${w}×${h}`);
  const count = last - first + 1;
  const sheet = image(size.w * sets.length, size.h * count);
  sets.forEach((layers, f) => layers.slice(first, last + 1).forEach((img, n) => {
    for (let y = 0; y < size.h; y++) {
      const from = ((y + y0) * w + x0) * 4;
      sheet.data.set(img.data.subarray(from, from + size.w * 4), ((n * size.h + y) * sheet.w + f * size.w) * 4);
    }
  }));
  return { sheet, ...size, ax: anchor[0] - x0, ay: anchor[1] - y0, n: count, z0: -depth + first * step, step, frames: sets.length };
}

/** Las capas de una montaña, recortadas. */
const flat3 = (layers, ax) => {
  const { w, h } = layers[0];
  const tall = layers.map((img) => {
    const out = image(w + 4, h + 4);
    for (let y = 0; y < h; y++) out.data.set(img.data.subarray(y * w * 4, (y + 1) * w * 4), ((y + 2) * out.w + 2) * 4);
    return out;
  });
  return strip([tall], [ax + 2, h + 2], 0, 1);
};
const flat = (img, ax = Math.round(img.w / 2), ay = Math.round(img.h / 2)) => ({ sheet: img, w: img.w, h: img.h, ax, ay, n: 1, z0: 0, step: 0 });

/** Un objeto (un Model), o algo animado (una función de t y cuántos cuadros). */
function prop(build, scenery, size, k, frames = 0) {
  const [w, h, depth, step] = frames ? [96, 72, 12, 1] : [136, 120, 22, STEP];
  const anchor = [w / 2, h - 20];
  let lights = [];
  const sets = Array.from({ length: frames || 1 }, (_, f) => {
    const model = build(f / (frames || 1)).scale(size);
    if (!f) lights = model.lights;
    return glows(grade(model.slices({ w, h, anchor, depth, step }), scenery, k), model.lights, scenery, k, { anchor, depth, step });
  });
  // Lo que se refleja en el agua o en la calle mojada: sus luces más grandes
  const mirror = lights.filter((l) => l.alpha > 0.28).sort((a, b) => b.r - a.r).slice(0, 6).map(({ x, y, r, color }) => [Math.round(x), Math.round(y), Math.max(1, Math.round(r * 0.3)), color]);
  return { ...strip(sets, anchor, depth, step), ...(REFLECTS.has(scenery.floor.kind) && mirror.length ? { mirror } : {}) };
}

/** Una nube del cielo, con los rizos de las pinturas: base plana, bolas arriba y espirales. */
function skyCloud(seed, scenery) {
  const [w, h] = [84, 30];
  const img = image(w, h);
  // Tenue: está en lo más lejano
  const { top, base, dusk } = viewOf(scenery);
  const sky = mix(rgb(scenery.sky[0]), rgb(scenery.sky[1]), 0.7);
  const body = tone(mix(sky, top, 0.7), VALUES.sky, dusk);
  const light = tone(mix(top, base, 0.45), VALUES.sky, dusk);
  const shade = tone(mix(sky, top, 0.4), VALUES.sky, dusk);
  const puffs = Array.from({ length: 7 }, (_, i) => {
    const bell = Math.sin(((i + 0.5) / 7) * Math.PI);
    return [10 + i * 10.5 + (hash(i, 1, seed) - 0.5) * 6, 20 - hash(i, 2, seed) * 7 * bell, 4.5 + hash(i, 3, seed) * 5 * bell];
  });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let best = -1;
      for (const [cx, cy, r] of puffs) best = Math.max(best, 1 - Math.hypot((x + 0.5 - cx) / (r * 1.25), (y + 0.5 - cy) / r));
      if (y > 23.5 || best < 0) continue;
      const c = best < 0.16 ? light : y > 20 ? shade : best < 0.4 ? mix(body, light, 0.4) : body;
      img.data.set([...round(c), best < 0.06 ? 60 : 105], (y * w + x) * 4);
    }
  }
  for (const [cx, cy, r] of puffs.filter((_, i) => i % 2 === 1)) {
    for (let k = 0; k < 40; k++) {
      const a = k * 0.24 + hash(Math.round(cx), 4, seed) * 6;
      const d = r * (0.95 - k * 0.022);
      const [x, y] = [Math.floor(cx + Math.cos(a) * d), Math.floor(cy + Math.sin(a) * d * 0.85)];
      if (x >= 0 && y >= 0 && x < w && y < 23) img.data.set([...round(shade), 110], (y * w + x) * 4);
    }
  }
  return img;
}

/** Una franja de niebla que se repite a lo ancho. */
function mist(scenery) {
  const [w, h] = [256, 26];
  const img = image(w, h);
  const c = round(tone(viewOf(scenery).base, VALUES.sky, viewOf(scenery).dusk));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const t = (x / w) * Math.PI * 2;
      const n = fbm(Math.cos(t) * 4 + 20, Math.sin(t) * 4 + 20 + y * 0.13, 7, 3);
      const edge = 1 - Math.abs((y - h * 0.58) / (h * 0.5)) ** 1.4;
      const a = Math.max(0, Math.min(1, edge * (0.45 + n * 0.9) - 0.12));
      img.data.set([...c, Math.round(a * 6) * 30], (y * w + x) * 4);
    }
  }
  return img;
}

/** La silueta de un animal, de lado, k veces más grande: (x, y) desde su centro → si es parte de él. */
function silhouette(id, k) {
  let model;
  if (QUADRUPEDS[id]) {
    const poses = quadrupedPoses(id, QUADRUPEDS[id].def);
    model = QUADRUPEDS[id].build(id === 'rabbit' ? poses.idle[0] : poses.run[3]);
  } else if (id === 'rooster') [model] = roosterFrames().idle;
  else model = id === 'dragon' ? dragonHead({ t: 0.2 }) : snakeCoil({ t: 0 });
  const size = 130;
  const shape = new Uint8Array(size * size);
  for (const { data } of model.scale(k).slices({ w: size, h: size, anchor: [66, 78], depth: 12, step: 1 })) for (let i = 0; i < size * size; i++) if (data[i * 4 + 3]) shape[i] = 1;
  let [x0, x1, y0, y1] = [size, 0, size, 0];
  shape.forEach((v, i) => {
    if (!v) return;
    x0 = Math.min(x0, i % size);
    x1 = Math.max(x1, i % size);
    y0 = Math.min(y0, Math.floor(i / size));
    y1 = Math.max(y1, Math.floor(i / size));
  });
  return (x, y) => shape[Math.round(y + (y0 + y1) / 2) * size + Math.round(x + (x0 + x1) / 2)] === 1;
}

/** El sol o la luna, con su resplandor y la silueta del animal recortada, como en el papel picado chino. */
function astro(id, scenery) {
  const { kind, color, shade } = scenery.astro;
  const { r } = ASTRO;
  const size = Math.ceil(r * (kind === 'threeSuns' ? 3.6 : 2) + 26);
  const img = image(size, size);
  const [dark, glow] = [shade, scenery.glow].map(rgb);
  const base = mix(rgb(color), glow, 0.16); // del color de su cielo
  const c = size / 2;
  const figure = silhouette(id, (r * 1.45) / 34);
  const disc = (cx, cy, rr, cutout) => {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const [dx, dy] = [x + 0.5 - cx, y + 0.5 - cy];
        const d = Math.hypot(dx, dy);
        const i = (y * size + x) * 4;
        if (d > rr) { // el resplandor, por escalones
          const a = Math.round(Math.max(0, 1 - (d - rr) / 11) * 4) * 16;
          if (a > img.data[i + 3]) img.data.set([...round(tone(glow, 0.5)), a], i);
          continue;
        }
        const n = fbm(x * 0.12, y * 0.12, r, 3);
        let col = mix(base, dark, Math.max(0, Math.min(0.85, (dx + dy) / (rr * 2.6) + (n - 0.5) * 0.9)));
        if (cutout && figure(dx, dy)) col = mix(col, dark, 0.62);
        if (d > rr - 1.2) col = mix(col, [255, 255, 255], 0.35);
        img.data.set([...round(tone(col, VALUES.astro)), 255], i);
      }
    }
  };
  if (kind === 'threeSuns') {
    disc(c, c, r, true);
    for (const side of [-1, 1]) disc(c + side * r * 1.36, c + r, r * 0.46, false);
  } else disc(c, c, r, true);
  if (kind === 'eclipse') { // el perro del cielo se come la luna
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const d = Math.hypot(x + 0.5 - c + r * 0.62, y + 0.5 - c + r * 0.34);
        const i = (y * size + x) * 4;
        if (d < r * 0.86 && img.data[i + 3] === 255) img.data.set(round(mix(rgb(scenery.rock.ink), dark, d > r * 0.8 ? 0.5 : 0.08)), i);
      }
    }
  }
  return img;
}

/** Acomoda las piezas en una hoja, por renglones. */
function pack(pieces) {
  const tall = Object.entries(pieces).sort((a, b) => b[1].sheet.h - a[1].sheet.h);
  const limit = Math.max(700, Math.ceil(tall.reduce((sum, [, p]) => sum + p.sheet.w + 1, 0) / 3));
  const rows = [];
  for (const [name, p] of tall) {
    let row = rows.find((r) => r.w + p.sheet.w <= limit);
    if (!row) {
      row = { w: 0, h: p.sheet.h, items: [] };
      rows.push(row);
    }
    row.items.push([name, p, row.w]);
    row.w += p.sheet.w + 1;
  }
  const out = image(Math.max(...rows.map((r) => r.w)), rows.reduce((sum, r) => sum + r.h + 1, 0));
  const map = {};
  let top = 0;
  for (const row of rows) {
    for (const [name, p, x] of row.items) {
      for (let y = 0; y < p.sheet.h; y++) out.data.set(p.sheet.data.subarray(y * p.sheet.w * 4, (y + 1) * p.sheet.w * 4), ((top + y) * out.w + x) * 4);
      map[name] = [x, top, p.w, p.h, p.ax, p.ay, p.n, p.z0, p.step, ...(p.frames > 1 ? [p.frames] : [])];
    }
    top += row.h + 1;
  }
  const mirrors = Object.fromEntries(Object.entries(pieces).filter(([, p]) => p.mirror).map(([name, p]) => [name, p.mirror]));
  return { out, map, mirrors };
}

function bake(id) {
  const scenery = SCENERY[id];
  const pieces = {};
  const view = viewOf(scenery);
  // Montañas: tres distancias, con más aire y menos detalle mientras más lejos
  const ranges = [
    { w: 60, h: 80, layers: 2, count: 3, variants: 4, detail: 0.1, width: 0.12, treeSize: 0.6 },
    { w: 76, h: 94, layers: 3, count: 3, variants: 4, detail: 0.4, width: 0.12, treeSize: 0.85 },
    { w: 94, h: 104, layers: 4, count: 4, variants: 3, detail: 0.75, width: 0.12, treeSize: 1.1 },
  ];
  ranges.forEach((range, r) => {
    for (let v = 0; v < range.variants; v++) {
      const seed = id.length * 101 + id.charCodeAt(0) * 7 + id.charCodeAt(1) + r * 17 + v * 5;
      // De distintas alturas
      const h = Math.round(range.h * [1, 0.68, 0.86, 0.56][v]);
      const city = scenery.city && r > 0; // en la ciudad, lo de adelante son edificios
      const layers = (city ? skyline : mountain)({
        ...range,
        h: city ? Math.round(h * 0.62) : h,
        seed,
        style: { ...scenery.rock, air: view, airAmount: view.k(DEPTHS.mountains[r].s), gradient: scenery.gradient.ranges[r], detail: range.detail, count: range.count + (v % 2), width: range.width, treeSize: range.treeSize, fall: scenery.rock.fall && v % 2 === 0, trees: scenery.rock.trees ?? 2 },
      });
      pieces[`m${r}${v}`] = flat3(layers, range.w / 2);
    }
  });
  // Objetos, a su tamaño y con el aire de su distancia
  for (const place of ['land', 'back', 'mid', 'near']) {
    const { s, size } = DEPTHS[place];
    for (const name of new Set(scenery.props[place])) pieces[`${place}-${name}`] = FAUNA[name] ? prop(FAUNA[name], scenery, size, view.k(s), 4) : prop(PIECES[id][name], scenery, size, view.k(s));
  }
  // La gente y los autos, también a su tamaño y con su aire
  scenery.people.forEach(({ s, v, names }, i) => {
    for (const name of new Set(names)) pieces[`people${i}-${name}`] = prop(FOLK[name], scenery, sizeAt(s), view.k(s), v ? 6 : 4);
  });
  scenery.traffic?.forEach(({ s, names }, i) => {
    for (const name of new Set(names)) pieces[`traffic${i}-${name}`] = prop(CITY[name] ?? PIECES[id][name], scenery, sizeAt(s), view.k(s));
  });
  // Los bancos de nubes de los mundos sin suelo: de lejos a cerca, cambian de color (banks: far y near)
  if (scenery.banks) {
    const { far, near } = scenery.banks;
    BANKS.forEach(({ s, size }, r) => {
      const k = Math.min(1, s);
      const colors = Object.fromEntries(['top', 'mid', 'low'].map((name) => [name, `#${round(mix(rgb(far[name]), rgb(near[name]), k)).map((v) => v.toString(16).padStart(2, '0')).join('')}`]));
      for (let v = 0; v < 3; v++) {
        const [w, h, depth, step] = s < 0.35 ? [200, 96, 10, 10] : [200, 96, 18, 9]; // pocas capas: el efecto es sutil
        const anchor = [w / 2, h - 14];
        const layers = bank(r * 17 + v * 5 + id.length, { half: 46 + v * 5, tall: [20, 24, 34][v] * (s >= 0.7 ? 0.8 : 1), colors }).scale(size).slices({ w, h, anchor, depth, step });
        pieces[`bank${r}-${v}`] = strip([layers], anchor, depth, step);
      }
    });
  }
  for (let i = 0; i < 3; i++) pieces[`cloud${i}`] = flat(skyCloud(i + id.length * 3, scenery));
  pieces.mist = flat(mist(scenery), 0, 13);
  pieces.astro = flat(astro(id, scenery));
  return pack(pieces);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const only = process.argv.slice(2);
  const file = path.join(root, 'js', 'graphics', 'worldArt.js');
  const art = only.length ? { ...(await import(pathToFileURL(file).href)).WORLD_ART } : {};
  let total = 0;
  for (const id of only.length ? only : Object.keys(SCENERY)) {
    const { out, map, mirrors } = bake(id);
    const data = encode(out);
    total += data.length;
    await writeFile(path.join(OUT, `${id}.png`), data);
    art[id] = { src: `assets/images/mundos/${id}.png`, pieces: map, mirrors };
    console.log(`${id}: ${out.w}×${out.h}, ${Math.round(data.length / 1024)} KB, ${Object.keys(map).length} piezas`);
  }
  const lines = Object.entries(art).map(([id, { src, pieces, mirrors = {} }]) => `  ${id}: {\n    src: '${src}',\n    pieces: {\n${Object.entries(pieces).map(([name, v]) => `      '${name}': [${v.join(', ')}],`).join('\n')}\n    },\n    mirrors: ${JSON.stringify(mirrors)},\n  },`);
  await writeFile(file, `// Lo escribe tools/sprites/mundos.mjs (npm run mundos): dónde está cada pieza en la hoja de su mundo.
// [x, y, ancho, alto, ax, ay (dónde queda su punto), cuántas capas, z de la primera, grosor de cada una]
// mirrors: las luces de cada pieza que se reflejan en el suelo: [x, altura, mitad del ancho, color]

export const WORLD_ART = {
${lines.join('\n')}
};
`);
  console.log(`Total: ${Math.round(total / 1024)} KB`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
