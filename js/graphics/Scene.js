// El dibujo del juego. Game solo le pasa dónde está cada cosa (ver draw); aquí no hay lógica ni
// física, así que todo esto se puede cambiar sin tocar el juego.
//
// Cada cosa se dibuja con su imagen si ya cargó (graphics/assets.js) y, si no, con una figura
// PROVISIONAL. Para poner el arte basta con escribir las rutas en assets.js; para cambiar cómo se
// usa (animaciones, capas, parallax), se cambia la función de esa parte.
//
// El canvas mide la mitad de la pantalla del mundo (CONFIG.pixel) y el navegador lo amplía sin
// suavizar. El mundo es más alto que la pantalla: todo se dibuja corrido por la cámara (cameraY,
// graphics/Camera.js), salvo el cielo del fondo, que va pegado a la pantalla.

import { CONFIG } from '../config.js';
import { ready } from './assets.js';

const { width: W, height: H, groundY, ceilingY, pixel: P } = CONFIG;

// Colores provisionales de lo que no depende del nivel
const COLORS = {
  head: '#e8452c',
  body: ['#f2b630', '#d9842a'],
  eye: '#1a0b08',
  wall: 'rgba(0, 0, 0, 0.35)', // sombra encima del color del nivel: lo que no se quema
  flyer: '#f4f0ff',
  lantern: ['#e8452c', '#ffd166'],
  storm: ['#3a3a52', '#ffe066'],
  ceiling: 'rgba(255, 255, 255, 0.08)',
  marker: '#ffe9a8',
  pearl: '#ffe9a8',
  cocktail: { glass: '#bfe7ff', drink: ['#ff6f91', '#7ee081', '#ffd166', '#c084fc'] },
  fire: ['#fff3b0', '#ff9f1c', '#e8452c'],
};

export class Scene {
  /** images: lo que devuelve loadImages() (graphics/assets.js), o null para solo figuras. */
  constructor(canvas, images = null) {
    canvas.width = W / P;
    canvas.height = H / P;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.images = images;
  }

  /**
   * @param {{ level: object, progress: number, state: string, scroll: number, cameraY: number,
   *           dragon: import('../entities/Dragon.js').Dragon, headY: number,
   *           obstacles: {kind: string, height: string, burnable: boolean, x: number, y: number, w: number, h: number, t: number}[],
   *           pickups: {type: 'pearl' | 'cocktail', variety: string | null, x: number, y: number, r: number}[],
   *           fireballs: {x: number, y: number, r: number, age: number}[], blink: boolean }} view
   *   scroll, headY y las x ya vienen interpoladas (ver Game.render). x, y de obstáculos: esquina de
   *   arriba a la izquierda; de lo demás: el centro. progress: cuánto del nivel se lleva (0 a 1),
   *   para un fundido al siguiente animal. state: el estado del juego ('title', 'playing'...).
   *   cameraY: lo que se ve arriba de la pantalla, en coordenadas del mundo (0 = el suelo abajo).
   */
  draw(view) {
    const ctx = this.ctx;
    const art = this.images?.levels?.[view.level.id] ?? null;
    ctx.setTransform(1 / P, 0, 0, 1 / P, 0, 0);
    this.drawSky(view, art);
    // Lo demás, corrido por la cámara
    ctx.setTransform(1 / P, 0, 0, 1 / P, 0, Math.round(-view.cameraY) / P);
    this.drawGround(view, art);
    this.drawObstacles(view, art);
    this.drawPickups(view);
    if (!view.blink) this.drawDragon(view);
    this.drawFireballs(view);
    ctx.setTransform(1 / P, 0, 0, 1 / P, 0, 0);
    this.drawMarkers(view);
  }

