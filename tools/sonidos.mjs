// Crea los efectos de sonido del juego (assets/audio/sfx/*.wav), sin programas ni muestras de nadie:
// todo se sintetiza aquí. Uso: npm run sonidos
//
// Carácter de maquinita de la época de 32 bits: cada efecto son varias capas (ondas desafinadas, FM,
// ruido con filtro resonante, un golpe grave) con algo de saturación, estéreo y reverberación. No son
// melodías. Sol menor pentatónica (G Bb C D F) es solo la guía: los tonos salen y llegan cerca de sus
// notas, para que no choquen con la música.
//
// También escribe docs/sonidos.html, una página para oírlos todos (se abre con doble clic).
// El azar tiene semilla: el mismo código da siempre los mismos archivos.

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(root, 'assets', 'audio', 'sfx');

const R = 96000; // se sintetiza a 96 kHz (para que los agudos no se ensucien) ...
const DOWN = 3; // ... y se guarda a 32 kHz
export const RATE = R / DOWN;
const TAU = Math.PI * 2;

// --- Notas y curvas -------------------------------------------------------------

const SEMITONES = { C: 0, D: 2, F: 5, G: 7, Bb: 10 };

/** 'G4' → 392 Hz (solo notas de G menor pentatónica, la guía). */
export function note(name) {
  const match = /^([A-G]b?)(\d)$/.exec(name);
  if (!match || !(match[1] in SEMITONES)) throw new Error(`«${name}» no está en G menor pentatónica (G Bb C D F)`);
  return 440 * 2 ** ((SEMITONES[match[1]] + 12 * (Number(match[2]) + 1) - 69) / 12);
}

const hz = (value) => (typeof value === 'string' ? note(value) : value);
/** Un deslizamiento de una altura a otra. curve < 1: rápido al principio; > 1: rápido al final. */
const slide = (from, to, curve = 1) => (k) => hz(from) * (hz(to) / hz(from)) ** (k ** curve);
/** Una altura fija. */
const at = (value) => () => hz(value);
/** Lo mismo, temblando: rate veces por segundo, depth de ancho. */
const wobble = (pitch, rate, depth) => (k, s) => pitch(k, s) * (1 + depth * Math.sin(TAU * rate * s));
/** Lo mismo, saltando a ratio y de vuelta, rate veces por segundo. */
const ring = (pitch, rate, ratio) => (k, s) => pitch(k, s) * (Math.floor(s * rate) % 2 ? ratio : 1);
/** Volumen que cae. power: qué tan rápido. */
const fall = (power = 1, level = 1) => (k) => level * (1 - k) ** power;
/** Volumen que se apaga como un golpe. */
const hit = (tau, level = 1) => (k, s) => level * Math.exp(-s / tau) * Math.min(1, (1 - k) * 8);
/** Volumen que sube y baja. */
const swell = (peak = 0.5, level = 1) => (k) => level * Math.sin(Math.PI * k ** (Math.log(0.5) / Math.log(peak)));

// --- El sintetizador ------------------------------------------------------------

