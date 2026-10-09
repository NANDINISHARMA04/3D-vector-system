import {
  ellipsoid, sphere, tube, curve, revolve, disk, torus, both, fuzz, group, mulberry32,
} from '../shapes.js';
import { part, range } from './common.js';

const CAT = 'Anatomy';

// ---------------------------------------------------------------- skeleton
// Body coordinates: y = 0 (soles) .. 18 (crown), +x = figure's left, +z = front.
function skeletonPieces() {
  const ribs = range(10, (i) => {
    const y = 14.0 - i * 0.42;
    const k = 0.72 + 0.28 * Math.sin((Math.PI * (i + 1.5)) / 12);
    const rx = 1.55 * k;
    const rz = 1.05 * k;
    const pts = range(13, (j) => {
      const a = -Math.PI * 0.92 + (j / 12) * Math.PI * 1.84;
      return [Math.sin(a) * rx, y - 0.35 * (1 - Math.cos(a)) * 0.5, -0.35 + Math.cos(a) * rz * -1 + 0.0];
    });
    return curve(pts.map(([x, yy, z]) => [x, yy, -z - 0.25]), 0.07);
  });
  return {
    skull: [
      ellipsoid([0, 16.75, 0], [0.92, 1.1, 1.05], { where: (p) => p[1] > 16.0 || p[2] < 0.2 }),
      ellipsoid([0, 15.95, 0.35], [0.7, 0.45, 0.6], { where: (p) => p[1] < 16.1 }),
      both((s) => torus([s * 0.35, 16.45, 0.92], 'z', 0.2, 0.05)),
    ],
    spine: [
      curve([[0, 15.4, -0.25], [0, 14.2, -0.5], [0, 12.6, -0.6], [0, 11.0, -0.4], [0, 9.6, -0.55], [0, 8.9, -0.45]], 0.2),
      range(24, (i) => sphere([0, 15.2 - i * 0.26, -0.75 + Math.sin(i * 0.22) * 0.12], 0.11)),
    ],
    ribs: [ribs, tube([0, 14.2, 1.0], [0, 11.9, 1.05], 0.12), both((s) => tube([s * 0.25, 14.55, 0.6], [s * 2.0, 14.7, -0.05], 0.09))],
    pelvis: [
      both((s) => ellipsoid([s * 1.0, 9.55, -0.05], [0.8, 0.65, 0.35])),
      torus([0, 8.9, 0.1], 'y', 0.85, 0.2),
      sphere([0, 9.2, -0.45], 0.3),
    ],
    arms: both((s) => [
      tube([s * 2.15, 14.45, 0], [s * 2.85, 11.1, 0], 0.16, 0.13),
      tube([s * 2.85, 11.0, 0.05], [s * 3.35, 8.2, 0.15], 0.1, 0.08),
      tube([s * 2.8, 11.0, -0.08], [s * 3.25, 8.2, -0.05], 0.09, 0.08),
      sphere([s * 2.15, 14.45, 0], 0.25),
    ]),
    hands: both((s) =>
      range(5, (f) => {
        const spread = (f - 2) * 0.12;
        return curve([[s * 3.3, 8.1, 0.05], [s * (3.42 + spread * 0.4), 7.5, 0.05 + spread], [s * (3.5 + spread * 0.5), 6.9 + (f === 0 ? 0.3 : 0), 0.1 + spread * 1.3]], 0.05);
      }),
    ),
    legs: both((s) => [
      tube([s * 1.05, 8.9, 0], [s * 1.18, 4.9, 0.1], 0.21, 0.17),
      sphere([s * 1.18, 4.75, 0.32], 0.17),
      tube([s * 1.2, 4.6, 0.05], [s * 1.2, 0.9, 0], 0.16, 0.11),
      tube([s * 1.42, 4.5, -0.05], [s * 1.35, 0.95, -0.05], 0.07),
      sphere([s * 1.05, 8.95, 0], 0.27),
    ]),
    feet: both((s) => [
      ellipsoid([s * 1.22, 0.5, -0.1], [0.22, 0.25, 0.28]),
      range(5, (t) => tube([s * (1.08 + t * 0.08), 0.42, 0.05], [s * (1.0 + t * 0.12), 0.18, 1.2 - t * 0.08], 0.05)),
    ]),
  };
}

function skinShapes() {
  return [
    ellipsoid([0, 16.6, 0.05], [1.05, 1.3, 1.15]),
    tube([0, 15.0, 0], [0, 15.6, 0], 0.55, 0.5),
    ellipsoid([0, 12.4, 0], [2.25, 2.9, 1.25]),
    ellipsoid([0, 9.6, 0], [2.0, 1.35, 1.15]),
    both((s) => [
      tube([s * 2.25, 14.3, 0], [s * 2.95, 11.0, 0], 0.55, 0.42),
      tube([s * 2.95, 11.0, 0], [s * 3.45, 8.1, 0.1], 0.42, 0.32),
      ellipsoid([s * 3.5, 7.5, 0.1], [0.28, 0.6, 0.18]),
      tube([s * 1.05, 8.9, 0], [s * 1.2, 4.8, 0.1], 0.9, 0.55),
      tube([s * 1.2, 4.8, 0.1], [s * 1.2, 0.8, 0], 0.55, 0.32),
      ellipsoid([s * 1.22, 0.35, 0.45], [0.35, 0.25, 0.75]),
    ]),
  ];
}

