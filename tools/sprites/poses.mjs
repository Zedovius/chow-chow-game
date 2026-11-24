// Los cuadros de cada animal de cuatro patas: correr, esperar, saltar, caer, agacharse, ir en la nube,
// el golpe y la caída. Cada cuadro es un Model (modelo3d.mjs).

import { GAITS, holdPose, runPose, skeleton, TAU } from './rigs.mjs';

export const RUN = 12; // cuadros de un ciclo de carrera
export const IDLE = 6;
export const DUCK = 8;
export const RIDE = 6; // en la nube, meciéndose...
export const PRESS = 3; // ...y al aletear: se agacha, se impulsa y se suelta

const GAIT = { rat: 'scurry', ox: 'lumber', tiger: 'bound', rabbit: 'hop', horse: 'gallop', goat: 'spring', monkey: 'knuckle', dog: 'dog', pig: 'trot' };

const total = (l) => l[0] + l[1] + l[2];

/** El cuerpo, a la altura que deja el pie más bajo en y (los pies van colgando del cuerpo). */
function rest(def, pose, y = 0.4) {
  const s = skeleton(def, pose);
  const lowest = Math.min(...Object.values(s.legs).map((leg) => leg.paw[1] - (leg.front ? def.front : def.hind).sole));
  return { ...pose, body: [pose.body[0], pose.body[1] + y - lowest] };
}

/** Las medidas de un animal agachado: aplastado contra el suelo, con el cuello hacia adelante. */
function low(def) {
  const flat = (r) => [r[0], Math.min(r[1], 2.9), r[2]];
  const leg = (spec) => ({ ...spec, l: spec.l.map((v) => v * Math.min(1, 4.4 / total(spec.l))), at: [spec.at[0], -0.4], r: spec.r.map((v) => Math.min(v, 1.5)), z: spec.z + 0.3 });
  return {
    ...def,
    height: 3.7,
    hipY: 0, midY: -0.1, chestY: -0.2,
    hipR: flat(def.hipR), midR: flat(def.midR), chestR: flat(def.chestR),
    neck: { ...def.neck, at: [Math.min(def.neck.at[0], 1.6), 0.1], to: [Math.min(2, Math.max(def.neck.to[0], 1.2)), 0.2], r: def.neck.r.map((v) => Math.min(v, 2.5)) },
    headAt: [1.4, 0.1],
    front: leg(def.front),
    hind: leg(def.hind),
  };
}

