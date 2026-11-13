// Pruebas de la lógica y la física, sin navegador ni dependencias: npm test.
// Usan solo los módulos que no tocan la página (el dragón, los obstáculos, los niveles, los choques,
// la cámara).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../js/config.js';
import { Dragon } from '../js/entities/Dragon.js';
import { Obstacle } from '../js/entities/Obstacle.js';
import { Spawner } from '../js/world/Spawner.js';
import { levelsFor, DIFFICULTIES } from '../js/world/levels.js';
import { anyOverlap } from '../js/core/collision.js';
import { Events } from '../js/core/events.js';
import { cameraTarget } from '../js/graphics/Camera.js';

const DT = 1 / 60;
const { groundY, ceilingY } = CONFIG;

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
function run(dragon, steps, input = () => NOTHING, { speed = 250, scroll = 0, each = () => {} } = {}) {
  for (let i = 0; i < steps; i++) {
    scroll += speed * DT;
    dragon.update(DT, input(i), scroll);
    each(dragon, i);
  }
  return scroll;
}

/** Un dragón que ya está corriendo (pasó el primer salto y aterrizó). */
function runningDragon() {
  const dragon = new Dragon();
  const scroll = run(dragon, 60, (i) => (i === 0 ? inputOf({ press: ['jump'] }) : NOTHING));
  assert.ok(dragon.onGround && !dragon.waiting);
  return { dragon, scroll };
}

// --- El dragón ------------------------------------------------------------------------

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

test('salto variable: un toque salta poco y mantenerlo salta alto (sin aletear, como en Chispas)', () => {
  const apex = (holdSteps) => {
    const { dragon, scroll } = runningDragon();
    let top = groundY;
    let airborne = 0;
    run(dragon, 60, (i) => inputOf({ press: i === 0 ? ['jump'] : [], down: i < holdSteps ? ['jump'] : [] }), {
      scroll,
      each: (d) => {
        top = Math.min(top, d.y);
        if (!d.onGround) airborne++;
      },
    });
    return { height: groundY - top, airborne };
  };
  const tap = apex(1);
  const full = apex(60);
  assert.ok(tap.height > 15 && tap.height < 45, `toque: ${tap.height}`);
  assert.ok(Math.abs(full.height - CONFIG.jumpHeight) < 8, `completo: ${full.height}`);
  // Sin aletear, el salto no flota: dura lo de siempre (~0,58 s)
  assert.ok(full.airborne <= 37, `en el aire ${full.airborne} pasos`);
  assert.ok(full.height > 40 + 10, 'un salto completo pasa sobre el muro');
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
  for (let step = 0; step < 300; step++) {
    const press = step % 50 === 0 || (step > 150 && step % 12 === 0) ? ['jump'] : [];
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
      // A spacing medido sobre el camino: en línea recta a lo más spacing, nunca separada (en las
      // esquinas del camino, como al aletear cayendo, queda más cerca)
      const ahead = parts[i];
      const gap = Math.hypot(ahead.x - part.x, ahead.y + ahead.h / 2 - (part.y + part.h / 2));
      assert.ok(gap <= CONFIG.dragon.spacing + 1e-6 && gap >= CONFIG.dragon.spacing * 0.35, `parte ${i + 1}: ${gap}`);
    });
  }
  assert.ok(dragon.trail.length < 40);
});

test('vuela en todos los niveles: aleteando se sostiene, y no pasa del techo (5 saltos de alto)', () => {
  const { dragon, scroll } = runningDragon();
  let lowest = 0;
  let highest = groundY;
  run(dragon, 600, (i) => inputOf({ press: i === 0 || i % 27 === 0 ? ['jump'] : [], down: i < 20 ? ['jump'] : [] }), {
    scroll,
    each: (d, i) => {
      if (i > 60) lowest = Math.max(lowest, d.y);
      highest = Math.min(highest, d.y);
    },
  });
  assert.ok(lowest < groundY - 20, `tocó el suelo (${lowest})`);

  // Aleteando sin parar sube hasta el techo, y ahí se queda
  const climber = runningDragon();
  run(climber.dragon, 400, () => inputOf({ press: ['jump'] }), {
    scroll: climber.scroll,
    each: (d) => {
      highest = Math.min(highest, d.y);
      assert.ok(d.y - CONFIG.dragon.head.h >= ceilingY - 1e-9, 'se salió por arriba');
    },
  });
  assert.ok(Math.abs(groundY - highest - CONFIG.skyJumps * CONFIG.jumpHeight + CONFIG.dragon.head.h) < 1, `llegó a ${groundY - highest}`);

  // El vuelo es suave: después de aletear nunca cae más rápido que maxFall
  const glider = runningDragon();
  run(glider.dragon, 120, (i) => inputOf({ press: i === 0 || i === 20 ? ['jump'] : [], down: i < 15 ? ['jump'] : [] }), {
    scroll: glider.scroll,
    each: (d, i) => {
      if (i === 20) assert.ok(d.flapped, 'el segundo salto debía ser aleteo');
      if (i > 20 && !d.onGround) assert.ok(d.vy <= CONFIG.dragon.flight.maxFall + 1e-9);
    },
  });
});

