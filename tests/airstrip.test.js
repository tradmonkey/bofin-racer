import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { createAirstrip, addAirstrip } from '../src/airstrip.js';
import { inside, project, landTerrainSampler } from '../src/geo.js';
const load = name => JSON.parse(fs.readFileSync(new URL(`../public/data/${name}`, import.meta.url)));
test('airstrip and drift loop stay on the island and have a smooth grade', () => {
  const track = createAirstrip(landTerrainSampler(load('terrain.json')));
  const coast = load('island.json').coastline.map(project);
  let previous;
  for (let z = -278; z <= 278; z += 2) {
    const p = track.world(0,z), height = track.height(p.x,p.z);
    assert.ok(inside(p.x,p.z,coast));
    if (previous !== undefined) assert.ok(Math.abs(height - previous) < 0.06);
    previous = height;
    const q = track.local(p.x,p.z); assert.ok(Math.abs(q.x)<1e-6 && Math.abs(q.z-z)<1e-6);
  }
  for (const p of track.loop) assert.ok(inside(p.x,p.z,coast));
});
test('gate unlocks speed pads, pad boosts expire and stop outside the airstrip', () => {
  const track = createAirstrip(() => 8);
  const p = track.pads[0];
  assert.equal(track.tick(.02,p,p,20).launched,false);
  const gate = track.tick(.02,track.world(0,-300),track.world(0,-275),10);
  assert.ok(gate.discovered);
  assert.ok(track.unlocked);
  const trigger = track.tick(.02,track.world(0,-220),track.world(0,-190),20);
  assert.ok(trigger.launched && trigger.turbo);
  track.tick(4,track.world(0,-180),track.world(0,-160),20);
  assert.equal(track.turbo,false);
  track.tick(.02,track.world(0,-215),track.world(0,-200),20);
  assert.equal(track.turbo,true);
  const outside = track.world(100,0);
  track.tick(.02,outside,outside,20); assert.equal(track.turbo,false);
});
test('track creates connected internal road ribbons and a driveable approach', () => {
  const track = createAirstrip(() => 8), scene = new THREE.Scene();
  const start = track.world(0,-360), end = track.world(90,-360);
  const roads = [{ points: [[start.x,start.z],[end.x,end.z]], width: 4, id: 'normal' }], mapRoads=[];
  addAirstrip(scene,track,roads,mapRoads,(x,z)=>track.height(x,z));
  assert.ok(roads.length>400);
  assert.ok(mapRoads.length>=6);
  for (const mesh of scene.children) {
    const positions = mesh.geometry?.getAttribute('position');
    if (positions) for (const value of positions.array) assert.ok(Number.isFinite(value));
  }
});

test('boundary clipping leaves every road and crossing clear', async () => {
  const { trimBoundaryAtRoads } = await import('../src/airstrip.js');
  const roads=[{points:[[-20,0],[20,0]],width:6},{points:[[0,-20],[0,20]],width:4}];
  const sections=trimBoundaryAtRoads([[[-15,5],[15,5]],[[-15,-15],[15,15]]],roads);
  assert.ok(sections.length>=3);
  for(const [a,b] of sections)for(let i=0;i<=100;i++) {
    const x=a[0]+(b[0]-a[0])*i/100,z=a[1]+(b[1]-a[1])*i/100;
    assert.ok(Math.abs(z)>=4.15-1e-6);
    assert.ok(Math.abs(x)>=3.15-1e-6);
  }
});
