import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { extname, join, normalize } from 'node:path';
import { tmpdir } from 'node:os';

const root = process.cwd();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const mime = new Map([['.html','text/html; charset=utf-8'],['.js','text/javascript; charset=utf-8'],['.css','text/css; charset=utf-8'],['.json','application/json; charset=utf-8']]);

function chromePath() {
  for (const name of ['google-chrome','google-chrome-stable','chromium','chromium-browser']) {
    const found = spawnSync('which', [name], { encoding:'utf8' });
    if (found.status === 0 && found.stdout.trim()) return found.stdout.trim();
  }
  throw new Error('Chromium is required for C-purlin gravity/wind QA.');
}

async function waitPort(dir, proc) {
  const file = join(dir, 'DevToolsActivePort');
  for (let i=0;i<500;i+=1) {
    if (proc.exitCode !== null) throw new Error(`Chromium exited early ${proc.exitCode}`);
    try {
      const port = Number((await readFile(file,'utf8')).split(/\r?\n/)[0]);
      if (port > 0) return port;
    } catch {}
    await sleep(50);
  }
  throw new Error('Timed out waiting for Chromium.');
}

async function pageTarget(base) {
  for (let i=0;i<200;i+=1) {
    try {
      const list = await (await fetch(`${base}/json/list`)).json();
      const target = list.find((item) => item.type === 'page' && item.webSocketDebuggerUrl);
      if (target) return target;
    } catch {}
    await sleep(50);
  }
  throw new Error('No Chromium page target.');
}

async function connect(url) {
  const socket = new WebSocket(url);
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  let id=0; const pending=new Map();
  socket.addEventListener('message',(event)=>{const msg=JSON.parse(String(event.data));if(!msg.id||!pending.has(msg.id))return;const request=pending.get(msg.id);pending.delete(msg.id);msg.error?request.reject(new Error(msg.error.message)):request.resolve(msg.result||{});});
  const send=(method,params={})=>new Promise((resolve,reject)=>{const requestId=++id;pending.set(requestId,{resolve,reject});socket.send(JSON.stringify({id:requestId,method,params}));});
  return { socket, send };
}

async function evalValue(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', { expression, returnByValue:true, awaitPromise:true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'Browser evaluation failed');
  return result.result?.value;
}

async function stop(proc) {
  if (!proc || proc.exitCode !== null) return;
  proc.kill('SIGTERM'); await sleep(250); if(proc.exitCode===null) proc.kill('SIGKILL');
}

async function largestWebm(dir) {
  const files = (await readdir(dir).catch(()=>[])).filter((file)=>file.endsWith('.webm'));
  if (!files.length) return null;
  const details = await Promise.all(files.map(async(file)=>({file,size:(await stat(join(dir,file))).size})));
  return details.sort((a,b)=>b.size-a.size)[0];
}

const server = createServer((req,res)=>{
  const raw=decodeURIComponent((req.url||'/').split('?')[0]);
  const relative=raw==='/'?'/c-purlin-load-cases.html':raw;
  const file=normalize(join(root,relative));
  if(!file.startsWith(root)) return res.writeHead(403).end();
  res.setHeader('Content-Type',mime.get(extname(file))||'application/octet-stream');
  const stream=createReadStream(file);stream.on('error',()=>res.writeHead(404).end());stream.pipe(res);
});

await new Promise((resolve)=>server.listen(0,'127.0.0.1',resolve));
const { port } = server.address();
const work=await mkdtemp(join(tmpdir(),'ft-cp-gw-')); const profile=join(work,'profile'); const downloads=join(work,'downloads');
let chromeProcess; let cdp;

