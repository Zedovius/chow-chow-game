// El mundo del Perro: el barrio chino de una ciudad mexicana, en los ochenta, de noche. Fachadas, puestos,
// autos de la época (sin marcas) y los edificios del fondo. Todo es un Model de pie en (0, 0), salvo los
// edificios lejanos (skyline), que se pintan. El neón va arriba, en las fachadas: el camino queda tranquilo.

import { aerial, tone } from '../../js/graphics/aerial.js';
import { CREAM, HAIR, SKIN, WHITE, standing } from './gente.mjs';
import { lerp } from './modelo3d.mjs';
import { C, lantern, make, pole, roof, stripe } from './piezas.mjs';
import { image } from './png.mjs';
import { fbm, hash } from './ruido.mjs';

const { RED, GOLD, DARK, STONE } = C;
const PINK = '#ff5fa0';
const CYAN = '#4fe0e8';
const LAMP = '#ffd27a';
const brick = (a, b) => (l) => (Math.abs(((l[1] + 60) % 3) - 1.5) > 1.2 || Math.abs((((l[0] + Math.floor((l[1] + 60) / 3) * 2.4) % 5) + 5) % 5 - 2.5) > 2.2 ? b : a);

/** Una ventana encendida (o apagada), con su marco. */
const pane = (m, [x, y, z], w, h, on = true, frame = '#3a2a30') => m.box([x, y, z], [w, h, 1.5], { color: (l) => (Math.abs(l[0]) > w - 0.8 || Math.abs(l[1]) > h - 0.8 || Math.abs(l[0]) < 0.35 ? frame : on ? LAMP : '#2c3a4e'), flat: on ? 3 : 2, group: `pane${x}${y}`, over: 2 });
/** Un letrero vertical de tienda: rojo con trazos dorados. */
const board = (m, [x, y, z], w, h, base = '#b3202c', ink = GOLD) => m.box([x, y, z], [w, h, 1.5], { color: (l) => (Math.abs(l[0]) > w - 0.6 || Math.abs(l[1]) > h - 0.6 ? ink : Math.abs(((l[1] + 50) % 4.4) - 2.2) < 1.5 && Math.sin(l[0] * 2.6 + Math.floor((l[1] + 50) / 4.4) * 2) > -0.1 && Math.abs(l[0]) < w - 1.2 ? ink : base), group: `board${x}${y}`, over: 3 });

// --- Fachadas ----------------------------------------------------------------------------------

