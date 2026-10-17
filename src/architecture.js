import * as THREE from "three";
// Split a footprint along its longest-edge axis to form two roof planes.
// This preserves mapped footprints, including extensions and irregular shapes.
export function roofPlanes(input, rise) {
  const pts =
    input.at(0)[0] === input.at(-1)[0] && input.at(0)[1] === input.at(-1)[1]
      ? input.slice(0, -1)
      : input;
  if (pts.length < 3) return [];
  let longest = 0,
    axis = [1, 0];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i],
      b = pts[(i + 1) % pts.length],
      dx = b[0] - a[0],
      dz = b[1] - a[1],
      l = Math.hypot(dx, dz);
    if (l > longest) {
      longest = l;
      axis = [dx / l, dz / l];
    }
  }
  const normal = [-axis[1], axis[0]],
    dist = (p) => p[0] * normal[0] + p[1] * normal[1];
  const min = Math.min(...pts.map(dist)),
    max = Math.max(...pts.map(dist)),
    mid = (min + max) / 2,
    half = (max - min) / 2;
  if (half < 0.01) return [];
  const split = (sign) => {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i],
        b = pts[(i + 1) % pts.length],
        da = sign * (dist(a) - mid),
        db = sign * (dist(b) - mid);
      if (da >= -1e-8) out.push(a);
      if ((da > 0 && db < 0) || (da < 0 && db > 0)) {
        const t = da / (da - db);
        out.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
      }
    }
    return out;
  };
  return [split(1), split(-1)]
    .filter((p) => p.length >= 3)
    .map((p) => ({
      points: p.map((a) => [
        a[0],
        rise * Math.max(0, 1 - Math.abs(dist(a) - mid) / half),
        a[1],
      ]),
      indices: THREE.ShapeUtils.triangulateShape(
        p.map((a) => new THREE.Vector2(...a)),
        [],
      ).flat(),
    }));
}
export function makeRoof(pts, base, rise, mat, wallMat = mat) {
  const vertices = [],
    indices = [],
    caps = [],
    capIndices = [];
  for (const plane of roofPlanes(pts, rise)) {
    const offset = vertices.length / 3;
    for (const p of plane.points) vertices.push(p[0], p[1] + base, p[2]);
    indices.push(...plane.indices.map((i) => i + offset));
    for (let i = 0; i < plane.points.length; i++) {
      const a = plane.points[i],
        b = plane.points[(i + 1) % plane.points.length];
      if (a[1] + b[1] < 1e-8) continue;
      const boundary = pts.some((p, j) => {
        const q = pts[(j + 1) % pts.length],
          dx = q[0] - p[0],
          dz = q[1] - p[1],
          l2 = dx * dx + dz * dz;
        if (l2 < 0.01) return false;
        const on = (v) =>
          Math.abs((v[0] - p[0]) * dz - (v[2] - p[1]) * dx) < 1e-5 &&
          (v[0] - p[0]) * dx + (v[2] - p[1]) * dz >= -1e-6 &&
          (v[0] - p[0]) * dx + (v[2] - p[1]) * dz <= l2 + 1e-6;
        return on(a) && on(b);
      });
      if (!boundary) continue;
      const k = caps.length / 3;
      caps.push(
        a[0],
        base,
        a[2],
        b[0],
        base,
        b[2],
        a[0],
        base + a[1],
        a[2],
        b[0],
        base + b[1],
        b[2],
      );
      capIndices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
  }
  const mesh = (v, ix, m) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
    geo.setIndex(ix);
    geo.computeVertexNormals();
    return new THREE.Mesh(geo, m);
  };
  const g = new THREE.Group();
  g.add(mesh(vertices, indices, mat));
  if (caps.length) g.add(mesh(caps, capIndices, wallMat));
  return g;
}
export function roadProfile(tags) {
  const width = parseFloat(tags.width),
    lanes = parseInt(tags.lanes);
  return {
    width:
      Number.isFinite(width) && width > 0
        ? Math.max(1.5, Math.min(12, width))
        : lanes >= 2
          ? 5.5
          : tags.highway === "track"
            ? 2.6
            : tags.highway === "service"
              ? 3
              : 3.5,
    estimated: !Number.isFinite(width),
    color:
      tags.surface === "asphalt" || tags.highway !== "track"
        ? "#646d69"
        : "#96917b",
  };
}
