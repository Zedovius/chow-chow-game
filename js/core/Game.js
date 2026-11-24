// Orquesta el juego: estados, niveles, choques, fuego, puntuación y menús.
//
// Estados: title → playing ⇄ paused
//                  playing → dying → gameOver → (reintentar | title)
//                  playing → ending (al vencer al rival, en el nivel 12: nombre en HI RECORDS) → title
//
// Un corredor sin fin, como Chispas: el dragón corre, salta y se agacha entre obstáculos, y en el
// aire puede aletear y volar (hasta CONFIG.skyJumps saltos de alto; la cámara lo sigue). El Dragón y
// el Gallo son niveles sin suelo. Dispara bolas de fuego que se recargan con cócteles; la comida
// china da corazones. En tres mundos al azar sale un ingrediente (un hongo, un agave o un chile, uno
// por nivel): juntar los tres en el viaje (el trío) prepara el cóctel del signo. Esquivar de cerca alarga la racha, que multiplica los puntos.
// Los 12 niveles van seguidos, sin escenas: al terminar uno se cobran los corazones y el siguiente
// empieza sin detenerse, con su cartel.
//
// Lo que pasa se avisa por this.events (ver core/events.js): el sonido y los efectos escuchan ahí.

import { CONFIG } from '../config.js';
import { Loop } from './Loop.js';
import { StateMachine } from './StateMachine.js';
import { anyOverlap } from './collision.js';
import { CloseCalls } from './closeCalls.js';
import { FireButton } from './charge.js';
import { Combo } from './combo.js';
import { Events } from './events.js';
import { touch, idleSeconds } from './activity.js';
import { addScore, loadBoards, placeIn } from './scores.js';
import { DIFFICULTIES, levelsFor, journeyFor, signById } from '../world/levels.js';
import { Boss } from '../entities/Boss.js';
import { Spawner } from '../world/Spawner.js';
import { Player } from '../entities/Player.js';
import { Fireball } from '../entities/Fireball.js';
import { INGREDIENTS } from '../entities/Pickup.js';
import { planTrio, reschedule } from '../world/trio.js';
import { Scene, JADE } from '../graphics/Scene.js';
import { Camera } from '../graphics/Camera.js';
import { enterName } from '../ui/NameEntry.js';
import { recordNode } from '../ui/record.js';
import { drinkNode } from '../ui/drink.js';
import { pad } from '../ui/HUD.js';
import { t } from '../i18n/i18n.js';

function loadRecord() {
  try {
    const record = Number(localStorage.getItem(CONFIG.storageKey));
    // Un valor dañado o editado a mano (negativo, infinito, texto) no cuenta
    return Number.isFinite(record) && record > 0 ? Math.floor(record) : 0;
  } catch {
    return 0;
  }
}

function saveRecord(value) {
  if (CONFIG.test) return; // probando (?jefe, ?animal) no se guarda nada
  try {
    localStorage.setItem(CONFIG.storageKey, String(Math.floor(value)));
  } catch {
    // Sin almacenamiento, el récord dura solo esta visita
  }
}

const blend = (from, to, alpha) => from + (to - from) * alpha;
const HINT_FADE = 0.5; // segundos en que se desvanecen las flechas de ◀ ▶
// Suave al empezar y al terminar (0 a 1)
const smooth = (k) => k * k * (3 - 2 * k);

const STATES = {
  title: {
    update(dt, time) {
      this.prevScroll = this.scroll;
      this.scroll += CONFIG.speed.title * dt;
      this.player.prevY = this.player.y;
      this.player.hover(time, this.scroll);
      this.camera.update(dt, this.player.y);
      if (this.input.wasPressed('confirm')) this.titleScreen.confirm();
    },
  },
  playing: {
    update(dt) {
      this.play(dt);
    },
  },
  paused: {},
  // El mundo sigue avanzando y frena poco a poco mientras el dragón cae; el cuerpo lo sigue
  dying: {
    update(dt, time) {
      this.speed *= Math.exp(-CONFIG.deathSlowdown * dt);
      // Si cayó a media transición entre niveles, el fundido termina igual (no se queda a medias)
      if (this.transition) this.transition.time += dt;
      this.advanceWorld(dt);
      this.player.prevY = this.player.y;
      this.player.fall(dt, this.scroll);
      this.camera.update(dt, this.player.y);
      if (time >= CONFIG.deathDelay) this.gameOver();
    },
  },
  gameOver: {},
  ending: {},
};

