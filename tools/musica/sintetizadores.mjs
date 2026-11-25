// Los instrumentos electrónicos: bajos (808, reese, pulso, ácido, gruñido), teclas (pulso, sierra, pluma,
// campana FM), colchones y los efectos de transición (subidas, golpes, platos al revés).

import { azar, clamp, hz, mix, SR, Svf, TAU } from './dsp.mjs';
import { join, line, saw, tape } from './tradicionales.mjs';

/** Volumen: entra en a, baja a s en d y se apaga en r al terminar dur. */
const adsr = (s, dur, a, d, sus, r) => {
  const open = s < a ? s / a : sus + (1 - sus) * Math.exp(-(s - a) / d);
  return s < dur ? open : open * Math.max(0, 1 - (s - dur) / r) ** 2;
};

/** Varias sierras desafinadas con filtro que se cierra: la pluma y el golpe de acorde. */
function saws(note, rnd, { voices = 5, spread = 12, cut = 900, env = 4200, tau = 0.16, res = 0.9, a = 0.003, d = 0.25, sus = 0.35, r = 0.12, sub = 0, drive = 0, width = 0.9, key = 0.4 }) {
  const f = hz(note.m);
  const n = Math.ceil((note.d + r) * SR);
  const l = new Float32Array(n);
  const r_ = new Float32Array(n);
  const fl = new Svf();
  const fr = new Svf();
  const osc = Array.from({ length: voices }, (_, u) => {
    const side = voices > 1 ? (2 * u) / (voices - 1) - 1 : 0;
    const place = side * width;
    return { dt: (f * 2 ** ((side * spread) / 1200)) / SR, phase: rnd(), gl: Math.cos(((place + 1) * Math.PI) / 4), gr: Math.sin(((place + 1) * Math.PI) / 4) };
  });
  const gain = 0.5 / Math.sqrt(voices);
  const follow = (f / 262) ** key;
  for (let i = 0; i < n; i++) {
    const s = i / SR;
    if ((i & 15) === 0) {
      const c = (cut + env * note.v * Math.exp(-s / tau)) * follow;
      fl.set(c, res);
      fr.set(c, res);
    }
    let x = 0;
    let y = 0;
    for (const o of osc) {
      o.phase += o.dt;
      if (o.phase > 1) o.phase -= 1;
      const w = saw(o.phase, o.dt);
      x += w * o.gl;
      y += w * o.gr;
    }
    if (sub) {
      const w = Math.sin(TAU * f * 0.5 * s) * sub;
      x += w;
      y += w;
    }
    const e = adsr(s, note.d, a, d, sus, r) * note.v;
    x = fl.lp(x * gain);
    y = fr.lp(y * gain);
    if (drive) {
      x = Math.tanh(x * (1 + drive * 3)) / (1 + drive);
      y = Math.tanh(y * (1 + drive * 3)) / (1 + drive);
    }
    l[i] = x * e;
    r_[i] = y * e;
  }
  return { x: [l, r_] };
}

/** Pluma: sierra corta que se cierra (arpegios). */
export const pluma = (note, rnd) => saws(note, rnd, { voices: 3, spread: 9, cut: 500, env: 3400, tau: 0.09, res: 1.1, d: 0.16, sus: 0.12, r: 0.1 });
/** Tecla: pluma más ancha y brillante, para melodías. */
export const tecla = (note, rnd) => saws(note, rnd, { voices: 5, spread: 14, cut: 1300, env: 4800, tau: 0.22, res: 0.9, d: 0.4, sus: 0.55, r: 0.16 });
/** Estocada: acorde de muchas sierras, seco. */
export const estocada = (note, rnd) => saws(note, rnd, { voices: 7, spread: 20, cut: 900, env: 5200, tau: 0.12, res: 0.8, d: 0.2, sus: 0.3, r: 0.09 });
/** Colchón: lento, oscuro y ancho. */
export const colchon = (note, rnd) => saws(note, rnd, { voices: 6, spread: 18, cut: 620, env: 500, tau: 1.2, res: 0.7, a: 0.35, d: 1.5, sus: 0.8, r: 0.7, key: 0.2 });
/** Colchón que late: se abre y se cierra con el ritmo (el mezclador lo aprieta con el bombo). */
export const brillo = (note, rnd) => saws(note, rnd, { voices: 7, spread: 24, cut: 1500, env: 1500, tau: 0.8, res: 0.7, a: 0.08, d: 1, sus: 0.8, r: 0.4, key: 0.2 });

