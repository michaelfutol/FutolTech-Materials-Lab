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
  throw new Error('Chromium is required for shared C-purlin controls QA.');
}

async function waitPort(dir, chromeProcess) {
  const file = join(dir, 'DevToolsActivePort');
  for (let i = 0; i < 500; i += 1) {
    if (chromeProcess.exitCode !== null) throw new Error(`Chromium exited early ${chromeProcess.exitCode}`);
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

async function stop(chromeProcess) {
  if (!chromeProcess || chromeProcess.exitCode !== null) return;
  chromeProcess.kill('SIGTERM');
  await sleep(300);
  if (chromeProcess.exitCode === null) chromeProcess.kill('SIGKILL');
}

const server = createServer((req, res) => {
  const raw = decodeURIComponent((req.url || '/').split('?')[0]);
  const relative = raw === '/' ? '/index.html' : raw;
  const file = normalize(join(root, relative));
  if (!file.startsWith(root)) return res.writeHead(403).end();
  res.setHeader('Content-Type', mime.get(extname(file)) || 'application/octet-stream');
  const stream = createReadStream(file);
  stream.on('error', () => res.writeHead(404).end());
  stream.pipe(res);
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
const work = await mkdtemp(join(tmpdir(), 'ft-cp-shared-'));
const profile = join(work, 'profile');
let chromeProcess;
let cdp;

try {
  chromeProcess = spawn(chromePath(), ['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--remote-debugging-port=0',`--user-data-dir=${profile}`,`http://127.0.0.1:${port}/index.html?build=cp-shared-ci`], { stdio: 'ignore' });
  const debugPort = await waitPort(profile, chromeProcess);
  const page = await target(`http://127.0.0.1:${debugPort}`);
  cdp = await connect(page.webSocketDebuggerUrl);
  await cdp.send('Runtime.enable');
  await cdp.send('Page.enable');

  let home;
  for (let i = 0; i < 160; i += 1) {
    home = await evalValue(cdp, `(() => { const card=document.querySelector('[data-ft-cp-demo-entry]'); const link=card?.querySelector('a'); return {ready:document.readyState,card:!!card,href:link?.getAttribute('href')||'',text:card?.innerText||''}; })()`);
    if (home?.ready === 'complete' && home.card) break;
    await sleep(100);
  }
  if (!home?.card || !home.href.includes('compare.html?demo=c-purlin') || !home.text.includes('optional Member C')) {
    throw new Error(`Homepage C-purlin entry is missing or unclear: ${JSON.stringify(home)}`);
  }

  await cdp.send('Page.navigate', { url: `http://127.0.0.1:${port}/compare.html?demo=c-purlin#c-purlin-physics-bench` });
  let ready;
  for (let i = 0; i < 240; i += 1) {
    ready = await evalValue(cdp, `(() => { const panel=document.querySelector('[data-c-purlin-physics-bench]'); return {doc:document.readyState,panel:!!panel,target:Number(panel?.dataset.yieldTargetKn),active:Number(panel?.dataset.activeMembers),span:panel?.querySelector('[data-cpy-span-number]')?.value,slope:panel?.querySelector('[data-cpy-slope-number]')?.value,angles:[0,1].map(i=>document.querySelector('[data-c-purlin-orientation-display="'+i+'"]')?.value)}; })()`);
    if (ready?.doc === 'complete' && ready.panel && ready.target > 0 && ready.active === 2) break;
    await sleep(100);
  }
  if (!ready?.panel || ready.active !== 2 || ready.span !== '2' || ready.slope !== '0' || ready.angles[0] !== '0' || ready.angles[1] !== '90') {
    throw new Error(`Direct demo did not open the canonical two-member state: ${JSON.stringify(ready)}`);
  }

  await evalValue(cdp, `(() => { const panel=document.querySelector('[data-c-purlin-physics-bench]'); const box=panel.querySelector('[data-cpy-third]'); box.checked=true; box.dispatchEvent(new Event('change',{bubbles:true})); return true; })()`);
  await sleep(900);

  const third = await evalValue(cdp, `(() => { const panel=document.querySelector('[data-c-purlin-physics-bench]'); const active=[...document.querySelectorAll('#compareSelectors .compare-selector-card')].filter(c=>!c.classList.contains('is-disabled')); return {toggle:document.querySelector('[data-slot-enable="2"]')?.checked,active:active.length,presets:active.map(c=>c.querySelector('[data-slot-preset]')?.value),angles:active.map(c=>c.querySelector('[data-c-purlin-orientation-display]')?.value),panelActive:Number(panel.dataset.activeMembers)}; })()`);
  if (!third.toggle || third.active !== 3 || third.panelActive !== 3 || !third.presets.every((value) => String(value).startsWith('ph-cp-'))) {
    throw new Error(`Optional Member C did not join as a C-purlin: ${JSON.stringify(third)}`);
  }
  if (third.angles[0] !== '0' || third.angles[1] !== '90' || third.angles[2] !== '180') {
    throw new Error(`Default third C-purlin orientation state is unexpected: ${JSON.stringify(third.angles)}`);
  }

  await evalValue(cdp, `(() => { const panel=document.querySelector('[data-c-purlin-physics-bench]'); const span=panel.querySelector('[data-cpy-span-range]'); span.value='2.4'; span.dispatchEvent(new Event('input',{bubbles:true})); const slope=panel.querySelector('[data-cpy-slope-range]'); slope.value='15'; slope.dispatchEvent(new Event('input',{bubbles:true})); return true; })()`);
  await sleep(500);

  const shared = await evalValue(cdp, `(() => { const panel=document.querySelector('[data-c-purlin-physics-bench]'); const frame=window.__FT_LAST_C_PURLIN_PHYSICS_FRAME__; return {span:Number(panel.querySelector('[data-cpy-span-number]').value),slope:Number(panel.querySelector('[data-cpy-slope-number]').value),mainSpan:Number(document.getElementById('compareLengthInput').value),mainPosition:Number(document.getElementById('compareLoadPositionInput').value),mainSlope:Number(document.getElementById('compareRoofSlopeInput').value),active:Number(panel.dataset.activeMembers),frame}; })()`);
  if (shared.span !== 2.4 || shared.mainSpan !== 2.4 || shared.mainPosition !== 1.2 || shared.slope !== 15 || shared.mainSlope !== 15 || shared.active !== 3) {
    throw new Error(`Shared span/slope did not synchronize across the test: ${JSON.stringify(shared)}`);
  }
  if (!shared.frame || shared.frame.memberIds.length !== 3 || shared.frame.spanM !== 2.4 || shared.frame.roofSlopeDeg !== 15 || !shared.frame.memberLoadsKN.every((value) => value === shared.frame.loadKN)) {
    throw new Error(`Three-member shared solver frame is inconsistent: ${JSON.stringify(shared.frame)}`);
  }

  await evalValue(cdp, `(() => { const panel=document.querySelector('[data-c-purlin-physics-bench]'); panel.querySelector('[data-cpy-duration]').value='5'; panel.querySelector('[data-cpy-start]').click(); return true; })()`);
  await sleep(1100);
  const moving = await evalValue(cdp, `(() => { const panel=document.querySelector('[data-c-purlin-physics-bench]'); const frame=window.__FT_LAST_C_PURLIN_PHYSICS_FRAME__; return {mainLoad:Number(document.getElementById('compareLoadInput').value),unit:document.getElementById('compareLoadUnitSelect').value,active:Number(panel.dataset.activeMembers),progress:panel.querySelector('[data-cpy-progress]').innerText,frame}; })()`);
  if (!(moving.mainLoad > 0) || moving.unit !== 'kgf' || moving.active !== 3 || moving.progress === '0%') {
    throw new Error(`Three-member shared load animation did not advance: ${JSON.stringify(moving)}`);
  }
  if (!moving.frame?.memberLoadsKN?.every((value) => Math.abs(value - moving.frame.loadKN) < 1e-12)) {
    throw new Error(`Animated load is not identical for all active C-purlins: ${JSON.stringify(moving.frame)}`);
  }

  console.log('C-purlin shared-conditions Chromium QA passed: homepage direct entry, canonical 0°/90° pair, optional Member C, shared 2.4 m span, shared 15° slope and one identical animated load for all three specimens.');
} finally {
  cdp?.socket.close();
  await stop(chromeProcess);
  server.close();
  await rm(work, { recursive: true, force: true });
}
