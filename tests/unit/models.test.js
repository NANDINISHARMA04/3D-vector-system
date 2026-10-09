import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MODELS, CATEGORIES, sampleModel } from '../../src/models/index.js';

test('catalogue has unique ids and known categories', () => {
  const ids = new Set(MODELS.map((m) => m.id));
  assert.equal(ids.size, MODELS.length);
  for (const m of MODELS) assert.ok(CATEGORIES.includes(m.category), m.id);
  for (const c of CATEGORIES) assert.ok(MODELS.some((m) => m.category === c), c);
});

for (const model of MODELS) {
  test(`${model.id}: samples into a finite, normalised particle cloud`, () => {
    const n = 6000;
    const s = sampleModel(model, n, 1);
    assert.equal(s.positions.length, n * 3);
    assert.equal(s.partIds.length, n);
    assert.equal(s.parts.reduce((a, p) => a + p.count, 0), n);
    let maxAbs = 0;
    for (const v of s.positions) {
      assert.ok(Number.isFinite(v));
      maxAbs = Math.max(maxAbs, Math.abs(v));
    }
    for (const v of s.explode) assert.ok(Number.isFinite(v));
    assert.ok(maxAbs <= 1.21 && maxAbs > 0.5, `fits the unit frame (${maxAbs})`);
    for (const p of s.parts) {
      assert.ok(p.name && p.desc, 'part has a label');
      assert.ok(p.count > 0, `${p.name} has particles`);
      assert.match(p.color, /^#[0-9a-f]{6}$/i);
    }
  });
}

test('sampling is deterministic for a seed', () => {
  const a = sampleModel(MODELS[0], 2000, 5);
  const b = sampleModel(MODELS[0], 2000, 5);
  assert.deepEqual(a.positions, b.positions);
});
