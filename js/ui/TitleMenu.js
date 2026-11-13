// Menú de la pantalla de inicio, en dos pasos:
//   1. el idioma ("English" / "Español"), que se elige primero para que lo demás ya salga traducido;
//   2. la dificultad (fácil / difícil); elegirla empieza el juego (onStart).
// "Cambiar idioma" o Esc vuelven al primer paso. La última dificultad elegida se recuerda.
// Las flechas del teclado mueven la selección entre las opciones de cada paso.

import { LanguageSwitch } from './LanguageSwitch.js';
import { arrowKeys } from './arrowKeys.js';

const ARROWS = new Set(['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown']);

const STORAGE_KEY = 'chowchow.difficulty';

function readStored() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function store(value) {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Sin almacenamiento: la elección dura solo esta visita.
  }
}

export class TitleMenu {
  /**
   * @param {{ languageStep: HTMLElement, languageChoice: HTMLElement, difficultyStep: HTMLElement,
   *           difficultyChoice: HTMLElement, back: HTMLElement, onStart: (difficulty: string) => void }} options
   */
  constructor({ languageStep, languageChoice, difficultyStep, difficultyChoice, back, onStart }) {
    this.languageStep = languageStep;
    this.difficultyStep = difficultyStep;
    this.onStart = onStart;
    this.languages = new LanguageSwitch(languageChoice, { onPick: () => this.showDifficulty() });
    this.buttons = [...difficultyChoice.querySelectorAll('[data-difficulty]')];
    const stored = readStored();
    this.difficulty = this.buttons.some((b) => b.dataset.difficulty === stored) ? stored : 'easy';
    for (const button of this.buttons) {
      button.addEventListener('click', () => this.start(button.dataset.difficulty));
    }
    back.addEventListener('click', () => this.showLanguage());
    difficultyStep.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      this.showLanguage();
    });
    arrowKeys(languageStep);
    arrowKeys(difficultyStep);
    // Si el foco quedó fuera del menú (por ejemplo, tras un clic en el escenario), una flecha lo
    // devuelve a la opción marcada en vez de llegarle al juego como salto o agachada.
    const titleScreen = languageStep.closest('.title-screen');
    document.addEventListener('keydown', (event) => {
      if (!ARROWS.has(event.key) || titleScreen?.hidden) return;
      event.preventDefault();
      event.stopPropagation();
      if (this.step === 'language') this.languages.focusCurrent();
      else this.focusCurrent();
    });
    this.render();
  }

  get step() {
    return this.difficultyStep.hidden ? 'language' : 'difficulty';
  }

  showLanguage() {
    this.difficultyStep.hidden = true;
    this.languageStep.hidden = false;
    this.languages.focusCurrent();
  }

  showDifficulty() {
    this.languageStep.hidden = true;
    this.difficultyStep.hidden = false;
    this.focusCurrent();
  }

  start(difficulty) {
    this.difficulty = difficulty;
    store(difficulty);
    this.render();
    this.onStart(difficulty);
  }

  /** Saltar o Enter fuera de los botones: elige lo marcado en el paso actual. */
  confirm() {
    if (this.step === 'language') this.languages.pick();
    else this.start(this.difficulty);
  }

  /** Recuerda una dificultad elegida fuera del menú (el botón bajo el juego). */
  remember(difficulty) {
    this.difficulty = difficulty;
    store(difficulty);
    this.render();
  }

  /** Al volver a la pantalla de inicio se empieza otra vez por el idioma. */
  reset() {
    this.showLanguage();
  }

  render() {
    for (const button of this.buttons) {
      const active = button.dataset.difficulty === this.difficulty;
      button.classList.toggle('button--primary', active);
      if (active) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    }
  }

  focusCurrent() {
    this.buttons.find((b) => b.dataset.difficulty === this.difficulty)?.focus({ preventScroll: true });
  }
}
