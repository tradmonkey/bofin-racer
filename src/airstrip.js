import * as THREE from 'three';
import { project, nearestRoad } from './geo.js';
import { crossedCheckpoint } from './racing.js';

// Fictional driving playground centred on the real Inishbofin airstrip.
// Runway centre from OurAirports IE-0007; layout and stunt features are illustrative.
export function createAirstrip(ground) {
  const center = project([-10.21085, 53.6196]);
  const heading = Math.atan2(0.0016 * Math.cos(53.62 * Math.PI / 180), -0.0051);
  const sin = Math.sin(heading), cos = Math.cos(heading);
  const world = (x, z) => ({ x: center[0] + x * cos + z * sin, z: center[1] - x * sin + z * cos });
  const local = (x, z) => ({ x: (x - center[0]) * cos - (z - center[1]) * sin, z: (x - center[0]) * sin + (z - center[1]) * cos });
  const south = world(0, -275), north = world(0, 275);
  const low = ground(south.x, south.z), high = ground(north.x, north.z);
  const slope = Math.max(-0.025, Math.min(0.025, (high - low) / 550));
  const base = (low + high) / 2;
  const arena = (x, z) => { const p = local(x, z); return Math.abs(p.x) <= 64 && Math.abs(p.z) <= 292; };
  function height(x, z) {
    const p = local(x, z), raw = ground(x, z);
    const outside = Math.max(Math.abs(p.x) - 64, Math.abs(p.z) - 292, 0);
    if (outside >= 24) return raw;
    const blend = 1 - outside / 24, smooth = blend * blend * (3 - 2 * blend);
    return raw + (base + slope * p.z - raw) * smooth;
  }
  const loop = [];
  for (let i = 0; i <= 80; i++) loop.push(world(38, -230 + i * 460 / 80));
  for (let i = 1; i <= 40; i++) { const a = i / 40 * Math.PI; loop.push(world(Math.cos(a) * 38, 230 + Math.sin(a) * 38)); }
  for (let i = 1; i <= 80; i++) loop.push(world(-38, 230 - i * 460 / 80));
  for (let i = 1; i <= 40; i++) { const a = Math.PI + i / 40 * Math.PI; loop.push(world(Math.cos(a) * 38, -230 + Math.sin(a) * 38)); }
  const pads = [[0,-205],[0,0],[0,200],[38,-120],[-38,120]].map(([x,z]) => ({ ...world(x,z), localX:x, localZ:z }));
  const gate = world(0,-286);
  let unlocked = false, boostLeft = 0, lastPad = -1;
  function reset() { boostLeft = 0; lastPad = -1; }
  function tick(dt, before, after, speed) {
    let discovered = false, launched = false;
    if (!unlocked && crossedCheckpoint(before, after, gate, 11)) { unlocked = true; discovered = true; }
    const inArena = arena(after.x, after.z);
    boostLeft = Math.max(0, boostLeft - dt);
    if (!inArena) reset();
    const pad = pads.findIndex(p => crossedCheckpoint(before, after, p, 7));
    if (unlocked && inArena && pad >= 0 && pad !== lastPad && Math.abs(speed) > 2) { boostLeft = 3.5; launched = true; }
    lastPad = pad;
    return { discovered, launched, inArena, turbo: unlocked && inArena && boostLeft > 0, remaining: boostLeft };
  }
  return { world, local, height, arena, loop, pads, gate, heading, reset, tick,
    get unlocked() { return unlocked; }, get turbo() { return unlocked && boostLeft > 0; } };
}

