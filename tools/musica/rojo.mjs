// La primera banda sonora: «Rojo», sobre los samples del juego (assets/audio/samples). Cinco canciones, de menor a
// mayor intensidad, y la variación del menú para la pantalla del trago:
//
//   1. La puerta    el menú: chow-intro            Brindis  su variación, con el trago
//   2. Farol        mundos 1 a 4
//   3. Mercado      mundos 5 a 8: chow-medio
//   4. Umbral       mundos 9 a 11
//   5. El rival     la pelea: chow-intro-hard
//
// Electrónica oscura de los ochenta con raíz china: bajos de secuenciador secos y saturados, pocos elementos y mucho
// espacio, golpes de metal, coros y melodías frías, y tambores chinos que cuentan 3, 5 o 7 contra 4 (poly). Guzheng,
// erhu, pipa, dizi y suona llevan el canto. Todo en sol menor pentatónica y a 120 BPM, como los samples: las que no
// los usan están afinadas en otro de sus grados. Cada sample son 12 compases (11 y su eco); una canción son tres
// vueltas: casi sola, completa, y una parte que respira y vuelve a subir.

import { Pista } from './mezcla.mjs';
import { broken, canon, chain, chords, counter, cut, figure, mirror, progression, read, stretch, theme, times, up } from './partitura.mjs';

const note = (i, bars, v = 0.9) => Object.assign([{ at: 0, dur: bars, i, v, orn: '' }], { bars });
/** Una subida que termina justo en el compás at. */
export const rise = (p, at, bars = 2, gain = 0) => p.play('subida', note(0, bars), { from: at - bars, gain }).hit('alReves', at, 0.7);
export const boom = (p, at, i = -10, gain = 0) => p.play('impacto', note(i, 1), { from: at, gain });
/** Solo lo que suena del compás a al b. */
export const within = (notes, a, b = Infinity) => Object.assign(notes.filter((o) => o.at >= a - 1e-6 && o.at < b - 1e-6), { bars: notes.bars });
/** Cuánto suena en cada parte: steps = [[desde qué compás, volumen]...]. */
export const levels = (...steps) => (b) => steps.reduce((v, [from, level]) => (b >= from ? level : v), 0);
/** Un relleno de toms de un compás, que cae en el compás at. */
export const fill = (p, at) => p.beat({ tomAlto: '....x.x.........', tomMedio: '........x.xx....', tomBajo: '............xxxx' }, { from: at - 1, to: at, vol: 0.9 });

/**
 * Tambores que cuentan distinto que el compás: { golpe: cuántos por compás } repartidos parejo (3 contra 4, 5 contra
 * 4...). first: el primero de cada compás más fuerte.
 */
export const poly = (p, counts, { from = 0, to = p.bars, vol = 0.6 } = {}) => {
  for (const [name, n] of Object.entries(counts)) p.beat({ [name]: `X${'x'.repeat(n - 1)}` }, { from, to, vol });
  return p;
};

/** Las tres vueltas de un sample de 12 compases, con su eco encima de la siguiente. */
const thrice = [0, 12, 24].map((at) => ({ at, bars: 12, tail: 3 }));

/** La armonía que aguanta el tema de los samples (12 compases). */
const HOME = 'G:2 Bb G C F G Bb G:2 Bb G';

