// El dibujo del juego. Game solo le pasa dónde está cada cosa (ver draw); aquí no hay lógica ni
// física, así que todo esto se puede cambiar sin tocar el juego.
//
// Cada cosa se dibuja con su imagen si ya cargó (graphics/assets.js) y, si no, con una figura
// PROVISIONAL. Para poner el arte basta con escribir las rutas en assets.js; para cambiar cómo se
// usa (animaciones, capas, parallax), se cambia la función de esa parte.
//
// El canvas mide la mitad de la pantalla del mundo (CONFIG.pixel) y el navegador lo amplía sin
// suavizar. El mundo es más alto que la pantalla: todo se dibuja corrido por la cámara (cameraY,
// graphics/Camera.js), salvo el cielo del fondo, que va pegado a la pantalla. En la vista alta del
// celular (core/view.js) el canvas es más alto: arriba se ve VIEW.top de cielo más.

import { CONFIG } from '../config.js';
import { ready } from './assets.js';
import { signById } from '../world/levels.js';
import { VIEW } from '../core/view.js';

const { width: W, height: H, groundY, ceilingY, pixel: P } = CONFIG;

// El fuego verde jade (con el trío completo, contra el rival): el centro, el color y la orilla
export const JADE = '#3ee66f';
const JADE_FIRE = ['#eaffdc', JADE, '#138a3e'];

// Colores provisionales de lo que no depende del nivel
const COLORS = {
  eye: '#1a0b08',
  wall: 'rgba(0, 0, 0, 0.35)', // sombra encima del color del nivel: lo que no se quema
  flyer: '#f4f0ff',
  lantern: ['#e8452c', '#ffd166'],
  storm: ['#3a3a52', '#ffe066', '#6a6a8e'], // nube, rayo, nube avisando
  food: { box: '#f4efe6', lid: '#c8102e', rice: '#fff8e7', plate: '#3b6fb6' },
  ceiling: 'rgba(255, 255, 255, 0.08)',
  sparkle: '#fff4c2',
  warning: 'rgba(255, 240, 160, 0.3)', // dónde va a pegar el jefe (claro: se lee sobre cualquier cielo)
  star: '#ffd23f',
  cloud: '#f4f6ff',
  marker: '#ffe9a8',
  cocktail: { glass: '#bfe7ff', drink: ['#ff6f91', '#7ee081', '#ffd166', '#c084fc'] },
  ingredient: { hongo: '#fbf7ee', agave: '#5fae7e', chile: '#d7263d' },
  halo: '#ffd23f', // el aro de los ingredientes del trío, lejos...
  haloNear: '#fff6c2', // ...y ya cerca
  fire: ['#fff3b0', '#ff9f1c', '#e8452c'],
};

