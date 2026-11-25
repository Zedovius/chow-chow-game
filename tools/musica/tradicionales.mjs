// Los instrumentos chinos, sintetizados: cuerdas pulsadas (guzheng, pipa, yangqin, guqin), soplos (dizi,
// xiao, suona, sheng), la cuerda frotada (erhu) y las campanas (bianzhong).
//
// Dos clases: los de nota (cada nota es un sonido aparte: { x, pan? }) y los de línea (toda la voz es un
// solo sonido seguido, con ligaduras, vibrato y respiración, como quien la toca).

import { azar, clamp, hz, mix, SR, Svf, TAU } from './dsp.mjs';

// --- Cuerdas pulsadas --------------------------------------------------------------

/**
 * Una cuerda: la suma de sus armónicos, cada uno con su volumen y lo que tarda en apagarse.
 *   loud(h)   el volumen del armónico h (1 es la nota)
 *   t60       segundos en apagarse (bajar 60 dB); fade: cuánto más rápido se apagan los agudos
 *   spark     brillo extra del golpe, que dura unos milisegundos
 *   tense     cuánto arranca arriba de su nota (centésimas); bend(s): la mano que presiona
 *   nail      la uña; wood: el golpe en la caja
 */
function pluck(f, seconds, { vel = 0.8, loud, count = 14, t60 = 3, fade = 0.08, spark = 0.5, tense = 22, bend = null, nail = 0.1, wood = 0.15, rnd }) {
  const n = Math.ceil(seconds * SR);
  const out = new Float32Array(n);
  const top = Math.min(count, Math.floor(15000 / f));
  const amp = new Float64Array(top + 1);
  const flash = new Float64Array(top + 1);
  const k = new Float64Array(top + 1);
  const kf = new Float64Array(top + 1);
  for (let h = 1; h <= top; h++) {
    // Pegar fuerte abre los agudos
    amp[h] = loud(h) * (0.9 + 0.2 * rnd()) * Math.min(1, vel * 1.1) ** (0.12 * (h - 1));
    flash[h] = h > 1 ? (spark * vel) / h : 0;
    k[h] = 10 ** (-3 / (SR * (t60 / (1 + fade * (h - 1)))));
    kf[h] = Math.exp(-1 / (SR * (0.07 / (1 + 0.15 * h))));
  }
  const click = new Svf(3000, 1.1);
  const box = [new Svf(210, 4), new Svf(460, 5)];
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const s = i / SR;
    const cents = tense * vel * Math.exp(-s / 0.13) + (bend ? bend(s) : 0);
    phase += (TAU * f * 2 ** (cents / 1200)) / SR;
    if (phase > TAU) phase -= TAU;
    // sen(hθ) de uno en uno, sin calcular cada seno
    const c = 2 * Math.cos(phase);
    let s1 = Math.sin(phase);
    let s0 = 0;
    let y = 0;
    for (let h = 1; h <= top; h++) {
      y += s1 * (amp[h] + flash[h]);
      amp[h] *= k[h];
      flash[h] *= kf[h];
      const next = c * s1 - s0;
      s0 = s1;
      s1 = next;
    }
    if (i < 3000) {
      const r = rnd() * 2 - 1;
      y += click.bp(r) * nail * vel * Math.exp(-i / 90) * 2 + (box[0].bp(r) + box[1].bp(r)) * wood * vel * Math.exp(-i / 420) * 3;
    }
    out[i] = y * Math.min(1, i / 40);
  }
  return out;
}

/** Los armónicos de una cuerda pulsada en un punto: at de 0 a 0.5 de su largo. */
const plucked = (at, power) => (h) => Math.abs(Math.sin(Math.PI * h * at)) / h ** power;
/** La cuerda de las muestras: los nones fuertes (1, 3, 5) y los pares apenas. */
const SAMPLE = (h) => (h % 2 ? 1 / h ** 1.35 : 0.2 / h ** 1.1);

