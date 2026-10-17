import * as THREE from 'three';
import { project } from './geo.js';
import { makeRoof } from './architecture.js';
export const DAYS_BAR_ID = '445906807';
export function addDaysBar(scene, building, heightAt, obstacles) {
  const mapped = building.coordinates.map(project);
  // Set the whole frontage back inland, including walls and seating.
  const a0 = mapped[6], b0 = mapped[7];
  const cx = mapped.reduce((sum, p) => sum + p[0], 0) / mapped.length;
  const cz = mapped.reduce((sum, p) => sum + p[1], 0) / mapped.length;
  const edgeLength = Math.hypot(b0[0] - a0[0], b0[1] - a0[1]);
  let outwardX = -(b0[1] - a0[1]) / edgeLength;
  let outwardZ = (b0[0] - a0[0]) / edgeLength;
  if (outwardX * ((a0[0] + b0[0]) / 2 - cx) + outwardZ * ((a0[1] + b0[1]) / 2 - cz) < 0) {
    outwardX *= -1; outwardZ *= -1;
  }
  const points = mapped.map(([px, pz]) => [px - outwardX * 5, pz - outwardZ * 5]);
  const xs = points.map(p => p[0]), zs = points.map(p => p[1]);
  const x = (Math.min(...xs) + Math.max(...xs)) / 2, z = (Math.min(...zs) + Math.max(...zs)) / 2;
  let y = heightAt(x, z);
  const group = new THREE.Group(); group.name = "Day's Bar — The Beach"; group.position.set(x, y, z);
  const mat = color => new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
  const cream = mat('#e6dfca'), white = mat('#f4f1e8'), teal = mat('#365c60'), glass = mat('#64858a'), stone = mat('#676d60'), wood = mat('#b49c69');
  const slate = new THREE.MeshStandardMaterial({ color: '#444b50', roughness: 0.95, side: THREE.DoubleSide });
  const box = (w, h, d, material, px, py, pz, parent = group) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(px, py, pz); parent.add(mesh); return mesh;
  };
  function block(indices, height, rise, material) {
    const polygon = indices.map(i => [points[i][0] - x, points[i][1] - z]);
    const shape = new THREE.Shape();
    polygon.forEach((p, i) => i ? shape.lineTo(p[0], -p[1]) : shape.moveTo(p[0], -p[1])); shape.closePath();
    const body = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: height + 3, bevelEnabled: false }), material);
    body.rotation.x = -Math.PI / 2; body.position.y = -3; group.add(body);
    group.add(makeRoof(polygon, height, rise, slate, white));
  }
  block([0, 1, 2, 3, 4], 5.5, 1.9, white);
  block([0, 4, 5, 6, 7], 3, 1.6, cream);
  const a = points[6], b = points[7], length = Math.hypot(b[0] - a[0], b[1] - a[1]);
  let nx = -(b[1] - a[1]) / length, nz = (b[0] - a[0]) / length;
  const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
  if (nx * (mx - x) + nz * (mz - z) < 0) { nx *= -1; nz *= -1; }
  // The hillside behind the pub must not lift the entrance above Low Road.
  y = heightAt(mx + nx * 3.2, mz + nz * 3.2);
  group.position.y = y;
  const front = new THREE.Group(); front.position.set(mx - x, 0, mz - z); front.rotation.y = Math.atan2(nx, nz); group.add(front);
  // Horizontal cream siding across the low waterfront frontage.
  for (let h = 0.3; h < 3; h += 0.19) box(length, 0.018, 0.025, white, 0, h, 0.035, front);
  for (const wx of [-length * 0.31, length * 0.29]) {
    box(3.1, 1.65, 0.1, teal, wx, 1.8, 0.08, front);
    box(2.8, 1.36, 0.12, glass, wx, 1.8, 0.15, front);
    box(0.1, 1.5, 0.15, teal, wx, 1.8, 0.23, front);
    box(3.3, 0.12, 0.22, white, wx, 0.92, 0.15, front);
  }
  box(1.65, 2.55, 0.13, teal, 0, 1.28, 0.1, front);
  box(1.35, 2.25, 0.15, glass, 0, 1.28, 0.19, front);
  box(0.1, 0.15, 0.1, wood, 0.5, 1.2, 0.3, front);
  const localGround = (px, pz) => heightAt(
    mx + px * Math.cos(front.rotation.y) + pz * Math.sin(front.rotation.y),
    mz - px * Math.sin(front.rotation.y) + pz * Math.cos(front.rotation.y),
  ) - y;
  const groundedBox = (w, h, d, material, px, py, pz) =>
    box(w, h, d, material, px, py + localGround(px, pz), pz, front);
  // Ground-following paved forecourt: no raised deck, railing or stairs.
  const paving = mat('#96958a'), vertices = [], indices = [];
  const columns = Math.ceil(length / 0.6), rows = 6;
  for (let row = 0; row <= rows; row++) for (let col = 0; col <= columns; col++) {
    const px = -length / 2 + length * col / columns, pz = 0.2 + 2.7 * row / rows;
    vertices.push(px, localGround(px, pz) + 0.035, pz);
    if (row < rows && col < columns) {
      const k = row * (columns + 1) + col;
      indices.push(k, k + columns + 1, k + 1, k + 1, k + columns + 1, k + columns + 2);
    }
  }
  const pavingGeometry = new THREE.BufferGeometry();
  pavingGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  pavingGeometry.setIndex(indices); pavingGeometry.computeVertexNormals();
  const patio = new THREE.Mesh(pavingGeometry, paving); patio.name = 'Ground-level pub forecourt'; front.add(patio);
  for (const side of [-1, 1]) {
    const wallLength = length / 2 - 1.3, centre = side * (wallLength / 2 + 1.3);
    const count = Math.ceil(wallLength / 0.75), unit = wallLength / count;
    for (let row = 0; row < 5; row++) for (let i = 0; i < count; i++) {
      const px = centre - wallLength / 2 + (i + 0.5) * unit;
      groundedBox(unit - 0.025, 0.18, 0.5, row % 2 ? stone : slate, px, 0.1 + row * 0.18, 3.2);
    }
    groundedBox(0.65, 0.55, 0.65, wood, side * 1.95, 0.27, 3.8);
    groundedBox(0.55, 0.12, 0.55, mat('#667e44'), side * 1.95, 0.6, 3.8);
    // Low picnic benches within the stone-walled seating area.
    const tx = side * length * 0.29;
    groundedBox(2.1, 0.12, 0.8, wood, tx, 0.78, 1.5);
    for (const benchSide of [-1, 1]) {
      groundedBox(2.1, 0.1, 0.28, wood, tx, 0.43, 1.5 + benchSide * 0.7);
      groundedBox(0.12, 0.75, 1.7, wood, tx + benchSide * 0.7, 0.38, 1.5);
    }
  }
  // Tall white chimneys and upper windows on the accommodation wing.
  for (const offset of [-2, 2]) box(0.8, 2.2, 0.8, white, offset, 6.9, -3.5);
  const rearA = points[2], rearB = points[3], rearLength = Math.hypot(rearB[0] - rearA[0], rearB[1] - rearA[1]);
  const rear = new THREE.Group(); rear.position.set((rearA[0] + rearB[0]) / 2 - x, 0, (rearA[1] + rearB[1]) / 2 - z);
  rear.rotation.y = Math.atan2(-nx, -nz); group.add(rear);
  for (const wx of [-rearLength * 0.3, rearLength * 0.3]) {
    box(1.1, 1.5, 0.08, teal, wx, 4.3, 0.05, rear);
    box(0.85, 1.25, 0.1, glass, wx, 4.3, 0.1, rear);
  }
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 192;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#d4e4cf'; ctx.fillRect(0, 0, 768, 192);
    ctx.fillStyle = '#365c60'; ctx.textAlign = 'center'; ctx.font = '46px Georgia'; ctx.fillText('THE BEACH', 384, 80);
    ctx.font = 'italic 31px Georgia'; ctx.fillText("Day’s Bar & B&B", 384, 140);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.85), new THREE.MeshBasicMaterial({ map: texture }));
    sign.position.set(0, 2.7, 0.2); front.add(sign);
  }
  scene.add(group);
  obstacles.push({ x, z, w: (Math.max(...xs) - Math.min(...xs)) / 2, d: (Math.max(...zs) - Math.min(...zs)) / 2, points });
}
