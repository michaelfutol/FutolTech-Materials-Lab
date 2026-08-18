import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { extname, join, normalize } from 'node:path';
import { tmpdir } from 'node:os';

const root = process.cwd();
const mime = new Map([['.html','text/html; charset=utf-8'],['.js','text/javascript; charset=utf-8'],['.css','text/css; charset=utf-8']]);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function chromePath() {
  for (const name of ['google-chrome','google-chrome-stable','chromium','chromium-browser']) {
    const r = spawnSync('which', [name], { encoding: 'utf8' });
    if (r.status === 0 && r.stdout.trim()) return r.stdout.trim();
  }
  throw new Error('Chromium is required for governing-limit UI QA.');
}

async function devtoolsPort(dir, proc) {
  const file = join(dir, 'DevToolsActivePort');
  for (let i = 0; i < 400; i += 1) {
    if (proc.exitCode !== null) throw new Error(`Chromium exited early (${proc.exitCode}).`);
    try { const port = Number((await readFile(file, 'utf8')).split(/\r?\n/)[0]); if (port > 0) return port; } catch {}
    await sleep(50);
  }
  throw new Error('Timed out waiting for DevTools port.');
}

async function target(base) {
  for (let i = 0; i < 160; i += 1) {
    try { const list = await (await fetch(`${base}/json/list`)).json(); const page = list.find((x) => x.type === 'page' && x.webSocketDebuggerUrl); if (page) return page; } catch {}
    await sleep(50);
  }
  throw new Error('No Chromium page target.');
}

async function cdp(wsUrl) {
  const socket = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  let id = 0; const pending = new Map();
  socket.addEventListener('message', (event) => { const msg = JSON.parse(String(event.data)); if (!msg.id || !pending.has(msg.id)) return; const p = pending.get(msg.id); pending.delete(msg.id); msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result || {}); });
  const send = (method, params = {}) => new Promise((resolve, reject) => { const requestId = ++id; pending.set(requestId, { resolve, reject }); socket.send(JSON.stringify({ id: requestId, method, params })); });
  return { socket, send };
}

async function evalv(client, expression) {
  const r = await client.send('Runtime.evaluate', { expression, returnByValue: true });
  return r.result?.value;
}

const server = createServer((req, res) => {
  const raw = decodeURIComponent((req.url || '/').split('?')[0]);
  const rel = raw === '/' ? '/index.html' : raw;
  const file = normalize(join(root, rel));
  if (!file.startsWith(root)) return res.writeHead(403).end();
  res.setHeader('Content-Type', mime.get(extname(file)) || 'application/octet-stream');
  const stream = createReadStream(file); stream.on('error', () => res.writeHead(404).end()); stream.pipe(res);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
const work = await mkdtemp(join(tmpdir(), 'ft-governing-'));
const profile = join(work, 'profile');
let proc; let client;
try {
  proc = spawn(chromePath(), ['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--remote-debugging-port=0',`--user-data-dir=${profile}`,`http://127.0.0.1:${port}/index.html?build=governing-ci`], { stdio: 'ignore' });
  const dp = await devtoolsPort(profile, proc);
  const page = await target(`http://127.0.0.1:${dp}`);
  client = await cdp(page.webSocketDebuggerUrl); await client.send('Runtime.enable');
  let ready = false;
  for (let i = 0; i < 100; i += 1) {
    const v = await evalv(client, `({ready:document.readyState, button:document.querySelector('#failureRampButton')?.textContent, events:document.querySelectorAll('.failure-ramp-event').length})`);
    if (v?.ready === 'complete' && /RUN TO GOVERNING LIMIT/.test(v.button || '') && v.events >= 2) { ready = true; break; }
    await sleep(100);
  }
  if (!ready) throw new Error('Governing-limit controls/events did not mount.');

  const initial = await evalv(client, `({labels:[...document.querySelectorAll('.failure-ramp-event')].map(x=>x.textContent), terminal:[...document.querySelectorAll('.failure-ramp-event')].some(x=>x.dataset.terminal==='true')})`);
  if (!initial.labels.some((x) => /SERVICEABILITY/.test(x))) throw new Error('Serviceability event marker missing.');
  if (!initial.labels.some((x) => /RUPTURE/.test(x))) throw new Error('Default coco rupture-reference event missing.');
  if (!initial.terminal) throw new Error('Terminal event marker missing.');

  await evalv(client, `document.querySelector('#failureRampButton').click()`);
  await sleep(260);
  await evalv(client, `document.querySelector('#failureRampPause').click()`);
  await sleep(100);
  const paused = await evalv(client, `({phase:document.querySelector('[data-phase]').textContent, pause:document.querySelector('#failureRampPause').textContent, load:Number(document.querySelector('#loadInput').value)})`);
  if (paused.pause !== 'RESUME' || !/Paused/.test(paused.phase)) throw new Error('Pause control did not persist.');
  const before = paused.load;
  await evalv(client, `document.querySelector('#failureRampStep').click()`);
  await sleep(140);
  const after = await evalv(client, `Number(document.querySelector('#loadInput').value)`);
  if (!(after > before)) throw new Error(`STEP did not advance load (${before} -> ${after}).`);
  await evalv(client, `document.querySelector('#failureRampStop').click()`);
  await sleep(80);
  const stopped = await evalv(client, `document.querySelector('[data-phase]').textContent`);
  if (!/Stopped/.test(stopped)) throw new Error(`STOP state missing: ${stopped}`);

  console.log('Run to Governing Limit timeline + pause/step/stop QA passed in real Chromium.');
} finally {
  try { client?.socket.close(); } catch {}
  if (proc?.exitCode === null) { proc.kill('SIGTERM'); await sleep(350); if (proc.exitCode === null) proc.kill('SIGKILL'); }
  await new Promise((resolve) => server.close(resolve));
  await rm(work, { recursive: true, force: true });
}