/** 1. El menú: chow-intro, que se va llenando. Tresillos. 36 compases. */
function menu() {
  const p = new Pista({ id: 'rojo-menu', title: 'La puerta', center: 'G', feel: 'chow-intro, con bajo, cuerdas y una voz que le contesta', bars: 36, seed: 301, level: -18.6, room: { seconds: 2.6, damp: 4400 }, echo: { time: 1 / 3, feedback: 0.42, tone: 2400 } });
  const prog = progression(HOME);
  const melody = theme();
  p.sample('chow-intro', thrice, { level: -16.5, cut: (b) => (b < 24 ? 16000 : b < 32 ? 900 + 160 * (b - 24) ** 1.6 : 900 + 3770 * (b - 32)) });
  p.play('cuerdas', chords(prog, 'x', { around: 0, size: 3 }), { times: 3, vol: levels([0, 0], [4, 0.6], [12, 1]) });
  p.play('bajoNegro', figure(prog, 'R--......r-.|R--...r--.q-', { octave: -2, sink: true, v: 0.6 }), { times: 3, gain: -2.5, vol: levels([0, 0], [8, 0.8], [12, 1], [24, 0.7], [28, 1]) });
  p.play('cristal', figure(prog, '0..2..1..3..|2..1..3..0..', { around: 10 }), { from: 24, gain: -3 });
  p.play('erhu', within(counter(melody, { rhythm: 'x - - - - - | - - - x - - | x - - - - - | x - - x - -', low: -1, high: 6, seed: 12, prog, rough: 0.1 }), 2), { from: 12, gain: -1.5, as: 'contracanto' });
  p.play('vozSinte', counter(melody, { rhythm: '. . x - - - | x - - - - -', low: 5, high: 11, seed: 19, prog, rough: 0.1 }), { from: 24, gain: -2, as: 'contracanto', vol: levels([0, 0], [28, 1]) });
  p.voices.tema = [0, 12, 24].flatMap((at) => melody.map((o) => ({ ...o, at: o.at + at })));
  p.beat({ hatFino: '3.....2.....', tuboRe: '......2.....|............' }, { from: 12, to: 24 });
  p.beat({ tarolaLinn: '......5.....' }, { from: 16, to: 24, vol: 0.8 });
  p.beat({ hatFino: '3..2..3..2..', tarolaLinn: '......5.....' }, { from: 32, to: 36, vol: 0.9 });
  p.hit('tamtam', 24, 0.4).hit('alReves', 12, 0.4).hit('alReves', 36, 0.4);
  return p;
}

/** La variación del menú, con el trago: solo las cuerdas pulsadas de chow-intro, campanas y el tema despacio. */
function brindis() {
  const p = new Pista({ id: 'rojo-brindis', title: 'Brindis', center: 'Bb', feel: 'chow-intro sin golpes; el tema al doble de largo', bars: 24, seed: 302, level: -19, room: { seconds: 3.4, damp: 5200 }, echo: { time: 1 / 3, feedback: 0.5, tone: 3000 } });
  const prog = progression('Bb:2 G F C G Bb F G:2 C Bb');
  p.sample('chow-intro', [0, 12].map((at) => ({ at, bars: 12, tail: 3 })), { level: -18, hp: 420, rev: 0.25, eco: 0.2 });
  p.play('cuerdas', chords(prog, 'x', { around: 1, size: 4 }), { times: 2, gain: 1.5 });
  p.play('colchon', chords(prog, 'x', { around: -4, size: 2 }), { times: 2 });
  const slow = stretch(cut(theme(), 0, 6), 2);
  p.play('erhu', slow, { from: 12, gain: 0, as: 'tema' });
  p.play('bianzhong', canon(theme(), { delay: 1, shifts: [0, 2, -2, 3], length: 12 }), { from: 0, gain: -2, as: 'campanas' });
  p.play('bianzhong', counter(slow, { rhythm: '. . . x - - | . . x - - -', low: 5, high: 12, seed: 23, prog }), { from: 12, gain: -2, as: 'campanas' });
  p.play('cristal', figure(prog, '0.2.1.3.2.1.', { around: 10 }), { times: 2, gain: -4, eco: 0.5 });
  p.play('bajo808', figure(prog, 'R-----------', { octave: -1, sink: true }), { times: 2, gain: -3 });
  p.voices.tema = [...theme(), ...p.voices.tema];
  p.hit('tamtam', 0, 0.3).hit('alReves', 12, 0.3);
  return p;
}

