import { buildManualCalculationTrace } from './manualCalculationTrace.js';

const COMPANY = 'FUTOLTECH ENGINEERING AND PROJECT SYSTEMS';
const ENGINEER = 'MICHAEL D FUTOL, RCE, RMP';
const DOCUMENT_CODE = 'CMP-003';
const REVISION = 'Rev 0';
const PAGE_COUNT = 9;

function generatedStamp() {
  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Manila'
  }).format(new Date());
}

function reportTitle() {
  return document.querySelector('h1')?.textContent?.trim() || 'Structural Member Comparison';
}

function selectedText(select) {
  return select.selectedOptions?.[0]?.textContent?.trim() || select.value || '—';
}

function ensureSelectorPrintCompaction() {
  if (document.getElementById('ft-selector-print-compaction')) return;
  const style = document.createElement('style');
  style.id = 'ft-selector-print-compaction';
  style.textContent = `
    @media print {
      .ft-print-document .compare-selector-card {
        padding: 2.4mm !important;
      }
      .ft-print-document .compare-selector-visual {
        height: 15.5mm !important;
        margin: 1.1mm 0 1.5mm !important;
      }
      .ft-print-document .compare-selector-visual svg {
        height: 13.5mm !important;
        max-height: 13.5mm !important;
      }
    }
  `;
  document.head.appendChild(style);
}

function cloneForPrint(source) {
  if (!source) return null;
  const clone = source.cloneNode(true);

  // SIM-VIZ playback is an interactive browser laboratory. Keep the formal
  // FT-CS-01 report on its established nine-page calculation architecture;
  // the deterministic simulation JSON is exported separately for video/RPE.
  clone.querySelectorAll('[data-comparison-playback]').forEach((node) => node.remove());

  const originals = [...source.querySelectorAll('input, select, textarea, output')]
    .filter((node) => !node.closest('[data-comparison-playback]'));
  const copies = [...clone.querySelectorAll('input, select, textarea, output')];

  originals.forEach((original, index) => {
    const copy = copies[index];
    if (!copy) return;

    // Direct Compare keeps a hidden binary select as the solver bridge for
    // C-purlins. The user-facing select already carries the exact 0/90/180/270
    // installation orientation, so printing the hidden bridge would duplicate
    // the orientation row and can overflow the selected-alternatives page.
    if (original.matches('[data-c-purlin-solver-orientation]')) {
      copy.remove();
      return;
    }

    const value = original.type === 'checkbox'
      ? (original.checked ? 'Included' : 'Not included')
      : original.tagName === 'SELECT'
        ? selectedText(original)
        : (original.value || original.textContent || '—');
    const snapshot = document.createElement('span');
    snapshot.className = 'ft-print-value';
    snapshot.textContent = value;
    copy.replaceWith(snapshot);
  });

  clone.querySelectorAll('button, .help-icon, .app-tooltip, .compare-limit-controls').forEach((node) => node.remove());
  clone.querySelectorAll('[tabindex]').forEach((node) => node.removeAttribute('tabindex'));
  clone.querySelectorAll('[data-help]').forEach((node) => node.removeAttribute('data-help'));
  return clone;
}

function pageHeader({ continuation = false } = {}) {
  const header = document.createElement('header');
  header.className = `ft-page-header${continuation ? ' ft-page-header--continuation' : ''}`;
  header.innerHTML = `
    <div class="ft-page-header__brand">
      <strong>${COMPANY}</strong>
      <span>${continuation ? 'Materials Lab · Engineering Calculation Sheet' : 'Materials Lab · Engineering & Technical Reports'}</span>
    </div>
    <div class="ft-page-header__meta">
      <strong>${reportTitle()}</strong>
      <span>${DOCUMENT_CODE} · ${REVISION}</span>
      ${continuation ? '' : `<span>Generated ${generatedStamp()}</span>`}
    </div>`;
  return header;
}

function pageFooter(pageNumber) {
  const footer = document.createElement('footer');
  footer.className = 'ft-page-footer';
  footer.innerHTML = `
    <div><strong>${ENGINEER}</strong><span>${COMPANY}</span></div>
    <div class="ft-page-footer__right"><strong>${DOCUMENT_CODE} · ${REVISION}</strong><span>Page ${pageNumber} of ${PAGE_COUNT}</span></div>`;
  return footer;
}