/** Deja la nota con su volumen y la apaga al final. */
function shape(x, vel, release = 0.06) {
  let top = 0;
  for (let i = 0; i < Math.min(x.length, SR * 0.4); i++) top = Math.max(top, Math.abs(x[i]));
  const g = (vel * 0.8) / (top || 1);
  const r = Math.round(release * SR);
  for (let i = 0; i < x.length; i++) x[i] *= g * Math.min(1, (x.length - i) / r);
  return x;
}

/** Cuerda frenada: después de dur se apaga pronto (pipa, notas cortas). */
const damped = (x, dur, tau) => {
  const start = Math.round(dur * SR);
  const k = Math.exp(-1 / (tau * SR));
  let g = 1;
  for (let i = start; i < x.length; i++) {
    g *= k;
    x[i] *= g;
  }
  return x;
};

/** Adornos de la mano izquierda: 'v' vibra, 's' sube desde la nota de abajo, 'c' cae. */
function leftHand(note) {
  const orn = note.orn ?? '';
  const from = ((note.below ?? note.m - 2) - note.m) * 100;
  return (s) => {
    let cents = 0;
    if (orn.includes('s')) cents += from * Math.exp(-((s / 0.07) ** 2));
    if (orn.includes('v')) cents += 34 * Math.sin(TAU * 5.4 * s) * clamp((s - 0.22) / 0.25, 0, 1);
    if (orn.includes('c')) cents -= 180 * clamp((s - Math.max(0.12, note.d * 0.6)) / 0.3, 0, 1);
    return cents;
  };
}

/** El trino de la mano derecha (yaozhi, lunzhi): la misma nota muchas veces por segundo. */
function rolled(note, rnd, rate, one) {
  const count = Math.max(2, Math.round(note.d * rate));
  const out = new Float32Array(Math.ceil((note.d + 0.5) * SR));
  for (let i = 0; i < count; i++) {
    const k = i / count;
    const v = note.v * (0.5 + 0.5 * Math.sin(Math.PI * clamp(k * 1.1 + 0.12, 0, 1))) * (i % 2 ? 0.84 : 1) * (0.94 + 0.1 * rnd());
    const x = one(v, note.d / count + 0.16);
    const at = Math.round(((i + 0.12 * (rnd() - 0.5)) * note.d * SR) / count);
    for (let j = 0; j < x.length && at + j < out.length; j++) if (at + j >= 0) out[at + j] += x[j] * 0.75;
  }
  return out;
}

const decayFor = (m, base) => base * 2 ** ((74 - m) / 26);

/** Guzheng: la cuerda larga y clara de las muestras. */
export function guzheng(note, rnd) {
  const f = hz(note.m);
  const t60 = decayFor(note.m, 4.6);
  if ((note.orn ?? '').includes('t')) return { x: rolled(note, rnd, 15, (v, d) => shape(pluck(f, d, { vel: v, loud: SAMPLE, t60: 1.6, spark: 0.7, rnd }), v, 0.03)) };
  const x = pluck(f, Math.min(t60 * 0.7, note.d + 1.9), { vel: note.v, loud: SAMPLE, t60, fade: 0.04, spark: 0.55, tense: 32, bend: leftHand(note), rnd });
  return { x: shape(x, note.v, 0.5) };
}

const PIPA = plucked(0.21, 0.85);
/** Pipa: seca, con uña; con 't' rueda (lunzhi). */
export function pipa(note, rnd) {
  const f = hz(note.m);
  const opts = { loud: PIPA, count: 20, t60: decayFor(note.m, 1.7), fade: 0.16, spark: 0.8, tense: 40, nail: 0.4, wood: 0.35, rnd };
  if ((note.orn ?? '').includes('t')) return { x: rolled(note, rnd, 17, (v, d) => shape(pluck(f, d, { ...opts, vel: v, t60: 0.8 }), v, 0.02)) };
  return { x: shape(damped(pluck(f, note.d + 0.5, { ...opts, vel: note.v, bend: leftHand(note) }), note.d * 0.9, 0.1), note.v, 0.04) };
}

