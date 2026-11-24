// Hornea los animales con los que se juega: de sus modelos 3D (especies.mjs, alados.mjs, nube.mjs) a hojas
// de capas (assets/images/animales/*.png) y sus medidas (js/graphics/animalArt.js), que usa
// graphics/animalPainter.js. Uso: npm run animales
//
// En cada pieza, los cuadros van a lo ancho y las capas de profundidad, de atrás hacia adelante, hacia
// abajo. Varias piezas comparten la hoja, una debajo de otra.

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { encode, image } from './png.mjs';
import { QUADRUPEDS } from './especies.mjs';
import { quadrupedPoses } from './poses.mjs';
import { GAITS, skeleton } from './rigs.mjs';
import { cloud, wisp } from './nube.mjs';
import { DRAGON_STRIDE, FLAP, GLIDE, LEG_LIFT, ROOSTER_STRIDE, dragonHead, dragonLegFrames, dragonTail, dragonWing, roosterFrames, snakeCoil, snakeHead, vertebra } from './alados.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(root, 'assets', 'images', 'animales');

const GAIT = { rat: 'scurry', ox: 'lumber', tiger: 'bound', rabbit: 'hop', horse: 'gallop', goat: 'spring', monkey: 'knuckle', dog: 'dog', pig: 'trot' };
// Dónde está la boca (de ahí salen las bolas de fuego), desde los pies: [x, y] en pixeles
const MOUTH = { rat: [8, 5], ox: [12, 8], tiger: [8, 9], rabbit: [7, 10], dragon: [9, 11], snake: [8, 8], horse: [13, 17], goat: [9, 15], monkey: [8, 12], rooster: [8, 17], dog: [8, 10], pig: [9, 7] };

/** Corta todos los cuadros de una pieza al mismo tamaño, el más chico donde caben. */
export function piece(models, { w = 72, h = 56, anchor = [40, 40], depth = 9 } = {}) {
  const sets = models.map((m) => m.slices({ w, h, anchor, depth }));
  let [x0, y0, x1, y1, deep] = [w, h, 0, 0, 0];
  for (const set of sets) {
    set.forEach((img, layer) => {
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (!img.data[(y * w + x) * 4 + 3]) continue;
          x0 = Math.min(x0, x);
          x1 = Math.max(x1, x + 1);
          y0 = Math.min(y0, y);
          y1 = Math.max(y1, y + 1);
          deep = Math.max(deep, Math.abs(layer - depth));
        }
      }
    });
  }
  if (x0 === 0 || y0 === 0 || x1 === w || y1 === h) throw new Error(`Una pieza se sale de su caja: ${[x0, y0, x1, y1]} de ${w}×${h}`);
  const size = { w: x1 - x0, h: y1 - y0 };
  const layers = 2 * deep + 1;
  const sheet = image(size.w * sets.length, size.h * layers);
  sets.forEach((set, f) => {
    for (let layer = 0; layer < layers; layer++) {
      const src = set[layer + depth - deep];
      for (let y = 0; y < size.h; y++) {
        const from = ((y + y0) * w + x0) * 4;
        sheet.data.set(src.data.subarray(from, from + size.w * 4), ((layer * size.h + y) * sheet.w + f * size.w) * 4);
      }
    }
  });
  return { sheet, ...size, ax: anchor[0] - x0, ay: anchor[1] - y0, depth: deep, frames: sets.length };
}

/** Junta varias piezas en una hoja, una debajo de otra. */
function atlas(pieces) {
  const entries = Object.entries(pieces);
  const out = image(Math.max(...entries.map(([, p]) => p.sheet.w)), entries.reduce((sum, [, p]) => sum + p.sheet.h, 0));
  const map = {};
  let top = 0;
  for (const [name, p] of entries) {
    const { sheet } = p;
    for (let y = 0; y < sheet.h; y++) out.data.set(sheet.data.subarray(y * sheet.w * 4, (y + 1) * sheet.w * 4), (top + y) * out.w * 4);
    map[name] = { y: top, w: p.w, h: p.h, ax: p.ax, ay: p.ay, depth: p.depth, frames: p.frames };
    top += sheet.h;
  }
  return { out, map };
}

