import * as THREE from 'three';
import { project } from './geo.js';
import { makeRoof } from './architecture.js';
export const CHURCH_ID = '445906808';
export function addChurch(scene, building, heightAt, obstacles) {
  const points = building.coordinates.map(project), xs = points.map(p => p[0]), zs = points.map(p => p[1]);
  const x = (Math.min(...xs) + Math.max(...xs)) / 2, z = (Math.min(...zs) + Math.max(...zs)) / 2;
  const y = Math.max(...points.map(p => heightAt(...p)));
  const group = new THREE.Group(); group.name = "Saint Coleman's Church"; group.position.set(x, y, z);
  const mat = color => new THREE.MeshStandardMaterial({ color, roughness: 0.95 });
  const stone = mat('#989587'), trim = mat('#c1baa4'), dark = mat('#202b2c'), glass = mat('#596d70');
  const slate = new THREE.MeshStandardMaterial({ color: '#495155', roughness: 0.85, side: THREE.DoubleSide });
  const box = (w, h, d, material, px, py, pz, parent = group) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material); mesh.position.set(px, py, pz); parent.add(mesh); return mesh;
  };
  const polygon = points.map(p => [p[0] - x, p[1] - z]);
  const shape = new THREE.Shape(); polygon.forEach((p, i) => i ? shape.lineTo(p[0], -p[1]) : shape.moveTo(p[0], -p[1])); shape.closePath();
  const body = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 9.8, bevelEnabled: false }), stone);
  body.rotation.x = -Math.PI / 2; body.position.y = -3; group.add(body);
  group.add(makeRoof(polygon, 6.8, 3.8, slate, stone));
  function arch(parent, width, height, px, base, depth, material) {
    const radius = width / 2, spring = height - radius, s = new THREE.Shape();
    s.moveTo(-radius, 0); s.lineTo(radius, 0); s.lineTo(radius, spring);
    s.absarc(0, spring, radius, 0, Math.PI, false); s.lineTo(-radius, 0);
    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(s, 18), material);
    mesh.position.set(px, base, depth); parent.add(mesh);
  }
  function window(parent, px, base, width, height) {
    arch(parent, width + 0.3, height + 0.18, px, base - 0.08, 0.12, trim);
    arch(parent, width, height, px, base, 0.14, dark);
    arch(parent, width - 0.14, height - 0.14, px, base + 0.07, 0.16, glass);
    box(0.055, height - width / 2, 0.04, trim, px, base + (height - width / 2) / 2, 0.2, parent);
    for (let h = 0.6; h < height - width / 2; h += 0.65) box(width - 0.12, 0.035, 0.04, trim, px, base + h, 0.2, parent);
    box(width + 0.5, 0.14, 0.35, trim, px, base - 0.14, 0.13, parent);
  }
  function facade(a, b) {
    const dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
    const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
    let nx = -dz / length, nz = dx / length;
    if (nx * (mx - x) + nz * (mz - z) < 0) { nx *= -1; nz *= -1; }
    const f = new THREE.Group(); f.position.set(mx - x, 0, mz - z); f.rotation.y = Math.atan2(nx, nz); group.add(f);
    return { f, length };
  }
  const { f: front, length } = facade(points[11], points[0]);
  // Three graduated arched windows above the recessed entrance.
  window(front, 0, 4.5, 1.05, 3.5);
  for (const side of [-1, 1]) {
    window(front, side * 1.4, 4.5, 0.68, 2.65);
    window(front, side * (length / 2 - 1), 1.6, 0.4, 1.15);
    box(0.65, 7, 0.7, stone, side * (length / 2 - 0.35), 3.5, 0.25, front);
    box(0.9, 0.18, 0.85, trim, side * (length / 2 - 0.35), 7.05, 0.28, front);
    box(0.5, 6.9, 0.35, trim, side * 2.5, 3.45, 0.1, front);
  }
  arch(front, 2.9, 3.65, 0, 0.1, 0.22, trim);
  arch(front, 2.35, 3.25, 0, 0.12, 0.25, dark);
  box(1.75, 2.6, 0.08, dark, 0, 1.42, 0.3, front);
  box(0.06, 2.55, 0.09, trim, 0, 1.42, 0.35, front);
  box(3.3, 0.16, 0.8, trim, 0, 0.08, 0.4, front);
  box(3.4, 0.14, 0.42, trim, 0, 3.1, 0.3, front);
  function cross(parent, px, py, pz) {
    box(0.16, 1.45, 0.18, trim, px, py, pz, parent);
    box(0.85, 0.16, 0.18, trim, px, py + 0.2, pz, parent);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.055, 6, 18), trim);
    ring.position.set(px, py + 0.2, pz); parent.add(ring);
  }
  cross(front, 0, 11.05, 0);
  // Narrow arched windows and shallow buttresses along each long nave wall.
  for (const [aIndex, bIndex] of [[0, 1], [10, 11]]) {
    const { f, length: wallLength } = facade(points[aIndex], points[bIndex]);
    const count = Math.max(2, Math.floor(wallLength / 3));
    for (let i = 0; i < count; i++) {
      const wx = -wallLength / 2 + (i + 0.5) * wallLength / count;
      window(f, wx, 2.6, 0.65, 2.3);
      if (i) box(0.45, 5.8, 0.45, stone, wx - wallLength / count / 2, 2.9, 0.18, f);
    }
  }
  const { f: rear } = facade(points[5], points[6]); cross(rear, 0, 10.8, 0);
  scene.add(group);
  obstacles.push({ x, z, w: (Math.max(...xs) - Math.min(...xs)) / 2, d: (Math.max(...zs) - Math.min(...zs)) / 2, points });
}
