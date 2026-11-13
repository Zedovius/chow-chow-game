// Bucle con paso de simulación fijo: la física se comporta igual a 60 Hz o a 144 Hz.
// Un error en un cuadro no lo detiene: el siguiente cuadro ya está pedido, y el error pasa a
// onError (Game decide qué hacer; ver Game.recover).

export class Loop {
  constructor(update, render, { step = 1 / 60, onError = (error) => console.error(error) } = {}) {
    this.update = update;
    this.render = render;
    this.step = step;
    this.onError = onError;
    this.running = false;
    this.accumulator = 0;
    this.last = 0;
    this.frame = this.frame.bind(this);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.accumulator = 0;
    requestAnimationFrame(this.frame);
  }

  stop() {
    this.running = false;
  }

  frame(now) {
    if (!this.running) return;
    requestAnimationFrame(this.frame);
    // Si la pestaña estuvo en segundo plano, no intentamos "ponernos al día".
    const dt = Math.min((now - this.last) / 1000, 0.25);
    this.last = now;
    this.accumulator += dt;
    try {
      while (this.accumulator >= this.step) {
        this.accumulator -= this.step;
        this.update(this.step);
      }
      this.render(this.accumulator / this.step);
    } catch (error) {
      this.accumulator = 0; // no repetir los pasos que faltaban: el error volvería a saltar
      this.onError(error);
    }
  }
}
