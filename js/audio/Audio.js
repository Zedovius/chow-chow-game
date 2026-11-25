// Música y efectos con Web Audio. Lee qué suena en audio/sounds.js; Game no sabe que existe:
// main.js conecta los avisos del juego (core/events.js) con este módulo.
//
//   · Los navegadores no dejan sonar nada hasta que la persona toca, hace clic o presiona una tecla:
//     el audio se desbloquea con ese primer gesto (unlock). Antes, lo que se pida se recuerda (la
//     música que toca) y empieza al desbloquearse.
//   · Los archivos se bajan una vez y se guardan decodificados. Si uno falta o está dañado, se
//     anota en la consola y no suena; nada más cambia. De la música (una pista ocupa de 12 a 25 MB
//     decodificada) solo se guardan la que suena y la que sigue.
//   · Hay dos bandas sonoras; la segunda suena en una de cada tres partidas (cuántas se han jugado se
//     guarda en chowchow.partidas). Una pista nueva entra en el siguiente compás de la que suena.
//   · En pausa la música baja a cero; con la pestaña oculta se detiene todo.
//   · El silencio (tecla M) se guarda en localStorage (chowchow.sonido).

import { SOUNDS, VOICES } from './sounds.js';

const MUTE_KEY = 'chowchow.sonido';
const GAMES_KEY = 'chowchow.partidas';
const LATE = 300; // ms: un efecto que no pudo sonar antes (aún se bajaba, o el audio no arrancaba) ya no suena
const MIN_GAP = 45; // ms: el mismo efecto no se encima consigo mismo (tres cosas quemadas a la vez)

function loadMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === 'off';
  } catch {
    return false;
  }
}

function saveMuted(muted) {
  try {
    localStorage.setItem(MUTE_KEY, muted ? 'off' : 'on');
  } catch {
    // Sin almacenamiento, el silencio dura solo esta visita
  }
}

function loadGames() {
  try {
    return Math.max(0, Math.floor(Number(localStorage.getItem(GAMES_KEY)))) || 0;
  } catch {
    return 0;
  }
}

function saveGames(games) {
  try {
    localStorage.setItem(GAMES_KEY, String(games));
  } catch {
    // Sin almacenamiento, la cuenta dura solo esta visita
  }
}

export class AudioManager {
  constructor(sounds = SOUNDS) {
    this.sounds = sounds;
    this.ctx = null;
    this.buffers = new Map(); // url → Promise<AudioBuffer | null>
    this.muted = loadMuted();
    this.quiet = false; // pausa: la música baja a cero (los efectos del menú sí suenan)
    this.games = loadGames(); // partidas jugadas: deciden la banda sonora
    this.soundtrack = 0;
    this.songs = new Set(sounds.music.soundtracks.flatMap((s) => [s.title, ...s.worlds, s.boss, s.ending]).map(({ url }) => url));
    this.wanted = null; // la pista que debería sonar: { url, seconds }
    this.upcoming = null; // la que sigue, para tenerla lista
    this.track = null; // la que suena: { song, source, gain, startedAt }
    this.last = new Map(); // efecto → { at, index }: cuándo sonó y qué versión
    this.held = new Map(); // efecto → { source, gain } que suena mientras dura algo (hold)
    this.Context = globalThis.AudioContext ?? globalThis.webkitAudioContext;

    if (typeof document !== 'undefined') {
      const unlock = () => this.unlock();
      for (const type of ['pointerdown', 'keydown', 'touchend']) window.addEventListener(type, unlock, { capture: true });
      document.addEventListener('visibilitychange', () => this.applyVisibility());
    }
  }

  get available() {
    return Boolean(this.Context);
  }

  /** Cuántos mundos tienen pista. */
  get worlds() {
    return this.sounds.music.soundtracks[0].worlds.length;
  }