export function addAirstrip(scene, track, roads, mapRoads, heightAt, obstacles = []) {
  const mat = color => new THREE.MeshStandardMaterial({color,roughness:0.85,side:THREE.DoubleSide});
  const asphalt = mat('#343d43'), border = mat('#b2a98c'), stripe = mat('#e6e8cf');
  const neon = new THREE.MeshBasicMaterial({color:'#cfff59',side:THREE.DoubleSide});
  const cyan = new THREE.MeshBasicMaterial({color:'#4ae8ed',side:THREE.DoubleSide});
  function ribbon(points,width,material,lift=0.3) {
    const v=[],ix=[],across=Math.ceil(width/1.5);
    for(let i=0;i<points.length;i++) {
      const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],p=points[i];
      const length=Math.hypot(b.x-a.x,b.z-a.z)||1,nx=(b.z-a.z)/length,nz=-(b.x-a.x)/length;
      for(let j=0;j<=across;j++){const offset=(j/across-.5)*width,x=p.x+nx*offset,z=p.z+nz*offset;v.push(x,heightAt(x,z)+lift,z);}
      if(i<points.length-1)for(let j=0;j<across;j++){const k=i*(across+1)+j;ix.push(k,k+across+1,k+1,k+1,k+across+1,k+across+2);}
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(v,3));geometry.setIndex(ix);geometry.computeVertexNormals();scene.add(new THREE.Mesh(geometry,material));
  }
  function road(points,width) {
    ribbon(points,width+2,border,.16);ribbon(points,width,asphalt,.3);
    mapRoads.push(points.map(p=>[p.x,p.z]));
    for(let i=1;i<points.length;i++)roads.push({points:[[points[i-1].x,points[i-1].z],[points[i].x,points[i].z]],width,kind:'playground',id:'secret-airstrip',name:'Secret Airstrip · Drift Playground'});
  }
  const runway=Array.from({length:201},(_,i)=>track.world(0,-278+i*556/200));
  road(runway,26);road(track.loop,18);
  // Broad paved skid pan and links between the straight and loop.
  for(const z of [-190,0,190])road(Array.from({length:31},(_,i)=>track.world(-38+i*76/30,z)),z===-190?48:14);
  const approach=track.world(0,-315),near=nearestRoad(approach.x,approach.z,roads.filter(r=>r.id!=='secret-airstrip'));
  const access=Array.from({length:61},(_,i)=>({x:near.x+(track.gate.x-near.x)*i/60,z:near.z+(track.gate.z-near.z)*i/60}));
  road(access,7);road([track.world(0,-292),track.world(0,-278)],8);
  for(let z=-255;z<265;z+=28)ribbon([track.world(0,z),track.world(0,z+12)],.45,stripe,.34);
  for(const x of [-12.4,12.4])ribbon([track.world(x,-270),track.world(x,270)],.22,stripe,.34);
  for(const z of [-264,255])for(const x of [-9,-6,-3,3,6,9])ribbon([track.world(x,z),track.world(x,z+7)],1.3,stripe,.35);
  function box(w,h,d,material,x,y,z,rotation=track.heading) {
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);mesh.rotation.y=rotation;scene.add(mesh);return mesh;
  }
  for(const p of track.pads) {
    ribbon([track.world(p.localX,p.localZ-6),track.world(p.localX,p.localZ+6)],8,cyan,.38);
    for(let i=-1;i<=1;i++) {
      const z=p.localZ+i*3;
      ribbon([track.world(p.localX-3,z-1.3),track.world(p.localX,z+.8),track.world(p.localX+3,z-1.3)],.65,neon,.43);
    }
  }
  for(let i=0;i<track.loop.length;i+=5) {
    const p=track.loop[i],out=track.local(p.x,p.z),side=out.x<0?-1:1;
    const edge=track.world(out.x+side*11,out.z);
    if(Math.abs(out.z)<220)box(.35,.45,5,i%2?neon:cyan,edge.x,heightAt(edge.x,edge.z)+.5,edge.z);
  }
  addAirstripBoundary(scene, track, heightAt, obstacles, roads);
  // An unlabelled glowing gate at the end of the access lane.
  const gateY=heightAt(track.gate.x,track.gate.z);
  for(const side of [-1,1]){const p=track.world(side*5.5,-286);box(.65,6,.65,asphalt,p.x,gateY+3,p.z);box(.18,5,.8,cyan,p.x,gateY+3,p.z);}
  box(11.7,.7,.8,asphalt,track.gate.x,gateY+6,track.gate.z);
  box(10,.12,.85,neon,track.gate.x,gateY+6.15,track.gate.z);
  if(typeof document!=='undefined') {
    const canvas=document.createElement('canvas');canvas.width=768;canvas.height=128;const ctx=canvas.getContext('2d');
    ctx.fillStyle='#16332e';ctx.fillRect(0,0,768,128);ctx.fillStyle='#d5ff77';ctx.font='bold 54px sans-serif';ctx.textAlign='center';ctx.fillText('FLAT OUT',384,84);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const sign=new THREE.Mesh(new THREE.PlaneGeometry(7,.95),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));
    sign.position.set(track.gate.x,gateY+5.3,track.gate.z);sign.rotation.y=track.heading;scene.add(sign);
  }
}


