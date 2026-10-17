import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROUTES, buildRoute } from '../../src/racing.js';
import { START_LOCATIONS, RACE_LOCATIONS, resolveStart } from '../../src/starts.js';
import { project } from '../../src/geo.js';
import { smoothRoad, junctionKeys } from '../../src/roads.js';
let courses;
export function loadCourses() {
  if (courses) return courses;
  const load = file => JSON.parse(readFileSync(resolve(process.cwd(), 'public/data', file), 'utf8'));
  const network = load('roads.geojson'), coast = load('island.json').coastline.map(project);
  const junctions = junctionKeys(network.features.map(f => f.geometry.coordinates.map(project))), roads = [];
  for (const feature of network.features) {
    if (['footway','path','steps','cycleway','bridleway','construction','proposed'].includes(feature.properties.highway)) continue;
    const line = smoothRoad(feature.geometry.coordinates.map(project), junctions);
    for (let i=1; i<line.length; i++) roads.push({ points:[line[i-1],line[i]], width:3.5, id:String(feature.id), kind:feature.properties.highway });
  }
  const starts = Object.fromEntries([...START_LOCATIONS,...RACE_LOCATIONS].map(l => [l.id,resolveStart(l,roads,coast)]));
  courses = new Map(ROUTES.map(route => [route.id,buildRoute(roads,starts[route.from],starts[route.to])]));
  return courses;
}
