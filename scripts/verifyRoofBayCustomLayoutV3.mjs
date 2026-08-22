import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { extname, join, normalize } from 'node:path';
import { tmpdir } from 'node:os';

const root=process.cwd();
const mime=new Map([['.html','text/html; charset=utf-8'],['.js','text/javascript; charset=utf-8'],['.css','text/css; charset=utf-8'],['.json','application/json; charset=utf-8']]);
const sleep=(ms)=>new Promise((resolve)=>setTimeout(resolve,ms));
function chromePath(){for(const name of ['google-chrome','google-chrome-stable','chromium','chromium-browser']){const r=spawnSync('which',[name],{encoding:'utf8'});if(r.status===0&&r.stdout.trim())return r.stdout.trim();}throw new Error('Chromium is required for Roof Bay custom-layout QA.');}
async function waitPort(dir,proc){const file=join(dir,'DevToolsActivePort');for(let i=0;i<500;i+=1){if(proc.exitCode!==null)throw new Error(`Chromium exited early ${proc.exitCode}`);try{const port=Number((await readFile(file,'utf8')).split(/\r?\n/)[0]);if(port>0)return port;}catch{}await sleep(50);}throw new Error('Timed out waiting for Chromium.');}
async function target(base){for(let i=0;i<200;i+=1){try{const list=await(await fetch(`${base}/json/list`)).json();const page=list.find((entry)=>entry.type==='page'&&entry.webSocketDebuggerUrl);if(page)return page;}catch{}await sleep(50);}throw new Error('No Chromium page target.');}
async function connect(url){const socket=new WebSocket(url);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});let id=0;const pending=new Map();socket.addEventListener('message',(event)=>{const msg=JSON.parse(String(event.data));if(!msg.id||!pending.has(msg.id))return;const request=pending.get(msg.id);pending.delete(msg.id);msg.error?request.reject(new Error(msg.error.message)):request.resolve(msg.result||{});});const send=(method,params={})=>new Promise((resolve,reject)=>{const requestId=++id;pending.set(requestId,{resolve,reject});socket.send(JSON.stringify({id:requestId,method,params}));});return{socket,send};}
async function evaluate(cdp,expression){const result=await cdp.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text||'Browser evaluation failed.');return result.result?.value;}
async function stop(proc){if(!proc||proc.exitCode!==null)return;proc.kill('SIGTERM');await sleep(350);if(proc.exitCode===null)proc.kill('SIGKILL');}

const server=createServer((req,res)=>{const raw=decodeURIComponent((req.url||'/').split('?')[0]),rel=raw==='/'?'/roof-bay.html':raw,file=normalize(join(root,rel));if(!file.startsWith(root))return res.writeHead(403).end();res.setHeader('Content-Type',mime.get(extname(file))||'application/octet-stream');const stream=createReadStream(file);stream.on('error',()=>res.writeHead(404).end());stream.pipe(res);});
await new Promise((resolve)=>server.listen(0,'127.0.0.1',resolve));
const {port}=server.address();const work=await mkdtemp(join(tmpdir(),'ft-roof-bay-v3-')),profile=join(work,'profile');let proc,cdp;

