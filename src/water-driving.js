export const WATER_RANGE = 150;
export function waterRangeStep(remaining, inWater, distance, dt) {
  // Idling offshore also consumes range, so the power cannot last indefinitely.
  return Math.max(0, Math.min(WATER_RANGE, remaining + (inWater ? -Math.max(distance, dt) : 15 * dt)));
}
