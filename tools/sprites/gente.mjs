// La gente de los mundos: mexicana y china, vestida como va con cada uno (mundos.mjs la hornea; en qué mundo
// y a qué distancia va cada quien, en js/world/scenery.js). Miden unos 23 pixeles de alto a escala 1 y miran
// a la derecha. Cada función recibe t (0 a 1: el ciclo de caminar, o de mecerse) y da un Model de pie en (0, 0).
// Van chicas, sin contorno y con aire de por medio: nunca se confunden con lo que golpea.

import { add, joint, TAU } from './modelo3d.mjs';
import { C, islet, lantern, make } from './piezas.mjs';

const { RED, DEEP, GOLD, WOOD, DARK } = C;
const SKIN = ['#d09a6c', '#b27a4c', '#8f5c38', '#e2b48a'];
const HAIR = '#1d1518';
const GRAY = '#c9c6c0';
const CREAM = '#f0e4c8';
const WHITE = '#f4f0ea';
const STRAW = '#d8b468';
const SILVER = '#c9ced8';

const ROCK = ['#7a3a44', '#a85a5a'];

/** Un dibujo que se repite sobre la tela: franjas a lo alto. */
const bands = (colors, size = 1.3) => (l) => colors[Math.floor((l[1] + 40) / size) % colors.length];
const dotted = (base, dot, k = 2.2) => (l) => (Math.sin(l[0] * k) * Math.sin(l[1] * k) > 0.5 ? dot : base);

class Human {
  constructor(t = 0, { walk = false, skin = SKIN[0], m = make() } = {}) {
    this.m = m;
    this.t = t;
    this.walk = walk;
    this.skin = skin;
    this.bob = walk ? Math.abs(Math.sin(t * TAU)) * 0.5 : Math.sin(t * TAU) * 0.3;
  }

  /** Las piernas: pantalón y zapatos. */
  legs(color, { shoe = DARK, r = 1.5, hem = null } = {}) {
    for (const [z, d] of [[1.3, 0], [-1.3, 0.5]]) {
      const a = (this.t + d) * TAU;
      const x = this.walk ? Math.sin(a) * 3.2 : z * 0.5;
      const up = this.walk ? Math.max(0, Math.cos(a)) * 1.3 : 0;
      const hip = [0, 10 + this.bob, z];
      const foot = [x, 1 + up, z];
      const knee = joint(hip, foot, 5, 4.7, 1);
      this.m.limb(hip, knee, r + 0.2, r, { color, group: `leg${z}` });
      this.m.limb(knee, foot, r, hem ?? r * 0.85, { color, group: `leg${z}` });
      this.m.limb([x - 0.4, 0.8 + up, z], [x + 1.5, 0.6 + up, z], 0.9, 0.8, { color: shoe, group: `shoe${z}`, over: 1 });
    }
    return this;
  }

  /** Una falda o un faldón hasta el suelo (o hasta y0). */
  skirt(color, { bottom = 4.4, top = 2.4, y0 = 0.4, y1 = 11 } = {}) {
    const sway = this.walk ? Math.sin(this.t * TAU) * 0.5 : 0;
    this.m.drum([sway * 0.4, (y0 + y1) / 2 + this.bob * 0.5], bottom, top, (y1 - y0) / 2, { color, group: 'skirt', flatten: 0.8 });
    return this;
  }

  torso(color, { r = 2.6, sash = null } = {}) {
    this.m.limb([0, 10.6 + this.bob], [0.1, 15 + this.bob], r, r + 0.1, { color, group: 'torso' });
    if (sash) this.m.drum([0, 10.8 + this.bob], r + 0.3, r + 0.3, 0.8, { color: sash, group: 'sash', over: 1 });
    return this;
  }

  /** Los brazos: near (el de enfrente) y far; cada uno, la mano en [x, y, z], o null para que se balancee. */
  arms(color, { near = null, far = null, r = 1.15, skin = this.skin } = {}) {
    [[3, 0.5, near], [-3, 0, far]].forEach(([z, d, target]) => {
      const a = this.walk ? Math.sin((this.t + d) * TAU) * 0.6 : 0.12;
      const from = [0.1, 15.6 + this.bob, z * 0.82];
      const hand = target ? [target[0], target[1] + this.bob, target[2] ?? z] : [Math.sin(a) * 6, 15.6 + this.bob - Math.cos(a) * 6, z];
      const elbow = joint(from, hand, 3.3, 3.3, -1);
      this.m.limb(from, elbow, r, r * 0.95, { color, group: `arm${z}`, over: z > 0 ? 2 : -1 });
      this.m.limb(elbow, hand, r * 0.95, r * 0.85, { color, group: `arm${z}`, over: z > 0 ? 2 : -1 });
      this.m.ball(hand, 1, { color: skin, group: `hand${z}`, over: z > 0 ? 3 : -1 });
    });
    return this;
  }

