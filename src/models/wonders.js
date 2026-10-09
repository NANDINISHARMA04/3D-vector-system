import {
  sphere, ellipsoid, tube, curve, revolve, disk, torus, box, pyramid, custom, group, rotY, rotZ, rotX, fuzz, mulberry32,
} from '../shapes.js';
import { part, range } from './common.js';

const CAT = 'Wonders';
const TAU = Math.PI * 2;

const greatPyramid = {
  id: 'pyramid',
  name: 'Great Pyramid',
  category: CAT,
  subtitle: 'Giza, 2560 BC · 2.3 million blocks',
  build() {
    const courses = range(14, (i) => {
      const y = (i + 1) * 0.1;
      const half = 1.15 * (1 - y / 1.46);
      return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b], k, arr) => {
        const [c, d] = arr[(k + 1) % 4];
        return tube([a * half, y, b * half], [c * half, y, d * half], 0.008);
      });
    });
    return [
      part('Outer casing', 'once polished white limestone', '#f0c97a', pyramid([0, 0, 0], 2.3, 1.46), { spread: 0.18, explode: [0, 0, 0] }),
      part('Block courses', '210 layers of stone', '#d8a85a', courses, { spread: 0.35, explode: [0, 0, 0], density: 0.5 }),
      part('Capstone', 'gilded pyramidion at the apex', '#ffd86b', pyramid([0, 1.32, 0], 0.2, 0.14), { explode: [0, 0.9, 0] }),
      part("King's Chamber", 'granite room with the sarcophagus', '#ff9f5a', box([0, 0.55, 0], [0.24, 0.13, 0.12]), { explode: [1.0, 0.45, 0.6] }),
      part("Queen's Chamber", 'smaller room on the central axis', '#ffbe7a', box([0, 0.27, 0], [0.16, 0.1, 0.16]), { explode: [-1.0, 0.1, 0.6] }),
      part('Grand Gallery', '47 m corbelled corridor', '#ffd29a', tube([0, 0.17, 0.55], [0, 0.5, 0.07], 0.035), { explode: [0, 0.3, 1.1] }),
      part('Subterranean chamber', 'unfinished room carved in bedrock', '#e07a4a', [tube([0, 0.22, 1.0], [0, -0.33, 0.2], 0.02), box([0, -0.37, 0.1], [0.22, 0.08, 0.16])], { explode: [0, -0.6, 0.8] }),
      part('Giza plateau', 'limestone bedrock foundation', '#a8875a', fuzz(disk([0, -0.02, 0], 'y', 2.2), 0.01), { explode: [0, -0.5, 0], density: 0.5 }),
    ];
  },
};

const eiffel = {
  id: 'eiffel',
  name: 'Eiffel Tower',
  category: CAT,
  subtitle: 'Paris, 1889 · 18,038 iron parts',
  build() {
    const corners = [[1, 1], [1, -1], [-1, -1], [-1, 1]];
    const legPath = ([sx, sz], ys, ws) => ys.map((y, i) => [sx * ws[i], y, sz * ws[i]]);
    const lower = corners.map((c) => curve(legPath(c, [0, 0.3, 0.6, 1.15], [0.85, 0.62, 0.45, 0.28]), 0.06));
    const upper = corners.map((c) => curve(legPath(c, [1.15, 1.7, 2.3, 2.65], [0.28, 0.16, 0.09, 0.07]), 0.03));
    const lattice = (y0, y1, w0, w1, n) => range(n, (i) => {
      const ya = y0 + ((y1 - y0) * i) / n;
      const yb = y0 + ((y1 - y0) * (i + 1)) / n;
      const wa = w0 + ((w1 - w0) * i) / n;
      const wb = w0 + ((w1 - w0) * (i + 1)) / n;
      return corners.map(([sx, sz], k) => {
        const [tx, tz] = corners[(k + 1) % 4];
        return [tube([sx * wa, ya, sz * wa], [tx * wb, yb, tz * wb], 0.012), tube([tx * wa, ya, tz * wa], [sx * wb, yb, sz * wb], 0.012)];
      });
    });
    const arches = corners.map(([sx, sz], k) => {
      const [tx, tz] = corners[(k + 1) % 4];
      return curve(range(9, (i) => {
        const t = i / 8;
        const w = 0.6;
        return [sx * w + (tx - sx) * w * t, 0.32 + Math.sin(t * Math.PI) * 0.2, sz * w + (tz - sz) * w * t];
      }), 0.025);
    });
    return [
      part('Legs', 'four curved iron piers on concrete', '#d08d4a', [lower, lattice(0, 0.6, 0.85, 0.45, 5)], { explode: [0, -0.4, 0], spread: 0.25 }),
      part('Arches', 'decorative arches under the first floor', '#ffb070', arches, { explode: [0, -0.1, 0], spread: 0.4 }),
      part('First floor', '57 m up, 4,200 m² deck', '#ffd38a', [box([0, 0.62, 0], [1.0, 0.06, 1.0]), lattice(0.6, 1.15, 0.45, 0.28, 4)], { explode: [0, 0.1, 0] }),
      part('Second floor', '115 m: the best view of Paris', '#ffe2a6', box([0, 1.16, 0], [0.6, 0.05, 0.6]), { explode: [0, 0.45, 0] }),
      part('Upper tower', 'tapering spire of wrought iron', '#e4a060', [upper, lattice(1.15, 2.6, 0.28, 0.07, 9)], { explode: [0, 0.8, 0] }),
      part('Summit', "Gustave Eiffel's apartment and antennas", '#fff0c8', [box([0, 2.68, 0], [0.16, 0.08, 0.16]), tube([0, 2.7, 0], [0, 3.1, 0], 0.015)], { explode: [0, 1.2, 0] }),
    ];
  },
};

