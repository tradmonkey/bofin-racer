import * as THREE from 'three';
import { project, nearestRoad } from './geo.js';
export function addCraftHut(scene, roads, heightAt, obstacles) {
  const church = project([-10.20848, 53.61359]);
  const road = nearestRoad(...project([-10.20858, 53.61343]), roads);
  const heading = road.heading;
  let nx = Math.cos(heading), nz = -Math.sin(heading);
  if (nx * (church[0] - road.x) + nz * (church[1] - road.z) > 0) { nx *= -1; nz *= -1; }
  const offset = road.width / 2 + 2;
  const x = road.x + nx * offset, z = road.z + nz * offset;
  const w = 2.4, length = 4.8;
  const corners = [[-w/2,-length/2],[w/2,-length/2],[w/2,length/2],[-w/2,length/2]].map(([px,pz]) => [x + px * Math.cos(heading) + pz * Math.sin(heading), z - px * Math.sin(heading) + pz * Math.cos(heading)]);
  const y = Math.max(...corners.map(p => heightAt(...p))) + 0.35;
  const hut = new THREE.Group(); hut.name = 'Teal craft hut opposite the church'; hut.position.set(x,y,z); hut.rotation.y = heading;
  const mat = color => new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
  const teal = mat('#537f7a'), seam = mat('#426e68'), white = mat('#e7e3d2'), dark = mat('#263c39'), glass = mat('#5c7777'), roof = mat('#454d47');
  const box = (bw,bh,bd,m,px,py,pz) => { const mesh = new THREE.Mesh(new THREE.BoxGeometry(bw,bh,bd),m); mesh.position.set(px,py,pz); hut.add(mesh); return mesh; };
  box(w,2.7,length,teal,0,1.35,0);
  for(const side of [-1,1]) {
    for(let pz=-length/2;pz<=length/2;pz+=0.18) box(0.025,2.65,0.02,seam,side*(w/2+0.01),1.35,pz);
    for(const pz of [-0.9,1.15]) {
      box(0.08,1.05,0.85,white,side*1.23,1.9,pz);
      box(0.09,0.85,0.65,glass,side*1.28,1.9,pz);
      box(0.1,0.05,0.7,white,side*1.33,1.9,pz);
      box(0.1,0.9,0.05,white,side*1.33,1.9,pz);
    }
    box(0.11,0.85,0.75,white,side*1.26,0.85,0.05);
    for(const pz of [-1.7,1.7]) box(0.1,0.7,0.12,dark,side*0.9,-0.25,pz);
  }
  for(const end of [-1,1]) {
    const arch = new THREE.Shape(); arch.moveTo(-1.2,0); arch.lineTo(1.2,0);
    arch.quadraticCurveTo(0,0.9,-1.2,0); arch.closePath();
    const cap = new THREE.Mesh(new THREE.ShapeGeometry(arch), new THREE.MeshStandardMaterial({color:'#537f7a',side:THREE.DoubleSide})); cap.position.set(0,2.7,end*2.4); hut.add(cap);
    box(0.7,1.05,0.08,white,0.35,1.9,end*2.44);
    box(0.52,0.87,0.09,glass,0.35,1.9,end*2.49);
    box(0.04,0.9,0.1,white,0.35,1.9,end*2.54);
    box(0.6,0.04,0.1,white,0.35,1.9,end*2.54);
  }
  const vertices=[],indices=[];
  for(let i=0;i<=24;i++) {
    const px=-1.3+2.6*i/24, py=2.7+0.45*(1-(px/1.3)**2);
    vertices.push(px,py,-2.52,px,py,2.52);
    if(i<24) {const k=i*2; indices.push(k,k+1,k+2,k+1,k+3,k+2);}
  }
  const geometry=new THREE.BufferGeometry(); geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3)); geometry.setIndex(indices); geometry.computeVertexNormals(); roof.side=THREE.DoubleSide; hut.add(new THREE.Mesh(geometry,roof));
  if(typeof document!=='undefined') {
    const canvas=document.createElement('canvas');canvas.width=128;canvas.height=512;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#1b302e';ctx.fillRect(0,0,128,512);ctx.fillStyle='#eee9da';ctx.textAlign='center';ctx.font='40px Georgia';
    [...'CRAFT'].forEach((letter,i)=>ctx.fillText(letter,64,65+i*78));ctx.font='22px Georgia';ctx.fillText('shop',64,486);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    for(const end of [-1,1]) {const sign=new THREE.Mesh(new THREE.PlaneGeometry(0.48,2.2),new THREE.MeshBasicMaterial({map:texture}));sign.position.set(-0.65,1.45,end*2.46);if(end<0)sign.rotation.y=Math.PI;hut.add(sign);}
  }
  scene.add(hut);
  obstacles.push({x,z,w:Math.max(...corners.map(p=>Math.abs(p[0]-x))),d:Math.max(...corners.map(p=>Math.abs(p[1]-z))),points:corners});
}
