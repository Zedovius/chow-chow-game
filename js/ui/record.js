// Récord nuevo: chispitas doradas que brotan de un elemento HTML (el marcador del HUD o el aviso
// del final) y el aviso «¡Nuevo récord!» que va en el diálogo de Game Over y en el del final.
// Las chispitas son <span> en forma de cruz pixel que salen volando y se apagan (.sparkle en
// styles.css); con «reducir movimiento» no salen, y el récord solo se pone dorado.

import { t } from '../i18n/i18n.js';

const COLORS = ['var(--c-marigold-soft)', 'var(--c-moon)', 'var(--c-marigold)'];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

/**
 * Lanza count chispitas, hasta spread em de distancia. Van dentro de el (que debe tener
 * position: relative) y brotan de algún punto de from: el mismo el o algo que esté dentro (por
 * ejemplo, un corazón del HUD, que con su clip-path recortaría las chispitas).
 */
export function sparkle(el, { count = 10, spread = 2.4, from = el } = {}) {
  if (reducedMotion.matches || !el?.isConnected) return;
  const box = el.getBoundingClientRect();
  const area = from.getBoundingClientRect();
  for (let i = 0; i < count; i++) {
    const spark = document.createElement('span');
    spark.className = 'sparkle';
    spark.setAttribute('aria-hidden', 'true');
    const angle = Math.random() * Math.PI * 2;
    const distance = spread * (0.5 + Math.random() * 0.5);
    spark.style.left = `${(area.left - box.left + area.width * (0.2 + Math.random() * 0.6)).toFixed(1)}px`;
    spark.style.top = `${(area.top - box.top + area.height * (0.2 + Math.random() * 0.6)).toFixed(1)}px`;
    spark.style.setProperty('--dx', `${(Math.cos(angle) * distance).toFixed(2)}em`);
    spark.style.setProperty('--dy', `${(Math.sin(angle) * distance).toFixed(2)}em`);
    spark.style.background = COLORS[i % COLORS.length];
    spark.style.animationDelay = `${(Math.random() * 0.2).toFixed(2)}s`;
    spark.addEventListener('animationend', () => spark.remove());
    el.append(spark);
  }
}

/** El aviso del récord, ya traducido: dorado y con chispitas mientras está en pantalla. */
export function recordNode(score) {
  const box = document.createElement('p');
  box.className = 'new-record';

  const label = document.createElement('span');
  label.className = 'new-record__label';
  label.textContent = t('menu.newRecord');

  const value = document.createElement('strong');
  value.className = 'new-record__score';
  value.textContent = score;

  box.append(label, value);

  // Chispitas cada medio segundo; al cerrarse el diálogo (el aviso sale del DOM) se detienen
  let shown = false;
  const timer = setInterval(() => {
    if (box.isConnected) {
      sparkle(box, { count: shown ? 6 : 16, spread: 3 });
      shown = true;
    } else if (shown) {
      clearInterval(timer);
    }
  }, 500);
  return box;
}
