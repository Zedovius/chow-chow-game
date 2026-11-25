// Hornea los obstáculos (world/obstacles.js): modelos 3D chiquitos (modelo3d.mjs) rebanados en capas, a
// assets/images/obstaculos/*.png, con sus medidas en js/graphics/obstacleArt.js (lo usa
// graphics/obstaclePainter.js). Uso: npm run obstaculos
//
// Hay un juego común (aquí: lo del aire, y lo que un mundo no tenga) y uno por
// mundo (obstaculosMundos.mjs). Están en el mismo plano que los animales, así que llevan su mismo acabado: los
// cinco tonos de modelo3d.mjs, sin el aire ni la tinta del fondo, valores claros y contorno oscuro. Nada de bordes
// claros ni brillos: eso es de lo que se recoge.
//
// Cada pieza va dos veces, una junto a la otra: a color y su contorno (un pixel más grande). De cada una, los
// cuadros van a lo ancho y las capas, de atrás hacia adelante, hacia abajo.

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { bundle, C, fire, frames, make, rockets, TAU, toad, wheel } from './obstaculosPiezas.mjs';
import { WORLDS } from './obstaculosMundos.mjs';
import { encode, image } from './png.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(root, 'assets', 'images', 'obstaculos');
const PAD = 1; // lo que crece el contorno
const { RED, DEEP, GOLD, CREAM, DARK, WOOD, PLANK, CLAY, IRON, STONE, CARVED, HOT } = C;

// --- En el suelo -------------------------------------------------------------------------

/** Poste: un brasero de hierro encendido. */
function brazier(t) {
  const m = make();
  for (const [x, z] of [[-2.8, 1.4], [2.8, 1.4], [0, -2.4]]) m.limb([x, 0.4, z], [x * 0.4, 5, z * 0.4], 1, 0.9, { color: '#8f8aa6', group: `leg${x}`, over: 1 });
  m.drum([0, 5.6], 1.6, 3.6, 1.5, { color: '#a8a2bc', group: 'bowl', over: 2 });
  m.drum([0, 7.1], 3.8, 3.8, 0.5, { color: GOLD, group: 'rim', over: 3 });
  fire(m, [0, 7], 0.84, t, 1.3);
  return m;
}

/** Poste: lanzas de hierro clavadas en un cepo de madera. */
function spears() {
  const m = make();
  m.box([0, 1.4], [4.2, 1.4, 3], { color: PLANK, group: 'base', round: 0.5 });
  const spear = (x, top, z) => {
    m.limb([x * 0.7, 1, z], [x, top, z], 1.05, 1.05, { color: WOOD, group: `s${x}` });
    m.ball([x, top - 0.6, z], [1.5, 1.2, 1.5], { color: RED, group: `t${x}`, over: 1 });
    m.limb([x, top, z], [x, top + 1.4, z], 1.2, 1.5, { color: IRON, group: `b${x}`, over: 2, blend: 0 });
    m.limb([x, top + 1.4, z], [x, top + 4.2, z], 1.5, 0.15, { color: IRON, group: `b${x}`, over: 2, blend: 0 });
  };
  spear(0, 11, -0.6);
  spear(-3, 8.6, 0.6);
  spear(3, 8, 0.8);
  return m;
}

/** Grupo: una barricada de troncos con puntas de hierro. */
function barricade() {
  const m = make();
  m.limb([-9.6, 4.4], [9.6, 4.4], 1.7, 1.7, { color: (l) => (Math.sin(l[0] * 40) > 0.6 ? PLANK : WOOD), group: 'log' });
  const stake = (a, b, tip, name) => {
    m.limb(a, b, 1.25, 1.15, { color: (l) => (Math.abs(l[0] - 0.5) < 0.1 ? DARK : WOOD), group: `s${name}`, over: 1 });
    m.limb(b, tip, 1.4, 0.15, { color: IRON, group: `p${name}`, over: 2, blend: 0 });
  };
  for (const x of [-5.4, 5.4]) {
    for (const s of [-1, 1]) stake([x - s * 3.8, 0.4, s * 1.8], [x + s * 2.6, 7.6, -s * 1.8], [x + s * 4.6, 11, -s * 2], `${x}${s}`);
    m.ball([x, 4.4], [1.9, 1.9, 2.7], { color: DEEP, group: `k${x}`, over: 3 });
  }
  stake([0, 0.4, 0], [0, 8, 0], [0, 11.6, 0], 'mid');
  m.box([0, 4.4], [1.5, 1.2, 2.2], { color: DEEP, group: 'kmid', over: 3 });
  return m;
}

