import { resolveRoofLineLoads } from './solver/cPurlinLoadCases.js';

const DENSITY_KG_M3 = 7850;
const root = document.querySelector('[data-cp-loadcase-app]');

function compact(value, digits = 3) {
  if (!Number.isFinite(value)) return '—';
  return Number(value).toFixed(digits).replace(/\.0+$/, '').replace(/(\.\d*?[1-9])0+$/, '$1');
}

function palette() {
  const paper = document.documentElement.dataset.ftTheme === 'paper-matte';
  return paper ? {
    bg: '#fbf7ee', card: '#fffdf8', text: '#182329', muted: '#4c575c', border: '#8f806b',
    rafter: '#6c655b', purlin: '#176a60', gravity: '#a96808', wind: '#1769a8',
    normal: '#6c35a0', parallel: '#12695a', resultant: '#a52f36', weld: '#8f670d'
  } : {
    bg: '#07141c', card: '#0b2029', text: '#ecfbff', muted: '#a9bdc7', border: '#35515c',
    rafter: '#a9bdc7', purlin: '#67e6cf', gravity: '#ffd65c', wind: '#69b9ff',
    normal: '#cf89ff', parallel: '#6ff2c6', resultant: '#ff6f74', weld: '#ffd65c'
  };
}

function arrow(ctx, x1, y1, x2, y2, color, width = 5) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const head = 15;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - head * Math.cos(angle - 0.5), y2 - head * Math.sin(angle - 0.5));
  ctx.lineTo(x2 - head * Math.cos(angle + 0.5), y2 - head * Math.sin(angle + 0.5));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawC(ctx, x, y, size, degrees, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(degrees * Math.PI / 180);
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(4, size * 0.075);
  ctx.lineJoin = 'miter';
  ctx.beginPath();
  ctx.moveTo(size * 0.35, -size * 0.5);
  ctx.lineTo(-size * 0.35, -size * 0.5);
  ctx.lineTo(-size * 0.35, size * 0.5);
  ctx.lineTo(size * 0.35, size * 0.5);
  ctx.moveTo(size * 0.35, -size * 0.5);
  ctx.lineTo(size * 0.35, -size * 0.27);
  ctx.moveTo(size * 0.35, size * 0.5);
  ctx.lineTo(size * 0.35, size * 0.27);
  ctx.stroke();
  ctx.restore();
}

function header(ctx, p, width) {
  ctx.textAlign = 'left';
  ctx.fillStyle = p.text;
  ctx.font = '900 28px ui-sans-serif,system-ui,sans-serif';
  ctx.fillText('FUTOLTECH ENGINEERING & PROJECT SYSTEMS', 42, 43);
  ctx.font = '900 31px ui-sans-serif,system-ui,sans-serif';
  ctx.fillText('ROOF CROSS-SECTION · GRAVITY + WIND VECTOR EXPLANATION', 42, 83);
  ctx.fillStyle = p.muted;
  ctx.font = '500 17px ui-sans-serif,system-ui,sans-serif';
  ctx.fillText('Static installation/load-path view — purlin seated on the sloping rafter; no span deflection is animated here.', 42, 111);
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(42, 128);
  ctx.lineTo(width - 42, 128);
  ctx.stroke();
}

function labelBlock(ctx, { x, y, title, value, color, width = 245 }) {
  const p = palette();
  ctx.save();
  ctx.fillStyle = p.card;
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, width, 66, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = '900 16px ui-sans-serif,system-ui,sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(title, x + 14, y + 25);
  ctx.fillStyle = p.text;
  ctx.font = '800 18px ui-monospace,SFMono-Regular,Consolas,monospace';
  ctx.fillText(value, x + 14, y + 50);
  ctx.restore();
}

function currentContext() {
  return window.__FT_C_PURLIN_LOAD_CASES__?.getState?.()?.context ?? null;
}

