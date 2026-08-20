import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { extname, join, normalize } from 'node:path';
import { tmpdir } from 'node:os';

const root = process.cwd();
const mime = new Map([['.html','text/html; charset=utf-8'],['.js','text/javascript; charset=utf-8'],['.css','text/css; charset=utf-8'],['.json','application/json; charset=utf-8']]);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function chromePath(){for(const name of ['google-chrome','google-chrome-stable','chromium','chromium-browser']){const r=spawnSync('which',[name],{encoding:'utf8'});if(r.status===0&&r.stdout.trim())return r.stdout.trim();}throw new Error('Chromium is required for general comparison video QA.');}
async function waitPort(dir,proc){const file=join(dir,'DevToolsActivePort');for(let i=0;i<500;i+=1){if(proc.exitCode!==null)throw new Error(`Chromium exited early ${proc.exitCode}`);try{const port=Number((await readFile(file,'utf8')).split(/\r?\n/)[0]);if(port>0)return port;}catch{}await sleep(50);}throw new Error('Timed out waiting for Chromium.');}
async function target(base){for(let i=0;i<200;i+=1){try{const list=await(await fetch(`${base}/json/list`)).json();const page=list.find((entry)=>entry.type==='page'&&entry.webSocketDebuggerUrl);if(page)return page;}catch{}await sleep(50);}throw new Error('No Chromium page target.');}
async function connect(url){const socket=new WebSocket(url);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});let id=0;const pending=new Map();socket.addEventListener('message',(event)=>{const msg=JSON.parse(String(event.data));if(!msg.id||!pending.has(msg.id))return;const req=pending.get(msg.id);pending.delete(msg.id);msg.error?req.reject(new Error(msg.error.message)):req.resolve(msg.result||{});});const send=(method,params={})=>new Promise((resolve,reject)=>{const rid=++id;pending.set(rid,{resolve,reject});socket.send(JSON.stringify({id:rid,method,params}));});return{socket,send};}
async function evalv(cdp,expression){const r=await cdp.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text||'Browser evaluation failed');return r.result?.value;}
async function stop(proc){if(!proc||proc.exitCode!==null)return;proc.kill('SIGTERM');await sleep(350);if(proc.exitCode===null)proc.kill('SIGKILL');}
async function largestWebm(dir){const files=await readdir(dir).catch(()=>[]);const webms=files.filter((file)=>file.endsWith('.webm'));if(!webms.length)return null;const info=await Promise.all(webms.map(async(file)=>({file,size:(await stat(join(dir,file))).size})));return info.sort((a,b)=>b.size-a.size)[0];}

const server=createServer((req,res)=>{const raw=decodeURIComponent((req.url||'/').split('?')[0]),rel=raw==='/'?'/compare.html':raw,file=normalize(join(root,rel));if(!file.startsWith(root))return res.writeHead(403).end();res.setHeader('Content-Type',mime.get(extname(file))||'application/octet-stream');const stream=createReadStream(file);stream.on('error',()=>res.writeHead(404).end());stream.pipe(res);});
await new Promise((resolve)=>server.listen(0,'127.0.0.1',resolve));
const {port}=server.address();
const work=await mkdtemp(join(tmpdir(),'ft-general-video-')),profile=join(work,'profile'),downloadDir=join(work,'downloads');
let proc,cdp;

