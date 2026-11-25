// Arma la carpeta del juego lista para publicar: solo lo necesario para jugar (sin tools/, docs/
// ni las imágenes de referencia). Las rutas del juego son relativas, así que la carpeta funciona
// en cualquier dirección (por ejemplo firio.studio/chow-chow/).
//
// Uso:   node tools/publicar.mjs [destino]
//        sin destino → dist/chow-chow-game
// Sitio: npm run parking  (= node tools/publicar.mjs ../../parkingPage/chow-chow, como Chispas en
//        parkingPage/chispas): luego se sube parkingPage completa a Cloudflare Pages y el juego queda
//        en firio.studio/chow-chow/
//
// Si el destino ya existe, solo se reemplaza cuando es una publicación anterior del juego
// (lleva el archivo .chowchow-publicado); así nunca se borra por error otra carpeta.
//
// Para jugar sin internet, en el sw.js publicado se escriben la lista de todos los archivos (el
// service worker los guarda al instalarse) y una huella de su contenido (VERSION): si cambia
// cualquier archivo, cambia la huella y los navegadores bajan la versión nueva.

import { cp, rm, mkdir, readdir, readFile, writeFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dest = path.resolve(process.argv[2] ?? path.join(root, 'dist', 'chow-chow-game'));
const MARKER = '.chowchow-publicado';

// Lo que necesita el juego, y lo que se copia solo si existe: el arte y el sonido (ver
// js/graphics/assets.js y js/audio/sounds.js)
const REQUIRED = ['index.html', 'manifest.webmanifest', 'sw.js', 'css', 'js', 'assets/icons', 'assets/fonts'];
// jefes.html: la página de pruebas. Cloudflare Pages la sirve sin el .html: firio.studio/chow-chow/jefes
const OPTIONAL = ['jefes.html', 'assets/images', 'assets/audio'];

const exists = (p) => access(p).then(() => true, () => false);
const fail = (message) => {
  console.error(message);
  process.exit(1);
};

if (root === dest || root.startsWith(dest + path.sep)) {
  fail(`El destino no puede ser el proyecto ni una carpeta que lo contenga: ${dest}`);
}
if (await exists(dest)) {
  const entries = await readdir(dest);
  if (entries.length && !entries.includes(MARKER)) {
    fail(`${dest} ya existe y no es una publicación del juego. Elige una carpeta vacía o nueva.`);
  }
  await rm(dest, { recursive: true, force: true });
}
await mkdir(dest, { recursive: true });

// Los README de las carpetas no se publican, ni el material de trabajo: las muestras de la música y las fotos de la carta
const WORK = [path.join(root, 'assets', 'audio', 'samples'), path.join(root, 'assets', 'images', 'info-logo-tragos')];
const notDocs = (src) => !src.endsWith('.md') && !WORK.includes(path.resolve(src));
for (const item of REQUIRED) await cp(path.join(root, item), path.join(dest, item), { recursive: true, filter: notDocs });
for (const item of OPTIONAL) {
  if (await exists(path.join(root, item))) await cp(path.join(root, item), path.join(dest, item), { recursive: true, filter: notDocs });
}
// El service worker: la lista de archivos (rutas relativas, con './' por la página) y su huella,
// que también cuenta el propio sw.js (sin la huella), para que un cambio solo en él sea otra versión
const files = (await walk(dest)).filter((file) => file !== 'sw.js').sort();
const sw = await readFile(path.join(dest, 'sw.js'), 'utf8');
const hash = createHash('sha256').update(sw);
for (const file of files) hash.update(file).update(await readFile(path.join(dest, file)));
const version = hash.digest('hex').slice(0, 12);
const stamped = sw
  .replace("const VERSION = 'dev';", `const VERSION = '${version}';`)
  .replace('const FILES = [];', `const FILES = ${JSON.stringify(['./', ...files.filter((file) => file !== 'jefes.html')], null, 2)};`);
if (stamped === sw) fail('No se encontró dónde poner la versión y la lista de archivos en sw.js.');
await writeFile(path.join(dest, 'sw.js'), stamped);

await writeFile(path.join(dest, MARKER), 'Carpeta generada por tools/publicar.mjs. Se reemplaza al volver a publicar.\n');

console.log(`Juego publicado en ${dest} (versión ${version}, ${files.length} archivos para jugar sin internet)`);

/** Todos los archivos de una carpeta, con rutas relativas a ella y con «/». */
async function walk(dir, base = dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full, base)));
    else out.push(path.relative(base, full).split(path.sep).join('/'));
  }
  return out;
}
