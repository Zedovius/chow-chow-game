// Los jefes sin brazos: la Serpiente y el Dragón. Atacan con la boca, que se abre (jaw: 0, cerrada; 1, a medias; 2,
// abierta), y mueven todo el cuerpo: una ola los recorre de la cabeza a la cola. El pecho casi no se mueve, porque ahí
// está el medallón (su punto débil). Mismas medidas que los demás (jefesModelos.mjs).

import { add, bangles, collar, curve, GOLD, INK, IVORY, medal, rad, ripple, scaled, scowl, tooth, turn } from './jefesPiezas.mjs';
import { lerp, TAU } from './modelo3d.mjs';

const { sin, cos, abs, hypot, atan2, min, max, floor } = Math;
const OPEN = [4, 26, 46]; // grados que abre la boca

// Las cabezas, grandes y arriba, para que la boca abierta se vea sobre el medallón
const HEAD = { k: 1.24, from: [0, 13, 0], move: [-2.4, 5, 0] };
const place = ([x, y]) => [HEAD.from[0] + (x - HEAD.from[0]) * HEAD.k + HEAD.move[0], HEAD.from[1] + (y - HEAD.from[1]) * HEAD.k + HEAD.move[1]];

export const LONG = {
  snake(m, t, jaw) {
    const back = ['#4a9a3a', '#2a6a30'];
    const skin = { back, belly: '#ead078', spot: '#8ad04a' };
    for (let ring = 0; ring < 2; ring++) { // las vueltas en el suelo, que giran despacio
      const R = 14.6 - ring * 2.6;
      const pts = Array.from({ length: 27 }, (_, i) => {
        const a = (i / 26) * TAU + ring * 1.3;
        const w = sin(a * 2 - t * TAU + ring * 2) * 1.3;
        return [4.6 + cos(a) * (R + w * 0.6), -19.4 + ring * 7.2 + w, sin(a) * R * 0.7];
      });
      scaled(m, pts, () => 5.2 - ring * 0.2, { ...skin, group: `coil${ring}`, tick: -t * 11.4 });
    }
    // La cola, que se alza y tiembla
    const end = ripple(curve([[14, -19, -8], [23, -17, -6], [27, -8, -4], [24, 1, -4], [28, 9, -4], [26, 15, -4]], 16), t, (k) => k * 4, 1.1);
    scaled(m, end, (k) => lerp(4.4, 1.2, k), { ...skin, group: 'tail', tick: -t * 8 });
    end.slice(-4).forEach((p, i) => m.ball(p, 2.4 - i * 0.3, { color: i % 2 ? '#f4cc66' : GOLD, mat: 'gold', group: `rattle${i}`, over: 2 }));
    // El cuerpo que se alza y se mece
    const sway = (y) => sin(TAU * t - y * 0.16) * 1.5 * min(1, abs(y) / 7);
    const rise = [[11, -14, 5], [7, -9, 5.4], [1, -4, 4.4], [-1, 2, 3.2], [2, 9, 1.6], [1, 17, 0]].map((p) => [p[0] + sway(p[1]), p[1], p[2]]);
    scaled(m, curve(rise, 16), (k) => lerp(8.4, 6.2, k), { ...skin, side: -1, group: 'rise', tick: -t * 6 });
    // La capucha, con sus dos ojos pintados
    const hx = sway(12);
    m.ball([4.4 + hx, 16, -3], [12, 13.6, 3.4], {
      mat: 'scale', group: 'hood', blend: 1,
      color: (l) => {
        const d = hypot(l[0] - 5.4, l[1] - 2);
        if (d < 1.5) return INK;
        if (d < 2.8) return '#f4cc4a';
        if (hypot(l[0] / 12, l[1] / 13.6) > 0.86) return '#c83a2a';
        return sin(l[1] * 2.2 + abs(l[0])) > 0.5 ? back[1] : '#3f8a38';
      },
    });
    // La cabeza y su boca
    const [dx, dy] = [sway(17), sin(TAU * t) * 0.7];
    m.within(HEAD, () => {
    const H = (x, y, z) => [x + dx, y + dy, z];
    const face = (l, at) => (sin(at[0] * 1.8) * cos(at[1] * 1.9) > 0.5 ? '#8ad04a' : back[0]);
    m.ball(H(-3, 17, 0), [7.4, 5.8, 6.6], { color: face, mat: 'scale', group: 'head', blend: 2 });
    m.limb(H(-5, 16.6, 0), H(-14, 14.6, 0), 4.8, 3.2, { color: face, mat: 'scale', group: 'head', blend: 2 });
    for (const z of [1.8, -1.8]) m.ball(H(-16.2, 16, z), [0.8, 0.6, 0.6], { color: INK, mat: 'skin', group: `n${z}`, over: 2 });
    const pivot = H(-3.4, 13, 0);
    const J = (x, y, z) => turn(add(pivot, [x, y, z]), rad(OPEN[jaw]), pivot);
    m.limb(J(0, 0, 0), J(-10.4, 0.2, 0), 3.2, 1.9, { color: '#d8c868', mat: 'scale', group: 'jaw', blend: 1 });
    if (jaw) for (const k of [0.3, 0.6]) m.limb(pivot, turn(add(pivot, [-8.4, 0.6, 0]), rad(OPEN[jaw]) * k, pivot), 2.4, 1.7, { color: '#5a0a1c', mat: 'skin', group: 'throat', over: -1 });
    for (const s of [2, -2]) {
      m.limb(H(-12.4, 12.8, s), H(-13.2, 9 - jaw * 0.6, s), 0.95, 0.15, { color: '#faf4e4', mat: 'horn', group: `fang${s}`, over: 4 });
      m.limb(J(-9, 1.2, s), J(-9.4, 3.4, s), 0.65, 0.15, { color: '#faf4e4', mat: 'horn', group: `low${s}`, over: 4 });
    }
    const flick = jaw ? 1 : max(0, sin(t * TAU * 3)) * 0.8;
    if (flick > 0.1) {
      const tip = J(-12 - flick * 5, 2.4 + sin(t * TAU * 4) * 0.8, 1);
      m.limb(J(-6, 1.6, 1), tip, 0.75, 0.5, { color: '#f02c50', mat: 'skin', group: 'tongue', over: 3 });
      for (const s of [1.3, -1.3]) m.limb(tip, add(tip, [-2.6, s, 0]), 0.5, 0.15, { color: '#f02c50', mat: 'skin', group: 'tongue', over: 3 });
    }
    scowl(m, H(-10.4, 18, 4.2), H(-2.6, 21, 5.4), '#1c4a24', 1.7);
    });
    collar(m, t, { from: [8 + hx * 0.4, 11.4, 4], to: [-3, 7.4, 9.6], bulge: 2.6 });
    medal(m, (u, v) => abs(hypot(u, v) - 0.58) < 0.15 || hypot(u, v) < 0.18); // el disco bi
    return { eye: place([-8 + dx, 16.8 + dy]) };
  },
  dragon(m, t, jaw) {
    const skin = { back: ['#d82c24', '#9a1a1e'], belly: '#f4c04a', spot: '#ff6a3a', crest: ['#1c9a80', '#7af0d0'] };
    // El cuerpo da vueltas por el aire y una ola lo recorre
    const base = curve([[-1, 1, 5], [3, -7, 6], [10, -15, 4], [20, -16, -1], [27, -8, -4], [25, 3, -2], [18, 9, 2], [20, 18, 3], [30, 21, 0], [38, 13, -3], [41, 2, -3], [49, -3, -2], [55, 3, -2]], 46);
    const path = ripple(base, t, (k) => min(1, k * 4) * (2.4 + k * 3), 2.1);
    scaled(m, path, (k) => (k < 0.1 ? lerp(7.8, 7.4, k * 10) : lerp(7.4, 1.2, ((k - 0.1) / 0.9) ** 1.15)), { ...skin, tick: -t * 5.7 });
    const last = path.at(-1);
    for (const [ax, ay] of [[6, 2], [5, 6], [4, -3]]) m.limb(last, add(last, [ax, ay + sin(t * TAU + ax) * 1.6, 0]), 2, 0.2, { color: (l) => (l[0] > 0.5 ? '#7af0d0' : '#1c9a80'), mat: 'feather', group: `tip${ay}` });
    m.limb([0, 18, 0], [-1, 2, 3], 6.4, 7.6, { color: (l, at) => (at[0] < -2.4 ? (sin(at[1] * 2.4) > 0.4 ? '#a8742a' : '#f4c04a') : sin(at[0] * 2) * cos(at[1] * 2.2) > 0.5 ? '#ff6a3a' : '#c8261f'), mat: 'scale', group: 'chest', blend: 2 });
    // Las cuatro patas reman, cada una a su tiempo
    const [hind, rear] = [path[floor(path.length * 0.34)], path[floor(path.length * 0.56)]];
    [
      [[1, -6, 8], [-4, -13, 10], [-9, -19, 10], 0], [[4, -7, -5], [0, -15, -6], [-5, -21, -6], 0.5],
      [[hind[0], hind[1] - 4, 4], [hind[0] - 2, hind[1] - 9, 7], [hind[0] - 7, hind[1] - 14, 7], 0.3],
      [[rear[0], rear[1] - 3, -2], [rear[0] + 1, rear[1] - 8, 3], [rear[0] - 4, rear[1] - 12, 3], 0.8],
    ].forEach(([hip, knee, foot, ph], i) => {
      const w = sin(TAU * (t + ph));
      const K = add(knee, [w * 1.4, w, 0]);
      const F = add(foot, [w * 3, cos(TAU * (t + ph)) * 2.2, 0]);
      const over = i === 0 ? 1 : 0;
      m.limb(hip, K, 3.4, 2.3, { color: '#c8261f', mat: 'scale', group: `leg${i}`, over });
      m.limb(K, F, 2.2, 1.6, { color: '#e03a2a', mat: 'scale', group: `leg${i}`, over });
      bangles(m, add(F, [(K[0] - F[0]) * 0.36, (K[1] - F[1]) * 0.36, 0]), add(F, [(K[0] - F[0]) * 0.1, (K[1] - F[1]) * 0.1, 0]), 2.1, `l${i}`);
      for (const [ax, ay] of [[-4.2, -0.6], [-3.4, -2.8], [-1, -3.8]]) {
        const tip = add(F, [ax * 0.6, ay * 0.6, 0.6]);
        m.limb(F, tip, 1.3, 1, { color: '#f0603a', mat: 'scale', group: `foot${i}` });
        m.limb(tip, add(F, [ax * 1.4, ay * 1.3, 0.8]), 0.95, 0.15, { color: IVORY, mat: 'horn', group: `cl${i}${ax}`, over: 2 });
      }
    });
    // La cabeza, con su melena de llamas
    const [dx, dy] = [sin(TAU * t) * 1.3, cos(TAU * t) * 1.1];
    m.within(HEAD, () => {
    const H = (x, y, z) => [x + dx, y + dy, z];
    const face = (l, at) => (sin(at[0] * 1.9) * cos(at[1] * 2) > 0.5 ? '#ff6a3a' : '#d82c24');
    for (let i = 0; i < 14; i++) {
      const a = rad(95 - i * 16);
      const root = H(1 + cos(a) * 3, 15.6 + sin(a) * 4, i % 2 ? -1 : 2.4);
      const w = sin(TAU * t - i * 0.7) * 1.8;
      m.chain([root, add(root, [cos(a) * 5.4 + 2, sin(a) * 5 + w * 0.5, 0]), add(root, [cos(a) * 8.6 + 5.4, sin(a) * 8 + w * 1.4, 0])], 2.6, 0.25, { color: (l) => (i % 3 === 0 ? '#7af0d0' : i % 2 ? '#1c8a74' : '#38c0a0'), mat: 'feather', group: `mane${i % 4}`, over: i % 2, blend: 0.6 });
    }
    m.ball(H(-3, 17.4, 0), [6.8, 6, 6.4], { color: face, mat: 'scale', group: 'head', blend: 2 });
    m.limb(H(-5, 16.6, 0), H(-15.4, 14.6, 0), 4.6, 3, { color: face, mat: 'scale', group: 'head', blend: 2 });
    m.ball(H(-16, 16.6, 0), [2.4, 2, 3.4], { color: '#f0503a', mat: 'scale', group: 'head', blend: 1.4 });
    for (const z of [2.2, -2]) m.ball(H(-17.8, 17, z), [0.8, 0.8, 0.8], { color: INK, mat: 'skin', group: `n${z}`, over: 2 });
    m.limb(H(-8, 12.6, 3.4), H(-15.6, 12.2, 2.4), 0.8, 0.8, { color: '#f4c04a', mat: 'scale', group: 'lip', over: 1 });
    const pivot = H(-3.6, 12.8, 0);
    const J = (x, y, z) => turn(add(pivot, [x, y, z]), rad(OPEN[jaw]), pivot);
    m.limb(J(0, 0, 0), J(-11, 0, 0), 3, 1.9, { color: (l) => (l[0] > 0.3 ? '#f4c04a' : '#c8261f'), mat: 'scale', group: 'jaw', blend: 1 });
    if (jaw) for (const k of [0.3, 0.6]) m.limb(pivot, turn(add(pivot, [-8.6, 0.6, 0]), rad(OPEN[jaw]) * k, pivot), 2.6, 1.8, { color: '#5a0a14', mat: 'skin', group: 'throat', over: -1 });
    m.limb(J(-4, 1.8, 0.6), J(-10 - jaw, 2.4, 0.6), 1.4, 0.7, { color: '#f04a64', mat: 'skin', group: 'tongue', over: 1 });
    for (const x of [-14.4, -11.6, -9]) tooth(m, H(x, 12.8, 3), x < -14 ? -3.4 : -2.2, 0.85);
    for (const x of [-9.8, -7.4]) m.limb(J(x, 1, 2.4), J(x - 0.2, 3.4, 2.4), 0.8, 0.15, { color: '#f6eed8', mat: 'horn', group: `lt${x}`, over: 4 });
    for (let i = 0; i < 4; i++) m.limb(J(-3 - i * 2, -1.6, 1), add(J(-2 - i * 2, -7, 2), [sin(TAU * t + i), 0, 0]), 1.4, 0.25, { color: i % 2 ? '#38c0a0' : '#7af0d0', mat: 'feather', group: 'beard', blend: 0.6 });
    for (const s of [1, -1]) { // los cuernos de venado y los bigotes
      const z = 3.6 * s;
      const horn = { mat: 'horn', group: `antler${s}`, over: s > 0 ? 2 : 0 };
      m.chain([H(-1, 21.6, z), H(3, 26, z * 1.3), H(7, 29, z * 1.5), H(12, 33, z * 1.6)], 1.6, 0.35, { ...horn, color: (l, at) => (sin(at[0] * 2 + at[1]) > 0.4 ? '#c89a52' : '#f4dca0') });
      m.limb(H(4, 27, z * 1.35), H(3, 32.8, z * 1.5), 1, 0.25, { ...horn, color: '#f4dca0' });
      const w = (k) => sin(TAU * (t - k * 0.4) + s) * 2.2 * k;
      m.chain([H(-15.6, 15.4, 3.4 * s), H(-20, 13.6 + w(0.5), 4.4 * s), H(-23, 8.4 + w(1), 5 * s), H(-21.6, 2 + w(1.4), 5 * s)], 0.8, 0.3, { color: '#f4c04a', mat: 'horn', group: `wh${s}`, over: s > 0 ? 3 : 0 });
    }
    for (const [x, y] of [[-10.6, 19], [-8, 20.6]]) m.limb(H(x, y - 1, 4.4), H(x + 5, y + 3, 5), 1.5, 0.25, { color: '#7af0d0', mat: 'feather', group: `bw${x}`, over: 3 });
    scowl(m, H(-10.8, 18.2, 4.4), H(-3.4, 21, 5.6), '#5a0c12', 1.5);
    });
    collar(m, t, { from: [8, 13.4, 2], to: [-3, 7.2, 9.6], bulge: 7, red: '#7a2a9a' });
    medal(m, (u, v) => { // la perla
      const d = hypot(u, v);
      return abs(((atan2(v, u) / TAU + d * 1.2 + 2) % 1) - 0.5) < 0.2 && d < 0.85;
    });
    return { eye: place([-8.2 + dx, 17.2 + dy]) };
  },
};