export function airstripBoundarySections(track, roads) {
  const westJunction = project([-10.2134898,53.6159869]);
  const eastJunction = project([-10.2090562,53.6159606]);
  const entrance = project([-10.2106888,53.6159717]);
  const center = track.world(0,0), sections = [], ends = {};
  for (const road of roads) {
    const id=String(road.id), a=road.points[0], b=road.points[1];
    const mx=(a[0]+b[0])/2,mz=(a[1]+b[1])/2;
    let side;
    if (id==='484888681' && mx>=westJunction[0] && mx<=eastJunction[0]) side='south';
    if (id==='215535464' && mz>=project([-10.213,53.62193])[1]) side='west';
    if(!side)continue;
    // The field frontage stops before Pound Road; it does not enclose Middlequarter.
    if (Math.hypot(mx-eastJunction[0],mz-eastJunction[1]) < 14 ||
        Math.hypot(mx-westJunction[0],mz-westJunction[1]) < 12) continue;
    const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
    if(length<.01)continue;
    let nx=-dz/length,nz=dx/length;
    if(nx*(center.x-mx)+nz*(center.z-mz)<0){nx*=-1;nz*=-1;}
    const offset=(road.width||3.5)/2+2.3;
    const start=[a[0]+nx*offset,a[1]+nz*offset],end=[b[0]+nx*offset,b[1]+nz*offset];
    // Leave a full vehicle-width opening where the access lane meets High Road.
    if(side==='south' && crossedCheckpoint({x:start[0],z:start[1]},{x:end[0],z:end[1]},{x:entrance[0],z:entrance[1]},8))continue;
    sections.push([start,end]);
    if(side!=='south') for(const point of [start,end]) if(!ends[side] || point[1]<ends[side][1])ends[side]=point;
  }
  return trimBoundaryAtRoads(sections, roads);
}
export function addAirstripBoundary(scene, track, heightAt, obstacles, roads = []) {
  const sections = airstripBoundarySections(track, roads);
  const stones = [], posts = [], wires = [];
  const point = (x,z,h) => [x,heightAt(x,z)+h,z];
  const wire = (a,b) => wires.push(...a,...b);
  let seed=672;
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(const [start,end] of sections) {
    const dx=end[0]-start[0],dz=end[1]-start[1],length=Math.hypot(dx,dz),count=Math.ceil(length/.8);
    const heading=Math.atan2(dx,dz);
    for(let row=0;row<4;row++)for(let i=0;i<count;i++) {
      const t=(i+.5)/count,x=start[0]+dx*t,z=start[1]+dz*t;
      stones.push({p:point(x+(random()-.5)*.08,z+(random()-.5)*.08,.12+row*.21),angle:heading+(random()-.5)*.13,w:.5+random()*.1,h:.19+random()*.035,d:length/count-.025});
    }
    const bays=Math.ceil(length/3.5);
    for(let i=0;i<=bays;i++) {
      const t=i/bays,x=start[0]+dx*t,z=start[1]+dz*t;
      posts.push(point(x,z,1.55));
      wire(point(x,z,2.8),point(x+.25,z,3.15));
    }
    for(let i=0;i<bays;i++) {
      const t0=i/bays,t1=(i+1)/bays,bayLength=length/bays;
      for(const h of [1,2,2.8]) wire(point(start[0]+dx*t0,start[1]+dz*t0,h),point(start[0]+dx*t1,start[1]+dz*t1,h));
      // Diagonal diamonds, batched into a single wire geometry.
      for(let offset=-1.8;offset<bayLength;offset+=.42)for(const direction of [-1,1]) {
        const lo=Math.max(0,-offset),hi=Math.min(1.8,bayLength-offset);
        if(hi<=lo)continue;
        const ta=t0+(offset+lo)/length,tb=t0+(offset+hi)/length;
        const ha=direction===1?1+lo:2.8-lo,hb=direction===1?1+hi:2.8-hi;
        wire(point(start[0]+dx*ta,start[1]+dz*ta,ha),point(start[0]+dx*tb,start[1]+dz*tb,hb));
      }
    }
    const a={x:start[0],z:start[1]},b={x:end[0],z:end[1]},nx=-(b.z-a.z)/length*.4,nz=(b.x-a.x)/length*.4;
    obstacles.push({x:(a.x+b.x)/2,z:(a.z+b.z)/2,w:Math.abs(b.x-a.x)/2+.5,d:Math.abs(b.z-a.z)/2+.5,
      points:[[a.x+nx,a.z+nz],[b.x+nx,b.z+nz],[b.x-nx,b.z-nz],[a.x-nx,a.z-nz]]});
  }
  const dummy=new THREE.Object3D(),color=new THREE.Color();
  const masonry=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:'#a3a28b',roughness:1}),stones.length);
  stones.forEach((stone,i)=>{dummy.position.set(...stone.p);dummy.rotation.set(0,stone.angle,0);dummy.scale.set(stone.w,stone.h,stone.d);dummy.updateMatrix();masonry.setMatrixAt(i,dummy.matrix);color.set(i%3===0?'#777d70':i%3===1?'#aaa795':'#929584');masonry.setColorAt(i,color);});
  masonry.name='Airstrip dry-stone boundary';scene.add(masonry);
  const uprights=new THREE.InstancedMesh(new THREE.CylinderGeometry(.055,.07,2.6,6),new THREE.MeshStandardMaterial({color:'#637869',roughness:.8}),posts.length);
  posts.forEach((p,i)=>{dummy.position.set(...p);dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();uprights.setMatrixAt(i,dummy.matrix);});scene.add(uprights);
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(wires,3));
  const mesh=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:'#526e5e',transparent:true,opacity:.75}));mesh.name='Airstrip diamond wire fence';scene.add(mesh);
}