const buildings = {
  bar() { // el bar: techo chino, puerta roja, neón de copa
    const m = make();
    m.box([0, 13], [20, 13, 7], { color: brick('#8a3a3c', '#6a2a30'), group: 'w' });
    m.box([0, 12.4, 7], [20.4, 0.9, 1], { color: '#2f6f6a', group: 'cor', over: 1 });
    m.box([0, 5.4, 7.2], [3.6, 5.4, 1.5], { color: (l) => (Math.abs(l[0]) < 0.4 ? GOLD : Math.hypot(Math.abs(l[0]) - 1, l[1]) < 0.8 ? GOLD : '#c8202c'), group: 'door', over: 2 });
    for (const x of [-12, 12]) pane(m, [x, 6, 7.2], 4.6, 3.6);
    for (const x of [-13, 13]) pane(m, [x, 19, 7.2], 3, 3.4);
    roof(m, [0, 26], 24, 9.6, 6.4, '#2f6f6a', { dark: '#1c4644', lift: 2.6 });
    m.box([0, 18.8, 6.6], [7, 5.6, 0.9], { color: '#1c1424', group: 'panel', over: 2 });
    m.ball([0, 18.8, 8], [5.2, 5.2, 0.9], {
      color: (l) => {
        const d = Math.hypot(l[0], l[1]);
        if (d > 4.1) return PINK;
        if (l[1] > -0.2 && l[1] < 2.6 && Math.abs(l[0]) < (l[1] + 0.4) * 0.9) return CYAN; // la copa
        if (Math.abs(l[0]) < 0.45 && l[1] > -2.6 && l[1] <= -0.2) return CYAN;
        if (Math.abs(l[0]) < 1.6 && l[1] < -2.2 && l[1] > -3) return CYAN;
        return '#1c1424';
      },
      group: 'neon', flat: 3, over: 3,
    });
    for (const x of [-6.4, 6.4]) lantern(m, [x, 9.4, 8.6], 1.9);
    return m;
  },
  herbolaria() { // la botica china, con sus letreros
    const m = make();
    m.box([0, 14], [14, 14, 6.6], { color: (l) => (Math.sin(l[1] * 1.1) > 0.94 ? '#24483f' : '#3f6f62'), group: 'w' });
    m.box([-4, 5, 6.8], [4.6, 5, 1.5], { color: (l) => (Math.abs(l[0]) < 0.4 ? DARK : '#e8b86a'), flat: 3, group: 'd', over: 2 });
    m.box([0, 11, 8.2], [14.4, 1, 2.4], { color: stripe('#b3202c', CREAM, 1.8, 0), group: 'aw', over: 2 });
    board(m, [8, 6, 7.4], 2.4, 5);
    board(m, [-8.6, 19, 7.4], 2.4, 6.4);
    board(m, [8.6, 19, 7.4], 2.4, 6.4, '#1f4a5a', '#ffd27a');
    pane(m, [0, 19, 7], 3.4, 3.6);
    roof(m, [0, 28], 17, 9, 5, '#8a6a3a', { dark: '#5a4022', ridge: GOLD });
    lantern(m, [-13, 10, 7], 1.8);
    return m;
  },
  vecindad() { // la casona de balcones
    const m = make();
    m.box([0, 15], [17, 15, 6.6], { color: (l) => (l[1] < -11.6 ? '#7a4438' : fbm(l[0] * 0.2, l[1] * 0.2, 4, 2) > 0.6 ? '#c4785a' : '#d48a66'), group: 'w' });
    for (const y of [15.4, 29.6]) m.box([0, y, 0.6], [17.8, 0.9, 7], { color: CREAM, group: `cor${y}`, over: 1 });
    m.ball([0, 8, 6.4], [4.4, 5, 2], { color: '#3a2420', group: 'arch', over: 2 });
    m.box([0, 4, 6.6], [4.4, 4.2, 1.8], { color: stripe('#4a2c24', '#2a1814', 1.6), group: 'gate', over: 2 });
    for (const x of [-11, 11]) pane(m, [x, 7, 6.8], 2.6, 3.4, x > 0, '#2f5a5a');
    for (const x of [-11, 0, 11]) {
      pane(m, [x, 22, 6.8], 2.6, 3.8, x !== 0, '#2f5a5a');
      m.box([x, 18, 8], [4, 0.7, 1.6], { color: STONE, group: `bal${x}`, over: 3 });
      for (let i = -2; i <= 2; i++) m.limb([x + i * 1.7, 18, 9.2], [x + i * 1.7, 20.8, 9.2], 0.4, 0.4, { color: DARK, group: `bar${x}${i}`, over: 3 });
      m.box([x, 21, 9.2], [3.9, 0.45, 0.5], { color: DARK, group: `rail${x}`, over: 3 });
    }
    m.drum([-9, 33], 3.2, 3, 3, { color: '#2a2a32', group: 'tinaco' });
    m.limb([8, 30, 0], [8, 37, 0], 0.5, 0.4, { color: DARK, group: 'ant' });
    for (const y of [33, 35]) m.limb([5.6, y, 0], [10.4, y, 0], 0.4, 0.4, { color: DARK, group: 'ant' });
    return m;
  },
  maquinitas() { // el local de videojuegos
    const m = make();
    m.box([0, 11], [15, 11, 6.6], { color: '#37345c', group: 'w' });
    m.box([0, 5.6, 6.8], [9, 5.4, 1.5], { color: (l) => (Math.abs(l[0]) < 0.4 || Math.abs(Math.abs(l[0]) - 5) < 0.4 ? '#241f3a' : l[1] > 1 ? '#7ae0e0' : '#a86ad0'), flat: 3, group: 'in', over: 2 });
    for (const [x, c] of [[-6.4, '#e0563a'], [-2, '#3f8fb0'], [6.6, '#d8b04a']]) m.box([x, 3, 8], [1.5, 3, 1.6], { color: (l) => (l[1] > 0.6 && l[1] < 2.2 ? '#dff8ff' : c), group: `mq${x}`, over: 3 });
    m.box([0, 15.6, 7.2], [14, 3.2, 1.6], { color: (l) => (Math.abs(l[1]) > 2.5 ? (Math.sin(l[0] * 2.4) > 0 ? LAMP : '#8a5a2a') : Math.abs(((l[0] - l[1] + 60) % 7) - 3.5) < 0.9 ? PINK : Math.abs(((l[0] + l[1] + 60) % 9) - 4.5) < 0.7 ? CYAN : '#201a34'), flat: 3, group: 'mar', over: 3 });
    m.box([0, 22], [15.6, 0.8, 7], { color: '#4c487a', group: 'top' });
    m.chain([[-9, 23, 0], [-4, 29, 0], [1, 23, 0], [-9, 23, 0]], 0.6, 0.6, { color: PINK, group: 'tri', flat: 3 });
    m.ball([7, 26, 0], [3.2, 3.2, 1], { color: (l) => (Math.hypot(l[0], l[1]) > 2.1 ? CYAN : '#201a34'), flat: 3, group: 'ring' });
    return m;
  },
  arco() { // la entrada del barrio chino
    const m = make();
    for (const [x, h] of [[-19, 22], [-8, 27], [8, 27], [19, 22]]) {
      m.drum([x, 1.6], 2.6, 2.2, 1.6, { color: STONE, group: `b${x}` });
      pole(m, x, 2, h, 1.4, '#c8202c');
    }
    m.box([0, 23.6], [9.4, 2.6, 1.6], { color: (l) => (Math.abs(l[1]) > 1.9 ? GOLD : Math.abs(((l[0] + 40) % 5) - 2.5) < 1.5 ? '#ffe08a' : '#1f4a6a'), group: 'sign' });
    for (const x of [-13.6, 13.6]) m.box([x, 19.6], [6, 1.8, 1.4], { color: (l) => (Math.sin(l[0] * 1.8) > 0.2 ? '#2f8f7a' : GOLD), group: `s${x}` });
    for (const x of [-13.6, 13.6]) roof(m, [x, 22], 8.4, 4, 3.4, '#2f8f7a', { dark: '#17564e' });
    roof(m, [0, 27], 12.4, 4.6, 4.6, '#2f8f7a', { dark: '#17564e', lift: 2.4 });
    for (const x of [-4, 4]) lantern(m, [x, 17.4, 1], 2.2);
    return m;
  },
};

