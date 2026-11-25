// La percusión: los tambores y metales chinos (tanggu, paigu, bangu, muyu, gongs y platos de la ópera) y la
// batería electrónica. Cada golpe se hace una vez por variante y se reparte (los tonos, en sol menor
// pentatónica: un bombo en sol o en re no choca con nada).

import { azar, clamp, hz, SR, Svf, TAU } from './dsp.mjs';

const seconds = (s) => new Float32Array(Math.ceil(s * SR));
const fade = (x, tail = 400) => {
  for (let i = 0; i < tail; i++) x[x.length - 1 - i] *= i / tail;
  return x;
};
/** Senos que se apagan: [proporción, volumen, caída]. */
function modes(x, f, parts, { vel = 1, drop = 0, dropTau = 0.04, rnd = () => 0 }) {
  for (const [ratio, amp, tau] of parts) {
    let phase = rnd() * 0.2;
    for (let i = 0; i < x.length; i++) {
      const s = i / SR;
      phase += (f * ratio * (1 + drop * Math.exp(-s / dropTau))) / SR;
      x[i] += Math.sin(TAU * phase) * amp * vel * Math.exp(-s / tau);
    }
  }
  return x;
}
/** Ruido filtrado que se apaga. */
function hiss(x, { rnd, f, q = 0.8, mode = 'bp', amp = 1, tau = 0.1, attack = 0.0005, at = 0, to = null, toTau = 0.1 }) {
  const svf = new Svf(f, q);
  const start = Math.round(at * SR);
  for (let i = start; i < x.length; i++) {
    const s = (i - start) / SR;
    if (to && (i & 31) === 0) svf.set(to + (f - to) * Math.exp(-s / toTau), q);
    x[i] += svf[mode](rnd() * 2 - 1) * amp * Math.exp(-s / tau) * Math.min(1, s / attack);
  }
  return x;
}
const crush = (x, drive) => {
  const k = Math.tanh(1 + drive);
  for (let i = 0; i < x.length; i++) x[i] = Math.tanh(x[i] * (1 + drive)) / k;
  return x;
};
const wide = (make) => [make(1), make(2)];

// --- Batería electrónica -----------------------------------------------------------

const kick = ({ m = 31, top = 6, tau = 0.022, amp = 0.28, click = 0.35, drive = 0.8, len = 0.55, knock = 0 }) => (rnd) => {
  const x = seconds(len);
  let phase = 0;
  for (let i = 0; i < x.length; i++) {
    const s = i / SR;
    phase += (hz(m) * (1 + top * Math.exp(-s / tau) + 0.6 * Math.exp(-s / 0.09))) / SR;
    x[i] = Math.sin(TAU * phase) * Math.exp(-s / amp) * Math.min(1, s / 0.0008);
  }
  hiss(x, { rnd, f: 3600, q: 0.7, amp: click, tau: 0.006 });
  if (knock) hiss(x, { rnd, f: 420, q: 2, amp: knock, tau: 0.03 });
  return fade(crush(x, drive));
};

const snare = ({ f = 196, body = 0.6, noise = 0.8, tau = 0.13, bright = 5200, snap = 0.5, drive = 0.8, len = 0.5, tail = 0 }) => (rnd) => wide(() => {
  const x = seconds(len);
  modes(x, f, [[1, body, 0.09], [1.78, body * 0.5, 0.06]], { drop: 0.5, dropTau: 0.012 });
  hiss(x, { rnd, f: bright, q: 0.5, amp: noise, tau });
  hiss(x, { rnd, f: 2100, q: 0.9, amp: noise * 0.6, tau: tau * 0.6 });
  hiss(x, { rnd, f: 7500, q: 0.7, mode: 'hp', amp: snap, tau: 0.018 });
  if (tail) hiss(x, { rnd, f: 1500, q: 0.5, amp: tail, tau: 0.3, attack: 0.02 });
  return fade(crush(x, drive));
});