function draw(canvas) {
  const context = currentContext();
  if (!context?.common || !context.members?.length) return;

  const ctx = canvas.getContext('2d');
  const p = palette();
  const width = canvas.width;
  const input = context.common;
  const preset = context.members[0].preset;
  const loads = resolveRoofLineLoads({ ...input, preset, densityKgM3: DENSITY_KG_M3 });
  const theta = input.slopeDeg * Math.PI / 180;
  const sectionOrientation = Number(context.members[0].orientationDeg || 0);

  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  header(ctx, p, width);

  // Geometry zone — the rafter is the installation datum.
  const x1 = 120;
  const y1 = 430;
  const rafterLength = 650;
  const x2 = x1 + Math.cos(theta) * rafterLength;
  const y2 = y1 - Math.sin(theta) * rafterLength;
  ctx.strokeStyle = p.rafter;
  ctx.lineWidth = 13;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // Roof-angle datum and label.
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 + 150, y1);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x1, y1, 78, 0, -theta, true);
  ctx.stroke();
  ctx.fillStyle = p.text;
  ctx.font = '800 17px ui-monospace,SFMono-Regular,Consolas,monospace';
  ctx.fillText(`θ = ${compact(input.slopeDeg, 1)}°`, x1 + 88, y1 - 18);

  // Seat Member A on the rafter. 0° means its flange/contact datum follows the roof slope.
  const seatT = 0.52;
  const seatX = x1 + (x2 - x1) * seatT;
  const seatY = y1 + (y2 - y1) * seatT;
  const normalX = Math.sin(theta);
  const normalY = Math.cos(theta);
  const purlinX = seatX - normalX * 42;
  const purlinY = seatY - normalY * 42;
  drawC(ctx, purlinX, purlinY, 82, sectionOrientation - input.slopeDeg, p.purlin);

  // Small weld/contact marker tied to the same rafter datum.
  ctx.fillStyle = p.weld;
  ctx.save();
  ctx.translate(seatX, seatY);
  ctx.rotate(-theta);
  ctx.beginPath();
  ctx.moveTo(-9, -4);
  ctx.lineTo(0, -15);
  ctx.lineTo(9, -4);
  ctx.lineTo(0, 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = p.text;
  ctx.font = '800 16px ui-sans-serif,system-ui,sans-serif';
  ctx.fillText(`Member A · ${sectionOrientation}° installation reference`, 285, 168);
  ctx.fillStyle = p.muted;
  ctx.font = '700 14px ui-sans-serif,system-ui,sans-serif';
  ctx.fillText('C-purlin axis runs out of page · seated/welded to the rafter datum', 285, 191);

  // Gravity zone — vertical arrow, independent of roof slope.
  const maxLoad = Math.max(0.25, loads.gravityVerticalKNM, Math.abs(loads.windNormalKNM), loads.resultantKNM);
  const scale = 78 / maxLoad;
  const gX = 250;
  const gY = 210;
  if (loads.gravityVerticalKNM > 1e-9) {
    arrow(ctx, gX, gY, gX, gY + Math.max(48, loads.gravityVerticalKNM * scale), p.gravity, 6);
  }
  labelBlock(ctx, {
    x: 60, y: 145, title: 'GRAVITY · ALWAYS VERTICAL',
    value: `${compact(loads.gravityVerticalKNM)} kN/m ↓`, color: p.gravity, width: 265
  });

  // Wind zone — arrow is normal to the sloping roof and gets its own label box.
  const windSign = Math.sign(loads.windNormalKNM) || (loads.windSense === 'uplift' ? -1 : 1);
  const windAnchorX = seatX + normalX * 100;
  const windAnchorY = seatY + normalY * 100;
  const windLength = Math.max(56, Math.abs(loads.windNormalKNM) * scale);
  const windEndX = windAnchorX + normalX * windSign * windLength;
  const windEndY = windAnchorY + normalY * windSign * windLength;
  if (Math.abs(loads.windNormalKNM) > 1e-9) arrow(ctx, windAnchorX, windAnchorY, windEndX, windEndY, p.wind, 6);
  labelBlock(ctx, {
    x: 560, y: 145, title: `WIND · ROOF-NORMAL ${loads.windSense.toUpperCase()}`,
    value: `${compact(Math.abs(loads.windNormalKNM))} kN/m`, color: p.wind, width: 305
  });

  // Separate vector/result panel — arrows and numerical labels never share the same space.
  const panelX = 890;
  const panelY = 150;
  const panelW = 345;
  const panelH = 300;
  ctx.fillStyle = p.card;
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, 14);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = p.text;
  ctx.font = '900 18px ui-sans-serif,system-ui,sans-serif';
  ctx.fillText('RESOLVED LINE LOADS', panelX + 18, panelY + 30);
  ctx.fillStyle = p.muted;
  ctx.font = '600 13px ui-sans-serif,system-ui,sans-serif';
  ctx.fillText('Same physical load, expressed in roof axes', panelX + 18, panelY + 52);

  const originX = panelX + 112;
  const originY = panelY + 145;
  const vecScale = 58 / Math.max(0.25, Math.abs(loads.normalKNM), Math.abs(loads.parallelKNM), loads.resultantKNM);
  const nx = Math.sin(theta);
  const ny = Math.cos(theta);
  const tx = -Math.cos(theta);
  const ty = Math.sin(theta);
  arrow(ctx, originX, originY, originX + nx * loads.normalKNM * vecScale, originY + ny * loads.normalKNM * vecScale, p.normal, 4);
  arrow(ctx, originX, originY, originX + tx * loads.parallelKNM * vecScale, originY + ty * loads.parallelKNM * vecScale, p.parallel, 4);
  const rx = nx * loads.normalKNM + tx * loads.parallelKNM;
  const ry = ny * loads.normalKNM + ty * loads.parallelKNM;
  arrow(ctx, originX, originY, originX + rx * vecScale, originY + ry * vecScale, p.resultant, 6);

  const rowX = panelX + 185;
  const rows = [
    [p.normal, 'roof-normal w⊥', `${compact(loads.normalKNM)} kN/m`],
    [p.parallel, 'down-slope w∥', `${compact(loads.parallelKNM)} kN/m`],
    [p.resultant, 'resultant |w|', `${compact(loads.resultantKNM)} kN/m`]
  ];
  rows.forEach(([color, label, value], index) => {
    const y = panelY + 110 + index * 56;
    ctx.fillStyle = color;
    ctx.fillRect(rowX, y - 11, 11, 11);
    ctx.font = '800 14px ui-sans-serif,system-ui,sans-serif';
    ctx.fillText(label, rowX + 20, y);
    ctx.fillStyle = p.text;
    ctx.font = '800 16px ui-monospace,SFMono-Regular,Consolas,monospace';
    ctx.fillText(value, rowX + 20, y + 22);
  });

  ctx.fillStyle = p.text;
  ctx.font = '800 17px ui-sans-serif,system-ui,sans-serif';
  ctx.fillText(`Net roof-normal direction: ${loads.normalDirection.toUpperCase()}`, 60, 485);
  ctx.fillStyle = p.muted;
  ctx.font = '600 14px ui-monospace,SFMono-Regular,Consolas,monospace';
  ctx.fillText('gravity → w⊥ = W cosθ ; w∥ = W sinθ   ·   wind → roof-normal in this current idealized layer', 385, 485);

  root.dataset.vectorFigureSlopeDeg = String(input.slopeDeg);
  root.dataset.vectorFigurePurlinRotationDeg = String(sectionOrientation - input.slopeDeg);
  root.dataset.vectorFigureLayout = 'seated-nonoverlap-v1';
}

function mount() {
  if (!root) return;
  const original = root.querySelector('[data-cplc-vector]');
  if (!original) return;

  const clean = document.createElement('canvas');
  clean.width = 1280;
  clean.height = 520;
  clean.setAttribute('data-cplc-vector-clean', '');
  clean.setAttribute('data-cplc-vector', '');
  clean.setAttribute('aria-label', 'Static roof slope, seated C-purlin and separated gravity/wind/resultant vector diagram');
  original.removeAttribute('data-cplc-vector');
  original.setAttribute('data-cplc-vector-legacy', '');
  original.hidden = true;
  original.style.display = 'none';
  original.insertAdjacentElement('afterend', clean);

  const redraw = () => requestAnimationFrame(() => draw(clean));
  root.querySelectorAll('input,select').forEach((control) => {
    control.addEventListener('input', redraw);
    control.addEventListener('change', redraw);
  });
  window.addEventListener('ft-theme-change', redraw);

  const waitForApp = () => {
    if (currentContext()) {
      draw(clean);
      return;
    }
    requestAnimationFrame(waitForApp);
  };
  waitForApp();
}

mount();
