import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { extname, join, normalize } from 'node:path';
import { tmpdir } from 'node:os';

const root=process.cwd();
const mime=new Map([['.html','text/html; charset=utf-8'],['.js','text/javascript; charset=utf-8'],['.css','text/css; charset=utf-8'],['.json','application/json; charset=utf-8']]);
const sleep=(ms)=>new Promise((resolve)=>setTimeout(resolve,ms));
function chromePath(){for(const name of ['google-chrome','google-chrome-stable','chromium','chromium-browser']){const r=spawnSync('which',[name],{encoding:'utf8'});if(r.status===0&&r.stdout.trim())return r.stdout.trim();}throw new Error('Chromium is required for M3 wind basis QA.');}
async function waitPort(dir,proc){const file=join(dir,'DevToolsActivePort');for(let i=0;i<500;i+=1){if(proc.exitCode!==null)throw new Error(`Chromium exited early ${proc.exitCode}`);try{const port=Number((await readFile(file,'utf8')).split(/\r?\n/)[0]);if(port>0)return port;}catch{}await sleep(50);}throw new Error('Timed out waiting for Chromium.');}
async function target(base){for(let i=0;i<200;i+=1){try{const list=await(await fetch(`${base}/json/list`)).json();const page=list.find((entry)=>entry.type==='page'&&entry.webSocketDebuggerUrl);if(page)return page;}catch{}await sleep(50);}throw new Error('No Chromium page target.');}
async function connect(url){const socket=new WebSocket(url);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});let id=0;const pending=new Map();socket.addEventListener('message',(event)=>{const msg=JSON.parse(String(event.data));if(!msg.id||!pending.has(msg.id))return;const request=pending.get(msg.id);pending.delete(msg.id);msg.error?request.reject(new Error(msg.error.message)):request.resolve(msg.result||{});});const send=(method,params={})=>new Promise((resolve,reject)=>{const requestId=++id;pending.set(requestId,{resolve,reject});socket.send(JSON.stringify({id:requestId,method,params}));});return{socket,send};}
async function evaluate(cdp,expression){const result=await cdp.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text||'Browser evaluation failed.');return result.result?.value;}
async function stop(proc){if(!proc||proc.exitCode!==null)return;proc.kill('SIGTERM');await sleep(350);if(proc.exitCode===null)proc.kill('SIGKILL');}

const server=createServer((req,res)=>{const raw=decodeURIComponent((req.url||'/').split('?')[0]),rel=raw==='/'?'/roof-bay.html':raw,file=normalize(join(root,rel));if(!file.startsWith(root))return res.writeHead(403).end();res.setHeader('Content-Type',mime.get(extname(file))||'application/octet-stream');const stream=createReadStream(file);stream.on('error',()=>res.writeHead(404).end());stream.pipe(res);});
await new Promise((resolve)=>server.listen(0,'127.0.0.1',resolve));
const {port}=server.address();const work=await mkdtemp(join(tmpdir(),'ft-wind-basis-v6-')),profile=join(work,'profile');let proc,cdp;

try{
  proc=spawn(chromePath(),['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--remote-debugging-port=0',`--user-data-dir=${profile}`,`http://127.0.0.1:${port}/roof-bay.html?build=wind-basis-v6`],{stdio:'ignore'});
  const dp=await waitPort(profile,proc),page=await target(`http://127.0.0.1:${dp}`);cdp=await connect(page.webSocketDebuggerUrl);await cdp.send('Runtime.enable');

  let state=null;for(let i=0;i<180;i+=1){state=await evaluate(cdp,`(() => ({ready:document.readyState,basis:window.__FT_WIND_DESIGN_BASIS__||null,ui:window.__FT_WIND_BASIS_UI__||null,inputCards:document.querySelectorAll('[data-rb-wind-input]').length,status:document.querySelector('[data-rb-wind-basis-status]')?.textContent||'',boundary:document.querySelector('[data-rb-wind-boundary]')?.textContent||'',sourceLinks:document.querySelectorAll('[data-rb-wind-evidence] a').length,pressure:window.__FT_ROOF_BAY_MODEL__?.pressureZoning||null}))()`);if(state?.ready==='complete'&&state.basis&&state.ui&&state.inputCards===8)break;await sleep(100);}
  if(!state?.basis||!state?.ui)throw new Error(`M3 wind basis UI did not mount: ${JSON.stringify(state)}`);
  if(state.basis.schemaVersion!=='futoltech.wind-design-basis/1')throw new Error(`Unexpected wind basis schema: ${JSON.stringify(state.basis)}`);
  if(state.basis.adoptedCode.profileId!=='ph-nscp-2015-v1-7e-2p')throw new Error(`Unexpected adopted code profile: ${JSON.stringify(state.basis.adoptedCode)}`);
  if(state.basis.adoptedCode.edition!=='7th Edition'||state.basis.adoptedCode.printing!=='2nd Printing')throw new Error(`Code edition/printing provenance changed unexpectedly: ${JSON.stringify(state.basis.adoptedCode)}`);
  if(state.basis.calculationStatus!=='BLOCKED'||state.ui.calculationStatus!=='BLOCKED')throw new Error(`Code wind calculation was promoted before formulas exist: ${JSON.stringify(state.ui)}`);
  if(state.ui.unresolvedInputCount!==8||state.inputCards!==8)throw new Error(`Required M3 input set is incomplete or prematurely resolved: ${JSON.stringify(state.ui)}`);
  if(state.ui.evidenceCount<2||state.sourceLinks<2)throw new Error(`Public provenance links missing: ${JSON.stringify(state)}`);
  if(Object.values(state.ui.formulaStatuses).some((value)=>value!=='UNIMPLEMENTED'))throw new Error(`M3 formula status promoted prematurely: ${JSON.stringify(state.ui.formulaStatuses)}`);
  if(!/BLOCKED/.test(state.status)||!/NO CODE WIND PRESSURE CALCULATED/.test(state.boundary))throw new Error(`Visible engineering boundary is not explicit: ${JSON.stringify(state)}`);
  if(state.pressure?.activePressureModel!=='manual-uniform'||state.pressure?.codeBasis!==null||state.pressure?.regions?.length!==0)throw new Error(`M2 manual pressure path was silently replaced by the provenance slice: ${JSON.stringify(state.pressure)}`);

  await evaluate(cdp,`document.querySelector('[data-rb-export-project]').click()`);await sleep(120);
  const project=await evaluate(cdp,`window.__FT_LAST_ROOF_BAY_PROJECT__||null`);
  if(!project?.windDesignBasis)throw new Error(`Roof Bay project export omitted windDesignBasis: ${JSON.stringify(project)}`);
  if(project.windDesignBasis.adoptedCode.profileId!=='ph-nscp-2015-v1-7e-2p'||project.windDesignBasis.calculationStatus!=='BLOCKED')throw new Error(`Exported wind basis is not the expected provenance-only state: ${JSON.stringify(project.windDesignBasis)}`);
  if(project.pressureZoning.codeBasis!==null||project.pressureZoning.activePressureModel!=='manual-uniform')throw new Error(`Project export activated code pressure before solver implementation: ${JSON.stringify(project.pressureZoning)}`);

  console.log('M3 Wind Basis V6 Chromium QA passed: NSCP 2015 Volume 1 7th Edition 2nd Printing identity/provenance is visible and exported, eight required input families remain unresolved, every code-wind formula stays UNIMPLEMENTED/BLOCKED, and M2 manual pressure remains the active load path.');
} finally {try{cdp?.socket.close();}catch{}await stop(proc);await new Promise((resolve)=>server.close(resolve));await rm(work,{recursive:true,force:true});}
