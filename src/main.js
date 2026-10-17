import { createLeaderboard } from "./leaderboard.js";
import { createAirstrip, addAirstrip } from "./airstrip.js";
import { WATER_RANGE, waterRangeStep } from "./water-driving.js";
import { addCraftHut } from "./craft-hut.js";
import { HOUSE_HOTEL_ID, addHouseHotel } from "./house-hotel.js";
import { CHURCH_ID, addChurch } from "./church.js";
import { HOSTEL_ID, addHostel } from "./hostel.js";
import { DAYS_BAR_ID, addDaysBar } from "./days-bar.js";
import { DOONMORE_BUILDINGS, addDoonmore } from "./doonmore.js";
import { createRaceMode } from "./race-mode.js";
import { HANDLING, ease, drivingStep } from "./driving.js";
import { createEngineAudio } from "./engine-audio.js";
import { bindTouchControls } from "./touch-controls.js";
import {
  VEHICLES,
  makeVehicle,
  disposeVehicle,
  vehiclePreviews,
} from "./vehicles.js";
import { challengeDrain, drainDepth } from "./drains.js";
import { smoothRoad, junctionKeys } from "./roads.js";
import { START_LOCATIONS, RACE_LOCATIONS, resolveStart } from "./starts.js";
import * as THREE from "three";
import "./style.css";
import { buildingProfile } from "./buildings.js";
import { makeRoof, roadProfile } from "./architecture.js";
import { harbourSurfaces, onDeck, addHarbour } from "./harbour.js";
import { project, inside, nearestRoad, landTerrainSampler } from "./geo.js";
const $ = (id) => document.getElementById(id),
  keys = new Set(),
  touchKeys = new Set();
const pressed = (key) => keys.has(key) || touchKeys.has(key);
let scene,
  camera,
  renderer,
  car,
  heightAt,
  coast,
  decks = [],
  roads = [],
  mapRoads = [],
  obstacles = [],
  running = false,
  ready = false,
  paused = false,
  view = 0,
  speed = 0,
  heading = 0,
  distance = 0,
  toastTimer,
  boost = false,
  returnDrive = null,
  drain,
  inDrain = false,
  selectedVehicle = "jeep",
  spawn,
  startPoints = {},
  roadInfo;