const YANGQIN = plucked(0.13, 0.75);
/** Yangqin: dos cuerdas casi iguales golpeadas con baqueta de bambú. */
export function yangqin(note, rnd) {
  const f = hz(note.m);
  const seconds = Math.min(2.2, note.d + 1);
  const opts = { vel: note.v, loud: YANGQIN, count: 18, t60: decayFor(note.m, 2.6), fade: 0.14, spark: 0.5, tense: 6, nail: 0.25, wood: 0.2, rnd };
  if ((note.orn ?? '').includes('t')) return { x: rolled(note, rnd, 14, (v, d) => shape(pluck(f, d + 0.1, { ...opts, vel: v }), v, 0.05)) };
  const a = pluck(f * 1.0013, seconds, opts);
  const b = pluck(f * 0.9987, seconds, opts);
  const l = new Float32Array(a.length);
  const r = new Float32Array(a.length);
  for (let i = 0; i < a.length; i++) {
    l[i] = a[i] + 0.4 * b[i];
    r[i] = b[i] + 0.4 * a[i];
  }
  return { x: [shape(l, note.v * 0.85, 0.3), shape(r, note.v * 0.85, 0.3)] };
}

const GUQIN = (h) => (h % 2 ? 1 : 0.6) / h ** 1.6;
/** Guqin: grave, opaca y larga, con dedo que resbala. */
export function guqin(note, rnd) {
  const x = pluck(hz(note.m), note.d + 2, { vel: note.v, loud: GUQIN, count: 12, t60: decayFor(note.m, 3), fade: 0.12, spark: 0.25, tense: 16, nail: 0.06, wood: 0.25, bend: leftHand(note), rnd });
  return { x: shape(x, note.v, 0.5) };
}

/** Bianzhong: campanas de bronce. */
export function bianzhong(note, rnd) {
  const f = hz(note.m);
  const seconds = Math.min(3.2, note.d + 2);
  const n = Math.ceil(seconds * SR);
  const parts = [[0.5, 0.18, 1.6], [1, 1, 1.5], [1.502, 0.26, 0.9], [2.004, 0.5, 0.8], [2.71, 0.2, 0.42], [3.42, 0.15, 0.3], [4.6, 0.1, 0.16], [5.43, 0.06, 0.1]];
  const l = new Float32Array(n);
  const r = new Float32Array(n);
  for (const [ratio, amp, tau] of parts) {
    if (f * ratio > 15000) continue;
    const bright = ratio > 2 ? note.v : 1;
    for (const [side, out] of [[-1, l], [1, r]]) {
      const w = (TAU * f * ratio * (1 + side * 0.0007)) / SR;
      const k = Math.exp(-1 / (tau * (0.6 + 0.4 * Math.min(1, 500 / f)) * SR));
      let phase = rnd() * 0.3;
      let g = amp * bright * note.v * 0.5;
      for (let i = 0; i < n; i++) {
        out[i] += Math.sin(phase) * g;
        phase += w;
        g *= k;
      }
    }
  }
  const attack = Math.round(0.002 * SR);
  for (const out of [l, r]) for (let i = 0; i < n; i++) out[i] *= Math.min(1, i / attack, (n - i) / 2000);
  return { x: [l, r] };
}

// --- Voces seguidas (soplo y arco) ---------------------------------------------------

const SEAM = 1200; // lo que se toca de más al final, para fundirlo con el principio

/** Espacio para una voz seguida, y cómo cerrar su vuelta. */
export const tape = (n) => new Float32Array(n + SEAM);
export function join(x, n) {
  for (let i = 0; i < SEAM; i++) x[i] = mix(x[n + i], x[i], i / SEAM);
  return x.subarray(0, n);
}

/**
 * Recorre una línea muestra por muestra y le da a play(i, s) la frecuencia, el volumen y la nota.
 * Empieza 1.5 s antes de la vuelta (con las notas del final) para que no se note el corte.
 */
