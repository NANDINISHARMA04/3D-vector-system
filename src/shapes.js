// Procedural surface samplers. Every shape is { area, sample(rand) -> [x,y,z] }.
// Models are composed from these primitives and sampled into particle clouds.

import { v3 } from './math.js';

const TAU = Math.PI * 2;

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function gauss(rand) {
  const u = Math.max(1e-9, rand());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * rand());
}

function unitVec(rand) {
  const z = rand() * 2 - 1;
  const t = rand() * TAU;
  const s = Math.sqrt(1 - z * z);
  return [s * Math.cos(t), z, s * Math.sin(t)];
}

// Two unit vectors perpendicular to `axis`.
export function basis(axis) {
  const n = v3.norm(axis);
  const ref = Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const u = v3.norm(v3.cross(ref, n));
  const w = v3.cross(n, u);
  return [n, u, w];
}

const AXES = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };
const axisOf = (a) => (typeof a === 'string' ? AXES[a] : a);

// Picks an index in a cumulative table with a uniform value in [0, total).
function pick(cum, value) {
  let lo = 0;
  let hi = cum.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] < value) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

// Restrict any shape to the region where `where(p)` is true (rejection sampling).
function restrict(shape, where, seedRand) {
  if (!where) return shape;
  let hits = 0;
  for (let i = 0; i < 400; i++) if (where(shape.sample(seedRand))) hits++;
  const ratio = Math.max(hits / 400, 0.01);
  return {
    area: shape.area * ratio,
    sample(rand) {
      let p = shape.sample(rand);
      for (let i = 0; i < 40 && !where(p); i++) p = shape.sample(rand);
      return p;
    },
  };
}

const probe = mulberry32(99);

export function ellipsoid(c, r, { solid = false, where, wrinkle = 0 } = {}) {
  const [a, b, d] = Array.isArray(r) ? r : [r, r, r];
  const p = 1.6;
  const area = 4 * Math.PI * Math.pow((Math.pow(a * b, p) + Math.pow(a * d, p) + Math.pow(b * d, p)) / 3, 1 / p);
  const shape = {
    area: solid ? area * 0.6 : area,
    sample(rand) {
      const u = unitVec(rand);
      let k = solid ? Math.cbrt(rand()) : 1;
      if (wrinkle) {
        k *= 1 + wrinkle * Math.sin(u[0] * 23 + Math.sin(u[1] * 17) * 2) * Math.sin(u[1] * 21 + u[2] * 13);
      }
      return [c[0] + u[0] * a * k, c[1] + u[1] * b * k, c[2] + u[2] * d * k];
    },
  };
  return restrict(shape, where, probe);
}

export const sphere = (c, r, opts) => ellipsoid(c, [r, r, r], opts);

// Truncated cone / cylinder between two points.
export function tube(a, b, r0, r1 = r0, { caps = false, solid = false } = {}) {
  const axis = v3.sub(b, a);
  const h = v3.len(axis);
  const [, u, w] = basis(axis);
  const side = Math.PI * (r0 + r1) * Math.hypot(h, r1 - r0);
  const capA = caps ? Math.PI * r0 * r0 : 0;
  const capB = caps ? Math.PI * r1 * r1 : 0;
  const total = side + capA + capB;
  return {
    area: total,
    sample(rand) {
      const sel = rand() * total;
      const ang = rand() * TAU;
      const cu = Math.cos(ang);
      const cw = Math.sin(ang);
      let t;
      let rad;
      if (sel < side) {
        t = rand();
        rad = (r0 + (r1 - r0) * t) * (solid ? Math.sqrt(rand()) : 1);
      } else if (sel < side + capA) {
        t = 0;
        rad = r0 * Math.sqrt(rand());
      } else {
        t = 1;
        rad = r1 * Math.sqrt(rand());
      }
      return [
        a[0] + axis[0] * t + (u[0] * cu + w[0] * cw) * rad,
        a[1] + axis[1] * t + (u[1] * cu + w[1] * cw) * rad,
        a[2] + axis[2] * t + (u[2] * cu + w[2] * cw) * rad,
      ];
    },
  };
}

function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  return [0, 1, 2].map(
    (i) =>
      0.5 *
      (2 * p1[i] + (-p0[i] + p2[i]) * t + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * t2 +
        (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * t3),
  );
}