/** Grupo: tres tinajas de licor encendidas. */
function jars(t) {
  const m = make();
  for (const [x, k, d] of [[-6.9, 0.94, 0], [0, 1.04, 0.35], [6.9, 0.96, 0.7]]) {
    const r = 3.4 * k;
    m.ball([x, r * 1.02], [r, r * 1.05, r], {
      color: (l) => {
        const at = Math.abs(l[0]) + Math.abs(l[1]);
        if (l[2] > r * 0.4 && at < r * 0.36) return GOLD;
        if (l[2] > r * 0.4 && at < r * 0.72) return RED;
        return l[1] > r * 0.62 ? DEEP : CLAY;
      },
      group: `jar${x}`,
    });
    m.drum([x, r * 2.02], r * 0.62, r * 0.7, 0.7, { color: GOLD, group: `neck${x}`, over: 1 });
    fire(m, [x, r * 2.02 + 0.5], 0.56, (t + d) % 1);
  }
  return m;
}

/** Muro: un pilar de piedra con cara de guardián, grecas y picos de hierro. No se quema. */
function pillar(glow) {
  const m = make();
  const eye = glow ? '#ff5a4a' : '#c01a2a';
  m.box([0, 1.1], [5.2, 1.1, 4.2], { color: STONE, group: 'base', round: 0.4 });
  m.box([0, 9], [4.2, 7.4, 3.4], {
    color: (l) => {
      const [x, y, z] = l;
      const side = Math.abs(x);
      if (z > 1.6) {
        if (side > 0.7 && side < 2.9 && y > 2.4 - side * 0.3 && y < 4.6 - (2.9 - side) * 0.5) return eye;
        if (y > 4.8 && y < 5.8 && side < 3.4) return CARVED; // el ceño
        if (side < 0.7 && y > 0.6 && y < 3) return IRON; // la nariz
        if (side < 3.1 && y > -2.4 && y < -0.2) return (Math.floor(side + 0.5) % 2 === 1 && y > -1.5) ? CREAM : DARK; // los dientes
        if (y < -3.4 && y > -4.2) return CARVED;
        if (y < -4.8) return (Math.floor(x + 10.5) % 3 === 0 || (y < -6 && Math.floor(x + 10.5) % 3 === 1)) ? CARVED : STONE; // la greca
      }
      return STONE;
    },
    group: 'body',
    round: 0.5,
  });
  m.box([0, 16.9], [5, 1, 4], { color: IRON, group: 'top', round: 0.4 });
  for (const x of [-3.4, 0, 3.4]) m.limb([x, 17.6], [x, 21], 1.3, 0.2, { color: IRON, group: `pike${x}`, over: 1, blend: 0 });
  if (glow) for (const x of [-1.8, 1.8]) m.dot([x, 12.4, 4], HOT);
  return m;
}

// --- En el aire ------------------------------------------------------------------------------

/** Criatura: un gavilán, de lado. lift: las alas, de -1 (abajo) a 1 (arriba). */
function hawk(lift) {
  const m = make();
  const [B, D, L, W] = ['#e09048', '#a0602c', '#ffc880', '#fff2d4'];
  m.ball([0.6, 0], [4.8, 2.5, 2.3], { turn: -0.1, color: (l) => (l[1] < -0.2 ? W : B), group: 'body' });
  m.ball([-4, 1.5], [2.6, 2.3, 2.2], { color: (l) => (l[1] < -0.3 ? W : B), group: 'body' });
  m.limb([-5.8, 1.2], [-8.2, 0], 1.2, 0.3, { color: '#ffc23a', group: 'beak', over: 1, blend: 0 });
  for (const z of [-1.8, 2.6]) m.ball([-4.8, 2, z], [1, 1, 0.7], { color: '#ff3a2e', group: `eye${z}`, over: 3, flat: 3, blend: 0 });
  m.limb([4, 0.2], [8.4, -0.4], 1.6, 1.8, { color: (l) => (l[0] > 0.78 ? W : l[0] > 0.6 ? D : B), group: 'tail' });
  // Las alas: una sola forma, clara adelante y con la orilla oscura
  for (const s of [-1, 1]) {
    const n = 12;
    for (let i = 0; i <= n; i++) {
      const k = i / n;
      const z = s * (1 + k * 5.4);
      const y = 1 + lift * 6 * k ** 0.85;
      const chord = 5.2 * (1 - k * 0.55);
      m.limb([-1.6 + k * 1.8, y, z], [-1.6 + k * 1.8 + chord, y - 0.5, z], 0.95, 0.7, { color: (l) => (l[0] > 0.8 ? (s > 0 ? W : L) : l[0] > 0.62 ? D : s > 0 ? L : D), group: `w${s}`, over: s > 0 ? 2 : -1, blend: 0.5 });
    }
  }
  return m;
}

