// Los esqueletos de los animales de cuatro patas: patas articuladas (hombro, codo, muñeca y pie; cadera,
// rodilla, corvejón y pie) y la forma de andar de cada especie. Un rig da, para cada momento del paso
// (phase, de 0 a 1), dónde está cada hueso; animales.mjs lo viste.

import { Model, add, clamp, joint, lerp, mul, rot, TAU } from './modelo3d.mjs';

const smooth = (k) => k * k * (3 - 2 * k);
const wave = (p, peak, sharp = 1) => {
  // Una onda que vale 1 en peak y -1 medio ciclo después
  const c = Math.cos((p - peak) * TAU);
  return sharp === 1 ? c : Math.sign(c) * Math.abs(c) ** sharp;
};

/**
 * Las formas de andar. feet: en qué momento del ciclo se apoya cada pata (nf: delantera de este lado, ff:
 * delantera del otro, nh y fh: traseras); duty: qué parte del ciclo está apoyada (delanteras, traseras);
 * stride: cuánto avanza en un ciclo (pixeles); lift: cuánto levanta los pies; over: cuánto se estira más
 * allá de donde apoya. bounce: subidas y bajadas del cuerpo (n por ciclo, la más alta en peak); pitch:
 * cabeceo (amp; hacia arriba en up); stretch: el lomo se estira (amp; en peak); arch: se encorva al
 * recogerse; nod: la cabeza (dx, dy; arriba en up).
 */
export const GAITS = {
  // Galope de caballo (transversal): atrás, atrás, adelante, adelante, y un momento en el aire, recogido
  gallop: { feet: { nh: 0, fh: 0.12, nf: 0.36, ff: 0.5 }, duty: [0.26, 0.26], stride: 46, lift: [5, 4], over: 2.5, bounce: { n: 1, amp: 1.1, peak: 0.88 }, pitch: { amp: 0.09, up: 0.1 }, stretch: { amp: 1.1, peak: 0.36 }, arch: 0.5, nod: { x: 1.1, y: 1, up: 0.95 } },
  // Galope de felino (rotatorio): dos vuelos por ciclo, el lomo se dobla como un resorte
  bound: { feet: { nh: 0, fh: 0.1, ff: 0.46, nf: 0.56 }, duty: [0.22, 0.22], stride: 48, lift: [4, 3.4], over: 3.4, bounce: { n: 2, amp: 1, peak: 0.36 }, pitch: { amp: 0.1, up: 0.2 }, stretch: { amp: 3, peak: 0.36 }, arch: 1.9, nod: { x: 0.8, y: 0.7, up: 0.3 } },
  // Galope de perro chow: corto y rebotado, con las traseras tiesas
  dog: { feet: { nh: 0, fh: 0.1, ff: 0.45, nf: 0.55 }, duty: [0.27, 0.27], stride: 36, lift: [3.2, 2.4], over: 1.6, bounce: { n: 2, amp: 1.2, peak: 0.34 }, pitch: { amp: 0.09, up: 0.15 }, stretch: { amp: 1.3, peak: 0.35 }, arch: 0.9, nod: { x: 0.5, y: 0.9, up: 0.25 } },
  // Buey: pesado, casi sin despegar; la cabeza sube y baja con cada manotazo
  lumber: { feet: { nh: 0, fh: 0.24, nf: 0.46, ff: 0.7 }, duty: [0.42, 0.42], stride: 30, lift: [2.6, 2], over: 0.6, bounce: { n: 2, amp: 0.6, peak: 0.16 }, pitch: { amp: 0.06, up: 0.2 }, stretch: { amp: 0.5, peak: 0.4 }, arch: 0.3, nod: { x: 0.6, y: 1.3, up: 0.2 } },
  // Trote cortito y rápido (cerdo): patas en diagonal
  trot: { feet: { nh: 0, ff: 0.02, fh: 0.5, nf: 0.52 }, duty: [0.42, 0.42], stride: 19, lift: [2, 1.8], over: 0.3, bounce: { n: 2, amp: 0.7, peak: 0.25 }, pitch: { amp: 0.035, up: 0.1 }, stretch: { amp: 0.2, peak: 0.3 }, arch: 0, nod: { x: 0.3, y: 0.5, up: 0.3 } },
  // Correteo de rata: pegada al suelo, muy rápido
  scurry: { feet: { nh: 0, ff: 0.06, fh: 0.5, nf: 0.56 }, duty: [0.46, 0.46], stride: 18, lift: [1.5, 1.3], over: 0.3, bounce: { n: 2, amp: 0.35, peak: 0.25 }, pitch: { amp: 0.03, up: 0.1 }, stretch: { amp: 0.6, peak: 0.25 }, arch: 0.4, nod: { x: 0.4, y: 0.2, up: 0.4 } },
  // Cabra: saltarina, rebota con las cuatro patas y levanta mucho las rodillas
  spring: { feet: { nh: 0, fh: 0.08, ff: 0.34, nf: 0.44 }, duty: [0.24, 0.24], stride: 34, lift: [4.6, 3.2], over: 1.2, bounce: { n: 1, amp: 2.1, peak: 0.78 }, pitch: { amp: 0.15, up: 0.16 }, stretch: { amp: 0.7, peak: 0.3 }, arch: 0.5, nod: { x: 0.5, y: 0.8, up: 0.7 } },
  // Conejo: salta con las dos traseras juntas, que pasan por fuera y por delante de las manos
  hop: { feet: { nh: 0, fh: 0.03, ff: 0.5, nf: 0.6 }, duty: [0.16, 0.24], stride: 40, lift: [3, 3.6], over: 1.6, bounce: { n: 1, amp: 2, peak: 0.36 }, pitch: { amp: 0.26, up: 0.14 }, stretch: { amp: 1.8, peak: 0.33 }, arch: 1.4, nod: { x: 0.4, y: 0.5, up: 0.3 } },
  // Mono: a cuatro patas, los brazos juntos adelante y luego las piernas
  knuckle: { feet: { nf: 0, ff: 0.1, nh: 0.46, fh: 0.54 }, duty: [0.3, 0.24], stride: 34, lift: [3.6, 2.6], over: 1.6, bounce: { n: 1, amp: 1.2, peak: 0.8 }, pitch: { amp: 0.2, up: 0.62 }, stretch: { amp: 1, peak: 0.86 }, arch: 1, nod: { x: 0.3, y: 0.7, up: 0.7 } },
};

