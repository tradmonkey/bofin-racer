export const HANDLING = {
  kursk: { acceleration: 4.4, top: 22, offroad: 11, brake: 10, steer: 0.95, response: 6, lean: 0.85, tone: 40 },
  corolla: { acceleration: 5, top: 25, offroad: 8, brake: 10, steer: 1.12, response: 7, lean: 0.7, tone: 54, rearGrip: 0.48 },
  signet: { acceleration: 4.4, top: 21, offroad: 8, brake: 10, steer: 1.2, response: 7, lean: 1, tone: 72 },
  jeep: { acceleration: 4.8, top: 23, offroad: 13, brake: 10, steer: 1, response: 6, lean: 0.8, tone: 48 },
  tractor: { acceleration: 2.7, top: 12, offroad: 10, brake: 7, steer: 0.75, response: 3.5, lean: 0.65, tone: 30 },
  dumper: { acceleration: 3.1, top: 14, offroad: 10, brake: 8, steer: 0.85, response: 4, lean: 0.8, tone: 36 },
  jetta: { acceleration: 5.8, top: 28, offroad: 8, brake: 12, steer: 1.05, response: 7, lean: 0.5, tone: 58 },
  fiesta: { acceleration: 5.3, top: 25, offroad: 8, brake: 11, steer: 1.3, response: 9, lean: 0.65, tone: 65 },
};
export const ease = (value, target, rate, dt) => target + (value - target) * Math.exp(-rate * dt);
export function drivingStep(speed, steering, input, profile, dt) {
  const { accel, brake, turn, handbrake, onRoad, boost } = input;
  steering = ease(steering, turn, profile.response, dt);
  const previousSpeed = speed;
  const drag = handbrake ? 0.95 : onRoad ? 0.13 : 0.7;
  const force = accel ? profile.acceleration * (boost ? 1.7 : 1) : 0;
  speed = speed * Math.exp(-drag * dt) + force * (1 - Math.exp(-drag * dt)) / drag;
  if (brake) speed = speed > 0 ? Math.max(0, speed - profile.brake * dt) : speed - 3 * dt;

  const limit = (onRoad ? profile.top : profile.offroad) * (boost ? 1.5 : 1);
  // Ease down to a lower surface limit instead of snapping speed on grass.
  if (speed > limit) speed = previousSpeed <= limit ? limit : ease(speed, limit, 3, dt);
  speed = Math.max(-5, speed);
  if (!accel && Math.abs(speed) < 0.04) speed = 0;
  const rearGrip = profile.rearGrip ?? 1;
  const drift = Math.min(1.3, (handbrake ? 1 : brake ? 0.4 : 0) + (1 - rearGrip) * 1.05) * Math.max(0, Math.min(1, (speed - 3) / 9));
  const heavy = profile.top <= 14 ? 0.45 : 1;
  const yaw = steering * profile.steer * speed / (5 + Math.abs(speed) * 1.8) * (1 + drift * 1.15 * heavy);
  // Body turns ahead of the travel direction while rear grip is reduced.
  const targetSlip = -steering * drift * 0.65 * heavy;
  const slip = ease(input.slip || 0, targetSlip, Math.abs(targetSlip) > Math.abs(input.slip || 0) ? 3.5 : (onRoad ? 5 : 3) * rearGrip, dt);
  return { speed, steering, yaw, slip: Math.abs(speed) < 1 ? 0 : slip };
}
