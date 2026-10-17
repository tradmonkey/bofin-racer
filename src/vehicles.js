import * as THREE from "three";
export const VEHICLES = [
  { id: "kursk", name: "The Kursk" },
  { id: "jeep", name: "Dave's Jeep" },
  { id: "tractor", name: "MJ's Tractor" },
  { id: "dumper", name: "Pat's Dumper" },
  { id: "jetta", name: "Tom's Jetta" },
  { id: "corolla", name: "Togg's Corolla" },
  { id: "fiesta", name: "Pad's Fiesta" },
  { id: "signet", name: "Johnny's Signet" },
];
export function makeVehicle(type = "jeep") {
  const g = new THREE.Group(),
    wheels = [];
  const mat = (c) =>
    new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 });
  const black = mat("#141a1b"),
    glass = mat("#466a74"),
    rubber = mat("#17201e"),
    metal = mat("#7d8983");
  const box = (w, h, d, m, x, y, z) => {
    const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    o.position.set(x, y, z);
    g.add(o);
    return o;
  };
  const wheel = (x, z, r, width) => {
    const o = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r, width, 20),
      rubber,
    );
    o.rotation.z = Math.PI / 2;
    o.position.set(x, r + 0.04, z);
    o.userData.radius = r;
    g.add(o);
    wheels.push(o);
    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 0.45, r * 0.45, width + 0.025, 12),
      metal,
    );
    hub.rotation.z = Math.PI / 2;
    hub.position.copy(o.position);
    g.add(hub);
  };
  if (type === "tractor") {
    const red = mat("#b8332c");
    box(1.2, 0.5, 3, red, 0, 0.9, 0);
    box(1.1, 0.8, 1.6, red, 0, 1.4, 0.75);
    box(1.3, 1.1, 1.2, glass, 0, 1.95, -0.65);
    box(1.5, 0.14, 1.4, red, 0, 2.56, -0.65);
    box(0.15, 1.1, 0.15, black, 0.5, 2.15, 0.9);
    for (const x of [-0.95, 0.95]) {
      wheel(x, -1, 0.72, 0.48);
      wheel(x, 1.15, 0.43, 0.3);
      box(0.6, 0.12, 1.5, red, x, 1.55, -1);
    }
    g.userData.eyeHeight = 2.2;
  } else if (type === "dumper") {
    const yellow = mat("#e8ac22");
    box(1.65, 0.45, 3, yellow, 0, 0.85, 0);
    box(0.8, 0.3, 0.75, black, 0, 1.24, -0.85);
    box(0.75, 0.75, 0.14, black, 0, 1.65, -1.15);
    for (const x of [-0.8, 0.8]) box(0.08, 1.6, 0.08, black, x, 1.8, -1);
    box(1.85, 0.1, 1.4, yellow, 0, 2.6, -0.8);
    // Open tipping skip: base plus sloped front, back and sides.
    box(1.7, 0.14, 1.6, yellow, 0, 1.1, 0.85);
    box(1.85, 0.75, 0.12, yellow, 0, 1.5, 1.68).rotation.x = -0.3;
    box(1.7, 0.65, 0.12, yellow, 0, 1.5, 0.1);
    for (const x of [-0.9, 0.9])
      box(0.12, 0.75, 1.7, yellow, x, 1.5, 0.85).rotation.z =
        x > 0 ? -0.15 : 0.15;
    for (const x of [-0.95, 0.95])
      for (const z of [-1, 1]) wheel(x, z, 0.48, 0.35);
    g.userData.eyeHeight = 2;
  } else if (type === "kursk") {
    const cream = mat("#c9c5b5"), rust = mat("#8b4e2c"), lamp = mat("#e6e4cc");
    box(1.7, 0.62, 4.05, cream, 0, 0.79, 0);
    box(1.65, 0.12, 1.28, cream, 0, 1.12, 1.36);
    // Low estate-van roof and a raked windscreen rather than a square cab.
    const cabin = new THREE.BufferGeometry();
    cabin.setAttribute("position", new THREE.Float32BufferAttribute([
      -0.8,1.08,-1.94, 0.8,1.08,-1.94, -0.8,1.08,0.82, 0.8,1.08,0.82,
      -0.73,2.02,-1.79, 0.73,2.02,-1.79, -0.73,2.02,0.18, 0.73,2.02,0.18,
    ],3));
    cabin.setIndex([0,4,5,0,5,1,0,2,6,0,6,4,1,5,7,1,7,3,4,6,7,4,7,5]);
    cabin.computeVertexNormals();g.add(new THREE.Mesh(cabin,cream));
    box(1.53,0.08,2.05,cream,0,2.05,-0.8);
    function pane(vertices, material) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position",new THREE.Float32BufferAttribute(vertices,3));
      geometry.setIndex([0,1,2,0,2,3]);geometry.computeVertexNormals();
      const mesh=new THREE.Mesh(geometry,material);g.add(mesh);
    }
    const windowTrim = mat("#292f2c"); windowTrim.side = THREE.DoubleSide; glass.side = THREE.DoubleSide;
    pane([-0.77,1.16,0.79,0.77,1.16,0.79,0.71,1.99,0.22,-0.71,1.99,0.22],windowTrim);
    pane([-0.70,1.22,0.755,0.70,1.22,0.755,0.66,1.94,0.26,-0.66,1.94,0.26],glass);
    for (const side of [-1,1]) {
      pane([side*0.805,1.2,-0.45,side*0.805,1.2,0.67,side*0.75,1.98,0.14,side*0.75,1.98,-0.45],windowTrim);
      pane([side*0.808,1.27,-0.39,side*0.808,1.27,0.54,side*0.757,1.92,0.1,side*0.757,1.92,-0.39],glass);
      for(const z of [-0.91,-1.5]) {
        box(0.035,0.76,0.54,metal,side*0.78,1.59,z);
        box(0.045,0.65,0.43,cream,side*0.805,1.59,z);
      }
      box(0.06,0.11,3.8,black,side*0.87,0.68,0);
      box(0.05,0.065,0.21,black,side*0.86,1.08,-0.35);
      box(0.22,0.17,0.29,black,side*0.93,1.36,0.53);
      box(0.018,0.48,0.018,rust,side*0.858,0.9,-0.53);
      for(const z of [-1.3,1.23]) wheel(side*0.86,z,0.37,0.23);
      box(0.48,0.5,0.08,black,side*0.61,1,2.04);
      const light=new THREE.Mesh(new THREE.CylinderGeometry(0.21,0.21,0.07,24),lamp);
      light.rotation.x=Math.PI/2;light.position.set(side*0.61,1,2.1);g.add(light);
      box(0.2,0.1,0.04,mat("#c88735"),side*0.66,0.63,2.19);
      box(0.16,0.48,0.05,mat("#9d3027"),side*0.69,0.98,-2.04);
    }
    box(1.77,0.22,0.17,black,0,0.64,2.09);
    box(1.77,0.22,0.17,black,0,0.64,-2.08);
    box(0.78,0.34,0.08,black,0,1,2.06);
    for(const h of [0.89,0.99,1.09]) box(0.76,0.024,0.03,metal,0,h,2.11);
    box(0.54,0.17,0.03,lamp,0,0.61,2.19);
    // Scattered rust flakes, concentrated at the bonnet edge and sills.
    let seed=1924;
    const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    function flake(x,y,z,size,side=0) {
      const shape=new THREE.Shape();
      for(let i=0;i<6;i++){const angle=i*Math.PI/3,r=size*(0.5+random()*0.5),px=Math.cos(angle)*r,py=Math.sin(angle)*r;if(i)shape.lineTo(px,py);else shape.moveTo(px,py);}
      shape.closePath();const patch=new THREE.Mesh(new THREE.ShapeGeometry(shape),rust);
      if(side)patch.rotation.y=side*Math.PI/2;else patch.rotation.x=-Math.PI/2;
      patch.position.set(x,y,z);g.add(patch);
    }
    for(let i=0;i<42;i++)flake((random()-.5)*1.6,1.185,.74+random()*1.23,.015+random()*.06);
    for(let i=0;i<22;i++)flake((random()-.5)*1.45,2.095,-1.75+random()*1.9,.015+random()*.045);
    for(const side of [-1,1])for(let i=0;i<35;i++)flake(side*.858,.49+random()*.48,(random()-.5)*3.9,.02+random()*.075,side);
    g.userData.eyeHeight=1.62;
  } else if (type === "signet") {
    const silver = new THREE.MeshStandardMaterial({ color: "#bfc6cc", metalness: 0.45, roughness: 0.35 }),
      amber = mat("#ed9b28"),
      tail = mat("#b51922");
    // Tall, narrow five-door hatchback with a short bonnet and upright rear.
    box(1.48, 0.57, 3.3, silver, 0, 0.75, 0);
    box(1.45, 0.12, 0.8, silver, 0, 1.08, 1.23);
    const cabin = new THREE.BufferGeometry();
    cabin.setAttribute("position", new THREE.Float32BufferAttribute([
      -0.72, 1.08, -1.55, 0.72, 1.08, -1.55,
      -0.72, 1.08, 0.86, 0.72, 1.08, 0.86,
      -0.66, 1.99, -1.36, 0.66, 1.99, -1.36,
      -0.66, 1.99, 0.09, 0.66, 1.99, 0.09,
    ], 3));
    cabin.setIndex([
      0, 4, 5, 0, 5, 1, 2, 3, 7, 2, 7, 6,
      0, 2, 6, 0, 6, 4, 1, 5, 7, 1, 7, 3,
      4, 6, 7, 4, 7, 5,
    ]);
    cabin.computeVertexNormals();
    g.add(new THREE.Mesh(cabin, glass));
    box(1.39, 0.09, 1.53, silver, 0, 2.02, -0.64);
    for (const side of [-1, 1]) {
      const frontPillar = box(0.075, 1.2, 0.075, silver, side * 0.69, 1.54, 0.475);
      frontPillar.rotation.x = -0.7;
      const rearPillar = box(0.11, 0.95, 0.09, silver, side * 0.69, 1.54, -1.455);
      rearPillar.rotation.x = 0.205;
      box(0.07, 0.92, 0.09, silver, side * 0.69, 1.54, -0.48);
      box(0.05, 0.12, 3.1, black, side * 0.75, 0.51, 0);
      for (const z of [-0.98, 0.17]) {
        box(0.04, 0.07, 0.17, black, side * 0.75, 1.03, z);
        box(0.015, 0.4, 0.015, black, side * 0.746, 0.81, z - 0.17);
      }
      box(0.22, 0.16, 0.25, black, side * 0.82, 1.29, 0.6);
      for (const z of [-1.08, 1.03]) wheel(side * 0.73, z, 0.32, 0.19);
      box(0.09, 0.12, 0.025, amber, side * 0.64, 0.59, 1.76);
      box(0.15, 0.29, 0.06, tail, side * 0.62, 0.97, -1.67);
      box(0.025, 0.1, 0.1, amber, side * 0.75, 1.06, 1.03);
    }
    box(1.59, 0.32, 0.2, black, 0, 0.62, 1.67);
    box(1.57, 0.23, 0.18, black, 0, 0.6, -1.67);
    box(0.78, 0.16, 0.05, black, 0, 1.02, 1.67);
    box(0.44, 0.18, 0.025, mat("#f3f3ed"), 0, 0.67, 1.78);
    box(0.44, 0.18, 0.025, mat("#f3f3ed"), 0, 0.83, -1.7);
    g.userData.eyeHeight = 1.65;
  } else if (type === "fiesta") {
    const red = mat("#ce1728"),
      white = mat("#fff7e9"),
      amber = mat("#f39818"),
      tail = mat("#a60818");
    box(1.57, 0.5, 3.48, red, 0, 0.72, 0);
    box(1.55, 0.13, 1.08, red, 0, 1.01, 1.17);
    // Sloped windscreen and rear hatch distinguish the short three-door body.
    const cabin = new THREE.BufferGeometry();
    cabin.setAttribute("position", new THREE.Float32BufferAttribute([
      -0.75, 1.02, -1.59, 0.75, 1.02, -1.59,
      -0.75, 1.02, 0.65, 0.75, 1.02, 0.65,
      -0.65, 1.67, -1.06, 0.65, 1.67, -1.06,
      -0.65, 1.67, 0.15, 0.65, 1.67, 0.15,
    ], 3));
    cabin.setIndex([
      0, 4, 5, 0, 5, 1, 2, 3, 7, 2, 7, 6,
      0, 2, 6, 0, 6, 4, 1, 5, 7, 1, 7, 3,
      4, 6, 7, 4, 7, 5,
    ]);
    cabin.computeVertexNormals();
    g.add(new THREE.Mesh(cabin, glass));
    box(1.36, 0.08, 1.28, red, 0, 1.7, -0.45);
    for (const side of [-1, 1]) {
      const frontPillar = box(0.07, 0.83, 0.07, red, side * 0.7, 1.35, 0.4);
      frontPillar.rotation.x = -0.65;
      const rearPillar = box(0.14, 0.85, 0.09, red, side * 0.7, 1.35, -1.325);
      rearPillar.rotation.x = 0.68;
      box(0.065, 0.65, 0.085, black, side * 0.7, 1.35, -0.46);
      box(0.055, 0.19, 3.3, black, side * 0.79, 0.58, 0);
      box(0.045, 0.055, 0.22, black, side * 0.8, 0.95, -0.3);
      box(0.21, 0.15, 0.26, black, side * 0.86, 1.17, 0.42);
      for (const z of [-1.12, 1.08]) wheel(side * 0.78, z, 0.34, 0.2);
      box(0.14, 0.23, 0.06, amber, side * 0.69, 0.95, 1.76);
      box(0.23, 0.28, 0.06, tail, side * 0.63, 0.92, -1.76);
    }
    box(1.65, 0.22, 0.16, black, 0, 0.65, 1.77);
    box(1.65, 0.22, 0.16, black, 0, 0.65, -1.77);
    box(0.8, 0.12, 0.05, black, 0, 0.94, 1.76);
    box(0.43, 0.15, 0.025, white, 0, 0.64, 1.86);
    // Twin Viper-style stripes stay on painted panels, leaving the glass clear.
    for (const x of [-0.22, 0.22]) {
      box(0.22, 0.012, 1.08, white, x, 1.081, 1.17);
      box(0.22, 0.012, 1.28, white, x, 1.746, -0.45);
      box(0.22, 0.22, 0.012, white, x, 0.96, 1.746);
      box(0.22, 0.25, 0.012, white, x, 0.92, -1.746);
    }
    g.userData.eyeHeight = 1.36;
  } else if (type === "corolla") {
    const red = mat("#d9d8c9"),
      silver = mat("#c1c6ca"),
      amber = mat("#f39818"),
      tail = mat("#a80816");
    // Weathered four-door Corolla with its front bumper cover missing.
    box(1.7, 0.55, 4.05, red, 0, 0.73, 0);
    box(1.66, 0.14, 1.35, red, 0, 1.03, 1.28);
    box(1.66, 0.12, 0.77, red, 0, 1.04, -1.63);
    const cabin = new THREE.BufferGeometry();
    cabin.setAttribute("position", new THREE.Float32BufferAttribute([
      -0.79, 1.05, -1.25, 0.79, 1.05, -1.25,
      -0.79, 1.05, 0.75, 0.79, 1.05, 0.75,
      -0.69, 1.72, -0.91, 0.69, 1.72, -0.91,
      -0.69, 1.72, 0.29, 0.69, 1.72, 0.29,
    ], 3));
    cabin.setIndex([
      0, 4, 5, 0, 5, 1, 2, 3, 7, 2, 7, 6,
      0, 2, 6, 0, 6, 4, 1, 5, 7, 1, 7, 3,
      4, 6, 7, 4, 7, 5,
    ]);
    cabin.computeVertexNormals();
    g.add(new THREE.Mesh(cabin, glass));
    box(1.43, 0.09, 1.27, red, 0, 1.75, -0.31);
    for (const side of [-1, 1]) {
      box(0.055, 0.68, 0.085, black, side * 0.75, 1.39, -0.35);
      const frontPillar = box(0.075, 0.83, 0.07, red, side * 0.74, 1.39, 0.52);
      frontPillar.rotation.x = -0.6;
      const rearPillar = box(0.095, 0.76, 0.08, red, side * 0.74, 1.39, -1.08);
      rearPillar.rotation.x = 0.47;
      box(0.045, 0.085, 3.83, black, side * 0.86, 0.68, 0);
      box(0.05, 0.06, 0.22, black, side * 0.87, 0.95, -0.56);
      box(0.05, 0.06, 0.22, black, side * 0.87, 0.95, 0.28);
      box(0.22, 0.14, 0.26, black, side * 0.92, 1.19, 0.49);
      for (const z of [-1.28, 1.26]) wheel(side * 0.84, z, 0.35, 0.22);
      box(0.3, 0.2, 0.04, tail, side * 0.61, 0.94, -2.04);
      box(0.18, 0.09, 0.04, amber, side * 0.68, 0.57, 2.09);
    }
    const rust = mat("#854221"), rustLight = mat("#b36d39");
    box(1.72, 0.16, 0.18, rustLight, 0, 0.62, 2.06);
    box(1.5, 0.09, 0.14, rust, 0, 0.37, 2.04);
    for (const x of [-0.73, -0.4, 0.4, 0.73]) {
      box(0.09, 0.45, 0.14, rust, x, 0.5, 2.04);
      box(0.05, 0.05, 0.025, black, x, 0.62, 2.16);
    }
    box(1.79, 0.19, 0.16, black, 0, 0.66, -2.04);
    box(0.88, 0.26, 0.045, black, 0, 0.95, 2.05);
    for (const y of [0.88, 0.96, 1.04])
      box(0.87, 0.025, 0.02, silver, 0, y, 2.08);
    const badge = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.025, 16), silver);
    badge.rotation.x = Math.PI / 2;
    badge.position.set(0, 0.96, 2.1);
    g.add(badge);
    // Deterministic, irregular rust flakes on the bonnet, roof and lower doors.
    let rustSeed = 8127;
    const random = () => { rustSeed = (rustSeed * 1664525 + 1013904223) >>> 0; return rustSeed / 4294967296; };
    function rustPatch(x, y, z, size, side = 0) {
      const shape = new THREE.Shape();
      for (let i = 0; i < 7; i++) {
        const angle = i / 7 * Math.PI * 2, r = size * (0.45 + random() * 0.55);
        const px = Math.cos(angle) * r, py = Math.sin(angle) * r;
        if (i) shape.lineTo(px, py); else shape.moveTo(px, py);
      }
      shape.closePath();
      const patch = new THREE.Mesh(new THREE.ShapeGeometry(shape), random() > 0.4 ? rust : rustLight);
      if (side) patch.rotation.y = side * Math.PI / 2; else patch.rotation.x = -Math.PI / 2;
      patch.position.set(x, y, z); g.add(patch);
    }
    for (let i = 0; i < 44; i++) rustPatch((random() - 0.5) * 1.55, 1.104, 0.65 + random() * 1.25, 0.025 + random() * 0.1);
    for (let i = 0; i < 18; i++) rustPatch((random() - 0.5) * 1.32, 1.799, -0.85 + random() * 1.05, 0.025 + random() * 0.08);
    for (const side of [-1, 1]) {
      for (let i = 0; i < 34; i++) rustPatch(side * 0.855, 0.49 + random() * 0.42, (random() - 0.5) * 3.85, 0.04 + random() * 0.15, side);
      for (const wheelZ of [-1.28, 1.26]) for (let i = 0; i < 7; i++) {
        const angle = i / 6 * Math.PI;
        rustPatch(side * 0.856, 0.44 + Math.sin(angle) * 0.38, wheelZ + Math.cos(angle) * 0.39, 0.09, side);
      }
    }
    g.userData.eyeHeight = 1.42;
  } else if (type === "jetta") {
    const red = mat("#d91420"),
      silver = mat("#c1c6ca"),
      amber = mat("#f39818"),
      tail = mat("#a80816");
    // Boxy four-door saloon, with a separate bonnet and boot.
    box(1.7, 0.55, 4.05, red, 0, 0.73, 0);
    box(1.66, 0.14, 1.35, red, 0, 1.03, 1.28);
    box(1.66, 0.12, 0.77, red, 0, 1.04, -1.63);
    const cabin = new THREE.BufferGeometry();
    cabin.setAttribute("position", new THREE.Float32BufferAttribute([
      -0.79, 1.05, -1.25, 0.79, 1.05, -1.25,
      -0.79, 1.05, 0.75, 0.79, 1.05, 0.75,
      -0.69, 1.72, -0.91, 0.69, 1.72, -0.91,
      -0.69, 1.72, 0.29, 0.69, 1.72, 0.29,
    ], 3));
    cabin.setIndex([
      0, 4, 5, 0, 5, 1, 2, 3, 7, 2, 7, 6,
      0, 2, 6, 0, 6, 4, 1, 5, 7, 1, 7, 3,
      4, 6, 7, 4, 7, 5,
    ]);
    cabin.computeVertexNormals();
    g.add(new THREE.Mesh(cabin, glass));
    box(1.43, 0.09, 1.27, red, 0, 1.75, -0.31);
    for (const side of [-1, 1]) {
      box(0.055, 0.68, 0.085, black, side * 0.75, 1.39, -0.35);
      const frontPillar = box(0.075, 0.83, 0.07, red, side * 0.74, 1.39, 0.52);
      frontPillar.rotation.x = -0.6;
      const rearPillar = box(0.095, 0.76, 0.08, red, side * 0.74, 1.39, -1.08);
      rearPillar.rotation.x = 0.47;
      box(0.045, 0.085, 3.83, black, side * 0.86, 0.68, 0);
      box(0.05, 0.06, 0.22, black, side * 0.87, 0.95, -0.56);
      box(0.05, 0.06, 0.22, black, side * 0.87, 0.95, 0.28);
      box(0.22, 0.14, 0.26, black, side * 0.92, 1.19, 0.49);
      for (const z of [-1.28, 1.26]) wheel(side * 0.84, z, 0.35, 0.22);
      box(0.3, 0.2, 0.04, tail, side * 0.61, 0.94, -2.04);
      box(0.18, 0.09, 0.04, amber, side * 0.68, 0.57, 2.09);
    }
    box(1.79, 0.19, 0.16, black, 0, 0.66, 2.04);
    box(1.79, 0.19, 0.16, black, 0, 0.66, -2.04);
    box(0.88, 0.26, 0.045, black, 0, 0.95, 2.05);
    for (const y of [0.88, 0.96, 1.04])
      box(0.87, 0.025, 0.02, silver, 0, y, 2.08);
    const badge = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.025, 16), silver);
    badge.rotation.x = Math.PI / 2;
    badge.position.set(0, 0.96, 2.1);
    g.add(badge);
    g.userData.eyeHeight = 1.42;
  } else {
    box(1.8, 0.6, 3.45, black, 0, 0.9, 0);
    box(1.6, 0.85, 1.9, glass, 0, 1.57, -0.3);
    box(1.72, 0.13, 2, black, 0, 2.05, -0.3);
    box(1.7, 0.1, 1.05, black, 0, 1.25, 1.13);
    for (const x of [-0.77, 0.77]) box(0.1, 0.85, 1.95, black, x, 1.57, -0.3);
    for (const x of [-0.94, 0.94])
      for (const z of [-1.1, 1.1]) wheel(x, z, 0.4, 0.25);
    g.userData.eyeHeight = 1.7;
  }
  const lamp = new THREE.MeshStandardMaterial({
    color: "#fff3c2",
    emissive: "#ead49c",
    emissiveIntensity: 0.4,
  });
  for (const x of type === "kursk" ? [] : [-0.6, 0.6])
    box(["jetta", "corolla"].includes(type) ? 0.37 : 0.23, 0.2, 0.08, lamp, x, ["jetta", "corolla"].includes(type) ? 0.96 : 1, ["jetta", "corolla"].includes(type) ? 2.05 : 1.77);
  g.userData.wheels = wheels;
  g.userData.vehicleType = type;
  return g;
}
export function disposeVehicle(g) {
  g.traverse((o) => {
    o.geometry?.dispose();
    if (o.material) {
      for (const m of Array.isArray(o.material) ? o.material : [o.material])
        m.dispose();
    }
  });
}
export function vehiclePreviews() {
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true,
  });
  renderer.setSize(600, 350);
  renderer.setPixelRatio(1);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight("#ffffff", "#74876e", 2.5));
  const sun = new THREE.DirectionalLight("#fff5e4", 3);
  sun.position.set(4, 7, 5);
  scene.add(sun);
  const camera = new THREE.PerspectiveCamera(35, 240 / 140, 0.1, 50);
  camera.position.set(5.5, 3.5, 6);
  camera.lookAt(0, 1.2, 0);
  const images = {};
  for (const v of VEHICLES) {
    const model = makeVehicle(v.id);
    scene.add(model);
    renderer.render(scene, camera);
    images[v.id] = renderer.domElement.toDataURL("image/png");
    scene.remove(model);
    disposeVehicle(model);
  }
  renderer.dispose();
  renderer.forceContextLoss();
  return images;
}
