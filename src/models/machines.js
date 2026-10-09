import { sphere, tube, curve, revolve, disk, box, gear, both } from '../shapes.js';
import { part, range } from './common.js';

const CAT = 'Machines';

const gearTrain = {
  id: 'gear-train',
  name: 'Gear Train',
  category: CAT,
  subtitle: 'trading speed for torque since antiquity',
  build() {
    const g = [
      { c: [-1.15, 0, 0], R: 0.9, n: 24 },
      { c: [0.3, 0.35, 0], R: 0.55, n: 14 },
      { c: [1.25, -0.45, 0], R: 0.7, n: 18 },
      { c: [0.35, -1.0, 0], R: 0.38, n: 10 },
    ];
    const spokes = (c, R) => range(5, (i) => { const a = (i / 5) * Math.PI * 2; return tube(c, [c[0] + Math.cos(a) * R * 0.75, c[1] + Math.sin(a) * R * 0.75, c[2]], 0.035); });
    return [
      part('Driver gear', '24 teeth: input from the motor', '#ffd166', [gear(g[0].c, 'z', g[0].R, g[0].n, { hole: 0.7 }), spokes(g[0].c, g[0].R)], { explode: [-0.6, 0.2, 0.6] }),
      part('Idler gear', 'reverses direction, keeps the ratio', '#7fd1ff', [gear(g[1].c, 'z', g[1].R, g[1].n, { hole: 0.35 }), spokes(g[1].c, g[1].R)], { explode: [0, 0.6, 1.0] }),
      part('Driven gear', '18 teeth: output shaft', '#ff9f43', [gear(g[2].c, 'z', g[2].R, g[2].n, { hole: 0.5 }), spokes(g[2].c, g[2].R)], { explode: [0.6, 0, 0.6] }),
      part('Pinion', 'small gear, high speed', '#ff6b81', gear(g[3].c, 'z', g[3].R, g[3].n, { hole: 0.1 }), { explode: [0, -0.6, 1.2] }),
      part('Axles', 'steel shafts the gears turn on', '#ffffff', g.map(({ c }) => tube([c[0], c[1], -0.6], [c[0], c[1], 0.4], 0.06)), { explode: [0, 0, -0.4] }),
      part('Frame plate', 'holds the axles in alignment', '#8fa0b8', box([0, -0.2, -0.6], [3.6, 2.8, 0.06]), { explode: [0, 0, -1.2], density: 0.6 }),
    ];
  },
};

const robotArm = {
  id: 'robot-arm',
  name: 'Robotic Arm',
  category: CAT,
  subtitle: '6 axes · repeatable to 0.02 mm',
  build() {
    const sh = [0, 0.95, 0];
    const el = [0.55, 2.25, 0];
    const wr = [1.85, 2.5, 0];
    return [
      part('Base', 'bolted to the floor', '#c8d2e0', [revolve([0, 0, 0], 'y', 0.3, () => 0.7), disk([0, 0, 0], 'y', 0.7), disk([0, 0.3, 0], 'y', 0.7)], { explode: [0, -0.8, 0] }),
      part('Turntable', 'axis 1: rotates the whole arm', '#9fb0c4', [revolve([0, 0.3, 0], 'y', 0.35, () => 0.45), disk([0, 0.65, 0], 'y', 0.45)], { explode: [0, -0.4, 0] }),
      part('Shoulder joint', 'axis 2: servo motor + gearbox', '#ffd166', [tube([0, sh[1], -0.32], [0, sh[1], 0.32], 0.3, 0.3, { caps: true })], { explode: [0, 0, 0.8] }),
      part('Upper arm', 'cast-aluminium link', '#ff9f43', [tube(sh, el, 0.19, 0.16), both((s) => tube([sh[0], sh[1], s * 0.2], [el[0], el[1], s * 0.2], 0.04))], { explode: [-0.5, 0.2, 0] }),
      part('Elbow joint', 'axis 3: lifts the forearm', '#ffd166', tube([el[0], el[1], -0.25], [el[0], el[1], 0.25], 0.22, 0.22, { caps: true }), { explode: [0, 0.4, 0.8] }),
      part('Forearm', 'axis 4: rolls along its length', '#ff7a3d', tube(el, wr, 0.15, 0.11), { explode: [0.2, 0.8, 0] }),
      part('Wrist', 'axes 5 & 6: pitch and roll', '#7fd1ff', [sphere(wr, 0.14), tube(wr, [2.1, 2.55, 0], 0.08)], { explode: [0.7, 1.0, 0] }),
      part('Gripper', 'parallel fingers with force sensing', '#eef3fa', [box([2.15, 2.56, 0], [0.08, 0.3, 0.18]), both((s) => box([2.32, 2.56 + s * 0.11, 0], [0.3, 0.05, 0.12]))], { explode: [1.2, 1.1, 0] }),
      part('Cables', 'power and signals to every motor', '#4fd1a5', curve([[-0.3, 0.3, 0.3], [-0.3, 1.0, 0.35], [0.2, 1.8, 0.3], [0.6, 2.45, 0.25], [1.3, 2.65, 0.15], [1.9, 2.65, 0.05]], 0.03), { explode: [0, 0, 1.4] }),
    ];
  },
};

export default [gearTrain, robotArm];