const state = { x: 0, z: 0 };
let raceMode;
let airstrip;
let waterRange = WATER_RANGE;
let slip = 0;
const isWater = (x, z) => !inside(x, z, coast) && !onDeck(x, z, decks);
let steering = 0, turnRate = 0, acceleration = 0;
const engineAudio = createEngineAudio();
window.addEventListener("pointerdown", engineAudio.unlock);
window.addEventListener("keydown", engineAudio.unlock);
function toast(s) {
  $("toast").textContent = s;
  $("toast").style.opacity = 1;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($("toast").style.opacity = 0), 2800);
}
function material(color, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 1, ...extra });
}
function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}
function roadMesh(points, width, color, lift) {
  // Sample across the road as well as along it: a single wide quad could
  // cut through the terrain at a junction and expose grass triangles.
  const v = [],
    ix = [],
    across = Math.max(2, Math.ceil(width / 0.6)),
    stride = across + 1;
  for (let i = 0; i < points.length; i++) {
    const p = points[i],
      a = points[Math.max(0, i - 1)],
      b = points[Math.min(points.length - 1, i + 1)];
    const normal = (u, w) => {
      const dx = w[0] - u[0],
        dz = w[1] - u[1],
        l = Math.hypot(dx, dz) || 1;
      return [dz / l, -dx / l];
    };
    const n1 = normal(a, p),
      n2 = normal(p, b);
    let nx,
      nz,
      miter = 1;
    if (i === 0) {
      [nx, nz] = n2;
    } else if (i === points.length - 1) {
      [nx, nz] = n1;
    } else {
      const l = Math.hypot(n1[0] + n2[0], n1[1] + n2[1]);
      if (l < 0.01) {
        [nx, nz] = n2;
      } else {
        nx = (n1[0] + n2[0]) / l;
        nz = (n1[1] + n2[1]) / l;
        miter = Math.min(2, 1 / Math.max(0.5, nx * n2[0] + nz * n2[1]));
      }
    }
    for (let j = 0; j <= across; j++) {
      const offset = (j / across - 0.5) * width * miter,
        x = p[0] + nx * offset,
        z = p[1] + nz * offset;
      v.push(x, heightAt(x, z) + lift, z);
    }
    if (i < points.length - 1)
      for (let j = 0; j < across; j++) {
        const k = i * stride + j;
        ix.push(k, k + stride, k + 1, k + 1, k + stride, k + stride + 1);
      }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
  geo.setIndex(ix);
  geo.computeVertexNormals();
  scene.add(
    new THREE.Mesh(
      geo,
      material(color, {
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      }),
    ),
  );
}
function junctionSurface(p, radius, color, lift) {
  const v = [p[0], heightAt(...p) + lift, p[1]],
    ix = [],
    sides = 48,
    rings = Math.max(2, Math.ceil(radius / 0.5));
  for (let ring = 1; ring <= rings; ring++)
    for (let i = 0; i < sides; i++) {
      const angle = (i / sides) * Math.PI * 2,
        r = (radius * ring) / rings,
        x = p[0] + Math.cos(angle) * r,
        z = p[1] + Math.sin(angle) * r;
      v.push(x, heightAt(x, z) + lift, z);
    }
  for (let i = 0; i < sides; i++) ix.push(0, 1 + i, 1 + ((i + 1) % sides));
  for (let ring = 1; ring < rings; ring++)
    for (let i = 0; i < sides; i++) {
      const a = 1 + (ring - 1) * sides + i,
        b = 1 + (ring - 1) * sides + ((i + 1) % sides),
        c = a + sides,
        d = b + sides;
      ix.push(a, c, b, b, c, d);
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
  geo.setIndex(ix);
  geo.computeVertexNormals();
  scene.add(
    new THREE.Mesh(
      geo,
      material(color, {
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
    ),
  );
}
function terrain(grid) {
  const patchV = [],
    patchColors = [],
    patchIndices = [];
  const nw = project([grid.bounds[0], grid.bounds[3]]),
    se = project([grid.bounds[2], grid.bounds[1]]),
    nx = 240,
    nz = 240,
    v = [],
    colors = [],
    indices = [];
  const c = new THREE.Color();
  for (let j = 0; j <= nz; j++)
    for (let i = 0; i <= nx; i++) {
      const x = nw[0] + ((se[0] - nw[0]) * i) / nx,
        z = nw[1] + ((se[1] - nw[1]) * j) / nz,
        land = inside(x, z, coast),
        h = land ? Math.max(0.6, heightAt(x, z)) : -4;
      v.push(x, h, z);
      const noise = Math.sin(x * 0.03) * Math.cos(z * 0.023);
      c.set(
        land ? (h < 3 ? "#aab398" : h > 65 ? "#73897b" : "#819665") : "#517b79",
      );
      c.multiplyScalar(1 + noise * 0.06);
      colors.push(c.r, c.g, c.b);
      if (i < nx && j < nz) {
        const k = j * (nx + 1) + i;
        const stepX = (se[0] - nw[0]) / nx,
          stepZ = (se[1] - nw[1]) / nz;
        if (
          x + stepX >= drain.bounds[0] &&
          x <= drain.bounds[2] &&
          z + stepZ >= drain.bounds[1] &&
          z <= drain.bounds[3]
        ) {
          // Refine only the drain area so narrow trenches are genuine ground cuts.
          const subdivisions = 28,
            offset = patchV.length / 3;
          for (let row = 0; row <= subdivisions; row++)
            for (let col = 0; col <= subdivisions; col++) {
              const px = x + (stepX * col) / subdivisions,
                pz = z + (stepZ * row) / subdivisions,
                depth = drainDepth(px, pz, drain);
              patchV.push(px, heightAt(px, pz), pz);
              const shade = new THREE.Color(
                depth > 0.1 ? "#62634c" : "#819665",
              );
              patchColors.push(shade.r, shade.g, shade.b);
            }
          for (let row = 0; row < subdivisions; row++)
            for (let col = 0; col < subdivisions; col++) {
              const a = offset + row * (subdivisions + 1) + col,
                b = a + subdivisions + 1;
              patchIndices.push(a, b, a + 1, a + 1, b, b + 1);
            }
        } else
          indices.push(k, k + nx + 1, k + 1, k + 1, k + nx + 1, k + nx + 2);
      }
    }
  const base = v.length / 3;
  // Large terrain patches exceed browser argument limits when spread into push.
  for (const value of patchV) v.push(value);
  for (const value of patchColors) colors.push(value);
  for (const index of patchIndices) indices.push(index + base);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  scene.add(new THREE.Mesh(geo, material("#ffffff", { vertexColors: true })));
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(50000, 50000),
    material("#538d96", { roughness: 0.35, metalness: 0.15 }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = 0.15;
  scene.add(sea);
}
function scenery(data) {
  let seed = 19;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const walls = [material("#e8e6d9"), material("#ddd6bc"), material("#d0dace")],
    roof = material("#48575b", { side: THREE.DoubleSide }),
    stone = material("#879080"),
    utilityWalls = material("#a0a28d"),
    greenhouseWalls = material("#c4d6cd", { transparent: true, opacity: 0.55 });
  for (const b of data.buildings) {
    if (b.id === HOUSE_HOTEL_ID) {
      addHouseHotel(scene, b, heightAt, obstacles);
      continue;
    }
    if (b.id === CHURCH_ID) {
      addChurch(scene, b, heightAt, obstacles);
      continue;
    }
    if (b.id === HOSTEL_ID) {
      addHostel(scene, b, heightAt, obstacles);
      continue;
    }
    if (b.id === DAYS_BAR_ID) {
      addDaysBar(scene, b, heightAt, obstacles);
      continue;
    }
    if (DOONMORE_BUILDINGS.has(b.id)) {
      addDoonmore(scene, b, heightAt, obstacles);
      continue;
    }
    const profile = buildingProfile(b.tags);
    if (profile.kind === "omit") continue;
    const pts = b.coordinates.map(project),
      xs = pts.map((p) => p[0]),
      zs = pts.map((p) => p[1]);
    const x = (Math.min(...xs) + Math.max(...xs)) / 2,
      z = (Math.min(...zs) + Math.max(...zs)) / 2,
      w = Math.max(3, Math.max(...xs) - Math.min(...xs)),
      d = Math.max(3, Math.max(...zs) - Math.min(...zs));
    if (w > 65 || d > 65) continue;
    if (profile.kind === "ruin") {
      // Ruins are open stone outlines, not complete houses with roofs.
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i],
          b = pts[i + 1];
        const dx = b[0] - a[0],
          dz = b[1] - a[1];
        const length = Math.hypot(dx, dz);
        if (length < 0.1) continue;
        const mx = (a[0] + b[0]) / 2,
          mz = (a[1] + b[1]) / 2;
        const wall = box(
          0.45,
          profile.height,
          length,
          stone,
          mx,
          heightAt(mx, mz) + profile.height / 2,
          mz,
        );
        wall.rotation.y = Math.atan2(dx, dz);
        scene.add(wall);
        const nx = (dz / length) * 0.3,
          nz = (-dx / length) * 0.3;
        const wallPoints = [
          [a[0] + nx, a[1] + nz],
          [b[0] + nx, b[1] + nz],
          [b[0] - nx, b[1] - nz],
          [a[0] - nx, a[1] - nz],
        ];
        obstacles.push({
          x: mx,
          z: mz,
          w: Math.abs(dx) / 2 + 0.5,
          d: Math.abs(dz) / 2 + 0.5,
          points: wallPoints,
        });
      }
      continue;
    }
    const pitched =
      profile.kind === "building" && b.tags["roof:shape"] !== "flat";
    const rise = pitched
      ? Math.max(
          0.8,
          Math.min(
            b.tags.building === "church" ? 2.8 : 2,
            Math.min(w, d) * 0.26,
          ),
        )
      : 0;
    const y = heightAt(x, z),
      h = profile.estimated
        ? b.tags.building === "church"
          ? 5
          : profile.height
        : Math.max(0.5, profile.height - rise),
      g = new THREE.Group();
    g.position.set(x, y - 3, z);
    const shape = new THREE.Shape();
    pts.forEach((p, i) =>
      i
        ? shape.lineTo(p[0] - x, -(p[1] - z))
        : shape.moveTo(p[0] - x, -(p[1] - z)),
    );
    shape.closePath();
    const facade =
      profile.kind === "greenhouse"
        ? greenhouseWalls
        : profile.kind === "outbuilding"
          ? utilityWalls
          : walls[Math.floor(rand() * 3)];
    facade.side = THREE.DoubleSide;
    const body = new THREE.Mesh(
      new THREE.ExtrudeGeometry(shape, { depth: h + 3, bevelEnabled: false }),
      facade,
    );
    body.rotation.x = -Math.PI / 2;
    g.add(body);
    if (pitched) {
      const local = pts.map((p) => [p[0] - x, p[1] - z]);
      g.add(makeRoof(local, h + 3, rise, roof, facade));
    } else {
      const top = new THREE.Mesh(new THREE.ShapeGeometry(shape), roof);
      top.rotation.x = -Math.PI / 2;
      top.position.y = h + 3 + 0.02;
      g.add(top);
    }
    // Restrict facade detail to the harbour study area. Positions follow each
    // mapped facade; window number and dimensions are illustrative.
    if (
      x > -650 &&
      x < 1200 &&
      z > 550 &&
      z < 1150 &&
      profile.kind === "building"
    ) {
      const glass = material("#405e62", { roughness: 0.3 });
      const levels = Math.max(1, Math.round(h / 2.8));
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i],
          b1 = pts[i + 1],
          dx = b1[0] - a[0],
          dz = b1[1] - a[1],
          length = Math.hypot(dx, dz);
        const count = Math.floor(length / 3.3);
        for (let floor = 0; floor < levels; floor++)
          for (let j = 0; j < count; j++) {
            const t = (j + 1) / (count + 1),
              window = box(
                0.7,
                0.95,
                0.08,
                glass,
                a[0] + dx * t - x,
                4.3 + floor * 2.8,
                a[1] + dz * t - z,
              );
            window.rotation.y = Math.atan2(-dz, dx);
            g.add(window);
          }
      }
    }
    scene.add(g);
    obstacles.push({ x, z, w: w / 2 + 1, d: d / 2 + 1, points: pts });
  }
  const rockMat = material("#85968c"),
    rockGeo = new THREE.IcosahedronGeometry(1, 0),
    rocks = new THREE.InstancedMesh(rockGeo, rockMat, 450),
    dummy = new THREE.Object3D();
  let count = 0;
  for (let i = 0; i < 1500 && count < 450; i++) {
    const x = (rand() - 0.5) * 6500,
      z = (rand() - 0.5) * 4500;
    if (!inside(x, z, coast) || nearestRoad(x, z, roads).distance < 9) continue;
    dummy.position.set(x, heightAt(x, z), z);
    dummy.scale.set(1 + rand() * 3, 0.8 + rand() * 2, 1 + rand() * 3);
    dummy.rotation.set(rand(), rand() * 6, rand());
    dummy.updateMatrix();
    rocks.setMatrixAt(count++, dummy.matrix);
  }
  rocks.count = count;
  scene.add(rocks);
}
function reset() {
  airstrip?.reset();
  waterRange = WATER_RANGE;
  raceMode?.cancel("Run cancelled · reset to road");
  inDrain = false;
  if (!ready) return;
  let p = running
    ? nearestRoad(
        state.x,
        state.z,
        roads.filter(
          (r) =>
            !obstacles.some((o) =>
              inside(
                (r.points[0][0] + r.points[1][0]) / 2,
                (r.points[0][1] + r.points[1][1]) / 2,
                o.points,
              ),
            ),
        ),
      )
    : spawn;
  if (!inside(p.x, p.z, coast)) p = spawn;
  state.x = p.x;
  state.z = p.z;
  heading = p.heading;
  speed = 0;
  updateCar(0);
  camera.position
    .copy(car.position)
    .add(
      new THREE.Vector3(-Math.sin(heading) * 10, 5, -Math.cos(heading) * 10),
    );
  toast("Back on the road. Take your time.");
}
function updateCar(dt) {
  if (!dt) { slip = 0; steering = 0; turnRate = 0; acceleration = 0; car.rotation.z = 0; }
  const afloat = selectedVehicle === "kursk" && isWater(state.x, state.z);
  car.position.set(state.x, afloat ? 0.15 : heightAt(state.x, state.z) + 0.22, state.z);
  car.rotation.y = heading;
  const f = heightAt(
      state.x + Math.sin(heading) * 1.5,
      state.z + Math.cos(heading) * 1.5,
    ),
    b = heightAt(
      state.x - Math.sin(heading) * 1.5,
      state.z - Math.cos(heading) * 1.5,
    );
  const profile = HANDLING[selectedVehicle];
  const pitch = afloat ? 0 : Math.max(-0.25, Math.min(0.25, -Math.atan2(f - b, 3)))
    - THREE.MathUtils.clamp(acceleration * 0.004 * profile.lean, -0.045, 0.045);
  const roll = THREE.MathUtils.clamp(-turnRate * speed * 0.012 * profile.lean, -0.09, 0.09);
  car.rotation.x = dt ? ease(car.rotation.x, pitch, 8, dt) : pitch;
  car.rotation.z = dt ? ease(car.rotation.z, roll, 6, dt) : 0;
  for (const w of car.userData.wheels)
    w.rotation.x += (speed * dt) / (w.userData.radius || 0.34);
}
function drive(dt) {
  if (inDrain) return;
  const accel = pressed("w") || pressed("ArrowUp"),
    brake = pressed("s") || pressed("ArrowDown"),
    left = pressed("a") || pressed("ArrowLeft"),
    right = pressed("d") || pressed("ArrowRight");
  roadInfo = nearestRoad(state.x, state.z, roads);
  const inAirstrip = airstrip.unlocked && airstrip.arena(state.x, state.z);
  const onRoad = inAirstrip || roadInfo.distance < roadInfo.width / 2 + 1;
  const inWater = isWater(state.x, state.z);
  const previousSpeed = speed;
  const profile = inAirstrip ? {
    ...HANDLING[selectedVehicle], top: airstrip.turbo ? 95 : 45,
    acceleration: airstrip.turbo ? 24 : 9, steer: 1.85, response: 8,
    rearGrip: Math.min(HANDLING[selectedVehicle].rearGrip ?? 1, 0.74),
  } : HANDLING[selectedVehicle];
  const next = drivingStep(speed, steering, {
    accel, brake, turn: (left ? 1 : 0) - (right ? 1 : 0),
    handbrake: pressed(" "), onRoad, boost, slip,
  }, profile, dt);
  speed = inWater ? THREE.MathUtils.clamp(next.speed, -3, 6) : next.speed;
  slip = next.slip;
  steering = next.steering;
  turnRate = next.yaw;
  acceleration = dt ? (speed - previousSpeed) / dt : 0;
  heading += turnRate * dt;
  const previousPosition = { ...state };
  const x = state.x + Math.sin(heading + slip) * speed * dt,
    z = state.z + Math.cos(heading + slip) * speed * dt;
  const enteringWater = isWater(x, z);
  const waterAllowed = selectedVehicle === "kursk" && waterRange > 0;
  const surfaceY = (px, pz) => waterAllowed && isWater(px, pz) ? 0.15 : heightAt(px, pz);
  const blocked =
    (enteringWater && !waterAllowed) ||
    obstacles.some(
      (o) =>
        Math.abs(x - o.x) < o.w &&
        Math.abs(z - o.z) < o.d &&
        inside(x, z, o.points),
    ) ||
    Math.abs(surfaceY(x, z) - surfaceY(state.x, state.z)) > 2;
  if (blocked) {
    slip = 0;
    speed = 0;
    toast("Edge of the lane — reverse or press R to return.");
  } else {
    state.x = x;
    state.z = z;
    distance += Math.abs(speed) * dt;
  }
  const airstripEvent = airstrip.tick(dt, previousPosition, state, speed);
  if (airstripEvent.discovered) {
    raceMode?.cancel("Time trial ended · secret airstrip discovered");
    toast("Secret airstrip unlocked! Hit the glowing pads. Hold the handbrake to drift.");
  }
  if (airstripEvent.launched) {
    speed = Math.max(Math.abs(speed), 62) * (speed < 0 ? -1 : 1);
    toast("SUPER SPEED! Keep it on the airstrip.");
  }
  if (selectedVehicle === "kursk") {
    const afloat = isWater(state.x, state.z);
    waterRange = waterRangeStep(waterRange, afloat, blocked ? 0 : Math.abs(speed) * dt, dt);
    if (afloat && waterRange <= 0) {
      reset();
      toast("Water range exhausted · back on the road. Recharge on land.");
      return;
    }
  }
  updateCar(dt);
  if (drainDepth(state.x, state.z, drain) > 1.2) {
    inDrain = true;
    raceMode?.cancel("Run ended · car in drain");
    speed = 0;
    keys.clear();
    toast("In the drain! Press R to return to the road.");
  }
}
function map() {
  const ctx = $("map").getContext("2d"),
    w = 320,
    h = 220,
    xs = coast.map((p) => p[0]),
    zs = coast.map((p) => p[1]),
    minX = Math.min(...xs),
    maxX = Math.max(...xs),
    minZ = Math.min(...zs),
    maxZ = Math.max(...zs),
    scale = Math.min((w - 30) / (maxX - minX), (h - 30) / (maxZ - minZ));
  const pt = (p) => [
    (p[0] - (minX + maxX) / 2) * scale + w / 2,
    (p[1] - (minZ + maxZ) / 2) * scale + h / 2,
  ];
  ctx.clearRect(0, 0, w, h);
  ctx.beginPath();
  coast.forEach((p, i) => {
    const [x, y] = pt(p);
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = "#55745b";
  ctx.fill();
  ctx.strokeStyle = "#809886";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.strokeStyle = "#d9dfb3";
  ctx.lineWidth = 1.3;
  for (const line of mapRoads) {
    ctx.beginPath();
    line.forEach((p, i) => {
      const [x, y] = pt(p);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.stroke();
  }
  for (const [label, coord] of [
    ["Ferry Pier", [-10.212, 53.6127]],
    ["Old Pier", [-10.2066, 53.6132]],
    ["Church", [-10.2086, 53.6137]],
  ]) {
    const [lx, ly] = pt(project(coord));
    ctx.fillStyle = "#b6d4d0";
    ctx.fillRect(lx - 1.5, ly - 1.5, 3, 3);
  }
  raceMode?.drawMap(ctx, pt);
  const [x, y] = pt([state.x, state.z]);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-heading);
  ctx.fillStyle = "#e0ff9f";
  ctx.shadowColor = "#d5f995";
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(0, 7);
  ctx.lineTo(-4, -4);
  ctx.lineTo(4, -4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.04);
  if (!ready) return;
  if (running && !paused && !raceMode?.countingDown) drive(dt);
  raceMode?.tick(dt, state, heading, running && !paused && !document.hidden);
  engineAudio.update(running && !paused && !document.hidden && !inDrain, speed,
    pressed("w") || pressed("ArrowUp"), HANDLING[selectedVehicle]);
  const behind = new THREE.Vector3(-Math.sin(heading), 0, -Math.cos(heading)),
    target = new THREE.Vector3();
  if (!running) {
    target
      .copy(car.position)
      .add(behind.clone().multiplyScalar(70))
      .add(new THREE.Vector3(-45, 65, 0));
    camera.position.lerp(target, 1 - Math.exp(-dt * 2));
    camera.lookAt(car.position.clone().add(new THREE.Vector3(0, 4, 0)));
  } else if (view === 0) {
    target
      .copy(car.position)
      .addScaledVector(behind, 8 + Math.abs(speed) * 0.13);
    target.y += 4.1;
    target.y = Math.max(target.y, heightAt(target.x, target.z) + 2.5);
    camera.position.lerp(target, 1 - Math.exp(-dt * 5));
    camera.lookAt(
      car.position
        .clone()
        .add(
          new THREE.Vector3(Math.sin(heading) * 8, 1.3, Math.cos(heading) * 8),
        ),
    );
  } else {
    target
      .copy(car.position)
      .add(
        new THREE.Vector3(
          Math.sin(heading) * 0.5,
          car.userData.eyeHeight || 1.45,
          Math.cos(heading) * 0.5,
        ),
      );
    camera.position.copy(target);
    camera.lookAt(
      target
        .clone()
        .add(
          new THREE.Vector3(
            Math.sin(heading) * 20,
            car.rotation.x * -15,
            Math.cos(heading) * 20,
          ),
        ),
    );
  }
  $("water-range").hidden = selectedVehicle !== "kursk" || !running;
  $("water-range").textContent = `Water range: ${Math.ceil(waterRange)} m${isWater(state.x, state.z) ? " · Head for shore" : waterRange < WATER_RANGE ? " · Recharging" : " · Ready"}`;
  const playground = running && airstrip.unlocked && airstrip.arena(state.x, state.z);
  $("airstrip-status").hidden = !playground;
  $("airstrip-status").textContent = airstrip.turbo ? "SUPER SPEED · " + Math.round(Math.abs(speed) * 3.6) + " km/h" : "AIRSTRIP · Hit the glowing pads · Handbrake to drift";
  const fov = ease(camera.fov, playground && airstrip.turbo ? 76 : 60, 4, dt);
  if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
  car.visible = !running || view === 0;
  $("speed").textContent = String(Math.round(Math.abs(speed) * 3.6)).padStart(
    2,
    "0",
  );
  $("gear").textContent = speed < -0.1 ? "R" : speed > 0.1 ? "D" : "N";
  $("distance").innerHTML = `${(distance / 1000).toFixed(2)} <small>km</small>`;
  $("road-name").textContent = roadInfo?.name || "Harbour lanes";
  map();
  renderer.render(scene, camera);
}
const clock = new THREE.Clock();
async function init() {
  try {
    const results = await Promise.all(
      ["roads.geojson", "terrain.json", "island.json", "harbour.json"].map(
        async (file) => {
          const r = await fetch(`${import.meta.env.BASE_URL}data/${file}`);
          if (!r.ok) throw new Error(`Map asset ${file} unavailable`);
          return r.json();
        },
      ),
    );
    const [network, grid, island, harbour] = results;
    coast = island.coastline.map(project);
    const ground = landTerrainSampler(grid);
    decks = harbourSurfaces(harbour, ground);
    drain = challengeDrain(network);
    airstrip = createAirstrip(ground);
    heightAt = (x, z) =>
      onDeck(x, z, decks)?.y ?? airstrip.height(x, z) - drainDepth(x, z, drain);
    scene = new THREE.Scene();
    scene.background = new THREE.Color("#b4cecf");
    scene.fog = new THREE.FogExp2("#b4cecf", 0.00027);
    camera = new THREE.PerspectiveCamera(
      60,
      innerWidth / innerHeight,
      0.1,
      24000,
    );
    renderer = new THREE.WebGLRenderer({ canvas: $("world"), antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
    renderer.setSize(innerWidth, innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    scene.add(new THREE.HemisphereLight("#e6f1ee", "#637a4d", 2.5));
    const sun = new THREE.DirectionalLight("#fff2d1", 2.5);
    sun.position.set(-800, 1100, 500);
    scene.add(sun);
    const junctions = junctionKeys(
      network.features.map((f) => f.geometry.coordinates.map(project)),
    );
    const junctionWidths = new Map();
    for (const feature of network.features) {
      const p = feature.properties;
      if (
        [
          "footway",
          "path",
          "steps",
          "cycleway",
          "bridleway",
          "construction",
          "proposed",
        ].includes(p.highway)
      )
        continue;
      const line = smoothRoad(
          feature.geometry.coordinates.map(project),
          junctions,
        ),
        road = roadProfile(p),
        width = road.width;
      for (const p1 of feature.geometry.coordinates.map(project)) {
        const key = `${p1[0].toFixed(4)},${p1[1].toFixed(4)}`;
        if (junctions.has(key)) {
          const old = junctionWidths.get(key);
          if (!old || width > old.width)
            junctionWidths.set(key, { p: p1, width, color: road.color });
        }
      }
      mapRoads.push(line);
      for (let i = 0; i < line.length - 1; i++)
        roads.push({
          points: [line[i], line[i + 1]],
          width,
          id: String(feature.id),
          kind: p.highway,
          name: p.name || "Island lane",
        });
      const pts = line;
      roadMesh(pts, width + 1.2, "#9eab8b", 0.1);
      roadMesh(pts, width, road.color, 0.24);
    }
    for (const { p, width, color } of junctionWidths.values()) {
      junctionSurface(p, (width + 1.2) / 2, "#9eab8b", 0.1);
      junctionSurface(p, width / 2, color, 0.245);
    }
    if (!roads.length) throw new Error("No driveable map roads loaded");
    addAirstrip(scene, airstrip, roads, mapRoads, heightAt, obstacles);
    terrain(grid);
    scenery(island);
    addHarbour(scene, harbour, heightAt, decks, obstacles);
    addCraftHut(scene, roads, heightAt, obstacles);
    car = makeVehicle(selectedVehicle);
    const thumbnails = vehiclePreviews();
    for (const vehicle of VEHICLES)
      document.querySelector(`[data-vehicle="${vehicle.id}"] img`).src =
        thumbnails[vehicle.id];
    updateVehiclePreview(selectedVehicle);
    scene.add(car);
    startPoints = Object.fromEntries(
      [...START_LOCATIONS, ...RACE_LOCATIONS].map((location) => [
        location.id,
        resolveStart(location, roads, coast, obstacles),
      ]),
    );
    const leaderboard = createLeaderboard({ toast });
    raceMode = createRaceMode({
      leaderboard,
      scene, roads, starts: startPoints, heightAt, toast,
      begin(startPoint, path) {
        running = false;
        returnDrive = null;
        spawn = startPoint;
        reset();
        const ahead = path.find(p => Math.hypot(p.x - state.x, p.z - state.z) > 5);
        if (ahead) heading = Math.atan2(ahead.x - state.x, ahead.z - state.z);
        updateCar(0);
        keys.clear(); clearTouchControls();
        running = true; paused = false;
        $("guide").classList.add("hidden");
        $("intro").classList.add("hidden");
        $("resume").classList.add("hidden");
        document.body.classList.add("driving");
        return selectedVehicle;
      },
    });
    spawn = startPoints.east;
    ready = true;
    reset();
    camera.position.copy(car.position).add(new THREE.Vector3(-70, 70, -70));
    $("start-location").disabled = false;
    $("start").disabled = false;
    $("start").innerHTML = "Start exploring <span>↗</span>";
    $("loading").classList.add("hidden");
    $("toast").style.opacity = 0;
    window.bofin = {
      state,
      get speed() {
        return speed;
      },
      get distance() {
        return distance;
      },
      get ready() {
        return ready;
      },
      roads,
      coast,
      heightAt,
    };
    animate();
  } catch (e) {
    console.error(e);
    $("loading").textContent =
      `Unable to load: ${e.message}. Reload to try again.`;
    $("start").textContent = "Island unavailable";
  }
}
function harbourStart() {
  waterRange = WATER_RANGE;
  raceMode?.cancel("Run cancelled · returned to start");
  inDrain = false;
  if (!ready) return;
  const harbour = startPoints.harbour;
  state.x = harbour.x;
  state.z = harbour.z;
  heading = harbour.heading;
  speed = 0;
  updateCar(0);
  toast("Church start · head back towards the ferry harbour");
}

function cameraToggle() {
  if (!ready) return;
  view = 1 - view;
  if ($("camera")) $("camera").innerHTML =
    `C <span>${view ? "Driver view" : "Chase camera"}</span>`;
  toast(view ? "Driver view" : "Chase camera");
}
function togglePause() {
  if (!running) return;
  paused = !paused;
  keys.clear();
  toast(paused ? "Paused · press Esc to continue" : "Enjoy the road.");
}
for (const location of START_LOCATIONS) {
  const option = document.createElement("option");
  option.value = location.id;
  option.textContent = location.name;
  $("start-location").append(option);
}
$("start-location").value = "east";
$("start-description").textContent = START_LOCATIONS.find(
  (location) => location.id === "east",
).description;
$("start-location").onchange = () => {
  const location = START_LOCATIONS.find(
    (l) => l.id === $("start-location").value,
  );
  $("start-description").textContent = location.description;
  if (!ready || running) return;
  spawn = startPoints[location.id];
  state.x = spawn.x;
  state.z = spawn.z;
  heading = spawn.heading;
  speed = 0;
  roadInfo = spawn;
  updateCar(0);
  camera.position.copy(car.position).add(new THREE.Vector3(-70, 70, -70));
};
function updateVehiclePreview(type) {
  const thumbnail = document.querySelector(`[data-vehicle="${type}"] img`);
  const vehicle = VEHICLES.find(v => v.id === type);
  if (thumbnail?.getAttribute("src")) $("selected-vehicle-image").src = thumbnail.src;
  $("selected-vehicle-image").alt = `${vehicle.name} large preview`;
  $("selected-vehicle-name").textContent = vehicle.name;
}
function chooseVehicle(type) {
  updateVehiclePreview(type);
  selectedVehicle = type;
  for (const button of document.querySelectorAll("[data-vehicle]"))
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.vehicle === type),
    );
  if (!ready || car.userData.vehicleType === type) return;
  scene.remove(car);
  disposeVehicle(car);
  car = makeVehicle(type);
  scene.add(car);
  updateCar(0);
}
for (const button of document.querySelectorAll("[data-vehicle]"))
  button.onclick = () => chooseVehicle(button.dataset.vehicle);
function showModeChoice() {
  $("mode-choice").hidden = false;
  $("mode-setup").hidden = true;
}
function chooseMode(mode) {
  const timed = mode === "timed";
  $("mode-choice").hidden = true;
  $("mode-setup").hidden = false;
  $("mode-title").textContent = timed ? "Time Trial" : "Free drive";
  $("free-options").hidden = timed;
  $("start").hidden = timed;
  document.querySelector(".race-picker").hidden = !timed;
}
$("choose-timed").onclick = () => chooseMode("timed");
$("choose-free").onclick = () => chooseMode("free");
$("mode-back").onclick = showModeChoice;
function openLocations() {
  raceMode?.cancel("Run cancelled · opened locations");
  if (!ready) return;
  if (returnDrive && !running) {
    resumeDrive();
    return;
  }
  if (!running) return;
  returnDrive = {
    x: state.x,
    z: state.z,
    heading,
    speed,
    vehicle: selectedVehicle,
  };
  running = false;
  paused = false;
  keys.clear();
  clearTouchControls();
  speed = 0;
  $("guide").classList.add("hidden");
  showModeChoice();
  $("intro").classList.remove("hidden");
  $("resume").classList.remove("hidden");
  document.body.classList.remove("driving");
  $("start").innerHTML = "Drive from here <span>↗</span>";
}
function resumeDrive() {
  if (!returnDrive) return;
  Object.assign(state, { x: returnDrive.x, z: returnDrive.z });
  heading = returnDrive.heading;
  speed = returnDrive.speed;
  chooseVehicle(returnDrive.vehicle);
  returnDrive = null;
  running = true;
  paused = false;
  keys.clear();
  updateCar(0);
  $("intro").classList.add("hidden");
  $("resume").classList.add("hidden");
  document.body.classList.add("driving");
}
function toggleBoost() {
  if (!running) return;
  boost = !boost;
  $("boost").setAttribute("aria-pressed", String(boost));
  $("boost").innerHTML = `B <span>Boost ${boost ? "on" : "off"}</span>`;
  toast(
    boost
      ? "Boost on · faster acceleration and top speed"
      : "Normal driving speed",
  );
}
$("sound").onclick = () => {
  const muted = engineAudio.toggle();
  $("sound").setAttribute("aria-pressed", String(muted));
  const label = muted ? "Unmute engine sound" : "Mute engine sound";
  $("sound").setAttribute("aria-label", label);
  $("sound").title = label;
};
$("locations-menu").onclick = openLocations;
$("resume").onclick = resumeDrive;
$("boost").onclick = toggleBoost;
$("start").onclick = () => {
  if (!ready) return;
  running = false;
  returnDrive = null;
  keys.clear();
  $("resume").classList.add("hidden");
  spawn = startPoints[$("start-location").value];
  reset();
  running = true;
  paused = false;
  $("intro").classList.add("hidden");
  document.body.classList.add("driving");
  toast("WASD or arrow keys to drive. C changes the view.");
};
$("reset").onclick = reset;

$("help").onclick = () => {
  $("guide").classList.toggle("hidden");
  if (running) paused = !$("guide").classList.contains("hidden");
  keys.clear();
  clearTouchControls();
};
$("close-guide").onclick = () => {
  $("guide").classList.add("hidden");
  paused = false;
};
window.addEventListener("keydown", (e) => {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(k))
    e.preventDefault();
  keys.add(k);
  if (e.repeat) return;
  if (k === "m") openLocations();
  if (k === "b") toggleBoost();
  if (k === "r" && running) reset();
  if (k === "h") harbourStart();
  if (k === "c") cameraToggle();
  if (k === "Escape") {
    if (returnDrive && !running) {
      resumeDrive();
      return;
    }
    if (!$("guide").classList.contains("hidden")) {
      $("guide").classList.add("hidden");
      paused = false;
    } else togglePause();
  }
});
window.addEventListener("keyup", (e) =>
  keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key),
);
window.addEventListener("blur", () => {
  keys.clear();
  if (running) {
    paused = true;
    toast("Paused · press Esc to continue");
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    keys.clear();
    if (running) paused = true;
  }
});
const touchButtons = [...document.querySelectorAll("[data-key]")];
const clearTouchControls = bindTouchControls(touchButtons, touchKeys, () => {
  if (
    !running ||
    !$("guide").classList.contains("hidden") ||
    !$("intro").classList.contains("hidden")
  )
    return false;
  paused = false;
  return true;
});
window.addEventListener("blur", clearTouchControls);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) clearTouchControls();
});
window.addEventListener("resize", () => {
  if (!renderer) return;
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
init();

$("map-toggle").onclick = () => {
  const open = $("map-panel").hidden;
  $("map-panel").hidden = !open;
  $("map-toggle").setAttribute("aria-expanded", String(open));
  $("map-toggle").setAttribute("aria-label", open ? "Hide map" : "Show map");
  $("map-toggle").title = open ? "Hide map" : "Show map";
};
