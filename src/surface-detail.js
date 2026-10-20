import * as THREE from 'three';
let grain;
function detailTexture() {
  if(grain)return grain;
  const size=128,data=new Uint8Array(size*size*4);let seed=37;
  for(let i=0;i<size*size;i++) {
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const value=220+(seed>>>27);data.set([value,value,value,255],i*4);
  }
  grain=new THREE.DataTexture(data,size,size);grain.wrapS=grain.wrapT=THREE.RepeatWrapping;
  grain.magFilter=THREE.LinearFilter;grain.minFilter=THREE.LinearMipmapLinearFilter;grain.generateMipmaps=true;grain.needsUpdate=true;
  return grain;
}
// Subtle world-space grain; mipmaps and distance fade prevent distant shimmer.
export function surfaceDetail(material,scale=.7,strength=.18) {
  material.onBeforeCompile=shader=>{
    shader.uniforms.surfaceGrain={value:detailTexture()};
    shader.vertexShader='varying vec3 detailWorld;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\ndetailWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');
    shader.fragmentShader='uniform sampler2D surfaceGrain; varying vec3 detailWorld;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float grain=texture2D(surfaceGrain,detailWorld.xz*${scale.toFixed(3)}).r;
      float fade=1.0-smoothstep(35.0,180.0,distance(cameraPosition,detailWorld));
      diffuseColor.rgb*=1.0+(grain-.92)*${strength.toFixed(3)}*fade;
    `);
  };
  material.customProgramCacheKey=()=>`surface-detail-${scale}-${strength}`;
  return material;
}
// Drain refinement duplicates boundary vertices. Average their lighting normals
// before chunking, without moving vertices or changing collision heights.
export function smoothTerrainNormals(geometry) {
  const p=geometry.attributes.position,n=geometry.attributes.normal,groups=new Map();
  for(let i=0;i<p.count;i++) {
    const key=`${p.getX(i).toFixed(4)},${p.getY(i).toFixed(4)},${p.getZ(i).toFixed(4)}`;
    if(!groups.has(key))groups.set(key,{indices:[],sum:new THREE.Vector3()});
    const g=groups.get(key);g.indices.push(i);g.sum.add(new THREE.Vector3(n.getX(i),n.getY(i),n.getZ(i)));
  }
  for(const g of groups.values()) {
    if(g.indices.length<2)continue;g.sum.normalize();
    for(const i of g.indices)n.setXYZ(i,g.sum.x,g.sum.y,g.sum.z);
  }
  n.needsUpdate=true;return geometry;
}
