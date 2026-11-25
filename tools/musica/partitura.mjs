// La partitura: la escala, el tema (el de las muestras del juego), cómo se escribe una melodía y el
// contrapunto.
//
// Todo está en sol menor pentatónica (G Bb C D F). Una nota es su lugar en la escala: 0 = sol3, 1 = si♭3,
// 2 = do4, 3 = re4, 4 = fa4, 5 = sol4... (negativos hacia abajo). Subir todo uno o dos lugares lleva una
// melodía a otro grado sin salirse de la escala: así cada pista tiene su centro y todas armonizan.
//
// Una melodía se escribe por compases (|), cada uno dividido en tantos pasos como fichas tenga:
//   8        una nota (lugar en la escala);  8+10 varias a la vez
//   -        sigue la anterior;  .  silencio
//   después del número:  ' acento   , suave   s llega resbalando   v vibra   t trino   c cae   g apoyatura

import { azar } from './dsp.mjs';

export const BPM = 120;
export const BAR = 2; // segundos: 120 BPM, como las muestras
const STEPS = [0, 3, 5, 7, 10];
export const DEGREES = ['G', 'Bb', 'C', 'D', 'F'];
/** Los cinco modos chinos, según qué grado es el centro. */
export const MODES = { G: 'yu 羽', Bb: 'gong 宫', C: 'shang 商', D: 'jue 角', F: 'zhi 徵' };

const mod = (a, b) => ((a % b) + b) % b;
/** El lugar en la escala → nota MIDI. */
export const midi = (i) => 55 + STEPS[mod(i, 5)] + 12 * Math.floor(i / 5);
/** El lugar (0 a 4) de un grado por su nombre. */
export const degree = (name) => DEGREES.indexOf(name);