/** 2. Mundos 1 a 4. Re. Un farol en la calle mojada: secuenciador y guzheng. 36 compases. */
function farol() {
  const p = new Pista({ id: 'rojo-farol', title: 'Farol', center: 'D', feel: 'bajo de secuenciador y guzheng; canon a dos compases', bars: 36, seed: 303, level: -17.9, room: { seconds: 1.9 } });
  const verse = progression('Dq:4 F:2 C:2 Dq:2 F C');
  const lift = progression('G:2 F:2 C:2 Dq:2 G F Dq:2');
  const prog = progression('Dq:4 F:2 C:2 Dq:2 F C G:2 F:2 C:2 Dq:2 G F Dq:2 Dq:4 F:2 C:2 Dq:2 F C');
  const hook = read('8 - - 10 - - 9 - 8 - - - 6 - - - | 7 - - - 6 - 5 - - - - - . . . . | 8 - - 10 - - 11 - 10 - - - 9 - 8 - | 9 - - - 7 - 8 - - - - - . . . . | 6 - - 8 - - 7 - 6 - - - 5 - - - | 4 - - - 5 - 6 - - - - - . . . . | 7 - - 9 - - 10 - 9 - - - 7 - 6 - | 7 - - - 5 - 6 - - - - - . . . . | 8 - - 10 - - 9 - 8 - - - 6 - - - | 7 - - - 6 - 5 - - - - - . . . . | 9 - - 10 - - 11 - 10 - - - 9 - 7 - | 8 - - - - - - - . . . . . . . .');
  const chorus = read('11 - - - - - 10 - 8 - - - 10 - - - | 8 - - - - - 6 - 8 - - - - - . . | 9 - - - - - 10 - 12 - - - 10 - - - | 9 - - - 7 - - - 9 - - - - - . . | 10 - - - - - 9 - 7 - - - 9 - - - | 12 - - - 10 - 9 - 7 - - - - - . . | 8 - - - - - 10 - 11 - - - 13 - - - | 10 - - - 8 - 10 - - - - - - - . . | 11 - - - 10 - 8 - 10 - - - - - - - | 9 - - - 10 - 12 - 9 - - - - - - - | 8 - - - - - 7 - 6 - - - 7 - - - | 8 - - - - - - - - - - - . . . .');
  p.play('guzheng', chain(hook, Object.assign([], { bars: 12 }), hook), { as: 'melodía' });
  p.play('vozSinte', chorus, { from: 12, as: 'melodía' });
  p.play('bajoSec', figure(prog, 'R..r..R.....r.u.|R..r..R...q.u.d.', { octave: -2, sink: true, v: 0.7 }), { gain: 1, vol: levels([0, 1], [24, 0.35], [28, 1]) });
  p.play('pulso', figure(prog, '0...2...1...3...', { around: 10 }), { gain: -2, vol: levels([0, 0], [8, 1], [24, 0.5]) });
  p.play('cuerdas', chords(prog, 'x', { around: 2, size: 3 }), { vol: levels([0, 0], [4, 0.6], [12, 1], [24, 0.8]) });
  p.play('erhu', counter(chorus, { rhythm: 'x - - - - - - - | x - - - x - - -', low: -1, high: 6, seed: 31, prog: lift }), { from: 12, gain: -1.5, as: 'contracanto' });
  p.play('dizi', canon(hook, { delay: 2, shifts: [0, 2, -2, 3], length: 12 }), { from: 24, gain: -2, as: 'canon', vol: levels([0, 0], [28, 1]) });
  p.play('pluma', figure(verse, '0.1.2.1.3.2.1.2.', { around: 3 }), { from: 24, gain: -3, cut: (b) => 500 + 260 * Math.max(0, b - 24) });
  p.beat({ bomboLinn: 'X.......X.x.....', hat: '4.3.4.3.4.3.4.3.' }, { to: 24 });
  p.beat({ tarolaLinn: '....7.......7...' }, { from: 4, to: 24 });
  p.beat({ tuboRe: '......3.........|............3...' }, { from: 8, to: 36 });
  poly(p, { tangguRe: 3 }, { from: 12, to: 24, vol: 0.5 });
  p.beat({ bomboLinn: 'X.......X.......', hatFino: '..3...3...3...3.' }, { from: 24, to: 28 });
  poly(p, { muyu: 5, tangguRe: 3 }, { from: 24, to: 36, vol: 0.45 });
  p.beat({ bomboLinn: 'X.......X.x.....', tarolaLinn: '....7.......7...', hat: '4.3.4.3.4.3.4.3.' }, { from: 28, to: 36 });
  fill(p, 12);
  fill(p, 24);
  fill(p, 36);
  p.hit('crash', 12, 0.5).hit('crash', 28, 0.5).hit('tamtam', 24, 0.4).hit('alReves', 12, 0.5);
  rise(p, 28, 2, -4);
  return p;
}

