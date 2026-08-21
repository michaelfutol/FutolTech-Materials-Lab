import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { extname, join, normalize } from 'node:path';
import { tmpdir } from 'node:os';

const root=process.cwd();
const mime=new Map([['.html','text/html; charset=utf-8'],['.js','text/javascript; charset=utf-8'],['.css','text/css; charset=utf-8'],['.json','application/json; charset=utf-8']]);
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
function chromePath(){for(const name of ['google-chrome','google-chrome-stable','chromium','chromium-browser']){const r=spawnSync('which',[name],{encoding:'utf8'});if(r.status===0&&r.stdout.trim())return r.stdout.trim();}throw new Error('Chromium required');}
async function waitPort(dir,proc){const f=join(dir,'DevToolsActivePort');for(let i=0;i<400;i++){if(proc.exitCode!==null)throw new Error(`Chrome exited ${proc.exitCode}`);try{const p=Number((await readFile(f,'utf8')).split(/\r?\n/)[0]);if(p)return p;}catch{}await sleep(50);}throw new Error('DevTools timeout');}
async function target(base){for(let i=0;i<200;i++){try{const list=await(await fetch(`${base}/json/list`)).json();const p=list.find(x=>x.type==='page'&&x.webSocketDebuggerUrl);if(p)return p;}catch{}await sleep(50);}throw new Error('No page target');}
async function connect(url){const socket=new WebSocket(url);await new Promise((res,rej)=>{socket.addEventListener('open',res,{once:true});socket.addEventListener('error',rej,{once:true});});let id=0;const pending=new Map(),events=[];socket.addEventListener('message',ev=>{const m=JSON.parse(String(ev.data));if(m.id&&pending.has(m.id)){const q=pending.get(m.id);pending.delete(m.id);m.error?q.reject(new Error(m.error.message)):q.resolve(m.result||{});return;}if(m.method==='Runtime.exceptionThrown')events.push({type:'exception',text:m.params?.exceptionDetails?.exception?.description||m.params?.exceptionDetails?.text||'unknown'});if(m.method==='Runtime.consoleAPICalled')events.push({type:'console',text:(m.params?.args||[]).map(a=>a.value||a.description||'').join(' ')});});const send=(method,params={})=>new Promise((res,rej)=>{const rid=++id;pending.set(rid,{resolve:res,reject:rej});socket.send(JSON.stringify({id:rid,method,params}));});return{socket,send,events};}
async function evalv(cdp,expression){const r=await cdp.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});return r.result?.value;}
async function stop(p){if(!p||p.exitCode!==null)return;p.kill('SIGTERM');await sleep(250);if(p.exitCode===null)p.kill('SIGKILL');}

const server=createServer((req,res)=>{const raw=decodeURIComponent((req.url||'/').split('?')[0]),rel=raw==='/'?'/c-purlin-load-cases.html':raw,file=normalize(join(root,rel));if(!file.startsWith(root))return res.writeHead(403).end();res.setHeader('Content-Type',mime.get(extname(file))||'application/octet-stream');const s=createReadStream(file);s.on('error',()=>res.writeHead(404).end());s.pipe(res);});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const {port}=server.address();const work=await mkdtemp(join(tmpdir(),'ft-cplc-debug-'));const profile=join(work,'profile');let proc,cdp;
try{
 proc=spawn(chromePath(),['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--remote-debugging-port=0',`--user-data-dir=${profile}`,`http://127.0.0.1:${port}/c-purlin-load-cases.html?debug=mount`],{stdio:'ignore'});
 const dp=await waitPort(profile,proc),page=await target(`http://127.0.0.1:${dp}`);cdp=await connect(page.webSocketDebuggerUrl);await cdp.send('Runtime.enable');await cdp.send('Page.enable');await sleep(3500);
 const state=await evalv(cdp,`(() => ({ready:document.querySelector('[data-cp-loadcase-app]')?.dataset.cpLoadcaseReady||null,api:!!window.__FT_C_PURLIN_LOAD_CASES__,eq:document.querySelector('[data-cplc-equations]')?.textContent||'',section:document.querySelector('[data-cplc-section]')?.value||null}))()`);
 console.log('CPLC_DEBUG_STATE',JSON.stringify(state));
 console.log('CPLC_DEBUG_EVENTS',JSON.stringify(cdp.events,null,2));
 if(!state?.api) process.exitCode=2;
}finally{try{cdp?.socket.close();}catch{}await stop(proc);await new Promise(r=>server.close(r));await rm(work,{recursive:true,force:true});}
