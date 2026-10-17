import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSubmission, normalizeName } from '../src/leaderboard-rules.js';
import { createHandler } from '../netlify/lib/leaderboard-handler.mjs';
import { loadCourses } from '../netlify/lib/course-data.mjs';
const course={path:[{x:0,z:0},{x:100,z:0}],checkpoints:[{x:25,z:0},{x:50,z:0},{x:75,z:0},{x:100,z:0}]};
const valid=()=>({course:'doonmore-days',vehicle:'jetta',playerId:'f8afe318-4511-4cf8-8d23-a963f91cb374',name:'Eamonn',time:5,samples:Array.from({length:51},(_,i)=>({t:i/10,x:i*2,z:0,heading:Math.PI/2}))});
const request=(data,headers={})=>new Request('https://game.example/api/leaderboard',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://game.example',...headers},body:JSON.stringify(data)});
test('server accepts continuous completed runs, but rejects teleporting, missed gates and malformed data',()=>{
 assert.equal(validateSubmission(valid(),course).name,'Eamonn');
 for(const change of [d=>d.time=NaN,d=>d.vehicle='fake',d=>d.playerId='x',d=>d.name=' ',d=>d.samples[5].x=500,d=>d.samples[5].t=-1,d=>d.samples[15].x=Infinity,d=>d.samples=d.samples.slice(0,10),d=>d.samples[20].z=50]){
  const d=valid();change(d);assert.throws(()=>validateSubmission(d,course));
 }
 assert.equal(normalizeName('  <Tom>  \n Smith '),'Tom Smith');
});
test('API validates before writing, parameterizes names and reports best-only updates',async()=>{
 const calls=[];let updated=true;
 const sql=async(strings,...values)=>{calls.push({text:strings.join('?'),values});return updated?[{time_s:5}]:[];};
 const handler=createHandler({getSql:()=>sql,getCourses:()=>new Map([['doonmore-days',course]])});
 let response=await handler(request(valid()));assert.equal(response.status,201);assert.equal((await response.json()).saved,true);
 assert.match(calls[0].text,/ON CONFLICT/);assert.match(calls[0].text,/WHERE EXCLUDED.time_s < race_results.time_s/);
 assert.ok(calls[0].values.includes('Eamonn'));
 updated=false;response=await handler(request(valid()));assert.equal((await response.json()).saved,false);
 const count=calls.length;
 response=await handler(request({...valid(),vehicle:'fake'}));assert.equal(response.status,400);assert.equal(calls.length,count);
 response=await handler(request(valid(),{Origin:'https://other.example'}));assert.equal(response.status,403);
 response=await handler(new Request('https://game.example/api/leaderboard',{method:'DELETE'}));assert.equal(response.status,405);
});
test('leaderboard reads support all vehicles and selected vehicle; failures stay recoverable',async()=>{
 const calls=[];
 const handler=createHandler({getSql:()=>async(strings,...values)=>{calls.push(strings.join('?'));return [{player_name:'Tom',vehicle:'jetta',time_s:54}];},getCourses:()=>new Map()});
 for(const suffix of ['','&vehicle=jetta']){
  const response=await handler(new Request('https://game.example/api/leaderboard?course=doonmore-days'+suffix));
  assert.equal(response.status,200);assert.equal((await response.json()).rows[0].player_name,'Tom');
 }
 assert.match(calls[0],/DISTINCT ON/);assert.match(calls[1],/vehicle =/);
 const unavailable=createHandler({getSql:()=>{throw new Error('no database');},getCourses:()=>new Map()});
 const response=await unavailable(new Request('https://game.example/api/leaderboard?course=doonmore-days'));
 assert.equal(response.status,503);assert.match((await response.json()).error,/local best/);
});
test('every production course can be reconstructed for server-side checkpoint validation',()=>{
 const courses=loadCourses();assert.equal(courses.size,6);
 for(const c of courses.values())assert.ok(c.checkpoints.length>1);
});

test('recordings following every real route pass the server validator',()=>{
 for(const [id,course] of loadCourses()) {
  const samples=[{t:0,...course.path[0],heading:0}];let elapsed=0;
  for(let i=1;i<course.path.length;i++){
   const a=course.path[i-1],b=course.path[i],distance=Math.hypot(b.x-a.x,b.z-a.z);
   if(distance<.0001)continue;
   const count=Math.ceil(distance);
   for(let j=1;j<=count;j++){
    elapsed+=distance/count/10;
    samples.push({t:elapsed,x:a.x+(b.x-a.x)*j/count,z:a.z+(b.z-a.z)*j/count,heading:Math.atan2(b.x-a.x,b.z-a.z)});
   }
  }
  const data={...valid(),course:id,time:elapsed,samples};
  assert.equal(validateSubmission(data,course).course,id);
 }
});

test('submission returns the overall best ranking, including the top-20 boundary',async()=>{
 for(const position of [1,20,21]) {
  const queries=[];
  const handler=createHandler({getCourses:()=>new Map([['doonmore-days',course]]),getSql:()=>async(strings,...values)=>{
   const query=strings.join('?');queries.push({query,values});
   return query.includes('WITH best')?[{position:String(position)}]:[{time_s:5}];
  }});
  const response=await handler(request(valid()));const result=await response.json();
  assert.equal(result.rank,position);assert.equal(result.limit,20);
  assert.match(queries[1].query,/MIN\(time_s\)/);
  assert.match(queries[1].query,/ROW_NUMBER/);
  assert.ok(queries[1].values.includes(valid().playerId));
 }
});
