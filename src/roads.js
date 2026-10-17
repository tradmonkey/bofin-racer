// Round individual mapped bends locally rather than fitting a spline that can
// overshoot the coastline. Shared junction coordinates remain fixed.
export function smoothRoad(input, junctions = new Set(), spacing = 1.5) {
  const points = input.filter(
    (p, i) =>
      !i || Math.hypot(p[0] - input[i - 1][0], p[1] - input[i - 1][1]) > 0.001,
  );
  if (points.length < 2) return points;
  const out = [points[0]],
    key = (p) => `${p[0].toFixed(4)},${p[1].toFixed(4)}`;
  function lineTo(p) {
    const a = out.at(-1),
      n = Math.max(
        1,
        Math.ceil(Math.hypot(p[0] - a[0], p[1] - a[1]) / spacing),
      );
    for (let j = 1; j <= n; j++)
      out.push([
        a[0] + ((p[0] - a[0]) * j) / n,
        a[1] + ((p[1] - a[1]) * j) / n,
      ]);
  }
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1],
      p = points[i],
      b = points[i + 1],
      la = Math.hypot(a[0] - p[0], a[1] - p[1]),
      lb = Math.hypot(b[0] - p[0], b[1] - p[1]);
    if (junctions.has(key(p))) {
      lineTo(p);
      continue;
    }
    const sinTurn =
      Math.abs((p[0] - a[0]) * (b[1] - p[1]) - (p[1] - a[1]) * (b[0] - p[0])) /
      (la * lb);
    const trim = Math.min(
        12,
        la * 0.35,
        lb * 0.35,
        6 / Math.max(0.01, sinTurn),
      ),
      entry = [
        p[0] + ((a[0] - p[0]) * trim) / la,
        p[1] + ((a[1] - p[1]) * trim) / la,
      ],
      exit = [
        p[0] + ((b[0] - p[0]) * trim) / lb,
        p[1] + ((b[1] - p[1]) * trim) / lb,
      ];
    lineTo(entry);
    const n = Math.max(4, Math.ceil((trim * 2) / spacing));
    for (let j = 1; j <= n; j++) {
      const t = j / n,
        u = 1 - t;
      out.push([
        u * u * entry[0] + 2 * u * t * p[0] + t * t * exit[0],
        u * u * entry[1] + 2 * u * t * p[1] + t * t * exit[1],
      ]);
    }
  }
  lineTo(points.at(-1));
  return out;
}
export function junctionKeys(lines) {
  const counts = new Map();
  for (const line of lines)
    for (const p of line) {
      const k = `${p[0].toFixed(4)},${p[1].toFixed(4)}`;
      counts.set(k, (counts.get(k) || 0) + 1);
    }
  return new Set([...counts].filter(([, n]) => n > 1).map(([k]) => k));
}
