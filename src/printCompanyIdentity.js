const COMPANY_NAME = 'FUTOLTECH ENGINEERING AND PROJECT SYSTEMS';
const ENGINEER_NAME = 'MICHAEL D FUTOL, RCE, RMP';

function applyCompanyPrintIdentity() {
  const brandName = document.querySelector('.print-brand-copy strong');
  const reportType = document.querySelector('.print-brand-copy span');
  const brandSubline = document.querySelector('.print-brand-copy small');
  const footerIdentity = document.querySelector('.print-document-footer > div');

  if (brandName) brandName.textContent = COMPANY_NAME;
  if (reportType) reportType.textContent = 'Engineering Calculation & Comparison Report';
  if (brandSubline) brandSubline.textContent = 'Materials Lab';

  if (footerIdentity) {
    const engineer = footerIdentity.querySelector('strong');
    const company = footerIdentity.querySelector('span');
    if (engineer) engineer.textContent = ENGINEER_NAME;
    if (company) company.textContent = COMPANY_NAME;
  }
}

function ensureStylesheet(selector, href, datasetKey) {
  if (document.querySelector(selector)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.dataset[datasetKey] = 'true';
  document.head.appendChild(link);
}

function mountExplicitComparisonPrint() {
  if (!document.querySelector('.compare-shell')) return;

  ensureStylesheet(
    'link[data-ft-cs-print]',
    './src/comparePrintDocument.css?v=20260807-ftcs01',
    'ftCsPrint'
  );
  ensureStylesheet(
    'link[data-ft-cs-print-fix]',
    './src/comparePrintDocumentFix.css?v=20260807-ftcs01b',
    'ftCsPrintFix'
  );
  ensureStylesheet(
    'link[data-ft-cs-page-box]',
    './src/comparePrintPageBox.css?v=20260807-ftcs01c',
    'ftCsPageBox'
  );

  import('./comparePrintDocument.js?v=20260807-ftcs01');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    applyCompanyPrintIdentity();
    mountExplicitComparisonPrint();
  }, { once: true });
} else {
  applyCompanyPrintIdentity();
  mountExplicitComparisonPrint();
}

window.addEventListener('beforeprint', applyCompanyPrintIdentity);
