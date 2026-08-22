import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { extname, join, normalize } from 'node:path';
import { tmpdir } from 'node:os';

const root=process.cwd();
const mime=new Map([['.html','text/html; charset=utf-8'],['.js','text/javascript; charset=utf-8'],['.css','text/css; charset=utf-8'],['.json','application/json; charset=utf-8']]);
const sleep=(ms)=>new Promise((resolve)=>setTimeout(resolve,ms));
function chromePath(){for(const name of ['google-chrome','google-chrome-stable','chromium','chromium-browser']){const r=spawnSync('which',[name],{encoding:'utf8'});if(r.status===0&&r.stdout.trim())return r.stdout.trim();}throw new Error('Chromium is required for Roof Bay interaction QA.');}
async function waitPort(dir,proc){const file=join(dir,'DevToolsActivePort');for(let i=0;i<500;i+=1){if(proc.exitCode!==null)throw new Error(`Chromium exited early ${proc.exitCode}`);try{const port=Number((await readFile(file,'utf8')).split(/\r?\n/)[0]);if(port>0)return port;}catch{}await sleep(50);}throw new Error('Timed out waiting for Chromium.');}
async function target(base){for(let i=0;i<200;i+=1){try{const list=await(await fetch(`${base}/json/list`)).json();const page=list.find((entry)=>entry.type==='page'&&entry.webSocketDebuggerUrl);if(page)return page;}catch{}await sleep(50);}throw new Error('No Chromium page target.');}
async function connect(url){const socket=new WebSocket(url);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});let id=0;const pending=new Map();socket.addEventListener('message',(event)=>{const msg=JSON.parse(String(event.data));if(!msg.id||!pending.has(msg.id))return;const request=pending.get(msg.id);pending.delete(msg.id);msg.error?request.reject(new Error(msg.error.message)):request.resolve(msg.result||{});});const send=(method,params={})=>new Promise((resolve,reject)=>{const requestId=++id;pending.set(requestId,{resolve,reject});socket.send(JSON.stringify({id:requestId,method,params}));});return{socket,send};}
async function evaluate(cdp,expression){const result=await cdp.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text||'Browser evaluation failed.');return result.result?.value;}
async function stop(proc){if(!proc||proc.exitCode!==null)return;proc.kill('SIGTERM');await sleep(350);if(proc.exitCode===null)proc.kill('SIGKILL');}

const server=createServer((req,res)=>{const raw=decodeURIComponent((req.url||'/').split('?')[0]),rel=raw==='/'?'/roof-bay.html':raw,file=normalize(join(root,rel));if(!file.startsWith(root))return res.writeHead(403).end();res.setHeader('Content-Type',mime.get(extname(file))||'application/octet-stream');const stream=createReadStream(file);stream.on('error',()=>res.writeHead(404).end());stream.pipe(res);});
await new Promise((resolve)=>server.listen(0,'127.0.0.1',resolve));
const {port}=server.address();const work=await mkdtemp(join(tmpdir(),'ft-roof-bay-v2-')),profile=join(work,'profile');let proc,cdp;

try{
  proc=spawn(chromePath(),['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--remote-debugging-port=0',`--user-data-dir=${profile}`,`http://127.0.0.1:${port}/roof-bay.html?build=interaction-v2`],{stdio:'ignore'});
  const dp=await waitPort(profile,proc),page=await target(`http://127.0.0.1:${dp}`);cdp=await connect(page.webSocketDebuggerUrl);await cdp.send('Runtime.enable');
  let ready=null;for(let i=0;i<180;i+=1){ready=await evaluate(cdp,`(() => ({ready:document.readyState,model:!!window.__FT_ROOF_BAY_MODEL__,selection:window.__FT_ROOF_BAY_SELECTION__||null,overlay:!!document.querySelector('[data-rb-selection-overlay]'),exploded:!!document.querySelector('[data-rb-exploded-canvas]'),selectedRows:document.querySelectorAll('[data-rb-body] tr.is-selected').length,label:document.querySelector('[data-rb-selected-label]')?.textContent||'',trace:document.querySelector('[data-rb-focus-trace]')?.textContent||''}))()`);if(ready?.ready==='complete'&&ready.model&&ready.selection&&ready.overlay&&ready.exploded)break;await sleep(100);}
  if(!ready?.selection)throw new Error(`Roof Bay interaction V2 did not mount: ${JSON.stringify(ready)}`);
  if(ready.selectedRows!==1||ready.selection.index!==1||!/P2/.test(ready.label))throw new Error(`Initial selected purlin state mismatch: ${JSON.stringify(ready)}`);
  if(!/Reaction per rafter/.test(ready.trace)||!/UNRESOLVED/.test(ready.trace))throw new Error(`Selected formula/boundary trace is incomplete: ${ready.trace}`);

  await evaluate(cdp,`document.querySelectorAll('[data-rb-body] tr')[2].click()`);await sleep(180);
  const selected=await evaluate(cdp,`(() => ({selection:window.__FT_ROOF_BAY_SELECTION__,label:document.querySelector('[data-rb-selected-label]').textContent,selectedRows:document.querySelectorAll('[data-rb-body] tr.is-selected').length,trace:document.querySelector('[data-rb-focus-trace]').textContent}))()`);
  if(selected.selection.index!==2||!/P3/.test(selected.label)||selected.selectedRows!==1)throw new Error(`Row selection did not synchronize: ${JSON.stringify(selected)}`);
  if(!/Simply-supported M/.test(selected.trace)||!/Gross utilization/.test(selected.trace))throw new Error('Selected purlin trace is not synchronized to formulas/results.');

  await evaluate(cdp,`document.querySelector('[data-rb-export-project]').click()`);await sleep(100);
  const project=await evaluate(cdp,`window.__FT_LAST_ROOF_BAY_PROJECT__||null`);
  if(!project||project.schemaVersion!=='futoltech.roof-bay-project/1')throw new Error(`Stable project export was not created: ${JSON.stringify(project)}`);
  for(const key of ['roofSheetCapacity','fastenerCapacity','purlinToRafterConnectionCapacity','rafterOrTrussMemberCapacity','coldFormedLocalDistortionalLTB','codeWindZoning'])if(project.analysisBoundary?.[key]!=='UNRESOLVED')throw new Error(`Project export promoted unresolved ${key}: ${JSON.stringify(project.analysisBoundary)}`);

  await evaluate(cdp,`document.querySelector('[data-rb-exploded-toggle]').click()`);await sleep(80);
  const off=await evaluate(cdp,`({selection:window.__FT_ROOF_BAY_SELECTION__,hidden:document.querySelector('[data-rb-exploded-panel]').hidden,text:document.querySelector('[data-rb-exploded-toggle]').textContent})`);
  if(off.selection.exploded!==false||!off.hidden||!/OFF/.test(off.text))throw new Error(`Exploded-view toggle failed: ${JSON.stringify(off)}`);

  console.log(`Roof Bay interaction V2 Chromium QA passed: selectable P3 trace, highlighted load path, stable ${project.schemaVersion} export, and unresolved design boundaries preserved.`);
} finally {try{cdp?.socket.close();}catch{}await stop(proc);await new Promise((resolve)=>server.close(resolve));await rm(work,{recursive:true,force:true});}
