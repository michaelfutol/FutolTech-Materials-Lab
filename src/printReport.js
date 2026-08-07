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

function num(id, fallback = 0) {
  const value = Number(document.getElementById(id)?.value);
  return Number.isFinite(value) ? value : fallback;
}

function textValue(id, fallback = '') {
  const element = document.getElementById(id);
  if (!element) return fallback;
  if (element.tagName === 'SELECT') return element.options[element.selectedIndex]?.textContent?.trim() || fallback;
  return element.value?.trim?.() || fallback;
}

function beamSupportSvg(boundary) {
  const pin = `<path d="M92 151 L72 181 L112 181 Z M66 184 H118" fill="none" stroke="#111" stroke-width="2"/>`;
  const roller = `<path d="M788 151 L768 177 L808 177 Z M767 181 H809 M779 187 a5 5 0 1 0 0.1 0 M797 187 a5 5 0 1 0 0.1 0" fill="none" stroke="#111" stroke-width="2"/>`;
  const fixedLeft = `<path d="M78 118 V190 M78 122 l-12 8 M78 136 l-12 8 M78 150 l-12 8 M78 164 l-12 8 M78 178 l-12 8" fill="none" stroke="#111" stroke-width="2"/>`;
  const fixedRight = `<path d="M812 118 V190 M812 122 l12 8 M812 136 l12 8 M812 150 l12 8 M812 164 l12 8 M812 178 l12 8" fill="none" stroke="#111" stroke-width="2"/>`;
  if (boundary.includes('cantilever-left')) return `${fixedLeft}`;
  if (boundary.includes('cantilever-right')) return `${fixedRight}`;
  return `${pin}${roller}`;
}

function beamLineSvg(boundary) {
  if (boundary.includes('cantilever-left')) return `<line x1="78" y1="145" x2="790" y2="145" stroke="#111" stroke-width="5"/>`;
  if (boundary.includes('cantilever-right')) return `<line x1="100" y1="145" x2="812" y2="145" stroke="#111" stroke-width="5"/>`;
  return `<line x1="92" y1="145" x2="788" y2="145" stroke="#111" stroke-width="5"/>`;
}

function comparisonArrangementSvg() {
  const isColumn = document.getElementById('compareColumnModeButton')?.classList.contains('is-active');
  const length = Math.max(0.01, num('compareLengthInput', 3));
  const load = num('compareLoadInput', 0);
  const unit = textValue('compareLoadUnitSelect', 'kN').split('—')[0].trim();

  if (isColumn) {
    const eccentricity = num('compareEccentricityInput', 0);
    const boundary = textValue('compareColumnBoundarySelect', 'Column restraint');
    const braces = Number(document.getElementById('compareBracePointsSelect')?.value || 0);
    const braceLines = Array.from({ length: braces }, (_, index) => {
      const y = 52 + ((index + 1) / (braces + 1)) * 118;
      return `<line x1="330" y1="${y}" x2="570" y2="${y}" stroke="#666" stroke-width="1.5" stroke-dasharray="7 5"/><text x="580" y="${y + 4}" font-size="14">brace</text>`;
    }).join('');
    return `
      <svg viewBox="0 0 900 230" role="img" aria-label="Column compression test arrangement">
        <defs><marker id="arrowC" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 Z" fill="#111"/></marker></defs>
        <text x="20" y="25" font-size="16" font-weight="700">COLUMN COMPRESSION TEST ARRANGEMENT</text>
        <line x1="450" y1="48" x2="450" y2="178" stroke="#111" stroke-width="9"/>
        <line x1="450" y1="30" x2="450" y2="72" stroke="#111" stroke-width="2.2" marker-end="url(#arrowC)"/>
        <text x="470" y="47" font-size="15">${load.toLocaleString()} ${unit}</text>
        <line x1="410" y1="180" x2="490" y2="180" stroke="#111" stroke-width="2"/>
        ${braceLines}
        <line x1="305" y1="48" x2="305" y2="178" stroke="#555" stroke-width="1"/>
        <line x1="295" y1="48" x2="315" y2="48" stroke="#555"/><line x1="295" y1="178" x2="315" y2="178" stroke="#555"/>
        <text x="265" y="118" font-size="14" transform="rotate(-90 265 118)">L = ${length.toFixed(2)} m</text>
        <text x="20" y="208" font-size="13">End restraint: ${boundary}</text>
        <text x="450" y="208" font-size="13">Load eccentricity: ${eccentricity.toFixed(1)} mm</text>
      </svg>`;
  }

  const boundaryValue = document.getElementById('compareBoundarySelect')?.value || 'simply-supported';
  const boundaryLabel = textValue('compareBoundarySelect', 'Pin + roller');
  const position = Math.min(length, Math.max(0, num('compareLoadPositionInput', length / 2)));
  const xStart = boundaryValue.includes('cantilever-right') ? 100 : 92;
  const xEnd = boundaryValue.includes('cantilever-left') ? 790 : 788;
  const loadX = xStart + ((xEnd - xStart) * position / length);
  const criterion = textValue('compareDeflectionSelect', '');
  return `
    <svg viewBox="0 0 900 230" role="img" aria-label="Beam bending test arrangement">
      <defs><marker id="arrowB" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 Z" fill="#111"/></marker><marker id="dimB" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto-start-reverse"><path d="M7 0 L0 3.5 L7 7" fill="none" stroke="#555" stroke-width="1.2"/></marker></defs>
      <text x="20" y="25" font-size="16" font-weight="700">BEAM BENDING TEST ARRANGEMENT</text>
      ${beamLineSvg(boundaryValue)}
      ${beamSupportSvg(boundaryValue)}
      <line x1="${loadX}" y1="54" x2="${loadX}" y2="132" stroke="#111" stroke-width="2.3" marker-end="url(#arrowB)"/>
      <text x="${Math.min(760, loadX + 15)}" y="72" font-size="15">P = ${load.toLocaleString()} ${unit}</text>
      <line x1="${xStart}" y1="205" x2="${xEnd}" y2="205" stroke="#555" stroke-width="1.2" marker-start="url(#dimB)" marker-end="url(#dimB)"/>
      <line x1="${xStart}" y1="190" x2="${xStart}" y2="214" stroke="#555"/><line x1="${xEnd}" y1="190" x2="${xEnd}" y2="214" stroke="#555"/>
      <text x="420" y="225" font-size="14">L = ${length.toFixed(2)} m</text>
      <line x1="${xStart}" y1="96" x2="${loadX}" y2="96" stroke="#777" stroke-width="1" marker-start="url(#dimB)" marker-end="url(#dimB)"/>
      <text x="${Math.max(120, (xStart + loadX) / 2 - 40)}" y="88" font-size="13">a = ${position.toFixed(2)} m</text>
      <text x="20" y="44" font-size="13">Supports: ${boundaryLabel}</text>
      <text x="650" y="44" font-size="13">Criterion: ${criterion}</text>
    </svg>`;
}