/** 3. Mundos 5 a 8. El mercado: chow-medio con un bajo negro y, en la segunda vuelta, el erhu. 36 compases. */
function mercado() {
  const p = new Pista({ id: 'rojo-mercado', title: 'Mercado', center: 'G', feel: 'chow-medio, completo; contracanto del erhu', bars: 36, seed: 304, level: -16.9, room: { seconds: 1.7 } });
  const prog = progression(HOME);
  const melody = broken(theme());
  p.sample('chow-medio-1', thrice, { level: -15, cut: (b) => (b < 24 ? 18000 : b < 28 ? 700 + 120 * (b - 24) ** 2 : 18000) });
  p.pump('.....x.x..x...x.', { to: 36 }); // el bombo del sample
  p.play('bajoNegro', figure(prog, 'R--.....R-.r....|R--.....R-.r..u.', { octave: -2, sink: true, v: 0.75 }), { times: 3, gain: -1, vol: levels([0, 0.8], [12, 1], [24, 0], [26, 0.8], [28, 1]) });
  p.play('cuerdas', chords(prog, 'x', { around: 0, size: 3 }), { times: 3, vol: levels([0, 0], [4, 0.7], [12, 1]) });
  p.play('erhu', counter(melody, { rhythm: 'x - - - - - x - | x - - - x - - - | x - - - - - - - | x - - - x - x -', low: -1, high: 6, seed: 41, prog }), { from: 12, gain: -0.5, as: 'contracanto' });
  p.play('vozSinte', counter(melody, { rhythm: 'x - - - x - - - | x - - - - - - - ', low: 5, high: 11, seed: 43, prog, rough: 0.1 }), { from: 24, gain: -1, as: 'contracanto', vol: levels([0, 0], [28, 1]) });
  p.play('pluma', figure(prog, '0.2.1.3.0.2.1.3.', { around: 5 }), { from: 24, gain: -2, cut: (b) => 600 + 300 * Math.max(0, b - 24) });
  p.voices.tema = [0, 12, 24].flatMap((at) => melody.map((o) => ({ ...o, at: o.at + at })));
  p.beat({ aplauso: '....5.......5...', tuboSol: '..........3.....', cadena: '................|..............4.' }, { from: 12, to: 24 });
  poly(p, { tangguRe: 3 }, { from: 8, to: 36, vol: 0.55 });
  poly(p, { paiguFa: 5 }, { from: 16, to: 24, vol: 0.4 });
  p.beat({ bomboLinn: 'x...x...x...x...' }, { from: 18, to: 24, vol: 0.75 });
  poly(p, { tangguSol: 5 }, { from: 24, to: 28, vol: 0.5 });
  p.beat({ bomboLinn: 'x...x...x...x...', tarolaLinn: '....6.......6...', tuboSol: '..........4.....' }, { from: 28, to: 36, vol: 0.9 });
  poly(p, { paiguFa: 5 }, { from: 28, to: 36, vol: 0.45 });
  fill(p, 12);
  fill(p, 28);
  fill(p, 36);
  p.hit('crash', 12, 0.6).hit('crash', 28, 0.7).hit('xiaoluo', 24, 0.4).hit('alReves', 12, 0.6);
  rise(p, 28, 2, -2);
  return p;
}

