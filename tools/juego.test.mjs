// Pruebas de la lógica y la física, sin navegador ni dependencias: npm test.
// Usan solo los módulos que no tocan la página (el dragón, los obstáculos, los niveles, los choques,
// la cámara).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../js/config.js';
import { Player } from '../js/entities/Player.js';
import { Obstacle } from '../js/entities/Obstacle.js';
import { Spawner } from '../js/world/Spawner.js';
import { levelsFor, DIFFICULTIES, ZODIAC, worldOrder, rivalOf, signOfYear, bossLevel, journeyFor } from '../js/world/levels.js';
import { Boss } from '../js/entities/Boss.js';
import { Fireball } from '../js/entities/Fireball.js';
import { FireButton } from '../js/core/charge.js';
import { signOfBirth, needsDay, newYearOf, FIRST_YEAR, LAST_YEAR } from '../js/world/birth.js';
import { anyOverlap } from '../js/core/collision.js';
import { Events } from '../js/core/events.js';
import { Combo } from '../js/core/combo.js';
import { CloseCalls } from '../js/core/closeCalls.js';
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
  const dragon = new Player();
  const scroll = run(dragon, 60, (i) => (i === 0 ? inputOf({ press: ['jump'] }) : NOTHING));
  assert.ok(dragon.onGround && !dragon.waiting);
  return { dragon, scroll };
}

// --- El dragón ------------------------------------------------------------------------

test('mientras espera el primer salto, la estela no crece y el cuerpo está de pie en el suelo', () => {
  const dragon = new Player();
  for (let i = 0; i < 10_000; i++) dragon.update(DT, NOTHING, 1234);
  assert.ok(dragon.waiting);
  assert.equal(dragon.trail.length, 1);
  for (const part of dragon.parts()) assert.equal(part.y + part.h / 2, groundY);
});

test('corriendo, todas las partes pisan el suelo y van en línea, a spacing una de otra', () => {
  const { dragon } = runningDragon();
  const parts = dragon.parts();
  assert.equal(parts.length, 1 + CONFIG.player.body.length);
  parts.forEach((part, i) => {
    assert.ok(Math.abs(part.y + part.h / 2 - groundY) < 1e-9, `parte ${i} no pisa el suelo`);
    assert.equal(part.angle, 0);
    if (i) assert.ok(Math.abs(parts[i - 1].x - part.x - CONFIG.player.spacing) < 1e-6);
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
      assert.ok(gap <= CONFIG.player.spacing + 1e-6 && gap >= CONFIG.player.spacing * 0.35, `parte ${i + 1}: ${gap}`);
    });
  }
  assert.ok(dragon.trail.length < 40);
});

test('con la estrella vuela: aleteando se sostiene y no pasa del techo; sin ella, solo salta', () => {
  // Sin el poder, saltar en el aire no hace nada: vuelve al suelo como cualquier salto
  const plain = runningDragon();
  let landed = false;
  run(plain.dragon, 120, (i) => inputOf({ press: i % 10 === 0 ? ['jump'] : [], down: i < 20 ? ['jump'] : [] }), {
    scroll: plain.scroll,
    each: (d) => {
      if (d.onGround) landed = true;
      assert.ok(!d.flapped, 'aleteó sin el poder');
    },
  });
  assert.ok(landed);

  const { dragon, scroll } = runningDragon();
  dragon.canFly = true;
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
  climber.dragon.canFly = true;
  run(climber.dragon, 400, () => inputOf({ press: ['jump'] }), {
    scroll: climber.scroll,
    each: (d) => {
      highest = Math.min(highest, d.y);
      assert.ok(d.y - CONFIG.player.head.h >= ceilingY - 1e-9, 'se salió por arriba');
    },
  });
  assert.ok(Math.abs(groundY - highest - CONFIG.skyJumps * CONFIG.jumpHeight + CONFIG.player.head.h) < 1, `llegó a ${groundY - highest}`);

  // El vuelo es suave: después de aletear nunca cae más rápido que maxFall
  const glider = runningDragon();
  glider.dragon.canFly = true;
  run(glider.dragon, 120, (i) => inputOf({ press: i === 0 || i === 20 ? ['jump'] : [], down: i < 15 ? ['jump'] : [] }), {
    scroll: glider.scroll,
    each: (d, i) => {
      if (i === 20) assert.ok(d.flapped, 'el segundo salto debía ser aleteo');
      if (i > 20 && !d.onGround) assert.ok(d.vy <= CONFIG.player.flight.maxFall + 1e-9);
    },
  });
});

