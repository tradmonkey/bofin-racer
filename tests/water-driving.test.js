import test from 'node:test';
import assert from 'node:assert/strict';
import { WATER_RANGE, waterRangeStep } from '../src/water-driving.js';
test('water range depletes by distance, drains at idle and recharges only on land', () => {
  assert.equal(waterRangeStep(WATER_RANGE, true, 25, 1), 125);
  assert.equal(waterRangeStep(20, true, 30, 1), 0);
  assert.equal(waterRangeStep(20, true, 0, 1), 19);
  assert.equal(waterRangeStep(20, false, 30, 1), 35);
  assert.equal(waterRangeStep(145, false, 0, 1), WATER_RANGE);
});
