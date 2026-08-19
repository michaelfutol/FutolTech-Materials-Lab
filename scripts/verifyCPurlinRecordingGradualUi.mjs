import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { extname, join, normalize } from 'node:path';
import { tmpdir } from 'node:os';

const root=process.cwd();
const mime=new Map([['.html','text/html; charset=utf-8'],['.js','text/javascript; charset=utf-8'],['.css','text/css; charset=utf-8'],['.json','application/json; charset=utf-8']]);
const sleep=(ms)=>new Promise((resolve)=>setTimeout(resolve,ms));
function chromePath(){for(const name of ['google-chrome','google-chrome-stable','chromium','chromium-browser']){const found=spawnSync('which',[name],{encoding:'utf8'});if(found.status===0&&found.stdout.trim())return found.stdout.trim();}throw new Error('Chromium is required for recording-animation QA.');}
async function waitPort(dir,proc){const file=join(dir,'DevToolsActivePort');for(let i=0;i<500;i+=1){if(proc.exitCode!==null)throw new Error(`Chromium exited early ${proc.exitCode}`);try{const port=Number((await readFile(file,'utf8')).split(/\r?\n/)[0]);if(port>0)return port;}catch{}await sleep(50);}throw new Error('Timed out waiting for Chromium.');}
async function target(base){for(let i=0;i<200;i+=1){try{const list=await(await fetch(`${base}/json/list`)).json();const page=list.find((entry)=>entry.type==='page'&&entry.webSocketDebuggerUrl);if(page)return page;}catch{}await sleep(50);}throw new Error('No Chromium page target.');}
async function connect(url){const socket=new WebSocket(url);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});let id=0;const pending=new Map();socket.addEventListener('message',(event)=>{const msg=JSON.parse(String(event.data));if(!msg.id||!pending.has(msg.id))return;const req=pending.get(msg.id);pending.delete(msg.id);msg.error?req.reject(new Error(msg.error.message)):req.resolve(msg.result||{});});const send=(method,params={})=>new Promise((resolve,reject)=>{const requestId=++id;pending.set(requestId,{resolve,reject});socket.send(JSON.stringify({id:requestId,method,params}));});return{socket,send};}
async function evalValue(cdp,expression){const result=await cdp.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text||'Browser evaluation failed');return result.result?.value;}
async function stop(proc){if(!proc||proc.exitCode!==null)return;proc.kill('SIGTERM');await sleep(300);if(proc.exitCode===null)proc.kill('SIGKILL');}

const server=createServer((req,res)=>{const raw=decodeURIComponent((req.url||'/').split('?')[0]);const relative=raw==='/'?'/compare.html':raw;const file=normalize(join(root,relative));if(!file.startsWith(root))return res.writeHead(403).end();res.setHeader('Content-Type',mime.get(extname(file))||'application/octet-stream');const stream=createReadStream(file);stream.on('error',()=>res.writeHead(404).end());stream.pipe(res);});
await new Promise((resolve)=>server.listen(0,'127.0.0.1',resolve));
const{port}=server.address();const work=await mkdtemp(join(tmpdir(),'ft-cp-record-gradual-'));const profile=join(work,'profile');let chromeProcess;let cdp;
try{
  chromeProcess=spawn(chromePath(),['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--remote-debugging-port=0',`--user-data-dir=${profile}`,`http://127.0.0.1:${port}/compare.html?demo=c-purlin&build=cp-record-gradual-ci#c-purlin-physics-bench`],{stdio:'ignore'});
  const debugPort=await waitPort(profile,chromeProcess);const page=await target(`http://127.0.0.1:${debugPort}`);cdp=await connect(page.webSocketDebuggerUrl);await cdp.send('Runtime.enable');
  let ready;
  for(let i=0;i<260;i+=1){ready=await evalValue(cdp,`(()=>{const p=document.querySelector('[data-c-purlin-physics-bench]');return{doc:document.readyState,panel:!!p,v5:p?.dataset.coordinatedVideoV5,v6:p?.dataset.recordingPreRollV6,state:window.__FT_C_PURLIN_COORDINATED_VIDEO_V5__?.getState?.()};})()`);if(ready?.doc==='complete'&&ready.panel&&ready.v5==='true'&&ready.v6==='true'&&ready.state?.members?.length>=2)break;await sleep(100);}
  if(!ready?.state||ready.v6!=='true')throw new Error(`Recording pre-roll did not initialize: ${JSON.stringify(ready)}`);

  await evalValue(cdp,`(()=>{const p=document.querySelector('[data-c-purlin-physics-bench]');p.querySelector('[data-cpy-duration]').value='16';p.querySelector('[data-cpy-record]').click();return true;})()`);
  await sleep(350);
  const pre=await evalValue(cdp,`(()=>{const p=document.querySelector('[data-c-purlin-physics-bench]');const s=window.__FT_C_PURLIN_COORDINATED_VIDEO_V5__?.getState?.();return{preReady:p.dataset.recordingPreRollReady,preLoad:Number(p.dataset.recordingPreRollLoadKn),button:p.querySelector('[data-cpy-record]')?.innerText,state:s};})()`);
  if(pre.preReady!=='true'||Math.abs(pre.preLoad)>1e-9)throw new Error(`Recorder did not settle on a zero-load frame first: ${JSON.stringify(pre)}`);

  const sample=async()=>evalValue(cdp,`(()=>{const p=document.querySelector('[data-c-purlin-physics-bench]');const s=window.__FT_C_PURLIN_COORDINATED_VIDEO_V5__?.getState?.();return{button:p.querySelector('[data-cpy-record]')?.innerText,progress:p.querySelector('[data-cpy-progress]')?.innerText,load:Number(s?.sharedLoadKN||0),deflections:(s?.members||[]).map((m)=>Number(m.midY-m.startY)),yielded:(s?.members||[]).filter((m)=>m.yielded).length};})()`);
  await sleep(550);const s1=await sample();
  await sleep(650);const s2=await sample();
  await sleep(650);const s3=await sample();
  const samples=[s1,s2,s3];
  if(!samples.every((s)=>/RECORDING/i.test(s.button)))throw new Error(`MediaRecorder was not active during progressive samples: ${JSON.stringify(samples)}`);
  if(!(s1.load>0&&s2.load>s1.load&&s3.load>s2.load))throw new Error(`Recorded shared load did not rise gradually: ${JSON.stringify(samples)}`);
  if(samples.some((s)=>s.yielded!==0))throw new Error(`A member yielded too early during recording samples: ${JSON.stringify(samples)}`);
  for(let member=0;member<s1.deflections.length;member+=1){const d1=s1.deflections[member],d2=s2.deflections[member],d3=s3.deflections[member];if(!(d1>0.03&&d2>d1+0.03&&d3>d2+0.03))throw new Error(`Recorded Member ${member+1} deflection is not gradual: ${JSON.stringify({d1,d2,d3,samples})}`);}
  if(samples.some((s)=>s.progress==='100%'))throw new Error(`Recorded animation jumped to the end state: ${JSON.stringify(samples)}`);

  console.log(`C-purlin recording gradual QA passed: pre-roll=${pre.preLoad.toFixed(6)} kN, then recorded loads ${samples.map((s)=>s.load.toFixed(4)).join(' < ')} kN with progressive deflection.`);
}finally{cdp?.socket.close();await stop(chromeProcess);server.close();for(let i=0;i<5;i+=1){try{await rm(work,{recursive:true,force:true});break;}catch(error){if(i===4)throw error;await sleep(150);}}}
