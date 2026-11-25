// Compone, toca y mezcla la música del juego: dos bandas sonoras (musica/rojo.mjs, sobre los samples de
// assets/audio/samples, y musica/jade.mjs), con todos los instrumentos sintetizados aquí. Uso:
//
//   npm run musica                      todas (tarda varios minutos: usa todos los núcleos)
//   npm run musica -- rojo-farol        solo esas (los WAV ya hechos quedan en tmp: ver CACHE)
//
// Deja assets/audio/music/*.m4a, docs/musica.html (para oírlas) y docs/recorrido-*.m4a (cada banda sonora
// como se oye al jugar: un mundo tras otro, hasta el rival). El azar tiene semilla: el mismo código da
// siempre la misma música. Para convertir a M4A usa el codificador de Windows (musica/codificar.ps1).
//
// Cada archivo trae MARGIN segundos antes y después de su vuelta (el final y el principio de ella misma):
// así, aunque el navegador corra el sonido unos milisegundos al decodificarlo, la vuelta no tiene corte.

import { execFileSync, fork } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CONFIG } from '../js/config.js';
import { clamp, mix, SR, wav } from './musica/dsp.mjs';
import { BAR, MODES } from './musica/partitura.mjs';
import { JADE } from './musica/jade.mjs';
import { ROJO } from './musica/rojo.mjs';
import { sampleBytes } from './musica/mezcla.mjs';

const self = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(self), '..');
const OUT = path.join(root, 'assets', 'audio', 'music');
export const MARGIN = 0.25;
const KBPS = 128;
/** Los WAV de la última vez: si se vuelve a correr, solo se hacen los que cambiaron. */
const CACHE = path.join(os.tmpdir(), 'chowchow-musica');

/** Las dos bandas sonoras: el menú, su variación (con el trago), las tres de los mundos y el rival. */
export const SOUNDTRACKS = [ROJO, JADE].map(({ name, menu, brindis, worlds, rival }) => ({ name, makers: [menu, brindis, ...worlds, rival] }));
/** Cuántos mundos seguidos suena cada una de las tres. */
export const STRETCHES = [4, 4, 3];

/** Una vuelta con su margen a cada lado. */
export function padded(channel, margin = Math.round(MARGIN * SR)) {
  const n = channel.length;
  return Float32Array.from({ length: n + 2 * margin }, (_, i) => channel[(((i - margin) % n) + n) % n]);
}

/** En un proceso aparte: hace las pistas pedidas y deja sus WAV en dir. */
async function render(dir, ids) {
  for (const { makers } of SOUNDTRACKS) {
    for (const make of makers) {
      const track = make();
      if (!ids.includes(track.id)) continue;
      const started = Date.now();
      const bus = track.render();
      await writeFile(path.join(dir, `${track.id}.wav`), wav(padded(bus.l), padded(bus.r)));
      process.send?.({ id: track.id, ...track.report, seconds: (Date.now() - started) / 1000 });
    }
  }
}

/** Reparte las pistas entre varios procesos (las más largas primero). */
async function renderAll(dir, tracks) {
  const queue = [...tracks].sort((a, b) => b.bars * b.parts.length - a.bars * a.parts.length).map(({ id }) => id);
  const reports = new Map();
  const worker = async () => {
    while (queue.length) {
      const id = queue.shift();
      await new Promise((resolve, reject) => {
        const child = fork(self, ['--render', dir, id]);
        child.on('message', (report) => {
          reports.set(report.id, report);
          console.log(`${report.id}  ${report.level.toFixed(1)} LUFS  pico ${report.peak.toFixed(2)}  (${report.seconds.toFixed(0)} s)`);
        });
        child.on('exit', (code) => (code ? reject(new Error(`No se pudo hacer ${id}`)) : resolve()));
      });
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(4, os.cpus().length)) }, worker));
  return reports;
}

function encode(from, to) {
  if (process.platform !== 'win32') throw new Error('Para convertir a M4A hace falta Windows (o convierte a mano los WAV).');
  execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(root, 'tools', 'musica', 'codificar.ps1'), '-Origen', from, '-Destino', to, '-Kbps', String(KBPS)], { stdio: 'inherit' });
}

