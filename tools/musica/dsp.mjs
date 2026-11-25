// Lo básico para hacer sonido: azar con semilla, filtros, ecos, reverberación, volumen y archivos WAV.
//
// Todas las pistas son vueltas sin corte: los buses miden exactamente lo que dura la vuelta y lo que
// sobra al final (la cola de una nota, un eco) sigue al principio. Los efectos se pasan dos veces y se
// guarda la segunda, que ya trae la cola de la primera.

export const SR = 44100;
export const TAU = Math.PI * 2;
export const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
export const db = (value) => 10 ** (value / 20);
export const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
export const mix = (a, b, k) => a + (b - a) * k;

// En silencio, los filtros acaban haciendo cuentas con números tan chicos que el procesador va cien veces
// más lento. Esto, que no se oye, lo evita.
const TINY = 1e-18;

/** Azar con semilla (de 0 a 1): la misma semilla da siempre la misma música. */
export function azar(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Un bus estéreo que da la vuelta. */
export class Bus {
  constructor(n) {
    this.n = n;
    this.l = new Float32Array(n);
    this.r = new Float32Array(n);
  }

  /** Suma un sonido (mono o [izquierda, derecha]) desde la muestra at, dando la vuelta. pan de -1 a 1. */
  add(x, at, gain = 1, pan = 0) {
    const stereo = Array.isArray(x);
    const [a, b] = stereo ? x : [x, x];
    const gl = gain * Math.cos(((pan + 1) * Math.PI) / 4) * (stereo ? Math.SQRT2 : 1);
    const gr = gain * Math.sin(((pan + 1) * Math.PI) / 4) * (stereo ? Math.SQRT2 : 1);
    let p = ((Math.round(at) % this.n) + this.n) % this.n;
    for (let i = 0; i < a.length; i++) {
      this.l[p] += a[i] * gl;
      this.r[p] += b[i] * gr;
      if (++p === this.n) p = 0;
    }
  }

  /** Suma otro bus. */
  sum(other, gain = 1) {
    for (let i = 0; i < this.n; i++) {
      this.l[i] += other.l[i] * gain;
      this.r[i] += other.r[i] * gain;
    }
  }

  scale(gain) {
    for (let i = 0; i < this.n; i++) {
      this.l[i] *= gain;
      this.r[i] *= gain;
    }
  }
}

/** Filtro de estado variable (TPT): con set(f, q) y luego lp, bp o hp por muestra. */
export class Svf {
  constructor(f = 1000, q = 0.707) {
    this.s1 = 0;
    this.s2 = 0;
    this.set(f, q);
  }

  set(f, q = 0.707) {
    this.g = Math.tan((Math.PI * clamp(f, 10, SR * 0.46)) / SR);
    this.k = 1 / q;
    this.a1 = 1 / (1 + this.g * (this.g + this.k));
  }

  step(x) {
    this.v1 = this.a1 * (this.s1 + this.g * (x - this.s2));
    this.v2 = this.s2 + this.g * this.v1;
    this.s1 = 2 * this.v1 - this.s1;
    this.s2 = 2 * this.v2 - this.s2;
  }

  lp(x) {
    this.step(x);
    return this.v2;
  }

  bp(x) {
    this.step(x);
    return this.v1 * this.k;
  }

  hp(x) {
    this.step(x);
    return x - this.k * this.v1 - this.v2;
  }
}

/** Filtro de dos polos y dos ceros (para ecualizar y para medir el volumen). */
export class Biquad {
  constructor([b0, b1, b2, a0, a1, a2]) {
    Object.assign(this, { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0, x1: 0, x2: 0, y1: 0, y2: 0 });
  }

  run(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = y;
    return y;
  }

  static peak(f, gain, q = 1) {
    const A = 10 ** (gain / 40);
    const w = (TAU * f) / SR;
    const al = Math.sin(w) / (2 * q);
    const c = Math.cos(w);
    return new Biquad([1 + al * A, -2 * c, 1 - al * A, 1 + al / A, -2 * c, 1 - al / A]);
  }

  static shelf(f, gain, high) {
    const A = 10 ** (gain / 40);
    const w = (TAU * f) / SR;
    const c = Math.cos(w) * (high ? 1 : -1);
    const al = (Math.sin(w) / 2) * Math.SQRT2;
    const s = 2 * Math.sqrt(A) * al;
    const sign = high ? 1 : -1;
    return new Biquad([
      A * (A + 1 + (A - 1) * c + s), -2 * A * sign * (A - 1 + (A + 1) * c), A * (A + 1 + (A - 1) * c - s),
      A + 1 - (A - 1) * c + s, 2 * sign * (A - 1 - (A + 1) * c), A + 1 - (A - 1) * c - s,
    ]);
  }

  static highpass(f, q = 0.707) {
    const w = (TAU * f) / SR;
    const al = Math.sin(w) / (2 * q);
    const c = Math.cos(w);
    return new Biquad([(1 + c) / 2, -(1 + c), (1 + c) / 2, 1 + al, -2 * c, 1 - al]);
  }
}

/** Pasa cada canal por make() → función por muestra, dos vueltas, y guarda la segunda. */
export function around(bus, make) {
  for (const channel of [bus.l, bus.r]) {
    const run = make();
    for (let i = 0; i < bus.n; i++) run(channel[i] + TINY, i);
    for (let i = 0; i < bus.n; i++) channel[i] = run(channel[i] + TINY, i);
  }
}

/** Como around, para una función que ve los dos canales: run(l, r, i) → [l, r] en out. */
export function aroundStereo(bus, run) {
  const out = [0, 0];
  const l = bus.l.slice();
  const r = bus.r.slice();
  for (let i = 0; i < bus.n; i++) run(l[i] + TINY, r[i] + TINY, i, out);
  for (let i = 0; i < bus.n; i++) {
    run(l[i] + TINY, r[i] + TINY, i, out);
    bus.l[i] = out[0];
    bus.r[i] = out[1];
  }
}

/** Un coro corto: abre en estéreo lo que suena al centro. */
export function chorus(bus, { depth = 0.0022, base = 0.011, rate = 0.5, wet = 0.5 } = {}) {
  const size = 4096;
  const a = new Float32Array(size);
  const b = new Float32Array(size);
  // Ciclos enteros en la vuelta, para que no se note el corte
  const cycles = Math.max(1, Math.round((rate * bus.n) / SR));
  const read = (line, p, d) => {
    const x = p - d;
    const i = Math.floor(x);
    const f = x - i;
    return line[i & (size - 1)] * (1 - f) + line[(i + 1) & (size - 1)] * f;
  };
  let p = size;
  aroundStereo(bus, (l, r, i, out) => {
    a[p & (size - 1)] = l;
    b[p & (size - 1)] = r;
    const w = (TAU * cycles * i) / bus.n;
    out[0] = l * (1 - wet * 0.4) + wet * read(a, p, (base + depth * Math.sin(w)) * SR);
    out[1] = r * (1 - wet * 0.4) + wet * read(b, p, (base + depth * Math.sin(w + 2.1)) * SR);
    p++;
  });
}

/** Eco de ida y vuelta entre los dos lados. time en segundos; tone: qué tan oscuro se va haciendo. */
export function pingpong(bus, { time = 0.375, feedback = 0.42, tone = 2600, low = 220 } = {}) {
  const d = Math.round(time * SR);
  const a = new Float32Array(d);
  const b = new Float32Array(d);
  const f = [new Svf(tone), new Svf(tone), new Svf(low), new Svf(low)];
  let p = 0;
  aroundStereo(bus, (l, r, i, out) => {
    const x = a[p];
    const y = b[p];
    a[p] = f[2].hp(f[0].lp((l + r) * 0.6 + y * feedback));
    b[p] = f[3].hp(f[1].lp(x));
    out[0] = x;
    out[1] = y;
    if (++p === d) p = 0;
  });
}

/** Reverberación (8 líneas con realimentación cruzada). seconds: lo que tarda en apagarse. */
export function reverb(bus, { seconds = 2.2, damp = 5200, predelay = 0.018, size = 1, low = 180 } = {}) {
  const times = [1031, 1327, 1523, 1783, 1949, 2239, 2543, 2801].map((t) => Math.round(t * size));
  const lines = times.map((t) => new Float32Array(t));
  const gains = times.map((t) => 10 ** ((-3 * t) / (seconds * SR)));
  const lowpass = times.map(() => 0);
  const k = 1 - Math.exp((-TAU * damp) / SR);
  const pos = times.map(() => 0);
  const pre = Math.max(1, Math.round(predelay * SR));
  const pl = new Float32Array(pre);
  const pr = new Float32Array(pre);
  let pp = 0;
  const cut = [new Svf(low), new Svf(low)];
  // Difusores: dos pasa-todo por lado
  const ap = [[142, 379], [107, 277]].map((pair) => pair.map((t) => ({ line: new Float32Array(t), p: 0 })));
  const diffuse = (chain, x) => {
    for (const s of chain) {
      const y = s.line[s.p];
      const v = x - 0.62 * y;
      s.line[s.p] = v;
      if (++s.p === s.line.length) s.p = 0;
      x = y + 0.62 * v;
    }
    return x;
  };
  const o = new Float64Array(8);
  aroundStereo(bus, (l, r, i, out) => {
    const inL = diffuse(ap[0], cut[0].hp(pl[pp]));
    const inR = diffuse(ap[1], cut[1].hp(pr[pp]));
    pl[pp] = l;
    pr[pp] = r;
    if (++pp === pre) pp = 0;
    let total = 0;
    for (let j = 0; j < 8; j++) {
      lowpass[j] += k * (lines[j][pos[j]] - lowpass[j]);
      o[j] = lowpass[j] * gains[j];
      total += o[j];
    }
    total *= 0.25;
    for (let j = 0; j < 8; j++) {
      lines[j][pos[j]] = (j & 1 ? inR : inL) + o[j] - total;
      if (++pos[j] === times[j]) pos[j] = 0;
    }
    out[0] = (o[0] - o[2] + o[4] - o[6]) * 0.5;
    out[1] = (o[1] - o[3] + o[5] - o[7]) * 0.5;
  });
}

/** Ponderación K: cómo oye el volumen una persona. */
function weighting() {
  const shelf = new Biquad([1.53512485958697, -2.69169618940638, 1.19839281085285, 1, -1.69065929318241, 0.73248077421585]);
  const low = new Biquad([1, -2, 1, 1, -1.99004745483398, 0.99007225036621]);
  return (x) => low.run(shelf.run(x));
}

/**
 * El volumen (LUFS) de un bus. gate: solo cuentan los pedazos de 0.4 s que suenan (a no menos de 10 dB
 * del promedio), como en la norma; así una voz que toca poco no se mide como si fuera suave.
 */
export function loudness(bus, gate = true) {
  const hop = Math.round(0.1 * SR);
  const blocks = Math.ceil(bus.n / hop);
  const power = new Float64Array(blocks);
  for (const channel of [bus.l, bus.r]) {
    const w = weighting();
    for (let i = Math.max(0, bus.n - SR); i < bus.n; i++) w(channel[i] + TINY);
    for (let i = 0; i < bus.n; i++) {
      const y = w(channel[i] + TINY);
      power[Math.floor(i / hop)] += y * y;
    }
  }
  const windows = [];
  for (let b = 0; b < blocks; b++) {
    let e = 0;
    for (let j = 0; j < 4; j++) e += power[(b + j) % blocks];
    windows.push(e / (4 * hop));
  }
  const toDb = (e) => -0.691 + 10 * Math.log10(e + 1e-15);
  const mean = (list) => list.reduce((s, e) => s + e, 0) / Math.max(1, list.length);
  if (!gate) return toDb(mean(windows));
  const loud = windows.filter((e) => toDb(e) > -70);
  const ref = toDb(mean(loud)) - 10;
  return toDb(mean(loud.filter((e) => toDb(e) > ref)));
}

export function peak(bus) {
  let top = 0;
  for (let i = 0; i < bus.n; i++) top = Math.max(top, Math.abs(bus.l[i]), Math.abs(bus.r[i]));
  return top;
}

/** Cuánta energía hay en cada banda (dB respecto al total); edges: las fronteras en Hz. */
export function bands(bus, edges) {
  const size = 8192;
  const bins = new Float64Array(size / 2);
  const cos = Float64Array.from({ length: size / 2 }, (_, i) => Math.cos((TAU * i) / size));
  const sin = Float64Array.from({ length: size / 2 }, (_, i) => -Math.sin((TAU * i) / size));
  for (let at = 0; at + size <= bus.n; at += size * 4) {
    const re = new Float64Array(size);
    const im = new Float64Array(size);
    // Los dos lados en una sola transformada
    for (let i = 0; i < size; i++) {
      const w = 0.5 - 0.5 * Math.cos((TAU * i) / size);
      re[i] = (bus.l[at + i] + bus.r[at + i]) * 0.5 * w;
    }
    for (let i = 1, j = 0; i < size; i++) {
      let bit = size >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) [re[i], re[j]] = [re[j], re[i]];
    }
    for (let len = 2; len <= size; len <<= 1) {
      const step = size / len;
      for (let i = 0; i < size; i += len) {
        for (let k = 0; k < len / 2; k++) {
          const a = i + k;
          const b = a + len / 2;
          const xr = re[b] * cos[k * step] - im[b] * sin[k * step];
          const xi = re[b] * sin[k * step] + im[b] * cos[k * step];
          re[b] = re[a] - xr;
          im[b] = im[a] - xi;
          re[a] += xr;
          im[a] += xi;
        }
      }
    }
    for (let k = 1; k < size / 2; k++) bins[k] += re[k] * re[k] + im[k] * im[k];
  }
  const total = bins.reduce((a, b) => a + b, 1e-12);
  return edges.slice(1).map((to, n) => {
    let e = 1e-12;
    for (let k = Math.max(1, Math.round((edges[n] * size) / SR)); k < Math.min(size / 2, Math.round((to * size) / SR)); k++) e += bins[k];
    return 10 * Math.log10(e / total);
  });
}

