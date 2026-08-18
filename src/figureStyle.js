const SVG_NS = 'http://www.w3.org/2000/svg';
const STORAGE_KEY = 'ft-structural-lab-figure-style';
const ENGINEERING = 'engineering';
const PENCIL = 'pencil';
const PENCIL_FILTER_PREFIX = 'ft-pencil-filter-';
let filterSequence = 0;

function normalizeStyle(value) {
  return value === PENCIL ? PENCIL : ENGINEERING;
}

function savedStyle() {
  try { return normalizeStyle(localStorage.getItem(STORAGE_KEY)); }
  catch { return ENGINEERING; }
}

function isEngineeringFigure(svg) {
  return svg.matches('#specimenDiagram, .section-sketch, .ft-print-document svg, .manual-calc-figure svg, .comparison-member-figure svg, .failure-physics-visual svg, .simulation-playback-visual svg');
}

function ensurePencilFilter(svg) {
  let filterId = svg.dataset.ftPencilFilterId;
  if (filterId && svg.querySelector(`#${filterId}`)) return filterId;

  filterId = `${PENCIL_FILTER_PREFIX}${++filterSequence}`;
  let defs = svg.querySelector(':scope > defs');
  if (!defs) {
    defs = document.createElementNS(SVG_NS, 'defs');
    svg.insertBefore(defs, svg.firstChild);
  }

  const filter = document.createElementNS(SVG_NS, 'filter');
  filter.id = filterId;
  filter.setAttribute('x', '-3%');
  filter.setAttribute('y', '-3%');
  filter.setAttribute('width', '106%');
  filter.setAttribute('height', '106%');
  filter.dataset.ftPencilFilter = 'true';

  const noise = document.createElementNS(SVG_NS, 'feTurbulence');
  noise.setAttribute('type', 'fractalNoise');
  noise.setAttribute('baseFrequency', '0.018 0.055');
  noise.setAttribute('numOctaves', '1');
  noise.setAttribute('seed', '17');
  noise.setAttribute('result', 'pencilNoise');

  const displacement = document.createElementNS(SVG_NS, 'feDisplacementMap');
  displacement.setAttribute('in', 'SourceGraphic');
  displacement.setAttribute('in2', 'pencilNoise');
  displacement.setAttribute('scale', '0.65');
  displacement.setAttribute('xChannelSelector', 'R');
  displacement.setAttribute('yChannelSelector', 'G');

  filter.append(noise, displacement);
  defs.append(filter);
  svg.dataset.ftPencilFilterId = filterId;
  return filterId;
}

function applyStyleToSvg(svg, style) {
  if (!(svg instanceof SVGElement) || !isEngineeringFigure(svg)) return;
  const next = normalizeStyle(style);
  svg.dataset.ftFigureStyle = next;

  const geometry = svg.querySelectorAll('path, line, polyline, polygon, circle, ellipse, rect');
  if (next === PENCIL) {
    const filterId = ensurePencilFilter(svg);
    geometry.forEach((node) => {
      if (node.closest('defs')) return;
      if (node.dataset.ftPencilApplied !== 'true') {
        node.dataset.ftOriginalFilter = node.getAttribute('filter') ?? '';
        node.dataset.ftPencilApplied = 'true';
      }
      node.setAttribute('filter', `url(#${filterId})`);
    });
  } else {
    geometry.forEach((node) => {
      if (node.closest('defs') || node.dataset.ftPencilApplied !== 'true') return;
      const original = node.dataset.ftOriginalFilter;
      if (original) node.setAttribute('filter', original);
      else node.removeAttribute('filter');
      delete node.dataset.ftOriginalFilter;
      delete node.dataset.ftPencilApplied;
    });
  }
}

function applyAllFigures(style) {
  document.querySelectorAll('svg').forEach((svg) => applyStyleToSvg(svg, style));
}

export function applyFigureStyle(style = ENGINEERING) {
  const next = normalizeStyle(style);
  document.body.dataset.figureStyle = next;
  document.documentElement.dataset.figureStyle = next;
  applyAllFigures(next);

  const button = document.querySelector('[data-figure-style-toggle]');
  if (button) {
    button.textContent = next === PENCIL ? 'Figure style · Pencil' : 'Figure style · Engineering';
    button.setAttribute('aria-pressed', String(next === PENCIL));
    button.title = next === PENCIL
      ? 'Engineering geometry is unchanged; figures are rendered with a pencil-style visual treatment. Click for standard linework.'
      : 'Standard engineering linework. Click for the optional pencil-style illustration treatment.';
  }
  try { localStorage.setItem(STORAGE_KEY, next); } catch {}
  return next;
}

function ensureFigureStyles() {
  if (document.getElementById('ft-figure-style-css')) return;
  const style = document.createElement('style');
  style.id = 'ft-figure-style-css';
  style.textContent = `
    .ft-figure-style-toggle { appearance:none; cursor:pointer; font:inherit; }

    svg[data-ft-figure-style="pencil"] :is(path,line,polyline,polygon,circle,ellipse,rect) {
      stroke-linecap: round !important;
      stroke-linejoin: round !important;
    }

    svg[data-ft-figure-style="pencil"] :is(.member-path,.load-arrow,.deflection-marker,.support-symbol line,.support-symbol polygon,.reference-line,.section-sketch__catalog,.section-sketch__node) {
      stroke: #363432 !important;
    }

    svg[data-ft-figure-style="pencil"] .member-path {
      stroke-width: 4.2 !important;
    }

    svg[data-ft-figure-style="pencil"] :is(.load-arrow-head,.deflection-point) {
      fill: #363432 !important;
      stroke: #363432 !important;
    }

    svg[data-ft-figure-style="pencil"] .section-sketch__solid {
      fill: rgba(54,52,50,.10) !important;
      stroke: #363432 !important;
      stroke-width: 1.5 !important;
    }

    svg[data-ft-figure-style="pencil"] .section-sketch__void {
      fill: #fff !important;
      stroke: #4a4744 !important;
      stroke-width: 1.1 !important;
    }

    svg[data-ft-figure-style="pencil"] text {
      font-family: "Segoe Print", "Bradley Hand ITC", "URW Chancery L", cursive !important;
      font-weight: 500 !important;
      letter-spacing: .01em !important;
    }

    @media print {
      body[data-figure-style="pencil"] svg[data-ft-figure-style="pencil"] text {
        color: #252321 !important;
        fill: #252321 !important;
      }
    }
  `;
  document.head.appendChild(style);
}

function mountFigureStyle() {
  ensureFigureStyles();
  const cluster = document.querySelector('.status-cluster');
  if (cluster && !cluster.querySelector('[data-figure-style-toggle]')) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'status-pill status-link ft-figure-style-toggle';
    button.dataset.figureStyleToggle = 'true';
    button.addEventListener('click', () => {
      const current = document.body.dataset.figureStyle;
      applyFigureStyle(current === PENCIL ? ENGINEERING : PENCIL);
    });
    cluster.appendChild(button);
  }
  applyFigureStyle(savedStyle());

  let queued = false;
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      applyAllFigures(document.body.dataset.figureStyle || ENGINEERING);
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountFigureStyle, { once: true });
else mountFigureStyle();

export const FIGURE_STYLES = Object.freeze({
  defaultStyle: ENGINEERING,
  styles: [ENGINEERING, PENCIL],
  handwrittenStack: 'Segoe Print, Bradley Hand ITC, URW Chancery L, cursive',
  geometryRule: 'visual-filter-only; solver coordinates remain unchanged'
});