  /** La cabeza, con su pelo: short, bun, braids, long, curls, quiff, mohawk, bald. */
  head(hair = HAIR, style = 'short', { ribbon = RED, blush = false } = {}) {
    const { m } = this;
    const y = 20 + this.bob;
    m.limb([0.1, 16 + this.bob], [0.3, 18 + this.bob], 1.2, 1.2, { color: this.skin, group: 'neck' });
    m.ball([0.4, y], [2.8, 3, 2.7], { color: this.skin, group: 'head' });
    m.dot([2.3, y + 0.1, 2], '#1b1226');
    m.dot([2.8, y + 0.1, 0], '#1b1226');
    if (blush) m.dot([2, y - 1, 2], '#e08a7a');
    const cap = (dx = -0.7, dy = 1, r = [2.9, 2.6, 2.9]) => m.ball([dx, y + dy, 0], r, { color: hair, group: 'hair', over: 1 });
    if (style !== 'bald') cap();
    if (style === 'bun') m.ball([-0.6, y + 4, 0], [1.6, 1.5, 1.6], { color: hair, group: 'hair', over: 1 });
    if (style === 'long') m.limb([-1.6, y, 0], [-2, y - 5.4, 0], 2, 1.5, { color: hair, group: 'hair', over: 1 });
    if (style === 'curls') for (const [dx, dy, dz] of [[-2.4, 0.6, 1.6], [-2.4, 0.6, -1.6], [-1, 2.8, 0], [-2.8, -1.4, 0], [0.6, 2.6, 0]]) m.ball([dx, y + dy, dz], 1.8, { color: hair, group: 'hair', over: 1 });
    if (style === 'quiff') m.ball([1.6, y + 3, 0], [2, 1.5, 1.8], { color: hair, group: 'hair', over: 1 });
    if (style === 'mohawk') for (let i = 0; i < 5; i++) m.limb([-2 + i * 0.9, y + 2.2, 0], [-2.6 + i, y + 5.4, 0], 0.9, 0.5, { color: ribbon, group: 'hawk', over: 2 });
    if (style === 'braids') {
      for (const z of [-2, 2.2]) {
        m.chain([[-0.6, y + 0.4, z], [-0.8, y - 3.4, z * 1.2], [-0.2, y - 7, z * 1.2]], 1, 0.7, { color: hair, group: `br${z}`, over: 3 });
        m.ball([-0.2, y - 7.2, z * 1.2], 0.9, { color: ribbon, group: `rb${z}`, over: 4 });
      }
    }
    return this;
  }

  /** Un sombrero: charro, straw, cone (douli), cap, fur, skull, scholar, band, pointed. */
  hat(kind, color, trim = GOLD) {
    const { m } = this;
    const y = 22.2 + this.bob;
    const brim = (r, dy = 0, k = 0.5) => m.drum([0, y + dy], r, r * 0.96, k, { color, group: 'hat', over: 5 });
    if (kind === 'charro') {
      brim(6, 0, 0.6);
      m.drum([0, y + 0.8], 6.2, 6.4, 0.4, { color: trim, group: 'trim', over: 6 });
      m.drum([0, y + 2.6], 2.7, 1.3, 2.2, { color, group: 'hat', over: 7 });
    } else if (kind === 'straw') {
      brim(4.6);
      m.drum([0, y + 1.5], 2.6, 2.2, 1.4, { color, group: 'hat', over: 5 });
      m.drum([0, y + 0.7], 2.8, 2.8, 0.4, { color: trim, group: 'trim', over: 6 });
    } else if (kind === 'cone') m.drum([0, y + 1.4], 5.2, 0.5, 2, { color: (l) => (Math.sin(l[0] * 3) > 0.6 ? trim : color), group: 'hat', over: 5 });
    else if (kind === 'cap') {
      m.ball([0, y], [2.9, 1.9, 2.9], { color, group: 'hat', over: 5 });
      m.box([2.8, y - 0.4], [1.6, 0.5, 1.8], { color: trim, group: 'trim', over: 5 });
    } else if (kind === 'fur') {
      m.drum([0, y], 3.4, 3.4, 1.2, { color: trim, group: 'hat', over: 5 });
      m.ball([0, y + 1.8], [2.6, 2, 2.6], { color, group: 'hat2', over: 5 });
    } else if (kind === 'skull') {
      m.ball([0, y + 0.2], [3, 2, 2.9], { color, group: 'hat', over: 5 });
      m.ball([0, y + 2.4], 0.8, { color: trim, group: 'trim', over: 6 });
    } else if (kind === 'scholar') {
      m.box([-0.4, y + 1.2], [2.4, 1.8, 2.4], { color, group: 'hat', over: 5, round: 0.6 });
      for (const z of [-3.6, 3.6]) m.box([-1, y, z], [0.8, 0.6, 1.4], { color, group: `fin${z}`, over: 5 });
    } else if (kind === 'band') m.drum([0.2, y - 0.6], 3, 3, 0.6, { color, group: 'hat', over: 5 });
    else if (kind === 'pointed') {
      m.drum([0, y], 3.2, 3, 0.8, { color: trim, group: 'trim', over: 5 });
      m.drum([0, y + 2.6], 2.6, 0.4, 2, { color, group: 'hat', over: 5 });
    }
    return this;
  }

