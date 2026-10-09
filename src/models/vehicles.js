import { ellipsoid, tube, curve, revolve, disk, torus, box, quad, tri, gear, both } from '../shapes.js';
import { part, range } from './common.js';

const CAT = 'Vehicles';
const TAU = Math.PI * 2;

const car = {
  id: 'car',
  name: 'Sports Car',
  category: CAT,
  subtitle: '0–100 km/h in 3.5 s',
  build() {
    const wheelPos = [[1.25, 0.34, 0.78], [1.25, 0.34, -0.78], [-1.25, 0.34, 0.78], [-1.25, 0.34, -0.78]];
    const outsideWells = (p) => !wheelPos.some(([x, y, z]) => Math.hypot(p[0] - x, p[1] - y) < 0.44 && Math.sign(p[2]) === Math.sign(z));
    const lower = ellipsoid([0, 0.55, 0], [2.05, 0.32, 0.85], { where: outsideWells });
    const cabin = ellipsoid([-0.25, 0.82, 0], [1.15, 0.4, 0.72], { where: (p) => p[1] > 0.8 });
    return [
      part('Body', 'carbon-fibre monocoque shell', '#ff4d5e', [lower, cabin], { explode: [0, 1.0, 0], density: 1.1 }),
      part('Glass', 'windscreen and side windows', '#7fd1ff', [quad([0.75, 0.86, -0.6], [0.75, 0.86, 0.6], [0.2, 1.16, 0.55], [0.2, 1.16, -0.55]), both((s) => quad([0.55, 0.88, s * 0.68], [-0.9, 0.88, s * 0.68], [-0.7, 1.12, s * 0.55], [0.2, 1.12, s * 0.55]))], { explode: [0, 1.6, 0] }),
      part('Tyres', 'grip the road, 4 palm-sized patches', '#b8c7d9', wheelPos.map((c) => torus(c, 'z', 0.27, 0.1)), { explode: [0, -0.2, 0], spread: 0.35 }),
      part('Rims & brakes', 'alloy wheels with disc brakes', '#eef3fa', wheelPos.map((c) => [disk(c, 'z', 0.2), gear(c, 'z', 0.16, 5, { depth: 0.02, thick: 0.04, hole: 0.03 })]), { explode: [0, -0.2, 0], spread: 0.55 }),
      part('Engine', 'mid-mounted V8, 600 hp', '#ffb43d', [box([-0.85, 0.62, 0], [0.7, 0.35, 0.6]), both((s) => box([-0.85, 0.85, s * 0.18], [0.6, 0.12, 0.18]))], { explode: [-0.6, 1.8, 0] }),
      part('Seats', 'bucket seats hugging the driver', '#ffd166', both((s) => [box([0.05, 0.55, s * 0.32], [0.45, 0.1, 0.36]), box([-0.18, 0.8, s * 0.32], [0.08, 0.5, 0.36])]), { explode: [0, 2.3, 0], spread: 0.4 }),
      part('Steering wheel', 'connects your hands to the tyres', '#e0e6ef', torus([0.42, 0.85, 0.32], [1, 0.4, 0], 0.13, 0.02), { explode: [0.4, 2.6, 0.4] }),
      part('Headlights', 'LED lights for the road ahead', '#fff6b0', both((s) => ellipsoid([1.95, 0.62, s * 0.58], [0.06, 0.06, 0.18])), { explode: [0.8, 0, 0], spread: 0.3 }),
      part('Tail lights', 'brake and indicator lamps', '#ff3355', both((s) => ellipsoid([-2.0, 0.65, s * 0.6], [0.05, 0.05, 0.2])), { explode: [-0.8, 0, 0], spread: 0.3 }),
      part('Exhaust', 'quad tailpipes', '#9aa7b8', both((s) => tube([-1.4, 0.32, s * 0.25], [-2.1, 0.32, s * 0.25], 0.05)), { explode: [-1.0, -0.4, 0] }),
    ];
  },
};