let seed = 1;
function random() {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/**
 * Una capa. pitch(k, s) en Hz y vol(k, s) de 0 a 1, con k de 0 a 1 en lo que dura y s en segundos.
 *   wave      'saw' | 'pulse' (duty) | 'sine' | 'noise' | 'fm' (ratio e index(k): el brillo)
 *   unison    cuántas voces apenas desafinadas (spread, en centésimas de semitono), abiertas en estéreo
 *   cut       un filtro que sigue esta altura; res: su resonancia; mode: 'lp' | 'bp' | 'hp'
 *   flutter   el volumen tiembla al azar (el fuego, las alas)
 *   drive     saturación;  pan: de -1 (izquierda) a 1;  attack: segundos en entrar
 */
function voice({ dur, pitch = at(440), vol = fall(), wave = 'pulse', duty = 0.5, ratio = 2, index = () => 2, unison = 1, spread = 14, cut = null, res = 0.8, mode = 'lp', flutter = 0, drive = 0, pan = 0, attack = 0.0015 }) {
  const n = Math.ceil(dur * R);
  const left = new Float32Array(n);
  const right = new Float32Array(n);
  const count = wave === 'noise' ? 2 : unison; // el ruido, distinto a cada lado
  for (let u = 0; u < count; u++) {
    const side = count > 1 ? (2 * u) / (count - 1) - 1 : 0;
    const tune = wave === 'noise' ? 1 : 2 ** ((side * spread) / 1200);
    const place = Math.max(-1, Math.min(1, pan + side * (wave === 'noise' ? 1 : 0.6)));
    const gl = Math.cos(((place + 1) * Math.PI) / 4) / Math.sqrt(count);
    const gr = Math.sin(((place + 1) * Math.PI) / 4) / Math.sqrt(count);
    let phase = count > 1 ? random() : 0;
    let mod = 0;
    let [i1, i2, g, a1, makeup] = [0, 0, 0, 0, 1];
    let [flick, flickTo] = [1, 1];
    for (let i = 0; i < n; i++) {
      const s = i / R;
      const k = s / dur;
      let y;
      if (wave === 'noise') y = random() * 2 - 1;
      else {
        const f = pitch(k, s) * tune;
        phase = (phase + f / R) % 1;
        if (wave === 'saw') y = 2 * phase - 1;
        else if (wave === 'pulse') {
          const width = typeof duty === 'function' ? duty(k, s) : duty;
          y = phase < width ? 2 * (1 - width) : -2 * width;
        } else if (wave === 'fm') {
          mod = (mod + (f * ratio) / R) % 1;
          y = Math.sin(TAU * phase + index(k, s) * Math.sin(TAU * mod));
        } else y = Math.sin(TAU * phase);
      }
      if (cut) {
        if (i % 16 === 0) {
          const f = Math.max(30, Math.min(R * 0.4, cut(k, s)));
          g = Math.tan((Math.PI * f) / R);
          a1 = 1 / (1 + g * (g + 1 / res));
          // Entre menos ruido deja pasar el filtro, más se sube: si no, el golpe grave lo tapa
          if (wave === 'noise' && mode !== 'hp') makeup = Math.max(1, (24000 * (mode === 'bp' ? res : 1)) / f) ** 0.3;
        }
        const v1 = a1 * (i1 + g * (y - i2));
        const v2 = i2 + g * v1;
        i1 = 2 * v1 - i1;
        i2 = 2 * v2 - i2;
        y = (mode === 'lp' ? v2 : mode === 'bp' ? v1 / res : y - v1 / res - v2) * makeup;
      }
      if (flutter) {
        if (i % 900 === 0) flickTo = 1 - flutter * random();
        flick += (flickTo - flick) * 0.004;
        y *= flick;
      }
      y *= vol(k, s) * Math.min(1, s / attack, (dur - s) / 0.003);
      if (drive) y = Math.tanh(y * (1 + drive)) / Math.tanh(1 + drive);
      left[i] += y * gl;
      right[i] += y * gr;
    }
  }
  return [left, right];
}

class Track {
  constructor() {
    this.left = new Float32Array(R * 5);
    this.right = new Float32Array(R * 5);
    this.end = 0;
  }

  add(options, when = 0, gain = 1) {
    const [left, right] = voice(options);
    const start = Math.round(when * R);
    for (let i = 0; i < left.length; i++) {
      this.left[start + i] += left[i] * gain;
      this.right[start + i] += right[i] * gain;
    }
    this.end = Math.max(this.end, start + left.length);
    return this;
  }

  /** El golpe grave: de una altura a otra, muy rápido. */
  thump(from, to, dur, gain = 1, when = 0) {
    return this.add({ dur, wave: 'sine', pitch: slide(from, to, 0.45), vol: hit(dur / 2.6), drive: 1.2 }, when, gain * 0.6);
  }

  /** Un chasquido al empezar: define el ataque. */
  snap(freq, gain = 1, when = 0, dur = 0.014) {
    return this.add({ dur, wave: 'noise', cut: at(freq), res: 1.2, mode: 'bp', vol: hit(dur / 3), attack: 0.0003 }, when, gain);
  }

  /** Pedazos que saltan: count granos de ruido en lo que dura, cada vez más bajos. */
  debris(count, from, span, freq, gain = 1) {
    for (let i = 0; i < count; i++) {
      const when = from + span * ((i + random() * 0.8) / count);
      const f = freq * (0.6 + 0.9 * random());
      this.add({ dur: 0.05, wave: 'noise', cut: slide(f, f * 0.5), res: 2.5, mode: 'bp', vol: hit(0.011) }, when, gain * (1 - (0.7 * i) / count));
    }
    return this;
  }

  /** Destellos: pings de FM (vidrio, cristal), abiertos en estéreo. */
  glints(names, when, gap, { dur = 0.35, gain = 0.3, ratio = 3 } = {}) {
    names.forEach((name, i) => this.add({ dur, wave: 'fm', pitch: at(name), ratio, index: (k) => 2.2 * (1 - k) ** 3, vol: hit(dur / 4), pan: i % 2 ? 0.6 : -0.6 }, when + i * gap, gain));
    return this;
  }

  echo(seconds, back, times = 3) {
    const d = Math.round(seconds * R);
    this.end += d * times;
    for (let i = d; i < this.end; i++) {
      // Cruzado: de un lado al otro
      const [l, r] = [this.left[i - d], this.right[i - d]];
      this.left[i] += r * back;
      this.right[i] += l * back;
    }
    return this;
  }

  /** Reverberación de cuarto: cuánto se oye y cuántos segundos tarda en apagarse. */
  room(wet = 0.15, seconds = 0.5) {
    const end = Math.min(this.left.length, this.end + Math.round(seconds * R));
    const process = (input, shift) => {
      const sum = new Float32Array(end);
      for (const ms of [29.7, 34.1, 37.9, 41.3, 45.7, 50.3]) {
        const d = Math.round(((ms + shift) / 1000) * R);
        const back = 10 ** ((-3 * d) / R / seconds);
        const line = new Float32Array(d);
        let low = 0;
        for (let i = 0, p = 0; i < end; i++, p = (p + 1) % d) {
          const y = line[p];
          low += (y - low) * 0.32; // los agudos se apagan antes
          line[p] = input[i] + low * back;
          sum[i] += y / 6;
        }
      }
      for (const ms of [5, 1.7]) {
        const d = Math.round(((ms + shift * 0.2) / 1000) * R);
        const line = new Float32Array(d);
        for (let i = 0, p = 0; i < end; i++, p = (p + 1) % d) {
          const y = line[p] - 0.6 * sum[i];
          line[p] = sum[i] + 0.6 * y;
          sum[i] = y;
        }
      }
      return sum;
    };
    const [l, r] = [process(this.left, 0), process(this.right, 1.1)];
    for (let i = 0; i < end; i++) {
      this.left[i] += l[i] * wet * 2.5;
      this.right[i] += r[i] * wet * 2.5;
    }
    this.end = end;
    return this;
  }
}

/** De 96 a 32 kHz, con un filtro (sinc con ventana de Blackman), y sin lo que está por debajo de 30 Hz. */
function decimate(input) {
  const half = 16 * DOWN;
  const cut = 0.46 / DOWN;
  const taps = Array.from({ length: 2 * half + 1 }, (_, i) => {
    const x = i - half;
    const window = 0.42 + 0.5 * Math.cos((Math.PI * x) / half) + 0.08 * Math.cos((TAU * x) / half);
    return (x === 0 ? 2 * cut : Math.sin(TAU * cut * x) / (Math.PI * x)) * window;
  });
  const out = new Float32Array(Math.floor(input.length / DOWN));
  const hp = Math.exp((-TAU * 30) / RATE);
  let [before, high] = [0, 0];
  for (let i = 0; i < out.length; i++) {
    let y = 0;
    for (let j = 0; j < taps.length; j++) y += (input[i * DOWN + j - half] ?? 0) * taps[j];
    high = y - before + hp * high;
    before = y;
    out[i] = high;
  }
  return out;
}

/** El volumen que se oye: lo más fuerte de 50 ms seguidos, sin contar los graves que casi no se oyen. */
function loudness(samples) {
  const a = Math.exp((-TAU * 250) / RATE);
  const win = Math.round(RATE * 0.05);
  let [before, hp, sum, top] = [0, 0, 0, 0];
  const square = [];
  samples.forEach((y, i) => {
    hp = a * (hp + y - before);
    before = y;
    square.push(hp * hp);
    sum += hp * hp - (i >= win ? square[i - win] : 0);
    top = Math.max(top, sum / win);
  });
  return Math.sqrt(top);
}

/**
 * Los canales (uno o dos) al volumen pedido, con los picos redondeados (como cinta), sin silencio al
 * final y sin chasquidos en las orillas.
 */
function finish(track, { level, loop, stereo }) {
  const sides = [track.left, track.right].map((side) => decimate(side.subarray(0, track.end)));
  const mid = sides[0].map((y, i) => (y + sides[1][i]) / 2);
  const gain = level / loudness(mid);
  let channels = (stereo ? sides : [mid]).map((side) => side.map((y) => 0.85 * Math.tanh((y * gain) / 0.85)));
  const top = Math.max(...channels.map((side) => side.reduce((m, y) => Math.max(m, Math.abs(y)), 0)));
  let end = mid.length;
  if (!loop) while (end > 0 && channels.every((side) => Math.abs(side[end - 1]) < top * 0.008)) end--;
  const fade = loop ? 0 : Math.round(Math.min(0.03, (0.15 * end) / RATE) * RATE);
  channels = channels.map((side) => side.slice(0, end).map((y, i) => y * Math.min(1, i / 16, fade ? (end - 1 - i) / fade : 1)));
  return channels;
}

/** Un WAV de 16 bits; channels: uno o dos. */
export function wav(channels) {
  const count = channels.length;
  const size = channels[0].length * count * 2;
  const data = Buffer.alloc(44 + size);
  data.write('RIFF', 0);
  data.writeUInt32LE(36 + size, 4);
  data.write('WAVEfmt ', 8);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20); // PCM
  data.writeUInt16LE(count, 22);
  data.writeUInt32LE(RATE, 24);
  data.writeUInt32LE(RATE * 2 * count, 28);
  data.writeUInt16LE(2 * count, 32);
  data.writeUInt16LE(16, 34);
  data.write('data', 36);
  data.writeUInt32LE(size, 40);
  channels.forEach((side, c) => side.forEach((y, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, y)) * 32767), 44 + (i * count + c) * 2)));
  return data;
}

