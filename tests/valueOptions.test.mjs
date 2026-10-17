import test from 'node:test';
import assert from 'node:assert/strict';
import { uniqueValues, valuesIncludingCurrent } from '../src/lib/valueOptions.js';

test('uniqueValues removes blank and repeated saved values', () => {
  assert.deepEqual(uniqueValues([' يحيى ', '', 'شركة النور', 'يحيى', '  ']), ['شركة النور', 'يحيى']);
});

test('valuesIncludingCurrent keeps the value being edited selectable', () => {
  const values=valuesIncludingCurrent(['القاهرة', 'الرياض'], 'جدة');
  assert.equal(values.length,3);
  assert.ok(values.includes('القاهرة'));
  assert.ok(values.includes('الرياض'));
  assert.ok(values.includes('جدة'));
});
