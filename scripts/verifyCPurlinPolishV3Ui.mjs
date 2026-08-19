import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { extname, join, normalize } from 'node:path';
import { tmpdir } from 'node:os';

const root=process.cwd();
const mime=new Map([['.html','text/html; charset=utf-8'],['.js','text/javascript; charset=utf-8'],['.css','text/css; charset=utf-8'],['.json','application/json; charset=utf-8']]);
const sleep=(ms)=>new Promise((resolve)=>setTimeout(resolve,ms));
function chromePath(){for(const name of ['google-chrome','google-chrome-stable','chromium','chromium-browser']){const found=spawnSync('which',[name],{encoding:'utf8'});if(found.status===0&&found.stdout.trim())return found.stdout.trim();}throw new Error('Chromium is required for C-purlin polish QA.');}
async function waitPort(dir,chromeProcess){const file=join(dir,'DevToolsActivePort');for(let i=0;i<500;i+=1){if(chromeProcess.exitCode!==null)throw new Error(`Chromium exited early ${chromeProcess.exitCode}`);try{const port=Number((await readFile(file,'utf8')).split(/\r?\n/)[0]);if(port>0)return port;}catch{}await sleep(50);}throw new Error('Timed out waiting for Chromium.');}
async function target(base){for(let i=0;i<200;i+=1){try{const list=await(await fetch(`${base}/json/list`)).json();const page=list.find((entry)=>entry.type==='page'&&entry.webSocketDebuggerUrl);if(page)return page;}catch{}await sleep(50);}throw new Error('No Chromium page target.');}
async function connect(url){const socket=new WebSocket(url);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});let id=0;const pending=new Map();socket.addEventListener('message',(event)=>{const message=JSON.parse(String(event.data));if(!message.id||!pending.has(message.id))return;const request=pending.get(message.id);pending.delete(message.id);message.error?request.reject(new Error(message.error.message)):request.resolve(message.result||{});});const send=(method,params={})=>new Promise((resolve,reject)=>{const requestId=++id;pending.set(requestId,{resolve,reject});socket.send(JSON.stringify({id:requestId,method,params}));});return{socket,send};}
async function evalValue(cdp,expression){const result=await cdp.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text||'Browser evaluation failed');return result.result?.value;}
async function stop(chromeProcess){if(!chromeProcess||chromeProcess.exitCode!==null)return;chromeProcess.kill('SIGTERM');await sleep(350);if(chromeProcess.exitCode===null)chromeProcess.kill('SIGKILL');}