const clap = (rnd) => wide(() => {
  const x = seconds(0.42);
  for (const [at, amp] of [[0, 0.7], [0.011 + rnd() * 0.002, 0.6], [0.023 + rnd() * 0.002, 0.8]]) hiss(x, { rnd, f: 1250, q: 1.2, amp, tau: 0.008, at });
  hiss(x, { rnd, f: 1400, q: 0.9, amp: 0.9, tau: 0.09, at: 0.03 });
  hiss(x, { rnd, f: 4800, q: 0.7, amp: 0.4, tau: 0.05, at: 0.028 });
  return fade(crush(x, 0.6));
});

/** Platillo de caja de ritmos: seis cuadradas que no armonizan, filtradas. */
const metal = ({ f = 320, hp = 7000, tau = 0.04, len = 0.16, noise = 0.6, amp = 0.8 }) => (rnd) => {
  const x = seconds(len);
  const ratios = [1, 1.3348, 1.4755, 1.6818, 1.9307, 2.5459].map((k) => ({ k: (f * k * (0.995 + 0.01 * rnd())) / SR, p: rnd() }));
  const bp = new Svf(hp * 1.25, 0.9);
  const hi = new Svf(hp, 0.8);
  for (let i = 0; i < x.length; i++) {
    const s = i / SR;
    let y = 0;
    for (const o of ratios) {
      o.p += o.k;
      if (o.p > 1) o.p -= 1;
      y += o.p < 0.5 ? 1 : -1;
    }
    y = y * 0.22 + (rnd() * 2 - 1) * noise;
    x[i] = hi.hp(bp.bp(y) + y * 0.15) * Math.exp(-s / tau) * Math.min(1, s / 0.0006) * amp;
  }
  return fade(x, 200);
};

const crash = ({ tau = 0.7, len = 2, hp = 3200 }) => (rnd) => wide(() => {
  const x = seconds(len);
  hiss(x, { rnd, f: hp, q: 0.6, mode: 'hp', amp: 0.5, tau });
  hiss(x, { rnd, f: 6200, q: 1, amp: 0.4, tau: tau * 0.6 });
  modes(x, 620, [[3.1, 0.05, 0.5], [4.37, 0.05, 0.4], [5.83, 0.05, 0.3], [7.9, 0.04, 0.3]], { rnd });
  return fade(x, 3000);
});

const rim = (rnd) => {
  const x = seconds(0.09);
  modes(x, 466, [[1, 0.5, 0.012], [3.55, 0.6, 0.009]], {});
  hiss(x, { rnd, f: 3800, q: 1.2, amp: 0.4, tau: 0.006 });
  return fade(crush(x, 0.5), 200);
};

const shaker = (rnd) => {
  const x = seconds(0.1);
  return fade(hiss(x, { rnd, f: 6800, q: 0.9, amp: 0.8, tau: 0.025, attack: 0.012 }), 200);
};

/** Tarola de los ochenta: la reverberación cortada de golpe (gated). */
const gated = ({ f = 190, hold = 0.17, bright = 4600 }) => (rnd) => wide(() => {
  const x = seconds(hold + 0.06);
  modes(x, f, [[1, 0.9, 0.07], [1.62, 0.4, 0.05]], { drop: 0.5, dropTau: 0.014 });
  hiss(x, { rnd, f: 2400, q: 0.7, amp: 0.9, tau: 0.04 });
  hiss(x, { rnd, f: 7000, q: 0.7, mode: 'hp', amp: 0.5, tau: 0.02 });
  const room = seconds(hold + 0.06);
  hiss(room, { rnd, f: bright, q: 0.4, mode: 'lp', amp: 0.5, tau: 0.4, attack: 0.012 });
  for (let i = 0; i < x.length; i++) {
    const s = i / SR;
    x[i] += room[i] * (s < hold ? 1 : Math.max(0, 1 - (s - hold) / 0.02));
  }
  return fade(crush(x, 1.1), 300);
});

