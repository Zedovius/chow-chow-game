// Colisiones por cajas alineadas a los ejes (AABB). Cada entidad puede tener varias cajas
// (por ejemplo, cabeza y cuerpo) para que los choques se sientan justos.

export function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function anyOverlap(boxesA, boxesB) {
  for (const a of boxesA) {
    for (const b of boxesB) {
      if (overlaps(a, b)) return true;
    }
  }
  return false;
}