/** Varias animaciones en una sola pieza: dónde empieza cada una y cuántos cuadros tiene. */
function reel(anims) {
  const models = [];
  const index = {};
  for (const [name, list] of Object.entries(anims)) {
    index[name] = [models.length, list.length];
    models.push(...list);
  }
  return { models, index };
}

/**
 * El retrato para la rueda del zodiaco (22 × 22, redondo): el modelo ya apilado y con contorno, recortado
 * alrededor de center (la cabeza).
 */
async function portrait(id, model, center) {
  const [w, h, depth] = [72, 56, 9];
  const anchor = [40, 40];
  const size = 22;
  const full = image(w, h);
  model.slices({ w, h, anchor, depth }).forEach((img, layer) => {
    const [dx, dy] = [Math.round((layer - depth) * 0.45), Math.round((layer - depth) * 0.28)];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (img.data[i + 3] && x + dx >= 0 && x + dx < w && y + dy >= 0 && y + dy < h) full.data.set(img.data.subarray(i, i + 4), ((y + dy) * w + x + dx) * 4);
      }
    }
  });
  const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && full.data[(y * w + x) * 4 + 3] > 0;
  const out = image(size, size);
  const [x0, y0] = [Math.round(anchor[0] + center[0] - size / 2), Math.round(anchor[1] - center[1] - size / 2)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (Math.hypot(x + 0.5 - size / 2, y + 0.5 - size / 2) > size / 2) continue;
      const [sx, sy] = [x + x0, y + y0];
      const i = (y * size + x) * 4;
      if (solid(sx, sy)) out.data.set(full.data.subarray((sy * w + sx) * 4, (sy * w + sx) * 4 + 4), i);
      else if (solid(sx - 1, sy) || solid(sx + 1, sy) || solid(sx, sy - 1) || solid(sx, sy + 1)) out.data.set([0x1b, 0x12, 0x26, 255], i);
    }
  }
  await writeFile(path.join(OUT, `${id}-retrato.png`), encode(out));
  art[id].portrait = `assets/images/animales/${id}-retrato.png`;
}