export function line(notes, n, { glide = 0.05, attack = 0.04, release = 0.08, scoop = 0, scoopTime = 0.05, vibrato = null, dip = 0.25 }, play) {
  const seconds = n / SR;
  const sorted = [...notes].sort((a, b) => a.t - b.t);
  if (!sorted.length) return;
  const all = [
    ...sorted.map((o) => ({ ...o, t: o.t - seconds })).filter((o) => o.t + o.d > -1.6),
    ...sorted,
    ...sorted.map((o) => ({ ...o, t: o.t + seconds })).filter((o) => o.t < seconds + 0.1),
  ];
  for (let i = 0; i < all.length; i++) {
    all[i].legato = i > 0 && all[i].t - (all[i - 1].t + all[i - 1].d) < 0.02;
    all[i].end = Math.min(all[i].t + all[i].d, all[i + 1]?.t ?? Infinity);
    const gone = all[i + 1] && all[i + 1].t - all[i].end < 0.02; // sigue ligada
    all[i].off = gone ? all[i].end : Math.max(all[i].t + 0.04, all[i].end - 0.03);
  }
  const pre = Math.round(1.5 * SR);
  const up = 1 - Math.exp(-1 / (attack * 0.4 * SR));
  const down = 1 - Math.exp(-1 / (release * 0.4 * SR));
  const glideK = 1 - Math.exp(-1 / (glide * 0.35 * SR));
  let at = -1;
  let pitch = all[0].m;
  let env = 0;
  let vibPhase = 0;
  const state = { f: 440, env: 0, age: 0, note: all[0], onset: false };
  for (let i = -pre; i < n + SEAM; i++) {
    const s = i / SR;
    state.onset = false;
    while (at + 1 < all.length && all[at + 1].t <= s) {
      at++;
      const o = all[at];
      if (!o.legato) pitch = o.m - scoop;
      state.onset = true;
      if (o.legato) env *= 1 - dip;
    }
    if (at < 0) continue;
    const o = all[at];
    const age = s - o.t;
    const on = s < o.off;
    const orn = o.orn ?? '';
    const target = orn.includes('g') && age < 0.07 ? o.above ?? o.m : o.m;
    pitch += (target - pitch) * (age < scoopTime * 2 && !o.legato ? 1 - Math.exp(-1 / (scoopTime * 0.5 * SR)) : glideK);
    // El volumen crece un poco a lo largo de las notas largas
    const swell = 0.86 + 0.14 * clamp(age / 0.5, 0, 1);
    env += ((on ? o.v * swell : 0) - env) * (on ? up : down);
    if (env < 1e-7) env = 0;
    let cents = 0;
    if (vibrato) {
      const depth = clamp((age - vibrato.delay) / vibrato.rise, 0, 1) * vibrato.cents;
      vibPhase += (TAU * vibrato.rate * (1 + 0.04 * Math.sin(s * 1.7))) / SR;
      cents = depth * Math.sin(vibPhase);
      state.vib = (depth / vibrato.cents) * Math.sin(vibPhase);
    }
    if (orn.includes('c') && age > o.d * 0.55) cents -= 220 * clamp((age - o.d * 0.55) / 0.25, 0, 1);
    state.f = hz(pitch + cents / 100);
    state.env = env;
    state.age = age;
    state.note = o;
    play(i, state);
  }
}

