import { project, inside, nearestRoad } from "./geo.js";
export const START_LOCATIONS = [
  {
    id: "middlequarter",
    name: "Middlequarter Lane",
    coordinates: [-10.2134443, 53.6170204],
    roadId: "215535464",
    headingTowards: [-10.2134335, 53.6167149],
    description: "A quiet inland lane. Take a drive and see what you find.",
  },
  {
    id: "harbour",
    name: "Church start",
    coordinates: [-10.20888, 53.6134077],
    roadId: "484888685",
    reverseDirection: true,
    description: "Start beside the church and follow Low Road back towards the ferry harbour.",
  },
  {
    id: "old-pier",
    name: "Old Pier",
    coordinates: [-10.20685, 53.61337],
    description: "Start on the coastal road beside the old pier.",
  },
  {
    id: "west",
    name: "North Beach",
    coordinates: [-10.230997199168687, 53.618290639092116],
    roadId: "484888680",
    headingTowards: [-10.2314955, 53.6188371],
    description: "Explore the lanes through the western part of the island.",
  },
  {
    id: "north",
    name: "Tommy the Bogs",
    coordinates: [-10.2092, 53.62115],
    description: "Start inland among the northern hills and lanes.",
  },
  {
    id: "east",
    name: "Clossey",
    reverseDirection: true,
    coordinates: [-10.1983359, 53.6153528],
    roadId: "215535456",
    headingTowards: [-10.19862, 53.61636],
    description: "Start at the coastal T-junction and head inland past the Dolphin Hotel.",
  },
  {
    id: "cloonamore",
    name: "Cloonamore",
    coordinates: [-10.1936603, 53.6214114],
    roadId: "215535470",
    headingTowards: [-10.1912798, 53.6211136],
    description: "Start at the crest and head downhill towards East End.",
  },
];
// Race endpoints use the nearest through-road beside each venue.
// The Galley: inishbofin.com/directory-food_drink/listing/the-galley/
// Doonmore: doonmore.com/contact; Day's: Connemara Ireland map directions.
export const RACE_LOCATIONS = [
  { id: "duamhach", name: "Duamhach beach access", coordinates: [-10.1813945, 53.6162549], roadId: "505950411", roadKinds: ["track"] },
  { id: "hostel", name: "Hostel", coordinates: [-10.1981985, 53.6157761], roadId: "215535456" },
  { id: "old-pier-race", name: "Old Pier race start", coordinates: [-10.2065161, 53.6129008], roadId: "505885238", roadKinds: ["service"], pierAccess: true },
  { id: "new-pier", name: "New Pier", coordinates: [-10.2123804, 53.6135346], roadId: "215535457", roadKinds: ["service"] },
  { id: "clossey-finish", name: "Clossey inland junction", coordinates: [-10.2003032, 53.6182744], roadId: "215535456" },
  { id: "galley", name: "The Galley", coordinates: [-10.184342, 53.618872] },
  { id: "doonmore", name: "Doonmore Hotel", coordinates: [-10.227987, 53.614112] },
  { id: "days", name: "Day's Bar", coordinates: [-10.207187, 53.613457] },
];
export function resolveStart(location, roads, coast, obstacles = []) {
  const [x, z] = project(location.coordinates);
  const safe = (p) =>
    (inside(p.x, p.z, coast) || (location.pierAccess && location.roadId === "505885238")) &&
    !obstacles.some((o) => inside(p.x, p.z, o.points));
  const candidates = roads
    .filter((r) => (location.roadKinds || ["unclassified", "residential"]).includes(r.kind) && (!location.roadId || r.id === location.roadId))
    .map((r) => {
      let p = nearestRoad(x, z, [r]);
      if (!safe(p)) {
        const [a, b] = r.points;
        p = { ...p, x: (a[0] + b[0]) / 2, z: (a[1] + b[1]) / 2 };
        p.distance = Math.hypot(p.x - x, p.z - z);
      }
      return p;
    })
    .filter(safe)
    .sort((a, b) => a.distance - b.distance);
  if (!candidates.length)
    throw new Error(`No safe road start for ${location.name}`);
  const p = candidates[0];
  if (Math.sin(p.heading) < 0) p.heading += Math.PI;
  if (location.reverseDirection) p.heading += Math.PI;
  if(location.headingTowards){
    const target=project(location.headingTowards),dx=target[0]-p.x,dz=target[1]-p.z;
    if(Math.sin(p.heading)*dx+Math.cos(p.heading)*dz<0)p.heading+=Math.PI;
  }
  return p;
}
