import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { tmpdir } from 'node:os';

const root = process.cwd();
const mime = new Map([['.html','text/html; charset=utf-8'],['.js','text/javascript; charset=utf-8'],['.css','text/css; charset=utf-8'],['.json','application/json; charset=utf-8']]);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function chromePath(){for(const name of ['google-chrome','google-chrome-stable','chromium','chromium-browser']){const r=spawnSync('which',[name],{encoding:'utf8'});if(r.status===0&&r.stdout.trim())return r.stdout.trim();}throw new Error('Chromium is required for beam strength progression QA.');}
async function waitPort(dir,proc){const file=join(dir,'DevToolsActivePort');for(let i=0;i<500;i+=1){if(proc.exitCode!==null)throw new Error(`Chromium exited early ${proc.exitCode}`);try{const port=Number((await readFile(file,'utf8')).split(/\r?\n/)[0]);if(port>0)return port;}catch{}await sleep(50);}throw new Error('Timed out waiting for Chromium.');}
async function target(base){for(let i=0;i<200;i+=1){try{const list=await(await fetch(`${base}/json/list`)).json();const page=list.find((entry)=>entry.type==='page'&&entry.webSocketDebuggerUrl);if(page)return page;}catch{}await sleep(50);}throw new Error('No Chromium page target.');}
async function connect(url){const socket=new WebSocket(url);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});let id=0;const pending=new Map();socket.addEventListener('message',(event)=>{const msg=JSON.parse(String(event.data));if(!msg.id||!pending.has(msg.id))return;const req=pending.get(msg.id);pending.delete(msg.id);msg.error?req.reject(new Error(msg.error.message)):req.resolve(msg.result||{});});const send=(method,params={})=>new Promise((resolve,reject)=>{const rid=++id;pending.set(rid,{resolve,reject});socket.send(JSON.stringify({id:rid,method,params}));});return{socket,send};}
async function evalv(cdp,expression){const r=await cdp.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text||'Browser evaluation failed');return r.result?.value;}
async function stop(proc){if(!proc||proc.exitCode!==null)return;proc.kill('SIGTERM');await sleep(300);if(proc.exitCode===null)proc.kill('SIGKILL');}