// --- Los efectos: nombre → volumen y receta -------------------------------------------
// Lo que suena a cada rato (saltar, aletear, disparar) va más bajo, corto y sin reverberación; los
// golpes, más fuerte. stereo: los grandes. Cuál suena con cada aviso del juego: js/audio/sounds.js.

const SOUNDS = {};
const add = (name, level, recipe, { loop = false, stereo = false } = {}) => { SOUNDS[name] = { level, recipe, loop, stereo }; };
const STEREO = { stereo: true };

// Brincar: uno por tipo de animal (1 ligeros, 2 medianos, 3 pesados; ver VOICES en sounds.js)
const leap = (t, { from, to, curve, dur, duty, weight }) => t
  .add({ dur, duty, unison: 2, spread: 9, pitch: slide(from, to, curve), cut: slide(5200, 2600), vol: fall(0.8, 0.7) })
  .add({ dur, wave: 'sine', pitch: slide(from, to, curve), vol: fall(0.6, 0.7) })
  .add({ dur: dur * 0.9, wave: 'noise', cut: slide(1400, 4800), res: 1.4, mode: 'bp', vol: swell(0.35, 0.35) })
  .snap(2600, 0.35)
  .thump(150 + 60 * weight, 70, 0.07, 0.5 * weight);
add('jump-1', 0.1, (t) => leap(t, { from: 'G4', to: 'D6', curve: 0.8, dur: 0.16, duty: 0.3, weight: 0.3 }));
add('jump-2', 0.11, (t) => leap(t, { from: 'D4', to: 'G5', curve: 1.1, dur: 0.19, duty: 0.4, weight: 0.8 }));
add('jump-3', 0.12, (t) => leap(t, { from: 'D3', to: 'D5', curve: 1.5, dur: 0.22, duty: 0.5, weight: 1.6 }));

// Aletear: una ráfaga suave de viento, sin nota ni golpe (los mismos tres tipos: más ligero, más agudo
// y corto). Entra y sale poco a poco, y cruza apenas de un lado al otro.
const gust = (t, { dur, low, high, peak }) => {
  const breeze = swell(peak);
  t.add({ dur, wave: 'noise', cut: (k) => low + (high - low) * breeze(k), res: 0.8, mode: 'bp', vol: (k) => breeze(k) ** 1.5, attack: 0.02 })
    .add({ dur: dur * 0.9, wave: 'noise', cut: (k) => (low + high) * (0.35 + 0.4 * breeze(k)), res: 1.1, mode: 'bp', flutter: 0.25, vol: (k) => 0.4 * breeze(k) ** 1.5, attack: 0.02, pan: -0.5 })
    .add({ dur: dur * 0.9, wave: 'noise', cut: (k) => (low + high) * (0.45 + 0.4 * breeze(k)), res: 1.1, mode: 'bp', flutter: 0.25, vol: (k) => 0.4 * breeze(k) ** 1.5, attack: 0.02, pan: 0.5 }, dur * 0.1);
};
add('flap-1', 0.022, (t) => gust(t, { dur: 0.13, low: 750, high: 2400, peak: 0.36 }), STEREO);
add('flap-2', 0.022, (t) => gust(t, { dur: 0.145, low: 640, high: 2000, peak: 0.38 }), STEREO);
add('flap-3', 0.022, (t) => gust(t, { dur: 0.16, low: 540, high: 1650, peak: 0.4 }), STEREO);

