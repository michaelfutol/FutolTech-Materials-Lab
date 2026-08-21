const root = document.querySelector('[data-cp-loadcase-app]');

function mount() {
  if (!root || typeof CanvasRenderingContext2D === 'undefined') return;
  if (CanvasRenderingContext2D.prototype.__ftCpGravityWindTextFix) return;

  const proto = CanvasRenderingContext2D.prototype;
  const originalFillText = proto.fillText;
  const targetPattern = /^(?:w∥\s|YIELDED\s|ELASTIC\s|M⊥=|σgross=|δ⊥=|gross resultant δ=)/;

  proto.fillText = function ftCpGravityWindFillText(text, x, y, maxWidth) {
    const canvas = this.canvas;
    const value = String(text ?? '');
    if (!canvas?.matches?.('[data-cplc-video]') || !targetPattern.test(value)) {
      return maxWidth === undefined
        ? originalFillText.call(this, text, x, y)
        : originalFillText.call(this, text, x, y, maxWidth);
    }

    const state = window.__FT_C_PURLIN_LOAD_CASES__?.getState?.();
    const laneCount = Math.max(1, state?.context?.members?.length ?? 2);
    const gap = 18;
    const left = 35;
    const right = 35;
    const laneWidth = (canvas.width - left - right - gap * (laneCount - 1)) / laneCount;
    const laneX = Number(x) - 18;
    const availableWidth = Math.max(120, laneWidth - 36);
    const isStatus = /^(?:YIELDED|ELASTIC)/.test(value);
    const desiredPx = laneCount >= 3 ? (isStatus ? 13.5 : 13) : (isStatus ? 16 : 15);
    const minPx = laneCount >= 3 ? 11.5 : 13;
    const weight = isStatus ? 900 : 700;
    const family = 'ui-monospace,SFMono-Regular,Consolas,monospace';

    this.save();
    this.textAlign = 'left';
    this.textBaseline = 'alphabetic';
    this.font = `${weight} ${desiredPx}px ${family}`;
    const measured = Math.max(1, this.measureText(value).width);
    const fittedPx = Math.max(minPx, Math.min(desiredPx, desiredPx * availableWidth / measured));
    this.font = `${weight} ${fittedPx.toFixed(2)}px ${family}`;

    // Hard per-lane clipping keeps every engineering readout inside its member card.
    this.beginPath();
    this.rect(laneX + 10, 150, Math.max(40, laneWidth - 20), 470);
    this.clip();
    originalFillText.call(this, value, Number(x), Number(y));
    this.restore();

    root.dataset.videoTextLayout = 'lane-clipped-left-v1';
    root.dataset.videoTextLaneCount = String(laneCount);
    root.dataset.videoTextMinPx = String(minPx);
  };

  Object.defineProperty(proto, '__ftCpGravityWindTextFix', {
    value: true,
    configurable: true
  });

  // The app may already have painted its initial zero-load frame before this module loads.
  window.__FT_C_PURLIN_LOAD_CASES__?.render?.();
}

mount();