// Remove every piece that enters a road corridor, including junctions,
// service lanes and the playground access. Visuals and collisions share this list.
export function trimBoundaryAtRoads(sections, roads) {
  const result=[];
  for(const [a,b] of sections) {
    const length=Math.hypot(b[0]-a[0],b[1]-a[1]);
    if(length<.01)continue;
    const nearby=roads.filter(road=>{
      const [p,q]=road.points, margin=(road.width||3.5)/2+3;
      return Math.max(p[0],q[0])+margin>=Math.min(a[0],b[0]) && Math.min(p[0],q[0])-margin<=Math.max(a[0],b[0]) &&
        Math.max(p[1],q[1])+margin>=Math.min(a[1],b[1]) && Math.min(p[1],q[1])-margin<=Math.max(a[1],b[1]);
    });
    const steps=Math.ceil(length/.6),step=length/steps;
    const at=t=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
    let start=null;
    for(let i=0;i<steps;i++) {
      const midpoint=at((i+.5)/steps);
      const blocked=nearby.some(road=>{
        const [p,q]=road.points,dx=q[0]-p[0],dz=q[1]-p[1],l2=dx*dx+dz*dz;
        const t=l2?Math.max(0,Math.min(1,((midpoint[0]-p[0])*dx+(midpoint[1]-p[1])*dz)/l2)):0;
        // Half a sample step keeps the entire surviving interval clear.
        return Math.hypot(midpoint[0]-p[0]-t*dx,midpoint[1]-p[1]-t*dz)<(road.width||3.5)/2+1.15+step/2;
      });
      if(!blocked && start===null)start=i/steps;
      if(blocked && start!==null){result.push([at(start),at(i/steps)]);start=null;}
    }
    if(start!==null)result.push([at(start),b]);
  }
  return result;
}