/** Cuerdas de sintetizador, como las de los ochenta (el coro se lo pone la mesa). */
export const cuerdas = (note, rnd) => saws(note, rnd, { voices: 4, spread: 10, cut: 2300, env: 500, tau: 0.9, res: 0.6, a: 0.2, d: 1.2, sus: 0.85, r: 0.8, key: 0.15 });

/** Pulso de maquinita, con ancho que se mueve. */
export function pulso(note, rnd) {
  const f = hz(note.m);
  const r = 0.07;
  const n = Math.ceil((note.d + r) * SR);
  const out = new Float32Array(n);
  const lp = new Svf(5200, 0.7);
  let a = rnd();
  const dt = f / SR;
  for (let i = 0; i < n; i++) {
    const s = i / SR;
    a += dt * (1 + 0.004 * Math.sin(TAU * 5.5 * s) * clamp((s - 0.15) / 0.2, 0, 1));
    if (a > 1) a -= 1;
    const duty = 0.3 + 0.14 * Math.sin(TAU * 0.8 * s + a * 0);
    const x = saw(a, dt) - saw((a + duty) % 1, dt);
    out[i] = lp.lp(x) * adsr(s, note.d, 0.003, 0.2, 0.55, r) * note.v * 0.42;
  }
  return { x: out };
}

/** Campana FM, de cristal. */
export function cristal(note, rnd) {
  const f = hz(note.m);
  const n = Math.ceil(Math.min(2.6, note.d + 1.6) * SR);
  const l = new Float32Array(n);
  const r = new Float32Array(n);
  for (const [out, tune] of [[l, 1.0008], [r, 0.9992]]) {
    for (let i = 0; i < n; i++) {
      const s = i / SR;
      const w = TAU * f * tune * s;
      const y = Math.sin(w + 1.6 * note.v * Math.exp(-s / 0.18) * Math.sin(w * 3.5)) * Math.exp(-s / 0.55) + 0.35 * Math.sin(2 * w + 0.8 * Math.exp(-s / 0.06) * Math.sin(w * 7)) * Math.exp(-s / 0.22);
      out[i] = y * note.v * 0.4 * Math.min(1, s / 0.002, (n - i) / 1500);
    }
  }
  return { x: [l, r] };
}

// --- Bajos -------------------------------------------------------------------------

/** 808: seno con golpe de altura y saturación. Con 's' llega resbalando desde note.from. */
export function bajo808(note, rnd, { drive = 1.4, tail = 0.5, punch = 1 } = {}) {
  const f = hz(note.m);
  const n = Math.ceil((note.d + 0.12) * SR);
  const out = new Float32Array(n);
  const from = note.from !== undefined ? hz(note.from) / f : 1;
  let phase = 0;
  const lp = new Svf(2400, 0.6);
  for (let i = 0; i < n; i++) {
    const s = i / SR;
    const bend = (note.orn ?? '').includes('s') ? 1 + (from - 1) * Math.exp(-((s / 0.09) ** 2)) : 1 + 1.6 * punch * Math.exp(-s / 0.016);
    phase += (f * bend) / SR;
    const y = Math.sin(TAU * phase);
    const e = Math.exp(-s / (tail + note.d * 0.6)) * Math.min(1, s / 0.002, (n - i) / 1600);
    out[i] = lp.lp((Math.tanh(y * (1 + drive)) / Math.tanh(1 + drive)) * e) * note.v * 0.75;
  }
  return { x: out };
}
/** 808 muy saturado: se oye en bocinas chicas. */
export const bajoRoto = (note, rnd) => bajo808(note, rnd, { drive: 6, tail: 0.42, punch: 1.3 });

