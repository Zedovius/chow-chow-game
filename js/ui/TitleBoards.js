// La clasificación se alterna con el menú de inicio, sobre la portada, cuando nadie lo usa, como en
// las maquinitas (cada parte dura CONFIG.leaderboard.alternateSeconds). Cualquier tecla, toque,
// botón o palanca regresa el menú al instante. Ese primer gesto solo lo regresa: no elige nada, para
// que nadie empiece una partida sin querer.

import { CONFIG } from '../config.js';
import { loadBoards } from '../core/scores.js';
import { t } from '../i18n/i18n.js';
import { boardsNode } from './leaderboard.js';

export class TitleBoards {
  /**
   * @param {{ root: HTMLElement, titleScreen: HTMLElement, splash: HTMLElement,
   *           dialogs: import('./Dialogs.js').Dialogs }} options
   */
  constructor({ root, titleScreen, splash, dialogs }) {
    this.root = root;
    this.titleScreen = titleScreen;
    this.splash = splash;
    this.dialogs = dialogs;
    this.timer = 0;
    this.ignoreClick = false;

    window.addEventListener('keydown', (event) => {
      if (!this.activity()) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);
    window.addEventListener('pointerdown', (event) => {
      if (!this.activity()) return;
      // El toque quitó la tabla: el clic que viene después no debe llegar al menú que quedó debajo
      this.ignoreClick = true;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);
    window.addEventListener('click', (event) => {
      if (!this.ignoreClick) return;
      this.ignoreClick = false;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);
    this.wait();
  }

  get canShow() {
    const { easy, hard } = loadBoards();
    return !this.titleScreen.hidden && !this.dialogs.isOpen && this.splash?.hidden !== false
      && !document.hidden && easy.length + hard.length > 0;
  }

  wait() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.next(), CONFIG.leaderboard.alternateSeconds * 1000);
  }

  /** Pasó el tiempo: de la tabla se regresa al menú, y del menú se pasa a la tabla si se puede. */
  next() {
    if (!this.root.hidden) this.hide();
    else if (this.canShow) this.show();
    this.wait();
  }

  show() {
    const title = document.createElement('h2');
    title.className = 'title-boards__title';
    title.textContent = t('board.title');
    this.root.replaceChildren(title, boardsNode());
    this.root.hidden = false;
    this.titleScreen.classList.add('title-screen--boards');
  }

  hide() {
    this.root.hidden = true;
    this.titleScreen.classList.remove('title-screen--boards');
  }

  /** Hubo actividad: reinicia la espera. Devuelve si quitó la tabla (entonces no cuenta para más). */
  activity() {
    const showing = !this.root.hidden;
    this.hide();
    this.wait();
    return showing;
  }
}
