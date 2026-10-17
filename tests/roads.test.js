import test from "node:test";
import assert from "node:assert/strict";
import { smoothRoad, junctionKeys } from "../src/roads.js";
import { nearestRoad } from "../src/geo.js";
test("rounded bends stay within 1.5 metres of the mapped centreline", () => {
  const input = [
      [0, 0],
      [20, 0],
      [20, 20],
    ],
    curve = smoothRoad(input),
    segments = [
      { points: [input[0], input[1]] },
      { points: [input[1], input[2]] },
    ];
  assert.deepEqual(curve[0], input[0]);
  assert.deepEqual(curve.at(-1), input.at(-1));
  assert.ok(!curve.some((p) => p[0] === 20 && p[1] === 0));
  for (const p of curve) assert.ok(nearestRoad(...p, segments).distance <= 1.5);
  for (let i = 1; i < curve.length; i++)
    assert.ok(
      Math.hypot(
        curve[i][0] - curve[i - 1][0],
        curve[i][1] - curve[i - 1][1],
      ) <= 1.501,
    );
});
test("mapped junctions are preserved exactly", () => {
  const a = [
      [0, 0],
      [20, 0],
      [20, 20],
    ],
    b = [
      [20, 0],
      [30, -10],
    ],
    keys = junctionKeys([a, b]);
  assert.ok(smoothRoad(a, keys).some((p) => p[0] === 20 && p[1] === 0));
});
test("short segments and repeated coordinates produce finite geometry", () => {
  for (const p of smoothRoad([
    [0, 0],
    [0, 0],
    [0.1, 0],
    [0.1, 0.1],
  ]))
    assert.ok(p.every(Number.isFinite));
});
