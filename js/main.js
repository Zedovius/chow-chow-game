// Arranque: une el canvas, la entrada (teclado, toques, controles y control remoto), los menús, el
// arte, el sonido y el juego. El juego en sí está en core/Game.js.

import { Input } from './core/Input.js';
import { GamepadInput } from './core/Gamepad.js';
import { listenToRemote } from './core/Remote.js';
import { Game } from './core/Game.js';
import { Events } from './core/events.js';
import { AudioManager, connectAudio } from './audio/Audio.js';
import { loadImages } from './graphics/assets.js';
import { HUD } from './ui/HUD.js';
import { Dialogs } from './ui/Dialogs.js';
import { TitleMenu } from './ui/TitleMenu.js';
import { TitleBoards } from './ui/TitleBoards.js';
import { Legend } from './ui/Legend.js';
import { boardsNode } from './ui/leaderboard.js';
import { setUpStick } from './ui/stickSetup.js';
import { applyLanguage, onLanguageChange, t } from './i18n/i18n.js';

applyLanguage();

const canvas = document.getElementById('game-canvas');
const input = new Input({ surface: canvas, buttons: document.querySelectorAll('.touch-controls__button') });
// El control remoto de las teles: sus botones se traducen a las teclas de siempre
listenToRemote();

// Lo que pasa en el juego se avisa aquí; el sonido escucha (qué suena cuándo: audio/Audio.js)
const events = new Events();
const audio = new AudioManager();
connectAudio(audio, events);

// El arte (graphics/assets.js): lo que no haya cargado se dibuja con figuras provisionales
const images = loadImages();

// Pausa, Game Over, el nombre en HI RECORDS y el ajuste de la palanca: todos en el mismo <dialog>
const dialogs = new Dialogs(document.getElementById('dialog'));

// HI RECORDS se alterna con el menú de inicio cuando nadie lo usa
const titleBoards = new TitleBoards({
  root: document.getElementById('title-boards'),
  titleScreen: document.getElementById('title-screen'),
  splash: null,
  dialogs,
});

// Controles de Xbox, PlayStation, genéricos o del arcade: traducen sus botones a las mismas
// acciones. Start mantenido 3 segundos en la pantalla de inicio abre el ajuste de la palanca.
const gamepad = new GamepadInput(input, {
  onButton: () => {
    audio.unlock(); // un botón del control también cuenta como primer gesto, si el navegador lo deja
    return titleBoards.activity();
  },
  onSetup: () => setUpStick({ gamepad, dialogs }),
});

const hud = new HUD({
  level: document.getElementById('hud-level'),
  lives: document.getElementById('hud-lives'),
  ammo: document.getElementById('hud-ammo'),
  combo: document.getElementById('hud-combo'),
  flight: document.getElementById('hud-flight'),
  boss: document.getElementById('boss-bar'),
  score: document.getElementById('hud-score'),
  high: document.getElementById('hud-high'),
});

// Pantalla de inicio: el idioma, la fecha de nacimiento, la rueda que da el animal y la dificultad,
// que empieza el juego
const titleMenu = new TitleMenu({
  languageStep: document.getElementById('lang-step'),
  languageChoice: document.getElementById('lang-choice'),
  birthStep: document.getElementById('birth-step'),
  birthPicker: document.getElementById('birth-picker'),
  signStep: document.getElementById('sign-step'),
  wheel: document.getElementById('zodiac-wheel'),
  difficultyStep: document.getElementById('difficulty-step'),
  difficultyChoice: document.getElementById('difficulty-choice'),
  back: document.querySelector('#difficulty-step .title-screen__back'),
  onStart: (difficulty, sign) => game.newGame(difficulty, sign),
});

// Las tablas completas, desde el botón HI RECORDS de cada paso del menú
for (const button of document.querySelectorAll('[data-open-boards]')) {
  button.addEventListener('click', () => dialogs.show({
    title: t('board.title'),
    extra: [boardsNode()],
    actions: [{ label: t('board.back'), value: 'ok', primary: true }],
  }));
}

const game = new Game({
  canvas,
  stage: document.getElementById('stage'),
  input,
  hud,
  dialogs,
  events,
  images,
  legend: new Legend(document.getElementById('legend')),
  banner: document.getElementById('level-banner'),
  titleScreen: {
    root: document.getElementById('title-screen'),
    record: document.getElementById('title-high'),
    reset: () => titleMenu.reset(),
    remember: (difficulty) => titleMenu.remember(difficulty),
    confirm: () => titleMenu.confirm(),
  },
});

document.getElementById('pause-button').addEventListener('click', () => game.pause());
onLanguageChange(() => game.refreshTexts());
game.start();

// Arrancó: el aviso de error del <head> ya no hace falta
window.chowReady = true;
window.chowBooted?.();
document.getElementById('boot-error').hidden = true;

// Para jugar sin internet: el service worker (sw.js) guarda el juego. Se registra cuando la página
// ya cargó; con file:// no se puede, y si falla, el juego funciona igual (con internet).
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  const register = () => navigator.serviceWorker.register('sw.js').catch((error) => {
    console.warn('[Chow Chow] No se pudo preparar el juego para jugar sin internet.', error);
  });
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}