  /**
   * El cielo del fondo, pegado a la pantalla (con parallax). Más arriba, más oscuro: así se nota la
   * altura aunque el fondo no se mueva.
   */
  drawSky({ level, scroll, cameraY }, art) {
    const ctx = this.ctx;
    const { sky } = level.colors;
    const skyImage = ready(art?.sky);
    if (skyImage) tile(ctx, skyImage, scroll * 0.3, 0, H);
    else {
      const gradient = ctx.createLinearGradient(0, 0, 0, H);
      gradient.addColorStop(0, sky[0]);
      gradient.addColorStop(1, sky[1]);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, W, H);
    }
    const height = Math.min(1, Math.max(0, -cameraY / (groundY - ceilingY)));
    if (height > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${(height * 0.45).toFixed(3)})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  /**
   * El suelo (corre con el scroll para que se note la velocidad) o, sin suelo, las nubes de abajo.
   * Y el techo del cielo, hasta donde se puede volar.
   */
  drawGround({ level, scroll }, art) {
    const ctx = this.ctx;
    const { ground } = level.colors;
    const below = H + 40; // lo que se alcanza a ver debajo del suelo
    const groundImage = ready(art?.ground);
    if (groundImage) tile(ctx, groundImage, scroll, groundY, below - groundY);
    else if (level.ground) {
      ctx.fillStyle = ground;
      ctx.fillRect(0, groundY, W, below - groundY);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      for (let x = -(scroll % 40); x < W; x += 40) ctx.fillRect(x, groundY + 8, 16, 4);
    } else {
      // Nubes: bultos que corren más lento que el mundo
      ctx.fillStyle = ground;
      ctx.fillRect(0, groundY + 6, W, below - groundY);
      for (let x = -((scroll * 0.6) % 64); x < W; x += 64) ctx.fillRect(x, groundY - 2, 40, 10);
    }
    // El techo del cielo: una franja tenue
    ctx.fillStyle = COLORS.ceiling;
    ctx.fillRect(0, ceilingY - 40, W, 40);
  }

  /** Flechitas en el borde de arriba para lo que se puede recoger y aún no se ve (está más alto). */
  drawMarkers({ pickups, cameraY }) {
    const ctx = this.ctx;
    ctx.fillStyle = COLORS.marker;
    for (const p of pickups) {
      if (p.y + p.r > cameraY + 24 || p.x > W) continue;
      const x = Math.round(p.x);
      ctx.fillRect(x - 1, 30, 2, 6);
      ctx.fillRect(x - 3, 32, 6, 2);
    }
  }

  /** Obstáculos del suelo y criaturas que vuelan. Lo que no se quema lleva una sombra encima. */
  drawObstacles({ level, obstacles }, art) {
    const ctx = this.ctx;
    for (const o of obstacles) {
      const image = ready(art?.obstacles?.[o.kind]);
      const x = Math.round(o.x);
      const y = Math.round(o.y);
      if (image) {
        ctx.drawImage(image, x, y, o.w, o.h);
        continue;
      }
      if (o.kind === 'flyer') {
        // Un cuerpo y dos alas que suben y bajan
        ctx.fillStyle = COLORS.flyer;
        ctx.fillRect(x + 4, y + 4, o.w - 8, o.h - 6);
        const wing = Math.sin(o.t * 14) > 0 ? 0 : 6;
        ctx.fillRect(x, y + wing, 6, 4);
        ctx.fillRect(x + o.w - 6, y + wing, 6, 4);
        continue;
      }
      if (o.kind === 'lantern') {
        // Una linterna de papel con su luz
        ctx.fillStyle = COLORS.lantern[0];
        ctx.fillRect(x, y + 4, o.w, o.h - 8);
        ctx.fillRect(x + 4, y, o.w - 8, o.h);
        ctx.fillStyle = COLORS.lantern[1];
        ctx.fillRect(x + 5, y + 8, o.w - 10, o.h - 16);
        continue;
      }
      if (o.kind === 'cloud') {
        // Una nube de tormenta (no se quema) con su rayo
        ctx.fillStyle = COLORS.storm[0];
        ctx.fillRect(x, y + 8, o.w, o.h - 8);
        ctx.fillRect(x + 8, y, o.w - 24, o.h);
        if (Math.sin(o.t * 9) > 0.6) {
          ctx.fillStyle = COLORS.storm[1];
          ctx.fillRect(x + o.w / 2 - 2, y + o.h - 6, 4, 6);
        }
        continue;
      }
      ctx.fillStyle = level.colors.obstacle;
      ctx.fillRect(x, y, o.w, o.h);
      if (!o.burnable) {
        ctx.fillStyle = COLORS.wall;
        for (let row = y; row < y + o.h; row += 8) ctx.fillRect(x, row, o.w, 2);
      }
    }
  }