/** Bajo de pulso: seno abajo y sierra filtrada arriba, corto. */
export function bajoPulso(note, rnd) {
  const f = hz(note.m);
  const n = Math.ceil((note.d + 0.05) * SR);
  const out = new Float32Array(n);
  const lp = new Svf();
  let a = 0;
  let b = 0.3;
  for (let i = 0; i < n; i++) {
    const s = i / SR;
    if ((i & 15) === 0) lp.set(180 + 1500 * note.v * Math.exp(-s / 0.07), 1.2);
    a += f / SR;
    b += (f * 1.006) / SR;
    if (a > 1) a -= 1;
    if (b > 1) b -= 1;
    const top = lp.lp(saw(a, f / SR) + saw(b, f / SR)) * 0.34;
    const y = Math.sin(TAU * f * s) * 0.6 + top;
    out[i] = Math.tanh(y * 1.5) * adsr(s, note.d, 0.003, 0.25, 0.6, 0.05) * note.v * 0.7;
  }
  return { x: out };
}

/** Bajo de secuenciador: seco, corto, con el filtro que muerde (a dieciséis). */
export function bajoSec(note, rnd) {
  const f = hz(note.m);
  const n = Math.ceil((note.d + 0.04) * SR);
  const out = new Float32Array(n);
  const lp = new Svf();
  let a = rnd() * 0.1;
  for (let i = 0; i < n; i++) {
    const s = i / SR;
    if ((i & 15) === 0) lp.set(160 + 2200 * note.v ** 2 * Math.exp(-s / 0.055), 2);
    a += f / SR;
    if (a > 1) a -= 1;
    const x = saw(a, f / SR) * 0.6 + (saw(a, f / SR) - saw((a + 0.5) % 1, f / SR)) * 0.4;
    out[i] = Math.tanh(lp.lp(x) * 1.7 + Math.sin(TAU * f * s) * 0.3) * adsr(s, note.d * 0.8, 0.002, 0.12, 0.4, 0.04) * note.v * 0.7;
  }
  return { x: out };
}

/** Bajo negro: una cuadrada sola, muy saturada, que entra y se corta de golpe. Con 's' llega resbalando. */
export function bajoNegro(note, rnd) {
  const f = hz(note.m);
  const n = Math.ceil((note.d + 0.02) * SR);
  const out = new Float32Array(n);
  const [p1, p2] = [new Svf(), new Svf()];
  const from = note.from !== undefined && (note.orn ?? '').includes('s') ? hz(note.from) / f : 1;
  let a = 0;
  let b = 0;
  for (let i = 0; i < n; i++) {
    const s = i / SR;
    if ((i & 15) === 0) {
      const c = 150 + 260 * note.v + 1500 * note.v ** 2 * Math.exp(-s / 0.09);
      p1.set(c, 1.5);
      p2.set(c * 1.3, 0.8);
    }
    const dt = (f * (1 + (from - 1) * Math.exp(-((s / 0.07) ** 2)))) / SR;
    a += dt;
    b += dt / 2;
    if (a > 1) a -= 1;
    if (b > 1) b -= 1;
    const square = saw(a, dt) - saw((a + 0.5) % 1, dt);
    const low = Math.sin(TAU * a) * 0.5;
    const y = Math.tanh((p2.lp(p1.lp(square * 0.7 + saw(b, dt / 2) * 0.25)) + low * 0.5) * 3.4);
    out[i] = y * Math.min(1, s / 0.002, (n - i) / 500) * note.v * 0.6;
  }
  return { x: out };
}

/** Voz de sintetizador: dos sierras y un pulso, ligadas, que cantan. */
export function vozSinte(notes, n, seed) {
  const rnd = azar(seed);
  const out = tape(n);
  const lp = new Svf(1800, 1);
  const ph = [rnd(), rnd(), rnd()];
  line(notes, n, { glide: 0.07, attack: 0.03, release: 0.16, dip: 0.12, vibrato: { rate: 5.2, cents: 13, delay: 0.3, rise: 0.5 } }, (i, s) => {
    const w = [0.9965, 1.0035, 1].map((t, u) => {
      const dt = (s.f * t) / SR;
      ph[u] += dt;
      if (ph[u] > 1) ph[u] -= 1;
      return saw(ph[u], dt) - (u === 2 ? saw((ph[u] + 0.35) % 1, dt) : 0);
    });
    if ((i & 15) === 0) lp.set(900 + 1700 * s.env + 900 * Math.exp(-s.age / 0.15), 1);
    if (i >= 0) out[i] = lp.lp((w[0] + w[1]) * 0.4 + w[2] * 0.35) * s.env * 0.45;
    else lp.lp(0);
  });
  return join(out, n);
}