// --- Puestos y cosas de la calle ------------------------------------------------------------------

const street = {
  tacos() { // el trompo al pastor
    const m = make();
    const h = standing(0.2, { skin: SKIN[1], m }).torso(WHITE, { r: 2.8, sash: RED }).arms(WHITE, { near: [-4, 15, 1], far: [4, 13, -3] }).head(HAIR, 'short').hat('cap', WHITE, WHITE);
    for (const p of m.prims) { for (const key of ['c', 'a', 'b']) if (p[key]) p[key] = [p[key][0] + 2, p[key][1] + 1, p[key][2] - 3]; }
    m.dots.length = 0;
    void h;
    m.box([0, 5.4], [14, 5.4, 5], { color: (l) => (l[2] > 4 ? (Math.abs(l[1] - 3.6) < 1 ? GOLD : Math.floor((l[0] + 40) / 2.4 + Math.floor((l[1] + 20) / 2.4)) % 2 ? '#c8402e' : '#f0e4c8') : '#8a2a24'), group: 'cart' });
    m.box([0, 11.2], [14.4, 0.6, 5.4], { color: '#c9ced8', group: 'top', over: 1 });
    m.drum([-8.6, 17], 1.6, 3.4, 4.6, { color: (l) => (Math.sin(l[1] * 2.6 + l[0]) > 0.3 ? '#a8421e' : '#d8682e'), group: 'trompo', over: 1 });
    m.ball([-8.6, 22.4], [1.9, 1.5, 1.9], { color: '#f0c040', group: 'pina', over: 1 });
    m.box([-12, 17], [0.8, 4.8, 3], { color: '#ff8a2e', flat: 3, group: 'fire' });
    for (const [x, c] of [[4, '#3f8f4a'], [7, '#c8202c'], [10, '#e8d8a8']]) m.drum([x, 12.6, 1], 1.3, 1.5, 0.9, { color: c, group: `salsa${x}`, over: 2 });
    for (const x of [-13, 13]) pole(m, x, 10, 31, 0.6, '#7a7f8a');
    m.box([0, 31.4, 1], [16, 1.6, 7], { color: stripe('#c8202c', CREAM, 1.4, 0), group: 'awn' });
    m.limb([0, 30, 2], [0, 27.4, 2], 0.3, 0.3, { color: DARK, group: 'cord' });
    m.ball([0, 26.6, 2], [1.3, 1.4, 1.3], { color: '#fff0b0', flat: 4, group: 'bulb', over: 3 });
    return m;
  },
  tortas() { // tortas, con su sombrilla
    const m = make();
    standing(0.6, { skin: SKIN[0], m }).torso('#e8c45a', { r: 2.6, sash: WHITE }).arms('#e8c45a', { near: [4, 13, 1] }).head(HAIR, 'bun');
    for (const p of m.prims) { for (const key of ['c', 'a', 'b']) if (p[key]) p[key] = [p[key][0] - 3, p[key][1] + 1, p[key][2] - 3]; }
    m.dots.length = 0;
    m.box([0, 5.4], [11.6, 4.2, 4.6], { color: (l) => (Math.abs(l[1]) < 1.6 && Math.abs(l[0]) < 8 && l[2] > 3 ? (Math.sin(l[0] * 2.6) > 0 ? '#c8202c' : '#f4ecd8') : '#e0b43a'), group: 'cart' });
    m.box([2, 11.6], [8, 2.2, 3.8], { color: (l) => (Math.abs(l[0]) > 7.2 || Math.abs(l[1]) > 1.7 ? '#c9ced8' : '#cfe6ea'), group: 'glass', over: 1 });
    for (let i = 0; i < 5; i++) m.ball([-3.4 + i * 2.7, 14.6, 1], [1.6, 1, 1.4], { color: i % 2 ? '#d89a4a' : '#c98438', group: `pan${i}`, over: 2 });
    for (const x of [-8, 8]) m.ball([x, 2, 4.6], [2.2, 2.2, 0.9], { color: (l) => (Math.hypot(l[0], l[1]) < 1 ? '#c9ced8' : DARK), group: `rueda${x}`, over: 2 });
    pole(m, -8.6, 8, 30, 0.6, '#7a7f8a');
    m.drum([-4, 31], 13, 0.8, 3, { color: (l) => (Math.sin(Math.atan2(l[2], l[0]) * 6) > 0 ? '#2f7a4a' : '#f4ecd8'), group: 'umb', flatten: 0.6 });
    return m;
  },
  esquites() { // el triciclo de los elotes
    const m = make();
    for (const [x, r] of [[-8, 3], [8, 3]]) m.ball([x, r, 0], [r, r, 0.9], { color: (l) => (Math.hypot(l[0], l[1]) > r * 0.72 ? DARK : Math.abs(Math.sin(Math.atan2(l[1], l[0]) * 3)) < 0.35 ? '#c9ced8' : '#4a4f5e'), group: `w${x}` });
    m.box([1, 6.4], [8, 2.6, 4], { color: '#2f7a8a', group: 'box' });
    m.drum([-1, 11], 3.4, 3.6, 2.2, { color: '#c9ced8', group: 'pot', over: 1 });
    for (const x of [-2, 0.4]) m.limb([x, 12.6, 0], [x * 1.4, 16.4, 0.6], 1.1, 0.9, { color: '#f0c850', group: `elo${x}`, over: 2 });
    m.ball([6, 11, 0], [1.6, 2.2, 1.6], { color: '#f4ecd8', group: 'mayo', over: 1 });
    m.chain([[-9, 4], [-11, 10], [-9.6, 11]], 0.6, 0.6, { color: '#7a7f8a', group: 'bar' });
    pole(m, 4, 8, 26, 0.7, '#7a7f8a');
    m.drum([4, 27], 9, 0.6, 2.4, { color: (l) => (Math.sin(Math.atan2(l[2], l[0]) * 5) > 0 ? '#e0563a' : '#f0c850'), group: 'umb', flatten: 0.6 });
    return m;
  },
  phone() { // el teléfono público
    const m = make();
    pole(m, 0, 0, 12, 1, '#5a6070');
    m.box([0, 18], [4.4, 6.4, 3], { color: (l) => (l[2] > 2 && Math.abs(l[0]) < 3.2 && Math.abs(l[1]) < 5 ? '#c9d2dc' : '#2f6fa8'), group: 'b', round: 0.8 });
    m.box([-0.6, 18, 3], [1.6, 2.8, 0.8], { color: (l) => (Math.abs(l[0]) < 1 && l[1] > 0 ? DARK : '#3a3f4a'), group: 'ph', over: 2 });
    m.chain([[2, 20, 3.4], [2.4, 18, 3.6], [2, 15.6, 3.4]], 0.8, 0.8, { color: DARK, group: 'aur', over: 3 });
    return m;
  },
  lamp() { // el farol de la calle, con su linterna roja
    const m = make();
    m.drum([0, 1.4], 2.4, 1.6, 1.4, { color: '#2f3a44', group: 'b' });
    pole(m, 0, 2, 38, 0.8, '#2f3a44');
    m.chain([[0, 37], [3, 40], [8, 39.6]], 0.8, 0.7, { color: '#2f3a44', group: 'arm' });
    m.ball([9, 38.4], [2.4, 1.6, 2.2], { color: '#ffe6a8', flat: 4, group: 'luz' });
    m.limb([0, 28, 0], [-4.6, 28, 0], 0.5, 0.5, { color: '#2f3a44', group: 'arm2' });
    lantern(m, [-4.6, 23], 2.9);
    return m;
  },
  picado() { // papel picado de poste a poste
    const m = make();
    for (const x of [-20, 20]) pole(m, x, 0, 33, 0.8, '#2f3a44');
    const colors = ['#d8506a', '#e8b43a', '#3f9a8a', '#b04a8a', '#e0703a', '#4a7ab0'];
    for (let i = 0; i < 11; i++) {
      const k = (i + 0.5) / 11;
      const y = 29.4 - Math.sin(k * Math.PI) * 4;
      m.box([lerp(-20, 20, k), y, 0], [1.5, 2, 1], { color: (l) => (Math.abs(l[0]) < 0.5 && Math.abs(l[1]) < 0.7 ? '#4a3050' : l[1] < -1.2 && Math.sin(l[0] * 5) > 0.4 ? '#4a3050' : colors[i % 6]), group: `p${i}` });
    }
    m.chain(Array.from({ length: 9 }, (_, i) => [lerp(-20, 20, i / 8), 31.6 - Math.sin((i / 8) * Math.PI) * 4, 0]), 0.35, 0.35, { color: DARK, group: 'rope' });
    return m;
  },
  arcade() { // una maquinita en la banqueta, con su banquito
    const m = make();
    m.box([0, 8], [4.4, 8, 4.4], { color: (l) => (Math.abs(((l[1] - l[0] + 40) % 8) - 4) < 0.9 ? PINK : Math.abs(((l[1] - l[0] + 37) % 8) - 4) < 0.6 ? CYAN : '#3a3268'), group: 'c' });
    m.box([0, 18.4, -0.6], [4.4, 2.6, 3.8], { color: (l) => (Math.abs(l[1]) < 1.4 ? LAMP : '#3a3268'), flat: 3, group: 'mar' });
    m.box([0, 12.4, 4.4], [3.4, 2.8, 0.8], { color: (l) => (Math.hypot(l[0] + 1, l[1] - 0.6) < 0.9 ? '#ffd45e' : Math.abs(l[1] + 1.8) < 0.4 ? '#7affa0' : '#1f3a5a'), flat: 3, group: 'scr', over: 2 });
    m.box([0, 8.4, 5.4], [4, 0.8, 1.6], { color: (l) => (Math.sin(l[0] * 3) > 0.4 ? RED : '#201a34'), group: 'pan', over: 2 });
    m.drum([9, 3], 1.8, 1.6, 3, { color: '#5a4030', group: 'st' });
    m.drum([9, 6.4], 2.6, 2.6, 0.6, { color: RED, group: 'st2', over: 1 });
    return m;
  },
  hedge() { // macetas con nopal y bugambilia
    const m = make();
    for (const [x, c] of [[-6, '#b3582e'], [5, '#2f6fa8']]) m.drum([x, 2.6], 2.6, 3.6, 2.6, { color: c, group: `p${x}` });
    for (const [x, y, rx, ry] of [[-6, 8, 2.2, 3], [-8.6, 11, 1.9, 2.6], [-3.6, 12, 1.8, 2.6]]) m.ball([x, y], [rx, ry, 1.2], { color: '#4f8a4a', group: 'nopal', blend: 0.4 });
    for (const [x, y] of [[-8.8, 14], [-3.4, 15]]) m.ball([x, y], 0.9, { color: '#d8304a', group: `tuna${x}`, over: 1 });
    for (let i = 0; i < 9; i++) m.ball([5 + Math.cos(i * 2.2) * 3.4, 8 + (i % 4) * 1.5, Math.sin(i * 2.2) * 2], 1.7, { color: i % 3 ? '#c83a8a' : '#3f7a44', group: 'bug', blend: 0.4 });
    return m;
  },
};