// Disparar: una llamarada corta
add('fire', 0.1, (t) => t
  .add({ dur: 0.22, wave: 'noise', cut: slide(8500, 900, 0.7), res: 1.3, flutter: 0.6, vol: fall(1.6) })
  .add({ dur: 0.15, wave: 'saw', unison: 3, spread: 22, pitch: slide('G5', 'G3', 0.6), cut: slide(5200, 900), res: 1.4, vol: fall(1.2, 0.8) })
  .thump(230, 70, 0.1, 0.7)
  .snap(3800, 0.5));

// Fuego jade (con el trío completo): un rayo de cristal que vibra, en vez de llamarada...
add('fire-jade', 0.11, (t) => t
  .add({ dur: 0.24, wave: 'fm', ratio: 3, unison: 2, spread: 8, index: (k) => 3.2 * (1 - k) ** 2, pitch: ring(slide('C6', 'C5', 0.7), 62, 1.5), vol: fall(1.2, 0.8) })
  .add({ dur: 0.22, wave: 'saw', unison: 3, spread: 18, pitch: slide('G5', 'G4', 0.5), cut: slide(7000, 1600), res: 2.2, vol: fall(1, 0.5) })
  .add({ dur: 0.16, wave: 'noise', cut: slide(9000, 5000), mode: 'hp', flutter: 0.6, vol: fall(2, 0.35) })
  .thump(260, 90, 0.1, 0.6)
  .glints(['G6', 'D6'], 0.03, 0.04, { gain: 0.22, dur: 0.22 }), STEREO);

// Cargar el especial: un zumbido que sube y acelera (0.8 s, CONFIG.charge.seconds) y, ya cargado, un
// trino que se repite (la parte CHARGE_LOOP, en segundos) hasta soltarlo. Empieza en silencio: un
// toque rápido (el disparo normal) lo corta antes de que se oiga.
export const CHARGE_SECONDS = 0.8;
export const CHARGE_LOOP = [0.85, 1.25];
add('charge', 0.075, (t) => {
  const [from, dur, tail] = [0.16, CHARGE_SECONDS - 0.16, 0.5];
  // El trino: 30 cambios por segundo entre dos alturas que caben un número entero de veces en lo que
  // se repite (la suma de las dos es múltiplo de 5), para que no se note la costura
  const layer = (low, high, start, options) => t.add({
    dur: dur + tail,
    pitch: (k, s) => (s < dur ? slide(start, low, 1.3)(s / dur) : Math.floor((s - dur) * 30 + 1e-6) % 2 ? high : low),
    vol: (k, s) => {
      if (s >= dur) return 0.8;
      const q = s / dur;
      return (0.25 + 0.55 * q) * (0.62 + 0.38 * Math.sin(TAU * (8 + 10 * q) * s)); // pulsa cada vez más rápido
    },
    cut: (k, s) => 500 + 2300 * Math.min(1, s / dur) ** 1.5,
    res: 2,
    ...options,
  }, from);
  layer(392, 523, 98, { wave: 'saw' });
  layer(394, 526, 99, { wave: 'saw' });
  layer(196, 259, 49, { wave: 'sine' });
  t.add({ dur, wave: 'noise', cut: slide(500, 4500), res: 3, mode: 'bp', vol: (k) => 0.6 * k * k * Math.min(1, (1 - k) * 12) }, from);
}, { loop: true });

// El especial: un cañonazo
const cannon = (t) => t
  .add({ dur: 0.55, wave: 'saw', unison: 5, spread: 34, pitch: wobble(slide('D6', 'G2', 0.55), 30, 0.06), cut: slide(9000, 500, 0.8), res: 1.6, vol: fall(1, 0.9), drive: 1.5 })
  .add({ dur: 0.7, wave: 'noise', cut: slide(12000, 350, 0.6), res: 1.1, flutter: 0.4, vol: fall(1.5) })
  .add({ dur: 0.2, wave: 'fm', ratio: 1.41, index: (k) => 6 * (1 - k), pitch: slide('G4', 'G3'), vol: hit(0.06, 0.6) })
  .thump('G4', 34, 0.5, 1.4)
  .snap(3200, 1);
add('fire-special', 0.2, (t) => cannon(t).debris(7, 0.12, 0.35, 2200, 0.35).room(0.16, 0.6), STEREO);
// ... y el especial jade: el cañonazo con el cristal que se abre y se quiebra
add('fire-special-jade', 0.22, (t) => cannon(t)
  .add({ dur: 0.6, wave: 'fm', ratio: 2, unison: 3, spread: 16, index: (k) => 3 * (1 - k), pitch: ring(slide('C5', 'C6', 0.5), 40, 1.5), vol: fall(1.2, 0.7) })
  .glints(['G5', 'D6', 'C6', 'F6', 'G6', 'D6'], 0.1, 0.05, { gain: 0.3, dur: 0.5, ratio: 3.5 })
  .debris(6, 0.15, 0.4, 5200, 0.25)
  .room(0.22, 0.8), STEREO);

