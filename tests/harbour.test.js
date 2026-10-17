import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { roofPlanes, roadProfile } from "../src/architecture.js";
import { harbourSurfaces, onDeck } from "../src/harbour.js";
import { inside, terrainSampler } from "../src/geo.js";
const load = (f) =>
  JSON.parse(fs.readFileSync(new URL(`../public/data/${f}`, import.meta.url)));
test("pitched roofs remain within the footprint and include a ridge", () => {
  const ring = [
      [0, 0],
      [10, 0],
      [10, 4],
      [0, 4],
      [0, 0],
    ],
    planes = roofPlanes(ring, 1.2);
  assert.equal(planes.length, 2);
  assert.equal(
    Math.max(...planes.flatMap((p) => p.points.map((v) => v[1]))),
    1.2,
  );
  for (const p of planes) {
    assert.ok(p.indices.length >= 3);
    for (const [x, y, z] of p.points) {
      assert.ok(x >= 0 && x <= 10 && z >= 0 && z <= 4);
      assert.ok(y >= 0 && y <= 1.2);
    }
  }
});
test("roof construction handles an irregular footprint", () => {
  const ring = [
    [0, 0],
    [8, 0],
    [8, 3],
    [4, 3],
    [4, 6],
    [0, 6],
  ];
  for (const plane of roofPlanes(ring, 1.5))
    for (let i = 0; i < plane.indices.length; i += 3) {
      const triangle = plane.indices
        .slice(i, i + 3)
        .map((j) => plane.points[j]);
      const x = triangle.reduce((v, p) => v + p[0], 0) / 3,
        z = triangle.reduce((v, p) => v + p[2], 0) / 3;
      assert.ok(inside(x, z, ring));
    }
});
test("mapped widths override lane-based estimates", () => {
  assert.equal(roadProfile({ width: "4.2", lanes: "2" }).width, 4.2);
  assert.equal(roadProfile({ width: "4.2" }).estimated, false);
  assert.ok(
    roadProfile({ lanes: "2" }).width > roadProfile({ lanes: "1" }).width,
  );
  assert.notEqual(
    roadProfile({ highway: "track" }).color,
    roadProfile({ surface: "asphalt" }).color,
  );
});
test("both mapped piers have continuous above-water decks", () => {
  const data = load("harbour.json"),
    decks = harbourSurfaces(data, terrainSampler(load("terrain.json")));
  assert.equal(decks.length, 2);
  assert.ok(data.features.filter((f) => f.tags.barrier === "wall").length > 40);
  for (const d of decks) {
    assert.ok(d.y >= 1.5);
    const p = d.points[0],
      q = d.points[1],
      r = d.points[2],
      x = (p[0] + q[0] + r[0]) / 3,
      z = (p[1] + q[1] + r[1]) / 3;
    if (inside(x, z, d.points)) assert.equal(onDeck(x, z, decks).id, d.id);
  }
  assert.equal(onDeck(-10000, -10000, decks), undefined);
});