function arteryPaths(dx = 0, dz = 0) {
  const o = ([x, y, z]) => [x + dx * Math.sign(x || 1), y, z + dz];
  return [
    curve([[0.3, 12.6, 0.4], [0.1, 13.5, 0.2], [-0.2, 13.7, -0.1], [0, 12.8, -0.25], [0, 11.0, -0.2], [0, 9.5, 0]].map(o), 0.11),
    both((s) => [
      curve([[0, 9.5, 0], [s * 0.7, 9.0, 0.2], [s * 1.15, 7.0, 0.25], [s * 1.2, 4.8, 0.2], [s * 1.25, 2.5, 0.05], [s * 1.2, 0.9, 0.05]].map(o), 0.08),
      curve([[s * 0.2, 13.7, 0], [s * 1.0, 14.0, 0.1], [s * 2.2, 14.1, 0.1], [s * 2.85, 11.0, 0.15], [s * 3.3, 8.3, 0.2]].map(o), 0.07),
      curve([[s * 0.15, 13.7, 0.1], [s * 0.35, 15.0, 0.2], [s * 0.45, 16.0, 0.35]].map(o), 0.07),
    ]),
  ];
}

function nerves() {
  return [
    curve([[0, 16.0, -0.1], [0, 15.2, -0.35], [0, 13.0, -0.45], [0, 11.0, -0.3], [0, 9.3, -0.4]], 0.07),
    both((s) => [
      curve([[0, 14.0, -0.4], [s * 1.2, 14.0, -0.1], [s * 2.3, 13.8, -0.05], [s * 2.9, 11.0, -0.1], [s * 3.4, 8.0, 0]], 0.04),
      curve([[0, 9.4, -0.4], [s * 0.8, 8.7, -0.3], [s * 1.0, 6.5, -0.25], [s * 1.15, 4.5, -0.2], [s * 1.25, 1.0, -0.1]], 0.045),
      range(5, (i) => curve([[0, 13.6 - i * 0.6, -0.4], [s * 0.9, 13.4 - i * 0.6, 0.2], [s * 1.5, 13.2 - i * 0.65, 0.3]], 0.025)),
    ]),
  ];
}

function intestines() {
  const pts = [];
  for (let row = 0; row < 5; row++) {
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      const x = (row % 2 ? 1 - t : t) * 2.0 - 1.0;
      pts.push([x * 0.85, 10.4 - row * 0.3 + Math.sin(t * Math.PI * 3) * 0.08, 0.55 + Math.cos(t * 7 + row) * 0.12]);
    }
  }
  const colon = curve([[-1.05, 8.9, 0.4], [-1.1, 10.6, 0.4], [0, 10.75, 0.6], [1.1, 10.6, 0.4], [1.05, 8.9, 0.4], [0.3, 8.6, 0.3]], 0.2);
  return [curve(pts, 0.13), colon];
}

const humanBody = {
  id: 'human-body',
  name: 'Human Body',
  category: CAT,
  subtitle: '11 organ systems · 37 trillion cells',
  build() {
    const sk = skeletonPieces();
    return [
      part('Brain', 'control centre: 86 billion neurons', '#ff9ad5', ellipsoid([0, 16.95, 0], [0.82, 0.68, 0.98], { wrinkle: 0.06 }), { explode: [0, 2.6, 0] }),
      part('Lungs', 'swap carbon dioxide for oxygen', '#9cd7ff', both((s) => ellipsoid([s * 0.85, 13.1, 0], [0.75, 1.35, 0.7])), { explode: [-1.4, 1.2, 1.2], spread: 0.6 }),
      part('Heart', 'pumps ~7,000 litres of blood a day', '#ff4d5e', ellipsoid([0.3, 12.55, 0.45], [0.48, 0.58, 0.45]), { explode: [1.4, 1.0, 1.4] }),
      part('Liver', '500+ jobs: filters, stores, makes bile', '#d8705a', ellipsoid([-0.65, 11.15, 0.25], [1.15, 0.55, 0.75]), { explode: [-2.0, 0.2, 1.2] }),
      part('Stomach', 'acid bath that starts digestion', '#ffb36b', ellipsoid([0.8, 10.95, 0.35], [0.65, 0.48, 0.5]), { explode: [2.0, 0.2, 1.2] }),
      part('Intestines', '7 m that absorb the nutrients', '#ffd28a', intestines(), { explode: [1.2, -1.4, 1.4] }),
      part('Kidneys', 'filter the blood, make urine', '#ff7a7a', both((s) => ellipsoid([s * 0.85, 10.1, -0.5], [0.3, 0.48, 0.28])), { explode: [-2.0, -0.6, 0.6], spread: 0.5 }),
      part('Bladder', 'stores ~0.5 L of urine', '#ffe08a', sphere([0, 8.55, 0.45], 0.35), { explode: [1.8, -2.2, 0.8] }),
      part('Nervous system', 'brain, spinal cord and 72 km of nerves', '#ffe66d', nerves(), { explode: [-3.4, 0.4, -0.5], density: 0.8 }),
      part('Arteries', 'carry oxygen-rich blood away from the heart', '#ff5a6a', arteryPaths(), { explode: [3.6, 0, 0], density: 0.8 }),
      part('Veins', 'return blood to the heart', '#5f8dff', arteryPaths(0.18, -0.15), { explode: [4.8, 0, 0], density: 0.8 }),
      part('Skeleton', '206 bones: frame, levers and blood factory', '#f4f1ea', Object.values(sk), { explode: [-7.5, 0, 0], density: 1.6 }),
      part('Skin', 'largest organ: shields, senses, cools', '#e8b9a0', skinShapes(), { explode: [7.5, 0, 0], density: 0.9 }),
    ];
  },
};

