import { getDatabase } from '@netlify/database';
import { createHandler } from '../lib/leaderboard-handler.mjs';
import { loadCourses } from '../lib/course-data.mjs';
export default createHandler({ getSql: () => getDatabase().sql, getCourses: loadCourses });
export const config = {
  path: '/api/leaderboard',
  rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ['ip','domain'], action: 'rate_limit' },
};