// Destruir un obstáculo: explosión corta con pedazos (dos, al azar)
[[7500, 170, 2400], [5600, 140, 1700]].forEach(([bright, low, grain], i) => add(`burn-${i + 1}`, 0.15, (t) => t
  .add({ dur: 0.34, wave: 'noise', cut: slide(bright, 260, 0.7), res: 1, vol: fall(1.7), drive: 1.5 })
  .add({ dur: 0.2, wave: 'noise', cut: slide(bright * 0.5, 900), res: 2.2, mode: 'bp', flutter: 0.8, vol: fall(1.2, 0.5) })
  .thump(low, 38, 0.24, 1.2)
  .snap(3000, 0.8)
  .debris(6, 0.07, 0.22, grain, 0.5)));

// Golpear un obstáculo: seco y feo
add('hit', 0.2, (t) => t
  .add({ dur: 0.24, wave: 'saw', unison: 3, spread: 40, pitch: slide('C5', 'G2', 0.7), cut: slide(4200, 500), res: 1.5, vol: fall(1), drive: 2 })
  .add({ dur: 0.16, wave: 'noise', cut: slide(5200, 700), res: 1.2, vol: fall(1.6), drive: 1 })
  .add({ dur: 0.1, wave: 'fm', ratio: 1.73, index: (k) => 5 * (1 - k), pitch: slide(330, 200), vol: hit(0.03, 0.7) })
  .thump(240, 48, 0.2, 1.4)
  .snap(2200, 1.2));

// Morir: cae temblando y truena al final
add('dying', 0.18, (t) => t
  .add({ dur: 1, duty: (k) => 0.5 - 0.3 * k, unison: 3, spread: 18, pitch: (k) => slide('G5', 'G2', 0.9)(k) * (1 + 0.14 * Math.sin(TAU * 11 * k)), cut: slide(4200, 700), res: 1.6, vol: (k) => 0.9 - 0.35 * k })
  .add({ dur: 1, wave: 'sine', pitch: (k) => slide('G4', 'G1', 0.9)(k) * (1 + 0.14 * Math.sin(TAU * 11 * k)), vol: (k) => 0.6 - 0.2 * k })
  .add({ dur: 0.95, wave: 'noise', cut: slide(3600, 500), res: 2.5, mode: 'bp', vol: swell(0.7, 0.3) })
  .add({ dur: 0.5, wave: 'noise', cut: slide(5200, 160, 0.6), vol: fall(1.5), drive: 1.5 }, 0.96)
  .thump(150, 32, 0.45, 1.6, 0.96)
  .debris(6, 1.04, 0.3, 1500, 0.4)
  .room(0.16, 0.6), STEREO);

// Pegarle al jefe: metálico; con el especial, un martillazo
const clang = (t, gain, dur) => [[220, 1.41], [311, 2.76], [466, 3.9]].forEach(([f, ratio], i) => t
  .add({ dur, wave: 'fm', ratio, pitch: slide(f * 1.06, f, 0.3), index: (k) => 5 * (1 - k) ** 2, vol: hit(dur / (3.5 + i)), pan: (i - 1) * 0.4 }, 0, gain * (1 - 0.25 * i)));
add('boss-hit', 0.17, (t) => {
  clang(t, 0.7, 0.24);
  t.add({ dur: 0.12, wave: 'noise', cut: slide(6500, 1600), res: 1.4, vol: fall(1.6, 0.9) }).thump(220, 60, 0.14, 1).snap(4200, 0.9);
});
add('boss-hit-special', 0.24, (t) => {
  clang(t, 1, 0.6);
  t.add({ dur: 0.7, wave: 'noise', cut: slide(9500, 220, 0.6), vol: fall(1.6), drive: 1.5 })
    .add({ dur: 0.4, wave: 'saw', unison: 4, spread: 30, pitch: ring(slide('G4', 'G2', 0.7), 34, 1.5), cut: slide(5200, 600), res: 1.5, vol: fall(1.1, 0.7), drive: 1 })
    .thump('D4', 30, 0.5, 1.7)
    .snap(2800, 1.2)
    .debris(9, 0.1, 0.45, 2000, 0.45)
    .room(0.2, 0.7);
}, STEREO);

// En el punto débil: la moneda resuena como un gong chico y saltan chispas
add('boss-weak', 0.22, (t) => {
  [[196, 2.0], [294, 1.41], [392, 2.76], [587, 3.5]].forEach(([f, ratio], i) => t
    .add({ dur: 0.75, wave: 'fm', ratio, pitch: slide(f * 1.04, f, 0.3), index: (k) => 3.5 * (1 - k) ** 2, vol: hit(0.2 - i * 0.03), pan: i % 2 ? 0.4 : -0.4 }, 0, 0.8 - 0.15 * i));
  t.add({ dur: 0.1, wave: 'noise', cut: slide(8000, 2500), res: 1.5, vol: fall(1.4, 0.9) })
    .add({ dur: 0.35, wave: 'saw', unison: 3, spread: 30, pitch: slide('G4', 'G3', 0.6), cut: slide(3500, 500), res: 1.6, vol: fall(1.3, 0.5), drive: 1 })
    .thump(220, 45, 0.3, 1.3)
    .snap(3600, 1)
    .debris(8, 0.06, 0.4, 5200, 0.4)
    .room(0.2, 0.7);
}, STEREO);

