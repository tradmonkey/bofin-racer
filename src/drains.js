import { project } from './geo.js';
import {smoothRoad,junctionKeys} from './roads.js';
export function challengeDrain(network){
 const feature=network.features.find(f=>String(f.id)==='215535456');
 if(!feature)throw new Error('Clossey Challenge road unavailable');
 const points=smoothRoad(feature.geometry.coordinates.map(project),junctionKeys(network.features.map(f=>f.geometry.coordinates.map(project))));
 const segments=[];let total=0;
 for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1],length=Math.hypot(b[0]-a[0],b[1]-a[1]);if(!length)continue;segments.push({a,b,length,start:total});total+=length;}
 const middle=segments.find(s=>s.start+s.length>=total/2),t=(total/2-middle.start)/middle.length,forward=[(middle.b[0]-middle.a[0])/middle.length,(middle.b[1]-middle.a[1])/middle.length];
 const start=total/2-20,active=segments.filter(s=>s.start+s.length>=start),xs=active.flatMap(s=>[s.a[0],s.b[0]]),zs=active.flatMap(s=>[s.a[1],s.b[1]]);
 return {center:[middle.a[0]+(middle.b[0]-middle.a[0])*t,middle.a[1]+(middle.b[1]-middle.a[1])*t],forward,normal:[forward[1],-forward[0]],segments:active,start,end:total,north:points.at(-1),bounds:[Math.min(...xs)-8,Math.min(...zs)-8,Math.max(...xs)+8,Math.max(...zs)+8],inner:2.55,width:2.6,depth:3};
}
export function drainDepth(x,z,d){
 if(x<d.bounds[0]||z<d.bounds[1]||x>d.bounds[2]||z>d.bounds[3])return 0;
 // Leave the connecting T-junction pavement intact; drains meet its verge.
 if(Math.hypot(x-d.north[0],z-d.north[1])<4)return 0;
 let best=Infinity,along=0;
 for(const s of d.segments){const dx=s.b[0]-s.a[0],dz=s.b[1]-s.a[1],t=Math.max(0,Math.min(1,((x-s.a[0])*dx+(z-s.a[1])*dz)/(s.length*s.length))),distance=Math.hypot(x-s.a[0]-t*dx,z-s.a[1]-t*dz);if(distance<best){best=distance;along=s.start+t*s.length;}}
 const t=(best-d.inner)/d.width;
 if(along<=d.start||along>=d.end||t<=0||t>=1)return 0;
 return d.depth*Math.sin(Math.PI*t)*Math.min(1,(along-d.start)/1.5,(d.end-along)/1.5);
}