const saturnV = {
  id: 'saturn-v',
  name: 'Saturn V',
  category: CAT,
  subtitle: '110 m tall · took humans to the Moon',
  build() {
    const bell = (x, z) => revolve([x, -0.55, z], 'y', 0.55, (t) => 0.16 - t * 0.09);
    return [
      part('F-1 engines', 'five engines: 7.6 million lbf', '#ff9f43', [bell(0, 0), [[0.27, 0.27], [-0.27, 0.27], [0.27, -0.27], [-0.27, -0.27]].map(([x, z]) => bell(x, z))], { explode: [0, -1.0, 0], spread: 0.4 }),
      part('Fins', 'four stabilising fins', '#e0e6ef', range(4, (i) => { const a = (i / 4) * TAU + Math.PI / 4; const c = Math.cos(a); const s = Math.sin(a); return tri([c * 0.5, 0.0, s * 0.5], [c * 0.5, 0.6, s * 0.5], [c * 0.85, -0.05, s * 0.85]); }), { explode: [0, -0.6, 0], spread: 0.5 }),
      part('First stage (S-IC)', 'burns kerosene + LOX for 2.5 min', '#f4f6fa', [tube([0, 0, 0], [0, 2.1, 0], 0.5), [0.35, 1.2, 1.9].map((y) => torus([0, y, 0], 'y', 0.5, 0.02))], { explode: [0, -0.4, 0] }),
      part('Second stage (S-II)', 'five J-2 hydrogen engines', '#e3eaf4', tube([0, 2.1, 0], [0, 3.4, 0], 0.5), { explode: [0, 0.3, 0] }),
      part('Third stage (S-IVB)', 'sends Apollo towards the Moon', '#d4dfee', [revolve([0, 3.4, 0], 'y', 0.25, (t) => 0.5 - t * 0.17), tube([0, 3.65, 0], [0, 4.45, 0], 0.33)], { explode: [0, 0.9, 0] }),
      part('Instrument unit', 'the guidance computer ring', '#7fd1ff', torus([0, 4.5, 0], 'y', 0.33, 0.04), { explode: [0, 1.3, 0] }),
      part('Lunar module', 'landed on the Moon, hidden in the adapter', '#ffd166', [revolve([0, 4.55, 0], 'y', 0.5, (t) => 0.33 - t * 0.13), box([0, 4.75, 0], [0.18, 0.15, 0.18])], { explode: [0, 1.8, 0] }),
      part('Command module', 'crew capsule for three astronauts', '#c8d2e0', [tube([0, 5.05, 0], [0, 5.35, 0], 0.2), revolve([0, 5.35, 0], 'y', 0.25, (t) => 0.2 * (1 - t))], { explode: [0, 2.3, 0] }),
      part('Launch escape tower', 'pulls the capsule to safety', '#ff6b6b', [range(4, (i) => { const a = (i / 4) * TAU; return tube([Math.cos(a) * 0.1, 5.55, Math.sin(a) * 0.1], [0, 5.85, 0], 0.012); }), tube([0, 5.85, 0], [0, 6.25, 0], 0.035)], { explode: [0, 2.8, 0] }),
    ];
  },
};

const airplane = {
  id: 'airplane',
  name: 'Airliner',
  category: CAT,
  subtitle: 'cruises at 900 km/h, 11 km up',
  build() {
    const fus = (t) => 0.28 * Math.sqrt(Math.min(1, (1 - t) * 7)) * Math.min(1, 0.25 + t * 3);
    return [
      part('Fuselage', 'pressurised aluminium tube', '#eef3fa', revolve([-2.1, 0, 0], 'x', 4.2, fus), { explode: [0, 0, 0] }),
      part('Cockpit', 'flight deck with glass displays', '#7fd1ff', ellipsoid([1.82, 0.1, 0], [0.22, 0.1, 0.2], { where: (p) => p[1] > 0.06 }), { explode: [0.8, 0.4, 0] }),
      part('Wings', '60 m span, also the fuel tanks', '#b8c7d9', both((s) => quad([0.55, -0.08, s * 0.25], [-0.25, -0.08, s * 0.25], [-0.95, 0.05, s * 2.1], [-0.6, 0.05, s * 2.1])), { explode: [0, -0.3, 0], spread: 0.35 }),
      part('Flaps & ailerons', 'shape lift for take-off and turns', '#ffd166', both((s) => quad([-0.25, -0.08, s * 0.3], [-0.4, -0.08, s * 0.3], [-1.05, 0.05, s * 2.0], [-0.95, 0.05, s * 2.0])), { explode: [-0.4, -0.5, 0], spread: 0.35 }),
      part('Engines', 'two turbofans under the wings', '#ffb43d', both((s) => [tube([0.45, -0.3, s * 0.85], [-0.2, -0.3, s * 0.85], 0.15, 0.12), disk([0.45, -0.3, s * 0.85], 'x', 0.13)]), { explode: [0.5, -0.8, 0], spread: 0.25 }),
      part('Vertical stabiliser', 'tail fin and rudder for yaw', '#ff5a6a', quad([-1.55, 0.15, 0], [-2.05, 0.18, 0], [-2.25, 0.95, 0], [-1.95, 0.95, 0]), { explode: [-0.6, 0.7, 0] }),
      part('Horizontal stabiliser', 'elevators for pitch control', '#ff9fb0', both((s) => quad([-1.6, 0.1, s * 0.1], [-2.0, 0.1, s * 0.1], [-2.2, 0.15, s * 0.8], [-2.0, 0.15, s * 0.8])), { explode: [-0.9, 0.2, 0], spread: 0.3 }),
      part('Landing gear', 'absorbs a 60-tonne touchdown', '#9fb0c4', [tube([1.4, -0.2, 0], [1.4, -0.45, 0], 0.025), torus([1.4, -0.5, 0], 'z', 0.06, 0.025), both((s) => [tube([-0.3, -0.15, s * 0.4], [-0.3, -0.45, s * 0.4], 0.03), torus([-0.3, -0.5, s * 0.4], 'z', 0.08, 0.03)])], { explode: [0, -1.0, 0] }),
    ];
  },
};

