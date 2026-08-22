export const FUTOLTECH_LIVING_INTERFACE_VERSION = '1.0.0';

const PERIODS = Object.freeze(['dawn', 'day', 'golden', 'dusk', 'night']);
const STYLE_ID = 'ft-living-interface-style';
const LAYER_ID = 'ft-living-atmosphere';
const REFRESH_MS = 60_000;

export function resolveLivingPeriodForHour(hourValue) {
  const hour = Number(hourValue);
  if (!Number.isFinite(hour) || hour < 0 || hour >= 24) throw new Error('hour must be a finite number from 0 to less than 24.');
  if (hour >= 5 && hour < 8) return 'dawn';
  if (hour >= 8 && hour < 16) return 'day';
  if (hour >= 16 && hour < 18) return 'golden';
  if (hour >= 18 && hour < 20) return 'dusk';
  return 'night';
}

export function resolveLivingPeriod(date = new Date()) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) throw new Error('date must be a valid Date.');
  return resolveLivingPeriodForHour(date.getHours() + date.getMinutes() / 60);
}

export function livingObjectsForPeriod(period) {
  switch (period) {
    case 'dawn': return Object.freeze({ seed: 5, mote: 5, firefly: 0, star: 0 });
    case 'day': return Object.freeze({ seed: 8, mote: 4, firefly: 0, star: 0 });
    case 'golden': return Object.freeze({ seed: 5, mote: 7, firefly: 0, star: 0 });
    case 'dusk': return Object.freeze({ seed: 2, mote: 4, firefly: 6, star: 1 });
    case 'night': return Object.freeze({ seed: 0, mote: 1, firefly: 10, star: 7 });
    default: throw new Error(`Unsupported FutolTech living period '${period}'.`);
  }
}

