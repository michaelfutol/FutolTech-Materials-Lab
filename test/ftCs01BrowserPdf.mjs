import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
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
let printMetrics = null;

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

function printPageDiagnostics(pdfPath, pages) {
  const pdftotext = findCommand(['pdftotext']);
  if (pdftotext) {
    for (let page = 1; page <= pages; page += 1) {
      const result = spawnSync(pdftotext, ['-f', String(page), '-l', String(page), '-layout', pdfPath, '-'], { encoding: 'utf8' });
      const text = (result.stdout || '').replace(/\f/g, '').trim();
      const preview = text.replace(/\s+/g, ' ').slice(0, 180);
      console.error(`FT-CS-01 PDF page ${page}: ${text.length} text chars${preview ? ` — ${preview}` : ' — BLANK'}`);
    }
  }
  if (printMetrics) {
    console.error('FT-CS-01 print-media section metrics:');
    for (const metric of printMetrics.pages || []) {
      console.error(`  logical page ${metric.page}: box=${metric.heightPx.toFixed(1)}px, scroll=${metric.scrollHeightPx}px, body=${metric.bodyHeightPx.toFixed(1)}px, bodyScroll=${metric.bodyScrollHeightPx}px`);
    }
    console.error(`  viewport=${printMetrics.viewportWidth}x${printMetrics.viewportHeight}px, printMedia=${printMetrics.printMedia}`);
  } else {
    console.error('FT-CS-01 print-media section metrics were not received.');
  }
}

const metricsScript = `
<script>
window.addEventListener('beforeprint', () => {
  queueMicrotask(() => {
    const pages = [...document.querySelectorAll('.ft-print-page')].map((page) => {
      const body = page.querySelector('.ft-page-body');
      const pageRect = page.getBoundingClientRect();
      const bodyRect = body ? body.getBoundingClientRect() : { height: 0 };
      return {
        page: page.dataset.page || '?',
        heightPx: pageRect.height,
        scrollHeightPx: page.scrollHeight,
        bodyHeightPx: bodyRect.height,
        bodyScrollHeightPx: body ? body.scrollHeight : 0
      };
    });
    const payload = JSON.stringify({
      printMedia: window.matchMedia('print').matches,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      pages
    });
    navigator.sendBeacon('/__print_metrics', payload);
  });
});
</script>`;

const server = createServer(async (req, res) => {
  const rawPath = decodeURIComponent((req.url || '/').split('?')[0]);
  if (rawPath === '/__print_metrics' && req.method === 'POST') {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try { printMetrics = JSON.parse(body); } catch { printMetrics = { parseError: true, raw: body }; }
      res.writeHead(204).end();
    });
    return;
  }

  const relative = rawPath === '/' ? '/index.html' : rawPath;
  const filePath = normalize(join(root, relative));
  if (!filePath.startsWith(root)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  if (rawPath === '/compare.html') {
    try {
      let html = await readFile(filePath, 'utf8');
      html = html.replace('</body>', `${metricsScript}</body>`);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(html);
    } catch {
      res.writeHead(404).end('Not found');
    }
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

try {
  const chrome = findChrome();
  const url = `http://127.0.0.1:${port}/compare.html?build=ci-browser-pdf`;
  const child = spawn(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--run-all-compositor-stages-before-draw',
    '--virtual-time-budget=5000',
    '--no-pdf-header-footer',
    `--print-to-pdf=${pdfPath}`,
    url
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  let stderr = '';
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  const exitCode = await new Promise((resolve) => child.on('close', resolve));
  if (exitCode !== 0) throw new Error(`Chrome PDF render failed with exit ${exitCode}: ${stderr}`);

  await new Promise((resolve) => setTimeout(resolve, 200));
  const pdf = await readFile(pdfPath);
  const ascii = pdf.toString('latin1');
  const pages = ascii.match(/\/Type\s*\/Page\b/g)?.length || 0;
  if (pages !== EXPECTED_PAGES) {
    printPageDiagnostics(pdfPath, pages);
    throw new Error(`FT-CS-01 browser PDF rendered ${pages} physical pages; expected exactly ${EXPECTED_PAGES}.`);
  }
  console.log(`FT-CS-01 browser PDF regression: ${pages} physical pages, matching ${EXPECTED_PAGES} intentional report pages.`);
} finally {
  server.close();
  await rm(work, { recursive: true, force: true });
}
