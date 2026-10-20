import { inside } from './geo.js';
export function boatCanMove(x,z,heading,coast,decks,origin,otherBoats=[], hull={length:27,beam:7}) {
  if(Math.hypot(x-origin.x,z-origin.z)>850)return false;
  // A grid covering the full hull keeps the bow and sides off land and piers.
  for(const lateral of [-hull.beam/2,0,hull.beam/2])for(const forward of [-0.5,-1/3,-1/6,0,1/6,1/3,0.5].map(t=>t*hull.length)) {
    const px=x+Math.cos(heading)*lateral+Math.sin(heading)*forward;
    const pz=z-Math.sin(heading)*lateral+Math.cos(heading)*forward;
    if(inside(px,pz,coast)||decks.some(deck=>inside(px,pz,deck.points)))return false;
    if(otherBoats.some(b=>Math.hypot(px-b.x,pz-b.z)<b.radius))return false;
  }
  return true;
}
export function boatStep(speed,steering,input,dt,profile={}) {
  const target=input.accel?(profile.top??5):input.brake?-(profile.reverse??2):0;
  speed+=(target-speed)*(1-Math.exp(-dt*(profile.response??0.7)));
  steering+=(input.turn-steering)*(1-Math.exp(-dt*3));
  return {speed,steering,yaw:steering*speed*(profile.turn??0.025)};
}

export function boardingBoat(boats,state,speed,allowed) {
  if(!allowed||Math.abs(speed)>1)return null;
  return boats.filter(boat=>Math.hypot(state.x-boat.position.x,state.z-boat.position.z)<(boat.userData.hull?.length||27)/2+12)
    .sort((a,b)=>Math.hypot(state.x-a.position.x,state.z-a.position.z)-Math.hypot(state.x-b.position.x,state.z-b.position.z))[0]||null;
}
