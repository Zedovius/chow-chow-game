// Ajuste de la palanca, para un joystick que manda sus direcciones giradas (en los de arcade pasa
// si la palanca o su cable quedaron montados de lado en la caja). Se abre manteniendo Start
// 3 segundos en la pantalla de inicio: pide mover la palanca hacia arriba y luego a la derecha, y
// con eso GamepadInput sabe qué dirección de verdad es cada una de las que manda ese control.
// Se recuerda en el navegador, por el nombre del control. Mover la palanca bien otra vez lo quita.

import { t } from '../i18n/i18n.js';
import { OPPOSITE } from '../core/Gamepad.js';

const GIVE_UP = 20000; // ms sin terminar: se cierra sin cambiar nada (que no se quede abierto en un arcade)
const SHOW_DONE = 1500; // ms que se ve «¡Listo!»

/**
 * @param {{ gamepad: import('../core/Gamepad.js').GamepadInput,
 *           dialogs: import('./Dialogs.js').Dialogs }} parts
 */
export async function setUpStick({ gamepad, dialogs }) {
  if (dialogs.isOpen) return;
  let up = null; // la dirección que manda el control al moverlo hacia arriba
  let padId = null;
  let open = true;
  const finish = (value) => {
    if (open) dialogs.close(value);
  };
  // Se mueve el foco del menú: suena como al cambiar de opción (main.js)
  const moved = () => dialogs.el.dispatchEvent(new CustomEvent('menu:move', { bubbles: true }));

  const stop = gamepad.listen((id, dir) => {
    if (!up) {
      up = dir;
      padId = id;
      dialogs.setLines([{ text: t('stick.right') }]);
      moved();
      return;
    }
    // A la derecha tiene que ser de lado: arriba otra vez (o abajo) no dice nada
    if (id !== padId || dir === up || dir === OPPOSITE[up]) return;
    gamepad.setTurn(id, { [up]: 'up', [OPPOSITE[up]]: 'down', [dir]: 'right', [OPPOSITE[dir]]: 'left' });
    stop();
    dialogs.setLines([{ text: t('stick.done') }]);
    moved();
    setTimeout(() => finish('ok'), SHOW_DONE);
  });
  const giveUp = setTimeout(() => finish('cancel'), GIVE_UP);

  await dialogs.show({
    title: t('stick.title'),
    lines: [{ text: t('stick.up') }],
    actions: [{ label: t('stick.cancel'), value: 'cancel' }],
  });
  open = false;
  stop();
  clearTimeout(giveUp);
}
