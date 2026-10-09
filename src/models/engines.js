import { sphere, tube, curve, revolve, disk, torus, box, gear, custom, both } from '../shapes.js';
import { part, range } from './common.js';

const CAT = 'Engines';
const TAU = Math.PI * 2;

// Ring of twisted blades around the x axis at position x.
function bladeDisk(x, R, n, { hub = 0.12, twist = 0.5, depth = 0.06 } = {}) {
  return custom(R * R * n * 0.08, (rand) => {
    const k = Math.floor(rand() * n);
    const r = hub + rand() * (R - hub);
    const s = rand() - 0.5;
    const a = (k / n) * TAU + s * 0.12 + (r / R) * twist * 0.2;
    return [x + s * depth * (1 + twist), Math.cos(a) * r, Math.sin(a) * r];
  });
}

const jet = {
  id: 'jet-engine',
  name: 'Jet Engine',
  category: CAT,
  subtitle: 'high-bypass turbofan · 100,000 lbf thrust',
  explodeScale: 1.4,
  build() {
    return [
      part('Nacelle', 'aerodynamic cowling and bypass duct', '#b8c7d9', revolve([-1.4, 0, 0], 'x', 2.6, (t) => 0.62 + 0.16 * Math.sin(Math.PI * Math.min(1, t * 1.1))), { explode: [0, 1.2, 0], density: 0.7 }),
      part('Spinner', 'cone that smooths air into the fan', '#eef4fb', revolve([1.15, 0, 0], 'x', 0.38, (t) => 0.2 * Math.sqrt(1 - t)), { explode: [1.6, 0, 0] }),
      part('Fan', 'moves 90% of the air around the core', '#7fd1ff', [bladeDisk(1.1, 0.72, 22, { twist: 1.2 }), torus([1.1, 0, 0], 'x', 0.72, 0.015)], { explode: [1.2, 0, 0] }),
      part('Compressor', 'squeezes air 40× in 14 stages', '#4fd1a5', range(8, (i) => bladeDisk(0.75 - i * 0.12, 0.48 - i * 0.03, 28)), { explode: [0.55, 0, 0] }),
      part('Combustor', 'burns fuel at 2,000 °C', '#ff7a3d', [torus([-0.35, 0, 0], 'x', 0.27, 0.1), range(10, (i) => { const a = (i / 10) * TAU; return tube([-0.22, Math.cos(a) * 0.27, Math.sin(a) * 0.27], [-0.12, Math.cos(a) * 0.34, Math.sin(a) * 0.34], 0.015); })], { explode: [0, -0.2, 0], spread: 0.4 }),
      part('High-pressure turbine', 'spins the compressor at 12,000 rpm', '#ffb43d', range(2, (i) => bladeDisk(-0.6 - i * 0.11, 0.33, 34)), { explode: [-0.5, 0, 0] }),
      part('Low-pressure turbine', 'drives the big fan', '#ffd166', range(4, (i) => bladeDisk(-0.85 - i * 0.12, 0.38 + i * 0.03, 40)), { explode: [-0.9, 0, 0] }),
      part('Shaft', 'concentric spools linking turbines to fans', '#ffffff', tube([-1.35, 0, 0], [1.15, 0, 0], 0.05), { explode: [0, -0.9, 0] }),
      part('Exhaust nozzle', 'accelerates the hot core flow', '#9fb0c4', [revolve([-1.9, 0, 0], 'x', 0.55, (t) => 0.3 + t * 0.15), revolve([-2.05, 0, 0], 'x', 0.6, (t) => 0.2 * Math.sqrt(t))], { explode: [-1.5, 0, 0] }),
    ];
  },
};