try{
  proc=spawn(chromePath(),['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--remote-debugging-port=0',`--user-data-dir=${profile}`,`http://127.0.0.1:${port}/roof-bay.html?build=custom-layout-v3`],{stdio:'ignore'});
  const dp=await waitPort(profile,proc),page=await target(`http://127.0.0.1:${dp}`);cdp=await connect(page.webSocketDebuggerUrl);await cdp.send('Runtime.enable');

  let ready=null;for(let i=0;i<180;i+=1){ready=await evaluate(cdp,`(() => ({ready:document.readyState,model:window.__FT_ROOF_BAY_MODEL__||null,layout:!!window.__FT_ROOF_BAY_LAYOUT_UI__,mode:document.querySelector('[data-rb-layout-mode]')?.value||null,custom:!!document.querySelector('[data-rb-custom-stations]')}))()`);if(ready?.ready==='complete'&&ready.model&&ready.layout&&ready.custom)break;await sleep(100);}
  if(!ready?.layout)throw new Error(`Roof Bay custom-layout UI did not mount: ${JSON.stringify(ready)}`);
  if(ready.model.geometry.layoutMode!=='equal-max-spacing'||ready.model.geometry.purlinCount!==6)throw new Error(`Default equal layout changed unexpectedly: ${JSON.stringify(ready.model.geometry)}`);

  await evaluate(cdp,`(() => {const mode=document.querySelector('[data-rb-layout-mode]');mode.value='custom-stations';mode.dispatchEvent(new Event('change',{bubbles:true}));const input=document.querySelector('[data-rb-custom-stations]');input.value='0.20, 0.90, 1.75, 2.60, 3.50';input.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await sleep(250);
  const custom=await evaluate(cdp,`(() => {const m=window.__FT_ROOF_BAY_MODEL__;return {mode:m.geometry.layoutMode,stations:m.geometry.stationsM,widthSum:m.geometry.tributaryWidthsM.reduce((a,b)=>a+b,0),firstBand:[m.purlins[0].tributaryStartM,m.purlins[0].tributaryEndM],lastBand:[m.purlins.at(-1).tributaryStartM,m.purlins.at(-1).tributaryEndM],count:m.geometry.purlinCount,equilibrium:m.equilibrium.pass,spacingDisabled:document.querySelector('[data-rb-spacing]').disabled,status:document.querySelector('[data-rb-layout-status]').textContent};})()`);
  if(custom.mode!=='custom-stations'||custom.count!==5)throw new Error(`Custom station model was not applied: ${JSON.stringify(custom)}`);
  if(JSON.stringify(custom.stations)!==JSON.stringify([0.2,0.9,1.75,2.6,3.5]))throw new Error(`Custom stations changed unexpectedly: ${JSON.stringify(custom.stations)}`);
  if(custom.firstBand[0]!==0||custom.lastBand[1]!==4)throw new Error(`Offset edge tributary bands do not terminate at physical roof boundaries: ${JSON.stringify(custom)}`);
  if(Math.abs(custom.firstBand[1]-0.55)>1e-10)throw new Error(`First custom tributary midline is wrong: ${JSON.stringify(custom.firstBand)}`);
  if(Math.abs(custom.widthSum-4)>1e-10||!custom.equilibrium)throw new Error(`Custom tributary/load conservation failed: ${JSON.stringify(custom)}`);
  if(!custom.spacingDisabled||!/Custom layout applied/.test(custom.status))throw new Error(`Custom layout controls are not synchronized: ${JSON.stringify(custom)}`);

  await evaluate(cdp,`document.querySelectorAll('[data-rb-body] tr')[0].click()`);await sleep(100);
  const trace=await evaluate(cdp,`document.querySelector('[data-rb-focus-trace]').textContent`);
  if(!/Tributary band = 0 to 0\.55 m/.test(trace))throw new Error(`Selected edge purlin trace does not expose the exact physical tributary band: ${trace}`);

  await evaluate(cdp,`document.querySelector('[data-rb-export-project]').click()`);await sleep(100);
  const project=await evaluate(cdp,`window.__FT_LAST_ROOF_BAY_PROJECT__||null`);
  if(!project||project.geometry.layoutMode!=='custom-stations')throw new Error(`Custom project export missing layout mode: ${JSON.stringify(project)}`);
  if(JSON.stringify(project.geometry.purlinStationsM)!==JSON.stringify([0.2,0.9,1.75,2.6,3.5]))throw new Error(`Custom project export lost station list: ${JSON.stringify(project.geometry)}`);

  await evaluate(cdp,`(() => {const mode=document.querySelector('[data-rb-layout-mode]');mode.value='equal-max-spacing';mode.dispatchEvent(new Event('change',{bubbles:true}));})()`);await sleep(180);
  const equal=await evaluate(cdp,`(() => ({mode:window.__FT_ROOF_BAY_MODEL__.geometry.layoutMode,count:window.__FT_ROOF_BAY_MODEL__.geometry.purlinCount,spacingDisabled:document.querySelector('[data-rb-spacing]').disabled}))()`);
  if(equal.mode!=='equal-max-spacing'||equal.count!==6||equal.spacingDisabled)throw new Error(`Equal layout restoration failed: ${JSON.stringify(equal)}`);

  console.log(`Roof Bay custom-layout V3 Chromium QA passed: nonuniform 5-row station layout conserved the full 4 m tributary roof domain with exact edge bands, exported through ${project.schemaVersion}, and restored the default equal layout.`);
} finally {try{cdp?.socket.close();}catch{}await stop(proc);await new Promise((resolve)=>server.close(resolve));await rm(work,{recursive:true,force:true});}
