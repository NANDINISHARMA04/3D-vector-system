import { group, mulberry32 } from '../shapes.js';
import { hex } from './common.js';
import wonders from './wonders.js';
import anatomy from './anatomy.js';
import biology from './biology.js';
import engines from './engines.js';
import vehicles from './vehicles.js';
import machines from './machines.js';

export const MODELS = [...wonders, ...anatomy, ...biology, ...engines, ...vehicles, ...machines];
export const CATEGORIES = ['Wonders', 'Anatomy', 'Biology', 'Engines', 'Vehicles', 'Machines'];

export const findModel = (id) => MODELS.find((m) => m.id === id);

const FIT = 2.4; // largest dimension of a formed model, in world units

/**
 * Samples a model into `count` particles.
 * Returns typed arrays ready for the GPU plus per-part metadata for labels/picking.
 */
export function sampleModel(model, count, seed = 1) {
  const rand = mulberry32(seed);
  const parts = model.build();
  const shapes = parts.map((p) => group(p.shapes));
  const weights = parts.map((p, i) => Math.pow(shapes[i].area, 0.75) * (p.density ?? 1));
  const total = weights.reduce((a, b) => a + b, 0);
  const minCount = Math.max(40, Math.floor(count * 0.006));
  const counts = weights.map((w) => Math.max(minCount, Math.floor((w / total) * count)));
  // Fix rounding so counts sum exactly to `count`.
  let diff = count - counts.reduce((a, b) => a + b, 0);
  while (diff !== 0) {
    const i = counts.indexOf(Math.max(...counts));
    const step = Math.sign(diff) * Math.min(Math.abs(diff), Math.floor(counts[i] / 2));
    counts[i] += step;
    diff -= step;
  }

  const pos = new Float32Array(count * 3);
  const exp = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const partIds = new Float32Array(count);
  const meta = [];

  let o = 0;
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  parts.forEach((p, pi) => {
    const start = o;
    const c = [0, 0, 0];
    for (let k = 0; k < counts[pi]; k++, o++) {
      const v = shapes[pi].sample(rand);
      for (let a = 0; a < 3; a++) {
        pos[o * 3 + a] = v[a];
        c[a] += v[a];
        if (v[a] < min[a]) min[a] = v[a];
        if (v[a] > max[a]) max[a] = v[a];
      }
      partIds[o] = pi;
    }
    meta.push({ start, count: counts[pi], centroid: c.map((x) => x / counts[pi]) });
  });

  const center = [0, 1, 2].map((a) => (min[a] + max[a]) / 2);
  const extent = Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]) || 1;
  const s = FIT / extent;
  const scaleK = model.explodeScale ?? 0.9;

  const partInfo = parts.map((p, pi) => {
    const { start, count: n, centroid } = meta[pi];
    const ex = p.explode ?? centroid.map((x, a) => (x - center[a]) * scaleK);
    const spread = p.spread ?? 0;
    const rgb = hex(p.color);
    // Anchor: the particle nearest the centroid (always lies on the part).
    let best = start;
    let bestD = Infinity;
    for (let k = start; k < start + n; k++) {
      const d = (pos[k * 3] - centroid[0]) ** 2 + (pos[k * 3 + 1] - centroid[1]) ** 2 + (pos[k * 3 + 2] - centroid[2]) ** 2;
      if (d < bestD) {
        bestD = d;
        best = k;
      }
    }
    const anchorRaw = [pos[best * 3], pos[best * 3 + 1], pos[best * 3 + 2]];
    for (let k = start; k < start + n; k++) {
      const shade = 0.78 + rand() * 0.44;
      for (let a = 0; a < 3; a++) {
        const v = pos[k * 3 + a];
        exp[k * 3 + a] = (ex[a] + (v - centroid[a]) * spread) * s;
        pos[k * 3 + a] = (v - center[a]) * s;
        col[k * 3 + a] = Math.min(1, rgb[a] * shade);
      }
    }
    return {
      index: pi,
      name: p.name,
      desc: p.desc,
      color: p.color,
      count: n,
      anchor: anchorRaw.map((v, a) => (v - center[a]) * s),
      explode: anchorRaw.map((v, a) => (ex[a] + (v - centroid[a]) * spread) * s),
    };
  });

  // Bounds when assembled (b0) and fully exploded (b1), for label placement.
  const b0 = [[Infinity, Infinity, Infinity], [-Infinity, -Infinity, -Infinity]];
  const b1 = [[Infinity, Infinity, Infinity], [-Infinity, -Infinity, -Infinity]];
  for (let k = 0; k < count; k++) {
    for (let a = 0; a < 3; a++) {
      const v = pos[k * 3 + a];
      const e = v + exp[k * 3 + a];
      b0[0][a] = Math.min(b0[0][a], v);
      b0[1][a] = Math.max(b0[1][a], v);
      b1[0][a] = Math.min(b1[0][a], e);
      b1[1][a] = Math.max(b1[1][a], e);
    }
  }

  return { positions: pos, explode: exp, colors: col, partIds, parts: partInfo, count, bounds: [b0, b1] };
}