const inline4 = {
  id: 'inline-4',
  name: 'Inline-4 Engine',
  category: CAT,
  subtitle: '4-stroke · intake, compress, power, exhaust',
  build() {
    const xs = [-0.75, -0.25, 0.25, 0.75];
    const crankY = -0.45;
    const throws = xs.map((x, i) => [x, crankY + (i === 0 || i === 3 ? 0.18 : -0.18), 0]);
    return [
      part('Engine block', 'cast-iron body housing the cylinders', '#9aa7b8', [box([0, 0, 0], [2.2, 0.9, 0.9]), xs.map((x) => tube([x, -0.2, 0], [x, 0.45, 0], 0.24))], { explode: [0, 0, 0], density: 0.8 }),
      part('Cylinder head', 'valves, ports and combustion chambers', '#c8d2e0', box([0, 0.6, 0], [2.2, 0.3, 0.85]), { explode: [0, 0.9, 0] }),
      part('Valve cover', 'seals the camshafts', '#ff5a5a', box([0, 0.88, 0], [2.0, 0.16, 0.6]), { explode: [0, 1.6, 0] }),
      part('Camshafts', 'open the valves in time', '#ff9fd8', both((s) => tube([-1.0, 0.82, s * 0.16], [1.0, 0.82, s * 0.16], 0.04)), { explode: [0, 1.25, 0], spread: 0.6 }),
      part('Spark plugs', 'ignite the air-fuel mix', '#fff07a', xs.map((x) => tube([x, 0.75, 0], [x, 1.1, 0], 0.03)), { explode: [0, 2.0, 0] }),
      part('Pistons', 'pushed down by each explosion', '#eef0f6', xs.map((x, i) => tube([x, 0.05 + (i === 0 || i === 3 ? 0.12 : -0.12), 0], [x, 0.32 + (i === 0 || i === 3 ? 0.12 : -0.12), 0], 0.2, 0.2, { caps: true })), { explode: [0, 0.4, 1.0] }),
      part('Connecting rods', 'turn up-down into round-and-round', '#c0c8d8', xs.map((x, i) => tube([x, 0.1 + (i === 0 || i === 3 ? 0.12 : -0.12), 0], throws[i], 0.04)), { explode: [0, 0, 1.4] }),
      part('Crankshaft', 'converts piston force into torque', '#ffc857', [tube([-1.1, crankY, 0], [1.1, crankY, 0], 0.07), throws.map((p) => tube([p[0] - 0.12, p[1], 0], [p[0] + 0.12, p[1], 0], 0.06)), throws.map((p) => both((s) => box([p[0] + s * 0.14, (p[1] + crankY) / 2, 0], [0.04, 0.3, 0.25])))], { explode: [0, -0.5, 1.1] }),
      part('Oil pan', 'reservoir that lubricates everything', '#6c7a8a', box([0, -0.68, 0], [2.0, 0.28, 0.8]), { explode: [0, -1.1, 0] }),
      part('Flywheel', 'smooths the power pulses', '#ffd166', [gear([1.25, crankY, 0], 'x', 0.55, 60, { depth: 0.03, thick: 0.08, hole: 0.08 })], { explode: [1.0, 0, 0] }),
      part('Intake manifold', 'feeds air into each cylinder', '#7fd1ff', xs.map((x) => curve([[x, 0.6, -0.42], [x, 0.55, -0.7], [x * 0.6, 0.3, -0.9], [0, 0.3, -1.0]], 0.06)), { explode: [0, 0.3, -1.0] }),
      part('Exhaust manifold', 'collects hot gases', '#ff8a3d', xs.map((x) => curve([[x, 0.6, 0.42], [x, 0.5, 0.65], [x * 0.5, 0.0, 0.8], [0.9, -0.3, 0.85]], 0.055)), { explode: [0.4, 0.2, 1.9] }),
    ];
  },
};

