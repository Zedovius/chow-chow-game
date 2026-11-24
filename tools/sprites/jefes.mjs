// Los jefes: de la ilustración (tools/sprites/originales/) a sus sprites (assets/images/jefes/) y sus
// medidas (js/graphics/bossArt.js, que usa Scene.drawBoss). Uso: npm run jefes
//
// Todo va en capas de profundidad (sprite stacking): en cada tira, los cuadros van a lo ancho y las capas,
// de atrás hacia adelante, hacia abajo. La moneda es aparte: es su punto débil.
// Cada jefe es un cuerpo con cuadros (la cola, las orejas, el paño... se mueven), un brazo en varios
// ángulos (el juego elige cuál según lo que hace) y dónde va el ojo, que el juego dibuja encima: brilla
// del color de sus disparos y sigue a quien juega.
// Todas las coordenadas son de la ilustración original, tal como se ve.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decode, encode } from './png.mjs';
import { animate, clip, cut, grade, layers, paint, palette, reduce, rgb, stack, strip } from './pixelar.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FRAMES = 8;
const FPS = 8;
const LAYERS = 9; // capas de profundidad del cuerpo...
const ARM_LAYERS = 3; // ...y del brazo
const OUTLINE = rgb('#1b1226');

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
    rigs: [
      { type: 'sway', zone: [[176, 40], [208, 40], [208, 150], [177, 146]], anchor: 'bottom', amp: 3, wave: 0.07, loose: true }, // la cola
      { type: 'sway', zone: [[110, 20], [125, 20], [125, 44], [109, 44]], anchor: 'bottom', amp: 1, speed: 2 }, // las orejas
      { type: 'sway', zone: [[127, 22], [147, 22], [146, 48], [127, 42]], anchor: 'bottom', amp: 1, speed: 2, phase: 2 },
      { type: 'sway', zone: [[155, 72], [176, 72], [176, 104], [150, 104]], anchor: 'left', amp: 1.4, wave: 0.4, phase: 1 }, // el paño
      { type: 'sway', zone: [[60, 130], [84, 130], [84, 156], [60, 156]], anchor: 'top', amp: 1.4, wave: 0.05 }, // el farol
      { type: 'pulse', zone: [[68, 129], [78, 129], [78, 140], [68, 140]], color: rgb('#fff2b0'), amount: 0.9, speed: 2, above: 90 }, // su llama
      { type: 'sparkle', zone: [[92, 93], [128, 93], [128, 136], [92, 136]], count: 4 }, // la moneda
    ],
  },
};

const art = {};
const preview = {};
await mkdir(path.join(root, 'assets', 'images', 'jefes'), { recursive: true });
for (const [sign, boss] of Object.entries(BOSSES)) {
  const src = decode(await readFile(path.join(root, 'tools', 'sprites', 'originales', `${boss.file}.png`)));
  const [x0, y0, x1, y1] = boss.box;
  const factor = (y1 - y0) / boss.height;
  const PAD = 3; // para lo que se mece y el contorno
  const size = { w: Math.ceil((x1 - x0) / factor) + PAD * 2, h: boss.height + PAD * 2 };
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
  const frames = animate(paint(body, colors, { rim: boss.rim, outline: OUTLINE }), boss.rigs, FRAMES, toSprite);
  const armFrames = arms.map((arm) => paint(arm, colors, { rim: boss.rim, outline: OUTLINE }));
  // Por capas: cuadros a lo ancho, capas hacia abajo
  const sheet = (images, n, options) => {
    const cut3d = images.map((img) => layers(img, n, options));
    return stack(Array.from({ length: n }, (_, layer) => strip(cut3d.map((set) => set[layer]))));
  };
  const [wx, wy] = toSprite(boss.weak.center);
  const inCoin = (x, y) => ((x + 0.5 - wx) * factor / boss.weak.rx) ** 2 + ((y + 0.5 - wy) * factor / boss.weak.ry) ** 2 <= 1;
  const save = (suffix, img) => writeFile(path.join(root, 'assets', 'images', 'jefes', `${boss.file}${suffix}.png`), encode(img));
  await save('', sheet(frames, LAYERS, { round: 12, zones: boss.depth, toSprite }));
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

// Los puntos, en un solo renglón: [x, y]
const flat = JSON.stringify(art, (key, value) => (Array.isArray(value) ? `@${value.join(', ')}@` : value), 2);
const text = flat.replace(/"([a-zA-Z]+)":/g, '$1:').replaceAll('"@', '[').replaceAll('@"', ']').replaceAll('"', "'");
await writeFile(path.join(root, 'js', 'graphics', 'bossArt.js'), `// Lo escribe tools/sprites/jefes.mjs (npm run jefes): las medidas de los sprites de los jefes, en pixeles
// del juego. Un cuerpo con cuadros y un brazo en varios ángulos (armFrom: en alto; armTo: caído).
// center: el centro de su caja de choque; eye, mouth, shoulder, weak: dónde están en el cuerpo. layers,
// armLayers: las capas de profundidad, de atrás hacia adelante, una debajo de otra en su imagen.

export const BOSS_ART = ${text};
`);

export { preview };
