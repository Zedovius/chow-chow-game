// Pruebas de la lógica y la física, sin navegador ni dependencias: npm test.
// Usan solo los módulos que no tocan la página (el dragón, los obstáculos, los niveles, los choques).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../js/config.js';
import { Dragon } from '../js/entities/Dragon.js';
import { Obstacle } from '../js/entities/Obstacle.js';
import { Spawner } from '../js/world/Spawner.js';
import { levelsFor, DIFFICULTIES } from '../js/world/levels.js';
import { anyOverlap } from '../js/core/collision.js';
import { Events } from '../js/core/events.js';

const DT = 1 / 60;
const { groundY } = CONFIG;

/** Math.random con semilla, para que cada prueba salga igual siempre. */
function withSeed(seed, run) {
  const original = Math.random;
  let a = seed >>> 0;
  Math.random = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  try {
    return run();
  } finally {
    Math.random = original;
  }
}

/** Una entrada falsa: { press, down } para un paso. */
const inputOf = ({ press = [], down = [] } = {}) => ({
  wasPressed: (action) => press.includes(action),
  isDown: (action) => down.includes(action),
});
const NOTHING = inputOf();

/** Corre al dragón steps pasos con la entrada que dé input(paso); devuelve el scroll final. */
function run(dragon, steps, input = () => NOTHING, { speed = 250, scroll = 0 } = {}) {
  for (let i = 0; i < steps; i++) {
    scroll += speed * DT;
    dragon.update(DT, input(i), scroll);
  }
  return scroll;
}

/** Un dragón que ya está corriendo (pasó el primer salto y aterrizó). */
function runningDragon({ flight = false } = {}) {
  const dragon = new Dragon();
  dragon.flight = flight;
  const scroll = run(dragon, 60, (i) => (i === 0 ? inputOf({ press: ['jump'] }) : NOTHING));
  assert.ok(dragon.onGround && !dragon.waiting);
  return { dragon, scroll };
}

test('mientras espera el primer salto, la estela no crece y el cuerpo está de pie en el suelo', () => {
  const dragon = new Dragon();
  for (let i = 0; i < 10_000; i++) dragon.update(DT, NOTHING, 1234);
  assert.ok(dragon.waiting);
  assert.equal(dragon.trail.length, 1);
  for (const part of dragon.parts()) assert.equal(part.y + part.h / 2, groundY);
});

test('corriendo, todas las partes pisan el suelo y van en línea, a spacing una de otra', () => {
  const { dragon } = runningDragon();
  const parts = dragon.parts();
  assert.equal(parts.length, 1 + CONFIG.dragon.body.length);
  parts.forEach((part, i) => {
    assert.ok(Math.abs(part.y + part.h / 2 - groundY) < 1e-9, `parte ${i} no pisa el suelo`);
    assert.equal(part.angle, 0);
    if (i) assert.ok(Math.abs(parts[i - 1].x - part.x - CONFIG.dragon.spacing) < 1e-6);
  });
});

test('salto variable: un toque salta poco y mantenerlo salta alto', () => {
  // Lo más alto que llegan los pies, manteniendo el botón holdSteps pasos
  const apex = (holdSteps) => {
    const { dragon, scroll } = runningDragon();
    let top = groundY;
    let s = scroll;
    for (let i = 0; i < 60; i++) {
      s += 250 * DT;
      dragon.update(DT, inputOf({ press: i === 0 ? ['jump'] : [], down: i < holdSteps ? ['jump'] : [] }), s);
      top = Math.min(top, dragon.y);
    }
    return groundY - top;
  };
  const tap = apex(1);
  const full = apex(60);
  assert.ok(tap > 15 && tap < 45, `toque: ${tap}`);
  assert.ok(full > 90 && full < 110, `completo: ${full}`);
  // Un salto completo pasa sobre el obstáculo más alto (el muro), con todo y cola
  assert.ok(full > 40 + 10);
});

test('agachado, ninguna parte toca una criatura de en medio; de pie, la cabeza sí', () => {
  const { dragon } = runningDragon();
  const flyer = new Obstacle('flyer', dragon.x - 60, { height: 'mid', center: CONFIG.obstacles.flyerHeights.mid });
  flyer.w = 200; // que cubra todo el dragón
  for (let t = 0; t < 2; t += DT) {
    flyer.update(DT, 0); // solo para mover el vaivén
    flyer.x = dragon.x - 120;
    assert.ok(!anyOverlap(dragon.hitboxes({ ducking: true }), flyer.hitboxes()), 'agachado choca');
    assert.ok(anyOverlap([dragon.hitboxes({ ducking: false })[0]], flyer.hitboxes()), 'de pie no choca');
  }
});

