import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {smoothTerrainNormals,surfaceDetail} from '../src/surface-detail.js';
test('terrain seam smoothing preserves positions and shares duplicate normals',()=>{
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,1,0,0,0,0,0],3));
 geo.setAttribute('normal',new THREE.Float32BufferAttribute([0,1,0,0,1,0,0,.8,.6],3));
 const before=Array.from(geo.attributes.position.array);
 smoothTerrainNormals(geo);
 assert.deepEqual(Array.from(geo.attributes.position.array),before);
 assert.deepEqual(Array.from(geo.attributes.normal.array.slice(0,3)),Array.from(geo.attributes.normal.array.slice(6,9)));
});
test('surface grain is mipmapped and fades with viewing distance',()=>{
 const material=surfaceDetail(new THREE.MeshStandardMaterial());
 const shader={uniforms:{},vertexShader:'#include <worldpos_vertex>',fragmentShader:'#include <color_fragment>'};
 material.onBeforeCompile(shader);
 assert.equal(shader.uniforms.surfaceGrain.value.generateMipmaps,true);
 assert.match(shader.fragmentShader,/smoothstep\(35.0,180.0/);
 assert.ok(!shader.vertexShader.includes('\\n'));
});
