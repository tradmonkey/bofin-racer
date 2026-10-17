# Shared leaderboard

This repository now includes a Netlify Database migration, score API, driver-name field, optional score sharing and a top-20 leaderboard with route/vehicle filters. Local personal bests and ghosts remain in browser storage. Existing old local records are not automatically uploaded; complete a fresh run to submit it.

## Deploy

1. Use this GitHub repository as the connected repository for the existing Netlify project.
2. Commit the source changes, `package.json`, `package-lock.json`, `netlify.toml`, and the `netlify/` directory. Do not commit credentials or new `node_modules` files. This repository already tracks some dependency files; `.gitignore` prevents new dependency files from being added but does not untrack existing ones.
3. Push the commit to the branch Netlify deploys. The build command is `npm run build`; publish directory is `dist`. Configuration is provided in `netlify.toml`.
4. Netlify detects the installed `@netlify/database` package and provisions the database. Its migration system applies `netlify/database/migrations/0001_race_results.sql` before publishing.
5. Check the deploy log for successful database provisioning, migration, function deployment and the rate-limit rule. No database password belongs in frontend code.
6. Open Time Trial on the deployed HTTPS site, choose a driver name and leave sharing enabled. Finish a new run. Check the Leaderboard for that route, then verify it from another device/browser.

Uploading `dist` by itself still publishes the playable game, but does not deploy the database migration or function. Shared scores require a full Netlify deployment from the repository or Netlify CLI.

## Local development

Run from this repository with Node 24:

```sh
npx netlify login
npx netlify link
npx netlify dev
```

Select the existing Netlify project when linking. Netlify Dev listens on port 8888 and runs Vite on 5173. Use the Netlify Dev URL for `/api/leaderboard`. Follow any local database setup requirements reported by Netlify CLI; see https://docs.netlify.com/build/data-and-storage/netlify-database/local-development/.

`npm run dev` alone still supports local play but cannot serve the shared score API. The leaderboard shows an availability message in that case. Shared database connectivity and the live migration must be verified on Netlify; passing local unit tests does not confirm provisioning.

## Behaviour and limitations

- Driver names are public on shared results. Players can turn sharing off and still race.
- A random driver UUID and the name are remembered on that browser. No account or password is required. Clearing storage or switching browsers creates a different identity; this is not authenticated account ownership.
- One best result is stored per browser identity, route and vehicle. Slower runs cannot overwrite it. The all-vehicle board shows each driver's fastest vehicle; a vehicle filter shows their best for that vehicle.
- Recordings are sent transiently to validate results, not stored in the database. Only the player's browser keeps its best ghost.
- The API checks valid IDs, names, finite times, ordered recordings, speed/teleport bounds, starting position, every checkpoint and the finish. This rejects obvious invalid results but is not cheat-proof: a determined player can fabricate a plausible recording.
- A Netlify rate limit of 60 requests/minute per IP/domain is configured for the endpoint; verify rule enforcement in the deploy log. The function accepts only same-origin JSON POST requests and limits recording size.
- Failed sharing does not stop gameplay or erase local ghosts. It is not automatically retried. Existing local records are retained independently of shared scores.
- For moderation, inspect/delete unwanted entries in Netlify's Database dashboard. There is no public deletion or admin endpoint.