/** Una flauta: pocos armónicos, aire y, en la dizi, el zumbido de su membrana. */
function flute(notes, n, seed, { air, buzz, harmonics, cents, dark, scoop }) {
  const rnd = azar(seed);
  const out = tape(n);
  const breath = new Svf(1000, 2.5);
  const body = new Svf(dark, 0.6);
  const hum = new Svf(3000, 0.9);
  let phase = 0;
  let chiff = 0;
  line(notes, n, { glide: 0.045, attack: 0.06, release: 0.1, scoop, scoopTime: 0.06, dip: 0.18, vibrato: { rate: 5.1, cents, delay: 0.22, rise: 0.45 } }, (i, s) => {
    if (s.onset) chiff = s.note.legato ? 0.35 : 1;
    chiff *= 1 - 1 / (0.035 * SR);
    phase += s.f / SR;
    if (phase > 1) phase -= 1;
    if ((i & 15) === 0) breath.set(clamp(s.f * 1.5, 300, 9000), 1.6);
    const e = s.env * (1 + 0.1 * (s.vib ?? 0));
    let y = 0;
    for (let h = 0; h < harmonics.length; h++) y += harmonics[h] * Math.sin(TAU * phase * (h + 1)) * (h ? e ** (0.35 * h) : 1);
    const wind = breath.bp(rnd() * 2 - 1) * (air * (0.5 + e * 0.5) + chiff * 0.5);
    let x = (y + wind) * e;
    if (buzz) x += hum.hp(Math.tanh(y * 3 * e)) * buzz * e;
    x = body.lp(x);
    if (i >= 0) out[i] = x * 0.5;
  });
  return join(out, n);
}

/** Dizi: la flauta de bambú, brillante, con membrana. */
export const dizi = (notes, n, seed) => flute(notes, n, seed, { air: 0.5, buzz: 0.2, harmonics: [1, 0.5, 0.3, 0.16, 0.1, 0.05], cents: 22, dark: 7500, scoop: 0.8 });
/** Xiao: la flauta grave, casi puro aire. */
export const xiao = (notes, n, seed) => flute(notes, n, seed, { air: 0.85, buzz: 0, harmonics: [1, 0.32, 0.22, 0.05], cents: 16, dark: 3200, scoop: 0.5 });

/** Onda de sierra sin escalones feos (polyBLEP). */
export function saw(phase, dt) {
  let y = 2 * phase - 1;
  if (phase < dt) {
    const t = phase / dt;
    y -= t + t - t * t - 1;
  } else if (phase > 1 - dt) {
    const t = (phase - 1) / dt;
    y -= t * t + t + t + 1;
  }
  return y;
}

/** Erhu: el arco sobre dos cuerdas, con la caja de piel de serpiente. */
export function erhu(notes, n, seed) {
  const rnd = azar(seed);
  const out = tape(n);
  const boxes = [[380, 3, 0.7], [820, 4, 0.9], [1450, 4, 0.8], [2700, 3, 0.55]].map(([f, q, g]) => ({ svf: new Svf(f, q), g }));
  const top = new Svf(5200, 0.6);
  const hair = new Svf(3400, 1);
  let phase = 0;
  line(notes, n, { glide: 0.085, attack: 0.075, release: 0.09, scoop: 0.7, scoopTime: 0.07, dip: 0.3, vibrato: { rate: 5.7, cents: 30, delay: 0.16, rise: 0.4 } }, (i, s) => {
    const dt = s.f / SR;
    phase += dt;
    if (phase > 1) phase -= 1;
    const bow = (rnd() * 2 - 1) * 0.06;
    const x = saw(phase, dt) + bow;
    let y = 0.22 * x;
    for (const b of boxes) y += b.svf.bp(x) * b.g;
    y = top.lp(y) + hair.bp(bow) * 0.4;
    if (i >= 0) out[i] = Math.tanh(y * s.env * 1.3) * 0.45;
  });
  return join(out, n);
}

/** Suona: la chirimía de las batallas, estridente. */
export function suona(notes, n, seed) {
  const rnd = azar(seed);
  const out = tape(n);
  const mouths = [[1050, 2.2, 1], [2100, 3, 0.8], [3300, 3, 0.5]].map(([f, q, g]) => ({ svf: new Svf(f, q), g }));
  const low = new Svf(240, 0.7);
  let phase = 0;
  line(notes, n, { glide: 0.05, attack: 0.035, release: 0.06, scoop: 1.2, scoopTime: 0.05, dip: 0.3, vibrato: { rate: 6.2, cents: 34, delay: 0.14, rise: 0.25 } }, (i, s) => {
    const dt = s.f / SR;
    phase += dt;
    if (phase > 1) phase -= 1;
    const x = saw(phase, dt) - 0.6 * saw((phase + 0.18) % 1, dt) + (rnd() - 0.5) * 0.08;
    let y = 0.3 * x;
    for (const m of mouths) y += m.svf.bp(x) * m.g;
    if (i >= 0) out[i] = low.hp(Math.tanh(y * s.env * 2.2)) * 0.42;
    else low.hp(0);
  });
  return join(out, n);
}

