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
  throw new Error('Headless Chromium/Chrome is required for print typography QA.');
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
  throw new Error('Print typography Chromium page target did not appear.');
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
  if (result.exceptionDetails) {
    const detail = result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'Browser evaluation failed.';
    throw new Error(detail);
  }
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
const work = await mkdtemp(join(tmpdir(), 'ft-print-type-ui-'));
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
    const state = await evaluate(cdp, `({ready:document.readyState, button:!!document.querySelector('[data-print-typography-toggle]'), theme:document.body.dataset.printTypography, style:!!document.getElementById('ft-print-typography-style')})`);
    if (state?.ready === 'complete' && state.button && state.theme && state.style) { ready = true; break; }
    await sleep(100);
  }
  if (!ready) throw new Error('Print typography control/style did not become ready.');

  const initial = await evaluate(cdp, `(() => { const button=document.querySelector('[data-print-typography-toggle]'); const style=document.getElementById('ft-print-typography-style'); return {theme:document.body.dataset.printTypography,label:button?.textContent||'',stack:style?.textContent||''}; })()`);
  if (initial.theme !== 'typewriter' || !/Typewriter/.test(initial.label)) throw new Error(`Expected default typewriter theme, got ${JSON.stringify(initial)}`);
  if (!/Courier Prime/.test(initial.stack) || !/Courier New/.test(initial.stack)) throw new Error('Typewriter font stack is missing.');

  await evaluate(cdp, `document.querySelector('[data-print-typography-toggle]').click()`);
  await sleep(100);
  const modern = await evaluate(cdp, `({theme:document.body.dataset.printTypography,label:document.querySelector('[data-print-typography-toggle]')?.textContent||''})`);
  if (modern.theme !== 'modern' || !/Modern/.test(modern.label)) throw new Error(`Modern toggle failed: ${JSON.stringify(modern)}`);

  await evaluate(cdp, `document.querySelector('[data-print-typography-toggle]').click()`);
  await sleep(100);
  const restored = await evaluate(cdp, `({theme:document.body.dataset.printTypography,label:document.querySelector('[data-print-typography-toggle]')?.textContent||''})`);
  if (restored.theme !== 'typewriter' || !/Typewriter/.test(restored.label)) throw new Error(`Typewriter restore failed: ${JSON.stringify(restored)}`);

  console.log('FutolTech typewriter/modern print-theme toggle QA passed in real Chromium.');
} finally {
  try { cdp?.socket.close(); } catch {}
  await stop(chromeProcess);
  await new Promise((resolve) => server.close(resolve));
  await rm(work, { recursive: true, force: true });
}
