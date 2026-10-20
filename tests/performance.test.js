import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {spatialIndex,roadBounds} from '../src/spatial-index.js';
import {nearestRoad} from '../src/geo.js';
import {terrainChunks,batchStaticScene} from '../src/static-scene.js';
import {VEHICLES} from '../src/vehicles.js';
import {readFileSync} from 'node:fs';
test('spatial road broad phase preserves nearest hits and obstacle boundaries',()=>{
 const roads=Array.from({length:200},(_,i)=>({points:[[i*7-600,Math.sin(i)*200],[i*7-580,Math.cos(i)*200]],width:3.5,name:String(i)}));
 const query=spatialIndex(roads,roadBounds);
 for(let i=0;i<1000;i++) {
  const x=Math.sin(i)*1500,z=Math.cos(i*0.73)*800;
  let actual=nearestRoad(x,z,query(x,z,80));
  if(actual.distance>80)actual=nearestRoad(x,z,roads);
  assert.deepEqual(actual,nearestRoad(x,z,roads));
 }
 const obstacle={x:80,z:80,w:5,d:5};
 const nearby=spatialIndex([obstacle],o=>[o.x-o.w,o.z-o.d,o.x+o.w,o.z+o.d]);
 for(const p of [[75,75],[85,85],[80,80]])assert.ok(nearby(...p).includes(obstacle));
});
test('terrain chunks preserve every triangle and its normals',()=>{
 const geometry=new THREE.PlaneGeometry(1200,1200,12,12);geometry.rotateX(-Math.PI/2);
 const original=geometry.index.count;
 const group=terrainChunks(geometry,new THREE.MeshStandardMaterial());
 assert.ok(group.children.length>1);
 assert.equal(group.children.reduce((n,m)=>n+m.geometry.index.count,0),original);
 for(const mesh of group.children)assert.equal(mesh.geometry.attributes.normal.count,mesh.geometry.attributes.position.count);
});
test('static batching preserves world bounds and leaves transparent scenery separate',()=>{
 const scene=new THREE.Scene(),material=new THREE.MeshStandardMaterial();
 const parent=new THREE.Group();parent.position.set(12,2,5);scene.add(parent);
 for(let i=0;i<4;i++){const mesh=new THREE.Mesh(new THREE.BoxGeometry(),material);mesh.position.x=i*2;parent.add(mesh);}
 const before=new THREE.Box3().setFromObject(scene);
 assert.equal(batchStaticScene(scene),3);
 const after=new THREE.Box3().setFromObject(scene);
 assert.ok(before.min.distanceTo(after.min)<1e-6);assert.ok(before.max.distanceTo(after.max)<1e-6);
 const glass=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial({transparent:true}));scene.add(glass);
 batchStaticScene(scene);assert.equal(glass.parent,scene);
});
test('every selectable vehicle has a static PNG preview',()=>{
 for(const vehicle of VEHICLES){const png=readFileSync(new URL(`../public/vehicles/${vehicle.id}.png`,import.meta.url));assert.equal(png.subarray(1,4).toString(),'PNG');}
});
