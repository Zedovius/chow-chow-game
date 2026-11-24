// Los efectos de sonido: que todo lo que pide js/audio/sounds.js exista y esté sano, y que cada aviso
// del juego y cada menú pida efectos que existen.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SOUNDS, VOICES } from '../js/audio/sounds.js';
import { connectAudio, connectMenuAudio } from '../js/audio/Audio.js';
import { Events } from '../js/core/events.js';
import { CONFIG } from '../js/config.js';
import { ZODIAC } from '../js/world/levels.js';
import { CHARGE_LOOP, CHARGE_SECONDS, note } from './sonidos.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = Object.values(SOUNDS.sfx).flat().filter(Boolean);

function read(file) {
  const data = readFileSync(path.join(root, file));
  const samples = new Int16Array(data.buffer.slice(data.byteOffset + 44, data.byteOffset + data.length));
  const channels = data.readUInt16LE(22);
  return { data, samples, seconds: samples.length / channels / data.readUInt32LE(24) };
}

test('las notas guía son de G menor pentatónica', () => {
  assert.equal(Math.round(note('G4') * 100) / 100, 392);
  for (const wrong of ['A4', 'E4', 'B4', 'Eb4', 'Ab4']) assert.throws(() => note(wrong));
});

test('cada efecto existe, no satura y no empieza ni termina con un chasquido', () => {
  let total = 0;
  for (const file of files) {
    const { data, samples, seconds } = read(file);
    assert.equal(data.toString('latin1', 0, 4), 'RIFF', file);
    const peak = samples.reduce((m, y) => Math.max(m, Math.abs(y)), 0) / 32768;
    assert.ok(peak > 0.1 && peak <= 0.86, `${file}: pico ${peak}`);
    assert.ok(Math.abs(samples[0]) < 300, file);
    if (file !== SOUNDS.sfx.charge) assert.ok(Math.abs(samples.at(-1)) < 300, file);
    total += seconds;
  }
  assert.ok(total < 25, `${total} s en total`); // que no pese de más
});

test('los efectos repetidos son cortos, y la carga dura lo mismo que cargar el especial', () => {
  for (const name of ['jump', 'flap', 'fire', 'burn', 'menuMove', 'bossWarn']) {
    for (const file of [SOUNDS.sfx[name]].flat()) {
      assert.ok(read(file).seconds < 0.35, file);
    }
  }
  assert.equal(CHARGE_SECONDS, CONFIG.charge.seconds);
  assert.deepEqual(SOUNDS.loops.charge, CHARGE_LOOP);
  assert.ok(read(SOUNDS.sfx.charge).seconds > CHARGE_LOOP[1]);
});

test('cada animal tiene su voz, cuatro de cada tipo', () => {
  assert.deepEqual(Object.keys(VOICES).sort(), ZODIAC.map(({ id }) => id).sort());
  for (const type of [0, 1, 2]) assert.equal(Object.values(VOICES).filter((v) => v === type).length, 4);
});

test('cada aviso pide efectos que existen, suenan solo los que deben y ninguno sobra', () => {
  const asked = new Map();
  let now = '';
  const audio = {};
  for (const key of ['sfx', 'hold']) audio[key] = (name, options) => asked.set(now, [...(asked.get(now) ?? []), [name, options?.index ?? 0]]);
  for (const key of ['release', 'music', 'setQuiet', 'stopMusic', 'toggleMute']) audio[key] = () => {};
  const events = new Events();
  connectAudio(audio, events);
  const game = readFileSync(path.join(root, 'js/core/Game.js'), 'utf8');
  const emitted = new Set([...game.matchAll(/events\.emit\(([^)]*?)[,)]/g)].flatMap(([, args]) => [...args.matchAll(/'(\w+)'/g)].map(([, name]) => name)));
  for (const name of ['start', ...emitted]) {
    now = name;
    for (const attack of Object.keys(CONFIG.boss.telegraph)) {
      for (const special of [true, false]) events.emit(name, { special, weak: special, jade: special, attack, sign: special ? 'pig' : 'tiger' });
    }
  }
  const target = new EventTarget();
  connectMenuAudio(audio, target);
  for (const type of ['menu:move', 'menu:select', 'wheel:spin', 'wheel:stop', 'wheel:leave']) {
    now = type;
    target.dispatchEvent(new Event(type));
  }
  assert.deepEqual([...asked.keys()].sort(), ['bossAttack', 'bossHit', 'bossWarn', 'burn', 'chargeStart', 'cocktail', 'dying', 'fire', 'fireSpecial', 'flap', 'flightGained', 'food', 'gameOver', 'highScore', 'hit', 'ingredient', 'jump', 'menu:move', 'menu:select', 'newRecord', 'pause', 'wheel:spin', 'wheel:stop']);
  const used = new Set();
  for (const [name, index] of [...asked.values()].flat()) {
    used.add(name);
    assert.ok([SOUNDS.sfx[name]].flat()[index], `${name} ${index}`);
  }
  assert.deepEqual(Object.keys(SOUNDS.sfx).filter((name) => !used.has(name)), []);
});
