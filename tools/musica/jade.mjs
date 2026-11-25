// La segunda banda sonora: «Jade», la que suena en una de cada tres partidas. Otras cinco canciones con el mismo
// viaje (de menor a mayor intensidad) y la misma idea: electrónica oscura de los ochenta con raíz china y tambores polirrítmicos. Sin los samples, pero en su
// escala y a su paso; la pelea sigue el estilo de chow-intro-hard. Su tema es otro: TEMA, con centro en re.
//
//   1. La puerta, de noche  el menú       Brindis de jade  su variación, con el trago
//   2. Lluvia de neón       mundos 1 a 4
//   3. Espejos              mundos 5 a 8
//   4. Cinabrio             mundos 9 a 11
//   5. Eclipse              la pelea

import { Pista } from './mezcla.mjs';
import { canon, chain, chords, counter, cut, figure, mirror, progression, read, stretch, up } from './partitura.mjs';
import { boom, fill, levels, poly, rise, within } from './rojo.mjs';

const quiet = (bars) => Object.assign([], { bars });

/** El tema de «Jade», 12 compases. */
const TEMA = read('8 - - - - - - - 10 - - - 9 - - - | 7 - - - - - - - - - - - 6 - - - | 9 - - - - - 10 - 12 - - - 10 - - - | 9 - - - 7 - - - - - - - . . . . | 7 - - - - - 9 - 10 - - - 9 - 7 - | 6 - - - 7 - - - 9 - - - - - - - | 10 - - - - - - - 11 - - - 10 - - - | 8 - - - - - 6 - 5 - - - - - . . | 6 - - - - - 8 - 9 - - - 8 - 6 - | 7 - - - 9 - - - 7 - - - - - . . | 8 - - - - - 7 - 6 - - - 5 - - - | 8 - - - - - - - - - - - . . . .');
const DUSK = 'Dq:2 F:2 C:2 G:2 Bb F Dq:2';

/** 1. El menú. Re. Caja de ritmos lenta, secuencia y el erhu con el tema. 36 compases. */
function menu() {
  const p = new Pista({ id: 'jade-menu', title: 'La puerta, de noche', center: 'D', feel: 'secuencia y erhu; canon de campanas', bars: 36, seed: 401, level: -18.6, room: { seconds: 2.8, damp: 4600 }, echo: { time: 0.375, feedback: 0.46, tone: 2400 } });
  const prog = progression(DUSK);
  p.play('erhu', TEMA, { from: 12, as: 'tema' });
  p.play('yangqin', TEMA, { from: 24, gain: 1.5, as: 'tema', eco: 0.25 });
  p.play('bianzhong', canon(TEMA, { delay: 1, shifts: [0, 2, -2, 3], length: 12 }), { from: 12, gain: -2, as: 'canon' });
  p.play('xiao', counter(TEMA, { rhythm: 'x - - - - - - - | x - - - x - - -', low: -1, high: 5, seed: 71, prog, rough: 0.1 }), { from: 24, gain: 0, as: 'contracanto' });
  p.play('pluma', figure(prog, '0.2.1.3.2.1.3.1.', { around: 3 }), { times: 3, gain: -2, cut: (b) => 420 + 900 * (0.5 - 0.5 * Math.cos((Math.PI * 2 * b) / 12)) });
  p.play('cuerdas', chords(prog, 'x', { around: 1, size: 3 }), { times: 3, vol: levels([0, 0.6], [12, 1]) });
  p.play('bajoNegro', figure(prog, 'R--.......r-..u.', { octave: -2, sink: true, v: 0.6 }), { times: 3, gain: -2, vol: levels([0, 0], [4, 0.8], [12, 1]) });
  p.play('cristal', figure(prog, '2-----1---3-----|1-----2---0-----', { around: 10 }), { times: 3, gain: 0.5 });
  p.beat({ bomboHondo: 'x.........x.....', hatFino: '..4...4...4...4.', maraca: '4.3.4.3.4.3.4.3.' }, { from: 4, to: 34, vol: 0.85 });
  p.beat({ tarolaLinn: '........5.......', tuboRe: '..............3.|................' }, { from: 12, to: 34, vol: 0.8 });
  poly(p, { muyu: 3 }, { from: 12, to: 34, vol: 0.4 });
  p.hit('tamtam', 0, 0.4).hit('tamtam', 24, 0.3).hit('alReves', 12, 0.4).hit('alReves', 36, 0.4);
  return p;
}

