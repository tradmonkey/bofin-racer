export const ROUTES = [
  { id: 'murrays-beach-party', name: 'Murrays → Beach Party (Duamhach)', from: 'doonmore', to: 'duamhach', cargo: 'pallets' },
  { id: 'pub-murrays', name: 'The Pub → Murrays', from: 'old-pier-race', to: 'doonmore' },
  { id: 'clossey', name: 'Clossey Challenge', from: 'east', to: 'clossey-finish' },
  { id: 'doonmore-days', name: "Murrays → The Pub", from: 'doonmore', to: 'days' },
  { id: 'hostel-galley', name: 'Hostel → The Galley', from: 'hostel', to: 'galley' },
  { id: 'north-beach-new-pier', name: 'North Beach → New Pier', from: 'west', to: 'new-pier' },
];
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export function buildRoute(roads, start, finish) {
  const nodes = new Map();
  const key = (p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`;
  for (const road of roads) {
    for (let i = 1; i < road.points.length; i++) {
      const a = road.points[i - 1], b = road.points[i];
      for (const p of [a, b]) if (!nodes.has(key(p))) nodes.set(key(p), { x: p[0], z: p[1], edges: [] });
      const na = nodes.get(key(a)), nb = nodes.get(key(b));
      const cost = distance(na, nb);
      na.edges.push([key(b), cost]); nb.edges.push([key(a), cost]);
    }
  }
  function nearest(p) {
    let best, gap = Infinity;
    for (const [id, node] of nodes) {
      const d = distance(p, node);
      if (d < gap) { best = id; gap = d; }
    }
    return best;
  }
  const origin = nearest(start), destination = nearest(finish);
  const costs = new Map([[origin, 0]]), previous = new Map(), pending = new Set([origin]);
  while (pending.size) {
    let current;
    for (const id of pending) if (current === undefined || costs.get(id) < costs.get(current)) current = id;
    pending.delete(current);
    if (current === destination) break;
    for (const [next, weight] of nodes.get(current).edges) {
      const cost = costs.get(current) + weight;
      if (cost < (costs.get(next) ?? Infinity)) {
        costs.set(next, cost); previous.set(next, current); pending.add(next);
      }
    }
  }
  if (!costs.has(destination)) throw new Error('These roads are not connected.');
  const path = [];
  for (let id = destination; id !== undefined; id = previous.get(id)) {
    const p = nodes.get(id); path.unshift({ x: p.x, z: p.z });
  }
  path.unshift({ x: start.x, z: start.z });
  path.push({ x: finish.x, z: finish.z });
  const checkpoints = [];
  let since = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i], length = distance(a, b);
    let used = 0;
    while (since + length - used >= 65) {
      const step = 65 - since; used += step;
      const t = used / length;
      checkpoints.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
      since = 0;
    }
    since += length - used;
  }
  if (checkpoints.length && distance(checkpoints.at(-1), finish) < 20) checkpoints.pop();
  checkpoints.push({ x: finish.x, z: finish.z });
  return { path, checkpoints };
}
export function crossedCheckpoint(a, b, checkpoint, radius = 13) {
  const dx = b.x - a.x, dz = b.z - a.z, length2 = dx * dx + dz * dz;
  const t = length2 ? Math.max(0, Math.min(1, ((checkpoint.x - a.x) * dx + (checkpoint.z - a.z) * dz) / length2)) : 0;
  return Math.hypot(a.x + dx * t - checkpoint.x, a.z + dz * t - checkpoint.z) <= radius;
}
export function ghostPose(samples, time) {
  if (!samples?.length || time > samples.at(-1).t) return null;
  let lo = 0, hi = samples.length - 1;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].t <= time) lo = mid; else hi = mid;
  }
  const a = samples[lo], b = samples[hi], t = b.t > a.t ? Math.max(0, Math.min(1, (time - a.t) / (b.t - a.t))) : 0;
  const angle = Math.atan2(Math.sin(b.heading - a.heading), Math.cos(b.heading - a.heading));
  return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, heading: a.heading + angle * t };
}
export function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '—';
  const hundredths = Math.floor(seconds * 100);
  return `${Math.floor(hundredths / 6000)}:${String(Math.floor(hundredths / 100) % 60).padStart(2, '0')}.${String(hundredths % 100).padStart(2, '0')}`;
}
