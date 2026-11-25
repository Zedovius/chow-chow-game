// Los jefes: de la ilustración (tools/sprites/originales/) o de su escultura (jefesModelos.mjs) a sus sprites
// (assets/images/jefes/) y sus medidas (js/graphics/bossArt.js, que usa Scene.drawBoss). Uso: npm run jefes [animal...]
//
// Todo va en capas de profundidad (sprite stacking): en cada tira, los cuadros van a lo ancho y las capas,
// de atrás hacia adelante, hacia abajo. La moneda es aparte: es su punto débil.
// Cada jefe es un cuerpo con cuadros (la cola, las orejas, el paño... se mueven), un brazo en varios
// ángulos (el juego elige cuál según lo que hace) y dónde va el ojo, que el juego dibuja encima: brilla
// del color de sus disparos y sigue a quien juega.
// Todas las coordenadas son de la ilustración original, tal como se ve.
// Los esculpidos llevan su profundidad de verdad; los que no tienen brazos (la Serpiente y el Dragón) atacan con la
// boca: sus cuadros van tres veces, con la boca cerrada, a medias y abierta (jaws), y su ojo se mueve con cada cuadro.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { render } from './escultura.mjs';
import { ARMED, armOf, boss as sculpt, SIGNS } from './jefesModelos.mjs';
import { decode, encode } from './png.mjs';
import { animate, bend, clip, cut, grade, layers, paint, palette, reduce, rgb, slices, stack, strip } from './pixelar.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FRAMES = 12;
const FPS = 10;
const LAYERS = 9; // capas de profundidad del cuerpo...
const ARM_LAYERS = 3; // ...y del brazo

const BOSSES = {
  rat: {
    file: 'rata',
    height: 60, // de las orejas a los pies, en pixeles del juego
    colors: 40,
    // Qué es el cuerpo y qué es el brazo suelto
    body: (x, y) => !(x < 86 && y < 60),
    arm: (x, y) => x < 86 && y < 54,
    box: [60, 20, 206, 189], // lo que ocupa el cuerpo
    center: [130, 116], // el centro de su caja de choque (CONFIG.boss)
    eye: [106.5, 67],
    mouth: [98, 83],
    armPivot: [75, 38], // el hombro, en el brazo suelto...
    shoulder: [143, 121], // ...y en el cuerpo
    armAngles: [-100, 60], // del brazo en alto al brazo caído (grados; 0: como está dibujado)
    weak: { center: [109.5, 114.5], rx: 17, ry: 21 }, // el punto débil: la moneda
    // Qué va más atrás (la cola, el brazo del farol, la otra oreja) y más adelante (el hocico, los pies)
    depth: [
      { zone: [[176, 40], [208, 40], [208, 168], [176, 160]], min: 0, max: 0.3 },
      { zone: [[58, 98], [95, 98], [95, 160], [58, 160]], min: 0.05, max: 0.4 },
      { zone: [[127, 20], [148, 20], [146, 47], [127, 42]], min: 0, max: 0.35 },
      { zone: [[68, 60], [104, 60], [104, 96], [68, 96]], min: 0.35, max: 0.9 },
      { zone: [[80, 168], [156, 168], [156, 190], [80, 190]], min: 0.4, max: 0.95 },
    ],
    grade: {
      gamma: 0.66,
      saturation: 1.4,
      sharpen: 0.9,
      lights: [
        { from: [90, 20], to: [175, 170], color: rgb('#8f9bff'), amount: 0.36 }, // luna, arriba a la izquierda
        { from: [70, 135], to: [140, 120], color: rgb('#ffb347'), amount: 0.3 }, // el farol
        { from: [190, 190], to: [120, 60], color: rgb('#3a1d52'), amount: 0.5, mode: 'multiply' }, // sombra violeta
      ],
    },
    rim: { color: rgb('#b9b0ff'), amount: 0.5 },
    // La cola ondula entera, de la raíz a la punta (por su línea de en medio)
    tail: { points: [[173, 159], [184, 151], [192, 142], [197, 130], [198, 120], [196, 110], [191, 100], [187, 90], [183, 78], [182, 66], [184, 56], [189, 50], [196, 48.5], [204, 51]], reach: 9, amp: 15, waves: 0.75, keep: (x) => x < 172 },
    rigs: [
      { type: 'sway', zone: [[110, 20], [125, 20], [125, 44], [109, 44]], anchor: 'bottom', amp: 1, speed: 2 }, // las orejas
      { type: 'sway', zone: [[127, 22], [147, 22], [146, 48], [127, 42]], anchor: 'bottom', amp: 1, speed: 2, phase: 2 },
      { type: 'sway', zone: [[155, 72], [176, 72], [176, 104], [150, 104]], anchor: 'left', amp: 1.4, wave: 0.4, phase: 1 }, // el paño
      { type: 'sway', zone: [[60, 130], [84, 130], [84, 156], [60, 156]], anchor: 'top', amp: 1.4, wave: 0.05 }, // el farol
      { type: 'pulse', zone: [[68, 129], [78, 129], [78, 140], [68, 140]], color: rgb('#fff2b0'), amount: 0.9, speed: 2, above: 90 }, // su llama
      { type: 'sparkle', zone: [[92, 93], [128, 93], [128, 136], [92, 136]], count: 4 }, // la moneda
    ],
  },
};

