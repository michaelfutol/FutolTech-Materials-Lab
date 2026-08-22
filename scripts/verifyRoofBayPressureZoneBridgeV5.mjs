import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { extname, join, normalize } from 'node:path';
import { tmpdir } from 'node:os';

const root=process.cwd();
const mime=new Map([['.html','text/html; charset=utf-8'],['.js','text/javascript; charset=utf-8'],['.css','text/css; charset=utf-8'],['.json','application/json; charset=utf-8']]);
const sleep=(ms)=>new Promise((resolve)=>setTimeout(resolve,ms));
function chromePath(){for(const name of ['google-chrome','google-chrome-stable','chromium','chromium-browser']){const r=spawnSync('which',[name],{encoding:'utf8'});if(r.status===0&&r.stdout.trim())return r.stdout.trim();}throw new Error('Chromium is required for Roof Bay pressure-zone bridge QA.');}
async function waitPort(dir,proc){const file=join(dir,'DevToolsActivePort');for(let i=0;i<500;i+=1){if(proc.exitCode!==null)throw new Error(`Chromium exited early ${proc.exitCode}`);try{const port=Number((await readFile(file,'utf8')).split(/\r?\n/)[0]);if(port>0)return port;}catch{}await sleep(50);}throw new Error('Timed out waiting for Chromium.');}
async function target(base){for(let i=0;i<200;i+=1){try{const list=await(await fetch(`${base}/json/list`)).json();const page=list.find((entry)=>entry.type==='page'&&entry.webSocketDebuggerUrl);if(page)return page;}catch{}await sleep(50);}throw new Error('No Chromium page target.');}
async function connect(url){const socket=new WebSocket(url);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});let id=0;const pending=new Map();socket.addEventListener('message',(event)=>{const msg=JSON.parse(String(event.data));if(!msg.id||!pending.has(msg.id))return;const request=pending.get(msg.id);pending.delete(msg.id);msg.error?request.reject(new Error(msg.error.message)):request.resolve(msg.result||{});});const send=(method,params={})=>new Promise((resolve,reject)=>{const requestId=++id;pending.set(requestId,{resolve,reject});socket.send(JSON.stringify({id:requestId,method,params}));});return{socket,send};}
async function evaluate(cdp,expression){const result=await cdp.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text||'Browser evaluation failed.');return result.result?.value;}
async function stop(proc){if(!proc||proc.exitCode!==null)return;proc.kill('SIGTERM');await sleep(350);if(proc.exitCode===null)proc.kill('SIGKILL');}

const server=createServer((req,res)=>{const raw=decodeURIComponent((req.url||'/').split('?')[0]),rel=raw==='/'?'/roof-bay.html':raw,file=normalize(join(root,rel));if(!file.startsWith(root))return res.writeHead(403).end();res.setHeader('Content-Type',mime.get(extname(file))||'application/octet-stream');const stream=createReadStream(file);stream.on('error',()=>res.writeHead(404).end());stream.pipe(res);});
await new Promise((resolve)=>server.listen(0,'127.0.0.1',resolve));
const {port}=server.address();const work=await mkdtemp(join(tmpdir(),'ft-roof-bay-zone-v5-')),profile=join(work,'profile');let proc,cdp;

try{
  proc=spawn(chromePath(),['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--remote-debugging-port=0',`--user-data-dir=${profile}`,`http://127.0.0.1:${port}/roof-bay.html?build=pressure-zone-v5`],{stdio:'ignore'});
  const dp=await waitPort(profile,proc),page=await target(`http://127.0.0.1:${dp}`);cdp=await connect(page.webSocketDebuggerUrl);await cdp.send('Runtime.enable');

  let state=null;for(let i=0;i<180;i+=1){state=await evaluate(cdp,`(() => ({ready:document.readyState,model:window.__FT_ROOF_BAY_MODEL__||null,bridge:window.__FT_ROOF_BAY_PRESSURE_ZONE_BRIDGE__||null,types:document.querySelectorAll('.roof-bay-zone-type').length,status:document.querySelector('[data-rb-zone-status]')?.textContent||'',warning:document.querySelector('[data-rb-zone-warning]')?.textContent||''}))()`);if(state?.ready==='complete'&&state.model&&state.bridge&&state.types===3)break;await sleep(100);}
  if(!state?.bridge)throw new Error(`Pressure-zone bridge did not mount: ${JSON.stringify(state)}`);
  if(state.bridge.schemaVersion!=='futoltech.roof-pressure-zones/1')throw new Error(`Unexpected pressure-zone schema: ${JSON.stringify(state.bridge)}`);
  if(state.bridge.status!=='UNRESOLVED'||state.bridge.activePressureModel!=='manual-uniform')throw new Error(`M2 zoning state was promoted incorrectly: ${JSON.stringify(state.bridge)}`);
  if(JSON.stringify(state.bridge.regionTypes)!==JSON.stringify(['field','edge','corner']))throw new Error(`Reserved region types changed: ${JSON.stringify(state.bridge.regionTypes)}`);
  if(state.bridge.regionCount!==0||state.bridge.codeBasis!==null||state.bridge.assignedPurlinCount!==0)throw new Error(`M2 invented zone geometry, code basis or assignments: ${JSON.stringify(state.bridge)}`);
  if(state.bridge.coordinateFrame.xExtentM!==3||state.bridge.coordinateFrame.yExtentM!==4)throw new Error(`Roof-local coordinate frame does not match default bay geometry: ${JSON.stringify(state.bridge.coordinateFrame)}`);
  if(state.types!==3||!/UNRESOLVED/.test(state.status)||!/NO CODE ZONES APPLIED/.test(state.warning))throw new Error(`Pressure-zone UI boundary is not explicit: ${JSON.stringify(state)}`);

  await evaluate(cdp,`document.querySelector('[data-rb-export-project]').click()`);await sleep(120);
  const project=await evaluate(cdp,`window.__FT_LAST_ROOF_BAY_PROJECT__||null`);
  if(!project?.pressureZoning)throw new Error(`Project export omitted pressure-zoning placeholder: ${JSON.stringify(project)}`);
  if(project.pressureZoning.schemaVersion!=='futoltech.roof-pressure-zones/1'||project.pressureZoning.status!=='UNRESOLVED')throw new Error(`Exported pressure-zoning placeholder is invalid: ${JSON.stringify(project.pressureZoning)}`);
  if(project.pressureZoning.regions.length!==0||project.pressureZoning.codeBasis!==null)throw new Error(`Exported M2 project invented M3 regions/code basis: ${JSON.stringify(project.pressureZoning)}`);
  if(project.geometry.roofPlaneFrame.xExtentM!==3||project.geometry.roofPlaneFrame.yExtentM!==4)throw new Error(`Exported roof-local frame mismatch: ${JSON.stringify(project.geometry.roofPlaneFrame)}`);

  console.log('Roof Bay pressure-zone V5 Chromium QA passed: field/edge/corner schema is reserved, roof-local geometry is exported, manual uniform pressure remains active, and M2 creates zero code-derived zone polygons or assignments.');
} finally {try{cdp?.socket.close();}catch{}await stop(proc);await new Promise((resolve)=>server.close(resolve));await rm(work,{recursive:true,force:true});}
