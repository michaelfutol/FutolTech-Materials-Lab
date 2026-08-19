import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { extname, join, normalize } from 'node:path';
import { tmpdir } from 'node:os';

const root=process.cwd();
const mime=new Map([['.html','text/html; charset=utf-8'],['.js','text/javascript; charset=utf-8'],['.css','text/css; charset=utf-8'],['.json','application/json; charset=utf-8']]);
const sleep=(ms)=>new Promise((resolve)=>setTimeout(resolve,ms));
function chromePath(){for(const name of ['google-chrome','google-chrome-stable','chromium','chromium-browser']){const found=spawnSync('which',[name],{encoding:'utf8'});if(found.status===0&&found.stdout.trim())return found.stdout.trim();}throw new Error('Chromium is required for C-purlin coordination QA.');}
async function waitPort(dir,proc){const file=join(dir,'DevToolsActivePort');for(let i=0;i<500;i+=1){if(proc.exitCode!==null)throw new Error(`Chromium exited early ${proc.exitCode}`);try{const port=Number((await readFile(file,'utf8')).split(/\r?\n/)[0]);if(port>0)return port;}catch{}await sleep(50);}throw new Error('Timed out waiting for Chromium.');}
async function target(base){for(let i=0;i<200;i+=1){try{const list=await(await fetch(`${base}/json/list`)).json();const page=list.find((entry)=>entry.type==='page'&&entry.webSocketDebuggerUrl);if(page)return page;}catch{}await sleep(50);}throw new Error('No Chromium page target.');}
async function connect(url){const socket=new WebSocket(url);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});let id=0;const pending=new Map();socket.addEventListener('message',(event)=>{const msg=JSON.parse(String(event.data));if(!msg.id||!pending.has(msg.id))return;const req=pending.get(msg.id);pending.delete(msg.id);msg.error?req.reject(new Error(msg.error.message)):req.resolve(msg.result||{});});const send=(method,params={})=>new Promise((resolve,reject)=>{const requestId=++id;pending.set(requestId,{resolve,reject});socket.send(JSON.stringify({id:requestId,method,params}));});return{socket,send};}
async function evalValue(cdp,expression){const result=await cdp.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text||'Browser evaluation failed');return result.result?.value;}
async function stop(proc){if(!proc||proc.exitCode!==null)return;proc.kill('SIGTERM');await sleep(350);if(proc.exitCode===null)proc.kill('SIGKILL');}

