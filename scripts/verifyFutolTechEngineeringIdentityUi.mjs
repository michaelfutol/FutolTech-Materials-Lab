import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { extname, join, normalize } from 'node:path';
import { tmpdir } from 'node:os';

const root = process.cwd();
const mime = new Map([['.html','text/html; charset=utf-8'],['.js','text/javascript; charset=utf-8'],['.css','text/css; charset=utf-8']]);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function findChrome() {
  for (const name of ['google-chrome','google-chrome-stable','chromium','chromium-browser']) {
    const result = spawnSync('which', [name], { encoding:'utf8' });
    if (result.status === 0 && result.stdout.trim()) return result.stdout.trim();
  }
  throw new Error('Headless Chromium/Chrome is required for FutolTech engineering-identity QA.');
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
  throw new Error('FutolTech engineering-identity Chromium target did not appear.');
}

async function cdpOpen(url) {
  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once:true });
    socket.addEventListener('error', reject, { once:true });
  });
  let id = 0;
  const pending = new Map();
  socket.addEventListener('message', (event) => {
    const msg = JSON.parse(String(event.data));
    if (!msg.id || !pending.has(msg.id)) return;
    const request = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? request.reject(new Error(msg.error.message)) : request.resolve(msg.result || {});
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const requestId = ++id;
    pending.set(requestId, { resolve, reject });
    socket.send(JSON.stringify({ id:requestId, method, params }));
  });
  return { socket, send };
}

async function evaluate(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', { expression, returnByValue:true, awaitPromise:true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'Browser evaluation failed.');
  return result.result?.value;
}

async function stop(proc) {
  if (!proc || proc.exitCode !== null) return;
  proc.kill('SIGTERM');
  for (let i = 0; i < 20 && proc.exitCode === null; i += 1) await sleep(50);
  if (proc.exitCode === null) proc.kill('SIGKILL');
  for (let i = 0; i < 20 && proc.exitCode === null; i += 1) await sleep(50);
}

async function removeWorkDir(path) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try { await rm(path, { recursive:true, force:true }); return; }
    catch (error) {
      if (attempt === 4) throw error;
      await sleep(150 * (attempt + 1));
    }
  }
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
const work = await mkdtemp(join(tmpdir(), 'ft-engineering-identity-'));
const profile = join(work, 'profile');
let chromeProcess;
let cdp;

try {
  chromeProcess = spawn(findChrome(), [
    '--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage',
    '--remote-debugging-port=0',`--user-data-dir=${profile}`,
    `http://127.0.0.1:${port}/index.html?build=ci`
  ], { stdio:'ignore' });

  const debugPort = await waitPort(profile, chromeProcess);
  const target = await pageTarget(`http://127.0.0.1:${debugPort}`);
  cdp = await cdpOpen(target.webSocketDebuggerUrl);
  await cdp.send('Runtime.enable');

  let ready = false;
  for (let i = 0; i < 150; i += 1) {
    const state = await evaluate(cdp, `({
      ready:document.readyState,
      identity:document.documentElement.dataset.ftEngineeringIdentity,
      designMode:document.documentElement.dataset.ftDesignMode,
      identityStyle:!!document.getElementById('ft-engineering-identity-style'),
      themeButton:!!document.querySelector('[data-ft-theme-toggle]')
    })`);
    if (state?.ready === 'complete' && state.identity === 'v1' && state.designMode === 'engineering' && state.identityStyle && state.themeButton) {
      ready = true;
      break;
    }
    await sleep(100);
  }
  if (!ready) throw new Error('Static FutolTech engineering identity did not mount on the public page.');

  const initial = await evaluate(cdp, `(() => {
    const html = document.documentElement;
    const bar = document.querySelector('.topbar');
    const after = getComputedStyle(bar, '::after');
    return {
      identity:html.dataset.ftEngineeringIdentity,
      designMode:html.dataset.ftDesignMode,
      theme:html.dataset.ftTheme,
      livingPeriod:html.dataset.ftLivingPeriod || null,
      livingLayer:!!document.querySelector('[data-ft-living-atmosphere], #ft-living-atmosphere'),
      livingParticles:document.querySelectorAll('.ftli-particle').length,
      editorialRuleContent:after.content,
      editorialRuleHeight:after.height,
      topbarPosition:getComputedStyle(bar).position
    };
  })()`);

  if (initial.identity !== 'v1' || initial.designMode !== 'engineering') throw new Error(`Engineering identity state changed: ${JSON.stringify(initial)}`);
  if (initial.livingPeriod || initial.livingLayer || initial.livingParticles !== 0) throw new Error(`Living/time-of-day ambience leaked into engineering mode: ${JSON.stringify(initial)}`);
  if (!initial.editorialRuleContent || initial.editorialRuleContent === 'none' || initial.editorialRuleHeight !== '2px') throw new Error(`Editorial gold rule did not render: ${JSON.stringify(initial)}`);
  if (initial.topbarPosition !== 'relative') throw new Error(`Engineering identity did not preserve the expected editorial frame: ${JSON.stringify(initial)}`);

  await evaluate(cdp, `document.querySelector('[data-ft-theme-toggle]').click()`);
  await sleep(100);
  const toggled = await evaluate(cdp, `({
    theme:document.documentElement.dataset.ftTheme,
    identity:document.documentElement.dataset.ftEngineeringIdentity,
    designMode:document.documentElement.dataset.ftDesignMode,
    livingLayer:!!document.querySelector('[data-ft-living-atmosphere], #ft-living-atmosphere'),
    livingParticles:document.querySelectorAll('.ftli-particle').length
  })`);
  if (toggled.theme === initial.theme) throw new Error(`PaperMatte/Lab Dark toggle did not change theme: ${JSON.stringify({ initial, toggled })}`);
  if (toggled.identity !== 'v1' || toggled.designMode !== 'engineering') throw new Error(`Theme toggle displaced the engineering identity: ${JSON.stringify(toggled)}`);
  if (toggled.livingLayer || toggled.livingParticles !== 0) throw new Error(`Living ambience appeared after theme toggle: ${JSON.stringify(toggled)}`);

  console.log('FutolTech Engineering Mode QA passed: static editorial identity + PaperMatte/Lab Dark coexistence, with no time-of-day or living-object overlay.');
} finally {
  try { cdp?.socket.close(); } catch {}
  await stop(chromeProcess);
  await new Promise((resolve) => server.close(resolve));
  await removeWorkDir(work);
}