test('el cuerpo va por donde pasaron los pies de la cabeza y nunca se separa', () => {
  const { dragon, scroll: start } = runningDragon();
  const history = [];
  let scroll = start;
  for (let step = 0; step < 240; step++) {
    const press = step % 50 === 0 ? ['jump'] : [];
    const down = step % 50 < 20 ? ['jump'] : [];
    scroll += 250 * DT;
    dragon.update(DT, inputOf({ press, down }), scroll);
    history.push({ at: scroll, y: dragon.y });
    if (step < 30) continue;
    const feetAt = (at) => {
      const i = history.findIndex((h) => h.at >= at);
      if (i <= 0) return groundY;
      const a = history[i - 1];
      const b = history[i];
      return a.y + ((b.y - a.y) * (at - a.at)) / (b.at - a.at);
    };
    const parts = dragon.parts();
    parts.slice(1).forEach((part, i) => {
      const at = scroll - (dragon.x - part.x);
      assert.ok(Math.abs(part.y + part.h / 2 - feetAt(at)) < 1e-6, `parte ${i + 1} fuera del camino`);
      const ahead = parts[i];
      const gap = Math.hypot(ahead.x - part.x, ahead.y + ahead.h / 2 - (part.y + part.h / 2));
      assert.ok(gap <= CONFIG.dragon.spacing + 1e-6 && gap >= CONFIG.dragon.spacing * 0.35, `parte ${i + 1}: ${gap}`);
    });
  }
  assert.ok(dragon.trail.length < 40);
});

test('volar: solo en los niveles de vuelo, y aleteando se sostiene en el aire sin salirse', () => {
  const flapEvery = (dragon, seconds) => {
    let scroll = 0;
    let lowest = 0;
    let highest = groundY;
    for (let i = 0; i < seconds * 60; i++) {
      scroll += 250 * DT;
      const press = i === 0 || i % 27 === 0 ? ['jump'] : [];
      dragon.update(DT, inputOf({ press, down: i < 20 ? ['jump'] : [] }), scroll);
      if (i > 60) lowest = Math.max(lowest, dragon.y);
      highest = Math.min(highest, dragon.y);
    }
    return { lowest, highest };
  };
  const { dragon: flyer } = runningDragon({ flight: true });
  const flight = flapEvery(flyer, 10);
  assert.ok(flight.lowest < groundY - 20, `en vuelo tocó el suelo (${flight.lowest})`);
  assert.ok(flight.highest >= CONFIG.ceilingY + CONFIG.dragon.head.h, 'se salió por arriba');

  const { dragon: runner } = runningDragon({ flight: false });
  const running = flapEvery(runner, 10);
  assert.equal(running.lowest, groundY, 'sin vuelo no debería sostenerse en el aire');

  // El vuelo es suave: nunca cae más rápido que maxFall (sin lanzarse en picada)
  const { dragon: glider } = runningDragon({ flight: true });
  let scroll = 0;
  for (let i = 0; i < 120; i++) {
    scroll += 250 * DT;
    glider.update(DT, inputOf({ press: i === 0 || i === 20 ? ['jump'] : [] }), scroll);
    if (i > 20 && !glider.onGround) assert.ok(glider.vy <= CONFIG.dragon.flight.maxFall + 1e-9);
  }
});

test('al caer sin vida, el cuerpo baja detrás de la cabeza', () => {
  const { dragon, scroll: start } = runningDragon();
  let scroll = run(dragon, 14, (i) => inputOf({ press: i === 0 ? ['jump'] : [], down: ['jump'] }), { scroll: start });
  const before = dragon.parts().map((p) => p.y);
  dragon.die();
  let speed = 250;
  for (let t = 0; t < CONFIG.deathDelay; t += DT) {
    speed *= Math.exp(-CONFIG.deathSlowdown * DT);
    scroll += speed * DT;
    dragon.fall(DT, scroll);
  }
  const after = dragon.parts();
  after.forEach((part, i) => {
    assert.ok(Math.abs(part.y + part.h / 2 - groundY) < 1e-6, `parte ${i} no llegó al suelo`);
    assert.ok(part.y > before[i], `parte ${i} no bajó`);
  });
});

/** Corre el Spawner de un nivel completo como lo hace Game, y devuelve lo que puso. */
function spawnLevel(level) {
  const spawner = new Spawner(level);
  const obstacles = [];
  const pickups = [];
  const placed = [];
  let distance = 0;
  while (distance < level.length) {
    const progress = distance / level.length;
    const speed = level.speed * (1 + CONFIG.speed.ramp * progress);
    spawner.progress = progress;
    distance += speed * DT;
    const count = obstacles.length;
    spawner.update(DT, speed, distance, obstacles, pickups);
    if (obstacles.length > count) placed.push({ obstacle: obstacles[obstacles.length - 1], distance, speed });
  }
  return { placed, pickups };
}