const onion = (t) => 0.52 * Math.sqrt(Math.max(0, 1 - t * t)) * (1 + 0.38 * Math.sin(Math.PI * Math.min(1, t * 1.2)));

const tajMahal = {
  id: 'taj',
  name: 'Taj Mahal',
  category: CAT,
  subtitle: 'Agra, 1653 · 28 types of inlaid stone',
  build() {
    const chhatri = (x, z, s = 1) => [revolve([x, 1.0, z], 'y', 0.25 * s, (t) => onion(t) * 0.33 * s), range(4, (i) => tube([x + Math.cos(i * TAU / 4) * 0.1 * s, 0.9, z + Math.sin(i * TAU / 4) * 0.1 * s], [x + Math.cos(i * TAU / 4) * 0.1 * s, 1.02, z + Math.sin(i * TAU / 4) * 0.1 * s], 0.012))];
    const minaret = (x, z) => [
      tube([x, 0.2, z], [x, 1.9, z], 0.09, 0.065),
      [0.65, 1.15, 1.65].map((y) => torus([x, y, z], 'y', 0.11, 0.025)),
      revolve([x, 1.9, z], 'y', 0.18, (t) => onion(t) * 0.22),
    ];
    return [
      part('Main dome', '35 m onion dome of white marble', '#fff6ea', [revolve([0, 1.15, 0], 'y', 1.05, onion), tube([0, 0.9, 0], [0, 1.15, 0], 0.42)], { explode: [0, 0.9, 0] }),
      part('Finial', 'gilded crescent spire', '#ffd166', tube([0, 2.18, 0], [0, 2.45, 0], 0.02), { explode: [0, 1.4, 0] }),
      part('Mausoleum', 'octagonal tomb with great arches', '#f4efe6', [box([0, 0.55, 0], [1.4, 0.7, 1.4]), [0, 1, 2, 3].map((k) => rotY(curve(range(9, (i) => { const t = i / 8; return [-0.25 + t * 0.5, 0.25 + Math.sin(t * Math.PI) * 0.4, 0.71]; }), 0.02), (k * Math.PI) / 2))], { explode: [0, 0.2, 0] }),
      part('Chhatris', 'four domed kiosks', '#ffe9d0', [chhatri(0.5, 0.5), chhatri(-0.5, 0.5), chhatri(0.5, -0.5), chhatri(-0.5, -0.5)], { explode: [0, 0.5, 0], spread: 0.6 }),
      part('Minarets', '40 m towers leaning slightly outward', '#e9e1d4', [minaret(1.45, 1.45), minaret(-1.45, 1.45), minaret(1.45, -1.45), minaret(-1.45, -1.45)], { explode: [0, 0, 0], spread: 0.3 }),
      part('Plinth', 'raised marble platform', '#d8d0c4', box([0, 0.1, 0], [3.2, 0.2, 3.2]), { explode: [0, -0.4, 0], density: 0.7 }),
      part('Reflecting pool', 'mirrors the tomb in the garden', '#6fc3ff', box([0, -0.02, 2.7], [0.35, 0.02, 1.8]), { explode: [0, -0.4, 0.8], density: 0.6 }),
    ];
  },
};

