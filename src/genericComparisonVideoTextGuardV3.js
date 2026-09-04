const PATCH_FLAG = '__FT_GENERIC_COMPARISON_TEXT_GUARD_V3__';
const LEFT = 36;
const GAP = 18;

function activeLaneCount() {
  const cards = [...document.querySelectorAll('#compareSelectors .compare-selector-card')]
    .filter((card) => !card.classList.contains('is-disabled'));
  return Math.max(1, Math.min(3, cards.length || 3));
}

function laneMetrics(ctx, x) {
  const count = activeLaneCount();
  const usable = ctx.canvas.width - LEFT * 2;
  const width = (usable - GAP * (count - 1)) / count;
  const stride = width + GAP;
  const index = Math.max(0, Math.min(count - 1, Math.floor((x - LEFT) / stride)));
  return {
    index,
    x: LEFT + index * stride,
    width
  };
}

function ellipsize(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  const suffix = '…';
  let low = 0;
  let high = text.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    const candidate = `${text.slice(0, mid).trimEnd()}${suffix}`;
    if (ctx.measureText(candidate).width <= maxWidth) low = mid;
    else high = mid - 1;
  }
  return `${text.slice(0, Math.max(1, low)).trimEnd()}${suffix}`;
}

function roundedBadge(ctx, x, baselineY, text, colour) {
  const padX = 8;
  const height = 24;
  const width = Math.max(74, ctx.measureText(text).width + padX * 2);
  const left = x - width / 2;
  const top = baselineY - 19;
  const dark = document.documentElement.dataset.ftTheme !== 'paper-matte';
  ctx.save();
  ctx.fillStyle = dark ? 'rgba(6,21,30,.92)' : 'rgba(255,250,241,.94)';
  ctx.strokeStyle = colour;
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(left, top, width, height, 7);
  else ctx.rect(left, top, width, height);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function install() {
  if (window[PATCH_FLAG]) return;
  window[PATCH_FLAG] = true;

  const proto = CanvasRenderingContext2D.prototype;
  const originalFillText = proto.fillText;

  proto.fillText = function guardedGenericComparisonFillText(text, x, y, maxWidth) {
    const canvas = this.canvas;
    if (!canvas?.hasAttribute?.('data-generic-video-canvas') || typeof text !== 'string') {
      return maxWidth == null
        ? originalFillText.call(this, text, x, y)
        : originalFillText.call(this, text, x, y, maxWidth);
    }

    // Each lane reserves its upper-right corner for the load badge. Long member
    // names are ellipsized inside the remaining title width instead of spilling
    // into the arrow label or the next member card.
    if (/^Member\s+[A-C]\s+·\s+/i.test(text) && y >= 145 && y <= 190) {
      const lane = laneMetrics(this, x);
      const titleWidth = Math.max(150, lane.width - 158);
      const fitted = ellipsize(this, text, titleWidth);
      return originalFillText.call(this, fitted, x, y);
    }

    // Compression arrows previously placed the kgf label on the exact same
    // baseline as the member title. Keep the arrow itself unchanged, but render
    // its label as a compact badge in the reserved upper-right corner.
    if (/^[\d,.]+\s*kgf$/i.test(text) && y < 200) {
      const lane = laneMetrics(this, x);
      const badgeX = lane.x + lane.width - 72;
      const colour = this.fillStyle;
      this.save();
      this.font = '800 15px system-ui, sans-serif';
      this.textAlign = 'center';
      roundedBadge(this, badgeX, y, text, colour);
      this.fillStyle = colour;
      originalFillText.call(this, text, badgeX, y);
      this.restore();
      document.documentElement.dataset.genericComparisonTextGuard = 'v3';
      return;
    }

    return maxWidth == null
      ? originalFillText.call(this, text, x, y)
      : originalFillText.call(this, text, x, y, maxWidth);
  };

  document.documentElement.dataset.genericComparisonTextGuard = 'v3';
}

install();