// Smooth tube along a Catmull-Rom spline through `points`. r may taper to r1.
export function curve(points, r, { closed = false, r1 = r, steps = 24 } = {}) {
  const pts = points;
  const n = pts.length;
  const segs = closed ? n : n - 1;
  const poly = [];
  for (let s = 0; s < segs; s++) {
    const p0 = pts[closed ? (s - 1 + n) % n : Math.max(s - 1, 0)];
    const p1 = pts[s];
    const p2 = pts[(s + 1) % n];
    const p3 = pts[closed ? (s + 2) % n : Math.min(s + 2, n - 1)];
    for (let i = 0; i < steps; i++) poly.push(catmull(p0, p1, p2, p3, i / steps));
  }
  poly.push(closed ? poly[0] : pts[n - 1]);
  const cum = [];
  const frames = [];
  let total = 0;
  for (let i = 0; i < poly.length - 1; i++) {
    const d = v3.sub(poly[i + 1], poly[i]);
    const len = v3.len(d);
    const t = i / (poly.length - 1);
    total += len * Math.PI * 2 * (r + (r1 - r) * t);
    cum.push(total);
    frames.push(basis(d.some((x) => x !== 0) ? d : [0, 1, 0]));
  }
  return {
    area: total,
    sample(rand) {
      const i = pick(cum, rand() * total);
      const f = rand();
      const p = v3.lerp(poly[i], poly[i + 1], f);
      const [, u, w] = frames[i];
      const t = (i + f) / (poly.length - 1);
      const rad = r + (r1 - r) * t;
      const ang = rand() * TAU;
      const cu = Math.cos(ang) * rad;
      const cw = Math.sin(ang) * rad;
      return [p[0] + u[0] * cu + w[0] * cw, p[1] + u[1] * cu + w[1] * cw, p[2] + u[2] * cu + w[2] * cw];
    },
  };
}

// Surface of revolution: radius(t) for t in [0,1] along `axis` from c, length h.
export function revolve(c, axis, h, radius, { steps = 64, where } = {}) {
  const [n, u, w] = basis(axisOf(axis));
  const cum = [];
  let total = 0;
  for (let i = 0; i < steps; i++) {
    const ra = radius(i / steps);
    const rb = radius((i + 1) / steps);
    total += Math.PI * (ra + rb) * Math.hypot(h / steps, rb - ra) + 1e-6;
    cum.push(total);
  }
  const shape = {
    area: total,
    sample(rand) {
      const i = pick(cum, rand() * total);
      const t = (i + rand()) / steps;
      const rad = radius(t);
      const ang = rand() * TAU;
      const cu = Math.cos(ang) * rad;
      const cw = Math.sin(ang) * rad;
      return [
        c[0] + n[0] * h * t + u[0] * cu + w[0] * cw,
        c[1] + n[1] * h * t + u[1] * cu + w[1] * cw,
        c[2] + n[2] * h * t + u[2] * cu + w[2] * cw,
      ];
    },
  };
  return restrict(shape, where, probe);
}

export function disk(c, axis, r, rin = 0) {
  const [, u, w] = basis(axisOf(axis));
  return {
    area: Math.PI * (r * r - rin * rin),
    sample(rand) {
      const rad = Math.sqrt(rin * rin + rand() * (r * r - rin * rin));
      const ang = rand() * TAU;
      const cu = Math.cos(ang) * rad;
      const cw = Math.sin(ang) * rad;
      return [c[0] + u[0] * cu + w[0] * cw, c[1] + u[1] * cu + w[1] * cw, c[2] + u[2] * cu + w[2] * cw];
    },
  };
}

export function torus(c, axis, R, r, { arc = TAU, start = 0 } = {}) {
  const [n, u, w] = basis(axisOf(axis));
  return {
    area: arc * R * TAU * r,
    sample(rand) {
      const a = start + rand() * arc;
      const b = rand() * TAU;
      const ring = R + r * Math.cos(b);
      const ca = Math.cos(a) * ring;
      const sa = Math.sin(a) * ring;
      const h = r * Math.sin(b);
      return [
        c[0] + u[0] * ca + w[0] * sa + n[0] * h,
        c[1] + u[1] * ca + w[1] * sa + n[1] * h,
        c[2] + u[2] * ca + w[2] * sa + n[2] * h,
      ];
    },
  };
}

export function tri(a, b, c) {
  const area = v3.len(v3.cross(v3.sub(b, a), v3.sub(c, a))) / 2;
  return {
    area,
    sample(rand) {
      let s = rand();
      let t = rand();
      if (s + t > 1) {
        s = 1 - s;
        t = 1 - t;
      }
      return [0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * s + (c[i] - a[i]) * t);
    },
  };
}

export const quad = (a, b, c, d) => group([tri(a, b, c), tri(a, c, d)]);