const colosseum = {
  id: 'colosseum',
  name: 'Colosseum',
  category: CAT,
  subtitle: 'Rome, 80 AD · 50,000 spectators',
  build() {
    const RX = 1.6;
    const RZ = 1.3;
    const ruin = (a) => (Math.sin(a) > 0.55 && Math.cos(a) < 0 ? 0.62 : 1);
    const wall = custom(2 * Math.PI * 1.45 * 0.9, (rand) => {
      for (let i = 0; i < 30; i++) {
        const a = rand() * TAU;
        const y = rand() * 0.9;
        if (y > 0.9 * ruin(a)) continue;
        const tier = Math.floor(y / 0.225);
        const fy = (y - tier * 0.225) / 0.225;
        const fa = ((a / TAU) * 80) % 1;
        const inArch = tier < 3 && fy > 0.12 && fa > 0.25 && fa < 0.75 && (fy < 0.62 || Math.hypot((fa - 0.5) / 0.25, (fy - 0.62) / 0.26) < 1);
        if (!inArch) return [Math.cos(a) * RX, y, Math.sin(a) * RZ];
      }
      return [RX, 0, 0];
    });
    const seating = custom(5, (rand) => {
      const a = rand() * TAU;
      const t = rand();
      const step = Math.floor(t * 9) / 9;
      const r = 0.58 + t * 0.38;
      return [Math.cos(a) * RX * r, 0.08 + step * 0.62 * ruin(a), Math.sin(a) * RZ * r];
    });
    const hypogeum = range(7, (i) => box([(-0.6 + i * 0.2), -0.12, 0], [0.04, 0.2, 0.9]));
    return [
      part('Outer wall', 'travertine facade of 80 arches', '#e0ab70', wall, { spread: 0.18, explode: [0, 0, 0] }),
      part('Seating tiers', 'cavea: seats ranked by social class', '#c99560', seating, { explode: [0, 0.5, 0] }),
      part('Arena floor', 'wooden floor covered in sand', '#f0d39a', custom(3, (rand) => { const a = rand() * TAU; const r = Math.sqrt(rand()) * 0.55; return [Math.cos(a) * RX * r, 0.05, Math.sin(a) * RZ * r]; }), { explode: [0, 0.15, 0] }),
      part('Hypogeum', 'tunnels and lifts beneath the arena', '#ff9b5c', hypogeum, { explode: [0, -0.7, 0] }),
      part('Velarium masts', 'poles that held a giant sun awning', '#fff2d6', range(24, (i) => { const a = (i / 24) * TAU; const h = 0.9 * ruin(a); return tube([Math.cos(a) * RX * 1.01, h, Math.sin(a) * RZ * 1.01], [Math.cos(a) * RX * 1.01, h + 0.18, Math.sin(a) * RZ * 1.01], 0.01); }), { explode: [0, 0.9, 0], spread: 0.15 }),
    ];
  },
};

const stonehenge = {
  id: 'stonehenge',
  name: 'Stonehenge',
  category: CAT,
  subtitle: 'Wiltshire, 2500 BC · 25-tonne sarsens',
  build() {
    const ring = range(30, (i) => {
      const a = (i / 30) * TAU;
      return rotY(box([1.5, 0.42, 0], [0.16, 0.84, 0.3]), -a, [0, 0, 0]);
    });
    const lintels = range(30, (i) => {
      const a = ((i + 0.5) / 30) * TAU;
      return rotY(box([1.5, 0.89, 0], [0.12, 0.1, 0.33]), -a, [0, 0, 0]);
    });
    const trilithons = range(5, (i) => {
      const a = Math.PI * (0.2 + (i / 4) * 0.6) + Math.PI;
      const r = 0.85;
      const h = i === 2 ? 1.25 : 1.0;
      return rotY(group([box([r, h / 2, -0.18], [0.2, h, 0.22]), box([r, h / 2, 0.18], [0.2, h, 0.22]), box([r, h + 0.05, 0], [0.22, 0.1, 0.6])]), -a, [0, 0, 0]);
    });
    const blue = range(40, (i) => {
      const a = (i / 40) * TAU;
      return box([Math.cos(a) * 1.15, 0.2, Math.sin(a) * 1.15], [0.07, 0.4, 0.07]);
    });
    return [
      part('Sarsen circle', '30 giant uprights in a ring', '#c8c2b0', ring, { spread: 0.2, explode: [0, 0, 0] }),
      part('Lintels', 'joined with woodworking joints', '#e0dac8', lintels, { explode: [0, 0.6, 0], spread: 0.15 }),
      part('Trilithons', 'five great horseshoe arches', '#a8b4c4', trilithons, { explode: [0, 0.2, 0], spread: 0.3 }),
      part('Bluestones', 'hauled 240 km from Wales', '#7fa8d6', blue, { explode: [0, 0.0, 0], spread: 0.1 }),
      part('Altar stone', 'Welsh sandstone at the centre', '#ffd166', box([0, 0.05, -0.2], [0.45, 0.1, 0.12]), { explode: [0, 0.9, 0] }),
      part('Heel stone', 'aligns with the midsummer sunrise', '#ffb36b', box([0, 0.38, 2.7], [0.25, 0.76, 0.25]), { explode: [0, 0, 0.6] }),
      part('Earthwork', 'circular ditch and bank', '#7aa86a', torus([0, 0, 0], 'y', 2.2, 0.08), { explode: [0, -0.4, 0], density: 0.6 }),
    ];
  },
};