const server=createServer((req,res)=>{const raw=decodeURIComponent((req.url||'/').split('?')[0]);const relative=raw==='/'?'/compare.html':raw;const file=normalize(join(root,relative));if(!file.startsWith(root))return res.writeHead(403).end();res.setHeader('Content-Type',mime.get(extname(file))||'application/octet-stream');const stream=createReadStream(file);stream.on('error',()=>res.writeHead(404).end());stream.pipe(res);});
await new Promise((resolve)=>server.listen(0,'127.0.0.1',resolve));
const{port}=server.address();const work=await mkdtemp(join(tmpdir(),'ft-cp-v5-'));const profile=join(work,'profile');let chromeProcess;let cdp;
try{
  chromeProcess=spawn(chromePath(),['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--remote-debugging-port=0',`--user-data-dir=${profile}`,`http://127.0.0.1:${port}/compare.html?demo=c-purlin&build=cp-v5-ci#c-purlin-physics-bench`],{stdio:'ignore'});
  const debugPort=await waitPort(profile,chromeProcess);const page=await target(`http://127.0.0.1:${debugPort}`);cdp=await connect(page.webSocketDebuggerUrl);await cdp.send('Runtime.enable');

  let ready;
  for(let i=0;i<260;i+=1){
    ready=await evalValue(cdp,`(()=>{const panel=document.querySelector('[data-c-purlin-physics-bench]');return{doc:document.readyState,panel:!!panel,sync:panel?.dataset.sharedControlSyncV5,video:panel?.dataset.coordinatedVideoV5,canvas:!!panel?.querySelector('[data-cpy-coordinated-canvas]'),angles:[...document.querySelectorAll('.compare-shell [data-c-purlin-orientation-display]')].slice(0,2).map((el)=>el.value),state:window.__FT_C_PURLIN_COORDINATED_VIDEO_V5__?.getState?.()};})()`);
    if(ready?.doc==='complete'&&ready.panel&&ready.sync==='true'&&ready.video==='true'&&ready.canvas&&ready.angles?.[0]==='0'&&ready.angles?.[1]==='90'&&ready.state)break;
    await sleep(100);
  }
  if(!ready?.state)throw new Error(`Coordinated V5 bench did not initialize: ${JSON.stringify(ready)}`);

  // Main span -> bench span + center load position.
  const mainToBench=await evalValue(cdp,`(()=>{const main=document.getElementById('compareLengthInput');main.value='3.2';main.dispatchEvent(new Event('input',{bubbles:true}));return true;})()`);
  if(!mainToBench)throw new Error('Could not change main span.');
  await sleep(350);
  let sync=await evalValue(cdp,`(()=>window.__FT_C_PURLIN_SHARED_CONTROL_SYNC_V5__?.getState?.())()`);
  if(Math.abs(sync.spanM-3.2)>.001||Math.abs(sync.mainSpanM-3.2)>.001||Math.abs(sync.loadPositionM-1.6)>.001)throw new Error(`Main→bench span sync failed: ${JSON.stringify(sync)}`);

  // Bench span -> main span.
  await evalValue(cdp,`(()=>{const panel=document.querySelector('[data-c-purlin-physics-bench]');const input=panel.querySelector('[data-cpy-span-number]');input.value='2.6';input.dispatchEvent(new Event('change',{bubbles:true}));return true;})()`);
  await sleep(350);
  sync=await evalValue(cdp,`(()=>window.__FT_C_PURLIN_SHARED_CONTROL_SYNC_V5__?.getState?.())()`);
  if(Math.abs(sync.spanM-2.6)>.001||Math.abs(sync.mainSpanM-2.6)>.001||Math.abs(sync.loadPositionM-1.3)>.001)throw new Error(`Bench→main span sync failed: ${JSON.stringify(sync)}`);

  // Main slope -> bench slope.
  await evalValue(cdp,`(()=>{const main=document.getElementById('compareRoofSlopeInput');main.value='30';main.dispatchEvent(new Event('input',{bubbles:true}));return true;})()`);
  await sleep(350);
  sync=await evalValue(cdp,`(()=>window.__FT_C_PURLIN_SHARED_CONTROL_SYNC_V5__?.getState?.())()`);
  if(sync.roofSlopeDeg!==30||sync.mainRoofSlopeDeg!==30)throw new Error(`Main→bench slope sync failed: ${JSON.stringify(sync)}`);

  // Bench slope -> main slope.
  await evalValue(cdp,`(()=>{const panel=document.querySelector('[data-c-purlin-physics-bench]');const input=panel.querySelector('[data-cpy-slope-number]');input.value='18';input.dispatchEvent(new Event('change',{bubbles:true}));return true;})()`);
  await sleep(350);
  sync=await evalValue(cdp,`(()=>window.__FT_C_PURLIN_SHARED_CONTROL_SYNC_V5__?.getState?.())()`);
  if(sync.roofSlopeDeg!==18||sync.mainRoofSlopeDeg!==18)throw new Error(`Bench→main slope sync failed: ${JSON.stringify(sync)}`);

  // Add Member C and return to a 30° case so first-yield ordering is visible.
  await evalValue(cdp,`(()=>{const panel=document.querySelector('[data-c-purlin-physics-bench]');const third=panel.querySelector('[data-cpy-third]');if(!third.checked){third.checked=true;third.dispatchEvent(new Event('change',{bubbles:true}));}const slope=panel.querySelector('[data-cpy-slope-number]');slope.value='30';slope.dispatchEvent(new Event('change',{bubbles:true}));return true;})()`);
  await sleep(900);
  const active=await evalValue(cdp,`(()=>({angles:[...document.querySelectorAll('.compare-shell [data-c-purlin-orientation-display]')].slice(0,3).map((el)=>el.value),state:window.__FT_C_PURLIN_COORDINATED_VIDEO_V5__?.getState?.()}))()`);
  if(active.angles?.[0]!=='0'||active.angles?.[1]!=='90'||active.angles?.[2]!=='180'||active.state?.members?.length!==3)throw new Error(`Three-member canonical state failed: ${JSON.stringify(active)}`);

  // PaperMatte canvas is a real recording theme, not only a webpage skin.
  const theme=await evalValue(cdp,`(()=>{const button=document.querySelector('[data-ft-theme-toggle]');if(document.documentElement.dataset.ftTheme!=='paper-matte')button?.click();window.__FT_C_PURLIN_COORDINATED_VIDEO_V5__?.render?.();return{theme:document.documentElement.dataset.ftTheme,videoTheme:window.__FT_C_PURLIN_COORDINATED_VIDEO_V5__?.getState?.()?.theme};})()`);
  if(theme.theme!=='paper-matte'||theme.videoTheme!=='paper-matte')throw new Error(`PaperMatte video canvas did not activate: ${JSON.stringify(theme)}`);

  await evalValue(cdp,`(()=>{const panel=document.querySelector('[data-c-purlin-physics-bench]');panel.querySelector('[data-cpy-duration]').value='5';panel.querySelector('[data-cpy-start]').click();return true;})()`);
  let continuation;
  for(let i=0;i<90;i+=1){
    await sleep(100);
    continuation=await evalValue(cdp,`(()=>({status:document.querySelector('[data-cpy-status]')?.innerText,state:window.__FT_C_PURLIN_COORDINATED_VIDEO_V5__?.getState?.()}))()`);
    const yielded=continuation?.state?.members?.filter((m)=>m.yielded)??[];
    if(yielded.length===1&&yielded[0].displayLoadKN<continuation.state.sharedLoadKN*.999)break;
  }
  const yielded=continuation?.state?.members?.filter((m)=>m.yielded)??[];
  const live=continuation?.state?.members?.filter((m)=>!m.yielded)??[];
  if(yielded.length!==1||live.length!==2)throw new Error(`Expected one frozen member while stronger members continue: ${JSON.stringify(continuation)}`);
  if(Math.abs(yielded[0].displayLoadKN-yielded[0].thresholdKN)>1e-6)throw new Error(`Yielded member did not freeze at its own threshold: ${JSON.stringify(yielded[0])}`);
  if(!(yielded[0].displayLoadKN<continuation.state.sharedLoadKN))throw new Error(`Yielded member still shows the later shared load: ${JSON.stringify(continuation.state)}`);
  if(!live.every((m)=>Math.abs(m.displayLoadKN-continuation.state.sharedLoadKN)<1e-6))throw new Error(`Live members are not using the current shared load: ${JSON.stringify(live)}`);

  let final;
  for(let i=0;i<100;i+=1){
    await sleep(100);
    final=await evalValue(cdp,`(()=>({status:document.querySelector('[data-cpy-status]')?.innerText,state:window.__FT_C_PURLIN_COORDINATED_VIDEO_V5__?.getState?.()}))()`);
    if(final?.status==='ALL ACTIVE MEMBERS REACHED FIRST YIELD'&&final?.state?.members?.every((m)=>m.yielded))break;
  }
  if(final?.status!=='ALL ACTIVE MEMBERS REACHED FIRST YIELD')throw new Error(`All-yield completion failed: ${JSON.stringify(final)}`);
  if(!final.state.members.every((m)=>Math.abs(m.displayLoadKN-m.thresholdKN)<1e-6))throw new Error(`Final member cards do not preserve individual first-yield loads: ${JSON.stringify(final.state.members)}`);
  const uniqueLoads=new Set(final.state.members.map((m)=>m.displayLoadKgf.toFixed(3)));
  if(uniqueLoads.size<2)throw new Error(`Final member loads were incorrectly overwritten by one global load: ${JSON.stringify(final.state.members)}`);
  const maxThreshold=Math.max(...final.state.members.map((m)=>m.thresholdKN));
  if(Math.abs(final.state.sharedLoadKN-maxThreshold)>1e-5)throw new Error(`Final shared load is not the last member's threshold: ${JSON.stringify(final.state)}`);
  if(!final.state.members.every((m)=>Math.abs(m.arrowTipY-m.midY)<.01))throw new Error(`Load arrow lost contact with a frozen/live purlin: ${JSON.stringify(final.state.members)}`);

  console.log('C-purlin V5 Chromium QA passed: main/bench span and slope controls synchronize both ways, PaperMatte reaches the video canvas, and each member freezes its arrow/formulas/deflection at its own first-yield load while the shared load continues.');
}finally{cdp?.socket.close();await stop(chromeProcess);server.close();for(let i=0;i<5;i+=1){try{await rm(work,{recursive:true,force:true});break;}catch(error){if(i===4)throw error;await sleep(150);}}}
