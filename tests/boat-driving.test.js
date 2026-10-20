import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {boatStep,boatCanMove} from '../src/boat-driving.js';
import {ferryPlacements} from '../src/boats.js';
import {harbourSurfaces} from '../src/harbour.js';
import {project} from '../src/geo.js';
test('harbour ferry can leave its real mooring in forward or reverse',()=>{
 const load=file=>JSON.parse(fs.readFileSync(new URL(`../public/data/${file}`,import.meta.url)));
 const data=load('harbour.json'),coast=load('island.json').coastline.map(project),decks=harbourSurfaces(data,()=>2);
 const feature=data.features.find(f=>f.tags.mooring==='ferry');
 const [p]=ferryPlacements(decks.find(d=>d.id===feature.id));
 assert.ok(boatCanMove(p.x,p.z,p.heading,coast,decks,p));
 assert.ok([-1,1].some(direction=>boatCanMove(p.x+Math.sin(p.heading)*direction,p.z+Math.cos(p.heading)*direction,p.heading,coast,decks,p)));
 assert.equal(boatCanMove(p.x+900,p.z,p.heading,coast,decks,p),false);
});
test('boat movement eases acceleration and steering, reverses and stops at land or piers',()=>{
 const next=boatStep(0,0,{accel:true,brake:false,turn:1},1/60);
 assert.ok(next.speed>0&&next.speed<5);assert.ok(next.steering>0&&next.steering<1);
 assert.ok(boatStep(0,0,{brake:true,turn:0},1).speed<0);
 const square=[[-100,-100],[100,-100],[100,100],[-100,100]];
 assert.equal(boatCanMove(0,0,0,square,[],{x:0,z:0}),false);
 assert.equal(boatCanMove(0,0,0,[],[{points:square}],{x:0,z:0}),false);
});

test('fast ferry is on the empty side of Old Pier, afloat and much faster',async()=>{
 const {fastFerryPlacement,cargoPlacement,makeFastFerry}=await import('../src/boats.js');
 const data=JSON.parse(fs.readFileSync(new URL('../public/data/harbour.json',import.meta.url)));
 const coast=JSON.parse(fs.readFileSync(new URL('../public/data/island.json',import.meta.url))).coastline.map(project);
 const decks=harbourSurfaces(data,()=>2),pier=decks.find(d=>d.name==='Old Pier');
 const fast=fastFerryPlacement(pier),cargo=cargoPlacement(pier),boat=makeFastFerry();
 assert.ok(Math.hypot(fast.x-cargo.x,fast.z-cargo.z)>15);
 assert.ok(boatCanMove(fast.x,fast.z,fast.heading,coast,decks,fast,[],boat.userData.hull));
 assert.ok(boatStep(0,0,{accel:true,turn:0},20,boat.userData.handling).speed>20);
});
