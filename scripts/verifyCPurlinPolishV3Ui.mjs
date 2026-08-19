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
    ready=await evalValue(cdp,`(()=>{const panel=document.querySelector('[data-c-purlin-physics-bench]');const basis=panel?.querySelector('[data-ft-cp-test-basis]');const results=document.querySelector('.compare-results');const shell=document.querySelector('.compare-shell');const legacy=document.querySelector('[data-cp-slope-control]');const canonical=panel?.querySelector('[data-canonical-slope-control]');const oldCanvas=panel?.querySelector('[data-cpy-canvas]');const oldPolished=panel?.querySelector('[data-cpy-polished-canvas]');return{doc:document.readyState,panel:!!panel,polish:panel?.dataset.physicsPolishV3,separated:panel?.dataset.separatedViewsV4,first:Number(panel?.dataset.yieldTargetKn),all:Number(panel?.dataset.allYieldTargetKn),basis:!!basis,basisText:basis?.innerText||'',assembly:!!panel?.querySelector('[data-cp-assembly-context]'),legacyHidden:!!legacy?.hidden,canonical:!!canonical,theme:document.documentElement.dataset.ftTheme,themeToggle:!!document.querySelector('[data-ft-theme-toggle]'),brand:document.querySelector('.topbar .eyebrow')?.innerText?.trim(),resultsWidth:results?.getBoundingClientRect().width||0,shellWidth:shell?.getBoundingClientRect().width||0,staticCanvas:!!panel?.querySelector('[data-cpy-static-setup-canvas]'),longitudinalCanvas:!!panel?.querySelector('[data-cpy-longitudinal-canvas]'),oldCanvasDisplay:oldCanvas?getComputedStyle(oldCanvas).display:'missing',oldPolishedDisplay:oldPolished?getComputedStyle(oldPolished).display:'missing'};})()`);
    if(ready?.doc==='complete'&&ready.panel&&ready.polish==='true'&&ready.separated==='true'&&ready.first>0&&ready.all>ready.first&&ready.basis&&ready.staticCanvas&&ready.longitudinalCanvas)break;
    await sleep(100);
  }
  if(!ready?.panel||ready.polish!=='true'||ready.separated!=='true'||!(ready.all>ready.first))throw new Error(`Separated all-yield bench did not initialize: ${JSON.stringify(ready)}`);
  if(ready.brand!=='FutolTech Engineering')throw new Error(`Public web company brand is wrong: ${ready.brand}`);
  if(!ready.legacyHidden||!ready.canonical)throw new Error(`Slope controls are not unified: ${JSON.stringify(ready)}`);
  if(ready.assembly)throw new Error('Obsolete real-roof assembly figure is still mounted.');
  if(ready.oldCanvasDisplay!=='none'||ready.oldPolishedDisplay!=='none')throw new Error(`Legacy duplicate canvases are still visible: ${JSON.stringify(ready)}`);
  if(!/Roark/i.test(ready.basisText)||!/Gere/i.test(ready.basisText)||!/BIPM/i.test(ready.basisText)||!/tek/i.test(ready.basisText)||!/weld/i.test(ready.basisText))throw new Error(`Test basis/references are incomplete: ${ready.basisText}`);
  if(!(ready.resultsWidth>ready.shellWidth*.9))throw new Error(`Results do not span the full comparison width: ${JSON.stringify(ready)}`);

  const theme=await evalValue(cdp,`(()=>{const button=document.querySelector('[data-ft-theme-toggle]');button.click();return{theme:document.documentElement.dataset.ftTheme,text:button.innerText};})()`);
  if(theme.theme!=='paper-matte'||!/Lab Dark/i.test(theme.text))throw new Error(`PaperMatte toggle failed: ${JSON.stringify(theme)}`);

  await evalValue(cdp,`(()=>{const panel=document.querySelector('[data-c-purlin-physics-bench]');const slope=panel.querySelector('[data-cpy-slope-range]');slope.value='30';slope.dispatchEvent(new Event('input',{bubbles:true}));return true;})()`);
  await sleep(650);
  const views=await evalValue(cdp,`(()=>window.__FT_C_PURLIN_SEPARATED_VIEWS__)()`);
  if(views?.staticSetup?.slopeDeg!==30||!views.staticSetup.memberGeometry?.length)throw new Error(`Static slope/attachment view missing: ${JSON.stringify(views)}`);
  if(views.staticSetup.animated!==false||views.staticSetup.supportSymbols!==false)throw new Error(`Static setup is incorrectly animated or shows support symbols: ${JSON.stringify(views.staticSetup)}`);
  for(const member of views.staticSetup.memberGeometry){if(Math.abs(member.rafterStartY-member.rafterEndY)<8)throw new Error(`Static rafter did not show the 30-degree roof slope: ${JSON.stringify(member)}`);if(member.animated!==false||member.supportSymbols!==false)throw new Error(`Static member view has forbidden animation/support symbols: ${JSON.stringify(member)}`);}
  if(views?.animation?.roofSlopeDeg!==30||!views.animation.memberGeometry?.length||views.animation.baselineRotatesWithRoofSlope!==false||views.animation.raftersPerpendicular!==true)throw new Error(`Longitudinal animation view is missing or using the wrong geometry: ${JSON.stringify(views?.animation)}`);
  for(const member of views.animation.memberGeometry){if(Math.abs(member.startY-member.endY)>.01)throw new Error(`Longitudinal purlin span was incorrectly tilted by roof slope: ${JSON.stringify(member)}`);if(!member.raftersPerpendicular||Math.abs(member.leftRafter.x1-member.leftRafter.x2)>.01||Math.abs(member.rightRafter.x1-member.rightRafter.x2)>.01)throw new Error(`Rafters are not drawn transverse/perpendicular to the purlin span: ${JSON.stringify(member)}`);if(Math.abs(member.arrowTipY-member.midY)>.01)throw new Error(`Load arrow lost contact with longitudinal purlin deflection: ${JSON.stringify(member)}`);}
  const staticBefore=JSON.stringify(views.staticSetup);

  await evalValue(cdp,`(()=>{const panel=document.querySelector('[data-c-purlin-physics-bench]');panel.querySelector('[data-cpy-duration]').value='5';panel.querySelector('[data-cpy-start]').click();return true;})()`);
  let continuation=null;
  for(let i=0;i<80;i+=1){await sleep(100);continuation=await evalValue(cdp,`(()=>{const panel=document.querySelector('[data-c-purlin-physics-bench]');const view=window.__FT_C_PURLIN_SEPARATED_VIEWS__;const yielded=view?.animation?.memberGeometry?.filter((item)=>item.yielded).length||0;return{status:panel.querySelector('[data-cpy-status]')?.innerText,view,yielded,load:Number(document.getElementById('compareLoadInput')?.value)};})()`);if(continuation?.yielded===1&&continuation.view?.animation?.loadKN<${ready.all}*.999)break;}
  if(continuation?.yielded!==1||!/YIELDED.*CONTINUING/i.test(continuation.status))throw new Error(`First member did not yield while stronger member continued: ${JSON.stringify(continuation)}`);
  if(JSON.stringify(continuation.view.staticSetup)!==staticBefore)throw new Error('Static roof-slope/attachment view changed during the load animation.');
  const frozen=continuation.view.animation.memberGeometry.filter((item)=>item.yielded);const live=continuation.view.animation.memberGeometry.filter((item)=>!item.yielded);if(frozen.length!==1||live.length!==1)throw new Error(`Expected one frozen yielded lane and one continuing lane: ${JSON.stringify(continuation.view.animation)}`);

  let final=null;
  for(let i=0;i<80;i+=1){await sleep(100);final=await evalValue(cdp,`(()=>{const panel=document.querySelector('[data-c-purlin-physics-bench]');const view=window.__FT_C_PURLIN_SEPARATED_VIEWS__;return{status:panel.querySelector('[data-cpy-status]')?.innerText,view,yielded:view?.animation?.memberGeometry?.filter((item)=>item.yielded).length||0};})()`);if(final?.status==='ALL ACTIVE MEMBERS REACHED FIRST YIELD'&&final?.yielded===2)break;}
  if(final?.status!=='ALL ACTIVE MEMBERS REACHED FIRST YIELD'||final.yielded!==2)throw new Error(`All-yield finish failed: ${JSON.stringify(final)}`);
  if(!final.view.animation.memberGeometry.every((member)=>Math.abs(member.arrowTipY-member.midY)<.01&&Math.abs(member.startY-member.endY)<.01))throw new Error(`Final longitudinal geometry/contact failed: ${JSON.stringify(final.view.animation.memberGeometry)}`);
  if(JSON.stringify(final.view.staticSetup)!==staticBefore)throw new Error('Static roof-slope/attachment view changed by the completed animation.');

  console.log('C-purlin polish Chromium QA passed: static sloped-rafter attachment view is non-animated/no-support-symbol, longitudinal purlin span stays horizontal between perpendicular rafters, load arrow follows deflection, and loading continues through all first-yield thresholds.');
}finally{cdp?.socket.close();await stop(chromeProcess);server.close();for(let i=0;i<5;i+=1){try{await rm(work,{recursive:true,force:true});break;}catch(error){if(i===4)throw error;await sleep(150);}}}