function createPage(pageNumber, continuation = pageNumber > 1) {
  const page = document.createElement('section');
  page.className = 'ft-print-page';
  page.dataset.page = String(pageNumber);
  page.appendChild(pageHeader({ continuation }));
  const body = document.createElement('div');
  body.className = 'ft-page-body';
  page.appendChild(body);
  page.appendChild(pageFooter(pageNumber));
  return { page, body };
}

function sectionHeading(kicker, title, trailing = '') {
  const head = document.createElement('div');
  head.className = 'ft-section-head';
  head.innerHTML = `<div><p class="ft-section-kicker">${kicker}</p><h2>${title}</h2></div>${trailing ? `<span>${trailing}</span>` : ''}`;
  return head;
}

function reportIntro() {
  const intro = document.createElement('section');
  intro.className = 'ft-report-intro';
  const subtitle = document.querySelector('.topbar .subtitle')?.textContent?.trim()
    || 'Direct comparison of structural members under common loading and boundary conditions.';
  intro.innerHTML = `
    <div>
      <p class="eyebrow">Engineering calculation & comparison report</p>
      <h1>${reportTitle()}</h1>
      <p>${subtitle}</p>
    </div>
    <div class="ft-report-intro__badge">
      <strong>FT-CS-01 · ${DOCUMENT_CODE}</strong>
      <span>${REVISION} · A4 landscape calculation sheet</span>
      <span>Prepared ${generatedStamp()}</span>
    </div>`;
  return intro;
}

function arrangementClone() {
  const source = document.querySelector('.print-test-arrangement');
  return source ? cloneForPrint(source) : null;
}

function cleanPanelClone(selector) {
  const source = document.querySelector(selector);
  const clone = cloneForPrint(source);
  if (!clone) return null;
  clone.querySelector('.compare-mode-switch')?.remove();
  if (selector === '.compare-members') {
    // Page 1 and Page 7 already carry the oriented section illustrations.
    // On Page 3, keep the exact section/product/orientation text but omit the
    // duplicate thumbnails so the selected-alternatives schedule remains
    // comfortably inside the printable A4 body.
    clone.querySelectorAll('.compare-selector-visual').forEach((node) => node.remove());
  }
  return clone;
}

function resultCardsClone() {
  const source = document.getElementById('compareResultCards');
  return cloneForPrint(source);
}

function summaryClone() {
  const source = document.getElementById('compareSummary');
  return cloneForPrint(source);
}

function tablePart(start, end) {
  const source = document.querySelector('.compare-table');
  if (!source) return null;
  const table = document.createElement('table');
  table.className = 'compare-table ft-print-table';
  table.appendChild(source.tHead.cloneNode(true));
  const body = document.createElement('tbody');
  [...source.tBodies[0].rows].slice(start, end).forEach((row) => body.appendChild(row.cloneNode(true)));
  table.appendChild(body);
  const wrap = document.createElement('div');
  wrap.className = 'ft-print-table-wrap';
  wrap.appendChild(table);
  return wrap;
}

function finalNote(title, text) {
  if (!text) return null;
  const note = document.createElement('div');
  note.className = 'ft-final-note';
  note.innerHTML = `<h3>${title}</h3><p>${text}</p>`;
  return note;
}

