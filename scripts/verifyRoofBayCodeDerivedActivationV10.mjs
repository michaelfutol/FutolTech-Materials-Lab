import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { extname, join, normalize } from 'node:path';
import { tmpdir } from 'node:os';
import { createRoofBayActivationBenchmark } from './fixtures/roofBayCodeDerivedActivationBenchmark.mjs';

const root=process.cwd();
const mime=new Map([['.html','text/html; charset=utf-8'],['.js','text/javascript; charset=utf-8'],['.mjs','text/javascript; charset=utf-8'],['.css','text/css; charset=utf-8'],['.json','application/json; charset=utf-8']]);
const sleep=(ms)=>new Promise((resolve)=>setTimeout(resolve,ms));
function chromePath(){for(const name of ['google-chrome','google-chrome-stable','chromium','chromium-browser']){const r=spawnSync('which',[name],{encoding:'utf8'});if(r.status===0&&r.stdout.trim())return r.stdout.trim();}throw new Error('Chromium is required for M3 code-derived activation QA.');}
async function waitPort(dir,proc){const file=join(dir,'DevToolsActivePort');for(let i=0;i<500;i+=1){if(proc.exitCode!==null)throw new Error(`Chromium exited early ${proc.exitCode}`);try{const port=Number((await readFile(file,'utf8')).split(/\r?\n/)[0]);if(port>0)return port;}catch{}await sleep(50);}throw new Error('Timed out waiting for Chromium.');}
async function target(base){for(let i=0;i<200;i+=1){try{const list=await(await fetch(`${base}/json/list`)).json();const page=list.find((entry)=>entry.type==='page'&&entry.webSocketDebuggerUrl);if(page)return page;}catch{}await sleep(50);}throw new Error('No Chromium page target.');}
async function connect(url){const socket=new WebSocket(url);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});let id=0;const pending=new Map();socket.addEventListener('message',(event)=>{const msg=JSON.parse(String(event.data));if(!msg.id||!pending.has(msg.id))return;const request=pending.get(msg.id);pending.delete(msg.id);msg.error?request.reject(new Error(msg.error.message)):request.resolve(msg.result||{});});const send=(method,params={})=>new Promise((resolve,reject)=>{const requestId=++id;pending.set(requestId,{resolve,reject});socket.send(JSON.stringify({id:requestId,method,params}));});return{socket,send};}
async function evaluate(cdp,expression){const result=await cdp.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text||'Browser evaluation failed.');return result.result?.value;}
async function stop(proc){if(!proc||proc.exitCode!==null)return;proc.kill('SIGTERM');await sleep(350);if(proc.exitCode===null)proc.kill('SIGKILL');}

const completeBenchmark=createRoofBayActivationBenchmark({rainResolved:true});
const unresolvedRainBenchmark=createRoofBayActivationBenchmark({rainResolved:false});
if(!completeBenchmark.selectedCombinationCaseId)throw new Error('Activation benchmark did not produce a complete NSCP-203-4 away case.');
const selected=completeBenchmark.windRoofStrengthCombinationAssembly.cases.find((item)=>item.combinationCaseId===completeBenchmark.selectedCombinationCaseId);
const server=createServer((req,res)=>{const raw=decodeURIComponent((req.url||'/').split('?')[0]),rel=raw==='/'?'/roof-bay.html':raw,file=normalize(join(root,rel));if(!file.startsWith(root))return res.writeHead(403).end();res.setHeader('Content-Type',mime.get(extname(file))||'application/octet-stream');const stream=createReadStream(file);stream.on('error',()=>res.writeHead(404).end());stream.pipe(res);});
await new Promise((resolve)=>server.listen(0,'127.0.0.1',resolve));
const {port}=server.address();const work=await mkdtemp(join(tmpdir(),'ft-code-derived-v10-')),profile=join(work,'profile');let proc,cdp;