test('sin suelo: empieza flotando, rebota en las nubes (y avisa) y nunca las atraviesa', () => {
  const dragon = new Dragon();
  dragon.reset(false);
  assert.ok(!dragon.onGround && dragon.waiting);
  run(dragon, 120); // esperando: flota sin caer
  assert.ok(dragon.y < groundY - CONFIG.jumpHeight);
  let bumps = 0;
  run(dragon, 600, (i) => inputOf({ press: i === 0 ? ['jump'] : [] }), {
    each: (d) => {
      if (d.bumped) bumps++;
      assert.ok(d.y <= groundY && !d.onGround);
    },
  });
  assert.ok(bumps > 0, 'nunca tocó las nubes');

  // Pasar de un nivel con suelo a uno sin suelo lo lanza a volar
  const { dragon: runner } = runningDragon();
  runner.setGround(false);
  assert.ok(!runner.onGround && runner.vy < 0);
});

test('al caer sin vida, el cuerpo baja detrás de la cabeza y se tiende en el suelo', () => {
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
  dragon.parts().forEach((part, i) => {
    assert.ok(Math.abs(part.y + part.h / 2 - groundY) < 1e-6, `parte ${i} no llegó al suelo`);
    assert.ok(part.y > before[i], `parte ${i} no bajó`);
  });
});

test('la cámara: en el suelo no se mueve, y al volar alto siempre se ve al dragón', () => {
  assert.equal(cameraTarget(groundY), 0);
  assert.equal(cameraTarget(groundY - CONFIG.jumpHeight), 0); // un salto normal no mueve la cámara
  for (let feet = groundY; feet >= ceilingY + CONFIG.dragon.head.h; feet -= 5) {
    const top = cameraTarget(feet);
    assert.ok(feet - CONFIG.dragon.head.h >= top + 20 && feet <= top + CONFIG.height, `pies en ${feet}`);
  }
});

// --- Los niveles ----------------------------------------------------------------------

/** Corre el Spawner de un nivel completo como lo hace Game, y devuelve lo que puso (y cuándo). */
function spawnLevel(level) {
  const spawner = new Spawner(level);
  const obstacles = [];
  const pickups = [];
  const placed = [];
  const taken = [];
  let distance = 0;
  while (distance < level.length) {
    const progress = distance / level.length;
    const speed = level.speed * (1 + CONFIG.speed.ramp * progress);
    spawner.progress = progress;
    distance += speed * DT;
    for (const o of obstacles) o.update(DT, speed);
    const before = { obstacles: obstacles.length, pickups: pickups.length };
    spawner.update(DT, speed, distance, obstacles, pickups);
    for (const obstacle of obstacles.slice(before.obstacles)) placed.push({ obstacle, distance, speed });
    for (const pickup of pickups.slice(before.pickups)) {
      taken.push({ pickup, distance, speed, ahead: obstacles.slice(0, before.obstacles).map((o) => o.x + o.w) });
    }
  }
  return { placed, pickups: taken };
}

test('los obstáculos de los 24 niveles siguen sus reglas, en el suelo y en el cielo', () => {
  const { clearDistance, skyFloor } = CONFIG.obstacles;
  const fullJumpTop = CONFIG.jumpHeight + CONFIG.dragon.head.h; // lo más alto que llega la cabeza
  for (const difficulty of Object.keys(DIFFICULTIES)) {
    for (const level of levelsFor(difficulty)) {
      for (let seed = 1; seed <= 20; seed++) {
        withSeed(seed * 7919 + level.index, () => {
          const { placed } = spawnLevel(level);
          const where = `${difficulty} nivel ${level.index + 1} semilla ${seed}`;
          const ground = placed.filter((p) => p.obstacle.height !== 'sky');
          const sky = placed.filter((p) => p.obstacle.height === 'sky');
          assert.ok(sky.length >= 4, `${where}: casi nada en el cielo (${sky.length})`);
          if (level.ground) assert.ok(ground.length >= 5, `${where}: casi nada en el suelo (${ground.length})`);
          else assert.equal(ground.length, 0, `${where}: obstáculos de suelo sin suelo`);
          for (const { obstacle } of sky) {
            const bottom = groundY - (obstacle.y + obstacle.h) - obstacle.bob;
            const top = groundY - obstacle.y + obstacle.bob;
            // Con suelo, lo del cielo nunca estorba un salto normal: solo a quien vuela
            if (level.ground) assert.ok(bottom > fullJumpTop && obstacle.y + obstacle.h / 2 <= groundY - skyFloor + 1e-9, `${where}: ${obstacle.kind} a ${bottom}`);
            assert.ok(top <= groundY - ceilingY, `${where}: ${obstacle.kind} sobre el techo`);
          }
          assert.ok(placed.at(-1).distance <= level.length - clearDistance + level.speed * 2 * DT, `${where}: obstáculo muy al final`);
        });
      }
    }
  }
});