  /** Crea o reanuda el contexto. Solo funciona dentro de un gesto de la persona (o después de uno). */
  unlock() {
    if (!this.available) return;
    if (!this.ctx) {
      try {
        this.ctx = new this.Context();
      } catch (error) {
        console.warn('[Chow Chow] No se pudo preparar el sonido.', error);
        this.Context = null;
        return;
      }
      const { master, music, sfx } = this.sounds.volume;
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : master;
      // Un limitador: muchos efectos a la vez (o con música) no truenan en la bocina
      const limiter = this.ctx.createDynamicsCompressor();
      limiter.threshold.value = -6;
      limiter.knee.value = 4;
      limiter.ratio.value = 12;
      limiter.attack.value = 0.002;
      limiter.release.value = 0.12;
      this.master.connect(limiter);
      limiter.connect(this.ctx.destination);
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = this.quiet ? 0 : music;
      this.musicBus.connect(this.master);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = sfx;
      this.sfxBus.connect(this.master);
      this.preload();
      if (this.wanted) this.startTrack(this.wanted);
    }
    this.applyVisibility();
  }

  /** Baja y decodifica un archivo una sola vez; null si no hay o no se pudo. */
  load(url) {
    if (!url || !this.ctx) return Promise.resolve(null);
    if (!this.buffers.has(url)) {
      const promise = fetch(url)
        .then((response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.arrayBuffer();
        })
        .then((data) => this.ctx.decodeAudioData(data))
        .catch((error) => {
          console.warn(`[Chow Chow] No se pudo cargar el sonido ${url}.`, error);
          return null;
        });
      this.buffers.set(url, promise);
    }
    return this.buffers.get(url);
  }

  /** Baja de antemano todos los efectos (tras el desbloqueo), para que no haya esperas. */
  preload() {
    if (!this.ctx) return;
    for (const url of Object.values(this.sounds.sfx).flat()) this.load(url);
  }

  /**
   * Un efecto (su clave en sounds.sfx). index: cuál de sus versiones (si no, una al azar, distinta de la
   * anterior); delay: segundos antes de sonar; vary: cuánto cambia la altura, al azar (0.04: ±4 %), para
   * que lo que se repite mucho no canse.
   */
  async sfx(name, { index = null, delay = 0, vary = 0 } = {}) {
    const asked = performance.now();
    const last = this.last.get(name);
    if (last && asked - last.at < MIN_GAP) return;
    const chosen = this.version(name, index, last?.index);
    this.last.set(name, { at: asked, index: chosen.index });
    const buffer = await this.ready(chosen.url, asked);
    if (!buffer) return;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = 1 + vary * (2 * Math.random() - 1);
    source.connect(this.sfxBus);
    source.start(this.ctx.currentTime + delay);
  }

  /** Qué archivo suena: el único, la versión pedida o una al azar que no sea la anterior. */
  version(name, index, previous = -1) {
    const entry = this.sounds.sfx[name];
    if (!Array.isArray(entry)) return { url: entry, index: 0 };
    const last = entry.length - 1;
    let i = index === null ? Math.floor(Math.random() * entry.length) : Math.max(0, Math.min(last, index));
    if (index === null && i === previous && last > 0) i = (i + 1) % entry.length;
    return { url: entry[i], index: i };
  }

  /**
   * El archivo listo para sonar ahora, o null: en silencio, con la pestaña oculta, si no cargó, o si
   * para cuando está listo ya es tarde (así, si el navegador aún no deja sonar nada, los efectos no
   * se acumulan para sonar todos juntos después).
   */
  async ready(url, asked) {
    if (!this.ctx || this.muted || (typeof document !== 'undefined' && document.hidden)) return null;
    const buffer = await this.load(url);
    if (buffer && this.ctx.state !== 'running') {
      await Promise.race([this.ctx.resume().catch(() => {}), new Promise((resolve) => { setTimeout(resolve, LATE); })]);
    }
    return buffer && this.ctx.state === 'running' && performance.now() - asked <= LATE ? buffer : null;
  }

  /** Un efecto que suena mientras dura algo (la carga del especial, la rueda), hasta release(name). */
  async hold(name) {
    this.release(name);
    const slot = { source: null, gain: null };
    this.held.set(name, slot);
    const buffer = await this.ready(this.version(name, null).url, performance.now());
    if (!buffer || this.held.get(name) !== slot) return; // ya se soltó
    slot.gain = this.ctx.createGain();
    slot.gain.connect(this.sfxBus);
    slot.source = this.ctx.createBufferSource();
    slot.source.buffer = buffer;
    const loop = this.sounds.loops?.[name];
    if (loop) {
      slot.source.loop = true;
      [slot.source.loopStart, slot.source.loopEnd] = loop;
    }
    slot.source.connect(slot.gain);
    slot.source.start();
  }