const skeleton = {
  id: 'skeleton',
  name: 'Skeleton',
  category: CAT,
  subtitle: '206 bones · 360 joints',
  explodeScale: 0.45,
  build() {
    const sk = skeletonPieces();
    const c = '#f4f1ea';
    return [
      part('Skull', '22 bones fused to guard the brain', c, sk.skull, { explode: [0, 2.0, 0] }),
      part('Spine', '33 vertebrae, S-shaped shock absorber', '#e9e2d0', sk.spine, { explode: [0, 0.4, -1.6] }),
      part('Rib cage', '12 pairs of ribs shield heart and lungs', '#fff6e0', sk.ribs, { explode: [0, 0.6, 1.6], spread: 0.25 }),
      part('Pelvis', 'bowl that carries the upper body', '#efe4cc', sk.pelvis, { explode: [0, -0.6, 1.0] }),
      part('Arms', 'humerus, radius and ulna', '#f8f0e0', sk.arms, { explode: [0, 0, 0], spread: 0.3 }),
      part('Hands', '27 bones each for fine motion', '#ffe9c4', sk.hands, { explode: [0, -0.8, 0], spread: 0.35 }),
      part('Legs', 'femur: the longest, strongest bone', '#f6ecd8', sk.legs, { explode: [0, -1.0, 0], spread: 0.15 }),
      part('Feet', '26 bones, 33 joints per foot', '#ffe2b0', sk.feet, { explode: [0, -1.8, 0.6], spread: 0.3 }),
    ];
  },
};

const brain = {
  id: 'brain',
  name: 'Human Brain',
  category: CAT,
  subtitle: '86 billion neurons · 20 W',
  build() {
    const cere = (where) => ellipsoid([0, 0, 0], [1.0, 0.85, 1.25], { wrinkle: 0.055, where: (p) => Math.abs(p[0]) > 0.05 && p[1] > -0.55 && where(p) });
    const temporal = (p) => p[1] < -0.05 && p[2] > -0.6 && p[2] < 0.55;
    const frontal = (p) => !temporal(p) && p[2] > 0.35;
    const occipital = (p) => !temporal(p) && p[2] < -0.6;
    const parietal = (p) => !temporal(p) && !frontal(p) && !occipital(p);
    return [
      part('Frontal lobe', 'planning, decisions, personality', '#ff8ad8', cere(frontal), { explode: [0, 0.3, 1.0] }),
      part('Parietal lobe', 'touch, space and numbers', '#b18cff', cere(parietal), { explode: [0, 1.0, -0.2] }),
      part('Temporal lobe', 'hearing, language and memory', '#7fd1ff', cere(temporal), { explode: [0, -0.3, 0.3], spread: 0.6 }),
      part('Occipital lobe', 'vision processing', '#4fd1a5', cere(occipital), { explode: [0, 0.2, -1.0] }),
      part('Cerebellum', 'balance and coordination', '#ffd166', ellipsoid([0, -0.62, -0.8], [0.68, 0.32, 0.42], { wrinkle: 0.04 }), { explode: [0, -0.7, -1.0] }),
      part('Brain stem', 'breathing, heartbeat, reflexes', '#ff9f43', tube([0, -0.45, -0.4], [0, -1.6, -0.55], 0.22, 0.15), { explode: [0, -1.3, 0] }),
      part('Corpus callosum', '200M fibres bridging the hemispheres', '#ffffff', ellipsoid([0, 0.05, -0.05], [0.06, 0.18, 0.7], { solid: true }), { explode: [0, 0.4, 0], density: 0.6 }),
    ];
  },
};