  /** Un rebozo o un sarape al hombro. */
  shawl(color) {
    this.m.ball([0, 15 + this.bob], [3.4, 2.4, 3.4], { color, group: 'shawl', over: 1 });
    this.m.limb([-0.6, 14 + this.bob, 2.6], [-1, 9 + this.bob, 2.8], 1.2, 1, { color, group: 'shawl', over: 1 });
    return this;
  }
}

/** En un islote que flota (los mundos sin suelo). */
const onIslet = (build) => (t) => {
  const m = make();
  islet(m, 8, ...ROCK);
  return build(t, m);
};
/** En una balsa (el lago). */
const onRaft = (build) => (t) => {
  const m = make();
  for (let i = 0; i < 7; i++) m.limb([-9, 0.6, -4 + i * 1.4], [9, 0.6, -4 + i * 1.4], 0.9, 0.9, { color: i % 2 ? WOOD : '#7a5434', group: `log${i}` });
  return build(t, m);
};

/** Un bulto de flores o de fruta. */
const heap = (m, [x, y, z = 0], r, colors, n = 9) => {
  for (let i = 0; i < n; i++) m.ball([x + Math.cos(i * 2.4) * r * 0.7, y + (i % 3) * 0.5, z + Math.sin(i * 2.4) * r * 0.7], 1, { color: colors[i % colors.length], group: `h${x}${i}`, over: 6 });
};
const basket = (m, [x, y, z = 0], r = 2.6, color = '#b0803e') => m.drum([x, y, z], r * 0.7, r, 1.2, { color: (l) => (Math.sin(l[0] * 3 + l[1] * 4) > 0.3 ? '#7f5828' : color), group: `bk${x}`, over: 5 });

const campesino = (t, { item = true, walk = true, m } = {}) => {
  const h = new Human(t, { walk, skin: SKIN[1], m }).legs(WHITE, { shoe: '#6a4a2a' }).torso(WHITE, { sash: RED });
  h.arms(WHITE, item ? { near: [3.4, 13, 3] } : {}).head().hat('straw', STRAW, DEEP);
  h.m.box([-0.6, 13.6 + h.bob, 2.8], [1.4, 3, 0.8], { color: bands(['#b3302c', '#e0a436', '#2f6f8a', CREAM], 0.9), group: 'sarape', over: 3 });
  if (item) h.m.limb([3.4, 5 + h.bob, 3.2], [4.6, 22 + h.bob, 3.2], 0.6, 0.6, { color: WOOD, group: 'hoe', over: 4 });
  if (item) h.m.box([5.8, 21.6 + h.bob, 3.2], [1.8, 0.7, 0.8], { color: '#8a909c', group: 'blade', over: 4 });
  return h.m;
};

