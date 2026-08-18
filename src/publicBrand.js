export const PUBLIC_PRODUCT_NAME = 'FutolTech Structural Lab';
export const PUBLIC_PRODUCT_SUBTITLE = 'Virtual Materials, Members & Connection Testing';
export const COMPANY_NAME = 'FUTOLTECH ENGINEERING AND PROJECT SYSTEMS';

function replaceNativeStructures(text = '') {
  return text
    .replaceAll('FutolNative Structures', PUBLIC_PRODUCT_NAME)
    .replaceAll('Native Structures', PUBLIC_PRODUCT_NAME);
}

export function applyPublicBrand() {
  document.title = replaceNativeStructures(document.title || PUBLIC_PRODUCT_NAME);

  const description = document.querySelector('meta[name="description"]');
  if (description) description.content = replaceNativeStructures(description.content);

  document.querySelectorAll('.topbar .eyebrow, header .eyebrow').forEach((node) => {
    node.textContent = replaceNativeStructures(node.textContent || '');
  });

  const topHeading = document.querySelector('.topbar h1');
  if (topHeading?.textContent?.trim() === 'Native Structures' || topHeading?.textContent?.trim() === 'FutolNative Structures') {
    topHeading.textContent = PUBLIC_PRODUCT_NAME;
  }

  const topSubtitle = document.querySelector('.topbar .subtitle');
  if (topHeading?.textContent?.trim() === PUBLIC_PRODUCT_NAME && topSubtitle) {
    topSubtitle.textContent = PUBLIC_PRODUCT_SUBTITLE;
  }

  document.documentElement.dataset.ftProduct = 'structural-lab';
}

applyPublicBrand();
