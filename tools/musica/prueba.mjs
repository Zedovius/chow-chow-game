import { broken, canon, clash, counter, parallels, read, theme, up, DEGREES } from './partitura.mjs';
const name = (i) => DEGREES[((i % 5) + 5) % 5] + (3 + Math.floor((i + 0) / 5) + ([2, 3, 4].includes(((i % 5) + 5) % 5) ? 1 : 0));
const t = theme();
console.log(t.map((o) => `${o.at.toFixed(2)}:${name(o.i)}`).join(' '));
for (const delay of [2, 1, 0.5, 0.25]) { const c = canon(broken(t), { delay }); console.log('canon', delay, 'lugar', c.shift, 'choque', clash(broken(t), c).toFixed(3), 'paralelas', parallels(broken(t), c)); }
for (const rhythm of ['x - - - x -', '. x - x - x', 'x - - - - - | - - x - x -']) { const c = counter(t, { rhythm, low: 1, high: 8, seed: 3 }); console.log('contra', clash(t, c).toFixed(3), parallels(t, c), c.slice(0, 22).map((o) => name(o.i)).join(' ')); }
