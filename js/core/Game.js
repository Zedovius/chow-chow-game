// Orquesta el juego: estados, niveles, choques, fuego, puntuación y menús.
//
// Estados: title → playing ⇄ paused
//                  playing → dying → gameOver → (reintentar | title)
//                  playing → ending (al terminar el nivel 12: nombre en HI RECORDS) → title
//
// Un corredor sin fin, como Chispas: el dragón corre, salta y se agacha entre obstáculos, y en el
// aire puede aletear y volar (hasta CONFIG.skyJumps saltos de alto; la cámara lo sigue). El Dragón y
// el Gallo son niveles sin suelo. Dispara bolas de fuego que se recargan con cócteles.
// Los 12 niveles van seguidos, sin escenas: al terminar uno se cobran los corazones y el siguiente
// empieza sin detenerse, con su cartel.
//
// Lo que pasa se avisa por this.events (ver core/events.js): el sonido y los efectos escuchan ahí.

import { CONFIG } from '../config.js';
import { Loop } from './Loop.js';
import { StateMachine } from './StateMachine.js';
import { anyOverlap } from './collision.js';
import { CloseCalls } from './closeCalls.js';
import { Events } from './events.js';
import { addScore, loadBoards, placeIn } from './scores.js';
import { DIFFICULTIES, levelsFor } from '../world/levels.js';
import { Spawner } from '../world/Spawner.js';
import { Dragon } from '../entities/Dragon.js';
import { Fireball } from '../entities/Fireball.js';
import { Scene } from '../graphics/Scene.js';
import { Camera } from '../graphics/Camera.js';
import { enterName } from '../ui/NameEntry.js';
import { recordNode } from '../ui/record.js';
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
  try {
    localStorage.setItem(CONFIG.storageKey, String(Math.floor(value)));
  } catch {
    // Sin almacenamiento, el récord dura solo esta visita
  }
}

const blend = (from, to, alpha) => from + (to - from) * alpha;

