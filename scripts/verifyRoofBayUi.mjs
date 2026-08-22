import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { extname, join, normalize } from 'node:path';
import { tmpdir } from 'node:os';

const root = process.cwd();
const mime = new Map([['.html','text/html; charset=utf-8'],['.js','text/javascript; charset=utf-8'],['.css','text/css; charset=utf-8'],['.json','application/json; charset=utf-8']]);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function findChrome(){for(const name of ['google-chrome','google-chrome-stable','chromium','chromium-browser']){const result=spawnSync('which',[name],{encoding:'utf8'});if(result.status===0&&result.stdout.trim())return result.stdout.trim();}throw new Error('Chromium is required for Roof Bay QA.');}
async function waitPort(dir,proc){const file=join(dir,'DevToolsActivePort');for(let i=0;i<500;i+=1){if(proc.exitCode!==null)throw new Error(`Chromium exited early: ${proc.exitCode}`);try{const port=Number((await readFile(file,'utf8')).split(/\r?\n/)[0]);if(port>0)return port;}catch{}await sleep(50);}throw new Error('Timed out waiting for Chromium.');}
async function pageTarget(base){for(let i=0;i<200;i+=1){try{const list=await(await fetch(`${base}/json/list`)).json();const page=list.find((entry)=>entry.type==='page'&&entry.webSocketDebuggerUrl);if(page)return page;}catch{}await sleep(50);}throw new Error('No Chromium page target.');}
async function connect(url){const socket=new WebSocket(url);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});let id=0;const pending=new Map();socket.addEventListener('message',(event)=>{const msg=JSON.parse(String(event.data));if(!msg.id||!pending.has(msg.id))return;const request=pending.get(msg.id);pending.delete(msg.id);msg.error?request.reject(new Error(msg.error.message)):request.resolve(msg.result||{});});const send=(method,params={})=>new Promise((resolve,reject)=>{const requestId=++id;pending.set(requestId,{resolve,reject});socket.send(JSON.stringify({id:requestId,method,params}));});return{socket,send};}
async function evaluate(cdp,expression){const result=await cdp.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text||'Browser evaluation failed.');return result.result?.value;}
async function stop(proc){if(!proc||proc.exitCode!==null)return;proc.kill('SIGTERM');await sleep(350);if(proc.exitCode===null)proc.kill('SIGKILL');}

const server=createServer((req,res)=>{const raw=decodeURIComponent((req.url||'/').split('?')[0]),rel=raw==='/'?'/roof-bay.html':raw,file=normalize(join(root,rel));if(!file.startsWith(root))return res.writeHead(403).end();res.setHeader('Content-Type',mime.get(extname(file))||'application/octet-stream');const stream=createReadStream(file);stream.on('error',()=>res.writeHead(404).end());stream.pipe(res);});
await new Promise((resolve)=>server.listen(0,'127.0.0.1',resolve));
const {port}=server.address();
const work=await mkdtemp(join(tmpdir(),'ft-roof-bay-ui-')),profile=join(work,'profile');
let proc,cdp;

try{
  proc=spawn(findChrome(),['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--remote-debugging-port=0',`--user-data-dir=${profile}`,`http://127.0.0.1:${port}/roof-bay.html?build=ci`],{stdio:'ignore'});
  const debugPort=await waitPort(profile,proc),page=await pageTarget(`http://127.0.0.1:${debugPort}`);cdp=await connect(page.webSocketDebuggerUrl);await cdp.send('Runtime.enable');

  let state=null;
  for(let i=0;i<160;i+=1){state=await evaluate(cdp,`(() => ({ready:document.readyState,model:window.__FT_ROOF_BAY_MODEL__?{count:window.__FT_ROOF_BAY_MODEL__.geometry.purlinCount,residual:window.__FT_ROOF_BAY_MODEL__.equilibrium.residualKN,pass:window.__FT_ROOF_BAY_MODEL__.equilibrium.pass,normal:window.__FT_ROOF_BAY_MODEL__.applied.normalKN,parallel:window.__FT_ROOF_BAY_MODEL__.applied.parallelKN}:null,nav:[...document.querySelectorAll('[data-ft-primary-nav] a,[data-ft-primary-nav] span')].map(x=>x.textContent),canvas:!!document.querySelector('[data-rb-canvas]'),rows:document.querySelectorAll('[data-rb-body] tr').length,summary:document.querySelector('[data-rb-summary]')?.textContent||''}))()`);if(state?.ready==='complete'&&state.model&&state.rows>0)break;await sleep(100);}
  if(!state?.model)throw new Error(`Roof Bay model did not mount: ${JSON.stringify(state)}`);
  if(state.model.count!==6||state.rows!==6)throw new Error(`Default Roof Bay should have 6 purlin rows: ${JSON.stringify(state)}`);
  if(!state.model.pass||state.model.residual>1e-8)throw new Error(`Roof Bay load conservation failed: ${JSON.stringify(state.model)}`);
  if(!state.canvas)throw new Error('Roof Bay visualization canvas is missing.');
  if(!state.nav.includes('Roof Bay')||!state.nav.includes('Advanced / R&D'))throw new Error(`Primary M0 navigation missing Roof Bay/R&D: ${JSON.stringify(state.nav)}`);
  if(!/Reaction each rafter/i.test(state.summary))throw new Error('Roof Bay summary does not expose rafter reaction transfer.');

  const changed=await evaluate(cdp,`(() => {const spacing=document.querySelector('[data-rb-spacing]');spacing.value='1.2';spacing.dispatchEvent(new Event('input',{bubbles:true}));const mode=document.querySelector('[data-rb-mode]');mode.value='wind';mode.dispatchEvent(new Event('change',{bubbles:true}));const windSense=document.querySelector('[data-rb-wind-sense]');windSense.value='uplift';windSense.dispatchEvent(new Event('change',{bubbles:true}));return true;})()`);
  if(!changed)throw new Error('Could not drive Roof Bay controls.');
  await sleep(350);
  const wind=await evaluate(cdp,`(() => {const m=window.__FT_ROOF_BAY_MODEL__;return m?{count:m.geometry.purlinCount,spacing:m.geometry.actualSpacingM,normal:m.applied.normalKN,parallel:m.applied.parallelKN,pass:m.equilibrium.pass,residual:m.equilibrium.residualKN,gravity:m.applied.totalGravityVerticalKN}:null;})()`);
  if(!wind||wind.count!==5||Math.abs(wind.spacing-1)>1e-9)throw new Error(`Roof Bay equal-spacing response mismatch: ${JSON.stringify(wind)}`);
  if(!(wind.normal<0)||Math.abs(wind.parallel)>1e-9||Math.abs(wind.gravity)>1e-9)throw new Error(`Wind-only uplift routing mismatch: ${JSON.stringify(wind)}`);
  if(!wind.pass||wind.residual>1e-8)throw new Error(`Wind-only Roof Bay conservation failed: ${JSON.stringify(wind)}`);

  console.log(`Roof Bay M2 Chromium QA passed: ${state.model.count} default purlins, equilibrium residual ${state.model.residual}, and wind-only uplift reflowed to ${wind.count} purlins with balanced reactions.`);
} finally {
  try{cdp?.socket.close();}catch{}
  await stop(proc);
  await new Promise((resolve)=>server.close(resolve));
  await rm(work,{recursive:true,force:true});
}
