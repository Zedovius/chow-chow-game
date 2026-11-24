// Lo escribe tools/sprites/jefes.mjs (npm run jefes): las medidas de los sprites de los jefes, en pixeles
// del juego. Un cuerpo con cuadros y un brazo en varios ángulos (armFrom: en alto; armTo: caído).
// center: el centro de su caja de choque; eye, mouth, shoulder, weak: dónde están en el cuerpo. layers,
// armLayers: las capas de profundidad, de atrás hacia adelante, una debajo de otra en su imagen.

export const BOSS_ART = {
  rat: {
    body: 'assets/images/jefes/rata.png',
    arm: 'assets/images/jefes/rata-brazo.png',
    coin: 'assets/images/jefes/rata-moneda.png',
    layers: 9,
    armLayers: 3,
    w: 58,
    h: 66,
    frames: 8,
    fps: 8,
    center: [28, 37],
    eye: [20, 20],
    mouth: [16, 25],
    shoulder: [32, 39],
    weak: [21, 37],
    armSize: 58,
    armFrames: 21,
    armFrom: -100,
    armTo: 60
  }
};
