import * as THREE from 'three';
import { project } from './geo.js';
import { makeRoof } from './architecture.js';
export const HOUSE_HOTEL_ID = '445906805';
export function addHouseHotel(scene, building, heightAt, obstacles) {
  const points = building.coordinates.map(project), xs = points.map(p => p[0]), zs = points.map(p => p[1]);
  const x = (Math.min(...xs) + Math.max(...xs)) / 2, z = (Math.min(...zs) + Math.max(...zs)) / 2;
  const y = heightAt((points[5][0] + points[6][0]) / 2, (points[5][1] + points[6][1]) / 2);
  const group = new THREE.Group(); group.name = 'Inishbofin House Hotel'; group.position.set(x, y, z);
  const mat = color => new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
  const white = mat('#f1eee5'), stone = mat('#8e8971'), lightStone = mat('#b2a58a'), timber = mat('#865531'), dark = mat('#303d3d');
  const glass = new THREE.MeshStandardMaterial({ color: '#638482', roughness: 0.23, metalness: 0.25 });
  const slate = new THREE.MeshStandardMaterial({ color: '#41494e', roughness: 0.8, side: THREE.DoubleSide });
  const box = (w, h, d, material, px, py, pz, parent = group) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material); mesh.position.set(px, py, pz); parent.add(mesh); return mesh;
  };
  const polygon = points.map(p => [p[0] - x, p[1] - z]), shape = new THREE.Shape();
  polygon.forEach((p, i) => i ? shape.lineTo(p[0], -p[1]) : shape.moveTo(p[0], -p[1])); shape.closePath();
  const body = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 9.4, bevelEnabled: false }), white);
  body.rotation.x = -Math.PI / 2; body.position.y = -3; group.add(body);
  group.add(makeRoof(polygon, 6.4, 2.7, slate, white));
  function facade(a, b) {
    const dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
    const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
    let nx = -dz / length, nz = dx / length;
    if (nx * (mx - x) + nz * (mz - z) < 0) { nx *= -1; nz *= -1; }
    const f = new THREE.Group(); f.position.set(mx - x, 0, mz - z); f.rotation.y = Math.atan2(nx, nz); group.add(f);
    return { f, length };
  }
  for (const [a, b] of [[0, 1], [3, 4], [7, 8]]) {
    const { f, length } = facade(points[a], points[b]);
    box(length, 3.2, 0.07, stone, 0, 1.6, 0.05, f);
    const count = Math.max(2, Math.floor(length / 3));
    for (let i = 0; i < count; i++) {
      const wx = -length / 2 + (i + 0.5) * length / count;
      box(length / count * 0.78, 2.55, 0.1, timber, wx, 1.65, 0.12, f);
      box(length / count * 0.78 - 0.15, 2.35, 0.12, glass, wx, 1.65, 0.2, f);
      box(0.08, 2.5, 0.08, timber, wx, 1.65, 0.28, f);
      box(1.1, 1.4, 0.1, timber, wx, 5.05, 0.08, f);
      box(0.9, 1.2, 0.12, glass, wx, 5.05, 0.15, f);
    }
    for (const side of [-1, 1]) {
      const px = side * (length / 2 - 0.48);
      box(0.9, 3.3, 0.15, stone, px, 1.65, 0.18, f);
      for (let row = 0; row < 13; row++) box(0.85, 0.035, 0.04, lightStone, px, 0.1 + row * 0.25, 0.27, f);
    }
    box(length, 0.16, 0.25, white, 0, 3.4, 0.1, f);
  }
  // Double-height glazed gable on the mapped central entrance projection.
  const { f: entry, length: width } = facade(points[5], points[6]);
  const peak = 8.9, eaves = 5.9;
  const gable = new THREE.Shape(); gable.moveTo(-width / 2, 0.15); gable.lineTo(width / 2, 0.15); gable.lineTo(width / 2, eaves); gable.lineTo(0, peak); gable.lineTo(-width / 2, eaves); gable.closePath();
  const glazing = new THREE.Mesh(new THREE.ShapeGeometry(gable), glass); glazing.position.z = 0.14; entry.add(glazing);
  for (const side of [-1, 1]) {
    box(0.2, eaves, 0.3, timber, side * width / 2, eaves / 2, 0.28, entry);
    const rafter = box(0.23, Math.hypot(width / 2, peak - eaves), 0.35, timber, side * width / 4, (peak + eaves) / 2, 0.3, entry);
    rafter.rotation.z = side * Math.atan2(width / 2, peak - eaves);
  }
  for (const h of [0.15, 3.1, 5.9]) box(width, 0.18, 0.3, timber, 0, h, 0.28, entry);
  for (const ratio of [-0.3, 0, 0.3]) {
    const px = width * ratio, height = peak - Math.abs(ratio) * 2 * (peak - eaves);
    box(0.13, height, 0.25, timber, px, height / 2, 0.29, entry);
  }
  box(1.8, 2.7, 0.16, timber, 0, 1.5, 0.35, entry);
  box(1.5, 2.4, 0.18, glass, 0, 1.5, 0.45, entry);
  box(0.08, 2.4, 0.12, timber, 0, 1.5, 0.57, entry);
  // Rooflights across the slate roof and modest garden planters.
  for (const offset of [-12, -6, 5, 11]) {
    const rooflight = box(1.1, 0.1, 1.5, glass, offset, 7.8, 0.5);
    rooflight.rotation.x = 0.5;
  }
  group.updateMatrixWorld(true);
  const foliage = mat('#577b40'), pink = mat('#ce80a8'), yellow = mat('#d9ca64');
  for (let i = 0; i < 6; i++) {
    const local = new THREE.Vector3((i - 2.5) * 3, 0, 3.4);
    const world = entry.localToWorld(local);
    const planter = new THREE.Group(); planter.position.set(world.x, heightAt(world.x, world.z), world.z);
    box(1.2, 0.4, 0.65, dark, 0, 0.2, 0, planter);
    box(1.1, 0.24, 0.6, foliage, 0, 0.48, 0, planter);
    for (let j = 0; j < 4; j++) {
      const flower = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0), i % 2 ? pink : yellow);
      flower.position.set((j - 1.5) * 0.24, 0.65, 0); planter.add(flower);
    }
    scene.add(planter);
  }
  scene.add(group);
  obstacles.push({ x, z, w: (Math.max(...xs) - Math.min(...xs)) / 2, d: (Math.max(...zs) - Math.min(...zs)) / 2, points });
}