/** Reese: sierras desafinadas que se arrastran, con un filtro que respira cada medio compás. */
export function reese(notes, n, seed) {
  const rnd = azar(seed);
  const out = [tape(n), tape(n)];
  const ph = [rnd(), rnd(), rnd(), rnd()];
  const f1 = new Svf(400, 1.1);
  const f2 = new Svf(400, 1.1);
  let sub = 0;
  line(notes, n, { glide: 0.06, attack: 0.012, release: 0.05, dip: 0.1 }, (i, s) => {
    const tunes = [0.9925, 0.998, 1.0023, 1.0078];
    const w = tunes.map((t, u) => {
      const dt = (s.f * t) / SR;
      ph[u] += dt;
      if (ph[u] > 1) ph[u] -= 1;
      return saw(ph[u], dt);
    });
    if ((i & 15) === 0) {
      const c = 320 + 900 * (0.5 - 0.5 * Math.cos((TAU * i) / SR)) * s.note.v;
      f1.set(c, 1.3);
      f2.set(c * 1.08, 1.3);
    }
    sub += s.f / SR;
    const low = Math.sin(TAU * sub) * 0.55;
    const l = Math.tanh(f1.lp(w[0] + w[2]) * 1.3) * 0.5 + low;
    const r = Math.tanh(f2.lp(w[1] + w[3]) * 1.3) * 0.5 + low;
    if (i >= 0) {
      out[0][i] = l * s.env * 0.6;
      out[1][i] = r * s.env * 0.6;
    }
  });
  return out.map((x) => join(x, n));
}

/** Ácido: una sierra con filtro que canta; los acentos (v alta) lo abren. */
export function acido(notes, n, seed) {
  const out = tape(n);
  const a = new Svf(400, 4);
  const b = new Svf(400, 1.2);
  let phase = 0;
  let sweep = 0;
  let slow = 0;
  line(notes, n, { glide: 0.05, attack: 0.004, release: 0.05, dip: 0 }, (i, s) => {
    if (s.onset) sweep = s.note.legato ? sweep * 0.7 + 0.2 : s.note.v;
    sweep *= 1 - 1 / (0.13 * SR);
    slow = 0.5 - 0.5 * Math.cos((TAU * i) / n); // se abre hacia la mitad de la vuelta
    const dt = s.f / SR;
    phase += dt;
    if (phase > 1) phase -= 1;
    if ((i & 7) === 0) {
      const c = 190 + 340 * slow + 2600 * sweep ** 1.6;
      a.set(c, 4.6);
      b.set(c * 1.5, 0.8);
    }
    const y = Math.tanh(b.lp(a.lp(saw(phase, dt))) * 1.8);
    if (i >= 0) out[i] = y * s.env * 0.5;
  });
  return join(out, n);
}

/** Gruñido: el bajo del rival. FM con filtro de vocal que muerde en cada nota. */
export function grunido(notes, n, seed) {
  const rnd = azar(seed);
  const out = [tape(n), tape(n)];
  const v = [[new Svf(500, 4), new Svf(1200, 5)], [new Svf(500, 4), new Svf(1200, 5)]];
  let p = rnd();
  let m = 0;
  let sub = 0;
  line(notes, n, { glide: 0.04, attack: 0.008, release: 0.04, dip: 0.2 }, (i, s) => {
    const bite = Math.exp(-s.age / (0.1 + 0.25 * s.note.d)) ;
    const wob = 0.5 - 0.5 * Math.cos(TAU * s.age * (s.note.wob ?? 4));
    m += (s.f * 2) / SR;
    p += s.f / SR;
    sub += s.f / SR;
    const x = Math.sin(TAU * p + (1.2 + 5.5 * bite + 2 * wob) * Math.sin(TAU * m)) + 0.5 * saw(p - Math.floor(p), s.f / SR);
    if ((i & 15) === 0) {
      const open = 0.35 * wob + 0.65 * bite;
      v.forEach(([a, b], side) => {
        a.set(mix(300, 950, open) * (1 + side * 0.04), 2.5);
        b.set(mix(900, 2900, open) * (1 - side * 0.04), 3.5);
      });
    }
    const low = Math.tanh(Math.sin(TAU * sub) * 1.5) * 0.6;
    v.forEach(([a, b], side) => {
      const y = Math.tanh((a.bp(x) * 1.2 + b.bp(x) * 0.9 + x * 0.12) * 1.8) * 0.55 + low;
      if (i >= 0) out[side][i] = y * s.env * 0.6;
    });
  });
  return out.map((x) => join(x, n));
}