/** 4. Mundos 9 a 11. Fa. El umbral: un bajo negro y casi nada más, bombo a cuatro, la suona y el guzheng. 36 compases. */
function umbral() {
  const p = new Pista({ id: 'rojo-umbral', title: 'Umbral', center: 'F', feel: 'electrónica oscura; canon a medio compás', bars: 36, seed: 305, level: -15.7, drive: 0.18, room: { seconds: 1.6 } });
  const prog = progression('F:2 Bb C F:2 G C F:2 G C Bb:2 C:2 G:2 F:2 C:2 G C F:4 Dq:4 C:2 G C');
  const hook = read("9' - - 7 - - 9 - 10 - - 9 - - 7 - | 12' - - 10 - - 9 - 7 - - - - - . . | 9' - - 7 - - 9 - 10 - - 12 - - 10 - | 9 - - 10 - - 7 - 9 - - - - - . . | 9' - - 7 - - 9 - 10 - - 9 - - 7 - | 12' - - 10 - - 9 - 10 - - - - - . . | 14' - - 12 - - 10 - 12 - - 10 - - 9 - | 10 - - 9 - - 7 - 9 - - - - - . . | 9' - - 7 - - 9 - 10 - - 9 - - 7 - | 12' - - 10 - - 9 - 7 - - - - - . . | 10 - - 9 - - 10 - 12 - - 10 - - 12 - | 9 - - - - - - - . . . . . . . .");
  const second = broken(up(theme(0, 12), -1));
  p.play('guzheng', hook, { as: 'melodía' });
  p.play('suona', second, { from: 12, gain: -0.5, as: 'melodía' });
  p.play('guzheng', canon(second, { delay: 0.5, shifts: [-5, -3, -2, 2], length: 12 }), { from: 12, as: 'canon', gain: -1 });
  p.play('erhu', stretch(cut(hook, 0, 6), 2), { from: 24, as: 'melodía' });
  p.play('pipa', canon(stretch(cut(hook, 0, 6), 2), { delay: 0, shifts: [-3, -2, 2], length: 12, form: () => hook }), { from: 24, as: 'canon', gain: -1, vol: levels([0, 0], [28, 1]) });
  p.play('bajoNegro', figure(prog, 'R--R..R--.R.u-d-|R--R..R--.R.q-~o-', { octave: -2, sink: true, v: 0.78 }), { gain: 1 });
  p.play('cuerdas', chords(prog, 'x', { around: 2, size: 4 }), { gain: 0.5 });
  p.play('estocada', chords(prog, 'X . . . . . . . . . x . . . . .', { around: 4, size: 3 }), { gain: -2, vol: levels([0, 0], [12, 1], [24, 0], [28, 1]) });
  p.play('coro', chords(prog, 'x', { around: -1, size: 3 }), { gain: 0, vol: levels([0, 0], [12, 0.7], [24, 1]) });
  p.beat({ bomboDuro: 'X...X...X...X...', tarolaLinn: '....X.......X...', hat: '5.4.5.4.5.4.5.4.', hatAbierto: '..4...4...4...4.' }, { to: 24 });
  p.beat({ yunque: '..........4.....', tuboRe: '......3.........|..............3.', aplauso: '....6.......6...' }, { from: 8, to: 24 });
  poly(p, { tangguRe: 3 }, { from: 4, to: 36, vol: 0.6 });
  poly(p, { paiguSol: 5 }, { from: 12, to: 24, vol: 0.5 });
  p.beat({ bomboDuro: 'X.......X.......', hatFino: '3.3.3.3.3.3.3.3.' }, { from: 24, to: 28 });
  poly(p, { tangguSol: 6, bangu: 5 }, { from: 24, to: 28, vol: 0.55 });
  p.beat({ bomboDuro: 'X...X...X...X...', tarolaLinn: '....X.......X...', hat: '5454545454545454', hatAbierto: '..5...5...5...5.', aplauso: '....x.......x...', yunque: '..........5.....' }, { from: 28, to: 36 });
  poly(p, { tangguSol: 6, paiguSol: 5 }, { from: 28, to: 36, vol: 0.55 });
  fill(p, 12);
  fill(p, 24);
  fill(p, 28);
  fill(p, 36);
  p.hit('crash', 0, 0.6).hit('crash', 12, 0.8).hit('crash', 28, 0.9).hit('daluo', 24, 0.5).hit('alReves', 12, 0.7);
  boom(p, 28, -11, -2);
  rise(p, 12, 2, -2);
  rise(p, 28, 4, 0);
  return p;
}