const file = path.join(root, 'js', 'graphics', 'bossArt.js');
const only = process.argv.slice(2);
const art = only.length ? { ...(await import(pathToFileURL(file).href)).BOSS_ART } : {};
const preview = {};
await mkdir(path.join(root, 'assets', 'images', 'jefes'), { recursive: true });
for (const [sign, boss] of Object.entries(BOSSES)) {
  if (only.length && !only.includes(sign)) continue;
  const src = decode(await readFile(path.join(root, 'tools', 'sprites', 'originales', `${boss.file}.png`)));
  const [x0, y0, x1, y1] = boss.box;
  const factor = (y1 - y0) / boss.height;
  const PAD = 3; // para lo que se mece y el contorno
  const size = { w: Math.ceil((x1 - x0) / factor) + PAD * 2 + 4, h: boss.height + PAD * 2 }; // (la cola se sale un poco)
  const toSprite = ([x, y]) => [(x - x0) / factor + PAD, (y - y0) / factor + PAD];
  const graded = grade(cut(src, boss.body), boss.grade);
  // El brazo se ilumina como si ya estuviera en su hombro
  const move = boss.shoulder.map((v, i) => v - boss.armPivot[i]);
  const shift = ([x, y]) => [x - move[0], y - move[1]];
  const armArt = grade(cut(src, boss.arm), { ...boss.grade, lights: boss.grade.lights.map((l) => ({ ...l, from: shift(l.from), to: shift(l.to) })) });

  const body = reduce(graded, { factor, ...size, center: [x0, y0], anchor: [PAD, PAD] });
  const reach = Math.ceil(72 / factor) + PAD;
  const [from, to] = boss.armAngles;
  const steps = Math.round((to - from) / 8);
  const angles = Array.from({ length: steps + 1 }, (_, i) => from + (i * (to - from)) / steps);
  // Cada ángulo se reduce desde la ilustración girada (girar el pixel art ya hecho lo rompe). El
  // brazo mira a la izquierda: bajarlo es girarlo en contra del reloj
  const arms = angles.map((a) => reduce(armArt, { factor, w: reach * 2, h: reach * 2, center: boss.armPivot, anchor: [reach, reach], angle: (-a * Math.PI) / 180 }));
  const colors = palette([body, ...arms.filter((_, i) => i % 5 === 0)], boss.colors);
  // Cada cuadro, con la cola en su momento de la ola
  const frames = Array.from({ length: FRAMES }, (_, f) => {
    const posed = reduce(bend(graded, boss.tail, f / FRAMES), { factor, ...size, center: [x0, y0], anchor: [PAD, PAD] });
    return animate(paint(posed, colors, { rim: boss.rim }), boss.rigs, FRAMES, toSprite)[f]; // (el contorno se lo pone el juego)
  });
  const armFrames = arms.map((arm) => paint(arm, colors, { rim: boss.rim }));
  // Por capas: cuadros a lo ancho, capas hacia abajo
  const sheet = (images, n, options) => {
    const cut3d = images.map((img) => layers(img, n, options));
    return stack(Array.from({ length: n }, (_, layer) => strip(cut3d.map((set) => set[layer]))));
  };
  const [wx, wy] = toSprite(boss.weak.center);
  const inCoin = (x, y) => ((x + 0.5 - wx) * factor / boss.weak.rx) ** 2 + ((y + 0.5 - wy) * factor / boss.weak.ry) ** 2 <= 1;
  const save = (suffix, img) => writeFile(path.join(root, 'assets', 'images', 'jefes', `${boss.file}${suffix}.png`), encode(img));
  // En el cuerpo, donde va la moneda queda el pelo: ella va aparte, adelante, y así no se ve doble al girar
  const fur = colors.reduce((a, b) => (Math.abs(b[0] + b[1] + b[2] - 96) < Math.abs(a[0] + a[1] + a[2] - 96) ? b : a));
  const bare = frames.map((img) => {
    const out = { ...img, data: img.data.slice() };
    for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) if (inCoin(x, y) && img.data[(y * img.w + x) * 4 + 3]) out.data.set([...fur.map(Math.round), 255], (y * img.w + x) * 4);
    return out;
  });
  await save('', sheet(bare, LAYERS, { round: 12, zones: boss.depth, toSprite }));
  await save('-brazo', sheet(armFrames, ARM_LAYERS, { round: 4 }));
  await save('-moneda', strip(frames.map((img) => clip(img, inCoin))));
  const round = (p) => p.map((v) => Math.round(v));
  art[sign] = {
    body: `assets/images/jefes/${boss.file}.png`,
    arm: `assets/images/jefes/${boss.file}-brazo.png`,
    coin: `assets/images/jefes/${boss.file}-moneda.png`,
    layers: LAYERS,
    armLayers: ARM_LAYERS,
    w: size.w,
    h: size.h,
    frames: FRAMES,
    fps: FPS,
    ink: true,
    center: round(toSprite(boss.center)),
    eye: round(toSprite(boss.eye)),
    mouth: round(toSprite(boss.mouth)),
    shoulder: round(toSprite(boss.shoulder)),
    weak: round(toSprite(boss.weak.center)),
    armSize: reach * 2,
    armFrames: angles.length,
    armFrom: from,
    armTo: to,
  };
  preview[sign] = { frames, armFrames, art: art[sign] };
  console.log(`${sign}: ${size.w}×${size.h}, ${FRAMES} cuadros, brazo en ${angles.length} ángulos, ${colors.length} colores`);
}