/** Tom electrónico: la nota se cae. */
const tom = (m) => (rnd) => {
  const x = seconds(0.6);
  let phase = 0;
  for (let i = 0; i < x.length; i++) {
    const s = i / SR;
    phase += (hz(m) * (1 + 1.5 * Math.exp(-s / 0.06))) / SR;
    x[i] = Math.sin(TAU * phase) * Math.exp(-s / 0.19) * Math.min(1, s / 0.001);
  }
  hiss(x, { rnd, f: 1800, q: 0.6, amp: 0.35, tau: 0.03 });
  return fade(crush(x, 0.9), 800);
};

// --- Percusión china ----------------------------------------------------------------

const PIEL = [[1, 1, 0.42], [1.59, 0.5, 0.22], [2.14, 0.3, 0.16], [2.65, 0.2, 0.12], [3.16, 0.12, 0.08]];

/** Tanggu: el tambor de barril (grave). */
const tanggu = (m, { tau = 1, stick = 0.35, len = 0.9 } = {}) => (rnd) => wide((side) => {
  const x = seconds(len);
  modes(x, hz(m) * (1 + (side - 1.5) * 0.004), PIEL.map(([a, b, c]) => [a, b, c * tau]), { drop: 0.35, dropTau: 0.03, rnd });
  hiss(x, { rnd, f: 900, q: 0.7, amp: stick, tau: 0.02 });
  hiss(x, { rnd, f: 260, q: 1, amp: 0.4, tau: 0.06 });
  return fade(crush(x, 0.6), 1500);
});

/** Bangu: el tambor chico que dirige la ópera; seco, altísimo. */
const bangu = (rnd) => {
  const x = seconds(0.16);
  modes(x, 587, [[1, 0.5, 0.03], [1.62, 0.5, 0.022], [2.9, 0.4, 0.012]], { drop: 0.15, dropTau: 0.008 });
  hiss(x, { rnd, f: 2600, q: 0.8, amp: 0.5, tau: 0.012 });
  return fade(crush(x, 0.8), 300);
};

/** Muyu: el pez de madera. */
const muyu = (f) => (rnd) => {
  const x = seconds(0.18);
  modes(x, f, [[1, 0.8, 0.035], [1.51, 0.25, 0.018], [2.71, 0.18, 0.01]], { drop: 0.06, dropTau: 0.01 });
  hiss(x, { rnd, f: 2200, q: 1, amp: 0.15, tau: 0.005 });
  return fade(x, 300);
};

/** Clave de bambú (ban). */
const ban = (rnd) => {
  const x = seconds(0.1);
  modes(x, 1174, [[1, 0.5, 0.014], [2.4, 0.4, 0.008]], {});
  hiss(x, { rnd, f: 3200, q: 1.5, amp: 0.5, tau: 0.006 });
  return fade(x, 200);
};

/** Gong chico de la ópera: su nota sube. */
const xiaoluo = (rnd) => wide((side) => {
  const x = seconds(0.9);
  const f = 698 * (1 + (side - 1.5) * 0.003);
  for (const [ratio, amp, tau] of [[1, 0.6, 0.28], [1.52, 0.3, 0.2], [2.03, 0.35, 0.16], [2.74, 0.25, 0.1], [3.4, 0.2, 0.07], [4.9, 0.14, 0.05]]) {
    let phase = rnd();
    for (let i = 0; i < x.length; i++) {
      const s = i / SR;
      phase += (f * ratio * (0.88 + 0.14 * (1 - Math.exp(-s / 0.07)))) / SR;
      x[i] += Math.sin(TAU * phase) * amp * Math.exp(-s / tau) * Math.min(1, s / 0.001);
    }
  }
  hiss(x, { rnd, f: 5200, q: 0.8, amp: 0.3, tau: 0.03 });
  return fade(crush(x, 0.5), 2000);
});

