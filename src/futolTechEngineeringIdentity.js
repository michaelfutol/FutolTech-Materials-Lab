export const FUTOLTECH_ENGINEERING_IDENTITY_VERSION = '1.0.0';

const STYLE_ID = 'ft-engineering-identity-style';

function injectEngineeringIdentityStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    html[data-ft-engineering-identity="v1"] {
      --ft-editorial-gold: #c5a24a;
      --ft-editorial-gold-soft: rgba(197, 162, 74, .18);
      --ft-editorial-ink-soft: rgba(16, 29, 37, .07);
    }

    html[data-ft-engineering-identity="v1"] .topbar {
      position: relative;
      box-shadow: inset 0 -1px 0 var(--ft-editorial-gold-soft);
    }

    html[data-ft-engineering-identity="v1"] .topbar::after {
      content: "";
      position: absolute;
      left: clamp(1rem, 3.5vw, 3rem);
      bottom: -1px;
      width: clamp(3rem, 6vw, 5.25rem);
      height: 2px;
      background: var(--ft-editorial-gold);
      opacity: .88;
      pointer-events: none;
    }

    html[data-ft-engineering-identity="v1"] .topbar h1 {
      letter-spacing: -.018em;
      text-wrap: balance;
    }

    html[data-ft-engineering-identity="v1"] .topbar .eyebrow,
    html[data-ft-engineering-identity="v1"] .panel-heading .eyebrow {
      letter-spacing: .105em;
    }

    html[data-ft-engineering-identity="v1"] .panel-heading {
      position: relative;
    }

    html[data-ft-engineering-identity="v1"] .panel-heading::after {
      content: "";
      position: absolute;
      left: 0;
      bottom: -.55rem;
      width: 2.2rem;
      height: 1px;
      background: var(--ft-editorial-gold);
      opacity: .55;
      pointer-events: none;
    }

    html[data-ft-engineering-identity="v1"] .result-card,
    html[data-ft-engineering-identity="v1"] .compare-result-card,
    html[data-ft-engineering-identity="v1"] .compare-selector-card,
    html[data-ft-engineering-identity="v1"] .section-editor {
      box-shadow: 0 9px 24px var(--ft-editorial-ink-soft);
    }

    html[data-ft-engineering-identity="v1"] .source-card,
    html[data-ft-engineering-identity="v1"] .support-help {
      position: relative;
    }

    html[data-ft-engineering-identity="v1"] .source-card::before,
    html[data-ft-engineering-identity="v1"] .support-help::before {
      content: "";
      position: absolute;
      left: -3px;
      top: 0;
      width: 3px;
      height: 1.65rem;
      background: var(--ft-editorial-gold);
      opacity: .82;
      border-radius: 2px;
      pointer-events: none;
    }

    html[data-ft-engineering-identity="v1"] .source-meta span {
      letter-spacing: .025em;
    }

    html[data-ft-engineering-identity="v1"] footer {
      box-shadow: inset 0 1px 0 var(--ft-editorial-gold-soft);
    }

    html[data-ft-theme="paper-matte"][data-ft-engineering-identity="v1"] {
      --ft-editorial-gold: #9a741f;
      --ft-editorial-gold-soft: rgba(154, 116, 31, .16);
      --ft-editorial-ink-soft: rgba(58, 48, 32, .08);
    }

    @media (max-width: 620px) {
      html[data-ft-engineering-identity="v1"] .topbar::after {
        left: 1rem;
        width: 3rem;
      }
    }

    @media print {
      html[data-ft-engineering-identity="v1"] .topbar::after,
      html[data-ft-engineering-identity="v1"] .panel-heading::after,
      html[data-ft-engineering-identity="v1"] .source-card::before,
      html[data-ft-engineering-identity="v1"] .support-help::before {
        display: none !important;
      }
      html[data-ft-engineering-identity="v1"] .result-card,
      html[data-ft-engineering-identity="v1"] .compare-result-card,
      html[data-ft-engineering-identity="v1"] .compare-selector-card,
      html[data-ft-engineering-identity="v1"] .section-editor,
      html[data-ft-engineering-identity="v1"] footer {
        box-shadow: none !important;
      }
    }
  `;
  document.head.appendChild(style);
}

export function mountFutolTechEngineeringIdentity() {
  injectEngineeringIdentityStyles();
  document.documentElement.dataset.ftEngineeringIdentity = 'v1';
  document.documentElement.dataset.ftDesignMode = 'engineering';
  return FUTOLTECH_ENGINEERING_IDENTITY_VERSION;
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountFutolTechEngineeringIdentity, { once: true });
  } else {
    mountFutolTechEngineeringIdentity();
  }
}