const heart = {
  id: 'heart',
  name: 'Human Heart',
  category: CAT,
  subtitle: '4 chambers · 100,000 beats a day',
  build() {
    // Vessels hugging the ventricle surface, curling down towards the apex.
    const coronary = (phase) =>
      curve(range(10, (i) => {
        const t = i / 9;
        const theta = 0.35 + t * 2.2; // from the top towards the apex
        const a = phase + t * 0.8;
        const r = Math.sin(theta);
        return [-0.05 + Math.sin(a) * r * 0.98, -0.3 + Math.cos(theta) * 1.12, 0.12 + Math.cos(a) * r * 0.84];
      }), 0.04);
    return [
      part('Left ventricle', 'pumps blood to the whole body', '#ff4d5e', ellipsoid([0.35, -0.4, -0.05], [0.72, 1.05, 0.72]), { explode: [0.9, -0.5, 0] }),
      part('Right ventricle', 'pumps blood to the lungs', '#d94a7a', ellipsoid([-0.42, -0.25, 0.3], [0.68, 0.88, 0.58]), { explode: [-0.9, -0.5, 0.4] }),
      part('Left atrium', 'receives fresh blood from the lungs', '#ff7a7a', sphere([0.45, 0.7, -0.35], 0.5), { explode: [0.9, 0.6, -0.4] }),
      part('Right atrium', 'receives used blood from the body', '#c46aa8', sphere([-0.62, 0.62, 0], 0.54), { explode: [-1.0, 0.6, 0] }),
      part('Aorta', 'largest artery, 2.5 cm wide', '#ff5a4f', curve([[0.12, 0.4, 0], [0.1, 1.4, 0.05], [-0.2, 1.95, -0.2], [-0.6, 1.8, -0.6], [-0.55, 1.0, -0.9], [-0.5, -0.5, -0.95]], 0.22), { explode: [0, 1.2, -0.3] }),
      part('Pulmonary artery', 'carries blood to the lungs', '#6f8cff', [curve([[-0.15, 0.45, 0.45], [0.05, 1.25, 0.45], [0.5, 1.45, 0.15], [1.0, 1.35, -0.2]], 0.17), curve([[0.2, 1.4, 0.35], [-0.4, 1.5, 0.1], [-1.0, 1.4, -0.1]], 0.13)], { explode: [0.3, 1.0, 0.8] }),
      part('Vena cava', 'returns blood from the body', '#4a6bff', [tube([-0.78, 0.8, 0], [-0.82, 2.0, 0], 0.17), tube([-0.7, 0.2, -0.2], [-0.7, -1.3, -0.3], 0.18)], { explode: [-1.4, 0.2, -0.4] }),
      part('Pulmonary veins', 'bring oxygen-rich blood back', '#ff9a8a', both((s) => tube([0.45 + s * 0.25, 0.7, -0.6], [0.45 + s * 0.9, 0.85, -0.9], 0.07)), { explode: [0.8, 0.4, -1.0] }),
      part('Coronary arteries', 'feed the heart muscle itself', '#ffd166', [coronary(-0.3), coronary(0.9), coronary(2.2)], { explode: [0, 0, 0.6], spread: 0.25 }),
    ];
  },
};

const lungs = {
  id: 'lungs',
  name: 'Lungs',
  category: CAT,
  subtitle: '480 million alveoli · 11,000 L of air a day',
  build() {
    const rand = mulberry32(7);
    const tree = [];
    function branch(p, dir, len, r, depth) {
      const end = [p[0] + dir[0] * len, p[1] + dir[1] * len, p[2] + dir[2] * len];
      tree.push(tube(p, end, r, r * 0.75));
      if (depth === 0) return;
      for (const s of [-1, 1]) {
        const d = [dir[0] + s * 0.45 + (rand() - 0.5) * 0.3, dir[1] - 0.25 + (rand() - 0.5) * 0.3, dir[2] + (rand() - 0.5) * 0.7];
        const l = Math.hypot(...d);
        branch(end, d.map((x) => x / l), len * 0.72, r * 0.7, depth - 1);
      }
    }
    for (const s of [-1, 1]) branch([s * 0.35, 0.95, 0], [s * 0.6, -0.8, 0], 0.45, 0.07, 4);
    return [
      part('Trachea', 'windpipe ringed with cartilage', '#e8f1ff', [tube([0, 1.0, 0], [0, 2.2, 0], 0.13), range(7, (i) => torus([0, 1.1 + i * 0.16, 0], 'y', 0.14, 0.025))], { explode: [0, 0.8, 0] }),
      part('Bronchi', 'airways that branch 23 times', '#7fd1ff', [curve([[0, 1.05, 0], [-0.25, 0.95, 0], [-0.4, 0.8, 0]], 0.09), curve([[0, 1.05, 0], [0.25, 0.95, 0], [0.4, 0.8, 0]], 0.09)], { explode: [0, 0.4, 0.4] }),
      part('Bronchial tree', 'ends in tiny air sacs: alveoli', '#ffd6e6', tree, { explode: [0, 0, 1.0], spread: 0.15 }),
      part('Right lung', '3 lobes, slightly larger', '#ff8fa3', ellipsoid([-0.72, -0.05, 0], [0.6, 1.15, 0.55], { where: (p) => p[0] < -0.14 }), { explode: [-1.1, 0, 0] }),
      part('Left lung', '2 lobes, notch for the heart', '#ff6b8b', ellipsoid([0.72, -0.05, 0], [0.58, 1.12, 0.55], { where: (p) => p[0] > 0.14 && !(p[0] < 0.55 && p[1] < -0.2 && p[2] > 0) }), { explode: [1.1, 0, 0] }),
      part('Heart', 'nestled in the cardiac notch', '#ff4d4d', ellipsoid([0.22, -0.45, 0.35], [0.38, 0.42, 0.35]), { explode: [0.3, -0.3, 1.0] }),
      part('Diaphragm', 'the muscle that powers each breath', '#ffb36b', revolve([0, -1.25, 0], 'y', 0.35, (t) => 1.35 * Math.sqrt(1 - t * t * 0.85)), { explode: [0, -0.9, 0], density: 0.7 }),
    ];
  },
};

