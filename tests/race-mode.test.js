import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createRaceMode } from '../src/race-mode.js';
import { buildRoute } from '../src/racing.js';
test('timed runs pause, save only improved records and replay the saved ghost', () => {
  const elements = new Map();
  globalThis.document = { getElementById(id) {
    if (!elements.has(id)) elements.set(id, { value: '', textContent: '', hidden: false, add() {} });
    return elements.get(id);
  } };
  globalThis.Option = class { constructor(text, value) { this.textContent = text; this.value = value; } };
  const saved = new Map();
  globalThis.localStorage = { getItem: k => saved.get(k) ?? null, setItem: (k, v) => saved.set(k, v) };
  const roads = [{ points: [[0, 0], [300, 0]] }];
  const starts = { hostel: { x: 0, z: 0 }, "old-pier-race": { x: 300, z: 0 }, "new-pier": { x: 300, z: 0 }, "clossey-finish": { x: 300, z: 0 }, "galley": { x: 300, z: 0 }, doonmore: { x: 0, z: 0 }, days: { x: 300, z: 0 }, harbour: { x: 0, z: 0 }, 'old-pier': { x: 300, z: 0 }, north: { x: 300, z: 0 }, west: { x: 0, z: 0 }, east: { x: 300, z: 0 } };
  const scene = new THREE.Scene();
  const mode = createRaceMode({ scene, roads, starts, heightAt: () => 0, begin: () => 'fiesta', toast() {} });
  elements.get('race-route').value = 'doonmore-days';
  const button = elements.get('race-start'), status = elements.get('race-status');
  const points = buildRoute(roads, starts.harbour, starts['old-pier']).checkpoints;
  function run(step) {
    button.onclick();
    assert.ok(mode.countingDown);
    mode.tick(3, starts.harbour, 0, true);
    for (const p of points) mode.tick(step, p, 0, true);
    assert.equal(mode.active, false);
  }
  run(1);
  assert.match(status.textContent, /Personal best/);
  const record = saved.get('bofin-race-v1:doonmore-days:fiesta');
  assert.ok(record);
  assert.equal(scene.children.length, 0);
  button.onclick();
  assert.ok(scene.children.some(o => o.userData.vehicleType === 'fiesta'));
  mode.tick(3, starts.harbour, 0, true);
  mode.tick(4, starts.harbour, 0, false);
  assert.match(status.textContent, /Paused · 0:00.00/);
  mode.cancel();
  assert.equal(scene.children.length, 0);
  run(2);
  assert.equal(saved.get('bofin-race-v1:doonmore-days:fiesta'), record);
  assert.match(status.textContent, /Finished!/);
  run(0.5);
  assert.ok(JSON.parse(saved.get('bofin-race-v1:doonmore-days:fiesta')).time < JSON.parse(record).time);
  localStorage.setItem = () => { throw new Error('quota'); };
  run(0.1);
  assert.match(status.textContent, /record not saved/);
});


test('leaderboard opt-out/name check and completed-run callback do not affect local ghosts', () => {
  const elements = new Map();
  globalThis.document = { getElementById(id) {
    if (!elements.has(id)) elements.set(id, { value: '', textContent: '', hidden: false, add() {} });
    return elements.get(id);
  } };
  globalThis.Option = class { constructor(text,value) {this.textContent=text;this.value=value;} };
  const store=new Map();globalThis.localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};
  const roads=[{points:[[0,0],[300,0]]}], starts=Object.fromEntries(['hostel','new-pier','clossey-finish','galley','doonmore','days','harbour','old-pier','old-pier-race','north','west','east'].map(k=>[k,{x:k==='doonmore'?0:300,z:0}]));
  let allowed=false,began=0,submitted;
  const mode=createRaceMode({scene:new THREE.Scene(),roads,starts,heightAt:()=>0,begin:()=>{began++;return 'fiesta';},toast(){},leaderboard:{beforeRace:()=>allowed,identity:()=>({name:'Tom'}),submit:run=>{submitted=run;}}});
  elements.get('race-start').onclick();assert.equal(began,0);
  allowed=true;elements.get('race-start').onclick();assert.equal(began,1);
  mode.tick(3,starts.doonmore,0,true);
  for(const p of buildRoute(roads,starts.doonmore,starts.days).checkpoints)mode.tick(1,p,0,true);
  assert.equal(mode.active,false);assert.equal(submitted.identity.name,'Tom');assert.equal(submitted.course,'doonmore-days');
  assert.equal(submitted.samples[0].t,0);assert.equal(submitted.samples[0].x,0);
  assert.ok(store.has('bofin-race-v1:doonmore-days:fiesta'));
});
