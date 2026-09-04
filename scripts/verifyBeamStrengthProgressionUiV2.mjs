import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { tmpdir } from 'node:os';

const root=process.cwd(),sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const mime=new Map([['.html','text/html; charset=utf-8'],['.js','text/javascript; charset=utf-8'],['.css','text/css; charset=utf-8'],['.json','application/json; charset=utf-8']]);
function chrome(){for(const n of ['google-chrome','google-chrome-stable','chromium','chromium-browser']){const r=spawnSync('which',[n],{encoding:'utf8'});if(r.status===0&&r.stdout.trim())return r.stdout.trim();}throw new Error('Chromium required.');}
async function port(dir,p){const f=join(dir,'DevToolsActivePort');for(let i=0;i<500;i++){if(p.exitCode!==null)throw new Error(`Chromium exited ${p.exitCode}`);try{const n=Number((await readFile(f,'utf8')).split(/\r?\n/)[0]);if(n>0)return n;}catch{}await sleep(50);}throw new Error('DevTools timeout');}
async function page(base){for(let i=0;i<200;i++){try{const a=await(await fetch(`${base}/json/list`)).json(),p=a.find(x=>x.type==='page'&&x.webSocketDebuggerUrl);if(p)return p;}catch{}await sleep(50);}throw new Error('No page target');}
async function connect(url){const s=new WebSocket(url);await new Promise((r,j)=>{s.addEventListener('open',r,{once:true});s.addEventListener('error',j,{once:true});});let id=0;const q=new Map();s.addEventListener('message',e=>{const m=JSON.parse(String(e.data));if(!m.id||!q.has(m.id))return;const x=q.get(m.id);q.delete(m.id);m.error?x.reject(new Error(m.error.message)):x.resolve(m.result||{});});return{socket:s,send:(method,params={})=>new Promise((resolve,reject)=>{const rid=++id;q.set(rid,{resolve,reject});s.send(JSON.stringify({id:rid,method,params}));})};}
async function ev(c,e){const r=await c.send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result?.value;}
async function stop(p){if(!p||p.exitCode!==null)return;p.kill('SIGTERM');await sleep(300);if(p.exitCode===null)p.kill('SIGKILL');}

const server=createServer((req,res)=>{const raw=decodeURIComponent((req.url||'/').split('?')[0]),rel=raw==='/'?'/compare.html':raw,f=normalize(join(root,rel));if(!f.startsWith(root))return res.writeHead(403).end();res.setHeader('Content-Type',mime.get(extname(f))||'application/octet-stream');const st=createReadStream(f);st.on('error',()=>res.writeHead(404).end());st.pipe(res);});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const work=await mkdtemp(join(tmpdir(),'ft-beam-limit-v2-')),profile=join(work,'profile');let proc,cdp;
try{
  proc=spawn(chrome(),['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--remote-debugging-port=0',`--user-data-dir=${profile}`,`http://127.0.0.1:${server.address().port}/compare.html?build=beam-limit-v2`],{stdio:'ignore'});
  const dp=await port(profile,proc),pg=await page(`http://127.0.0.1:${dp}`);cdp=await connect(pg.webSocketDebuggerUrl);await cdp.send('Runtime.enable');
  let ready;for(let i=0;i<260;i++){ready=await ev(cdp,`(()=>({state:document.readyState,exp:document.documentElement.dataset.comparisonExperience,clarity:document.documentElement.dataset.beamClarity,progression:!!document.querySelector('[data-beam-strength-progression]'),cards:document.querySelectorAll('.comparison-playback-card').length,arrows:document.querySelectorAll('.comparison-playback-card [data-ft-point-load-arrow]').length}))()`);if(ready?.state==='complete'&&ready.exp==='general-materials'&&ready.clarity==='v1'&&ready.progression&&ready.cards>=2&&ready.arrows===ready.cards)break;await sleep(100);}
  if(!ready?.progression||ready.arrows!==ready.cards)throw new Error(`Shared beam arrows/progression missing: ${JSON.stringify(ready)}`);
  const words=await ev(cdp,`(()=>({s:document.querySelector('#compareSummary')?.textContent||'',t:document.querySelector('#compareTableBody')?.textContent||'',n:document.querySelector('[data-threshold-clarity-note]')?.textContent||''}))()`);
  if(/Highest physical threshold|Highest threshold|Physical threshold load/.test(`${words.s} ${words.t}`)||!/Two different questions/i.test(words.n))throw new Error(`Threshold terminology remains ambiguous: ${JSON.stringify(words)}`);
  await ev(cdp,`(()=>{const s=document.querySelector('[data-strength-scrub]');s.value='1000';s.dispatchEvent(new Event('input',{bubbles:true}));return true;})()`);await sleep(350);
  const cards=await ev(cdp,`(()=>[...document.querySelectorAll('.beam-strength-card')].map(card=>{const m=[...card.querySelectorAll('.beam-strength-card__metrics div')].map(d=>[d.querySelector('small')?.textContent||'',d.querySelector('strong')?.textContent||'']);const g=k=>m.find(x=>x[0]===k)?.[1]||'';return{status:card.querySelector('.beam-strength-card__status')?.textContent||'',current:parseFloat(g('Current specimen load')),strength:parseFloat(g('Strength-limit estimate')),service:parseFloat(g('Service-limit load')),order:g('Order to strength limit'),last:card.classList.contains('is-last'),arrow:!!card.querySelector('.beam-strength-card__visual .load')};}))()`);
  if(cards.length<2||cards.some(x=>!x.arrow||!/STRENGTH LIMIT REACHED/.test(x.status)))throw new Error(`Progressive specimen state invalid: ${JSON.stringify(cards)}`);
  if(cards.some(x=>!Number.isFinite(x.current)||!Number.isFinite(x.strength)||Math.abs(x.current-x.strength)>0.002))throw new Error(`Final point load did not freeze at each strength limit: ${JSON.stringify(cards)}`);
  const max=Math.max(...cards.map(x=>x.strength)),last=cards.filter(x=>x.last);if(last.length!==1||Math.abs(last[0].strength-max)>0.002||!/last/i.test(last[0].order))throw new Error(`Last-to-limit is not maximum final load: ${JSON.stringify(cards)}`);
  if(!cards.some(x=>Number.isFinite(x.service)&&x.service<x.strength))throw new Error(`QA did not preserve earlier serviceability crossing: ${JSON.stringify(cards)}`);
  console.log(`Beam progression V2 QA passed: ${ready.arrows} shared arrows; individual final loads freeze at strength limits; last-to-limit = ${max.toFixed(3)} kN.`);
}finally{try{cdp?.socket.close();}catch{}await stop(proc);await new Promise(r=>server.close(r));await rm(work,{recursive:true,force:true});}