// El jefe: un aviso corto (igual para todos) y cada ataque con lo suyo
add('boss-warn', 0.12, (t) => {
  for (const when of [0, 0.13]) {
    t.add({ dur: 0.11, wave: 'saw', unison: 3, spread: 24, pitch: wobble(at('G3'), 42, 0.12), cut: slide(900, 3000), res: 3, vol: swell(0.4) }, when)
      .add({ dur: 0.11, wave: 'sine', pitch: at('G2'), vol: swell(0.4, 0.8) }, when)
      .add({ dur: 0.09, duty: 0.4, pitch: at('D4'), cut: at(1800), vol: swell(0.4, 0.4) }, when);
  }
});
add('boss-shot', 0.16, (t) => t // disparos: ronco
  .add({ dur: 0.28, wave: 'saw', unison: 3, spread: 30, pitch: wobble(slide('D5', 'G2', 0.55), 46, 0.09), cut: slide(4200, 450), res: 1.8, vol: fall(1.1), drive: 1.5 })
  .add({ dur: 0.3, wave: 'noise', cut: slide(5200, 600, 0.7), res: 1.3, flutter: 0.6, vol: fall(1.6, 0.9) })
  .thump(190, 44, 0.2, 1.1)
  .snap(2400, 0.7));
add('boss-charge', 0.18, (t) => { // embiste: un rugido que pasa de largo
  const roar = (k) => 70 + 120 * Math.sin(Math.PI * k ** 0.7);
  const open = swell(0.42);
  t.add({ dur: 0.95, wave: 'saw', unison: 4, spread: 45, pitch: wobble(roar, 27, 0.1), cut: (k) => 350 + 1900 * open(k), res: 2.4, vol: swell(0.42), drive: 2 })
    .add({ dur: 0.95, wave: 'fm', ratio: 0.5, index: () => 3, pitch: wobble(roar, 19, 0.06), cut: (k) => 500 + 900 * open(k), res: 3, mode: 'bp', vol: swell(0.4, 0.8) })
    .add({ dur: 0.45, wave: 'noise', cut: slide(700, 4800), res: 1.2, vol: swell(0.8, 0.8), pan: 0.5 })
    .add({ dur: 0.6, wave: 'noise', cut: slide(4800, 500), res: 1.2, vol: swell(0.15, 0.8), pan: -0.5 }, 0.35)
    .room(0.12, 0.4);
}, STEREO);
add('boss-rain', 0.14, (t) => { // lluvia: silbidos que caen
  ['G5', 'F5', 'D5'].forEach((from, i) => t
    .add({ dur: 0.42, wave: 'fm', ratio: 2, index: () => 0.9, pitch: wobble(slide(note(from) * 1.5, 'G4', 1.3), 24, 0.025), vol: (k) => Math.min(1, k * 6) * (0.75 - 0.4 * k), pan: i * 0.6 - 0.6 }, i * 0.14)
    .add({ dur: 0.42, wave: 'noise', cut: slide(6500, 1800), res: 4, mode: 'bp', vol: (k) => 0.5 * k, pan: i * 0.6 - 0.6 }, i * 0.14)
    .add({ dur: 0.16, wave: 'noise', cut: slide(3200, 500), vol: fall(1.6, 0.7) }, 0.4 + i * 0.14)
    .thump(150, 50, 0.12, 0.6, 0.4 + i * 0.14));
  t.room(0.14, 0.4);
}, STEREO);
add('boss-wall', 0.17, (t) => { // muro: cuatro descargas
  for (let i = 0; i < 4; i++) {
    const when = i * 0.075;
    t.add({ dur: 0.13, wave: 'saw', unison: 3, spread: 30, pitch: slide('G4', 'G2', 0.6), cut: slide(3600, 600), res: 1.6, vol: fall(1.2), drive: 1 }, when)
      .add({ dur: 0.14, wave: 'noise', cut: slide(6000 - 900 * i, 700), res: 1.2, vol: fall(1.6, 0.9) }, when)
      .thump(180 - 15 * i, 46, 0.12, 1, when)
      .snap(2600, 0.6, when);
  }
  t.room(0.12, 0.4);
}, STEREO);

// Comida: dos mordidas crujientes y sube la energía
add('food', 0.13, (t) => {
  for (const when of [0, 0.095]) {
    t.add({ dur: 0.06, wave: 'noise', cut: slide(3200, 1300), res: 2, mode: 'bp', flutter: 0.9, vol: fall(0.8) }, when)
      .add({ dur: 0.07, wave: 'sine', pitch: slide(330, 150), vol: fall(0.9, 0.7) }, when)
      .debris(3, when, 0.05, 3600, 0.5)
      .snap(1800, 0.6, when);
  }
  t.add({ dur: 0.26, duty: 0.35, unison: 3, spread: 12, pitch: wobble(slide('G4', 'G5', 0.7), 14, 0.012), cut: slide(1600, 4200), res: 1.4, vol: fall(0.8, 0.6) }, 0.18)
    .add({ dur: 0.3, wave: 'fm', ratio: 2, index: (k) => 1.8 * (1 - k), pitch: slide('G4', 'G5', 0.7), vol: fall(1, 0.6) }, 0.18)
    .room(0.1, 0.35);
}, STEREO);

// Cóctel: hielo en la copa, tragos burbujeantes y la espuma
add('cocktail', 0.13, (t) => {
  t.glints(['D6', 'G6'], 0, 0.045, { gain: 0.28, dur: 0.3, ratio: 3.5 }).snap(5200, 0.3);
  ['C4', 'F4', 'D4', 'Bb4', 'D5'].forEach((from, i) => t
    .add({ dur: 0.075, wave: 'fm', ratio: 1, index: (k) => 0.7 * (1 - k), pitch: slide(note(from), note(from) * 2.1, 1.5), vol: swell(0.4), pan: i % 2 ? 0.3 : -0.3 }, 0.06 + i * 0.07));
  t.add({ dur: 0.4, wave: 'noise', cut: at(6200), mode: 'hp', flutter: 0.9, vol: swell(0.2, 0.22) }, 0.36).room(0.12, 0.35);
}, STEREO);