/** Compresor suave para pegar la mezcla (sigue a los dos canales juntos). */
export function glue(bus, { threshold = -16, ratio = 2.2, attack = 0.02, release = 0.18 } = {}) {
  const up = 1 - Math.exp(-1 / (attack * SR));
  const down = 1 - Math.exp(-1 / (release * SR));
  let env = 0;
  aroundStereo(bus, (l, r, i, out) => {
    const e = (l * l + r * r) / 2;
    env += (e - env) * (e > env ? up : down);
    const level = 10 * Math.log10(env + 1e-12);
    const over = level - threshold;
    // Rodilla de 8 dB
    const bend = over <= -4 ? 0 : over >= 4 ? over : ((over + 4) ** 2) / 16;
    const gain = db(-bend * (1 - 1 / ratio));
    out[0] = l * gain;
    out[1] = r * gain;
  });
}

/** Limitador con 5 ms de anticipación: nada pasa del techo. */
export function limit(bus, ceiling = 0.89, release = 0.09) {
  const n = bus.n;
  const look = Math.round(0.005 * SR);
  const need = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const top = Math.max(Math.abs(bus.l[i]), Math.abs(bus.r[i]));
    need[i] = top > ceiling ? ceiling / top : 1;
  }
  // El mínimo de los próximos look valores, y después una ventana que lo suaviza
  const ahead = new Float32Array(n);
  const deque = [];
  for (let i = 0; i < n + 2 * look; i++) {
    const v = need[i % n];
    while (deque.length && deque.at(-1)[1] >= v) deque.pop();
    deque.push([i, v]);
    if (deque[0][0] <= i - 2 * look) deque.shift();
    const at = i - look;
    if (at >= 0 && at < n) ahead[at] = deque[0][1];
  }
  const up = 1 - Math.exp(-1 / (release * SR));
  let g = 1;
  for (let turn = 0; turn < 2; turn++) {
    for (let i = 0; i < n; i++) {
      const target = ahead[i];
      g = target < g ? target : g + (target - g) * up;
      if (turn) need[i] = g;
    }
  }
  const smooth = new Float32Array(n);
  let sum = 0;
  for (let j = -look; j < look; j++) sum += need[(((j % n) + n) % n)];
  for (let i = 0; i < n; i++) {
    smooth[i] = sum / (2 * look);
    sum += need[(i + look) % n] - need[((i - look) % n + n) % n];
  }
  for (let i = 0; i < n; i++) {
    const gain = Math.min(smooth[i], need[i]);
    bus.l[i] = clamp(bus.l[i] * gain, -ceiling, ceiling);
    bus.r[i] = clamp(bus.r[i] * gain, -ceiling, ceiling);
  }
}