/** La variación del menú, con el trago: el tema en campanas, sin batería. */
function brindis() {
  const p = new Pista({ id: 'jade-brindis', title: 'Brindis de jade', center: 'F', feel: 'el tema en campanas, sin batería', bars: 24, seed: 402, level: -19, room: { seconds: 3.6, damp: 5400 }, echo: { time: 0.375, feedback: 0.52, tone: 3200 } });
  const prog = progression('F:2 C:2 G:2 F:2 Bb C F:2');
  const song = up(TEMA, 1);
  p.play('bianzhong', song, { gain: 2, as: 'tema' });
  p.play('guzheng', canon(song, { delay: 2, shifts: [-5, -3, -2], length: 12 }), { gain: -1.5, as: 'canon' });
  p.play('erhu', song, { from: 12, as: 'tema' });
  p.play('cristal', counter(song, { rhythm: '. . . . x - - - | . . x - - - - -', low: 6, high: 13, seed: 73, prog }), { from: 12, gain: -2, as: 'canon' });
  p.play('cuerdas', chords(prog, 'x', { around: 1, size: 4 }), { times: 2, gain: 1.5 });
  p.play('colchon', chords(prog, 'x', { around: -4, size: 2 }), { times: 2 });
  p.play('pluma', figure(prog, '0.2.1.3.2.1.3.1.', { around: 5 }), { times: 2, gain: -4, cut: (b) => 600 + 500 * (0.5 - 0.5 * Math.cos((Math.PI * 2 * b) / 12)) });
  p.play('bajo808', figure(prog, 'R---------------', { octave: -1, sink: true }), { times: 2, gain: -3 });
  p.hit('tamtam', 0, 0.3).hit('alReves', 12, 0.3);
  return p;
}

/** 2. Mundos 1 a 4. Do. Lluvia de neón: synth-pop contenido, con la dizi. 36 compases. */
function lluvia() {
  const p = new Pista({ id: 'jade-lluvia', title: 'Lluvia de neón', center: 'C', feel: 'synth-pop oscuro; dos voces libres', bars: 36, seed: 403, level: -17.9, room: { seconds: 2 } });
  const prog = progression('C:4 G:2 F:2 C:2 Bb F G:2 F:2 C:2 Bb:2 F:2 G F C:4 G:2 F:2 C:2 Bb F');
  const verse = progression('C:4 G:2 F:2 C:2 Bb F');
  const hook = read('7 - - - 9 - - - 10 - - - - - 9 - | 7 - - - - - - - . . 6 - 7 - - - | 9 - - - 10 - - - 12 - - - - - 10 - | 9 - - - - - 7 - - - - - . . . . | 10 - - - 8 - - - 6 - - - - - 8 - | 10 - - - - - - - . . 11 - 10 - - - | 9 - - - 7 - - - 9 - - - - - 10 - | 12 - - - - - 9 - - - - - . . . . | 7 - - - 9 - - - 10 - - - - - 9 - | 7 - - - - - - - . . 6 - 7 - - - | 8 - - - 9 - - - 11 - - - 9 - - - | 7 - - - - - - - . . . . . . . .');
  const chorus = read('10 - - - - - 11 - 13 - - - 11 - - - | 10 - - - 8 - - - 10 - - - - - . . | 12 - - - - - 10 - 9 - - - 10 - - - | 9 - - - 7 - - - 9 - - - - - . . | 10 - - - - - 9 - 7 - - - 9 - - - | 10 - - - 12 - - - 10 - - - - - . . | 11 - - - - - 9 - 8 - - - 9 - - - | 11 - - - - - 13 - 11 - - - - - . . | 12 - - - - - 10 - 9 - - - 7 - - - | 9 - - - 10 - - - 12 - - - - - . . | 11 - - - 10 - - - 8 - - - 10 - - - | 9 - - - - - - - 7 - - - - - . .');
  p.play('dizi', chain(hook, quiet(12), hook), { as: 'melodía' });
  p.play('vozSinte', chorus, { from: 12, as: 'melodía' });
  p.play('guzheng', counter(chorus, { rhythm: '. . x - . . x - | . . x - x - - -', low: 2, high: 9, seed: 81, prog: progression('G:2 F:2 C:2 Bb:2 F:2 G F') }), { from: 12, gain: -1.5, as: 'contracanto' });
  p.play('xiao', counter(hook, { rhythm: 'x - - - - - - - | - - - - x - - -', low: -1, high: 5, seed: 83, prog: verse }), { from: 24, as: 'contracanto', vol: levels([0, 0], [28, 1]) });
  p.play('bajoSec', figure(prog, 'R...r...R...r.u.', { octave: -2, sink: true, v: 0.66 }), { vol: levels([0, 1], [24, 0.4], [28, 1]) });
  p.play('pluma', figure(prog, '0.2.1.3.0.2.1.3.', { around: 5 }), { gain: 0, cut: (b) => 700 + 1500 * (0.5 - 0.5 * Math.cos((Math.PI * 2 * b) / 12)) });
  p.play('cuerdas', chords(prog, 'x', { around: 2, size: 3 }), { vol: levels([0, 0.6], [12, 1], [24, 0.8]) });
  p.beat({ bomboLinn: 'X...x...X...x...', hatFino: '..4...4...4...4.' }, { to: 24, vol: 0.9 });
  p.beat({ tarolaLinn: '....6.......6...' }, { from: 4, to: 24 });
  p.beat({ tuboSol: '..........3.....|................' }, { from: 8, to: 36 });
  poly(p, { tangguRe: 3 }, { from: 12, to: 24, vol: 0.5 });
  p.beat({ bomboLinn: 'X.......X.......', hatFino: '..3...3...3...3.' }, { from: 24, to: 28 });
  poly(p, { tangguRe: 3, muyuAlto: 5 }, { from: 24, to: 36, vol: 0.45 });
  p.beat({ bomboLinn: 'X...x...X...x...', tarolaLinn: '....7.......7...', hatFino: '..4...4...4...4.' }, { from: 28, to: 36 });
  fill(p, 12);
  fill(p, 24);
  fill(p, 36);
  p.hit('crash', 12, 0.5).hit('crash', 28, 0.5).hit('alReves', 12, 0.5);
  rise(p, 28, 2, -4);
  return p;
}

