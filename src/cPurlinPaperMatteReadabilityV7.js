const panel = document.querySelector('[data-c-purlin-physics-bench]');

function isPaperMatte() {
  return document.documentElement.dataset.ftTheme === 'paper-matte';
}

function compact(value, decimals = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toFixed(decimals).replace(/\.0$/, '');
}

function paperPalette() {
  return {
    bg:'#fbf7ee', lane:'#fffdf8', border:'#8d806c', text:'#172127', muted:'#3f4a50',
    accent:'#176a60', warning:'#704b0f', danger:'#993838', reference:'#746a5c', bar:'#d8cfbf', formula:'#263238', rafter:'#5a4e40'
  };
}

function darkPalette() {
  return {
    bg:'#07141c', lane:'#0b1c25', border:'#27414d', text:'#f1f7f8', muted:'#9eb1ba',
    accent:'#63e0c6', warning:'#ffe08a', danger:'#ff7272', reference:'#617985', bar:'#223843', formula:'#b8c9d0', rafter:'#aab8be'
  };
}

function palette() {
  return isPaperMatte() ? paperPalette() : darkPalette();
}

function activeCards() {
  return [...document.querySelectorAll('.compare-shell #compareSelectors .compare-selector-card')]
    .filter((card) => !card.classList.contains('is-disabled'));
}

function selections() {
  return activeCards().map((card, index) => {
    const orientation = Number(card.querySelector('[data-c-purlin-orientation-display]')?.value ?? 0);
    return {
      label:`Member ${String.fromCharCode(65 + index)}`,
      orientationDeg:Number.isFinite(orientation) ? orientation : 0
    };
  });
}

function slopeNow() {
  const value = Number(panel?.querySelector('[data-cpy-slope-number]')?.value ?? 0);
  return Number.isFinite(value) ? Math.max(0, Math.min(60, value)) : 0;
}

function drawRoundRect(ctx, x, y, width, height, radius, fill, stroke) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); }
}

function drawCSection(ctx, x, y, size, degrees, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((degrees || 0) * Math.PI / 180);
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(5, size * .12);
  ctx.lineCap = 'round';
  const h = size, b = size * .48, lip = size * .18;
  ctx.beginPath();
  ctx.moveTo(b, -h / 2 + lip);
  ctx.lineTo(b, -h / 2);
  ctx.lineTo(0, -h / 2);
  ctx.lineTo(0, h / 2);
  ctx.lineTo(b, h / 2);
  ctx.lineTo(b, h / 2 - lip);
  ctx.stroke();
  ctx.restore();
}

function drawStaticReference(canvas) {
  const colors = palette();
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const list = selections();
  const slope = slopeNow();
  const theta = slope * Math.PI / 180;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, width, height);
  ctx.textAlign = 'left';

  ctx.fillStyle = colors.warning;
  ctx.font = '900 18px system-ui,sans-serif';
  ctx.fillText('STATIC ROOF-SLOPE / RAFTER ATTACHMENT REFERENCE', 32, 34);
  ctx.fillStyle = colors.text;
  ctx.font = '900 23px system-ui,sans-serif';
  ctx.fillText('Cross-section through the sloping rafter — no load, no deflection, no support symbols', 32, 66);
  ctx.fillStyle = colors.muted;
  ctx.font = '15px system-ui,sans-serif';
  ctx.fillText('The C-purlin axis runs out of the page. This view only explains installed section orientation and roof slope.', 32, 92);

  const count = Math.max(1, list.length);
  const gap = count === 3 ? 18 : 34;
  const laneWidth = (width - 64 - gap * (count - 1)) / count;
  const laneY = 112;
  const laneH = 238;

  list.forEach((selection, index) => {
    const x = 32 + index * (laneWidth + gap);
    drawRoundRect(ctx, x, laneY, laneWidth, laneH, 14, colors.lane, colors.border);
    ctx.fillStyle = colors.text;
    ctx.font = `900 ${count === 3 ? 16 : 18}px system-ui,sans-serif`;
    ctx.fillText(`${selection.label} · section orientation ${selection.orientationDeg}°`, x + 14, laneY + 27);

    const centerX = x + laneWidth / 2;
    const centerY = laneY + 132;
    const rafterLength = Math.min(250, laneWidth - 92);
    const dx = Math.cos(theta) * rafterLength / 2;
    const dy = Math.sin(theta) * rafterLength / 2;
    const start = { x:centerX - dx, y:centerY + dy };
    const end = { x:centerX + dx, y:centerY - dy };

    ctx.strokeStyle = colors.rafter;
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

    ctx.fillStyle = colors.muted;
    ctx.font = '14px system-ui,sans-serif';
    ctx.fillText('RAFTER', Math.max(x + 14, end.x - 52), Math.max(laneY + 58, end.y - 10));

    ctx.strokeStyle = colors.warning;
    ctx.fillStyle = colors.warning;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(start.x + 66, start.y);
    ctx.stroke();
    ctx.setLineDash([]);
    if (slope > 0) {
      ctx.beginPath();
      ctx.arc(start.x, start.y, 30, -theta, 0, false);
      ctx.stroke();
    }
    ctx.font = '900 15px ui-monospace,SFMono-Regular,Consolas,monospace';
    ctx.fillText(`θ = ${compact(slope, 1)}°`, Math.min(x + laneWidth - 90, start.x + 36), Math.min(laneY + laneH - 18, start.y - 12));

    const sectionRotationDeg = selection.orientationDeg - slope;
    drawCSection(ctx, centerX - 12, centerY - 34, 58, sectionRotationDeg, colors.accent);
    ctx.strokeStyle = colors.warning;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(centerX - 27, centerY - 7);
    ctx.lineTo(centerX - 19, centerY - 15);
    ctx.lineTo(centerX - 11, centerY - 7);
    ctx.stroke();
    ctx.fillStyle = colors.muted;
    ctx.font = '14px system-ui,sans-serif';
    ctx.fillText('welded to rafter', Math.min(x + laneWidth - 125, centerX + 18), Math.min(laneY + laneH - 16, centerY + 31));
  });
}

