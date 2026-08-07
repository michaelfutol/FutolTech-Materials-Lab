import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { extname, join, normalize } from 'node:path';
import { tmpdir } from 'node:os';

const EXPECTED_PAGES = 5;
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
  throw new Error('Headless Chromium/Chrome is required for the FT-CS-01 PDF regression test.');
}

function countPdfPages(pdf) {
  return pdf.toString('latin1').match(/\/Type\s*\/Page\b/g)?.length || 0;
}

function printMetrics(metrics) {
  if (!metrics) return;
  console.error(`FT-CS-01 printMedia=${metrics.printMedia}, viewport=${metrics.viewportWidth}x${metrics.viewportHeight}px`);
  for (const page of metrics.pages || []) {
    console.error(
      `  logical page ${page.page}: display=${page.display}, box=${page.heightPx.toFixed(1)}px, `
      + `scroll=${page.scrollHeightPx}px, body=${page.bodyHeightPx.toFixed(1)}px, bodyScroll=${page.bodyScrollHeightPx}px`
    );
  }
}

function printPdfTextDiagnostics(pdfPath, pages) {
  const pdftotext = findCommand(['pdftotext']);
  if (!pdftotext) return;
  for (let page = 1; page <= pages; page += 1) {
    const result = spawnSync(pdftotext, ['-f', String(page), '-l', String(page), '-layout', pdfPath, '-'], { encoding: 'utf8' });
    const text = (result.stdout || '').replace(/\f/g, '').trim();
    const preview = text.replace(/\s+/g, ' ').slice(0, 180);
    console.error(`FT-CS-01 PDF page ${page}: ${text.length} text chars${preview ? ` — ${preview}` : ' — BLANK'}`);
  }
}

async function waitForPageTarget(debugHttp) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const response = await fetch(`${debugHttp}/json/list`);
    const targets = await response.json();
    const page = targets.find((target) => target.type === 'page' && target.webSocketDebuggerUrl);
    if (page) return page;
    await sleep(50);
  }
  throw new Error('Chromium page target did not appear.');
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
const work = await mkdtemp(join(tmpdir(), 'ft-cs-01-'));
const pdfPath = join(work, 'comparison.pdf');
let chromeProcess;
let cdp;

try {
  const chrome = findChrome();
  const url = `http://127.0.0.1:${port}/compare.html?build=ci-cdp-pdf`;
  chromeProcess = spawn(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--remote-debugging-port=0',
    `--user-data-dir=${join(work, 'chrome-profile')}`,
    url
  ], { stdio: ['ignore', 'ignore', 'pipe'] });

  let stderr = '';
  const devtoolsWs = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Timed out waiting for Chromium DevTools endpoint. ${stderr}`)), 10000);
    chromeProcess.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
      const match = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) {
        clearTimeout(timeout);
        resolve(match[1]);
      }
    });
    chromeProcess.once('exit', (code) => {
      clearTimeout(timeout);
      reject(new Error(`Chromium exited before DevTools became ready (exit ${code}). ${stderr}`));
    });
  });

  const debugUrl = new URL(devtoolsWs);
  const debugHttp = `http://${debugUrl.host}`;
  const target = await waitForPageTarget(debugHttp);
  cdp = await openCdp(target.webSocketDebuggerUrl);

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');

  let ready = false;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const state = await cdp.send('Runtime.evaluate', {
      expression: `({readyState: document.readyState, pages: document.querySelectorAll('.ft-print-page').length})`,
      returnByValue: true
    });
    const value = state.result?.value;
    if (value?.readyState === 'complete' && value?.pages === EXPECTED_PAGES) {
      ready = true;
      break;
    }
    await sleep(100);
  }
  if (!ready) throw new Error('FT-CS-01 logical print document did not become ready in Chromium.');

  await cdp.send('Emulation.setEmulatedMedia', { media: 'print' });
  await sleep(150);

  const measured = await cdp.send('Runtime.evaluate', {
    expression: `(() => ({
      printMedia: window.matchMedia('print').matches,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      pages: [...document.querySelectorAll('.ft-print-page')].map((page) => {
        const body = page.querySelector('.ft-page-body');
        const pageRect = page.getBoundingClientRect();
        const bodyRect = body?.getBoundingClientRect() || { height: 0 };
        return {
          page: page.dataset.page || '?',
          display: getComputedStyle(page).display,
          heightPx: pageRect.height,
          scrollHeightPx: page.scrollHeight,
          bodyHeightPx: bodyRect.height,
          bodyScrollHeightPx: body?.scrollHeight || 0
        };
      })
    }))()`,
    returnByValue: true
  });
  const metrics = measured.result?.value;

  const printed = await cdp.send('Page.printToPDF', {
    landscape: true,
    displayHeaderFooter: false,
    printBackground: true,
    preferCSSPageSize: true
  });
  const pdf = Buffer.from(printed.data, 'base64');
  await writeFile(pdfPath, pdf);
  const pages = countPdfPages(pdf);

  if (pages !== EXPECTED_PAGES) {
    printMetrics(metrics);
    printPdfTextDiagnostics(pdfPath, pages);
    throw new Error(`FT-CS-01 Chromium DevTools PDF rendered ${pages} physical pages; expected exactly ${EXPECTED_PAGES}.`);
  }

  printMetrics(metrics);
  console.log(`FT-CS-01 Chromium DevTools PDF regression: ${pages} physical pages, matching ${EXPECTED_PAGES} intentional report pages.`);
} finally {
  try { cdp?.socket.close(); } catch {}
  try { chromeProcess?.kill('SIGTERM'); } catch {}
  server.close();
  await rm(work, { recursive: true, force: true });
}
