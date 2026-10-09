import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FAQ, findAnswer } from '../../src/body/faq.js';

test('every built-in answer has English and Hindi text', () => {
  for (const e of FAQ) {
    assert.ok(e.en.length > 60, e.keys[0]);
    assert.match(e.hi, /[ऀ-ॿ]/, `Hindi for ${e.keys[0]}`);
  }
});

test('common children’s questions find the right answer', () => {
  const cases = [
    ['Why does my heart beat faster when I run?', /oxygen/],
    ['Why do we hiccup?', /diaphragm/],
    ['Why is blood red?', /haemoglobin/],
    ['How many bones do I have?', /two hundred and six/],
    ['Why do my fingers go wrinkly in the bath?', /wrinkly/],
    ['Why do I feel dizzy after spinning?', /balance/],
  ];
  for (const [q, re] of cases) assert.match(findAnswer(q)?.text ?? '', re, q);
});

test('Hindi questions get Hindi answers', () => {
  assert.match(findAnswer('दौड़ते समय मेरा दिल तेज़ क्यों धड़कता है?', 'hi').text, /ऑक्सीजन/);
  assert.match(findAnswer('मुझे हिचकी क्यों आती है?', 'hi').text, /डायाफ्राम/);
});

test('off-topic questions find nothing', () => {
  assert.equal(findAnswer('What is the capital of France?'), null);
});
