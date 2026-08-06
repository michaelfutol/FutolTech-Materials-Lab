const PRINT_LABEL = 'Print / Save PDF';

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

function mountPrintReport() {
  const button = findExistingPrintButton() ?? createPrintButton();
  button.classList.add('print-report-button');
  button.dataset.printReport = 'true';
  document.documentElement.dataset.printReportReady = 'true';
}

window.addEventListener('beforeprint', () => document.documentElement.classList.add('is-printing-report'));
window.addEventListener('afterprint', () => document.documentElement.classList.remove('is-printing-report'));

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountPrintReport, { once: true });
} else {
  mountPrintReport();
}
