// Elección de idioma en la pantalla de inicio: "English" / "Español".
// Elegir un idioma lo aplica y avisa (onPick); el menú de inicio pasa entonces a la dificultad.
// El idioma actual se marca con aria-current y el estilo de botón principal.

import { getLanguage, setLanguage, onLanguageChange } from '../i18n/i18n.js';

export class LanguageSwitch {
  constructor(root, { onPick = () => {} } = {}) {
    this.onPick = onPick;
    this.buttons = [...root.querySelectorAll('[data-lang]')];
    for (const button of this.buttons) {
      button.addEventListener('click', () => this.pick(button.dataset.lang));
    }
    onLanguageChange(() => this.render());
    this.render();
  }

  /** Aplica un idioma (por omisión, el actual) como si se hubiera pulsado su botón. */
  pick(code = getLanguage()) {
    setLanguage(code);
    this.onPick(code);
  }

  render() {
    const lang = getLanguage();
    for (const button of this.buttons) {
      const active = button.dataset.lang === lang;
      button.classList.toggle('button--primary', active);
      if (active) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    }
  }

  /** Enfoca el idioma actual: así Enter o Espacio lo eligen. */
  focusCurrent() {
    this.buttons.find((b) => b.dataset.lang === getLanguage())?.focus({ preventScroll: true });
  }
}