function stableHash(text) {
  let hash = 2166136261;
  for (const char of String(text)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function fraction(seed, offset = 0) {
  const value = Math.sin((seed + 1) * (12.9898 + offset * 19.19)) * 43758.5453;
  return value - Math.floor(value);
}

function particleStyle(kind, index, pageSeed) {
  const seed = stableHash(`${pageSeed}:${kind}:${index}`);
  const onLeft = fraction(seed, 0) < 0.5;
  const edgePosition = 1.5 + fraction(seed, 1) * 7.5;
  const x = kind === 'star' ? 4 + fraction(seed, 1) * 92 : onLeft ? edgePosition : 100 - edgePosition;
  const y = kind === 'star' ? 2 + fraction(seed, 2) * 34 : 5 + fraction(seed, 2) * 88;
  const drift = -12 + fraction(seed, 3) * 24;
  const duration = 16 + fraction(seed, 4) * 23;
  const delay = -fraction(seed, 5) * duration;
  const sizeByKind = {
    seed: 9 + fraction(seed, 6) * 7,
    mote: 2 + fraction(seed, 6) * 3,
    firefly: 3 + fraction(seed, 6) * 3,
    star: 1 + fraction(seed, 6) * 2
  };
  const opacity = kind === 'star' ? 0.28 + fraction(seed, 7) * 0.34 : 0.20 + fraction(seed, 7) * 0.30;
  const lowOpacity = opacity * (kind === 'firefly' ? 0.30 : 0.48);
  const midOpacity = opacity * 0.66;
  return `--ftli-x:${x.toFixed(2)}%;--ftli-y:${y.toFixed(2)}%;--ftli-drift:${drift.toFixed(2)}px;--ftli-duration:${duration.toFixed(2)}s;--ftli-delay:${delay.toFixed(2)}s;--ftli-size:${sizeByKind[kind].toFixed(2)}px;--ftli-opacity:${opacity.toFixed(3)};--ftli-opacity-low:${lowOpacity.toFixed(3)};--ftli-opacity-mid:${midOpacity.toFixed(3)};`;
}

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    html[data-ft-living-interface="v1"] {
      --ftli-gold: #c6a34b;
      --ftli-gold-soft: rgba(198, 163, 75, .20);
      --ftli-atmosphere-opacity: .72;
      --ftli-wash-1: rgba(238, 226, 197, .20);
      --ftli-wash-2: rgba(86, 119, 117, .10);
      --ftli-wash-3: rgba(50, 63, 74, .06);
    }
    html[data-ft-living-period="dawn"] { --ftli-wash-1:rgba(248,220,183,.28); --ftli-wash-2:rgba(175,205,210,.22); --ftli-wash-3:rgba(222,181,178,.12); }
    html[data-ft-living-period="day"] { --ftli-wash-1:rgba(244,234,207,.22); --ftli-wash-2:rgba(171,202,194,.16); --ftli-wash-3:rgba(160,190,212,.10); }
    html[data-ft-living-period="golden"] { --ftli-wash-1:rgba(229,169,91,.26); --ftli-wash-2:rgba(201,126,96,.16); --ftli-wash-3:rgba(111,121,106,.10); }
    html[data-ft-living-period="dusk"] { --ftli-wash-1:rgba(164,112,102,.18); --ftli-wash-2:rgba(89,88,127,.22); --ftli-wash-3:rgba(219,160,79,.10); }
    html[data-ft-living-period="night"] { --ftli-wash-1:rgba(27,43,63,.34); --ftli-wash-2:rgba(69,62,102,.22); --ftli-wash-3:rgba(194,154,75,.08); --ftli-atmosphere-opacity:.84; }

    html[data-ft-living-interface="v1"] body {
      background-image:
        radial-gradient(circle at 12% 4%, var(--ftli-wash-1), transparent 34rem),
        radial-gradient(circle at 92% 8%, var(--ftli-wash-2), transparent 38rem),
        linear-gradient(155deg, transparent 0 58%, var(--ftli-wash-3) 100%);
      background-attachment: fixed;
    }
    html[data-ft-living-interface="v1"] .topbar {
      position: relative;
      box-shadow: inset 0 -1px 0 var(--ftli-gold-soft);
    }
    html[data-ft-living-interface="v1"] .topbar::after {
      content:"";
      position:absolute;
      left:clamp(1rem,4vw,4.5rem);
      bottom:-1px;
      width:clamp(2.6rem,6vw,5.5rem);
      height:2px;
      background:var(--ftli-gold);
      opacity:.82;
      pointer-events:none;
    }
    html[data-ft-living-interface="v1"] .panel,
    html[data-ft-living-interface="v1"] .controls-panel,
    html[data-ft-living-interface="v1"] .workspace-panel,
    html[data-ft-living-interface="v1"] .compare-result-card,
    html[data-ft-living-interface="v1"] .compare-selector-card {
      box-shadow:0 12px 34px rgba(14,22,27,.06), inset 0 1px 0 rgba(255,255,255,.03);
    }

    #${LAYER_ID} {
      position:fixed;
      inset:0;
      z-index:2147483000;
      overflow:hidden;
      pointer-events:none !important;
      user-select:none;
      opacity:var(--ftli-atmosphere-opacity);
      contain:strict;
    }
    #${LAYER_ID}, #${LAYER_ID} * { pointer-events:none !important; }
    #${LAYER_ID}::before {
      content:"";
      position:absolute;
      inset:0;
      background:
        repeating-linear-gradient(0deg,rgba(255,255,255,.018) 0 1px,transparent 1px 6px),
        radial-gradient(ellipse at 50% 100%,var(--ftli-wash-1),transparent 56%);
      opacity:.50;
      mix-blend-mode:soft-light;
    }

    .ftli-particle {
      position:absolute;
      left:var(--ftli-x);
      top:var(--ftli-y);
      width:var(--ftli-size);
      height:var(--ftli-size);
      opacity:var(--ftli-opacity);
      transform:translate3d(0,0,0);
      animation-duration:var(--ftli-duration);
      animation-delay:var(--ftli-delay);
      animation-iteration-count:infinite;
      animation-timing-function:ease-in-out;
      will-change:transform,opacity;
    }
    .ftli-particle[data-ftli-kind="seed"] {
      border-radius:50%;
      border-top:1px solid rgba(236,225,197,.72);
      transform-origin:center;
      animation-name:ftli-seed-drift;
    }
    .ftli-particle[data-ftli-kind="seed"]::before,
    .ftli-particle[data-ftli-kind="seed"]::after {
      content:"";
      position:absolute;
      left:48%;
      top:38%;
      width:1px;
      height:65%;
      background:rgba(226,218,194,.62);
      transform-origin:top;
    }
    .ftli-particle[data-ftli-kind="seed"]::before { transform:rotate(28deg); }
    .ftli-particle[data-ftli-kind="seed"]::after { transform:rotate(-25deg); }
    .ftli-particle[data-ftli-kind="mote"] { border-radius:50%; background:rgba(214,185,111,.78); box-shadow:0 0 6px rgba(211,177,93,.24); animation-name:ftli-mote-drift; }
    .ftli-particle[data-ftli-kind="firefly"] { border-radius:50%; background:rgba(246,221,107,.96); box-shadow:0 0 4px rgba(246,221,107,.92),0 0 13px rgba(222,194,82,.72),0 0 22px rgba(193,163,56,.34); animation-name:ftli-firefly-drift; }
    .ftli-particle[data-ftli-kind="star"] { border-radius:50%; background:rgba(232,234,220,.94); box-shadow:0 0 5px rgba(214,224,226,.55); animation-name:ftli-star-breathe; }

    @keyframes ftli-seed-drift {
      0%,100% { transform:translate3d(0,0,0) rotate(-7deg); opacity:var(--ftli-opacity-low); }
      50% { transform:translate3d(var(--ftli-drift),-26px,0) rotate(16deg); opacity:var(--ftli-opacity); }
    }
    @keyframes ftli-mote-drift {
      0%,100% { transform:translate3d(0,6px,0); opacity:var(--ftli-opacity-low); }
      50% { transform:translate3d(var(--ftli-drift),-18px,0); opacity:var(--ftli-opacity); }
    }
    @keyframes ftli-firefly-drift {
      0%,100% { transform:translate3d(0,5px,0); opacity:var(--ftli-opacity-low); }
      30% { opacity:var(--ftli-opacity); }
      55% { transform:translate3d(var(--ftli-drift),-16px,0); opacity:var(--ftli-opacity-mid); }
      78% { opacity:var(--ftli-opacity); }
    }
    @keyframes ftli-star-breathe {
      0%,100% { transform:scale(.8); opacity:var(--ftli-opacity-low); }
      50% { transform:scale(1.2); opacity:var(--ftli-opacity); }
    }

    @media (prefers-reduced-motion:reduce) {
      .ftli-particle { animation:none !important; will-change:auto; }
      #${LAYER_ID} { opacity:.52; }
    }
    @media (max-width:720px) {
      #${LAYER_ID} .ftli-particle:nth-child(n+10) { display:none; }
      html[data-ft-living-interface="v1"] .topbar::after { width:2.8rem; }
    }
    @media print {
      #${LAYER_ID} { display:none !important; }
      html[data-ft-living-interface="v1"] body { background-image:none !important; }
      html[data-ft-living-interface="v1"] .topbar::after { display:none !important; }
    }
  `;
  document.head.appendChild(style);
}

function ensureLayer() {
  let layer = document.getElementById(LAYER_ID);
  if (layer) return layer;
  layer = document.createElement('div');
  layer.id = LAYER_ID;
  layer.setAttribute('aria-hidden', 'true');
  layer.dataset.ftLivingAtmosphere = 'true';
  document.body.appendChild(layer);
  return layer;
}

function renderParticles(layer, period) {
  const counts = livingObjectsForPeriod(period);
  const fragment = document.createDocumentFragment();
  const pageSeed = `${location.pathname}:${period}`;
  for (const [kind, count] of Object.entries(counts)) {
    for (let index = 0; index < count; index += 1) {
      const node = document.createElement('span');
      node.className = 'ftli-particle';
      node.dataset.ftliKind = kind;
      node.style.cssText = particleStyle(kind, index, pageSeed);
      fragment.appendChild(node);
    }
  }
  layer.replaceChildren(fragment);
  layer.dataset.ftLivingPeriod = period;
}

function applyPeriod(period) {
  if (!PERIODS.includes(period)) throw new Error(`Unsupported FutolTech living period '${period}'.`);
  injectStyles();
  document.documentElement.dataset.ftLivingInterface = 'v1';
  document.documentElement.dataset.ftLivingPeriod = period;
  const layer = ensureLayer();
  if (layer.dataset.ftLivingPeriod !== period || layer.childElementCount === 0) renderParticles(layer, period);
  window.dispatchEvent(new CustomEvent('ft-living-period-change', { detail: { period } }));
  return period;
}

export function refreshFutolTechLivingInterface(date = new Date()) {
  return applyPeriod(resolveLivingPeriod(date));
}

let refreshTimer = null;
let visibilityBound = false;

export function mountFutolTechLivingInterface() {
  refreshFutolTechLivingInterface();
  if (refreshTimer == null) refreshTimer = window.setInterval(() => refreshFutolTechLivingInterface(), REFRESH_MS);
  if (!visibilityBound) {
    visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) refreshFutolTechLivingInterface();
    });
  }
  window.FutolTechLivingInterface = Object.freeze({
    version: FUTOLTECH_LIVING_INTERFACE_VERSION,
    refresh: refreshFutolTechLivingInterface,
    resolvePeriodForHour: resolveLivingPeriodForHour
  });
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountFutolTechLivingInterface, { once:true });
  else mountFutolTechLivingInterface();
}
