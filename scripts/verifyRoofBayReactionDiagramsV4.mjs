import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { extname, join, normalize } from 'node:path';
import { tmpdir } from 'node:os';

const root=process.cwd();
const mime=new Map([['.html','text/html; charset=utf-8'],['.js','text/javascript; charset=utf-8'],['.css','text/css; charset=utf-8'],['.json','application/json; charset=utf-8']]);
const sleep=(ms)=>new Promise((resolve)=>setTimeout(resolve,ms));
function chromePath(){for(const name of ['google-chrome','google-chrome-stable','chromium','chromium-browser']){const r=spawnSync('which',[name],{encoding:'utf8'});if(r.status===0&&r.stdout.trim())return r.stdout.trim();}throw new Error('Chromium is required for Roof Bay reaction-diagram QA.');}
async function waitPort(dir,proc){const file=join(dir,'DevToolsActivePort');for(let i=0;i<500;i+=1){if(proc.exitCode!==null)throw new Error(`Chromium exited early ${proc.exitCode}`);try{const port=Number((await readFile(file,'utf8')).split(/\r?\n/)[0]);if(port>0)return port;}catch{}await sleep(50);}throw new Error('Timed out waiting for Chromium.');}
async function target(base){for(let i=0;i<200;i+=1){try{const list=await(await fetch(`${base}/json/list`)).json();const page=list.find((entry)=>entry.type==='page'&&entry.webSocketDebuggerUrl);if(page)return page;}catch{}await sleep(50);}throw new Error('No Chromium page target.');}
async function connect(url){const socket=new WebSocket(url);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});let id=0;const pending=new Map();socket.addEventListener('message',(event)=>{const msg=JSON.parse(String(event.data));if(!msg.id||!pending.has(msg.id))return;const request=pending.get(msg.id);pending.delete(msg.id);msg.error?request.reject(new Error(msg.error.message)):request.resolve(msg.result||{});});const send=(method,params={})=>new Promise((resolve,reject)=>{const requestId=++id;pending.set(requestId,{resolve,reject});socket.send(JSON.stringify({id:requestId,method,params}));});return{socket,send};}
async function evaluate(cdp,expression){const result=await cdp.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text||'Browser evaluation failed.');return result.result?.value;}
async function stop(proc){if(!proc||proc.exitCode!==null)return;proc.kill('SIGTERM');await sleep(350);if(proc.exitCode===null)proc.kill('SIGKILL');}

const server=createServer((req,res)=>{const raw=decodeURIComponent((req.url||'/').split('?')[0]),rel=raw==='/'?'/roof-bay.html':raw,file=normalize(join(root,rel));if(!file.startsWith(root))return res.writeHead(403).end();res.setHeader('Content-Type',mime.get(extname(file))||'application/octet-stream');const stream=createReadStream(file);stream.on('error',()=>res.writeHead(404).end());stream.pipe(res);});
await new Promise((resolve)=>server.listen(0,'127.0.0.1',resolve));
const {port}=server.address();const work=await mkdtemp(join(tmpdir(),'ft-roof-bay-rxn-v4-')),profile=join(work,'profile');let proc,cdp;

try{
  proc=spawn(chromePath(),['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--remote-debugging-port=0',`--user-data-dir=${profile}`,`http://127.0.0.1:${port}/roof-bay.html?build=reaction-v4`],{stdio:'ignore'});
  const dp=await waitPort(profile,proc),page=await target(`http://127.0.0.1:${dp}`);cdp=await connect(page.webSocketDebuggerUrl);await cdp.send('Runtime.enable');

  let state=null;for(let i=0;i<180;i+=1){state=await evaluate(cdp,`(() => ({ready:document.readyState,model:window.__FT_ROOF_BAY_MODEL__||null,rxn:window.__FT_ROOF_BAY_REACTION_DIAGRAMS__||null,canvases:document.querySelectorAll('[data-rb-rafter-a],[data-rb-rafter-b]').length,rows:document.querySelectorAll('[data-rb-conservation-body] tr').length,status:document.querySelector('[data-rb-component-status]')?.textContent||''}))()`);if(state?.ready==='complete'&&state.model&&state.rxn&&state.canvases===2&&state.rows===2)break;await sleep(100);}
  if(!state?.rxn)throw new Error(`Reaction diagram UI did not mount: ${JSON.stringify(state)}`);
  if(state.canvases!==2||state.rows!==2)throw new Error(`Expected two rafter diagrams and two conservation rows: ${JSON.stringify(state)}`);
  if(!state.rxn.normalPass||!state.rxn.parallelPass||!/PASS/.test(state.status))throw new Error(`Default component conservation is not green: ${JSON.stringify(state)}`);
  if(Math.abs(state.rxn.normalResidualKN)>1e-9||Math.abs(state.rxn.parallelResidualKN)>1e-9)throw new Error(`Default component residual exceeds tolerance: ${JSON.stringify(state.rxn)}`);
  if(state.rxn.leftPointCount!==state.model.geometry.purlinCount||state.rxn.rightPointCount!==state.model.geometry.purlinCount)throw new Error(`Reaction diagram point count does not match purlin count: ${JSON.stringify(state.rxn)}`);

  await evaluate(cdp,`(() => {const mode=document.querySelector('[data-rb-mode]');mode.value='wind';mode.dispatchEvent(new Event('change',{bubbles:true}));const sense=document.querySelector('[data-rb-wind-sense]');sense.value='uplift';sense.dispatchEvent(new Event('change',{bubbles:true}));})()`);await sleep(250);
  const uplift=await evaluate(cdp,`(() => {const m=window.__FT_ROOF_BAY_MODEL__,r=window.__FT_ROOF_BAY_REACTION_DIAGRAMS__;return {normalApplied:m.conservation.normal.applied.totalKN,parallelApplied:m.conservation.parallel.applied.totalKN,normalReaction:m.conservation.normal.reactions.totalKN,parallelReaction:m.conservation.parallel.reactions.totalKN,normalPass:r.normalPass,parallelPass:r.parallelPass,trace:document.querySelector('[data-rb-conservation-trace]').textContent,rows:[...document.querySelectorAll('[data-rb-conservation-body] tr')].map(x=>x.textContent)};})()`);
  if(!(uplift.normalApplied<0)||!(uplift.normalReaction<0))throw new Error(`Wind-only uplift did not remain negative roof-normal: ${JSON.stringify(uplift)}`);
  if(Math.abs(uplift.parallelApplied)>1e-10||Math.abs(uplift.parallelReaction)>1e-10)throw new Error(`Wind-only case created a false downslope component: ${JSON.stringify(uplift)}`);
  if(!uplift.normalPass||!uplift.parallelPass)throw new Error(`Wind-only component conservation failed: ${JSON.stringify(uplift)}`);
  if(!/Current wind input is roof-normal only/.test(uplift.trace)||uplift.rows.length!==2)throw new Error(`Reaction trace/table is incomplete: ${JSON.stringify(uplift)}`);

  console.log(`Roof Bay reaction-diagram V4 Chromium QA passed: two rafter diagrams track ${state.model.geometry.purlinCount} discrete purlin reactions, component conservation is explicit, and wind-only uplift remains negative roof-normal with zero downslope demand.`);
} finally {try{cdp?.socket.close();}catch{}await stop(proc);await new Promise((resolve)=>server.close(resolve));await rm(work,{recursive:true,force:true});}
