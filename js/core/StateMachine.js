// Máquina de estados mínima. Cada estado es un objeto con enter/update/exit opcionales,
// que se ejecutan con `this` apuntando al dueño (Game, Dragon...).

export class StateMachine {
  constructor(owner, states, initial = null) {
    this.owner = owner;
    this.states = states;
    this.name = null;
    this.current = null;
    this.time = 0;
    if (initial) this.set(initial);
  }

  set(name, ...args) {
    const next = this.states[name];
    if (!next) throw new Error(`Estado desconocido: ${name}`);
    const previous = this.name;
    this.current?.exit?.call(this.owner, name);
    this.name = name;
    this.current = next;
    this.time = 0;
    next.enter?.call(this.owner, previous, ...args);
  }

  update(dt) {
    this.time += dt;
    this.current?.update?.call(this.owner, dt, this.time);
  }

  is(...names) {
    return names.includes(this.name);
  }
}