/** Sheng: el órgano de boca. Nota por nota (se usa en acordes): lengüetas, con aire al entrar. */
export function sheng(note, rnd) {
  const f = hz(note.m);
  const release = 0.14;
  const n = Math.ceil((note.d + release) * SR);
  const l = new Float32Array(n);
  const r = new Float32Array(n);
  const amps = [1, 0.55, 0.62, 0.3, 0.34, 0.16, 0.18, 0.08, 0.07];
  const attack = note.d < 0.3 ? 0.012 : 0.07;
  const phases = amps.map(() => [rnd(), rnd()]);
  const wind = new Svf(Math.min(6000, f * 3), 1.5);
  for (let i = 0; i < n; i++) {
    const s = i / SR;
    const e = Math.min(1, s / attack) * clamp((note.d + release - s) / release, 0, 1) ** 1.5 * (1 + 0.07 * Math.sin(TAU * 4.6 * s));
    let a = 0;
    let b = 0;
    for (let h = 0; h < amps.length; h++) {
      const fh = f * (h + 1);
      if (fh > 11000) break;
      const bright = h ? 0.5 + 0.5 * e : 1;
      a += amps[h] * bright * Math.sin(TAU * (fh * 1.0011 * s + phases[h][0]));
      b += amps[h] * bright * Math.sin(TAU * (fh * 0.9989 * s + phases[h][1]));
    }
    const w = wind.bp(rnd() * 2 - 1) * (0.1 + 0.6 * Math.exp(-s / 0.04));
    l[i] = (a + w) * e * note.v * 0.22;
    r[i] = (b + w) * e * note.v * 0.22;
  }
  return { x: [l, r] };
}

/** Coro grave y oscuro («ah»), para la tensión. */
export function coro(note, rnd) {
  const release = 0.5;
  const n = Math.ceil((note.d + release) * SR);
  const l = new Float32Array(n);
  const r = new Float32Array(n);
  const f = hz(note.m);
  for (const out of [l, r]) {
    for (let u = 0; u < 4; u++) {
      const tune = 2 ** (((rnd() - 0.5) * 26) / 1200);
      let phase = rnd();
      const rate = 4.6 + rnd();
      const shift = rnd() * TAU;
      let dt = 0;
      for (let i = 0; i < n; i++) {
        if ((i & 31) === 0) dt = (f * tune * (1 + 0.004 * Math.sin((TAU * rate * i) / SR + shift))) / SR;
        phase += dt;
        if (phase > 1) phase -= 1;
        out[i] += saw(phase, dt);
      }
    }
    // La boca: los mismos formantes para las cuatro voces de ese lado
    const mouth = [[640, 7, 1], [1080, 8, 0.6], [2500, 9, 0.22]].map(([q, w, g]) => ({ svf: new Svf(q * (0.97 + 0.06 * rnd()), w), g }));
    for (let i = 0; i < n; i++) {
      const s = i / SR;
      let y = 0;
      for (const m of mouth) y += m.svf.bp(out[i]) * m.g;
      out[i] = y * Math.min(1, s / 0.22) * clamp((note.d + release - s) / release, 0, 1) ** 1.5 * note.v * 0.2;
    }
  }
  return { x: [l, r] };
}

export const PLUCKED = { guzheng, pipa, yangqin, guqin, bianzhong, sheng, coro };
export const SUNG = { dizi, xiao, erhu, suona };
