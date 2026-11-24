// Arranque: une el canvas, la entrada (teclado, toques, controles y control remoto), los menús, el
// arte, el sonido y el juego. El juego en sí está en core/Game.js.

import { Input } from './core/Input.js';
import { GamepadInput } from './core/Gamepad.js';
import { listenToRemote } from './core/Remote.js';
import { Game } from './core/Game.js';
import { Events } from './core/events.js';
import { touch } from './core/activity.js';
import { VIEW, setViewTop } from './core/view.js';
import { CONFIG } from './config.js';
import { rivalOf, signById } from './world/levels.js';
import { AudioManager, connectAudio, connectMenuAudio } from './audio/Audio.js';
import { loadImages } from './graphics/assets.js';
import { HUD } from './ui/HUD.js';
import { Dialogs } from './ui/Dialogs.js';
import { TitleMenu } from './ui/TitleMenu.js';
import { TitleBoards } from './ui/TitleBoards.js';
import { Legend } from './ui/Legend.js';
import { TouchPad } from './ui/TouchPad.js';
import { boardsNode } from './ui/leaderboard.js';
import { setUpStick } from './ui/stickSetup.js';
import { applyLanguage, onLanguageChange, t } from './i18n/i18n.js';

applyLanguage();

// Nada de la página se selecciona como texto (en iPhone, un toque largo o un doble toque en un
// botón lo hacía); el CSS ya lo pide (user-select: none) y esto cubre a Safari. Solo se puede escribir
// y seleccionar en los campos de texto.
document.addEventListener('selectstart', (event) => {
  if (!(event.target instanceof Element && event.target.closest('input, textarea, [contenteditable]'))) event.preventDefault();
});

const canvas = document.getElementById('game-canvas');
const input = new Input({ surface: canvas });
// El control remoto de las teles: sus botones se traducen a las teclas de siempre
listenToRemote();

// Lo que pasa en el juego se avisa aquí; el sonido escucha (qué suena cuándo: audio/Audio.js)
const events = new Events();
const audio = new AudioManager();
connectAudio(audio, events);
connectMenuAudio(audio);

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
    touch(); // alguien está jugando (para el regreso solo al menú principal)
    audio.unlock(); // un botón del control también cuenta como primer gesto, si el navegador lo deja
    return titleBoards.activity();
  },
  onSetup: () => setUpStick({ gamepad, dialogs }),
});

// Con pantalla táctil: la cruceta y FIRE, que llegan como un control más (ver ui/TouchPad.js)
new TouchPad({
  dpad: document.getElementById('dpad'),
  fire: document.getElementById('pad-fire'),
  dialog: dialogs.el,
  gamepad,
});

const hud = new HUD({
  level: document.getElementById('hud-level'),
  lives: document.getElementById('hud-lives'),
  ammo: document.getElementById('hud-ammo'),
  combo: document.getElementById('hud-combo'),
  flight: document.getElementById('hud-flight'),
  trio: document.getElementById('hud-trio'),
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
  signBack: document.querySelector('#sign-step .title-screen__back'),
  difficultyStep: document.getElementById('difficulty-step'),
  difficultyChoice: document.getElementById('difficulty-choice'),
  back: document.querySelector('#difficulty-step .title-screen__back'),
  onStart: (difficulty, sign) => game.newGame(difficulty, sign),
});

// Las tablas completas, desde el botón HI RECORDS de cada paso del menú
for (const button of document.querySelectorAll('[data-open-boards]')) {
  button.addEventListener('click', () => {
    button.dispatchEvent(new CustomEvent('menu:select', { bubbles: true }));
    dialogs.show({
      title: t('board.title'),
      extra: [boardsNode()],
      actions: [{ label: t('board.back'), value: 'ok', primary: true }],
    });
  });
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

// En un celular en vertical la vista se hace más alta (más cielo arriba, core/view.js), como en
// Chispas: el canvas cambia de proporción. Se recalcula al girar el teléfono.
const tallView = window.matchMedia(CONFIG.tallView.query);
/** Franja extra: hasta CONFIG.tallView.height, sin pasar del alto de la pantalla (los botones deben caber). */
function tallViewTop() {
  if (!tallView.matches) return 0;
  const { height, reserve } = CONFIG.tallView;
  const room = ((window.innerHeight - reserve) * CONFIG.width) / Math.max(1, canvas.clientWidth);
  const view = Math.min(height, Math.floor(room / 2) * 2); // par: el canvas mide la mitad
  return Math.max(0, view - CONFIG.height);
}
function updateView() {
  // El CSS pone el juego de orilla a orilla y arriba en la vista alta: primero eso, luego se mide
  document.documentElement.dataset.view = tallView.matches ? 'tall' : 'wide';
  setViewTop(tallViewTop());
  if (!VIEW.tall) document.documentElement.dataset.view = 'wide';
  game.scene.fit();
  game.camera.snap(game.player.y);
}
tallView.addEventListener('change', updateView);
// Solo al cambiar el ancho (girar, pantalla dividida): la barra del navegador que aparece y
// desaparece al desplazarse cambia el alto y no debe mover el juego
let lastWidth = window.innerWidth;
window.addEventListener('resize', () => {
  if (window.innerWidth === lastWidth) return;
  lastWidth = window.innerWidth;
  updateView();
});
updateView();

// El dibujo del animal se va bajando mientras gira la rueda
document.addEventListener('wheel:sign', ({ detail }) => {
  game.scene.animalPainter.sheet(detail);
  game.scene.animalPainter.sheet('cloud');
});
document.getElementById('pause-button').addEventListener('click', () => game.pause());
onLanguageChange(() => game.refreshTexts());
game.start();

// Para probar a un jefe (?jefe=..., ver config.js y jefes.html): directo a su pelea con el animal del que
// es rival, y al volver al inicio, a la lista
if (CONFIG.bossTest) {
  const { boss, difficulty } = CONFIG.bossTest;
  if (signById(boss)) game.newGame(difficulty, rivalOf(boss).id);
  events.on('title', () => { window.location.href = 'jefes.html'; });
}

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
