import { ROUTES, crossedCheckpoint } from './racing.js';
import { HANDLING } from './driving.js';
export const normalizeName = value => typeof value === 'string' ? value.normalize('NFKC').replace(/[\u0000-\u001f\u007f-\u009f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 24) : '';
export function validateSubmission(data, course) {
  if (!data || typeof data !== 'object') throw new Error('Invalid result.');
  if (!ROUTES.some(r => r.id === data.course) || !Object.hasOwn(HANDLING, data.vehicle)) throw new Error('Unknown route or vehicle.');
  if (typeof data.playerId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.playerId)) throw new Error('Invalid driver ID.');
  const name = normalizeName(data.name);
  if (!name) throw new Error('Enter a driver name.');
  if (typeof data.time !== 'number' || !Number.isFinite(data.time) || data.time <= 0 || data.time > 1800) throw new Error('Invalid time.');
  const samples = data.samples;
  if (!Array.isArray(samples) || samples.length < 2 || samples.length > 19000) throw new Error('Run recording is missing or too large.');
  const start = course.path[0], finish = course.checkpoints.at(-1), top = HANDLING[data.vehicle].top * 1.5;
  let checkpoint = 0;
  for (let i = 0; i < samples.length; i++) {
    const p = samples[i], a = samples[Math.max(0, i - 1)];
    if (!p || !['t','x','z','heading'].every(k => typeof p[k] === 'number' && Number.isFinite(p[k])) || Math.abs(p.x) > 20000 || Math.abs(p.z) > 20000 || p.t < 0 || p.t > data.time + .001) throw new Error('Invalid run recording.');
    if (i) {
      const dt = p.t - a.t, distance = Math.hypot(p.x-a.x, p.z-a.z);
      if (dt < 0 || dt > .5 || distance > (top + 3) * dt + .8 || (!dt && distance > .01)) throw new Error('Run contains an invalid movement.');
    }
    while (checkpoint < course.checkpoints.length && crossedCheckpoint(a, p, course.checkpoints[checkpoint], 15)) checkpoint++;
  }
  const first = samples[0], last = samples.at(-1);
  if (first.t > .05 || Math.hypot(first.x-start.x, first.z-start.z) > 20 || Math.abs(last.t-data.time) > .02 || Math.hypot(last.x-finish.x,last.z-finish.z) > 16 || checkpoint !== course.checkpoints.length) throw new Error('Run did not complete the route.');
  return { playerId: data.playerId, course: data.course, vehicle: data.vehicle, name, time: data.time };
}
