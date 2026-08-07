import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { extname, join, normalize } from 'node:path';
import { tmpdir } from 'node:os';

const EXPECTED_PAGES = 6;
const PAGE_TOLERANCE_PX = 1.5;
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
  throw new Error('Headless Chromium/Chrome is required for the FT-CS-01 PDF QA gate.');
}

function countPdfPages(pdf) {
  return pdf.toString('latin1').match(/\/Type\s*\/Page\b/g)?.length || 0;
}

function reportMetrics(metrics) {
  if (!metrics) return;
  console.log(
    `FT-CS-01 print media=${metrics.printMedia}; printable A4 body=${metrics.printableHeightPx.toFixed(1)}px; `
    + `logical pages=${metrics.pages.length}`
  );
  for (const page of metrics.pages) {
    console.log(
      `  page ${page.page}: box=${page.heightPx.toFixed(1)}px; body=${page.bodyHeightPx.toFixed(1)}px; `
      + `scroll=${page.scrollHeightPx}px`
    );
  }
}

function reportPdfText(pdfPath, pages) {
  const pdftotext = findCommand(['pdftotext']);
  if (!pdftotext) return;
  for (let page = 1; page <= pages; page += 1) {
    const result = spawnSync(pdftotext, ['-f', String(page), '-l', String(page), '-layout', pdfPath, '-'], { encoding: 'utf8' });
    const text = (result.stdout || '').replace(/\f/g, '').trim();
    const preview = text.replace(/\s+/g, ' ').slice(0, 150);
    console.log(`  PDF page ${page}: ${text.length} text chars${preview ? ` — ${preview}` : ' — BLANK'}`);
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
  const url = `http://127.0.0.1:${port}/compare.html?build=ci-cdp-pdf-6`;
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
  const target = await waitForPageTarget(`http://${debugUrl.host}`);
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
  if (!ready) throw new Error(`Expected ${EXPECTED_PAGES} logical FT-CS-01 pages did not become ready in Chromium.`);

  await cdp.send('Emulation.setEmulatedMedia', { media: 'print' });
  await sleep(150);

  const measured = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const probe = document.createElement('div');
      probe.style.cssText = 'position:absolute;visibility:hidden;height:190mm;width:1px;';
      document.body.appendChild(probe);
      const printableHeightPx = probe.getBoundingClientRect().height;
      probe.remove();
      return {
        printMedia: window.matchMedia('print').matches,
        printableHeightPx,
        pages: [...document.querySelectorAll('.ft-print-page')].map((page) => {
          const body = page.querySelector('.ft-page-body');
          const pageRect = page.getBoundingClientRect();
          const bodyRect = body?.getBoundingClientRect() || { height: 0 };
          return {
            page: page.dataset.page || '?',
            heightPx: pageRect.height,
            scrollHeightPx: page.scrollHeight,
            bodyHeightPx: bodyRect.height
          };
        })
      };
    })()`,
    returnByValue: true
  });
  const metrics = measured.result?.value;
  reportMetrics(metrics);

  if (!metrics?.printMedia) throw new Error('Chromium did not activate print media for FT-CS-01 QA.');
  const overflow = metrics.pages.filter((page) => page.heightPx > metrics.printableHeightPx + PAGE_TOLERANCE_PX);
  if (overflow.length) {
    throw new Error(
      `FT-CS-01 logical page(s) exceed printable A4 height: ${overflow.map((page) => `${page.page}=${page.heightPx.toFixed(1)}px`).join(', ')}`
    );
  }

  const printed = await cdp.send('Page.printToPDF', {
    landscape: true,
    displayHeaderFooter: false,
    printBackground: true,
    preferCSSPageSize: true
  });
  const pdf = Buffer.from(printed.data, 'base64');
  await writeFile(pdfPath, pdf);
  const pages = countPdfPages(pdf);
  reportPdfText(pdfPath, pages);

  if (pages !== EXPECTED_PAGES) {
    throw new Error(`FT-CS-01 Chromium PDF rendered ${pages} physical pages; expected exactly ${EXPECTED_PAGES}.`);
  }

  console.log(`FT-CS-01 PDF QA passed: ${EXPECTED_PAGES} logical pages = ${pages} physical pages; no logical page exceeds printable A4 height.`);
} finally {
  try { cdp?.socket.close(); } catch {}
  await stopChrome(chromeProcess);
  await new Promise((resolve) => server.close(resolve));
  await sleep(100);
  await rm(work, { recursive: true, force: true });
}