/** Un pie en un momento de su ciclo: { x (desde su lugar), y, fold (0 a 1: doblado), push (-1 a 1), down }. */
export function foot(p, duty, stride, lift, over) {
  const a = (stride * duty) / 2;
  p = ((p % 1) + 1) % 1;
  if (p < duty) {
    const u = p / duty;
    return { x: a - 2 * a * u, y: 0, fold: 0, push: u * 2 - 1, down: true };
  }
  const u = (p - duty) / (1 - duty);
  // Sale hacia atrás, se recoge, pasa por debajo y se estira hacia adelante antes de apoyar
  const x = u < 0.82 ? lerp(-a - over * 0.5 * Math.sin(Math.min(1, u * 4) * Math.PI), a + over, smooth(u / 0.82)) : lerp(a + over, a, smooth((u - 0.82) / 0.18));
  return { x, y: lift * Math.sin(Math.PI * u ** 0.85), fold: Math.sin(Math.PI * Math.min(1, u * 1.12)) ** 0.8, push: 1 - 2 * u, down: false };
}

/**
 * El esqueleto en un momento. def: las medidas del animal; pose: { body: [dx, dy], pitch, stretch, arch,
 * feet: { nf, ff, nh, fh } (cada una { x, y, fold, push }), head: [dx, dy, giro], lag, phase }.
 * Devuelve { hip, mid, chest, neck, head, legs, T, pitch }.
 */
export function skeleton(def, pose) {
  const { len, height } = def;
  const root = [def.x + (pose.body?.[0] ?? 0), height + (pose.body?.[1] ?? 0)];
  const pitch = pose.pitch ?? 0;
  const half = (len + (pose.stretch ?? 0)) / 2;
  const T = ([x, y, z = 0]) => add(rot([x, y, z], pitch), [root[0], root[1], 0]);
  const hip = T([-half, def.hipY ?? 0]);
  const chest = T([half, def.chestY ?? 0]);
  const mid = T([0, (def.midY ?? 0) + (pose.arch ?? 0)]);
  const hipAt = [def.x - len / 2, 0];
  const chestAt = [def.x + len / 2, 0];
  const legs = {};
  for (const name of ['nf', 'ff', 'nh', 'fh']) {
    const front = name[1] === 'f';
    const spec = front ? def.front : def.hind;
    const z = (name[0] === 'n' ? 1 : -1) * spec.z;
    const f = pose.feet[name];
    const base = front ? chest : hip;
    const at = front ? chestAt : hipAt;
    const top = add(base, [...rot([spec.at[0], spec.at[1]], pitch).slice(0, 2), z]);
    // Cada pie, en su lugar bajo el hombro o la cadera (del mundo: así los apoyados no patinan), o
    // siguiendo al cuerpo (free: en el aire)
    const origin = f.free ? [top[0] - spec.at[0] + (spec.foot ?? 0), 0] : [at[0] + spec.at[0] + (spec.foot ?? 0) - (f.out ?? 0), 0];
    const paw = f.free ? [top[0] + f.x, top[1] + f.y, z * (f.wide ?? 1)] : [origin[0] + f.x, f.y + spec.sole, z * (f.wide ?? 1)];
    // El metacarpo (o el metatarso): casi vertical apoyado; se inclina al empujar y se dobla al levantarse
    const lean = front
      ? lerp(0.12 * f.push, 1.5, f.fold) // la muñeca se dobla: el pie queda atrás
      : lerp(-0.42 + 0.5 * (f.push + 1) * 0.5, 0.95, f.fold * 0.9); // el corvejón queda atrás del pie
    const up = [Math.sin(lean), Math.cos(lean)];
    const wrist = [paw[0] + up[0] * spec.l[2], paw[1] + up[1] * spec.l[2], lerp(top[2], paw[2], 0.8)];
    const knee = joint(top, wrist, spec.l[0], spec.l[1], front ? -1 : 1);
    knee[2] = lerp(top[2], paw[2], 0.45);
    legs[name] = { top, knee, wrist, paw, front, far: name[0] === 'f', down: f.down };
  }
  const neckBase = T([half + def.neck.at[0], (def.chestY ?? 0) + def.neck.at[1]]);
  const [hx, hy, turn = 0] = pose.head ?? [0, 0, 0];
  const neckTop = add(neckBase, [...rot(def.neck.to, pitch * 0.5).slice(0, 2), 0].map((v, i) => v + ([hx, hy, 0][i])));
  const head = add(neckTop, [...def.headAt, 0]);
  return { hip, mid, chest, neckBase, neckTop, head, headTurn: (def.headTurn ?? 0) + turn + pitch * 0.35, legs, T, pitch, root, half };
}

