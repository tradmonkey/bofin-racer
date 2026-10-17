import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { START_LOCATIONS, resolveStart } from "../src/starts.js";
import { project, inside } from "../src/geo.js";
const load = (f) =>
  JSON.parse(fs.readFileSync(new URL(`../public/data/${f}`, import.meta.url)));
test("all start locations resolve to distinct roads on the island", () => {
  const coast = load("island.json").coastline.map(project),
    roads = [];
  for (const f of load("roads.geojson").features) {
    const p = f.geometry.coordinates.map(project);
    for (let i = 0; i < p.length - 1; i++)
      roads.push({
        points: [p[i], p[i + 1]],
        id: String(f.id),
          kind: f.properties.highway,
        width: 3.5,
      });
  }
  const points = START_LOCATIONS.map((l) => resolveStart(l, roads, coast));
  for (const p of points) {
    assert.ok(inside(p.x, p.z, coast));
    assert.ok(p.distance < 50);
    assert.ok(Number.isFinite(p.heading));
  }
  assert.equal(new Set(points.map((p) => `${p.x},${p.z}`)).size, START_LOCATIONS.length);
});