const pisa = {
  id: 'pisa',
  name: 'Leaning Tower of Pisa',
  category: CAT,
  subtitle: 'Pisa, 1372 · leans 3.97°',
  build() {
    const tilt = (s) => rotZ(s, -0.09, [0, 0, 0]);
    const R = 0.36;
    const story = (y0, h) => [
      tube([0, y0, 0], [0, y0 + h, 0], R * 0.8),
      torus([0, y0 + h, 0], 'y', R, 0.02),
      range(16, (i) => {
        const a = (i / 16) * TAU;
        return tube([Math.cos(a) * R, y0, Math.sin(a) * R], [Math.cos(a) * R, y0 + h, Math.sin(a) * R], 0.012);
      }),
    ];
    return [
      part('Ground floor', 'blind arcade of 15 marble arches', '#f4efe2', [tube([0, 0, 0], [0, 0.4, 0], R), torus([0, 0.4, 0], 'y', R, 0.025)].map(tilt), { explode: [0, -0.4, 0] }),
      part('Galleries', 'six open loggias of columns', '#e8e2d2', range(6, (i) => story(0.4 + i * 0.28, 0.28)).flat(Infinity).map(tilt), { explode: [0, 0, 0], spread: 0.25 }),
      part('Belfry', 'bell chamber added in 1372', '#fff4dc', [tube([0, 2.08, 0], [0, 2.38, 0], R * 0.62), torus([0, 2.38, 0], 'y', R * 0.62, 0.02)].map(tilt), { explode: [0.15, 0.6, 0] }),
      part('Bells', 'seven bells tuned to a musical scale', '#ffd166', range(7, (i) => { const a = (i / 7) * TAU; return revolve([Math.cos(a) * 0.14, 2.15, Math.sin(a) * 0.14], 'y', 0.1, (t) => 0.06 * (1 - t * 0.6)); }).map(tilt), { explode: [0.3, 1.0, 0], spread: 0.6 }),
      part('Foundation', 'only 3 m deep in soft clay: the reason it leans', '#c09a6a', [disk([0, -0.02, 0], 'y', R * 1.4), tube([0, -0.25, 0], [0, -0.02, 0], R * 1.2)], { explode: [0, -0.8, 0] }),
      part('Piazza', 'Field of Miracles lawn', '#6fbf73', fuzz(disk([0, -0.05, 0], 'y', 1.6, R * 1.5), 0.01), { explode: [0, -1.0, 0], density: 0.4 }),
    ];
  },
};

const greatWall = {
  id: 'great-wall',
  name: 'Great Wall',
  category: CAT,
  subtitle: 'China · 21,196 km over 2,000 years',
  build() {
    const height = (x, z) => 0.35 * Math.sin(x * 1.3 + 0.5) + 0.25 * Math.cos(z * 1.7 + x * 0.6) + 0.15 * Math.sin(x * 3.1);
    const path = range(18, (i) => {
      const x = -2.2 + (i / 17) * 4.4;
      const z = Math.sin(x * 1.1) * 0.7;
      return [x, height(x, z) + 0.12, z];
    });
    const towerAt = (i) => {
      const [x, y, z] = path[i];
      return box([x, y + 0.08, z], [0.18, 0.28, 0.18]);
    };
    const rand = mulberry32(3);
    const terrain = custom(20, () => {
      const x = rand() * 5 - 2.5;
      const z = rand() * 3 - 1.5;
      return [x, height(x, z) - 0.05, z];
    });
    return [
      part('Rampart', 'rammed earth faced with brick', '#d9b98a', curve(path, 0.07), { explode: [0, 0.4, 0] }),
      part('Battlements', 'crenellated parapet for archers', '#f0d6a8', [curve(path.map(([x, y, z]) => [x, y + 0.09, z + 0.06]), 0.02), curve(path.map(([x, y, z]) => [x, y + 0.09, z - 0.06]), 0.02)], { explode: [0, 0.8, 0], spread: 0.1 }),
      part('Watchtowers', 'signal towers using smoke and fire', '#ffb46b', [1, 4, 7, 10, 13, 16].map(towerAt), { explode: [0, 1.1, 0] }),
      part('Mountains', 'ridges the wall follows', '#6fa86a', terrain, { explode: [0, -0.6, 0], density: 0.8 }),
    ];
  },
};

