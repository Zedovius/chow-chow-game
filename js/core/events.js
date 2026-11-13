// Avisos del juego: Game cuenta lo que pasa (un aleteo, un golpe, una perla, un nivel nuevo...) y
// quien quiera escucha, sin que Game sepa quién. Así el sonido, la música o los efectos visuales se
// conectan desde main.js sin tocar la lógica.
//
// Los avisos que manda Game (con sus datos):
//   title                                       se volvió a la pantalla de inicio
//   start      { difficulty }                   empezó una partida
//   levelStart { index, id, continued, flight } empezó un nivel (continued: viene del anterior;
//                                               flight: en este se puede volar)
//   jump                                        saltó desde el suelo
//   flap                                        aleteó en el aire (niveles de vuelo)
//   land                                        tocó el suelo después de saltar o volar
//   fire       { ammo }                         lanzó una bola de fuego (ammo: las que quedan)
//   fireEmpty                                   quiso lanzar una, pero no quedan
//   burn       { kind, x, y }                   una bola de fuego quemó un obstáculo
//   fizzle     { kind, x, y }                   una bola de fuego se apagó contra un muro
//   cocktail   { variety, ammo }                tomó un cóctel (recarga las bolas de fuego)
//   pearl      { lives }                        tomó la perla del nivel
//   heartGained { lives }                       en difícil, las perlas completaron un corazón
//   hit        { lives }                        chocó con un obstáculo y perdió un corazón
//   closeCall                                   se arriesgó (puntos sin aviso)
//   milestone  { score }                        el puntaje llegó a otra centena
//   newRecord  { score }                        se superó el récord en esta partida
//   levelComplete { index, id, hearts }         terminó un nivel (hearts: los que se cobraron)
//   dying                                       se quedó sin corazones y cae
//   gameOver                                    el diálogo de fin del vuelo
//   ending     { score }                        terminó los 12 niveles
//   pause / resume                              pausa y regreso al juego
//   toggleMute                                  la tecla M

export class Events {
  constructor() {
    this.listeners = new Map();
  }

  /** Escucha un aviso; devuelve una función para dejar de escucharlo. */
  on(name, listener) {
    if (!this.listeners.has(name)) this.listeners.set(name, new Set());
    this.listeners.get(name).add(listener);
    return () => this.off(name, listener);
  }

  off(name, listener) {
    this.listeners.get(name)?.delete(listener);
  }

  /** Un error en quien escucha (el sonido, por ejemplo) nunca detiene el juego. */
  emit(name, data = {}) {
    const listeners = this.listeners.get(name);
    if (!listeners) return;
    for (const listener of [...listeners]) {
      try {
        listener(data);
      } catch (error) {
        console.error(`[Chow Chow] Error al atender el aviso «${name}».`, error);
      }
    }
  }
}