/** La vuelta de un WAV hecho aquí (sin sus márgenes). */
async function loop(file) {
  const data = await readFile(file);
  const margin = Math.round(MARGIN * SR);
  const n = (data.length - 44) / 4 - 2 * margin;
  const channel = (offset) => Float32Array.from({ length: n }, (_, i) => data.readInt16LE(44 + (i + margin) * 4 + offset) / 32768);
  return [channel(0), channel(2)];
}

/** Una banda sonora como se oye al jugar: el menú, los mundos (cada canción, varios seguidos), el rival y el trago. */
async function journey(dir, [menu, toast, ...rest]) {
  const { first, last } = CONFIG.levelSeconds;
  const worlds = rest.slice(0, STRETCHES.length);
  const rival = rest.at(-1);
  // El mundo termina cuando ya no hay obstáculos adelante
  const seconds = Array.from({ length: 11 }, (_, k) => mix(first, last, k / 10) + 1.5);
  let world = 0;
  const ids = [menu, ...worlds, rival, toast];
  const lengths = [24, ...STRETCHES.map((count) => Math.ceil(seconds.slice(world, (world += count)).reduce((a, b) => a + b) / BAR) * BAR), 72, 24];
  const total = lengths.reduce((a, b) => a + b) * SR;
  const out = [new Float32Array(total + SR), new Float32Array(total + SR)];
  let at = 0;
  for (const [k, id] of ids.entries()) {
    const source = await loop(path.join(dir, `${id}.wav`));
    const n = lengths[k] * SR;
    source.forEach((x, side) => {
      for (let i = 0; i < n + SR * 0.8; i++) {
        const g = (i < n ? 1 : Math.exp(-(i - n) / SR / 0.09)) * (k ? 1 : Math.min(1, i / SR));
        out[side][at + i] = clamp((out[side][at + i] ?? 0) + x[i % x.length] * g, -1, 1);
      }
    });
    at += n;
  }
  return out;
}

const FEEL = (track) => `${track.center} · ${MODES[track.center]} · ${track.feel}`;

/** La página para oírlas. */
function page(books) {
  const row = (track, label) => `<li><b>${label}</b><span><strong>${track.title}</strong><small>${FEEL(track)}</small></span><audio controls preload="none" src="../assets/audio/music/${track.id}.m4a"></audio></li>`;
  const section = ({ name, tracks }) => `<section><h2>${name}</h2><p class="all"><strong>El recorrido completo</strong> <small>como se oye al jugar: menú, los 11 mundos, el rival y el trago</small><audio controls preload="none" src="recorrido-${name.toLowerCase()}.m4a"></audio></p><ol>${tracks.map((track, k) => row(track, ['Menú', 'Trago', 'Mundos 1–4', 'Mundos 5–8', 'Mundos 9–11', 'Rival'][k])).join('\n')}</ol></section>`;
  return `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Chow Chow: música</title>
<style>body{margin:0;padding:24px;background:#0b0b0c;color:#e8e4dd;font:16px/1.4 system-ui,sans-serif}h1{margin:0 0 4px;font-size:22px}h2{margin:28px 0 10px;font-size:19px;color:#dd333a}p{margin:0;color:#a8a49d;max-width:70ch}small{display:block;color:#a8a49d}ol{list-style:none;margin:0;padding:0;display:grid;gap:8px}
main{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,460px),1fr));gap:0 32px}li,.all{display:grid;grid-template-columns:104px 1fr 260px;gap:4px 12px;align-items:center;padding:10px 12px;border:1px solid #38383b;background:#131314}.all{grid-template-columns:1fr 260px;margin:0 0 12px;border-color:#b8222b;background:#1d1d1f;color:inherit}.all small{grid-column:1}.all audio{grid-column:2;grid-row:1/3}audio{width:100%;height:36px}
@media(max-width:560px){li,.all{grid-template-columns:1fr}.all audio{grid-column:1;grid-row:auto}}</style>
<h1>Chow Chow: música</h1><p>Dos bandas sonoras de cinco canciones, a 120 BPM y en sol menor pentatónica. «Rojo» va sobre los samples; «Jade» suena en una de cada tres partidas.</p><main>
${books.map(section).join('\n')}
</main><script>const all=[...document.querySelectorAll('audio')];for(const a of all)a.addEventListener('play',()=>{for(const b of all)if(b!==a)b.pause()})</script></html>
`;
}

