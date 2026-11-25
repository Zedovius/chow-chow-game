// La música: que las partituras cumplan lo que se pidió (sol menor pentatónica, contrapunto, intensidad que
// sube), que la mezcla dé una vuelta sin corte, que los archivos estén, y que el juego alterne las bandas
// sonoras, cambie a compás y no llene la memoria.

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SOUNDS } from '../js/audio/sounds.js';
import { AudioManager, connectAudio } from '../js/audio/Audio.js';
import { Events } from '../js/core/events.js';
import { journeyFor, ZODIAC } from '../js/world/levels.js';
import { MARGIN, padded, SOUNDTRACKS, STRETCHES } from './musica.mjs';
import { Pista, SAMPLES } from './musica/mezcla.mjs';
import { SR } from './musica/dsp.mjs';
import { BAR, BPM, broken, canon, chain, chords, clash, counter, DEGREES, figure, midi, parallels, progression, read, theme, topLine } from './musica/partitura.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const books = SOUNDTRACKS.map(({ name, makers }) => ({ name, tracks: makers.map((make) => make()) }));
const all = books.flatMap(({ tracks }) => tracks);
const { soundtracks, start, bar, every } = SOUNDS.music;

test('la escala es sol menor pentatónica y el tema, el de las muestras', () => {
  const classes = new Set(Array.from({ length: 40 }, (_, i) => midi(i - 20) % 12));
  assert.deepEqual([...classes].sort((a, b) => a - b), [0, 2, 5, 7, 10]); // C D F G Bb
  assert.equal(midi(8), 74); // D5
  assert.deepEqual(theme(0, 1).map((o) => midi(o.i)), [74, 79, 79]); // D5+G5, G5
  assert.equal(60 / BPM * 4, BAR);
  assert.equal(bar, BAR);
  assert.throws(() => read('8 x 9'));
  // En 3-3-2-3-3-2: seis tresillos caen en los pasos 0 3 6 8 11 14
  assert.deepEqual(broken(read('1 2 3 4 5 6')).map((o) => Math.round(o.at * 16)), [0, 3, 6, 8, 11, 14]);
});

test('cada banda sonora: cinco canciones y la variación del menú, en distintos grados', () => {
  assert.equal(new Set(all.map(({ id }) => id)).size, 12);
  for (const { tracks } of books) {
    assert.equal(tracks.length, 6);
    assert.ok(new Set(tracks.map(({ center }) => center)).size >= 4);
    for (const { center } of tracks) assert.ok(DEGREES.includes(center));
  }
  assert.equal(STRETCHES.reduce((a, b) => a + b), 11);
});

test('la primera usa los samples: chow-intro en el menú y el trago, chow-medio en medio y chow-intro-hard en la pelea', () => {
  const used = books.map(({ tracks }) => tracks.map(({ parts }) => parts.filter((p) => p.instrument === 'muestra').map((p) => p.name)));
  assert.deepEqual(used[0], [['chow-intro'], ['chow-intro'], [], ['chow-medio-1'], [], ['chow-intro-hard']]);
  assert.deepEqual(used[1], [[], [], [], [], [], []]);
  assert.deepEqual(Object.keys(SAMPLES).sort(), ['chow-intro', 'chow-intro-hard', 'chow-medio-1']);
});

test('todas suenan desde el principio, con bajo y con un instrumento chino', () => {
  const CHINESE = ['guzheng', 'pipa', 'yangqin', 'guqin', 'bianzhong', 'dizi', 'xiao', 'erhu', 'suona', 'sheng', 'muestra'];
  for (const track of all) {
    assert.ok(track.parts.some((p) => /^bajo|reese|grunido/i.test(p.instrument)), track.id);
    assert.ok(track.parts.flatMap((p) => p.notes).filter((o) => o.at < 1).length >= 1, track.id);
    assert.ok(track.parts.some((p) => CHINESE.includes(p.instrument) && p.notes.length), track.id);
    for (const { instrument, notes } of track.parts) {
      for (const o of notes) {
        assert.ok(o.at >= 0 && o.at < track.bars && o.dur > 0 && o.v > 0 && o.v <= 1, `${track.id} ${instrument}`);
        if (instrument !== 'muestra') assert.ok(midi(o.i) >= 26 && midi(o.i) <= 100, `${track.id} ${instrument}: ${midi(o.i)}`);
      }
    }
  }
});

test('los mundos y la pelea llevan tambores que cuentan distinto que el compás (3, 5 o 7 contra 4)', () => {
  for (const { tracks } of books) {
    for (const track of tracks.slice(2)) {
      const odd = track.hits.filter(({ at }) => { const step = at * 16; return Math.abs(step - Math.round(step)) > 0.01; });
      assert.ok(odd.length > 24, `${track.id}: ${odd.length}`);
    }
  }
});

test('contrapunto: dos voces o más, que chocan poco y casi no se mueven en quintas ni octavas paralelas', () => {
  for (const track of all) {
    if (!/menu/.test(track.id)) assert.ok(Object.keys(track.voices).length >= 2, track.id);
    for (const { pair, clash: cost, parallels: count } of track.counterpoint()) {
      assert.ok(cost < 0.42, `${track.id} ${pair}: choque ${cost}`);
      assert.ok(count <= 5, `${track.id} ${pair}: ${count} paralelas`);
    }
  }
});

