import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildRoute, crossedCheckpoint, ghostPose, formatTime, ROUTES } from '../src/racing.js';
import { START_LOCATIONS, RACE_LOCATIONS, resolveStart } from '../src/starts.js';
import { project } from '../src/geo.js';
import { smoothRoad, junctionKeys } from '../src/roads.js';
const load = f => JSON.parse(fs.readFileSync(new URL(`../public/data/${f}`, import.meta.url)));
test('all timed courses follow the connected real road network', () => {
  const network = load('roads.geojson'), coast = load('island.json').coastline.map(project);
  const junctions = junctionKeys(network.features.map(f => f.geometry.coordinates.map(project)));
  const roads = [];
  for (const f of network.features) {
    if (['footway','path','steps','cycleway','bridleway','construction','proposed'].includes(f.properties.highway)) continue;
    const line = smoothRoad(f.geometry.coordinates.map(project), junctions);
    for (let i = 1; i < line.length; i++) roads.push({ points: [line[i - 1], line[i]], id: String(f.id), kind: f.properties.highway, width: 3.5 });
  }
  const starts = Object.fromEntries([...START_LOCATIONS, ...RACE_LOCATIONS].map(l => [l.id, resolveStart(l, roads, coast)]));
  for (const route of ROUTES) {
    const course = buildRoute(roads, starts[route.from], starts[route.to]);
    assert.ok(course.checkpoints.length >= 2, route.id);
    if (route.id === 'doonmore-days') {
      const length = course.path.slice(1).reduce((sum, p, i) => sum + Math.hypot(p.x - course.path[i].x, p.z - course.path[i].z), 0);
      assert.ok(length > 1200, `new course should be substantially longer: ${length}`);
      console.log(`Doonmore to Day's: ${Math.round(length)} m, ${course.checkpoints.length} checkpoints`);
    }
    assert.deepEqual(course.checkpoints.at(-1), { x: starts[route.to].x, z: starts[route.to].z });
    for (const p of course.path) assert.ok(Number.isFinite(p.x) && Number.isFinite(p.z));
    let count = 0;
    for (let i = 1; i < course.path.length; i++) {
      if (count < course.checkpoints.length && crossedCheckpoint(course.path[i - 1], course.path[i], course.checkpoints[count])) count++;
    }
    assert.equal(count, course.checkpoints.length, `all checkpoints reachable: ${route.id}`);
  }
});
test('checkpoint detection includes high-speed crossings but rejects a missed gate', () => {
  assert.ok(crossedCheckpoint({ x: -30, z: 0 }, { x: 30, z: 0 }, { x: 0, z: 0 }));
  assert.ok(!crossedCheckpoint({ x: -30, z: 20 }, { x: 30, z: 20 }, { x: 0, z: 0 }));
});
test('ghost interpolates position and wraps heading via the shortest turn', () => {
  const samples = [{ t: 0, x: 0, z: 0, heading: Math.PI - 0.1 }, { t: 2, x: 10, z: 20, heading: -Math.PI + 0.1 }];
  const pose = ghostPose(samples, 1);
  assert.equal(pose.x, 5); assert.equal(pose.z, 10);
  assert.ok(Math.abs(pose.heading - Math.PI) < 1e-8);
  assert.equal(ghostPose(samples, 3), null);
  assert.equal(formatTime(65.125), '1:05.12');
});