/** Una huella de todo lo que decide cómo suena una pista: su partitura y el código que la toca. */
async function fingerprint(track) {
  const hash = createHash('sha256');
  for (const file of ['dsp', 'partitura', 'mezcla', 'percusion', 'tradicionales', 'sintetizadores']) hash.update(await readFile(path.join(root, 'tools', 'musica', `${file}.mjs`)));
  const { parts, hits, n, seed, level, drive, room, echo } = track;
  for (const { instrument, name } of parts) if (instrument === 'muestra') hash.update(sampleBytes(name));
  const curves = parts.map(({ options }) => ['vol', 'cut'].map((key) => (options[key] ? Array.from({ length: track.bars * 4 }, (_, k) => options[key](k / 4)) : null)));
  hash.update(JSON.stringify({ parts, hits, n, seed, level, drive, room, echo, curves }));
  return hash.digest('hex').slice(0, 16);
}

async function main() {
  const wanted = process.argv.slice(2);
  const books = SOUNDTRACKS.map(({ name, makers }) => ({ name, tracks: makers.map((make) => make()) }));
  const everything = books.flatMap((book) => book.tracks);
  const tracks = everything.filter(({ id }) => !wanted.length || wanted.includes(id));
  if (wanted.length && tracks.length !== wanted.length) throw new Error(`No hay esa pista. Hay: ${everything.map(({ id }) => id).join(' ')}`);
  await mkdir(OUT, { recursive: true });
  await mkdir(path.join(root, 'docs'), { recursive: true });
  await mkdir(CACHE, { recursive: true });
  const stamps = JSON.parse(await readFile(path.join(CACHE, 'huellas.json'), 'utf8').catch(() => '{}'));
  const exists = (file) => stat(file).then(() => true, () => false);
  const changed = [];
  for (const track of tracks) {
    track.stamp = await fingerprint(track);
    if (stamps[track.id] !== track.stamp || !(await exists(path.join(CACHE, `${track.id}.wav`)))) changed.push(track);
  }
  if (changed.length) await renderAll(CACHE, changed);
  for (const { id, stamp } of changed) stamps[id] = stamp;
  await writeFile(path.join(CACHE, 'huellas.json'), JSON.stringify(stamps));
  // A M4A, las pedidas; y con todas, también los recorridos
  const dir = await mkdtemp(path.join(os.tmpdir(), 'chowchow-m4a-'));
  try {
    for (const { id } of tracks) await copyFile(path.join(CACHE, `${id}.wav`), path.join(dir, `${id}.wav`));
    encode(dir, OUT);
    if (!wanted.length) {
      const trips = path.join(dir, 'recorridos');
      await mkdir(trips);
      for (const { name, tracks: list } of books) {
        const [l, r] = await journey(CACHE, list.map(({ id }) => id));
        await writeFile(path.join(trips, `recorrido-${name.toLowerCase()}.wav`), wav(l, r));
      }
      encode(trips, path.join(root, 'docs'));
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
  await writeFile(path.join(root, 'docs', 'musica.html'), page(books));
  let bytes = 0;
  for (const { id } of everything) bytes += await stat(path.join(OUT, `${id}.m4a`)).then((s) => s.size, () => 0);
  console.log(`${changed.length} pistas nuevas de ${tracks.length}; ${(bytes / 1048576).toFixed(1)} MB en assets/audio/music. Para oírlas: docs/musica.html`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv[2] === '--render') await render(process.argv[3], process.argv.slice(4));
  else await main();
}