  release(name) {
    const slot = this.held.get(name);
    this.held.delete(name);
    if (!slot?.source) return;
    const now = this.ctx.currentTime;
    slot.gain.gain.setTargetAtTime(0, now, 0.012);
    slot.source.stop(now + 0.08);
  }

  /** La banda sonora de la siguiente partida. started: esa partida ya empezó, y cuenta. */
  chooseSoundtrack(started = false) {
    const { soundtracks, every } = this.sounds.music;
    this.soundtrack = this.games % every === every - 1 ? soundtracks.length - 1 : 0;
    if (started) saveGames(++this.games);
  }

  /** La pista de key en la banda sonora de ahora: 'title', el lugar de un mundo (desde 0), 'boss' o 'ending'. */
  song(key) {
    const tracks = this.sounds.music.soundtracks[this.soundtrack];
    return (typeof key === 'number' ? tracks.worlds[key] : tracks[key]) ?? null;
  }

  /** La música de key (ver song). next: la que probablemente sigue, para tenerla lista. */
  music(key, next = null) {
    const song = this.song(key);
    if (!song) return;
    const same = this.wanted === song;
    this.wanted = song;
    this.upcoming = next === null ? null : this.song(next);
    if (!this.ctx) return;
    this.tidySongs();
    if (!same) this.startTrack(song);
    else this.prepareNext();
  }

  /** Olvida las pistas que no suenan ni siguen: decodificadas ocupan mucha memoria. */
  tidySongs() {
    const keep = [this.wanted, this.upcoming, this.track?.song].map((s) => s?.url);
    for (const url of this.songs) if (!keep.includes(url)) this.buffers.delete(url);
  }

  prepareNext() {
    if (this.upcoming) this.load(this.upcoming.url);
  }

  /** Cuándo entra una pista: al empezar el siguiente compás de la que suena (o ya, si no hay). */
  nextBar(now) {
    if (!this.track) return now;
    const { startedAt } = this.track;
    const { bar } = this.sounds.music;
    return now <= startedAt ? startedAt : startedAt + Math.ceil((now - startedAt + 0.06) / bar) * bar;
  }

  async startTrack(song) {
    const buffer = await this.load(song.url);
    if (this.wanted !== song) return;
    this.prepareNext(); // cuando ya está la que suena, la que sigue
    if (!buffer || this.track?.song === song) return;
    const { ctx } = this;
    const now = ctx.currentTime;
    const at = this.nextBar(now);
    const old = this.track;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    if (old) {
      // Se apaga mientras la otra entra en el tiempo fuerte
      const level = old.gain.gain;
      level.cancelScheduledValues(now);
      level.setValueAtTime(old.startedAt > now ? 0 : level.value, now);
      level.setTargetAtTime(0, Math.max(now, at - 0.03), 0.09);
      old.source.stop(at + 0.8);
      gain.gain.setValueAtTime(0, at - 0.005);
      gain.gain.linearRampToValueAtTime(1, at);
    } else gain.gain.linearRampToValueAtTime(1, now + 0.5);
    gain.connect(this.musicBus);
    const source = ctx.createBufferSource();
    const { start } = this.sounds.music;
    source.buffer = buffer;
    source.loop = true;
    source.loopStart = start;
    source.loopEnd = start + song.seconds;
    source.connect(gain);
    source.start(at, start);
    this.track = { song, source, gain, startedAt: at };
  }

  /** Detiene la música con un fundido. La siguiente llamada a music() la vuelve a empezar. */
  stopMusic() {
    this.wanted = null;
    const old = this.track;
    this.track = null;
    if (!old || !this.ctx) return;
    const now = this.ctx.currentTime;
    old.gain.gain.cancelScheduledValues(now);
    old.gain.gain.setValueAtTime(old.gain.gain.value, now);
    old.gain.gain.linearRampToValueAtTime(0, now + this.sounds.fadeSeconds);
    old.source.stop(now + this.sounds.fadeSeconds + 0.05);
  }

  /** En pausa la música baja a cero (sigue corriendo, en silencio) y vuelve al quitarla. */
  setQuiet(quiet) {
    this.quiet = quiet;
    if (!this.musicBus) return;
    const now = this.ctx.currentTime;
    this.musicBus.gain.cancelScheduledValues(now);
    this.musicBus.gain.setTargetAtTime(quiet ? 0 : this.sounds.volume.music, now, 0.08);
  }

