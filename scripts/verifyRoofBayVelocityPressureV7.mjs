import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { extname, join, normalize } from 'node:path';
import { tmpdir } from 'node:os';

const root=process.cwd();
const mime=new Map([['.html','text/html; charset=utf-8'],['.js','text/javascript; charset=utf-8'],['.css','text/css; charset=utf-8'],['.json','application/json; charset=utf-8']]);
const sleep=(ms)=>new Promise((resolve)=>setTimeout(resolve,ms));
function chromePath(){for(const name of ['google-chrome','google-chrome-stable','chromium','chromium-browser']){const r=spawnSync('which',[name],{encoding:'utf8'});if(r.status===0&&r.stdout.trim())return r.stdout.trim();}throw new Error('Chromium is required for M3 velocity-pressure QA.');}
async function waitPort(dir,proc){const file=join(dir,'DevToolsActivePort');for(let i=0;i<500;i+=1){if(proc.exitCode!==null)throw new Error(`Chromium exited early ${proc.exitCode}`);try{const port=Number((await readFile(file,'utf8')).split(/\r?\n/)[0]);if(port>0)return port;}catch{}await sleep(50);}throw new Error('Timed out waiting for Chromium.');}
async function target(base){for(let i=0;i<200;i+=1){try{const list=await(await fetch(`${base}/json/list`)).json();const page=list.find((entry)=>entry.type==='page'&&entry.webSocketDebuggerUrl);if(page)return page;}catch{}await sleep(50);}throw new Error('No Chromium page target.');}
async function connect(url){const socket=new WebSocket(url);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});let id=0;const pending=new Map();socket.addEventListener('message',(event)=>{const msg=JSON.parse(String(event.data));if(!msg.id||!pending.has(msg.id))return;const request=pending.get(msg.id);pending.delete(msg.id);msg.error?request.reject(new Error(msg.error.message)):request.resolve(msg.result||{});});const send=(method,params={})=>new Promise((resolve,reject)=>{const requestId=++id;pending.set(requestId,{resolve,reject});socket.send(JSON.stringify({id:requestId,method,params}));});return{socket,send};}
async function evaluate(cdp,expression){const result=await cdp.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text||'Browser evaluation failed.');return result.result?.value;}
async function stop(proc){if(!proc||proc.exitCode!==null)return;proc.kill('SIGTERM');await sleep(350);if(proc.exitCode===null)proc.kill('SIGKILL');}

const server=createServer((req,res)=>{const raw=decodeURIComponent((req.url||'/').split('?')[0]),rel=raw==='/'?'/roof-bay.html':raw,file=normalize(join(root,rel));if(!file.startsWith(root))return res.writeHead(403).end();res.setHeader('Content-Type',mime.get(extname(file))||'application/octet-stream');const stream=createReadStream(file);stream.on('error',()=>res.writeHead(404).end());stream.pipe(res);});
await new Promise((resolve)=>server.listen(0,'127.0.0.1',resolve));
const {port}=server.address();const work=await mkdtemp(join(tmpdir(),'ft-wind-vp-v7-')),profile=join(work,'profile');let proc,cdp;

try{
  proc=spawn(chromePath(),['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--remote-debugging-port=0',`--user-data-dir=${profile}`,`http://127.0.0.1:${port}/roof-bay.html?build=wind-vp-v7`],{stdio:'ignore'});
  const dp=await waitPort(profile,proc),page=await target(`http://127.0.0.1:${dp}`);cdp=await connect(page.webSocketDebuggerUrl);await cdp.send('Runtime.enable');

  let state=null;for(let i=0;i<180;i+=1){state=await evaluate(cdp,`(() => ({ready:document.readyState,basis:window.__FT_WIND_VELOCITY_BENCHMARK__||null,ui:window.__FT_WIND_VELOCITY_UI__||null,status:document.querySelector('[data-rb-vp-status]')?.textContent||'',qText:document.querySelector('[data-rb-vp-result]')?.textContent||'',kzText:document.querySelector('[data-rb-vp-kz]')?.textContent||'',eqQ:document.querySelector('[data-rb-vp-eq-q]')?.textContent||'',boundary:document.querySelector('[data-rb-vp-boundary]')?.textContent||'',pressure:window.__FT_ROOF_BAY_MODEL__?.pressureZoning||null}))()`);if(state?.ready==='complete'&&state.basis&&state.ui)break;await sleep(100);}
  if(!state?.basis||!state?.ui)throw new Error(`M3 velocity-pressure UI did not mount: ${JSON.stringify(state)}`);
  if(state.basis.calculationStatus!=='VELOCITY_PRESSURE_AVAILABLE_ZONING_BLOCKED')throw new Error(`Unexpected velocity-pressure basis status: ${JSON.stringify(state.basis)}`);
  if(state.ui.velocityPressureImplementation!=='IMPLEMENTED_BENCHMARKED')throw new Error(`Velocity-pressure solver not marked benchmarked: ${JSON.stringify(state.ui)}`);
  if(Math.abs(state.ui.kz-0.9748206328451855)>1e-12)throw new Error(`Kz benchmark changed: ${state.ui.kz}`);
  if(Math.abs(state.ui.qKPa-2.257467958862151)>1e-12)throw new Error(`q benchmark changed: ${state.ui.qKPa}`);
  if(state.ui.unresolvedInputCount!==2)throw new Error(`Velocity-pressure basis should leave exactly enclosure and roof geometry unresolved: ${JSON.stringify(state.ui)}`);
  if(!/VERIFIED/.test(state.status)||!/2\.257468 kPa/.test(state.qText)||!/0\.974820633/.test(state.kzText))throw new Error(`Visible benchmark values are missing: ${JSON.stringify(state)}`);
  if(!/0\.613/.test(state.eqQ)||!/0\.85/.test(state.eqQ))throw new Error(`Visible q substitution is incomplete: ${state.eqQ}`);
  if(!/not routed into Roof Bay/.test(state.boundary))throw new Error(`Velocity-pressure boundary is not explicit: ${state.boundary}`);
  if(state.pressure?.activePressureModel!=='manual-uniform'||state.pressure?.codeBasis!==null||state.pressure?.regions?.length!==0)throw new Error(`Benchmark silently replaced the Roof Bay pressure path: ${JSON.stringify(state.pressure)}`);

  await evaluate(cdp,`document.querySelector('[data-rb-export-project]').click()`);await sleep(120);
  const project=await evaluate(cdp,`window.__FT_LAST_ROOF_BAY_PROJECT__||null`);
  if(project?.windDesignBasis?.calculationStatus!=='BLOCKED')throw new Error(`Benchmark was silently promoted into project export: ${JSON.stringify(project?.windDesignBasis)}`);
  if(project?.pressureZoning?.activePressureModel!=='manual-uniform'||project?.pressureZoning?.codeBasis!==null)throw new Error(`Project export activated code-derived pressure prematurely: ${JSON.stringify(project?.pressureZoning)}`);

  console.log('M3 velocity-pressure V7 Chromium QA passed: Exposure C 8.82 m / 240 kph / Kzt 1.0 benchmark gives Kz=0.974820633 and q=2.257468 kPa with visible substitutions, while Roof Bay project pressure remains manual-uniform and zoning stays blocked.');
} finally {try{cdp?.socket.close();}catch{}await stop(proc);await new Promise((resolve)=>server.close(resolve));await rm(work,{recursive:true,force:true});}
