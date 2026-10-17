import * as THREE from 'three';
import { project } from './geo.js';
export const DOONMORE_BUILDINGS = new Set(['504920986', '445902095']);
export function addDoonmore(scene, building, heightAt, obstacles) {
  const pts = building.coordinates.map(project);
  const xs = pts.map(p => p[0]), zs = pts.map(p => p[1]);
  const x = (Math.min(...xs) + Math.max(...xs)) / 2, z = (Math.min(...zs) + Math.max(...zs)) / 2;
  const main = building.id === '504920986', height = main ? 6.8 : 3.2;
  const ground = Math.max(...pts.map(p => heightAt(...p)));
  const white = new THREE.MeshStandardMaterial({ color: '#f4f3eb', roughness: 0.85 });
  const dark = new THREE.MeshStandardMaterial({ color: '#343d40' });
  const glass = new THREE.MeshStandardMaterial({ color: '#517178', metalness: 0.15, roughness: 0.28 });
  const green = new THREE.MeshStandardMaterial({ color: '#285f43' });
  const group = new THREE.Group(); group.name = main ? 'Doonmore Hotel main building' : 'Doonmore Hotel low wing';
  group.position.set(x, ground, z);
  const box = (w, h, d, material, px, py, pz, parent = group) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(px, py, pz); parent.add(mesh); return mesh;
  };
  const shape = new THREE.Shape();
  pts.forEach((p, i) => i ? shape.lineTo(p[0] - x, -(p[1] - z)) : shape.moveTo(p[0] - x, -(p[1] - z)));
  shape.closePath();
  const body = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: height + 3, bevelEnabled: false }), white);
  body.rotation.x = -Math.PI / 2; body.position.y = -3; group.add(body);
  const roof = new THREE.Mesh(new THREE.ShapeGeometry(shape), dark);
  roof.rotation.x = -Math.PI / 2; roof.position.y = height + 0.02; group.add(roof);
  let front;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
    if (length < 5) continue;
    const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
    let nx = -dz / length, nz = dx / length;
    if (nx * (mx - x) + nz * (mz - z) < 0) { nx *= -1; nz *= -1; }
    const facade = new THREE.Group(); facade.position.set(mx - x + nx * 0.05, 0, mz - z + nz * 0.05);
    facade.rotation.y = Math.atan2(nx, nz); group.add(facade);
    box(length, 0.15, 0.12, white, 0, height + 0.1, 0, facade);
    const count = Math.max(1, Math.floor(length / 3.5));
    for (let j = 0; j < count; j++) {
      const wx = -length / 2 + (j + 0.5) * length / count;
      if (main) {
        box(1.35, 1.9, 0.08, dark, wx, 4.85, 0.03, facade);
        box(1.12, 1.65, 0.09, glass, wx, 4.85, 0.08, facade);
        box(1.48, 0.09, 0.22, white, wx, 3.87, 0.08, facade);
      } else box(1.4, 1.4, 0.08, glass, wx, 1.8, 0.03, facade);
    }
    if (main && length > 15 && nz > 0.5 && (!front || mz > front.z)) front = { facade, length, z: mz };
  }
  if (front) {
    const f = front.facade, span = Math.min(15, front.length * 0.55);
    box(span, 2.5, 0.12, dark, 1.5, 1.3, 0.08, f);
    box(span - 0.25, 2.25, 0.13, glass, 1.5, 1.3, 0.16, f);
    for (let wx = 1.5 - span / 2; wx <= 1.5 + span / 2; wx += 1.5) box(0.07, 2.5, 0.18, dark, wx, 1.3, 0.2, f);
    box(span + 0.5, 0.65, 0.5, white, 1.5, 2.9, 0.3, f);
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 96;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#f4f3eb'; ctx.fillRect(0, 0, 1024, 96);
      ctx.fillStyle = '#24333a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = 'italic 48px Georgia';
      ctx.fillText("Murray's Doonmore Hotel", 512, 48);
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(span, 0.6), new THREE.MeshBasicMaterial({ map: texture }));
      sign.position.set(1.5, 2.9, 0.56); f.add(sign);
    }
    const doorX = -span / 2 - 2;
    box(2.7, 3, 1, white, doorX, 1.5, 0.35, f);
    box(1.05, 2.35, 0.06, dark, doorX, 1.18, 0.89, f);
    box(1.6, 0.18, 1.4, white, doorX, 3.1, 0.5, f);
    // Green picnic tables on the lawn, positioned individually on the terrain.
    group.updateMatrixWorld(true);
    for (const [tx, tz] of [[-8, 9], [-1, 12], [7, 10]]) {
      const world = f.localToWorld(new THREE.Vector3(tx, 0, tz));
      const table = new THREE.Group(); table.position.set(world.x, heightAt(world.x, world.z) + 0.1, world.z);
      table.rotation.y = f.rotation.y;
      box(2.5, 0.15, 1, green, 0, 0.85, 0, table);
      for (const side of [-1, 1]) {
        box(2.5, 0.12, 0.36, green, 0, 0.48, side * 0.9, table);
        box(0.16, 0.8, 1.9, green, side * 0.85, 0.4, 0, table);
      }
      scene.add(table);
    }
  }
  if (!main) box(0.8, 4.8, 0.8, white, 0, 3.3, 0);
  scene.add(group);
  obstacles.push({ x, z, w: (Math.max(...xs) - Math.min(...xs)) / 2, d: (Math.max(...zs) - Math.min(...zs)) / 2, points: pts });
}
