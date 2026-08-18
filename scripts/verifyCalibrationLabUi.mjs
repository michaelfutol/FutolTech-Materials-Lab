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
  throw new Error('Headless Chromium/Chrome is required for Calibration Lab QA.');
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
  throw new Error('Calibration Lab Chromium target did not appear.');
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
  const rel = raw === '/' ? '/calibration.html' : raw;
  const file = normalize(join(root, rel));
  if (!file.startsWith(root)) return res.writeHead(403).end('Forbidden');
  res.setHeader('Content-Type', mime.get(extname(file)) || 'application/octet-stream');
  const stream = createReadStream(file);
  stream.on('error', () => res.writeHead(404).end('Not found'));
  stream.pipe(res);
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
const work = await mkdtemp(join(tmpdir(), 'ft-calibration-ui-'));
const profile = join(work, 'profile');
let chromeProcess;
let cdp;

try {
  chromeProcess = spawn(findChrome(), ['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage','--remote-debugging-port=0',`--user-data-dir=${profile}`,`http://127.0.0.1:${port}/calibration.html?build=ci`], { stdio: 'ignore' });
  const debugPort = await waitPort(profile, chromeProcess);
  const target = await pageTarget(`http://127.0.0.1:${debugPort}`);
  cdp = await cdpOpen(target.webSocketDebuggerUrl);
  await cdp.send('Runtime.enable');

  let ready = false;
  for (let i = 0; i < 120; i += 1) {
    const state = await evaluate(cdp, `({ready:document.readyState,state:document.documentElement.dataset.calibrationState,cards:document.querySelectorAll('#calibrationSummary .result-card').length})`);
    if (state?.ready === 'complete' && state.state === 'analyzed' && state.cards >= 6) { ready = true; break; }
    await sleep(100);
  }
  if (!ready) throw new Error('Calibration Lab example did not become ready.');

  const initial = await evaluate(cdp, `({summary:document.querySelector('#calibrationSummary').textContent,paired:document.querySelector('#calibrationPairedStats').textContent,failure:document.querySelector('#calibrationFailureStats').textContent,rows:document.querySelectorAll('#calibrationRawBody tr').length,specimens:document.querySelectorAll('#calibrationSpecimenBody tr').length,measured:document.querySelectorAll('#calibrationChart .cal-measured').length,predicted:document.querySelectorAll('#calibrationChart .cal-predicted').length,source:document.querySelector('#calibrationSourceCard').textContent})`);
  if (initial.rows !== 12 || initial.specimens !== 3) throw new Error(`Expected 12 rows / 3 specimens, got ${initial.rows}/${initial.specimens}`);
  if (!/Bias, kN\s*0\.058/.test(initial.summary) || !/RMSE, kN\s*0\.138/.test(initial.summary)) throw new Error(`Known paired metrics missing: ${initial.summary}`);
  if (!/Failure COV\s*3\.33%/.test(initial.failure)) throw new Error(`Known failure COV missing: ${initial.failure}`);
  if (initial.measured !== 3 || initial.predicted !== 3) throw new Error('Expected one measured and predicted trace per specimen.');
  if (!/never silently overwrite/i.test(initial.source)) throw new Error('Immutable calibration mutation policy is not visible.');

  const secondCsv = `specimen_id,displacement_mm,measured_load_kN,event\nF1,0,0,\nF1,2,3,\nF1,4,5,failure\nF2,0,0,\nF2,2,3.2,\nF2,4,5.4,failure`;
  await evaluate(cdp, `(() => { const box=document.querySelector('#calibrationCsvInput'); box.value=${JSON.stringify(secondCsv)}; document.querySelector('#calibrationAnalyzeButton').click(); })()`);
  await sleep(300);
  const second = await evaluate(cdp, `({summary:document.querySelector('#calibrationSummary').textContent,paired:document.querySelector('#calibrationPairedStats').textContent,rows:document.querySelectorAll('#calibrationRawBody tr').length,predicted:document.querySelectorAll('#calibrationChart .cal-predicted').length,error:document.querySelector('#calibrationErrorBanner').textContent,state:document.documentElement.dataset.calibrationState})`);
  if (second.state !== 'analyzed' || second.rows !== 6) throw new Error(`Second evidence set did not analyze: ${JSON.stringify(second)}`);
  if (!/Paired points\s*0/.test(second.summary) || !/Bias, kN\s*—/.test(second.summary)) throw new Error('Missing prediction column was not reported as unavailable.');
  if (second.predicted !== 0) throw new Error('Predicted chart trace was invented for a measured-only dataset.');
  if (second.error.trim()) throw new Error(`Unexpected Calibration Lab error: ${second.error}`);

  console.log('Physical-Test Calibration raw-data, paired-statistics and no-invented-prediction QA passed in real Chromium.');
} finally {
  try { cdp?.socket.close(); } catch {}
  await stop(chromeProcess);
  await new Promise((resolve) => server.close(resolve));
  await rm(work, { recursive: true, force: true });
}
