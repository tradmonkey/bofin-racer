import { VEHICLES } from './vehicles.js';
import { ROUTES, formatTime } from './racing.js';
import { normalizeName } from './leaderboard-rules.js';
export function createLeaderboard({ toast }) {
  const $=id=>document.getElementById(id);
  const name=$('driver-name'), share=$('share-times'), board=$('leaderboard-content'), message=$('leaderboard-message');
  const dialog=$('leaderboard-dialog'), resultDialog=$('race-result');
  for(const route of ROUTES) $('leaderboard-course').add(new Option(route.name,route.id));
  let resultCourse=null, submission=0;
  function openBoard(course=$('race-route').value) {
    $('leaderboard-course').value=course;
    if(resultDialog.open)resultDialog.close();
    if(!dialog.open)dialog.showModal();
    refresh();
  }
  $('leaderboard-open').onclick=()=>openBoard();
  $('leaderboard-close').onclick=()=>dialog.close();
  $('result-close').onclick=()=>resultDialog.close();
  $('result-board').onclick=()=>openBoard(resultCourse);
  let playerId, sequence=0;
  try { name.value=localStorage.getItem('bofin-driver-name')||''; playerId=localStorage.getItem('bofin-driver-id'); } catch {}
  if (!/^[0-9a-f-]{36}$/i.test(playerId||'')) playerId=crypto.randomUUID();
  try { localStorage.setItem('bofin-driver-id',playerId); } catch {}
  name.addEventListener('input',()=>name.setCustomValidity(''));
  name.addEventListener('change',()=>{name.value=normalizeName(name.value);try{localStorage.setItem('bofin-driver-name',name.value);}catch{}});
  share.addEventListener('change',()=>{name.required=share.checked;});
  async function api(url,options={}) {
    const response=await fetch(url,{...options,signal:AbortSignal.timeout(12000)});
    const type=response.headers.get('content-type')||'';
    if(!type.includes('application/json'))throw new Error('Shared scores need Netlify hosting or Netlify Dev. Local driving still works.');
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||'Leaderboard unavailable. Try again later.');
    return data;
  }
  async function refresh() {
    const request=++sequence;
    const course=$('leaderboard-course').value;
    $('leaderboard-route-name').textContent=ROUTES.find(r=>r.id===course)?.name||'';
    $('leaderboard-rows').replaceChildren();message.textContent='Loading scores…';
    try {
      const data=await api(`/api/leaderboard?${new URLSearchParams({course})}`);
      if(request!==sequence)return;
      if(!Array.isArray(data.rows))throw new Error('Leaderboard unavailable.');
      const rows=data.rows.filter(r=>typeof r.player_name==='string'&&Number.isFinite(Number(r.time_s))&&Number(r.time_s)>0);
      for(const [i,row] of rows.entries()) {
        const tr=document.createElement('tr');
        for(const text of [String(i+1),row.player_name,VEHICLES.find(v=>v.id===row.vehicle)?.name||row.vehicle,formatTime(Number(row.time_s))]) {
          const td=document.createElement('td');td.textContent=text;tr.append(td);
        }
        $('leaderboard-rows').append(tr);
      }
      message.textContent=rows.length?'':'No scores yet. Set the first time!';
    } catch(error) {if(request===sequence)message.textContent=error.name==='TimeoutError'?'Leaderboard took too long. Try again.':error.message;}
  }
  $('leaderboard-toggle').onclick=()=>openBoard();
  $('leaderboard-course').onchange=refresh;
  $('race-route').addEventListener('change',()=>{if(dialog.open)refresh();});
  return {
    beforeRace() {
      if(!share.checked)return true;
      name.value=normalizeName(name.value);
      if(!name.value){name.setCustomValidity('Choose a driver name, or turn off sharing to race privately.');name.reportValidity();name.focus();return false;}
      try{localStorage.setItem('bofin-driver-name',name.value);}catch{}
      return true;
    },
    identity() {return share.checked?{playerId,name:normalizeName(name.value)}:null;},
    async submit(run) {
      const current=++submission;
      resultCourse=run.course;
      $('result-course').textContent=ROUTES.find(r=>r.id===run.course)?.name||'';
      $('result-time').textContent=formatTime(run.time);
      $('result-title').textContent='Finished!';
      $('result-rank').textContent=run.identity?'Checking your best overall ranking…':'Private run — turn on sharing next time to chase a leaderboard place.';
      $('result-board').hidden=!run.identity;
      if(!resultDialog.open)resultDialog.showModal();
      if(!run.identity)return;
      $('leaderboard-submit-status').textContent='Sharing completed run…';
      try {
        const result=await api('/api/leaderboard',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ ...run.identity,course:run.course,vehicle:run.vehicle,time:run.time,samples:run.samples })});
        if(current!==submission)return;
        const onBoard=Number.isInteger(result.rank)&&result.rank>0&&result.rank<=20;
        $('result-title').textContent=onBoard?'You made the board!':result.rank?'Hard luck!':'Time shared!';
        $('result-rank').textContent=onBoard
          ? `Your best sits at #${result.rank} in the overall top 20.${result.saved?'':' Your faster time is still the one to beat.'}`
          : result.rank ? 'You didn’t make the top 20 this time. Another lap — there’s more in the tank!'
          : 'Your time is saved. Open the leaderboard to see the latest scores.';
        $('leaderboard-submit-status').textContent=result.saved?'Your best time is on the leaderboard.':'Your faster leaderboard time is already saved.';
        toast(result.saved?'Time shared on the leaderboard!':'Run finished · your faster leaderboard time is kept.');
        if(dialog.open)refresh();
      } catch(error) {
        if(current!==submission)return;
        $('result-rank').textContent='Leaderboard unavailable — we couldn’t check your position. Your local best and ghost still work.';
        $('leaderboard-submit-status').textContent='Could not share this run. Local bests and ghosts still work.';
        toast('Could not share this run · local bests and ghosts still work.');
      }
    },
  };
}