/** Linterna: un farol de hierro con su fuego adentro. t: cómo se mueve. */
function ironLamp(t) {
  const m = make();
  const beat = 0.5 + 0.5 * Math.sin(t * TAU);
  m.ball([0, -0.4], [4.2, 4.5, 4], {
    color: (l) => {
      const d = Math.hypot(l[0], (l[1] + 0.8) * 0.8);
      return d < 1.4 + beat * 0.5 ? '#fff0b0' : d < 2.9 + beat * 0.4 ? '#ffb24a' : '#d8602a';
    },
    group: 'glass',
  });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + TAU / 8;
    const at = (r, y) => [Math.cos(a) * r, y, Math.sin(a) * r];
    m.chain([at(2.6, 4), at(4.4, 0), at(2.8, -5)], 0.6, 0.6, { color: '#c08a3a', group: `bar${i}`, over: 1 });
  }
  m.drum([0, 4.8], 4.2, 1.4, 1.2, { color: '#e04a3c', group: 'roof', over: 2 });
  m.drum([0, 3.7], 4, 4, 0.5, { color: GOLD, group: 'rim', over: 2 });
  m.ball([0, 6.6], [1, 1, 1], { color: '#b0843a', group: 'ring', over: 2 });
  m.drum([0, -5], 2.8, 3.4, 0.7, { color: '#e04a3c', group: 'base', over: 2 });
  m.limb([0, -5.6], [0, -8], 1.1, 0.2, { color: '#b9bfcc', group: 'spike', over: 2, blend: 0 });
  return m;
}

/** Nube de tormenta. pose: 0 y 1, quieta; 2, avisa su rayo. */
function storm(pose) {
  const m = make();
  const lit = pose === 2;
  const [top, mid, low] = lit ? ['#fff3a0', '#e8b93c', '#8a6ad0'] : ['#d8d4ff', '#9a92ea', '#5c54b4'];
  const puffs = [[-10.4, -1.6, 4], [-5.6, 1.4, 5.2], [0.6, 2.6, 6], [6.6, 1.2, 5.2], [11, -1.8, 3.8], [-2.6, -2.2, 5], [4, -2.4, 5]];
  puffs.forEach(([x, y, r], i) => {
    const breathe = 1 + (pose === 1 ? 0.04 : 0) * (i % 2 ? 1 : -1);
    m.ball([x, y], [r * breathe, r * 0.88 * breathe, r * 0.95], {
      color: (l, at) => {
        // Un rizo en cada bola, como en las nubes de las pinturas
        const d = Math.hypot(l[0], l[1]) / r;
        const a = Math.atan2(l[1], l[0]);
        if (l[2] > r * 0.2 && d > 0.2 && d < 0.8 && Math.abs(((a / TAU + d * 1.6 + i * 0.3 + 4) % 1) - 0.5) < 0.1) return top;
        return at[1] > 3.2 ? top : at[1] > -2.2 ? mid : low;
      },
      group: 'storm',
      blend: 1.4,
    });
  });
  return m;
}

/** El juego común: cada tipo, con sus pieles, y cada piel, con sus cuadros. */
const COMMON = {
  post: [frames(4, brazier), [spears()]],
  crate: [frames(4, rockets), frames(4, bundle)],
  group: [[barricade()], frames(4, jars)],
  wall: [[pillar(false), pillar(true)]],
  barrel: [frames(8, (t) => wheel(t * TAU))],
  hopper: [[toad(0), toad(1), toad(2)]],
  flyer: [[hawk(1), hawk(0.7), hawk(-0.9), hawk(-0.6)]],
  lantern: [frames(6, ironLamp)],
  cloud: [[storm(0), storm(1), storm(2)]],
};