function remapPaperColor(value) {
  if (!isPaperMatte() || typeof value !== 'string') return value;
  const map = new Map([
    ['#f1ece1','#fbf7ee'], ['#faf7ef','#fffdf8'], ['#bcb3a4','#8d806c'],
    ['#26343a','#172127'], ['#66747a','#3f4a50'], ['#2f796d','#176a60'],
    ['#9a6c20','#704b0f'], ['#a94747','#993838'], ['#9b927f','#746a5c'],
    ['#ddd5c7','#d8cfbf'], ['#48565c','#263238'], ['#6d6254','#5a4e40']
  ]);
  return map.get(value.toLowerCase()) ?? value;
}

function readableFont(value) {
  if (!isPaperMatte() || typeof value !== 'string') return value;
  const match = value.match(/(\d+(?:\.\d+)?)px/);
  if (!match) return value;
  const size = Number(match[1]);
  let next = size;
  if (size <= 10) next = 13;
  else if (size <= 12) next = 14;
  else if (size <= 13) next = 15;
  else if (size <= 16) next = 18;
  else if (size <= 20) next = 20;
  return value.replace(match[0], `${next}px`);
}

function patchCoordinatedVideoCanvas() {
  const api = window.__FT_C_PURLIN_COORDINATED_VIDEO_V5__;
  const canvas = api?.canvas;
  if (!canvas || canvas.dataset.paperMatteReadabilityV7 === 'true') return false;
  canvas.dataset.paperMatteReadabilityV7 = 'true';

  const originalGetContext = canvas.getContext.bind(canvas);
  const native = originalGetContext('2d');
  const proxy = new Proxy(native, {
    get(target, prop) {
      const value = target[prop];
      return typeof value === 'function' ? value.bind(target) : value;
    },
    set(target, prop, value) {
      if (prop === 'font') target[prop] = readableFont(value);
      else if (prop === 'fillStyle' || prop === 'strokeStyle') target[prop] = remapPaperColor(value);
      else target[prop] = value;
      return true;
    }
  });
  Object.defineProperty(canvas, 'getContext', {
    configurable:true,
    value(type, ...args) {
      return type === '2d' ? proxy : originalGetContext(type, ...args);
    }
  });
  api.render?.();
  return true;
}

function mountStaticReplacement() {
  if (!panel || panel.dataset.paperMatteReadabilityV7 === 'true') return null;
  const oldStatic = panel.querySelector('[data-cpy-static-setup-canvas]');
  if (!oldStatic) return null;
  panel.dataset.paperMatteReadabilityV7 = 'true';
  oldStatic.setAttribute('aria-hidden', 'true');

  const style = document.createElement('style');
  style.id = 'ft-cp-papermatte-readability-v7';
  style.textContent = `
    .c-purlin-physics-bench [data-cpy-static-setup-canvas]{display:none!important}
    .c-purlin-physics-bench [data-cpy-readable-static-canvas]{display:block!important;width:100%;height:auto;aspect-ratio:1280/380;margin-top:.75rem;border:1px solid var(--border);border-radius:12px;background:var(--panel)}
    html[data-ft-theme="paper-matte"] .c-purlin-physics-bench [data-cpy-readable-static-canvas],
    html[data-ft-theme="paper-matte"] .c-purlin-physics-bench [data-cpy-coordinated-canvas]{border-color:#8d806c!important;box-shadow:0 0 0 1px rgba(68,55,38,.05)}
  `;
  document.head.appendChild(style);

  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 380;
  canvas.dataset.cpyReadableStaticCanvas = 'true';
  canvas.setAttribute('aria-label', 'High-readability static roof slope and C-purlin to rafter installation reference');
  oldStatic.insertAdjacentElement('afterend', canvas);

  let signature = '';
  function render(force = false) {
    const next = [
      document.documentElement.dataset.ftTheme,
      slopeNow(),
      selections().map((item) => `${item.label}:${item.orientationDeg}`).join('|')
    ].join('::');
    if (!force && next === signature) return;
    signature = next;
    drawStaticReference(canvas);
  }
  function loop() {
    render(false);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  panel.addEventListener('input', () => setTimeout(() => render(true), 0));
  panel.addEventListener('change', () => setTimeout(() => render(true), 0));
  document.querySelector('.compare-shell #compareSelectors')?.addEventListener('change', () => setTimeout(() => render(true), 80));
  window.addEventListener('ft-theme-change', () => {
    render(true);
    setTimeout(() => window.__FT_C_PURLIN_COORDINATED_VIDEO_V5__?.render?.(), 0);
  });
  render(true);
  return canvas;
}

function mount() {
  if (!panel) return;
  mountStaticReplacement();
  if (!patchCoordinatedVideoCanvas()) {
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (patchCoordinatedVideoCanvas() || attempts > 80) clearInterval(timer);
    }, 50);
  }
}

mount();
