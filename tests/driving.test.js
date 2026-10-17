import test from 'node:test';
import assert from 'node:assert/strict';
import { HANDLING, drivingStep } from '../src/driving.js';
const input = { accel: true, brake: false, turn: 1, handbrake: false, onRoad: true, boost: false };
function simulate(profile, hz) {
  let state = { speed: 0, steering: 0 };
  for (let i = 0; i < hz * 4; i++) state = drivingStep(state.speed, state.steering, input, profile, 1 / hz);
  return state;
}
test('handling stays consistent across frame rates', () => {
  for (const p of Object.values(HANDLING)) {
    const a = simulate(p, 30), b = simulate(p, 120);
    assert.ok(Math.abs(a.speed - b.speed) < 0.15);
    assert.ok(Math.abs(a.steering - b.steering) < 0.001);
  }
});
test('cars out-accelerate heavy vehicles and Fiesta turns more eagerly', () => {
  assert.ok(simulate(HANDLING.jetta, 60).speed > simulate(HANDLING.tractor, 60).speed);
  const fiesta = drivingStep(15, 1, input, HANDLING.fiesta, 1 / 60);
  const jetta = drivingStep(15, 1, input, HANDLING.jetta, 1 / 60);
  assert.ok(fiesta.yaw > jetta.yaw);
});
test('steering eases in and recentres, grass slows gently and braking does not instantly reverse', () => {
  const p = HANDLING.jetta;
  const next = drivingStep(20, 0, input, p, 0.02);
  assert.ok(next.steering > 0 && next.steering < 1);
  const released = drivingStep(20, 1, { ...input, accel: false, turn: 0, onRoad: false }, p, 0.02);
  assert.ok(released.steering > 0 && released.steering < 1);
  assert.ok(released.speed > p.offroad && released.speed < 20);
  assert.equal(drivingStep(0.1, 0, { ...input, accel: false, brake: true }, p, 0.04).speed, 0);
});
test('braking through a turn produces slip, handbrake increases it, and grip returns', () => {
  const p = HANDLING.fiesta;
  const normal = drivingStep(20, 1, { ...input, accel: false, brake: true }, p, 0.04);
  const hand = drivingStep(20, 1, { ...input, accel: false, handbrake: true }, p, 0.04);
  assert.ok(normal.slip < 0);
  assert.ok(hand.slip < normal.slip);
  assert.ok(hand.yaw > normal.yaw);
  const release = drivingStep(hand.speed, 0, { ...input, accel: false, turn: 0, slip: hand.slip }, p, 0.04);
  assert.ok(Math.abs(release.slip) < Math.abs(hand.slip));
  const straight = drivingStep(20, 0, { ...input, turn: 0, handbrake: true }, p, 0.04);
  assert.equal(straight.slip, 0);
});
test('Corolla rear tyres slide in normal corners and recover more slowly', () => {
  const corner = { ...input, accel: false, brake: false, handbrake: false };
  const corolla = drivingStep(20, 1, corner, HANDLING.corolla, 0.04);
  const jetta = drivingStep(20, 1, corner, HANDLING.jetta, 0.04);
  assert.ok(Math.abs(corolla.slip) > Math.abs(jetta.slip));
  const release = { ...corner, turn: 0, slip: -0.3 };
  const loose = drivingStep(20, 0, release, HANDLING.corolla, 0.04);
  const planted = drivingStep(20, 0, release, HANDLING.jetta, 0.04);
  assert.ok(Math.abs(loose.slip) > Math.abs(planted.slip));
});
