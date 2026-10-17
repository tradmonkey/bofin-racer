export const ORIGIN = [-10.213, 53.62];
const R = 6371008.8,
  DEG = Math.PI / 180;
export function project([lon, lat]) {
  return [
    (lon - ORIGIN[0]) * DEG * R * Math.cos(ORIGIN[1] * DEG),
    (ORIGIN[1] - lat) * DEG * R,
  ];
}
export function inside(x, z, ring) {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i],
      b = ring[j];
    if (
      a[1] > z !== b[1] > z &&
      x < ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]) + a[0]
    )
      c = !c;
  }
  return c;
}
export function nearestRoad(x, z, segments) {
  let best = { distance: Infinity };
  for (const s of segments) {
    const [a, b] = s.points;
    const dx = b[0] - a[0],
      dz = b[1] - a[1],
      length = dx * dx + dz * dz;
    if (!length) continue;
    const t = Math.max(
      0,
      Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / length),
    );
    const px = a[0] + t * dx,
      pz = a[1] + t * dz,
      d = Math.hypot(x - px, z - pz);
    if (d < best.distance)
      best = {
        distance: d,
        x: px,
        z: pz,
        heading: Math.atan2(dx, dz),
        name: s.name,
        width: s.width,
      };
  }
  return best;
}
export function terrainSampler(grid) {
  const { width, height, bounds, values } = grid;
  return (x, z) => {
    const lon = ORIGIN[0] + x / (R * DEG * Math.cos(ORIGIN[1] * DEG)),
      lat = ORIGIN[1] - z / (R * DEG);
    const u = Math.max(
        0,
        Math.min(
          width - 1,
          ((lon - bounds[0]) / (bounds[2] - bounds[0])) * (width - 1),
        ),
      ),
      v = Math.max(
        0,
        Math.min(
          height - 1,
          ((bounds[3] - lat) / (bounds[3] - bounds[1])) * (height - 1),
        ),
      );
    const i = Math.min(width - 2, Math.floor(u)),
      j = Math.min(height - 2, Math.floor(v)),
      a = u - i,
      b = v - j;
    // Match the two triangles used by the rendered terrain grid so road
    // surfaces cannot sink into hills between sampled elevation vertices.
    const nw = values[j * width + i],
      ne = values[j * width + i + 1],
      sw = values[(j + 1) * width + i],
      se = values[(j + 1) * width + i + 1];
    return a + b <= 1
      ? nw * (1 - a - b) + ne * a + sw * b
      : ne * (1 - b) + sw * (1 - a) + se * (a + b - 1);
  };
}

// Apply the land floor to grid vertices before interpolation so driving and
// road meshes follow the same triangles as the visible low coastal terrain.
export function landTerrainSampler(grid) {
  return terrainSampler({ ...grid, values: grid.values.map(value => Math.max(0.6, value)) });
}
