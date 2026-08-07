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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', applyCompanyPrintIdentity, { once: true });
} else {
  applyCompanyPrintIdentity();
}

window.addEventListener('beforeprint', applyCompanyPrintIdentity);