const bicycle = {
  id: 'bicycle',
  name: 'Bicycle',
  category: CAT,
  subtitle: 'the most efficient vehicle ever made',
  build() {
    const rear = [-1.0, 0.62, 0];
    const front = [1.0, 0.62, 0];
    const bb = [-0.08, 0.42, 0];
    const seat = [-0.36, 1.25, 0];
    const head = [0.62, 1.28, 0];
    const headLow = [0.67, 1.08, 0];
    const spokes = (c) => range(18, (i) => { const a = (i / 18) * TAU; return tube([c[0], c[1], (i % 2 ? 0.04 : -0.04)], [c[0] + Math.cos(a) * 0.58, c[1] + Math.sin(a) * 0.58, 0], 0.006); });
    const chain = range(16, (i) => {
      const a = (i / 16) * TAU;
      const top = Math.sin(a) > 0;
      const r = Math.cos(a) > 0 ? 0.2 : 0.09;
      const cx = Math.cos(a) > 0 ? bb[0] : rear[0];
      const cy = Math.cos(a) > 0 ? bb[1] : rear[1];
      return [cx + Math.cos(a) * r, cy + (top ? 1 : -1) * Math.abs(Math.sin(a)) * r, 0.09];
    });
    return [
      part('Wheels', '700c rims with rubber tyres', '#b8c7d9', [torus(rear, 'z', 0.62, 0.035), torus(front, 'z', 0.62, 0.035), disk(rear, 'z', 0.05), disk(front, 'z', 0.05)], { explode: [0, -0.2, 0], spread: 0.35 }),
      part('Spokes', '36 tensioned spokes per wheel', '#e0e6ef', [spokes(rear), spokes(front)], { explode: [0, -0.2, 0.5], spread: 0.35 }),
      part('Frame', 'diamond frame of two triangles', '#ff4d6d', [tube(seat, head, 0.035), tube(headLow, bb, 0.04), tube(bb, seat, 0.035), both((s) => [tube(bb, [rear[0], rear[1], s * 0.05], 0.022), tube([seat[0], seat[1] - 0.05, 0], [rear[0], rear[1], s * 0.05], 0.02)]), tube(head, headLow, 0.045)], { explode: [0, 0.3, 0] }),
      part('Fork', 'steers and absorbs bumps', '#ff8fa3', both((s) => curve([[headLow[0], headLow[1], s * 0.03], [0.82, 0.85, s * 0.05], [front[0], front[1], s * 0.05]], 0.02)), { explode: [0.4, 0.2, 0] }),
      part('Handlebar', 'steering and brake levers', '#c8d2e0', [tube(head, [0.55, 1.42, 0], 0.025), tube([0.55, 1.42, -0.28], [0.55, 1.42, 0.28], 0.02)], { explode: [0.3, 0.7, 0] }),
      part('Saddle', 'where the rider sits', '#ffd166', [ellipsoid([-0.42, 1.36, 0], [0.18, 0.04, 0.08]), tube(seat, [-0.4, 1.33, 0], 0.02)], { explode: [-0.3, 0.8, 0] }),
      part('Drivetrain', 'chainring, chain and cassette', '#7fd1ff', [gear([bb[0], bb[1], 0.09], 'z', 0.2, 30, { depth: 0.015, thick: 0.01, hole: 0.03 }), gear([rear[0], rear[1], 0.09], 'z', 0.09, 14, { depth: 0.012, thick: 0.03, hole: 0.02 }), curve(chain, 0.01, { closed: true })], { explode: [0, -0.3, 0.7] }),
      part('Pedals & cranks', 'turn leg power into rotation', '#9fb0c4', [tube([bb[0], bb[1], 0.11], [bb[0] + 0.15, bb[1] - 0.12, 0.13], 0.02), tube([bb[0], bb[1], -0.11], [bb[0] - 0.15, bb[1] + 0.12, -0.13], 0.02), box([bb[0] + 0.15, bb[1] - 0.13, 0.2], [0.1, 0.02, 0.08]), box([bb[0] - 0.15, bb[1] + 0.11, -0.2], [0.1, 0.02, 0.08])], { explode: [0, -0.6, 0.4] }),
    ];
  },
};

export default [car, saturnV, airplane, bicycle];
