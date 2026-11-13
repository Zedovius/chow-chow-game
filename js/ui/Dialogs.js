// Pausa, Game Over, el final y HI RECORDS en un <dialog> nativo.
// show() devuelve una Promise con el valor del botón elegido.
// Las flechas del teclado mueven la selección entre los botones.

import { arrowKeys } from './arrowKeys.js';

export class Dialogs {
  constructor(dialog) {
    this.el = dialog;
    this.titleEl = dialog.querySelector('.story__title');
    this.bodyEl = dialog.querySelector('.story__body');
    this.actionsEl = dialog.querySelector('.story__actions');
    this.resolve = null;
    this.cancelValue = null;
    this.onCancel = null;

    dialog.addEventListener('close', () => {
      const resolve = this.resolve;
      this.resolve = null;
      resolve?.(dialog.returnValue || this.cancelValue);
    });
    // Esc cierra el diálogo con la acción por defecto (cancelValue).
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      if (this.onCancel) this.onCancel();
      else dialog.close(this.cancelValue);
    });
    arrowKeys(dialog, '.story__actions button');
  }

  get isOpen() {
    return this.el.open;
  }

  /**
   * @param {{ title?: string, lines?: {speaker?: string, text: string}[], extra?: Node[],
   *           actions?: {label: string, value: string, primary?: boolean}[], cancelValue?: string,
   *           onCancel?: () => void }} options
   *   extra: elementos que van después de las líneas (por ejemplo, los créditos del final)
   *   onCancel: qué hacen Esc y B en lugar de cerrar (al escribir el nombre, regresan una casilla)
   */
  show({ title = '', lines = [], extra = [], actions = [{ label: 'Continuar', value: 'ok', primary: true }], cancelValue, onCancel = null } = {}) {
    this.titleEl.textContent = title;
    this.bodyEl.replaceChildren(...lines.map((line) => this.renderLine(line)), ...extra);
    this.actionsEl.replaceChildren(
      ...actions.map((action) => {
        const li = document.createElement('li');
        li.style.listStyle = 'none';
        const button = document.createElement('button');
        button.type = 'submit';
        button.value = action.value;
        button.textContent = action.label;
        button.className = action.primary ? 'button button--primary' : 'button';
        if (action.primary) button.autofocus = true;
        li.append(button);
        return li;
      }),
    );
    this.cancelValue = cancelValue ?? actions[0]?.value ?? 'ok';
    this.onCancel = onCancel;
    this.el.returnValue = '';

    return new Promise((resolve) => {
      this.resolve = resolve;
      this.el.showModal();
    });
  }

  /** Cambia el texto del diálogo abierto sin cerrarlo (el ajuste de la palanca, paso a paso). */
  setLines(lines) {
    this.bodyEl.replaceChildren(...lines.map((line) => this.renderLine(line)));
  }

  /** Cierra el diálogo, si está abierto, como si se eligiera `value`. */
  close(value) {
    if (this.el.open) this.el.close(value);
  }

  renderLine({ speaker, text }) {
    const p = document.createElement('p');
    p.className = speaker ? 'story__line' : 'story__line story__line--narration';
    if (speaker) {
      const name = document.createElement('strong');
      name.className = 'story__speaker';
      name.textContent = speaker;
      p.append(name);
    }
    p.append(document.createTextNode(text));
    return p;
  }
}