/** Todos los cuadros: { anim: [pose, ...] }. */
export function quadrupedPoses(id, def) {
  const gait = GAITS[GAIT[id]];
  const lf = total(def.front.l);
  const lh = total(def.hind.l);
  const lowDef = low(def);
  const each = (n, fn) => Array.from({ length: n }, (_, i) => fn(i / n, i));
  const air = (front, hind, extra) => rest(def, holdPose({ front: [front[0] * lf, front[1] * lf, front[2]], hind: [hind[0] * lh, hind[1] * lh, hind[2]], spread: 1.6, ...extra }));

  const run = each(RUN, (k) => runPose(gait, k, def));
  const idle = each(IDLE, (k) => {
    const sway = Math.sin(k * TAU);
    return holdPose({ front: [0, 0], hind: [0, 0], spread: 1.4, free: false, body: [0, -0.35 - sway * 0.3], head: [0, sway * 0.4, 0], lag: -sway * 0.6, phase: k });
  });
  const jump = [
    air([0.2, -0.42, 0.95], [-0.5, -0.76, 0.1], { pitch: 0.34, stretch: 0.8, head: [0, 0.4, 0.1], lag: 1, phase: 0.1 }), // se impulsa con las traseras
    air([0.5, -0.46, 0.6], [-0.68, -0.4, 0.3], { pitch: 0.17, stretch: 1.4, head: [0.4, 0.2, 0], lag: 0.6, phase: 0.3 }), // se estira
    air([0.3, -0.42, 0.85], [-0.05, -0.44, 0.75], { pitch: 0, arch: 0.6, lag: 0, phase: 0.5 }), // arriba, recogido
  ];
  const fall = [
    air([0.42, -0.62, 0.35], [-0.3, -0.5, 0.6], { pitch: -0.13, stretch: 0.6, head: [0, 0.5, 0.1], lag: -0.8, phase: 0.7 }),
    air([0.34, -0.8, 0.05], [0.05, -0.52, 0.6], { pitch: -0.22, head: [0, 0.8, 0.15], lag: -1, phase: 0.9 }), // busca el suelo con las manos
  ];
  const duckGait = { ...GAITS.scurry, stride: 18, lift: [1.1, 0.9], bounce: { n: 2, amp: 0.25, peak: 0.25 } };
  // El buey agacha los cuernos hacia adelante; los demás, la cabeza pegada al suelo
  const bow = { ox: -0.55, goat: 0.5 }[id] ?? 0.05;
  const duck = each(DUCK, (k) => ({ ...runPose(duckGait, k, lowDef), head: [0.2 * Math.sin(k * TAU), 0.15 * Math.sin(k * TAU * 2), bow], lag: 1, ears: 1.45, flat: true, def: lowDef }));
  // Echado en la nube, con las patas recogidas; al aletear, se aplasta y se impulsa
  const lie = (k, dip = 0, up = 0) => {
    const sway = Math.sin(k * TAU);
    const height = Math.max(def.chestR[1], def.hipR[1]) * 0.86 + 0.6;
    return {
      ...holdPose({
        front: [0.34 * lf, -Math.min(0.5 * lf, height - 0.6), 0.85], hind: [0.12 * lh, -Math.min(0.5 * lh, height - 0.6), 0.75],
        spread: 1.2, pitch: 0.1 + up * 0.1, body: [0, height - def.height + sway * 0.25 - dip], head: [0.3, 0.3 + sway * 0.4 - dip * 0.4 + up * 0.8, 0.04], lag: up - dip * 0.8 - sway * 0.3, phase: k,
      }),
    };
  };
  // El mono va en cuclillas, con una mano en la nube y la otra al frente
  const squat = (k, dip = 0, up = 0) => {
    const sway = Math.sin(k * TAU);
    const pose = holdPose({ front: [0, 0], hind: [1.6, -4.3, 0.3], spread: 0.8, pitch: 0.62, body: [0.4, -1.9 + sway * 0.25 - dip], head: [0, 0.2 + sway * 0.3 + up * 0.6, -0.5], lag: up - dip, phase: k });
    pose.feet.nf = { x: 2.4, y: -7 + dip, fold: 0.1, push: 0, free: true };
    pose.feet.ff = { x: 6.4, y: -0.5 + up * 1.6 + sway * 0.4, fold: 0.1, push: 0, free: true };
    return pose;
  };
  const seat = id === 'monkey' ? squat : lie;
  const ride = each(RIDE, (k) => seat(k));
  const press = [seat(0.1, 1, 0), seat(0.25, 0.2, 0.7), seat(0.4, 0, 1)];
  const hurt = [air([0.5, -0.6, 0.2], [-0.45, -0.62, 0.3], { pitch: 0.38, head: [-0.8, 0.8, 0.35], lag: -1, phase: 0.2 })].map((p) => ({ ...p, hurt: true, tongue: false }));
  const dead = [{
    ...holdPose({ front: [0.7 * lf, -1.3, 0.1], hind: [-0.7 * lh, -1.3, 0.1], spread: 1.5, pitch: -0.05, body: [0, 0], head: [0.6, 0, -0.15], lag: 0, phase: 0.3, wide: 1.3 }),
    body: [0, Math.max(def.chestR[1], def.hipR[1]) * 0.72 - def.height], hurt: true, tongue: true, squash: 0.8,
  }].map((p) => ({ ...p, head: [0.6, -(def.neck.to[1] + def.headAt[1]) * 0.75, -0.15] }));
  return { run, idle, jump, fall, duck, ride, press, hurt, dead };
}