test('sin suelo: empieza flotando, rebota en las nubes (y avisa) y nunca las atraviesa', () => {
  const dragon = new Player();
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

test('un golpe le quita el poder de volar y cae al suelo; sin suelo, nunca lo pierde', () => {
  const { dragon, scroll } = runningDragon();
  dragon.canFly = true;
  let s = run(dragon, 30, (i) => inputOf({ press: i % 8 === 0 ? ['jump'] : [], down: i < 15 ? ['jump'] : [] }), { scroll });
  assert.ok(!dragon.onGround && dragon.flying);
  dragon.hurt();
  assert.ok(!dragon.canFly && dragon.lostFlight && !dragon.flying);
  let fell = false;
  run(dragon, 120, (i) => inputOf({ press: i % 8 === 0 ? ['jump'] : [] }), {
    scroll: s,
    each: (d) => {
      assert.ok(!d.flapped, 'aleteó sin el poder');
      if (d.landed) fell = true;
    },
  });
  assert.ok(fell, 'no cayó al suelo');

  // Al tomar la estrella despega en ese momento: la nubecita (o las alas) se ven de inmediato
  const { dragon: runner } = runningDragon();
  runner.sign = 'ox';
  runner.takeOff();
  assert.ok(runner.canFly && runner.riding && !runner.onGround);
  runner.sign = 'rooster';
  assert.ok(runner.airborne && runner.winged && !runner.riding);

  // Si ya va volando, otra estrella no cambia nada (ni lo empuja hacia arriba)
  runner.vy = 120;
  runner.y = CONFIG.groundY - 100;
  runner.takeOff();
  assert.ok(runner.canFly && runner.vy === 120 && runner.y === CONFIG.groundY - 100);

  const sky = new Player();
  sky.reset(false);
  sky.canFly = false;
  sky.hurt();
  assert.ok(sky.flightAllowed, 'sin suelo siempre se vuela');
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
  for (let feet = groundY; feet >= ceilingY + CONFIG.player.head.h; feet -= 5) {
    const top = cameraTarget(feet);
    assert.ok(feet - CONFIG.player.head.h >= top + 20 && feet <= top + CONFIG.height, `pies en ${feet}`);
  }
});

// --- Los niveles ----------------------------------------------------------------------

/** Corre el Spawner de un nivel completo como lo hace Game, y devuelve lo que puso (y cuándo). */
function spawnLevel(level, carry = null, options = {}) {
  const spawner = new Spawner(level, carry, options);
  const obstacles = [];
  const pickups = [];
  const placed = [];
  const taken = [];
  let distance = 0;
  while (distance < level.length) {
    const progress = distance / level.length;
    const speed = level.speed * (1 + level.ramp * progress);
    spawner.progress = progress;
    distance += speed * DT;
    for (const o of obstacles) o.update(DT, speed);
    const before = { obstacles: obstacles.length, pickups: pickups.length };
    spawner.update(DT, speed, distance, obstacles, pickups);
    for (const obstacle of obstacles.slice(before.obstacles)) placed.push({ obstacle, distance, speed });
    for (const pickup of pickups.slice(before.pickups)) {
      taken.push({ pickup, distance, speed, ahead: obstacles.slice(0, before.obstacles).map((o) => ({ right: o.x + o.w, sky: o.height === 'sky' })) });
    }
  }
  return { placed, pickups: taken, carry: spawner.carry() };
}

/** Lo más bajo y lo más alto (sobre el suelo) que llega un obstáculo en toda su vida, rayos incluidos. */
function reachOf(obstacle, speed) {
  const o = obstacle.clone();
  let low = Infinity;
  let high = -Infinity;
  for (let t = 0; t < 6; t += DT) {
    o.update(DT, speed);
    for (const box of o.hitboxes()) {
      low = Math.min(low, groundY - (box.y + box.h));
      high = Math.max(high, groundY - box.y);
    }
  }
  return { low, high };
}

test('los obstáculos de los 24 niveles siguen sus reglas, en el suelo y en el cielo', () => {
  const { clearDistance } = CONFIG.obstacles;
  const fullJumpTop = CONFIG.jumpHeight + CONFIG.player.head.h; // lo más alto que llega la cabeza
  const kinds = new Set();
  for (const difficulty of Object.keys(DIFFICULTIES)) {
    for (const level of levelsFor(difficulty)) {
      for (let seed = 1; seed <= 12; seed++) {
        withSeed(seed * 7919 + level.index, () => {
          const { placed } = spawnLevel(level);
          const where = `${difficulty} nivel ${level.index + 1} semilla ${seed}`;
          const ground = placed.filter((p) => p.obstacle.height !== 'sky');
          const sky = placed.filter((p) => p.obstacle.height === 'sky');
          for (const { obstacle } of ground) kinds.add(`${obstacle.kind}:${obstacle.motion}`);
          assert.ok(sky.length >= 4, `${where}: casi nada en el cielo (${sky.length})`);
          if (level.ground) assert.ok(ground.length >= 5, `${where}: casi nada en el suelo (${ground.length})`);
          else assert.equal(ground.length, 0, `${where}: obstáculos de suelo sin suelo`);
          for (const { obstacle, speed } of sky) {
            kinds.add(`${obstacle.kind}:${obstacle.motion}${obstacle.lightning ? ':rayo' : ''}`);
            // Ninguna nube de tormenta sin rayo, y su rayo siempre entero
            if (obstacle.kind === 'cloud') {
              assert.ok(obstacle.lightning, `${where}: una nube sin rayo`);
              assert.equal(obstacle.lightning.length, CONFIG.obstacles.lightning.length, `${where}: rayo recortado`);
            }
            // En toda su vida (moviéndose, y con sus rayos) no sale de su fila ni del cielo. Con
            // suelo, lo del cielo nunca estorba un salto normal: solo a quien vuela.
            const { low, high } = reachOf(obstacle, speed);
            if (level.ground) assert.ok(low > fullJumpTop, `${where}: ${obstacle.kind} (${obstacle.motion}) baja a ${low.toFixed(1)}`);
            else assert.ok(low >= 0, `${where}: ${obstacle.kind} se mete en las nubes`);
            assert.ok(high <= groundY - ceilingY + 1e-9, `${where}: ${obstacle.kind} sobre el techo`);
          }
          assert.ok(placed.at(-1).distance <= level.length - clearDistance + level.speed * 2 * DT, `${where}: obstáculo muy al final`);
        });
      }
    }
  }
  // Salen todos los movimientos, y nubes con rayo
  for (const kind of ['flyer:wave', 'flyer:dive', 'lantern:rise', 'cloud:bob:rayo', 'barrel:roll', 'hopper:hop']) assert.ok(kinds.has(kind), `nunca salió ${kind}`);
});

test('en difícil el cielo está más lleno: más obstáculos, oleadas más grandes y formaciones', () => {
  const skyCount = (difficulty) => {
    let total = 0;
    for (const level of levelsFor(difficulty)) {
      for (let seed = 1; seed <= 10; seed++) {
        withSeed(seed * 97 + level.index, () => {
          total += spawnLevel(level).placed.filter((p) => p.obstacle.height === 'sky').length;
        });
      }
    }
    return total;
  };
  const easy = skyCount('easy');
  const hard = skyCount('hard');
  assert.ok(hard > easy * 1.6, `difícil ${hard} vs fácil ${easy}`);
});

test('el nivel tiene tramos y termina con una racha más intensa', () => {
  const level = levelsFor('easy')[3];
  const spawner = new Spawner(level);
  const names = [];
  for (let p = 0; p <= 1; p += 0.01) {
    spawner.progress = p;
    if (names.at(-1) !== spawner.section.name) names.push(spawner.section.name);
  }
  assert.deepEqual(names, ['calm', 'ground', 'sky', 'mixed', 'rush']);
});

test('las nubes de tormenta avisan antes del rayo, y el rayo golpea', () => {
  const cloud = new Obstacle('cloud', 400, { height: 'sky', center: 120, limits: { low: 28, high: 480 } });
  assert.ok(cloud.lightning, 'sin rayo');
  let warned = false;
  let struck = false;
  for (let t = 0; t < CONFIG.obstacles.lightning.period * 2; t += DT) {
    cloud.update(DT, 0);
    if (cloud.warning) warned = true;
    if (cloud.striking) {
      assert.ok(warned, 'el rayo cayó sin avisar');
      assert.equal(cloud.hitboxes().length, 2);
      struck = true;
    }
  }
  assert.ok(struck);
});

test('los rayos tienen un ritmo que se lee: caen varias veces mientras la nube cruza la pantalla', () => {
  const { period, warn } = CONFIG.obstacles.lightning;
  for (const level of levelsFor('hard')) {
    const cloud = new Obstacle('cloud', CONFIG.width, { height: 'sky', center: 300, limits: { low: level.lanes.sky.from, high: level.lanes.sky.to } });
    // A la velocidad más rápida del nivel (el final, con lo más alto del cielo)
    const speed = level.speed * (1 + level.ramp) + CONFIG.obstacles.altitudeSpeed * 4;
    let strikes = 0;
    let seconds = 0;
    while (cloud.x + cloud.w > CONFIG.player.x) {
      cloud.update(DT, speed);
      seconds += DT;
      if (cloud.struck) strikes++;
    }
    // Siempre caben al menos 2 ciclos completos (aviso y rayo) antes de llegar al dragón, y no se
    // salta ninguno
    assert.ok(seconds / period >= 2, `nivel ${level.index + 1}: la nube cruza en ${seconds.toFixed(2)} s`);
    assert.ok(strikes >= Math.floor(seconds / period), `nivel ${level.index + 1}: ${strikes} rayos en ${seconds.toFixed(2)} s`);
  }
  // Y siempre avisa antes de cada uno, con tiempo para verlo
  assert.ok(warn >= 0.25);
});

test('los cócteles y la comida salen al azar, nunca juntos ni encimados a un obstáculo de su altura', () => {
  const { clearBefore, clearAfter, apart } = CONFIG.pickups;
  const { skyFloor } = CONFIG.obstacles;
  let foods = 0;
  let cocktails = 0;
  let obstacleCount = 0;
  // Como en el juego: los 12 niveles seguidos, con la cuenta de cócteles y comida de uno al otro
  for (let seed = 1; seed <= 20; seed++) {
    let carry = null;
    for (const level of levelsFor('hard')) {
      withSeed(seed * 31 + level.index, () => {
        const result = spawnLevel(level, carry);
        carry = result.carry;
        const { placed, pickups } = result;
        const where = `nivel ${level.index + 1} semilla ${seed}`;
        foods += pickups.filter((p) => p.pickup.type === 'food').length;
        cocktails += pickups.filter((p) => p.pickup.type === 'cocktail').length;
        obstacleCount += placed.length;
        pickups.forEach(({ pickup, distance, speed, ahead }, i) => {
          // Las filas de su altura (como en el Spawner)
          const height = groundY - pickup.baseY;
          const groundLane = level.ground && height < skyFloor + 20;
          const skyLane = height > skyFloor - 40 || !level.ground;
          const mine = (sky) => (sky ? skyLane : groundLane);
          // Lo que ya estaba en su fila quedó lejos...
          for (const { right, sky } of ahead) if (mine(sky)) assert.ok(right <= CONFIG.width - clearBefore + 1e-9, `${where}: obstáculo pegado antes`);
          // ...y lo siguiente de su fila esperó
          const next = placed.find((p) => p.distance > distance && mine(p.obstacle.height === 'sky'));
          if (next) assert.ok(next.distance - distance >= clearAfter * speed * 0.97, `${where}: obstáculo pegado después`);
          // Nunca dos juntos
          if (i) assert.ok((distance - pickups[i - 1].distance) / speed >= apart * 0.95, `${where}: dos cosas juntas`);
          // Entre casi el suelo y casi el techo
          assert.ok(pickup.baseY - pickup.r - CONFIG.pickups.bob >= ceilingY && pickup.baseY + pickup.r + CONFIG.pickups.bob <= groundY, `${where}: fuera del mundo`);
        });
      });
    }
  }
  assert.ok(foods > 0, 'nunca salió comida');
  assert.ok(cocktails > foods, 'menos cócteles que comida');
  // Siempre hay muchos más obstáculos que cosas para recoger
  assert.ok(obstacleCount >= 6 * (foods + cocktails), `${obstacleCount} obstáculos para ${foods + cocktails} cosas`);
});

test('la estrella sale una vez por nivel con suelo, a ras del suelo y al principio; nunca si ya se vuela', () => {
  for (const level of levelsFor('hard')) {
    for (let seed = 1; seed <= 10; seed++) {
      withSeed(seed * 13 + level.index, () => {
        const where = `nivel ${level.index + 1} semilla ${seed}`;
        const wanted = spawnLevel(level, null, { star: level.ground }).pickups.filter((p) => p.pickup.type === 'star');
        assert.equal(wanted.length, level.ground ? 1 : 0, `${where}: estrellas`);
        for (const { pickup, distance } of wanted) {
          // Se toma corriendo: a la altura de la cabeza en el suelo
          assert.ok(Math.abs(groundY - pickup.baseY - CONFIG.star.height) < 1e-9, `${where}: muy alta`);
          assert.ok(distance < level.length * 0.4, `${where}: muy tarde (${distance})`);
        }
        assert.equal(spawnLevel(level, null, { star: false }).pickups.filter((p) => p.pickup.type === 'star').length, 0);
      });
    }
  }
});

test('la racha sube el multiplicador cada tantos esquivados y un golpe la reinicia', () => {
  const combo = new Combo();
  const { every, step, max } = CONFIG.combo;
  assert.equal(combo.add(every - 1), false);
  assert.equal(combo.multiplier, 1);
  assert.equal(combo.add(1), true);
  assert.equal(combo.multiplier, 1 + step);
  combo.add(every * 100);
  assert.equal(combo.multiplier, max);
  assert.equal(combo.break(), true);
  assert.equal(combo.multiplier, 1);
  assert.equal(combo.break(), false);
});

test('pasar volando justo debajo de algo da puntos; lo que pasa muy arriba no alarga la racha', () => {
  // Volando: el dragón se queda a una altura fija y una criatura pasa justo encima
  const flying = new Player();
  flying.reset(false);
  flying.waiting = false;
  flying.update(DT, NOTHING, 0);
  const head = flying.hitboxes()[0];
  const near = new Obstacle('flyer', flying.x + 40, { height: 'sky', center: groundY - head.y + 6 + 7 });
  near.bob = 0;
  near.update(0, 0);
  const far = new Obstacle('flyer', flying.x + 40, { height: 'sky', center: groundY - head.y + 200 });
  const calls = new CloseCalls();
  let points = 0;
  let cleared = 0;
  for (let i = 0; i < 120; i++) {
    for (const o of [near, far]) o.x -= 4;
    flying.y = head.y + head.h + 2; // sin moverse
    flying.onGround = false;
    const result = calls.update(flying, [near, far]);
    points += result.points;
    cleared += result.cleared;
  }
  assert.equal(points, CONFIG.closeCalls.graze);
  assert.equal(cleared, 1, 'solo cuenta la que pasó cerca');
});

test('el orden de los mundos: empieza tras tu animal, termina en el tuyo, sin cielo al principio', () => {
  for (const sign of ZODIAC) {
    const order = worldOrder(sign.id).map((w) => w.id);
    assert.equal(new Set(order).size, 12, `${sign.id}: mundos repetidos`);
    assert.equal(order.at(-1), sign.id, `${sign.id}: su mundo no es el último`);
    for (let i = 0; i < 3; i++) assert.ok(!ZODIAC.find((z) => z.id === order[i]).noGround, `${sign.id}: sin suelo en el nivel ${i + 1}`);
    // El que va primero (salvo que sea un mundo sin suelo) es el que sigue al suyo
    const next = ZODIAC[(ZODIAC.indexOf(sign) + 1) % 12];
    if (!next.noGround) assert.equal(order[0], next.id);
  }
});

test('el animal según la fecha: el año chino empieza con el Año Nuevo lunar', () => {
  // Rata en 2020 (Año Nuevo: 25 de enero); quien nació el 24 de enero aún es Cerdo
  assert.equal(signOfYear(2020).id, 'rat');
  assert.equal(signOfBirth(2020, 1, 24).id, 'pig');
  assert.equal(signOfBirth(2020, 1, 25).id, 'rat');
  assert.equal(signOfBirth(2020, 3).id, 'rat');
  // En enero, si el Año Nuevo fue en febrero, siempre es el animal del año anterior
  assert.equal(needsDay(2000, 1), false);
  assert.equal(signOfBirth(2000, 1).id, 'rabbit');
  assert.equal(signOfBirth(2000, 2, 4).id, 'rabbit');
  assert.equal(signOfBirth(2000, 2, 5).id, 'dragon');
  // La tabla va de 1924 a 2043, siempre entre el 21 de enero y el 20 de febrero
  for (let year = FIRST_YEAR; year <= LAST_YEAR; year++) {
    const { month, day } = newYearOf(year);
    assert.ok((month === 1 && day >= 21) || (month === 2 && day <= 20), `${year}: ${month}/${day}`);
  }
});

test('cada animal tiene su rival enfrente en la rueda (los choques)', () => {
  const pairs = { rat: 'horse', ox: 'goat', tiger: 'monkey', rabbit: 'rooster', dragon: 'dog', snake: 'pig' };
  for (const [a, b] of Object.entries(pairs)) {
    assert.equal(rivalOf(a).id, b);
    assert.equal(rivalOf(b).id, a);
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
  const { dragon, near, pickups, speed, boss = null } = world;
  if (!boss && dragon.ground && !near.length && !pickups.length && dragon.onGround) return { lasts: HORIZON, got: false, y: dragon.y };
  let { scroll } = world;
  const d = dragon.clone();
  const os = near.map((o) => o.clone());
  const b = boss?.clone();
  const ps = pickups.map((p) => Object.assign(Object.create(Object.getPrototypeOf(p)), p));
  let got = false;
  for (let i = 0; i < HORIZON; i++) {
    scroll += speed * DT;
    for (const o of os) o.update(DT, speed);
    for (const p of ps) p.update(DT, speed);
    d.update(DT, inputOf(plan.at(k + i)), scroll);
    b?.update(DT, { playerY: d.y - CONFIG.player.head.h / 2, spawn: (o) => os.push(o) });
    const body = d.hitboxes();
    if (d.bumped || os.some((o) => anyOverlap(body, o.hitboxes())) || (b && anyOverlap(body, b.hitboxes()))) return { lasts: i, got };
    if (!got && ps.some((p) => anyOverlap([body[0]], p.hitboxes()))) got = true;
  }
  return { lasts: HORIZON, got, y: d.y };
}

function botRun(difficulty, seed, { stars = true } = {}) {
  return withSeed(seed, () => {
    const dragon = new Player();
    let scroll = 0;
    let obstacles = [];
    let pickups = [];
    let hits = 0;
    let completed = 0;
    let seen = 0;
    let collected = 0;
    let current = { plan: PLANS[0], k: 0 };
    let carry = null;
    let foods = 0;
    for (const level of levelsFor(difficulty)) {
      if (level.index === 0) dragon.reset(level.ground);
      else dragon.setGround(level.ground);
      const spawner = new Spawner(level, carry, { star: stars && level.ground && !dragon.canFly });
      let distance = 0;
      let steps = 0;
      while (!(distance >= level.length && !obstacles.length)) {
        if (++steps > 60 * 120) throw new Error(`el nivel ${level.index + 1} no termina`);
        if (dragon.waiting) {
          dragon.update(DT, inputOf({ press: ['jump'] }), scroll);
          continue;
        }
        const progress = Math.min(1, distance / level.length);
        const speed = level.speed * (1 + level.ramp * progress);
        spawner.progress = progress;

        // Decide mirando solo lo que está a menos de REACH segundos (lo que dura un salto): lo que
        // viene después se resuelve después. Sigue con su plan si no choca (y no se pierde algo que
        // podría tomar); si no, busca el primero que no choque, de preferencia uno que tome algo. Si
        // ninguno sirve todavía y esperar en el suelo es seguro, espera (como una persona: salta
        // cuando el salto ya libra el obstáculo, no antes).
        const front = dragon.x + CONFIG.player.head.w / 2;
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
        seen += pickups.slice(before).filter((p) => p.type !== 'star').length;
        foods += pickups.slice(before).filter((p) => p.type === 'food').length;
        const body = dragon.hitboxes();
        const hit = obstacles.find((o) => anyOverlap(body, o.hitboxes()));
        if (dragon.canBeHit && (hit || dragon.bumped)) {
          hits++;
          if (process.env.BOT_DEBUG) console.log(difficulty, 'nivel', level.index + 1, hit?.kind ?? 'nubes', hit?.height, current.plan.name, { y: Math.round(dragon.y) });
          dragon.hurt();
        }
        const grabbed = pickups.filter((p) => anyOverlap([body[0]], p.hitboxes()));
        collected += grabbed.filter((p) => p.type !== 'star').length;
        if (grabbed.some((p) => p.type === 'star')) dragon.canFly = true;
        pickups = pickups.filter((p) => !grabbed.includes(p));
      }
      carry = spawner.carry();
      completed++;
    }
    return { hits, completed, seen, collected, foods };
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
  assert.ok(collected / seen >= 0.8, `solo tomó ${collected} de ${seen}`);

  // Sin tomar nunca la estrella (solo corriendo y saltando, salvo en los mundos sin suelo) también
  // se ganan los 12 niveles sin un golpe
  for (const difficulty of ['easy', 'hard']) {
    const result = botRun(difficulty, 7 * 104729, { stars: false });
    assert.equal(result.completed, 12);
    assert.equal(result.hits, 0, `${difficulty} sin estrella: ${result.hits} golpes`);
  }
});

// --- El nivel 13 -----------------------------------------------------------------------

test('el nivel 13 es contra el rival, en su mundo; el viaje tiene 13 niveles', () => {
  for (const sign of ZODIAC) {
    const journey = journeyFor('easy', sign.id);
    assert.equal(journey.length, 13);
    const last = journey.at(-1);
    assert.ok(last.boss);
    assert.equal(last.id, rivalOf(sign.id).id);
    assert.equal(last.lanes.ground, null);
    assert.equal(last.lanes.sky, null);
  }
});

test('el jefe siempre avisa antes de atacar, y su copia hace exactamente lo mismo', () => {
  for (const difficulty of ['easy', 'hard']) {
    const boss = new Boss('horse', difficulty, 12345);
    const twin = boss.clone();
    const shots = [];
    let warnedFor = 0;
    let lastWarning = null;
    const seen = new Set();
    for (let i = 0; i < 60 * 40; i++) {
      const before = shots.length;
      const state = boss.state;
      boss.update(DT, { playerY: 150 + Math.sin(i / 50) * 80, spawn: (o) => shots.push(o) });
      twin.update(DT, { playerY: 150 + Math.sin(i / 50) * 80, spawn: () => {} });
      assert.equal(twin.y, boss.y);
      assert.equal(twin.state, boss.state);
      if (boss.warning) {
        warnedFor = lastWarning === boss.warning ? warnedFor + DT : DT;
        lastWarning = boss.warning;
      }
      // Cada ataque empieza después de un aviso completo
      if (state === 'telegraph' && boss.state !== 'telegraph') {
        seen.add(boss.attack);
        assert.ok(warnedFor >= CONFIG.boss.telegraph[boss.attack] - DT * 1.5, `${boss.attack} con ${warnedFor.toFixed(2)} s de aviso`);
      }
      // Los disparos solo salen al atacar
      if (shots.length > before) assert.ok(['telegraph', 'aiming'].includes(state), `disparó en ${state}`);
    }
    for (const attack of ['volley', 'aimed', 'charge']) assert.ok(seen.has(attack), `${difficulty}: nunca hizo ${attack}`);
  }
  // La ráfaga deja huecos por donde cabe la cabeza
  const { spread, h } = CONFIG.boss.shot;
  assert.ok(spread - h > CONFIG.player.head.h + 10);
});

test('el jefe cae con tantas bolas de fuego como su vida (también mientras entra)', () => {
  const boss = new Boss('dog', 'easy', 7);
  assert.ok(boss.hit()); // entrando ya se le puede pegar: ninguna bola de fuego se pierde
  while (boss.state === 'enter') boss.update(DT, { playerY: 150, spawn: () => {} });
  for (let i = 0; i < CONFIG.boss.hp.easy - 2; i++) assert.ok(boss.hit());
  assert.ok(!boss.defeated);
  boss.hit();
  assert.ok(boss.defeated && boss.hitboxes().length === 0);
  for (let t = 0; t < CONFIG.boss.fallSeconds + 0.1; t += DT) boss.update(DT, { playerY: 150, spawn: () => {} });
  assert.ok(boss.done);
});

/**
 * Un bot que pelea contra el jefe: esquiva con los mismos planes (viendo venir al jefe con su copia),
 * junta cócteles cuando le faltan bolas de fuego y, con fuego, se pone a la altura del jefe y le
 * dispara.
 */
function bossRun(difficulty, seed, sign = 'pig') {
  return withSeed(seed, () => {
    const level = bossLevel(difficulty, sign);
    const fireMax = DIFFICULTIES[difficulty].fireMax;
    const dragon = new Player();
    dragon.reset(level.ground);
    dragon.forceFlight = true;
    dragon.waiting = false;
    const boss = new Boss(level.id, difficulty, seed);
    const spawner = new Spawner(level);
    let obstacles = [];
    let pickups = [];
    let fireballs = [];
    const infinite = CONFIG.boss.infiniteFire[difficulty];
    let ammo = infinite ? Infinity : CONFIG.fire.start;
    let cocktails = 0;
    let cooldown = 0;
    let hits = 0;
    let scroll = 0;
    let distance = 0;
    let steps = 0;
    let current = { plan: PLANS[0], k: 0 };
    const head = CONFIG.player.head.h;
    while (!boss.done && ++steps < 60 * 180) {
      const speed = level.speed;
      const front = dragon.x + CONFIG.player.head.w / 2;
      const ahead = (o) => o.x - front < (speed + (o.speedBonus ?? 0)) * REACH;
      const world = { dragon, speed, scroll, near: obstacles.filter(ahead), pickups: pickups.filter(ahead), boss };
      // A dónde ir: por un cóctel si le faltan bolas de fuego; si no, a la altura del jefe
      const pickup = pickups.find((p) => p.x > front - 10 && p.x - front < speed * 2.5 && (ammo < 3 || p.type === 'food'));
      const goal = pickup ?? (!boss.defeated && ammo > 0 ? { y: boss.y } : null);
      const keep = tryPlan(world, current.plan, current.k);
      if (keep.lasts < HORIZON || (goal && !keep.got && current.k % 6 === 0)) {
        const results = PLANS.map((plan) => ({ plan, ...tryPlan({ ...world, pickups: pickup ? [pickup] : world.pickups }, plan, 0) }));
        const grab = results.find((r) => r.lasts === HORIZON && r.got);
        const safe = results.find((r) => r.lasts === HORIZON);
        const closer = goal && results.filter((r) => r.lasts === HORIZON).sort((a, b) => Math.abs(a.y - goal.y - head / 2) - Math.abs(b.y - goal.y - head / 2))[0];
        const next = grab?.plan ?? closer?.plan ?? (keep.lasts === HORIZON ? null : safe?.plan ?? results.reduce((a, b) => (b.lasts > a.lasts ? b : a)).plan);
        if (next) current = { plan: next, k: 0 };
      }
      const input = inputOf(current.plan.at(current.k));
      current.k += 1;

      // Dispara cuando está a la altura del jefe
      const headY = dragon.y - head / 2;
      cooldown -= DT;
      if (ammo > 0 && cooldown <= 0 && !boss.defeated && boss.state !== 'enter' && Math.abs(headY - boss.y) < boss.h / 2 - 8) {
        fireballs.push(new Fireball(dragon.x + CONFIG.player.head.w / 2, headY));
        ammo -= 1;
        cooldown = CONFIG.fire.cooldown;
      }

      // El mismo ciclo que Game.play
      scroll += speed * DT;
      distance += speed * DT;
      for (const o of obstacles) o.update(DT, speed);
      for (const p of pickups) p.update(DT, speed);
      for (const f of fireballs) f.update(DT);
      obstacles = obstacles.filter((o) => !o.offscreen);
      pickups = pickups.filter((p) => !p.offscreen);
      fireballs = fireballs.filter((f) => !f.offscreen);
      dragon.update(DT, input, scroll);
      spawner.update(DT, speed, distance, obstacles, pickups);
      boss.update(DT, { playerY: dragon.y - head / 2, spawn: (o) => obstacles.push(o) });
      for (const f of fireballs) {
        if (anyOverlap(f.hitboxes(), boss.hitboxes())) {
          boss.hit();
          f.spent = true;
          continue;
        }
        const shot = obstacles.find((o) => anyOverlap(f.hitboxes(), o.hitboxes()));
        if (shot) {
          obstacles = obstacles.filter((o) => o !== shot);
          f.spent = true;
        }
      }
      fireballs = fireballs.filter((f) => !f.spent);
      if (boss.defeated) obstacles = obstacles.filter((o) => o.kind !== 'shot');
      const body = dragon.hitboxes();
      const struck = obstacles.find((o) => anyOverlap(body, o.hitboxes())) ?? (anyOverlap(body, boss.hitboxes()) ? boss : null);
      if (dragon.canBeHit && (struck || dragon.bumped)) {
        hits++;
        if (process.env.BOT_DEBUG) console.log('jefe', difficulty, struck === boss ? 'cuerpo' : 'disparo', boss.state, boss.attack, current.plan.name, { y: Math.round(dragon.y), boss: Math.round(boss.y) });
        dragon.hurt();
      }
      const grabbed = pickups.filter((p) => anyOverlap([body[0]], p.hitboxes()));
      for (const p of grabbed) {
        if (p.type === 'cocktail') ammo = Math.min(fireMax, ammo + CONFIG.cocktails.perCocktail);
        if (p.type === 'cocktail') cocktails++;
      }
      pickups = pickups.filter((p) => !grabbed.includes(p));
    }
    return { hits, done: boss.done, seconds: steps / 60, cocktails };
  });
}

test('al jefe se le puede vencer sin un golpe, en fácil y en difícil (también en el cielo, sin suelo)', () => {
  // Con el Cerdo, el rival es la Serpiente (con suelo); con el Perro, el Dragón (sin suelo)
  assert.equal(bossLevel('easy', 'dog').ground, false);
  for (const difficulty of ['easy', 'hard']) {
    for (const [seed, sign] of [[11, 'pig'], [22, 'pig'], [33, 'pig'], [44, 'dog'], [55, 'rabbit']]) {
      const result = bossRun(difficulty, seed, sign);
      if (process.env.BOT_DEBUG) console.log('jefe', difficulty, seed, result);
      assert.ok(result.done, `${difficulty} semilla ${seed}: no lo venció en ${result.seconds.toFixed(0)} s`);
      assert.equal(result.hits, 0, `${difficulty} semilla ${seed}: ${result.hits} golpes`);
      // En fácil el fuego es infinito: ahí no salen cócteles
      if (difficulty === 'easy') assert.equal(result.cocktails, 0);
    }
  }
});

test('contra el rival: en fácil solo sale comida, muy espaciada; en difícil, cócteles', () => {
  const easy = bossLevel('easy', 'pig');
  const hard = bossLevel('hard', 'pig');
  assert.equal(easy.pickups.cocktail, null);
  assert.ok(easy.pickups.food[0] >= 20, 'la comida debe salir muy de vez en cuando');
  assert.ok(hard.pickups.cocktail[1] < 6);
  withSeed(5, () => {
    // Aunque venga del nivel 12 con un cóctel a punto de salir, en fácil no sale
    const spawner = new Spawner(easy, { cocktail: 0.1, food: 30 });
    const obstacles = [];
    const pickups = [];
    for (let t = 0, d = 0; t < 60; t += DT) {
      d += easy.speed * DT;
      spawner.update(DT, easy.speed, d, obstacles, pickups);
    }
    assert.ok(pickups.every((p) => p.type === 'food'), 'salió un cóctel en fácil');
    assert.ok(pickups.length >= 1 && pickups.length <= 3, `${pickups.length} comidas en un minuto`);
  });
});

test('el botón de fuego: un toque es un disparo; mantenido se carga el especial', () => {
  const button = new FireButton();
  const step = (pressed, down, canCharge = true) => button.update(DT, { pressed, down, canCharge });
  // Sin poder cargar: sale en cuanto se presiona
  assert.equal(step(true, true, false), 'normal');
  assert.equal(step(false, true, false), null);
  // Con carga: un toque rápido sale al soltar, normal
  assert.equal(step(true, true), null);
  assert.equal(step(false, true), null);
  assert.equal(step(false, false), 'normal');
  // Mantenido hasta cargarse: avisa una vez y, al soltar, sale el especial
  assert.equal(step(true, true), null);
  let charged = 0;
  for (let t = 0; t < CONFIG.charge.seconds + 0.1; t += DT) {
    assert.equal(step(false, true), null);
    if (button.charged) charged++;
  }
  assert.ok(button.ready && charged === 1);
  assert.equal(step(false, false), 'special');
  // Si a media carga ya no se puede (el jefe cayó), sale un disparo normal
  step(true, true);
  assert.equal(step(false, true, false), 'normal');

  // Con fuego infinito (fácil): el normal sale al presionar; mantenido, además, el especial
  const easy = new FireButton();
  const tap = (pressed, down) => easy.update(DT, { pressed, down, canCharge: true, instant: true });
  assert.equal(tap(true, true), 'normal');
  assert.equal(tap(false, false), null); // al soltar un toque no sale otro
  assert.equal(tap(true, true), 'normal');
  for (let t = 0; t < CONFIG.charge.seconds + 0.1; t += DT) assert.equal(tap(false, true), null);
  assert.equal(tap(false, false), 'special');
});

test('el disparo especial le quita más vida al jefe', () => {
  const special = new Fireball(0, 0, { special: true });
  assert.equal(special.power, CONFIG.charge.damage);
  assert.ok(special.r > new Fireball(0, 0).r);
  const boss = new Boss('dog', 'hard', 3);
  while (boss.state === 'enter') boss.update(DT, { playerY: 150, spawn: () => {} });
  boss.hit(special.power);
  assert.equal(boss.hp, CONFIG.boss.hp.hard - CONFIG.charge.damage);
});

test('cada animal tiene su símbolo, su nombre en chino simplificado, su pinyin y cuatro virtudes', async () => {
  const { es } = await import('../js/i18n/es.js');
  const { en } = await import('../js/i18n/en.js');
  for (const sign of ZODIAC) {
    assert.match(sign.hanzi, /^\p{Script=Han}$/u, `${sign.id}: símbolo`);
    assert.match(sign.simplified, /^\p{Script=Han}$/u, `${sign.id}: simplificado`);
    assert.ok(sign.pinyin.length > 0);
    for (const dict of [es, en]) assert.equal(dict[`virtues.${sign.id}`].split(' · ').length, 4, `${sign.id}: virtudes`);
    // Y por qué choca con su rival: lo suyo contra lo del rival (y el rival dice lo mismo al revés)
    const rival = rivalOf(sign.id);
    for (const dict of [es, en]) {
      const [mine, theirs] = dict[`rivalry.${sign.id}`].toLowerCase().split(/ contra | vs\. /);
      const [theirsBack, mineBack] = dict[`rivalry.${rival.id}`].toLowerCase().split(/ contra | vs\. /);
      assert.ok(mine && theirs, `${sign.id}: por qué choca con su rival`);
      assert.equal(mine, mineBack, `${sign.id} contra ${rival.id}`);
      assert.equal(theirs, theirsBack, `${sign.id} contra ${rival.id}`);
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

test('la cruceta táctil: una dirección a la vez, nada en el centro y sin cambiar de eje por accidente', async () => {
  const { padDirection } = await import('../js/ui/TouchPad.js');
  assert.equal(padDirection(0, 0), null);
  assert.equal(padDirection(0.1, -0.15), null); // el centro
  assert.equal(padDirection(0, -0.7), 'up');
  assert.equal(padDirection(0, 0.7), 'down');
  assert.equal(padDirection(-0.7, 0), 'left');
  assert.equal(padDirection(0.7, 0), 'right');
  // Nunca dos: en diagonal gana el eje más marcado
  assert.equal(padDirection(0.6, -0.5), 'right');
  // Con el pulgar en ▲, irse un poco a la derecha no cambia a ▶...
  assert.equal(padDirection(0.6, -0.5, 'up'), 'up');
  // ...solo si de verdad se pasa al otro lado
  assert.equal(padDirection(0.8, -0.4, 'up'), 'right');
  assert.equal(padDirection(-0.45, 0.55, 'left'), 'left');
  assert.equal(padDirection(-0.3, 0.7, 'left'), 'down');
});
