// El escenario de cada mundo (solo el dibujo: nada de esto choca). Con la iconografía de cada animal en la
// cultura china; las montañas, como las de las pinturas antiguas.
//
//   sky        el cielo, de arriba al horizonte; glow: el resplandor junto al horizonte; stars: cuántas
//   rock       los colores de las montañas: ink (la sombra más honda), shade, rock, light, rim (el filo de
//              luz), moss (lo verde), haze (la bruma); bands: franjas de color; fall: cascadas; trees
//   astro      el sol o la luna, con la silueta del animal recortada. Está en el mismo lugar y mide lo mismo en todos
//              los mundos (ASTRO): de un nivel a otro no se mueve ni cambia de tamaño
//   floor      el suelo (graphics/floors.js): kind y sus colores; lane: el camino por donde se corre
//   props      qué hay a cada distancia (tools/sprites/piezas.mjs; los animales, vivos y en el suelo, en
//              fauna.mjs): land (los grandes, al fondo), back, mid y near (justo detrás del camino)
//   people     la gente (tools/sprites/gente.mjs), por capas: a qué distancia (s), cada cuántos pixeles sale
//              alguien (every), cuánto camina (v: pixeles por segundo; negativo, hacia la izquierda) y quiénes
//   traffic    los autos, igual (tools/sprites/ciudad.mjs)
//   gradient   el color a lo lejos (graphics/aerial.js): air, el del horizonte; dusk, el de las sombras; ranges, los de cada cordillera, de
//              la cima a la base, como en el paisaje azul y verde chino; haze y mist, cuánto aire y cuánta bruma
//              (los colores se escriben claros: al dibujarlos, su valor se baja para que el fondo quede atrás)
//   every      cada cuánto salen sus objetos, si no es lo de siempre (DEPTHS)
//   mountains  sus cordilleras, si no son las de siempre; city: las dos de enfrente son edificios
//   banks      sin suelo: los colores de los bancos de nubes, los de lejos (far) y los de cerca (near, más oscuros)
//   air        lo que flota: kind, colores y cuántos (graphics/worldPainter.js)

/** Gente a dos distancias: los de atrás (far) y los de adelante (near); fv y nv: cuánto caminan. */
const folk = (far, fv, near, nv) => [
  { s: 0.5, every: 350, v: fv, names: far },
  { s: 0.66, every: 400, v: nv, names: near },
];