const kidney = {
  id: 'kidney',
  name: 'Kidney',
  category: CAT,
  subtitle: '1 million nephrons · 180 L filtered a day',
  build() {
    const hilum = (p) => !(p[0] > 0.3 && Math.abs(p[1]) < 0.38);
    const pyramids = range(7, (i) => {
      const a = (i / 6 - 0.5) * Math.PI * 1.25;
      const outer = [-Math.cos(a) * 0.55, Math.sin(a) * 0.95, 0];
      return tube(outer, [0.15, outer[1] * 0.25, 0], 0.17, 0.03);
    });
    return [
      part('Cortex', 'outer layer where filtering begins', '#ff6b6b', ellipsoid([0, 0, 0], [0.7, 1.2, 0.45], { where: hilum }), { spread: 0.25, explode: [-0.3, 0, 0] }),
      part('Medulla', 'pyramids that concentrate urine', '#ffa07a', pyramids, { explode: [0, 0, 0.9] }),
      part('Renal pelvis', 'funnel that collects urine', '#ffd166', ellipsoid([0.35, 0, 0], [0.25, 0.42, 0.2]), { explode: [0.7, 0, 0.6] }),
      part('Ureter', '25 cm tube down to the bladder', '#ffe9a8', curve([[0.5, -0.1, 0], [0.8, -0.5, 0], [0.75, -1.4, 0], [0.6, -2.3, 0]], 0.07), { explode: [0.6, -0.6, 0] }),
      part('Renal artery', 'brings 20% of the heart\'s output', '#ff4d5e', curve([[0.3, 0.12, 0.08], [0.9, 0.2, 0.1], [1.7, 0.25, 0.1]], 0.08), { explode: [0.9, 0.5, 0.3] }),
      part('Renal vein', 'returns filtered blood', '#5f8dff', curve([[0.3, -0.05, -0.08], [0.9, -0.05, -0.12], [1.7, -0.02, -0.12]], 0.09), { explode: [0.9, 0, -0.5] }),
      part('Adrenal gland', 'makes adrenaline and cortisol', '#ffb46b', ellipsoid([-0.1, 1.3, 0], [0.42, 0.2, 0.25]), { explode: [0, 0.8, 0] }),
    ];
  },
};

const eye = {
  id: 'eye',
  name: 'Human Eye',
  category: CAT,
  subtitle: '576 megapixels · 130 million photoreceptors',
  build() {
    return [
      part('Sclera', 'tough white outer coat', '#f2efe8', sphere([0, 0, 0], 1, { where: (p) => p[2] < 0.72 }), { spread: 0.25, explode: [0, 0, -0.3] }),
      part('Cornea', 'clear dome doing 2/3 of the focusing', '#a8e4ff', sphere([0, 0, 0.42], 0.62, { where: (p) => p[2] > 0.84 }), { explode: [0, 0, 1.6] }),
      part('Iris', 'coloured muscle that sizes the pupil', '#4f8fd6', disk([0, 0, 0.8], 'z', 0.55, 0.2), { explode: [0, 0, 1.1] }),
      part('Lens', 'flexes to focus near and far', '#fff4b0', ellipsoid([0, 0, 0.6], [0.42, 0.42, 0.17], { solid: true }), { explode: [0, 0, 0.7] }),
      part('Vitreous humour', 'clear gel that keeps the eye round', '#6fc3ff', sphere([0, 0, 0], 0.88, { solid: true, where: (p) => p[2] < 0.45 }), { explode: [0, 0, 0], density: 0.35 }),
      part('Retina', 'light-sensing layer of rods and cones', '#ff7a59', sphere([0, 0, 0], 0.95, { where: (p) => p[2] < 0.25 }), { explode: [0, 0, -0.8] }),
      part('Optic nerve', '1.2 million fibres to the brain', '#ffd166', tube([0.1, 0, -0.95], [0.3, 0, -2.3], 0.17, 0.15), { explode: [0, 0, -1.4] }),
      part('Eye muscles', 'six muscles aim the eye', '#d65a5a', [tube([0, 0.95, -0.15], [0.05, 0.6, -2.1], 0.11), tube([0, -0.95, -0.15], [0.05, -0.6, -2.1], 0.11), tube([0.95, 0, -0.15], [0.6, 0.05, -2.1], 0.11), tube([-0.95, 0, -0.15], [-0.6, 0.05, -2.1], 0.11)], { explode: [0, 0, -0.6], spread: 0.5 }),
    ];
  },
};