/** Gong grande: su nota baja. */
const daluo = (rnd) => wide((side) => {
  const x = seconds(2.4);
  const f = 196 * (1 + (side - 1.5) * 0.005);
  for (const [ratio, amp, tau] of [[1, 0.7, 0.9], [1.48, 0.4, 0.6], [1.98, 0.5, 0.55], [2.56, 0.35, 0.4], [3.1, 0.3, 0.32], [4.2, 0.22, 0.22], [5.4, 0.2, 0.16], [7.1, 0.14, 0.12]]) {
    let phase = rnd();
    for (let i = 0; i < x.length; i++) {
      const s = i / SR;
      phase += (f * ratio * (1.1 - 0.1 * (1 - Math.exp(-s / 0.16)))) / SR;
      x[i] += Math.sin(TAU * phase + 0.4 * Math.sin(TAU * phase * 0.5)) * amp * Math.exp(-s / tau) * Math.min(1, s / 0.003);
    }
  }
  hiss(x, { rnd, f: 3600, q: 0.6, amp: 0.4, tau: 0.35, attack: 0.02 });
  return fade(crush(x, 0.4), 4000);
});

/** Tam-tam: el gong hondo que florece. */
const tamtam = (rnd) => wide(() => {
  const x = seconds(4.2);
  for (let p = 0; p < 26; p++) {
    const f = 62 * 1.21 ** p * (0.97 + 0.06 * rnd());
    if (f > 5200) break;
    const tau = 1.9 / (1 + p * 0.09);
    const rise = 0.02 + p * 0.02;
    const amp = 0.28 / (1 + p * 0.1);
    let phase = rnd();
    for (let i = 0; i < x.length; i++) {
      const s = i / SR;
      phase += (f * (1 + 0.002 * Math.sin(s * (3 + p)))) / SR;
      x[i] += Math.sin(TAU * phase) * amp * Math.exp(-s / tau) * (1 - Math.exp(-s / rise));
    }
  }
  hiss(x, { rnd, f: 3000, q: 0.5, amp: 0.25, tau: 0.8, attack: 0.15 });
  return fade(x, 8000);
});

/** Bo: los platos de mano. */
const bo = ({ tau = 0.22, len = 0.8 }) => (rnd) => wide(() => {
  const x = seconds(len);
  hiss(x, { rnd, f: 2600, q: 0.7, mode: 'hp', amp: 0.6, tau });
  modes(x, 880, [[1.9, 0.12, tau * 1.3], [2.83, 0.12, tau], [4.1, 0.12, tau], [5.7, 0.1, tau * 0.8], [7.3, 0.08, tau * 0.6]], { rnd });
  return fade(crush(x, 0.4), 1500);
});

/** Yunque: metal industrial. */
const yunque = (rnd) => wide((side) => {
  const x = seconds(0.7);
  modes(x, 784 * (1 + (side - 1.5) * 0.004), [[1, 0.5, 0.12], [1.83, 0.4, 0.16], [2.97, 0.4, 0.1], [4.31, 0.3, 0.07], [6.2, 0.25, 0.04]], { rnd });
  hiss(x, { rnd, f: 5200, q: 0.8, amp: 0.5, tau: 0.012 });
  return fade(crush(x, 1.2), 1500);
});

/** Un tubo de metal, largo. */
const tubo = (f) => (rnd) => wide((side) => {
  const x = seconds(1.1);
  modes(x, f * (1 + (side - 1.5) * 0.003), [[1, 0.6, 0.3], [2.76, 0.45, 0.2], [5.4, 0.3, 0.1], [8.9, 0.2, 0.05]], { rnd });
  hiss(x, { rnd, f: 3800, q: 0.8, amp: 0.4, tau: 0.02 });
  return fade(crush(x, 0.8), 1500);
});