try{
  proc=spawn(chromePath(),['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--remote-debugging-port=0',`--user-data-dir=${profile}`,`http://127.0.0.1:${port}/roof-bay.html?build=code-derived-v10`],{stdio:'ignore'});
  const dp=await waitPort(profile,proc),page=await target(`http://127.0.0.1:${dp}`);cdp=await connect(page.webSocketDebuggerUrl);await cdp.send('Runtime.enable');

  let initial=null;for(let i=0;i<180;i+=1){initial=await evaluate(cdp,`(() => ({ready:document.readyState,api:window.__FT_ROOF_BAY_CODE_DERIVED_API__?.mounted||false,ui:window.__FT_ROOF_BAY_CODE_DERIVED_UI__||null,model:window.__FT_ROOF_BAY_MODEL__?.inputs||null,status:document.querySelector('[data-rb-cda-status]')?.textContent||''}))()`);if(initial?.ready==='complete'&&initial.api&&initial.ui?.mounted&&initial.model)break;await sleep(100);}
  if(!initial?.api||!initial?.ui?.mounted)throw new Error(`Code-derived V10 UI did not mount: ${JSON.stringify(initial)}`);
  if(initial.ui.active!==false||initial.ui.activeDemandModel!=='manual-uniform'||initial.ui.manualFallbackRetained!==true||!/MANUAL FALLBACK ACTIVE/.test(initial.status))throw new Error(`V10 must start in manual fallback: ${JSON.stringify(initial)}`);

  const windJson=JSON.stringify(completeBenchmark.windProjectInputAcceptance);
  const contextJson=JSON.stringify(completeBenchmark.windPressureContextAcceptance);
  const assemblyJson=JSON.stringify(completeBenchmark.windRoofStrengthCombinationAssembly);
  const selectedId=JSON.stringify(completeBenchmark.selectedCombinationCaseId);
  await evaluate(cdp,`(() => {
    window.__FT_WIND_PROJECT_INPUT_ACCEPTANCE__=${windJson};
    window.__FT_WIND_PRESSURE_CONTEXT_ACCEPTANCE__=${contextJson};
    return window.__FT_ROOF_BAY_CODE_DERIVED_API__.activateRecord(${assemblyJson},{
      selectedCombinationCaseId:${selectedId},
      engineerConfirmedPurlinSelfWeightMatchesProjectSection:true,
      purlinSelfWeightCompatibilitySourceReference:'Browser QA confirms benchmark self-weight basis matches active catalog section',
      activationSourceReference:'M3 V10 Chromium controlled activation QA'
    });
  })()`);await sleep(120);

  const active=await evaluate(cdp,`(() => ({ui:window.__FT_ROOF_BAY_CODE_DERIVED_UI__,record:window.__FT_ROOF_BAY_CODE_DERIVED_ACTIVATION__,mode:window.__FT_ROOF_BAY_ACTIVE_DEMAND_MODE__,status:document.querySelector('[data-rb-cda-status]')?.textContent||'',normal:document.querySelector('[data-rb-cda-normal]')?.textContent||'',boundary:document.querySelector('[data-rb-cda-boundary]')?.textContent||''}))()`);
  if(!active.ui?.active||active.ui.activeDemandModel!=='code-derived-strength-combination'||active.mode?.mode!=='code-derived-strength-combination')throw new Error(`Complete verified case did not activate: ${JSON.stringify(active)}`);
  if(active.record?.selectedCombinationCaseId!==completeBenchmark.selectedCombinationCaseId||active.record?.displayResult?.equilibrium?.pass!==true)throw new Error(`Activation lost selected verified case/equilibrium: ${JSON.stringify(active.record)}`);
  if(active.record?.manualUniformFallbackRetained!==true||!/COMPLETE CASE ACTIVE/.test(active.status)||!/Piecewise purlin stress\/deflection/.test(active.boundary))throw new Error(`Activation boundary/manual fallback not visible: ${JSON.stringify(active)}`);
  if(!active.normal.includes(selected.fullCombinationResult.roofNormalForceKN.toFixed(6)))throw new Error(`Displayed roof-normal force is not the selected PR #133 result: ${JSON.stringify(active.normal)}`);

  const exported=await evaluate(cdp,`(() => {const project=window.__FT_ROOF_BAY_PRESSURE_CONTEXT_PROJECT_EXPORT__.buildProject();window.__FT_LAST_ROOF_BAY_PROJECT__=project;return import('./src/interchange/roofBayProject.js').then(({serializeRoofBayProject})=>({project,json:serializeRoofBayProject(project)}));})()`);
  if(exported.project?.codeDerivedActivation?.selectedCombinationCaseId!==completeBenchmark.selectedCombinationCaseId)throw new Error('Roof Bay project export did not attach the validated code-derived activation record.');
  if(!exported.json.includes('codeDerivedActivation')||!exported.json.includes(completeBenchmark.selectedCombinationCaseId))throw new Error('Serialized Roof Bay project JSON lost the code-derived activation attachment.');
  if(exported.project?.pressureZoning?.activePressureModel!=='manual-uniform')throw new Error('Controlled activation mutated the retained M2 manual pressure-zone fallback.');

  await evaluate(cdp,`(() => {const el=document.querySelector('[data-rb-dead]');el.value='0.25';el.dispatchEvent(new Event('input',{bubbles:true}));})()`);await sleep(80);
  const invalidated=await evaluate(cdp,`({ui:window.__FT_ROOF_BAY_CODE_DERIVED_UI__,record:window.__FT_ROOF_BAY_CODE_DERIVED_ACTIVATION__,mode:window.__FT_ROOF_BAY_ACTIVE_DEMAND_MODE__,boundary:document.querySelector('[data-rb-cda-boundary]')?.textContent||''})`);
  if(invalidated.ui?.active!==false||invalidated.record!==null||invalidated.mode?.mode!=='manual-uniform'||!/INVALIDATED/.test(invalidated.boundary))throw new Error(`Roof Bay input edit did not invalidate activation: ${JSON.stringify(invalidated)}`);

  await evaluate(cdp,`(() => {const el=document.querySelector('[data-rb-dead]');el.value='0.20';el.dispatchEvent(new Event('input',{bubbles:true}));window.__FT_ROOF_BAY_CODE_DERIVED_API__.loadRecord(${JSON.stringify(unresolvedRainBenchmark.windRoofStrengthCombinationAssembly)});})()`);await sleep(80);
  const unresolved=await evaluate(cdp,`({ui:window.__FT_ROOF_BAY_CODE_DERIVED_UI__,options:[...document.querySelector('[data-rb-cda-case]').options].map((o)=>o.textContent)})`);
  if(unresolved.ui?.completeCaseCount!==2)throw new Error(`Unresolved rain should expose only the two complete 203-6 direction cases: ${JSON.stringify(unresolved)}`);
  if(unresolved.options.some((text)=>/203-3|203-4/.test(text)))throw new Error(`Blocked 203-3/203-4 cases leaked into activation choices: ${JSON.stringify(unresolved.options)}`);

  await evaluate(cdp,`(() => {document.querySelector('[data-rb-cda-manual]').click();})()`);await sleep(50);
  const manual=await evaluate(cdp,`({ui:window.__FT_ROOF_BAY_CODE_DERIVED_UI__,record:window.__FT_ROOF_BAY_CODE_DERIVED_ACTIVATION__,mode:window.__FT_ROOF_BAY_ACTIVE_DEMAND_MODE__})`);
  if(manual.ui?.active!==false||manual.record!==null||manual.mode?.mode!=='manual-uniform')throw new Error(`Manual fallback control did not restore manual mode: ${JSON.stringify(manual)}`);

  console.log('M3 code-derived Roof Bay activation V10 Chromium QA passed: complete verified case activates without rewriting the M2 solver, project JSON carries the validated activation, project edits invalidate it, unresolved-rain cases stay blocked, and manual fallback remains available.');
} finally {try{cdp?.socket.close();}catch{}await stop(proc);await new Promise((resolve)=>server.close(resolve));await rm(work,{recursive:true,force:true});}