const ear = {
  id: 'ear',
  name: 'Human Ear',
  category: CAT,
  subtitle: 'hears 20 Hz – 20 kHz · smallest bones in the body',
  build() {
    const pinna = range(14, (i) => {
      const a = -0.6 + (i / 13) * Math.PI * 1.55;
      return [-1.35 - Math.sin(a * 2) * 0.05, Math.sin(a) * 0.95 + 0.15, Math.cos(a) * 0.65 - 0.05];
    });
    const spiral = range(48, (i) => {
      const t = i / 47;
      const a = t * Math.PI * 5;
      const r = 0.36 * (1 - t * 0.75);
      return [0.65 + t * 0.25, -0.3 + Math.cos(a) * r, Math.sin(a) * r];
    });
    return [
      part('Outer ear', 'funnels sound into the canal', '#ffb38a', [curve(pinna, 0.14), ellipsoid([-1.32, 0.1, 0], [0.08, 0.55, 0.35])], { explode: [-1.0, 0, 0] }),
      part('Ear canal', '2.5 cm tube that resonates', '#ffcf9f', curve([[-1.25, 0, 0], [-0.8, 0.06, 0], [-0.4, -0.05, 0], [-0.1, 0, 0]], 0.13), { explode: [-0.5, 0, 0] }),
      part('Eardrum', 'vibrates with incoming sound', '#ffd166', disk([-0.04, 0, 0], [1, 0, 0.25], 0.17), { explode: [-0.15, 0.4, 0] }),
      part('Ossicles', 'hammer, anvil, stirrup amplify 20×', '#ffffff', [curve([[0.0, 0.12, 0], [0.12, 0.22, 0], [0.22, 0.1, 0.02]], 0.035), curve([[0.22, 0.1, 0.02], [0.3, -0.05, 0], [0.38, -0.08, 0]], 0.03), torus([0.42, -0.1, 0], 'x', 0.05, 0.015)], { explode: [0, 0.8, 0.3] }),
      part('Semicircular canals', 'three loops that sense balance', '#7fd1ff', [torus([0.5, 0.32, 0], 'x', 0.2, 0.03), torus([0.5, 0.32, 0], 'y', 0.2, 0.03), torus([0.5, 0.32, 0], 'z', 0.2, 0.03)], { explode: [0.3, 0.9, 0] }),
      part('Cochlea', 'snail-shaped organ of hearing', '#ff7aa8', curve(spiral, 0.075, { r1: 0.03 }), { explode: [0.4, -0.7, 0.3] }),
      part('Auditory nerve', 'carries sound signals to the brain', '#ffe08a', curve([[0.85, -0.3, 0], [1.1, -0.2, 0.1], [1.5, -0.05, 0.25]], 0.06), { explode: [1.0, 0, 0] }),
      part('Eustachian tube', 'equalises pressure with the throat', '#c3a6ff', curve([[0.1, -0.15, 0], [0.3, -0.6, 0.3], [0.5, -1.1, 0.7]], 0.06, { r1: 0.1 }), { explode: [0, -0.8, 0.6] }),
    ];
  },
};

const tooth = {
  id: 'tooth',
  name: 'Tooth (Molar)',
  category: CAT,
  subtitle: 'enamel: the hardest substance in the body',
  build() {
    const roots = [[-0.45, -0.3], [0.45, -0.3], [0, 0.45]].map(([x, z]) =>
      curve([[x * 0.8, 0.1, z * 0.8], [x * 1.0, -1.2, z], [x * 1.15, -2.6, z * 1.1]], 0.36, { r1: 0.08 }));
    return [
      part('Enamel', 'mineral shell over the crown', '#f7f7ff', [revolve([0, 0.65, 0], 'y', 0.75, (t) => 0.98 - 0.12 * t * t), [-1, 1].flatMap((sx) => [-1, 1].map((sz) => sphere([sx * 0.4, 1.4, sz * 0.4], 0.4, { where: (p) => p[1] > 1.35 })))], { explode: [0, 1.2, 0], spread: 0.15 }),
      part('Dentin', 'living layer under the enamel', '#f0d9a8', revolve([0, -0.3, 0], 'y', 1.75, (t) => 0.62 + 0.2 * t), { explode: [0, 0.4, 0.9] }),
      part('Pulp', 'nerves and blood vessels inside', '#ff6b81', [ellipsoid([0, 0.55, 0], [0.35, 0.35, 0.35], { solid: true }), [[-0.45, -0.3], [0.45, -0.3], [0, 0.45]].map(([x, z]) => curve([[x * 0.4, 0.4, z * 0.4], [x * 0.95, -1.2, z * 0.95], [x * 1.12, -2.5, z * 1.08]], 0.07))], { explode: [0, 0, 1.4] }),
      part('Roots', 'anchor the tooth in the jawbone', '#e9cf9a', roots, { explode: [0, -1.0, 0], spread: 0.3 }),
      part('Gum', 'soft tissue sealing around the neck', '#ff8fa3', torus([0, 0.1, 0], 'y', 1.0, 0.32), { explode: [0, -0.2, 0], spread: 0.45 }),
      part('Jawbone', 'alveolar bone sockets', '#d8d0c0', fuzz(revolve([0, -2.8, 0], 'y', 2.4, () => 1.35), 0.05), { explode: [0, -1.4, -0.6], density: 0.4 }),
    ];
  },
};

