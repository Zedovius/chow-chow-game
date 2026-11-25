// Los obstáculos de cada mundo: salen de sus propios objetos, traídos al frente, a todo color. Los del mismo tipo
// (world/obstacles.js) miden y se esquivan igual en todos los mundos: cambia con qué están hechos. Los hornea
// obstaculos.mjs, con el mismo acabado y los mismos valores que los animales. Lo que un mundo no tiene, sale del
// juego común.
//
// Cada tipo tiene una o varias pieles, y cada piel, sus cuadros. Miden un poco más que su caja de choque, siempre
// a favor de quien juega. Ninguno se parece a lo que se recoge: ni cofres, ni comida, ni bebida, ni monedas.

import { horse } from './obstaculosCaballo.mjs';
import { ox, rabbit, rat, snake, tiger } from './obstaculosMundos1.mjs';
import { dog, dragon, goat, monkey, pig, rooster } from './obstaculosMundos2.mjs';

export const WORLDS = { rat, ox, tiger, rabbit, dragon, snake, horse, goat, monkey, rooster, dog, pig };