/** Las capas de todos los cuadros de una pieza, recortadas a su caja, con lugar para el contorno. */
function cut(models) {
  const [w, h, depth] = [64, 56, 9];
  const anchor = [32, 34];
  const sets = models.map((m) => m.slices({ w, h, anchor, depth }));
  let [x0, y0, x1, y1, first, last] = [w, h, 0, 0, 2 * depth, 0];
  for (const set of sets) {
    set.forEach((img, layer) => {
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (!img.data[(y * w + x) * 4 + 3]) continue;
          x0 = Math.min(x0, x);
          x1 = Math.max(x1, x + 1);
          y0 = Math.min(y0, y);
          y1 = Math.max(y1, y + 1);
          first = Math.min(first, layer);
          last = Math.max(last, layer);
        }
      }
    });
  }
  if (x0 < PAD || y0 < PAD || x1 > w - PAD || y1 > h - PAD) throw new Error(`Un obstáculo se sale de su caja: ${[x0, y0, x1, y1]}`);
  const size = { w: x1 - x0 + PAD * 2, h: y1 - y0 + PAD * 2 };
  const n = last - first + 1;
  const count = sets.length;
  const sheet = image(size.w * count * 2, size.h * n);
  const put = (x, y, rgba) => sheet.data.set(rgba, (y * sheet.w + x) * 4);
  sets.forEach((set, f) => {
    for (let layer = 0; layer < n; layer++) {
      const src = set[layer + first];
      const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && src.data[(y * w + x) * 4 + 3] > 0;
      const near = (x, y, r) => {
        for (let dy = -r; dy <= r; dy++) for (let dx = -(r - Math.abs(dy)); dx <= r - Math.abs(dy); dx++) if (solid(x + dx, y + dy)) return true;
        return false;
      };
      for (let y = 0; y < size.h; y++) {
        for (let x = 0; x < size.w; x++) {
          const [sx, sy] = [x + x0 - PAD, y + y0 - PAD];
          const ty = layer * size.h + y;
          if (solid(sx, sy)) put(f * size.w + x, ty, src.data.subarray((sy * w + sx) * 4, (sy * w + sx) * 4 + 4));
          if (near(sx, sy, 1)) put((count + f) * size.w + x, ty, [0x16, 0x0a, 0x1c, 255]);
        }
      }
    }
  });
  return { sheet, w: size.w, h: size.h, ax: anchor[0] - x0 + PAD, ay: anchor[1] - y0 + PAD, n, z0: first - depth, frames: count };
}

/** Una hoja: todas las piezas de un juego, una debajo de otra. */
async function bake(id, kinds) {
  const pieces = Object.entries(kinds).flatMap(([kind, skins]) => skins.map((models, i) => [`${kind}${i}`, cut(models)]));
  const out = image(Math.max(...pieces.map(([, p]) => p.sheet.w)), pieces.reduce((sum, [, p]) => sum + p.sheet.h, 0));
  const art = {};
  let top = 0;
  for (const [name, p] of pieces) {
    for (let y = 0; y < p.sheet.h; y++) out.data.set(p.sheet.data.subarray(y * p.sheet.w * 4, (y + 1) * p.sheet.w * 4), (top + y) * out.w * 4);
    art[name] = { y: top, w: p.w, h: p.h, ax: p.ax, ay: p.ay, n: p.n, z0: p.z0, frames: p.frames };
    top += p.sheet.h;
  }
  const data = encode(out);
  await writeFile(path.join(OUT, `${id}.png`), data);
  console.log(`${id}: ${out.w}×${out.h}, ${Math.round(data.length / 1024)} KB`);
  for (const [name, p] of pieces) console.log(`  ${name}: ${p.w - PAD * 2}×${p.h - PAD * 2}, ${p.n} capas, ${p.frames} cuadros`);
  const lines = Object.entries(art).map(([name, p]) => `      ${name}: { ${Object.entries(p).map(([k, v]) => `${k}: ${v}`).join(', ')} },`);
  return `  ${id}: {
    src: 'assets/images/obstaculos/${id}.png',
    skins: { ${Object.entries(kinds).map(([kind, skins]) => `${kind}: ${skins.length}`).join(', ')} },
    pieces: {
${lines.join('\n')}
    },
  },`;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const sets = [await bake('comun', COMMON)];
  for (const [id, kinds] of Object.entries(WORLDS)) sets.push(await bake(id, kinds));
  await writeFile(path.join(root, 'js', 'graphics', 'obstacleArt.js'), `// Lo escribe tools/sprites/obstaculos.mjs (npm run obstaculos): dónde está cada obstáculo en su hoja, en
// pixeles. Un juego común y uno por mundo. skins: cuántas pieles tiene cada tipo. De cada pieza: y, dónde empieza;
// w y h, un cuadro; ax y ay, su punto (en el suelo, los pies; en el aire, el centro); n, cuántas capas, desde z0;
// frames, cuántos cuadros. A lo ancho van los cuadros a color y luego su contorno.

export const OBSTACLE_ART = {
${sets.join('\n')}
};
`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