try{
  proc=spawn(chromePath(),['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required','--remote-debugging-port=0',`--user-data-dir=${profile}`,`http://127.0.0.1:${port}/compare.html?build=general-video-ci`],{stdio:'ignore'});
  const dp=await waitPort(profile,proc),page=await target(`http://127.0.0.1:${dp}`);cdp=await connect(page.webSocketDebuggerUrl);await cdp.send('Runtime.enable');await cdp.send('Page.enable');await cdp.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloadDir,eventsEnabled:true});

  let ready;
  for(let i=0;i<240;i+=1){ready=await evalv(cdp,`(() => ({ready:document.readyState,experience:document.documentElement.dataset.comparisonExperience,playback:!!document.querySelector('[data-comparison-playback]'),video:!!document.querySelector('[data-generic-comparison-video]'),canvas:!!document.querySelector('[data-generic-video-canvas]'),cpBench:!!document.querySelector('[data-c-purlin-physics-bench]'),benchmark:!!document.querySelector('[data-cp-benchmark]'),materials:[...document.querySelectorAll('#compareSelectors [data-slot-material]')].map(x=>x.value),presets:[...document.querySelectorAll('#compareSelectors [data-slot-preset]')].map(x=>x.value)}))()`);if(ready?.ready==='complete'&&ready.experience==='general-materials'&&ready.playback&&ready.video&&ready.canvas)break;await sleep(100);}
  if(!ready?.video||ready.experience!=='general-materials')throw new Error(`Generic comparison experience did not mount: ${JSON.stringify(ready)}`);
  if(ready.cpBench||ready.benchmark)throw new Error(`General comparison still mounted C-purlin-only UI: ${JSON.stringify(ready)}`);
  if(ready.presets.every((value)=>/c100|c-purlin/i.test(value)))throw new Error(`General comparison was replaced by C-purlin specimens: ${JSON.stringify(ready.presets)}`);

  await evalv(cdp,`(() => { document.querySelector('#compareColumnModeButton').click(); const load=document.querySelector('#compareLoadInput'); load.value='100'; load.dispatchEvent(new Event('input',{bubbles:true})); load.dispatchEvent(new Event('change',{bubbles:true})); const unit=document.querySelector('#compareLoadUnitSelect'); unit.value='kgf'; unit.dispatchEvent(new Event('change',{bubbles:true})); const speed=document.querySelector('[data-cp-speed]'); speed.value='25'; speed.dispatchEvent(new Event('change',{bubbles:true})); if(document.documentElement.dataset.ftTheme!=='paper-matte') document.querySelector('[data-ft-theme-toggle]')?.click(); return true; })()`);
  await sleep(500);
  const compression=await evalv(cdp,`(() => { const snap=window.__FT_GENERIC_COMPARISON_VIDEO__?.redraw?.(); return snap ? {mode:snap.definition.mode,theme:snap.palette.paper?'paper-matte':'lab-dark',names:snap.result.records.map(r=>r.displayMaterialName),sections:snap.result.records.map(r=>r.sectionLabel),shortening:snap.result.records.map(r=>r.result.shorteningMm),capacityUse:snap.result.records.map(r=>r.capacityRatio),canvas:[window.__FT_GENERIC_COMPARISON_VIDEO__.canvas.width,window.__FT_GENERIC_COMPARISON_VIDEO__.canvas.height]} : null; })()`);
  if(!compression||compression.mode!=='compression'||compression.theme!=='paper-matte')throw new Error(`Compression/PaperMatte generic canvas state mismatch: ${JSON.stringify(compression)}`);
  if(compression.canvas[0]!==1280||compression.canvas[1]!==720)throw new Error(`Generic video canvas size mismatch: ${JSON.stringify(compression.canvas)}`);
  if(compression.shortening.some((value)=>!(value>0)))throw new Error(`Compression canvas is not using solver shortening: ${JSON.stringify(compression.shortening)}`);
  if(compression.sections.some((value)=>/c100/i.test(value)))throw new Error(`Compression video substituted a C-purlin section: ${JSON.stringify(compression.sections)}`);

  async function scrub(value){await evalv(cdp,`(() => { const s=document.querySelector('[data-cp-scrub]');s.value='${value}';s.dispatchEvent(new Event('input',{bubbles:true})); })()`);await sleep(250);return evalv(cdp,`(() => { const snap=window.__FT_GENERIC_COMPARISON_VIDEO__?.redraw?.(); return {load:snap?.frame?.loadKN,shortening:snap?.result?.records?.map(r=>r.result.shorteningMm)}; })()`);}
  const early=await scrub(250),late=await scrub(750);
  if(!(early.load>0&&late.load>early.load))throw new Error(`Generic compression playback load is not progressive: ${JSON.stringify({early,late})}`);
  if(!late.shortening.every((value,index)=>value>early.shortening[index]))throw new Error(`Generic compression shortening did not grow progressively: ${JSON.stringify({early,late})}`);

  await evalv(cdp,`document.querySelector('[data-generic-record]').click()`);
  let videoState=null;
  for(let i=0;i<160;i+=1){await sleep(100);videoState=await evalv(cdp,`window.__FT_LAST_GENERIC_COMPARISON_VIDEO__ || null`);if(videoState?.size>10000)break;}
  if(!videoState||videoState.size<=10000||videoState.mode!=='compression'||videoState.theme!=='paper-matte')throw new Error(`Generic PaperMatte compression recording failed: ${JSON.stringify(videoState)}`);
  let file=null;for(let i=0;i<50;i+=1){file=await largestWebm(downloadDir);if(file?.size>10000)break;await sleep(100);}
  if(!file||file.size<=10000)throw new Error(`No usable generic WebM was downloaded: ${JSON.stringify(file)}`);
  if(!/general-compression-paper-matte/i.test(file.file))throw new Error(`Generic video filename does not identify mode/theme: ${file.file}`);

  console.log(`General material comparison QA passed: no specialist C-purlin bench on compare.html, compression shortening progressed ${early.load.toFixed(4)}→${late.load.toFixed(4)} kN, and PaperMatte WebM ${file.file} (${file.size} bytes) downloaded.`);
}finally{try{cdp?.socket.close();}catch{}await stop(proc);await new Promise((resolve)=>server.close(resolve));await rm(work,{recursive:true,force:true});}