export function box(c, size, { solid = false } = {}) {
  const [sx, sy, sz] = size;
  const hx = sx / 2;
  const hy = sy / 2;
  const hz = sz / 2;
  const faces = [sy * sz, sy * sz, sx * sz, sx * sz, sx * sy, sx * sy];
  const cum = [];
  let total = 0;
  for (const f of faces) cum.push((total += f));
  return {
    area: total * (solid ? 0.7 : 1),
    sample(rand) {
      const a = rand() * 2 - 1;
      const b = rand() * 2 - 1;
      if (solid) return [c[0] + a * hx, c[1] + b * hy, c[2] + (rand() * 2 - 1) * hz];
      const f = pick(cum, rand() * total);
      const sign = f % 2 ? 1 : -1;
      if (f < 2) return [c[0] + sign * hx, c[1] + a * hy, c[2] + b * hz];
      if (f < 4) return [c[0] + a * hx, c[1] + sign * hy, c[2] + b * hz];
      return [c[0] + a * hx, c[1] + b * hy, c[2] + sign * hz];
    },
  };
}

// Spur gear: toothed rim + both faces.
export function gear(c, axis, R, teeth, { depth = R * 0.12, thick = R * 0.25, hole = R * 0.2 } = {}) {
  const [n, u, w] = basis(axisOf(axis));
  const radiusAt = (a) => R - depth + depth * 2 * (Math.cos(teeth * a) > 0 ? 1 : 0);
  const rim = TAU * R * thick * 1.6;
  const face = Math.PI * (R * R - hole * hole) * 2;
  const total = rim + face;
  return {
    area: total,
    sample(rand) {
      const a = rand() * TAU;
      let rad;
      let h;
      if (rand() * total < rim) {
        rad = radiusAt(a);
        h = (rand() - 0.5) * thick;
      } else {
        rad = Math.sqrt(hole * hole + rand() * (radiusAt(a) ** 2 - hole * hole));
        h = (rand() < 0.5 ? -0.5 : 0.5) * thick;
      }
      const ca = Math.cos(a) * rad;
      const sa = Math.sin(a) * rad;
      return [
        c[0] + u[0] * ca + w[0] * sa + n[0] * h,
        c[1] + u[1] * ca + w[1] * sa + n[1] * h,
        c[2] + u[2] * ca + w[2] * sa + n[2] * h,
      ];
    },
  };
}

// Square pyramid (4 sloped faces, optional base).
export function pyramid(c, base, h) {
  const b = base / 2;
  const top = [c[0], c[1] + h, c[2]];
  const corners = [
    [c[0] - b, c[1], c[2] - b],
    [c[0] + b, c[1], c[2] - b],
    [c[0] + b, c[1], c[2] + b],
    [c[0] - b, c[1], c[2] + b],
  ];
  return group(corners.map((p, i) => tri(p, corners[(i + 1) % 4], top)));
}

export function custom(area, sample) {
  return { area, sample };
}

// Union of shapes, sampled proportionally to area.
export function group(shapes) {
  const cum = [];
  let total = 0;
  for (const s of shapes) cum.push((total += s.area));
  return {
    area: total,
    sample(rand) {
      return shapes[pick(cum, rand() * total)].sample(rand);
    },
  };
}

// Add gaussian noise for a softer, "grainy" look.
export function fuzz(shape, amount) {
  return {
    area: shape.area,
    sample(rand) {
      const p = shape.sample(rand);
      return [p[0] + gauss(rand) * amount, p[1] + gauss(rand) * amount, p[2] + gauss(rand) * amount];
    },
  };
}

// Mirror helper: returns [shape(+1), shape(-1)] for bilateral parts.
export const both = (fn) => [fn(1), fn(-1)];

export function helix(c, axis, radius, h, turns, phase = 0) {
  const [n, u, w] = basis(axisOf(axis));
  const pts = [];
  const steps = Math.ceil(turns * 16);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = phase + t * turns * TAU;
    pts.push([0, 1, 2].map((k) => c[k] + n[k] * h * t + (u[k] * Math.cos(a) + w[k] * Math.sin(a)) * radius));
  }
  return pts;
}

export { pick };

// Generic point transform wrapper.
export function xform(shape, fn) {
  return { area: shape.area, sample: (rand) => fn(shape.sample(rand)) };
}

export function rotY(shape, angle, pivot = [0, 0, 0]) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return xform(shape, ([x, y, z]) => {
    const dx = x - pivot[0];
    const dz = z - pivot[2];
    return [pivot[0] + dx * c + dz * s, y, pivot[2] - dx * s + dz * c];
  });
}

export function rotZ(shape, angle, pivot = [0, 0, 0]) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return xform(shape, ([x, y, z]) => {
    const dx = x - pivot[0];
    const dy = y - pivot[1];
    return [pivot[0] + dx * c - dy * s, pivot[1] + dx * s + dy * c, z];
  });
}

export function rotX(shape, angle, pivot = [0, 0, 0]) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return xform(shape, ([x, y, z]) => {
    const dy = y - pivot[1];
    const dz = z - pivot[2];
    return [x, pivot[1] + dy * c - dz * s, pivot[2] + dy * s + dz * c];
  });
}