/** 5. La pelea: chow-intro-hard, con secuenciador, coro, cuerdas, erhu y suona. 36 compases. */
function rival() {
  const p = new Pista({ id: 'rojo-rival', title: 'El rival', center: 'G', feel: 'chow-intro-hard, completa; stretto', bars: 36, seed: 306, level: -14.3, drive: 0.25, room: { seconds: 1.7 } });
  const prog = progression(HOME);
  const melody = broken(theme());
  p.sample('chow-intro-hard', [{ at: 0, bars: 12, tail: 2 }, { at: 12, bars: 12, tail: 1 }, { at: 24, bars: 4 }, { at: 28, from: 4, bars: 8, tail: 1 }], { level: -13.5, hp: 24, cut: (b) => (b >= 24 && b < 28 ? 500 + 130 * (b - 24) ** 2.4 : 18000) });
  p.pump('.....x..x.x..x..', { to: 36 }); // el 808 del sample
  p.play('bajoNegro', figure(prog, '....R-.r....R-u-|....R-.r..R-d-u-', { octave: -1, v: 0.8 }), { times: 3, gain: -1, hp: 100, vol: levels([0, 0.7], [12, 1], [24, 0.6], [28, 1]) });
  p.play('cuerdas', chords(prog, 'x', { around: 0, size: 4 }), { times: 3, gain: 1, vol: levels([0, 0.6], [12, 1]) });
  p.play('coro', chords(prog, 'x', { around: 0, size: 3 }), { times: 3, gain: 2, vol: levels([0, 0.5], [8, 1]) });
  p.play('estocada', chords(prog, 'X . . . . . . . . . . . . . . . | . . . . . . X . . . . . . . x .', { around: 3, size: 4 }), { times: 3, gain: -1, vol: levels([0, 0], [12, 1], [24, 0], [28, 1]) });
  p.play('erhu', counter(melody, { rhythm: 'x - - - - - x - | x - - - x - - - | x - - - - - - - | x - x - x - - -', low: 0, high: 7, seed: 61, prog, rough: 0.2 }), { from: 12, gain: 0.5, as: 'contracanto' });
  p.play('pipa', canon(melody, { delay: 0.25, shifts: [-3, -2, 2, -5], length: 12 }), { from: 12, gain: -1, as: 'stretto' });
  p.play('suona', stretch(mirror(cut(melody, 0, 4), 7), 2), { from: 28, gain: 0, as: 'espejo' });
  p.play('pipa', canon(melody, { delay: 0.25, shifts: [-3, -2, 2, -5], length: 12 }), { from: 24, gain: -0.5, as: 'stretto', vol: levels([0, 0], [28, 1]) });
  p.voices.tema = [0, 12, 24].flatMap((at) => melody.map((o) => ({ ...o, at: o.at + at })));
  p.beat({ tuboRe: '......3.........|..............3.' }, { from: 0, to: 24 });
  poly(p, { tangguRe: 3 }, { from: 0, to: 24, vol: 0.6 });
  p.beat({ tarolaLinn: '....6.......6...', yunque: '..........4.....', cadena: '................|..............5.' }, { from: 12, to: 24 });
  poly(p, { tangguSol: 5, paiguFa: 6 }, { from: 12, to: 24, vol: 0.5 });
  p.beat({ latido: 'X.....x.........', tangguRe: '4..4..4.4..4..4.|4..4..4.5.5.5.5.|5..5..5.5..5..5.|5.5.6.6.77889999' }, { from: 24, to: 28 });
  p.beat({ bomboDuro: 'X...X...X...X...', tarolaLinn: '....X.......X...', hatAbierto: '..5...5...5...5.', yunque: '..........5.....', bo: '4.......4.......' }, { from: 28, to: 36 });
  poly(p, { tangguRe: 3, tangguSol: 5, paiguFa: 7 }, { from: 28, to: 36, vol: 0.55 });
  fill(p, 12);
  fill(p, 24);
  fill(p, 36);
  for (const at of [0, 12, 28]) p.hit('crash', at, 0.9).hit('daluo', at, 0.7);
  for (const at of [6, 18, 32]) p.hit('crash', at, 0.5).hit('xiaoluo', at - 0.25, 0.6);
  p.hit('tamtam', 24, 0.8).hit('alReves', 12, 0.8).hit('alReves', 36, 0.9);
  boom(p, 0, -10, 0);
  boom(p, 28, -10, 0);
  rise(p, 12, 2, 0);
  rise(p, 28, 4, 1);
  return p;
}

export const ROJO = { name: 'Rojo', menu, brindis, worlds: [farol, mercado, umbral], rival };