// --- Autos (miran a la derecha) ------------------------------------------------------------------------

const wheel = (m, x, r = 4.3, z = 8) => {
  for (const s of [-1, 1]) m.ball([x, r, s * z], [r, r, 1.8], { color: (l) => (Math.hypot(l[0], l[1]) < r * 0.5 ? '#c9ced8' : '#1c1a22'), group: `w${x}${s}`, over: s > 0 ? 3 : 0 });
};
const lights = (m, x0, x1, y, z = 6) => {
  for (const s of [-1, 1]) {
    m.ball([x1, y, s * z], [1.2, 1.5, 1.5], { color: '#fff3c0', flat: 4, group: `hl${s}`, over: 4 });
    m.ball([x0, y, s * z], [1, 1.3, 1.4], { color: '#e0302e', flat: 3, group: `tl${s}`, over: 4 });
  }
};

const cars = {
  vocho() { // el escarabajo
    const m = make();
    const paint = '#4f9a94';
    m.ball([0, 8], [23, 5.4, 8.6], { color: paint, group: 'b', blend: 2 });
    m.ball([-13, 9.4], [10, 6.2, 7.8], { color: paint, group: 'b', blend: 2 });
    m.ball([13, 8.6], [10, 5.4, 7.6], { color: paint, group: 'b', blend: 2 });
    m.ball([-1, 13], [12.6, 7.6, 7.4], { color: (l) => (l[1] > 0.2 && l[1] < 5 && Math.abs(l[0]) < 10 && Math.abs(l[0] - 1) > 0.9 && Math.abs(l[2]) > 3 ? '#24364a' : paint), group: 'cab', over: 1 });
    for (const x of [-14.4, 14.4]) {
      for (const s of [-1, 1]) m.ball([x, 6.4, s * 7.4], [6.4, 5, 2.2], { color: '#3f7f7a', group: `g${x}${s}`, over: s > 0 ? 2 : 0 });
      wheel(m, x);
    }
    for (const x of [-23, 23]) m.limb([x, 5.4, -6], [x, 5.4, 6], 0.9, 0.9, { color: '#c9ced8', group: `bum${x}`, over: 2 });
    lights(m, -22, 22, 8.4);
    return m;
  },
  combi() { // la combi de dos tonos
    const m = make();
    m.box([0, 12], [24, 9.4, 8.6], {
      color: (l) => {
        if (l[1] > 0.6 && l[1] < 6.2) {
          if (l[0] > 20.6 || l[0] < -21) return '#24364a';
          return Math.abs((((l[0] + 60) % 8.4) - 4.2)) > 0.9 && Math.abs(l[0]) < 21 ? '#24364a' : '#f0e4c8';
        }
        return l[1] > -0.6 ? '#f0e4c8' : '#c8622e';
      },
      group: 'b', round: 4,
    });
    for (const x of [-14, 14]) wheel(m, x, 4.2);
    m.limb([24, 4.4, -6], [24, 4.4, 6], 0.9, 0.9, { color: '#c9ced8', group: 'bum', over: 2 });
    lights(m, -23.6, 23.6, 8);
    return m;
  },
  micro() { // el microbús
    const m = make();
    m.box([0, 15], [29, 12, 9], {
      color: (l) => {
        if (l[1] > 1 && l[1] < 7.6) return Math.abs((((l[0] + 60) % 8) - 4)) > 0.9 && Math.abs(l[0]) < 27 ? (Math.floor((l[0] + 60) / 8) % 3 ? '#ffd88a' : '#3a4a5e') : '#e8e0cc';
        return l[1] < -2 && l[1] > -5 ? '#2f7a4a' : l[1] > 9 ? '#2f7a4a' : '#e8e0cc';
      },
      group: 'b', round: 2,
    });
    m.box([29, 13], [1, 6, 7.6], { color: (l) => (l[1] > 0 ? '#3a4a5e' : '#e8e0cc'), group: 'f', over: 1 });
    for (const x of [-18, 18]) wheel(m, x, 4.8, 8.6);
    lights(m, -28.6, 29.4, 7.4, 7);
    return m;
  },
  sedan() { // el sedán cuadrado
    const m = make();
    const paint = '#a8324a';
    m.box([0, 7.4], [26, 3.8, 8.6], { color: (l) => (Math.abs(l[1] + 0.4) < 0.6 ? '#d8a0a8' : paint), group: 'b', round: 1.4 });
    m.box([-3, 13], [13, 4, 7.6], { color: (l) => (Math.abs(l[1]) < 2.6 && Math.abs(l[0]) < 12 && Math.abs(l[0] + 0.6) > 0.8 ? '#24364a' : paint), group: 'cab', round: 2.4, over: 1 });
    for (const x of [-15.4, 15.4]) wheel(m, x, 4);
    for (const x of [-26, 26]) m.limb([x, 5, -7], [x, 5, 7], 1, 1, { color: '#c9ced8', group: `bum${x}`, over: 2 });
    lights(m, -25.6, 25.6, 8.2);
    return m;
  },
  pickup() { // la camioneta, con su carga de cajas
    const m = make();
    const paint = '#d0a040';
    m.box([0, 7.6], [27, 3.6, 8.6], { color: paint, group: 'b', round: 1.2 });
    m.box([5, 13.4], [8, 4.4, 7.6], { color: (l) => (Math.abs(l[1]) < 2.8 && Math.abs(l[0]) < 6.6 ? '#24364a' : paint), group: 'cab', round: 2, over: 1 });
    for (const [x, c] of [[-20, '#c98a4a'], [-13, '#b0743a'], [-8, '#d89a5a']]) m.box([x, 13, 0], [3.2, 2.8, 5], { color: (l) => (Math.abs(l[1]) < 0.4 ? '#6f4020' : c), group: `cj${x}` });
    for (const x of [-16, 16]) wheel(m, x, 4.4);
    lights(m, -26.6, 26.6, 8.4);
    return m;
  },
};

