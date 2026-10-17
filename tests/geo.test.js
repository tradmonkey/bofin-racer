import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { project, inside, nearestRoad, terrainSampler } from "../src/geo.js";
const load = (f) =>
  JSON.parse(fs.readFileSync(new URL(`../public/data/${f}`, import.meta.url)));
test("local projection preserves metre scale and north direction", () => {
  const a = project([-10.213, 53.62]);
  assert.deepEqual(a, [0, 0]);
  const b = project([-10.213, 53.621]);
  assert.ok(Math.abs(b[1] + 111.195) < 0.01);
  const c = project([-10.212, 53.62]);
  assert.ok(c[0] > 65 && c[0] < 67);
});
test("nearest road projects to segment and respects endpoints", () => {
  const s = [
    {
      points: [
        [0, 0],
        [0, 100],
      ],
      name: "Lane",
      width: 3.5,
    },
  ];
  assert.equal(nearestRoad(5, 20, s).distance, 5);
  assert.equal(nearestRoad(0, 150, s).z, 100);
});
test("terrain interpolation agrees at corners and middle", () => {
  const sample = terrainSampler({
    width: 2,
    height: 2,
    bounds: [-10.213, 53.619, -10.212, 53.62],
    values: [0, 10, 20, 30],
  });
  assert.equal(sample(...project([-10.213, 53.62])), 0);
  assert.ok(Math.abs(sample(...project([-10.2125, 53.6195])) - 15) < 0.00001);
});
test("real data contains the island harbour and roads above the sea", () => {
  const island = load("island.json"),
    grid = load("terrain.json"),
    network = load("roads.geojson");
  const ring = island.coastline.map(project);
  assert.ok(inside(...project([-10.213, 53.62]), ring));
  assert.ok(!inside(...project([-10.25, 53.6]), ring));
  assert.ok(network.features.length > 50);
  assert.equal(grid.values.length, grid.width * grid.height);
  const height = terrainSampler(grid);
  assert.ok(height(...project([-10.213, 53.62])) > 0);
  for (const f of network.features)
    assert.ok(f.geometry.coordinates.some((p) => inside(...project(p), ring)));
});

test('coastal road heights match the raised land triangles, including low DEM samples', async () => {
  const { landTerrainSampler } = await import('../src/geo.js');
  const grid = { width: 2, height: 2, bounds: [-10.22, 53.61, -10.20, 53.63], values: [0, 0, 0, 3] };
  const ground = landTerrainSampler(grid);
  for (const [lon, lat] of [[-10.22, 53.63], [-10.21, 53.62], [-10.205, 53.615]]) {
    const p = project([lon, lat]);
    assert.ok(ground(...p) >= 0.6 - 1e-8);
  }
  // At the centre the terrain triangle uses the two adjacent coastal vertices.
  assert.ok(Math.abs(ground(...project([-10.21, 53.62])) - 0.6) < 1e-7);
});
