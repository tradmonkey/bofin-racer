import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildingProfile } from '../src/buildings.js';
test('ruins never become roofed houses',()=>{
 assert.equal(buildingProfile({building:'ruins'}).kind,'ruin');
 assert.equal(buildingProfile({building:'house',ruins:'yes'}).kind,'ruin');
 assert.ok(buildingProfile({building:'ruins'}).height<1);
});
test('outbuildings and greenhouses have distinct conservative models',()=>{
 assert.equal(buildingProfile({building:'shed'}).kind,'outbuilding');
 assert.ok(buildingProfile({building:'shed'}).height<buildingProfile({building:'house'}).height);
 assert.equal(buildingProfile({building:'greenhouse'}).kind,'greenhouse');
});
test('mapped measurements take precedence over fallback heights',()=>{
 assert.equal(buildingProfile({building:'shed',height:'4.2'}).height,4.2);
 assert.equal(buildingProfile({building:'house','building:levels':'2'}).height,5.6);
 assert.equal(buildingProfile({building:'house',height:'10 ft'}).height,3.048);
});
test('ruins stay low and unspecified footprints are hidden without deleting data',()=>{
 const {buildings}=JSON.parse(fs.readFileSync(new URL('../public/data/island.json',import.meta.url)));
 assert.equal(buildings.filter(b=>buildingProfile(b.tags).kind==='ruin').length,53);
 assert.equal(buildings.filter(b=>b.tags.building==='yes').length,190);
 const hidden=buildings.filter(b=>buildingProfile(b.tags).reason==='unclassified');
 assert.ok(hidden.length>180);
 assert.equal(buildingProfile({building:'yes',amenity:'post_office'}).kind,'building');
 assert.equal(buildingProfile({building:'yes'}).kind,'omit');
 assert.equal(buildingProfile({building:'yes'},{includeUnclassified:true}).kind,'building');
});
