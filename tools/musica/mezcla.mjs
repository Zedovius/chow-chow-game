// La mesa de mezcla: una Pista junta las voces y la percusión, les da su volumen, su lugar y su espacio, y
// entrega una vuelta sin corte.
//
// El volumen de cada voz no se adivina: se mide (como lo oye una persona) y se lleva al que le toca. Así
// todas las pistas quedan con el mismo equilibrio: bombo y bajo, melodía, contrapunto y, atrás, lo demás.

import { readFileSync } from 'node:fs';
import { around, aroundStereo, azar, bands, Biquad, Bus, chorus, clamp, db, glue, limit, loudness, mix, peak, pingpong, readWav, reverb, SR, Svf } from './dsp.mjs';
import { BAR, clash, midi, parallels, topLine } from './partitura.mjs';
import { drum, DRUMS } from './percusion.mjs';
import { PLUCKED, SUNG } from './tradicionales.mjs';
import { DRAWN, KEYS } from './sintetizadores.mjs';

/** Los samples en los que se basa la música, y en qué segundo empieza su primer compás. */
export const SAMPLES = { 'chow-intro': 0, 'chow-medio-1': 0.26, 'chow-intro-hard': 0.26 };
const sampleFile = (name) => new URL(`../../assets/audio/samples/${name}.wav`, import.meta.url);
const tapes = new Map();
function tapeOf(name) {
  if (!tapes.has(name)) tapes.set(name, readWav(readFileSync(sampleFile(name))));
  return tapes.get(name);
}
export const sampleBytes = (name) => readFileSync(sampleFile(name));

const STRUCK = { ...PLUCKED, ...KEYS };
const LINES = { ...SUNG, ...DRAWN };

/**
 * Cómo va cada instrumento: level (LUFS), pan, rev (reverberación), eco, hp (quita graves, Hz), duck (cuánto
 * se agacha con el bombo, 0 a 1), wide (coro), human (segundos de imprecisión).
 */
const MIX = {
  guzheng: { level: -17, pan: -0.18, rev: 0.22, eco: 0.2, hp: 140, duck: 0.12, human: 0.004 },
  pipa: { level: -18, pan: 0.32, rev: 0.16, eco: 0.14, hp: 180, duck: 0.12, human: 0.004 },
  yangqin: { level: -20.5, rev: 0.22, eco: 0.14, hp: 220, duck: 0.2, human: 0.004 },
  guqin: { level: -19, pan: -0.1, rev: 0.3, hp: 60, duck: 0.15, human: 0.004 },
  bianzhong: { level: -21, pan: 0.32, rev: 0.38, eco: 0.2, hp: 260, duck: 0.1 },
  dizi: { level: -18.5, pan: 0.12, rev: 0.28, eco: 0.2, hp: 300, duck: 0.12 },
  xiao: { level: -19.5, pan: -0.3, rev: 0.34, eco: 0.16, hp: 200, duck: 0.15 },
  erhu: { level: -19, pan: 0.3, rev: 0.28, eco: 0.14, hp: 200, duck: 0.15 },
  suona: { level: -19.5, pan: 0.14, rev: 0.24, eco: 0.12, hp: 320, duck: 0.12 },
  sheng: { level: -23, rev: 0.22, eco: 0.06, hp: 230, duck: 0.5 },
  coro: { level: -25, rev: 0.4, hp: 170, duck: 0.45 },
  pluma: { level: -22, rev: 0.14, eco: 0.24, hp: 220, duck: 0.4, pan: -0.35 },
  tecla: { level: -18.5, rev: 0.2, eco: 0.2, hp: 190, duck: 0.3 },
  estocada: { level: -20.5, rev: 0.2, eco: 0.06, hp: 220, duck: 0.5 },
  colchon: { level: -25, rev: 0.28, hp: 190, duck: 0.6, wide: 0.5 },
  brillo: { level: -24, rev: 0.22, hp: 260, duck: 0.85 },
  pulso: { level: -22, rev: 0.12, eco: 0.22, hp: 220, duck: 0.35, pan: 0.35 },
  cristal: { level: -21, rev: 0.34, eco: 0.24, hp: 300, duck: 0.2, pan: 0.25 },
  bajo808: { level: -15.5, duck: 0.35 },
  bajoRoto: { level: -15, duck: 0.35 },
  bajoPulso: { level: -17, duck: 0.6, hp: 34 },
  reese: { level: -17, duck: 0.65, hp: 34 },
  acido: { level: -19.5, duck: 0.45, hp: 90, eco: 0.08, rev: 0.06 },
  grunido: { level: -16.5, duck: 0.55, hp: 34, rev: 0.05 },
  bajoNegro: { level: -16.5, duck: 0.55, hp: 34 },
  bajoSec: { level: -18, duck: 0.5, hp: 36 },
  cuerdas: { level: -24, rev: 0.3, hp: 240, wide: 0.85, duck: 0.3 },
  vozSinte: { level: -19.5, rev: 0.25, eco: 0.25, hp: 220, wide: 0.35, duck: 0.15 },
  muestra: { level: -16, rev: 0.04 },
  subida: { level: -21, rev: 0.15 },
  caida: { level: -23, rev: 0.2 },
  impacto: { level: -17, rev: 0.25 },
};