/** Una cadena que cae. */
const cadena = (rnd) => wide(() => {
  const x = seconds(0.5);
  for (let k = 0; k < 9; k++) hiss(x, { rnd, f: 3000 + 4200 * rnd(), q: 5, amp: 0.7 * (1 - k / 11), tau: 0.014, at: k * 0.028 + rnd() * 0.014 });
  return fade(x, 600);
});

/** Corazón: dos golpes muy hondos. */
const latido = (rnd) => {
  const x = seconds(0.5);
  modes(x, hz(31), [[1, 1, 0.12], [2, 0.2, 0.05]], { drop: 0.9, dropTau: 0.02 });
  hiss(x, { rnd, f: 180, q: 0.8, amp: 0.25, tau: 0.03 });
  return fade(crush(x, 0.4), 800);
};

const reversed = (make) => (rnd) => make(rnd).map((x) => x.slice().reverse());

/** Todos los golpes: cómo se hacen, su volumen (dB), su lado, y cuánto eco y cuánta reverberación llevan. */
export const DRUMS = {
  // El bombo sube con la intensidad: hondo, redondo, duro y roto
  bomboHondo: { make: kick({ m: 43, top: 1.8, tau: 0.03, amp: 0.3, click: 0.1, drive: 0.4, len: 0.8 }), gain: -8 },
  bombo: { make: kick({ m: 31, top: 5, tau: 0.02, amp: 0.2, click: 0.35, drive: 0.9 }), gain: -7 },
  bomboDuro: { make: kick({ m: 31, top: 7, tau: 0.016, amp: 0.2, click: 0.6, drive: 2, knock: 0.4 }), gain: -7 },
  bomboRoto: { make: kick({ m: 31, top: 8, tau: 0.02, amp: 0.26, click: 0.8, drive: 6, knock: 0.8, len: 0.6 }), gain: -7.5 },
  latido: { make: latido, gain: -8 },

  tarola: { make: snare({ f: 196, tau: 0.11 }), gain: -10, rev: 0.14, variants: 3 },
  tarolaGrande: { make: snare({ f: 175, body: 0.9, noise: 1, tau: 0.2, bright: 4400, drive: 2.2, len: 1, tail: 0.5 }), gain: -8, rev: 0.22, variants: 2 },
  tarolaSeca: { make: snare({ f: 233, body: 0.7, noise: 0.6, tau: 0.06, bright: 6000, drive: 1.2, len: 0.25 }), gain: -11, rev: 0.06, variants: 3 },
  fantasma: { make: snare({ f: 233, body: 0.3, noise: 0.4, tau: 0.04, snap: 0.2, len: 0.18 }), gain: -22, rev: 0.05, variants: 3 },
  aplauso: { make: clap, gain: -11, rev: 0.2, variants: 3 },
  aro: { make: rim, gain: -15, rev: 0.2, pan: 0.25 },

  // La caja de ritmos del new wave
  bomboLinn: { make: kick({ m: 31, top: 4, tau: 0.016, amp: 0.15, click: 0.5, drive: 0.7, len: 0.4, knock: 0.5 }), gain: -7.5 },
  tarolaLinn: { make: gated({}), gain: -10, rev: 0.1, variants: 3 },
  tomAlto: { make: tom(50), gain: -12, rev: 0.2, pan: -0.35 },
  tomMedio: { make: tom(46), gain: -11.5, rev: 0.2 },
  tomBajo: { make: tom(43), gain: -11, rev: 0.2, pan: 0.35 },

  hat: { make: metal({ tau: 0.028, len: 0.12 }), gain: -21, pan: 0.2, variants: 4 },
  hatAbierto: { make: metal({ tau: 0.19, len: 0.5 }), gain: -21, pan: 0.2, variants: 2, rev: 0.05 },
  hatFino: { make: metal({ f: 410, hp: 9000, tau: 0.016, len: 0.07, noise: 0.4 }), gain: -21, pan: -0.25, variants: 4 },
  ride: { make: metal({ f: 520, hp: 5200, tau: 0.3, len: 0.9, noise: 0.25, amp: 0.7 }), gain: -24, pan: -0.3, variants: 2, rev: 0.1 },
  maraca: { make: shaker, gain: -24, pan: -0.35, variants: 4 },
  crash: { make: crash({}), gain: -16, rev: 0.25 },
  alReves: { make: reversed(crash({ tau: 0.45, len: 1.9 })), gain: -15, rev: 0.2, ends: true },

  tangguSol: { make: tanggu(43), gain: -9, rev: 0.22, variants: 3, pan: -0.1 },
  tangguRe: { make: tanggu(38), gain: -9, rev: 0.24, variants: 3, pan: 0.1 },
  tangguFa: { make: tanggu(41), gain: -9, rev: 0.22, variants: 3, pan: 0.15 },
  paiguDo: { make: tanggu(48, { tau: 0.6, stick: 0.5, len: 0.5 }), gain: -12, rev: 0.18, variants: 3, pan: -0.45 },
  paiguRe: { make: tanggu(50, { tau: 0.6, stick: 0.5, len: 0.5 }), gain: -12, rev: 0.18, variants: 3, pan: -0.2 },
  paiguFa: { make: tanggu(53, { tau: 0.55, stick: 0.5, len: 0.5 }), gain: -12, rev: 0.18, variants: 3, pan: 0.2 },
  paiguSol: { make: tanggu(55, { tau: 0.5, stick: 0.5, len: 0.5 }), gain: -12, rev: 0.18, variants: 3, pan: 0.45 },
  bangu: { make: bangu, gain: -16, rev: 0.2, variants: 4, pan: -0.15 },
  muyu: { make: muyu(587), gain: -16, rev: 0.22, variants: 2, pan: 0.35, eco: 0.1 },
  muyuAlto: { make: muyu(784), gain: -17, rev: 0.22, variants: 2, pan: -0.35, eco: 0.1 },
  ban: { make: ban, gain: -18, rev: 0.2, variants: 3, pan: 0.1 },
  xiaoluo: { make: xiaoluo, gain: -19, rev: 0.25, pan: 0.3, variants: 2 },
  daluo: { make: daluo, gain: -15, rev: 0.25, pan: -0.2 },
  tamtam: { make: tamtam, gain: -13, rev: 0.2 },
  bo: { make: bo({}), gain: -19, rev: 0.16, pan: -0.3, variants: 3 },
  boLargo: { make: bo({ tau: 0.6, len: 1.8 }), gain: -18, rev: 0.2, pan: 0.2 },
  tuboRe: { make: tubo(293.7), gain: -19, rev: 0.3, pan: -0.3, variants: 2 },
  tuboSol: { make: tubo(392), gain: -19, rev: 0.3, pan: 0.3, variants: 2 },
  cadena: { make: cadena, gain: -20, rev: 0.25, pan: -0.15, variants: 3 },
  yunque: { make: yunque, gain: -18, rev: 0.22, pan: 0.25, variants: 2 },
};

const cache = new Map();
/** Un golpe: name, y cuál de sus variantes. Todos con pico 1 (el volumen lo pone DRUMS). */
export function drum(name, variant = 0) {
  const def = DRUMS[name];
  if (!def) throw new Error(`No hay percusión «${name}»`);
  const index = variant % (def.variants ?? 1);
  const key = `${name}${index}`;
  if (!cache.has(key)) {
    let seed = 2166136261;
    for (const c of key) seed = Math.imul(seed ^ c.charCodeAt(0), 16777619);
    const made = def.make(azar(seed));
    const x = Array.isArray(made) ? made : [made, made];
    let top = 0;
    for (const channel of x) for (const y of channel) top = Math.max(top, Math.abs(y));
    cache.set(key, x.map((channel) => channel.map((y) => y / top)));
  }
  return cache.get(key);
}