const STATES = {
  title: {
    update(dt, time) {
      this.prevScroll = this.scroll;
      this.scroll += CONFIG.speed.title * dt;
      this.dragon.prevY = this.dragon.y;
      this.dragon.hover(time, this.scroll);
      this.camera.update(dt, this.dragon.y);
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
      this.advanceWorld(dt);
      this.dragon.prevY = this.dragon.y;
      this.dragon.fall(dt, this.scroll);
      this.camera.update(dt, this.dragon.y);
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
   *           events?: Events, images?: object }} parts
   *   events: por donde se avisa lo que pasa; images: el arte cargado (graphics/assets.js)
   */
  constructor({ canvas, stage, input, hud, dialogs, banner, titleScreen, events = new Events(), images = null }) {
    this.scene = new Scene(canvas, images);
    this.events = events;
    this.stage = stage;
    this.input = input;
    this.hud = hud;
    this.dialogs = dialogs;
    this.banner = banner;
    this.titleScreen = titleScreen;

    this.difficulty = 'easy';
    this.levels = levelsFor(this.difficulty);
    this.levelIndex = 0;
    this.level = this.levels[0];
    this.dragon = new Dragon();
    this.camera = new Camera();
    this.obstacles = [];
    this.pickups = []; // la perla y los cócteles
    this.fireballs = [];
    this.spawner = null;
    this.closeCalls = new CloseCalls();

    this.score = 0;
    this.levelStartScore = 0;
    this.nextMilestone = CONFIG.milestone;
    this.record = loadRecord();
    this.recordToBeat = this.record;
    this.newRecord = false;
    this.lives = DIFFICULTIES.easy.lives;
    this.ammo = CONFIG.fire.start; // bolas de fuego
    this.levelStartAmmo = this.ammo;
    this.fireCooldown = 0;
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

  /** Difícil: los corazones van por partes (cada perla llena 1/pearlsPerLife) y se conservan. */
  get halfHearts() {
    return Boolean(this.mode.pearlsPerLife);
  }

  get otherDifficulty() {
    return this.difficulty === 'easy' ? 'hard' : 'easy';
  }

  // --- Flujo del juego ----------------------------------------------------------

  showTitle() {
    this.flow++;
    this.dialogs.close('title');
    this.hideBanner();
    saveRecord(this.record);
    this.levels = levelsFor(this.difficulty);
    this.level = this.levels[0];
    this.levelIndex = 0;
    this.clearWorld();
    this.dragon.reset(true);
    this.camera.snap(this.dragon.y);
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

  /** Lo pide el menú de inicio: difficulty es 'easy' o 'hard'. */
  newGame(difficulty = 'easy') {
    if (!this.fsm.is('title')) return;
    this.startNewGame(difficulty);
  }

  startNewGame(difficulty) {
    this.flow++;
    this.difficulty = DIFFICULTIES[difficulty] ? difficulty : 'easy';
    this.levels = levelsFor(this.difficulty);
    this.score = 0;
    this.lives = this.mode.lives;
    this.ammo = CONFIG.fire.start;
    this.recordToBeat = this.record;
    this.newRecord = false;
    this.hud.setNewRecord(false);
    this.hud.setHigh(this.record);
    this.titleScreen.root.hidden = true;
    this.dragon.reset();
    this.events.emit('start', { difficulty: this.difficulty });
    this.startLevel(CONFIG.startLevel); // 0, salvo al probar con ?nivel=N
  }

  clearWorld() {
    this.obstacles = [];
    this.pickups = [];
    this.fireballs = [];
  }

  /** Empieza un nivel. continued: viene del anterior sin detenerse (el dragón sigue donde iba). */
  startLevel(index, { continued = false } = {}) {
    this.levelIndex = index;
    this.level = this.levels[index];
    this.levelStartScore = this.score;
    this.levelStartAmmo = this.ammo;
    this.nextMilestone = (Math.floor(this.score / CONFIG.milestone) + 1) * CONFIG.milestone;
    this.distance = 0;
    this.speed = this.level.speed;
    this.spawner = new Spawner(this.level);
    if (continued) this.dragon.setGround(this.level.ground);
    else {
      this.clearWorld();
      this.dragon.reset(this.level.ground);
      this.camera.snap(this.dragon.y);
    }
    this.hud.setScore(this.score);
    this.hud.setLevel(this.levelLabel());
    this.hud.setAmmo(this.ammo, CONFIG.fire.max);
    this.showLives();
    // Si el dragón espera el primer salto, el cartel se queda con el aviso hasta que empiece
    const lines = [this.levelLabel(), ...this.levelHints()];
    if (this.dragon.waiting) lines.push(t(this.level.ground ? 'level.start' : 'level.startSky'));
    this.showBanner(lines.join('\n'), !this.dragon.waiting);
    this.fsm.set('playing');
    this.events.emit('levelStart', { index, id: this.level.id, continued, ground: this.level.ground });
  }

  /** Lo que el cartel de un nivel avisa debajo del nombre. */
  levelHints() {
    if (!this.level.ground) return [t('level.sky')];
    return this.levelIndex === 0 ? [t('level.flyHint')] : [];
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
    if (this.dragon.waiting) {
      this.prevScroll = this.scroll;
      this.dragon.prevY = this.dragon.y;
      this.dragon.update(dt, this.input, this.scroll);
      if (this.dragon.waiting) return;
      this.showBanner([this.levelLabel(), ...this.levelHints()].join('\n'));
      this.events.emit(this.dragon.flapped ? 'flap' : 'jump');
      return;
    }
    this.updateBanner(dt);
    // Cada nivel acelera un poco hasta su final (CONFIG.speed.ramp)
    const progress = Math.min(1, this.distance / this.level.length);
    this.speed = this.level.speed * (1 + CONFIG.speed.ramp * progress);
    this.spawner.progress = progress;
    const dx = this.advanceWorld(dt);
    this.distance += dx;
    this.addScore(dx * CONFIG.scorePerPx * this.mode.score);

    this.dragon.prevY = this.dragon.y;
    this.dragon.update(dt, this.input, this.scroll);
    if (this.dragon.jumped) this.events.emit('jump');
    if (this.dragon.flapped) this.events.emit('flap');
    if (this.dragon.landed) this.events.emit('land');
    this.camera.update(dt, this.dragon.y);
    this.spawner.update(dt, this.speed, this.distance, this.obstacles, this.pickups);

    this.fireControl(dt);
    this.updateFireballs();
    this.checkCollisions();
    if (!this.fsm.is('playing')) return;
    const risk = this.closeCalls.update(this.dragon, this.obstacles);
    if (risk) {
      this.addScore(risk * this.mode.score);
      this.events.emit('closeCall');
    }

    if (this.distance >= this.level.length && !this.obstacles.length) this.completeLevel();
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

  /** La acción 'fire': una bola de fuego desde la boca, si hay y ya pasó el tiempo entre disparos. */
  fireControl(dt) {
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    if (!this.input.wasPressed('fire') || this.fireCooldown > 0) return;
    if (this.ammo <= 0) {
      this.events.emit('fireEmpty');
      this.hud.ammoEmpty();
      return;
    }
    const [head] = this.dragon.parts();
    this.fireballs.push(new Fireball(head.x + head.w / 2, head.y));
    this.ammo -= 1;
    this.fireCooldown = CONFIG.fire.cooldown;
    this.hud.setAmmo(this.ammo, CONFIG.fire.max, { spent: true });
    this.events.emit('fire', { ammo: this.ammo });
  }

  /** Cada bola de fuego quema lo primero que toca (si es burnable) o se apaga contra ello. */
  updateFireballs() {
    for (const fireball of this.fireballs) {
      const box = fireball.hitboxes();
      const target = this.obstacles.find((o) => anyOverlap(box, o.hitboxes()));
      if (!target) continue;
      fireball.spent = true;
      if (target.burnable) {
        this.obstacles = this.obstacles.filter((o) => o !== target);
        this.addScore(CONFIG.burnBonus * this.mode.score);
        this.events.emit('burn', { kind: target.kind, x: target.x + target.w / 2, y: target.y + target.h / 2 });
      } else {
        this.events.emit('fizzle', { kind: target.kind, x: fireball.x, y: fireball.y });
      }
    }
    this.fireballs = this.fireballs.filter((f) => !f.spent);
  }

  // --- Choques y lo que se recoge -------------------------------------------------

  checkCollisions() {
    const body = this.dragon.hitboxes();
    // Sin suelo, tocar las nubes de abajo también cuesta un corazón (el dragón ya rebotó)
    if (this.dragon.bumped) this.events.emit('bump');
    if (this.dragon.canBeHit && (this.dragon.bumped || this.obstacles.some((o) => anyOverlap(body, o.hitboxes())))) {
      this.hit();
      return;
    }
    // Se recoge con la cabeza (la boca)
    const taken = this.pickups.filter((p) => anyOverlap([body[0]], p.hitboxes()));
    if (!taken.length) return;
    this.pickups = this.pickups.filter((p) => !taken.includes(p));
    for (const pickup of taken) {
      if (pickup.type === 'pearl') this.collectPearl();
      else this.collectCocktail(pickup);
    }
  }

  hit() {
    this.lives = Math.max(0, this.lives - 1);
    this.showLives({ hurt: true });
    this.events.emit('hit', { lives: this.lives });
    if (this.lives <= 0) {
      this.dragon.die();
      saveRecord(this.record);
      this.fsm.set('dying');
      this.events.emit('dying');
      return;
    }
    this.dragon.hurt();
  }

  collectPearl() {
    this.addScore(CONFIG.pearlBonus * this.mode.score);
    if (this.halfHearts) {
      const every = this.mode.pearlsPerLife;
      const before = this.lives;
      this.lives = Math.round((this.lives + 1 / every) * every) / every; // sin errores de redondeo
      const gained = Math.floor(this.lives) > Math.floor(before);
      this.showLives(gained ? { gained: true } : { progressed: true });
      if (gained) this.events.emit('heartGained', { lives: this.lives });
    }
    this.events.emit('pearl', { lives: this.lives });
  }

  collectCocktail(pickup) {
    this.ammo = Math.min(CONFIG.fire.max, this.ammo + CONFIG.cocktails.perCocktail);
    this.hud.setAmmo(this.ammo, CONFIG.fire.max, { gained: true });
    this.events.emit('cocktail', { variety: pickup.variety, ammo: this.ammo });
  }

  completeLevel() {
    this.addScore(this.lives * this.heartPoints);
    saveRecord(this.record);
    this.events.emit('levelComplete', { index: this.levelIndex, id: this.level.id, hearts: this.lives });
    if (this.levelIndex === this.levels.length - 1) {
      this.showEnding();
      return;
    }
    // En fácil, cada nivel empieza con los corazones completos; en difícil se conservan
    if (!this.halfHearts) this.lives = this.mode.lives;
    this.startLevel(this.levelIndex + 1, { continued: true });
  }

  async pause() {
    if (!this.fsm.is('playing')) return;
    const flow = this.flow;
    this.fsm.set('paused');
    this.events.emit('pause');
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
    this.hideBanner();
    saveRecord(this.record);
    this.events.emit('ending', { score: this.score });
    const { timedOut } = await this.askForName();
    if (flow !== this.flow) return;
    // Nadie enfrente de la máquina: de regreso al inicio, sin quedarse esperando
    if (timedOut) {
      this.showTitle();
      return;
    }
    await this.dialogs.show({
      title: t('menu.end'),
      lines: [{ text: t('menu.finalScore', { score: pad(this.score) }) }],
      extra: this.recordExtra(),
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
    if (!place) return { timedOut: false };
    const { name, timedOut } = await enterName({ dialogs: this.dialogs, entries, difficulty, score, place });
    if (name) addScore(difficulty, name, score); // si no escribió nada, no se guarda ninguna fila
    return { timedOut };
  }

  // --- Puntos, récord y corazones -------------------------------------------------

  addScore(points) {
    this.score += points;
    this.hud.setScore(this.score);
    if (this.score >= this.nextMilestone) {
      this.nextMilestone += CONFIG.milestone;
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
    const slots = this.halfHearts ? Math.max(this.mode.lives, Math.ceil(this.lives)) : this.mode.lives;
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
    if (this.stage.dataset.state !== this.fsm.name) this.stage.dataset.state = this.fsm.name;
    this.stage.dataset.ground = String(this.fsm.is('title') || this.level.ground);
    this.stage.dataset.high = String(this.camera.y < -CONFIG.jumpHeight); // volando alto
    this.input.endStep();
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
      progress: this.fsm.is('title') ? 0 : Math.min(1, this.distance / this.level.length),
      state: this.fsm.name,
      scroll: lerp(this.prevScroll, this.scroll),
      cameraY: lerp(this.camera.prevY, this.camera.y),
      dragon: this.dragon,
      headY: lerp(this.dragon.prevY, this.dragon.y),
      obstacles: this.obstacles.map((o) => ({ kind: o.kind, height: o.height, burnable: o.burnable, x: lerp(o.prevX, o.x), y: o.y, w: o.w, h: o.h, t: o.t })),
      pickups: this.pickups.map((p) => ({ type: p.type, variety: p.variety, x: lerp(p.prevX, p.x), y: p.y, r: p.r })),
      fireballs: this.fireballs.map((f) => ({ x: lerp(f.prevX, f.x), y: f.y, r: f.r, age: f.age })),
      blink: this.dragon.alive && this.dragon.invulnerable > 0 && Math.floor(this.dragon.invulnerable * 12) % 2 === 1,
    });
  }
}
