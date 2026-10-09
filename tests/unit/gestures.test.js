import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeHand, GestureTracker } from '../../src/gestures.js';
import { poseHand, synthHand } from '../../src/synthHand.js';

test('classifies the core poses', () => {
  for (const pose of ['open', 'fist', 'point', 'peace', 'pinch']) {
    assert.equal(analyzeHand(poseHand(pose)).pose, pose, pose);
  }
});

test('classification is invariant to position, scale and moderate roll', () => {
  for (const opts of [{ x: 200, y: 300, size: 60 }, { x: 900, y: 600, size: 180 }, { roll: 0.35 }, { roll: -0.35 }]) {
    assert.equal(analyzeHand(poseHand('fist', opts)).pose, 'fist');
    assert.equal(analyzeHand(poseHand('open', opts)).pose, 'open');
    assert.equal(analyzeHand(poseHand('point', opts)).pose, 'point');
  }
});

test('openness tracks how far the fingers are extended', () => {
  const values = [0, 0.25, 0.5, 0.75, 1].map((e) =>
    analyzeHand(synthHand({ ext: { thumb: e, index: e, middle: e, ring: e, pinky: e } })).openness);
  for (let i = 1; i < values.length; i++) assert.ok(values[i] >= values[i - 1], `openness never drops: ${values}`);
  assert.ok(values[3] > values[2] && values[2] > values[1], `openness rises through the mid range: ${values}`);
  assert.ok(values[0] < 0.1);
  assert.ok(values[4] > 0.9);
});

test('roll reports wrist twist direction', () => {
  assert.ok(Math.abs(analyzeHand(poseHand('open')).roll) < 0.05);
  assert.ok(analyzeHand(poseHand('open', { roll: 0.6 })).roll > 0.4);
  assert.ok(analyzeHand(poseHand('open', { roll: -0.6 })).roll < -0.4);
});

test('forgiving sensitivity accepts a sloppier fist than strict', () => {
  const loose = synthHand({ ext: { thumb: 0.3, index: 0.47, middle: 0.47, ring: 0.47, pinky: 0.47 } });
  assert.equal(analyzeHand(loose, 'forgiving').pose, 'fist');
  assert.notEqual(analyzeHand(loose, 'strict').pose, 'fist');
});

test('tracker debounces poses before reporting them', () => {
  const t = new GestureTracker();
  assert.equal(t.update([poseHand('fist')], 0).pose, 'none');
  assert.equal(t.update([poseHand('fist')], 50).pose, 'none');
  assert.equal(t.update([poseHand('fist')], 120).pose, 'fist');
});

test('holding a peace sign fires "next" exactly once', () => {
  const t = new GestureTracker();
  let fired = 0;
  for (let ms = 0; ms <= 2000; ms += 33) fired += t.update([poseHand('peace')], ms).events.filter((e) => e === 'next').length;
  assert.equal(fired, 1);
  t.update([poseHand('open')], 2100);
  t.update([poseHand('open')], 2300);
  for (let ms = 2400; ms <= 3400; ms += 33) fired += t.update([poseHand('peace')], ms).events.filter((e) => e === 'next').length;
  assert.equal(fired, 2);
});

test('snap = thumb/middle contact followed by a quick release', () => {
  const t = new GestureTracker();
  assert.deepEqual(t.update([poseHand('snapReady')], 0).events, []);
  assert.deepEqual(t.update([poseHand('snapReady')], 40).events, []);
  assert.deepEqual(t.update([poseHand('snapDone')], 120).events, ['snap']);
  // A slow release is not a snap.
  const slow = new GestureTracker();
  slow.update([poseHand('snapReady')], 0);
  assert.deepEqual(slow.update([poseHand('snapDone')], 900).events, []);
});

test('opening a fist is not mistaken for a snap', () => {
  const t = new GestureTracker();
  t.update([poseHand('fist')], 0);
  assert.deepEqual(t.update([poseHand('open')], 100).events, []);
});

test('two hands report zoom from palm distance', () => {
  const t = new GestureTracker();
  const pair = (gap) => [poseHand('open', { x: 640 - gap, size: 90 }), poseHand('open', { x: 640 + gap, size: 90 })];
  assert.equal(t.update(pair(150), 0).zoom, 1);
  assert.ok(Math.abs(t.update(pair(300), 30).zoom - 2) < 0.01);
  assert.equal(t.update([poseHand('open')], 60).zoom, null);
});