test('la intensidad sube del menú al rival', () => {
  for (const { name, tracks: [menu, toast, ...climb] } of books) {
    climb.forEach((track, i) => { if (i) assert.ok(track.level > climb[i - 1].level, `${track.id}: ${track.level} LUFS`); });
    assert.ok(menu.level < climb[0].level && toast.level < climb[0].level, name);
    // Los mundos: cada canción, con más golpes que la anterior (el rival lleva los de su sample)
    const beats = climb.slice(0, 3).map((t) => t.hits.length / t.bars);
    assert.ok(beats[0] < beats[2] && beats[1] < beats[2], `${name}: ${beats}`);
  }
});

test('el contrapunto: el canon contesta a tiempo y la voz nueva esquiva los choques', () => {
  const lead = broken(theme());
  for (const delay of [2, 1, 0.5, 0.25]) {
    const answer = canon(lead, { delay });
    assert.equal(answer.length, topLine(lead).length);
    assert.ok(clash(lead, answer) < 0.3, `${delay}: ${clash(lead, answer)}`);
  }
  const prog = progression('G:2 F Bb');
  const voice = counter(theme(0, 4), { rhythm: 'x - x - x -', low: 0, high: 7, seed: 3, prog });
  assert.ok(clash(theme(0, 4), voice) < 0.15);
  assert.equal(parallels(theme(0, 4), voice), 0);
  assert.deepEqual(voice, counter(theme(0, 4), { rhythm: 'x - x - x -', low: 0, high: 7, seed: 3, prog })); // siempre igual
});

test('la mezcla da una vuelta sin corte, al volumen pedido y sin saturar', () => {
  const make = () => {
    const p = new Pista({ id: 'prueba', title: 'Prueba', center: 'G', feel: '', bars: 2, seed: 5, level: -16 });
    const prog = progression('G F');
    p.play('guzheng', chain(theme(0, 2)), { as: 'a' });
    p.play('erhu', read('5 - - - 6 - - - | 8 - - - - - - -'), { as: 'b' }); // dura hasta el corte
    p.play('bajo808', figure(prog, 'R-------r-------', { octave: -2 }));
    p.play('colchon', chords(prog, 'x', { around: 0 }));
    p.beat({ bombo: 'X...x...X...x...', tarola: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.' });
    return p;
  };
  const track = make();
  const { l, r, n } = track.render();
  assert.equal(n, 2 * BAR * SR);
  assert.ok(Math.abs(track.report.level + 16) < 0.4, `${track.report.level} LUFS`);
  assert.ok(track.report.peak > 0.2 && track.report.peak <= 0.9, `pico ${track.report.peak}`);
  for (const x of [l, r]) {
    assert.ok(x.every(Number.isFinite));
    // El salto del final al principio no es más grande que los de adentro
    let biggest = 0;
    for (let i = 1; i < n; i++) biggest = Math.max(biggest, Math.abs(x[i] - x[i - 1]));
    assert.ok(Math.abs(x[0] - x[n - 1]) < biggest, `salto ${Math.abs(x[0] - x[n - 1])}`);
    const margin = Math.round(MARGIN * SR);
    const wide = padded(x);
    assert.equal(wide.length, n + 2 * margin);
    assert.equal(wide[0], x[n - margin]);
    assert.equal(wide[margin], x[0]);
    assert.equal(wide.at(-1), x[margin - 1]);
  }
  assert.deepEqual(make().render().l.slice(0, 2000), l.slice(0, 2000)); // la misma semilla, la misma música
});

/** Los segundos que dice un M4A (su caja mvhd). */
function secondsOf(file) {
  const data = readFileSync(path.join(root, file));
  const at = data.indexOf('mvhd') + 4;
  return data[at] === 0 ? data.readUInt32BE(at + 16) / data.readUInt32BE(at + 12) : Number(data.readBigUInt64BE(at + 24)) / data.readUInt32BE(at + 20);
}

test('cada pista del juego existe, dura lo que su vuelta y no pesa de más', () => {
  assert.equal(start, MARGIN);
  assert.equal(soundtracks.length, books.length);
  let total = 0;
  soundtracks.forEach(({ title, worlds, boss, ending }, b) => {
    const songs = [title, ending, ...new Set(worlds), boss];
    assert.equal(worlds.length, 11);
    assert.deepEqual([...new Set(worlds)].map((song) => worlds.filter((w) => w === song).length), STRETCHES);
    songs.forEach(({ url, seconds }, k) => {
      const track = books[b].tracks[k];
      assert.equal(url, `assets/audio/music/${track.id}.m4a`);
      assert.equal(seconds, track.bars * BAR, track.id);
      assert.ok(existsSync(path.join(root, url)), `falta ${url} (npm run musica)`);
      const length = secondsOf(url);
      assert.ok(length >= seconds + 2 * MARGIN - 0.03 && length < seconds + 2 * MARGIN + 0.12, `${url}: ${length} s`);
      total += statSync(path.join(root, url)).size;
    });
  });
  assert.ok(total < 17 * 1048576, `${(total / 1048576).toFixed(1)} MB`);
});

test('las muestras no se publican', () => {
  assert.match(readFileSync(path.join(root, 'tools/publicar.mjs'), 'utf8'), /assets', 'audio', 'samples'/);
});

// --- En el juego ---------------------------------------------------------------------

/** Un AudioContext de mentira que anota qué suena y cuándo. */
function fakeAudio() {
  const log = [];
  const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {} });
  class Context {
    constructor() {
      this.currentTime = 0;
      this.state = 'running';
      this.destination = {};
    }

    createGain() { return { gain: param(), connect() {} }; }

    createDynamicsCompressor() { return { threshold: {}, knee: {}, ratio: {}, attack: {}, release: {}, connect() {} }; }

    createBufferSource() {
      const source = { playbackRate: {}, connect() {}, start: (at, offset) => log.push({ url: source.buffer.url, at, offset, loop: [source.loopStart, source.loopEnd] }), stop: (at) => log.push({ stop: source.buffer.url, at }) };
      return source;
    }

    decodeAudioData(data) { return Promise.resolve(data); }

    resume() { return Promise.resolve(); }
  }
  const fetched = [];
  globalThis.AudioContext = Context;
  globalThis.fetch = (url) => {
    fetched.push(url);
    return Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve({ url }) });
  };
  const store = new Map();
  globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  return { log, fetched, store };
}
const settle = () => new Promise((resolve) => { setTimeout(resolve, 5); });

