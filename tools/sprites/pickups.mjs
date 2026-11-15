// Dibuja en pixel art la comida y los cócteles, y los guarda como PNG en assets/images/pickups/.
// Cada dibujo es una cuadrícula de texto: un carácter por pixel (ver PALETTE; '.' es transparente).
// Un pixel del dibujo es un pixel del canvas del juego (la mitad del mundo, CONFIG.pixel), así que
// se ven del mismo tamaño que el resto del pixel art.
//
// Uso:   node tools/sprites/pickups.mjs [--preview hoja.png]
//        --preview  además, una hoja con todos ampliados ×10 sobre el cielo, para revisarlos
//
// Para cambiar un dibujo: edita su cuadrícula y vuelve a correr el script. Los nombres de los
// archivos son los de entities/Pickup.js (COCKTAILS y FOODS) y graphics/assets.js.

import { writeFile, mkdir } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(root, 'assets', 'images', 'pickups');

const PALETTE = {
  k: '#1b1226', // contorno: se lee sobre cualquier cielo
  // La caja de comida china
  w: '#fbf7ee', // cartón blanco
  s: '#cfc6b4', // costado y solapas en sombra
  x: '#a89f8d', // doblez entre la solapa y la cara de enfrente
  r: '#d7263d', // la pagoda roja
  z: '#e2c48a', // palillos
  // El tazón de arroz
  u: '#fffdf6', // arroz
  e: '#e9e1cc', // granos con sombra
  b: '#2f5fb3', // porcelana azul (también la usa el tazón)
  B: '#9db8ea', // porcelana azul claro
  l: '#5fbf3a', // cebollín
  // Vidrio
  h: '#d7f1ff', // brillo del vidrio
  H: '#8fb8cf', // borde del vidrio
  // La estrella del vuelo
  S: '#ffd23f', // estrella
  W: '#fff6b0', // brillo de la estrella
  // Margarita de lichi
  y: '#e4f58c', // la margarita
  Y: '#b5d34e', // sombra
  p: '#f8d3da', // lichi
  P: '#e08aa2', // piel del lichi
  q: '#f3eadb', // sal del escarchado
  // Mezcal con jengibre
  a: '#eaa13a', // mezcal
  A: '#b8641a', // sombra
  i: '#eef9ff', // hielo
  o: '#ffb02e', // naranja
  O: '#ffe08a', // pulpa de naranja
};