export class Scene {
  /** images: lo que devuelve loadImages() (graphics/assets.js), o null para solo figuras. */
  constructor(canvas, images = null) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.images = images;
    this.fit();
  }

  /** El canvas a la medida de la vista (VIEW): al empezar y cuando cambia (al girar el celular). */
  fit() {
    const { canvas } = this;
    const height = VIEW.height / P;
    if (canvas.width !== W / P || canvas.height !== height) {
      canvas.width = W / P;
      canvas.height = height; // cambiar la medida borra el canvas y su configuración
    }
    canvas.style.aspectRatio = `${W} / ${VIEW.height}`;
    this.ctx.imageSmoothingEnabled = false;
  }

  /**
   * @param {{ level: object, progress: number, state: string, scroll: number, cameraY: number,
   *           dragon: import('../entities/Player.js').Dragon, headY: number,
   *           obstacles: {kind: string, height: string, burnable: boolean, x: number, y: number, w: number, h: number, t: number}[],
   *           pickups: {type: 'cocktail' | 'food', variety: string | null, x: number, y: number, r: number}[],
   *           fireballs: {x: number, y: number, r: number, age: number}[], blink: boolean }} view
   *   scroll, headY y las x ya vienen interpoladas (ver Game.render). x, y de obstáculos: esquina de
   *   arriba a la izquierda; de lo demás: el centro. progress: cuánto del nivel se lleva (0 a 1),
   *   para un fundido al siguiente animal. state: el estado del juego ('title', 'playing'...).
   *   cameraY: lo que se ve arriba de la pantalla, en coordenadas del mundo (0 = el suelo abajo).
   *   previous, previousAlpha: recién llegado de otro nivel, el anterior y cuánto se ve aún (1 a 0):
   *   su cielo y su suelo se desvanecen encima de los del nuevo.
   */
  draw(view) {
    const ctx = this.ctx;
    const art = this.images?.levels?.[view.level.id] ?? null;
    ctx.setTransform(1 / P, 0, 0, 1 / P, 0, 0);
    this.drawSky(view, art);
    // Lo demás, corrido por la cámara (y, en la vista alta, debajo de la franja de cielo extra)
    ctx.setTransform(1 / P, 0, 0, 1 / P, 0, (VIEW.top - Math.round(view.cameraY)) / P);
    this.drawGround(view, art);
    this.drawObstacles(view, art);
    this.drawPickups(view);
    if (view.boss) this.drawBoss(view.boss);
    if (!view.blink) this.drawPlayer(view);
    this.drawFireballs(view);
    ctx.setTransform(1 / P, 0, 0, 1 / P, 0, 0);
    this.drawMarkers(view);
  }

  /**
   * El cielo del fondo, pegado a la pantalla (con parallax). Más arriba, más oscuro: así se nota la
   * altura aunque el fondo no se mueva. Recién llegado de otro nivel, el cielo del anterior se
   * desvanece encima (previous, previousAlpha).
   */
  drawSky({ level, previous, previousAlpha, scroll, cameraY }, art) {
    const ctx = this.ctx;
    this.skyLayer(level, art, scroll);
    if (previous && previousAlpha > 0) {
      ctx.globalAlpha = previousAlpha;
      this.skyLayer(previous, this.images?.levels?.[previous.id] ?? null, scroll);
      ctx.globalAlpha = 1;
    }
    const height = Math.min(1, Math.max(0, -cameraY / (groundY - ceilingY)));
    if (height > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${(height * 0.45).toFixed(3)})`;
      ctx.fillRect(0, 0, W, VIEW.height);
    }
  }

  /** El cielo de un nivel: su imagen si ya cargó; si no, su degradado. */
  skyLayer(level, art, scroll) {
    const ctx = this.ctx;
    const { sky } = level.colors;
    const skyImage = ready(art?.sky);
    if (skyImage) {
      // La imagen, a su medida, abajo; la franja extra de la vista alta, del color de arriba del cielo
      if (VIEW.top) {
        ctx.fillStyle = sky[0];
        ctx.fillRect(0, 0, W, VIEW.top);
      }
      tile(ctx, skyImage, scroll * 0.3, VIEW.top, H);
    } else {
      const gradient = ctx.createLinearGradient(0, 0, 0, VIEW.height);
      gradient.addColorStop(0, sky[0]);
      gradient.addColorStop(1, sky[1]);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, W, VIEW.height);
    }
  }

  /**
   * El suelo (corre con el scroll para que se note la velocidad) o, sin suelo, las nubes de abajo.
   * Y el techo del cielo, hasta donde se puede volar. Recién llegado de otro nivel, el suelo del
   * anterior se desvanece encima (así el suelo se vuelve nubes, o al revés, poco a poco).
   */
  drawGround({ level, previous, previousAlpha, scroll }, art) {
    const ctx = this.ctx;
    this.groundLayer(level, art, scroll);
    if (previous && previousAlpha > 0) {
      ctx.globalAlpha = previousAlpha;
      this.groundLayer(previous, this.images?.levels?.[previous.id] ?? null, scroll);
      ctx.globalAlpha = 1;
    }
    // El techo del cielo: una franja tenue
    ctx.fillStyle = COLORS.ceiling;
    ctx.fillRect(0, ceilingY - 40, W, 40);
  }

  /** El suelo de un nivel (o sus nubes, si no tiene): su imagen si ya cargó; si no, figuras. */
  groundLayer(level, art, scroll) {
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
  }

  /** Flechitas en el borde de arriba para lo que se puede recoger y aún no se ve (está más alto). */
  drawMarkers({ pickups, cameraY }) {
    const ctx = this.ctx;
    ctx.fillStyle = COLORS.marker;
    for (const p of pickups) {
      if (p.y + p.r > cameraY - VIEW.top + 24 || p.x > W) continue;
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
        // Una nube de tormenta (no se quema). Antes de cada rayo parpadea y se ve tenue el zigzag
        // donde va a caer: así se lee el espacio a esquivar. Luego cae el rayo, con la misma forma.
        const flash = o.warning && Math.floor(o.t * 12) % 2 === 0;
        ctx.fillStyle = flash ? COLORS.storm[2] : COLORS.storm[0];
        ctx.fillRect(x, y + 8, o.w, o.h - 8);
        ctx.fillRect(x + 8, y, o.w - 24, o.h);
        if (o.bolt) this.drawBolt(x + o.w / 2, y + o.h, o.bolt, 1);
        else if (o.warning && o.boltLength) this.drawBolt(x + o.w / 2, y + o.h, o.boltLength, 0.3);
        continue;
      }
      if (o.kind === 'shot') {
        // Un disparo del jefe: como una bola de fuego, del color de su fuego
        const flicker = Math.floor(o.t * 20) % 2;
        ctx.fillStyle = level.colors.fire ?? COLORS.fire[1];
        ctx.fillRect(x, y + 1, o.w, o.h - 2);
        ctx.fillStyle = COLORS.fire[0];
        ctx.fillRect(x + 2 + flicker, y + 3, 6, o.h - 6);
        continue;
      }
      if (o.kind === 'barrel') {
        // Un barril que rueda: la franja da vueltas
        ctx.fillStyle = level.colors.obstacle;
        ctx.fillRect(x + 2, y, o.w - 4, o.h);
        ctx.fillRect(x, y + 2, o.w, o.h - 4);
        ctx.fillStyle = COLORS.wall;
        const turn = Math.floor(o.t * 10) % 4;
        if (turn % 2) ctx.fillRect(x + 2, y + o.h / 2 - 1, o.w - 4, 2);
        else ctx.fillRect(x + o.w / 2 - 1, y + 2, 2, o.h - 4);
        continue;
      }
      if (o.kind === 'hopper') {
        // Un bicho que brinca: en el aire estira las patas
        const up = o.y < CONFIG.groundY - o.h - 4;
        ctx.fillStyle = level.colors.obstacle;
        ctx.fillRect(x + 1, y, o.w - 2, o.h - 4);
        ctx.fillRect(x + 2, y + o.h - 4, 3, up ? 6 : 4);
        ctx.fillRect(x + o.w - 5, y + o.h - 4, 3, up ? 6 : 4);
        ctx.fillStyle = COLORS.eye;
        ctx.fillRect(x + 2, y + 3, 2, 2);
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

  /** Los cócteles y la comida: parpadean y destellan, para que se vean como algo que se recoge. */
  drawPickups({ pickups }) {
    const ctx = this.ctx;
    for (const p of pickups) {
      if (p.type === 'ingredient') this.drawHalo(p); // los del trío son coleccionables: con halo
      this.drawSparkles(p);
      ctx.globalAlpha = Math.floor(p.t * 8) % 2 ? 0.6 : 1;
      this.drawPickup(p);
      ctx.globalAlpha = 1;
    }
  }

  /** Un cóctel, una comida, la estrella o un ingrediente: su imagen a su tamaño de pixel, o una figura provisional si no cargó. */
  drawPickup(p) {
    const ctx = this.ctx;
    const art = {
      food: () => this.images?.foods?.[p.variety],
      cocktail: () => this.images?.cocktails?.[p.variety],
      star: () => this.images?.star,
      ingredient: () => this.images?.ingredients?.[p.variety],
    };
    const image = ready(art[p.type]());
    if (image) {
      // Un pixel de la imagen = un pixel del canvas, centrada
      const w = image.width * P;
      const h = image.height * P;
      ctx.drawImage(image, Math.round((p.x - w / 2) / P) * P, Math.round((p.y - h / 2) / P) * P, w, h);
      return;
    }
    const x = Math.round(p.x - p.r);
    const y = Math.round(p.y - p.r);
    const size = p.r * 2;
    if (p.type === 'star') {
      ctx.fillStyle = COLORS.star;
      ctx.fillRect(x + p.r - 2, y, 4, size);
      ctx.fillRect(x, y + p.r - 2, size, 4);
      return;
    }
    if (p.type === 'ingredient') {
      // El hongo (blanco), el agave (verde) o el chile (rojo): un cuadro de su color
      ctx.fillStyle = COLORS.ingredient[p.variety] ?? COLORS.sparkle;
      ctx.fillRect(x + 2, y + 2, size - 4, size - 4);
      return;
    }
    if (p.type === 'food') {
      // Una caja de comida china o un tazón de arroz, según cuál sea
      if (p.variety === 'tazon-de-arroz') {
        ctx.fillStyle = COLORS.food.plate;
        ctx.fillRect(x, y + size - 5, size, 4);
        ctx.fillStyle = COLORS.food.rice;
        ctx.fillRect(x + 2, y + 3, size - 4, size - 8);
      } else {
        ctx.fillStyle = COLORS.food.box;
        ctx.fillRect(x + 1, y + 3, size - 2, size - 3);
        ctx.fillStyle = COLORS.food.lid;
        ctx.fillRect(x + 4, y + 6, size - 8, 3);
        ctx.fillRect(x + size / 2 - 1, y, 2, 4);
      }
      return;
    }
    // Una copa: el vidrio y la bebida, de un color por cóctel
    const index = Math.abs(hash(p.variety ?? '')) % COLORS.cocktail.drink.length;
    ctx.fillStyle = COLORS.cocktail.glass;
    ctx.fillRect(x, y, size, size - 4);
    ctx.fillRect(x + p.r - 1, y + size - 4, 2, 4);
    ctx.fillStyle = COLORS.cocktail.drink[index];
    ctx.fillRect(x + 2, y + 4, size - 4, size - 10);
  }

  /**
   * El halo de un ingrediente del trío: dos aros que se encogen una y otra vez hacia él
   * (CONFIG.trio.halo), de pixel en pixel, más claros y gruesos al acercarse. Así se ve como un
   * coleccionable, distinto de los cócteles y la comida. (Sin un brillo transparente de fondo: un
   * dorado transparente sobre el cielo azul se ve gris.)
   */
  drawHalo({ x, y, t }) {
    const ctx = this.ctx;
    const { rate, from, to } = CONFIG.trio.halo;
    const cx = Math.round(x / P) * P;
    const cy = Math.round(y / P) * P;
    // Dos aros, medio ciclo uno del otro, del más lejano al más cercano
    for (const offset of [0, 0.5]) {
      const k = (t * rate + offset) % 1;
      const radius = from - (from - to) * k * k; // se acelera al llegar
      ctx.fillStyle = k > 0.55 ? COLORS.haloNear : COLORS.halo;
      ctx.globalAlpha = 0.55 + 0.45 * k;
      // Ya cerca, el aro es de dos pixeles
      for (const r of k > 0.55 ? [radius, radius + P] : [radius]) this.pixelRing(cx, cy, r);
    }
    ctx.globalAlpha = 1;
  }

  /**
   * Destellos alrededor de lo que se recoge: tres crucecitas que nacen, crecen y se apagan, cada vez
   * en otro lugar.
   */
  drawSparkles({ x, y, r, t }) {
    const ctx = this.ctx;
    ctx.fillStyle = COLORS.sparkle;
    for (let i = 0; i < 3; i++) {
      const cycle = t * 1.4 + i / 3;
      const phase = cycle % 1;
      if (phase > 0.7) continue;
      const size = phase < 0.25 || phase > 0.55 ? 1 : 2; // brazos de la cruz, en pixeles
      const angle = i * 2.1 + Math.floor(cycle) * 2.4;
      const sx = Math.round((x + Math.cos(angle) * (r + 8)) / P) * P;
      const sy = Math.round((y + Math.sin(angle) * (r + 6)) / P) * P;
      ctx.fillRect(sx, sy - size * P, P, (size * 2 + 1) * P);
      ctx.fillRect(sx - size * P, sy, (size * 2 + 1) * P, P);
    }
  }

  /**
   * Un rayo en zigzag de largo length, desde (mid, top) hacia abajo. alpha < 1: el aviso tenue de
   * dónde va a caer. La forma coincide con su caja de choque (CONFIG.obstacles.lightning.width).
   */
  drawBolt(mid, top, length, alpha) {
    const ctx = this.ctx;
    const { width } = CONFIG.obstacles.lightning;
    const swing = width - 2 * P; // cuánto va de un lado al otro
    const turn = 4 * P; // cada cuánto cambia de dirección
    ctx.globalAlpha = alpha;
    ctx.fillStyle = COLORS.storm[1];
    for (let dy = 0; dy < length; dy += P) {
      const leg = Math.floor(dy / turn);
      const along = (dy % turn) / turn;
      const offset = (leg % 2 ? 1 - along : along) * swing - swing / 2;
      ctx.fillRect(Math.round((mid + offset) / P) * P - P, Math.round(top / P) * P + dy, 2 * P, P);
    }
    ctx.globalAlpha = 1;
  }

  /** Las bolas de fuego, del color del animal (fireColor). */
  drawFireballs({ fireballs, fireColor = COLORS.fire[1] }) {
    const ctx = this.ctx;
    const image = ready(this.images?.fireball);
    const colors = [COLORS.fire[0], fireColor, shade(fireColor, 0.65)];
    for (const f of fireballs) {
      if (f.jade) {
        this.drawJadeFireball(f);
        continue;
      }
      if (image) {
        ctx.drawImage(image, Math.round(f.x - f.r), Math.round(f.y - f.r), f.r * 2, f.r * 2);
        continue;
      }
      const flicker = Math.floor(f.age * 20) % 2;
      if (f.special) {
        // El especial: un halo grande alrededor, que late
        const halo = f.r + 4 + flicker * 2;
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = fireColor;
        ctx.fillRect(Math.round(f.x - halo), Math.round(f.y - halo / 2), halo * 2, halo);
        ctx.fillRect(Math.round(f.x - halo / 2), Math.round(f.y - halo), halo, halo * 2);
        ctx.globalAlpha = 1;
      }
      colors.forEach((color, i) => {
        ctx.fillStyle = color;
        const r = f.r - i * 2 + (i === 0 ? 0 : flicker);
        ctx.fillRect(Math.round(f.x - r - i * 3), Math.round(f.y - r / 2), r * 2, r);
      });
    }
  }

  /**
   * El fuego verde jade (el trío completo, contra el rival). Se ve más poderoso que el normal: más
   * grande, con una estela que se desvanece detrás y destellos; su caja de choque es la misma
   * (Fireball). El especial es distinto: un núcleo enorme, una cruz de luz y un aro que late
   * alrededor, con una estela larga.
   */
  drawJadeFireball(f) {
    const ctx = this.ctx;
    const flicker = Math.floor(f.age * 20) % 2;
    const size = f.r + (f.special ? 8 : 3); // el radio que se ve
    const gap = f.special ? 10 : 7;
    // La estela: cuadros cada vez más chicos y tenues
    ctx.fillStyle = JADE_FIRE[1];
    for (let i = 4; i >= 1; i--) {
      const s = Math.max(P, Math.round((size * (1 - i * 0.18)) / P) * P);
      ctx.globalAlpha = 0.55 - i * 0.11;
      ctx.fillRect(Math.round((f.x - size - i * gap) / P) * P, Math.round((f.y - s / 2) / P) * P, s, s);
    }
    ctx.globalAlpha = 1;
    if (f.special) {
      // Una cruz de luz y un aro que late alrededor
      const ring = size + 6 + flicker * 2;
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = JADE_FIRE[0];
      ctx.fillRect(Math.round(f.x - ring - 6), Math.round(f.y - P / 2), (ring + 6) * 2, P);
      ctx.fillRect(Math.round(f.x - P / 2), Math.round(f.y - ring - 6), P, (ring + 6) * 2);
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = JADE;
      this.pixelRing(f.x, f.y, ring);
      ctx.globalAlpha = 1;
    }
    // El cuerpo: tres capas, de la orilla oscura al centro claro
    [JADE_FIRE[2], JADE_FIRE[1], JADE_FIRE[0]].forEach((color, i) => {
      const r = size - i * (f.special ? 5 : 3) + (i === 0 ? flicker : 0);
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(f.x - r), Math.round(f.y - r * 0.6), r * 2, Math.round(r * 1.2));
    });
    // Destellos alrededor
    ctx.fillStyle = JADE_FIRE[0];
    for (let i = 0; i < 2; i++) {
      const angle = f.age * 9 + i * Math.PI;
      ctx.fillRect(Math.round((f.x + Math.cos(angle) * (size + 4)) / P) * P, Math.round((f.y + Math.sin(angle) * (size + 4)) / P) * P, P, P);
    }
  }

  /** Un aro de pixeles (sin huecos ni pixeles repetidos) de radio r alrededor de (x, y). */
  pixelRing(x, y, r) {
    const ctx = this.ctx;
    const steps = Math.max(24, Math.round((4 * Math.PI * r) / P));
    const seen = new Set();
    for (let i = 0; i < steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      const px = Math.round((x + Math.cos(angle) * r) / P);
      const py = Math.round((y + Math.sin(angle) * r) / P);
      const key = px * 4096 + py;
      if (seen.has(key)) continue;
      seen.add(key);
      ctx.fillRect(px * P, py * P, P, P);
    }
  }

  /**
   * Quien juega: su animal (dragon.sign; null en la pantalla de inicio: el dragón). Los de cuerpo
   * largo (el Dragón y la Serpiente) van de la cola a la cabeza, para que la cabeza quede encima.
   * Cada parte trae su centro, tamaño e inclinación (ver Player.parts). Para animar: dragon.pose
   * ('run', 'duck', 'jump', 'fall', 'fly', 'hurt', 'dead', 'idle'), runTime (patas), flapTime (alas)
   * y riding (va en su nubecita). Todo esto es PROVISIONAL hasta que llegue el arte de cada animal
   * (IMAGES.animals[id] en assets.js).
   */
  drawPlayer({ dragon: player, headY, headX = player.x, scroll, charge = 0, fireColor, moveHint = false }) {
    const sign = signById(player.sign ?? 'dragon');
    const parts = player.parts(headY, scroll, { headX });
    const head = parts[0];
    if (moveHint) this.drawMoveHint(head);
    if (charge > 0) this.drawCharge(head, charge, fireColor ?? sign.fire);
    if (player.riding) this.drawCloud(head.x, head.y + head.h / 2 + 2, player.flapTime);
    if (sign.long) this.drawLong(player, parts, sign);
    else this.drawAnimal(player, head, sign);
    if (player.winged && player.airborne) this.drawWings(head, player.flapTime, sign);
  }

  /** El Dragón y la Serpiente: cuerpo largo que sigue el camino de la cabeza. */
  drawLong(player, parts, sign) {
    const ctx = this.ctx;
    const art = this.images?.dragon;
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i];
      const image = sign.id === 'dragon' ? ready(part.kind === 'head' ? art?.head : art?.body?.[part.index - 1]) : null;
      if (image) {
        ctx.save();
        ctx.translate(part.x, part.y);
        ctx.rotate(part.angle);
        ctx.drawImage(image, -part.w / 2, -part.h / 2, part.w, part.h);
        ctx.restore();
        continue;
      }
      const { x, y, w, h } = part;
      ctx.fillStyle = i === 0 ? sign.body : i % 2 ? shade(sign.body, 1.25) : shade(sign.body, 0.85);
      ctx.fillRect(Math.round(x - w / 2), Math.round(y - h / 2), w, Math.round(h));
      if (i === 0) {
        ctx.fillStyle = COLORS.eye;
        ctx.fillRect(Math.round(x + 4), Math.round(y - h / 2 + 4), 4, 4);
      }
    }
  }

  /** Los demás animales: un cuerpo con orejas, cola y patas que corren. PROVISIONAL. */
  drawAnimal(player, head, sign) {
    const ctx = this.ctx;
    const { x, y, w, h } = head;
    const left = Math.round(x - w / 2);
    const top = Math.round(y - h / 2);
    const legs = player.onGround && !player.ducking ? Math.floor(player.runTime * 12) % 2 : 0;
    ctx.fillStyle = shade(sign.body, 0.75);
    // Patas (se alternan al correr) y cola
    ctx.fillRect(left + 4 + legs * 2, top + h - 4, 4, 4);
    ctx.fillRect(left + w - 10 - legs * 2, top + h - 4, 4, 4);
    ctx.fillRect(left - 4, top + 4, 4, 4);
    // Cuerpo y cabeza
    ctx.fillStyle = sign.body;
    ctx.fillRect(left, top + 2, w - 6, Math.round(h) - 6);
    ctx.fillRect(left + w - 12, top - 2, 12, Math.max(6, Math.round(h) - 6));
    // Orejas, ojo
    ctx.fillStyle = shade(sign.body, 0.75);
    ctx.fillRect(left + w - 10, top - 6, 4, 4);
    ctx.fillStyle = COLORS.eye;
    ctx.fillRect(left + w - 6, top, 2, 2);
  }

  /**
   * El jefe del nivel 12 (PROVISIONAL: un cuerpo grande del color del rival). Antes de cada ataque
   * se ve tenue dónde va a pegar, y parpadea: las tres alturas de la ráfaga, la línea de la
   * puntería o la franja de la embestida. Así se esquiva con pericia.
   */
  drawBoss(boss) {
    const ctx = this.ctx;
    const { x, y, w, h, warning, t } = boss;
    const blink = Math.floor(t * 10) % 2 === 0;
    if (warning && blink) {
      ctx.fillStyle = COLORS.warning;
      const { spread, h: shotH } = CONFIG.boss.shot;
      if (warning === 'charge') ctx.fillRect(0, Math.round(y - h / 2), W, h);
      else if (warning === 'aimed') ctx.fillRect(0, Math.round(boss.aimY - shotH / 2), x - w / 2, shotH);
      else for (const dy of [-spread, 0, spread]) ctx.fillRect(0, Math.round(y + dy - shotH / 2), x - w / 2, shotH);
    }
    if (boss.state === 'defeated' && blink) return;
    const left = Math.round(x - w / 2);
    const top = Math.round(y - h / 2);
    ctx.fillStyle = boss.flash ? '#ffffff' : boss.color;
    ctx.fillRect(left + 4, top + 6, w - 4, h - 12);
    ctx.fillRect(left, top + 14, 16, h - 26); // la cabeza, mirando a la izquierda
    ctx.fillStyle = shade(boss.color, 0.7);
    ctx.fillRect(left + 6, top, 6, 8); // orejas
    ctx.fillRect(left + 18, top + 2, 6, 6);
    ctx.fillRect(left + 10, top + h - 8, 8, 8); // patas
    ctx.fillRect(left + w - 16, top + h - 8, 8, 8);
    ctx.fillStyle = COLORS.eye;
    ctx.fillRect(left + 4, top + 18, 4, 4);
    // La boca se enciende al avisar un disparo
    if (warning && warning !== 'charge') {
      ctx.fillStyle = blink ? boss.fire : COLORS.fire[0];
      ctx.fillRect(left - 4, Math.round(y - 3), 6, 6);
    }
  }

  /**
   * El disparo especial cargándose: un brillo del color del fuego que crece alrededor de la cabeza;
   * cargado, parpadea.
   */
  drawCharge(head, progress, color) {
    const ctx = this.ctx;
    if (progress >= 1 && Math.floor(performance.now() / 80) % 2) return;
    const r = Math.round((6 + progress * 12) / P) * P;
    ctx.globalAlpha = 0.25 + progress * 0.35;
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(head.x - r), Math.round(head.y - r / 2), r * 2, r);
    ctx.fillRect(Math.round(head.x - r / 2), Math.round(head.y - r), r, r * 2);
    ctx.globalAlpha = 1;
  }

  /**
   * Contra el jefe, al empezar: dos flechas que parpadean a los lados del animal (◀ ▶), porque ahí se
   * puede mover adelante y atrás. Se van al moverse (Game.moveHint).
   */
  drawMoveHint(head) {
    const ctx = this.ctx;
    if (Math.floor(performance.now() / 280) % 2) return;
    const size = 10;
    const y = Math.round(head.y / P) * P;
    const gap = head.w / 2 + 12;
    ctx.fillStyle = COLORS.marker;
    for (const side of [-1, 1]) {
      const tip = Math.round((head.x + side * (gap + size)) / P) * P;
      // Un triángulo de pixeles que apunta hacia afuera: la punta lejos del animal
      for (let i = 0; i < size; i += P) {
        const h = P + i;
        ctx.fillRect(tip - side * i - (side > 0 ? P : 0), y - h / 2, P, h);
      }
    }
  }

  /** La nubecita en la que vuelan los animales sin alas. PROVISIONAL. */
  drawCloud(x, y, flapTime) {
    const ctx = this.ctx;
    const puff = flapTime < 0.15 ? 2 : 0; // se infla un poco con cada aleteo
    ctx.fillStyle = COLORS.cloud;
    ctx.fillRect(Math.round(x - 16 - puff), Math.round(y), 32 + puff * 2, 6);
    ctx.fillRect(Math.round(x - 10), Math.round(y - 4 - puff), 20, 4 + puff);
  }

  /** Las alas del Dragón y el Gallo: se cierran y se abren con cada aleteo. PROVISIONAL. */
  drawWings(head, flapTime, sign) {
    const ctx = this.ctx;
    const up = flapTime < 0.12;
    ctx.fillStyle = shade(sign.body, 1.3);
    const x = Math.round(head.x - head.w / 2 - 4);
    const y = Math.round(head.y - head.h / 2);
    if (up) ctx.fillRect(x, y - 10, 10, 10);
    else ctx.fillRect(x - 4, y + 4, 14, 6);
  }
}

/** Un color más claro (factor > 1) o más oscuro (< 1). */
function shade(hex, factor) {
  const channel = (i) => Math.max(0, Math.min(255, Math.round(parseInt(hex.slice(i, i + 2), 16) * factor)));
  return `rgb(${channel(1)}, ${channel(3)}, ${channel(5)})`;
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
