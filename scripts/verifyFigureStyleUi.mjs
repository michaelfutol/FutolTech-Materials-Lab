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
  throw new Error('Headless Chromium/Chrome is required for figure-style QA.');
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
  throw new Error('Figure-style Chromium page target did not appear.');
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
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'Browser evaluation failed.');
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
const work = await mkdtemp(join(tmpdir(), 'ft-figure-style-ui-'));
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
    const state = await evaluate(cdp, `({ready:document.readyState,button:!!document.querySelector('[data-figure-style-toggle]'),style:document.body.dataset.figureStyle,path:document.querySelector('#specimenDiagram .member-path')?.getAttribute('d')})`);
    if (state?.ready === 'complete' && state.button && state.style && state.path) { ready = true; break; }
    await sleep(100);
  }
  if (!ready) throw new Error('Figure-style control or specimen geometry did not become ready.');

  const initial = await evaluate(cdp, `(() => { const p=document.querySelector('#specimenDiagram .member-path'); return {style:document.body.dataset.figureStyle,label:document.querySelector('[data-figure-style-toggle]').textContent,d:p.getAttribute('d'),filter:p.getAttribute('filter'),svgStyle:document.querySelector('#specimenDiagram').dataset.ftFigureStyle}; })()`);
  if (initial.style !== 'engineering' || initial.svgStyle !== 'engineering' || !/Engineering/.test(initial.label)) throw new Error(`Expected standard engineering default, got ${JSON.stringify(initial)}`);
  if (initial.filter) throw new Error(`Engineering mode unexpectedly filters the member path: ${initial.filter}`);

  await evaluate(cdp, `document.querySelector('[data-figure-style-toggle]').click()`);
  await sleep(150);
  const pencil = await evaluate(cdp, `(() => { const svg=document.querySelector('#specimenDiagram'); const p=svg.querySelector('.member-path'); const t=svg.querySelector('text'); return {style:document.body.dataset.figureStyle,label:document.querySelector('[data-figure-style-toggle]').textContent,d:p.getAttribute('d'),filter:p.getAttribute('filter'),svgStyle:svg.dataset.ftFigureStyle,filters:svg.querySelectorAll('filter[data-ft-pencil-filter]').length,font:t ? getComputedStyle(t).fontFamily : ''}; })()`);
  if (pencil.style !== 'pencil' || pencil.svgStyle !== 'pencil' || !/Pencil/.test(pencil.label)) throw new Error(`Pencil toggle failed: ${JSON.stringify(pencil)}`);
  if (pencil.d !== initial.d) throw new Error('Pencil rendering changed the engineering member-path coordinates.');
  if (!/^url\(#ft-pencil-filter-/.test(pencil.filter || '') || pencil.filters !== 1) throw new Error(`Pencil SVG filter was not applied correctly: ${JSON.stringify(pencil)}`);
  if (!/Segoe Print|Bradley Hand|URW Chancery|cursive/i.test(pencil.font)) throw new Error(`Figure text is not using the handwritten-style stack: ${pencil.font}`);

  await evaluate(cdp, `document.querySelector('[data-figure-style-toggle]').click()`);
  await sleep(150);
  const restored = await evaluate(cdp, `(() => { const p=document.querySelector('#specimenDiagram .member-path'); return {style:document.body.dataset.figureStyle,label:document.querySelector('[data-figure-style-toggle]').textContent,d:p.getAttribute('d'),filter:p.getAttribute('filter')}; })()`);
  if (restored.style !== 'engineering' || !/Engineering/.test(restored.label)) throw new Error(`Engineering restore failed: ${JSON.stringify(restored)}`);
  if (restored.d !== initial.d || restored.filter) throw new Error(`Engineering geometry/filter did not restore exactly: ${JSON.stringify(restored)}`);

  console.log('Engineering ↔ pencil figure style preserves exact specimen geometry in real Chromium.');
} finally {
  try { cdp?.socket.close(); } catch {}
  await stop(chromeProcess);
  await new Promise((resolve) => server.close(resolve));
  await rm(work, { recursive: true, force: true });
}