/** 3. Mundos 5 a 8. Sol. Espejos: un bajo de dos notas, metal y la pipa contra su espejo. 36 compases. */
function espejos() {
  const p = new Pista({ id: 'jade-espejos', title: 'Espejos', center: 'G', feel: 'bajo negro y metal; la melodía contra su espejo', bars: 36, seed: 404, level: -16.9, room: { seconds: 1.7 } });
  const verse = 'G:4 F:2 Bb C G:2 F:2';
  const prog = progression(`${verse} Bb:2 F:2 C:2 G:2 Bb F G:2 ${verse}`);
  const hook = read("10' - 10 - 8 - 10 - . . 8 - 6 - 8 - | 10' - 10 - 8 - 6 - - - . . 5 - 6 - | 8' - 8 - 6 - 8 - . . 10 - 11 - 10 - | 8 - - - 6 - 5 - - - - - . . . . | 9' - 9 - 7 - 9 - . . 7 - 6 - 7 - | 9' - 9 - 10 - 12 - - - . . 10 - 9 - | 11' - 11 - 9 - 11 - . . 9 - 8 - 9 - | 10 - - - 9 - 7 - - - - - . . . . | 10' - 10 - 8 - 10 - . . 8 - 6 - 8 - | 10' - 10 - 11 - 13 - - - . . 11 - 10 - | 9' - 9 - 7 - 9 - . . 10 - 9 - 7 - | 9 - - - - - - - . . . . . . . .");
  const chorus = read('11 - - - 13 - - - 11 - - - 10 - 8 - | 9 - - - - - 11 - 9 - - - - - . . | 12 - - - - - 10 - 9 - - - 10 - 12 - | 9 - - - 7 - - - 9 - - - - - . . | 10 - - - 12 - - - 10 - - - 9 - 7 - | 10 - - - - - 9 - 7 - - - - - . . | 8 - - - 10 - - - 11 - - - 13 - 11 - | 10 - - - 8 - - - 10 - - - - - . . | 11 - - - 9 - 8 - 6 - - - - - - - | 7 - - - 9 - 10 - 9 - - - - - - - | 10 - - - 8 - - - 6 - - - 8 - - - | 10 - - - - - - - . . . . . . . .');
  p.play('pipa', chain(hook, quiet(12), hook), { as: 'melodía', gain: 0.5 });
  p.play('erhu', chorus, { from: 12, as: 'melodía' });
  p.play('guzheng', canon(hook, { delay: 0.5, shifts: [0, -2, 2, -3, 3], length: 12, form: (x) => mirror(x, 8) }), { from: 24, gain: -1, as: 'espejo' });
  p.play('guzheng', counter(chorus, { rhythm: '. . x - x - . . | x - . . x - x -', low: 2, high: 9, seed: 91, prog: progression('Bb:2 F:2 C:2 G:2 Bb F G:2') }), { from: 12, gain: -1, as: 'contracanto' });
  p.play('bajoNegro', figure(prog, 'R-.R-...R-.u-...|R-.R-...R-.q-.d.', { octave: -2, sink: true, v: 0.76 }), { gain: 0.5, vol: levels([0, 1], [24, 0], [26, 1]) });
  p.play('cuerdas', chords(prog, 'x', { around: 0, size: 3 }), { vol: levels([0, 0], [4, 0.6], [12, 1]) });
  p.play('vozSinte', counter(hook, { rhythm: 'x - - - - - - - | x - - - x - - -', low: 5, high: 11, seed: 93, prog: progression(verse) }), { from: 24, gain: -2, as: 'contracanto', vol: levels([0, 0], [28, 1]) });
  p.beat({ bomboLinn: 'X.....x.X.x.....', tarolaLinn: '....X.......X...', hat: '5.4.5.4.5.4.5.4.' }, { to: 24 });
  p.beat({ tuboRe: '......4.........', tuboSol: '................|..............4.', cadena: '................|................|................|............5...' }, { from: 4, to: 36 });
  poly(p, { tangguRe: 3 }, { from: 8, to: 24, vol: 0.55 });
  poly(p, { paiguFa: 5 }, { from: 12, to: 24, vol: 0.45 });
  p.beat({ hatFino: '..3...3...3...3.' }, { from: 24, to: 28 });
  poly(p, { tangguSol: 5, tangguRe: 3 }, { from: 24, to: 36, vol: 0.5 });
  p.beat({ bomboLinn: 'X...X...X...X...', tarolaLinn: '....X.......X...', hat: '5.4.5.4.5.4.5.4.', aplauso: '....4.......4...' }, { from: 28, to: 36 });
  fill(p, 12);
  fill(p, 24);
  fill(p, 28);
  fill(p, 36);
  p.hit('crash', 12, 0.7).hit('crash', 28, 0.7).hit('xiaoluo', 24, 0.4).hit('alReves', 12, 0.6);
  rise(p, 28, 2, -2);
  return p;
}