function rebuildComparisonPrintFigure() {
  document.querySelector('.print-test-arrangement')?.remove();
  if (!document.querySelector('.compare-shell')) return;

  const figure = document.createElement('section');
  figure.className = 'print-test-arrangement';
  const mode = document.getElementById('compareColumnModeButton')?.classList.contains('is-active') ? 'Compression' : 'Bending';
  figure.innerHTML = `
    <div class="print-test-arrangement__head">
      <strong>TEST ARRANGEMENT</strong>
      <span>${mode} comparison · same load and boundary conditions applied to all selected members</span>
    </div>
    ${comparisonArrangementSvg()}
    <div class="print-test-arrangement__sections"></div>`;

  const sections = figure.querySelector('.print-test-arrangement__sections');
  [...document.querySelectorAll('.compare-selector-card')].slice(0, 3).forEach((card, index) => {
    const title = card.querySelector('h3')?.textContent?.trim() || `Member ${String.fromCharCode(65 + index)}`;
    const product = card.querySelector('select[id*="Section"], select[id*="section"]')?.selectedOptions?.[0]?.textContent?.trim()
      || card.querySelector('.compare-selector-card__heading')?.textContent?.trim()
      || 'Selected section';
    const visual = card.querySelector('.compare-selector-visual svg')?.cloneNode(true);
    const item = document.createElement('div');
    item.className = 'print-test-section';
    const sketch = document.createElement('div');
    sketch.className = 'print-test-section__sketch';
    if (visual) sketch.appendChild(visual);
    const label = document.createElement('div');
    label.className = 'print-test-section__label';
    label.innerHTML = `<strong>Member ${String.fromCharCode(65 + index)} — ${title}</strong><span>${product}</span>`;
    item.append(sketch, label);
    sections.appendChild(item);
  });

  document.querySelector('.print-letterhead')?.insertAdjacentElement('afterend', figure);
}

function ensurePrintFurniture() {
  removeLegacyFixedFurniture();

  let letterhead = document.querySelector('.print-letterhead');
  if (!letterhead) {
    letterhead = document.createElement('section');
    letterhead.className = 'print-letterhead';
    letterhead.setAttribute('aria-hidden', 'true');
    letterhead.innerHTML = `
      <div class="print-brand-copy">
        <strong>Native Structures</strong>
        <span>Engineering Calculation & Comparison Report</span>
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
        <span>Native Structures</span>
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
  rebuildComparisonPrintFigure();
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
