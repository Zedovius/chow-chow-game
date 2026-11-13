// El control remoto de las teles (y de proyectores y cajas de TV con navegador). Sus navegadores
// mandan las teclas a su manera: a veces sin `code` o con nombres viejos ("Up"), con un número
// propio para Atrás (LG 461, Samsung 10009) y para Reproducir/Pausa. Aquí se traducen a las teclas
// de siempre antes de que nadie más las vea, así el resto del juego no sabe que vienen de un
// control remoto:
//   flechas y OK       → ArrowUp, ArrowDown, ArrowLeft, ArrowRight y Enter
//   Atrás              → Esc: pausa en el juego, cierra un menú, vuelve al paso anterior
//   Reproducir/Pausa   → P: pausa
// Con el control: flecha arriba salta (mantenla para saltar más alto), flecha abajo agacha, OK
// elige y Atrás pausa. Las teclas que el juego ya entiende (las de un teclado) no se tocan.

// Las teclas que el juego ya entiende por su `code`: esas pasan tal cual
const KNOWN = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'NumpadEnter', 'Escape', 'Space', 'KeyW', 'KeyS', 'KeyP', 'KeyM', 'KeyX', 'KeyJ', 'KeyF']);
// La tecla de siempre (su `code`) de cada botón del control, por su nombre (`key`)...
const BY_NAME = {
  ArrowUp: 'ArrowUp',
  Up: 'ArrowUp',
  ArrowDown: 'ArrowDown',
  Down: 'ArrowDown',
  ArrowLeft: 'ArrowLeft',
  Left: 'ArrowLeft',
  ArrowRight: 'ArrowRight',
  Right: 'ArrowRight',
  Enter: 'Enter',
  Accept: 'Enter',
  Select: 'Enter',
  Escape: 'Escape',
  Esc: 'Escape',
  GoBack: 'Escape',
  BrowserBack: 'Escape',
  XF86Back: 'Escape',
  MediaPlayPause: 'KeyP',
  MediaPlay: 'KeyP',
  MediaPause: 'KeyP',
  MediaStop: 'KeyP',
};
// ...o por su número (`keyCode`), para los que no mandan nombre
const BY_NUMBER = {
  37: 'ArrowLeft',
  38: 'ArrowUp',
  39: 'ArrowRight',
  40: 'ArrowDown',
  13: 'Enter',
  27: 'Escape',
  461: 'Escape', // Atrás en LG (webOS)
  10009: 'Escape', // Atrás en Samsung (Tizen)
  19: 'KeyP', // Pausa
  179: 'KeyP', // Reproducir/Pausa
  413: 'KeyP', // Detener
  415: 'KeyP', // Reproducir
  10252: 'KeyP', // Reproducir/Pausa en Samsung
};
const KEY = { ArrowUp: 'ArrowUp', ArrowDown: 'ArrowDown', ArrowLeft: 'ArrowLeft', ArrowRight: 'ArrowRight', Enter: 'Enter', Escape: 'Escape', KeyP: 'p' };

const ours = new WeakSet(); // las teclas que se mandan desde aquí (no se vuelven a traducir)

/** La tecla de siempre para un botón del control, o null si no es de un control (o ya se entiende). */
function translate(event) {
  if (KNOWN.has(event.code)) return null;
  // Algunos controles mandan Atrás como Retroceso; el de un teclado (code "Backspace") no cuenta
  if (event.keyCode === 8 && event.code !== 'Backspace') return 'Escape';
  return BY_NAME[event.key] ?? BY_NUMBER[event.keyCode] ?? null;
}

function onKey(event) {
  if (ours.has(event) || event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;
  const code = translate(event);
  if (!code) return;
  // Nadie más ve la tecla original: solo la traducida
  event.stopImmediatePropagation();
  const dialog = document.querySelector('dialog[open]');
  if (code === 'Escape' && dialog && event.type === 'keydown') {
    // Como Esc en un menú: lo cierra con la acción por defecto (en la pausa, continuar). Una tecla
    // mandada desde aquí no cerraría el diálogo: el navegador solo lo hace con las de verdad
    event.preventDefault();
    if (!event.repeat) dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    return;
  }
  const copy = new KeyboardEvent(event.type, { key: KEY[code], code, repeat: event.repeat, bubbles: true, cancelable: true });
  ours.add(copy);
  event.target.dispatchEvent(copy);
  // OK sobre un botón: si nadie lo atendió, el navegador lo elige como siempre (no se impide). Lo
  // demás no hace lo que haría en la tele (moverse por la página, salir del navegador)
  if (code !== 'Enter' || copy.defaultPrevented) event.preventDefault();
}

/** Empieza a traducir las teclas del control remoto (una sola vez, al arrancar). */
export function listenToRemote() {
  window.addEventListener('keydown', onKey, true);
  window.addEventListener('keyup', onKey, true);
}