// Ingrediente del trío: un destello que sube en remolino, con eco
add('ingredient', 0.15, (t) => {
  const bases = ['G4', 'Bb4', 'C5', 'D5', 'G5'].map(note);
  const climb = (k, s) => bases[Math.min(4, Math.floor(k * 5))] * [1, 1.5, 2][Math.floor(s * 40) % 3];
  t.add({ dur: 0.55, wave: 'fm', ratio: 2, unison: 3, spread: 10, index: (k) => 2.4 - 1.4 * k, pitch: climb, vol: (k) => (0.5 + 0.5 * k) * Math.min(1, (1 - k) * 10) })
    .add({ dur: 0.6, wave: 'saw', unison: 5, spread: 24, pitch: slide('G3', 'G4', 1.2), cut: slide(400, 3800, 1.3), res: 2.2, vol: swell(0.8, 0.5) })
    .add({ dur: 0.6, wave: 'noise', cut: slide(3000, 10000), res: 2, mode: 'bp', vol: swell(0.85, 0.2) })
    .add({ dur: 0.6, wave: 'fm', ratio: 3, index: (k) => 1.8 * (1 - k) ** 2, pitch: wobble(at('G5'), 6, 0.006), unison: 2, spread: 8, vol: hit(0.18, 0.9) }, 0.52)
    .glints(['D6', 'G6', 'F6', 'D6'], 0.54, 0.07, { gain: 0.25 })
    .thump(200, 98, 0.2, 0.6, 0.52)
    .echo(0.1, 0.22)
    .room(0.2, 0.8);
}, STEREO);

// La estrella: despega
add('star', 0.14, (t) => t
  .add({ dur: 0.55, wave: 'saw', unison: 5, spread: 26, pitch: (k, s) => slide('G3', 'G5', 1.2)(k) * (1 + 0.07 * Math.sin(TAU * (8 * s + 20 * s * s))), cut: slide(700, 6500), res: 1.8, vol: (k) => 0.5 + 0.5 * k })
  .add({ dur: 0.6, wave: 'noise', cut: slide(500, 8000, 1.1), res: 1.6, mode: 'bp', vol: swell(0.85, 0.6) })
  .add({ dur: 0.5, wave: 'fm', ratio: 2, unison: 2, index: (k) => 2 * (1 - k), pitch: ring(at('G5'), 26, 1.5), vol: hit(0.15, 0.8) }, 0.54)
  .glints(['G5', 'C6', 'D6', 'G6'], 0.5, 0.06, { gain: 0.3, dur: 0.45 })
  .thump(180, 70, 0.22, 0.8, 0.54)
  .room(0.2, 0.7), STEREO);

// Récord: moneda
add('record', 0.14, (t) => {
  const coin = (name, when, dur) => t
    .add({ dur, duty: 0.5, unison: 2, spread: 6, pitch: at(name), cut: at(6500), vol: hit(dur / 2.6, 0.5) }, when)
    .add({ dur, wave: 'fm', ratio: 4, index: (k) => 0.8 * (1 - k) ** 2, pitch: at(name), vol: hit(dur / 3, 0.9) }, when)
    .add({ dur: dur * 0.5, wave: 'sine', pitch: () => note(name) * 2.76, vol: hit(dur / 12, 0.16) }, when)
    .snap(6000, 0.4, when);
  coin('C6', 0, 0.09);
  coin('G6', 0.075, 0.6);
  t.room(0.14, 0.6);
}, STEREO);

// Game Over: la máquina se apaga
add('game-over', 0.15, (t) => {
  [['G4', 'D4'], ['F4', 'C4'], ['D4', 'G3']].forEach(([from, to], i) => t
    .add({ dur: 0.24, wave: 'saw', unison: 4, spread: 20, pitch: slide(from, to, 1.4), cut: slide(3200, 900), res: 1.8, vol: fall(0.7, 0.9) }, i * 0.24)
    .thump(160, 60, 0.14, 0.7, i * 0.24)
    .snap(2000, 0.4, i * 0.24));
  t.add({ dur: 1.1, wave: 'saw', unison: 5, spread: 28, pitch: wobble(slide('C4', 'G1', 1.4), 7, 0.025), cut: slide(2600, 160, 0.8), res: 2, vol: fall(0.8) }, 0.72)
    .add({ dur: 1.1, wave: 'sine', pitch: slide('C3', 'G1', 1.4), vol: fall(0.6, 0.9) }, 0.72)
    .add({ dur: 1, wave: 'noise', cut: slide(2500, 150), res: 2, mode: 'bp', vol: fall(1, 0.25) }, 0.72)
    .thump(120, 34, 0.4, 1.2, 1.5)
    .room(0.2, 0.9);
}, STEREO);

// Menús: cambiar de botón, ▶ (o elegir) y la pausa. Graves a propósito: ninguna nota pasa de C5, y un
// filtro les quita el brillo
add('menu-move', 0.075, (t) => t
  .add({ dur: 0.08, wave: 'fm', ratio: 2, index: (k) => 1.2 * (1 - k) ** 3, pitch: slide('G4', 'F4', 0.4), cut: at(1800), vol: hit(0.02) })
  .add({ dur: 0.06, wave: 'sine', pitch: slide('G3', 'F3', 0.4), vol: hit(0.018, 0.8) })
  .snap(1200, 0.25, 0, 0.01));
