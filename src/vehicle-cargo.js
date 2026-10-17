import * as THREE from 'three';

// Cargo owns its resources so removing it never disposes the vehicle's materials.
export function setPalletCargo(vehicle, enabled) {
  const previous = vehicle.getObjectByName('pallet-cargo');
  if (previous) {
    vehicle.remove(previous);
    const materials = new Set();
    previous.traverse(o => { o.geometry?.dispose(); if (o.material) materials.add(o.material); });
    materials.forEach(m => m.dispose());
  }
  if (!enabled) return;
  const cargo = new THREE.Group();
  cargo.name = 'pallet-cargo';
  // Compute roof height in local coordinates, independent of world position/rotation.
  const bounds = new THREE.Box3();
  vehicle.traverse(o => {
    if (!o.isMesh) return;
    o.geometry.computeBoundingBox();
    const matrix = new THREE.Matrix4();
    for (let node = o; node !== vehicle; node = node.parent) {
      node.updateMatrix(); matrix.premultiply(node.matrix);
    }
    bounds.union(o.geometry.boundingBox.clone().applyMatrix4(matrix));
  });
  cargo.position.y = bounds.max.y + 0.04;
  const woods = ['#b48750', '#c6995b', '#a97a45', '#d0a569'].map(color => new THREE.MeshStandardMaterial({color, roughness:1}));
  const strap = new THREE.MeshStandardMaterial({color:'#414a32',roughness:0.9});
  const box = (parent, w,h,d,x,y,z,material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
    mesh.position.set(x,y,z); parent.add(mesh);
  };
  for(let level=0;level<3;level++) {
    const pallet = new THREE.Group();
    pallet.position.y = level*0.22; pallet.rotation.y = [0.035,-0.055,0.025][level];
    for(let i=0;i<5;i++) box(pallet,0.23,0.045,1.6,(i-2)*0.275,0.19,0,woods[(i+level)%4]);
    for(const x of [-0.55,0,0.55]) {
      for(const z of [-0.65,0,0.65]) box(pallet,0.19,0.12,0.23,x,0.105,z,woods[(level+1)%4]);
      box(pallet,0.19,0.045,1.6,x,0.025,0,woods[level%4]);
    }
    cargo.add(pallet);
  }
  for(const z of [-0.52,0.52]) {
    box(cargo,1.44,0.025,0.055,0,0.66,z,strap);
    for(const x of [-0.71,0.71]) box(cargo,0.025,0.67,0.055,x,0.33,z,strap);
  }
  vehicle.add(cargo);
}