test('la perla y los cócteles salen al azar, nunca encimados a un obstáculo, y siempre se alcanzan', () => {
  const { clearBefore, clearAfter } = CONFIG.pickups;
  for (const level of levelsFor('hard')) {
    for (let seed = 1; seed <= 20; seed++) {
      withSeed(seed * 31 + level.index, () => {
        const { placed, pickups } = spawnLevel(level);
        const where = `nivel ${level.index + 1} semilla ${seed}`;
        assert.equal(pickups.filter((p) => p.pickup.type === 'pearl').length, 1, `${where}: perlas`);
        assert.ok(pickups.some((p) => p.pickup.type === 'cocktail'), `${where}: sin cócteles`);
        for (const { pickup, distance, speed, ahead } of pickups) {
          // Lo que ya estaba quedó lejos...
          for (const right of ahead) assert.ok(right <= CONFIG.width - clearBefore + 1e-9, `${where}: obstáculo pegado antes`);
          // ...y lo siguiente esperó
          const next = placed.find((p) => p.distance > distance);
          if (next) assert.ok(next.distance - distance >= clearAfter * speed * 0.97, `${where}: obstáculo pegado después`);
          // Entre casi el suelo y casi el techo
          assert.ok(pickup.baseY - pickup.r - CONFIG.pickups.bob >= ceilingY && pickup.baseY + pickup.r + CONFIG.pickups.bob <= groundY, `${where}: fuera del mundo`);
        }
      });
    }
  }
});

// --- El bot ---------------------------------------------------------------------------
//
// Juega con el mismo ciclo que Game.play y sin bolas de fuego. En cada paso prueba, simulando el
// siguiente segundo, unas cuantas jugadas (nada, agacharse, saltos de distinta altura, aletear con
// distinto ritmo, caer rápido) y elige la primera que no choca. Si además puede tomar algo sin
// chocar, lo toma. Si los 12 niveles se pasan sin un golpe, todo lo que pone el Spawner se puede
// esquivar con esta física; y lo que recoge muestra que tomar las cosas nunca obliga a chocar.

const HORIZON = 60;
const WAIT = 4; // pasos: si esperar es seguro al menos esto, todavía no hace falta decidir
const REACH = 0.62; // segundos: lo que el bot toma en cuenta al decidir
const every = (n, offset = 0) => (k) => ({ press: (k + offset) % n === 0 ? ['jump'] : [] });
const PLANS = [
  { name: 'nada', at: () => ({}) },
  { name: 'agacharse', at: () => ({ down: ['duck'] }) },
  ...[60, 24, 12, 6, 1].map((hold) => ({ name: `salto ${hold}`, at: (k) => ({ press: k === 0 ? ['jump'] : [], down: k < hold ? ['jump'] : [] }) })),
  ...[60, 12, 1].map((hold) => ({ name: `salto ${hold} y abajo`, at: (k) => ({ press: k === 0 ? ['jump'] : [], down: k < hold ? ['jump'] : ['duck'] }) })),
  { name: 'aleteo', at: every(1000) },
  { name: 'flotar', at: every(20) },
  { name: 'flotar tarde', at: every(20, 10) },
  { name: 'subir', at: every(8) },
  { name: 'subir rápido', at: every(3) },
  { name: 'bajar', at: every(32) },
  { name: 'picada', at: (k) => ({ press: k === 40 ? ['jump'] : [], down: k < 30 ? ['duck'] : [] }) },
];

/** Qué tal le va al plan desde su paso k: cuántos pasos aguanta sin chocar y si toma algo. */
function tryPlan(world, plan, k) {
  const { dragon, near, pickups, speed } = world;
  if (dragon.ground && !near.length && !pickups.length && dragon.onGround) return { lasts: HORIZON, got: false, y: dragon.y };
  let { scroll } = world;
  const d = dragon.clone();
  const os = near.map((o) => o.clone());
  const ps = pickups.map((p) => Object.assign(Object.create(Object.getPrototypeOf(p)), p));
  let got = false;
  for (let i = 0; i < HORIZON; i++) {
    scroll += speed * DT;
    for (const o of os) o.update(DT, speed);
    for (const p of ps) p.update(DT, speed);
    d.update(DT, inputOf(plan.at(k + i)), scroll);
    const body = d.hitboxes();
    if (d.bumped || os.some((o) => anyOverlap(body, o.hitboxes()))) return { lasts: i, got };
    if (!got && ps.some((p) => anyOverlap([body[0]], p.hitboxes()))) got = true;
  }
  return { lasts: HORIZON, got, y: d.y };
}