export const FOLK = {
  // --- Rata: medianoche, con frío -------------------------------------------------------
  sereno(t) { // el vigilante de la noche, con su farol
    const h = new Human(t, { walk: true, skin: SKIN[0] }).legs('#27324f').torso('#3a5688', { r: 2.9, sash: '#20283f' });
    h.arms('#3a5688', { near: [4, 13.6, 3] }).head(HAIR, 'short').hat('skull', '#20243a', RED);
    h.m.limb([3.6, 9 + h.bob, 3.2], [6.4, 23 + h.bob, 3.2], 0.6, 0.6, { color: WOOD, group: 'pole', over: 4 });
    lantern(h.m, [7.4, 18 + h.bob, 3.2], 2.2);
    return h.m;
  },
  rebozo(t) { // una señora de rebozo, con su canasta
    const h = new Human(t, { walk: true, skin: SKIN[1] }).skirt(bands(['#6a2436', '#6a2436', '#8f3a48'], 1.4)).torso(CREAM).arms(CREAM, { near: [3.6, 11.4, 3] }).head(HAIR, 'bun').shawl('#3a3f7a');
    basket(h.m, [4.4, 9.6 + h.bob, 3.4], 2.6);
    heap(h.m, [4.4, 11 + h.bob, 3.4], 1.8, ['#c98a4a', '#b3702c']);
    return h.m;
  },
  // --- Buey: el campo -------------------------------------------------------------------
  campesino,
  arrocera(t) { // agachada, sembrando arroz
    const h = new Human(t, { skin: SKIN[0] });
    const dip = 0.5 + 0.5 * Math.sin(t * TAU);
    h.bob = -1 - dip * 1.6;
    h.legs('#3f6f6a', { shoe: SKIN[0] }).torso('#4f8f86');
    h.arms('#4f8f86', { near: [4.6, 8.4 - dip * 2, 3], far: [4.8, 9 - dip * 2, -2] }).head(HAIR, 'bun').hat('cone', STRAW, '#a8803e');
    h.m.limb([4.8, 7 - dip * 3.4, 2.6], [5.6, 10 - dip * 3.4, 2.6], 0.7, 0.3, { color: '#8fb84a', group: 'sprout', over: 5 });
    return h.m;
  },
  // --- Tigre: el monte -------------------------------------------------------------------
  tecuan(t) { // la danza de los tecuanes: el jaguar
    const spots = dotted('#e0a43a', '#3a2410', 2.4);
    const h = new Human(t, { skin: '#e0a43a' });
    h.bob = Math.abs(Math.sin(t * TAU)) * 1.6;
    h.walk = true;
    h.legs(spots, { shoe: '#5a3a1a' }).torso(spots, { sash: RED });
    h.arms(spots, { near: [4, 17 + Math.sin(t * TAU) * 2, 3], far: [-3, 18 - Math.sin(t * TAU) * 2, -3] });
    const y = 20 + h.bob;
    h.m.ball([0.6, y], [3.2, 3.2, 3], { color: spots, group: 'mask' });
    for (const z of [-2, 2]) h.m.ball([-0.6, y + 3, z], 1.1, { color: spots, group: `ear${z}`, over: 1 });
    h.m.dot([3, y + 0.6, 2], '#fff3b0');
    h.m.box([2.8, y - 1.4, 0], [0.8, 0.8, 1.4], { color: RED, group: 'mouth', over: 2 });
    return h.m;
  },
  guerrera(t) { // de la ópera china: banderas a la espalda
    const h = new Human(t, { skin: SKIN[3] }).legs(DEEP).skirt('#b3302c', { bottom: 3.4, top: 2.6, y0: 5, y1: 11 }).torso((l) => (Math.abs(l[1] % 1.6) < 0.4 ? GOLD : '#b3302c'), { sash: GOLD });
    h.arms('#b3302c', { near: [4.6, 14.6, 3] }).head(HAIR, 'bun', { blush: true }).hat('band', GOLD);
    for (const a of [2, 2.4, 2.8]) {
      const tip = add([-1.6, 16 + h.bob, -2], [Math.cos(a) * 9, Math.sin(a) * 9, 0]);
      h.m.limb([-1.6, 16 + h.bob, -2], tip, 0.5, 0.4, { color: WOOD, group: `p${a}` });
      h.m.box(add(tip, [-0.4, -1, 0]), [1.5, 1.8, 0.6], { color: a === 2.4 ? GOLD : '#2f6f8a', turn: a - 1.5, group: `f${a}`, over: 1 });
    }
    h.m.limb([4.6, 5 + h.bob, 3.4], [4.6, 26 + h.bob, 3.4], 0.6, 0.6, { color: WOOD, group: 'lance', over: 4 });
    h.m.limb([4.6, 26 + h.bob, 3.4], [4.6, 29.4 + h.bob, 3.4], 1.1, 0.2, { color: SILVER, group: 'tip', over: 4 });
    return h.m;
  },
  // --- Conejo: la noche de luna ---------------------------------------------------------------
  dama(t) { // de hanfu, con mangas largas
    const h = new Human(t, { walk: true, skin: SKIN[3] }).skirt((l) => (l[1] < -3.6 ? '#f0f4ff' : '#b8c4f0'), { bottom: 4, top: 2.2, y1: 13 }).torso('#e8ecff', { r: 2.4, sash: '#d87a9a' });
    h.arms('#e8ecff', { r: 1.5, near: [3, 12.6, 3] }).head(HAIR, 'bun');
    h.m.limb([3, 12.4 + h.bob, 3], [2.6, 7.6 + h.bob, 3], 1.5, 1, { color: '#e8ecff', group: 'sleeve', over: 3 });
    h.m.ball([0.8, 24 + h.bob, 2], 0.8, { color: '#ffd45e', group: 'pin', over: 6 });
    return h.m;
  },
  tehuana(t) { // el resplandor de encaje, como una luna
    const h = new Human(t, { walk: true, skin: SKIN[2] }).skirt((l) => (l[1] < -3.4 ? WHITE : dotted('#5a1f4a', '#e8506a', 1.8)(l)), { bottom: 4.6 }).torso(dotted('#5a1f4a', GOLD, 2), { r: 2.8 });
    h.arms(SKIN[2], {}).head(HAIR, 'short');
    h.m.ball([-0.6, 20.6 + h.bob, -0.6], [5, 5, 1.2], { color: (l) => (Math.sin(Math.atan2(l[1], l[0]) * 12) > 0.2 ? WHITE : '#dcd6e8'), group: 'lace', over: -1 });
    h.m.ball([-0.2, 23.4 + h.bob, 0.6], [2.4, 0.9, 2], { color: dotted('#e8506a', '#ffd45e', 3), group: 'fl', over: 6 });
    return h.m;
  },
  // --- Dragón: sobre las nubes -------------------------------------------------------------
  sabio: onIslet((t, m) => {
    const h = new Human(t, { skin: SKIN[3], m }).skirt('#6a8a9a', { bottom: 3.8, top: 2.6, y1: 12 }).torso('#7fa0b0', { sash: '#3f5a6a' });
    h.arms('#7fa0b0', { r: 1.5, near: [4.4, 13.6, 3] }).head(GRAY, 'bun');
    h.m.limb([2.4, 18.4 + h.bob, 0], [2.6, 12.6 + h.bob, 0], 1.2, 0.5, { color: '#f0f0f0', group: 'beard', over: 4 });
    h.m.chain([[4.6, 1, 3.4], [4.6, 18, 3.4], [5.6, 23, 3.4], [3.8, 25, 3.4]], 0.7, 0.7, { color: WOOD, group: 'staff', over: 4 });
    return h.m;
  }),
  danzante: onIslet((t, m) => { // danzante con penacho de plumas verdes
    const h = new Human(t, { walk: true, skin: SKIN[2], m });
    h.bob = Math.abs(Math.sin(t * TAU)) * 1.2;
    h.legs(SKIN[2], { shoe: GOLD }).skirt((l) => (Math.abs(l[0]) < 1 ? GOLD : '#b3302c'), { bottom: 3, top: 2.6, y0: 6.4, y1: 11 }).torso(SKIN[2], { r: 2.4, sash: GOLD });
    h.m.ball([0.4, 16 + h.bob], [3, 1.4, 3], { color: (l) => (Math.sin(l[0] * 3) > 0 ? GOLD : '#2f8f7a'), group: 'collar', over: 1 });
    h.arms(SKIN[2], { near: [4.4, 16.6 + Math.sin(t * TAU), 3], far: [4, 14, -3] }).head(HAIR, 'long').hat('band', GOLD);
    for (let i = 0; i < 9; i++) {
      const a = 0.5 + i * 0.28;
      h.m.limb([-0.4, 20.4 + h.bob, (i % 2) * 2], [-0.4 + Math.cos(a) * 10, 20.4 + h.bob + Math.sin(a) * 10, (i % 2) * 2], 0.7, 0.9, { color: (l) => (l[0] > 0.8 ? GOLD : i % 2 ? '#2f9a6a' : '#1f7a5a'), group: `pl${i}`, over: 4 });
    }
    return h.m;
  }),
  // --- Serpiente: el lago ---------------------------------------------------------------------
  sombrilla: onRaft((t, m) => {
    const h = new Human(t, { skin: SKIN[3], m }).skirt('#eef2ee', { bottom: 3.8, top: 2.2, y1: 13 }).torso('#f6faf4', { r: 2.4, sash: '#7fa88a' });
    h.arms('#f6faf4', { r: 1.4, near: [3.6, 15.4, 3] }).head(HAIR, 'long');
    h.m.limb([3.6, 14 + h.bob, 3], [1.6, 27 + h.bob, 1], 0.5, 0.5, { color: WOOD, group: 'st', over: 4 });
    h.m.drum([1.4, 27 + h.bob, 0.6], 8, 0.6, 2.2, { color: (l) => (Math.sin(Math.atan2(l[2], l[0]) * 8) > 0.6 ? DEEP : '#c8402e'), group: 'umb', over: 5 });
    return h.m;
  }),
  remero: onRaft((t, m) => { // el de la trajinera, con sus flores
    campesino(t, { item: false, walk: false, m });
    const a = Math.sin(t * TAU) * 1.4;
    m.limb([5 + a, 0, 4], [1 + a, 25, 4], 0.6, 0.6, { color: WOOD, group: 'oar', over: 6 });
    heap(m, [-6.4, 2.4, 1], 2.6, ['#ff8fab', '#ffd45e', '#f4f0ea', '#d8506a'], 12);
    return m;
  }),
  // --- Caballo: los caminos --------------------------------------------------------------------
  charro(t) {
    const silver = (l) => (Math.abs(l[0]) < 0.7 && Math.sin(l[1] * 4) > 0 ? SILVER : '#2a1a1e');
    const h = new Human(t, { walk: true, skin: SKIN[0] }).legs((l) => (Math.sin(l[0] * 14) > 0.6 ? SILVER : '#2a1a1e'), { shoe: '#5a3018' }).torso(silver, { sash: '#8a2a2a' });
    h.arms('#2a1a1e').head(HAIR, 'short').hat('charro', '#3a2420', SILVER);
    h.m.box([1.9, 16 + h.bob, 0], [0.7, 0.8, 2.2], { color: RED, group: 'tie', over: 3 });
    h.m.dot([2.8, 19 + h.bob, 1], HAIR);
    return h.m;
  },
  caravanero(t) { // mercader de la Ruta de la Seda
    const h = new Human(t, { walk: true, skin: SKIN[0] }).legs('#5a3a2a', { shoe: '#3a2418' }).skirt((l) => (l[1] < -2 ? GOLD : '#a8622e'), { bottom: 3.6, top: 2.8, y0: 5, y1: 11 }).torso('#a8622e', { r: 2.9, sash: '#2f5f7a' });
    h.arms('#a8622e', { near: [3.4, 13, 3] }).head(HAIR, 'short').hat('fur', '#7a2a2a', '#6a4a34');
    h.m.ball([-3.8, 14 + h.bob, 0], [2.6, 3.6, 3], { color: bands(['#2f5f7a', '#d8a04a', '#8a2a2a'], 1.6), group: 'pack', over: -1 });
    return h.m;
  },
  // --- Cabra: la pradera -----------------------------------------------------------------------
  pastora(t) { // de los Altos de Chiapas, con su falda de lana
    const h = new Human(t, { walk: true, skin: SKIN[1] }).skirt('#3a3640', { bottom: 3.8, y0: 2.4 }).torso('#3f6fb0', { r: 2.7, sash: RED }).arms('#3f6fb0', { near: [4.2, 13, 3] }).head(HAIR, 'braids', { ribbon: '#e8506a' }).shawl('#2f5a9a');
    h.m.ball([2.2, 14.6 + h.bob, 2.6], 1, { color: '#e8506a', group: 'pom', over: 6 });
    h.m.limb([4.2, 1, 3.4], [4.8, 22, 3.4], 0.6, 0.5, { color: WOOD, group: 'crook', over: 4 });
    return h.m;
  },
  estepa(t) { // de las estepas, con su túnica azul
    const h = new Human(t, { walk: true, skin: SKIN[0] }).legs('#4a3a34', { shoe: '#5a3018' }).skirt('#3f6f8f', { bottom: 3.8, top: 2.8, y0: 4, y1: 11 }).torso('#3f6f8f', { r: 2.9, sash: '#e08a2e' });
    h.arms('#3f6f8f').head(HAIR, 'short').hat('pointed', '#b3302c', '#5a4030');
    return h.m;
  },
  // --- Mono: los frutales ------------------------------------------------------------------------
  frutera(t) { // marchanta con su canasta en la cabeza
    const h = new Human(t, { walk: true, skin: SKIN[2] }).skirt(bands(['#b3302c', '#d8a04a', '#2f7a5a', '#b3302c'], 1.6)).torso((l) => (l[1] > 3 ? dotted('#f0e4c8', '#d8506a', 3)(l) : CREAM), { r: 2.5, sash: '#b3302c' });
    h.arms(SKIN[2], { near: [1.8, 21.4, 3.4] }).head(HAIR, 'braids', { ribbon: '#ffb04a' });
    basket(h.m, [0.2, 24.6 + h.bob], 4);
    heap(h.m, [0.2, 26.2 + h.bob], 3, ['#e87a3a', '#e8c45a', '#8fb84a', '#c8402e'], 11);
    return h.m;
  },
  cargador(t) { // con su balancín y dos canastas de duraznos
    const h = new Human(t, { walk: true, skin: SKIN[0] }).legs('#5a6a3a', { shoe: '#4a3420' }).torso('#8a7a3a', { sash: '#3a3420' }).arms('#8a7a3a', { near: [3.4, 16.4, 3] }).head(HAIR, 'short').hat('cone', STRAW, '#a8803e');
    const y = 17 + h.bob;
    h.m.chain([[-10, y - 0.6, 2.6], [0, y + 0.8, 2.6], [10, y - 0.6, 2.6]], 0.6, 0.6, { color: WOOD, group: 'yoke', over: 5 });
    for (const x of [-10, 10]) {
      h.m.limb([x, y - 0.6, 2.6], [x, y - 7, 2.6], 0.4, 0.4, { color: '#7a5a34', group: `r${x}`, over: 4 });
      basket(h.m, [x, y - 8.4, 2.6], 3.4);
      heap(h.m, [x, y - 7, 2.6], 2.2, ['#ff9a8a', '#ffc2a0'], 7);
    }
    return h.m;
  },
  // --- Gallo: la feria del cielo -------------------------------------------------------------------
  globero: onIslet((t, m) => {
    const h = new Human(t, { skin: SKIN[1], m }).legs('#4a3a5a').torso('#e8d8b8', { sash: '#7a3a44' }).arms('#e8d8b8', { near: [3.6, 15.4, 3] }).head(HAIR, 'short').hat('straw', STRAW, RED);
    const sway = Math.sin(t * TAU) * 0.8;
    [[2, 34, '#d8304a'], [6.4, 32, '#e8b84a'], [-2, 32.6, '#3f8fb0'], [4.4, 37.6, '#e87a3a'], [0, 38, '#6f9a4a'], [8, 36.4, '#b05aa0']].forEach(([x, y, c], i) => {
      m.limb([3.6, 15 + h.bob, 3], [x + sway, y - 2.6, 1], 0.3, 0.3, { color: CREAM, group: `s${i}` });
      m.ball([x + sway, y, (i % 2) * 2], [2.6, 3, 2.6], { color: c, group: `g${i}`, over: 4 });
    });
    return m;
  }),
  opera: onIslet((t, m) => { // de la ópera, con sus plumas de faisán
    const h = new Human(t, { skin: SKIN[3], m }).skirt(bands(['#b3304a', '#e0a436', '#b3304a', '#f0c0a0'], 1.8), { bottom: 4 }).torso('#b3304a', { r: 2.6, sash: GOLD });
    h.arms('#f4d8c8', { r: 1.4, near: [4.8, 16 + Math.sin(t * TAU), 3], far: [-3, 14, -3] }).head(HAIR, 'bun', { blush: true }).hat('band', GOLD);
    for (const s of [-1, 1]) m.chain([[-0.4, 23 + h.bob, s], [-4, 29, s * 2], [-9, 30 + Math.sin(t * TAU), s * 3]], 0.7, 0.4, { color: (l) => (l[0] > 0.5 ? '#6a3a2a' : '#c98a4a'), group: `pl${s}`, over: 6 });
    m.limb([4.8, 15.6 + h.bob, 3], [4.4, 10 + h.bob, 3.4], 1.5, 0.8, { color: WHITE, group: 'sl', over: 5 });
    return m;
  }),
  // --- Perro: el barrio chino, en los ochenta ----------------------------------------------------------
  poblana(t) { // china poblana
    const h = new Human(t, { walk: true, skin: SKIN[1] }).skirt((l) => (l[1] < -3 ? '#2f7a4a' : Math.sin(l[0] * 2.2) * Math.sin(l[1] * 2.2) > 0.4 ? '#ffe08a' : '#b3202c'), { bottom: 5 }).torso(dotted(WHITE, '#d8506a', 2.6), { r: 2.4, sash: '#2f7a4a' });
    h.arms(SKIN[1]).head(HAIR, 'braids', { ribbon: '#2f9a5a' });
    return h.m;
  },
  punk(t) {
    const h = new Human(t, { walk: true, skin: SKIN[0] }).legs((l) => (Math.sin(l[0] * 9) > 0.85 ? '#8a94b0' : '#2f3a5a'), { shoe: '#1a1418' }).torso((l) => (Math.abs(l[0]) < 0.8 ? '#c8402e' : '#201c26'), { r: 2.8 });
    h.arms('#201c26').head('#2a1a20', 'short').head('#2a1a20', 'mohawk', { ribbon: '#e8407a' });
    return h.m;
  },
  aerobics(t) { // leotardo, calentadores y cinta en la frente
    const h = new Human(t, { walk: true, skin: SKIN[3] }).legs('#3fb0b8', { shoe: WHITE }).torso('#e8508a', { r: 2.3, sash: '#ffd45e' }).arms(SKIN[3]).head('#6a3a20', 'curls').hat('band', '#ffd45e');
    for (const [z, d] of [[1.3, 0], [-1.3, 0.5]]) h.m.ball([Math.sin((t + d) * TAU) * 2.8, 2.8 + Math.max(0, Math.cos((t + d) * TAU)) * 1.3, z], [1.6, 1.6, 1.6], { color: '#ffd45e', group: `w${z}`, over: 2 });
    return h.m;
  },
  walkman(t) { // copete, chamarra rompevientos y audífonos
    const h = new Human(t, { walk: true, skin: SKIN[1] }).legs('#7f93b8', { shoe: WHITE }).torso((l) => (l[1] > 3 ? '#3f8fb0' : l[1] > 1.4 ? '#ffd45e' : '#e0563a'), { r: 2.8 });
    h.arms('#3f8fb0').head(HAIR, 'quiff');
    for (const z of [-2.8, 2.8]) h.m.ball([0, 20 + h.bob, z], [1.1, 1.2, 0.7], { color: '#e0563a', group: `ph${z}`, over: 4 });
    h.m.chain([[0, 21, -2.6], [0, 23.4, -1.4], [0, 23.4, 1.4], [0, 21, 2.6]].map((p) => add(p, [0, h.bob, 0])), 0.5, 0.5, { color: DARK, group: 'arc', over: 4 });
    return h.m;
  },
  qipao(t) {
    const h = new Human(t, { walk: true, skin: SKIN[3] }).skirt((l) => (Math.abs(l[0] - 1) < 0.5 ? GOLD : '#b3203a'), { bottom: 2.7, top: 2.4, y0: 3 }).torso('#b3203a', { r: 2.4 });
    h.arms(SKIN[3]).head(HAIR, 'curls');
    h.m.box([-0.2, 16 + h.bob], [1.4, 0.6, 1.6], { color: GOLD, group: 'col', over: 3 });
    for (const z of [-1, 1]) h.m.limb([0, 3, z], [0.6, 0.6, z], 0.8, 0.8, { color: SKIN[3], group: `ft${z}` });
    return h.m;
  },
  maestro(t) { // de kung-fu
    const h = new Human(t, { skin: SKIN[0] });
    const k = Math.sin(t * TAU);
    h.legs('#22202c', { shoe: WHITE }).torso((l) => (Math.abs(l[0] - 1.6) < 0.4 && Math.sin(l[1] * 4) > 0.2 ? WHITE : '#22202c'), { r: 2.8, sash: WHITE });
    h.arms('#22202c', { near: [5 + k, 15, 3], far: [3 - k, 17, -3] }).head(GRAY, 'short');
    h.m.limb([2.4, 18.2 + h.bob, 0], [2.6, 15.4 + h.bob, 0], 0.9, 0.4, { color: '#f0f0f0', group: 'beard', over: 4 });
    return h.m;
  },
  nino(t) { // un niño con su globo rojo
    const h = new Human(t, { walk: true, skin: SKIN[1] }).legs('#3f5a9a', { shoe: RED }).torso(bands(['#f0e4c8', '#e0563a'], 1.1), { r: 2.5 }).arms('#e0563a', { near: [3.8, 16.4, 3] }).head(HAIR, 'short').hat('cap', '#b3202c', '#2f3a5a');
    h.m.limb([3.8, 16.4 + h.bob, 3], [5, 27 + h.bob, 3], 0.3, 0.3, { color: CREAM, group: 'st', over: 4 });
    h.m.ball([5, 30 + h.bob, 3], [2.8, 3.2, 2.8], { color: '#e0304a', group: 'gl', over: 4 });
    return h.m.scale(0.78);
  },
  // --- Cerdo: la fiesta de año nuevo --------------------------------------------------------------------
  mariachi(t) { // con su guitarra
    const suit = (l) => (Math.abs(l[0]) < 0.8 && Math.sin(l[1] * 4) > 0 ? GOLD : '#2a1830');
    const h = new Human(t, { skin: SKIN[1] }).legs((l) => (Math.sin(l[0] * 14) > 0.6 ? GOLD : '#2a1830')).torso(suit, { sash: '#8a2a3a' });
    h.arms('#2a1830', { near: [3.4, 11.4 + Math.sin(t * TAU * 2) * 0.8, 4], far: [6.6, 14.6, 1] }).head(HAIR, 'short').hat('charro', '#2a1830', GOLD);
    h.m.ball([2, 11.4 + h.bob, 3.4], [2.8, 2.4, 1], { color: (l) => (Math.hypot(l[0], l[1]) < 0.9 ? DARK : '#c98a3a'), group: 'gt', over: 3 });
    h.m.limb([4, 12.4 + h.bob, 3.4], [8.4, 15.4 + h.bob, 2.6], 0.6, 0.6, { color: '#6a3a1a', group: 'gtn', over: 3 });
    return h.m;
  },
  festejo(t) { // de rojo, con su farol de año nuevo
    const h = new Human(t, { walk: true, skin: SKIN[3] }).legs('#4a1a34', { shoe: GOLD }).skirt((l) => (l[1] < -1.6 ? GOLD : '#c8283a'), { bottom: 3.4, top: 2.8, y0: 5, y1: 11 }).torso(dotted('#c8283a', GOLD, 1.9), { r: 2.8, sash: GOLD });
    h.arms('#c8283a', { near: [4, 14, 3] }).head(HAIR, 'bun', { blush: true });
    h.m.limb([4, 14 + h.bob, 3], [7, 17 + h.bob, 3], 0.4, 0.4, { color: WOOD, group: 'st', over: 4 });
    lantern(h.m, [7, 12.6 + h.bob, 3], 2);
    return h.m;
  },
};

/** Alguien de pie, sin animar, para ponerlo en un puesto (ciudad.mjs). */
export const standing = (t = 0, options = {}) => new Human(t, options);
export { SKIN, HAIR, CREAM, WHITE };
