import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { extname, join, normalize } from 'node:path';
import { tmpdir } from 'node:os';

const root = process.cwd();
const mime = new Map([['.html','text/html; charset=utf-8'],['.js','text/javascript; charset=utf-8'],['.css','text/css; charset=utf-8']]);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function findChrome() {
  for (const name of ['google-chrome','google-chrome-stable','chromium','chromium-browser']) {
    const result = spawnSync('which', [name], { encoding: 'utf8' });
    if (result.status === 0 && result.stdout.trim()) return result.stdout.trim();
  }
  throw new Error('Headless Chromium/Chrome is required for Frame Analyzer QA.');
}
async function waitPort(profileDir, proc) {
  const file = join(profileDir, 'DevToolsActivePort');
  for (let i = 0; i < 500; i += 1) {
    if (proc.exitCode !== null) throw new Error(`Chromium exited early: ${proc.exitCode}`);
    try { const port = Number((await readFile(file,'utf8')).trim().split(/\r?\n/)[0]); if (port > 0) return port; } catch {}
    await sleep(50);
  }
  throw new Error('Timed out waiting for Chromium DevTools port.');
}
async function pageTarget(base) {
  for (let i = 0; i < 200; i += 1) {
    try { const targets = await (await fetch(`${base}/json/list`)).json(); const page = targets.find((target)=>target.type==='page'&&target.webSocketDebuggerUrl); if (page) return page; } catch {}
    await sleep(50);
  }
  throw new Error('Frame Analyzer Chromium target did not appear.');
}
async function cdpOpen(url) {
  const socket = new WebSocket(url);
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  let id=0;const pending=new Map();
  socket.addEventListener('message',(event)=>{const msg=JSON.parse(String(event.data));if(!msg.id||!pending.has(msg.id))return;const req=pending.get(msg.id);pending.delete(msg.id);msg.error?req.reject(new Error(msg.error.message)):req.resolve(msg.result||{});});
  const send=(method,params={})=>new Promise((resolve,reject)=>{const requestId=++id;pending.set(requestId,{resolve,reject});socket.send(JSON.stringify({id:requestId,method,params}));});
  return {socket,send};
}
async function evaluate(cdp, expression) {
  const result=await cdp.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(result.exceptionDetails)throw new Error(result.exceptionDetails.text||'Browser evaluation failed.');
  return result.result?.value;
}
async function stop(proc){if(!proc||proc.exitCode!==null)return;proc.kill('SIGTERM');await sleep(500);if(proc.exitCode===null)proc.kill('SIGKILL');}

const server=createServer((req,res)=>{const raw=decodeURIComponent((req.url||'/').split('?')[0]),rel=raw==='/'?'/frame.html':raw,file=normalize(join(root,rel));if(!file.startsWith(root))return res.writeHead(403).end('Forbidden');res.setHeader('Content-Type',mime.get(extname(file))||'application/octet-stream');const stream=createReadStream(file);stream.on('error',()=>res.writeHead(404).end('Not found'));stream.pipe(res);});
await new Promise((resolve)=>server.listen(0,'127.0.0.1',resolve));
const {port}=server.address(),work=await mkdtemp(join(tmpdir(),'ft-frame-ui-')),profile=join(work,'profile');
let chromeProcess,cdp;