export const SCENERY = {
  // Medianoche: lámparas de aceite, graneros, monedas y la boda de los ratones
  rat: {
    sky: ['#060a30', '#1c1f8c', '#6248c8'], glow: '#6a78c0', stars: 60,
    gradient: {
      air: '#5c4cc8', dusk: '#3a2cd0',
      ranges: [
        { top: '#3f58d8', mid: '#5a5ad4', base: '#7a5cdc' },
        { top: '#3a3cc0', mid: '#5a48c0', base: '#7050cc' },
        { top: '#2a2a88', mid: '#463ca8', base: '#5c48b8' },
      ],
    },
    rock: { ink: '#090820', shade: '#1b1a44', rock: '#383b74', light: '#7f86c4', rim: '#c7c0ff', moss: '#1f4650', haze: '#2c3670' },
    astro: { kind: 'moon', color: '#f3ecd2', shade: '#b7b4d8' },
    floor: { kind: 'stone', base: '#2b2f5a', light: '#474c86', dark: '#171a3a', accent: '#7f86c4' }, lane: '#5a5fb0',
    people: folk(['rebozo'], -4, ['sereno'], 6),
    props: { land: ['granary', 'palanquin'], back: ['granary', 'sacks', 'post'], mid: ['coins', 'lamp', 'post', 'sacks'], near: ['lamp', 'palanquin', 'rats', 'coins'] },
    air: { kind: 'snow', colors: ['#ffffff', '#c7c0ff'], n: 26 },
  },
  // Antes del amanecer: arrozales, la noria, el arado y las estrellas del pastor
  ox: {
    sky: ['#120c44', '#6a1f70', '#ff6c46'], glow: '#ffc27a', stars: 40,
    gradient: {
      air: '#ff7a50', dusk: '#b42470',
      ranges: [
        { top: '#4a4cc8', mid: '#b05aa0', base: '#ff8c64' },
        { top: '#5a2c9c', mid: '#b84470', base: '#ff7e56' },
        { top: '#3c2470', mid: '#8c3058', base: '#e86c40' },
      ],
    },
    rock: { ink: '#160c18', shade: '#3a2230', rock: '#6f4a48', light: '#c48f6a', rim: '#ffd9a0', moss: '#4a5a34', haze: '#8a5a52' },
    astro: { kind: 'sun', color: '#ffe0a0', shade: '#f0a050' },
    floor: { kind: 'paddy', base: '#4f7a34', light: '#9cb84a', dark: '#3a2440', accent: '#f08a70' }, lane: '#a86840',
    people: folk(['arrocera'], 0, ['campesino'], 6),
    props: { land: ['wheel', 'hut'], back: ['hut', 'hay', 'plow'], mid: ['hay', 'plow', 'oxen'], near: ['wheel', 'oxen', 'hay', 'plow'] },
    air: { kind: 'firefly', colors: ['#ffe9a0', '#ffb347'], n: 18 },
  },
  // El tigre baja del monte: bambú, la estela del rey y los tambores de guerra
  tiger: {
    sky: ['#180a34', '#942410', '#ff8c1c'], glow: '#ffc46a', stars: 0,
    gradient: {
      air: '#ff901e', dusk: '#cc2c14',
      ranges: [
        { top: '#2a6a9c', mid: '#a86a48', base: '#ffa03c' },
        { top: '#1c7a68', mid: '#987020', base: '#fc9428' },
        { top: '#0c6840', mid: '#6c5814', base: '#dc781c' },
      ],
    },
    rock: { ink: '#1a0a08', shade: '#45200f', rock: '#85491c', light: '#d08a3c', rim: '#ffd07a', moss: '#4a5a1e', haze: '#a8581e' },
    astro: { kind: 'sun', color: '#ffd88a', shade: '#ff9a3c' },
    floor: { kind: 'leaves', base: '#7a3a14', light: '#b8641c', dark: '#3c1a18', accent: '#f0a838' }, lane: '#9a5a28',
    people: folk(['guerrera'], 0, ['tecuan'], 0),
    props: { land: ['pine', 'bamboo'], back: ['bamboo', 'pine'], mid: ['bamboo', 'stele', 'banner', 'drum'], near: ['stele', 'drum', 'tigers', 'banner'] },
    air: { kind: 'leaf', colors: ['#a8c04a', '#e0a03a', '#6f8a2a'], n: 22 },
  },
  // El Conejo de Jade: la luna enorme, el osmanto y el mortero del elixir
  rabbit: {
    sky: ['#0c1048', '#3c34b8', '#b478f4'], glow: '#e0dcff', stars: 70,
    gradient: {
      air: '#a474f4', dusk: '#5428e0',
      ranges: [
        { top: '#3c7cf0', mid: '#7a7cf4', base: '#c08cfc' },
        { top: '#5a44dc', mid: '#8060e4', base: '#b07cf4' },
        { top: '#3c30a8', mid: '#6044c4', base: '#8c64dc' },
      ],
    },
    rock: { ink: '#14153a', shade: '#33356c', rock: '#6a6ca6', light: '#b9b8e6', rim: '#ffffff', moss: '#4a6a78', haze: '#7f80bc' },
    astro: { kind: 'moon', color: '#fff8e0', shade: '#d8d0e8' },
    floor: { kind: 'rings', base: '#6f70a8', light: '#a9a8d8', dark: '#43447a', accent: '#ffe9a8' }, lane: '#8484d4',
    people: folk(['tehuana'], -4, ['dama'], 6),
    props: { land: ['pavilion', 'moonGate'], back: ['osmanthus', 'pavilion', 'moonGate'], mid: ['osmanthus', 'rabbits', 'mortar'], near: ['mortar', 'rabbits', 'cakes', 'osmanthus'] },
    air: { kind: 'petal', colors: ['#ffd45e', '#ffe9a8'], n: 20 },
  },
  // Sobre el mar de nubes: la Puerta del Dragón, la perla de fuego y las carpas que saltan
  dragon: {
    sky: ['#04141f', '#0c5a64', '#4fd0ac'], glow: '#c9ffe6', stars: 20,
    gradient: {
      air: '#4fd0a8', dusk: '#08709c',
      ranges: [
        { top: '#2a74b4', mid: '#2aa0a8', base: '#6ce0b4' },
        { top: '#1c5f9a', mid: '#1a948a', base: '#5cd4a4' },
        { top: '#145a5a', mid: '#1a845c', base: '#48b886' },
      ],
    },
    rock: { ink: '#041614', shade: '#0f3a3a', rock: '#2a716a', light: '#7fc9b0', rim: '#e0fff0', moss: '#2f7a4a', haze: '#3f9a8c', fall: true },
    astro: { kind: 'sun', color: '#f0ffe0', shade: '#8fe0c0' },
    floor: { kind: 'clouds', base: '#a9dccf', light: '#e8fbf4', dark: '#6fb3a8', accent: '#ffffff' }, lane: '#c9ece2',
    banks: {
      far: { top: '#3a9a98', mid: '#267484', low: '#1a5c74' },
      near: { top: '#14466c', mid: '#0e3054', low: '#081c38' },
    },
    people: folk(['sabio'], 0, ['danzante'], 0),
    props: { land: ['gate', 'shrine'], back: ['shrine', 'column', 'pearl'], mid: ['column', 'pearl', 'carps'], near: ['carps', 'gate', 'pearl'] },
    air: { kind: 'spark', colors: ['#ffffff', '#bff2e0', '#ffe9a8'], n: 24 },
  },
  // La leyenda de la Serpiente Blanca: el lago, la pagoda, el puente y la sombrilla
  snake: {
    sky: ['#04201c', '#0f6c50', '#a8e040'], glow: '#eaffb8', stars: 0,
    gradient: {
      air: '#9cdc48', dusk: '#08885c',
      ranges: [
        { top: '#1c84c4', mid: '#34b08c', base: '#b0ec58' },
        { top: '#148468', mid: '#34a840', base: '#98e048' },
        { top: '#0c6444', mid: '#288c30', base: '#74c038' },
      ],
    },
    rock: { ink: '#08160e', shade: '#173a26', rock: '#3a6a40', light: '#8ab464', rim: '#e6ffb0', moss: '#3f7a34', haze: '#5a8f5a' },
    astro: { kind: 'sun', color: '#f6ffc8', shade: '#c0d878' },
    floor: { kind: 'lake', base: '#1f6a5c', light: '#7cc87a', dark: '#0f3c40', accent: '#ff8ab8' }, lane: '#a0703c',
    people: folk(['remero'], -3, ['sombrilla'], 4),
    props: { land: ['pagoda', 'bridge'], back: ['willow', 'pagoda', 'bridge'], mid: ['boat', 'willow', 'lotus'], near: ['lotus', 'snakes', 'boat'] },
    air: { kind: 'rain', colors: ['#d8f0d0', '#a9d0b0'], n: 34 },
  },
  // La Ruta de la Seda: cerros de colores, la Gran Muralla y las almenaras con humo
  horse: {
    sky: ['#2c1054', '#c43040', '#ff8c34'], glow: '#ffe0a0', stars: 0,
    gradient: {
      air: '#ff8c3c', dusk: '#d82c34',
      ranges: [
        { top: '#4c54d0', mid: '#b45cac', base: '#ff9c58' },
        { top: '#6430a8', mid: '#c84870', base: '#ff8c48' },
        { top: '#701c48', mid: '#c8401c', base: '#f07c2c' },
      ],
    },
    rock: { ink: '#2a0c0c', shade: '#5f1f16', rock: '#a8482a', light: '#e8935a', rim: '#ffd9a0', moss: '#5f5a2e', haze: '#c8663a', bands: ['#a8482a', '#c8743a', '#8a3226', '#d89a5a', '#7a2a28'], trees: 1 },
    astro: { kind: 'sun', color: '#fff0c0', shade: '#ffc04a' },
    floor: { kind: 'sand', base: '#a8562c', light: '#dc8f4e', dark: '#6e3018', accent: '#ffd08a' }, lane: '#c87038',
    props: { land: ['wall', 'beacon'], back: ['beacon', 'wall', 'stupa'], mid: ['banner', 'stupa', 'agaves'], near: ['horses', 'agaves', 'banner'] },
    people: folk(['caravanero'], -4, ['charro'], 6),
    air: { kind: 'dust', colors: ['#ffd9a0', '#e8a060'], n: 26 },
  },
  // Los tres soles de la buena suerte: praderas, yurtas, espigas y ciruelos
  goat: {
    sky: ['#101a74', '#2c6cdc', '#ff9cb4'], glow: '#fffbe0', stars: 0,
    gradient: {
      air: '#ff9cb8', dusk: '#3058cc',
      ranges: [
        { top: '#4c58e4', mid: '#8c84e8', base: '#ffa8c0' },
        { top: '#1c84d0', mid: '#3cb0b4', base: '#f0a8b8' },
        { top: '#0c8078', mid: '#2ca860', base: '#b0bc78' },
      ],
    },
    rock: { ink: '#1a2428', shade: '#3d5054', rock: '#748a86', light: '#b9c9b8', rim: '#ffffff', moss: '#5a7a4a', haze: '#a5b5b0' },
    astro: { kind: 'threeSuns', color: '#fffce8', shade: '#f0d890' },
    floor: { kind: 'grass', base: '#3f8a4a', light: '#7ac05a', dark: '#1f5a44', accent: '#ffb0d0' }, lane: '#8aa84a',
    props: { land: ['yurt', 'flags'], back: ['yurt', 'plum', 'fence'], mid: ['flags', 'wheat', 'plum'], near: ['goats', 'wheat', 'fence', 'plum'] },
    people: folk(['estepa'], 4, ['pastora'], -6),
    air: { kind: 'petal', colors: ['#ffc2d0', '#ffffff'], n: 22 },
  },
  // El monte de las flores y los frutos: duraznos, la cueva de la cascada y las calabazas
  monkey: {
    sky: ['#201048', '#b03c1c', '#ffb838'], glow: '#fff2c0', stars: 0,
    gradient: {
      air: '#ffb83c', dusk: '#b8304c',
      ranges: [
        { top: '#5c48c0', mid: '#c86c58', base: '#ffc050' },
        { top: '#148478', mid: '#7c9430', base: '#fcb83c' },
        { top: '#0c6c4c', mid: '#408830', base: '#d8a02c' },
      ],
    },
    rock: { ink: '#1c1006', shade: '#4a300e', rock: '#8f6a2a', light: '#d8b460', rim: '#fff0b0', moss: '#5a7a24', haze: '#b98f40', fall: true, trees: 3 },
    astro: { kind: 'sun', color: '#fff6d0', shade: '#ffd060' },
    floor: { kind: 'moss', base: '#3f7a3c', light: '#86b048', dark: '#1a4a34', accent: '#a8d048' }, lane: '#b8803c',
    people: folk(['cargador'], -4, ['frutera'], 6),
    props: { land: ['cave', 'peach'], back: ['peach', 'pine', 'cave'], mid: ['peach', 'gourd', 'scroll'], near: ['gourd', 'staff', 'monkeys', 'peach'] },
    air: { kind: 'petal', colors: ['#ffb0a8', '#ffd9c8'], n: 20 },
  },
  // El gallo llama al sol: el sol enorme, peonías, gongs y papalotes sobre las nubes
  rooster: {
    sky: ['#240a44', '#b81c48', '#ff8c3c'], glow: '#ffe0a0', stars: 0,
    gradient: {
      air: '#ff8840', dusk: '#cc1c5c',
      ranges: [
        { top: '#5c40c8', mid: '#c0488c', base: '#ff9c58' },
        { top: '#7024a0', mid: '#cc3454', base: '#ff8444' },
        { top: '#681444', mid: '#b42c34', base: '#f06c34' },
      ],
    },
    rock: { ink: '#24080f', shade: '#5a1a24', rock: '#9a3f40', light: '#e08a6a', rim: '#ffe0b0', moss: '#8a4a3a', haze: '#c45f50' },
    astro: { kind: 'sun', color: '#fff0b8', shade: '#ff9a4a' },
    floor: { kind: 'clouds', base: '#e8a894', light: '#ffe0d0', dark: '#b8686a', accent: '#fff2e0' }, lane: '#f6c8b4',
    banks: {
      far: { top: '#d4584a', mid: '#a83a50', low: '#8c2a52' },
      near: { top: '#581446', mid: '#3e0e3a', low: '#22082a' },
    },
    props: { land: ['sunGate', 'lanternTree'], back: ['peony', 'sunGate', 'lanternTree'], mid: ['gong', 'hens', 'peony'], near: ['hens', 'gong', 'peony'] },
    people: folk(['globero'], 0, ['opera'], 0),
    air: { kind: 'feather', colors: ['#ffffff', '#ffd0a0', '#ff8a5c'], n: 18 },
  },
  // El barrio chino de una ciudad mexicana, en los ochenta, de noche: donde está el bar. Puestos de tacos y
  // tortas, vochos y microbuses, neón, papel picado y la luna que se come el perro del cielo
  dog: {
    sky: ['#071528', '#17466a', '#e07c5a'], glow: '#ffb884', stars: 24,
    gradient: {
      air: '#e0785a', dusk: '#3048b8',
      ranges: [
        { top: '#3a64a8', mid: '#94648c', base: '#ec9068' },
        { top: '#34507c', mid: '#7a5878', base: '#d87a58' },
        { top: '#2c4668', mid: '#60486a', base: '#b8644e' },
      ],
    },
    rock: { ink: '#0c1420', shade: '#22303f', rock: '#46586a', light: '#a89a8c', rim: '#ffd9b4', moss: '#35524c', haze: '#7a6a70' },
    astro: { kind: 'eclipse', color: '#ffe6b0', shade: '#e0a070' },
    floor: { kind: 'street', base: '#3c4152', light: '#7a7c8c', dark: '#262a38', accent: '#d8b04a' }, lane: '#8a84a4',
    city: true,
    mountains: [{ s: 0.06, every: 72, skip: 0.2 }, { s: 0.13, every: 86, skip: 0.06 }, { s: 0.24, every: 104, skip: 0.12 }],
    every: { land: 132, back: 150, near: 250 },
    people: [
      { s: 0.45, every: 130, v: -5, names: ['poblana', 'walkman', 'qipao'] },
      { s: 0.66, every: 620, v: 0, names: ['maestro'] },
      { s: 0.69, every: 300, v: 7, names: ['punk', 'aerobics', 'nino'] },
      { s: 0.71, every: 430, v: -6, names: ['walkman', 'poblana'] },
    ],
    traffic: [
      { s: 0.53, every: 190, v: -30, names: ['micro', 'vocho', 'pickup'] },
      { s: 0.6, every: 230, v: 22, names: ['sedan', 'combi', 'vocho'] },
    ],
    props: { land: ['bar', 'vecindad', 'herbolaria', 'arco', 'maquinitas'], back: ['tacos', 'phone', 'tortas', 'hedge'], mid: [], near: ['lamp', 'esquites', 'dogs', 'picado', 'arcade'] },
    air: { kind: 'firefly', colors: ['#ff9ac0', '#8fe6ee', '#ffe0a0'], n: 10 },
  },
  // La víspera de año nuevo: fuegos artificiales, lingotes, cohetes y el árbol del dinero
  pig: {
    sky: ['#140838', '#6c1c8c', '#ff5c94'], glow: '#ffc0c8', stars: 40,
    gradient: {
      air: '#ff6498', dusk: '#a818b0',
      ranges: [
        { top: '#3c50e0', mid: '#a85cd0', base: '#ff80a8' },
        { top: '#5c2cb8', mid: '#b83cac', base: '#fc6ca0' },
        { top: '#481c84', mid: '#942c8c', base: '#d8548c' },
      ],
    },
    rock: { ink: '#150a20', shade: '#3a1c48', rock: '#743f74', light: '#c880a8', rim: '#ffd0e0', moss: '#5a4a6a', haze: '#96548a' },
    astro: { kind: 'moon', color: '#ffe6ec', shade: '#e0a0c0' },
    floor: { kind: 'plaza', base: '#5a1f3c', light: '#963a56', dark: '#331026', accent: '#e8b84a' }, lane: '#c03a54',
    people: folk(['mariachi'], 0, ['festejo'], 6),
    props: { land: ['arch', 'moneyTree'], back: ['arch', 'jars', 'moneyTree'], mid: ['crackers', 'drum', 'moneyTree'], near: ['ingots', 'pigs', 'drum', 'crackers'] },
    air: { kind: 'fireworks', colors: ['#ffd45e', '#ff6a8a', '#8fe0ff', '#b8ff9a'], n: 16 },
  },
};

