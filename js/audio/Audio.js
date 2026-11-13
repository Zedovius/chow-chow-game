// Música y efectos con Web Audio. Lee qué suena en audio/sounds.js; Game no sabe que existe:
// main.js conecta los avisos del juego (core/events.js) con este módulo.
//
//   · Los navegadores no dejan sonar nada hasta que la persona toca, hace clic o presiona una tecla:
//     el audio se desbloquea con ese primer gesto (unlock). Antes, lo que se pida se recuerda (la
//     música que toca) y empieza al desbloquearse.
//   · Los archivos se bajan una vez y se guardan decodificados. Si uno falta o está dañado, se
//     anota en la consola una sola vez y no suena; nada más cambia.
//   · En pausa la música baja a cero; con la pestaña oculta se detiene todo.
//   · El silencio (tecla M) se guarda en localStorage (chowchow.sonido).

import { SOUNDS } from './sounds.js';

const MUTE_KEY = 'chowchow.sonido';

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

export class AudioManager {
  constructor(sounds = SOUNDS) {
    this.sounds = sounds;
    this.ctx = null;
    this.buffers = new Map(); // url → Promise<AudioBuffer | null>
    this.muted = loadMuted();
    this.quiet = false; // pausa: la música baja a cero (los efectos del menú sí suenan)
    this.wanted = null; // la pista que debería sonar (su clave en sounds.music)
    this.track = null; // { key, source, gain }
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
      this.master.connect(this.ctx.destination);
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

  /** Baja de antemano todo lo que está en sounds.js (tras el desbloqueo), para que no haya esperas. */
  preload() {
    if (!this.ctx) return;
    for (const url of [...Object.values(this.sounds.music), ...Object.values(this.sounds.sfx)]) this.load(url);
  }

  /** Un efecto (su clave en sounds.sfx). */
  async sfx(name) {
    if (!this.ctx || this.muted) return;
    const buffer = await this.load(this.sounds.sfx[name]);
    if (!buffer || !this.ctx) return;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.sfxBus);
    source.start();
  }

  /**
   * La música de key (su clave en sounds.music: 'title', el id de un animal o 'ending'). Si esa
   * clave no tiene archivo, sigue la pista que ya sonaba.
   */
  music(key) {
    if (!this.sounds.music[key]) return;
    if (this.wanted === key) return;
    this.wanted = key;
    if (this.ctx) this.startTrack(key);
  }

  async startTrack(key) {
    const buffer = await this.load(this.sounds.music[key]);
    if (!buffer || this.wanted !== key || this.track?.key === key) return;
    const { ctx } = this;
    const fade = this.sounds.fadeSeconds;
    const now = ctx.currentTime;
    const old = this.track;
    if (old) {
      old.gain.gain.cancelScheduledValues(now);
      old.gain.gain.setValueAtTime(old.gain.gain.value, now);
      old.gain.gain.linearRampToValueAtTime(0, now + fade);
      old.source.stop(now + fade + 0.05);
    }
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(1, now + fade);
    gain.connect(this.musicBus);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(gain);
    source.start(now);
    this.track = { key, source, gain };
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
  const sfxOn = ['jump', 'flap', 'land', 'fire', 'fireEmpty', 'burn', 'fizzle', 'cocktail', 'hit', 'pearl', 'heartGained', 'levelComplete', 'dying', 'newRecord', 'milestone', 'closeCall'];
  for (const name of sfxOn) events.on(name, () => audio.sfx(name));

  events.on('title', () => {
    audio.setQuiet(false);
    audio.music('title');
  });
  events.on('levelStart', ({ id }) => {
    audio.setQuiet(false);
    audio.music(id);
  });
  events.on('pause', () => {
    audio.sfx('pause');
    audio.setQuiet(true);
  });
  events.on('resume', () => audio.setQuiet(false));
  events.on('gameOver', () => {
    audio.sfx('gameOver');
    audio.stopMusic();
  });
  events.on('ending', () => audio.music('ending'));
  events.on('toggleMute', () => audio.toggleMute());
}
