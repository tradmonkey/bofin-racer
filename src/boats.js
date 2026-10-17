import * as THREE from 'three';
import { inside } from './geo.js';

export function makeFerry({ length = 27, beam = 7, hullColor = '#b51e30' } = {}) {
  const boat = new THREE.Group();
  const paint = color => new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
  const red = paint(hullColor), white = paint('#f1eee2'), black = paint('#202c30'), glass = paint('#32616c'), orange = paint('#f16d33');
  const box = (w, h, d, material, x, y, z) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z); boat.add(mesh); return mesh;
  };
  const rail = (a, b, radius = 0.045, material = white) => {
    const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b), direction = to.clone().sub(from);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), 6), material);
    mesh.position.copy(from).add(to).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    boat.add(mesh);
  };
  const outline = new THREE.Shape();
  const half = beam / 2, aft = -length / 2, bow = length / 2;
  outline.moveTo(-half * 0.8, aft);
  outline.lineTo(half * 0.8, aft);
  outline.lineTo(half, bow * 0.48);
  outline.quadraticCurveTo(half * 0.8, bow * 0.86, 0, bow);
  outline.quadraticCurveTo(-half * 0.8, bow * 0.86, -half, bow * 0.48);
  outline.closePath();
  function hullLayer(material, bottom, depth, scale = 1) {
    const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(outline, { depth, bevelEnabled: false, curveSegments: 10 }), material);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.y = bottom + depth;
    mesh.scale.set(scale, scale, 1);
    boat.add(mesh);
  }
  // Shape coordinates become local x/z after rotation; the tapered bow points forward.
  hullLayer(black, -0.7, 0.65, 0.96);
  hullLayer(red, -0.15, 1.65);
  hullLayer(white, 1.5, 0.22);
  hullLayer(black, 1.05, 0.14, 1.015);
  box(beam * 0.75, 2.05, length * 0.38, white, 0, 2.7, 0.7);
  box(beam * 0.83, 0.18, length * 0.43, white, 0, 3.82, 0.7);
  // Wheelhouse sits forward, leaving the rear upper deck open.
  box(beam * 0.59, 1.75, length * 0.18, white, 0, 4.65, length * 0.12);
  box(beam * 0.66, 0.18, length * 0.21, red, 0, 5.58, length * 0.12);
  box(beam * 0.5, 0.8, 0.035, glass, 0, 4.85, length * 0.21 + 0.02);
  for (const side of [-1, 1]) {
    for (let z = -length * 0.13; z < length * 0.19; z += 1.25)
      box(0.04, 0.8, 0.9, glass, side * beam * 0.378, 2.95, z);
    box(0.035, 0.78, length * 0.12, glass, side * beam * 0.298, 4.85, length * 0.12);
    for (const y of [2.2, 2.65]) rail([side * half * 0.89, y, aft + 1], [side * half * 0.89, y, bow * 0.48]);
    for (let z = aft + 1; z <= bow * 0.48; z += 1.7) rail([side * half * 0.89, 1.7, z], [side * half * 0.89, 2.65, z]);
    for (const y of [4.3, 4.7]) rail([side * beam * 0.39, y, -length * 0.17], [side * beam * 0.39, y, length * 0.31]);
    for (let z = -length * 0.17; z <= length * 0.31; z += 1.6) rail([side * beam * 0.39, 3.9, z], [side * beam * 0.39, 4.7, z]);
    // Life rings and rubber fenders on both sides.
    for (const z of [-2.3, 1.8]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.095, 8, 16), orange);
      ring.rotation.y = Math.PI / 2; ring.position.set(side * beam * 0.4, 3.15, z); boat.add(ring);
    }
    for (const z of [-length * 0.31, -length * 0.1, length * 0.27]) {
      const fender = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.1, 8), black);
      fender.position.set(side * (half + 0.08), 0.95, z); boat.add(fender);
    }
  }
  box(1.0, 1.3, 1.2, red, 0, 4.55, -length * 0.06);
  box(1.1, 0.2, 1.3, black, 0, 5.25, -length * 0.06);
  rail([0, 5.7, length * 0.13], [0, 8.8, length * 0.13], 0.065);
  rail([-1.1, 7.4, length * 0.13], [1.1, 7.4, length * 0.13], 0.05);
  box(1.4, 0.45, 0.65, orange, 0, 4.2, -length * 0.13);
  boat.name = 'Moored passenger ferry';
  return boat;
}
export function ferryPlacements(deck) {
  // The two long seaward edges of the bundled ferry pier.
  return [[2, 3, 0.32, 27, 7], [7, 8, 0.65, 22, 6]].map(([aIndex, bIndex, t, length, beam]) => {
    const a = deck.points[aIndex], b = deck.points[bIndex];
    const dx = b[0] - a[0], dz = b[1] - a[1], distance = Math.hypot(dx, dz);
    let nx = -dz / distance, nz = dx / distance;
    const x = a[0] + dx * t, z = a[1] + dz * t;
    if (inside(x + nx, z + nz, deck.points)) { nx *= -1; nz *= -1; }
    return { x: x + nx * (beam / 2 + 1.6), z: z + nz * (beam / 2 + 1.6), heading: Math.atan2(dx, dz), length, beam };
  });
}
export function addFerries(scene, data, decks) {
  const oldPier = decks.find(d => d.name === 'Old Pier');
  if (oldPier) {
    const placement = cargoPlacement(oldPier), cargo = makeCargoFerry();
    cargo.position.set(placement.x, 0.15, placement.z);
    cargo.rotation.y = placement.heading;
    scene.add(cargo);
  }
  const feature = data.features.find(f => f.tags.man_made === 'pier' && f.tags.mooring === 'ferry');
  const deck = decks.find(d => d.id === feature?.id);
  if (!deck || deck.points.length < 9) return;
  for (const placement of ferryPlacements(deck)) {
    const boat = makeFerry(placement);
    boat.position.set(placement.x, 0.15, placement.z);
    boat.rotation.y = placement.heading;
    scene.add(boat);
  }
}

