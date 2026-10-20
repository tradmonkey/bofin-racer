import * as THREE from 'three';
import { nearestRoad, inside } from './geo.js';

// Shore-distance colour field, not a bathymetric/depth model. Only affects water appearance.
export function harbourWaterMaterial(coast) {
  const bounds=[-950,500,800,1500],size=64,data=new Uint8Array(size*size*4);
  const segments=coast.map((a,i)=>({points:[a,coast[(i+1)%coast.length]]}));
  for(let j=0;j<size;j++)for(let i=0;i<size;i++) {
    const x=bounds[0]+i/(size-1)*(bounds[2]-bounds[0]),z=bounds[1]+j/(size-1)*(bounds[3]-bounds[1]);
    const distance=nearestRoad(x,z,segments).distance;
    const k=(j*size+i)*4;
    data[k]=Math.round(Math.min(1,distance/160)*255);data[k+1]=0;data[k+2]=0;data[k+3]=255;
  }
  const texture=new THREE.DataTexture(data,size,size);texture.minFilter=texture.magFilter=THREE.LinearFilter;texture.needsUpdate=true;
  const material=new THREE.MeshStandardMaterial({color:'#538d96',roughness:0.38,metalness:0.12});
  material.onBeforeCompile=shader=>{
    shader.uniforms.harbourShore={value:texture};
    shader.vertexShader='varying vec2 harbourXZ;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nharbourXZ = (modelMatrix * vec4(transformed, 1.0)).xz;');
    shader.fragmentShader='uniform sampler2D harbourShore; varying vec2 harbourXZ;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      vec2 shoreUV = (harbourXZ - vec2(-950.0, 500.0)) / vec2(1750.0, 1000.0);
      float edge = min(min(shoreUV.x, 1.0-shoreUV.x)*1750.0, min(shoreUV.y, 1.0-shoreUV.y)*1000.0);
      float blend = smoothstep(0.0, 130.0, edge);
      float shore = texture2D(harbourShore, clamp(shoreUV,0.0,1.0)).r;
      float mottling = sin(harbourXZ.x*.047)*sin(harbourXZ.y*.039)*.025;
      vec3 shallow = vec3(.105,.40,.35);
      vec3 deep = vec3(.095,.235,.29);
      diffuseColor.rgb = mix(diffuseColor.rgb, mix(shallow,deep,smoothstep(.08,.95,shore)) + mottling, blend*.72);
    `);
  };
  material.userData.shoreTexture=texture;
  return material;
}

export function addHarbourShoreRocks(scene,coast,roads,decks,heightAt) {
  const placements=[];
  for(let i=0;i<coast.length-1;i++) {
    const a=coast[i],b=coast[i+1],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
    for(let d=4;d<length;d+=13) {
      const t=d/length,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t;
      if(x< -700||x>650||z<650||z>1250)continue;
      if(nearestRoad(x,z,roads).distance<10)continue;
      if(decks.some(deck=>inside(x,z,deck.points)||nearestRoad(x,z,deck.points.slice(1).map((p,j)=>({points:[deck.points[j],p]}))).distance<12))continue;
      const y=heightAt(x,z);
      if(y>5)continue;
      if (placements.length >= 120) continue;
      placements.push({x,z,y:Math.max(.15,Math.min(y,.9))});
    }
  }
  const mesh=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),new THREE.MeshStandardMaterial({color:'#797e70',roughness:1}),placements.length);
  const dummy=new THREE.Object3D(),color=new THREE.Color();
  placements.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(.1*Math.sin(i),i*2.4,.12);dummy.scale.set(1.6+(i%3)*.4,.6+(i%4)*.15,1.1+(i%2)*.5);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);color.set(i%3===0?'#69726a':i%3===1?'#969482':'#7e8276');mesh.setColorAt(i,color);});
  mesh.name='Sparse harbour shoreline rock';scene.add(mesh);return mesh;
}