/**
 * El color que se busca, medido en las muestras: de chow-intro (oscura) a chow-intro-hard (abierta). Cuánto debe
 * haber en cada banda respecto al total, en dB, en la pista más tranquila y en la más fuerte.
 */
const EDGES = [250, 500, 2000, 4000, 8000, 16000];
const CALM = [-9, -7, -16, -25, -34];
const FIERCE = [-13, -8, -15.5, -15, -18];
const LEVELS = [-18.4, -14.3];

const VALUES = { x: 0.8, X: 1, o: 0.5, 'ø': 0.35 };

export class Pista {
  /**
   * id, title, center (el grado que manda), feel (en palabras), bars, seed, level (LUFS finales), room (la
   * reverberación), echo (el eco, en segundos), drive (saturación de la mezcla).
   */
  constructor({ id, title, center, feel, bars = 16, seed = 1, level = -16, room = {}, echo = {}, drive = 0 }) {
    Object.assign(this, { id, title, center, feel, bars, seed, level, drive });
    this.n = Math.round(bars * BAR * SR);
    this.room = { seconds: 1.8, damp: 5200, gain: 0.9, ...room };
    this.echo = { time: 0.375, feedback: 0.4, gain: 0.8, ...echo };
    this.parts = [];
    this.hits = [];
    this.voices = {}; // las voces del contrapunto, para revisarlas
  }

  /**
   * Una voz. notes: de la partitura, desde el compás from. Las opciones cambian las de MIX; octave sube o baja
   * octavas; gain (dB) la mueve de su nivel; vol(compás) su volumen a lo largo; cut(compás) un filtro que se
   * abre y se cierra; times: repetirla; as: su nombre en el contrapunto.
   */
  play(instrument, notes, { from = 0, octave = 0, gain = 0, times = 1, as = null, ...options } = {}) {
    if (!STRUCK[instrument] && !LINES[instrument]) throw new Error(`No hay instrumento «${instrument}»`);
    const all = [];
    for (let k = 0; k < times; k++) {
      for (const o of notes) {
        const at = from + (k ? k * notes.bars : 0) + o.at;
        if (!Number.isFinite(at)) throw new Error(`${this.id}: una nota de ${instrument} no tiene lugar`);
        if (at > this.bars - 1e-6 || at < -1e-6) continue;
        all.push({ ...o, at, i: o.i + 5 * octave, dur: LINES[instrument] ? Math.min(o.dur, this.bars - at) : o.dur });
      }
    }
    this.parts.push({ instrument, notes: all, gain, options });
    if (as) this.voices[as] = [...(this.voices[as] ?? []), ...topLine(all)].sort((a, b) => a.at - b.at);
    return this;
  }