const server=createServer((req,res)=>{const raw=decodeURIComponent((req.url||'/').split('?')[0]);const relative=raw==='/'?'/compare.html':raw;const file=normalize(join(root,relative));if(!file.startsWith(root))return res.writeHead(403).end();res.setHeader('Content-Type',mime.get(extname(file))||'application/octet-stream');const stream=createReadStream(file);stream.on('error',()=>res.writeHead(404).end());stream.pipe(res);});
await new Promise((resolve)=>server.listen(0,'127.0.0.1',resolve));
const{port}=server.address();const work=await mkdtemp(join(tmpdir(),'ft-cp-polish-'));const profile=join(work,'profile');let chromeProcess;let cdp;
try{
  chromeProcess=spawn(chromePath(),['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--remote-debugging-port=0',`--user-data-dir=${profile}`,`http://127.0.0.1:${port}/compare.html?demo=c-purlin&build=cp-polish-ci#c-purlin-physics-bench`],{stdio:'ignore'});
  const debugPort=await waitPort(profile,chromeProcess);const page=await target(`http://127.0.0.1:${debugPort}`);cdp=await connect(page.webSocketDebuggerUrl);await cdp.send('Runtime.enable');
  let ready;
  for(let i=0;i<240;i+=1){
    ready=await evalValue(cdp,`(()=>{const panel=document.querySelector('[data-c-purlin-physics-bench]');const basis=panel?.querySelector('[data-ft-cp-test-basis]');const results=document.querySelector('.compare-results');const shell=document.querySelector('.compare-shell');const legacy=document.querySelector('[data-cp-slope-control]');const canonical=panel?.querySelector('[data-canonical-slope-control]');return{doc:document.readyState,panel:!!panel,polish:panel?.dataset.physicsPolishV3,first:Number(panel?.dataset.yieldTargetKn),all:Number(panel?.dataset.allYieldTargetKn),basis:!!basis,basisText:basis?.innerText||'',assembly:!!panel?.querySelector('[data-cp-assembly-context]'),legacyHidden:!!legacy?.hidden,canonical:!!canonical,theme:document.documentElement.dataset.ftTheme,themeToggle:!!document.querySelector('[data-ft-theme-toggle]'),brand:document.querySelector('.topbar .eyebrow')?.innerText?.trim(),resultsWidth:results?.getBoundingClientRect().width||0,shellWidth:shell?.getBoundingClientRect().width||0,canvas:!!panel?.querySelector('[data-cpy-polished-canvas]')};})()`);
    if(ready?.doc==='complete'&&ready.panel&&ready.polish==='true'&&ready.first>0&&ready.all>ready.first&&ready.basis&&ready.canvas)break;
    await sleep(100);
  }
  if(!ready?.panel||ready.polish!=='true'||!(ready.all>ready.first))throw new Error(`Polished all-yield bench did not initialize: ${JSON.stringify(ready)}`);
  if(ready.brand!=='FutolTech Engineering')throw new Error(`Public web company brand is wrong: ${ready.brand}`);
  if(!ready.legacyHidden||!ready.canonical)throw new Error(`Slope controls are not unified: ${JSON.stringify(ready)}`);
  if(ready.assembly)throw new Error('Obsolete real-roof assembly figure is still mounted.');
  if(!/Roark/i.test(ready.basisText)||!/Gere/i.test(ready.basisText)||!/BIPM/i.test(ready.basisText)||!/tek/i.test(ready.basisText)||!/weld/i.test(ready.basisText))throw new Error(`Test basis/references are incomplete: ${ready.basisText}`);
  if(!(ready.resultsWidth>ready.shellWidth*.9))throw new Error(`Results do not span the full comparison width: ${JSON.stringify(ready)}`);

  const theme=await evalValue(cdp,`(()=>{const button=document.querySelector('[data-ft-theme-toggle]');button.click();return{theme:document.documentElement.dataset.ftTheme,text:button.innerText};})()`);
  if(theme.theme!=='paper-matte'||!/Lab Dark/i.test(theme.text))throw new Error(`PaperMatte toggle failed: ${JSON.stringify(theme)}`);

  await evalValue(cdp,`(()=>{const panel=document.querySelector('[data-c-purlin-physics-bench]');const slope=panel.querySelector('[data-cpy-slope-range]');slope.value='30';slope.dispatchEvent(new Event('input',{bubbles:true}));return true;})()`);
  await sleep(500);
  const geometry=await evalValue(cdp,`(()=>window.__FT_LAST_C_PURLIN_PHYSICS_FRAME__)()`);
  if(geometry?.roofSlopeDeg!==30||!geometry.memberGeometry?.length)throw new Error(`Slope-aware frame missing: ${JSON.stringify(geometry)}`);
  for(const member of geometry.memberGeometry){if(Math.abs(member.startY-member.endY)<8)throw new Error(`Member graphic did not rotate with roof slope: ${JSON.stringify(member)}`);if(Math.abs(member.arrowTipY-member.midY)>.01)throw new Error(`Load arrow lost contact with purlin: ${JSON.stringify(member)}`);}

  await evalValue(cdp,`(()=>{const panel=document.querySelector('[data-c-purlin-physics-bench]');panel.querySelector('[data-cpy-duration]').value='5';panel.querySelector('[data-cpy-start]').click();return true;})()`);
  let continuation=null;
  for(let i=0;i<80;i+=1){await sleep(100);continuation=await evalValue(cdp,`(()=>{const panel=document.querySelector('[data-c-purlin-physics-bench]');return{status:panel.querySelector('[data-cpy-status]')?.innerText,frame:window.__FT_LAST_C_PURLIN_PHYSICS_FRAME__,load:Number(document.getElementById('compareLoadInput')?.value)};})()`);if(continuation?.frame?.yieldedCount===1&&continuation.frame.loadKN<continuation.frame.finalTargetKN*.999)break;}
  if(continuation?.frame?.yieldedCount!==1||!/YIELDED.*CONTINUING/i.test(continuation.status))throw new Error(`First member did not yield while stronger member continued: ${JSON.stringify(continuation)}`);
  const frozen=continuation.frame.memberGeometry.filter((item)=>item.yielded);const live=continuation.frame.memberGeometry.filter((item)=>!item.yielded);if(frozen.length!==1||live.length!==1)throw new Error(`Expected one frozen yielded lane and one continuing lane: ${JSON.stringify(continuation.frame)}`);

  let final=null;
  for(let i=0;i<80;i+=1){await sleep(100);final=await evalValue(cdp,`(()=>{const panel=document.querySelector('[data-c-purlin-physics-bench]');return{status:panel.querySelector('[data-cpy-status]')?.innerText,frame:window.__FT_LAST_C_PURLIN_PHYSICS_FRAME__,mainLoad:Number(document.getElementById('compareLoadInput')?.value)};})()`);if(final?.status==='ALL ACTIVE MEMBERS REACHED FIRST YIELD')break;}
  if(final?.status!=='ALL ACTIVE MEMBERS REACHED FIRST YIELD'||final.frame?.yieldedCount!==2||!(final.frame.finalTargetKN>ready.first))throw new Error(`All-yield finish failed: ${JSON.stringify(final)}`);
  if(!final.frame.memberGeometry.every((member)=>Math.abs(member.arrowTipY-member.midY)<.01))throw new Error(`Final load-arrow contact failed: ${JSON.stringify(final.frame.memberGeometry)}`);

  console.log('C-purlin polish V3 Chromium QA passed: concise web brand, one visible shared slope control, PaperMatte, full-width results, references, slope-rotated graphics, contact-following load arrows, first-yield freeze and continuation to all yields.');
}finally{cdp?.socket.close();await stop(chromeProcess);server.close();for(let i=0;i<5;i+=1){try{await rm(work,{recursive:true,force:true});break;}catch(error){if(i===4)throw error;await sleep(150);}}}