const skull = {
  id: 'skull',
  name: 'Skull',
  category: CAT,
  subtitle: '22 bones · 1 moving joint',
  build() {
    const teeth = (y, sign) => range(14, (i) => {
      const a = (i / 13 - 0.5) * Math.PI * 0.95;
      return ellipsoid([Math.sin(a) * 0.55, y, 0.35 + Math.cos(a) * 0.55], [0.06, 0.1 * sign, 0.06]);
    });
    return [
      part('Cranium', 'eight plates fused into a helmet', '#f5f0e6', ellipsoid([0, 0.35, -0.1], [0.95, 1.0, 1.15], { where: (p) => p[1] > -0.1 || p[2] < -0.35 }), { explode: [0, 1.0, -0.4], spread: 0.1 }),
      part('Eye sockets', 'orbits that cradle the eyes', '#ffd166', both((s) => torus([s * 0.37, -0.02, 0.92], 'z', 0.24, 0.06)), { explode: [0, 0.2, 0.9], spread: 0.3 }),
      part('Nasal cavity', 'warms and filters each breath', '#ff9f43', [tube([0, 0.0, 1.06], [-0.18, -0.42, 1.0], 0.04), tube([0, 0.0, 1.06], [0.18, -0.42, 1.0], 0.04), tube([-0.18, -0.42, 1.0], [0.18, -0.42, 1.0], 0.04)], { explode: [0, -0.1, 1.2] }),
      part('Cheekbones', 'zygomatic arches', '#e9d8b8', both((s) => curve([[s * 0.55, -0.3, 0.75], [s * 0.85, -0.25, 0.3], [s * 0.88, -0.2, -0.1]], 0.08)), { explode: [0, 0, 0.3], spread: 0.6 }),
      part('Maxilla', 'upper jaw holding the top teeth', '#efe6d4', ellipsoid([0, -0.5, 0.42], [0.62, 0.32, 0.58], { where: (p) => p[2] > 0.25 }), { explode: [0, -0.3, 0.7] }),
      part('Upper teeth', '16 teeth in the upper arch', '#ffffff', teeth(-0.72, 1), { explode: [0, -0.5, 1.0] }),
      part('Lower teeth', '16 teeth in the lower arch', '#ffffff', teeth(-0.95, 1), { explode: [0, -1.0, 1.0] }),
      part('Mandible', 'the only skull bone that moves', '#e0d6c2', [curve(range(9, (i) => { const a = (i / 8 - 0.5) * Math.PI * 1.05; return [Math.sin(a) * 0.68, -1.1, 0.25 + Math.cos(a) * 0.62]; }), 0.1), both((s) => tube([s * 0.68, -1.05, -0.05], [s * 0.72, -0.35, -0.2], 0.09))], { explode: [0, -1.5, 0.6] }),
    ];
  },
};

// Head + torso only: context for systems that live in the trunk.
function torsoShapes() {
  return [
    ellipsoid([0, 16.6, 0.05], [1.05, 1.3, 1.15]),
    tube([0, 15.0, 0], [0, 15.6, 0], 0.55, 0.5),
    ellipsoid([0, 12.4, 0], [2.25, 2.9, 1.25]),
    ellipsoid([0, 9.6, 0], [2.0, 1.35, 1.15], { where: (p) => p[1] > 8.6 }),
  ];
}

const circulatory = {
  id: 'circulatory',
  name: 'Circulatory System',
  category: CAT,
  subtitle: 'heart, blood and 100,000 km of vessels',
  build() {
    return [
      part('Heart', 'the pump at the centre', '#ff4d5e', ellipsoid([0.3, 12.55, 0.45], [0.55, 0.65, 0.5]), { explode: [0, 1.6, 2.2] }),
      part('Arteries', 'carry blood away from the heart', '#ff5a6a', arteryPaths(), { explode: [-3.2, 0, 0], density: 1.2 }),
      part('Veins', 'carry blood back to the heart', '#5f8dff', arteryPaths(0.18, -0.15), { explode: [3.2, 0, 0], density: 1.2 }),
      part('Lungs', 'where blood picks up oxygen', '#9cd7ff', both((s) => ellipsoid([s * 0.9, 13.1, -0.1], [0.7, 1.3, 0.65])), { explode: [0, 1.2, -1.6], spread: 0.6, density: 0.6 }),
      part('Capillaries', 'tiny tubes reaching every cell', '#ff9fb0', fuzz(group(skinShapes()), 0.08), { explode: [6.8, 0, 0], density: 0.3 }),
    ];
  },
};