// --- Transiciones ------------------------------------------------------------------

/** Subida: ruido que se abre y una sierra que sube de octava en octava. */
export function subida(note, rnd) {
  const n = Math.ceil(note.d * SR);
  const l = new Float32Array(n);
  const r = new Float32Array(n);
  const fl = new Svf();
  const fr = new Svf();
  const tone = new Svf(2000, 0.8);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const k = i / n;
    if ((i & 15) === 0) {
      const c = 250 * 2 ** (5.2 * k ** 1.3);
      fl.set(c, 1.8);
      fr.set(c * 1.06, 1.8);
      tone.set(400 + 4000 * k * k, 0.8);
    }
    const f = hz(note.m) * 2 ** (k ** 1.6);
    phase += f / SR;
    if (phase > 1) phase -= 1;
    const pulse = 0.65 + 0.35 * Math.cos(TAU * 8 * (i / SR)) * k;
    const e = k ** 1.8 * pulse * Math.min(1, (n - i) / 300) * note.v;
    const t = tone.lp(saw(phase, f / SR)) * 0.2;
    l[i] = (fl.bp(rnd() * 2 - 1) * 0.8 + t) * e;
    r[i] = (fr.bp(rnd() * 2 - 1) * 0.8 + t) * e;
  }
  return { x: [l, r] };
}

/** Caída: lo contrario, después de un golpe. */
export function caida(note, rnd) {
  const n = Math.ceil(note.d * SR);
  const out = [new Float32Array(n), new Float32Array(n)];
  for (const x of out) {
    const f = new Svf();
    for (let i = 0; i < n; i++) {
      const k = i / n;
      if ((i & 15) === 0) f.set(7000 * 2 ** (-5.5 * k ** 0.7), 1.2);
      x[i] = f.bp(rnd() * 2 - 1) * (1 - k) ** 1.6 * note.v * 0.7 * Math.min(1, (n - i) / 400);
    }
  }
  return { x: out };
}

/** Golpe de cine: un grave que se hunde y un estallido. */
export function impacto(note, rnd) {
  const n = Math.ceil(2.2 * SR);
  const l = new Float32Array(n);
  const r = new Float32Array(n);
  const fl = new Svf(900, 0.7);
  const fr = new Svf(900, 0.7);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const s = i / SR;
    phase += (hz(note.m) * (1 + 2.2 * Math.exp(-s / 0.06))) / SR;
    const low = Math.tanh(Math.sin(TAU * phase) * 2.2) * Math.exp(-s / 0.6) * 0.7;
    if ((i & 31) === 0) {
      fl.set(200 + 5000 * Math.exp(-s / 0.16), 0.7);
      fr.set(200 + 5000 * Math.exp(-s / 0.16), 0.7);
    }
    const g = Math.exp(-s / 0.45) * 0.8 * Math.min(1, (n - i) / 2000);
    l[i] = (low + fl.lp(rnd() * 2 - 1) * g) * note.v;
    r[i] = (low + fr.lp(rnd() * 2 - 1) * g) * note.v;
  }
  return { x: [l, r] };
}

export const KEYS = { cuerdas, bajoSec, bajoNegro, pluma, tecla, estocada, colchon, brillo, pulso, cristal, bajo808, bajoRoto, bajoPulso, subida, caida, impacto };
export const DRAWN = { reese, acido, grunido, vozSinte };