const saturn = {
  id: 'saturn',
  name: 'Saturn',
  category: CAT,
  subtitle: 'gas giant · rings 282,000 km wide',
  build() {
    const t = (s) => rotX(s, 0.42);
    return [
      part('Planet', 'hydrogen & helium, less dense than water', '#ecc98b', t(ellipsoid([0, 0, 0], [1, 0.9, 1])), { explode: [0, 0, 0] }),
      part('Cloud bands', 'ammonia storms and 1,800 km/h winds', '#ffe2a8', range(5, (i) => t(torus([0, -0.6 + i * 0.3, 0], 'y', Math.sqrt(1 - ((-0.6 + i * 0.3) / 0.9) ** 2) * 1.01, 0.02))), { explode: [0, 0, 0], spread: 0.08 }),
      part('C ring', 'faint inner ring', '#9c8a6e', t(disk([0, 0, 0], 'y', 1.5, 1.22)), { explode: [0, -0.35, 0] }),
      part('B ring', 'brightest, most massive ring', '#f2dcb0', t(disk([0, 0, 0], 'y', 1.95, 1.52)), { explode: [0, 0, 0] }),
      part('A ring', 'outer ring beyond the Cassini gap', '#d4be92', t(disk([0, 0, 0], 'y', 2.35, 2.05)), { explode: [0, 0.35, 0] }),
      part('Titan', 'moon with lakes of methane', '#ffb46b', sphere([3.0, 0.4, 0.6], 0.14), { explode: [0.6, 0, 0] }),
      part('Enceladus', 'icy moon spraying water geysers', '#bfe8ff', sphere([-2.7, -0.2, 0.9], 0.07), { explode: [-0.6, 0, 0] }),
    ];
  },
};

const solarSystem = {
  id: 'solar-system',
  name: 'Solar System',
  category: CAT,
  subtitle: '8 planets · 4.6 billion years',
  explodeScale: 0.25,
  build() {
    const planets = [
      ['Mercury', 'smallest planet, 88-day year', '#c8b8a8', 0.75, 0.05],
      ['Venus', 'hottest planet: 465 °C', '#ffd59a', 1.0, 0.08],
      ['Earth', 'the only known home of life', '#4fa8ff', 1.3, 0.085],
      ['Mars', 'red planet with the tallest volcano', '#ff7a4a', 1.6, 0.065],
      ['Jupiter', 'giant with the Great Red Spot', '#f0c08a', 2.1, 0.22],
      ['Saturn', 'ringed gas giant', '#ecd28b', 2.65, 0.18],
      ['Uranus', 'ice giant tipped on its side', '#9fe8f0', 3.1, 0.12],
      ['Neptune', 'windiest planet', '#5f7dff', 3.5, 0.12],
    ];
    return [
      part('Sun', '99.8% of the solar system\'s mass', '#ffb030', sphere([0, 0, 0], 0.45, { solid: true }), { explode: [0, 0, 0], density: 1.4 }),
      ...planets.map(([name, desc, color, r, size], i) => {
        const a = i * 2.1;
        const c = [Math.cos(a) * r, 0, Math.sin(a) * r];
        const shapes = [sphere(c, size)];
        if (name === 'Saturn') shapes.push(disk(c, [0.2, 1, 0.1], size * 2.1, size * 1.3));
        return part(name, desc, color, shapes, { explode: [0, 0.25 * (i - 3.5), 0], spread: 1.5 });
      }),
      part('Orbits', 'elliptical paths around the Sun', '#7f8aa8', planets.map(([, , , r]) => torus([0, 0, 0], 'y', r, 0.004)), { explode: [0, 0, 0], density: 0.9 }),
    ];
  },
};

export default [greatPyramid, eiffel, tajMahal, colosseum, stonehenge, pisa, greatWall, saturn, solarSystem];