test('los obstáculos de los 24 niveles dejan tiempo para reaccionar, y hay perla y cócteles', () => {
  const { minGapFloorSeconds, clearDistance } = CONFIG.obstacles;
  for (const difficulty of Object.keys(DIFFICULTIES)) {
    for (const level of levelsFor(difficulty)) {
      for (let seed = 1; seed <= 30; seed++) {
        withSeed(seed * 7919 + level.index, () => {
          const { placed, pickups } = spawnLevel(level);
          const where = `${difficulty} nivel ${level.index + 1} semilla ${seed}`;
          assert.ok(placed.length >= 6, `${where}: muy pocos obstáculos (${placed.length})`);
          assert.equal(pickups.filter((p) => p.type === 'pearl').length, 1, `${where}: perlas`);
          assert.ok(pickups.some((p) => p.type === 'cocktail'), `${where}: sin cócteles`);
          for (let i = 1; i < placed.length; i++) {
            const seconds = (placed[i].distance - placed[i - 1].distance) / placed[i - 1].speed;
            // La criatura llega antes (va más rápido), por eso se mide en su velocidad
            const bonus = placed[i - 1].obstacle.speedBonus;
            assert.ok(seconds * (placed[i - 1].speed + bonus) / placed[i - 1].speed >= minGapFloorSeconds - 0.02, `${where}: ${seconds.toFixed(2)} s entre obstáculos`);
          }
          assert.ok(placed.at(-1).distance <= level.length - clearDistance + level.speed * 2 * DT, `${where}: obstáculo muy al final`);
          const sky = placed.some(({ obstacle }) => obstacle.height === 'sky');
          if (!level.flight) assert.ok(!sky, `${where}: criaturas del cielo sin vuelo`);
          for (const p of pickups) assert.ok(p.y - p.r >= CONFIG.ceilingY && p.y + p.r <= groundY, `${where}: algo fuera del mundo`);
        });
      }
    }
  }
});

test('la perla y los cócteles se alcanzan: de un salto en el suelo, volando en el cielo', () => {
  const head = CONFIG.dragon.head.h - 2; // la caja de la cabeza
  const jump = CONFIG.dragon.jumpVelocity ** 2 / (2 * CONFIG.dragon.gravity);
  for (const height of [CONFIG.pearl.height, ...CONFIG.cocktails.heights]) assert.ok(height - CONFIG.pearl.radius < jump + head, `a ${height} no se llega saltando`);
  for (const height of [...CONFIG.pearl.skyHeight, ...CONFIG.cocktails.skyHeights]) assert.ok(height < groundY - CONFIG.ceilingY - CONFIG.dragon.head.h);
});

// --- El bot ---------------------------------------------------------------------------
//
// Juega con el mismo ciclo que Game.play y sin bolas de fuego. En cada paso prueba, simulando el
// siguiente segundo, unas cuantas jugadas (nada, agacharse, saltos de distinta altura, saltar y
// caer rápido, aletear) y elige la primera que no choca. Si los 12 niveles se pasan sin un golpe,
// todo lo que pone el Spawner se puede esquivar con esta física.

const HORIZON = 60;
const WAIT = 4; // pasos: si esperar es seguro al menos esto, todavía no hace falta decidir
const REACH = 0.62; // segundos: lo que el bot toma en cuenta al decidir
const PLANS = [
  { name: 'nada', at: () => ({}) },
  { name: 'agacharse', at: () => ({ down: ['duck'] }) },
  ...[60, 24, 12, 6, 1].map((hold) => ({ name: `salto ${hold}`, at: (k) => ({ press: k === 0 ? ['jump'] : [], down: k < hold ? ['jump'] : [] }) })),
  ...[60, 12, 1].map((hold) => ({ name: `salto ${hold} y abajo`, at: (k) => ({ press: k === 0 ? ['jump'] : [], down: k < hold ? ['jump'] : ['duck'] }) })),
  { name: 'aleteo', at: (k) => ({ press: k === 0 ? ['jump'] : [] }) },
  { name: 'aleteo y abajo', at: (k) => ({ press: k === 0 ? ['jump'] : [], down: k > 10 ? ['duck'] : [] }) },
];