export class Game {
  /**
   * @param {{ canvas: HTMLCanvasElement, stage: HTMLElement, input: import('./Input.js').Input,
   *           hud: import('../ui/HUD.js').HUD, dialogs: import('../ui/Dialogs.js').Dialogs,
   *           banner: HTMLElement, titleScreen: { root: HTMLElement, record: HTMLOutputElement,
   *           reset: () => void, remember: (difficulty: string) => void, confirm: () => void },
   *           events?: Events, images?: object, legend?: { show: (options) => void, hide: () => void } }} parts
   *   events: por donde se avisa lo que pasa; images: el arte cargado (graphics/assets.js); legend:
   *   lo que vale cada cosa que se recoge, al empezar una partida (ui/Legend.js)
   */
  constructor({ canvas, stage, input, hud, dialogs, banner, titleScreen, events = new Events(), images = null, legend = null }) {
    this.scene = new Scene(canvas, images);
    this.legend = legend;
    this.events = events;
    this.stage = stage;
    this.input = input;
    this.hud = hud;
    this.dialogs = dialogs;
    this.banner = banner;
    this.titleScreen = titleScreen;

    this.difficulty = 'easy';
    this.sign = null; // el animal de quien juega ('rat', 'ox'...), elegido con su fecha de nacimiento
    this.levels = levelsFor(this.difficulty);
    this.levelIndex = 0;
    this.level = this.levels[0];
    this.player = new Player();
    this.camera = new Camera();
    this.obstacles = [];
    this.pickups = []; // los cócteles y la comida
    this.fireballs = [];
    this.spawner = null;
    this.closeCalls = new CloseCalls();
    this.fireButton = new FireButton(); // el botón de fuego, con o sin carga (core/charge.js)
    this.boss = null; // el jefe del nivel 12 (entities/Boss.js)
    this.trio = new Set(); // los ingredientes del trío que lleva en el viaje
    this.moveHint = 0; // segundos que aún se ven las flechas ◀ ▶ contra el jefe
    this.trioPlan = {}; // en qué nivel sale cada uno (world/trio.js)
    this.levelStartTrio = new Set();
    this.combo = new Combo();
    this.section = null; // el tramo del nivel en que va (ver PACING en world/obstacles.js)

    this.score = 0;
    this.levelStartScore = 0;
    this.nextMilestone = CONFIG.milestone;
    this.record = loadRecord();
    this.recordToBeat = this.record;
    this.newRecord = false;
    this.lives = DIFFICULTIES.easy.lives;
    this.ammo = CONFIG.fire.start; // bolas de fuego
    this.levelStartAmmo = this.ammo;
    this.levelStartFlight = false;
    this.fireCooldown = 0;
    this.charging = false; // se está cargando el especial (para el sonido)
    this.distance = 0;
    this.speed = 0;
    this.scroll = 0;
    this.prevScroll = 0;
    // Cada flujo asíncrono (diálogos) guarda este número; si cambió, se abandona
    this.flow = 0;
    this.bannerTimer = 0;

    this.fsm = new StateMachine(this, STATES);
    this.loop = new Loop((dt) => this.update(dt), (alpha) => this.render(alpha), { onError: (error) => this.recover(error) });
    this.errors = { count: 0, since: 0 };

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) return;
      saveRecord(this.record);
      this.pause();
    });
  }

  start() {
    this.showTitle();
    this.loop.start();
  }

  /** Reglas de la dificultad actual (ver DIFFICULTIES en world/levels.js). */
  get mode() {
    return DIFFICULTIES[this.difficulty];
  }

  /** Lo que vale un corazón entero al terminar un nivel. */
  get heartPoints() {
    return CONFIG.heartBonus[this.difficulty] * this.mode.score;
  }

  /** Lo más que se puede cargar de bolas de fuego en esta dificultad. */
  get fireMax() {
    return this.mode.fireMax;
  }

  /** Difícil: los corazones se conservan de un nivel al otro. */
  get keepLives() {
    return Boolean(this.mode.keepLives);
  }

  get otherDifficulty() {
    return this.difficulty === 'easy' ? 'hard' : 'easy';
  }

  // --- Flujo del juego ----------------------------------------------------------

  showTitle() {
    this.flow++;
    this.cancelCharge();
    this.dialogs.close('title');
    this.hideBanner();
    this.legend?.hide();
    saveRecord(this.record);
    this.levels = levelsFor(this.difficulty, this.sign ?? undefined);
    this.level = this.levels[0];
    this.levelIndex = 0;
    this.clearWorld();
    this.player.sign = null;
    this.player.canFly = false;
    this.player.forceFlight = false;
    this.boss = null;
    this.transition = null;
    this.hud.hideBoss();
    this.player.reset(true);
    this.camera.snap(this.player.y);
    this.score = 0;
    this.hud.setScore(0);
    this.hud.setHigh(this.record);
    this.hud.setLevel('');
    this.titleScreen.record.value = pad(this.record);
    this.titleScreen.root.hidden = false;
    this.fsm.set('title');
    this.titleScreen.reset();
    this.events.emit('title');
  }

  /** Lo pide el menú de inicio: difficulty es 'easy' o 'hard'; sign, el animal que le dio la rueda. */
  newGame(difficulty = 'easy', sign = 'dragon') {
    if (!this.fsm.is('title')) return;
    this.startNewGame(difficulty, sign);
  }

  /** Una partida nueva con un animal (el mismo de antes si no se dice: reintentar, cambiar dificultad). */
  startNewGame(difficulty, sign = this.sign) {
    this.flow++;
    this.difficulty = DIFFICULTIES[difficulty] ? difficulty : 'easy';
    this.sign = signById(sign) ? sign : 'dragon';
    // Los mundos van en el orden del animal: empieza en el que sigue al suyo y termina en el suyo
    // Los 11 mundos (en el orden del animal, sin el de su rival) y el nivel 12: la pelea contra su rival
    this.levels = journeyFor(this.difficulty, this.sign);
    this.score = 0;
    this.lives = this.mode.lives;
    this.ammo = Math.min(CONFIG.fire.start, this.fireMax);
    // El trío: en qué tres mundos sale cada ingrediente, y empieza sin ninguno
    this.trioPlan = planTrio(this.levels.filter((level) => !level.boss).length);
    this.trio = new Set(CONFIG.test?.trio ? INGREDIENTS : []);
    this.levelStartTrio = new Set();
    this.combo.reset();
    this.hud.setCombo(1);
    this.recordToBeat = this.record;
    this.newRecord = false;
    this.hud.setNewRecord(false);
    this.hud.setHigh(this.record);
    this.titleScreen.root.hidden = true;
    this.player.sign = this.sign;
    this.player.canFly = Boolean(CONFIG.test?.fly);
    this.player.reset();
    this.hud.setFlight(this.player.canFly);
    this.events.emit('start', { difficulty: this.difficulty, sign: this.sign });
    this.startLevel(CONFIG.startLevel); // 0, salvo al probar con ?nivel=N
    // Lo que vale cada cosa que se recoge, hasta el primer salto. Mientras, el cartel solo dice el
    // nivel; el aviso para empezar va debajo de la leyenda, y las pistas salen después del salto.
    if (this.legend && !CONFIG.test) {
      this.showBanner(this.levelLabel(), false);
      this.legend.show({
        score: this.mode.score,
        fire: CONFIG.cocktails.perCocktail,
        hearts: CONFIG.food.hearts,
        sign: this.sign,
        prompt: t(this.level.ground ? 'level.start' : 'level.startSky'),
      });
    }
  }

  clearWorld() {
    this.obstacles = [];
    this.pickups = [];
    this.fireballs = [];
  }

  /** Empieza un nivel. continued: viene del anterior sin detenerse (el dragón sigue donde iba). */
  startLevel(index, { continued = false } = {}) {
    // Si viene volando de un mundo sin suelo, sigue volando: no se le quita la nubecita (o las alas)
    // al llegar a un mundo con suelo, ni le sale una estrella que ya no necesita
    const fromSky = continued && this.level && !this.level.ground;
    if (fromSky && this.levels[index].ground && this.player.alive && !this.player.canFly) {
      this.player.canFly = true;
      this.hud.setFlight(true);
    }
    // El paso suave del nivel anterior a este (colores y velocidad), si viene de él sin detenerse
    this.transition = continued && this.level ? { from: this.level, speed: this.speed, time: 0 } : null;
    this.levelIndex = index;
    this.level = this.levels[index];
    this.levelStartScore = this.score;
    this.levelStartAmmo = this.ammo;
    this.levelStartFlight = this.player.canFly;
    this.nextMilestone = (Math.floor(this.score / CONFIG.milestone) + 1) * CONFIG.milestone;
    this.distance = 0;
    this.speed = this.level.speed;
    // La cuenta de cócteles y comida sigue del nivel anterior si se viene de él sin detenerse
    // La estrella del vuelo sale una vez en cada nivel con suelo, si aún no tiene el poder
    // En fácil, el ingrediente que se escapó en el nivel anterior vuelve a salir más adelante
    const missed = continued ? this.trioPlan[index - 1] : null;
    if (missed && this.mode.trioRetry && !this.trio.has(missed)) {
      reschedule(this.trioPlan, missed, index, this.levels.filter((level) => !level.boss).length);
    }
    // El ingrediente del trío de este nivel, si le toca uno y aún no lo tiene
    const planned = this.level.boss ? null : this.trioPlan[index] ?? null;
    this.spawner = new Spawner(this.level, continued ? this.spawner?.carry() : null, {
      star: this.level.ground && !this.level.boss && !this.player.canFly,
      ingredient: planned && !this.trio.has(planned) ? planned : null,
    });
    // Lo que lleva del trío (se junta en todo el viaje; al reintentar el nivel, vuelve a como estaba)
    this.levelStartTrio = new Set(this.trio);
    this.hud.setTrio(this.trio, { visible: true });
    this.section = null;
    // El nivel 12: el rival, y todos vuelan
    this.boss = this.level.boss ? new Boss(this.level.id, this.difficulty, Math.floor(Math.random() * 2 ** 32)) : null;
    this.player.forceFlight = Boolean(this.level.boss);
    // Contra el jefe, también adelante y atrás (◀ ▶); unas flechas lo avisan hasta que se mueva
    this.player.moveRange = this.level.boss ? CONFIG.boss.move : null;
    this.moveHint = this.level.boss ? CONFIG.boss.move.hintSeconds : 0;
    if (this.boss) this.hud.showBoss(this.boss.hp, this.boss.maxHp, signById(this.level.id).body);
    else this.hud.hideBoss();
    if (continued) this.player.setGround(this.level.ground);
    else {
      this.clearWorld();
      this.player.reset(this.level.ground);
      this.camera.snap(this.player.y);
    }
    this.hud.setScore(this.score);
    this.hud.setLevel(this.levelLabel());
    this.cancelCharge();
    this.hud.setAmmo(this.ammo, this.fireMax, { infinite: this.infiniteFire });
    this.hud.setCharge(false, 0);
    this.showLives();
    // Si el dragón espera el primer salto, el cartel se queda con el aviso hasta que empiece
    const lines = [this.levelLabel(), ...this.levelHints()];
    if (this.player.waiting) {
      lines.push(t(this.level.ground ? 'level.start' : 'level.startSky'));
      touch(); // si nadie salta en un rato, regresa al menú (ver checkIdle)
    }
    this.showBanner(lines.join('\n'), !this.player.waiting);
    this.fsm.set('playing');
    this.events.emit('levelStart', { index, id: this.level.id, continued, ground: this.level.ground, boss: Boolean(this.boss) });
    if (this.boss) this.events.emit('bossStart', { sign: this.level.id });
  }

  /** Lo que el cartel de un nivel avisa debajo del nombre (el vuelo lo explica la leyenda). */
  levelHints() {
    // Contra el rival, solo el nombre: sin instrucciones (las flechas a los lados dicen que se puede mover)
    if (this.level.boss) return [];
    // En el primer nivel, cómo se carga el disparo especial (se puede en todos)
    if (this.levelIndex === 0 && CONFIG.charge.modes[this.difficulty]) return this.level.ground ? [t('level.charge')] : [t('level.sky'), t('level.charge')];
    return this.level.ground ? [] : [t('level.sky')];
  }

  levelLabel() {
    return t('level.label', { number: this.levelIndex + 1, name: t(this.level.nameKey) });
  }

  /** Un paso de simulación jugando. */
  play(dt) {
    if (this.input.wasPressed('pause')) {
      this.pause();
      return;
    }
    // Antes del primer salto, el mundo espera: el dragón está de pie (o flotando, sin suelo). El
    // paso del primer salto ya es de juego (Dragon.update lo hizo): el mundo arranca en el siguiente.
    if (this.player.waiting) {
      this.prevScroll = this.scroll;
      this.player.prevY = this.player.y;
      this.player.update(dt, this.input, this.scroll);
      if (this.player.waiting) return;
      this.legend?.hide();
      this.showBanner([this.levelLabel(), ...this.levelHints()].join('\n'));
      this.events.emit(this.player.flapped ? 'flap' : 'jump');
      return;
    }
    this.updateBanner(dt);
    // Cada nivel acelera un poco hasta su final (ramp, según la dificultad)
    const progress = Math.min(1, this.distance / this.level.length);
    this.speed = this.level.speed * (1 + this.level.ramp * progress);
    // Recién llegado de otro nivel: la velocidad pasa poco a poco de la que llevaba a la de este
    if (this.transition) {
      this.transition.time += dt;
      const k = this.transitionBlend;
      this.speed = this.transition.speed + (this.speed - this.transition.speed) * smooth(k);
      if (k >= 1) this.transition = null;
    }
    this.spawner.progress = progress;
    this.updateSection();
    const dx = this.advanceWorld(dt);
    this.distance += dx;
    this.addScore(dx * CONFIG.scorePerPx * this.mode.score);
    // Un rayo que empieza en pantalla: para el trueno
    if (this.obstacles.some((o) => o.struck && o.x < CONFIG.width && o.x + o.w > 0)) this.events.emit('thunder');

    this.player.prevY = this.player.y;
    this.player.update(dt, this.input, this.scroll);
    // Las flechas de ◀ ▶ se desvanecen al moverse (o con el tiempo)
    if (this.moveHint > 0) this.moveHint = Math.min(this.moveHint, this.player.x === CONFIG.player.x ? Infinity : HINT_FADE) - dt;
    if (this.player.jumped) this.events.emit('jump');
    if (this.player.flapped) this.events.emit('flap');
    if (this.player.landed) this.events.emit('land');
    this.camera.update(dt, this.player.y);
    this.spawner.update(dt, this.speed, this.distance, this.obstacles, this.pickups);
    this.updateBoss(dt);

    this.fireControl(dt);
    this.updateFireballs();
    this.checkCollisions();
    if (!this.fsm.is('playing')) return;
    const { points, cleared } = this.closeCalls.update(this.player, this.obstacles);
    if (points) {
      this.addScore(points * this.mode.score);
      this.events.emit('closeCall');
    }
    this.extendCombo(cleared);

    if (this.boss ? this.boss.done : this.distance >= this.level.length && !this.obstacles.length) this.completeLevel();
  }

  /** El jefe del nivel 12: se mueve, avisa y ataca (sus disparos son obstáculos del mundo). */
  updateBoss(dt) {
    const boss = this.boss;
    if (!boss) return;
    const warning = boss.warning;
    const state = boss.state;
    boss.update(dt, {
      playerY: this.player.y - CONFIG.player.head.h / 2,
      playerX: this.player.x,
      worldSpeed: this.speed,
      spawn: (shot) => this.obstacles.push(shot),
    });
    if (boss.warning && boss.warning !== warning) this.events.emit('bossWarn', { attack: boss.warning });
    if (state === 'telegraph' && boss.state !== 'telegraph') this.events.emit('bossAttack', { attack: boss.attack });
  }

  /** Qué tanto se ha pasado del nivel anterior a este (0 a 1; 1 sin transición). */
  get transitionBlend() {
    return this.transition ? Math.min(1, this.transition.time / CONFIG.transition.seconds) : 1;
  }

  /** Avisa cuando el nivel pasa a otro tramo (para la música, por ejemplo). */
  updateSection() {
    const { name } = this.spawner.section;
    if (name === this.section) return;
    this.section = name;
    this.events.emit('section', { name });
  }

  /** La racha: count obstáculos más esquivados de cerca (o quemados). */
  extendCombo(count) {
    if (!this.combo.add(count)) return;
    this.hud.setCombo(this.combo.multiplier, { up: true });
    this.events.emit('comboUp', { multiplier: this.combo.multiplier });
  }

  /** Avanza el mundo a la velocidad actual: el recorrido, los obstáculos, lo que se recoge y el fuego. */
  advanceWorld(dt) {
    this.prevScroll = this.scroll;
    const dx = this.speed * dt;
    this.scroll += dx;
    for (const obstacle of this.obstacles) obstacle.update(dt, this.speed);
    for (const pickup of this.pickups) pickup.update(dt, this.speed);
    for (const fireball of this.fireballs) fireball.update(dt);
    this.obstacles = this.obstacles.filter((o) => !o.offscreen);
    this.pickups = this.pickups.filter((p) => !p.offscreen);
    this.fireballs = this.fireballs.filter((f) => !f.offscreen);
    return dx;
  }

  // --- Fuego ----------------------------------------------------------------------

  /** Con el trío completo, el fuego es verde jade en cualquier nivel (más fuerte el especial contra el jefe). */
  get jadeFire() {
    return this.trio.size === INGREDIENTS.length;
  }

  /** Contra el rival en fácil, el fuego no se acaba. */
  get infiniteFire() {
    return Boolean(this.boss) && CONFIG.boss.infiniteFire[this.difficulty];
  }

  /**
   * Mantener el botón carga el especial, en todos los niveles: con fuego infinito (fácil contra el
   * rival), siempre; si no, con CONFIG.charge.needs bolas de fuego para empezar (y al menos una al
   * soltarlo: el disparo normal del primer toque ya gastó una).
   */
  get canCharge() {
    const charging = this.fireButton.charging !== null;
    const enough = this.infiniteFire || this.ammo >= CONFIG.charge.needs || (charging && this.ammo >= 1);
    return !this.boss?.defeated && CONFIG.charge.modes[this.difficulty] && enough;
  }

  /**
   * La acción 'fire': una bola de fuego desde la boca, si hay y ya pasó el tiempo entre disparos. Con
   * carga (ver canCharge), al soltar el botón: normal si fue un toque, especial si se cargó.
   */
  fireControl(dt) {
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    const shot = this.fireButton.update(dt, {
      pressed: this.input.wasPressed('fire'),
      down: this.input.isDown('fire'),
      canCharge: this.canCharge,
      instant: true, // el disparo normal sale al presionar; mantener el botón carga el especial
    });
    this.setCharging(this.fireButton.charging !== null);
    if (this.fireButton.charged) this.events.emit('chargeReady');
    this.hud.setCharge(this.canCharge, this.fireButton.progress);
    if (!shot || (shot === 'normal' && this.fireCooldown > 0)) return;
    if (this.ammo <= 0 && !this.infiniteFire) {
      this.events.emit('fireEmpty');
      this.hud.ammoEmpty();
      return;
    }
    const [head] = this.player.parts();
    const special = shot === 'special';
    this.fireballs.push(new Fireball(head.x + head.w / 2, head.y, { special, jade: this.jadeFire }));
    if (!this.infiniteFire) this.ammo -= 1;
    this.fireCooldown = CONFIG.fire.cooldown;
    this.hud.setAmmo(this.ammo, this.fireMax, { spent: true, infinite: this.infiniteFire });
    this.events.emit(special ? 'fireSpecial' : 'fire', { ammo: this.ammo, jade: this.jadeFire });
  }

  /** Avisa cuando empieza y cuando deja de cargarse el especial. */
  setCharging(charging) {
    if (charging === this.charging) return;
    this.charging = charging;
    this.events.emit(charging ? 'chargeStart' : 'chargeEnd');
  }

  /** Suelta la carga sin disparar. */
  cancelCharge() {
    this.fireButton.reset();
    this.setCharging(false);
  }

  /**
   * Cada bola de fuego quema lo primero que toca (si es burnable) o se apaga contra ello. En el nivel
   * 12, si le da al jefe, le quita vida.
   */
  updateFireballs() {
    for (const fireball of this.fireballs) {
      const box = fireball.hitboxes();
      if (this.boss && anyOverlap(box, this.boss.hitboxes())) {
        fireball.spent = true;
        this.hitBoss(fireball.power, { special: fireball.special, weak: this.boss.isWeakHit(fireball.y) });
        continue;
      }
      const target = this.obstacles.find((o) => anyOverlap(box, o.hitboxes()));
      if (!target) continue;
      // La especial atraviesa los disparos del jefe y todo lo que se quema (lo quema y sigue)
      fireball.spent = !(fireball.special && (target.kind === 'shot' || target.burnable));
      if (target.burnable) {
        this.obstacles = this.obstacles.filter((o) => o !== target);
        this.addScore(CONFIG.burnBonus * this.mode.score);
        this.extendCombo(1);
        this.events.emit('burn', { kind: target.kind, x: target.x + target.w / 2, y: target.y + target.h / 2 });
      } else {
        this.events.emit('fizzle', { kind: target.kind, x: fireball.x, y: fireball.y });
      }
    }
    this.fireballs = this.fireballs.filter((f) => !f.spent);
  }

  /** Una bola de fuego le pegó al jefe: puntos, racha y, si era la última, la victoria. */
  hitBoss(damage = 1, { special = false, weak = false } = {}) {
    const boss = this.boss;
    if (!boss.hit(damage, { weak })) return;
    this.addScore(CONFIG.boss.points * this.mode.score);
    this.extendCombo(1);
    this.hud.setBoss(boss.hp, boss.maxHp, { hit: true });
    this.events.emit('bossHit', { hp: boss.hp, max: boss.maxHp, special, weak });
    if (!boss.defeated) return;
    // Vencido: sus disparos desaparecen y el bono no se multiplica por la racha
    this.obstacles = this.obstacles.filter((o) => o.kind !== 'shot');
    this.addScore(CONFIG.boss.bonus * this.mode.score, { combo: false });
    this.events.emit('bossDefeated', { sign: boss.sign });
  }

  // --- Choques y lo que se recoge -------------------------------------------------

  checkCollisions() {
    const body = this.player.hitboxes();
    // Sin suelo, tocar las nubes de abajo también cuesta un corazón (el dragón ya rebotó)
    if (this.player.bumped) this.events.emit('bump');
    const touchesBoss = this.boss && anyOverlap(body, this.boss.hitboxes());
    if (this.player.canBeHit && (this.player.bumped || touchesBoss || this.obstacles.some((o) => anyOverlap(body, o.hitboxes())))) {
      this.hit();
      return;
    }
    // Se recoge con la cabeza (la boca)
    const taken = this.pickups.filter((p) => anyOverlap([body[0]], p.hitboxes()));
    if (!taken.length) return;
    this.pickups = this.pickups.filter((p) => !taken.includes(p));
    for (const pickup of taken) {
      if (pickup.type === 'food') this.collectFood(pickup);
      else if (pickup.type === 'star') this.collectStar();
      else if (pickup.type === 'ingredient') this.collectIngredient(pickup);
      else this.collectCocktail(pickup);
    }
  }

  hit() {
    if (!CONFIG.test?.invincible) this.lives = Math.max(0, this.lives - 1);
    this.showLives({ hurt: true });
    this.events.emit('hit', { lives: this.lives });
    if (this.combo.break()) {
      this.hud.setCombo(1, { lost: true });
      this.events.emit('comboLost');
    }
    if (this.lives <= 0) {
      this.player.die();
      this.cancelCharge();
      saveRecord(this.record);
      this.fsm.set('dying');
      this.events.emit('dying');
      return;
    }
    this.player.hurt();
    // Si tenía el poder de volar, lo pierde y cae al suelo
    if (this.player.lostFlight) {
      this.hud.setFlight(false, { lost: true });
      this.events.emit('flightLost');
    }
  }

  /** La estrella: el poder de volar, hasta el próximo golpe (y pasa de un nivel al otro). */
  collectStar() {
    // Si ya tenía el poder, otra estrella no cambia nada
    if (this.player.canFly || this.player.forceFlight) return;
    this.player.takeOff();
    this.hud.setFlight(true, { gained: true });
    this.events.emit('flightGained');
  }

  /** Comida china: puntos y un corazón (sin pasar del máximo de la dificultad). */
  collectFood(pickup) {
    this.addScore(CONFIG.food.points * this.mode.score);
    const max = this.mode.maxLives;
    const healed = this.lives < max;
    if (healed) {
      this.lives = Math.min(max, this.lives + CONFIG.food.hearts);
      this.showLives({ gained: true });
    }
    this.events.emit('food', { variety: pickup.variety, healed, lives: this.lives });
  }

  /** Cóctel: puntos y bolas de fuego (sin pasar del máximo de la dificultad). */
  collectCocktail(pickup) {
    this.addScore(CONFIG.cocktails.points * this.mode.score);
    this.ammo = Math.min(this.fireMax, this.ammo + CONFIG.cocktails.perCocktail);
    this.hud.setAmmo(this.ammo, this.fireMax, { gained: true });
    this.events.emit('cocktail', { variety: pickup.variety, ammo: this.ammo });
  }

  /** Un ingrediente del trío (hongo, agave o chile): puntos y, con los tres del viaje, el cóctel del signo. */
  collectIngredient(pickup) {
    this.addScore(CONFIG.trio.points * this.mode.score);
    this.trio.add(pickup.variety);
    this.hud.setTrio(this.trio, { gained: pickup.variety });
    this.events.emit('ingredient', { variety: pickup.variety, count: this.trio.size });
    if (this.trio.size === INGREDIENTS.length) this.completeTrio();
  }

  /** El trío completo: el cóctel del signo. Fuego lleno, un corazón (si cabe) y puntos extra. */
  completeTrio() {
    this.ammo = this.fireMax;
    this.hud.setAmmo(this.ammo, this.fireMax, { gained: true });
    if (this.lives < this.mode.maxLives) {
      this.lives = Math.min(this.mode.maxLives, this.lives + CONFIG.trio.hearts);
      this.showLives({ gained: true });
    }
    this.addScore(CONFIG.trio.bonus * this.mode.score);
    this.hud.trioDone();
    this.showBanner(t('trio.ready'));
    this.events.emit('trio', { sign: this.sign });
  }

  completeLevel() {
    this.addScore(this.lives * this.heartPoints, { combo: false });
    saveRecord(this.record);
    this.events.emit('levelComplete', { index: this.levelIndex, id: this.level.id, hearts: this.lives });
    if (this.levelIndex === this.levels.length - 1) {
      this.showEnding();
      return;
    }
    // En fácil, cada nivel empieza con los corazones completos; en difícil se conservan
    if (!this.keepLives) this.lives = this.mode.lives;
    this.startLevel(this.levelIndex + 1, { continued: true });
  }

  async pause() {
    if (!this.fsm.is('playing')) return;
    const flow = this.flow;
    this.fsm.set('paused');
    this.events.emit('pause');
    touch(); // la cuenta para regresar solo al menú empieza aquí (ver checkIdle)
    // Si estaba cargando el especial, se cancela (al continuar no sale un disparo solo)
    this.cancelCharge();
    this.hud.setCharge(this.canCharge, 0);
    const choice = await this.dialogs.show({
      title: t('menu.pause'),
      actions: [
        { label: t('menu.resume'), value: 'resume', primary: true },
        { label: t(this.mode.restartFromHome ? 'menu.restartJourney' : 'menu.restart'), value: 'restart' },
        { label: t('menu.quit'), value: 'title' },
      ],
      cancelValue: 'resume',
    });
    if (flow !== this.flow) return;
    if (choice === 'restart') this.retryLevel();
    else if (choice === 'title') this.showTitle();
    else {
      this.fsm.set('playing');
      this.events.emit('resume');
    }
  }

  async gameOver() {
    const flow = ++this.flow;
    this.fsm.set('gameOver');
    saveRecord(this.record);
    this.events.emit('gameOver');
    touch();
    const hard = this.mode.restartFromHome;
    const choice = await this.dialogs.show({
      title: t('menu.gameOver'),
      lines: [{ text: t(hard ? 'menu.gameOverHard' : 'menu.gameOverText') }],
      extra: this.recordExtra(),
      actions: [
        { label: t(hard ? 'menu.tryAgain' : 'menu.retry'), value: 'retry', primary: true },
        { label: t(`difficulty.switchTo${this.otherDifficulty === 'hard' ? 'Hard' : 'Easy'}`), value: 'switch' },
        { label: t('menu.toTitle'), value: 'title' },
      ],
    });
    if (flow !== this.flow) return;
    if (choice === 'switch') this.switchDifficulty();
    else if (choice === 'title') this.showTitle();
    else this.retryLevel();
  }

  /**
   * En fácil se repite el nivel con los puntos y las bolas de fuego que se tenían al empezarlo; en
   * difícil, desde el 1.
   */
  retryLevel() {
    this.flow++;
    if (this.mode.restartFromHome) {
      this.startNewGame(this.difficulty);
      return;
    }
    this.score = this.levelStartScore;
    this.ammo = this.levelStartAmmo;
    this.trio = new Set(this.levelStartTrio);
    this.player.canFly = this.levelStartFlight;
    this.hud.setFlight(this.player.canFly);
    this.combo.reset();
    this.hud.setCombo(1);
    this.lives = this.mode.lives;
    this.startLevel(this.levelIndex);
  }

  switchDifficulty() {
    const next = this.otherDifficulty;
    this.titleScreen.remember?.(next);
    this.startNewGame(next);
  }

  async showEnding() {
    const flow = ++this.flow;
    this.fsm.set('ending');
    touch();
    this.cancelCharge();
    this.hideBanner();
    saveRecord(this.record);
    this.events.emit('ending', { score: this.score });
    const { timedOut, asked } = await this.askForName();
    if (flow !== this.flow) return;
    // Nadie enfrente de la máquina: de regreso al inicio, sin quedarse esperando
    if (timedOut) {
      this.showTitle();
      return;
    }
    await this.dialogs.show({
      title: t('menu.end'),
      lines: [{ text: t('menu.finalScore', { score: pad(this.score) }) }],
      // Si no entró a HI RECORDS (no vio la pantalla del nombre), su trago va aquí
      extra: [...(asked ? [] : [drinkNode(this.sign)].filter(Boolean)), ...this.recordExtra()],
      actions: [{ label: t('menu.playAgain'), value: 'again', primary: true }],
    });
    if (flow !== this.flow) return;
    this.showTitle();
  }

  /** Si el puntaje entra a la tabla de su dificultad, pide el nombre y lo guarda. */
  async askForName() {
    const { difficulty, score } = this;
    const entries = loadBoards()[difficulty];
    const place = placeIn(entries, score);
    if (!place) return { timedOut: false, asked: false };
    this.events.emit('highScore', { place });
    // Al escribir su nombre, también su trago (el del bar para su signo)
    const { name, timedOut } = await enterName({ dialogs: this.dialogs, entries, difficulty, score, place, drink: drinkNode(this.sign) });
    if (name && !CONFIG.test) addScore(difficulty, name, score); // si no escribió nada, no se guarda ninguna fila
    return { timedOut, asked: true };
  }

  // --- Puntos, récord y corazones -------------------------------------------------

  /** Suma puntos, multiplicados por la racha (salvo combo: false, como los corazones al final). */
  addScore(points, { combo = true } = {}) {
    this.score += combo ? points * this.combo.multiplier : points;
    this.hud.setScore(this.score);
    if (this.score >= this.nextMilestone) {
      // Un bono grande (vencer al jefe) pasa varias centenas de una vez: se avisa una sola
      this.nextMilestone = (Math.floor(this.score / CONFIG.milestone) + 1) * CONFIG.milestone;
      this.hud.milestone();
      this.events.emit('milestone', { score: this.score });
    }
    if (this.score > this.record) {
      this.record = this.score;
      this.hud.setHigh(this.record);
      if (!this.newRecord && this.recordToBeat > 0) {
        this.newRecord = true;
        this.hud.setNewRecord(true);
        this.events.emit('newRecord', { score: this.score });
      }
    }
  }

  recordExtra() {
    return this.newRecord ? [recordNode(pad(this.record))] : [];
  }

  showLives(options = {}) {
    const slots = Math.max(this.mode.lives, Math.ceil(this.lives));
    this.hud.setLives(this.lives, slots, options);
  }

  /** Al cambiar de idioma: los textos que escribe el juego. */
  refreshTexts() {
    this.hud.refresh();
    if (!this.fsm.is('title')) this.hud.setLevel(this.levelLabel());
  }

  // --- Cartel del nivel -----------------------------------------------------------

  /** timed: se quita solo tras unos segundos; si no, se queda hasta el siguiente cartel. */
  showBanner(text, timed = true) {
    this.banner.textContent = text;
    this.banner.hidden = false;
    this.bannerTimer = timed ? 2.6 : 0;
  }

  updateBanner(dt) {
    if (this.bannerTimer <= 0 || this.banner.hidden) return;
    this.bannerTimer -= dt;
    if (this.bannerTimer <= 0) this.hideBanner();
  }

  hideBanner() {
    this.bannerTimer = 0;
    this.banner.hidden = true;
  }

  // --- Bucle ----------------------------------------------------------------------

  update(dt) {
    if (this.input.wasPressed('mute')) this.events.emit('toggleMute');
    this.fsm.update(dt);
    this.checkIdle();
    if (this.stage.dataset.state !== this.fsm.name) this.stage.dataset.state = this.fsm.name;
    this.stage.dataset.ground = String(this.fsm.is('title') || this.level.ground);
    this.stage.dataset.move = String(this.fsm.is('playing') && this.moveHint > 0 && !this.player.waiting); // ◀ ▶ de la cruceta
    this.stage.dataset.high = String(this.camera.y < -CONFIG.jumpHeight); // volando alto
    this.input.endStep();
  }

  /**
   * En el bar la máquina no se queda esperando a quien ya se fue: en la pausa, en Game Over, en el
   * final (después de escribir el nombre, que tiene su propio tiempo) o con el nivel esperando el
   * primer salto, sin que nadie toque nada en CONFIG.idleSeconds, regresa al menú principal.
   */
  checkIdle() {
    const waiting = this.fsm.is('playing') && this.player.waiting;
    if (!waiting && !this.fsm.is('paused', 'gameOver', 'ending')) return;
    if (idleSeconds() >= CONFIG.idleSeconds) this.showTitle();
  }

  /**
   * Si algo falla en un cuadro, se anota una vez y se sigue. Si se repite cuadro tras cuadro (30
   * veces seguidas), algo quedó en mal estado: de vuelta a la pantalla de inicio.
   */
  recover(error) {
    const now = performance.now();
    const errors = this.errors;
    if (now - errors.since > 3000) errors.count = 0;
    errors.since = now;
    errors.count++;
    this.input.endStep();
    if (errors.count === 1) console.error('[Chow Chow] Error en el juego; se sigue jugando.', error);
    if (errors.count === 30) {
      console.error('[Chow Chow] El error se repite: de vuelta al inicio.');
      try {
        this.showTitle();
      } catch (fatal) {
        console.error('[Chow Chow] No se pudo volver al inicio.', fatal);
      }
    }
  }

  /** Dibuja entre el paso anterior y el actual (alpha), para que el movimiento sea suave. */
  render(alpha = 1) {
    const moving = this.fsm.is('playing', 'dying', 'title');
    const lerp = (from, to) => (moving ? blend(from, to, alpha) : to);
    this.scene.draw({
      level: this.level,
      // Recién llegado de otro nivel: el anterior, que se desvanece (previousAlpha: 1 a 0)
      previous: this.transition?.from ?? null,
      previousAlpha: 1 - smooth(this.transitionBlend),
      progress: this.fsm.is('title') ? 0 : Math.min(1, this.distance / this.level.length),
      state: this.fsm.name,
      scroll: lerp(this.prevScroll, this.scroll),
      cameraY: lerp(this.camera.prevY, this.camera.y),
      dragon: this.player,
      boss: this.boss && {
        x: lerp(this.boss.prevX, this.boss.x),
        y: lerp(this.boss.prevY, this.boss.y),
        w: this.boss.w,
        h: this.boss.h,
        t: this.boss.t,
        state: this.boss.state,
        timer: this.boss.timer, // segundos en ese estado
        attack: this.boss.attack, // el último ataque
        sign: this.boss.sign,
        enraged: this.boss.enraged,
        warning: this.boss.warning, // el ataque que avisa: 'volley' | 'aimed' | 'charge' | 'rain' | 'wall' | null
        aimAngle: this.boss.aimAngle, // el ángulo del brazo para apuntar
        plan: this.boss.plan, // por dónde vendrá la lluvia o dónde estará el hueco del muro
        worldSpeed: this.speed, // la lluvia baja en diagonal: hacia la izquierda con el mundo
        aimY: this.player.y - CONFIG.player.head.h / 2, // a dónde apuntaría ('aimed')
        flash: this.boss.flash > 0,
        weakOpen: this.boss.weakOpen, // el punto débil está encendido
        weakFlash: this.boss.weakFlash, // segundos que le quedan de rojo por un golpe ahí
        color: signById(this.boss.sign).body,
        fire: signById(this.boss.sign).fire,
      },
      headY: lerp(this.player.prevY, this.player.y),
      headX: lerp(this.player.prevX, this.player.x),
      moveHint: this.player.alive ? Math.min(1, Math.max(0, this.moveHint) / HINT_FADE) : 0, // las flechas ◀ ▶ a sus lados (0 a 1)
      obstacles: this.obstacles.map((o) => ({
        kind: o.kind,
        height: o.height,
        motion: o.motion,
        burnable: o.burnable,
        x: lerp(o.prevX, o.x),
        y: lerp(o.prevY, o.y),
        w: o.w,
        h: o.h,
        t: o.t,
        warning: o.warning, // la nube de tormenta avisa que viene un rayo
        bolt: o.striking ? o.lightning.length : 0, // el rayo, si está cayendo (su largo)
        boltLength: o.lightning?.length ?? 0, // el largo de sus rayos (para dibujar el aviso)
      })),
      pickups: this.pickups.map((p) => ({ type: p.type, variety: p.variety, x: lerp(p.prevX, p.x), y: lerp(p.prevY, p.y), r: p.r, t: p.t })),
      fireballs: this.fireballs.map((f) => ({ x: lerp(f.prevX, f.x), y: f.y, r: f.r, age: f.age, special: f.special, jade: f.jade })),
      charge: this.fireButton.progress, // el disparo especial cargándose (0 a 1)
      // El fuego es del color del animal; con el trío completo, contra el rival, verde jade
      fireColor: this.jadeFire ? JADE : signById(this.sign ?? 'dragon').fire,
      blink: this.player.alive && this.player.invulnerable > 0 && Math.floor(this.player.invulnerable * 12) % 2 === 1,
    });
  }
}