test('la segunda banda sonora suena en una de cada tres partidas, también después de cerrar el juego', () => {
  const { store } = fakeAudio();
  const heard = [];
  let menus = [];
  let audio;
  let events;
  const open = () => {
    audio = new AudioManager();
    events = new Events();
    connectAudio(audio, events);
  };
  open();
  for (let game = 0; game < 12; game++) {
    if (game === 5) open(); // se cerró y se volvió a abrir
    events.emit('title');
    menus.push(audio.soundtrack);
    events.emit('start', { sign: 'pig', difficulty: 'easy' });
    heard.push(audio.soundtrack);
    events.emit('levelStart', { index: 0, id: 'rat' });
  }
  assert.deepEqual(heard, [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]);
  assert.deepEqual(menus, heard); // el menú ya suena con la de la partida que sigue
  assert.equal(every, 3);
  assert.equal(store.get('chowchow.partidas'), '12');
});

test('cada mundo entra en el siguiente compás, por su lugar, y solo se guardan la que suena y la que sigue', async () => {
  const { log, fetched } = fakeAudio();
  const audio = new AudioManager();
  const events = new Events();
  connectAudio(audio, events);
  events.emit('title');
  assert.equal(log.length, 0); // aún no hay permiso para sonar
  audio.unlock();
  await settle();
  const [rojo] = soundtracks;
  assert.deepEqual(log[0], { url: rojo.title.url, at: 0, offset: start, loop: [start, start + 72] });
  assert.ok(fetched.includes(rojo.worlds[0].url)); // el primer mundo, listo
  const music = () => [...audio.buffers.keys()].filter((url) => url.includes('/music/'));
  for (const sign of ['dragon', 'pig']) assert.equal(journeyFor('easy', sign).length, rojo.worlds.length + 1);

  events.emit('start', { sign: 'pig', difficulty: 'easy' });
  let now = 3.1;
  const heard = [];
  for (const [index, level] of journeyFor('easy', 'pig').entries()) {
    audio.ctx.currentTime = now;
    events.emit('levelStart', { index, id: level.id, boss: Boolean(level.boss) });
    if (level.boss) events.emit('bossStart', { sign: level.id });
    await settle();
    const song = level.boss ? rojo.boss : rojo.worlds[index];
    heard.push(audio.track.song.url);
    const begun = log.filter((e) => e.url === song.url);
    assert.equal(begun.length, 1, song.url); // los mundos que la comparten no la vuelven a empezar
    assert.equal(begun[0].at % bar, 0); // en el tiempo fuerte
    const next = level.boss ? rojo.ending : rojo.worlds[index + 1] ?? rojo.boss;
    assert.ok(music().filter((url) => ![song.url, next.url].includes(url)).length <= 1, music().join());
    assert.ok(fetched.includes(next.url));
    now += 17.3;
  }
  assert.deepEqual(heard.map((url, i) => url !== heard[i - 1]), [true, false, false, false, true, false, false, false, true, false, false, true]);
  // Al ganar, con el trago, la variación del menú; en Game Over se calla, y al reintentar empieza otra vez
  audio.ctx.currentTime = now;
  events.emit('ending');
  await settle();
  assert.equal(log.filter((e) => e.url === rojo.ending.url).length, 1);
  events.emit('gameOver');
  assert.equal(audio.track, null);
  events.emit('levelStart', { index: 4, id: 'rat' });
  await settle();
  assert.equal(log.filter((e) => e.url === rojo.worlds[4].url).length, 2);
  assert.ok(ZODIAC.length === 12);
});
