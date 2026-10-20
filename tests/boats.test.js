import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { makeFerry, ferryPlacements, makeCargoFerry, cargoPlacement } from '../src/boats.js';
import { harbourSurfaces } from '../src/harbour.js';
import { project, inside } from '../src/geo.js';
test('moored ferries sit in water outside the pier and coastline', () => {
  const load = f => JSON.parse(fs.readFileSync(new URL(`../public/data/${f}`, import.meta.url)));
  const data = load('harbour.json'), coast = load('island.json').coastline.map(project);
  const feature = data.features.find(f => f.tags.mooring === 'ferry');
  const decks = harbourSurfaces(data, () => 2);
  const pier = decks.find(d => d.id === feature.id);
  const cargo = cargoPlacement(decks.find(d => d.name === "Old Pier"));
  for (const p of [...ferryPlacements(pier), cargo]) {
    for (const x of [-p.beam / 2, 0, p.beam / 2]) for (const z of [-p.length / 2, 0, p.length / 2]) {
      const wx = p.x + x * Math.cos(p.heading) + z * Math.sin(p.heading);
      const wz = p.z - x * Math.sin(p.heading) + z * Math.cos(p.heading);
      assert.ok(!inside(wx, wz, coast), 'boat must stay offshore');
      assert.ok(!decks.some(d => inside(wx, wz, d.points)), 'boat must not overlap the driveable pier');
    }
    const boat = p === cargo ? makeCargoFerry() : makeFerry(p);
    const bounds = new THREE.Box3().setFromObject(boat);
    assert.ok(bounds.max.y > 8);
    assert.ok(bounds.max.z - bounds.min.z >= p.length - 0.1);
  }
});

test('New Pier seaward end is water beneath the independent pier deck',()=>{
 const load=f=>JSON.parse(fs.readFileSync(new URL(`../public/data/${f}`,import.meta.url)));
 const data=load('harbour.json'),coast=load('island.json').coastline.map(project);
 const feature=data.features.find(f=>f.tags.mooring==='ferry');
 const decks=harbourSurfaces(data,()=>2),pier=decks.find(d=>d.id===feature.id);
 const tip=project([-10.212095,53.61275]);
 assert.equal(inside(...tip,coast),false);
 assert.equal(inside(...tip,pier.points),true);
 const beyond=project([-10.212095,53.61265]);
 assert.equal(inside(...beyond,coast),false);
});
