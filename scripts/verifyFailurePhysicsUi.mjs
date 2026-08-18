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
  throw new Error('Headless Chromium/Chrome is required for Failure Physics QA.');
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
  throw new Error('Failure Physics Chromium page target did not appear.');
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
const work = await mkdtemp(join(tmpdir(), 'ft-failure-physics-ui-'));
const profile = join(work, 'profile');
let chromeProcess;
let cdp;

try {
  chromeProcess = spawn(findChrome(), ['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage','--remote-debugging-port=0',`--user-data-dir=${profile}`,`http://127.0.0.1:${port}/index.html?build=ci`], { stdio: 'ignore' });
  const debugPort = await waitPort(profile, chromeProcess);
  const target = await pageTarget(`http://127.0.0.1:${debugPort}`);
  cdp = await cdpOpen(target.webSocketDebuggerUrl);
  await cdp.send('Runtime.enable');

  let ready = false;
  for (let i = 0; i < 150; i += 1) {
    const state = await evaluate(cdp, `({ready:document.readyState,panel:!!document.querySelector('#failurePhysicsPanel'),ramp:!!document.querySelector('#failureRampButton')})`);
    if (state?.ready === 'complete' && state.panel && state.ramp) { ready = true; break; }
    await sleep(100);
  }
  if (!ready) throw new Error('Failure Physics panel did not become ready.');

  const initial = await evaluate(cdp, `({state:document.querySelector('[data-fp-state]').textContent, boundary:document.querySelector('[data-fp-boundary]').textContent})`);
  if (initial.state !== 'ELASTIC RESPONSE') throw new Error(`Expected initial elastic state, got ${initial.state}`);
  if (!/only visualizes events already produced/i.test(initial.boundary)) throw new Error('Initial evidence boundary is missing.');

  await evaluate(cdp, `(() => { const material=document.querySelector('#materialSelect'); material.value='steel-generic-250'; material.dispatchEvent(new Event('change',{bubbles:true})); const load=document.querySelector('#loadInput'); load.value='0.1'; load.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  await sleep(350);
  await evaluate(cdp, `document.querySelector('#failureRampButton').click()`);

  let finished = false;
  for (let i = 0; i < 100; i += 1) {
    const text = await evaluate(cdp, `document.querySelector('#failureRampButton').textContent`);
    if (/RUN AGAIN FROM LOW LOAD/.test(text)) { finished = true; break; }
    await sleep(100);
  }
  if (!finished) throw new Error('Steel first-yield governing-limit run did not finish.');

  const yielded = await evaluate(cdp, `({state:document.querySelector('[data-fp-state]').textContent,boundary:document.querySelector('[data-fp-boundary]').textContent,visual:document.querySelector('[data-fp-visual]').textContent,mode:document.querySelector('#failurePhysicsPanel').dataset.failureMode})`);
  if (yielded.state !== 'FIRST YIELD' || yielded.mode !== 'steel-first-yield') throw new Error(`Failure Physics did not land on first yield: ${JSON.stringify(yielded)}`);
  if (!/not fracture/i.test(yielded.boundary) || !/FIRST-YIELD ONSET/i.test(yielded.visual)) throw new Error('First-yield visual/boundary is not honest.');

  await evaluate(cdp, `(() => { const load=document.querySelector('#loadInput'); load.value='0.1'; load.dispatchEvent(new Event('input',{bubbles:true})); document.querySelector('#columnModeButton').click(); })()`);
  await sleep(500);
  const preBuckling = await evaluate(cdp, `({state:document.querySelector('[data-fp-state]').textContent,visual:document.querySelector('[data-fp-visual]').textContent,path:document.querySelector('[data-fp-visual] .fp-member')?.getAttribute('d')})`);
  if (preBuckling.state !== 'ELASTIC RESPONSE') throw new Error(`Low-load column should be elastic, got ${preBuckling.state}`);
  if (!/no instability event crossed/i.test(preBuckling.visual)) throw new Error('Column visual implies instability before a stored event.');
  if (preBuckling.path !== 'M 160 250 L 160 70') throw new Error(`Pre-buckling column should remain straight, got ${preBuckling.path}`);

  console.log('Failure Physics event-linked steel-yield and pre-buckling column QA passed in real Chromium.');
} finally {
  try { cdp?.socket.close(); } catch {}
  await stop(chromeProcess);
  await new Promise((resolve) => server.close(resolve));
  await rm(work, { recursive: true, force: true });
}