const digestive = {
  id: 'digestive',
  name: 'Digestive System',
  category: CAT,
  subtitle: 'a 9-metre food journey',
  build() {
    const [small, colon] = intestines();
    return [
      part('Mouth', 'where digestion begins', '#ff8fa3', [ellipsoid([0, 15.95, 0.95], [0.38, 0.14, 0.2]), torus([0, 15.95, 1.0], 'z', 0.3, 0.06)], { explode: [0, 1.4, 1.2] }),
      part('Salivary glands', 'make spit to soften food', '#ffd6a5', both((s) => ellipsoid([s * 0.62, 15.8, 0.35], [0.22, 0.3, 0.2])), { explode: [0, 1.2, 0.4], spread: 0.6 }),
      part('Oesophagus', 'food pipe to the stomach', '#ffb36b', curve([[0, 15.4, 0.3], [0, 14.2, 0.0], [0.05, 12.6, -0.1], [0.45, 11.6, 0.2]], 0.12), { explode: [-2.0, 0.6, 0.8] }),
      part('Stomach', 'churns food into soup', '#ff9f43', ellipsoid([0.85, 11.0, 0.35], [0.7, 0.55, 0.5]), { explode: [2.2, 0.4, 1.2] }),
      part('Liver', 'cleans blood and makes bile', '#d8705a', ellipsoid([-0.7, 11.3, 0.2], [1.2, 0.6, 0.8]), { explode: [-2.4, 0.4, 1.2] }),
      part('Gallbladder', 'stores bile for fatty food', '#7fd18b', ellipsoid([-0.45, 10.75, 0.75], [0.15, 0.22, 0.15]), { explode: [-1.4, -0.4, 2.2] }),
      part('Pancreas', 'makes juices and insulin', '#ffe08a', curve([[-0.3, 10.6, -0.15], [0.3, 10.55, -0.2], [1.0, 10.7, -0.25]], 0.16, { r1: 0.08 }), { explode: [1.8, -0.2, 2.0] }),
      part('Small intestine', 'soaks up the nutrients', '#ffc4d6', small, { explode: [0, -1.4, 2.0] }),
      part('Large intestine', 'takes back water', '#c39bff', [colon, tube([0.3, 8.6, 0.3], [0, 7.9, -0.1], 0.18)], { explode: [0, -1.0, -0.6], spread: 0.3 }),
      part('Body', 'your digestive system fits in here', '#e8b9a0', torsoShapes(), { explode: [0, 0, -1.2], density: 0.25 }),
    ];
  },
};

const nervous = {
  id: 'nervous',
  name: 'Nervous System',
  category: CAT,
  subtitle: 'the body’s super-fast messaging network',
  build() {
    const limbNerves = (pts, s) => curve(pts.map(([x, y, z]) => [s * x, y, z]), 0.05);
    const fingers = (s) => range(5, (f) => curve([[s * 3.35, 8.1, 0.05], [s * (3.45 + (f - 2) * 0.05), 7.4, 0.05 + (f - 2) * 0.12], [s * (3.5 + (f - 2) * 0.06), 6.9, 0.1 + (f - 2) * 0.16]], 0.025));
    const toes = (s) => range(5, (t) => curve([[s * 1.22, 0.6, 0], [s * (1.05 + t * 0.09), 0.25, 1.1 - t * 0.08]], 0.025));
    return [
      part('Brain', 'the control centre', '#ff9ad5', ellipsoid([0, 16.95, 0], [0.85, 0.7, 1.0], { wrinkle: 0.06 }), { explode: [0, 2.4, 0] }),
      part('Cerebellum', 'keeps you balanced', '#ffd166', ellipsoid([0, 16.15, -0.65], [0.55, 0.28, 0.35], { wrinkle: 0.04 }), { explode: [0, 1.6, -1.4] }),
      part('Spinal cord', 'the main message highway', '#ffe66d', curve([[0, 16.0, -0.3], [0, 15.2, -0.4], [0, 13.0, -0.5], [0, 11.0, -0.35], [0, 9.3, -0.45]], 0.1), { explode: [0, 0.6, -1.8] }),
      part('Arm nerves', 'carry touch from your hands', '#7fd1ff', both((s) => [limbNerves([[0, 14.0, -0.4], [1.2, 14.0, -0.1], [2.3, 13.8, -0.05], [2.9, 11.0, -0.1], [3.35, 8.1, 0.05]], s), fingers(s)]), { explode: [0, 0.4, 0], spread: 0.35 }),
      part('Leg nerves', 'the longest nerves in the body', '#4fd1a5', both((s) => [limbNerves([[0, 9.4, -0.4], [0.8, 8.7, -0.3], [1.0, 6.5, -0.25], [1.15, 4.5, -0.2], [1.22, 0.6, 0]], s), toes(s)]), { explode: [0, -0.8, 0], spread: 0.25 }),
      part('Rib nerves', 'help you breathe and feel your chest', '#c3a6ff', both((s) => range(8, (i) => curve([[0, 14.0 - i * 0.5, -0.45], [s * 1.1, 13.9 - i * 0.5, 0.0], [s * 1.6, 13.7 - i * 0.52, 0.55], [s * 0.6, 13.6 - i * 0.55, 1.05]], 0.03))), { explode: [0, 0, 1.6], spread: 0.15 }),
      part('Body', 'nerves reach every part of you', '#e8b9a0', skinShapes(), { explode: [0, 0, -1.2], density: 0.25 }),
    ];
  },
};

export default [brain, heart, kidney, lungs, eye, ear, tooth, skull, skeleton, humanBody, circulatory, digestive, nervous];
