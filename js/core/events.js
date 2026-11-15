// Avisos del juego: Game cuenta lo que pasa (un aleteo, un golpe, un cóctel, un nivel nuevo...) y
// quien quiera escucha, sin que Game sepa quién. Así el sonido, la música o los efectos visuales se
// conectan desde main.js sin tocar la lógica.
//
// Los avisos que manda Game (con sus datos):
//   title                                       se volvió a la pantalla de inicio
//   start      { difficulty, sign }             empezó una partida (sign: el animal de quien juega)
//   levelStart { index, id, continued, ground } empezó un nivel (continued: viene del anterior;
//                                               ground: false si es de puro cielo)
//   jump                                        saltó desde el suelo
//   flap                                        aleteó en el aire
//   flightGained                                tomó la estrella: puede volar
//   flightLost                                  un golpe le quitó el poder de volar
//   land                                        tocó el suelo después de saltar o volar
//   bump                                        sin suelo: tocó las nubes de abajo y rebotó
//   fire       { ammo }                         lanzó una bola de fuego (ammo: las que quedan)
//   fireEmpty                                   quiso lanzar una, pero no quedan
//   chargeReady                                 el disparo especial ya está cargado (botón mantenido)
//   fireSpecial { ammo }                        lanzó el disparo especial
//   burn       { kind, x, y }                   una bola de fuego quemó un obstáculo
//   fizzle     { kind, x, y }                   una bola de fuego se apagó contra un muro
//   cocktail   { variety, ammo }                tomó un cóctel (recarga las bolas de fuego)
//   food       { variety, healed, lives }       tomó comida (healed: le dio un corazón; si no, puntos)
//   hit        { lives }                        chocó con un obstáculo y perdió un corazón
//   closeCall                                   se arriesgó (puntos sin aviso)
//   comboUp    { multiplier }                   la racha subió el multiplicador de puntos
//   comboLost                                   un golpe acabó con la racha
//   section    { name }                         el nivel pasó a otro tramo ('calm', 'ground', 'sky',
//                                               'mixed', 'rush': la racha final)
//   thunder                                     una nube de tormenta soltó un rayo en pantalla
//   milestone  { score }                        el puntaje llegó a otra centena
//   newRecord  { score }                        se superó el récord en esta partida
//   levelComplete { index, id, hearts }         terminó un nivel (hearts: los que se cobraron)
//   bossStart  { sign }                         empezó el nivel 13: la pelea contra el rival
//   bossWarn   { attack }                       el jefe avisa un ataque ('volley', 'aimed', 'charge')
//   bossAttack { attack }                       el jefe ataca
//   bossHit    { hp, max }                      una bola de fuego le pegó al jefe
//   bossDefeated { sign }                       el jefe fue vencido
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