export function makeCargoFerry() {
  const boat = new THREE.Group();
  boat.name = 'Old Pier red cargo ferry';
  const mat = color => new THREE.MeshStandardMaterial({ color, roughness: 0.65 });
  const red = mat('#b51c27'), white = mat('#e9e9df'), dark = mat('#17272b'), glass = mat('#39616c'), blue = mat('#213f9b'), deck = mat('#71756e');
  const box = (w, h, d, material, x, y, z) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z); boat.add(mesh); return mesh;
  };
  const bar = (a, b, radius = 0.05, material = white) => {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), delta = end.clone().sub(start);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, delta.length(), 6), material);
    mesh.position.copy(start).add(end).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()); boat.add(mesh);
  };
  const shape = new THREE.Shape();
  shape.moveTo(-3.2, -17); shape.lineTo(3.2, -17); shape.lineTo(3.7, 10);
  shape.quadraticCurveTo(3.4, 14.5, 0, 17); shape.quadraticCurveTo(-3.4, 14.5, -3.7, 10); shape.closePath();
  function layer(material, bottom, depth, scale = 1) {
    const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 10 }), material);
    mesh.rotation.x = Math.PI / 2; mesh.position.y = bottom + depth; mesh.scale.set(scale, scale, 1); boat.add(mesh);
  }
  layer(dark, -0.85, 0.85, 0.97);
  layer(red, -0.05, 2.15);
  layer(white, 0.25, 0.12, 1.005);
  layer(deck, 2.1, 0.08, 0.94);
  // Low cargo well, raised bow, and aft accommodation block.
  box(6.6, 1.7, 8, white, 0, 3, -11.5);
  box(5, 2.1, 4.3, white, 0, 4.85, -9.8);
  box(5.7, 0.2, 4.9, red, 0, 6, -9.8);
  box(4.4, 0.95, 0.04, glass, 0, 5.1, -7.63);
  box(0.12, 1.1, 0.1, white, 0, 5.1, -7.58);
  for (const side of [-1, 1]) {
    box(0.04, 0.95, 2.8, glass, side * 2.52, 5.1, -9.8);
    for (const z of [-13.5, -11.2, -8.9]) {
      const port = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.05, 12), dark);
      port.rotation.z = Math.PI / 2; port.position.set(side * 3.32, 3.3, z); boat.add(port);
    }
    box(0.18, 1.0, 17.2, red, side * 3.5, 2.65, 0.7);
    for (let z = -6; z <= 9; z += 3) {
      bar([side * 3.5, 3.1, z], [side * 3.5, 3.65, z]);
      const tyre = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.16, 8, 16), dark);
      tyre.rotation.y = Math.PI / 2; tyre.position.set(side * 3.8, 1.25, z); boat.add(tyre);
    }
    bar([side * 3.5, 3.65, -6], [side * 3.5, 3.65, 9]);
    bar([side * 3.1, 4, -15.5], [side * 3.1, 4.45, -15.5]);
    bar([side * 3.1, 4.45, -15.5], [side * 3.1, 4.45, -7.5]);
  }
  box(4.5, 1.2, 3.2, red, 0, 2.8, 12.7);
  bar([0, 3.4, 12.5], [0, 13.4, 12.5], 0.1, dark);
  bar([-1.4, 11.2, 12.5], [1.4, 11.2, 12.5], 0.06, dark);
  for (const side of [-1, 1]) {
    bar([side * 2.8, 3.3, 10.3], [0, 12.8, 12.5], 0.018, dark);
    bar([side * 2.8, 3.3, 15], [0, 12.8, 12.5], 0.018, dark);
  }
  bar([0, 6.1, -9.8], [0, 9.2, -9.8], 0.065, dark);
  bar([-0.9, 7.5, -9.8], [0.9, 7.5, -9.8], 0.07);
  // Folded blue loading crane amidships and a small aft derrick.
  box(0.9, 0.7, 1.2, blue, 1.8, 2.6, -0.5);
  bar([1.8, 2.8, -0.5], [1.8, 4.9, 1.4], 0.22, blue);
  bar([1.8, 4.9, 1.4], [1.8, 3.1, 3.5], 0.18, blue);
  bar([-2, 4, -14], [-2, 7.3, -15.7], 0.14, dark);
  bar([-2, 7.3, -15.7], [-2, 7.8, -11.7], 0.12, dark);
  bar([-2, 7.8, -11.7], [-2, 4.5, -11.7], 0.02, dark);
  return boat;
}
export function cargoPlacement(deck) {
  const a = deck.points[1], b = deck.points[2];
  const dx = b[0] - a[0], dz = b[1] - a[1], distance = Math.hypot(dx, dz);
  let nx = -dz / distance, nz = dx / distance;
  const x = (a[0] + b[0]) / 2, z = (a[1] + b[1]) / 2;
  if (inside(x + nx, z + nz, deck.points)) { nx *= -1; nz *= -1; }
  return { x: x + nx * 5.6, z: z + nz * 5.6, heading: Math.atan2(dx, dz), length: 34, beam: 8 };
}