const server=createServer((req,res)=>{const raw=decodeURIComponent((req.url||'/').split('?')[0]),rel=raw==='/'?'/compare.html':raw,file=normalize(join(root,rel));if(!file.startsWith(root))return res.writeHead(403).end();res.setHeader('Content-Type',mime.get(extname(file))||'application/octet-stream');const stream=createReadStream(file);stream.on('error',()=>res.writeHead(404).end());stream.pipe(res);});
await new Promise((resolve)=>server.listen(0,'127.0.0.1',resolve));
const {port}=server.address();
const work=await mkdtemp(join(tmpdir(),'ft-beam-progression-')),profile=join(work,'profile');
let proc,cdp;
try{
  proc=spawn(chromePath(),['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--remote-debugging-port=0',`--user-data-dir=${profile}`,`http://127.0.0.1:${port}/compare.html?build=beam-strength-progression-ci`],{stdio:'ignore'});
  const dp=await waitPort(profile,proc),page=await target(`http://127.0.0.1:${dp}`);cdp=await connect(page.webSocketDebuggerUrl);await cdp.send('Runtime.enable');await cdp.send('Page.enable');
  let ready=null;
  for(let i=0;i<260;i+=1){
    ready=await evalv(cdp,`(() => ({state:document.readyState,experience:document.documentElement.dataset.comparisonExperience,clarity:document.documentElement.dataset.beamClarity,playback:!!document.querySelector('[data-comparison-playback]'),progression:!!document.querySelector('[data-beam-strength-progression]'),cards:document.querySelectorAll('.comparison-playback-card').length,arrows:document.querySelectorAll('.comparison-playback-card [data-ft-point-load-arrow]').length}))()`);
    if(ready?.state==='complete'&&ready.experience==='general-materials'&&ready.clarity==='v1'&&ready.progression&&ready.cards>=2&&ready.arrows===ready.cards)break;
    await sleep(100);
  }
  if(!ready?.progression||ready.arrows!==ready.cards)throw new Error(`Beam clarity UI did not mount with one point-load arrow per shared-playback card: ${JSON.stringify(ready)}`);

  const wording=await evalv(cdp,`(() => ({summary:document.querySelector('#compareSummary')?.textContent||'',table:document.querySelector('#compareTableBody')?.textContent||'',note:document.querySelector('[data-threshold-clarity-note]')?.textContent||'',boundary:document.querySelector('.beam-strength-progression__boundary')?.textContent||''}))()`);
  if(/Highest physical threshold|Highest threshold|Physical threshold load/.test(`${wording.summary} ${wording.table}`))throw new Error(`Ambiguous threshold wording is still visible: ${JSON.stringify(wording)}`);
  if(!/Two different questions/i.test(wording.note)||!/not the shared-load serviceability PASS\/FAIL/i.test(wording.boundary))throw new Error(`Shared-load versus strength-limit boundary is not explicit: ${JSON.stringify(wording)}`);

  const start=await evalv(cdp,`(() => [...document.querySelectorAll('.beam-strength-card')].map(card=>({status:card.querySelector('.beam-strength-card__status')?.textContent||'',text:card.textContent||'',arrow:!!card.querySelector('.beam-strength-card__visual .load')})))()`);
  if(start.length<2||start.some((card)=>!card.arrow))throw new Error(`Progressive specimens are missing point-load arrows: ${JSON.stringify(start)}`);

  await evalv(cdp,`(() => { const s=document.querySelector('[data-strength-scrub]'); s.value='1000'; s.dispatchEvent(new Event('input',{bubbles:true})); return true; })()`);
  await sleep(400);
  const end=await evalv(cdp,`(() => [...document.querySelectorAll('.beam-strength-card')].map((card)=>{const values=[...card.querySelectorAll('.beam-strength-card__metrics div')].map(div=>({label:div.querySelector('small')?.textContent||'',value:div.querySelector('strong')?.textContent||''}));const get=(label)=>values.find(v=>v.label===label)?.value||'';const n=(text)=>Number((text.match(/[\d.]+/)||[])[0]);return {member:card.querySelector('.eyebrow')?.textContent||'',status:card.querySelector('.beam-strength-card__status')?.textContent||'',current:n(get('Current specimen load')),limit:n(get('Strength-limit estimate')),order:get('Order to strength limit'),last:card.classList.contains('is-last')};}))()`);
  if(end.some((card)=>!/STRENGTH LIMIT REACHED/.test(card.status)))throw new Error(`Not every specimen froze at its strength limit at full progression: ${JSON.stringify(end)}`);
  if(end.some((card)=>!(Math.abs(card.current-card.limit)<0.002)))throw new Error(`A specimen final displayed point load does not equal its own strength-limit estimate: ${JSON.stringify(end)}`);
  const max=Math.max(...end.map((card)=>card.limit));
  const last=end.filter((card)=>card.last);
  if(last.length!==1||Math.abs(last[0].limit-max)>0.002||!/last/i.test(last[0].order))throw new Error(`Last-to-limit member is not the one with the largest final point load: ${JSON.stringify(end)}`);

  const service=await evalv(cdp,`(() => [...document.querySelectorAll('.beam-strength-card__metrics')].map(root=>{const vals=[...root.children].map(div=>({k:div.querySelector('small')?.textContent||'',v:Number((div.querySelector('strong')?.textContent?.match(/[\d.]+/)||[])[0])}));return {service:vals.find(x=>x.k==='Service-limit load')?.v, strength:vals.find(x=>x.k==='Strength-limit estimate')?.v};}))()`);
  if(!service.some((item)=>Number.isFinite(item.service)&&Number.isFinite(item.strength)&&item.service<item.strength))throw new Error(`QA case did not demonstrate that serviceability can govern before strength: ${JSON.stringify(service)}`);

  console.log(`Beam strength progression QA passed: ${ready.arrows} shared-playback point-load arrows restored; all specimens froze at individual strength limits; last-to-limit carried ${max.toFixed(3)} kN.`);
}finally{try{cdp?.socket.close();}catch{}await stop(proc);await new Promise((resolve)=>server.close(resolve));await rm(work,{recursive:true,force:true});}
