import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { extname, join, normalize } from 'node:path';
import { tmpdir } from 'node:os';

const EXPECTED_PAGES = 9;
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

async function waitForDevToolsPort(profileDir, process, stderrRef) {
  const activePortFile = join(profileDir, 'DevToolsActivePort');
  for (let attempt = 0; attempt < 600; attempt += 1) {
    if (process.exitCode !== null) {
      throw new Error(`Chromium exited before DevTools became ready (exit ${process.exitCode}). ${stderrRef.value}`);
    }
    try {
      const text = await readFile(activePortFile, 'utf8');
      const [portText] = text.trim().split(/\r?\n/);
      const port = Number(portText);
      if (Number.isInteger(port) && port > 0) return port;
    } catch {
      // Hosted Pages runners occasionally start Chromium more slowly than CI.
    }
    await sleep(50);
  }
  throw new Error(`Timed out waiting for Chromium DevToolsActivePort after 30 seconds. ${stderrRef.value}`);
}

async function waitForPageTarget(debugHttp) {
  for (let attempt = 0; attempt < 300; attempt += 1) {
    try {
      const response = await fetch(`${debugHttp}/json/list`);
      const targets = await response.json();
      const page = targets.find((target) => target.type === 'page' && target.webSocketDebuggerUrl);
      if (page) return page;
    } catch {
      // DevTools HTTP endpoint can appear a few milliseconds after the port file.
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

async function configureCPurlinOrientationComparison(cdp) {
  const materialConfigured = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const cards = [...document.querySelectorAll('#compareSelectors .compare-selector-card')].slice(0, 2);
      if (cards.length < 2) return { ok: false, reason: 'fewer than two selector cards' };
      for (const card of cards) {
        const material = card.querySelector('[data-slot-material]');
        if (!material) return { ok: false, reason: 'material selector missing' };
        if ([...material.options].some((option) => option.value === 'steel-generic-250')) {
          material.value = 'steel-generic-250';
          material.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
      return { ok: true };
    })()`,
    returnByValue: true
  });
  if (!materialConfigured.result?.value?.ok) {
    throw new Error(`Could not configure C-purlin material selectors: ${materialConfigured.result?.value?.reason || 'unknown reason'}`);
  }
  await sleep(250);

  const presetConfigured = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const cards = [...document.querySelectorAll('#compareSelectors .compare-selector-card')].slice(0, 2);
      const presets = cards.map((card) => card.querySelector('[data-slot-preset]'));
      if (presets.some((select) => !select)) return { ok: false, reason: 'preset selector missing' };
      const common = [...presets[0].options].find((option) => option.value.startsWith('ph-cp-') && [...presets[1].options].some((other) => other.value === option.value));
      if (!common) return { ok: false, reason: 'no common C-purlin preset' };
      for (const select of presets) {
        select.value = common.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
      return { ok: true, preset: common.value, label: common.textContent };
    })()`,
    returnByValue: true
  });
  const presetValue = presetConfigured.result?.value;
  if (!presetValue?.ok) throw new Error(`Could not configure matching C-purlins: ${presetValue?.reason || 'unknown reason'}`);
  console.log(`C-purlin PDF QA preset: ${presetValue.label} (${presetValue.preset})`);
  await sleep(350);

  const orientationConfigured = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const cards = [...document.querySelectorAll('#compareSelectors .compare-selector-card')].slice(0, 2);
      const requested = [0, 90];
      for (let index = 0; index < cards.length; index += 1) {
        const select = cards[index].querySelector('[data-slot-orientation]');
        if (!select) return { ok: false, reason: 'orientation selector missing' };
        const option = [...select.options].find((candidate) => Number(candidate.dataset.orientationDeg) === requested[index]);
        if (!option) return { ok: false, reason: 'requested orientation option missing', degrees: requested[index] };
        option.selected = true;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
      return { ok: true };
    })()`,
    returnByValue: true
  });
  const orientationValue = orientationConfigured.result?.value;
  if (!orientationValue?.ok) throw new Error(`Could not configure C-purlin orientations: ${orientationValue?.reason || 'unknown reason'}`);
  await sleep(450);

  // Rebuild the print document from the exact 0° versus 90° comparison state.
  await cdp.send('Runtime.evaluate', {
    expression: `window.dispatchEvent(new Event('beforeprint')); true`,
    returnByValue: true
  });
  await sleep(300);

  const traceCheck = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const p7 = document.querySelector('.ft-print-page[data-page="7"]');
      const p8 = document.querySelector('.ft-print-page[data-page="8"]');
      const text7 = p7?.innerText || '';
      const text8 = p8?.innerText || '';
      const transforms = [...(p7?.querySelectorAll('.section-sketch > g') || [])].map((group) => group.getAttribute('transform'));
      return {
        ok: Boolean(p7 && p8)
          && text7.includes('Gross lipped-C geometry')
          && text7.includes('Orientation 0°')
          && text7.includes('Orientation 90°')
          && text7.includes('major-axis gross screening')
          && text7.includes('minor-axis gross screening')
          && text8.includes('FEM')
          && text8.includes('Serviceability limit'),
        text7Preview: text7.replace(/\\s+/g, ' ').slice(0, 300),
        text8Preview: text8.replace(/\\s+/g, ' ').slice(0, 300),
        transforms
      };
    })()`,
    returnByValue: true
  });
  const trace = traceCheck.result?.value;
  if (!trace?.ok) {
    throw new Error(`C-purlin manual calculation trace did not render correctly. Page7=${trace?.text7Preview || 'missing'} Page8=${trace?.text8Preview || 'missing'}`);
  }
  if (!trace.transforms.some((value) => value?.includes('rotate(0 ')) || !trace.transforms.some((value) => value?.includes('rotate(90 '))) {
    throw new Error(`C-purlin calculation sketches do not preserve both 0° and 90° orientations: ${JSON.stringify(trace.transforms)}`);
  }
  console.log('C-purlin manual trace QA passed: same preset rendered at 0° major-axis and 90° minor-axis with hand-check/FEM calculation pages.');
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
const profileDir = join(work, 'chrome-profile');
let chromeProcess;
let cdp;

try {
  const chrome = findChrome();
  const url = `http://127.0.0.1:${port}/compare.html?build=ci-cpurlin-manual-9`;
  chromeProcess = spawn(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--remote-debugging-port=0',
    `--user-data-dir=${profileDir}`,
    url
  ], { stdio: ['ignore', 'ignore', 'pipe'] });

  const stderrRef = { value: '' };
  chromeProcess.stderr.on('data', (chunk) => { stderrRef.value += chunk.toString(); });
  const debugPort = await waitForDevToolsPort(profileDir, chromeProcess, stderrRef);
  const target = await waitForPageTarget(`http://127.0.0.1:${debugPort}`);
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

  await configureCPurlinOrientationComparison(cdp);
  await cdp.send('Emulation.setEmulatedMedia', { media: 'print' });
  await sleep(150);

  const measured = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const printDocument = document.querySelector('.ft-print-document');
      const probe = document.createElement('div');
      probe.style.cssText = 'position:absolute;visibility:hidden;height:190mm;width:1px;';
      printDocument.appendChild(probe);
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