// A qué distancia va cada cosa (s: cuánto se mueve respecto al camino, que es 1), su tamaño y cada cuántos
// pixeles sale una
export const DEPTHS = {
  sky: { s: 0.03, every: 120 },
  // Las cordilleras dejan aire entre sus montañas (skip: cuántas faltan)
  mountains: [{ s: 0.06, every: 66, skip: 0.22 }, { s: 0.13, every: 116, skip: 0.32 }, { s: 0.24, every: 210, skip: 0.34 }],
  land: { s: 0.34, size: 1.25, every: 380 },
  // Todo queda bien atrás del camino (s menor que 0.75) para que no se confunda con los obstáculos
  back: { s: 0.43, size: 0.54, every: 150 },
  mid: { s: 0.57, size: 0.72, every: 200 },
  near: { s: 0.73, size: 0.9, every: 290 },
};

// Las filas de nubes del fondo en los mundos sin suelo: a qué distancia, su tamaño, cada cuántos pixeles sale una y
// cuánto más abajo de su distancia se apoya (drop). Entre más cerca, más oscuras: así se ve cuál está lejos y resalta
// la de tormenta, la única que no se debe tocar, que va en el plano del juego (graphics/floors.js, makeStorm)
export const BANKS = [
  { s: 0.1, size: 0.5, every: 46, drop: 4 },
  { s: 0.17, size: 0.6, every: 54, drop: 6 },
  { s: 0.26, size: 0.74, every: 68, drop: 8 },
  { s: 0.38, size: 0.88, every: 82, drop: 11 },
  { s: 0.54, size: 1.02, every: 98, drop: 16 },
];

// Dónde está el sol o la luna y su radio, en todos los mundos (pixeles del juego; en la vista alta, más abajo)
export const ASTRO = { x: 256, y: 42, r: 26 };

/** El tamaño de la gente y los autos a una distancia. */
export const sizeAt = (s) => 1.24 * s;

// El horizonte (y), qué tan abajo de él está el camino y el centro de la vista (pixeles del juego)
export const HORIZON = { y: 85, lane: 40, center: 200 };
