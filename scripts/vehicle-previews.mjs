// Run after changing models: npm run previews (Chrome required; override BROWSER_BIN).
import { createServer } from 'vite';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const profile=await mkdtemp(join(tmpdir(),'bofin-previews-'));
const server=await createServer({server:{host:'127.0.0.1',port:0},plugins:[{name:'preview-export',configureServer(server){server.middlewares.use('/__vehicle_previews',(_req,res)=>{res.setHeader('Content-Type','text/html');res.end(`<body><script type="module">import {vehiclePreviews} from '/src/vehicles.js';document.body.textContent=JSON.stringify(vehiclePreviews());</script></body>`);});}}]});
try {
 await server.listen();
 const browser=process.env.BROWSER_BIN||(process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':'chromium');
 const {stdout}=await promisify(execFile)(browser,['--headless',`--user-data-dir=${profile}`,'--no-first-run','--no-default-browser-check','--enable-unsafe-swiftshader','--dump-dom','--timeout=20000','--virtual-time-budget=10000',`${server.resolvedUrls.local[0]}__vehicle_previews`],{maxBuffer:8*1024*1024});
 const body=stdout.match(/<body>([\s\S]*?)<\/body>/)?.[1];
 const previews=JSON.parse(body);await mkdir('public/vehicles',{recursive:true});
 for(const [id,data] of Object.entries(previews))await writeFile(`public/vehicles/${id}.png`,Buffer.from(data.split(',')[1],'base64'));
 console.log(`Exported ${Object.keys(previews).length} previews.`);
} finally {await server.close();await rm(profile,{recursive:true,force:true});}
