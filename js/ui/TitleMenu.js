// Menú de la pantalla de inicio, en cuatro pasos:
//   1. el idioma ("English" / "Español"), que se elige primero para que lo demás ya salga traducido;
//   2. la fecha de nacimiento: mes y año, y el día si hace falta (ui/BirthPicker.js);
//   3. la rueda del zodiaco gira y le da su animal (ui/ZodiacWheel.js);
//   4. la dificultad (fácil / difícil); elegirla empieza el juego con ese animal (onStart).
// Esc regresa un paso; "Cambiar idioma" vuelve al primero. La última dificultad elegida se recuerda;
// la fecha no se guarda (en una máquina de bar juega gente distinta).
// Las flechas del teclado mueven la selección entre las opciones de cada paso.

import { LanguageSwitch } from './LanguageSwitch.js';
import { BirthPicker } from './BirthPicker.js';
import { ZodiacWheel } from './ZodiacWheel.js';
import { arrowKeys } from './arrowKeys.js';
import { CONFIG } from '../config.js';
import { onActivity } from '../core/activity.js';

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
   * @param {{ languageStep: HTMLElement, languageChoice: HTMLElement, birthStep: HTMLElement,
   *           birthPicker: HTMLElement, signStep: HTMLElement, wheel: HTMLElement,
   *           difficultyStep: HTMLElement, difficultyChoice: HTMLElement, back: HTMLElement,
   *           onStart: (difficulty: string, sign: string) => void }} options
   */
  constructor({ languageStep, languageChoice, birthStep, birthPicker, signStep, wheel, difficultyStep, difficultyChoice, back, onStart }) {
    this.steps = { language: languageStep, birth: birthStep, sign: signStep, difficulty: difficultyStep };
    this.onStart = onStart;
    this.sign = null; // el animal que le dio la rueda ('rat', 'ox'...)
    this.languages = new LanguageSwitch(languageChoice, { onPick: () => this.show('birth') });
    this.birth = new BirthPicker(birthPicker, {
      onDone: (sign) => {
        this.show('sign');
        this.wheel.spin(sign);
      },
      onBack: () => this.show('language'),
    });
    this.wheel = new ZodiacWheel(wheel, {
      onDone: (sign) => {
        this.sign = sign.id;
        this.show('difficulty');
      },
      onBack: () => this.show('birth'),
    });
    this.buttons = [...difficultyChoice.querySelectorAll('[data-difficulty]')];
    const stored = readStored();
    this.difficulty = this.buttons.some((b) => b.dataset.difficulty === stored) ? stored : 'easy';
    for (const button of this.buttons) {
      button.addEventListener('click', () => this.start(button.dataset.difficulty));
    }
    back.addEventListener('click', () => this.show('language'));
    difficultyStep.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      this.show('birth');
    });
    arrowKeys(languageStep);
    arrowKeys(difficultyStep);
    // Si el foco quedó fuera del menú (por ejemplo, tras un clic en el escenario), una flecha lo
    // devuelve a la opción marcada en vez de llegarle al juego como salto o agachada.
    const titleScreen = languageStep.closest('.title-screen');
    // Si alguien deja el menú a medias (la fecha, la rueda o la dificultad), al rato vuelve solo al
    // idioma: así la máquina regresa a su modo de espera (con HI RECORDS) para el siguiente
    const idle = () => {
      clearTimeout(this.idleTimer);
      this.idleTimer = setTimeout(() => {
        if (!titleScreen?.hidden && this.step !== 'language') this.reset();
      }, CONFIG.leaderboard.idleSeconds * 1000);
    };
    // Cualquier tecla, toque o botón del control (también A, que no pasa por el teclado)
    onActivity(idle);
    idle();
    document.addEventListener('keydown', (event) => {
      if (!ARROWS.has(event.key) || titleScreen?.hidden) return;
      event.preventDefault();
      event.stopPropagation();
      this.focusStep();
    });
    this.render();
  }

  /** El paso que se ve: 'language' | 'birth' | 'sign' | 'difficulty'. */
  get step() {
    return Object.keys(this.steps).find((name) => !this.steps[name].hidden) ?? 'language';
  }

  show(step) {
    for (const [name, el] of Object.entries(this.steps)) el.hidden = name !== step;
    this.focusStep();
  }

  focusStep() {
    const step = this.step;
    if (step === 'language') this.languages.focusCurrent();
    else if (step === 'birth') this.birth.focus();
    else if (step === 'sign') this.wheel.focus();
    else this.focusCurrent();
  }

  start(difficulty) {
    if (!this.sign) {
      this.show('birth');
      return;
    }
    this.difficulty = difficulty;
    store(difficulty);
    this.render();
    this.onStart(difficulty, this.sign);
  }

  /** Saltar o Enter fuera de los botones: elige lo marcado en el paso actual. */
  confirm() {
    const step = this.step;
    if (step === 'language') this.languages.pick();
    else if (step === 'birth') this.birth.confirm();
    else if (step === 'sign') this.wheel.confirm();
    else this.start(this.difficulty);
  }

  /** Recuerda una dificultad elegida fuera del menú (el botón bajo el juego). */
  remember(difficulty) {
    this.difficulty = difficulty;
    store(difficulty);
    this.render();
  }

  /** Al volver a la pantalla de inicio se empieza otra vez por el idioma (y la fecha). */
  reset() {
    this.sign = null;
    this.show('language');
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
