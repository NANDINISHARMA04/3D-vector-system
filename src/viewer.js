// Camera, projection and part picking shared by the Body Explorer app.
import { mat4, v3 } from './math.js';

/** Orbit camera. `shiftPx` moves the projection centre right (to clear a sidebar). */
export function orbitCamera({ yaw, pitch, dist, W, H, shiftPx = 0, fov = 0.75 }) {
  const cp = Math.cos(pitch);
  const eye = [dist * cp * Math.sin(yaw), dist * Math.sin(pitch), dist * cp * Math.cos(yaw)];
  const view = mat4.lookAt(eye, [0, 0, 0], [0, 1, 0]);
  const proj = mat4.perspective(fov, W / H, 0.05, 100);
  proj[8] = -shiftPx / W;
  const vp = mat4.multiply(proj, view);
  return { eye, view, proj, vp, inv: mat4.invert(vp), W, H };
}

export function project(cam, p) {
  const c = mat4.transform(cam.vp, p);
  if (c[3] <= 0.01) return null;
  return [((c[0] / c[3]) * 0.5 + 0.5) * cam.W, (1 - ((c[1] / c[3]) * 0.5 + 0.5)) * cam.H, c[3]];
}

/** Screen point -> world point on the plane through the origin facing the camera. */
export function unproject(cam, x, y) {
  const nx = (x / cam.W) * 2 - 1;
  const ny = 1 - (y / cam.H) * 2;
  const a = mat4.transform(cam.inv, [nx, ny, -1]);
  const b = mat4.transform(cam.inv, [nx, ny, 1]);
  const near = [a[0] / a[3], a[1] / a[3], a[2] / a[3]];
  const far = [b[0] / b[3], b[1] / b[3], b[2] / b[3]];
  const dir = v3.sub(far, near);
  const n = v3.norm(cam.eye);
  const t = -v3.dot(near, n) / (v3.dot(dir, n) || 1e-6);
  return v3.add(near, v3.scale(dir, t));
}

/** How much to pull the camera back so an exploded model still fits. */
export function explodeFit(sample, explode) {
  if (!sample) return 1;
  const [b0, b1] = sample.bounds;
  const ext = (b) => Math.max(b[1][0] - b[0][0], b[1][1] - b[0][1], (b[1][2] - b[0][2]) * 0.8);
  return Math.pow(1 + (ext(b1) / ext(b0) - 1) * explode, 0.9);
}

/** Current world position of a part's label anchor. */
export function partAnchor(part, explode, grab) {
  let a = v3.add(part.anchor, v3.scale(part.explode, explode));
  if (grab && part.index === grab.part) a = v3.add(a, grab.offset);
  return a;
}

/**
 * Part under a screen point: projects a subsample of particle targets and
 * prefers the front-most hit within a small radius, else the nearest within 40px.
 */
export function pickPart(sample, cam, x, y, { explode = 0, grab = null, skip = null } = {}) {
  if (!sample) return -1;
  const m = cam.vp;
  const { positions: P, explode: X, partIds } = sample;
  const stride = Math.max(1, Math.floor(sample.count / 14000));
  let front = -1;
  let frontW = Infinity;
  let near = -1;
  let nearD = 40 * 40;
  for (let i = 0; i < sample.count; i += stride) {
    const part = partIds[i];
    if (skip && skip(part)) continue;
    let px = P[i * 3] + X[i * 3] * explode;
    let py = P[i * 3 + 1] + X[i * 3 + 1] * explode;
    let pz = P[i * 3 + 2] + X[i * 3 + 2] * explode;
    if (grab && part === grab.part) {
      px += grab.offset[0];
      py += grab.offset[1];
      pz += grab.offset[2];
    }
    const w = m[3] * px + m[7] * py + m[11] * pz + m[15];
    if (w <= 0.01) continue;
    const sx = (((m[0] * px + m[4] * py + m[8] * pz + m[12]) / w) * 0.5 + 0.5) * cam.W;
    const sy = (1 - (((m[1] * px + m[5] * py + m[9] * pz + m[13]) / w) * 0.5 + 0.5)) * cam.H;
    const d = (sx - x) ** 2 + (sy - y) ** 2;
    if (d < 16 * 16 && w < frontW) {
      frontW = w;
      front = part;
    }
    if (d < nearD) {
      nearD = d;
      near = part;
    }
  }
  return front >= 0 ? front : near;
}