try {
  chromeProcess=spawn(chromePath(),['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required','--remote-debugging-port=0',`--user-data-dir=${profile}`,`http://127.0.0.1:${port}/c-purlin-load-cases.html?build=gw-ci`],{stdio:'ignore'});
  const debugPort=await waitPort(profile,chromeProcess); const target=await pageTarget(`http://127.0.0.1:${debugPort}`); cdp=await connect(target.webSocketDebuggerUrl);
  await cdp.send('Runtime.enable'); await cdp.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads,eventsEnabled:true});

  let ready;
  for(let i=0;i<220;i+=1){
    ready=await evalValue(cdp,`(() => { const root=document.querySelector('[data-cp-loadcase-app]'); const v=document.querySelector('[data-cplc-vector]'); const video=document.querySelector('[data-cplc-video]'); return {ready:document.readyState,app:root?.dataset.cpLoadcaseReady,vector:[v?.width,v?.height],video:[video?.width,video?.height],api:!!window.__FT_C_PURLIN_LOAD_CASES__,original:[...document.querySelectorAll('a[href]')].some(a=>(a.getAttribute('href')||'').includes('c-purlin-test.html')),orient:[0,1].map(i=>document.querySelector('[data-cplc-orientation="'+i+'"]')?.value),equations:document.querySelector('[data-cplc-equations]')?.innerText||'',layout:root?.dataset.vectorFigureLayout||'',slope:root?.dataset.vectorFigureSlopeDeg||'',rotation:root?.dataset.vectorFigurePurlinRotationDeg||''}; })()`);
    if(ready?.ready==='complete'&&ready.app==='true'&&ready.api&&ready.layout==='seated-nonoverlap-v1') break;
    await sleep(100);
  }
  if(ready?.app!=='true'||!ready.api) throw new Error(`Gravity/wind app did not mount: ${JSON.stringify(ready)}`);
  if(ready.vector[0]!==1280||ready.vector[1]!==520||ready.video[0]!==1280||ready.video[1]!==720) throw new Error(`Canvas sizes changed unexpectedly: ${JSON.stringify(ready)}`);
  if(ready.layout!=='seated-nonoverlap-v1') throw new Error(`Clean static vector layout did not mount: ${JSON.stringify(ready)}`);
  if(!ready.original) throw new Error('Dedicated gravity/wind page lost the link back to the original C-purlin bench.');
  if(ready.orient[0]!=='0'||ready.orient[1]!=='90') throw new Error(`Canonical standing/flat pair changed: ${JSON.stringify(ready.orient)}`);
  if(!/M⊥ = w⊥L²\/8/.test(ready.equations)||!/5wL⁴\/\(384EI\)/.test(ready.equations)) throw new Error('Live equation basis is missing UDL moment/deflection formulas.');

  const envelope=await evalValue(cdp,`(() => { const set=(sel,val)=>{const el=document.querySelector(sel);el.value=String(val);el.dispatchEvent(new Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}));}; set('[data-cplc-mode]','envelope'); set('[data-cplc-wind-uplift]',2.5); set('[data-cplc-wind-downward]',.5); set('[data-cplc-slope]',30); const s=window.__FT_C_PURLIN_LOAD_CASES__.getState(); return {sense:s.context.common.windSense,pressure:s.context.common.windPressureKPa,label:document.querySelector('[data-cplc-case]').innerText}; })()`);
  if(envelope.sense!=='uplift'||Math.abs(envelope.pressure-2.5)>1e-9||!/AUTO UPLIFT/.test(envelope.label)) throw new Error(`Envelope did not choose the larger supplied uplift case: ${JSON.stringify(envelope)}`);
  await sleep(80);
  const vectorMeta=await evalValue(cdp,`(() => { const root=document.querySelector('[data-cp-loadcase-app]'); return {layout:root.dataset.vectorFigureLayout,slope:Number(root.dataset.vectorFigureSlopeDeg),rotation:Number(root.dataset.vectorFigurePurlinRotationDeg),legacyHidden:getComputedStyle(document.querySelector('[data-cplc-vector-legacy]')).display==='none'}; })()`);
  if(vectorMeta.layout!=='seated-nonoverlap-v1'||Math.abs(vectorMeta.slope-30)>1e-9||Math.abs(vectorMeta.rotation+30)>1e-9||!vectorMeta.legacyHidden) throw new Error(`Static roof installation geometry is not coordinated with 30° slope: ${JSON.stringify(vectorMeta)}`);

  const paper=await evalValue(cdp,`(() => { const b=document.querySelector('[data-ft-theme-toggle]'); if(document.documentElement.dataset.ftTheme!=='paper-matte') b?.click(); window.__FT_C_PURLIN_LOAD_CASES__.render(); return {theme:document.documentElement.dataset.ftTheme}; })()`);
  if(paper.theme!=='paper-matte') throw new Error(`PaperMatte did not activate: ${JSON.stringify(paper)}`);

  const initial=await evalValue(cdp,`(() => { const checksum=(canvas)=>{const d=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let s=0;for(let i=0;i<d.length;i+=4096)s=(s+d[i]+d[i+1]+d[i+2])%1000000007;return s}; const vector=document.querySelector('[data-cplc-vector]'); const video=document.querySelector('[data-cplc-video]'); const duration=document.querySelector('[data-cplc-duration]'); const opt=new Option('CI · 2 s','2');duration.appendChild(opt);duration.value='2'; window.__FT_C_PURLIN_LOAD_CASES__.reset(); return {factor:window.__FT_C_PURLIN_LOAD_CASES__.getState().factor,vector:checksum(vector),video:checksum(video)}; })()`);
  if(initial.factor!==0) throw new Error(`Animation did not reset to zero: ${JSON.stringify(initial)}`);

  await evalValue(cdp,`document.querySelector('[data-cplc-start]').click()`); await sleep(350);
  const early=await evalValue(cdp,`(() => { const c=document.querySelector('[data-cplc-video]'); const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let sum=0;for(let i=0;i<d.length;i+=4096)sum=(sum+d[i]+d[i+1]+d[i+2])%1000000007;return {factor:window.__FT_C_PURLIN_LOAD_CASES__.getState().factor,video:sum,vector:document.querySelector('[data-cplc-vector]').toDataURL().slice(-4000)}; })()`);
  await sleep(400);
  const mid=await evalValue(cdp,`(() => { const c=document.querySelector('[data-cplc-video]'); const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let sum=0;for(let i=0;i<d.length;i+=4096)sum=(sum+d[i]+d[i+1]+d[i+2])%1000000007;return {factor:window.__FT_C_PURLIN_LOAD_CASES__.getState().factor,video:sum,vector:document.querySelector('[data-cplc-vector]').toDataURL().slice(-4000)}; })()`);
  if(!(early.factor>0&&mid.factor>early.factor)) throw new Error(`Load factor is not gradual: ${JSON.stringify({early,mid})}`);
  if(initial.video===early.video&&early.video===mid.video) throw new Error(`Visible video canvas did not change progressively: ${JSON.stringify({initial:initial.video,early:early.video,mid:mid.video})}`);
  if(early.vector!==mid.vector) throw new Error('Static roof/vector canvas changed while only the longitudinal animation was running.');

  await evalValue(cdp,`(() => { window.__FT_C_PURLIN_LOAD_CASES__.reset(); document.querySelector('[data-cplc-record]').click(); return true; })()`);
  let recorded;
  for(let i=0;i<80;i+=1){await sleep(100);recorded=await evalValue(cdp,`(() => { const r=document.querySelector('[data-cp-loadcase-app]'); return {bytes:Number(r.dataset.lastRecordedBytes||0),theme:r.dataset.lastRecordedTheme||'',text:document.querySelector('[data-cplc-record]').innerText,recording:window.__FT_C_PURLIN_LOAD_CASES__.getState().recording}; })()`);if(recorded.bytes>10000&&recorded.text==='RECORD + DOWNLOAD VIDEO')break;}
  if(!(recorded?.bytes>10000)||recorded.theme!=='paper-matte') throw new Error(`PaperMatte recording did not finish correctly: ${JSON.stringify(recorded)}`);
  let video=null;for(let i=0;i<40;i+=1){video=await largestWebm(downloads);if(video?.size>10000)break;await sleep(100);}
  if(!video||video.size<=10000||!/gravity-wind/.test(video.file)||!/paper-matte/.test(video.file)) throw new Error(`No usable gravity/wind PaperMatte WebM downloaded: ${JSON.stringify(video)}`);

  console.log(`C-purlin gravity/wind Chromium QA passed: seated 30° purlin installation figure, separated vector labels, original-bench navigation, uplift envelope selection, gradual longitudinal animation, static upper figure and PaperMatte WebM ${video.file} (${video.size} bytes).`);
} finally {
  cdp?.socket.close(); await stop(chromeProcess); server.close(); await rm(work,{recursive:true,force:true});
}