/** 4. Mundos 9 a 11. Si♭. Cinabrio: bajo negro y bombo a cuatro, con la suona. 36 compases. */
function cinabrio() {
  const p = new Pista({ id: 'jade-cinabrio', title: 'Cinabrio', center: 'Bb', feel: 'electrónica oscura; el tema en dos tamaños', bars: 36, seed: 405, level: -15.7, drive: 0.18, room: { seconds: 1.6 } });
  const prog = progression('Bb:2 C G Bb:2 F C Bb:2 G F C:2 G:2 F:2 Bb:2 C:2 G F Bb:4 G:4 C:2 F G');
  const hook = read("11' - 11 - 9 - 11 - 8 - - 9 - - 6 - | 7' - - 9 - - 10 - 9 - - - - - . . | 11' - 11 - 9 - 11 - 13 - - 11 - - 9 - | 8 - - 9 - - 6 - 8 - - - - - . . | 11' - 11 - 9 - 11 - 8 - - 9 - - 6 - | 7' - - 9 - - 12 - 10 - - - - - . . | 14' - - 12 - - 11 - 12 - - 11 - - 9 - | 11 - - 9 - - 8 - 9 - - - - - . . | 11' - 11 - 9 - 11 - 8 - - 9 - - 6 - | 10' - - 8 - - 10 - 11 - - - - - . . | 12 - - 10 - - 9 - 10 - - 12 - - 9 - | 11 - - - - - - - . . . . . . . .");
  const wide = stretch(cut(up(TEMA, -1), 0, 6), 2);
  p.play('pipa', hook, { as: 'melodía', gain: 0.5 });
  p.play('tecla', hook, { octave: -1, gain: -4 });
  p.play('suona', up(TEMA, 1), { from: 12, gain: -0.5, as: 'melodía' });
  p.play('guzheng', canon(up(TEMA, 1), { delay: 0.5, shifts: [-5, -3, -2, 2], length: 12 }), { from: 12, gain: -1, as: 'canon' });
  p.play('erhu', wide, { from: 24, as: 'melodía' });
  p.play('pipa', canon(hook, { delay: 0, shifts: [0, -2, -3, 2], length: 12, against: wide }), { from: 24, gain: -1, as: 'canon', vol: levels([0, 0], [28, 1]) });
  p.play('bajoNegro', figure(prog, 'R-R-..R-R-..u-d-|R-R-..R-R-..q-~u-', { octave: -2, sink: true, v: 0.78 }), { gain: 1 });
  p.play('acido', figure(prog, 'r.r.o.r.r.r.o.u.', { octave: -1, v: 0.6 }), { gain: -3, vol: levels([0, 0], [12, 1], [24, 0], [28, 1]) });
  p.play('cuerdas', chords(prog, 'x', { around: 1, size: 4 }), { gain: 0.5 });
  p.play('estocada', chords(prog, '. . . x . . . . . . x . . . . .', { around: 4, size: 3 }), { gain: -2, vol: levels([0, 0], [12, 1], [24, 0], [28, 1]) });
  p.play('coro', chords(prog, 'x', { around: -1, size: 3 }), { vol: levels([0, 0], [12, 0.7], [24, 1]) });
  p.beat({ bomboDuro: 'X...X...X...X...', tarolaLinn: '....X.......X...', hatAbierto: '..5...5...5...5.', hatFino: '3.3.3.3.3.3.3.3.' }, { to: 24 });
  p.beat({ aplauso: '....6.......6...', yunque: '......4.........', tuboSol: '................|..........3.....' }, { from: 8, to: 24 });
  poly(p, { tangguRe: 3 }, { from: 4, to: 24, vol: 0.6 });
  poly(p, { paiguSol: 5 }, { from: 12, to: 24, vol: 0.5 });
  p.beat({ bomboDuro: 'X.......X.......' }, { from: 24, to: 28 });
  poly(p, { tangguSol: 5, bangu: 6 }, { from: 24, to: 28, vol: 0.55 });
  p.beat({ bomboDuro: 'X...X...X...X...', tarolaLinn: '....X.......X...', hat: '5454545454545454', hatAbierto: '..5...5...5...5.', yunque: '..........5.....' }, { from: 28, to: 36 });
  poly(p, { tangguRe: 3, paiguSol: 5 }, { from: 28, to: 36, vol: 0.6 });
  fill(p, 12);
  fill(p, 24);
  fill(p, 28);
  fill(p, 36);
  p.hit('crash', 0, 0.6).hit('crash', 12, 0.8).hit('crash', 28, 0.9).hit('daluo', 24, 0.5).hit('alReves', 12, 0.7);
  boom(p, 28, -9, -2);
  rise(p, 12, 2, -2);
  rise(p, 28, 4, 0);
  return p;
}