  /**
   * Percusión: { golpe: 'x..x..x.' } por compás (| para varios compases, que se repiten de from a to).
   *   X x o ø  fuerte a fantasma   1-9 volumen   r R  dos o tres golpes en un paso   . nada
   */
  beat(rows, { from = 0, to = this.bars, vol = 1, every = 0, at = 0 } = {}) {
    for (const [name, text] of Object.entries(rows)) {
      const cells = text.split('|').map((cell) => cell.replace(/\s/g, ''));
      for (let b = from; b < to; b++) {
        if (every && (b - from) % every !== at) continue;
        const cell = cells[(every ? 0 : b - from) % cells.length];
        [...cell].forEach((c, s) => {
          if (c === '.' || c === '-') return;
          const step = 1 / cell.length;
          const many = c === 'r' ? 2 : c === 'R' ? 3 : 1;
          const v = VALUES[c] ?? (/\d/.test(c) ? Number(c) / 9 : 0.62);
          for (let k = 0; k < many; k++) this.hits.push({ name, at: b + s * step + (k * step) / many, v: v * vol * (k ? 0.82 : 1) });
        });
      }
    }
    return this;
  }

  /**
   * Un sample. pieces: qué pedazos, [{ at, from, bars, tail }]: en el compás at, desde su compás from, cuántos, y
   * los segundos que se dejan sonar después (su eco). Las mismas opciones que las voces (level, hp, cut, vol, rev...).
   */
  sample(name, pieces, options = {}) {
    if (!(name in SAMPLES)) throw new Error(`No hay sample «${name}»`);
    const notes = pieces.map(({ at, from = 0, bars = 12, tail = 0.02 }) => ({ at, dur: bars, from, tail, v: 1 }));
    this.parts.push({ instrument: 'muestra', name, notes, gain: options.gain ?? 0, options });
    return this;
  }

  /** Dónde se agachan las demás voces, aunque el golpe no sea nuestro (el bombo de un sample). */
  pump(pattern, { from = 0, to = this.bars } = {}) {
    return this.beat({ bomboMudo: pattern }, { from, to });
  }

  /** Un golpe suelto. */
  hit(name, at, v = 1) {
    this.hits.push({ name, at, v });
    return this;
  }

  /** Los adornos de cada instrumento, donde los pondría quien lo toca (siempre con notas de la escala). */
  dress(instrument, notes, rnd) {
    return notes.map((o, n) => {
      const before = notes[n - 1];
      const far = !before || o.at - before.at > 0.15;
      let orn = o.orn;
      if (!orn) {
        if (instrument === 'guzheng') {
          if (before && o.i - before.i === 1 && o.dur >= 0.12 && rnd() < 0.5) orn = 's';
          if (o.dur >= 0.3) orn += 'v';
        } else if (instrument === 'pipa' && o.dur >= 0.3) orn = 't';
        else if (instrument === 'yangqin' && o.dur >= 0.45) orn = 't';
        else if (['dizi', 'suona'].includes(instrument) && far && o.dur >= 0.18 && rnd() < 0.45) orn = 'g';
        else if (instrument === 'xiao' && o.dur >= 0.45 && rnd() < 0.4) orn = 'g';
        else if (instrument === 'guqin' && o.dur >= 0.25) orn = rnd() < 0.5 ? 'sv' : 'v';
      }
      return { ...o, orn };
    });
  }