  /** Con la pestaña oculta (o la tele en otra cosa) no suena nada. */
  applyVisibility() {
    if (!this.ctx) return;
    if (typeof document !== 'undefined' && document.hidden) this.ctx.suspend().catch(() => {});
    else this.ctx.resume().catch(() => {});
  }

  toggleMute() {
    this.setMuted(!this.muted);
  }

  setMuted(muted) {
    this.muted = muted;
    saveMuted(muted);
    if (!this.master) return;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(muted ? 0 : this.sounds.volume.master, now, 0.03);
  }
}

/** Une los avisos del juego con el sonido. Para cambiar qué suena cuándo, aquí. */
export function connectAudio(audio, events) {
  // Cada animal salta y aletea con su voz (VOICES en sounds.js)
  let voice = 0;
  events.on('start', ({ sign }) => { voice = VOICES[sign] ?? 0; });
  events.on('jump', () => audio.sfx('jump', { index: voice }));
  events.on('flap', () => audio.sfx('flap', { index: voice }));

  // Con el trío completo, el fuego jade suena distinto
  events.on('fire', ({ jade }) => audio.sfx(jade ? 'fireJade' : 'fire', { vary: 0.04 }));
  events.on('chargeStart', () => audio.hold('charge'));
  events.on('chargeEnd', () => audio.release('charge'));
  events.on('fireSpecial', ({ jade }) => audio.sfx(jade ? 'fireSpecialJade' : 'fireSpecial'));
  events.on('burn', () => audio.sfx('burn', { vary: 0.06 }));
  events.on('bossHit', ({ special, weak }) => {
    if (weak) audio.sfx('bossWeak');
    if (special || !weak) audio.sfx(special ? 'bossHitSpecial' : 'bossHit');
  });

  events.on('bossWarn', () => audio.sfx('bossWarn'));
  const attacks = { volley: 'bossShot', aimed: 'bossShot', charge: 'bossCharge', rain: 'bossRain', wall: 'bossWall' };
  events.on('bossAttack', ({ attack }) => audio.sfx(attacks[attack] ?? 'bossShot'));

  events.on('hit', () => audio.sfx('hit'));
  events.on('dying', () => audio.sfx('dying', { delay: 0.2 })); // después del golpe

  events.on('flightGained', () => audio.sfx('star'));
  events.on('food', () => audio.sfx('food'));
  events.on('cocktail', () => audio.sfx('cocktail'));
  events.on('ingredient', () => audio.sfx('ingredient'));

  // Superar el récord, y entrar a HI RECORDS al final
  events.on('newRecord', () => audio.sfx('record'));
  events.on('highScore', () => audio.sfx('record'));

  events.on('pause', () => audio.sfx('pause'));
  events.on('gameOver', () => audio.sfx('gameOver'));

  // La música: cada partida, con una de las dos bandas sonoras; los mundos que comparten canción la siguen oyendo
  events.on('title', () => {
    audio.setQuiet(false);
    audio.chooseSoundtrack();
    audio.music('title', 0);
  });
  events.on('start', () => audio.chooseSoundtrack(true));
  events.on('levelStart', ({ index, boss }) => {
    audio.setQuiet(false);
    if (boss) audio.music('boss', 'ending');
    else audio.music(index, index + 1 < audio.worlds ? index + 1 : 'boss');
  });
  events.on('pause', () => audio.setQuiet(true));
  events.on('resume', () => audio.setQuiet(false));
  events.on('gameOver', () => audio.stopMusic());
  events.on('ending', () => audio.music('ending'));
  events.on('toggleMute', () => audio.toggleMute());
}

/**
 * Los menús avisan con eventos del DOM: menu:move (se cambió de botón), menu:select (▶, o se eligió algo)
 * y la rueda del zodiaco: gira, se detiene con un animal, o se dejó de ver.
 */
export function connectMenuAudio(audio, target = document) {
  target.addEventListener('menu:move', () => audio.sfx('menuMove'));
  target.addEventListener('menu:select', () => audio.sfx('play'));
  target.addEventListener('wheel:spin', () => audio.hold('wheel'));
  target.addEventListener('wheel:leave', () => audio.release('wheel'));
  target.addEventListener('wheel:stop', () => {
    audio.release('wheel');
    audio.sfx('wheelStop');
  });
}
