import { surfaceDetail } from "./surface-detail.js";
import { addFerries } from "./boats.js";
import * as THREE from "three";
import { project, inside } from "./geo.js";
export function harbourSurfaces(data, ground) {
  return data.features
    .filter((f) => f.tags.man_made === "pier")
    .map((f) => {
      const points = f.coordinates.map(project);
      return {
        id: f.id,
        name: f.tags.name || "Ferry Pier",
        points,
        y: Math.max(1.5, ...points.map((p) => ground(...p))),
      };
    });
}
export function onDeck(x, z, decks) {
  return decks.find((d) => inside(x, z, d.points));
}
export function addHarbour(scene, data, heightAt, decks, obstacles) {
  addFerries(scene, data, decks);
  const stone = new THREE.MeshStandardMaterial({
      color: "#7f887a",
      roughness: 1,
    }),
    concrete = new THREE.MeshStandardMaterial({
      color: "#a8ada2",
      roughness: 1,
    }),
    tarmac = new THREE.MeshStandardMaterial({
      color: "#6e7873",
      roughness: 1,
      side: THREE.DoubleSide,
    });
  const wallVertices = [],
    wallIndices = [];
  for (const f of data.features) {
    const pts = f.coordinates.map(project);
    if (f.tags.man_made === "pier") {
      const deck = decks.find((d) => d.id === f.id),
        shape = new THREE.Shape();
      pts.forEach((p, i) =>
        i ? shape.lineTo(p[0], -p[1]) : shape.moveTo(p[0], -p[1]),
      );
      shape.closePath();
      const mesh = new THREE.Mesh(
        new THREE.ExtrudeGeometry(shape, {
          depth: deck.y + 0.8,
          bevelEnabled: false,
        }),
        concrete,
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = -0.8;
      scene.add(mesh);
      const top = new THREE.Mesh(new THREE.ShapeGeometry(shape), tarmac);
      top.rotation.x = -Math.PI / 2;
      top.position.y = deck.y + 0.025;
      scene.add(top);
      // Bollard form/spacing is an estimate; pier perimeter is mapped.
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i],
          b = pts[i + 1],
          length = Math.hypot(b[0] - a[0], b[1] - a[1]);
        for (let d = 4; d < length - 3; d += 12) {
          const t = d / length,
            m = new THREE.Mesh(
              new THREE.CylinderGeometry(0.16, 0.22, 0.55, 6),
              stone,
            );
          m.position.set(
            a[0] + (b[0] - a[0]) * t,
            deck.y + 0.275,
            a[1] + (b[1] - a[1]) * t,
          );
          scene.add(m);
        }
      }
    } else if (f.tags.barrier === "wall") {
      const wallHeight =
          parseFloat(f.tags.height) ||
          (f.tags.historic === "ruins" ? 1.1 : 0.9),
        thickness = f.tags.historic === "ruins" ? 0.9 : 0.45;
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i],
          b = pts[i + 1],
          dx = b[0] - a[0],
          dz = b[1] - a[1],
          length = Math.hypot(dx, dz);
        if (length < 0.1) continue;
        const nx = ((dz / length) * thickness) / 2,
          nz = ((-dx / length) * thickness) / 2,
          n = Math.ceil(length / 6);
        for (let j = 0; j < n; j++) {
          const a1 = [a[0] + (dx * j) / n, a[1] + (dz * j) / n],
            b1 = [a[0] + (dx * (j + 1)) / n, a[1] + (dz * (j + 1)) / n],
            ya = heightAt(...a1),
            yb = heightAt(...b1),
            k = wallVertices.length / 3;
          // Broken standing masonry within the mapped fort footprint; no invented roofs/towers.
          const topA = f.tags.historic === "ruins" ? 2.5 + .8*Math.sin(i*1.7+j*1.3)**2 : wallHeight;
          const topB = f.tags.historic === "ruins" ? 2.5 + .8*Math.sin(i*1.7+(j+1)*1.3)**2 : wallHeight;
          wallVertices.push(
            a1[0] + nx,
            ya,
            a1[1] + nz,
            b1[0] + nx,
            yb,
            b1[1] + nz,
            a1[0] - nx,
            ya,
            a1[1] - nz,
            b1[0] - nx,
            yb,
            b1[1] - nz,
            a1[0] + nx,
            ya + topA,
            a1[1] + nz,
            b1[0] + nx,
            yb + topB,
            b1[1] + nz,
            a1[0] - nx,
            ya + topA,
            a1[1] - nz,
            b1[0] - nx,
            yb + topB,
            b1[1] - nz,
          );
          wallIndices.push(
            ...[
              0, 1, 4, 1, 5, 4, 2, 6, 3, 3, 6, 7, 4, 5, 6, 5, 7, 6, 0, 4, 2, 2,
              4, 6, 1, 3, 5, 3, 7, 5,
            ].map((v) => v + k),
          );
        }
        const points = [
          [a[0] + nx, a[1] + nz],
          [b[0] + nx, b[1] + nz],
          [b[0] - nx, b[1] - nz],
          [a[0] - nx, a[1] - nz],
        ];
        obstacles.push({
          x: (a[0] + b[0]) / 2,
          z: (a[1] + b[1]) / 2,
          w: Math.abs(dx) / 2 + 0.5,
          d: Math.abs(dz) / 2 + 0.5,
          points,
        });
      }
    } else if (f.tags.amenity === "parking" && pts.length > 3) {
      const triangles = THREE.ShapeUtils.triangulateShape(
          pts.map((p) => new THREE.Vector2(...p)),
          [],
        ),
        geo = new THREE.BufferGeometry();
      geo.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(
          pts.flatMap((p) => [p[0], heightAt(...p) + 0.12, p[1]]),
          3,
        ),
      );
      geo.setIndex(triangles.flat());
      geo.computeVertexNormals();
      scene.add(new THREE.Mesh(geo, tarmac));
    }
  }
  if (wallVertices.length) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(wallVertices, 3),
    );
    geo.setIndex(wallIndices);
    geo.computeVertexNormals();
    stone.side = THREE.DoubleSide;
    surfaceDetail(stone,.4,.3);
    scene.add(new THREE.Mesh(geo, stone));
  }
}