/** 5. La pelea. Sol. Eclipse: en el estilo de chow-intro-hard (808 a golpecitos, tarola grande, la cuerda). 36 compases. */
function eclipse() {
  const p = new Pista({ id: 'jade-rival', title: 'Eclipse', center: 'G', feel: 'en el estilo de chow-intro-hard; espejo y stretto', bars: 36, seed: 406, level: -14.3, drive: 0.35, room: { seconds: 1.8 } });
  const prog = progression('G:2 F C G:2 Bb F G:2 C Dq');
  const song = up(TEMA, 2);
  const lead = read("10' - - - - - 10 - 8 - - - - - 10 - | 11 - - - - - 10 - 8 - - - 6 - - - | 9' - - - - - 9 - 7 - - - - - 9 - | 10 - - - - - 9 - 7 - - - - - - - | 10' - - - - - 10 - 8 - - - - - 10 - | 13 - - - - - 11 - 10 - - - 8 - - - | 11' - - - - - 9 - 8 - - - - - 9 - | 12 - - - - - 10 - 9 - - - - - - - | 10' - - - - - 10 - 8 - - - - - 10 - | 11 - - - - - 13 - 15 - - - 13 - - - | 12' - - - - - 10 - 9 - - - 7 - - - | 8 - - - - - - - - - - - . . . .");
  p.play('guzheng', lead, { gain: 1, as: 'melodía' });
  p.play('guzheng', lead, { from: 12, gain: 0.5, as: 'melodía' });
  p.play('guzheng', lead, { from: 24, gain: 1, as: 'melodía', vol: levels([0, 0], [28, 1]) });
  p.play('suona', within(song, 0, 12), { from: 12, gain: -0.5 });
  p.play('erhu', counter(lead, { rhythm: 'x - - - - - x - | x - - - x - - - | x - - - - - - - | x - x - x - - -', low: 0, high: 7, seed: 97, prog, rough: 0.2 }), { from: 0, gain: 0, as: 'contracanto' });
  p.play('pipa', canon(lead, { delay: 0.25, shifts: [-3, -2, 2, -5], length: 12 }), { from: 12, gain: -1, as: 'stretto' });
  p.play('suona', stretch(mirror(cut(lead, 0, 4), 8), 2), { from: 28, gain: 0, as: 'espejo' });
  p.play('erhu', stretch(cut(lead, 0, 6), 2), { from: 24, gain: 0, as: 'contracanto' });
  p.play('bajoRoto', figure(prog, 'R--.R.R-..r-R---|R-r-R--.R.R-..u-|R--.R.R-..r-R-r-|R-r-R--.R.Rrd-u-', { octave: -2, sink: true }), { times: 3, vol: levels([0, 1], [24, 0], [28, 1]) });
  p.play('bajoNegro', figure(prog, '....R-.r....R-u-|....R-.r..R-d-u-', { octave: -1, v: 0.8 }), { times: 3, gain: -1, hp: 100, vol: levels([0, 0.5], [12, 1], [24, 0.7], [28, 1]) });
  p.play('cuerdas', chords(prog, 'x', { around: 0, size: 4 }), { times: 3, gain: 0.5 });
  p.play('coro', chords(prog, 'x', { around: 0, size: 3 }), { times: 3, gain: 2, vol: levels([0, 0.6], [12, 1]) });
  p.play('estocada', chords(prog, 'X . . . . . . . . . . . . . . . | . . . . . . X . . . . . . . x .', { around: 3, size: 4 }), { times: 3, gain: -1, vol: levels([0, 0], [12, 1], [24, 0], [28, 1]) });
  const base = { bomboRoto: 'X....x.x..x...x.|X....x.x..x.....', tarolaGrande: '....X.......X...', hat: '5.4.5.4.5.4.5.4.|5.4.5.4.5.4rrrr.', hatFino: '.2.2.2.2.2.2.2.2', tangguRe: '..............5.|..........5.5.5.' };
  p.beat(base, { to: 12 });
  p.beat({ tuboRe: '......3.........|..............3.' }, { from: 0, to: 24 });
  poly(p, { tangguRe: 3 }, { from: 0, to: 24, vol: 0.55 });
  p.beat({ ...base, yunque: '..........4.....' }, { from: 12, to: 24 });
  poly(p, { tangguSol: 5, paiguFa: 6 }, { from: 12, to: 24, vol: 0.5 });
  p.beat({ latido: 'X.....x.........', tangguRe: '4..4..4.4..4..4.|4..4..4.5.5.5.5.|5..5..5.5..5..5.|5.5.6.6.77889999' }, { from: 24, to: 28 });
  p.beat({ bomboRoto: 'X...X...X...X.x.', tarolaGrande: '....X.......X...', hat: '5.4.5.4.5.4.5.4.', hatAbierto: '..5...5...5...5.', yunque: '..........5.....', bo: '4.......4.......' }, { from: 28, to: 36 });
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

export const JADE = { name: 'Jade', menu, brindis, worlds: [lluvia, espejos, cinabrio], rival: eclipse };