const SPRITES = {
  // La caja blanca de comida china para llevar: más ancha arriba, el costado en sombra, las solapas
  // abiertas, la pagoda roja al frente y los palillos saliendo
  'caja-china': [
    '..............z...',
    '.............zz..z',
    '..k....kk....z..z.',
    '.ksk.kkwwkk..z..z.',
    '.ksskwwwwwwkz..z..',
    'ksssswwwwwwkz.zsk.',
    'kssswwwwwwwwzksssk',
    'ksskwwwwwwwwkssssk',
    'ksssxxxxxxxxxxxxxk',
    'kssswwwwwwwwwwwwsk',
    'kssswwwwwrwwwwwwsk',
    '.ksswwwwrrrwwwwsk.',
    '.ksswwrwrrrwrwwsk.',
    '.ksswwwrrrrrwwwsk.',
    '.kssswwwrwrwwwwsk.',
    '.kssswrwrrrwrwwsk.',
    '.kssswwrrrrrwwwsk.',
    '..ksswwrwrwrwwsk..',
    '..ksswrrrrrrrwsk..',
    '..ksswwwwwwwwwsk..',
    '...kkkkkkkkkkkk...',
  ],
  // Un tazón de arroz blanco, de porcelana con su franja azul, con un poco de cebollín
  'tazon-de-arroz': [
    '.....kkkkkk.....',
    '...kkuuueuukk...',
    '..kuueuuuuuuuk..',
    '.kuuuuuuluueuuk.',
    'kkkkkkkkkkkkkkkk',
    'kwwwwwwwwwwwwwsk',
    'kwbbbbbbbbbbbbsk',
    '.kwBwBwBwBwBwsk.',
    '.kwwwwwwwwwwwsk.',
    '..kwwwwwwwwwsk..',
    '...kkwwwwwskk...',
    '.....kbbbbk.....',
    '.....kkkkkk.....',
  ],
  // La estrella del vuelo: tomarla da el poder de volar
  estrella: [
    '.....k.....',
    '....kWk....',
    '....kSk....',
    'kkkkSWSkkkk',
    'kWSSSSSSSSk',
    '.kSSSSSSSk.',
    '..kSSSSSk..',
    '..kSSSSSk..',
    '.kSSkkkSSk.',
    '.kSkk.kkSk.',
    '.kk.....kk.',
  ],
  // Margarita de lichi: copa de margarita, escarchado de sal y un lichi en el borde
  'margarita-lichi': [
    '.........pp.',
    '........pPPp',
    'kkkkkkkkkpPk',
    'kqwqwqwqwqwk',
    'khyyyyyyyyYk',
    '.khyyyyyyYk.',
    '..khyyyyYk..',
    '...kkYYkk...',
    '.....kk.....',
    '.....hk.....',
    '.....hk.....',
    '...khhhhk...',
    '...kkkkkk...',
  ],
  // Mezcal con jengibre: vaso corto, hielo y una rodaja de naranja
  'mezcal-jengibre': [
    '........ooo.',
    '.......oOOOo',
    'kkkkkkkkoOok',
    'khiiaaaaaohk',
    'khiiaaaaaahk',
    'khaaaaiiaahk',
    'khaaaaiiaAhk',
    'khaaaaaaaAhk',
    'khAAAAAAAAhk',
    'khhhhhhhhhhk',
    'kkkkkkkkkkkk',
  ],
};

// --- PNG sin dependencias -----------------------------------------------------------------

const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buffer) => {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}
/** Un PNG RGBA de width × height a partir de pixel(x, y) → [r, g, b, a]. */
function png(width, height, pixel) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // sin filtro
    for (let x = 0; x < width; x++) raw.set(pixel(x, y), y * (width * 4 + 1) + 1 + x * 4);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 6, 0, 0, 0], 8); // 8 bits, RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const rgba = (hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16), 255];
const CLEAR = [0, 0, 0, 0];

function colorAt(rows, x, y, name) {
  const char = rows[y]?.[x] ?? '.';
  if (char === '.') return CLEAR;
  if (!PALETTE[char]) throw new Error(`${name}: el color «${char}» no está en PALETTE`);
  return rgba(PALETTE[char]);
}

// --- Generar ------------------------------------------------------------------------------

await mkdir(OUT, { recursive: true });
for (const [name, rows] of Object.entries(SPRITES)) {
  const width = rows[0].length;
  rows.forEach((row, i) => {
    if (row.length !== width) throw new Error(`${name}: la fila ${i} mide ${row.length} y no ${width}`);
  });
  await writeFile(path.join(OUT, `${name}.png`), png(width, rows.length, (x, y) => colorAt(rows, x, y, name)));
  console.log(`assets/images/pickups/${name}.png (${width}×${rows.length})`);
}

// La hoja para revisarlos: todos en fila, ampliados ×10, sobre el color del cielo del juego
const previewAt = process.argv.indexOf('--preview');
if (previewAt > 0) {
  const scale = 10;
  const pad = 2;
  const sprites = Object.values(SPRITES);
  const cell = Math.max(...sprites.map((rows) => Math.max(rows.length, rows[0].length))) + pad * 2;
  const width = cell * sprites.length;
  const sky = rgba('#2c3866');
  const sheet = png(width * scale, cell * scale, (px, py) => {
    const x = Math.floor(px / scale);
    const y = Math.floor(py / scale);
    const index = Math.floor(x / cell);
    const rows = sprites[index];
    const color = colorAt(rows, x - index * cell - pad, y - pad, 'hoja');
    return color[3] ? color : sky;
  });
  await writeFile(process.argv[previewAt + 1], sheet);
  console.log(`hoja: ${process.argv[previewAt + 1]}`);
}
