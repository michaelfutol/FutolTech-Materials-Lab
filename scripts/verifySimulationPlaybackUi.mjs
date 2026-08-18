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
  throw new Error('Headless Chromium/Chrome is required for SIM-VIZ-001 QA.');
}

async function waitPort(profileDir, proc) {
  const file = join(profileDir, 'DevToolsActivePort');
  for (let i = 0; i < 500; i += 1) {
    if (proc.exitCode !== null) throw new Error(`Chromium exited early: ${proc.exitCode}`);
    try {
      const port = Number((await readFile(file, 'utf8')).trim().split(/\r?\n/)[0]);
      if (port > 0) return port;
    } catch {}
    await sleep(50);
  }
  throw new Error('Timed out waiting for Chromium DevTools port.');
}

async function pageTarget(base) {
  for (let i = 0; i < 200; i += 1) {
    try {
      const targets = await (await fetch(`${base}/json/list`)).json();
      const page = targets.find((target) => target.type === 'page' && target.webSocketDebuggerUrl);
      if (page) return page;
    } catch {}
    await sleep(50);
  }
  throw new Error('SIM-VIZ-001 Chromium page target did not appear.');
}

async function cdpOpen(url) {
  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  let id = 0;
  const pending = new Map();
  socket.addEventListener('message', (event) => {
    const msg = JSON.parse(String(event.data));
    if (!msg.id || !pending.has(msg.id)) return;
    const request = pending.get(msg.id); pending.delete(msg.id);
    msg.error ? request.reject(new Error(msg.error.message)) : request.resolve(msg.result || {});
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const requestId = ++id; pending.set(requestId, { resolve, reject }); socket.send(JSON.stringify({ id: requestId, method, params }));
  });
  return { socket, send };
}

async function evaluate(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Browser evaluation failed.');
  return result.result?.value;
}

async function stop(proc) {
  if (!proc || proc.exitCode !== null) return;
  proc.kill('SIGTERM');
  await sleep(500);
  if (proc.exitCode === null) proc.kill('SIGKILL');
}

const server = createServer((req, res) => {
  const raw = decodeURIComponent((req.url || '/').split('?')[0]);
  const rel = raw === '/' ? '/index.html' : raw;
  const file = normalize(join(root, rel));
  if (!file.startsWith(root)) return res.writeHead(403).end('Forbidden');
  res.setHeader('Content-Type', mime.get(extname(file)) || 'application/octet-stream');
  const stream = createReadStream(file);
  stream.on('error', () => res.writeHead(404).end('Not found'));
  stream.pipe(res);
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
const work = await mkdtemp(join(tmpdir(), 'ft-sim-viz-ui-'));
const profile = join(work, 'profile');
let chromeProcess;
let cdp;

try {
  chromeProcess = spawn(findChrome(), ['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage','--remote-debugging-port=0',`--user-data-dir=${profile}`,`http://127.0.0.1:${port}/index.html?build=sim-ci`], { stdio: 'ignore' });
  const debugPort = await waitPort(profile, chromeProcess);
  const target = await pageTarget(`http://127.0.0.1:${debugPort}`);
  cdp = await cdpOpen(target.webSocketDebuggerUrl);
  await cdp.send('Runtime.enable');

  let ready = false;
  for (let i = 0; i < 150; i += 1) {
    const state = await evaluate(cdp, `({ready:document.readyState,sim:!!document.querySelector('#simulationPlaybackPanel'),ramp:!!document.querySelector('#failureRampButton')})`);
    if (state?.ready === 'complete' && state.sim && state.ramp) { ready = true; break; }
    await sleep(100);
  }
  if (!ready) throw new Error('Specimen Simulation Console did not become ready.');

  await evaluate(cdp, `(() => { const rate=document.querySelector('#simLoadRate'); rate.value='1'; rate.dispatchEvent(new Event('input',{bubbles:true})); const load=document.querySelector('#loadInput'); load.value='2'; load.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  await sleep(350);
  const timing = await evaluate(cdp, `({time:document.querySelector('[data-sim-time]').textContent,load:document.querySelector('[data-sim-load]').textContent,note:document.querySelector('.sim-note').textContent,mode:document.querySelector('#simulationPlaybackPanel').dataset.simulationMode})`);
  if (timing.time !== '2.00 s' || timing.load !== '2.000 kN' || timing.mode !== 'beam') throw new Error(`Quasi-static virtual timing is inconsistent: ${JSON.stringify(timing)}`);
  if (!/not earthquake, impact, fatigue/i.test(timing.note)) throw new Error('Dynamic-time boundary is missing from SIM-VIZ-001.');

  await evaluate(cdp, `(() => { const material=document.querySelector('#materialSelect'); material.value='steel-generic-250'; material.dispatchEvent(new Event('change',{bubbles:true})); const load=document.querySelector('#loadInput'); load.value='0.1'; load.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  await sleep(350);
  await evaluate(cdp, `document.querySelector('#simPlayButton').click()`);
  let finished = false;
  for (let i = 0; i < 110; i += 1) {
    const text = await evaluate(cdp, `document.querySelector('#failureRampButton').textContent`);
    if (/RUN AGAIN FROM LOW LOAD/.test(text)) { finished = true; break; }
    await sleep(100);
  }
  if (!finished) throw new Error('SIM-VIZ-001 did not drive the trusted governing-limit solver run to completion.');
  const yielded = await evaluate(cdp, `({phase:document.querySelector('#simulationPlaybackPanel').dataset.simulationPhase,event:document.querySelector('[data-sim-event]').textContent,stage:document.querySelector('[data-sim-stage]').textContent,time:document.querySelector('[data-sim-time]').textContent})`);
  if (yielded.phase !== 'steel-first-yield' || !/FIRST YIELD/i.test(yielded.event)) throw new Error(`Simulation did not synchronize to first yield: ${JSON.stringify(yielded)}`);
  if (!/kN/.test(yielded.stage) || !/s$/.test(yielded.time)) throw new Error('Simulation HUD did not retain load/time state.');

  await evaluate(cdp, `(() => { const load=document.querySelector('#loadInput'); load.value='0.1'; load.dispatchEvent(new Event('input',{bubbles:true})); document.querySelector('#columnModeButton').click(); })()`);
  await sleep(500);
  const column = await evaluate(cdp, `({mode:document.querySelector('#simulationPlaybackPanel').dataset.simulationMode,path:document.querySelector('[data-sim-stage] .sim-member')?.getAttribute('d'),text:document.querySelector('[data-sim-stage]').textContent})`);
  if (column.mode !== 'column' || column.path !== 'M310 205 L310 55') throw new Error(`Low-load column simulation should remain straight: ${JSON.stringify(column)}`);
  if (!/remains straight until/i.test(column.text)) throw new Error('Column pre-instability boundary is missing.');

  console.log('SIM-VIZ-001 solver-driven timing, steel-yield synchronization and pre-instability column QA passed in real Chromium.');
} finally {
  try { cdp?.socket.close(); } catch {}
  await stop(chromeProcess);
  await new Promise((resolve) => server.close(resolve));
  await rm(work, { recursive: true, force: true });
}