const rocketEngine = {
  id: 'rocket-engine',
  name: 'Rocket Engine',
  category: CAT,
  subtitle: 'liquid-fuel · regeneratively cooled',
  build() {
    const bell = (t) => 0.95 - 0.77 * Math.sqrt(t);
    const lines = range(28, (i) => {
      const a = (i / 28) * TAU;
      return curve(range(8, (k) => { const t = k / 7; const r = bell(t) + 0.02; return [Math.cos(a) * r, -1.6 + t * 1.9, Math.sin(a) * r]; }), 0.012);
    });
    return [
      part('Nozzle bell', 'expands exhaust to supersonic speed', '#ff9f43', revolve([0, -1.6, 0], 'y', 1.9, bell), { explode: [0, -1.0, 0], spread: 0.1 }),
      part('Cooling channels', 'fuel flows through the walls first', '#ff6b6b', lines, { explode: [0, -0.4, 0], spread: 0.25 }),
      part('Combustion chamber', 'burns at 3,500 °C and 200 bar', '#ffd166', [revolve([0, 0.3, 0], 'y', 0.9, (t) => 0.2 + 0.18 * Math.min(1, t * 3))], { explode: [0, 0.2, 0] }),
      part('Injector plate', 'atomises fuel and oxidiser', '#e0e6ef', [disk([0, 1.2, 0], 'y', 0.38), revolve([0, 1.2, 0], 'y', 0.2, (t) => 0.38 * Math.sqrt(1 - t))], { explode: [0, 0.8, 0] }),
      part('Turbopump', '50,000 hp to feed propellants', '#7fd1ff', [tube([0.55, 1.05, -0.3], [0.55, 1.05, 0.3], 0.18, 0.18, { caps: true }), torus([0.55, 1.05, 0.33], 'z', 0.18, 0.06), torus([0.55, 1.05, -0.33], 'z', 0.18, 0.06)], { explode: [1.0, 0.6, 0] }),
      part('Fuel line', 'liquid hydrogen at −253 °C', '#4fd1a5', curve([[0.55, 1.05, 0.4], [0.75, 0.6, 0.5], [0.55, 0.1, 0.4], [0.2, -0.25, 0.25]], 0.05), { explode: [0.8, 0, 0.8] }),
      part('Oxidiser line', 'liquid oxygen at −183 °C', '#c3a6ff', curve([[0.55, 1.05, -0.4], [0.8, 1.35, -0.45], [0.3, 1.45, -0.2], [0, 1.25, 0]], 0.05), { explode: [0.8, 0.5, -0.8] }),
      part('Gimbal mount', 'tilts the engine to steer', '#ffffff', [sphere([0, 1.5, 0], 0.12), tube([0, 1.5, 0], [0, 1.85, 0], 0.06), disk([0, 1.85, 0], 'y', 0.35)], { explode: [0, 1.4, 0] }),
    ];
  },
};

const motor = {
  id: 'electric-motor',
  name: 'Electric Motor',
  category: CAT,
  subtitle: 'brushless DC · 95% efficient',
  explodeScale: 1.3,
  build() {
    const fins = range(16, (i) => { const a = (i / 16) * TAU; return box([0, Math.cos(a) * 0.86, Math.sin(a) * 0.86], [1.4, 0.03, 0.03]); });
    const coils = range(12, (i) => {
      const a = (i / 12) * TAU;
      return torus([0, Math.cos(a) * 0.55, Math.sin(a) * 0.55], [0, Math.cos(a), Math.sin(a)], 0.12, 0.05);
    });
    return [
      part('Housing', 'finned aluminium shell sheds heat', '#b8c7d9', [revolve([-0.75, 0, 0], 'x', 1.5, () => 0.8), fins], { explode: [0, 1.3, 0], density: 0.8 }),
      part('Stator', 'stationary steel teeth', '#8fa0b8', gear([0, 0, 0], 'x', 0.66, 12, { depth: 0.08, thick: 1.0, hole: 0.42 }), { explode: [0, 0, 0] }),
      part('Copper windings', 'electromagnets that pull the rotor', '#ff9f43', coils, { explode: [0, 0, 0], spread: 0.6 }),
      part('Rotor', 'spins on permanent magnets', '#ff5a8a', [range(9, (i) => disk([-0.42 + i * 0.105, 0, 0], 'x', 0.38, 0.06)), revolve([-0.45, 0, 0], 'x', 0.9, () => 0.38)], { explode: [-0.9, -0.5, 0] }),
      part('Magnets', 'neodymium N/S pairs', '#c3a6ff', range(8, (i) => { const a = (i / 8) * TAU; return box([0, Math.cos(a) * 0.4, Math.sin(a) * 0.4], [0.85, 0.05, 0.12]); }), { explode: [-0.9, -0.5, 0], spread: 0.6 }),
      part('Shaft', 'delivers the torque', '#ffffff', tube([-1.4, 0, 0], [1.3, 0, 0], 0.06), { explode: [-1.6, -0.5, 0] }),
      part('Bearings', 'let the shaft spin freely', '#ffd166', [torus([0.82, 0, 0], 'x', 0.1, 0.04), torus([-0.82, 0, 0], 'x', 0.1, 0.04)], { explode: [0, -0.5, 0], spread: 1.2 }),
      part('Cooling fan', 'pulls air across the fins', '#7fd1ff', bladeDisk(1.0, 0.6, 9, { hub: 0.08, depth: 0.08 }), { explode: [1.2, 0, 0] }),
      part('End caps', 'hold the bearings in place', '#e0e6ef', [disk([0.78, 0, 0], 'x', 0.8, 0.1), disk([-0.78, 0, 0], 'x', 0.8, 0.1)], { explode: [0, 0, 0], spread: 1.0 }),
    ];
  },
};

export default [jet, inline4, rocketEngine, motor];
