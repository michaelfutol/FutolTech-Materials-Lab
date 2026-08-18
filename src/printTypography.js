const STORAGE_KEY = 'ft-structural-lab-print-typography';
const TYPEWRITER = 'typewriter';
const MODERN = 'modern';

const TYPEWRITER_LABEL = 'Print font · Typewriter';
const MODERN_LABEL = 'Print font · Modern';

function normalizeTheme(value) {
  return value === MODERN ? MODERN : TYPEWRITER;
}

function savedTheme() {
  try {
    return normalizeTheme(localStorage.getItem(STORAGE_KEY));
  } catch {
    return TYPEWRITER;
  }
}

export function applyPrintTypography(theme = TYPEWRITER) {
  const next = normalizeTheme(theme);
  document.body.dataset.printTypography = next;
  document.documentElement.dataset.printTypography = next;
  const button = document.querySelector('[data-print-typography-toggle]');
  if (button) {
    button.textContent = next === TYPEWRITER ? TYPEWRITER_LABEL : MODERN_LABEL;
    button.setAttribute('aria-pressed', String(next === TYPEWRITER));
    button.title = next === TYPEWRITER
      ? 'Printed reports use a clean typewriter-style font stack. Click for the modern engineering font.'
      : 'Printed reports use the modern engineering font. Click for the FutolTech typewriter style.';
  }
  try { localStorage.setItem(STORAGE_KEY, next); } catch {}
  return next;
}

function ensureTypographyStyles() {
  if (document.getElementById('ft-print-typography-style')) return;
  const style = document.createElement('style');
  style.id = 'ft-print-typography-style';
  style.textContent = `
    .ft-print-type-toggle { appearance:none; cursor:pointer; font:inherit; }
    @media print {
      body[data-print-typography="typewriter"],
      body[data-print-typography="typewriter"] .ft-print-document,
      body[data-print-typography="typewriter"] .print-letterhead,
      body[data-print-typography="typewriter"] .print-document-footer,
      body[data-print-typography="typewriter"] input,
      body[data-print-typography="typewriter"] select,
      body[data-print-typography="typewriter"] textarea,
      body[data-print-typography="typewriter"] output,
      body[data-print-typography="typewriter"] table {
        font-family: "Courier Prime", "Courier New", Courier, monospace !important;
        font-variant-ligatures: none !important;
      }

      body[data-print-typography="typewriter"] {
        font-size: 10.5pt !important;
        line-height: 1.32 !important;
        letter-spacing: 0 !important;
      }

      body[data-print-typography="typewriter"] .ft-print-document {
        font-size: 11pt !important;
        line-height: 1.30 !important;
        letter-spacing: 0 !important;
      }

      body[data-print-typography="typewriter"] .ft-print-document p,
      body[data-print-typography="typewriter"] .ft-print-value {
        font-size: 10.8pt !important;
      }

      body[data-print-typography="typewriter"] .ft-print-document table,
      body[data-print-typography="typewriter"] .ft-print-document th,
      body[data-print-typography="typewriter"] .ft-print-document td {
        font-size: 8.8pt !important;
      }

      body[data-print-typography="typewriter"] .ft-page-footer,
      body[data-print-typography="typewriter"] .print-document-footer {
        font-size: 7.8pt !important;
      }

      body[data-print-typography="modern"] .ft-print-document,
      body[data-print-typography="modern"] .print-letterhead,
      body[data-print-typography="modern"] .print-document-footer,
      body[data-print-typography="modern"] input,
      body[data-print-typography="modern"] select,
      body[data-print-typography="modern"] textarea,
      body[data-print-typography="modern"] output,
      body[data-print-typography="modern"] table {
        font-family: Arial, Helvetica, sans-serif !important;
      }
    }
  `;
  document.head.appendChild(style);
}

function mountTypographyToggle() {
  ensureTypographyStyles();
  applyPrintTypography(savedTheme());

  const cluster = document.querySelector('.status-cluster');
  if (!cluster || cluster.querySelector('[data-print-typography-toggle]')) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'status-pill status-link ft-print-type-toggle';
  button.dataset.printTypographyToggle = 'true';
  button.addEventListener('click', () => {
    const current = document.body.dataset.printTypography;
    applyPrintTypography(current === TYPEWRITER ? MODERN : TYPEWRITER);
  });
  cluster.appendChild(button);
  applyPrintTypography(document.body.dataset.printTypography);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountTypographyToggle, { once: true });
} else {
  mountTypographyToggle();
}

export const PRINT_TYPOGRAPHY = Object.freeze({
  defaultTheme: TYPEWRITER,
  themes: [TYPEWRITER, MODERN],
  typewriterStack: 'Courier Prime, Courier New, Courier, monospace'
});
