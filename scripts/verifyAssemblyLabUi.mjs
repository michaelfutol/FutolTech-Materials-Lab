import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { extname, join, normalize } from 'node:path';
import { tmpdir } from 'node:os';

const root = process.cwd();
const mime = new Map([['.html','text/html; charset=utf-8'],['.js','text/javascript; charset=utf-8'],['.css','text/css; charset=utf-8']]);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function findChrome(){for(const name of ['google-chrome','google-chrome-stable','chromium','chromium-browser']){const r=spawnSync('which',[name],{encoding:'utf8'});if(r.status===0&&r.stdout.trim())return r.stdout.trim();}throw new Error('Headless Chromium/Chrome is required for Assembly Lab QA.');}
async function waitPort(profileDir,proc){const file=join(profileDir,'DevToolsActivePort');for(let i=0;i<500;i+=1){if(proc.exitCode!==null)throw new Error(`Chromium exited early: ${proc.exitCode}`);try{const p=Number((await readFile(file,'utf8')).trim().split(/\r?\n/)[0]);if(p>0)return p;}catch{}await sleep(50);}throw new Error('Timed out waiting for Chromium DevTools port.');}
async function pageTarget(base){for(let i=0;i<200;i+=1){try{const targets=await(await fetch(`${base}/json/list`)).json();const page=targets.find((t)=>t.type==='page'&&t.webSocketDebuggerUrl);if(page)return page;}catch{}await sleep(50);}throw new Error('Assembly Lab Chromium page target did not appear.');}
async function cdpOpen(url){const socket=new WebSocket(url);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});let id=0;const pending=new Map();socket.addEventListener('message',(event)=>{const msg=JSON.parse(String(event.data));if(!msg.id||!pending.has(msg.id))return;const req=pending.get(msg.id);pending.delete(msg.id);msg.error?req.reject(new Error(msg.error.message)):req.resolve(msg.result||{});});const send=(method,params={})=>new Promise((resolve,reject)=>{const requestId=++id;pending.set(requestId,{resolve,reject});socket.send(JSON.stringify({id:requestId,method,params}));});return{socket,send};}
async function evaluate(cdp,expression){const r=await cdp.send('Runtime.evaluate',{expression,returnByValue:true});return r.result?.value;}
async function stop(proc){if(!proc||proc.exitCode!==null)return;proc.kill('SIGTERM');await sleep(500);if(proc.exitCode===null)proc.kill('SIGKILL');}

const server=createServer((req,res)=>{const raw=decodeURIComponent((req.url||'/').split('?')[0]);const rel=raw==='/'?'/assembly.html':raw;const file=normalize(join(root,rel));if(!file.startsWith(root))return res.writeHead(403).end('Forbidden');res.setHeader('Content-Type',mime.get(extname(file))||'application/octet-stream');const stream=createReadStream(file);stream.on('error',()=>res.writeHead(404).end('Not found'));stream.pipe(res);});
await new Promise((resolve)=>server.listen(0,'127.0.0.1',resolve));
const {port}=server.address();
const work=await mkdtemp(join(tmpdir(),'ft-assembly-ui-'));
const profile=join(work,'profile');
let chromeProcess;let cdp;
try{
  chromeProcess=spawn(findChrome(),['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage','--remote-debugging-port=0',`--user-data-dir=${profile}`,`http://127.0.0.1:${port}/assembly.html?build=ci`],{stdio:'ignore'});
  const debugPort=await waitPort(profile,chromeProcess);const target=await pageTarget(`http://127.0.0.1:${debugPort}`);cdp=await cdpOpen(target.webSocketDebuggerUrl);await cdp.send('Runtime.enable');
  let ready=false;for(let i=0;i<120;i+=1){const state=await evaluate(cdp,`({ready:document.readyState,cards:document.querySelectorAll('#assemblyResultCards .result-card').length})`);if(state?.ready==='complete'&&state?.cards>=6){ready=true;break;}await sleep(100);}if(!ready)throw new Error('Assembly Lab did not become ready.');
  const base=await evaluate(cdp,`({state:document.querySelector('#assemblyStateBanner').textContent,eta:document.querySelector('#assemblyEtaOutput').textContent,trace:document.querySelector('#assemblyCalculationTrace').textContent,interfaces:document.querySelectorAll('#assemblyDiagram .assembly-interface').length})`);
  if(!/SCREENING/.test(base.state)||!/sensitivity input/i.test(base.state))throw new Error(`Default boundary missing: ${base.state}`);
  if(base.eta!=='0.00'||base.interfaces!==1||!/I_eff/.test(base.trace))throw new Error('Default two-ply stacked trace/figure is incomplete.');
  await evaluate(cdp,`(()=>{const eta=document.querySelector('#assemblyEtaInput');eta.value='1';eta.dispatchEvent(new Event('input',{bubbles:true}));const count=document.querySelector('#assemblyPlyCountSelect');count.value='3';count.dispatchEvent(new Event('change',{bubbles:true}));})()`);await sleep(150);
  const full=await evaluate(cdp,`({eta:document.querySelector('#assemblyEtaOutput').textContent,cards:document.querySelector('#assemblyResultCards').textContent,interfaces:document.querySelectorAll('#assemblyDiagram .assembly-interface').length})`);
  if(full.eta!=='1.00'||full.interfaces!==2||!/Full-composite deflection/.test(full.cards))throw new Error('Three-ply full-composite UI state did not persist.');
  await evaluate(cdp,`(()=>{const arrangement=document.querySelector('#assemblyArrangementSelect');arrangement.value='side-by-side';arrangement.dispatchEvent(new Event('change',{bubbles:true}));})()`);await sleep(150);
  const side=await evaluate(cdp,`document.querySelector('#assemblyInterpretation').textContent`);
  if(!/bounds coincide|does not create the depth leverage/i.test(side))throw new Error('Side-by-side no-EI-gain boundary is missing.');
  console.log('Assembly Lab bounded composite-action interaction QA passed in real Chromium.');
}finally{try{cdp?.socket.close();}catch{}await stop(chromeProcess);await new Promise((resolve)=>server.close(resolve));await rm(work,{recursive:true,force:true});}