function buildPrintDocument() {
  ensureSelectorPrintCompaction();
  document.querySelector('.ft-print-document')?.remove();

  const output = document.createElement('div');
  output.className = 'ft-print-document';
  output.setAttribute('aria-hidden', 'true');

  const p1 = createPage(1, false);
  p1.body.appendChild(reportIntro());
  const arrangement = arrangementClone();
  if (arrangement) {
    const arrangementSection = document.createElement('section');
    arrangementSection.className = 'ft-print-section';
    arrangementSection.appendChild(arrangement);
    p1.body.appendChild(arrangementSection);
  }
  output.appendChild(p1.page);

  const p2 = createPage(2, true);
  const conditionsSection = document.createElement('section');
  conditionsSection.className = 'ft-print-section';
  conditionsSection.appendChild(sectionHeading('Test basis', 'Common test conditions', 'Applied identically to all compared members'));
  const conditions = cleanPanelClone('.compare-inputs');
  if (conditions) {
    conditions.querySelector('.panel-heading')?.remove();
    conditionsSection.appendChild(conditions);
  }
  p2.body.appendChild(conditionsSection);
  output.appendChild(p2.page);

  const p3 = createPage(3, true);
  const membersSection = document.createElement('section');
  membersSection.className = 'ft-print-section';
  membersSection.appendChild(sectionHeading('Comparison basis', 'Selected alternatives', 'Same test conditions for each member'));
  const members = cleanPanelClone('.compare-members');
  if (members) {
    members.querySelector('.panel-heading')?.remove();
    membersSection.appendChild(members);
  }
  p3.body.appendChild(membersSection);

  const responseSection = document.createElement('section');
  responseSection.className = 'ft-print-section';
  responseSection.appendChild(sectionHeading('Engineering response', document.getElementById('compareResultsTitle')?.textContent?.trim() || 'Direct results'));
  const summary = summaryClone();
  if (summary) responseSection.appendChild(summary);
  p3.body.appendChild(responseSection);
  output.appendChild(p3.page);

  const p4 = createPage(4, true);
  const cardsSection = document.createElement('section');
  cardsSection.className = 'ft-print-section';
  cardsSection.appendChild(sectionHeading('Member response', 'Side-by-side member results'));
  const cards = resultCardsClone();
  if (cards) cardsSection.appendChild(cards);
  p4.body.appendChild(cardsSection);
  output.appendChild(p4.page);

  const rows = [...document.querySelectorAll('#compareTableBody > tr')];
  const splitAt = Math.max(1, Math.ceil(rows.length / 2));

  const p5 = createPage(5, true);
  const tableOne = document.createElement('section');
  tableOne.className = 'ft-print-section';
  tableOne.appendChild(sectionHeading('Comparison schedule', 'Calculated metrics', `Rows 1–${splitAt}`));
  const firstTable = tablePart(0, splitAt);
  if (firstTable) tableOne.appendChild(firstTable);
  p5.body.appendChild(tableOne);
  output.appendChild(p5.page);

  const p6 = createPage(6, true);
  const tableTwo = document.createElement('section');
  tableTwo.className = 'ft-print-section';
  tableTwo.appendChild(sectionHeading('Comparison schedule', 'Calculated metrics — continued', `Rows ${splitAt + 1}–${rows.length}`));
  const secondTable = tablePart(splitAt, rows.length);
  if (secondTable) tableTwo.appendChild(secondTable);
  p6.body.appendChild(tableTwo);
  output.appendChild(p6.page);

  // Pages 7–8 — auditable manual calculation trace using the same geometry and solver basis.
  const trace = buildManualCalculationTrace();
  const p7 = createPage(7, true);
  p7.body.appendChild(trace.propertiesSection);
  output.appendChild(p7.page);

  const p8 = createPage(8, true);
  p8.body.appendChild(trace.responseSection);
  output.appendChild(p8.page);

  // Page 9 — calculation boundaries and required verification, intentionally separated from the derivation.
  const p9 = createPage(9, true);
  const notesSection = document.createElement('section');
  notesSection.className = 'ft-print-section';
  notesSection.appendChild(sectionHeading('Engineering notes', 'Calculation boundary & verification', 'Read with the manual trace and comparison schedule'));

  const fairRule = document.querySelector('#compareFairRule')?.textContent?.trim();
  const fairRuleNote = finalNote('Fair-comparison rule', fairRule);
  if (fairRuleNote) notesSection.appendChild(fairRuleNote);

  const boundary = document.getElementById('compareBoundaryNote')?.textContent?.trim();
  const boundaryNote = finalNote('Comparison boundary', boundary);
  if (boundaryNote) notesSection.appendChild(boundaryNote);

  const engineeringNotice = document.querySelector('body > footer')?.textContent?.replace(/^Engineering notice:\s*/i, '').trim();
  const verification = finalNote(
    'Preliminary engineering output — verification required',
    engineeringNotice || 'Verify delivered dimensions, actual material properties, supports, connections, workmanship, loads and governing design requirements before use.'
  );
  if (verification) notesSection.appendChild(verification);
  p9.body.appendChild(notesSection);
  output.appendChild(p9.page);

  document.body.appendChild(output);
}

function mount() {
  window.setTimeout(buildPrintDocument, 0);
}

window.addEventListener('beforeprint', buildPrintDocument);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount, { once: true });
} else {
  mount();
}
