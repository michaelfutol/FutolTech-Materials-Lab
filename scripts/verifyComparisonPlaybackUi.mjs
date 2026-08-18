import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { extname, join, normalize } from 'node:path';
import { tmpdir } from 'node:os';

const root = process.cwd();
const mime = new Map([['.html','text/html; charset=utf-8'],['.js','text/javascript; charset=utf-8'],['.css','text/css; charset=utf-8']]);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function chromePath(){for(const n of ['google-chrome','google-chrome-stable','chromium','chromium-browser']){const r=spawnSync('which',[n],{encoding:'utf8'});if(r.status===0&&r.stdout.trim())return r.stdout.trim();}throw new Error('Chromium is required for comparison playback QA.');}
async function waitPort(dir,proc){const f=join(dir,'DevToolsActivePort');for(let i=0;i<500;i+=1){if(proc.exitCode!==null)throw new Error(`Chromium exited early ${proc.exitCode}`);try{const p=Number((await readFile(f,'utf8')).split(/\r?\n/)[0]);if(p>0)return p;}catch{}await sleep(50);}throw new Error('Timed out waiting for Chromium.');}
async function target(base){for(let i=0;i<200;i+=1){try{const list=await(await fetch(`${base}/json/list`)).json();const p=list.find(x=>x.type==='page'&&x.webSocketDebuggerUrl);if(p)return p;}catch{}await sleep(50);}throw new Error('No Chromium page target.');}
async function connect(url){const socket=new WebSocket(url);await new Promise((res,rej)=>{socket.addEventListener('open',res,{once:true});socket.addEventListener('error',rej,{once:true});});let id=0;const pending=new Map();socket.addEventListener('message',e=>{const m=JSON.parse(String(e.data));if(!m.id||!pending.has(m.id))return;const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result||{});});const send=(method,params={})=>new Promise((resolve,reject)=>{const rid=++id;pending.set(rid,{resolve,reject});socket.send(JSON.stringify({id:rid,method,params}));});return{socket,send};}
async function evalv(cdp,expression){const r=await cdp.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text||'Browser evaluation failed');return r.result?.value;}
async function stop(proc){if(!proc||proc.exitCode!==null)return;proc.kill('SIGTERM');await sleep(400);if(proc.exitCode===null)proc.kill('SIGKILL');}
const server=createServer((req,res)=>{const raw=decodeURIComponent((req.url||'/').split('?')[0]),rel=raw==='/'?'/compare.html':raw,file=normalize(join(root,rel));if(!file.startsWith(root))return res.writeHead(403).end();res.setHeader('Content-Type',mime.get(extname(file))||'application/octet-stream');const s=createReadStream(file);s.on('error',()=>res.writeHead(404).end());s.pipe(res);});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const {port}=server.address();const work=await mkdtemp(join(tmpdir(),'ft-compare-playback-')),profile=join(work,'profile');let proc,cdp;
try{
  proc=spawn(chromePath(),['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--remote-debugging-port=0',`--user-data-dir=${profile}`,`http://127.0.0.1:${port}/compare.html?build=sim2-ci`],{stdio:'ignore'});
  const dp=await waitPort(profile,proc),page=await target(`http://127.0.0.1:${dp}`);cdp=await connect(page.webSocketDebuggerUrl);await cdp.send('Runtime.enable');
  let ready=false;let lastState=null;for(let i=0;i<180;i+=1){const s=await evalv(cdp,`({ready:document.readyState,panel:!!document.querySelector('[data-comparison-playback]'),benchmark:!!document.querySelector('[data-cp-benchmark]'),slots:[0,1,2].map(i=>!!document.querySelector('[data-slot-material="'+i+'"]')&&!!document.querySelector('[data-slot-preset="'+i+'"]')&&!!document.querySelector('[data-slot-orientation="'+i+'"]')),third:!!document.querySelector('[data-slot-enable="2"]'),root:!!document.getElementById('compareLoadEquivalent')})`);lastState=s;if(s?.ready==='complete'&&s.panel&&s.benchmark&&s.slots.every(Boolean)&&s.third&&s.root){ready=true;break;}await sleep(100);}if(!ready)throw new Error(`Side-by-side playback did not mount: ${JSON.stringify(lastState)}`);

  await evalv(cdp,`document.querySelector('[data-cp-benchmark]').click()`);await sleep(700);
  const configured=await evalv(cdp,`({third:document.querySelector('[data-slot-enable="2"]')?.checked,presets:[0,1].map(i=>document.querySelector('[data-slot-preset="'+i+'"]')?.value),angles:[0,1].map(i=>document.querySelector('[data-c-purlin-orientation-display="'+i+'"]')?.value),load:document.querySelector('#compareLoadInput').value,unit:document.querySelector('#compareLoadUnitSelect').value,cards:document.querySelectorAll('[data-playback-member]').length})`);
  if(configured.third!==false)throw new Error(`Canonical benchmark did not disable Member C: ${JSON.stringify(configured)}`);
  if(configured.presets[0]!==configured.presets[1]||!configured.presets[0]?.includes('colorsteel-c100'))throw new Error(`Canonical C100 presets do not match: ${JSON.stringify(configured)}`);
  if(configured.angles[0]!=='0'||configured.angles[1]!=='90')throw new Error(`Canonical orientations are not 0/90: ${JSON.stringify(configured)}`);
  if(configured.cards!==2)throw new Error(`Expected two synchronized playback cards: ${JSON.stringify(configured)}`);

  await evalv(cdp,`(() => { const s=document.querySelector('[data-cp-scrub]');s.value='500';s.dispatchEvent(new Event('input',{bubbles:true})); })()`);await sleep(250);
  const halfway=await evalv(cdp,`({load:Number(document.querySelector('#compareLoadInput').value),metricLoads:[...document.querySelectorAll('[data-playback-member]')].map(c=>c.querySelector('.comparison-playback-card__metrics strong')?.textContent),defs:[...document.querySelectorAll('[data-playback-member]')].map(c=>Number((c.textContent.match(/Deflection\s*([\d.]+) mm/)||[])[1]))})`);
  if(!(halfway.load>45&&halfway.load<55))throw new Error(`50% scrub did not produce about 50 kgf shared load: ${JSON.stringify(halfway)}`);
  if(!(halfway.defs[1]>halfway.defs[0]))throw new Error(`90° C-purlin should deflect more than 0° under the same load: ${JSON.stringify(halfway)}`);

  await evalv(cdp,`document.querySelector('[data-cp-step]').click()`);await sleep(150);
  const stepped=await evalv(cdp,`Number(document.querySelector('[data-cp-scrub]').value)`);if(!(stepped>500))throw new Error(`STEP did not advance synchronized progress: ${stepped}`);

  await evalv(cdp,`(() => { const s=document.querySelector('[data-cp-scrub]');s.value='1000';s.dispatchEvent(new Event('input',{bubbles:true})); })()`);await sleep(250);
  await evalv(cdp,`document.querySelector('[data-cp-export]').click()`);await sleep(120);
  const pkg=await evalv(cdp,`(() => { const p=window.__FT_LAST_COMPARISON_SIMULATION_PACKAGE__; return p ? {schema:p.schema,version:p.version,frames:p.frames.length,members:p.frames.map(f=>f.members.length),angles:p.frames.at(-1).members.map(m=>m.orientationDeg),loads:p.frames.map(f=>f.loadKN),times:p.frames.map(f=>f.timeS),finalDef:p.frames.at(-1).members.map(m=>m.response.maxDeflectionMm),boundary:p.analysisBoundary} : null; })()`);
  if(!pkg)throw new Error('Simulation export package was not created.');
  if(pkg.schema!=='futoltech.structural-lab.comparison-simulation'||pkg.version!=='1.0.0'||pkg.frames!==51)throw new Error(`Export contract mismatch: ${JSON.stringify(pkg)}`);
  if(pkg.members.some(n=>n!==2)||pkg.angles[0]!==0||pkg.angles[1]!==90)throw new Error(`Export member/orientation mismatch: ${JSON.stringify(pkg)}`);
  if(!(pkg.finalDef[1]>pkg.finalDef[0]))throw new Error(`Exported weak-axis response is not larger: ${JSON.stringify(pkg.finalDef)}`);
  if(!/not dynamic time integration/i.test(pkg.boundary))throw new Error('Export boundary does not preserve quasi-static limitation.');
  for(let i=1;i<pkg.loads.length;i+=1){if(pkg.loads[i]<pkg.loads[i-1]-1e-12||pkg.times[i]<pkg.times[i-1]-1e-12)throw new Error('Exported load/time history is not monotonic.');}
  console.log('Synchronized C-purlin 0° vs 90° comparison playback + JSON export QA passed in real Chromium.');
}finally{try{cdp?.socket.close();}catch{}await stop(proc);await new Promise(resolve=>server.close(resolve));await rm(work,{recursive:true,force:true});}