/** Lee un WAV estéreo de 16 bits a 44.1 kHz: [izquierda, derecha]. */
export function readWav(buffer) {
  let p = 12;
  while (p < buffer.length - 8) {
    const id = buffer.toString('latin1', p, p + 4);
    const size = buffer.readUInt32LE(p + 4);
    if (id === 'data') {
      const n = Math.min(size, buffer.length - p - 8) >> 2;
      const channel = (side) => Float32Array.from({ length: n }, (_, i) => buffer.readInt16LE(p + 8 + i * 4 + side * 2) / 32768);
      return [channel(0), channel(1)];
    }
    p += 8 + size + (size & 1);
  }
  throw new Error('El WAV no trae sonido');
}

/** WAV estéreo de 16 bits. */
export function wav(l, r) {
  const n = l.length;
  const out = Buffer.alloc(44 + n * 4);
  out.write('RIFF', 0, 'latin1');
  out.writeUInt32LE(36 + n * 4, 4);
  out.write('WAVEfmt ', 8, 'latin1');
  out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20);
  out.writeUInt16LE(2, 22);
  out.writeUInt32LE(SR, 24);
  out.writeUInt32LE(SR * 4, 28);
  out.writeUInt16LE(4, 32);
  out.writeUInt16LE(16, 34);
  out.write('data', 36, 'latin1');
  out.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    out.writeInt16LE(Math.round(clamp(l[i], -1, 1) * 32767), 44 + i * 4);
    out.writeInt16LE(Math.round(clamp(r[i], -1, 1) * 32767), 46 + i * 4);
  }
  return out;
}