  renderPart({ instrument, notes, gain, options, name }, seed) {
    const bus = new Bus(this.n);
    const set = { level: -20, pan: 0, rev: 0, eco: 0, hp: 0, duck: 0, human: 0, ...MIX[instrument], ...options };
    const rnd = azar(seed);
    if (instrument === 'muestra') {
      const tape = tapeOf(name);
      for (const o of notes) {
        const start = Math.round((SAMPLES[name] + o.from * BAR) * SR);
        const body = Math.round(o.dur * BAR * SR);
        const tail = Math.round(o.tail * SR);
        const early = o.from ? 0 : Math.min(start, Math.round(0.02 * SR)); // el ataque, completo
        const cutOut = tape.map((x) => {
          const piece = x.slice(start - early, start + body + tail);
          for (let i = 0; i < Math.min(200, piece.length); i++) piece[i] *= i / 200;
          for (let i = 0; i < Math.min(tail, piece.length); i++) piece[piece.length - 1 - i] *= Math.min(1, (i / Math.max(1, tail)) * 1.6);
          return piece;
        });
        bus.add(cutOut, o.at * BAR * SR - early);
      }
    }
    const events = instrument === 'muestra' ? [] : this.dress(instrument, notes, rnd).map((o) => ({ t: o.at * BAR, d: o.dur * BAR, m: midi(o.i), v: o.v, orn: o.orn, above: midi(o.i + 1), below: midi(o.i - 1), wob: o.wob, ...(o.fromI !== undefined && { from: midi(o.fromI) }) }));
    if (STRUCK[instrument]) {
      for (const e of events) {
        const note = { ...e, v: clamp(e.v * (0.95 + 0.1 * rnd()), 0.05, 1) };
        const { x } = STRUCK[instrument](note, rnd);
        // Los acordes se rasguean apenas; lo demás, con la imprecisión de una mano
        bus.add(x, Math.max(0, e.t + set.human * (rnd() - 0.5) * 2) * SR, 1, Array.isArray(x) ? 0 : 0);
      }
    } else if (events.length) {
      const out = LINES[instrument](events, this.n, seed);
      bus.add(Array.isArray(out) ? out : out, 0);
    }
    if (set.hp) {
      around(bus, () => {
        const f = new Svf(set.hp);
        return (x) => f.hp(x);
      });
    }
    if (set.drive) {
      around(bus, () => (x) => Math.tanh(x * (1 + set.drive * 4)) / (1 + set.drive));
    }
    const cut = options.cut;
    if (cut) {
      around(bus, () => {
        const f = new Svf(1000, set.res ?? 0.8);
        return (x, i) => {
          if ((i & 31) === 0) f.set(cut(i / SR / BAR), set.res ?? 0.8);
          return f.lp(x);
        };
      });
    }
    if (set.wide) chorus(bus, { wet: set.wide });
    if (set.pan) {
      const [gl, gr] = [Math.min(1, 1 - set.pan), Math.min(1, 1 + set.pan)];
      for (let i = 0; i < bus.n; i++) {
        bus.l[i] *= gl;
        bus.r[i] *= gr;
      }
    }
    const now = loudness(bus);
    if (now > -60) bus.scale(db(set.level + gain - now));
    return { bus, set, vol: options.vol, name: instrument };
  }

