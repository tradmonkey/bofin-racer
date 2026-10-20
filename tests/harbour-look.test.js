import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {harbourWaterMaterial,addHarbourShoreRocks} from '../src/harbour-look.js';
import {project,inside} from '../src/geo.js';
import {harbourSurfaces} from '../src/harbour.js';
test('harbour water uses a bounded shore-colour field without changing water geometry',()=>{
 const coast=JSON.parse(fs.readFileSync(new URL('../public/data/island.json',import.meta.url))).coastline.map(project);
 const material=harbourWaterMaterial(coast);
 assert.equal(material.userData.shoreTexture.image.width,64);
 const shader={uniforms:{},vertexShader:'#include <worldpos_vertex>',fragmentShader:'#include <color_fragment>'};
 material.onBeforeCompile(shader);
 assert.ok(shader.uniforms.harbourShore);
 assert.match(shader.vertexShader,/modelMatrix/);assert.match(shader.fragmentShader,/smoothstep/);
 material.userData.shoreTexture.dispose();material.dispose();
});
test('shore rocks stay sparse and do not occupy pier footprints',()=>{
 const load=f=>JSON.parse(fs.readFileSync(new URL(`../public/data/${f}`,import.meta.url)));
 const coast=load('island.json').coastline.map(project),decks=harbourSurfaces(load('harbour.json'),()=>2);
 const rocks=addHarbourShoreRocks(new THREE.Scene(),coast,[],decks,()=>.6);
 assert.ok(rocks.count>0&&rocks.count<200);
 const matrix=new THREE.Matrix4(),point=new THREE.Vector3();
 for(let i=0;i<rocks.count;i++) {
  rocks.getMatrixAt(i,matrix);point.setFromMatrixPosition(matrix);
  assert.ok(Number.isFinite(point.x)&&Number.isFinite(point.z));
  assert.ok(!decks.some(deck=>inside(point.x,point.z,deck.points)));
 }
});
