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
  throw new Error('Headless Chromium/Chrome is required for Connection Lab QA.');
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
  throw new Error('Connection Lab Chromium page target did not appear.');
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
  const result = await cdp.send('Runtime.evaluate', { expression, returnByValue: true });
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
  const rel = raw === '/' ? '/connections.html' : raw;
  const file = normalize(join(root, rel));
  if (!file.startsWith(root)) return res.writeHead(403).end('Forbidden');
  res.setHeader('Content-Type', mime.get(extname(file)) || 'application/octet-stream');
  const stream = createReadStream(file);
  stream.on('error', () => res.writeHead(404).end('Not found'));
  stream.pipe(res);
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
const work = await mkdtemp(join(tmpdir(), 'ft-connection-ui-'));
const profile = join(work, 'profile');
let chromeProcess;
let cdp;

try {
  chromeProcess = spawn(findChrome(), ['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage','--remote-debugging-port=0',`--user-data-dir=${profile}`,`http://127.0.0.1:${port}/connections.html?build=ci`], { stdio: 'ignore' });
  const debugPort = await waitPort(profile, chromeProcess);
  const target = await pageTarget(`http://127.0.0.1:${debugPort}`);
  cdp = await cdpOpen(target.webSocketDebuggerUrl);
  await cdp.send('Runtime.enable');

  let ready = false;
  for (let i = 0; i < 120; i += 1) {
    const state = await evaluate(cdp, `({ready:document.readyState, cards:document.querySelectorAll('#connectionResultCards .result-card').length})`);
    if (state?.ready === 'complete' && state?.cards >= 4) { ready = true; break; }
    await sleep(100);
  }
  if (!ready) throw new Error('Connection Lab did not become ready.');

  const nail = await evaluate(cdp, `({state:document.querySelector('#connectionStateBanner').textContent, figure:document.querySelectorAll('#connectionDiagram .connection-fastener').length, trace:document.querySelector('#connectionCalculationTrace').textContent})`);
  if (!/coconut palm|unclassified/i.test(nail.state)) throw new Error(`Default nail boundary missing: ${nail.state}`);
  if (nail.figure !== 4) throw new Error(`Expected 4 default nail fasteners, found ${nail.figure}`);
  if (!/54\.12/.test(nail.trace)) throw new Error('Smooth nail withdrawal manual trace missing.');

  await evaluate(cdp, `(() => { document.querySelector('#boltModeButton').click(); const side=document.querySelector('#boltSideMemberSelect'); side.value='steel'; side.dispatchEvent(new Event('change',{bubbles:true})); const wc=document.querySelector('#connectionWoodClassSelect'); wc.value='hardwood'; wc.dispatchEvent(new Event('change',{bubbles:true})); })()`);
  await sleep(250);
  const bolt = await evaluate(cdp, `({title:document.querySelector('#connectionResultTitle').textContent, plateHidden:document.querySelector('#steelPlateThicknessLabel').classList.contains('is-hidden'), cards:document.querySelector('#connectionResultCards').textContent, trace:document.querySelector('#connectionCalculationTrace').textContent, checks:document.querySelector('#connectionGeometryChecks').textContent, plate:document.querySelectorAll('#connectionDiagram .connection-plate').length})`);
  if (!/Bolt \/ steel-plate/.test(bolt.title)) throw new Error(`Bolt mode title did not persist: ${bolt.title}`);
  if (bolt.plateHidden) throw new Error('Steel plate thickness input did not appear.');
  if (!/Wood dowel-bearing/.test(bolt.cards)) throw new Error('Bolt bearing card missing.');
  if (!/77\.2/.test(bolt.trace) || !/212/.test(bolt.trace)) throw new Error('Bolt manual calculation trace missing FPL equations.');
  if (!/Spacing along grain/.test(bolt.checks)) throw new Error('Bolt spacing checks missing.');
  if (bolt.plate !== 1) throw new Error('Steel side-plate figure did not render.');

  console.log('Connection Lab nail/bolt/steel-plate interaction QA passed in real Chromium.');
} finally {
  try { cdp?.socket.close(); } catch {}
  await stop(chromeProcess);
  await new Promise((resolve) => server.close(resolve));
  await rm(work, { recursive: true, force: true });
}