  render({ solo = null } = {}) {
    const { n } = this;
    const dry = new Bus(n);
    const toRoom = new Bus(n);
    const toEcho = new Bus(n);
    // El bombo agacha a los demás
    const duck = new Float32Array(n).fill(0);
    for (const h of this.hits) {
      if (!/^bombo/.test(h.name) || h.v < 0.5) continue;
      const start = Math.round(h.at * BAR * SR);
      const length = Math.round(0.26 * SR);
      for (let i = -220; i < length; i++) {
        const k = i < 0 ? 1 + i / 220 : (1 - i / length) ** 1.5;
        const p = (((start + i) % n) + n) % n;
        duck[p] = Math.max(duck[p], k * Math.min(1, h.v + 0.15));
      }
    }
    this.parts.forEach((part, index) => {
      if (solo && !solo.includes(part.instrument)) return;
      const { bus, set, vol } = this.renderPart(part, this.seed * 1009 + index * 31 + 7);
      const curve = vol ? Float32Array.from({ length: this.bars * 16 }, (_, k) => vol(k / 16)) : null;
      let level = curve ? curve[0] : 1;
      for (let i = 0; i < n; i++) {
        if (curve) {
          const target = curve[Math.min(curve.length - 1, Math.floor((i / SR / BAR) * 16))];
          level += (target - level) * 0.0012;
        }
        const g = level * (1 - set.duck * duck[i] * 0.9);
        bus.l[i] *= g;
        bus.r[i] *= g;
      }
      dry.sum(bus);
      if (set.rev) toRoom.sum(bus, set.rev);
      if (set.eco) toEcho.sum(bus, set.eco);
    });
    // Percusión
    const kit = new Bus(n);
    const rnd = azar(this.seed * 77 + 5);
    const ordered = [...this.hits].sort((a, b) => a.at - b.at);
    const count = {};
    for (const h of ordered) {
      if (solo && !solo.includes('percusion')) break;
      if (h.name === 'bomboMudo') continue;
      const def = DRUMS[h.name];
      if (!def) throw new Error(`No hay percusión «${h.name}»`);
      count[h.name] = (count[h.name] ?? Math.floor(rnd() * 4)) + 1;
      const x = drum(h.name, count[h.name]);
      const loose = def.variants > 1 ? (rnd() - 0.5) * 0.003 : 0;
      const at = (h.at * BAR + loose) * SR - (def.ends ? x[0].length : 0);
      const g = db(def.gain) * h.v ** 1.25;
      kit.add(x, at, g * 0.9, def.pan ?? 0);
      if (def.rev) toRoom.add(x, at, g * def.rev, def.pan ?? 0);
      if (def.eco) toEcho.add(x, at, g * def.eco, def.pan ?? 0);
    }
    around(kit, () => (x) => Math.tanh(x * 1.15) / 1.06);
    dry.sum(kit);
    pingpong(toEcho, this.echo);
    toRoom.sum(toEcho, 0.12);
    reverb(toRoom, this.room);
    dry.sum(toEcho, this.echo.gain);
    dry.sum(toRoom, this.room.gain);
    return this.master(dry);
  }

  /** Pegamento, color y volumen final. */
  master(bus) {
    bus.scale(db(-15 - loudness(bus, false)));
    glue(bus, { threshold: -17, ratio: 2 });
    around(bus, () => {
      const low = Biquad.highpass(28);
      return (x) => low.run(x);
    });
    // El color: se mide y se corrige más de la mitad de lo que le falta o le sobra
    const heat = clamp((this.level - LEVELS[0]) / (LEVELS[1] - LEVELS[0]), 0, 1);
    const have = bands(bus, EDGES);
    const fix = have.map((v, k) => clamp((mix(CALM[k], FIERCE[k], heat) - v) * 0.6, -4, 5));
    around(bus, () => {
      const eq = [Biquad.peak(350, Math.min(0.5, fix[0]), 0.9), Biquad.peak(1000, clamp(fix[1], -2, 1), 0.7), Biquad.peak(2800, fix[2], 0.9), Biquad.peak(5600, fix[3], 0.9), Biquad.shelf(9000, fix[4] - fix[3] * 0.3, true)];
      return (x) => eq.reduce((y, f) => f.run(y), x);
    });
    this.color = { have, fix };
    if (this.drive) around(bus, () => (x) => Math.tanh(x * (1 + this.drive)) / (1 + this.drive * 0.75));
    for (let turn = 0; turn < 3; turn++) {
      bus.scale(db(this.level - loudness(bus, false)));
      if (turn < 2) limit(bus, 0.84);
    }
    const top = peak(bus);
    if (top > 0.9) limit(bus, 0.88);
    this.report = { level: loudness(bus, false), peak: peak(bus) };
    return bus;
  }

  /** Cómo quedó el contrapunto: cuánto chocan las voces y cuántas quintas u octavas paralelas hay. */
  counterpoint() {
    const names = Object.keys(this.voices);
    const pairs = [];
    for (let a = 0; a < names.length; a++) {
      for (let b = a + 1; b < names.length; b++) {
        pairs.push({ pair: `${names[a]}/${names[b]}`, clash: clash(this.voices[names[a]], this.voices[names[b]]), parallels: parallels(this.voices[names[a]], this.voices[names[b]]) });
      }
    }
    return pairs;
  }
}