export const CITY = { ...buildings, ...street, ...cars };

// --- Edificios lejanos ------------------------------------------------------------------------------------

const mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
const rgb = (hex) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));

/**
 * Un grupo de edificios: azoteas con tinacos y antenas, alguna cúpula o una torre china, y ventanas
 * encendidas. Mismas medidas que mountain() (montanas.mjs): w, h, seed, layers y style { air, airAmount, detail }.
 */
export function skyline({ w, h, seed, layers, style }) {
  const out = Array.from({ length: layers }, () => image(w, h));
  const [ink, shade, rock, light] = [style.ink, style.shade, style.rock, style.light].map(rgb);
  const { detail } = style;
  const far = (c, y, k = style.airAmount, top) => tone(aerial(c, mix(style.air.top, style.air.base, Math.max(0, Math.min(1, y / h)) ** 1.1), k), top, top ? null : style.air.dusk);
  const put = (x, y, c, front) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    for (let i = 0; i < (front ? layers : 1); i++) out[i].data.set([...c.map((v) => Math.round(Math.max(0, Math.min(255, v)))), 255], (y * w + x) * 4);
  };
  const count = style.count;
  for (let b = 0; b < count; b++) {
    const bw = Math.round(w * (0.2 + 0.16 * hash(b, 1, seed)));
    const x0 = Math.round(((b + 0.5) / count) * (w - bw - 4) + (hash(b, 2, seed) - 0.5) * 6) + 2;
    const top = Math.round(h * (b === Math.floor(count / 2) ? 0.12 : 0.3 + 0.42 * hash(b, 3, seed)));
    const front = b % 2 === 0;
    const tone = mix(shade, rock, 0.35 + 0.5 * hash(b, 4, seed));
    const kind = Math.floor(hash(b, 5, seed) * 4); // 0 azotea, 1 cúpula, 2 torre china, 3 azotea con antena
    for (let y = top; y < h; y++) {
      const fade = Math.max(0, (y - h * 0.62) / (h * 0.38));
      for (let x = x0; x < x0 + bw; x++) {
        const u = (x - x0) / bw;
        let c = mix(tone, u < 0.12 ? light : u > 0.72 ? ink : tone, u < 0.12 ? 0.3 * detail : u > 0.72 ? 0.45 : 0);
        c = mix(c, ink, (fbm(x * 0.3, y * 0.3, seed, 2) - 0.5) * 0.3 * detail);
        let top2;
        let k = Math.min(0.96, style.airAmount + (1 - style.airAmount) * fade * 0.8);
        // Ventanas: algunas encendidas; su luz atraviesa el aire
        const [gx, gy] = [Math.floor((x - x0 - 2) / 4), Math.floor((y - top - 3) / 5)];
        const inWindow = (x - x0 - 2) % 4 < 2 && (y - top - 3) % 5 < 2 && x - x0 > 1 && x < x0 + bw - 2 && y > top + 2 && gx >= 0;
        if (inWindow) {
          if (hash(gx * 7 + b, gy, seed) > 0.72) {
            c = rgb(hash(gx, gy * 3 + b, seed) > 0.85 ? '#8fd8e0' : '#ffcf8a');
            k *= 0.6;
            top2 = 0.5;
          } else c = mix(c, ink, 0.3 * detail);
        }
        put(x, y, far(c, y, k, top2), front);
      }
    }
    const roofTone = far(mix(tone, ink, 0.3), top);
    if (kind === 1) { // una cúpula, con su remate
      const r = bw * 0.28;
      for (let dy = 0; dy < r * 1.1 + 4; dy++) for (let x = x0; x < x0 + bw; x++) { if (Math.hypot((x + 0.5 - x0 - bw / 2) / r, dy / (r * 1.1)) < 1 || (Math.abs(x + 0.5 - x0 - bw / 2) < 1 && dy < r * 1.1 + 4)) put(x, top - 1 - dy, roofTone, front); }
    }
    if (kind === 2) for (let tier = 0; tier < 2; tier++) for (let dy = 0; dy < 3; dy++) for (let x = x0 - 2 + dy + tier * 3; x < x0 + bw + 2 - dy - tier * 3; x++) put(x, top - 1 - dy - tier * 5, roofTone, front);
    if (kind === 2) for (let dy = 0; dy < 8; dy++) for (let x = x0 + 4; x < x0 + bw - 4; x++) put(x, top - 1 - dy, roofTone, front);
    if (kind === 0) for (let dy = 0; dy < 4; dy++) for (let x = 0; x < 4; x++) put(x0 + Math.floor(bw * 0.6) + x, top - 1 - dy, roofTone, front); // el tinaco
    if (kind === 3) {
      for (let dy = 0; dy < 9; dy++) put(x0 + Math.floor(bw / 2), top - 1 - dy, roofTone, front);
      for (const dy of [5, 7]) for (let x = -2; x <= 2; x++) put(x0 + Math.floor(bw / 2) + x, top - 1 - dy, roofTone, front);
    }
  }
  return out;
}
