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

function mountExplicitComparisonPrint() {
  if (!document.querySelector('.compare-shell')) return;
  if (!document.querySelector('link[data-ft-cs-print]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = './src/comparePrintDocument.css?v=20260807-ftcs01';
    link.dataset.ftCsPrint = 'true';
    document.head.appendChild(link);
  }
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
