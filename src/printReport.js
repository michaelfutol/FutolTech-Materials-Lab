const PRINT_LABEL = 'Print / Save PDF';
const LANDSCAPE_PAGES = new Set(['compare.html', 'recommend.html', 'library.html']);

function pageName() {
  return window.location.pathname.split('/').filter(Boolean).at(-1) || 'index.html';
}

function findExistingPrintButton() {
  const explicit = document.querySelector('[data-print-report], #shoringPrintButton, .print-report-button');
  if (explicit) return explicit;
  return [...document.querySelectorAll('button, a')]
    .find((element) => element.textContent?.trim() === PRINT_LABEL) ?? null;
}

function createPrintButton() {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'status-pill status-link print-report-button';
  button.dataset.printReport = 'true';
  button.textContent = PRINT_LABEL;
  button.title = 'Print this page or save it as a PDF report.';
  button.setAttribute('aria-label', 'Print this page or save it as PDF');
  button.addEventListener('click', () => window.print());

  const host = document.querySelector('.status-cluster')
    ?? document.querySelector('.topbar')
    ?? document.querySelector('header')
    ?? document.body;
  host.appendChild(button);
  return button;
}

function reportIdentity() {
  const title = document.querySelector('h1')?.textContent?.trim() || document.title;
  const eyebrow = document.querySelector('.topbar .eyebrow, header .eyebrow')?.textContent?.trim() || 'Native Structures';
  const codeMatch = eyebrow.match(/(?:·|—)\s*([A-Z]{2,5}-\d{3})/);
  return {
    title,
    documentCode: codeMatch?.[1] || pageName().replace(/\.html$/i, '').toUpperCase(),
    generated: new Intl.DateTimeFormat('en-PH', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Manila'
    }).format(new Date())
  };
}

function removeLegacyFixedFurniture() {
  document.querySelectorAll('.print-running-header, .print-running-footer').forEach((node) => node.remove());
}

function ensurePrintFurniture() {
  removeLegacyFixedFurniture();

  let letterhead = document.querySelector('.print-letterhead');
  if (!letterhead) {
    letterhead = document.createElement('section');
    letterhead.className = 'print-letterhead';
    letterhead.setAttribute('aria-hidden', 'true');
    letterhead.innerHTML = `
      <div class="print-brand-mark">T</div>
      <div class="print-brand-copy">
        <strong>TOOLS</strong>
        <span>Native Structures</span>
        <small>FutolTech Engineering and Project Systems</small>
      </div>
      <div class="print-report-meta">
        <strong data-print-title></strong>
        <span>Document <b data-print-code></b></span>
        <span>Generated <b data-print-date></b></span>
      </div>`;
    document.body.prepend(letterhead);
  }

  let documentFooter = document.querySelector('.print-document-footer');
  if (!documentFooter) {
    documentFooter = document.createElement('section');
    documentFooter.className = 'print-document-footer';
    documentFooter.setAttribute('aria-hidden', 'true');
    documentFooter.innerHTML = `
      <div>
        <strong>Michael D Futol, RCE, RMP</strong>
        <span>TOOLS | Native Structures</span>
      </div>
      <p>Preliminary engineering output - verify inputs, material sources, actual dimensions, connections, supports, workmanship and final design before use.</p>
      <div class="print-document-footer__meta">
        <strong data-print-footer-title></strong>
        <span data-print-footer-code></span>
      </div>`;
    document.body.appendChild(documentFooter);
  }

  const identity = reportIdentity();
  letterhead.querySelector('[data-print-title]').textContent = identity.title;
  letterhead.querySelector('[data-print-code]').textContent = identity.documentCode;
  letterhead.querySelector('[data-print-date]').textContent = identity.generated;
  documentFooter.querySelector('[data-print-footer-title]').textContent = identity.title;
  documentFooter.querySelector('[data-print-footer-code]').textContent = `Document ${identity.documentCode} · generated ${identity.generated}`;
}

function mountPrintReport() {
  const button = findExistingPrintButton() ?? createPrintButton();
  button.classList.add('print-report-button');
  button.dataset.printReport = 'true';
  document.body.dataset.printOrientation = LANDSCAPE_PAGES.has(pageName()) ? 'landscape' : 'portrait';
  ensurePrintFurniture();
  document.documentElement.dataset.printReportReady = 'true';

  if (document.querySelector('.compare-shell')) {
    import('./comparisonLimit.js?v=20260806-motion1')
      .then(({ mountComparisonLimitFinder }) => mountComparisonLimitFinder());
  }
}

window.addEventListener('beforeprint', () => {
  ensurePrintFurniture();
  document.documentElement.classList.add('is-printing-report');
});
window.addEventListener('afterprint', () => document.documentElement.classList.remove('is-printing-report'));

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountPrintReport, { once: true });
} else {
  mountPrintReport();
}