/** La pose de un momento de la carrera. */
export function runPose(gait, phase, def) {
  const { feet, duty, stride, lift, over, bounce, pitch, stretch, arch, nod } = gait;
  const out = {};
  for (const name of Object.keys(feet)) {
    const front = name[1] === 'f';
    out[name] = foot(phase - feet[name], duty[front ? 0 : 1], stride, lift[front ? 0 : 1], over);
  }
  // Las traseras del conejo pasan por fuera de las manos
  if (gait === GAITS.hop) for (const name of ['nh', 'fh']) out[name].wide = out[name].down ? 1.1 : 1.35;
  const s = wave(phase, stretch.peak);
  return {
    feet: out,
    body: [0, bounce.amp * Math.cos((phase - bounce.peak) * TAU * bounce.n)],
    pitch: pitch.amp * wave(phase, pitch.up),
    stretch: stretch.amp * s,
    arch: arch * Math.max(0, -s) - arch * 0.25 * Math.max(0, s),
    head: [nod.x * s * 0.6, nod.y * wave(phase, nod.up), 0],
    phase,
    lag: wave(phase, bounce.peak - 0.12),
    gather: Math.max(0, -s),
    def,
  };
}

/** De pie o en el aire, con cada pie en su lugar: feet: { f: [x, y, fold], h: [x, y, fold] } por lado. */
export function holdPose({ front, hind, spread = 0.8, body = [0, 0], pitch = 0, stretch = 0, arch = 0, head = [0, 0, 0], lag = 0, phase = 0, free = true, wide = 1 }) {
  const make = ([x, y, fold = 0, push = 0], dx) => ({ x: x + dx, y, fold, push, free, down: !free, wide });
  return {
    feet: { nf: make(front, 0), ff: make(front, -spread), nh: make(hind, 0), fh: make(hind, spread) },
    body, pitch, stretch, arch, head, lag, phase,
  };
}

/**
 * Viste las patas: spec.r: radios [muslo arriba, rodilla, corvejón, pie]; color: de la pata, y shin (la
 * caña) y hoof (el pie) si son de otro color.
 */
export function drawLegs(m, legs, def) {
  for (const [name, leg] of Object.entries(legs)) {
    const spec = leg.front ? def.front : def.hind;
    const { r, color, shin = color, hoof = shin, hoofR = r[3] } = spec;
    const group = `leg-${name}`;
    const over = leg.far ? 0 : 2;
    m.limb(leg.top, leg.knee, r[0], r[1], { color, group, over: spec.blendTop && !leg.far ? 1 : over });
    m.limb(leg.knee, leg.wrist, r[1], r[2], { color: spec.mid ?? color, group, over });
    m.limb(leg.wrist, leg.paw, r[2], r[3], { color: shin, group, over });
    const toe = add(leg.paw, [spec.toe ?? 0.7, hoofR * 0.35 - 0.25, 0]);
    m.limb(add(leg.paw, [0, hoofR * 0.35 - 0.25, 0]), toe, hoofR, hoofR * 0.86, { color: hoof, group: `${group}-hoof`, over: over + 0.5, blend: 0 });
  }
}

/** Una cola (o crin, o listón): n eslabones desde at, con largo, un ángulo de base y una onda que viaja. */
export function tailPoints(at, { n = 6, length, angle, curl = 0, sway = 0.35, phase = 0, speed = 1, delay = 0.12, z = 0, zSway = 0 }) {
  const points = [[...at.slice(0, 2), (at[2] ?? 0) + z]];
  let a = angle;
  for (let i = 1; i <= n; i++) {
    a += curl / n;
    const k = i / n;
    const bend = a + sway * k * Math.sin((phase * speed - delay * i) * TAU);
    const last = points[i - 1];
    points.push([last[0] + (Math.cos(bend) * length) / n, last[1] + (Math.sin(bend) * length) / n, last[2] + zSway * Math.cos((phase * speed - delay * i) * TAU) * k]);
  }
  return points;
}

/** Los puntos de la cabeza: de coordenadas locales (x al frente, y arriba) al modelo. */
export const headMap = (s) => (p) => add([...rot([p[0], p[1]], s.headTurn).slice(0, 2), p[2] ?? 0], s.head);

export { Model, add, clamp, lerp, mul, rot, wave, TAU };
