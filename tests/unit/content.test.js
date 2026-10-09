import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LESSONS, SECTIONS, narration } from '../../src/body/content.js';
import { findModel } from '../../src/models/index.js';

const ids = SECTIONS.flatMap((s) => s.items.map((i) => i.id));

test('every Body Explorer entry points at a real model with a lesson', () => {
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) {
    assert.ok(findModel(id), `model ${id}`);
    assert.ok(LESSONS[id]?.intro, `intro for ${id}`);
  }
});

test('every part of every lesson model has a summary and a fun fact', () => {
  for (const id of ids) {
    const parts = findModel(id).build().map((p) => p.name);
    for (const name of parts) {
      const n = narration(id, name);
      assert.ok(n, `${id}: missing narration for "${name}"`);
      assert.ok(n.summary.length > 20 && n.fact.length > 15, `${id}/${name} text`);
    }
    // No stale entries for parts that no longer exist.
    for (const name of Object.keys(LESSONS[id].parts)) assert.ok(parts.includes(name), `${id}: unknown part "${name}"`);
  }
});
