import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises';
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
  throw new Error('Chromium is required for C-purlin video-download QA.');
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
    socket.send(JSON.stringify({ id:requestId, method, params }));
  });
  return { socket, send };
}

async function evalValue(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', { expression, returnByValue:true, awaitPromise:true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'Browser evaluation failed');
  return result.result?.value;
}

async function stop(chromeProcess) {
  if (!chromeProcess || chromeProcess.exitCode !== null) return;
  chromeProcess.kill('SIGTERM');
  await sleep(300);
  if (chromeProcess.exitCode === null) chromeProcess.kill('SIGKILL');
}

async function downloadedWebm(downloadDir) {
  const files = await readdir(downloadDir).catch(() => []);
  const webms = files.filter((file) => file.endsWith('.webm'));
  if (!webms.length) return null;
  const details = await Promise.all(webms.map(async (file) => ({ file, size:(await stat(join(downloadDir, file))).size })));
  return details.sort((a, b) => b.size - a.size)[0];
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
const work = await mkdtemp(join(tmpdir(), 'ft-cp-video-'));
const profile = join(work, 'profile');
const downloadDir = join(work, 'downloads');
let chromeProcess;
let cdp;

try {
  chromeProcess = spawn(chromePath(), [
    '--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
    '--autoplay-policy=no-user-gesture-required','--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    `http://127.0.0.1:${port}/compare.html?demo=c-purlin&build=cp-video-ci#c-purlin-physics-bench`
  ], { stdio:'ignore' });
  const debugPort = await waitPort(profile, chromeProcess);
  const page = await target(`http://127.0.0.1:${debugPort}`);
  cdp = await connect(page.webSocketDebuggerUrl);
  await cdp.send('Runtime.enable');
  await cdp.send('Page.enable');
  await cdp.send('Browser.setDownloadBehavior', { behavior:'allow', downloadPath:downloadDir, eventsEnabled:true });

  let ready;
  for (let i = 0; i < 240; i += 1) {
    ready = await evalValue(cdp, `(() => {
      const panel=document.querySelector('[data-c-purlin-physics-bench]');
      const canvas=panel?.querySelector('[data-cpy-polished-canvas]');
      const basis=panel?.querySelector('[data-ft-cp-test-basis]');
      return {
        ready:document.readyState,
        panel:!!panel,
        target:Number(panel?.dataset.yieldTargetKn),
        allTarget:Number(panel?.dataset.allYieldTargetKn),
        mediaRecorder:typeof MediaRecorder !== 'undefined',
        captureStream:typeof canvas?.captureStream === 'function',
        basis:!!basis,
        basisText:basis?.innerText || '',
        polish:panel?.dataset.physicsPolishV3
      };
    })()`);
    if (ready?.ready === 'complete' && ready.panel && ready.target > 0 && ready.allTarget > ready.target && ready.basis && ready.polish === 'true') break;
    await sleep(100);
  }
  if (!ready?.panel || !ready.mediaRecorder || !ready.captureStream) {
    throw new Error(`Browser does not expose the required polished recording APIs: ${JSON.stringify(ready)}`);
  }
  if (!ready.basis || !/tek screw/i.test(ready.basisText) || !/weld/i.test(ready.basisText) || !/rafter/i.test(ready.basisText)) {
    throw new Error(`Test-basis assembly context is missing: ${JSON.stringify(ready)}`);
  }

  await evalValue(cdp, `(() => {
    const panel=document.querySelector('[data-c-purlin-physics-bench]');
    panel.querySelector('[data-cpy-duration]').value='5';
    panel.querySelector('[data-cpy-record]').click();
    return true;
  })()`);

  let finished = false;
  let state;
  for (let i = 0; i < 120; i += 1) {
    await sleep(100);
    state = await evalValue(cdp, `(() => {
      const panel=document.querySelector('[data-c-purlin-physics-bench]');
      return {
        progress:panel.querySelector('[data-cpy-progress]')?.innerText,
        status:panel.querySelector('[data-cpy-status]')?.innerText,
        recordText:panel.querySelector('[data-cpy-record]')?.innerText,
        load:panel.querySelector('[data-cpy-load]')?.innerText,
        frame:window.__FT_LAST_C_PURLIN_PHYSICS_FRAME__
      };
    })()`);
    if (state?.status === 'ALL ACTIVE MEMBERS REACHED FIRST YIELD' && state.recordText === 'RECORD + DOWNLOAD VIDEO') {
      finished = true;
      break;
    }
  }
  if (!finished) throw new Error(`Recorded all-yield test did not complete the download cycle: ${JSON.stringify(state)}`);
  if (state.frame?.yieldedCount !== 2 || !(state.frame?.finalTargetKN > ready.target)) {
    throw new Error(`Final video frame did not preserve the two-member all-yield state: ${JSON.stringify(state.frame)}`);
  }

  let video = null;
  for (let i = 0; i < 40; i += 1) {
    video = await downloadedWebm(downloadDir);
    if (video?.size > 10_000) break;
    await sleep(100);
  }
  if (!video || video.size <= 10_000) {
    throw new Error(`No usable WebM was downloaded. Found: ${JSON.stringify(video)}`);
  }

  console.log(`C-purlin video-download Chromium QA passed: MediaRecorder wrote ${video.file} (${video.size} bytes) after the 5 s all-yield comparison. Test-basis text preserves tek-screw/welded-rafter context without the old assembly figure.`);
} finally {
  cdp?.socket.close();
  await stop(chromeProcess);
  server.close();
  await rm(work, { recursive:true, force:true });
}