add('play', 0.12, (t) => {
  const key = (names, when, dur) => names.forEach((name, i) => t
    .add({ dur, wave: 'saw', unison: 3, spread: 12, pitch: at(name), cut: slide(2400, 500, 0.5), res: 1.6, vol: hit(dur / 3, 0.5) }, when)
    .add({ dur, wave: 'fm', ratio: 2, index: (k) => 1.4 * (1 - k) ** 2, pitch: at(name), cut: at(2200), vol: hit(dur / 3.2, 0.7), pan: i ? 0.4 : -0.4 }, when));
  key(['D4'], 0, 0.14);
  key(['G4', 'D4'], 0.09, 0.45);
  t.thump(170, 98, 0.16, 0.9, 0.09).snap(1300, 0.3).snap(1500, 0.4, 0.09).room(0.14, 0.4);
}, STEREO);
add('pause', 0.11, (t) => {
  ['G4', 'D4', 'G4'].forEach((name, i) => t
    .add({ dur: i === 2 ? 0.26 : 0.09, duty: 0.4, unison: 2, spread: 10, pitch: at(name), cut: slide(2200, 800), res: 1.4, vol: hit(i === 2 ? 0.08 : 0.03, 0.8) }, i * 0.085)
    .add({ dur: i === 2 ? 0.26 : 0.09, wave: 'sine', pitch: () => note(name) / 2, vol: hit(i === 2 ? 0.07 : 0.03, 0.6) }, i * 0.085)
    .snap(1400, 0.25, i * 0.085));
  t.room(0.1, 0.3);
}, STEREO);

// La rueda del zodiaco: madera que traquetea y frena (gira igual que el dibujo: los 2.4 s y la curva
// de ui/ZodiacWheel.js) y, al detenerse, un «¡tac!» que brinca
add('wheel', 0.085, (t) => {
  const SECONDS = 2.4;
  const TEETH = 40; // más de tres vueltas de 12 animales
  // cubic-bezier(0.12, 0.7, 0.2, 1): cuándo pasa cada diente
  const curve = Array.from({ length: 4001 }, (_, i) => {
    const u = i / 4000;
    return [3 * (1 - u) ** 2 * u * 0.12 + 3 * (1 - u) * u * u * 0.2 + u ** 3, 3 * (1 - u) ** 2 * u * 0.7 + 3 * (1 - u) * u * u + u ** 3];
  });
  let before = -1;
  for (let i = 1; i < TEETH; i++) {
    const when = curve.find(([, turned]) => turned >= i / TEETH)[0] * SECONDS;
    const slow = Math.min(1, (when - before) / 0.2); // más lento, más cuerpo
    before = when;
    const pan = Math.sin(i * 0.9) * 0.5;
    t.add({ dur: 0.07, wave: 'fm', ratio: 2.4, index: (k) => 1.5 * (1 - k) ** 2, pitch: slide(430 - 130 * slow, 360 - 130 * slow, 0.4), cut: at(2600), vol: hit(0.012 + 0.008 * slow), pan }, when, 0.5 + 0.5 * slow)
      .snap(1700 + 300 * (i % 3), 0.45, when);
  }
  t.add({ dur: 1.3, wave: 'noise', cut: slide(1500, 250), res: 2, mode: 'bp', vol: fall(1.6, 0.4) }).room(0.08, 0.3);
}, STEREO);
add('wheel-stop', 0.13, (t) => t
  .thump(200, 80, 0.16, 1)
  .snap(1500, 0.9)
  .add({ dur: 0.07, wave: 'fm', ratio: 2.4, index: (k) => 2 * (1 - k), pitch: slide(320, 240), cut: at(2600), vol: hit(0.02) })
  .add({ dur: 0.3, wave: 'saw', unison: 3, spread: 14, pitch: slide('D4', 'C5', 0.5), cut: slide(900, 2800, 0.5), res: 1.8, vol: fall(1.2, 0.6) }, 0.07)
  .add({ dur: 0.3, wave: 'fm', ratio: 2, index: (k) => 1.4 * (1 - k), pitch: slide('D4', 'C5', 0.5), vol: fall(1.3, 0.6) }, 0.07)
  .room(0.16, 0.5), STEREO);

/** Todos los efectos: nombre → canales a RATE. */
export function makeAll() {
  return Object.fromEntries(Object.entries(SOUNDS).map(([name, { recipe, ...options }]) => {
    seed = [...name].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);
    const track = new Track();
    recipe(track);
    return [name, finish(track, options)];
  }));
}

/** La página para oírlos (un botón por efecto), con los sonidos adentro. */
function page(rows) {
  const buttons = rows.map(({ name, seconds, data }) => `<button data-src="data:audio/wav;base64,${data}">${name}<small>${seconds.toFixed(2)} s</small></button>`).join('\n');
  return `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Chow Chow: sonidos</title>
<style>body{margin:0;padding:24px;background:#05040a;color:#ece8f6;font:16px/1.4 system-ui,sans-serif}h1{margin:0 0 20px;font-size:22px}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px}
button{display:flex;justify-content:space-between;gap:8px;align-items:baseline;padding:12px;border:2px solid #262c66;border-radius:8px;background:#0b1238;color:inherit;font:inherit;text-align:left;cursor:pointer}button:hover,button:focus-visible{border-color:#ff9f1c;outline:0}button.on{background:#b03016;border-color:#e8452c}small{color:#c9c4dc;white-space:nowrap}</style>
<h1>Chow Chow: efectos de sonido</h1><main>
${buttons}
</main><script>for(const b of document.querySelectorAll('button')){const a=new Audio();b.onclick=()=>{a.src||(a.src=b.dataset.src);a.currentTime=0;a.play();b.classList.add('on')};a.onended=()=>b.classList.remove('on')}</script></html>
`;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  let bytes = 0;
  const rows = [];
  for (const [name, channels] of Object.entries(makeAll())) {
    const data = wav(channels);
    bytes += data.length;
    await writeFile(path.join(OUT, `${name}.wav`), data);
    rows.push({ name, seconds: channels[0].length / RATE, data: data.toString('base64') });
  }
  await mkdir(path.join(root, 'docs'), { recursive: true });
  await writeFile(path.join(root, 'docs', 'sonidos.html'), page(rows));
  console.log(`${rows.length} efectos en assets/audio/sfx (${Math.round(bytes / 1024)} KB). Para oírlos: docs/sonidos.html`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
