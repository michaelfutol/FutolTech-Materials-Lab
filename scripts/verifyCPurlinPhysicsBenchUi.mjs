import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { extname, join, normalize } from 'node:path';
import { tmpdir } from 'node:os';

const root = process.cwd();
const mime = new Map([['.html','text/html; charset=utf-8'],['.js','text/javascript; charset=utf-8'],['.css','text/css; charset=utf-8'],['.json','application/json; charset=utf-8']]);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function chromePath() {
  for (const name of ['google-chrome','google-chrome-stable','chromium','chromium-browser']) {
    const found = spawnSync('which', [name], { encoding: 'utf8' });
    if (found.status === 0 && found.stdout.trim()) return found.stdout.trim();
  }
  throw new Error('Chromium is required for C-purlin physics-bench QA.');
}

async function waitPort(dir, process) {
  const file = join(dir, 'DevToolsActivePort');
  for (let i = 0; i < 500; i += 1) {
    if (process.exitCode !== null) throw new Error(`Chromium exited early ${process.exitCode}`);
    try {
      const port = Number((await readFile(file, 'utf8')).split(/\r?\n/)[0]);
      if (port > 0) return port;
    } catch {}
    await sleep(50);
  }
  throw new Error('Timed out waiting for Chromium.');
}

async function target(base) {
  for (let i = 0; i < 200; i += 1) {
    try {
      const list = await (await fetch(`${base}/json/list`)).json();
      const page = list.find((entry) => entry.type === 'page' && entry.webSocketDebuggerUrl);
      if (page) return page;
    } catch {}
    await sleep(50);
  }
  throw new Error('No Chromium page target.');
}

async function connect(url) {
  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  let id = 0;
  const pending = new Map();
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(String(event.data));
    if (!message.id || !pending.has(message.id)) return;
    const request = pending.get(message.id);
    pending.delete(message.id);
    message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result || {});
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const requestId = ++id;
    pending.set(requestId, { resolve, reject });
    socket.send(JSON.stringify({ id: requestId, method, params }));
  });
  return { socket, send };
}

async function evalValue(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'Browser evaluation failed');
  return result.result?.value;
}

async function stop(process) {
  if (!process || process.exitCode !== null) return;
  process.kill('SIGTERM');
  await sleep(300);
  if (process.exitCode === null) process.kill('SIGKILL');
}

const server = createServer((req, res) => {
  const raw = decodeURIComponent((req.url || '/').split('?')[0]);
  const relative = raw === '/' ? '/compare.html' : raw;
  const file = normalize(join(root, relative));
  if (!file.startsWith(root)) return res.writeHead(403).end();
  res.setHeader('Content-Type', mime.get(extname(file)) || 'application/octet-stream');
  const stream = createReadStream(file);
  stream.on('error', () => res.writeHead(404).end());
  stream.pipe(res);
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
const work = await mkdtemp(join(tmpdir(), 'ft-cp-physics-'));
const profile = join(work, 'profile');
let process;
let cdp;

try {
  process = spawn(chromePath(), ['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--remote-debugging-port=0',`--user-data-dir=${profile}`,`http://127.0.0.1:${port}/compare.html?build=cp-physics-ci`], { stdio: 'ignore' });
  const debugPort = await waitPort(profile, process);
  const page = await target(`http://127.0.0.1:${debugPort}`);
  cdp = await connect(page.webSocketDebuggerUrl);
  await cdp.send('Runtime.enable');

  let ready = false;
  let state;
  for (let i = 0; i < 220; i += 1) {
    state = await evalValue(cdp, `(() => {
      const panel=document.querySelector('[data-c-purlin-physics-bench]');
      const canvas=panel?.querySelector('[data-cpy-canvas]');
      return {ready:document.readyState,panel:!!panel,canvas:!!canvas,width:canvas?.width,height:canvas?.height,target:Number(panel?.dataset.yieldTargetKn),angles:[0,1].map(i=>document.querySelector('[data-c-purlin-orientation-display="'+i+'"]')?.value),span:panel?.querySelector('[data-cpy-span-number]')?.value,duration:panel?.querySelector('[data-cpy-duration]')?.value,note:panel?.querySelector('.c-purlin-physics-bench__note')?.innerText||'',record:!!panel?.querySelector('[data-cpy-record]')};
    })()`);
    if (state?.ready === 'complete' && state.panel && state.canvas && state.target > 0 && state.angles[0] === '0' && state.angles[1] === '90') { ready = true; break; }
    await sleep(100);
  }
  if (!ready) throw new Error(`C-purlin physics bench did not reach canonical ready state: ${JSON.stringify(state)}`);
  if (state.width !== 1280 || state.height !== 720) throw new Error(`Physics video canvas is not 1280x720: ${JSON.stringify(state)}`);
  if (state.span !== '2' || state.duration !== '12') throw new Error(`Default 2 m / 12 s dramatic benchmark changed: ${JSON.stringify(state)}`);
  if (!state.record) throw new Error('Record + download video control is missing.');
  if (!state.note.includes('tek-screwed') || !state.note.includes('welded to rafters')) throw new Error(`Actual assembly context is missing: ${state.note}`);

  await evalValue(cdp, `(() => { const panel=document.querySelector('[data-c-purlin-physics-bench]'); panel.querySelector('[data-cpy-duration]').value='5'; panel.querySelector('[data-cpy-start]').click(); return true; })()`);
  await sleep(1100);
  const moving = await evalValue(cdp, `(() => { const panel=document.querySelector('[data-c-purlin-physics-bench]'); return {load:panel.querySelector('[data-cpy-load]').innerText,progress:panel.querySelector('[data-cpy-progress]').innerText,status:panel.querySelector('[data-cpy-status]').innerText,mainUnit:document.getElementById('compareLoadUnitSelect').value,mainLoad:Number(document.getElementById('compareLoadInput').value)}; })()`);
  if (!(moving.mainLoad > 0) || moving.mainUnit !== 'kgf' || moving.progress === '0%') throw new Error(`Physics test did not animate solver load into kgf UI: ${JSON.stringify(moving)}`);
  if (!moving.status.includes('ELASTIC') && !moving.status.includes('APPROACHING')) throw new Error(`Unexpected live test state: ${JSON.stringify(moving)}`);

  console.log(`C-purlin physics bench Chromium QA passed: 2 m 0°/90° load-to-first-yield demo mounted, animated in kgf, and exposes a 1280x720 recordable canvas. Target=${state.target.toFixed(4)} kN.`);
} finally {
  cdp?.socket.close();
  await stop(process);
  server.close();
  await rm(work, { recursive: true, force: true });
}
