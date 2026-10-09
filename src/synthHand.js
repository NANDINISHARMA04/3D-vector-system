// Builds plausible 21-point hand skeletons in screen pixels. Used by the unit
// and end-to-end tests (and the in-app demo hand) to drive gestures without a camera.

const CHAINS = {
  index: { base: [0.32, 0.95], dir: [0.12, 1], len: [0.45, 0.27, 0.22] },
  middle: { base: [0.05, 1.0], dir: [0.0, 1], len: [0.5, 0.3, 0.24] },
  ring: { base: [-0.2, 0.95], dir: [-0.1, 1], len: [0.45, 0.28, 0.22] },
  pinky: { base: [-0.42, 0.85], dir: [-0.22, 1], len: [0.35, 0.22, 0.2] },
};

function finger({ base, dir, len }, e) {
  const n = Math.hypot(dir[0], dir[1]);
  const d2 = [dir[0] / n, dir[1] / n];
  const bend = (1 - e) * 1.55; // radians per joint
  const pts = [[base[0], base[1], 0]];
  let phi = 0;
  let p = pts[0];
  for (const l of len) {
    phi += bend;
    // Curl forward (towards the camera, -z) and back down towards the palm.
    const q = [p[0] + d2[0] * Math.cos(phi) * l, p[1] + d2[1] * Math.cos(phi) * l, p[2] - Math.sin(phi) * l];
    pts.push(q);
    p = q;
  }
  return pts;
}

function thumb(e) {
  const pts = [[0.3, 0.2, 0]];
  let ang = Math.atan2(0.75, 0.65); // pointing up-right, away from the palm
  const bend = (1 - e) * 0.95;
  let p = pts[0];
  for (const l of [0.4, 0.3, 0.25]) {
    const q = [p[0] + Math.cos(ang) * l, p[1] + Math.sin(ang) * l, p[2] - (1 - e) * 0.08];
    pts.push(q);
    p = q;
    ang += bend;
  }
  return pts;
}

/**
 * @param {object} o
 * @param {object} o.ext   finger extension 0..1 per finger (thumb, index, middle, ring, pinky)
 * @param {number} o.x,o.y wrist position in px
 * @param {number} o.size  palm length in px
 * @param {number} o.roll  radians, + = clockwise on screen
 * @param {boolean} o.pinch put the thumb tip on the index tip
 * @param {boolean} o.snap  put the thumb tip on the middle tip
 */
export function synthHand({ ext = {}, x = 640, y = 520, size = 110, roll = 0, pinch = false, snap = false } = {}) {
  const e = { thumb: 1, index: 1, middle: 1, ring: 1, pinky: 1, ...ext };
  const local = [[0, 0, 0], ...thumb(e.thumb)];
  for (const name of ['index', 'middle', 'ring', 'pinky']) local.push(...finger(CHAINS[name], e[name]));
  if (pinch) local[4] = [...local[8]];
  if (snap) local[4] = [local[12][0] + 0.02, local[12][1], local[12][2]];
  const c = Math.cos(roll);
  const s = Math.sin(roll);
  return local.map(([lx, ly, lz]) => {
    // local: +y towards fingers. screen: y grows downward.
    const rx = lx * c + ly * s;
    const ry = -lx * s + ly * c;
    return [x + rx * size, y - ry * size, lz * size];
  });
}

export const POSES = {
  open: { ext: { thumb: 1, index: 1, middle: 1, ring: 1, pinky: 1 } },
  fist: { ext: { thumb: 0.1, index: 0, middle: 0, ring: 0, pinky: 0 } },
  point: { ext: { thumb: 0.2, index: 1, middle: 0, ring: 0, pinky: 0 } },
  peace: { ext: { thumb: 0.2, index: 1, middle: 1, ring: 0, pinky: 0 } },
  pinch: { ext: { thumb: 0.6, index: 0.55, middle: 0.9, ring: 0.9, pinky: 0.9 }, pinch: true },
  snapReady: { ext: { thumb: 0.6, index: 0.9, middle: 0.5, ring: 0.1, pinky: 0.1 }, snap: true },
  snapDone: { ext: { thumb: 0.9, index: 0.9, middle: 0.0, ring: 0.1, pinky: 0.1 } },
  half: { ext: { thumb: 0.5, index: 0.5, middle: 0.5, ring: 0.5, pinky: 0.5 } },
};

export const poseHand = (name, opts = {}) => synthHand({ ...POSES[name], ...opts });