/** Lee una melodía: lista de notas { at, dur (en compases), i, v, orn }. */
export function read(text) {
  const notes = [];
  const bars = text.trim().split('|').map((bar) => bar.trim().split(/\s+/).filter(Boolean));
  let open = [];
  bars.forEach((tokens, b) => {
    tokens.forEach((token, s) => {
      const at = b + s / tokens.length;
      const dur = 1 / tokens.length;
      if (token === '-') {
        for (const o of open) o.dur += dur;
        return;
      }
      open = [];
      if (token === '.') return;
      const match = /^(-?\d+(?:\+-?\d+)*)([',svtcg]*)$/.exec(token);
      if (!match) throw new Error(`No se entiende «${token}» en «${text}»`);
      const marks = match[2];
      const v = marks.includes("'") ? 1 : marks.includes(',') ? 0.5 : 0.78;
      open = match[1].split('+').map((i) => ({ at, dur, i: Number(i), v, orn: marks.replace(/[',]/g, '') }));
      notes.push(...open);
    });
  });
  notes.bars = bars.length;
  return notes;
}

const keep = (from, notes) => Object.assign(notes, { bars: from.bars });

// --- Transformaciones ------------------------------------------------------------

/** Sube k lugares en la escala (5 = una octava). */
export const up = (notes, k) => keep(notes, notes.map((o) => ({ ...o, i: o.i + k })));
/** Más tarde, d compases. */
export const later = (notes, d) => keep(notes, notes.map((o) => ({ ...o, at: o.at + d })));
/** Más largo (aumentación) o más corto (disminución). */
export const stretch = (notes, k) => Object.assign(notes.map((o) => ({ ...o, at: o.at * k, dur: o.dur * k })), { bars: notes.bars * k });
/** Al espejo: lo que subía baja. */
export const mirror = (notes, axis) => keep(notes, notes.map((o) => ({ ...o, i: 2 * axis - o.i })));
/** Al revés. */
export const backwards = (notes) => keep(notes, notes.map((o) => ({ ...o, at: notes.bars - o.at - o.dur })).sort((a, b) => a.at - b.at));
/** Solo los compases de a a b (empieza en 0). */
export const cut = (notes, a, b) => Object.assign(notes.filter((o) => o.at >= a - 1e-6 && o.at < b - 1e-6).map((o) => ({ ...o, at: o.at - a, dur: Math.min(o.dur, b - o.at) })), { bars: b - a });
/** Una tras otra. */
export function chain(...parts) {
  let at = 0;
  const notes = [];
  for (const part of parts) {
    notes.push(...later(part, at));
    at += part.bars;
  }
  return Object.assign(notes, { bars: at });
}
export const rest = (bars) => Object.assign([], { bars });
export const times = (notes, count) => chain(...Array.from({ length: count }, () => notes));
/** Más fuerte o más suave. */
export const softer = (notes, k) => keep(notes, notes.map((o) => ({ ...o, v: Math.min(1, o.v * k) })));
/** Solo la voz de arriba (cuando hay varias a la vez). */
export const topLine = (notes) => keep(notes, notes.filter((o) => !notes.some((p) => p !== o && Math.abs(p.at - o.at) < 1e-6 && p.i > o.i)));
/** Con un adorno en cada nota (o en las que digan). */
export const ornament = (notes, orn, when = () => true) => keep(notes, notes.map((o, n) => (when(o, n) ? { ...o, orn: o.orn + orn } : o)));

// --- El tema ----------------------------------------------------------------------

/**
 * La melodía que comparten las tres muestras: 12 compases, en 6 pasos por compás (los tresillos de
 * chow-intro).
 */
export const THEME = [
  '8+10 - 10 - - -', "3 8 - - - -", "10 9 - 11 - -", '8 8 - - - 10',
  '- 10 - - 8 7', '. . 10 - 9 -', '. . . 8 6 -', '. 7 - 6 8 -',
  "11' 9 - 9 6 -", '. . 10 10 11 -', '. 8 - - 6 -', "8+10 - - - - -",
];
/** Los compases from a to del tema, en tresillos. */
export const theme = (from = 0, to = 12) => read(THEME.slice(from, to).join('|').replace(/^\s*-/, '10'));
/**
 * Lo mismo con el pulso de 16 pasos: cada tresillo cae en 3-3-2-3-3-2, el acento quebrado de la música
 * electrónica.
 */
const TRESILLO = [0, 3, 6, 8, 11, 14];
export function broken(notes) {
  const move = (at) => {
    const bar = Math.floor(at + 1e-6);
    const step = (at - bar) * 6;
    const low = Math.floor(step + 1e-6);
    const a = TRESILLO[low];
    const b = low < 5 ? TRESILLO[low + 1] : 16;
    return bar + (a + (b - a) * (step - low)) / 16;
  };
  return keep(notes, notes.map((o) => ({ ...o, at: move(o.at), dur: move(o.at + o.dur) - move(o.at) })));
}

// --- Acordes -----------------------------------------------------------------------

/** Acordes de la escala, por lugar. Los de cuartas (q) son los que suenan a sheng. */
export const CHORDS = {
  G: [0, 1, 3], G7: [0, 1, 3, 4], Gs: [0, 2, 3], Gq: [0, 2, 4], Bb: [1, 3, 4], Bb6: [1, 3, 5], Bbq: [1, 3, 5], Bb2: [1, 2, 4],
  C: [2, 4, 5], C7: [2, 4, 6], Cq: [2, 4, 6], Cm: [2, 5, 6], D: [3, 4, 6], Dq: [3, 5, 7], D7: [3, 4, 7], F: [4, 6, 7], F6: [4, 5, 7], Fq: [4, 6, 8],
  G5: [0, 3], C5: [2, 5], F5: [4, 7], Bb5: [1, 4],
};
export const chord = (name) => {
  if (!CHORDS[name]) throw new Error(`No hay acorde «${name}»`);
  return CHORDS[name];
};
/** Una progresión: 'G Bb:2 C' → [[acorde, compás, cuántos]]. */
export function progression(text) {
  let at = 0;
  return text.trim().split(/\s+/).map((token) => {
    const [name, length = '1'] = token.split(':');
    const item = { name, notes: chord(name), root: chord(name)[0], at, bars: Number(length) };
    at += item.bars;
    return item;
  });
}
export const lengthOf = (prog) => prog.reduce((sum, c) => sum + c.bars, 0);
/** El acorde que suena en el compás at. */
export function chordAt(prog, at) {
  const t = mod(at, lengthOf(prog));
  return prog.find((c) => t >= c.at - 1e-6 && t < c.at + c.bars - 1e-6) ?? prog[0];
}
/** El acorde acomodado alrededor de un lugar: las notas más cercanas, para que se muevan poco. */
export function voicing(notes, around, size = notes.length) {
  const out = [];
  for (let i = around; out.length < size && i < around + 14; i++) if (notes.some((c) => mod(c - i, 5) === 0)) out.push(i);
  return out;
}

// --- Contrapunto --------------------------------------------------------------------

/** Qué tan áspera suena una distancia en semitonos: 0 dulce, 1 disonante. */
const ROUGH = [0.35, 1, 0.8, 0, 0, 0.16, 1, 0.1, 0, 0, 0.5, 1];
export const roughness = (a, b) => ROUGH[mod(Math.abs(a - b), 12)];
const strong = (at) => {
  const beat = mod(at, 1) * 4;
  if (Math.abs(beat - Math.round(beat)) > 1e-3) return 0.35;
  return Math.round(beat) % 2 === 0 ? 1 : 0.7;
};
const sounding = (voice, at) => voice.filter((o) => o.at <= at + 1e-6 && o.at + o.dur > at + 1e-6);

/** Cuánto chocan dos voces: promedio de aspereza, pesando el tiempo y los tiempos fuertes. */
export function clash(a, b) {
  let cost = 0;
  let weight = 0;
  for (const x of a) {
    for (const y of b) {
      const start = Math.max(x.at, y.at);
      const end = Math.min(x.at + x.dur, y.at + y.dur);
      if (end - start < 0.03) continue;
      const w = (end - start) * (0.4 + strong(start));
      cost += roughness(midi(x.i), midi(y.i)) * w;
      weight += w;
    }
  }
  return weight ? cost / weight : 0;
}

/** Cuántas veces dos voces se mueven juntas a la misma quinta u octava (lo que el contrapunto evita). */
export function parallels(a, b) {
  const times = [...new Set([...a, ...b].map((o) => Math.round(o.at * 4800) / 4800))].sort((x, y) => x - y);
  let count = 0;
  let last = null;
  for (const at of times) {
    const x = sounding(a, at)[0];
    const y = sounding(b, at)[0];
    if (!x || !y) {
      last = null;
      continue;
    }
    const gap = mod(midi(x.i) - midi(y.i), 12);
    if (last && x.i !== last.x && y.i !== last.y && gap === last.gap && (gap === 0 || gap === 7) && Math.sign(x.i - last.x) === Math.sign(y.i - last.y)) count++;
    last = { x: x.i, y: y.i, gap };
  }
  return count;
}

/**
 * Canon: la misma melodía, delay compases después, en el lugar de la escala donde menos choca con la
 * primera (y con against). En los tiempos fuertes que aún chocan, la respuesta se mueve un lugar
 * (respuesta tonal). Se envuelve en length compases.
 */
export function canon(subject, { delay, shifts = [-3, -2, -5, -4, 2, 3], length = subject.bars, against = [], form = (x) => x }) {
  const lead = [...topLine(subject), ...against];
  const wrapped = (k) => form(topLine(subject)).map((o) => ({ ...o, i: o.i + k, at: mod(o.at + delay, length) })).sort((a, b) => a.at - b.at);
  const best = shifts.map((k, order) => ({ k, cost: clash(lead, wrapped(k)) + order * 0.012 + 0.04 * parallels(lead, wrapped(k)) })).sort((a, b) => a.cost - b.cost)[0];
  const answer = wrapped(best.k).map((o) => {
    if (strong(o.at) < 0.6) return o;
    const here = sounding(lead, o.at);
    const cost = (i) => here.reduce((sum, p) => sum + roughness(midi(p.i), midi(i)), 0);
    if (cost(o.i) < 0.7) return o;
    const [i] = [o.i - 1, o.i + 1].sort((x, y) => cost(x) - cost(y));
    return cost(i) < cost(o.i) ? { ...o, i } : o;
  });
  return Object.assign(answer.sort((a, b) => a.at - b.at), { bars: length, shift: best.k });
}

/**
 * Una voz nueva contra las que ya hay (against), con el ritmo que se pida (fichas como las de una
 * melodía, con x en vez de notas). Elige nota por nota lo que mejor suena: consonancia en los tiempos
 * fuertes, movimiento contrario, pasos chicos, sin quintas ni octavas paralelas, y repite los giros del
 * tema cuando puede (imitación). rough: cuánta aspereza se permite (0 a 1).
 */
export function counter(against, { rhythm, low, high, length = against.bars, seed = 1, rough = 0.2, prog = null, motif = [2, -1, 2, -3], v = 0.78, orn = '' }) {
  const rnd = azar(seed);
  const pattern = read(rhythm.replace(/[xX]/g, (c) => (c === 'X' ? "0'" : '0')));
  const slots = [];
  for (let at = 0; at < length; at += pattern.bars) for (const o of later(pattern, at)) if (o.at < length) slots.push(o);
  const lead = topLine(against);
  const leadAt = (at) => sounding(lead, at);
  let beam = [{ cost: 0, line: [] }];
  slots.forEach((slot, n) => {
    const here = against.filter((p) => p.at < slot.at + slot.dur - 0.02 && p.at + p.dur > slot.at + 0.02);
    const harmony = prog ? chordAt(prog, slot.at).notes : null;
    const next = [];
    for (const { cost, line } of beam) {
      const last = line.at(-1);
      const prev = line.at(-2);
      for (let i = low; i <= high; i++) {
        let c = cost;
        for (const p of here) {
          const start = Math.max(p.at, slot.at);
          const share = (Math.min(p.at + p.dur, slot.at + slot.dur) - start) / slot.dur;
          const bad = roughness(midi(p.i), midi(i));
          c += Math.max(0, bad - rough * 0.5) * share * (0.6 + 1.6 * strong(start));
          if (p.i === i) c += 0.3 * share; // unísono: se pierde la voz
        }
        if (harmony && !harmony.some((h) => mod(h - i, 5) === 0)) c += 0.28 * strong(slot.at);
        if (last !== undefined) {
          const leap = i - last;
          const size = Math.abs(leap);
          c += [0.34, 0, 0.12, 0.3, 0.55, 0.6, 1.1, 1.6][Math.min(7, size)];
          if (prev !== undefined) {
            const before = last - prev;
            if (Math.abs(before) >= 3 && Math.sign(leap) === Math.sign(before)) c += 0.5; // tras un salto, se regresa
            if (leap === 0 && before === 0) c += 0.5;
            const [m1, m2] = [line.length - 2, line.length - 1].map((k) => motif[mod(k, motif.length)]);
            if (before === m1 && leap === m2) c -= 0.15;
          }
          const a = leadAt(slots[n - 1].at)[0];
          const b = leadAt(slot.at)[0];
          if (a && b && a.i !== b.i && leap) {
            const same = Math.sign(b.i - a.i) === Math.sign(leap);
            c += same ? 0.12 : -0.14;
            const gap = mod(midi(b.i) - midi(i), 12);
            if (same && gap === mod(midi(a.i) - midi(last), 12) && (gap === 0 || gap === 7)) c += 2;
          }
        }
        const middle = (low + high) / 2;
        c += 0.05 * (Math.abs(i - middle) / Math.max(1, high - middle)) ** 2 + 0.06 * rnd();
        next.push({ cost: c, line: [...line, i] });
      }
    }
    next.sort((a, b) => a.cost - b.cost);
    // Los mejores, sin que todos terminen en la misma nota
    const seen = new Map();
    beam = next.filter(({ line }) => {
      const key = line.slice(-2).join();
      const used = seen.get(key) ?? 0;
      seen.set(key, used + 1);
      return used < 3;
    }).slice(0, 60);
  });
  const { line } = beam[0];
  return Object.assign(slots.map((slot, n) => ({ ...slot, i: line[n], v: slot.v * (v / 0.78), orn })), { bars: length });
}

// --- Figuras (bajos y arpegios) ------------------------------------------------------

const LETTERS = { b: -2, d: -1, r: 0, u: 1, t: 2, q: 3, c: 4, o: 5, n: 10 };

/**
 * Una figura que sigue los acordes. pattern: una letra por paso (compases con |):
 *   0-9  esa nota del acorde, acomodado desde around    r o d u t q c b n  la raíz, su octava, o los vecinos
 *   MAYÚSCULA acento    - sigue    . silencio    ~ después: llega resbalando (808)
 */
export function figure(prog, pattern, { around = 0, octave = 0, size = 8, bars = lengthOf(prog), v = 0.78, from = 0 } = {}) {
  const cells = pattern.split('|').map((cell) => cell.replace(/\s/g, ''));
  const notes = [];
  let open = null;
  for (let b = from; b < from + bars; b++) {
    const cell = cells[mod(b - from, cells.length)];
    const slides = [...cell].filter((c) => c === '~').length;
    const steps = cell.length - slides;
    let s = 0;
    for (const c of cell) {
      if (c === '~') {
        if (open) open.orn = 's';
        continue;
      }
      const at = b - from + s / steps;
      const dur = 1 / steps;
      s++;
      if (c === '-') {
        if (open) open.dur += dur;
        continue;
      }
      open = null;
      if (c === '.') continue;
      const h = chordAt(prog, b + s / steps - 1e-3);
      const low = c.toLowerCase();
      const i = /\d/.test(c) ? voicing(h.notes, around, size)[Number(c)] : h.root + 5 * octave + LETTERS[low];
      if (i === undefined || Number.isNaN(i)) throw new Error(`No se entiende «${c}» en «${pattern}»`);
      open = { at, dur, i, v: c !== low ? Math.min(1, v * 1.28) : v, orn: '' };
      notes.push(open);
    }
  }
  // Para resbalar hace falta saber de dónde se viene
  notes.forEach((o, n) => { if (o.orn === 's' && n) o.fromI = notes[n - 1].i; });
  return Object.assign(notes, { bars });
}

/** Los acordes tocados de una vez. rhythm: fichas x - . por compás; inversions: alrededor de qué lugar. */
export function chords(prog, rhythm = 'x', { around = 3, size = 3, bars = lengthOf(prog), v = 0.75 } = {}) {
  const pattern = read(rhythm.replace(/[xX]/g, (c) => (c === 'X' ? "0'" : '0')));
  const notes = [];
  for (let at = 0; at < bars; at += pattern.bars) {
    for (const o of later(pattern, at)) {
      if (o.at >= bars - 1e-6) continue;
      // Un acorde largo se parte donde cambia la armonía
      let start = o.at;
      const end = Math.min(bars, o.at + o.dur);
      while (start < end - 1e-6) {
        const c = chordAt(prog, start);
        const turn = Math.floor(start / lengthOf(prog) + 1e-9) * lengthOf(prog) + c.at + c.bars;
        const stop = Math.min(end, turn);
        for (const i of voicing(c.notes, around, size)) notes.push({ at: start, dur: stop - start, i, v: v * (o.v / 0.78), orn: '' });
        start = stop;
      }
    }
  }
  return Object.assign(notes, { bars });
}
