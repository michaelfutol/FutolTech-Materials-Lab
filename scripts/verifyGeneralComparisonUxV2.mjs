import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { extname, join, normalize } from 'node:path';
import { tmpdir } from 'node:os';

const root=process.cwd();
const mime=new Map([['.html','text/html; charset=utf-8'],['.js','text/javascript; charset=utf-8'],['.css','text/css; charset=utf-8'],['.json','application/json; charset=utf-8']]);
const sleep=(ms)=>new Promise((resolve)=>setTimeout(resolve,ms));
function chromePath(){for(const name of ['google-chrome','google-chrome-stable','chromium','chromium-browser']){const r=spawnSync('which',[name],{encoding:'utf8'});if(r.status===0&&r.stdout.trim())return r.stdout.trim();}throw new Error('Chromium required.');}
async function waitPort(dir,proc){const f=join(dir,'DevToolsActivePort');for(let i=0;i<500;i+=1){if(proc.exitCode!==null)throw new Error(`Chromium exited ${proc.exitCode}`);try{const p=Number((await readFile(f,'utf8')).split(/\r?\n/)[0]);if(p>0)return p;}catch{}await sleep(50);}throw new Error('Chromium DevTools timeout.');}
async function target(base){for(let i=0;i<200;i+=1){try{const list=await(await fetch(`${base}/json/list`)).json();const p=list.find((x)=>x.type==='page'&&x.webSocketDebuggerUrl);if(p)return p;}catch{}await sleep(50);}throw new Error('No page target.');}
async function connect(url){const socket=new WebSocket(url);await new Promise((res,rej)=>{socket.addEventListener('open',res,{once:true});socket.addEventListener('error',rej,{once:true});});let id=0;const pending=new Map();socket.addEventListener('message',(event)=>{const msg=JSON.parse(String(event.data));if(!msg.id||!pending.has(msg.id))return;const q=pending.get(msg.id);pending.delete(msg.id);msg.error?q.reject(new Error(msg.error.message)):q.resolve(msg.result||{});});const send=(method,params={})=>new Promise((resolve,reject)=>{const rid=++id;pending.set(rid,{resolve,reject});socket.send(JSON.stringify({id:rid,method,params}));});return{socket,send};}
async function evalv(cdp,expression){const r=await cdp.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text||'Browser eval failed');return r.result?.value;}
async function stop(proc){if(!proc||proc.exitCode!==null)return;proc.kill('SIGTERM');await sleep(300);if(proc.exitCode===null)proc.kill('SIGKILL');}
async function largestWebm(dir){const files=await readdir(dir).catch(()=>[]);const webms=files.filter((f)=>f.endsWith('.webm'));if(!webms.length)return null;const rows=await Promise.all(webms.map(async(file)=>({file,size:(await stat(join(dir,file))).size})));return rows.sort((a,b)=>b.size-a.size)[0];}

const server=createServer((req,res)=>{const raw=decodeURIComponent((req.url||'/').split('?')[0]),rel=raw==='/'?'/compare.html':raw,file=normalize(join(root,rel));if(!file.startsWith(root))return res.writeHead(403).end();res.setHeader('Content-Type',mime.get(extname(file))||'application/octet-stream');const s=createReadStream(file);s.on('error',()=>res.writeHead(404).end());s.pipe(res);});
await new Promise((resolve)=>server.listen(0,'127.0.0.1',resolve));
const {port}=server.address();const work=await mkdtemp(join(tmpdir(),'ft-general-ux-v2-')),profile=join(work,'profile'),downloads=join(work,'downloads');let proc,cdp;
try{
  proc=spawn(chromePath(),['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--window-size=1440,1000','--remote-debugging-port=0',`--user-data-dir=${profile}`,`http://127.0.0.1:${port}/compare.html?build=general-video-ci`],{stdio:'ignore'});
  const dp=await waitPort(profile,proc),page=await target(`http://127.0.0.1:${dp}`);cdp=await connect(page.webSocketDebuggerUrl);await cdp.send('Runtime.enable');await cdp.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads,eventsEnabled:true});
  let state;
  for(let i=0;i<240;i+=1){state=await evalv(cdp,`(() => { const p=document.querySelector('[data-comparison-playback]'), i=document.querySelector('.compare-inputs'), d=document.querySelector('[data-generic-record-duration]'); return {ready:document.readyState,layout:document.documentElement.dataset.generalComparisonLayout,recorder:document.documentElement.dataset.genericComparisonRecorder,parent:p?.parentElement?.className,pw:p?.getBoundingClientRect().width,iw:i?.getBoundingClientRect().width,duration:d?.value,cards:[...document.querySelectorAll('[data-comparison-playback-cards] .comparison-playback-card')].map(x=>x.getBoundingClientRect().width)}; })()`);if(state?.ready==='complete'&&state.layout==='full-width-v2'&&state.recorder==='fixed-duration-v2'&&state.duration==='16')break;await sleep(100);}
  if(state?.layout!=='full-width-v2'||state?.recorder!=='fixed-duration-v2')throw new Error(`V2 comparison UX did not mount: ${JSON.stringify(state)}`);
  if(!(state.pw>state.iw*1.6))throw new Error(`Playback is still cramped in the left column: ${JSON.stringify(state)}`);
  if(state.cards.length<2||state.cards.some((w)=>w<250))throw new Error(`Playback member cards are too narrow: ${JSON.stringify(state.cards)}`);

  await evalv(cdp,`(() => { document.querySelector('#compareBeamModeButton').click(); const load=document.querySelector('#compareLoadInput'); load.value='100'; load.dispatchEvent(new Event('input',{bubbles:true})); load.dispatchEvent(new Event('change',{bubbles:true})); const unit=document.querySelector('#compareLoadUnitSelect'); unit.value='kgf'; unit.dispatchEvent(new Event('change',{bubbles:true})); document.querySelector('[data-generic-record-duration]').value='16'; document.querySelector('[data-generic-record]').click(); return true; })()`);
  let recorded=null;for(let i=0;i<80;i+=1){await sleep(100);recorded=await evalv(cdp,`window.__FT_LAST_GENERIC_COMPARISON_VIDEO__||null`);if(recorded?.size>10000)break;}
  if(!recorded||recorded.size<=10000||recorded.mode!=='beam'||recorded.durationSeconds!==16)throw new Error(`16-second beam recording contract failed: ${JSON.stringify(recorded)}`);
  let file=null;for(let i=0;i<30;i+=1){file=await largestWebm(downloads);if(file?.size>10000)break;await sleep(100);}
  if(!file||!/general-beam-.*-16s-load-test/i.test(file.file))throw new Error(`16s beam WebM filename/download failed: ${JSON.stringify(file)}`);
  console.log(`General comparison UX V2 passed: full-width playback ${Math.round(state.pw)}px vs inputs ${Math.round(state.iw)}px, and 16s beam WebM ${file.file} (${file.size} bytes).`);
}finally{try{cdp?.socket.close();}catch{}await stop(proc);await new Promise((resolve)=>server.close(resolve));await rm(work,{recursive:true,force:true});}