  /** La perla y los cócteles. */
  drawPickups({ pickups }) {
    const ctx = this.ctx;
    for (const p of pickups) {
      const image = ready(p.type === 'pearl' ? this.images?.pearl : this.images?.cocktails?.[p.variety]);
      if (image) {
        ctx.drawImage(image, Math.round(p.x - p.r), Math.round(p.y - p.r), p.r * 2, p.r * 2);
      } else if (p.type === 'pearl') {
        ctx.fillStyle = COLORS.pearl;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Una copa: el vidrio y la bebida, de un color por cóctel
        const x = Math.round(p.x - p.r);
        const y = Math.round(p.y - p.r);
        const index = Math.abs(hash(p.variety ?? '')) % COLORS.cocktail.drink.length;
        ctx.fillStyle = COLORS.cocktail.glass;
        ctx.fillRect(x, y, p.r * 2, p.r * 2 - 4);
        ctx.fillRect(x + p.r - 1, y + p.r * 2 - 4, 2, 4);
        ctx.fillStyle = COLORS.cocktail.drink[index];
        ctx.fillRect(x + 2, y + 4, p.r * 2 - 4, p.r * 2 - 10);
      }
    }
  }

  drawFireballs({ fireballs }) {
    const ctx = this.ctx;
    const image = ready(this.images?.fireball);
    for (const f of fireballs) {
      if (image) {
        ctx.drawImage(image, Math.round(f.x - f.r), Math.round(f.y - f.r), f.r * 2, f.r * 2);
        continue;
      }
      const flicker = Math.floor(f.age * 20) % 2;
      COLORS.fire.forEach((color, i) => {
        ctx.fillStyle = color;
        const r = f.r - i * 2 + (i === 0 ? 0 : flicker);
        ctx.fillRect(Math.round(f.x - r - i * 3), Math.round(f.y - r / 2), r * 2, r);
      });
    }
  }

  /**
   * El dragón, de la cola a la cabeza para que la cabeza quede encima. Cada parte trae su centro,
   * tamaño e inclinación (ver Dragon.parts). Para animar: dragon.pose ('run', 'duck', 'jump',
   * 'fall', 'fly', 'hurt', 'dead', 'idle'), dragon.runTime (patas) y dragon.flapTime (alas).
   */
  drawDragon({ dragon, headY, scroll }) {
    const ctx = this.ctx;
    const art = this.images?.dragon;
    const parts = dragon.parts(headY, scroll);
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i];
      const image = ready(part.kind === 'head' ? art?.head : art?.body?.[part.index - 1]);
      if (image) {
        ctx.save();
        ctx.translate(part.x, part.y);
        ctx.rotate(part.angle);
        ctx.drawImage(image, -part.w / 2, -part.h / 2, part.w, part.h);
        ctx.restore();
        continue;
      }
      const { x, y, w, h } = part;
      ctx.fillStyle = i === 0 ? COLORS.head : COLORS.body[i % 2];
      ctx.fillRect(Math.round(x - w / 2), Math.round(y - h / 2), w, Math.round(h));
      if (i === 0) {
        ctx.fillStyle = COLORS.eye;
        ctx.fillRect(Math.round(x + 4), Math.round(y - h / 2 + 4), 4, 4);
      }
    }
  }
}

/** Repite una imagen a lo ancho de la pantalla, corrida offset, en la franja de y a y + height. */
function tile(ctx, image, offset, y, height) {
  const width = image.width * (height / image.height);
  if (!(width > 0)) return;
  for (let x = -(offset % width); x < W; x += width) ctx.drawImage(image, Math.round(x), y, Math.ceil(width) + 1, height);
}

/** Un número a partir de un texto (para elegir un color fijo por cóctel). */
function hash(text) {
  let h = 0;
  for (const char of text) h = (h * 31 + char.charCodeAt(0)) | 0;
  return h;
}