try {
  chromeProcess=spawn(findChrome(),['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage','--remote-debugging-port=0',`--user-data-dir=${profile}`,`http://127.0.0.1:${port}/frame.html?build=ci`],{stdio:'ignore'});
  const debugPort=await waitPort(profile,chromeProcess),target=await pageTarget(`http://127.0.0.1:${debugPort}`);cdp=await cdpOpen(target.webSocketDebuggerUrl);await cdp.send('Runtime.enable');
  let ready=false;
  for(let i=0;i<120;i+=1){const state=await evaluate(cdp,`({ready:document.readyState,state:document.documentElement.dataset.frameState,cards:document.querySelectorAll('#frameResultCards .result-card').length})`);if(state?.ready==='complete'&&state.state==='analyzed'&&state.cards>=6){ready=true;break;}await sleep(100);}
  if(!ready)throw new Error('NF-001 default frame did not become ready.');

  const rigid=await evaluate(cdp,`({banner:document.querySelector('#frameStateBanner').textContent,trace:document.querySelector('#frameCalculationTrace').textContent,diagram:document.querySelectorAll('#frameDiagram .frame-member-deformed').length,error:document.querySelector('#frameErrorBanner').textContent})`);
  if(!/FIRST-ORDER ELASTIC/.test(rigid.banner))throw new Error(`Default rigid state missing: ${rigid.banner}`);
  if(!/ΣFx residual\s*-?0(?:\.0+)? kN/.test(rigid.trace)||!/ΣFy residual\s*-?0(?:\.0+)? kN/.test(rigid.trace))throw new Error(`Frame equilibrium trace is not balanced: ${rigid.trace}`);
  if(rigid.diagram!==3)throw new Error(`Expected 3 deformed NF-001 members, found ${rigid.diagram}`);
  if(rigid.error.trim())throw new Error(`Unexpected default frame error: ${rigid.error}`);

  await evaluate(cdp,`(() => { const brace=document.querySelector('#frameBraceSelect');brace.value='N1-N4';brace.dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('#frameBraceEInput').value='13100';document.querySelector('#frameBraceAreaInput').value='2500';document.querySelector('#frameRunButton').click(); })()`);
  await sleep(320);
  const brace=await evaluate(cdp,`({adviser:document.querySelector('#frameBraceAdviser').textContent,evidence:document.querySelector('#frameBraceEvidence').textContent,diagram:document.querySelectorAll('#frameDiagram .frame-member-deformed').length,braceLines:document.querySelectorAll('#frameDiagram .frame-brace-deformed').length,error:document.querySelector('#frameErrorBanner').textContent})`);
  if(!/STIFFNESS SENSITIVITY ONLY/.test(brace.adviser)||!/capacity UNRATED/i.test(brace.adviser))throw new Error(`Brace adviser boundary missing: ${brace.adviser}`);
  const reduction=Number(brace.adviser.match(/Elastic drift reduction:\s*([\d.]+)%/)?.[1]);
  if(!(reduction>0))throw new Error(`Brace did not report positive elastic drift reduction: ${brace.adviser}`);
  if(!/UNVERIFIED SENSITIVITY/.test(brace.evidence))throw new Error('Arbitrary brace E/A was not labeled unverified sensitivity.');
  if(brace.diagram!==4||brace.braceLines!==1)throw new Error(`Expected one visible brace and four deformed members: ${JSON.stringify(brace)}`);
  if(brace.error.trim())throw new Error(`Brace sensitivity case failed: ${brace.error}`);

  await evaluate(cdp,`(() => { const brace=document.querySelector('#frameBraceSelect');brace.value='none';brace.dispatchEvent(new Event('change',{bubbles:true}));const jt=document.querySelector('#frameJointTypeSelect');jt.value='spring';jt.dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('#frameSpringStiffnessInput').value='10';document.querySelector('#frameRunButton').click(); })()`);
  await sleep(300);
  const spring=await evaluate(cdp,`({evidence:document.querySelector('#frameJointEvidence').textContent,connections:document.querySelectorAll('#frameConnectionBody tr').length,body:document.querySelector('#frameConnectionBody').textContent,error:document.querySelector('#frameErrorBanner').textContent})`);
  if(!/UNVERIFIED SENSITIVITY/.test(spring.evidence))throw new Error('Arbitrary kθ was not labeled unverified sensitivity.');
  if(spring.connections!==4||!/10 kN·m\/rad/.test(spring.body))throw new Error(`Expected four explicit 10 kN·m/rad springs: ${spring.body}`);
  if(spring.error.trim())throw new Error(`Semi-rigid sensitivity case failed: ${spring.error}`);

  await evaluate(cdp,`(() => { const analysis=document.querySelector('#frameAnalysisSelect');analysis.value='pdelta';analysis.dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('#frameGravityLoadInput').value='50';document.querySelector('#frameRunButton').click(); })()`);await sleep(350);
  const pdelta=await evaluate(cdp,`({banner:document.querySelector('#frameStateBanner').textContent,cards:document.querySelector('#frameResultCards').textContent,error:document.querySelector('#frameErrorBanner').textContent})`);
  if(!/SECOND-ORDER ELASTIC P–Δ/.test(pdelta.banner)||!/P–Δ amplification/.test(pdelta.cards))throw new Error(`P-Delta state missing: ${JSON.stringify(pdelta)}`);
  if(pdelta.error.trim())throw new Error(`P-Delta case failed: ${pdelta.error}`);

  await evaluate(cdp,`(() => { const analysis=document.querySelector('#frameAnalysisSelect');analysis.value='redistribution';analysis.dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('#frameGravityLoadInput').value='0';document.querySelector('#frameMomentLimitInput').value='0.001';document.querySelector('#frameResidualRatioInput').value='0.2';document.querySelector('#frameRunButton').click(); })()`);await sleep(400);
  const redistribution=await evaluate(cdp,`({banner:document.querySelector('#frameStateBanner').textContent,events:document.querySelectorAll('#frameRedistributionEvents .frame-event').length,text:document.querySelector('#frameRedistributionEvents').textContent,interpretation:document.querySelector('#frameJointInterpretation').textContent,error:document.querySelector('#frameErrorBanner').textContent})`);
  if(!/REDISTRIBUTION/.test(redistribution.banner)||redistribution.events<1)throw new Error(`Explicit redistribution event did not occur: ${JSON.stringify(redistribution)}`);
  if(!/does not infer them from fastener count/i.test(redistribution.interpretation+redistribution.text))throw new Error('Redistribution evidence boundary is not visible.');
  if(redistribution.error.trim())throw new Error(`Redistribution case failed: ${redistribution.error}`);

  console.log('NF-001 rigid, brace sensitivity, explicit semi-rigid, P-Delta and connection-redistribution QA passed in real Chromium.');
} finally {
  try{cdp?.socket.close();}catch{}
  await stop(chromeProcess);await new Promise((resolve)=>server.close(resolve));await rm(work,{recursive:true,force:true});
}
