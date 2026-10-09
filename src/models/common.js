// Shared helpers for model definitions.
//
// A model is { id, name, category, subtitle, explodeScale?, build() -> parts }.
// A part is { name, desc, color, shapes[], explode?, spread?, density? }.
//   explode  - offset applied (scaled by the exploded-view amount); defaults to
//              the direction from the model centre to the part centre.
//   spread   - extra radial push away from the part's own centre when exploded.
//   density  - particle budget multiplier (skins / shells use < 1).

export function part(name, desc, color, shapes, opts = {}) {
  return { name, desc, color, shapes: Array.isArray(shapes) ? shapes.flat(Infinity) : [shapes], ...opts };
}

export function hex(color) {
  const n = parseInt(color.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export const range = (n, fn) => Array.from({ length: n }, (_, i) => fn(i));
