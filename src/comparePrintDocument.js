import { buildManualCalculationTrace } from './manualCalculationTrace.js';

const COMPANY = 'FUTOLTECH ENGINEERING AND PROJECT SYSTEMS';
const ENGINEER = 'MICHAEL D FUTOL, RCE, RMP';
const DOCUMENT_CODE = 'CMP-003';
const REVISION = 'Rev 0';
const PAGE_COUNT = 8;

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

function cloneForPrint(source) {
  if (!source) return null;
  const clone = source.cloneNode(true);
  const originals = [...source.querySelectorAll('input, select, textarea, output')];
  const copies = [...clone.querySelectorAll('input, select, textarea, output')];

  originals.forEach((original, index) => {
    const copy = copies[index];
    if (!copy) return;
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
  document.querySelector('.ft-print-document')?.remove();

  const output = document.createElement('div');
  output.className = 'ft-print-document';
  output.setAttribute('aria-hidden', 'true');

  // Page 1 — restrained report opening and test arrangement only.
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

  // Page 2 — common loading and boundary-condition basis.
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

  // Page 3 — selected alternatives and concise engineering response.
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

  // Page 4 — visual member result cards.
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

  // Page 5 — first half of detailed calculation schedule.
  const p5 = createPage(5, true);
  const tableOne = document.createElement('section');
  tableOne.className = 'ft-print-section';
  tableOne.appendChild(sectionHeading('Comparison schedule', 'Calculated metrics', `Rows 1–${splitAt}`));
  const firstTable = tablePart(0, splitAt);
  if (firstTable) tableOne.appendChild(firstTable);
  p5.body.appendChild(tableOne);
  output.appendChild(p5.page);

  // Page 6 — remaining detailed calculation schedule.
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

  const fairRule = document.querySelector('#compareFairRule')?.textContent?.trim();
  const fairRuleNote = finalNote('Fair-comparison rule', fairRule);
  if (fairRuleNote) p8.body.appendChild(fairRuleNote);

  const boundary = document.getElementById('compareBoundaryNote')?.textContent?.trim();
  const boundaryNote = finalNote('Comparison boundary', boundary);
  if (boundaryNote) p8.body.appendChild(boundaryNote);

  const engineeringNotice = document.querySelector('body > footer')?.textContent?.replace(/^Engineering notice:\s*/i, '').trim();
  const verification = finalNote(
    'Preliminary engineering output — verification required',
    engineeringNotice || 'Verify delivered dimensions, actual material properties, supports, connections, workmanship, loads and governing design requirements before use.'
  );
  if (verification) p8.body.appendChild(verification);
  output.appendChild(p8.page);

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
