// Lo escribe tools/sprites/animales.mjs (npm run animales): dónde está cada pieza en las hojas de los
// animales, en pixeles. De cada pieza: y, dónde empieza en su hoja; w y h, lo que mide un cuadro; ax y ay,
// dónde queda su punto (los pies); depth: hay 2 · depth + 1 capas, una debajo de otra; frames: cuántos
// cuadros. anims: [primer cuadro, cuántos]. stride: cuánto avanza en un ciclo de la carrera.

export const ANIMAL_ART = {
  rat: {
    src: 'assets/images/animales/rat.png',
    pieces: {
      body: {
        y: 0,
        w: 36,
        h: 18,
        ax: 24,
        ay: 16,
        depth: 4,
        frames: 42
      }
    },
    mouth: [8, 5],
    anims: {
      run: [0, 12],
      idle: [12, 6],
      jump: [18, 3],
      fall: [21, 2],
      duck: [23, 8],
      ride: [31, 6],
      press: [37, 3],
      hurt: [40, 1],
      dead: [41, 1]
    },
    stride: 18,
    portrait: 'assets/images/animales/rat-retrato.png'
  },
  ox: {
    src: 'assets/images/animales/ox.png',
    pieces: {
      body: {
        y: 0,
        w: 35,
        h: 29,
        ax: 20,
        ay: 25,
        depth: 5,
        frames: 42
      }
    },
    mouth: [12, 8],
    anims: {
      run: [0, 12],
      idle: [12, 6],
      jump: [18, 3],
      fall: [21, 2],
      duck: [23, 8],
      ride: [31, 6],
      press: [37, 3],
      hurt: [40, 1],
      dead: [41, 1]
    },
    stride: 30,
    portrait: 'assets/images/animales/ox-retrato.png'
  },
  tiger: {
    src: 'assets/images/animales/tiger.png',
    pieces: {
      body: {
        y: 0,
        w: 42,
        h: 28,
        ax: 28,
        ay: 25,
        depth: 5,
        frames: 42
      }
    },
    mouth: [8, 9],
    anims: {
      run: [0, 12],
      idle: [12, 6],
      jump: [18, 3],
      fall: [21, 2],
      duck: [23, 8],
      ride: [31, 6],
      press: [37, 3],
      hurt: [40, 1],
      dead: [41, 1]
    },
    stride: 48,
    portrait: 'assets/images/animales/tiger-retrato.png'
  },
  rabbit: {
    src: 'assets/images/animales/rabbit.png',
    pieces: {
      body: {
        y: 0,
        w: 23,
        h: 25,
        ax: 14,
        ay: 23,
        depth: 5,
        frames: 42
      }
    },
    mouth: [7, 10],
    anims: {
      run: [0, 12],
      idle: [12, 6],
      jump: [18, 3],
      fall: [21, 2],
      duck: [23, 8],
      ride: [31, 6],
      press: [37, 3],
      hurt: [40, 1],
      dead: [41, 1]
    },
    stride: 40,
    portrait: 'assets/images/animales/rabbit-retrato.png'
  },
  horse: {
    src: 'assets/images/animales/horse.png',
    pieces: {
      body: {
        y: 0,
        w: 40,
        h: 32,
        ax: 26,
        ay: 28,
        depth: 4,
        frames: 42
      }
    },
    mouth: [13, 17],
    anims: {
      run: [0, 12],
      idle: [12, 6],
      jump: [18, 3],
      fall: [21, 2],
      duck: [23, 8],
      ride: [31, 6],
      press: [37, 3],
      hurt: [40, 1],
      dead: [41, 1]
    },
    stride: 46,
    portrait: 'assets/images/animales/horse-retrato.png'
  },
  goat: {
    src: 'assets/images/animales/goat.png',
    pieces: {
      body: {
        y: 0,
        w: 28,
        h: 29,
        ax: 17,
        ay: 26,
        depth: 4,
        frames: 42
      }
    },
    mouth: [9, 15],
    anims: {
      run: [0, 12],
      idle: [12, 6],
      jump: [18, 3],
      fall: [21, 2],
      duck: [23, 8],
      ride: [31, 6],
      press: [37, 3],
      hurt: [40, 1],
      dead: [41, 1]
    },
    stride: 34,
    portrait: 'assets/images/animales/goat-retrato.png'
  },
  monkey: {
    src: 'assets/images/animales/monkey.png',
    pieces: {
      body: {
        y: 0,
        w: 30,
        h: 24,
        ax: 20,
        ay: 21,
        depth: 4,
        frames: 42
      }
    },
    mouth: [8, 12],
    anims: {
      run: [0, 12],
      idle: [12, 6],
      jump: [18, 3],
      fall: [21, 2],
      duck: [23, 8],
      ride: [31, 6],
      press: [37, 3],
      hurt: [40, 1],
      dead: [41, 1]
    },
    stride: 34,
    portrait: 'assets/images/animales/monkey-retrato.png'
  },
  dog: {
    src: 'assets/images/animales/dog.png',
    pieces: {
      body: {
        y: 0,
        w: 27,
        h: 24,
        ax: 16,
        ay: 21,
        depth: 4,
        frames: 42
      }
    },
    mouth: [8, 10],
    anims: {
      run: [0, 12],
      idle: [12, 6],
      jump: [18, 3],
      fall: [21, 2],
      duck: [23, 8],
      ride: [31, 6],
      press: [37, 3],
      hurt: [40, 1],
      dead: [41, 1]
    },
    stride: 36,
    portrait: 'assets/images/animales/dog-retrato.png'
  },
  pig: {
    src: 'assets/images/animales/pig.png',
    pieces: {
      body: {
        y: 0,
        w: 28,
        h: 20,
        ax: 16,
        ay: 18,
        depth: 4,
        frames: 42
      }
    },
    mouth: [9, 7],
    anims: {
      run: [0, 12],
      idle: [12, 6],
      jump: [18, 3],
      fall: [21, 2],
      duck: [23, 8],
      ride: [31, 6],
      press: [37, 3],
      hurt: [40, 1],
      dead: [41, 1]
    },
    stride: 19,
    portrait: 'assets/images/animales/pig-retrato.png'
  },
  rooster: {
    src: 'assets/images/animales/rooster.png',
    pieces: {
      body: {
        y: 0,
        w: 28,
        h: 29,
        ax: 16,
        ay: 27,
        depth: 7,
        frames: 45
      }
    },
    mouth: [8, 17],
    anims: {
      run: [0, 12],
      idle: [12, 6],
      jump: [18, 3],
      fall: [21, 2],
      duck: [23, 8],
      ride: [31, 4],
      press: [35, 8],
      hurt: [43, 1],
      dead: [44, 1]
    },
    stride: 27,
    wings: true,
    portrait: 'assets/images/animales/rooster-retrato.png'
  },
  dragon: {
    src: 'assets/images/animales/dragon.png',
    pieces: {
      head: {
        y: 0,
        w: 19,
        h: 18,
        ax: 11,
        ay: 10,
        depth: 3,
        frames: 35
      },
      spine: {
        y: 126,
        w: 10,
        h: 10,
        ax: 5,
        ay: 6,
        depth: 3,
        frames: 294
      },
      legFn: {
        y: 196,
        w: 16,
        h: 13,
        ax: 7,
        ay: 4,
        depth: 1,
        frames: 24
      },
      legFf: {
        y: 235,
        w: 16,
        h: 13,
        ax: 7,
        ay: 4,
        depth: 1,
        frames: 24
      },
      legHn: {
        y: 274,
        w: 17,
        h: 14,
        ax: 8,
        ay: 5,
        depth: 1,
        frames: 24
      },
      legHf: {
        y: 316,
        w: 17,
        h: 14,
        ax: 8,
        ay: 5,
        depth: 1,
        frames: 24
      },
      wingN: {
        y: 358,
        w: 14,
        h: 33,
        ax: 12,
        ay: 20,
        depth: 5,
        frames: 13
      },
      wingF: {
        y: 721,
        w: 14,
        h: 33,
        ax: 12,
        ay: 20,
        depth: 5,
        frames: 13
      },
      tail: {
        y: 1084,
        w: 9,
        h: 13,
        ax: 7,
        ay: 6,
        depth: 1,
        frames: 28
      }
    },
    mouth: [9, 11],
    long: 'dragon',
    radii: [3.6, 3.5, 3.2, 2.9, 2.5, 2, 1.5],
    turns: [-0.7, -0.35, 0, 0.35, 0.7],
    angles: [-1.2, -0.8, -0.4, 0, 0.4, 0.8, 1.2],
    patterns: 6,
    legs: {
      run: [0, 12],
      air: [12, 6],
      duck: [18, 6]
    },
    legLift: 9.2,
    stride: 26,
    wings: true,
    flap: 8,
    glide: 4,
    portrait: 'assets/images/animales/dragon-retrato.png'
  },
  snake: {
    src: 'assets/images/animales/snake.png',
    pieces: {
      head: {
        y: 0,
        w: 15,
        h: 16,
        ax: 4,
        ay: 7,
        depth: 3,
        frames: 20
      },
      spine: {
        y: 112,
        w: 6,
        h: 6,
        ax: 3,
        ay: 3,
        depth: 3,
        frames: 245
      },
      coil: {
        y: 154,
        w: 29,
        h: 18,
        ax: 11,
        ay: 18,
        depth: 6,
        frames: 9
      }
    },
    mouth: [8, 8],
    long: 'snake',
    radii: [3.2, 3, 2.7, 2.4, 2, 1.5, 1],
    turns: [-0.7, -0.35, 0, 0.35, 0.7],
    angles: [-1.2, -0.8, -0.4, 0, 0.4, 0.8, 1.2],
    patterns: 5,
    skin: 4,
    stride: 24,
    portrait: 'assets/images/animales/snake-retrato.png'
  },
  cloud: {
    src: 'assets/images/animales/cloud.png',
    pieces: {
      cloud: {
        y: 0,
        w: 28,
        h: 10,
        ax: 15,
        ay: 3,
        depth: 7,
        frames: 9
      },
      wisp: {
        y: 150,
        w: 9,
        h: 6,
        ax: 5,
        ay: 3,
        depth: 2,
        frames: 6
      }
    }
  }
};