const art = {};
let bytes = 0;
async function save(id, pieces, extra) {
  const { out, map } = atlas(pieces);
  const data = encode(out);
  bytes += data.length;
  await writeFile(path.join(OUT, `${id}.png`), data);
  art[id] = { src: `assets/images/animales/${id}.png`, pieces: map, mouth: MOUTH[id], ...extra };
  console.log(`${id}: ${out.w}×${out.h}, ${Math.round(data.length / 1024)} KB`);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  for (const [id, animal] of Object.entries(QUADRUPEDS)) {
    const poses = quadrupedPoses(id, animal.def);
    const { models, index } = reel(Object.fromEntries(Object.entries(poses).map(([name, list]) => [name, list.map((pose) => animal.build(pose))])));
    await save(id, { body: piece(models) }, { anims: index, stride: GAITS[GAIT[id]].stride });
    const { head } = skeleton(animal.def, poses.idle[0]);
    await portrait(id, animal.build(poses.idle[0]), [head[0] - 0.5, head[1] - 0.5]);
  }
  {
    const { models, index } = reel(roosterFrames());
    await save('rooster', { body: piece(models) }, { anims: index, stride: ROOSTER_STRIDE, wings: true });
    await portrait('rooster', roosterFrames().idle[0], [3.4, 16]);
  }
  // Cuerpos largos: piezas sueltas que el juego arma sobre el camino de la cabeza
  const TURNS = [-0.7, -0.35, 0, 0.35, 0.7];
  const ANGLES = [-1.2, -0.8, -0.4, 0, 0.4, 0.8, 1.2];
  const spine = (kind, radii) => radii.flatMap((r) => ANGLES.flatMap((angle) => Array.from({ length: kind === 'snake' ? 5 : 6 }, (_, n) => vertebra({ kind, r, angle, n }))));
  {
    const radii = [3.6, 3.5, 3.2, 2.9, 2.5, 2, 1.5];
    const head = TURNS.flatMap((turn) => Array.from({ length: 6 }, (_, i) => dragonHead({ turn, t: i / 6 })));
    const legs = {};
    const legIndex = {};
    for (const front of [true, false]) {
      for (const far of [false, true]) {
        const { models, index } = reel(dragonLegFrames({ front, far }));
        legs[`leg${front ? 'F' : 'H'}${far ? 'f' : 'n'}`] = piece(models);
        Object.assign(legIndex, index);
      }
    }
    const folded = { lift: 0.15, spread: 0 };
    const wings = (side) => piece([...FLAP, ...GLIDE, folded].map((w) => dragonWing({ ...w, side })));
    await save('dragon', {
      head: piece([...head, ...TURNS.map((turn) => dragonHead({ turn, t: 0.3, hurt: true }))]),
      spine: piece(spine('dragon', radii)),
      ...legs,
      wingN: wings(1),
      wingF: wings(-1),
      tail: piece(ANGLES.flatMap((angle) => Array.from({ length: 4 }, (_, i) => dragonTail({ angle, t: i / 4 })))),
    }, { long: 'dragon', radii, turns: TURNS, angles: ANGLES, patterns: 6, legs: legIndex, legLift: LEG_LIFT, stride: DRAGON_STRIDE, wings: true, flap: FLAP.length, glide: GLIDE.length });
    await portrait('dragon', dragonHead({ t: 0.2 }), [0.5, 0.6]);
  }
  {
    const radii = [3.2, 3, 2.7, 2.4, 2, 1.5, 1];
    const head = TURNS.flatMap((turn) => [0, 0.5, 1].map((tongue) => snakeHead({ turn, tongue })));
    await save('snake', {
      head: piece([...head, ...TURNS.map((turn) => snakeHead({ turn, hurt: true }))]),
      spine: piece(spine('snake', radii)),
      coil: piece([...Array.from({ length: 6 }, (_, i) => snakeCoil({ t: i / 6, tongue: i === 4 ? 1 : 0 })), snakeCoil({ t: 0.1, up: -1.6 }), snakeCoil({ t: 0.2, up: 0.4 }), snakeCoil({ t: 0.3, up: 1.4, tongue: 1 })]),
    }, { long: 'snake', radii, turns: TURNS, angles: ANGLES, patterns: 5, skin: 4, stride: 24 });
    await portrait('snake', snakeCoil({ t: 0, tongue: 1 }), [4.5, 10.5]);
  }
  await save('cloud', {
    cloud: piece([...Array.from({ length: 6 }, (_, i) => cloud({ t: i / 6 })), cloud({ t: 0.1, press: 1 }), cloud({ t: 0.2, press: 0.5 }), cloud({ t: 0.3, press: -0.35 })]),
    wisp: piece(Array.from({ length: 6 }, (_, i) => wisp(i / 5))),
  }, {});

  // Las listas de números, en un solo renglón
  const flat = JSON.stringify(art, (key, value) => (Array.isArray(value) ? `@${value.join(', ')}@` : value), 2);
  const text = flat.replace(/"([a-zA-Z]+)":/g, '$1:').replaceAll('"@', '[').replaceAll('@"', ']').replaceAll('"', "'");
  await writeFile(path.join(root, 'js', 'graphics', 'animalArt.js'), `// Lo escribe tools/sprites/animales.mjs (npm run animales): dónde está cada pieza en las hojas de los
// animales, en pixeles. De cada pieza: y, dónde empieza en su hoja; w y h, lo que mide un cuadro; ax y ay,
// dónde queda su punto (los pies); depth: hay 2 · depth + 1 capas, una debajo de otra; frames: cuántos
// cuadros. anims: [primer cuadro, cuántos]. stride: cuánto avanza en un ciclo de la carrera.

export const ANIMAL_ART = ${text};
`);
  console.log(`Total: ${Math.round(bytes / 1024)} KB`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
