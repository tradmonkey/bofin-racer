import { ROUTES } from '../../src/racing.js';
import { HANDLING } from '../../src/driving.js';
import { validateSubmission } from '../../src/leaderboard-rules.js';
const json = (data, status=200, extra={}) => Response.json(data,{status,headers:{'Cache-Control':'no-store',...extra}});
export function createHandler({ getSql, getCourses }) {
  return async req => {
    const url = new URL(req.url);
    if (!['GET','POST'].includes(req.method)) return json({error:'Method not allowed.'},405,{Allow:'GET, POST'});
    try {
      if (req.method === 'GET') {
        const course = url.searchParams.get('course'), vehicle = url.searchParams.get('vehicle') || '';
        if (!ROUTES.some(r=>r.id===course) || (vehicle && !Object.hasOwn(HANDLING,vehicle))) return json({error:'Unknown route or vehicle.'},400);
        const sql = getSql();
        const rows = vehicle
          ? await sql`SELECT player_name, vehicle, time_s, updated_at FROM race_results WHERE course_id = ${course} AND vehicle = ${vehicle} ORDER BY time_s ASC, updated_at ASC LIMIT 20`
          : await sql`SELECT player_name, vehicle, time_s, updated_at FROM (SELECT DISTINCT ON (player_id) player_name, vehicle, time_s, updated_at FROM race_results WHERE course_id = ${course} ORDER BY player_id, time_s ASC, updated_at ASC) AS best ORDER BY time_s ASC, updated_at ASC LIMIT 20`;
        return json({rows});
      }
      const origin = req.headers.get('origin');
      if (origin && origin !== url.origin) return json({error:'Origin not allowed.'},403);
      if (!req.headers.get('content-type')?.includes('application/json')) return json({error:'JSON required.'},415);
      if (Number(req.headers.get('content-length')) > 2400000) return json({error:'Recording too large.'},413);
      const body = await req.text();
      if (body.length > 2400000) return json({error:'Recording too large.'},413);
      let data;
      try { data=JSON.parse(body); } catch { return json({error:'Invalid JSON.'},400); }
      if (!ROUTES.some(r=>r.id===data?.course)) return json({error:'Unknown route.'},400);
      let result;
      try { result=validateSubmission(data,getCourses().get(data.course)); }
      catch(error) { return json({error:error.message},400); }
      const sql=getSql();
      // Atomic best-only update: slower runs and replayed submissions cannot replace a best.
      const rows=await sql`INSERT INTO race_results (player_id, course_id, vehicle, player_name, time_s) VALUES (${result.playerId}, ${result.course}, ${result.vehicle}, ${result.name}, ${result.time}) ON CONFLICT (player_id, course_id, vehicle) DO UPDATE SET player_name = EXCLUDED.player_name, time_s = EXCLUDED.time_s, updated_at = now() WHERE EXCLUDED.time_s < race_results.time_s RETURNING time_s`;
      return json({saved:rows.length>0},rows.length?201:200);
    } catch(error) {
      console.error('Leaderboard unavailable:',error?.name || 'Error');
      return json({error:'Leaderboard unavailable. Your local best and ghost still work.'},503);
    }
  };
}