/** Cuántos pasos sobrevive el plan desde su paso k (HORIZON si no choca). */
function survives(dragon, obstacles, speed, scroll, plan, k) {
  if (!obstacles.length) return HORIZON;
  const d = dragon.clone();
  const os = obstacles.map((o) => o.clone());
  for (let i = 0; i < HORIZON; i++) {
    scroll += speed * DT;
    for (const o of os) o.update(DT, speed);
    d.update(DT, inputOf(plan.at(k + i)), scroll);
    const body = d.hitboxes();
    if (os.some((o) => anyOverlap(body, o.hitboxes()))) return i;
  }
  return HORIZON;
}

function botRun(difficulty, seed) {
  return withSeed(seed, () => {
    const dragon = new Dragon();
    let scroll = 0;
    let obstacles = [];
    let pickups = [];
    let hits = 0;
    let completed = 0;
    let current = { plan: PLANS[0], k: 0 };
    for (const level of levelsFor(difficulty)) {
      dragon.flight = level.flight;
      const spawner = new Spawner(level);
      let distance = 0;
      let steps = 0;
      while (!(distance >= level.length && !obstacles.length)) {
        if (++steps > 60 * 120) throw new Error(`el nivel ${level.index + 1} no termina`);
        if (dragon.waiting) {
          dragon.update(DT, inputOf({ press: ['jump'] }), scroll);
          continue;
        }
        const progress = Math.min(1, distance / level.length);
        const speed = level.speed * (1 + CONFIG.speed.ramp * progress);
        spawner.progress = progress;

        // Decide mirando solo lo que está a menos de REACH segundos (lo que dura un salto): lo que
        // viene después se resuelve al aterrizar. Sigue con su plan si no choca; si no, busca el
        // primero que no choque. Si ninguno sirve todavía y esperar es seguro, espera (como una
        // persona: salta cuando el salto ya libra el obstáculo, no antes).
        const front = dragon.x + CONFIG.dragon.head.w / 2;
        const near = obstacles.filter((o) => o.x - front < (speed + o.speedBonus) * REACH);
        if (survives(dragon, near, speed, scroll, current.plan, current.k) < HORIZON) {
          let best = null;
          let bestSteps = -1;
          let wait = 0;
          for (const plan of PLANS) {
            const lasts = survives(dragon, near, speed, scroll, plan, 0);
            if (plan === PLANS[0]) wait = lasts;
            if (lasts > bestSteps) {
              best = plan;
              bestSteps = lasts;
            }
            if (lasts === HORIZON) break;
          }
          if (dragon.onGround && bestSteps < HORIZON && wait >= WAIT) best = PLANS[0];
          current = { plan: best, k: 0 };
        }
        const input = inputOf(current.plan.at(current.k));
        current.k += 1;

        // El mismo ciclo que Game.play
        const dx = speed * DT;
        distance += dx;
        scroll += dx;
        for (const o of obstacles) o.update(DT, speed);
        for (const p of pickups) p.update(DT, speed);
        obstacles = obstacles.filter((o) => !o.offscreen);
        pickups = pickups.filter((p) => !p.offscreen);
        dragon.update(DT, input, scroll);
        spawner.update(DT, speed, distance, obstacles, pickups);
        const body = dragon.hitboxes();
        const hit = obstacles.find((o) => anyOverlap(body, o.hitboxes()));
        if (dragon.canBeHit && hit) {
          hits++;
          if (process.env.BOT_DEBUG) console.log(difficulty, 'nivel', level.index + 1, hit.kind, hit.height, current.plan.name, { y: dragon.y, onGround: dragon.onGround });
          dragon.hurt();
        }
      }
      completed++;
    }
    return { hits, completed };
  });
}

test('los 12 niveles se pueden ganar sin fuego: un bot los pasa en fácil y en difícil sin un golpe', () => {
  for (const difficulty of ['easy', 'hard']) {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const { hits, completed } = botRun(difficulty, seed * 104729);
      assert.equal(completed, 12, `${difficulty} semilla ${seed}`);
      assert.equal(hits, 0, `${difficulty} semilla ${seed}: ${hits} golpes`);
    }
  }
});

test('los avisos llegan a quien escucha, y un error al atenderlos no detiene a los demás', () => {
  const events = new Events();
  const heard = [];
  const quiet = console.error;
  console.error = () => {};
  try {
    events.on('hit', () => {
      throw new Error('falla a propósito');
    });
    const off = events.on('hit', ({ lives }) => heard.push(lives));
    events.emit('hit', { lives: 2 });
    off();
    events.emit('hit', { lives: 1 });
    events.emit('sin-oyentes');
  } finally {
    console.error = quiet;
  }
  assert.deepEqual(heard, [2]);
});