function botRun(difficulty, seed) {
  return withSeed(seed, () => {
    const dragon = new Dragon();
    let scroll = 0;
    let obstacles = [];
    let pickups = [];
    let hits = 0;
    let completed = 0;
    let seen = 0;
    let collected = 0;
    let current = { plan: PLANS[0], k: 0 };
    for (const level of levelsFor(difficulty)) {
      if (level.index === 0) dragon.reset(level.ground);
      else dragon.setGround(level.ground);
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
        // viene después se resuelve después. Sigue con su plan si no choca (y no se pierde algo que
        // podría tomar); si no, busca el primero que no choque, de preferencia uno que tome algo. Si
        // ninguno sirve todavía y esperar en el suelo es seguro, espera (como una persona: salta
        // cuando el salto ya libra el obstáculo, no antes).
        const front = dragon.x + CONFIG.dragon.head.w / 2;
        const ahead = (o) => o.x - front < (speed + (o.speedBonus ?? 0)) * REACH;
        const world = { dragon, speed, scroll, near: obstacles.filter(ahead), pickups: pickups.filter(ahead) };
        // Lo siguiente que se puede recoger, aunque aún esté lejos: hacia su altura
        const goal = pickups.find((p) => p.x > front - 10 && p.x - front < speed * 2.5);
        const keep = tryPlan(world, current.plan, current.k);
        // (buscar con qué tomar algo cuesta: se hace cada 6 pasos, salvo que haga falta esquivar)
        if (keep.lasts < HORIZON || ((world.pickups.length || goal) && !keep.got && current.k % 6 === 0)) {
          const results = PLANS.map((plan) => ({ plan, ...tryPlan({ ...world, pickups: goal ? [goal] : world.pickups }, plan, 0) }));
          const grab = results.find((r) => r.lasts === HORIZON && r.got);
          const safe = results.find((r) => r.lasts === HORIZON);
          // Sin poder tomarlo todavía: el plan seguro que más lo acerca a su altura
          const closer = goal && results.filter((r) => r.lasts === HORIZON && r.y !== undefined).sort((a, b) => Math.abs(a.y - goal.y - 10) - Math.abs(b.y - goal.y - 10))[0];
          let next = null;
          if (grab) next = grab.plan;
          else if (closer) next = closer.plan;
          else if (keep.lasts === HORIZON) next = null; // no hay nada que buscar: sigue igual
          else if (safe) next = safe.plan;
          else if (dragon.onGround && results[0].lasts >= WAIT) next = PLANS[0];
          else next = results.reduce((a, b) => (b.lasts > a.lasts ? b : a)).plan;
          if (next) current = { plan: next, k: 0 }; // (aunque sea el mismo plan: empieza de nuevo)
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
        const before = pickups.length;
        spawner.update(DT, speed, distance, obstacles, pickups);
        seen += pickups.length - before;
        const body = dragon.hitboxes();
        const hit = obstacles.find((o) => anyOverlap(body, o.hitboxes()));
        if (dragon.canBeHit && (hit || dragon.bumped)) {
          hits++;
          if (process.env.BOT_DEBUG) console.log(difficulty, 'nivel', level.index + 1, hit?.kind ?? 'nubes', hit?.height, current.plan.name, { y: Math.round(dragon.y) });
          dragon.hurt();
        }
        const grabbed = pickups.filter((p) => anyOverlap([body[0]], p.hitboxes()));
        collected += grabbed.length;
        pickups = pickups.filter((p) => !grabbed.includes(p));
      }
      completed++;
    }
    return { hits, completed, seen, collected };
  });
}

test('los 12 niveles se pueden ganar sin fuego, y se puede tomar casi todo sin chocar', () => {
  let seen = 0;
  let collected = 0;
  for (const difficulty of ['easy', 'hard']) {
    for (const seed of [1, 2, 3]) {
      const result = botRun(difficulty, seed * 104729);
      if (process.env.BOT_DEBUG) console.log(difficulty, seed, result);
      assert.equal(result.completed, 12, `${difficulty} semilla ${seed}`);
      assert.equal(result.hits, 0, `${difficulty} semilla ${seed}: ${result.hits} golpes`);
      seen += result.seen;
      collected += result.collected;
    }
  }
  // Lo que no toma es porque el bot no es perfecto (decide con un segundo de vista), no porque haya
  // que chocar: en ninguna partida choca
  assert.ok(collected / seen >= 0.85, `solo tomó ${collected} de ${seen}`);
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
