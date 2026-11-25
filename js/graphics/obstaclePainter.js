// Dibuja los obstáculos, en capas de profundidad (sprite stacking; tools/sprites/obstaculos.mjs, medidas en
// graphics/obstacleArt.js): con los de su mundo, si ya tiene los suyos, o con los comunes. Llevan contorno
// oscuro, como el de los animales, y en el suelo, su sombra. Sin bordes claros ni brillos: eso es de lo que se
// recoge.
//
// Trabaja en pixeles del juego. Todos chocan con su caja de siempre (world/obstacles.js).

import { CONFIG } from '../config.js';
import { VIEW } from '../core/view.js';
import { OBSTACLE_ART } from './obstacleArt.js';

const P = CONFIG.pixel;
const CENTER = CONFIG.width / P / 2;
// Se ven igual que los animales (graphics/animalPainter.js): están en su mismo plano, así que no giran al cruzar
// la pantalla, como sí lo hace el fondo
const YAW = 0.45;
const PITCH = 0.28;
const INK = '#1b1226';

const mod = (v, n) => ((v % n) + n) % n;
const snap = (v) => Math.round(v / P);

export class ObstaclePainter {
  constructor() {
    this.sheets = new Map(); // juego (comun o un mundo) → { image, ready }
  }

  /** La hoja de un juego: se baja la primera vez que se pide. null si ese mundo no tiene los suyos. */
  sheet(id) {
    const art = OBSTACLE_ART[id];
    if (!art) return null;
    if (!this.sheets.has(id)) {
      const entry = { image: null, ready: false };
      this.sheets.set(id, entry);
      if (typeof Image !== 'undefined') {
        const image = new Image();
        image.decoding = 'async';
        image.addEventListener('load', () => Object.assign(entry, { image, ready: true }));
        image.addEventListener('error', () => console.warn(`[Chow Chow] No se pudo cargar la imagen ${art.src}.`));
        image.src = art.src;
      }
    }
    return this.sheets.get(id);
  }

  /** Todos los obstáculos (ctx sin escala). false si la hoja aún no carga. */
  draw(ctx, { obstacles, cameraY, level }, drawBolt) {
    const common = this.sheet('comun');
    const own = this.sheet(level.id);
    if (!common.ready) return false;
    const toY = (y) => snap(y - cameraY + VIEW.top);
    for (const o of obstacles) {
      const x = snap(o.x + o.w / 2);
      const y = o.height === 'ground' ? toY(o.y + o.h) : toY(o.y + o.h / 2);
      if (o.kind === 'shot') {
        this.shot(ctx, x, y, o, level.colors.fire ?? '#ff7a1a');
        continue;
      }
      if (o.kind === 'cloud') drawBolt(o);
      const mine = own?.ready && OBSTACLE_ART[level.id].skins[o.kind];
      this.stack(ctx, o, x, y, OBSTACLE_ART[mine ? level.id : 'comun'], mine ? own.image : common.image);
    }
    return true;
  }

  /** Qué cuadro toca. */
  frame(o, frames) {
    if (frames === 1) return 0;
    switch (o.kind) {
      case 'barrel': // rueda hacia la izquierda, tanto como avanza
        return mod(Math.floor(((o.t * CONFIG.obstacles.motion.roll.speed) / (o.w / 2) / (Math.PI * 2)) * frames), frames);
      case 'hopper': {
        const up = CONFIG.groundY - (o.y + o.h);
        return up > 9 ? 2 : up > 2 ? 0 : 1;
      }
      case 'flyer':
        return mod(Math.floor(o.t * 11), frames);
      case 'wall':
        return Math.sin(o.t * 5) > 0.2 ? 1 : 0;
      case 'cloud':
        return o.bolt || (o.warning && mod(Math.floor(o.t * 12), 2) === 0) ? 2 : mod(Math.floor(o.t * 2.5), 2);
      default:
        return mod(Math.floor(o.t * (frames > 2 ? 9 : 5)), frames);
    }
  }

  /** Un obstáculo: su contorno y sus capas a color. */
  stack(ctx, o, x, y, art, image) {
    const piece = art.pieces[`${o.kind}${Math.floor((o.skin ?? 0) * art.skins[o.kind])}`];
    const { w, h, ax, ay, n, z0, frames } = piece;
    if (x + w < 0 || x - w > CENTER * 2) return;
    const f = this.frame(o, frames);
    for (const block of [1, 0]) {
      for (let layer = 0; layer < n; layer++) {
        const z = z0 + layer;
        ctx.drawImage(image, (block * frames + f) * w, piece.y + layer * h, w, h, x - ax + Math.round(YAW * z), y - ay + Math.round(PITCH * z), w, h);
      }
    }
  }

  /** Un disparo del jefe: una bola de fuego del color del suyo, con su cola. */
  shot(ctx, x, y, o, color) {
    const beat = mod(Math.floor(o.t * 16), 2);
    const disc = (cx, r, style) => {
      ctx.fillStyle = style;
      for (let dy = -Math.floor(r); dy <= Math.floor(r); dy++) {
        const half = Math.round(Math.sqrt(Math.max(0, r * r - dy * dy)));
        ctx.fillRect(cx - half, y + dy, half * 2 + 1, 1);
      }
    };
    const tail = [[5 + beat, 1.6], [3, 2.4], [0, 3.6]];
    for (const [dx, r] of tail) disc(x + dx, r + 0.9, INK);
    for (const [dx, r] of tail) disc(x + dx, r, color);
    disc(x - 1, 1.8 + beat * 0.4, '#fffbe0');
  }
}
