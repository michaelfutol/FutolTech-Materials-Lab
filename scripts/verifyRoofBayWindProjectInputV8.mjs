import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { extname, join, normalize } from 'node:path';
import { tmpdir } from 'node:os';

const root=process.cwd();
const mime=new Map([['.html','text/html; charset=utf-8'],['.js','text/javascript; charset=utf-8'],['.css','text/css; charset=utf-8'],['.json','application/json; charset=utf-8']]);
const sleep=(ms)=>new Promise((resolve)=>setTimeout(resolve,ms));
function chromePath(){for(const name of ['google-chrome','google-chrome-stable','chromium','chromium-browser']){const r=spawnSync('which',[name],{encoding:'utf8'});if(r.status===0&&r.stdout.trim())return r.stdout.trim();}throw new Error('Chromium is required for M3 project-wind-input QA.');}
async function waitPort(dir,proc){const file=join(dir,'DevToolsActivePort');for(let i=0;i<500;i+=1){if(proc.exitCode!==null)throw new Error(`Chromium exited early ${proc.exitCode}`);try{const port=Number((await readFile(file,'utf8')).split(/\r?\n/)[0]);if(port>0)return port;}catch{}await sleep(50);}throw new Error('Timed out waiting for Chromium.');}
async function target(base){for(let i=0;i<200;i+=1){try{const list=await(await fetch(`${base}/json/list`)).json();const page=list.find((entry)=>entry.type==='page'&&entry.webSocketDebuggerUrl);if(page)return page;}catch{}await sleep(50);}throw new Error('No Chromium page target.');}
async function connect(url){const socket=new WebSocket(url);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});let id=0;const pending=new Map();socket.addEventListener('message',(event)=>{const msg=JSON.parse(String(event.data));if(!msg.id||!pending.has(msg.id))return;const request=pending.get(msg.id);pending.delete(msg.id);msg.error?request.reject(new Error(msg.error.message)):request.resolve(msg.result||{});});const send=(method,params={})=>new Promise((resolve,reject)=>{const requestId=++id;pending.set(requestId,{resolve,reject});socket.send(JSON.stringify({id:requestId,method,params}));});return{socket,send};}
async function evaluate(cdp,expression){const result=await cdp.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text||'Browser evaluation failed.');return result.result?.value;}
async function stop(proc){if(!proc||proc.exitCode!==null)return;proc.kill('SIGTERM');await sleep(350);if(proc.exitCode===null)proc.kill('SIGKILL');}

const server=createServer((req,res)=>{const raw=decodeURIComponent((req.url||'/').split('?')[0]),rel=raw==='/'?'/roof-bay.html':raw,file=normalize(join(root,rel));if(!file.startsWith(root))return res.writeHead(403).end();res.setHeader('Content-Type',mime.get(extname(file))||'application/octet-stream');const stream=createReadStream(file);stream.on('error',()=>res.writeHead(404).end());stream.pipe(res);});
await new Promise((resolve)=>server.listen(0,'127.0.0.1',resolve));
const {port}=server.address();const work=await mkdtemp(join(tmpdir(),'ft-wind-project-v8-')),profile=join(work,'profile');let proc,cdp;