// --- Los esculpidos ---------------------------------------------------------------------------

const NAMES = { ox: 'buey', tiger: 'tigre', rabbit: 'conejo', dragon: 'dragon', snake: 'serpiente', horse: 'caballo', goat: 'cabra', monkey: 'mono', rooster: 'gallo', dog: 'perro', pig: 'cerdo' };
const FINISH = { rim: { color: rgb('#c8c0ff'), amount: 0.3 } }; // (el contorno se lo pone el juego, sobre las capas ya juntas)
const CANVAS = { w: 120, h: 96, anchor: [44, 58] };
const ARM = { size: 66, from: -100, to: 60, step: 8 };

for (const sign of SIGNS) {
  if (only.length && !only.includes(sign)) continue;
  const armed = ARMED.includes(sign);
  const [count, jaws, fps] = armed ? [FRAMES, 1, FPS] : [16, 3, 12];
  const poses = Array.from({ length: count * jaws }, (_, i) => {
    const { model, eye } = sculpt(sign, (i % count) / count, Math.floor(i / count));
    return { figure: render(model, CANVAS), eye };
  });
  const angles = armed ? Array.from({ length: (ARM.to - ARM.from) / ARM.step + 1 }, (_, i) => ARM.from + i * ARM.step) : [];
  const arms = angles.map((a) => render(armOf(sign, a), { w: ARM.size, h: ARM.size, anchor: [ARM.size / 2, ARM.size / 2] }));
  const colors = palette([...poses.filter((_, i) => i % 5 === 0).map((p) => p.figure), ...arms.filter((_, i) => i % 6 === 0)], 48);
  const frames = poses.map(({ figure }) => ({ img: paint(figure, colors, FINISH), figure, near: 13, far: -13 }));
  // Se recorta a lo que ocupa en todos sus cuadros
  let [x0, y0, x1, y1] = [CANVAS.w, CANVAS.h, 0, 0];
  for (const { img } of frames) {
    for (let y = 0; y < CANVAS.h; y++) {
      for (let x = 0; x < CANVAS.w; x++) {
        if (!img.data[(y * CANVAS.w + x) * 4 + 3]) continue;
        [x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x + 1), Math.max(y1, y + 1)];
      }
    }
  }
  if (x0 === 0 || y0 === 0 || x1 === CANVAS.w || y1 === CANVAS.h) throw new Error(`${sign} se sale de su lienzo`);
  const size = { w: x1 - x0, h: y1 - y0 };
  const crop = (img) => {
    const out = { ...size, data: new Uint8ClampedArray(size.w * size.h * 4) };
    for (let y = 0; y < size.h; y++) out.data.set(img.data.subarray(((y + y0) * CANVAS.w + x0) * 4, ((y + y0) * CANVAS.w + x1) * 4), y * size.w * 4);
    return out;
  };
  const center = [CANVAS.anchor[0] - x0, CANVAS.anchor[1] - y0];
  const at = ([x, y]) => [Math.round(center[0] + x), Math.round(center[1] - y)];
  // Los cuadros a lo ancho y las capas hacia abajo; y debajo, lo mismo con la boca más abierta (rows)
  const sheet = (list, n, rows = 1) => {
    const sets = list.map(({ img, figure, near, far }) => slices(img, n, figure, colors, near, far));
    const wide = list.length / rows;
    return (trim) => stack(Array.from({ length: n * rows }, (_, i) => strip(sets.slice(Math.floor(i / n) * wide, (Math.floor(i / n) + 1) * wide).map((set) => trim(set[i % n])))));
  };
  const weak = at([-7, 0]);
  const inMedal = (x, y) => ((x + 0.5 - weak[0] + 0.5) / 8) ** 2 + ((y + 0.5 - weak[1] + 0.5) / 8.4) ** 2 <= 1;
  const name = NAMES[sign];
  const save = (suffix, img) => writeFile(path.join(root, 'assets', 'images', 'jefes', `${name}${suffix}.png`), encode(img));
  await save('', sheet(frames, LAYERS, jaws)(crop));
  await save('-moneda', strip(frames.slice(0, count).map(({ img }) => clip(crop(img), inMedal))));
  if (armed) await save('-brazo', sheet(arms.map((figure) => ({ img: paint(figure, colors, FINISH), figure, near: 4.5, far: -4.5 })), ARM_LAYERS)((img) => img));
  const eyes = poses.slice(0, count).map(({ eye }) => at(eye));
  art[sign] = {
    body: `assets/images/jefes/${name}.png`,
    ...(armed ? { arm: `assets/images/jefes/${name}-brazo.png` } : {}),
    coin: `assets/images/jefes/${name}-moneda.png`,
    layers: LAYERS,
    armLayers: ARM_LAYERS,
    ...size,
    frames: count,
    ...(jaws > 1 ? { jaws } : {}),
    fps,
    ink: true,
    center,
    ...(armed ? { eye: eyes[0] } : { eyes }),
    mouth: at([-13, 12]),
    shoulder: at([4, -2]),
    weak,
    armSize: ARM.size,
    armFrames: angles.length,
    armFrom: ARM.from,
    armTo: ARM.to,
  };
  console.log(`${sign}: ${size.w}×${size.h}, ${count} cuadros${jaws > 1 ? ` × ${jaws} bocas` : `, brazo en ${angles.length} ángulos`}, ${colors.length} colores`);
}

// Los puntos, en un solo renglón: [x, y]
const flat = JSON.stringify(art, (key, value) => (Array.isArray(value) ? `@${value.map((v) => (Array.isArray(v) ? `[${v.join(', ')}]` : v)).join(', ')}@` : value), 2);
const text = flat.replace(/"([a-zA-Z]+)":/g, '$1:').replaceAll('"@', '[').replaceAll('@"', ']').replaceAll('"', "'");
await writeFile(file, `// Lo escribe tools/sprites/jefes.mjs (npm run jefes): las medidas de los sprites de los jefes, en pixeles
// del juego. Un cuerpo con cuadros y un brazo en varios ángulos (armFrom: en alto; armTo: caído).
// center: el centro de su caja de choque; eye (o eyes, uno por cuadro), mouth, shoulder, weak: dónde están en el cuerpo.
// jaws: los que atacan con la boca, cuántas posiciones tiene (sus capas se repiten, hacia abajo, con cada una).
// ink: el contorno se pone al dibujarlo. layers,
// armLayers: las capas de profundidad, de atrás hacia adelante, una debajo de otra en su imagen.

export const BOSS_ART = ${text};
`);

export { preview };
