import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Preserve the original triangles/normals; only change their culling boundaries.
export function terrainChunks(geometry, material, size = 500) {
  const groups = new Map(), position=geometry.attributes.position, index=geometry.index;
  for(let i=0;i<index.count;i+=3) {
    const ids=[index.getX(i),index.getX(i+1),index.getX(i+2)];
    const x=ids.reduce((sum,id)=>sum+position.getX(id),0)/3;
    const z=ids.reduce((sum,id)=>sum+position.getZ(id),0)/3;
    const key=`${Math.floor(x/size)},${Math.floor(z/size)}`;
    if(!groups.has(key))groups.set(key,{vertices:new Map(),indices:[]});
    const group=groups.get(key);
    for(const id of ids) {
      if(!group.vertices.has(id))group.vertices.set(id,group.vertices.size);
      group.indices.push(group.vertices.get(id));
    }
  }
  const result=new THREE.Group();result.name='Terrain chunks';
  for(const group of groups.values()) {
    const geo=new THREE.BufferGeometry();
    for(const [name,attribute] of Object.entries(geometry.attributes)) {
      const array=new attribute.array.constructor(group.vertices.size*attribute.itemSize);
      for(const [source,target] of group.vertices)
        for(let k=0;k<attribute.itemSize;k++)array[target*attribute.itemSize+k]=attribute.array[source*attribute.itemSize+k];
      geo.setAttribute(name,new THREE.BufferAttribute(array,attribute.itemSize,attribute.normalized));
    }
    geo.setIndex(group.indices);geo.computeBoundingSphere();
    result.add(new THREE.Mesh(geo,material));
  }
  geometry.dispose();return result;
}

export function batchStaticScene(scene, size=100) {
  scene.updateMatrixWorld(true);
  const groups=new Map();
  scene.traverse(mesh=>{
    for(let parent=mesh;parent;parent=parent.parent)if(parent.userData.driveableBoat)return;
    if(!mesh.isMesh||mesh.isInstancedMesh||Array.isArray(mesh.material)||mesh.material.transparent||mesh.parent.name==='Terrain chunks')return;
    const p=new THREE.Vector3().setFromMatrixPosition(mesh.matrixWorld);
    const attributes=Object.keys(mesh.geometry.attributes).sort().join(',');
    const key=`${mesh.material.uuid}:${Math.floor(p.x/size)}:${Math.floor(p.z/size)}:${attributes}`;
    if(!groups.has(key))groups.set(key,[]);groups.get(key).push(mesh);
  });
  let removed=0;
  for(const meshes of groups.values()) {
    if(meshes.length<3)continue;
    const copies=meshes.map(mesh=>mesh.geometry.clone().applyMatrix4(mesh.matrixWorld));
    // Mixed indexed/non-indexed geometry is normalised only within eligible batches.
    const geometries=copies.map(geo=>geo.index?geo.toNonIndexed():geo);
    const merged=mergeGeometries(geometries,false);
    if(merged) {
      const batch=new THREE.Mesh(merged,meshes[0].material);batch.name='Static scenery batch';
      batch.computeBoundingSphere?.();scene.add(batch);
      meshes.forEach(mesh=>mesh.removeFromParent());removed+=meshes.length-1;
    }
    new Set([...copies,...geometries]).forEach(geo=>geo.dispose());
  }
  return removed;
}