try{
  proc=spawn(chromePath(),['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--remote-debugging-port=0',`--user-data-dir=${profile}`,`http://127.0.0.1:${port}/roof-bay.html?build=wind-project-v8`],{stdio:'ignore'});
  const dp=await waitPort(profile,proc),page=await target(`http://127.0.0.1:${dp}`);cdp=await connect(page.webSocketDebuggerUrl);await cdp.send('Runtime.enable');

  let initial=null;for(let i=0;i<180;i+=1){initial=await evaluate(cdp,`(() => ({ready:document.readyState,ui:window.__FT_WIND_PROJECT_INPUT_UI__||null,status:document.querySelector('[data-rb-wpi-status]')?.textContent||'',required:document.querySelector('[data-rb-wpi-required-figure]')?.textContent||'',pressure:window.__FT_ROOF_BAY_MODEL__?.pressureZoning||null}))()`);if(initial?.ready==='complete'&&initial.ui?.mounted)break;await sleep(100);}
  if(!initial?.ui?.mounted)throw new Error(`M3 project wind input UI did not mount: ${JSON.stringify(initial)}`);
  if(initial.ui.accepted!==false||!/NOT ACCEPTED/.test(initial.status))throw new Error(`Project inputs should start unaccepted: ${JSON.stringify(initial)}`);
  if(!/207A\.5-1A/.test(initial.required))throw new Error(`Occupancy III required figure guidance missing: ${initial.required}`);
  if(initial.pressure?.activePressureModel!=='manual-uniform'||initial.pressure?.codeBasis!==null)throw new Error(`Initial Roof Bay pressure path changed: ${JSON.stringify(initial.pressure)}`);

  await evaluate(cdp,`(() => {
    const set=(sel,value)=>{const el=document.querySelector(sel);el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));};
    set('[data-rb-wpi-site-ref]','Project site record / survey reference');
    set('[data-rb-wpi-occupancy-ref]','Project occupancy classification record; verify against NSCP 2015 Table 103-1');
    set('[data-rb-wpi-speed]','240');
    set('[data-rb-wpi-speed-ref]','Engineer transcription from authorized NSCP 2015 wind map for the stated site');
    set('[data-rb-wpi-exposure-ref]','Engineer terrain/exposure classification record');
    set('[data-rb-wpi-topo-ref]','Engineer topographic-factor project record');
    set('[data-rb-wpi-height]','8.82');
    set('[data-rb-wpi-height-ref]','Project geometry / mean-roof-height record');
    document.querySelector('[data-rb-wpi-accept]').click();
  })()`);
  await sleep(120);

  const accepted=await evaluate(cdp,`(() => ({ui:window.__FT_WIND_PROJECT_INPUT_UI__,record:window.__FT_WIND_PROJECT_INPUT_ACCEPTANCE__,result:window.__FT_WIND_PROJECT_INPUT_RESULT__,status:document.querySelector('[data-rb-wpi-status]')?.textContent||'',q:document.querySelector('[data-rb-wpi-q]')?.textContent||'',kz:document.querySelector('[data-rb-wpi-kz]')?.textContent||'',boundary:document.querySelector('[data-rb-wpi-boundary]')?.textContent||'',pressure:window.__FT_ROOF_BAY_MODEL__?.pressureZoning||null}))()`);
  if(!accepted.ui?.accepted||accepted.record?.status!=='ACCEPTED_FOR_VELOCITY_PRESSURE_ONLY')throw new Error(`Project wind input acceptance failed: ${JSON.stringify(accepted)}`);
  if(accepted.record.occupancy.requiredWindSpeedFigure.figureId!=='207A.5-1A')throw new Error(`Accepted figure mismatch: ${JSON.stringify(accepted.record.occupancy)}`);
  if(Math.abs(accepted.ui.qKPa-2.257467958862151)>1e-12||Math.abs(accepted.ui.kz-0.9748206328451855)>1e-12)throw new Error(`Accepted q/Kz changed: ${JSON.stringify(accepted.ui)}`);
  if(!/ACCEPTED FOR q ONLY/.test(accepted.status)||!/2\.257468 kPa/.test(accepted.q)||!/0\.974820633/.test(accepted.kz))throw new Error(`Visible accepted result missing: ${JSON.stringify(accepted)}`);
  if(!/final code-derived Roof Bay pressure remain BLOCKED/.test(accepted.boundary))throw new Error(`Acceptance boundary is not explicit: ${accepted.boundary}`);
  if(accepted.pressure?.activePressureModel!=='manual-uniform'||accepted.pressure?.codeBasis!==null||accepted.pressure?.regions?.length!==0)throw new Error(`Accepted q silently replaced Roof Bay pressure: ${JSON.stringify(accepted.pressure)}`);

  await evaluate(cdp,`document.querySelector('[data-rb-export-project]').click()`);await sleep(120);
  const project=await evaluate(cdp,`window.__FT_LAST_ROOF_BAY_PROJECT__||null`);
  if(project?.windProjectInputAcceptance?.status!=='ACCEPTED_FOR_VELOCITY_PRESSURE_ONLY')throw new Error(`Accepted input missing from Roof Bay project export: ${JSON.stringify(project?.windProjectInputAcceptance)}`);
  if(project?.windDesignBasis?.calculationStatus!=='VELOCITY_PRESSURE_AVAILABLE_ZONING_BLOCKED')throw new Error(`Project wind basis did not derive q from accepted inputs: ${JSON.stringify(project?.windDesignBasis)}`);
  if(Math.abs(project.windDesignBasis.velocityPressure.result.qKPa-2.257467958862151)>1e-12)throw new Error(`Project q does not match accepted input calculation: ${project.windDesignBasis.velocityPressure.result.qKPa}`);
  if(project?.pressureZoning?.activePressureModel!=='manual-uniform'||project?.pressureZoning?.codeBasis!==null||project?.pressureZoning?.regions?.length!==0)throw new Error(`Project export activated code pressure prematurely: ${JSON.stringify(project?.pressureZoning)}`);

  await evaluate(cdp,`(() => {const el=document.querySelector('[data-rb-wpi-speed]');el.value='241';el.dispatchEvent(new Event('input',{bubbles:true}));})()`);await sleep(80);
  const invalidated=await evaluate(cdp,`window.__FT_WIND_PROJECT_INPUT_UI__`);
  if(invalidated.accepted!==false||invalidated.qKPa!==null)throw new Error(`Editing accepted input did not invalidate acceptance: ${JSON.stringify(invalidated)}`);

  console.log('M3 project wind input V8 Chromium QA passed: explicit source-referenced inputs accept to q=2.257468 kPa, embed in Roof Bay project JSON, and leave manual-uniform pressure plus code zoning blocked.');
} finally {try{cdp?.socket.close();}catch{}await stop(proc);await new Promise((resolve)=>server.close(resolve));await rm(work,{recursive:true,force:true});}
