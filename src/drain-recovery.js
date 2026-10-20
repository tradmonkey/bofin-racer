import * as THREE from 'three';
import { disposeVehicle } from './vehicles.js';

export function makeTelehandler() {
  const model=new THREE.Group();model.name='Clossey drain rescue telehandler';
  const mat=color=>new THREE.MeshStandardMaterial({color,roughness:.85});
  const red=mat('#a9362c'),rubber=mat('#252b28'),metal=mat('#615d48'),glass=mat('#547b7d'),cream=mat('#c9c7ac');
  const box=(w,h,d,m,x,y,z,parent=model)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);parent.add(mesh);return mesh;};
  box(2.1,.65,3.9,red,0,1,0);box(1.12,1.45,1.55,glass,-.38,2.02,-.25);box(1.3,.15,1.75,red,-.38,2.82,-.25);
  for(const x of [-.96,.2])for(const z of [-1.04,.54])box(.09,1.5,.09,cream,x,2.03,z);
  box(1,.55,1.25,red,.55,1.6,-.85);
  for(const x of [-1.15,1.15])for(const z of [-1.28,1.25]) {
    const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.73,.73,.48,16),rubber);wheel.rotation.z=Math.PI/2;wheel.position.set(x,.73,z);model.add(wheel);
    const hub=new THREE.Mesh(new THREE.CylinderGeometry(.34,.34,.5,10),cream);hub.rotation.z=Math.PI/2;hub.position.copy(wheel.position);model.add(hub);
    box(.55,.12,1.2,red,x,1.48,z);
  }
  const boom=new THREE.Group();boom.position.set(.48,1.6,-.6);boom.rotation.x=-.9;model.add(boom);
  box(.42,.4,4.8,red,0,0,2.25,boom);box(.25,.25,2.4,metal,0,0,4.15,boom);
  box(1.8,.18,.18,metal,0,-.1,5.4,boom);
  for(const x of [-.7,.7])box(.12,.12,1.1,metal,x,-.1,5.95,boom);
  box(.2,.2,.2,mat('#ef9a2b'),-.4,3.02,-.25);
  model.userData.boom=boom;return model;
}
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export function createDrainRecovery(scene,heightAt,onRecovered) {
  let rescue=null;
  function cancel() {
    if(!rescue)return;
    scene.remove(rescue.machine,rescue.rope);disposeVehicle(rescue.machine);rescue.rope.geometry.dispose();rescue.rope.material.dispose();rescue=null;
  }
  return {
    get active(){return !!rescue;},
    get cameraPose() {
      if(!rescue)return null;
      const r=rescue,side=new THREE.Vector3(r.direction.z,0,-r.direction.x);
      return {position:r.end.clone().addScaledVector(side,18).addScaledVector(r.direction,-10).add(new THREE.Vector3(0,9,0)),target:r.end.clone().addScaledVector(r.direction,2).add(new THREE.Vector3(0,2,0))};
    },cancel,
    start(car,road) {
      cancel();
      const machine=makeTelehandler(),start=car.position.clone(),end=new THREE.Vector3(road.x,heightAt(road.x,road.z)+.22,road.z);
      const rope=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),new THREE.LineBasicMaterial({color:'#75947a'}));
      const direction=new THREE.Vector3(Math.sin(road.heading),0,Math.cos(road.heading));
      rescue={car,machine,rope,start,end,rotation:car.quaternion.clone(),heading:road.heading,direction,time:0};scene.add(machine,rope);
    },
    tick(dt,active) {
      if(!rescue||!active)return;
      const r=rescue;r.time+=dt;
      const approach=1-smooth(r.time/4),depart=smooth((r.time-10)/4);
      r.machine.position.copy(r.end).addScaledVector(r.direction,5+approach*45+depart*45);
      r.machine.position.y=heightAt(r.machine.position.x,r.machine.position.z);
      r.machine.rotation.y=r.heading+Math.PI;
      // Arrive completely, hold for a beat, then attach and lift.
      const lift=smooth((r.time-5)/2),across=smooth((r.time-7)/2),lower=smooth((r.time-9));
      r.car.position.lerpVectors(r.start,r.end,across);r.car.position.y+=lift*(1-lower)*4;
      r.car.quaternion.copy(r.rotation).slerp(new THREE.Quaternion().setFromEuler(new THREE.Euler(0,r.heading,0)),across);
      r.machine.userData.boom.rotation.x=-.6-lift*.4+lower*.3;
      r.machine.updateMatrixWorld(true);
      const tip=r.machine.userData.boom.localToWorld(new THREE.Vector3(0,0,5.4));
      const attribute=r.rope.geometry.attributes.position;
      attribute.setXYZ(0,tip.x,tip.y,tip.z);attribute.setXYZ(1,r.car.position.x,r.car.position.y+1,r.car.position.z);attribute.needsUpdate=true;r.rope.geometry.computeBoundingSphere();
      r.rope.visible=r.time>=5&&r.time<10;
      if(r.time>=14){const destination={x:r.end.x,z:r.end.z,heading:r.heading};cancel();onRecovered(destination);}
    },
  };
}
