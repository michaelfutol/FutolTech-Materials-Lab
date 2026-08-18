import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { extname, join, normalize } from 'node:path';
import { tmpdir } from 'node:os';

const root = process.cwd();
const mime = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml']
]);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function findCommand(candidates) {
  for (const candidate of candidates) {
    const result = spawnSync('which', [candidate], { encoding: 'utf8' });
    if (result.status === 0 && result.stdout.trim()) return result.stdout.trim();
  }
  return null;
}

function findChrome() {
  const chrome = findCommand(['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']);
  if (chrome) return chrome;
  throw new Error('Headless Chromium/Chrome is required for Direct Compare orientation QA.');
}

async function waitForDevToolsPort(profileDir, process, stderrRef) {
  const activePortFile = join(profileDir, 'DevToolsActivePort');
  for (let attempt = 0; attempt < 600; attempt += 1) {
    if (process.exitCode !== null) {
      throw new Error(`Chromium exited before DevTools became ready (exit ${process.exitCode}). ${stderrRef.value}`);
    }
    try {
      const text = await readFile(activePortFile, 'utf8');
      const port = Number(text.trim().split(/\r?\n/)[0]);
      if (Number.isInteger(port) && port > 0) return port;
    } catch {
      // Chromium can take a few seconds to create the port file on hosted CI.
    }
    await sleep(50);
  }
  throw new Error(`Timed out waiting for Chromium DevToolsActivePort. ${stderrRef.value}`);
}

async function waitForPageTarget(debugHttp) {
  for (let attempt = 0; attempt < 300; attempt += 1) {
    try {
      const response = await fetch(`${debugHttp}/json/list`);
      const targets = await response.json();
      const page = targets.find((target) => target.type === 'page' && target.webSocketDebuggerUrl);
      if (page) return page;
    } catch {
      // DevTools HTTP can appear shortly after DevToolsActivePort.
    }
    await sleep(50);
  }
  throw new Error('Chromium page target did not appear within 15 seconds.');
}

async function openCdp(webSocketDebuggerUrl) {
  const socket = new WebSocket(webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });

  let sequence = 0;
  const pending = new Map();
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(String(event.data));
    if (!message.id) return;
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    if (message.error) request.reject(new Error(`${request.method}: ${message.error.message}`));
    else request.resolve(message.result || {});
  });

  function send(method, params = {}) {
    const id = ++sequence;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject, method });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }

  return { socket, send };
}

async function stopChrome(process) {
  if (!process || process.exitCode !== null) return;
  const exited = new Promise((resolve) => process.once('exit', resolve));
  process.kill('SIGTERM');
  await Promise.race([exited, sleep(1500)]);
  if (process.exitCode === null) {
    process.kill('SIGKILL');
    await Promise.race([exited, sleep(1000)]);
  }
}

async function evaluate(cdp, expression) {
  const response = await cdp.send('Runtime.evaluate', { expression, returnByValue: true });
  return response.result?.value;
}

async function configureTwoCPurlins(cdp) {
  for (const index of [0, 1]) {
    const material = await evaluate(cdp, `(() => {
      const card = document.querySelectorAll('#compareSelectors .compare-selector-card')[${index}];
      const select = card?.querySelector('[data-slot-material]');
      if (!select) return { ok: false, reason: 'material selector missing' };
      select.value = 'steel-generic-250';
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return { ok: true };
    })()`);
    if (!material?.ok) throw new Error(`Could not set Member ${index + 1} steel dataset: ${material?.reason || 'unknown'}`);
    await sleep(150);
  }

  const commonPreset = await evaluate(cdp, `(() => {
    const cards = [...document.querySelectorAll('#compareSelectors .compare-selector-card')].slice(0, 2);
    const selects = cards.map((card) => card.querySelector('[data-slot-preset]'));
    if (selects.some((select) => !select)) return { ok: false, reason: 'preset selector missing' };
    const common = [...selects[0].options].find((option) => option.value.startsWith('ph-cp-') && [...selects[1].options].some((other) => other.value === option.value));
    if (!common) return { ok: false, reason: 'no common C-purlin preset' };
    return { ok: true, id: common.value, label: common.textContent };
  })()`);
  if (!commonPreset?.ok) throw new Error(`Could not locate common C-purlin preset: ${commonPreset?.reason || 'unknown'}`);

  for (const index of [0, 1]) {
    const preset = await evaluate(cdp, `(() => {
      const card = document.querySelectorAll('#compareSelectors .compare-selector-card')[${index}];
      const select = card?.querySelector('[data-slot-preset]');
      if (!select) return { ok: false, reason: 'preset selector missing' };
      select.value = ${JSON.stringify(commonPreset.id)};
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return { ok: true };
    })()`);
    if (!preset?.ok) throw new Error(`Could not set Member ${index + 1} C-purlin: ${preset?.reason || 'unknown'}`);
    await sleep(250);
  }

  console.log(`Direct Compare orientation QA preset: ${commonPreset.label} (${commonPreset.id})`);
}

