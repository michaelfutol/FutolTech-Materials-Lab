import './printTypography.js';

export const PUBLIC_PRODUCT_NAME = 'FutolTech Structural Lab';
export const PUBLIC_PRODUCT_SUBTITLE = 'Virtual Materials, Members & Connection Testing';
export const COMPANY_NAME = 'FUTOLTECH ENGINEERING AND PROJECT SYSTEMS';

function replaceNativeStructures(text = '') {
  return text
    .replaceAll('FutolNative Structures', PUBLIC_PRODUCT_NAME)
    .replaceAll('Native Structures', PUBLIC_PRODUCT_NAME);
}

function setTextIfChanged(node, value) {
  if (node && node.textContent !== value) node.textContent = value;
}

function ensureToolNav({ dataAttribute, path, label, activeLabel }) {
  const cluster = document.querySelector('.status-cluster');
  if (!cluster || cluster.querySelector(`[${dataAttribute}]`)) return;
  const current = location.pathname.endsWith(`/${path}`) || location.pathname.endsWith(path);
  const item = document.createElement(current ? 'span' : 'a');
  item.setAttribute(dataAttribute, 'true');
  item.className = 'status-pill status-link';
  if (!current) item.href = `./${path}`;
  item.textContent = current ? activeLabel : label;
  cluster.insertBefore(item, cluster.firstChild);
}

function ensureStructuralLabNav() {
  ensureToolNav({ dataAttribute: 'data-structural-lab-connections', path: 'connections.html', label: 'Connection Lab', activeLabel: 'Connection Lab · active' });
  ensureToolNav({ dataAttribute: 'data-structural-lab-assembly', path: 'assembly.html', label: 'Assembly Lab', activeLabel: 'Assembly Lab · active' });
  ensureToolNav({ dataAttribute: 'data-structural-lab-calibration', path: 'calibration.html', label: 'Calibration Lab', activeLabel: 'Calibration Lab · active' });
  ensureToolNav({ dataAttribute: 'data-structural-lab-frame', path: 'frame.html', label: 'Frame Analyzer', activeLabel: 'Frame Analyzer · active' });
}

function applyPrintBrand() {
  const brandName = document.querySelector('.print-brand-copy strong');
  const reportType = document.querySelector('.print-brand-copy span');
  const brandSubline = document.querySelector('.print-brand-copy small');
  const footerIdentity = document.querySelector('.print-document-footer > div');

  setTextIfChanged(brandName, COMPANY_NAME);
  if (reportType && !reportType.textContent?.trim()) setTextIfChanged(reportType, 'Engineering Calculation & Technical Report');
  setTextIfChanged(brandSubline, `${PUBLIC_PRODUCT_NAME} · Materials Lab`);

  if (footerIdentity) {
    const company = footerIdentity.querySelector('span');
    setTextIfChanged(company, COMPANY_NAME);
  }
}

export function applyPublicBrand() {
  const brandedTitle = replaceNativeStructures(document.title || PUBLIC_PRODUCT_NAME);
  if (document.title !== brandedTitle) document.title = brandedTitle;

  const description = document.querySelector('meta[name="description"]');
  if (description) {
    const brandedDescription = replaceNativeStructures(description.content);
    if (description.content !== brandedDescription) description.content = brandedDescription;
  }

  document.querySelectorAll('.topbar .eyebrow, header .eyebrow').forEach((node) => {
    const branded = replaceNativeStructures(node.textContent || '');
    setTextIfChanged(node, branded);
  });

  const topHeading = document.querySelector('.topbar h1');
  const heading = topHeading?.textContent?.trim();
  if (heading === 'Native Structures' || heading === 'FutolNative Structures') {
    setTextIfChanged(topHeading, PUBLIC_PRODUCT_NAME);
  }

  const topSubtitle = document.querySelector('.topbar .subtitle');
  if (topHeading?.textContent?.trim() === PUBLIC_PRODUCT_NAME && topSubtitle) {
    setTextIfChanged(topSubtitle, PUBLIC_PRODUCT_SUBTITLE);
  }

  ensureStructuralLabNav();
  applyPrintBrand();
  document.documentElement.dataset.ftProduct = 'structural-lab';
}

let queued = false;
function queueBrandSync() {
  if (queued) return;
  queued = true;
  queueMicrotask(() => {
    queued = false;
    applyPublicBrand();
  });
}

applyPublicBrand();

const observer = new MutationObserver(queueBrandSync);
observer.observe(document.documentElement, { childList: true, subtree: true });
