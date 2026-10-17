import * as THREE from 'three';
import { project } from './geo.js';
import { makeRoof } from './architecture.js';
export const HOSTEL_ID = '445905301';
export function addHostel(scene, building, heightAt, obstacles) {
  const points = building.coordinates.map(project), xs = points.map(p => p[0]), zs = points.map(p => p[1]);
  const x = (Math.min(...xs) + Math.max(...xs)) / 2, z = (Math.min(...zs) + Math.max(...zs)) / 2;
  const y = Math.max(...points.map(p => heightAt(...p)));
  const group = new THREE.Group(); group.name = 'Inishbofin Island Hostel'; group.position.set(x, y, z);
  const mat = color => new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
  const white = mat('#f0eee8'), green = mat('#37815d'), dark = mat('#303d3e'), glass = mat('#709b9b'), stone = mat('#6d7064');
  const slate = new THREE.MeshStandardMaterial({ color: '#625c64', roughness: 0.9, side: THREE.DoubleSide });
  const box = (w, h, d, material, px, py, pz, parent = group) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material); mesh.position.set(px, py, pz); parent.add(mesh); return mesh;
  };
  const polygon = points.map(p => [p[0] - x, p[1] - z]);
  const shape = new THREE.Shape(); polygon.forEach((p, i) => i ? shape.lineTo(p[0], -p[1]) : shape.moveTo(p[0], -p[1])); shape.closePath();
  const body = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 8.6, bevelEnabled: false }), white);
  body.rotation.x = -Math.PI / 2; body.position.y = -3; group.add(body);
  group.add(makeRoof(polygon, 5.6, 2.1, slate, white));
  const a = points[0], b = points[1], dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
  let nx = -dz / length, nz = dx / length;
  const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
  if (nx * (mx - x) + nz * (mz - z) < 0) { nx *= -1; nz *= -1; }
  const front = new THREE.Group(); front.position.set(mx - x, 0, mz - z); front.rotation.y = Math.atan2(nx, nz); group.add(front);
  box(length, 0.35, 0.08, green, 0, 0.18, 0.06, front);
  box(length, 0.055, 0.09, stone, 0, 2.95, 0.06, front);
  for (const wx of [-length * 0.33, 0, length * 0.33]) {
    for (const h of [1.65, 4.25]) {
      box(1.12, 1.55, 0.12, dark, wx, h, 0.08, front);
      box(0.88, 1.29, 0.14, glass, wx, h, 0.16, front);
      box(1.2, 0.09, 0.23, green, wx, h - 0.8, 0.13, front);
    }
  }
  // White-framed glazed entrance porch, green door and plinth.
  const porchWidth = length * 0.58;
  box(porchWidth, 0.6, 1.65, white, 0.5, 0.3, 0.95, front);
  box(porchWidth, 0.15, 1.85, white, 0.5, 2.9, 0.95, front);
  box(porchWidth, 0.12, 0.12, green, 0.5, 0.66, 1.81, front);
  box(porchWidth, 2.1, 0.06, glass, 0.5, 1.75, 1.77, front);
  for (let i = 0; i <= 6; i++) box(0.09, 2.25, 0.13, white, 0.5 - porchWidth / 2 + i * porchWidth / 6, 1.75, 1.82, front);
  box(porchWidth, 0.08, 0.13, white, 0.5, 1.6, 1.83, front);
  for (const side of [-1, 1]) {
    box(0.06, 2.1, 1.6, glass, 0.5 + side * porchWidth / 2, 1.75, 0.95, front);
    box(0.12, 2.25, 0.12, white, 0.5 + side * porchWidth / 2, 1.75, 0.1, front);
  }
  box(1.05, 2.3, 0.15, green, 0.5, 1.65, 1.9, front);
  box(0.7, 0.6, 0.04, glass, 0.5, 2.15, 2, front);
  box(1.6, 0.2, 0.5, stone, 0.5, 0.25, 2.1, front);
  // Chimneys rise above the slate ridge.
  for (const px of [-length * 0.24, length * 0.24]) {
    box(0.85, 1.9, 0.8, white, px, 7.5, -1.8, front);
    box(0.97, 0.12, 0.93, green, px, 8.45, -1.8, front);
  }
  for (const side of [-1, 1]) {
    const span = length * 0.25;
    box(span, 1.05, 0.6, stone, side * (span / 2 + 1.5), 0.52, 3.1, front);
    for (let row = 0; row < 5; row++) box(span, 0.025, 0.04, dark, side * (span / 2 + 1.5), 0.12 + row * 0.2, 3.42, front);
  }
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 256;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#f0eee8'; ctx.fillRect(0, 0, 768, 256);
    ctx.textAlign = 'center'; ctx.fillStyle = '#374a41'; ctx.font = '40px Georgia'; ctx.fillText('Inishbofin Island', 384, 78);
    ctx.fillStyle = '#37815d'; ctx.font = 'bold 80px sans-serif'; ctx.fillText('HOSTEL', 384, 180);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.45), new THREE.MeshBasicMaterial({ map: texture }));
    sign.position.set(-length * 0.15, 4.35, 0.22); front.add(sign);
  }
  scene.add(group);
  obstacles.push({ x, z, w: (Math.max(...xs) - Math.min(...xs)) / 2, d: (Math.max(...zs) - Math.min(...zs)) / 2, points });
}