async function setVisibleOrientation(cdp, cardIndex, degrees) {
  const changed = await evaluate(cdp, `(() => {
    const card = document.querySelectorAll('#compareSelectors .compare-selector-card')[${cardIndex}];
    const select = card?.querySelector('[data-c-purlin-orientation-display]');
    if (!select) return { ok: false, reason: 'visible four-way selector missing' };
    if (![...select.options].some((option) => option.value === '${degrees}')) {
      return { ok: false, reason: 'requested visible option missing', options: [...select.options].map((option) => option.value) };
    }
    select.value = '${degrees}';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    return { ok: true };
  })()`);
  if (!changed?.ok) throw new Error(`Could not select visible Orientation ${degrees}°: ${JSON.stringify(changed)}`);
  await sleep(250);

  const state = await evaluate(cdp, `(() => {
    const selectorCards = [...document.querySelectorAll('#compareSelectors .compare-selector-card')].filter((card) => !card.classList.contains('is-disabled'));
    const card = selectorCards[${cardIndex}];
    const display = card?.querySelector('[data-c-purlin-orientation-display]');
    const core = card?.querySelector('[data-slot-orientation]');
    const selectorGroup = card?.querySelector('.compare-selector-visual .section-sketch > g');
    const resultCard = document.querySelectorAll('#compareResultCards .compare-result-card')[${cardIndex}];
    const resultGroup = resultCard?.querySelector('.compare-result-card__visual .section-sketch > g');
    const resultDescription = resultCard?.querySelector('.compare-result-card__body h3 + p')?.textContent || '';
    return {
      displayValue: display?.value ?? null,
      displayText: display?.selectedOptions?.[0]?.textContent ?? null,
      coreValue: core?.value ?? null,
      coreDegrees: core?.selectedOptions?.[0]?.dataset?.orientationDeg ?? null,
      selectorTransform: selectorGroup?.getAttribute('transform') ?? null,
      selectorKey: card?.querySelector('.compare-selector-visual')?.dataset?.orientationFigureKey ?? null,
      resultTransform: resultGroup?.getAttribute('transform') ?? null,
      resultKey: resultCard?.querySelector('.compare-result-card__visual')?.dataset?.orientationFigureKey ?? null,
      resultDescription
    };
  })()`);

  const expectedCore = degrees % 180 === 90 ? 'rotated' : 'listed';
  const failures = [];
  if (state.displayValue !== String(degrees)) failures.push(`visible value=${state.displayValue}`);
  if (!state.displayText?.includes(`Orientation ${degrees}°`)) failures.push(`visible text=${state.displayText}`);
  if (state.coreValue !== expectedCore) failures.push(`solver=${state.coreValue}, expected ${expectedCore}`);
  if (state.coreDegrees !== String(degrees)) failures.push(`solver exact degree=${state.coreDegrees}`);
  if (!state.selectorTransform?.includes(`rotate(${degrees} `)) failures.push(`selector transform=${state.selectorTransform}`);
  if (!state.selectorKey?.endsWith(`:${degrees}`)) failures.push(`selector key=${state.selectorKey}`);
  if (!state.resultTransform?.includes(`rotate(${degrees} `)) failures.push(`result transform=${state.resultTransform}`);
  if (!state.resultKey?.endsWith(`:${degrees}`)) failures.push(`result key=${state.resultKey}`);
  if (!state.resultDescription.includes(`Orientation ${degrees}°`)) failures.push(`result text=${state.resultDescription}`);

  if (failures.length) {
    throw new Error(`Orientation ${degrees}° did not persist through Direct Compare rerender: ${failures.join('; ')}`);
  }
  console.log(`  Orientation ${degrees}° persisted: visible control, ${expectedCore} solver axis, selector figure, result figure and result text agree.`);
}

const server = createServer((req, res) => {
  const rawPath = decodeURIComponent((req.url || '/').split('?')[0]);
  const relative = rawPath === '/' ? '/index.html' : rawPath;
  const filePath = normalize(join(root, relative));
  if (!filePath.startsWith(root)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  const stream = createReadStream(filePath);
  stream.on('error', () => res.writeHead(404).end('Not found'));
  res.setHeader('Content-Type', mime.get(extname(filePath)) || 'application/octet-stream');
  stream.pipe(res);
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
const work = await mkdtemp(join(tmpdir(), 'ft-cp-orientation-'));
const profileDir = join(work, 'chrome-profile');
let chromeProcess;
let cdp;

try {
  const chrome = findChrome();
  chromeProcess = spawn(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--remote-debugging-port=0',
    `--user-data-dir=${profileDir}`,
    `http://127.0.0.1:${port}/compare.html?build=ci-visible-orientation`
  ], { stdio: ['ignore', 'ignore', 'pipe'] });

  const stderrRef = { value: '' };
  chromeProcess.stderr.on('data', (chunk) => { stderrRef.value += chunk.toString(); });
  const debugPort = await waitForDevToolsPort(profileDir, chromeProcess, stderrRef);
  const target = await waitForPageTarget(`http://127.0.0.1:${debugPort}`);
  cdp = await openCdp(target.webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');

  let ready = false;
  for (let attempt = 0; attempt < 150; attempt += 1) {
    const state = await evaluate(cdp, `({ readyState: document.readyState, cards: document.querySelectorAll('#compareSelectors .compare-selector-card').length })`);
    if (state?.readyState === 'complete' && state?.cards >= 2) {
      ready = true;
      break;
    }
    await sleep(100);
  }
  if (!ready) throw new Error('Direct Compare did not become ready for orientation QA.');

  await configureTwoCPurlins(cdp);
  await setVisibleOrientation(cdp, 0, 0);
  for (const degrees of [90, 180, 270, 0]) {
    await setVisibleOrientation(cdp, 1, degrees);
  }

  console.log('Direct Compare four-way C-purlin orientation QA passed in real Chromium.');
} finally {
  try { cdp?.socket.close(); } catch {}
  await stopChrome(chromeProcess);
  await new Promise((resolve) => server.close(resolve));
  await sleep(100);
  await rm(work, { recursive: true, force: true });
}
