import { sphere, ellipsoid, tube, curve, torus, helix, mulberry32 } from '../shapes.js';
import { part, range } from './common.js';

const CAT = 'Biology';

const dna = {
  id: 'dna',
  name: 'DNA Double Helix',
  category: CAT,
  subtitle: '3 billion base pairs · 2 m per cell',
  build() {
    const H = 5;
    const TURNS = 2.6;
    const R = 0.6;
    const strandA = helix([0, -H / 2, 0], 'y', R, H, TURNS, 0);
    const strandB = helix([0, -H / 2, 0], 'y', R, H, TURNS, Math.PI * 0.8);
    const rand = mulberry32(42);
    const at = [];
    const gc = [];
    const n = Math.round(TURNS * 10.5);
    for (let i = 1; i < n; i++) {
      const t = i / n;
      const y = -H / 2 + H * t;
      const a1 = t * TURNS * Math.PI * 2;
      const a2 = a1 + Math.PI * 0.8;
      const p1 = [Math.cos(a1) * R, y, Math.sin(a1) * R];
      const p2 = [Math.cos(a2) * R, y, Math.sin(a2) * R];
      (rand() < 0.5 ? at : gc).push(tube(p1, p2, 0.045, 0.045));
    }
    return [
      part('Backbone strand 1', 'sugar–phosphate chain, 5′→3′', '#7fd1ff', curve(strandA, 0.075), { explode: [-0.9, 0, 0], spread: 0.15 }),
      part('Backbone strand 2', 'antiparallel partner, 3′→5′', '#c3a6ff', curve(strandB, 0.075), { explode: [0.9, 0, 0], spread: 0.15 }),
      part('A–T base pairs', 'adenine + thymine: 2 hydrogen bonds', '#ff6b81', at, { explode: [0, 0, 0.9], spread: 0.35 }),
      part('G–C base pairs', 'guanine + cytosine: 3 hydrogen bonds', '#ffd166', gc, { explode: [0, 0, -0.9], spread: 0.35 }),
    ];
  },
};

const cell = {
  id: 'cell',
  name: 'Animal Cell',
  category: CAT,
  subtitle: '~37 trillion in your body',
  build() {
    const rand = mulberry32(11);
    const inside = (r) => {
      for (;;) {
        const p = [rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1];
        const d = Math.hypot(...p);
        if (d < 1 && d > 0.55) return p.map((v) => v * r);
      }
    };
    const mito = range(7, () => {
      const c = inside(1.6);
      const d = [rand() - 0.5, rand() - 0.5, rand() - 0.5];
      const l = Math.hypot(...d);
      const e = c.map((v, i) => v + (d[i] / l) * 0.45);
      return [tube(c, e, 0.13, 0.13, { caps: true }), curve([c, c.map((v, i) => (v + e[i]) / 2 + 0.05), e], 0.03)];
    });
    const er = range(5, (i) => torus([0.2, 0.1, 0], [0.2, 1, 0.3 * i], 0.9 + i * 0.09, 0.03, { arc: Math.PI * 1.3, start: i * 0.7 }));
    const golgi = range(5, (i) => torus([-1.1, 0.6 - i * 0.06, 0.4], [0.6, 1, 0.2], 0.35 - i * 0.03, 0.025, { arc: Math.PI * 0.8, start: 2.2 }));
    const lyso = range(9, () => sphere(inside(1.7), 0.09));
    return [
      part('Cell membrane', 'lipid bilayer that controls entry', '#7fd1ff', ellipsoid([0, 0, 0], [2, 1.8, 2], { wrinkle: 0.02 }), { explode: [0, 0, 0], spread: 0.25, density: 0.8 }),
      part('Cytoplasm', 'jelly where reactions happen', '#3f78b0', ellipsoid([0, 0, 0], [1.9, 1.7, 1.9], { solid: true }), { explode: [0, 0, 0], density: 0.25 }),
      part('Nucleus', 'holds the DNA, the cell\'s control centre', '#c77dff', sphere([0.2, 0.1, 0], 0.68), { explode: [0, 0.2, 1.2] }),
      part('Nucleolus', 'builds ribosomes', '#ff6bd6', sphere([0.35, 0.25, 0.1], 0.22, { solid: true }), { explode: [0, 0.6, 2.0] }),
      part('Mitochondria', 'powerhouses making ATP', '#ff9f43', mito, { explode: [0, 0, 0], spread: 0.5 }),
      part('Endoplasmic reticulum', 'folding factory for proteins', '#4fd1a5', er, { explode: [0, -0.5, 0.6], spread: 0.3 }),
      part('Golgi apparatus', 'packs and ships proteins', '#ffd166', golgi, { explode: [-0.9, 0.5, 0.6] }),
      part('Lysosomes', 'recycling bins full of enzymes', '#ff6b6b', lyso, { explode: [0, 0, 0], spread: 0.4 }),
      part('Centrosome', 'organises cell division', '#b8f2e6', [tube([0.9, -0.9, 0.5], [1.1, -0.9, 0.5], 0.05), tube([1.0, -1.0, 0.5], [1.0, -0.8, 0.5], 0.05)], { explode: [0.8, -0.8, 0.6] }),
    ];
  },
};

export default [dna, cell];
