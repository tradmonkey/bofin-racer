import test from "node:test";
import assert from "node:assert/strict";
import { createTouchInput } from "../src/touch-controls.js";
test("two fingers can steer and accelerate independently", () => {
  const keys = new Set(),
    input = createTouchInput(keys);
  input.press(1, "ArrowUp");
  input.press(2, "ArrowLeft");
  assert.deepEqual([...keys], ["ArrowUp", "ArrowLeft"]);
  input.release(2);
  assert.deepEqual([...keys], ["ArrowUp"]);
  input.clear();
  assert.equal(keys.size, 0);
});
test("releasing one of two fingers on the same button does not stop the other", () => {
  const keys = new Set(),
    input = createTouchInput(keys);
  input.press(1, "ArrowUp");
  input.press(2, "ArrowUp");
  input.release(1);
  assert.ok(keys.has("ArrowUp"));
  input.release(2);
  assert.equal(keys.size, 0);
});
